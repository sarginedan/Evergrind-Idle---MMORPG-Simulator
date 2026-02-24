// Mob Manager - Spawning, tracking, and cleanup of mobs (zone-aware)
import { CONFIG } from './config.js';
import { Mob } from './Mob.js';
import { gameState } from './GameState.js';

export class MobManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.mobs = [];
        this.spawnTimer = 0;
        this.maxMobs = CONFIG.MOB_COUNT_MAX;
        this._aliveCount = 0; // Tracked incrementally instead of filter() every call
        this.bossMob = null;  // Reference to the active boss mob (if any)
        this._bossSpawnChecked = false; // Avoid checking every frame
        this._bossCheckTimer = 0;
        this.combatEffects = null;
        
        // Initial spawn
        this.spawnInitialMobs();
    }

    setCombatEffects(combatEffects) {
        this.combatEffects = combatEffects;
        // Pass to existing mobs
        for (const mob of this.mobs) {
            mob.combatEffects = combatEffects;
        }
    }

    getAvailableMobTypes() {
        const zone = gameState.getCurrentZone();
        // Endgame complete: all zones scale to 60, so ALL mob types in the zone are valid
        if (gameState.endgameComplete) {
            return zone.mobTypes;
        }
        return zone.mobTypes.filter(
            mt => gameState.level >= mt.minLevel && gameState.level <= mt.maxLevel
        );
    }

    spawnInitialMobs() {
        const count = CONFIG.MOB_COUNT_MIN + Math.floor(Math.random() * (CONFIG.MOB_COUNT_MAX - CONFIG.MOB_COUNT_MIN));
        for (let i = 0; i < count; i++) {
            this.spawnMob();
        }
    }

    spawnMob(neededMobNames = null) {
        if (this._aliveCount >= this.maxMobs) return;
        
        const types = this.getAvailableMobTypes();
        if (types.length === 0) return;
        
        let mobType;
        
        // Quest-biased spawning: 80% chance to spawn a quest-needed mob if one is needed
        if (neededMobNames && neededMobNames.size > 0 && Math.random() < 0.8) {
            const questTypes = types.filter(mt => neededMobNames.has(mt.name));
            if (questTypes.length > 0) {
                mobType = questTypes[Math.floor(Math.random() * questTypes.length)];
            }
        }
        // Fallback to random type
        if (!mobType) {
            mobType = types[Math.floor(Math.random() * types.length)];
        }
        
        const pos = this.world.getRandomOpenPosition(2, CONFIG.MOB_SPAWN_RADIUS);
        // Endgame: all mobs display as level 60 regardless of zone
        const mobLevel = gameState.endgameComplete
            ? CONFIG.MAX_LEVEL
            : Math.max(
                mobType.minLevel,
                Math.min(mobType.maxLevel, gameState.level + Math.floor(Math.random() * 3) - 1)
            );
        
        const mob = new Mob(this.scene, mobType, mobLevel, pos.x, pos.z, null, this.world);
        if (this.combatEffects) mob.combatEffects = this.combatEffects;
        this.mobs.push(mob);
        this._aliveCount++;
    }

    /** Spawn a zone boss mob */
    spawnBoss(zoneId) {
        const bossConfig = CONFIG.getBossForZone(zoneId);
        if (!bossConfig) return null;
        if (this.bossMob && this.bossMob.alive) return this.bossMob; // Already spawned

        // Build a mobType-like object for the boss
        const bossMobType = {
            name: bossConfig.name,
            color: bossConfig.color,
            minLevel: bossConfig.level,
            maxLevel: bossConfig.level,
            scale: bossConfig.scale,
            type: bossConfig.type,
        };

        // Spawn near the player's current position
        const pos = this.world.getRandomOpenPosition(5, 15);
        const configWithZone = { ...bossConfig, _zoneId: zoneId };
        const boss = new Mob(this.scene, bossMobType, bossConfig.level, pos.x, pos.z, configWithZone, this.world);
        if (this.combatEffects) boss.combatEffects = this.combatEffects;
        this.mobs.push(boss);
        this._aliveCount++;
        this.bossMob = boss;
        gameState.activeBoss = boss;

        gameState.addGameLog(`⚔ ZONE BOSS SPAWNED: ${bossConfig.name}!`);
        gameState.addChatMessage('Game', 'System', `⚠ ${bossConfig.name} has appeared! Prepare for battle!`);

        return boss;
    }

    /** Check if it's time to spawn a boss (called periodically) */
    checkBossSpawn(questLog) {
        const zoneId = gameState.currentZoneId;
        const bossConfig = CONFIG.getBossForZone(zoneId);
        if (!bossConfig) return;

        // Don't spawn if boss already defeated in this zone
        if (gameState.isBossDefeated(zoneId)) return;

        // Don't spawn if boss already alive
        if (this.bossMob && this.bossMob.alive) return;

        // ── Double-gate: verify the last story quest is actually completed ──
        // This prevents the boss from spawning if the boss quest was somehow
        // accepted prematurely (e.g., via save migration, onZoneEnter edge case, etc.)
        if (bossConfig.storyEndQuestId && !questLog.completedIds.has(bossConfig.storyEndQuestId)) {
            // Story chain isn't done — purge any premature boss quest from active list
            const prematureIdx = questLog.activeQuests.findIndex(q => q.id === bossConfig.questId);
            if (prematureIdx !== -1) {
                questLog.activeQuests.splice(prematureIdx, 1);
                console.warn(`⚠ Removed premature boss quest ${bossConfig.questId} — story quest ${bossConfig.storyEndQuestId} not done.`);
            }
            return;
        }

        // Check if the boss quest is currently active (means story quests are done)
        const hasBossQuest = questLog.activeQuests.some(q => q.id === bossConfig.questId);
        if (!hasBossQuest) return;

        // Spawn the boss!
        this.spawnBoss(zoneId);
    }

    /** Remove all mobs from scene and respawn fresh (used on zone change) */
    despawnAll() {
        for (const mob of this.mobs) {
            mob.destroy();
        }
        this.mobs = [];
        this._aliveCount = 0;
        this.spawnTimer = 0;
        this.bossMob = null;
        gameState.activeBoss = null;
    }

    /** Full reset for zone change: despawn all, then respawn */
    resetForZone() {
        this.despawnAll();
        this.spawnInitialMobs();
    }

    update(dt, time, playerPos, questLogRef) {
        // Update all mobs — Smooth movement and animations (60fps)
        let writeIdx = 0;
        for (let i = 0; i < this.mobs.length; i++) {
            const mob = this.mobs[i];
            const keepAlive = mob.update(dt, time, playerPos);
            
            if (!keepAlive) {
                if (mob === this.bossMob) {
                    this.bossMob = null;
                    gameState.activeBoss = null;
                }
                gameState.totalMobsKilled++;
                mob.destroy();
                this._aliveCount = Math.max(0, this._aliveCount - 1);
            } else {
                if (writeIdx !== i) this.mobs[writeIdx] = mob;
                writeIdx++;
            }
        }
        this.mobs.length = writeIdx;
        
        // Heavy Logic & Spawning (Can be throttled)
        this.spawnTimer += dt;
        if (this.spawnTimer >= CONFIG.MOB_RESPAWN_TIME) {
            this.spawnTimer %= CONFIG.MOB_RESPAWN_TIME;
            if (this._aliveCount < this.maxMobs) {
                this.spawnMob(this._cachedNeededNames);
            }
        }
        
        this.maxMobs = Math.max(CONFIG.MOB_COUNT_MAX, CONFIG.MOB_COUNT_MAX + Math.floor(gameState.level / 5));

        if (questLogRef) {
            this._bossCheckTimer += dt;
            if (this._bossCheckTimer >= 1.5) {
                this._bossCheckTimer = 0;
                this.checkBossSpawn(questLogRef);
                this._cachedNeededNames = questLogRef.getNeededMobNames();
            }
        }
    }

    /** Heavy AI thinking for all mobs — call this from logic tick */
    updateAI(playerPos) {
        for (let i = 0; i < this.mobs.length; i++) {
            if (this.mobs[i].updateAI) {
                this.mobs[i].updateAI(playerPos);
            }
        }
    }

    findNearestAlive(x, z) {
        let nearest = null;
        let nearestDistSq = Infinity;
        
        for (let i = 0; i < this.mobs.length; i++) {
            const mob = this.mobs[i];
            if (!mob.alive) continue;
            const dx = mob.x - x;
            const dz = mob.z - z;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = mob;
            }
        }
        
        return nearest;
    }

    /** Find the nearest alive mob whose name is in the given Set */
    findNearestAliveByNames(x, z, nameSet) {
        let nearest = null;
        let nearestDistSq = Infinity;
        
        for (let i = 0; i < this.mobs.length; i++) {
            const mob = this.mobs[i];
            if (!mob.alive) continue;
            if (!nameSet.has(mob.mobType.name)) continue;
            const dx = mob.x - x;
            const dz = mob.z - z;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = mob;
            }
        }
        
        return nearest;
    }

    getAliveCount() {
        return this._aliveCount;
    }

    getMobsInRange(x, z, range) {
        const rangeSq = range * range;
        const result = [];
        for (let i = 0; i < this.mobs.length; i++) {
            const m = this.mobs[i];
            if (!m.alive) continue;
            const dx = m.x - x;
            const dz = m.z - z;
            if (dx * dx + dz * dz <= rangeSq) result.push(m);
        }
        return result;
    }
}
