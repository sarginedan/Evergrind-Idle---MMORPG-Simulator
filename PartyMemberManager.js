// PartyMemberManager.js — Manages 3D world representations of party members
// OPTIMIZED: Throttled UI updates, pooled damage numbers, minimal DOM writes.

import * as THREE from 'three';
import { PartyMemberEntity } from './PartyMemberEntity.js';
import { partySystem } from './PartySystem.js';
import { gameState } from './GameState.js';
import { dungeonSystem } from './DungeonSystem.js';
import { raidSystem } from './RaidSystem.js';
import { battlegroundSystem } from './BattlegroundSystem.js';

const CLASS_DISPLAY = {
    warrior: { name: 'Aetherblade', color: '#66aaff', icon: '⚔️' },
    mage:    { name: 'Voidweaver',  color: '#cc88ff', icon: '🔮' },
    ranger:  { name: 'Thornwarden', color: '#88dd66', icon: '🏹' },
    cleric:  { name: 'Dawnkeeper',  color: '#ffdd66', icon: '✨' },
};

const _screenVec = new THREE.Vector3();

// ── Damage number DOM pool (reuse elements instead of creating new ones) ──
const DMG_POOL_SIZE = 12;

export class PartyMemberManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.entities = [];
        this._lastPartyVersion = -1;
        this._lastDungeonId = null;
        this._lastDungeonState = null;
        this._playerGroup = null;
        this._visible = true;
        this._combatEffects = null;

        // Reusable projection objects
        this._projScreenMatrix = new THREE.Matrix4();
        this._frustum = new THREE.Frustum();
        this._tempVec = new THREE.Vector3();
        this._uiFrame = 0;

        // Damage number pool
        this._dmgPool = [];
        this._dmgPoolIdx = 0;
        this._initDmgPool();

        // Social Engine
        this._socialTimer = 5 + Math.random() * 10;
        this._banterQueue = [];
        this._lastBanterTime = 0;
    }

    // ── BANTER DATABASE ──
    static CHAT_DATA = {
        solo: [
            "Just you and me today, huh?",
            "At least we don't have to split the loot with a full squad.",
            "Quiet out here. Too quiet.",
            "We should probably recruit more muscle soon.",
            "I've got your back, boss. Even if it's just us."
        ],
        troll_player: [
            "Does the leader ever actually... talk?",
            "I think our captain is a bot. They just walk and kill.",
            "Hey boss, you okay? You've been staring at that map for an hour.",
            "I've seen more personality from a Training Dummy.",
            "Is it just me, or does the leader never actually blink?"
        ],
        overworld: [
            "Nice day for a grind.",
            "Wonder if there's any rare spawns in this zone.",
            "My armor is getting itchy. Need a tavern soon.",
            "Check out the gear on that passerby. Psh, Tier 0 trash.",
            "Keep an eye out for Aetherbit deposits."
        ],
        dungeon_start: [
            "Focus up, everyone. No room for errors here.",
            "Watch for patrols. Don't want to pull the whole room.",
            "Hope the boss actually drops my loot table for once.",
            "Stay behind the Tank. Seriously.",
            "Let's make this a clean run."
        ],
        dungeon_combat: [
            "Wait for the pull!",
            "Focus the elite first!",
            "Interrupted! They're not casting that again.",
            "Mana is looking good. Pull more!",
            "Watch your threat! I'm losing aggro!"
        ],
        dungeon_loot: [
            "Greed? Need? Actually, I'll just pass.",
            "Total trash loot. Vendor bait.",
            "Anyone need this? It's an upgrade for me.",
            "That's going straight into the Soul Forge.",
            "Gg, smooth clear."
        ],
        raid: [
            "Mechanics, people! Remember the floor is lava!",
            "If you stand in the purple stuff, I'm not healing you.",
            "This guy looks huge. We're gonna need a bigger squad.",
            "Stack on the leader! STACK!",
            "Enrage timer is ticking! Burn him down!"
        ],
        // Class-specific flavored lines
        warrior: ["My shield is holding!", "Just a scratch.", "Get behind me!"],
        mage: ["Need a mana break soon.", "Check out this AOE!", "Glass cannon? More like Glass NUKE."],
        ranger: ["I can see them from a mile away.", "Arrow to the knee? Please.", "Keep them at range!"],
        cleric: ["Stop standing in the fire!", "Shields up!", "I'm a doctor, not a miracle worker. Actually, I am."],
    };

    _updateSocial(dt, time, inInstance) {
        if (this.entities.length === 0) return;

        // 1. Process Banter Queue (responses)
        if (this._banterQueue.length > 0 && time - this._lastBanterTime > 1.8) {
            const next = this._banterQueue.shift();
            const target = this.entities.find(e => e.memberId === next.memberId);
            if (target) {
                target.entity.say(next.text);
                this._lastBanterTime = time;
            }
        }

        // 2. Random chatter trigger
        this._socialTimer -= dt;
        if (this._socialTimer <= 0) {
            // Speed up chatter if in instance, slow down in overworld
            this._socialTimer = inInstance ? (10 + Math.random() * 15) : (25 + Math.random() * 30);
            this._triggerRandomChat(inInstance);
        }
    }

    _triggerRandomChat(inInstance) {
        const count = this.entities.length;
        if (count === 0) return;
        const mainIdx = Math.floor(Math.random() * count);
        const speaker = this.entities[mainIdx];
        const prog = dungeonSystem.getProgress() || raidSystem.getProgress();
        
        let pool = [];
        
        // Context Selection
        if (count === 1) {
            pool = [...PartyMemberManager.CHAT_DATA.solo];
        } else {
            if (inInstance) {
                if (prog && prog.state === 'combat') pool = [...PartyMemberManager.CHAT_DATA.dungeon_combat];
                else if (prog && prog.state === 'loot') pool = [...PartyMemberManager.CHAT_DATA.dungeon_loot];
                else pool = [...PartyMemberManager.CHAT_DATA.dungeon_start];

                if (raidSystem.instance) pool.push(...PartyMemberManager.CHAT_DATA.raid);
            } else {
                pool = [...PartyMemberManager.CHAT_DATA.overworld];
                if (Math.random() < 0.2) pool.push(...PartyMemberManager.CHAT_DATA.troll_player);
            }
        }

        // Add class flavor
        const classPool = PartyMemberManager.CHAT_DATA[speaker.entity.classId];
        if (classPool) pool.push(...classPool);

        const text = pool[Math.floor(Math.random() * pool.length)];
        speaker.entity.say(text);
        this._lastBanterTime = Date.now() / 1000;

        // 3. Potential Banter Response
        if (count > 1 && Math.random() < 0.4) {
            const responderIdx = (mainIdx + 1) % count;
            const responder = this.entities[responderIdx];
            const response = this._getBanterResponse(speaker.entity, text, responder.entity);
            if (response) {
                this._banterQueue.push({ memberId: responder.memberId, text: response });
            }
        }
    }

    _getBanterResponse(speaker, text, responder) {
        // Simple contextual response logic
        if (text.includes("leader") || text.includes("boss")) return "They're just... focused. I think.";
        if (text.includes("mana")) {
            if (responder.classId === 'warrior') return "Use a potion! I'm busy bleeding!";
            if (responder.classId === 'cleric') return "I'll mana-tide you after this pack.";
        }
        if (text.includes("fire")) return "My bad! The floor looked pretty.";
        if (text.includes("smooth")) return "Too easy. Next time, pull the whole room.";
        if (text.includes("shield")) return "Try not to break it, those are expensive.";
        
        // Default generic responses
        const generics = ["Agreed.", "Quiet down and keep moving.", "Whatever you say.", "Focus on the mobs!", "Focus up."];
        return generics[Math.floor(Math.random() * generics.length)];
    }

    _initDmgPool() {
        const container = document.createElement('div');
        container.id = 'party-dmg-pool';
        container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:100;';
        document.body.appendChild(container);

        for (let i = 0; i < DMG_POOL_SIZE; i++) {
            const el = document.createElement('div');
            el.style.cssText = 'position:absolute; font-weight:bold; font-family:Cinzel, serif; pointer-events:none; text-shadow:1px 1px 2px black; display:none;';
            container.appendChild(el);
            this._dmgPool.push({ el, timer: 0, startY: 0 });
        }
    }

    setPlayerGroup(group) { this._playerGroup = group; }
    setCombatEffects(fx) { this._combatEffects = fx; }

    setVisible(visible) {
        this._visible = visible;
        for (const ent of this.entities) {
            if (ent.entity.group) ent.entity.group.visible = visible;
            if (ent.ui && ent.ui.nameLabel) ent.ui.nameLabel.style.display = visible ? '' : 'none';
        }
        if (this._prospect) {
            this._prospect.entity.group.visible = visible;
            if (this._prospect.ui.nameLabel) {
                this._prospect.ui.nameLabel.style.display = visible ? '' : 'none';
            }
        }
    }

    onZoneChange() {
        if (!this._playerGroup) return;
        const pos = this._playerGroup.position;
        for (const entry of this.entities) {
            entry.entity.group.position.set(pos.x + (Math.random() - 0.5) * 4, 0, pos.z + (Math.random() - 0.5) * 4);
        }
        if (this._prospect) {
            this._prospect.entity.group.position.set(pos.x + 5, 0, pos.z + 5);
        }
    }

    syncMembers() {
        const dungeonInstance = dungeonSystem.instance;
        const raidInstance = raidSystem.instance;
        const bgInstance = battlegroundSystem.instance;

        const dungeonActive = dungeonInstance && (['entering', 'combat', 'forming', 'loot'].includes(dungeonInstance.state));
        const raidActive = raidInstance && (['forming', 'entering', 'combat', 'looting'].includes(raidInstance.state));
        const bgActive = bgInstance && (['forming', 'countdown', 'active'].includes(bgInstance.state));
        
        // Combine version checks to see if we need a sync
        const currentVersion = partySystem.version;
        const currentDungeonId = dungeonInstance ? dungeonInstance.def.id : 'none';
        const currentDungeonState = dungeonInstance ? dungeonInstance.state : 'none';
        const currentRaidId = raidInstance ? raidInstance.def.id : 'none';
        const currentRaidState = raidInstance ? raidInstance.state : 'none';
        const currentBgId = bgInstance ? bgInstance.def.id : 'none';
        const currentBgState = bgInstance ? bgInstance.state : 'none';
        
        if (this._lastPartyVersion === currentVersion && 
            this._lastDungeonId === currentDungeonId &&
            this._lastDungeonState === currentDungeonState &&
            this._lastRaidId === currentRaidId &&
            this._lastRaidState === currentRaidState &&
            this._lastBgId === currentBgId &&
            this._lastBgState === currentBgState) {
            return;
        }

        this._lastPartyVersion = currentVersion;
        this._lastDungeonId = currentDungeonId;
        this._lastDungeonState = currentDungeonState;
        this._lastRaidId = currentRaidId;
        this._lastRaidState = currentRaidState;
        this._lastBgId = currentBgId;
        this._lastBgState = currentBgState;

        // Determine source of truth: 
        // 1. Raid party if in raid
        // 2. BG team if in BG
        // 3. Dungeon party if in dungeon
        // 4. Overworld party
        let sourceMembers = partySystem.members;
        if (raidActive) {
            sourceMembers = raidInstance.partyMembers;
        } else if (bgActive) {
            sourceMembers = bgInstance.teamA.filter(c => c.isPartyMember);
        } else if (dungeonActive) {
            sourceMembers = dungeonInstance.partyMembers;
        }

        // Remove old entities that are no longer in source
        const activeIds = sourceMembers.map(m => m.id);
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entry = this.entities[i];
            if (!activeIds.includes(entry.memberId)) {
                entry.entity.destroy();
                if (entry.ui.nameLabel) entry.ui.nameLabel.remove();
                if (entry.ui.bubble) entry.ui.bubble.remove();
                this.entities.splice(i, 1);
            }
        }

        // Add new entities
        for (let i = 0; i < sourceMembers.length; i++) {
            const member = sourceMembers[i];
            if (!this.entities.find(e => e.memberId === member.id)) {
                // Ensure the member object has the expected methods for the entity
                if (typeof member.getDps !== 'function') {
                    member.getDps = () => member.dps || 10;
                }

                const entity = new PartyMemberEntity(this.scene, member, i);
                if (this._playerGroup) {
                    entity.group.position.copy(this._playerGroup.position);
                    entity.group.position.x += (Math.random() - 0.5) * 5;
                    entity.group.position.z += (Math.random() - 0.5) * 5;
                }
                const ui = this._createUI(member);
                this.entities.push({ memberId: member.id, entity, ui });
            }
        }
    }

    _createUI(member) {
        const info = CLASS_DISPLAY[member.classId] || CLASS_DISPLAY.warrior;
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'party-name-label';
        nameLabel.style.cssText = `
            position: fixed; padding: 4px 8px; background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(10,15,25,0.95) 100%);
            border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); border-left: 4px solid ${info.color};
            color: white; font-family: 'Cinzel', serif; font-size: 11px;
            display: none; pointer-events: none; z-index: 40; transform: translate(-50%, -100%);
            white-space: nowrap; flex-direction: column; align-items: center; gap: 4px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        `;
        nameLabel.innerHTML = `
            <div style="display:flex; align-items:center; gap:5px;">
                <span style="opacity:0.9">${info.icon}</span> <b>${member.name}</b> <span class="combat-ind" style="display:none">⚔️</span>
            </div>
            <div class="party-hp-bg" style="width:80px; height:4px; background:rgba(0,0,0,0.5); border-radius:2px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);">
                <div class="party-hp-fill" style="height:100%; width:100%; background:linear-gradient(90deg, #44cc44, #66ee66); transition:width 0.3s ease-out;"></div>
            </div>
        `;
        document.body.appendChild(nameLabel);

        const bubble = document.createElement('div');
        bubble.className = 'party-chat-bubble';
        bubble.style.cssText = `
            position: fixed; padding: 6px 12px; background: linear-gradient(180deg, rgba(15,20,30,0.9) 0%, rgba(5,10,15,0.95) 100%);
            color: #eee; border-radius: 10px; font-size: 12px; font-family: 'Inter', sans-serif;
            display: none; pointer-events: none; z-index: 41; transform: translate(-50%, -150%);
            max-width: 180px; text-align: center; border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 4px 15px rgba(0,0,0,0.4); font-weight: 500;
        `;
        document.body.appendChild(bubble);

        return { 
            nameLabel, 
            bubble, 
            combatInd: nameLabel.querySelector('.combat-ind'),
            hpFill: nameLabel.querySelector('.party-hp-fill')
        };
    }

    update(dt, time, world, mobManager) {
        this._currentWorld = world; // Cache for prospect update
        this.syncMembers();
        this._updateProspect(dt);
        this._tickDmgPool(dt);

        const inInst = world === null; // In main.js we pass null for world in instances
        this._updateSocial(dt, time, inInst);

        if (!this._visible) {
            for (const entry of this.entities) {
                entry.ui.nameLabel.style.display = 'none';
                entry.ui.bubble.style.display = 'none';
            }
            if (this._prospect && this._prospect.ui.nameLabel) {
                this._prospect.ui.nameLabel.style.display = 'none';
            }
            return;
        }

        if (!this._playerGroup) return;

        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

        this._uiFrame++;
        const throttleCount = this.entities.length > 5 ? 3 : 1;

        for (let i = 0; i < this.entities.length; i++) {
            const entry = this.entities[i];
            const combat = entry.entity.getCombatInfo();
            
            // 3D Update
            entry.entity.update(dt, time, this._playerGroup, world);

            // Damage trigger
            if (combat.lastDamage > 0) {
                this._showDmgNumber(entry.entity, combat.lastDamage, combat.wasCrit, combat.wasSkill);
            }

            // UI Update (throttled)
            if (this._uiFrame % throttleCount === i % throttleCount) {
                this._updateUI(entry, combat);
            }
        }
    }

    updateAI(mobManager) {
        if (!this._playerGroup) return;
        for (const e of this.entities) e.entity.updateAI(this._playerGroup, mobManager);
    }

    _updateUI(entry, combat) {
        const ent = entry.entity;
        const ui = entry.ui;
        const tv = this._tempVec;
        tv.copy(ent.group.position);

        const distSq = tv.distanceToSquared(this.camera.position);
        if (distSq > 3600) {
            ui.nameLabel.style.display = 'none';
            ui.bubble.style.display = 'none';
            return;
        }

        tv.y += 2.3;
        if (this._frustum.containsPoint(tv)) {
            tv.project(this.camera);
            const x = (tv.x * 0.5 + 0.5) * window.innerWidth;
            const y = (tv.y * -0.5 + 0.5) * window.innerHeight;

            ui.nameLabel.style.display = 'flex';
            ui.nameLabel.style.left = x + 'px';
            ui.nameLabel.style.top = y + 'px';

            if (ui.combatInd) {
                ui.combatInd.style.display = (combat && combat.inCombat) ? 'inline' : 'none';
            }

            if (ui.hpFill) {
                const hpPct = Math.max(0, Math.min(100, (ent.partyMember.hp / ent.partyMember.maxHp) * 100));
                ui.hpFill.style.width = `${hpPct}%`;
            }

            if (ent.showBubble && ent.lastMessage) {
                ui.bubble.textContent = ent.lastMessage;
                ui.bubble.style.display = 'block';
                ui.bubble.style.left = x + 'px';
                ui.bubble.style.top = (y - 30) + 'px';
            } else {
                ui.bubble.style.display = 'none';
            }
        } else {
            ui.nameLabel.style.display = 'none';
            ui.bubble.style.display = 'none';
        }
    }

    _showDmgNumber(entity, damage, isCrit, isSkill) {
        if (!entity.combatTarget) return;
        _screenVec.set(entity.combatTarget.x, 1.8, entity.combatTarget.z);
        _screenVec.project(this.camera);
        if (_screenVec.z > 1) return;

        const sx = (_screenVec.x * 0.5 + 0.5) * window.innerWidth + (Math.random() - 0.5) * 30;
        const sy = (_screenVec.y * -0.5 + 0.5) * window.innerHeight + (Math.random() - 0.5) * 10;

        const slot = this._dmgPool[this._dmgPoolIdx];
        this._dmgPoolIdx = (this._dmgPoolIdx + 1) % DMG_POOL_SIZE;

        const el = slot.el;
        el.textContent = damage;
        el.style.display = 'block';
        el.style.left = sx + 'px';
        el.style.top = sy + 'px';
        el.style.opacity = '1';
        el.style.fontSize = isCrit ? '17px' : isSkill ? '15px' : '13px';
        el.style.color = isCrit ? '#ff6644' : isSkill ? '#66ddff' : '#ffdd44';
        slot.timer = 0.8;
        slot.startY = sy;
    }

    _tickDmgPool(dt) {
        for (const slot of this._dmgPool) {
            if (slot.timer <= 0) continue;
            slot.timer -= dt;
            const t = Math.max(0, slot.timer / 0.8);
            slot.el.style.opacity = t;
            slot.el.style.top = (slot.startY - (1 - t) * 35) + 'px';
            if (slot.timer <= 0) {
                slot.el.style.display = 'none';
            }
        }
    }

    // ── Prospect (Invitation) Handling ──
    spawnProspect(member) {
        if (this._prospect) this._prospect.entity.destroy();
        const entity = new PartyMemberEntity(this.scene, member, 99);
        if (this._playerGroup) {
            entity.group.position.copy(this._playerGroup.position);
            entity.group.position.x += 6;
            entity.group.position.z += 2;
        }
        const ui = this._createUI(member);
        ui.nameLabel.innerHTML += ' <span style="color:#ffcc00; font-size:9px;">(INVITED)</span>';
        this._prospect = { entity, ui };
        entity.say(`An invite? Hmm... let me think.`);
    }

    resolveProspect(outcome, member) {
        if (!this._prospect) return;
        if (outcome === 'accept') {
            this._prospect.entity.say(`Alright, let's do this!`);
        } else {
            this._prospect.entity.say(`Maybe another time.`);
        }
        setTimeout(() => {
            if (this._prospect) {
                this._prospect.entity.destroy();
                this._prospect.ui.nameLabel.remove();
                this._prospect.ui.bubble.remove();
                this._prospect = null;
            }
            this.syncMembers();
        }, 3000);
    }

    _updateProspect(dt) {
        if (!this._prospect) return;
        // Prospect doesn't have a world reference usually, but we can try to pass one if we have it
        // In the current architecture, world is passed to update()
        this._prospect.entity.update(dt, Date.now()/1000, this._playerGroup, this._currentWorld);
        if (this._visible) {
            this._updateUI(this._prospect, null);
        }
    }

    showMemberBubble(memberId, text) {
        const entry = this.entities.find(e => e.memberId === memberId);
        if (entry) entry.entity.say(text);
    }

    getEntityCount() { return this.entities.length; }
}