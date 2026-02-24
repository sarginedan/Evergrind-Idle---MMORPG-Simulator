// Idle Automation Engine - Controls all automated player behavior
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { questLog } from './QuestLog.js';
import { talentTree } from './TalentTree.js';
import { goldShop } from './GoldShop.js';
import { aetherbitShop } from './AetherbitShop.js';
import { generateMessage, fireChain, clearPendingChains } from './BarrensChat.js';

export class IdleEngine {
    constructor(player, world, mobManager, worldPickups) {
        this.player = player;
        this.world = world;
        this.mobManager = mobManager;
        this.worldPickups = worldPickups;
        
        this.state = 'idle'; // idle, moving_to_mob, fighting, gathering, moving_to_gather, moving_to_pickup
        this.stateTimer = 0;
        this.searchTimer = 0;
        this.gatherTimer = 0;
        this.skillUseTimer = 0;
        this.autoAttackTimer = 0;
        this.currentTarget = null;
        this.gatherNode = null;
        this.pickupTarget = null; // { x, z, def }
        this.moveTimeout = 0; // time spent moving toward current target — give up if too long
        
        // Auto-skill usage timers — 8 skill slots
        this.skillTimers = [0, 0, 0, 0, 0, 0, 0, 0];
        
        // Gathering simulation
        this.gatherNodes = [];
        this.generateGatherNodes();
        
        // Fake chat timer — start fast so chat is immediately lively
        this.chatTimer = 0.5 + Math.random() * 1.5;

        // Pre-allocated face target object to avoid creating { x, z } every call
        this._faceTargetObj = { x: 0, z: 0 };

        // Pre-computed squared distances for range comparisons (avoid sqrt in hot paths)
        this._attackRangeSq = CONFIG.PLAYER_ATTACK_RANGE * CONFIG.PLAYER_ATTACK_RANGE;
        this._attackLeashSq = (CONFIG.PLAYER_ATTACK_RANGE * 1.5) * (CONFIG.PLAYER_ATTACK_RANGE * 1.5);
    }

    generateGatherNodes() {
        // Create invisible gather nodes for the idle engine
        for (let i = 0; i < 15; i++) {
            const pos = this.world.getRandomOpenPosition(1, 30);
            this.gatherNodes.push({
                x: pos.x,
                z: pos.z,
                type: Math.random() > 0.5 ? 'herb' : 'ore',
                available: true,
                respawnTimer: 0,
            });
        }
    }

    update(dt, time) {
        this.stateTimer += dt;
        
        // Update gather node respawns
        for (const node of this.gatherNodes) {
            if (!node.available) {
                node.respawnTimer -= dt;
                if (node.respawnTimer <= 0) {
                    node.available = true;
                }
            }
        }
        
        // Simulate chat messages — procedural Barrens Chat generator (unique every time)
        this.chatTimer -= dt;
        if (this.chatTimer <= 0) {
            // Faster chat: 2-6 seconds between messages for lively feel
            this.chatTimer = 2 + Math.random() * 4;
            
            // 12% chance to fire a multi-message chain (conversations, arguments, etc.)
            if (Math.random() < 0.12) {
                fireChain();
                this.chatTimer += 3; // extra delay after a chain starts
            } else {
                const msg = generateMessage();
                gameState.addChatMessage(msg.channel, msg.user, msg.msg);
            }
        }
        
        // Search logic throttle — use dt but cap how often it triggers per frame
        // This prevents the engine from doing 10+ expensive searches in one frame at high speed
        this.searchTimer += dt;
        if (this.searchTimer > 0.6) {
            // Only trigger idle targeting if currently idle
            if (this.state === 'idle') {
                this.handleIdle(dt, time);
            }
            this.searchTimer = 0; 
        }
        
        // State machine
        switch (this.state) {
            case 'idle':
                // handleIdle now called via searchTimer throttle above
                break;
            case 'moving_to_mob':
                this.handleMovingToMob(dt, time);
                break;
            case 'fighting':
                this.handleFighting(dt, time);
                break;
            case 'moving_to_gather':
                this.handleMovingToGather(dt, time);
                break;
            case 'gathering':
                this.handleGathering(dt, time);
                break;
            case 'moving_to_pickup':
                this.handleMovingToPickup(dt, time);
                break;
        }
        
        // Auto use skills during combat
        if (this.state === 'fighting' && this.currentTarget) {
            this.autoUseSkills(dt);
            this.autoUseTalentAbilities(dt);
        }

        // Update talent ability cooldowns every frame
        talentTree.updateTalentCooldowns(dt);
    }

    /** Reuse a single object for faceTarget calls to avoid GC pressure */
    _faceAt(x, z) {
        this._faceTargetObj.x = x;
        this._faceTargetObj.z = z;
        this.player.faceTarget(this._faceTargetObj);
    }

    handleIdle(dt, time) {
        gameState.inCombat = false;
        
        if (this.searchTimer > 0.6) {
            this.searchTimer = 0;
            
            // ── Smart Quest-Aware Priority System ──
            // 1. Boss (always top priority)
            // 2. Quest-needed mobs (kill_type + collect_drop sources) — HIGHEST priority
            // 3. Quest-needed pickups (collect_pickup) — interleaved with mobs by distance
            // 4. Any mob (for kill_any objectives or general grinding)
            // 5. Gather nodes
            // 6. Wander

            const px = this.player.position.x;
            const pz = this.player.position.z;

            // 1. Boss — always first
            if (this.mobManager.bossMob && this.mobManager.bossMob.alive) {
                this._goToMob(this.mobManager.bossMob);
                return;
            }

            // Determine what the quest needs right now
            const neededMobNames = questLog.getNeededMobNames();
            const neededPickupIds = questLog.getNeededPickupIds();
            const hasDropNeeds = questLog.hasDropObjectivesRemaining();
            const hasMobNeeds = neededMobNames.size > 0;
            const hasPickupNeeds = neededPickupIds.size > 0;

            // 2. If quest needs drops, STRONGLY prioritize the mobs that drop them
            // This is the core fix — when a quest needs collect_drop items, 
            // the player should beeline for those specific mobs, not wander or chase random kills
            if (hasDropNeeds && hasMobNeeds) {
                const dropMob = this.mobManager.findNearestAliveByNames(px, pz, neededMobNames);
                if (dropMob) {
                    this._goToMob(dropMob);
                    return;
                }
            }

            // 3. Find best quest-relevant mob AND best quest-relevant pickup, pick closest
            let questMob = null;
            let questMobDistSq = Infinity;
            if (hasMobNeeds) {
                questMob = this.mobManager.findNearestAliveByNames(px, pz, neededMobNames);
                if (questMob) {
                    questMobDistSq = questMob.getDistSqTo(px, pz);
                }
            }

            let questPickup = null;
            let questPickupDistSq = Infinity;
            if (hasPickupNeeds && this.worldPickups) {
                questPickup = this.worldPickups.findNearestNeeded(px, pz);
                if (questPickup) {
                    questPickupDistSq = questPickup.dist * questPickup.dist;
                }
            }

            // Compare distances — go to whichever quest target is closer
            if (questMob && questPickup) {
                if (questMobDistSq <= questPickupDistSq) {
                    this._goToMob(questMob);
                } else {
                    this._goToPickup(questPickup);
                }
                return;
            } else if (questMob) {
                this._goToMob(questMob);
                return;
            } else if (questPickup) {
                this._goToPickup(questPickup);
                return;
            }

            // 4. Any mob (for kill_any objectives or general XP)
            const anyMob = this.mobManager.findNearestAlive(px, pz);
            if (anyMob) {
                this._goToMob(anyMob);
                return;
            }

            // 5. Try gathering (less frequent, 30% chance when nothing else)
            if (Math.random() < 0.3) {
                const gatherNode = this.findNearestGatherNode();
                if (gatherNode) {
                    this.gatherNode = gatherNode;
                    this.state = 'moving_to_gather';
                    this.moveTimeout = 0;
                    this.player.moveTo(gatherNode.x, gatherNode.z);
                    gameState.isMovingToTarget = true;
                    return;
                }
            }
            
            // 6. Wander to random position
            const pos = this.world.getRandomOpenPosition(2, 15);
            this.player.moveTo(pos.x, pos.z);
        }
    }

    /** Helper — start moving to a mob target */
    _goToMob(mob) {
        this.currentTarget = mob;
        this.state = 'moving_to_mob';
        this.moveTimeout = 0;
        this.player.moveTo(mob.x, mob.z);
        this._faceAt(mob.x, mob.z);
        gameState.isMovingToTarget = true;
    }

    /** Helper — start moving to a pickup target */
    _goToPickup(pickup) {
        this.pickupTarget = pickup;
        this.state = 'moving_to_pickup';
        this.moveTimeout = 0;
        this.player.moveTo(pickup.x, pickup.z);
        gameState.isMovingToTarget = true;
    }

    handleMovingToMob(dt, time) {
        if (!this.currentTarget || !this.currentTarget.alive) {
            this.state = 'idle';
            this.currentTarget = null;
            this.moveTimeout = 0;
            gameState.isMovingToTarget = false;
            return;
        }

        // Give up after 8 seconds of trying to reach — find a different target
        this.moveTimeout += dt;
        if (this.moveTimeout > 8) {
            this.state = 'idle';
            this.currentTarget = null;
            this.moveTimeout = 0;
            this.player.clearTarget();
            gameState.isMovingToTarget = false;
            return;
        }
        
        const distSq = this.currentTarget.getDistSqTo(
            this.player.position.x, 
            this.player.position.z
        );
        
        // Update movement target as mob might wander
        this.player.moveTo(this.currentTarget.x, this.currentTarget.z);
        this._faceAt(this.currentTarget.x, this.currentTarget.z);
        
        if (distSq < this._attackRangeSq) {
            this.state = 'fighting';
            this.autoAttackTimer = 0;
            this.moveTimeout = 0;
            this.player.clearTarget();
            gameState.inCombat = true;
            gameState.isMovingToTarget = false;
            gameState.currentTarget = this.currentTarget;
        }
    }

    handleFighting(dt, time) {
        if (!this.currentTarget || !this.currentTarget.alive) {
            // Mob just died — apply talent on-kill bonuses
            if (this.currentTarget && !this.currentTarget.alive) {
                const killHeal = talentTree.getKillHealPercent();
                if (killHeal > 0) {
                    const healAmount = Math.floor(gameState.getEffectiveMaxHp() * killHeal);
                    gameState.healPlayer(healAmount);
                }
                const killMana = talentTree.getKillManaPercent();
                if (killMana > 0) {
                    const manaAmount = Math.floor(gameState.getEffectiveMaxMana() * killMana);
                    gameState.mana = Math.min(gameState.getEffectiveMaxMana(), gameState.mana + manaAmount);
                }
            }
            
            // Immediate retarget: skip idle search delay by finding next quest target now
            const px = this.player.position.x;
            const pz = this.player.position.z;
            const neededMobNames = questLog.getNeededMobNames();
            if (neededMobNames.size > 0) {
                const nextQuestMob = this.mobManager.findNearestAliveByNames(px, pz, neededMobNames);
                if (nextQuestMob) {
                    this.currentTarget = null;
                    gameState.inCombat = false;
                    gameState.currentTarget = null;
                    this._goToMob(nextQuestMob);
                    return;
                }
            }
            
            this.state = 'idle';
            this.currentTarget = null;
            gameState.inCombat = false;
            gameState.currentTarget = null;
            this.stateTimer = 0;
            this.searchTimer = 0.5; // Fast re-search after kill
            return;
        }
        
        // Keep facing target
        this._faceAt(this.currentTarget.x, this.currentTarget.z);
        
        // Stay in range (use squared distance to avoid sqrt)
        const dx = this.player.position.x - this.currentTarget.x;
        const dz = this.player.position.z - this.currentTarget.z;
        const distSq = dx * dx + dz * dz;
        const dist = Math.sqrt(distSq);
        const ranges = CONFIG.CLASS_RANGES[this.player.classId] || CONFIG.CLASS_RANGES.warrior;

        if (ranges.kite && dist < ranges.min) {
            // Too close! Kite away from the target
            const nx = dx / dist;
            const nz = dz / dist;
            // Move to ideal range
            const kiteX = this.currentTarget.x + nx * ranges.ideal;
            const kiteZ = this.currentTarget.z + nz * ranges.ideal;
            this.player.moveTo(kiteX, kiteZ);
        } else if (dist > ranges.max) {
            // Too far, move toward target
            this.player.moveTo(this.currentTarget.x, this.currentTarget.z);
        } else {
            // We are in a good spot
            this.player.clearTarget();
        }
        
        // Auto attack (attack speed boosted by talent + gold shop haste consumable)
        this.autoAttackTimer += dt;
        const hasteBonus = goldShop.hasteBoost || 0;
        const attackInterval = 1.0 / (CONFIG.PLAYER_ATTACK_SPEED * (1 + talentTree.getAttackSpeedBonus() + hasteBonus));
        
        if (this.autoAttackTimer >= attackInterval) {
            this.autoAttackTimer -= attackInterval;
            
            // Calculate damage (talent attack speed already baked into DPS multiplier)
            let damage = gameState.getDPS();
            const baseDmg = damage;
            
            // Crit check — base chance from gameState includes all sources
            const critChance = gameState.getEffectiveCritChance();
            let isCrit = false;
            if (Math.random() < critChance) {
                isCrit = true;
                damage = Math.floor(damage * gameState.getEffectiveCritDamage());
            }
            
            // Apply damage to mob
            this.currentTarget.takeDamage(damage);
            this.currentTarget.inCombat = true;
            
            // Lifesteal — Soul Siphon (premium permanent upgrade)
            const lifestealFrac = aetherbitShop.getLifestealFraction();
            if (lifestealFrac > 0) {
                const healAmt = Math.floor(baseDmg * lifestealFrac);
                if (healAmt > 0) gameState.healPlayer(healAmt);
            }
            
            // Play attack animation
            this.player.startAttack();
            
        }
    }

    handleMovingToGather(dt, time) {
        if (!this.gatherNode || !this.gatherNode.available) {
            this.state = 'idle';
            this.moveTimeout = 0;
            gameState.isMovingToTarget = false;
            return;
        }

        // Give up after 10 seconds
        this.moveTimeout += dt;
        if (this.moveTimeout > 10) {
            this.state = 'idle';
            this.gatherNode = null;
            this.moveTimeout = 0;
            this.player.clearTarget();
            gameState.isMovingToTarget = false;
            return;
        }
        
        const dx = this.gatherNode.x - this.player.position.x;
        const dz = this.gatherNode.z - this.player.position.z;
        const distSq = dx * dx + dz * dz;
        
        if (distSq < 2.25) { // 1.5^2
            this.state = 'gathering';
            // Base 2-4s, reduced by gold shop consumable + premium Gathering Savant
            const gatherSpeedBonus = goldShop.getGatherSpeedBonus() + aetherbitShop.getGatherSpeedBonus();
            const baseTime = 2 + Math.random() * 2;
            this.gatherTimer = baseTime / Math.max(0.3, 1 + gatherSpeedBonus);
            this.moveTimeout = 0;
            this.player.clearTarget();
            gameState.isGathering = true;
            gameState.gatherProgress = 0;
            gameState.isMovingToTarget = false;
        }
        
        // If a mob appears very close, switch to fighting (9 = 3^2)
        const nearestMob = this.mobManager.findNearestAlive(
            this.player.position.x,
            this.player.position.z
        );
        if (nearestMob && nearestMob.getDistSqTo(this.player.position.x, this.player.position.z) < 9) {
            this.currentTarget = nearestMob;
            this.state = 'moving_to_mob';
            this.moveTimeout = 0;
            this.player.moveTo(nearestMob.x, nearestMob.z);
            gameState.isGathering = false;
        }
    }

    handleGathering(dt, time) {
        this.gatherTimer -= dt;
        // Use dynamic total time based on initial timer (stored as remaining time at start)
        const gatherSpeedBonus = goldShop.getGatherSpeedBonus() + aetherbitShop.getGatherSpeedBonus();
        const totalTime = 3 / Math.max(0.3, 1 + gatherSpeedBonus);
        gameState.gatherProgress = Math.min(1, 1 - (this.gatherTimer / totalTime));
        
        if (this.gatherTimer <= 0) {
            // Complete gathering
            if (this.gatherNode) {
                this.gatherNode.available = false;
                this.gatherNode.respawnTimer = 15 + Math.random() * 15;
                
                const goldReward = 1 + Math.floor(Math.random() * 3);
                const xpReward = Math.floor(5 + gameState.level * 1.5);
                const zoneOutleveled = gameState.isCurrentZoneOutleveled();
                gameState.addGold(goldReward);
                if (!zoneOutleveled) gameState.addXp(xpReward);
                
                const gatherName = this.gatherNode.type === 'herb' ? 'Ancient Herb' : 'Mystic Crystal';
                const xpText = zoneOutleveled ? '0 XP (outleveled)' : `${xpReward} XP`;
                gameState.addGameLog(`Gathered ${gatherName} (+${xpText}, +${goldReward}g)`);
                
                // Progress gather event
                if (gameState.currentEvent && gameState.currentEvent.type === 'gather') {
                    gameState.progressEvent(1);
                }

                // Dispatch to quest log
                questLog.onGathered(this.gatherNode.type);
            }
            
            this.state = 'idle';
            gameState.isGathering = false;
            gameState.gatherProgress = 0;
            this.gatherNode = null;
        }
    }

    handleMovingToPickup(dt, time) {
        if (!this.pickupTarget) {
            this.state = 'idle';
            this.moveTimeout = 0;
            gameState.isMovingToTarget = false;
            return;
        }

        // Give up after 10 seconds
        this.moveTimeout += dt;
        if (this.moveTimeout > 10) {
            this.state = 'idle';
            this.pickupTarget = null;
            this.moveTimeout = 0;
            this.player.clearTarget();
            gameState.isMovingToTarget = false;
            return;
        }
        
        const dx = this.pickupTarget.x - this.player.position.x;
        const dz = this.pickupTarget.z - this.player.position.z;
        const distSq = dx * dx + dz * dz;
        
        // The WorldPickups.checkCollection() in the game loop handles the actual
        // collection when player is within range. We just need to navigate there.
        if (distSq < 2.25) { // 1.5^2
            // Close enough — collection happens via game loop's checkCollection
            this.pickupTarget = null;
            this.state = 'idle';
            this.moveTimeout = 0;
            this.player.clearTarget();
            gameState.isMovingToTarget = false;
            return;
        }
        
        // Only interrupt for very close mobs that are quest-relevant, or any mob practically on top of us
        // This prevents the player from endlessly chasing random mobs instead of finishing pickup objectives
        const px = this.player.position.x;
        const pz = this.player.position.z;
        const neededMobNames = questLog.getNeededMobNames();
        
        // Check for quest-needed mob within reasonable range (9 = 3^2)
        if (neededMobNames.size > 0) {
            const questMob = this.mobManager.findNearestAliveByNames(px, pz, neededMobNames);
            if (questMob && questMob.getDistSqTo(px, pz) < 9) {
                this.currentTarget = questMob;
                this.pickupTarget = null;
                this.state = 'moving_to_mob';
                this.moveTimeout = 0;
                this.player.moveTo(questMob.x, questMob.z);
                this._faceAt(questMob.x, questMob.z);
                gameState.isMovingToTarget = true;
                return;
            }
        }
        
        // Any mob practically touching us (4 = 2^2) — can't ignore something that close
        const nearestMob = this.mobManager.findNearestAlive(px, pz);
        if (nearestMob && nearestMob.getDistSqTo(px, pz) < 4) {
            this.currentTarget = nearestMob;
            this.pickupTarget = null;
            this.state = 'moving_to_mob';
            this.moveTimeout = 0;
            this.player.moveTo(nearestMob.x, nearestMob.z);
            this._faceAt(nearestMob.x, nearestMob.z);
            gameState.isMovingToTarget = true;
            return;
        }
        
        // Keep moving towards the pickup
        this.player.moveTo(this.pickupTarget.x, this.pickupTarget.z);
    }

    autoUseSkills(dt) {
        // Auto-use skills on cooldown — all 8 slots
        for (let i = 1; i < CONFIG.SKILLS.length; i++) {
            this.skillTimers[i] += dt;
            
            const skill = CONFIG.SKILLS[i];
            // Only use skills that are unlocked at current level
            if (!gameState.isSkillUnlocked(i)) continue;
            
            // Use skill when available and timer has passed (slight random delay for natural feel)
            if (gameState.skillCooldowns[i] <= 0 && this.skillTimers[i] > skill.cooldown + 0.5 + Math.random() * 2) {
                if (gameState.useSkill(i)) {
                    this.skillTimers[i] = 0;
                    
                    // Apply skill damage (boosted by Voidedge talent)
                    if (skill.dpsMultiplier > 0 && this.currentTarget && this.currentTarget.alive) {
                        const skillDamage = Math.floor(gameState.getDPS() * skill.dpsMultiplier * talentTree.getSkillDamageMultiplier());
                        this.currentTarget.takeDamage(skillDamage);
                        this.player.startAttack();
                        gameState.addGameLog(`Used ${skill.name} for ${skillDamage} damage!`);
                    }
                }
            }
        }
    }

    autoUseTalentAbilities(dt) {
        const abilities = talentTree.getUnlockedTalentAbilities();
        if (abilities.length === 0) return;

        const hpPct = gameState.hp / gameState.maxHp;
        const manaPct = gameState.mana / gameState.getEffectiveMaxMana();

        for (let i = 0; i < abilities.length; i++) {
            const abil = abilities[i];
            if (talentTree.talentAbilityCooldowns[i] > 0) continue;

            // ── Reactive AI Logic ──
            // 1. Defensive skills: only use when HP drops below threshold
            if (abil.isDefensive && hpPct > (abil.hpThreshold || 0.5)) continue;

            // 2. Utility skills (like Ether Siphon): only use when mana is low enough
            if (abil.isUtility && abil.id === 'ether_siphon' && manaPct > (abil.manaThreshold || 0.7)) continue;

            // 3. AoE Skills: ideally wait for multiple targets, but for now we'll just check combat state
            // (Already gated by this.state === 'fighting' in update loop)

            // Small random delay for natural feel
            if (Math.random() > 0.05) continue; 

            if (talentTree.useTalentAbility(i)) {
                // Apply effects if applicable
                const damageMultiplier = abil.dpsMultiplier || 0;
                
                if (damageMultiplier > 0) {
                    const baseDamage = Math.floor(gameState.getDPS() * damageMultiplier * talentTree.getSkillDamageMultiplier());
                    
                    if (abil.isAoE) {
                        // True AoE Resolution
                        const mobsInRange = this.mobManager.getMobsInRange(this.player.position.x, this.player.position.z, abil.aoeRange || 10);
                        let totalHits = 0;
                        for (const mob of mobsInRange) {
                            mob.takeDamage(baseDamage);
                            totalHits++;
                        }
                        this.player.startAttack();
                        gameState.addGameLog(`Used ${abil.name} for ${baseDamage} AoE damage! (${totalHits} targets)`);
                    } else if (this.currentTarget && this.currentTarget.alive) {
                        // Single target
                        this.currentTarget.takeDamage(baseDamage);
                        this.player.startAttack();
                        gameState.addGameLog(`Used ${abil.name} for ${baseDamage} damage!`);
                    }
                }
            }
        }
    }

    findNearestGatherNode() {
        let nearest = null;
        let nearestDistSq = Infinity;
        
        for (const node of this.gatherNodes) {
            if (!node.available) continue;
            const dx = node.x - this.player.position.x;
            const dz = node.z - this.player.position.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = node;
            }
        }
        
        return nearest;
    }

    getState() {
        return this.state;
    }
}
