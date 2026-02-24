// Full MMO UI Overlay - Matching reference screenshot layout exactly
import { CONFIG } from './config.js';
import { gameState, PARAGON_MILESTONES, PARAGON_CATEGORY_ICONS, PARAGON_STAT_ICONS } from './GameState.js';
import { questLog } from './QuestLog.js';
import { inventory } from './Inventory.js';
import { ICONS, iconImg, iconImgLg } from './icons.js';
import { saveManager } from './SaveManager.js';
import { audioManager } from './AudioManager.js';
import { talentTree, TALENT_BRANCHES, TALENT_ABILITIES } from './TalentTree.js';
import { upgradeStation, UPGRADE_TIERS, MAX_UPGRADE_TIER } from './UpgradeStation.js';
import { AETHERBIT_NAME } from './GameState.js';
import { goldShop, CONSUMABLE_BUFFS, GOLD_UPGRADES } from './GoldShop.js';
import { aetherbitShop, AETHERBIT_UPGRADES } from './AetherbitShop.js';
import { achievementManager, ACHIEVEMENT_DEFS } from './Achievements.js';
import { partySystem } from './PartySystem.js';
import { soulForge, SPEC_DEFS, SPEC_ABILITIES } from './SoulForge.js';
import { dungeonSystem, DUNGEON_DEFS } from './DungeonSystem.js';
import { companionSystem } from './CompanionSystem.js';
import { battlegroundSystem, BG_DEFS } from './BattlegroundSystem.js';
import { pvpVendor, PVP_GEAR, PVP_UPGRADES, VP_REWARDS } from './PvPVendor.js';
import { raidSystem, RAID_DEFS } from './RaidSystem.js';
import { raidVendor, RAID_GEAR, RAID_UPGRADES } from './RaidVendor.js';

const CLASS_DISPLAY = {
    warrior: { name: 'Aetherblade', color: '#66aaff', icon: '⚔️' },
    mage:    { name: 'Voidweaver',  color: '#cc88ff', icon: '🔮' },
    ranger:  { name: 'Thornwarden', color: '#88dd66', icon: '🏹' },
    cleric:  { name: 'Dawnkeeper',  color: '#ffdd66', icon: '✨' },
};

export class UI {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'mmo-ui';
        this.container.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 100; font-family: 'Segoe UI', Arial, sans-serif;
            overflow: hidden;
        `;
        document.body.appendChild(this.container);
        
        this.prevLevel = 1;
        this.damageNumbers = [];
        this._skillUnlockStates = new Array(gameState.getSkills().length).fill(false);
        this._talentBranchOpen = {};
        this._bgScoreboardOpen = true; // Track scoreboard collapse state
        this._unseenUpgrades = {
            gold: false, aether: false, enhance: false,
            talent: false, soulforge: false, pvp: false, raid: false
        };
        this._lastAffordable = { ...this._unseenUpgrades };
        this.buildUI();
        this.startDamageNumberSystem();
        this._setupAchievementListeners();
        this.setupAchievementPanel();
        this._setupInteractionTracking();
        window._showAchievementToast = (def) => this.showAchievementToast(def);
        window._showMasteryToast = (mobName, companionDef) => this.showMasteryToast(mobName, companionDef);
        window._showGearUpgradeToast = () => this.showGearUpgradeToast();
        window._showRaidClearToast = (raidDef, loot, time) => this.showRaidClearToast(raidDef, loot, time);
    }

    _setupInteractionTracking() {
        document.addEventListener('mousedown', () => {
            gameState.totalClicks++;
        });
    }

    _setupAchievementListeners() {
        this.container.addEventListener('click', (e) => {
            const achTab = e.target.closest('[data-ach-cat]');
            if (achTab) {
                const cat = achTab.getAttribute('data-ach-cat');
                this.container.querySelectorAll('[data-ach-cat]').forEach(t => t.classList.remove('active'));
                achTab.classList.add('active');
                this.renderAchievementList(cat);
            }
        });
    }

    /** Sync all UI tracking state to current game state — call after save load to prevent stale-delta popups */
    syncToCurrentState() {
        // Level tracking — prevent "LEVEL UP" popup replay
        this.prevLevel = gameState.level;

        // Boss defeat tracking — prevent boss toast replay
        this._lastDefeatedBossCount = gameState.defeatedBosses.size;
        this._knownDefeatedBosses = new Set(gameState.defeatedBosses);

        // Zone unlock tracking — prevent zone unlock toast replay
        this._lastZoneUnlockCount = CONFIG.ZONES.filter(z => gameState.canAccessZone(z.id)).length;

        // Quest notification tracking — skip any notifications already queued from save restoration
        this._lastNotifCount = questLog.notifications.length;

        // Loot notification tracking
        this._lastLootCount = inventory.lootNotifications.length;
        this._lootPopups = [];

        // Chat version tracker — detect new messages reliably even when
        // arrays are at max capacity (length stays constant after cap)
        this._lastChatVersion = gameState.chatVersion;

        // Skill unlock states — mark already-unlocked skills so they don't re-flash
        this.refreshSkillSlots(true);

        // Party system — start at -1 so first update always renders frames immediately
        this._lastPartyFrameVersion = -1;
        this.partyPanelOpen = false;
        this.dungeonPanelOpen = false;
        this.pvpPanelOpen = false;
        this.pvpVendorOpen = false;
        this.raidPanelOpen = false;
        this.raidVendorOpen = false;
        this._overworldHidden = false;
        this._raidPerfTab = 'dps';

        // Sync speed slider to loaded game speed
        const speedSlider = document.getElementById('speed-slider');
        const speedVal = document.getElementById('speed-widget-val');
        if (speedSlider) speedSlider.value = Math.round(gameState.gameSpeed);
        if (speedVal) speedVal.textContent = Math.round(gameState.gameSpeed) + 'x';

        // Sync Soul Forge action bar (spec may have been loaded from save)
        this._lastSfBarKey = '';
        // Pre-populate unlocked ability set so we don't fire false "just unlocked" animations on load
        const sfAbilities = soulForge.getSpecAbilities();
        this._lastSfUnlockedIds = new Set(sfAbilities.filter(a => a.unlocked).map(a => a.id));
        this._sfJustUnlocked = null;
        this._selectedMobId = null; // Track selected mob for raid markers
        this._lastRaidState = null; // Track raid state for automatic panel opening
        this._lastBgState = null; // Track BG state for automatic panel opening
        this._refreshSoulForgeBar();
    }

    /* ────── Skill Slot HTML helper ────── */
    _renderSkillSlot(skill, index) {
        const unlocked = gameState.level >= skill.unlockLevel;
        this._skillUnlockStates[index] = unlocked;
        return `
        <div class="skill-slot ${index === 0 ? 'active' : ''} ${unlocked ? '' : 'locked'}" id="skill-${index}" data-skill="${index}">
            <span class="skill-icon">${iconImgLg(skill.iconKey, 24)}</span>
            <span class="skill-keybind">${skill.slot}</span>
            <div class="skill-cooldown" id="skill-cd-${index}" style="display:none"></div>
            ${index === 0 ? '<div class="skill-glow"></div>' : ''}
            ${!unlocked ? `<div class="skill-lock-overlay" id="skill-lock-${index}">${iconImg('lock', 16, 'opacity:0.6;')}<span class="skill-lock-level">Lv ${skill.unlockLevel}</span></div>` : ''}
        </div>`;
    }

    /** Cache DOM element references to avoid repeated getElementById calls */
    _cacheDOM() {
        this._dom = {
            npText: document.getElementById('nameplate-text'),
            npHp: document.getElementById('np-hp'),
            npMana: document.getElementById('np-mana'),
            targetPlate: document.getElementById('target-plate'),
            targetName: document.getElementById('target-name'),
            targetHpFill: document.getElementById('target-hp-fill'),
            bossSubtitle: document.getElementById('boss-subtitle'),
            bossHpText: document.getElementById('boss-hp-text'),
            statXphr: document.getElementById('stat-xphr'),
            statGpm: document.getElementById('stat-gpm'),
            statGold: document.getElementById('stat-gold'),
            statKarma: document.getElementById('stat-karma'),
            eventNameText: document.getElementById('event-name-text'),
            eventBarFill: document.getElementById('event-bar-fill'),
            eventProgressText: document.getElementById('event-progress-text'),
            eventEst: document.getElementById('event-est'),
            manaBarFill: document.getElementById('mana-bar-fill'),
            manaText: document.getElementById('mana-text'),
            compFrame: document.getElementById('companion-frame'),
            compFrameName: document.getElementById('comp-frame-name'),
            compFrameDps: document.getElementById('comp-frame-dps'),
            compFrameBarFill: document.getElementById('comp-frame-bar-fill'),
            compFrameRespawn: document.getElementById('comp-frame-respawn'),
            sustainValue: document.getElementById('sustain-value'),
            dpsValue: document.getElementById('dps-value'),
            healthOrbFill: document.getElementById('health-orb-fill'),
            healthOrbText: document.getElementById('health-orb-text'),
            xpBarFill: document.getElementById('xp-bar-fill'),
            xpBarOverlayText: document.getElementById('xp-bar-overlay-text'),
            chatBody: document.getElementById('chat-body'),
            qlTitle: document.getElementById('ql-title'),
            qlQuests: document.getElementById('ql-quests'),
            qlCount: document.getElementById('ql-count'),
            bgLogContainer: document.getElementById('bg-log-container'),
            bgLogBody: document.getElementById('bg-log-body'),
            // qlStats removed — kill stats moved to Global tab in Medals
            talentBtnBadge: document.getElementById('talent-btn-badge'),
            bagFullBadge: document.getElementById('bag-full-badge'),
            invToggleBtn: document.getElementById('inv-toggle-btn'),
            paragonBtn: document.getElementById('paragon-btn'),
            paragonBtnBadge: document.getElementById('paragon-btn-badge'),
            buffBar: document.getElementById('buff-bar'),
            zoneBtn: document.getElementById('zone-btn'),
            zoneNewBadge: document.getElementById('zone-new-badge'),
            dungeonBtn: document.getElementById('dungeon-btn'),
            dungeonNewBadge: document.getElementById('dungeon-new-badge'),
            statSoulEssence: document.getElementById('stat-soul-essence'),
            statSoulEssenceRow: document.getElementById('stat-soul-essence-row'),
            statRaidPoints: document.getElementById('stat-raid-points'),
            statRaidPointsRow: document.getElementById('stat-raid-points-row'),
            statVp: document.getElementById('stat-vp'),
            statVpRow: document.getElementById('stat-vp-row'),
            soulforgeBar: document.getElementById('soulforge-bar'),
        };
        // Cache skill cooldown elements
        this._domSkillCd = [];
        const skills = gameState.getSkills();
        for (let i = 0; i < skills.length; i++) {
            this._domSkillCd.push(document.getElementById(`skill-cd-${i}`));
        }
    }

    buildUI() {
        this.container.innerHTML = `
        <style>
            /* Fonts loaded via index.html <link> — no @import needed here */
            
            #mmo-ui * { box-sizing: border-box; }
            
            .ui-panel {
                background: linear-gradient(180deg, rgba(10,15,10,0.85) 0%, rgba(5,10,5,0.92) 100%);
                border: 1px solid rgba(120,140,100,0.3);
                border-radius: 4px;
                backdrop-filter: blur(4px);
            }

            .ui-text { color: #ccddbb; font-family: 'Inter', sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }
            .ui-title { color: #eeddaa; font-family: 'Cinzel', serif; text-shadow: 1px 1px 3px rgba(0,0,0,0.9); }

            /* ---- TOP CENTER: Nameplate ---- */
            #nameplate {
                position: absolute; top: 28%; left: 50%; transform: translateX(-50%);
                text-align: center; transition: opacity 0.3s;
            }
            #nameplate-text {
                font-family: 'Cinzel', serif; font-size: 13px; color: #eeeedd;
                text-shadow: 0 0 6px rgba(0,0,0,0.9), 1px 1px 3px black;
                letter-spacing: 0.5px; margin-bottom: 3px;
            }
            #nameplate-bars { width: 180px; margin: 0 auto; }
            .nameplate-bar-bg {
                width: 100%; height: 8px; background: rgba(0,0,0,0.7);
                border: 1px solid rgba(80,80,80,0.5); border-radius: 2px;
                margin-bottom: 2px; overflow: hidden;
            }
            .nameplate-bar-fill { height: 100%; border-radius: 1px; transition: width 0.3s; }
            .hp-fill { background: linear-gradient(180deg, #44cc44 0%, #228822 100%); }
            .mana-fill { background: linear-gradient(180deg, #4488dd 0%, #2255aa 100%); }

            /* ---- TOP RIGHT: Minimap ---- */
            #minimap-container { position: absolute; top: 12px; right: 12px; pointer-events: auto; }
            #minimap {
                width: 140px; height: 140px; border-radius: 50%;
                background: radial-gradient(circle, #1a3a1a 0%, #0a1a0a 100%);
                border: 3px solid #4a4a3a;
                box-shadow: 0 0 15px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.5), 0 0 4px rgba(180,160,100,0.3);
                position: relative; overflow: hidden;
            }
            #minimap-canvas { width: 100%; height: 100%; border-radius: 50%; }
            #minimap-frame {
                position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px;
                border-radius: 50%; border: 2px solid rgba(180,160,100,0.4); pointer-events: none;
            }
            #minimap-compass {
                position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
                font-size: 10px; color: #ddbb66; font-weight: bold; text-shadow: 0 0 4px black;
            }

            /* ---- RIGHT PANEL: Stats (to the left of Nearby Events) ---- */
            #right-panel {
                position: absolute; top: 20px; right: 392px;
                width: 185px; text-align: right;
                background: linear-gradient(180deg, rgba(10,14,10,0.75) 0%, rgba(8,12,8,0.65) 100%);
                border: 1px solid rgba(100,80,50,0.25); border-radius: 4px;
                padding: 6px 10px;
            }
            .stat-row {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #ccddbb;
                text-shadow: 1px 1px 3px rgba(0,0,0,0.9); margin-bottom: 1px;
                display: flex; justify-content: flex-end; align-items: center; gap: 5px;
            }
            .stat-icon { font-size: 13px; }
            .stat-value { font-weight: 600; color: #eeddaa; min-width: 50px; text-align: right; font-size: 12px; }

            #events-panel {
                position: absolute; top: 20px; right: 170px;
                width: 195px; padding: 9px 11px; text-align: left; pointer-events: auto;
                z-index: 50;
            }
            #events-title {
                font-family: 'Cinzel', serif; font-size: 13px; color: #eeddaa;
                margin-bottom: 5px; display: flex; align-items: center; gap: 5px;
            }
            #event-name { font-size: 11px; color: #ddccaa; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
            #event-bar-bg {
                width: 100%; height: 10px; background: rgba(0,0,0,0.6);
                border: 1px solid rgba(100,80,50,0.4); border-radius: 2px; overflow: hidden; margin-bottom: 3px;
            }
            #event-bar-fill {
                height: 100%; background: linear-gradient(90deg, #cc4400 0%, #ffaa00 50%, #ffdd44 100%);
                border-radius: 1px; transition: width 0.5s;
            }
            #event-progress-text { font-size: 10px; color: #bbaa88; float: right; }
            #event-est { font-size: 10px; color: #999988; }

            /* ---- BOTTOM CENTER: Action Bar ---- */
            #bottom-bar {
                position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
                display: flex; align-items: flex-end; gap: 0; pointer-events: auto;
            }
            #action-bar-left { display: flex; align-items: flex-end; gap: 3px; margin-right: 5px; }
            #health-orb-container {
                position: relative; width: 72px; height: 82px;
                display: flex; align-items: flex-end; justify-content: center; flex-shrink: 0;
            }
            #health-orb {
                width: 66px; height: 66px; border-radius: 50%;
                background: radial-gradient(circle at 35% 35%, #ff3333 0%, #aa0000 40%, #660000 80%, #330000 100%);
                border: 3px solid #554422;
                box-shadow: 0 0 12px rgba(200,0,0,0.4), inset 0 0 12px rgba(0,0,0,0.5), 0 0 4px rgba(200,160,50,0.3);
                position: relative; overflow: hidden;
            }
            #health-orb-fill {
                position: absolute; bottom: 0; left: 0; width: 100%;
                background: radial-gradient(circle at 35% 65%, #ff4444 0%, #cc1111 60%, #880000 100%);
                transition: height 0.5s; border-radius: 0 0 50% 50%;
            }
            #health-orb-shine {
                position: absolute; top: 10px; left: 15px; width: 15px; height: 10px;
                background: radial-gradient(ellipse, rgba(255,200,200,0.4) 0%, transparent 100%); border-radius: 50%;
            }
            #health-orb-frame {
                position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
                border: 2px solid rgba(200,160,60,0.5); border-radius: 50%;
                box-shadow: inset 0 0 8px rgba(200,160,60,0.2);
            }
            #health-orb-text {
                position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700;
                color: #ffcccc; text-shadow: 0 0 4px black, 1px 1px 2px black;
                white-space: nowrap; z-index: 2;
            }
            #action-bar-right { display: flex; align-items: flex-end; gap: 3px; margin-left: 5px; }
            #talent-bar {
                display: flex; align-items: flex-end; gap: 3px; margin-left: 8px;
                padding-left: 8px; border-left: 2px solid rgba(100,80,50,0.3);
                position: relative;
            }
            #talent-bar-label {
                position: absolute; top: -13px; left: 8px;
                font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 1px;
                color: rgba(180,140,220,0.5); text-transform: uppercase;
                pointer-events: none; white-space: nowrap;
            }
            #talent-bar.has-abilities #talent-bar-label { color: rgba(180,140,220,0.8); }
            @keyframes talent-ability-unlock {
                0% { box-shadow: 0 0 25px rgba(180,120,255,0.9), inset 0 0 12px rgba(140,80,200,0.5); border-color: rgba(220,180,255,1); transform: scale(1.15); }
                100% { box-shadow: inset 0 0 8px rgba(0,0,0,0.6); border-color: rgba(140,100,180,0.6); transform: scale(1); }
            }
            .talent-slot.just-unlocked { animation: talent-ability-unlock 1.2s ease-out; }
            #soulforge-bar {
                display: none; align-items: flex-end; gap: 3px; margin-left: 6px;
                padding-left: 6px; border-left: 2px solid rgba(255,120,40,0.2);
                position: relative;
            }
            #soulforge-bar.active { display: flex; }
            #sf-bar-label {
                position: absolute; top: -13px; left: 8px;
                font-family: 'Cinzel', serif; font-size: 8px; letter-spacing: 1px;
                color: rgba(255,160,80,0.5); text-transform: uppercase;
                pointer-events: none; white-space: nowrap;
            }
            #soulforge-bar.has-abilities #sf-bar-label { color: rgba(255,160,80,0.8); }
            .sf-slot {
                width: 42px; height: 42px;
                background: linear-gradient(180deg, rgba(30,18,10,0.95) 0%, rgba(20,12,6,0.98) 100%);
                border: 2px solid rgba(255,120,40,0.25); border-radius: 4px;
                display: flex; align-items: center; justify-content: center;
                position: relative; cursor: default; transition: border-color 0.2s, box-shadow 0.3s;
                box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
            }
            .sf-slot.unlocked {
                border-color: rgba(255,140,50,0.5); cursor: pointer;
                animation: sf-slot-ready 3s ease-in-out infinite;
            }
            .sf-slot.unlocked:hover { border-color: rgba(255,180,80,0.8); box-shadow: 0 0 12px rgba(255,140,50,0.3), inset 0 0 8px rgba(0,0,0,0.4); }
            .sf-slot.empty { opacity: 0.5; cursor: help; }
            .sf-slot.empty:hover { opacity: 0.7; border-color: rgba(255,140,60,0.35); }
            @keyframes sf-ability-unlock {
                0% { box-shadow: 0 0 25px rgba(255,160,50,0.9), inset 0 0 12px rgba(255,120,40,0.5); border-color: rgba(255,200,100,1); transform: scale(1.15); }
                100% { box-shadow: inset 0 0 8px rgba(0,0,0,0.6); border-color: rgba(255,140,50,0.5); transform: scale(1); }
            }
            .sf-slot.just-unlocked { animation: sf-ability-unlock 1.2s ease-out; }
            .sf-slot .skill-icon { font-size: 20px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)); }
            .sf-slot .skill-keybind {
                position: absolute; bottom: 1px; right: 3px; font-size: 8px;
                color: rgba(255,160,80,0.6); font-weight: 600;
            }
            .sf-slot .sf-cooldown {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
                font-size: 13px; color: #ffaa66; font-weight: 600; border-radius: 3px;
            }
            .sf-slot .sf-lock-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                pointer-events: none; font-size: 14px;
            }
            .sf-slot .sf-lock-tier {
                position: absolute; bottom: 2px; right: 3px;
                font-family: 'Inter', sans-serif; font-size: 7px; font-weight: 700;
                color: #aa7744; text-shadow: 0 0 3px black;
                pointer-events: none;
            }
            .sf-slot.on-cooldown .skill-icon { filter: saturate(0.3) brightness(0.5); }
            @keyframes sf-slot-ready {
                0%, 100% { box-shadow: 0 0 4px rgba(255,120,40,0.15), inset 0 0 8px rgba(0,0,0,0.4); }
                50% { box-shadow: 0 0 10px rgba(255,140,50,0.3), inset 0 0 8px rgba(0,0,0,0.3); }
            }
            @keyframes sf-proc-flash {
                0% { box-shadow: 0 0 20px rgba(255,160,50,0.8), inset 0 0 12px rgba(255,120,40,0.4); border-color: rgba(255,200,80,0.9); }
                100% { box-shadow: 0 0 4px rgba(255,120,40,0.15), inset 0 0 8px rgba(0,0,0,0.4); border-color: rgba(255,140,50,0.5); }
            }
            .sf-slot.proc-flash { animation: sf-proc-flash 0.6s ease-out; }
            .talent-slot {
                width: 42px; height: 42px;
                background: linear-gradient(180deg, rgba(25,20,30,0.95) 0%, rgba(15,12,20,0.98) 100%);
                border: 2px solid rgba(80,60,100,0.4); border-radius: 4px;
                display: flex; align-items: center; justify-content: center;
                position: relative; cursor: default; transition: border-color 0.2s;
                box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
            }
            .talent-slot.unlocked { border-color: rgba(140,100,180,0.6); cursor: pointer; }
            .talent-slot.unlocked:hover { border-color: rgba(200,150,255,0.8); }
            .talent-slot.empty { opacity: 0.35; cursor: help; }
            .talent-slot.empty:hover { opacity: 0.55; border-color: rgba(120,80,160,0.5); }
            .talent-slot .talent-lock-req {
                position: absolute; bottom: 0; left: 0; right: 0;
                font-family: 'Inter', sans-serif; font-size: 7px; font-weight: 700;
                color: #aa88cc; text-align: center; text-shadow: 0 0 3px black;
                line-height: 1; padding-bottom: 2px; pointer-events: none;
            }
            .talent-slot .skill-icon { font-size: 20px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)); }
            .talent-slot .skill-keybind {
                position: absolute; bottom: 1px; right: 3px; font-size: 8px;
                color: rgba(180,140,220,0.7); font-weight: 600;
            }
            .talent-slot .skill-cooldown {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
                font-size: 13px; color: #ddbbff; font-weight: 600; border-radius: 3px;
            }
            .talent-slot .talent-lock-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                pointer-events: none; font-size: 14px; opacity: 0.4;
            }

            .skill-slot {
                width: 46px; height: 46px;
                background: linear-gradient(180deg, rgba(30,25,15,0.95) 0%, rgba(20,18,10,0.98) 100%);
                border: 2px solid rgba(120,100,60,0.5); border-radius: 4px;
                display: flex; align-items: center; justify-content: center;
                position: relative; cursor: pointer; transition: border-color 0.2s, transform 0.1s;
                box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
            }
            .skill-slot:hover { border-color: rgba(200,170,80,0.8); }
            .skill-slot:active { transform: scale(0.93); }
            .skill-slot.active { border-color: rgba(255,200,50,0.8); box-shadow: 0 0 10px rgba(255,200,50,0.3), inset 0 0 8px rgba(0,0,0,0.4); }
            .skill-slot.locked { opacity: 0.35; cursor: default; }
            .skill-slot.locked:hover { border-color: rgba(120,100,60,0.5); }
            .skill-slot.locked:active { transform: none; }
            .skill-icon { font-size: 22px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)); }
            .skill-keybind {
                position: absolute; bottom: 1px; right: 3px; font-size: 9px;
                color: rgba(200,180,120,0.7); font-weight: 600;
            }
            .skill-cooldown {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
                font-size: 14px; color: #ffddaa; font-weight: 600; border-radius: 3px;
            }
            .skill-glow {
                position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px;
                border: 2px solid rgba(255,200,50,0.6); border-radius: 5px;
                animation: skill-pulse 1.5s infinite; pointer-events: none;
            }
            .skill-lock-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                border-radius: 3px; pointer-events: none;
            }
            .skill-lock-level {
                font-family: 'Inter', sans-serif; font-size: 8px; font-weight: 700;
                color: #998866; text-shadow: 0 0 3px black; margin-top: 2px;
            }
            @keyframes skill-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }

            /* ---- Skill Tooltip ---- */
            .skill-tooltip {
                position: fixed;
                background: linear-gradient(180deg, rgba(10,16,8,0.97) 0%, rgba(5,8,4,0.99) 100%);
                border: 1px solid rgba(140,120,60,0.5); border-radius: 5px;
                padding: 10px 14px; min-width: 200px; max-width: 260px;
                z-index: 400; pointer-events: none;
                box-shadow: 0 4px 20px rgba(0,0,0,0.7); backdrop-filter: blur(6px);
            }
            .stt-name { font-family: 'Cinzel', serif; font-size: 13px; text-shadow: 1px 1px 3px black; margin-bottom: 2px; }
            .stt-meta { font-family: 'Inter', sans-serif; font-size: 10px; color: #889977; margin-bottom: 5px; display: flex; gap: 10px; }
            .stt-desc { font-family: 'Inter', sans-serif; font-size: 11px; color: #bbccaa; line-height: 1.4; margin-bottom: 4px; }
            .stt-unlock { font-family: 'Inter', sans-serif; font-size: 10px; color: #cc8855; font-style: italic; }
            .stt-unlock.ready { color: #66cc66; }

            /* ---- Status Bars (above action bar) ---- */
            #bottom-status {
                position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
                width: 440px; max-width: 90vw;
                display: flex; flex-direction: column; gap: 3px; pointer-events: none;
            }
            .status-bar-row { display: flex; align-items: center; gap: 6px; }
            .status-bar-label {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #99aa88;
                text-shadow: 1px 1px 2px black; min-width: 62px; text-align: right;
            }
            .status-bar-bg {
                flex: 1; height: 10px; background: rgba(0,0,0,0.6);
                border: 1px solid rgba(80,100,80,0.3); border-radius: 2px; overflow: hidden; position: relative;
            }
            .status-bar-fill { height: 100%; border-radius: 1px; transition: width 0.3s; }

            .status-bar-fill.mana { background: linear-gradient(180deg, #5588dd 0%, #3355aa 100%); }
            .status-bar-text {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #bbccaa;
                text-shadow: 1px 1px 2px black; min-width: 50px;
            }
            #dps-display {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #ddccaa;
                text-shadow: 1px 1px 2px black; text-align: center; margin-bottom: 1px;
            }

            /* ---- BOTTOM LEFT: Chat ---- */
            #chat-container { position: absolute; bottom: 10px; left: 10px; width: 310px; pointer-events: auto; }
            #chat-tabs { display: flex; gap: 0; margin-bottom: 0; }
            .chat-tab {
                padding: 4px 14px; font-size: 12px; color: #99aa88;
                background: rgba(10,15,10,0.7); border: 1px solid rgba(80,80,60,0.3);
                border-bottom: none; border-radius: 4px 4px 0 0; cursor: pointer; font-family: 'Inter', sans-serif;
            }
            .chat-tab.active { color: #eeddaa; background: rgba(15,20,15,0.85); }
            #chat-body {
                background: linear-gradient(180deg, rgba(5,10,5,0.75) 0%, rgba(8,12,8,0.85) 100%);
                border: 1px solid rgba(80,80,60,0.3); border-radius: 0 4px 4px 4px;
                padding: 6px 8px; height: 120px; overflow-y: auto; backdrop-filter: blur(3px);
            }
            #chat-body::-webkit-scrollbar { width: 4px; }
            #chat-body::-webkit-scrollbar-thumb { background: rgba(100,100,80,0.3); border-radius: 2px; }
            .chat-line {
                font-size: 11.5px; color: #aabb99; line-height: 1.5;
                font-family: 'Inter', sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
            }
            .chat-channel { color: #667755; }
            .chat-channel-map { color: #88aa77; }
            /* guild channel removed */
            .chat-channel-game { color: #ddaa44; }
            .chat-channel-say { color: #aaddaa; }
            .chat-channel-party { color: #66bbff; }
            .chat-channel-bg { color: #aa66ff; font-weight: 700; }
            .chat-channel-boss { color: #ffcc44; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .chat-user { color: #ccbb88; }
            .chat-user-boss { color: #ff4444; font-weight: 700; text-shadow: 0 0 8px rgba(255,0,0,0.4); }
            .chat-line-boss { 
                background: rgba(255,50,0,0.1); 
                border-left: 2px solid rgba(255,50,0,0.4);
                padding-left: 4px;
                margin: 2px 0;
            }
            .chat-system { color: #ffcc44; font-weight: 500; }

            /* ---- XP Bar (very bottom) ---- */
            #xp-bar-container {
                position: absolute; bottom: 0; left: 0; width: 100%; height: 14px;
                background: linear-gradient(180deg, rgba(20,10,30,0.85) 0%, rgba(10,5,18,0.95) 100%);
                border-top: 1px solid rgba(120,80,180,0.25);
                pointer-events: auto; cursor: pointer; z-index: 110;
                transition: height 0.2s ease, border-top-color 0.2s;
            }
            #xp-bar-fill {
                height: 100%; background: linear-gradient(90deg, #7733bb, #9955dd, #bb77ff);
                transition: width 0.5s; box-shadow: 0 0 8px rgba(170,100,255,0.35);
                position: relative;
            }
            #xp-bar-fill.max-level {
                background: linear-gradient(90deg, #cc8800, #ffcc44, #ffe066, #ffcc44, #cc8800);
                box-shadow: 0 0 12px rgba(255,200,60,0.5);
                animation: xp-max-shimmer 3s ease-in-out infinite;
            }
            @keyframes xp-max-shimmer {
                0%, 100% { filter: brightness(1.0); }
                50% { filter: brightness(1.3); }
            }
            #xp-bar-fill::after {
                content: ''; position: absolute; top: 0; left: 0; right: 0; height: 40%;
                background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%);
                pointer-events: none;
            }
            #xp-bar-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.2s; pointer-events: none;
            }
            #xp-bar-container:hover #xp-bar-overlay { opacity: 1; }
            #xp-bar-container:hover { height: 20px; border-top-color: rgba(160,100,220,0.45); }
            #xp-bar-overlay-text {
                font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
                color: #eeddff; text-shadow: 0 0 6px rgba(0,0,0,1), 1px 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(100,60,180,0.5);
                letter-spacing: 0.3px; white-space: nowrap;
                display: flex; align-items: center; gap: 6px;
            }

            /* ---- Target nameplate ---- */
            #target-plate {
                position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
                text-align: center; transition: opacity 0.3s; opacity: 0;
            }
            #target-plate.visible { opacity: 1; }
            #target-name {
                font-family: 'Cinzel', serif; font-size: 12px; color: #ff8866;
                text-shadow: 0 0 6px rgba(0,0,0,0.9), 1px 1px 3px black; margin-bottom: 2px;
            }
            #target-hp-bg {
                width: 160px; height: 7px; background: rgba(0,0,0,0.7);
                border: 1px solid rgba(120,60,60,0.5); border-radius: 2px; overflow: hidden; margin: 0 auto;
            }
            #target-hp-fill { height: 100%; background: linear-gradient(180deg, #cc3333 0%, #882222 100%); transition: width 0.2s; }

            /* ---- Boss nameplate (enhanced target plate) ---- */
            #target-plate.boss { }
            #target-plate.boss #target-name {
                font-size: 16px; color: #ffcc44; letter-spacing: 1px;
                text-shadow: 0 0 12px rgba(255,180,40,0.5), 0 0 6px rgba(0,0,0,0.9), 1px 1px 3px black;
            }
            #target-plate.boss #target-hp-bg {
                width: 240px; height: 12px;
                border: 1px solid rgba(200,160,60,0.6);
                box-shadow: 0 0 8px rgba(200,160,60,0.2);
            }
            #target-plate.boss #target-hp-fill {
                background: linear-gradient(180deg, #ff6633 0%, #cc2211 50%, #881100 100%);
                box-shadow: inset 0 0 6px rgba(255,200,100,0.3);
            }
            #boss-subtitle {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #cc9944;
                text-shadow: 1px 1px 3px black; letter-spacing: 1.5px;
                text-transform: uppercase; margin-bottom: 3px; display: none;
            }
            #target-plate.boss #boss-subtitle { display: block; }
            #boss-hp-text {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #ffccaa;
                text-shadow: 1px 1px 2px black; margin-top: 2px; display: none;
            }
            #target-plate.boss #boss-hp-text { display: block; }

            /* Boss defeat celebration */
            .boss-defeat-toast { position: relative; margin-bottom: 10px; transform: scale(0.8); text-align: center; pointer-events: none; opacity: 0; z-index: 230; animation: hero-toast-anim 5s ease-out forwards; }
            .boss-defeat-inner {
                background: linear-gradient(180deg, rgba(20,12,4,0.96) 0%, rgba(10,6,2,0.98) 100%);
                border: 2px solid rgba(255,200,60,0.6); border-radius: 8px; padding: 16px 36px;
                box-shadow: 0 0 40px rgba(255,180,40,0.2), 0 0 80px rgba(255,140,20,0.08),
                            inset 0 0 20px rgba(0,0,0,0.5); backdrop-filter: blur(6px);
            }
            .boss-defeat-label {
                font-family: 'Cinzel', serif; font-size: 12px; color: #cc9944;
                text-transform: uppercase; letter-spacing: 3px; margin-bottom: 4px;
            }
            .boss-defeat-name {
                font-family: 'Cinzel', serif; font-size: 24px; font-weight: 700; color: #ffdd44;
                text-shadow: 0 0 16px rgba(255,200,60,0.5), 0 0 30px rgba(255,160,20,0.2), 2px 2px 6px black;
            }
            .boss-defeat-subtitle {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #bbaa77; margin-top: 6px;
            }
            .boss-defeat-rewards {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #eeddaa; margin-top: 8px;
                display: flex; gap: 12px; justify-content: center;
            }

            /* ---- Victory Overlay ---- */
            #victory-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0); z-index: 500; pointer-events: none;
                display: none; align-items: center; justify-content: center;
                transition: background 1.5s ease;
            }
            #victory-overlay.active { display: flex; pointer-events: auto; background: rgba(0,0,0,0.85); }
            #victory-content {
                text-align: center; max-width: 520px; padding: 40px 50px;
                background: linear-gradient(180deg, rgba(20,10,5,0.97) 0%, rgba(8,4,2,0.99) 100%);
                border: 2px solid rgba(255,200,60,0.5); border-radius: 12px;
                box-shadow: 0 0 80px rgba(255,180,40,0.15), 0 0 200px rgba(255,140,20,0.05),
                            inset 0 0 30px rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
                transform: scale(0.8); opacity: 0;
                transition: transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.8s ease;
            }
            #victory-overlay.active #victory-content { transform: scale(1); opacity: 1; }
            .victory-crown { font-size: 48px; margin-bottom: 8px; animation: victory-crown-pulse 2s ease-in-out infinite; }
            @keyframes victory-crown-pulse {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255,200,60,0.5)); }
                50% { transform: scale(1.1); filter: drop-shadow(0 0 20px rgba(255,200,60,0.8)); }
            }
            .victory-title {
                font-family: 'Cinzel', serif; font-size: 28px; font-weight: 700;
                color: #ffdd44; text-shadow: 0 0 30px rgba(255,200,60,0.5), 2px 2px 8px black;
                margin-bottom: 6px; letter-spacing: 2px;
            }
            .victory-subtitle {
                font-family: 'Cinzel', serif; font-size: 14px; color: #cc9944;
                text-transform: uppercase; letter-spacing: 3px; margin-bottom: 20px;
            }
            .victory-rewards {
                display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;
                margin-bottom: 20px; padding: 12px 16px;
                background: rgba(0,0,0,0.3); border-radius: 6px;
                border: 1px solid rgba(200,150,60,0.2);
            }
            .victory-reward {
                font-family: 'Inter', sans-serif; font-size: 13px; color: #eeddaa;
                display: flex; align-items: center; gap: 5px;
            }
            .victory-reward .vr-val { font-weight: 700; color: #ffdd44; }
            .victory-unlock {
                margin-top: 16px; padding: 14px 18px;
                background: linear-gradient(180deg, rgba(160,80,255,0.15) 0%, rgba(100,40,200,0.1) 100%);
                border: 1px solid rgba(180,100,255,0.4); border-radius: 8px;
            }
            .victory-unlock-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #cc88ff;
                text-shadow: 0 0 12px rgba(180,100,255,0.5); margin-bottom: 6px;
                display: flex; align-items: center; gap: 8px; justify-content: center;
            }
            .victory-unlock-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #aa99cc;
                line-height: 1.5;
            }
            .victory-close-btn {
                margin-top: 20px; font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600;
                padding: 10px 32px; border-radius: 6px; cursor: pointer;
                border: 2px solid rgba(255,200,60,0.5);
                background: linear-gradient(180deg, rgba(180,140,40,0.3) 0%, rgba(120,80,20,0.4) 100%);
                color: #ffdd88; text-shadow: 1px 1px 3px black;
                transition: all 0.2s; box-shadow: 0 0 12px rgba(200,150,60,0.1);
            }
            .victory-close-btn:hover { border-color: rgba(255,200,60,0.8); box-shadow: 0 0 20px rgba(200,150,60,0.2); }

            /* ---- Paragon Milestones Panel ---- */
            #paragon-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 600px; max-width: 96vw; max-height: 88vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(10,6,16,0.97) 0%, rgba(5,3,10,0.99) 100%);
                border: 1px solid rgba(180,100,255,0.4); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(140,80,220,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 310; overflow: hidden;
            }
            #paragon-panel.open { display: flex; flex-direction: column; }
            #paragon-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(180,100,255,0.25);
                background: rgba(0,0,0,0.25);
            }
            #paragon-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #cc88ff;
                text-shadow: 1px 1px 4px black; display: flex; align-items: center; gap: 8px;
            }
            #paragon-points-display {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #bbaa88;
                display: flex; align-items: center; gap: 12px;
            }
            #paragon-level-header {
                color: #cc88ff; font-weight: 600; font-size: 13px;
                text-shadow: 0 0 6px rgba(180,100,255,0.3);
            }
            #paragon-close {
                font-size: 20px; color: #998877; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            #paragon-close:hover { color: #ffddcc; }
            #paragon-body { padding: 12px 16px; overflow-y: auto; flex: 1; }
            .paragon-level-display {
                text-align: center; margin-bottom: 14px; padding: 10px;
                background: rgba(0,0,0,0.3); border-radius: 6px;
                border: 1px solid rgba(140,80,220,0.15);
            }
            .paragon-level-num {
                font-family: 'Cinzel', serif; font-size: 28px; font-weight: 700;
                color: #cc88ff; text-shadow: 0 0 16px rgba(180,100,255,0.4);
            }
            .paragon-level-label {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #8877aa;
                text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;
            }
            .paragon-maxed-label {
                font-family: 'Cinzel', serif; font-size: 12px; color: #ffdd44;
                text-shadow: 0 0 8px rgba(255,200,60,0.4); margin-top: 4px;
            }
            .paragon-xp-bar-bg {
                width: 100%; height: 10px; background: rgba(0,0,0,0.6);
                border: 1px solid rgba(140,80,220,0.3); border-radius: 4px;
                overflow: hidden; margin-top: 6px;
            }
            .paragon-xp-bar-fill {
                height: 100%; border-radius: 3px;
                background: linear-gradient(90deg, #8844cc, #bb66ff, #dd88ff);
                transition: width 0.5s; box-shadow: 0 0 6px rgba(180,100,255,0.3);
            }
            .paragon-xp-text {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #aa88cc;
                text-align: center; margin-top: 3px;
            }
            .paragon-milestone-list {
                display: flex; flex-direction: column; gap: 3px;
            }
            .paragon-milestone {
                display: flex; align-items: center; gap: 10px; padding: 7px 10px;
                border-radius: 5px; border: 1px solid rgba(100,80,140,0.15);
                background: linear-gradient(180deg, rgba(12,8,20,0.5) 0%, rgba(8,5,14,0.6) 100%);
                transition: all 0.2s; position: relative; overflow: hidden;
            }
            .paragon-milestone.unlocked {
                border-color: rgba(180,100,255,0.35);
                background: linear-gradient(180deg, rgba(30,15,50,0.6) 0%, rgba(15,8,30,0.7) 100%);
            }
            .paragon-milestone.unlocked::before {
                content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
                background: linear-gradient(180deg, #bb66ff, #8844cc);
                box-shadow: 0 0 8px rgba(180,100,255,0.4);
            }
            .paragon-milestone.locked {
                opacity: 0.45;
            }
            .paragon-milestone.next-unlock {
                opacity: 0.75; border-color: rgba(180,100,255,0.25);
                animation: paragon-pulse 2s ease-in-out infinite;
            }
            @keyframes paragon-pulse {
                0%, 100% { box-shadow: 0 0 0 rgba(180,100,255,0); }
                50% { box-shadow: 0 0 10px rgba(180,100,255,0.15); }
            }
            .paragon-ms-level {
                font-family: 'Cinzel', serif; font-size: 11px; font-weight: 700;
                width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
                border-radius: 50%; border: 2px solid rgba(100,80,140,0.3);
                background: rgba(0,0,0,0.4); flex-shrink: 0;
            }
            .paragon-milestone.unlocked .paragon-ms-level {
                border-color: rgba(180,100,255,0.6); color: #cc88ff;
                background: rgba(140,80,220,0.15);
            }
            .paragon-ms-icon { flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
            .paragon-ms-icon img { width: 24px; height: 24px; object-fit: contain; filter: drop-shadow(0 0 3px rgba(0,0,0,0.5)); }
            .paragon-milestone.locked .paragon-ms-icon img { filter: grayscale(0.7) brightness(0.5) drop-shadow(0 0 2px rgba(0,0,0,0.3)); }
            .paragon-ms-info { flex: 1; min-width: 0; }
            .paragon-ms-name {
                font-family: 'Cinzel', serif; font-size: 12px;
                text-shadow: 1px 1px 3px black; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis;
            }
            .paragon-ms-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #8899aa;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .paragon-milestone.unlocked .paragon-ms-desc { color: #aabb99; }
            .paragon-ms-status {
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600;
                padding: 2px 8px; border-radius: 10px; flex-shrink: 0;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .paragon-ms-status.active {
                color: #88ff88; border: 1px solid rgba(100,255,100,0.3);
                background: rgba(80,200,80,0.1);
            }
            .paragon-ms-status.locked-status {
                color: #667766; border: 1px solid rgba(100,100,100,0.2);
                background: rgba(0,0,0,0.2);
            }
            .paragon-ms-status.next-status {
                color: #cc88ff; border: 1px solid rgba(180,100,255,0.3);
                background: rgba(140,80,220,0.1);
            }
            .paragon-summary-section {
                margin-top: 12px; padding: 10px 12px; border-radius: 6px;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(140,80,220,0.15);
            }
            .paragon-summary-title {
                font-family: 'Cinzel', serif; font-size: 12px; color: #cc88ff;
                text-align: center; margin-bottom: 8px; text-transform: uppercase;
                letter-spacing: 1px;
            }
            .paragon-summary-grid {
                display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;
            }
            .paragon-summary-stat {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #aa9988;
                display: flex; justify-content: space-between; align-items: center;
            }
            .paragon-summary-stat img { margin-right: 3px; }
            .paragon-summary-stat .ps-val { font-weight: 700; }

            /* ---- Damage numbers ---- */
            .dmg-number {
                position: absolute; font-family: 'Cinzel', serif; font-weight: 700; font-size: 18px;
                color: #ffdd44; text-shadow: 0 0 4px rgba(0,0,0,0.9), 2px 2px 4px black;
                pointer-events: none; animation: dmg-float 1.2s ease-out forwards; z-index: 200;
            }
            .dmg-number.crit { font-size: 26px; color: #ff6644; }
            @keyframes dmg-float {
                0% { transform: translateY(0) scale(1.2); opacity: 1; }
                30% { transform: translateY(-20px) scale(1); opacity: 1; }
                100% { transform: translateY(-50px) scale(0.8); opacity: 0; }
            }

            /* ---- Level Up notification ---- */
            #level-up-notification {
                position: absolute; top: 35%; left: 50%; transform: translateX(-50%);
                text-align: center; opacity: 0; transition: opacity 0.5s; pointer-events: none;
            }
            #level-up-notification.visible { opacity: 1; animation: level-up-pulse 2.5s ease-out forwards; }
            @keyframes level-up-pulse {
                0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
                20% { transform: translateX(-50%) scale(1.2); opacity: 1; }
                40% { transform: translateX(-50%) scale(1); opacity: 1; }
                100% { transform: translateX(-50%) scale(1); opacity: 0; }
            }
            #level-up-text {
                font-family: 'Cinzel', serif; font-size: 32px; font-weight: 700; color: #ffdd44;
                text-shadow: 0 0 20px rgba(255,200,50,0.6), 2px 2px 6px black;
            }
            #level-up-sub { font-family: 'Inter', sans-serif; font-size: 14px; color: #ddccaa; text-shadow: 1px 1px 3px black; }
            #skill-unlock-text {
                font-family: 'Inter', sans-serif; font-size: 13px; color: #66ccff;
                text-shadow: 0 0 8px rgba(100,180,255,0.5), 1px 1px 3px black; margin-top: 4px;
            }

            /* ---- QUEST LOG PANEL ---- */
            #quest-log-panel {
                position: absolute; top: 12px; left: 12px; width: 295px;
                pointer-events: auto; max-height: calc(100vh - 170px); display: flex; flex-direction: column;
            }
            #ql-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 7px 10px;
                background: linear-gradient(180deg, rgba(12,18,10,0.92) 0%, rgba(8,14,8,0.95) 100%);
                border: 1px solid rgba(120,140,100,0.35); border-bottom: none;
                border-radius: 5px 5px 0 0; cursor: pointer; user-select: none;
            }
            #ql-header:hover { border-color: rgba(180,160,80,0.5); }
            #ql-title {
                font-family: 'Cinzel', serif; font-size: 13px; color: #eeddaa;
                text-shadow: 1px 1px 3px black; display: flex; align-items: center; gap: 6px;
            }
            #ql-toggle { font-size: 11px; color: #889977; transition: transform 0.25s; }
            #ql-toggle.collapsed { transform: rotate(-90deg); }
            #ql-count { font-family: 'Inter', sans-serif; font-size: 11px; color: #889977; margin-left: 4px; }
            #ql-body {
                background: linear-gradient(180deg, rgba(6,10,6,0.88) 0%, rgba(4,8,4,0.92) 100%);
                border: 1px solid rgba(120,140,100,0.25); border-top: none; border-radius: 0 0 5px 5px;
                padding: 0; overflow-y: auto; transition: max-height 0.3s ease, padding 0.3s ease;
                max-height: 600px; backdrop-filter: blur(3px);
            }
            #ql-body.collapsed { max-height: 0; padding: 0; overflow: hidden; }
            #ql-body::-webkit-scrollbar { width: 4px; }
            #ql-body::-webkit-scrollbar-thumb { background: rgba(100,100,80,0.3); border-radius: 2px; }

            /* ---- BATTLEGROUND ACTION LOG ---- */
            #bg-log-container {
                display: none; flex-direction: column; height: 100%; max-height: 400px;
                background: rgba(10,5,15,0.4);
            }
            #bg-log-container.active { display: flex; }
            #bg-log-body {
                padding: 10px; overflow-y: auto; flex: 1;
                font-family: 'Inter', sans-serif; font-size: 11px; line-height: 1.4;
            }
            .bg-log-line {
                margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.03);
                padding-bottom: 2px; text-shadow: 1px 1px 2px black;
            }
            .bg-log-time { color: #666; font-size: 9px; margin-right: 5px; font-family: monospace; }
            .bg-log-user { font-weight: 700; color: #ccaaee; }
            .bg-log-msg { color: #eee; }
            .bg-log-system { color: #ffcc44; font-weight: 600; font-style: italic; }

            /* ---- HD GRAPHICS TOGGLE ---- */
            #hd-toggle-btn {
                position: absolute; top: 12px; left: 320px;
                pointer-events: auto; cursor: pointer; user-select: none;
                display: flex; align-items: center; gap: 5px;
                padding: 5px 10px; border-radius: 4px;
                background: linear-gradient(180deg, rgba(12,18,10,0.88) 0%, rgba(8,14,8,0.92) 100%);
                border: 1px solid rgba(100,120,100,0.3);
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500;
                color: #889988; letter-spacing: 0.3px;
                transition: all 0.25s ease;
                white-space: nowrap;
            }
            #hd-toggle-btn:hover {
                border-color: rgba(140,180,140,0.5);
                color: #bbddbb;
            }
            #hd-toggle-btn.hd-active {
                background: linear-gradient(180deg, rgba(20,30,18,0.92) 0%, rgba(12,22,10,0.95) 100%);
                border-color: rgba(100,220,120,0.5);
                color: #aaeebb;
                box-shadow: 0 0 8px rgba(80,200,100,0.1);
            }
            #hd-toggle-btn.hd-active:hover {
                border-color: rgba(120,240,140,0.6);
                color: #ccffdd;
            }
            .hd-badge {
                font-size: 9px; font-weight: 700; letter-spacing: 1px;
                padding: 1px 5px; border-radius: 3px;
                background: rgba(80,200,100,0.2); color: #66ee88;
                border: 1px solid rgba(80,200,100,0.3);
            }
            #hd-toggle-btn:not(.hd-active) .hd-badge { display: none; }

            /* ---- LOOT COUNCIL OVERLAY ---- */
            .rd-looting-overlay {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 320px; background: linear-gradient(180deg, rgba(20,15,10,0.95) 0%, rgba(10,8,5,0.98) 100%);
                border: 2px solid #ffcc44; border-radius: 12px; padding: 20px;
                box-shadow: 0 0 40px rgba(255,200,60,0.3), inset 0 0 20px rgba(0,0,0,0.5);
                text-align: center; pointer-events: none; z-index: 600;
                animation: rd-loot-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            @keyframes rd-loot-pop {
                0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            .rd-looting-title {
                font-family: 'Cinzel', serif; font-size: 18px; color: #ffcc44; margin-bottom: 12px;
                text-transform: uppercase; letter-spacing: 2px;
            }
            .rd-looting-item {
                background: rgba(0,0,0,0.4); border: 1px solid rgba(255,200,60,0.3);
                border-radius: 8px; padding: 12px; margin-bottom: 16px;
                display: flex; align-items: center; gap: 12px;
            }
            .rd-looting-item-icon { font-size: 32px; filter: drop-shadow(0 0 8px #ffcc44); }
            .rd-looting-item-name { font-family: 'Cinzel', serif; font-size: 14px; color: #ffdd88; text-align: left; }
            .rd-looting-rolls {
                max-height: 140px; overflow-y: hidden; margin-top: 10px;
                font-family: 'Inter', sans-serif; font-size: 11px;
            }
            .rd-looting-roll-row {
                display: flex; justify-content: space-between; padding: 4px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .rd-looting-roll-val { font-weight: 700; color: #ffcc44; }
            .rd-looting-timer-bar {
                width: 100%; height: 4px; background: rgba(0,0,0,0.5);
                margin-top: 15px; border-radius: 2px; overflow: hidden;
            }
            .rd-looting-timer-fill {
                height: 100%; background: #ffcc44; width: 100%;
                transition: width 0.1s linear;
            }

            /* ---- GAME SPEED WIDGET (below HD toggle) ---- */
            #speed-widget {
                position: absolute; top: 42px; left: 320px;
                pointer-events: auto; user-select: none;
                display: flex; align-items: center; gap: 6px;
                padding: 4px 10px; border-radius: 4px;
                background: linear-gradient(180deg, rgba(12,18,10,0.88) 0%, rgba(8,14,8,0.92) 100%);
                border: 1px solid rgba(100,120,100,0.25);
                white-space: nowrap;
            }
            #speed-widget-label {
                font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
                color: #99aa88; letter-spacing: 0.3px; flex-shrink: 0;
            }
            #speed-widget input[type="range"] {
                -webkit-appearance: none; appearance: none;
                width: 80px; height: 4px; border-radius: 2px; cursor: pointer;
                background: linear-gradient(90deg, rgba(80,180,80,0.25), rgba(255,180,40,0.35));
                outline: none; margin: 0;
            }
            #speed-widget input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none; appearance: none;
                width: 14px; height: 14px; border-radius: 50%;
                background: radial-gradient(circle at 40% 35%, #cceeaa, #77aa44);
                border: 1.5px solid rgba(100,200,80,0.6);
                box-shadow: 0 0 6px rgba(100,200,80,0.25);
                cursor: pointer;
                transition: box-shadow 0.2s ease;
            }
            #speed-widget input[type="range"]::-webkit-slider-thumb:hover {
                box-shadow: 0 0 10px rgba(100,200,80,0.5);
            }
            #speed-widget input[type="range"]::-moz-range-thumb {
                width: 14px; height: 14px; border-radius: 50%;
                background: radial-gradient(circle at 40% 35%, #cceeaa, #77aa44);
                border: 1.5px solid rgba(100,200,80,0.6);
                box-shadow: 0 0 6px rgba(100,200,80,0.25);
                cursor: pointer;
            }
            #speed-widget-val {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700;
                color: #bbdd88; letter-spacing: 0.5px; min-width: 24px; text-align: right;
            }
            @media (max-width: 600px) {
                #speed-widget { left: 10px; top: 98px; }
            }

            .ql-quest { padding: 8px 10px; border-bottom: 1px solid rgba(80,80,60,0.2); }
            .ql-quest:last-child { border-bottom: none; }
            .ql-quest-name {
                font-family: 'Cinzel', serif; font-size: 12px; color: #eeddbb;
                text-shadow: 1px 1px 2px black; margin-bottom: 2px; display: flex; align-items: center; gap: 5px;
            }
            .ql-quest-zone { font-family: 'Inter', sans-serif; font-size: 10px; color: #778866; margin-bottom: 4px; }
            .ql-quest-desc {
                font-family: 'Inter', sans-serif; font-size: 10.5px; color: #99aa88;
                line-height: 1.35; margin-bottom: 6px; font-style: italic;
            }
            .ql-obj { margin-bottom: 5px; }
            .ql-obj-label {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #bbccaa;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6); display: flex; justify-content: space-between; margin-bottom: 2px;
            }
            .ql-obj-count { color: #eeddaa; font-weight: 600; }
            .ql-obj-count.done { color: #66dd66; }
            .ql-obj-bar-bg {
                width: 100%; height: 6px; background: rgba(0,0,0,0.5);
                border: 1px solid rgba(80,80,60,0.25); border-radius: 2px; overflow: hidden;
            }
            .ql-obj-bar-fill { height: 100%; border-radius: 1px; transition: width 0.4s ease; }
            .ql-obj-bar-fill.kill { background: linear-gradient(90deg, #cc4433 0%, #ee6644 100%); }
            .ql-obj-bar-fill.gather { background: linear-gradient(90deg, #33aa66 0%, #55cc88 100%); }
            .ql-obj-bar-fill.collect { background: linear-gradient(90deg, #cc8833 0%, #eebb44 100%); }
            .ql-obj-bar-fill.done { background: linear-gradient(90deg, #55cc55 0%, #88ee88 100%); }
            .ql-rewards {
                margin-top: 5px; font-family: 'Inter', sans-serif; font-size: 10px;
                color: #778866; display: flex; gap: 8px;
            }
            .ql-reward-item { display: flex; align-items: center; gap: 3px; }
            .ql-reward-item img { flex-shrink: 0; }
            /* ql-stats removed — kill stats moved to Global tab in Medals */

            /* Generic Hero Toast (Achievement, Quest, Zone, Boss) */
            .hero-toast {
                position: relative; margin-bottom: 10px; transform: scale(0.8);
                text-align: center; pointer-events: none; opacity: 0; z-index: 210;
                animation: hero-toast-anim 3.5s ease-out forwards;
            }
            #hero-toast-container {
                position: absolute; top: 18%; left: 50%; transform: translateX(-50%);
                display: flex; flex-direction: column-reverse; align-items: center;
                pointer-events: none; z-index: 1000;
            }
            @keyframes hero-toast-anim {
                0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
                12%  { opacity: 1; transform: scale(1.05) translateY(0); }
                25%  { transform: scale(1) translateY(0); }
                85%  { opacity: 1; transform: scale(1) translateY(0); }
                100% { opacity: 0; transform: scale(1.05) translateY(-20px); }
            }

            .quest-toast { position: relative; margin-bottom: 10px; transform: scale(0.8); text-align: center; pointer-events: none; opacity: 0; z-index: 210; animation: hero-toast-anim 3.5s ease-out forwards; }
            .quest-toast-inner {
                background: linear-gradient(180deg, rgba(15,22,10,0.95) 0%, rgba(8,14,6,0.98) 100%);
                border: 1px solid rgba(200,180,80,0.5); border-radius: 6px; padding: 10px 24px;
                box-shadow: 0 0 25px rgba(200,180,60,0.15), inset 0 0 12px rgba(0,0,0,0.4); backdrop-filter: blur(4px);
            }
            .quest-toast-label {
                font-family: 'Cinzel', serif; font-size: 11px; color: #bbaa77;
                text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;
            }
            .quest-toast-name {
                font-family: 'Cinzel', serif; font-size: 18px; font-weight: 700; color: #ffdd55;
                text-shadow: 0 0 12px rgba(255,220,80,0.4), 1px 1px 4px black;
            }
            .quest-toast-rewards { font-family: 'Inter', sans-serif; font-size: 11px; color: #aabb88; margin-top: 4px; }

            /* ---- INVENTORY / CHARACTER PANEL ---- */
            #inv-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 580px; max-width: 96vw; max-height: 88vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(10,16,8,0.96) 0%, rgba(6,10,5,0.98) 100%);
                border: 1px solid rgba(140,120,60,0.45); border-radius: 8px;
                box-shadow: 0 0 40px rgba(0,0,0,0.7), 0 0 10px rgba(140,120,60,0.12);
                backdrop-filter: blur(8px); display: none; z-index: 300; overflow: hidden;
            }
            #inv-panel.open { display: flex; flex-direction: column; }
            #inv-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(120,100,60,0.3); background: rgba(0,0,0,0.2);
            }
            #inv-title { font-family: 'Cinzel', serif; font-size: 16px; color: #eeddaa; text-shadow: 1px 1px 4px black; }
            #inv-close {
                font-size: 20px; color: #998866; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            #inv-close:hover { color: #ffddaa; }
            #inv-body { display: flex; gap: 0; flex: 1; overflow-y: auto; min-height: 0; }
            #equip-section { width: 220px; min-width: 220px; padding: 12px; border-right: 1px solid rgba(100,100,60,0.2); }
            .equip-label {
                font-family: 'Cinzel', serif; font-size: 11px; color: #bbaa77;
                text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;
            }
            .equip-slot {
                display: flex; align-items: center; gap: 8px; padding: 5px 6px; margin-bottom: 4px;
                border: 1px solid rgba(80,80,60,0.2); border-radius: 4px; background: rgba(0,0,0,0.15);
                cursor: pointer; transition: border-color 0.15s;
            }
            .equip-slot:hover { border-color: rgba(180,160,80,0.4); }
            .equip-slot-icon {
                width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
                font-size: 20px; background: rgba(0,0,0,0.3); border: 1px solid rgba(80,80,60,0.25);
                border-radius: 3px; overflow: hidden;
            }
            .equip-slot-info { flex: 1; min-width: 0; }
            .equip-slot-name {
                font-family: 'Inter', sans-serif; font-size: 11px; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis; text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
            }
            .equip-slot-stat { font-family: 'Inter', sans-serif; font-size: 10px; color: #889977; }
            .equip-slot-type { font-size: 9px; color: #667755; text-transform: uppercase; }
            #char-stats { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(80,80,60,0.2); }
            .char-stat-row {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #aabb99;
                display: flex; justify-content: space-between; margin-bottom: 3px;
            }
            .char-stat-val { color: #eeddaa; font-weight: 600; }
            #bag-section { flex: 1; padding: 12px; overflow-y: auto; }
            #bag-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .bag-label {
                font-family: 'Cinzel', serif; font-size: 11px; color: #bbaa77;
                text-transform: uppercase; letter-spacing: 1.5px;
            }
            #sell-junk-btn {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #bbaa77;
                background: rgba(80,60,20,0.3); border: 1px solid rgba(120,100,50,0.35);
                border-radius: 3px; padding: 3px 8px; cursor: pointer; transition: background 0.15s;
            }
            #sell-junk-btn:hover { background: rgba(120,90,30,0.4); }
            
            #bag-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
            .bag-slot {
                aspect-ratio: 1; background: rgba(0,0,0,0.25); border: 1px solid rgba(80,80,60,0.2);
                border-radius: 3px; display: flex; align-items: center; justify-content: center;
                font-size: 18px; cursor: pointer; position: relative; transition: border-color 0.15s;
            }
            .bag-slot:hover { border-color: rgba(180,160,80,0.5); }
            .bag-slot.empty { cursor: default; opacity: 0.4; }
            .bag-slot.upgrade { 
                box-shadow: 0 0 8px rgba(80,255,80,0.5) !important; 
                border-color: rgba(80,255,80,0.8) !important; 
                background: rgba(40,80,40,0.3) !important;
            }
            .bag-slot-upgrade-arrow {
                position: absolute; top: -2px; right: -2px; width: 18px; height: 18px;
                background: linear-gradient(135deg, #44ff66 0%, #22aa44 100%); 
                border: 1px solid rgba(255,255,255,0.4);
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-size: 11px; font-weight: 900; color: white; line-height: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5); pointer-events: none; z-index: 10;
                box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 0 8px rgba(60,220,80,0.6);
                animation: upgrade-arrow-pulse 1.5s ease-in-out infinite;
            }
            @keyframes upgrade-arrow-pulse {
                0%, 100% { opacity: 0.85; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }

            /* Tooltip */
            .item-tooltip {
                position: fixed;
                background: linear-gradient(180deg, rgba(10,16,8,0.97) 0%, rgba(5,8,4,0.99) 100%);
                border: 1px solid rgba(140,120,60,0.5); border-radius: 5px; padding: 10px 14px;
                min-width: 180px; max-width: 240px; z-index: 400; pointer-events: none;
                box-shadow: 0 4px 20px rgba(0,0,0,0.7); backdrop-filter: blur(6px);
            }
            .tt-name { font-family: 'Cinzel', serif; font-size: 13px; text-shadow: 1px 1px 3px black; margin-bottom: 2px; }
            .tt-rarity { font-family: 'Inter', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .tt-stat { font-family: 'Inter', sans-serif; font-size: 11px; color: #ccddbb; margin-bottom: 1px; }
            .tt-stat-bonus { color: #44cc44; }
            .tt-slot { font-family: 'Inter', sans-serif; font-size: 10px; color: #778866; margin-top: 4px; text-transform: capitalize; }
            .tt-action { font-family: 'Inter', sans-serif; font-size: 10px; color: #998855; margin-top: 5px; font-style: italic; }

            /* Loot popup sidebar container */
            #loot-sidebar {
                position: absolute; bottom: 82px; right: 180px;
                display: flex; flex-direction: column-reverse; gap: 6px;
                pointer-events: none; z-index: 250;
            }

            /* Loot popup */
            .loot-popup {
                display: flex; align-items: center; gap: 6px; padding: 5px 12px;
                background: rgba(10,16,8,0.92); border: 1px solid rgba(120,100,50,0.35);
                border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.5);
                animation: loot-slide 3.5s ease-out forwards;
                width: max-content;
                pointer-events: none;
            }
            @keyframes loot-slide {
                0% { opacity: 0; transform: translateX(-15px); }
                10% { opacity: 1; transform: translateX(0); }
                75% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-15px); }
            }
            .loot-popup-icon { font-size: 16px; display: flex; align-items: center; }
            .loot-popup-name { font-family: 'Inter', sans-serif; font-size: 11px; text-shadow: 1px 1px 2px rgba(0,0,0,0.6); }

            /* ---- Right-side buttons (Inventory + Settings) ---- */
            #right-buttons {
                position: absolute; bottom: 72px; right: 12px;
                display: flex; flex-direction: column; gap: 6px; pointer-events: auto;
            }
            .right-btn {
                background: linear-gradient(180deg, rgba(12,18,10,0.92) 0%, rgba(8,14,8,0.96) 100%);
                border: 1px solid rgba(120,140,100,0.4); border-radius: 5px;
                padding: 6px 12px; cursor: pointer; font-family: 'Cinzel', serif;
                font-size: 12px; color: #eeddaa; text-shadow: 1px 1px 3px black;
                display: flex; align-items: center; gap: 6px; transition: border-color 0.2s;
            }
            .right-btn:hover { border-color: rgba(200,180,80,0.7); }
            .right-btn.unstuck-btn {
                border-color: rgba(100,140,180,0.4); color: #99ccee; font-size: 11px;
            }
            .right-btn.unstuck-btn:hover { border-color: rgba(120,180,220,0.7); }
            .right-btn.unstuck-btn.flash { background: rgba(80,160,220,0.25); transition: background 0s; }
            .right-btn.unstuck-btn:not(.flash) { transition: background 0.4s; }

            /* Bag full warning badge */
            .bag-full-badge {
                display: inline-flex; align-items: center; gap: 3px;
                font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700;
                color: #ff5544; text-shadow: 0 0 6px rgba(255,60,40,0.6), 1px 1px 2px black;
                margin-left: 4px; letter-spacing: 0.5px;
                animation: bag-full-pulse 1.2s ease-in-out infinite;
            }
            @keyframes bag-full-pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
            .right-btn.bag-full-glow {
                border-color: rgba(220,60,40,0.55) !important;
                box-shadow: 0 0 10px rgba(220,60,40,0.15);
            }

            /* NEW content badge (zones / dungeons) */
            .new-content-badge {
                display: none; align-items: center; gap: 2px;
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800;
                color: #44ffaa; text-shadow: 0 0 8px rgba(60,255,160,0.6), 1px 1px 2px black;
                margin-left: 5px; letter-spacing: 1px; text-transform: uppercase;
                animation: new-badge-pulse 1.4s ease-in-out infinite;
            }
            .new-content-badge.visible { display: inline-flex; }
            @keyframes new-badge-pulse {
                0%, 100% { opacity: 0.7; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.05); }
            }
            .right-btn.has-new-content {
                border-color: rgba(60,255,160,0.5) !important;
                box-shadow: 0 0 10px rgba(60,255,160,0.12);
            }

            /* Affordable upgrade glow — subtle pulsing highlight on shop/vendor buttons */
            .right-btn.can-afford-glow {
                border-color: rgba(255,220,80,0.6) !important;
                box-shadow: 0 0 8px rgba(255,200,50,0.18), inset 0 0 12px rgba(255,200,50,0.04);
                animation: afford-glow-pulse 2.2s ease-in-out infinite;
            }
            @keyframes afford-glow-pulse {
                0%, 100% { box-shadow: 0 0 6px rgba(255,200,50,0.12), inset 0 0 10px rgba(255,200,50,0.03); }
                50% { box-shadow: 0 0 12px rgba(255,200,50,0.28), inset 0 0 16px rgba(255,200,50,0.06); }
            }

            /* Settings Panel */
            #settings-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 400px; max-width: 94vw; max-height: 85vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(10,16,8,0.97) 0%, rgba(6,10,5,0.99) 100%);
                border: 1px solid rgba(140,120,60,0.45); border-radius: 8px;
                box-shadow: 0 0 40px rgba(0,0,0,0.7), 0 0 10px rgba(140,120,60,0.12);
                backdrop-filter: blur(8px); display: none; z-index: 310; overflow: hidden;
            }
            #settings-panel.open { display: flex; flex-direction: column; }
            #settings-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(120,100,60,0.3); background: rgba(0,0,0,0.2);
            }
            #settings-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #eeddaa;
                text-shadow: 1px 1px 4px black; display: flex; align-items: center; gap: 8px;
            }
            #settings-close {
                font-size: 20px; color: #998866; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            #settings-close:hover { color: #ffddaa; }
            #settings-body { padding: 16px; overflow-y: auto; flex: 1; }
            .settings-section { margin-bottom: 16px; }
            .settings-section:last-child { margin-bottom: 0; }
            .settings-section-title {
                font-family: 'Cinzel', serif; font-size: 12px; color: #bbaa77;
                text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;
                padding-bottom: 4px; border-bottom: 1px solid rgba(120,100,60,0.2);
            }
            .settings-row {
                display: flex; align-items: center; justify-content: space-between;
                margin-bottom: 10px; gap: 12px;
            }
            .settings-row:last-child { margin-bottom: 0; }
            .settings-label {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #bbccaa;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6); white-space: nowrap;
            }
            .settings-slider-wrap { display: flex; align-items: center; gap: 8px; flex: 1; max-width: 220px; }
            .settings-slider {
                -webkit-appearance: none; appearance: none; flex: 1; height: 6px;
                border-radius: 3px; background: rgba(60,60,40,0.6); outline: none; cursor: pointer;
            }
            .settings-slider::-webkit-slider-thumb {
                -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;
                background: linear-gradient(135deg, #eeddaa 0%, #bb9944 100%);
                border: 2px solid rgba(80,60,20,0.6); cursor: pointer; box-shadow: 0 0 4px rgba(200,180,80,0.3);
            }
            .settings-slider::-moz-range-thumb {
                width: 16px; height: 16px; border-radius: 50%;
                background: linear-gradient(135deg, #eeddaa 0%, #bb9944 100%);
                border: 2px solid rgba(80,60,20,0.6); cursor: pointer;
            }
            .settings-slider-val {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #eeddaa;
                font-weight: 600; min-width: 32px; text-align: right;
            }
            .settings-toggle-btn {
                font-family: 'Inter', sans-serif; font-size: 11px; padding: 5px 14px;
                border-radius: 4px; cursor: pointer; transition: all 0.15s;
                border: 1px solid rgba(120,100,50,0.4); background: rgba(40,30,10,0.5);
                color: #bbaa77; min-width: 60px; text-align: center;
            }
            .settings-toggle-btn:hover { border-color: rgba(200,180,80,0.6); }
            .settings-toggle-btn.active { background: rgba(180,60,40,0.3); border-color: rgba(220,80,60,0.5); color: #ff8866; }
            .settings-toggle-btn.on { background: rgba(40,120,60,0.3); border-color: rgba(60,180,80,0.5); color: #66dd88; }
            .settings-action-btn {
                font-family: 'Inter', sans-serif; font-size: 11px; padding: 7px 16px;
                border-radius: 4px; cursor: pointer; transition: all 0.15s;
                border: 1px solid rgba(120,100,50,0.35); background: rgba(60,50,20,0.3);
                color: #ccbb88; text-align: center; width: 100%;
            }
            .settings-action-btn:hover { background: rgba(90,70,30,0.4); border-color: rgba(180,160,80,0.5); color: #eeddaa; }
            .settings-action-btn.danger { border-color: rgba(180,60,40,0.4); color: #cc8877; }
            .settings-action-btn.danger:hover { background: rgba(150,40,30,0.3); border-color: rgba(220,80,60,0.5); color: #ff8866; }
            .settings-btn-row { display: flex; gap: 8px; margin-bottom: 8px; }
            .settings-btn-row:last-child { margin-bottom: 0; }
            .settings-note { font-family: 'Inter', sans-serif; font-size: 10px; color: #667755; margin-top: 6px; line-height: 1.4; }
            .settings-checkbox-wrap {
                display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
            }
            .settings-checkbox {
                -webkit-appearance: none; appearance: none; width: 18px; height: 18px; min-width: 18px;
                border: 2px solid rgba(120,100,60,0.5); border-radius: 3px;
                background: rgba(20,15,8,0.6); cursor: pointer; position: relative;
                transition: all 0.15s;
            }
            .settings-checkbox:checked {
                background: rgba(60,160,80,0.3); border-color: rgba(80,200,100,0.6);
            }
            .settings-checkbox:checked::after {
                content: '✓'; position: absolute; top: -1px; left: 2px;
                font-size: 13px; font-weight: 700; color: #66ee88;
            }
            .settings-checkbox:hover { border-color: rgba(200,180,80,0.6); }
            .settings-checkbox-label {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #bbaa88;
            }
            .settings-checkbox-label.active { color: #66dd88; }
            .settings-confirm-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
                z-index: 320; backdrop-filter: blur(3px);
            }
            .settings-confirm-box {
                background: linear-gradient(180deg, rgba(15,20,10,0.98) 0%, rgba(8,12,6,0.99) 100%);
                border: 1px solid rgba(200,80,60,0.5); border-radius: 6px; padding: 20px 24px;
                text-align: center; max-width: 300px; box-shadow: 0 0 30px rgba(200,60,40,0.15);
            }
            .settings-confirm-text {
                font-family: 'Inter', sans-serif; font-size: 13px; color: #ddccbb;
                margin-bottom: 16px; line-height: 1.5;
            }
            .settings-confirm-text strong { color: #ff8866; }
            .settings-confirm-btns { display: flex; gap: 10px; justify-content: center; }

            /* ---- Zone Selection Panel ---- */
            #zone-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 460px; max-width: 96vw; max-height: 88vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(8,12,18,0.97) 0%, rgba(5,8,12,0.99) 100%);
                border: 1px solid rgba(120,140,180,0.45); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 15px rgba(100,140,200,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 310; overflow: hidden;
            }
            #zone-panel.open { display: flex; flex-direction: column; }
            #zone-panel-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(100,120,160,0.3); background: rgba(0,0,0,0.25);
            }
            #zone-panel-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ccddee;
                text-shadow: 1px 1px 4px black; display: flex; align-items: center; gap: 8px;
            }
            #zone-panel-close {
                font-size: 20px; color: #889aaa; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            #zone-panel-close:hover { color: #ccddff; }
            #zone-panel-body { padding: 12px 16px; overflow-y: auto; flex: 1; }
            #zone-current-label {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #778899;
                text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;
            }
            .zone-card {
                background: linear-gradient(180deg, rgba(15,20,28,0.8) 0%, rgba(10,14,20,0.9) 100%);
                border: 1px solid rgba(100,120,160,0.25); border-radius: 6px;
                padding: 12px 14px; margin-bottom: 8px; cursor: pointer;
                transition: border-color 0.2s, box-shadow 0.2s; position: relative; overflow: hidden;
            }
            .zone-card:hover { border-color: rgba(180,200,240,0.5); box-shadow: 0 0 12px rgba(100,140,200,0.1); }
            .zone-card.active {
                border-color: rgba(100,255,120,0.5);
                box-shadow: 0 0 15px rgba(80,200,100,0.12), inset 0 0 20px rgba(80,200,100,0.03);
            }
            .zone-card.locked { opacity: 0.45; cursor: not-allowed; }
            .zone-card.locked:hover { border-color: rgba(100,120,160,0.25); box-shadow: none; }
            .zone-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
            .zone-card-icon { font-size: 24px; filter: drop-shadow(0 0 4px rgba(0,0,0,0.8)); margin-top: 2px; }
            .zone-card-info { flex: 1; min-width: 0; }
            .zone-card-name {
                font-family: 'Cinzel', serif; font-size: 14px;
                text-shadow: 1px 1px 3px black; margin-bottom: 1px;
            }
            .zone-card-subtitle {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #778899;
            }
            .zone-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
            .zone-card-badge-inline {
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600;
                padding: 2px 8px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;
                white-space: nowrap;
            }
            .zone-card-badge-inline.current { background: rgba(80,200,100,0.2); color: #66dd88; border: 1px solid rgba(80,200,100,0.3); }
            .zone-card-badge-inline.locked-badge { background: rgba(150,100,80,0.2); color: #aa8877; border: 1px solid rgba(150,100,80,0.3); }
            .zone-card-badge-inline.available { background: rgba(100,160,255,0.2); color: #88bbff; border: 1px solid rgba(100,160,255,0.3); }
            .zone-card-level {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
                color: #ccddee;
                padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(100,120,160,0.3);
                background: rgba(0,0,0,0.4); white-space: nowrap;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            }
            .zone-card-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #8899aa;
                line-height: 1.4; margin-top: 4px;
            }
            .zone-card-badge {
                position: absolute; top: 8px; right: 10px;
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600;
                padding: 2px 8px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;
            }
            .zone-card-badge.current { background: rgba(80,200,100,0.2); color: #66dd88; border: 1px solid rgba(80,200,100,0.3); }
            .zone-card-badge.locked-badge { background: rgba(150,100,80,0.2); color: #aa8877; border: 1px solid rgba(150,100,80,0.3); }
            .zone-card-badge.available { background: rgba(100,160,255,0.2); color: #88bbff; border: 1px solid rgba(100,160,255,0.3); }
            
            /* Zone unlock notification */
            .zone-unlock-toast { position: relative; margin-bottom: 10px; transform: scale(0.8); text-align: center; pointer-events: none; opacity: 0; z-index: 220; animation: hero-toast-anim 4s ease-out forwards; }
            .zone-unlock-inner {
                background: linear-gradient(180deg, rgba(8,14,25,0.96) 0%, rgba(5,8,16,0.98) 100%);
                border: 1px solid rgba(100,160,255,0.5); border-radius: 6px; padding: 12px 28px;
                box-shadow: 0 0 30px rgba(80,140,255,0.15), inset 0 0 12px rgba(0,0,0,0.4); backdrop-filter: blur(4px);
            }
            .zone-unlock-label {
                font-family: 'Cinzel', serif; font-size: 11px; color: #88aacc;
                text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;
            }
            .zone-unlock-name {
                font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700;
                text-shadow: 0 0 14px rgba(100,160,255,0.4), 1px 1px 4px black;
            }

            /* ---- TALENT TREE PANEL ---- */
            #talent-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 640px; max-width: 97vw; max-height: 90vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(8,10,16,0.97) 0%, rgba(4,6,10,0.99) 100%);
                border: 1px solid rgba(120,100,160,0.4); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(100,80,160,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 310; overflow: hidden;
            }
            #talent-panel.open { display: flex; flex-direction: column; }
            #talent-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(120,100,160,0.25);
                background: rgba(0,0,0,0.25);
            }
            #talent-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ddccff;
                text-shadow: 1px 1px 4px black; display: flex; align-items: center; gap: 8px;
            }
            #talent-points-display {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #bbaa88;
                display: flex; align-items: center; gap: 12px;
            }
            .talent-points-available {
                color: #ffdd44; font-weight: 600; font-size: 13px;
                text-shadow: 0 0 6px rgba(255,220,68,0.3);
            }
            .talent-points-available.none { color: #778866; text-shadow: none; }
            #talent-close {
                font-size: 20px; color: #998877; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            #talent-close:hover { color: #ffddcc; }
            #talent-body { padding: 12px 16px; overflow-y: auto; flex: 1; }

            /* Branch cards */
            .talent-branch {
                margin-bottom: 14px; border-radius: 6px; overflow: hidden;
                border: 1px solid rgba(100,80,140,0.2);
                background: linear-gradient(180deg, rgba(12,14,22,0.7) 0%, rgba(8,10,16,0.85) 100%);
            }
            .talent-branch-header {
                display: flex; align-items: center; gap: 10px; padding: 10px 14px;
                cursor: pointer; user-select: none; transition: background 0.2s;
            }
            .talent-branch-header:hover { background: rgba(255,255,255,0.03); }
            .talent-branch-icon {
                width: 36px; height: 36px; border-radius: 6px; overflow: hidden;
                border: 2px solid; display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .talent-branch-icon img { width: 28px; height: 28px; object-fit: contain; }
            .talent-branch-info { flex: 1; }
            .talent-branch-name {
                font-family: 'Cinzel', serif; font-size: 14px;
                text-shadow: 1px 1px 3px black;
            }
            .talent-branch-subtitle {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #778899;
            }
            .talent-branch-points {
                font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
                padding: 2px 10px; border-radius: 10px;
                border: 1px solid rgba(100,100,140,0.3); background: rgba(0,0,0,0.3);
            }
            .talent-branch-toggle { font-size: 11px; color: #778899; transition: transform 0.25s; }
            .talent-branch-toggle.collapsed { transform: rotate(-90deg); }

            .talent-branch-body { padding: 8px 14px 14px; }
            .talent-branch-body.collapsed { display: none; }
            .talent-branch-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #8899aa;
                line-height: 1.4; margin-bottom: 10px; font-style: italic;
            }

            /* Node grid */
            .talent-nodes { display: flex; flex-wrap: wrap; gap: 6px; }
            .talent-node {
                width: calc(33.33% - 4px); min-width: 140px; padding: 8px 10px;
                border-radius: 5px; cursor: pointer; transition: all 0.2s; position: relative;
                border: 1px solid rgba(100,100,120,0.2);
                background: rgba(0,0,0,0.2);
            }
            .talent-node:hover { border-color: rgba(200,180,100,0.4); background: rgba(255,255,255,0.03); }
            .talent-node.allocated { border-color: rgba(255,220,80,0.4); background: rgba(255,220,80,0.05); }
            .talent-node.maxed { border-color: rgba(100,255,120,0.4); background: rgba(100,255,120,0.05); }
            .talent-node.locked { opacity: 0.35; cursor: not-allowed; }
            .talent-node.locked:hover { border-color: rgba(100,100,120,0.2); background: rgba(0,0,0,0.2); }
            .talent-node.can-allocate { box-shadow: 0 0 8px rgba(255,220,80,0.2); border-color: rgba(255,220,80,0.5); }
            .talent-node.can-allocate::after {
                content: ''; position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
                border: 1px solid rgba(255,220,80,0.3); border-radius: 5px;
                animation: talent-pulse 1.5s infinite; pointer-events: none;
            }
            @keyframes talent-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 0.8; } }
            .talent-node-top { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
            .talent-node-name {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6); flex: 1;
            }
            .talent-node-rank {
                font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700;
                padding: 1px 6px; border-radius: 8px; white-space: nowrap;
                background: rgba(0,0,0,0.4); border: 1px solid rgba(100,100,100,0.3);
            }
            .talent-node-rank.full { background: rgba(60,160,80,0.3); border-color: rgba(80,200,100,0.4); color: #66ee88; }
            .talent-node-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #8899aa; line-height: 1.3;
            }
            .talent-node-req {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #cc8855; margin-top: 2px;
            }
            .talent-node-req.met { color: #668855; }

            /* Rank pips */
            .talent-pips { display: flex; gap: 3px; margin-top: 4px; }
            .talent-pip {
                width: 8px; height: 8px; border-radius: 50%;
                border: 1px solid rgba(120,120,100,0.4);
                background: rgba(0,0,0,0.3);
            }
            .talent-pip.filled { background: #ffdd44; border-color: rgba(255,220,80,0.6); box-shadow: 0 0 4px rgba(255,220,80,0.3); }
            .talent-pip.filled.maxed { background: #66ee88; border-color: rgba(100,238,136,0.6); box-shadow: 0 0 4px rgba(100,238,136,0.3); }

            /* Reset button */
            #talent-reset-btn {
                font-family: 'Inter', sans-serif; font-size: 11px; padding: 5px 14px;
                border-radius: 4px; cursor: pointer; transition: all 0.15s;
                border: 1px solid rgba(200,80,60,0.35); background: rgba(120,40,30,0.2);
                color: #cc8877; margin-left: 8px;
            }
            #talent-reset-btn:hover { background: rgba(180,60,40,0.3); border-color: rgba(220,80,60,0.5); color: #ff8866; }

            /* Talent summary bar at top */
            .talent-summary {
                display: flex; gap: 8px; align-items: center; margin-bottom: 12px;
                padding: 8px 12px; border-radius: 5px;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(100,80,140,0.15);
            }
            .talent-summary-stat {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #99aa88;
                display: flex; align-items: center; gap: 4px;
            }
            .talent-summary-val { color: #eeddaa; font-weight: 600; }
            .talent-summary-val.zero { color: #556655; }

            /* ---- UPGRADE STATION PANEL ---- */
            #upgrade-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 520px; max-width: 96vw; max-height: 88vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(14,10,6,0.97) 0%, rgba(8,6,3,0.99) 100%);
                border: 1px solid rgba(200,150,60,0.45); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(200,150,60,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 310; overflow: hidden;
            }
            #upgrade-panel.open { display: flex; flex-direction: column; }
            #upgrade-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(200,150,60,0.25);
                background: rgba(0,0,0,0.25);
            }
            #upgrade-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ffcc66;
                text-shadow: 1px 1px 4px black; display: flex; align-items: center; gap: 8px;
            }
            #upgrade-currency {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #bbaa88;
                display: flex; align-items: center; gap: 14px;
            }
            #upgrade-currency span { display: flex; align-items: center; gap: 4px; }
            #upgrade-close {
                font-size: 20px; color: #998866; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            #upgrade-close:hover { color: #ffddaa; }
            #upgrade-body { padding: 12px 16px; overflow-y: auto; flex: 1; }
            #upgrade-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #8899aa;
                line-height: 1.4; margin-bottom: 12px; font-style: italic;
                padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 4px;
                border: 1px solid rgba(100,80,40,0.15);
            }
            .upgrade-slot-card {
                display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 5px;
                border: 1px solid rgba(120,100,60,0.2); border-radius: 5px;
                background: rgba(0,0,0,0.15); cursor: pointer; transition: all 0.2s;
            }
            .upgrade-slot-card:hover { border-color: rgba(200,170,80,0.5); background: rgba(255,255,255,0.03); }
            .upgrade-slot-card.selected { border-color: rgba(255,200,60,0.6); background: rgba(255,200,60,0.06); box-shadow: 0 0 8px rgba(255,200,60,0.1); }
            .upgrade-slot-card.empty { opacity: 0.3; cursor: default; }
            .upgrade-slot-card.empty:hover { border-color: rgba(120,100,60,0.2); background: rgba(0,0,0,0.15); }
            .upgrade-slot-icon {
                width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(80,80,60,0.25);
                border-radius: 4px; overflow: hidden; flex-shrink: 0;
            }
            .upgrade-slot-info { flex: 1; min-width: 0; }
            .upgrade-slot-name {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
            }
            .upgrade-slot-stat { font-family: 'Inter', sans-serif; font-size: 10px; color: #889977; }
            .upgrade-slot-tier {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700;
                text-shadow: 0 0 4px rgba(255,200,60,0.3); white-space: nowrap;
            }
            .upgrade-slot-type {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #667755;
                text-transform: uppercase;
            }

            /* Upgrade detail section */
            #upgrade-detail {
                margin-top: 12px; padding: 14px; border-radius: 6px;
                background: linear-gradient(180deg, rgba(20,16,8,0.8) 0%, rgba(12,10,5,0.9) 100%);
                border: 1px solid rgba(200,150,60,0.25);
            }
            .upg-detail-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
            .upg-detail-item-icon {
                width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.4); border-radius: 6px;
                border: 2px solid rgba(200,150,60,0.3);
            }
            .upg-detail-item-info { flex: 1; }
            .upg-detail-item-name {
                font-family: 'Cinzel', serif; font-size: 14px;
                text-shadow: 1px 1px 3px black; margin-bottom: 2px;
            }
            .upg-detail-item-tier {
                font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700;
            }
            .upg-detail-arrow {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #888;
                display: flex; align-items: center; gap: 6px; margin: 8px 0;
            }
            .upg-detail-arrow .from { color: #aabb99; }
            .upg-detail-arrow .to { color: #ffdd44; font-weight: 700; }
            .upg-detail-arrow .arrow { color: #ffaa44; font-size: 16px; }
            .upg-detail-cost {
                display: flex; gap: 16px; align-items: center; margin: 10px 0;
                padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 4px;
                border: 1px solid rgba(100,80,40,0.2);
            }
            .upg-cost-item {
                font-family: 'Inter', sans-serif; font-size: 12px; display: flex; align-items: center; gap: 4px;
            }
            .upg-cost-item.affordable { color: #66dd88; }
            .upg-cost-item.expensive { color: #cc6655; }
            .upg-detail-chance {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #bbaa88;
                margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
            }
            .upg-detail-chance .rate { font-weight: 700; }
            .upg-detail-chance .rate.safe { color: #66dd88; }
            .upg-detail-chance .rate.risky { color: #ffaa44; }
            .upg-detail-chance .rate.danger { color: #cc5544; }
            .upg-enhance-btn {
                font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600;
                padding: 10px 20px; width: 100%; text-align: center;
                border-radius: 5px; cursor: pointer; transition: all 0.2s;
                border: 2px solid rgba(200,150,60,0.5);
                background: linear-gradient(180deg, rgba(160,120,40,0.3) 0%, rgba(100,70,20,0.4) 100%);
                color: #ffdd88; text-shadow: 1px 1px 3px black;
                box-shadow: 0 0 12px rgba(200,150,60,0.1);
            }
            .upg-enhance-btn:hover { border-color: rgba(255,200,60,0.7); background: linear-gradient(180deg, rgba(200,150,50,0.4) 0%, rgba(130,90,30,0.5) 100%); box-shadow: 0 0 18px rgba(200,150,60,0.2); }
            .upg-enhance-btn.disabled {
                opacity: 0.35; cursor: not-allowed; border-color: rgba(100,80,40,0.3);
                background: rgba(40,30,10,0.3); box-shadow: none;
            }
            .upg-enhance-btn.disabled:hover { opacity: 0.35; border-color: rgba(100,80,40,0.3); background: rgba(40,30,10,0.3); }
            .upg-enhance-btn.maxed {
                border-color: rgba(180,100,255,0.5);
                background: linear-gradient(180deg, rgba(120,60,180,0.2) 0%, rgba(80,30,140,0.3) 100%);
                color: #cc88ff; cursor: default;
            }
            .upg-result-toast {
                font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
                text-align: center; padding: 8px 16px; margin-top: 8px;
                border-radius: 4px; animation: upg-toast-fade 2.5s ease-out forwards;
            }
            @keyframes upg-toast-fade {
                0% { opacity: 0; transform: translateY(4px); }
                15% { opacity: 1; transform: translateY(0); }
                70% { opacity: 1; }
                100% { opacity: 0; }
            }
            .upg-result-toast.success { color: #66ee88; background: rgba(40,120,60,0.2); border: 1px solid rgba(60,200,80,0.3); }
            .upg-result-toast.fail { color: #ee6655; background: rgba(120,40,30,0.2); border: 1px solid rgba(200,60,50,0.3); }

            /* Upgrade stats summary at bottom */
            #upgrade-stats-summary {
                margin-top: 10px; padding: 8px 10px; border-radius: 4px;
                background: rgba(0,0,0,0.2); border: 1px solid rgba(100,80,40,0.12);
            }
            .upg-stats-row {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #778866;
                display: flex; justify-content: space-between; margin-bottom: 2px;
            }
            .upg-stats-val { color: #aabb88; font-weight: 500; }

            /* ═══════════════════════════════════════════════════════
               BUFF BAR — active consumable buffs near nameplate
               ═══════════════════════════════════════════════════════ */
            #buff-bar {
                position: absolute; top: 38%; left: 50%; transform: translateX(-50%);
                display: flex; gap: 4px; pointer-events: none; z-index: 130;
                flex-wrap: wrap; justify-content: center; max-width: 360px;
            }
            .buff-icon-wrap {
                position: relative; width: 30px; height: 30px;
                background: linear-gradient(180deg, rgba(20,30,15,0.92) 0%, rgba(10,18,8,0.96) 100%);
                border: 1px solid rgba(140,180,80,0.5); border-radius: 4px;
                display: flex; align-items: center; justify-content: center;
                font-size: 16px; box-shadow: 0 0 6px rgba(100,160,60,0.2);
                animation: buff-pulse 2s ease-in-out infinite;
            }
            @keyframes buff-pulse {
                0%,100% { box-shadow: 0 0 6px rgba(100,160,60,0.2); }
                50% { box-shadow: 0 0 10px rgba(100,160,60,0.45); }
            }
            .buff-timer {
                position: absolute; bottom: -1px; left: 0; right: 0; text-align: center;
                font-family: 'Inter', sans-serif; font-size: 8px; font-weight: 700;
                color: #cceeaa; text-shadow: 0 0 3px black, 1px 1px 2px black;
                line-height: 1; pointer-events: none;
            }
            .buff-icon-wrap.expiring { border-color: rgba(220,120,40,0.7); animation: buff-expire-pulse 0.6s ease-in-out infinite; }
            @keyframes buff-expire-pulse {
                0%,100% { opacity: 0.6; }
                50% { opacity: 1; }
            }

            /* ═══════════════════════════════════════════════════════
               GOLD SHOP PANEL
               ═══════════════════════════════════════════════════════ */
            #gold-shop-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 560px; max-width: 96vw; max-height: 88vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(14,12,6,0.97) 0%, rgba(8,7,3,0.99) 100%);
                border: 1px solid rgba(200,170,60,0.45); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(200,170,60,0.08);
                backdrop-filter: blur(10px); display: none; z-index: 310; overflow: hidden;
            }
            #gold-shop-panel.open { display: flex; flex-direction: column; }
            .shop-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; border-bottom: 1px solid rgba(200,170,60,0.25);
                background: rgba(0,0,0,0.25);
            }
            .shop-title {
                font-family: 'Cinzel', serif; font-size: 16px;
                text-shadow: 1px 1px 4px black; display: flex; align-items: center; gap: 8px;
            }
            .shop-currency {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #bbaa88;
                display: flex; align-items: center; gap: 6px;
            }
            .shop-currency .curr-val { color: #ffdd66; font-weight: 600; }
            .shop-close {
                font-size: 20px; color: #998866; cursor: pointer; line-height: 1;
                padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
            }
            .shop-close:hover { color: #ffddaa; }
            .shop-body { padding: 12px 16px; overflow-y: auto; flex: 1; }
            .shop-section-title {
                font-family: 'Cinzel', serif; font-size: 12px; color: #bbaa77;
                text-transform: uppercase; letter-spacing: 1.5px; margin: 12px 0 8px;
                padding-bottom: 4px; border-bottom: 1px solid rgba(120,100,60,0.2);
            }
            .shop-section-title:first-child { margin-top: 0; }
            .shop-item-card {
                display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 5px;
                border: 1px solid rgba(120,100,60,0.2); border-radius: 5px;
                background: rgba(0,0,0,0.15); cursor: pointer; transition: all 0.2s;
            }
            .shop-item-card:hover { border-color: rgba(200,170,80,0.5); background: rgba(255,255,255,0.03); }
            .shop-item-card.cant-afford { opacity: 0.45; }
            .shop-item-card.cant-afford:hover { border-color: rgba(120,100,60,0.2); background: rgba(0,0,0,0.15); cursor: not-allowed; }
            .shop-item-card.active-buff { border-color: rgba(100,200,80,0.5); background: rgba(80,200,60,0.06); box-shadow: 0 0 8px rgba(80,200,60,0.1); }
            .shop-item-card.maxed-upgrade { border-color: rgba(100,200,120,0.4); background: rgba(80,200,100,0.05); opacity: 0.65; cursor: default; }
            .shop-item-icon {
                width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(80,80,60,0.25);
                border-radius: 4px; font-size: 20px; flex-shrink: 0;
            }
            .shop-item-info { flex: 1; min-width: 0; }
            .shop-item-name {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
                color: #eeddbb; text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .shop-item-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #889977;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .shop-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
            .shop-item-cost {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
                display: flex; align-items: center; gap: 3px;
            }
            .shop-item-cost.affordable { color: #88dd66; }
            .shop-item-cost.expensive { color: #cc6655; }
            .shop-item-tier {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #778866;
            }
            .shop-item-tier.maxed { color: #66dd88; font-weight: 600; }
            .shop-item-status {
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600;
                padding: 1px 6px; border-radius: 8px;
            }
            .shop-item-status.active { color: #66ee88; background: rgba(60,200,80,0.15); border: 1px solid rgba(60,200,80,0.3); }
            .shop-item-status.maxed { color: #66dd88; background: rgba(60,200,80,0.1); border: 1px solid rgba(60,200,80,0.2); }
            .shop-stats-summary {
                margin-top: 10px; padding: 8px 10px; border-radius: 4px;
                background: rgba(0,0,0,0.2); border: 1px solid rgba(100,80,40,0.12);
            }
            .shop-stat-row {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #778866;
                display: flex; justify-content: space-between; margin-bottom: 2px;
            }
            .shop-stat-val { color: #aabb88; font-weight: 500; }
            .shop-toast {
                font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
                text-align: center; padding: 6px 12px; margin-top: 6px;
                border-radius: 4px; animation: upg-toast-fade 2.5s ease-out forwards;
            }
            .shop-toast.success { color: #66ee88; background: rgba(40,120,60,0.2); border: 1px solid rgba(60,200,80,0.3); }
            .shop-toast.fail { color: #ee6655; background: rgba(120,40,30,0.2); border: 1px solid rgba(200,60,50,0.3); }

            /* ═══════════════════════════════════════════════════════
               AETHERBIT EMPORIUM PANEL
               ═══════════════════════════════════════════════════════ */
            #aetherbit-shop-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 560px; max-width: 96vw; max-height: 88vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(8,6,14,0.97) 0%, rgba(4,3,10,0.99) 100%);
                border: 1px solid rgba(140,100,220,0.45); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(120,80,200,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 310; overflow: hidden;
            }
            #aetherbit-shop-panel.open { display: flex; flex-direction: column; }

            /* Aetherbit upgrade tier pips */
            .aeth-tier-pips { display: flex; gap: 3px; }
            .aeth-pip {
                width: 10px; height: 6px; border-radius: 2px;
                border: 1px solid rgba(140,100,220,0.3);
                background: rgba(0,0,0,0.3);
            }
            .aeth-pip.filled { background: #aa66ee; border-color: rgba(180,120,255,0.6); box-shadow: 0 0 4px rgba(160,100,240,0.3); }
            .aeth-pip.filled.maxed { background: #66ee88; border-color: rgba(100,238,136,0.6); box-shadow: 0 0 4px rgba(100,238,136,0.3); }

            .aeth-upgrade-card {
                display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 6px;
                border: 1px solid rgba(120,80,180,0.2); border-radius: 6px;
                background: linear-gradient(180deg, rgba(12,8,20,0.7) 0%, rgba(8,5,14,0.85) 100%);
                cursor: pointer; transition: all 0.2s; position: relative;
            }
            .aeth-upgrade-card:hover { border-color: rgba(200,150,255,0.4); background: rgba(255,255,255,0.03); }
            .aeth-upgrade-card.cant-afford { opacity: 0.45; }
            .aeth-upgrade-card.cant-afford:hover { border-color: rgba(120,80,180,0.2); cursor: not-allowed; }
            .aeth-upgrade-card.maxed { border-color: rgba(100,200,120,0.4); background: rgba(80,200,100,0.04); opacity: 0.65; cursor: default; }
            .aeth-upgrade-card.maxed:hover { border-color: rgba(100,200,120,0.4); }
            .aeth-upgrade-card.can-buy { box-shadow: 0 0 8px rgba(160,100,240,0.2); border-color: rgba(180,120,255,0.5); }
            .aeth-upgrade-icon {
                width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.3); border: 2px solid rgba(120,80,180,0.3);
                border-radius: 6px; font-size: 22px; flex-shrink: 0;
            }
            .aeth-upgrade-info { flex: 1; min-width: 0; }
            .aeth-upgrade-name {
                font-family: 'Cinzel', serif; font-size: 12px;
                text-shadow: 1px 1px 3px black; margin-bottom: 1px;
            }
            .aeth-upgrade-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #8899aa;
            }
            .aeth-upgrade-bonus {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #bbccaa;
                margin-top: 2px;
            }
            .aeth-upgrade-bonus .val { font-weight: 700; }
            .aeth-upgrade-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }


            /* ---- Achievement Medals Panel ---- */
            #achievement-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 680px; max-width: 96vw; max-height: 85vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(15,10,20,0.97) 0%, rgba(8,5,12,0.99) 100%);
                border: 1px solid rgba(255,200,50,0.4); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(255,200,50,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #achievement-panel.open { display: flex; flex-direction: column; }
            #achievement-list::-webkit-scrollbar { width: 4px; }
            #achievement-list::-webkit-scrollbar-thumb { background: rgba(255,200,50,0.3); border-radius: 2px; }

            /* ---- Match Ready Popups ---- */
            #pvp-ready-popup, #dungeon-ready-popup, #raid-ready-popup {
                position: absolute; top: 25%; left: 50%; transform: translateX(-50%);
                width: 360px; border-radius: 8px; padding: 22px;
                box-shadow: 0 0 60px rgba(0,0,0,0.95), 0 0 20px rgba(255,100,100,0.15);
                text-align: center; pointer-events: auto; z-index: 1000;
                display: none; animation: pvp-ready-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                background: linear-gradient(180deg, rgba(20,10,10,0.98) 0%, rgba(10,5,5,0.99) 100%);
                border: 2px solid rgba(255,60,100,0.5);
                backdrop-filter: blur(10px);
            }
            #dungeon-ready-popup { border-color: rgba(255,160,60,0.5); }
            #pvp-ready-popup { border-color: rgba(160,80,255,0.5); }

            @keyframes pvp-ready-pop {
                0% { transform: translate(-50%, -30px) scale(0.9); opacity: 0; }
                100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
            }

            /* ---- Mini Queue Indicators (Stacked below Quest Log) ---- */
            #pvp-mini-queue, #dungeon-mini-queue, #raid-mini-queue {
                position: absolute; left: 12px;
                width: 295px; pointer-events: auto; z-index: 90;
                transition: all 0.3s ease;
                display: none;
            }
            
            .pvp-mini-queue-inner {
                background: linear-gradient(180deg, rgba(15,20,25,0.94) 0%, rgba(8,12,15,0.98) 100%);
                border: 1px solid rgba(80,160,220,0.4); border-radius: 5px;
                padding: 10px 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.6);
                backdrop-filter: blur(5px);
            }

            .pvp-mini-queue-title { font-family: 'Cinzel', serif; font-size: 11px; color: #66ccff; letter-spacing: 1px; margin-bottom: 2px; }
            .pvp-mini-queue-name { font-family: 'Cinzel', serif; font-size: 13px; color: #eeddaa; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .pvp-mini-queue-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; }
            .pvp-mini-queue-timer { font-family: 'Inter', sans-serif; font-size: 10px; color: #99aabb; }
            .pvp-mini-queue-timer .val { color: #ffdd44; font-weight: 700; margin-left: 4px; }
            .pvp-mini-queue-leave { font-family: 'Inter', sans-serif; font-size: 10px; color: #66ccff; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
            .pvp-mini-queue-leave:hover { opacity: 1; text-decoration: underline; }

            .pvp-ready-title {
                font-family: 'Cinzel', serif; font-size: 18px; color: #cc88ff; margin-bottom: 8px;
                text-shadow: 0 0 12px rgba(160,80,255,0.4), 2px 2px 4px black;
                letter-spacing: 2px;
            }
            .pvp-ready-name { font-family: 'Cinzel', serif; font-size: 14px; color: #eeddaa; margin-bottom: 12px; }
            .pvp-ready-timer { font-family: 'Inter', sans-serif; font-size: 12px; color: #9988aa; margin-bottom: 15px; }
            .pvp-ready-timer .val { color: #ffdd44; font-weight: 700; font-variant-numeric: tabular-nums; }
            .pvp-ready-btns { display: flex; gap: 10px; justify-content: center; }
            .pvp-ready-btn {
                padding: 8px 16px; border-radius: 4px; font-family: 'Cinzel', serif; font-size: 11px;
                font-weight: 700; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
            }
            .pvp-ready-btn.accept {
                background: linear-gradient(180deg, #8844cc, #6622aa); border-color: #aa66ff; color: white;
                box-shadow: 0 0 10px rgba(120,60,255,0.2);
            }
            .pvp-ready-btn.accept:hover { background: linear-gradient(180deg, #aa66ff, #8844cc); transform: translateY(-1px); }
            .pvp-ready-btn.decline {
                background: rgba(40,20,10,0.6); border-color: rgba(200,80,60,0.4); color: #cc8877;
            }
            .pvp-ready-btn.decline:hover { background: rgba(60,30,15,0.8); border-color: #ff6644; color: #ff8866; }

            /* ---- PvP Mini Queue Widget (In-overworld indicator) ---- */
            #pvp-mini-queue, #dungeon-mini-queue, #raid-mini-queue {
                position: absolute; top: 440px; bottom: auto; left: 12px;
                pointer-events: auto; z-index: 200; display: none;
                width: 280px;
            }
            .pvp-mini-queue-inner {
                background: linear-gradient(180deg, rgba(15,20,30,0.92) 0%, rgba(10,5,20,0.96) 100%);
                border: 1px solid rgba(120,80,255,0.4); border-radius: 6px; padding: 6px 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.6), 0 0 10px rgba(120,60,255,0.2);
                display: flex; flex-direction: column; align-items: flex-start; gap: 2px; backdrop-filter: blur(4px);
                animation: pvp-mini-slide 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            @keyframes pvp-mini-slide {
                0% { transform: translateX(-20px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            .pvp-mini-queue-top { display: flex; justify-content: space-between; width: 100%; align-items: center; }
            .pvp-mini-queue-title {
                font-family: 'Cinzel', serif; font-size: 9px; color: #cc88ff;
                text-transform: uppercase; letter-spacing: 1px;
            }
            .pvp-mini-queue-name { font-family: 'Cinzel', serif; font-size: 12px; color: #eeddaa; font-weight: 700; margin-bottom: 1px; }
            .pvp-mini-queue-bottom { display: flex; justify-content: space-between; width: 100%; align-items: center; margin-top: 2px; padding-top: 2px; border-top: 1px solid rgba(255,255,255,0.05); }
            .pvp-mini-queue-timer { font-family: 'Inter', sans-serif; font-size: 11px; color: #9988aa; }
            .pvp-mini-queue-timer .val { color: #ffdd44; font-weight: 700; min-width: 25px; display: inline-block; font-variant-numeric: tabular-nums; }
            .pvp-mini-queue-leave {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #ff8866; cursor: pointer;
                text-transform: uppercase; transition: color 0.2s; font-weight: 700;
            }
            .pvp-mini-queue-leave:hover { color: #ffaa88; }

            .ach-card {
                background: rgba(0,0,0,0.25); border: 1px solid rgba(120,100,60,0.25);
                border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 12px;
                transition: all 0.2s; position: relative;
            }
            .ach-card.completed { border-color: rgba(255,200,50,0.4); box-shadow: 0 0 10px rgba(255,200,50,0.1); }
            .ach-card.secret { opacity: 0.35; filter: grayscale(0.8); }
            .ach-card.tier-legendary { border-color: rgba(255,100,50,0.5); box-shadow: 0 0 15px rgba(255,100,50,0.15); }
            .ach-card.tier-epic { border-color: rgba(180,100,255,0.5); }
            .ach-card.tier-rare { border-color: rgba(100,160,255,0.5); }

            .ach-icon-box {
                width: 44px; height: 44px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
            }
            .ach-info { flex: 1; min-width: 0; }
            .ach-title { font-family: 'Cinzel', serif; font-size: 13px; margin-bottom: 2px; }
            .ach-desc { font-family: 'Inter', sans-serif; font-size: 10.5px; color: #889977; line-height: 1.3; }
            .ach-bar-bg { width: 100%; height: 5px; background: rgba(0,0,0,0.5); border-radius: 3px; overflow: hidden; margin-top: 6px; }
            .ach-bar-fill { height: 100%; transition: width 0.4s; }
            .ach-reward-box { text-align: right; min-width: 70px; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 10px; }
            .ach-reward-label { font-size: 9px; color: #667755; text-transform: uppercase; margin-bottom: 2px; }
            .ach-reward-val { font-size: 10px; font-weight: 600; display: flex; align-items: center; justify-content: flex-end; gap: 3px; }

            /* Mobile-friendly category bar */
            .ach-category-bar {
                display: flex; gap: 4px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px;
            }
            .ach-category-bar::-webkit-scrollbar { height: 3px; }
            .ach-category-bar .chat-tab { flex: 1; min-width: 80px; text-align: center; white-space: nowrap; }

            /* ── Global Stats Panel ── */
            .global-stats-container { display: flex; flex-direction: column; gap: 10px; }
            .global-stats-section {
                background: rgba(0,0,0,0.25); border: 1px solid rgba(255,200,50,0.15);
                border-radius: 6px; padding: 10px 12px; 
            }
            .global-stats-section-title {
                font-family: 'Cinzel', serif; font-size: 12px; color: #ffdd88;
                text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;
                display: flex; align-items: center; gap: 6px;
                border-bottom: 1px solid rgba(255,200,50,0.1); padding-bottom: 6px;
            }
            .global-stat-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 4px 0; font-family: 'Inter', sans-serif; font-size: 11px;
            }
            .global-stat-row + .global-stat-row { border-top: 1px solid rgba(255,255,255,0.03); }
            .global-stat-label { color: #99aa88; display: flex; align-items: center; gap: 5px; }
            .global-stat-value { color: #ddccaa; font-weight: 600; font-variant-numeric: tabular-nums; }
            .global-stat-value.highlight { color: #ffdd44; text-shadow: 0 0 6px rgba(255,200,50,0.3); }
            .global-zone-group { margin-top: 6px; }
            .global-zone-header {
                font-family: 'Cinzel', serif; font-size: 11px; padding: 5px 8px;
                border-radius: 4px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;
                background: rgba(255,255,255,0.03); border-left: 3px solid rgba(255,255,255,0.15);
            }

            /* Soul Forge Disenchant */
            .sf-disenchant-section {
                margin-top: 15px; padding: 12px;
                background: linear-gradient(180deg, rgba(30,15,10,0.4) 0%, rgba(20,10,5,0.6) 100%);
                border: 1px solid rgba(255,120,40,0.2); border-radius: 6px;
            }
            .sf-disenchant-title {
                font-family: 'Cinzel', serif; font-size: 13px; color: #ffaa44;
                margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
            }
            .sf-disenchant-controls { display: flex; gap: 8px; align-items: center; }
            .sf-disenchant-btn {
                font-family: 'Cinzel', serif; font-size: 11px; padding: 6px 12px;
                border-radius: 4px; cursor: pointer; transition: all 0.2s;
                border: 1px solid rgba(255,80,40,0.4); background: rgba(120,40,20,0.2);
                color: #ffaa88; flex: 1; text-align: center;
                user-select: none;
            }
            .sf-disenchant-btn:hover { background: rgba(180,60,30,0.35); border-color: rgba(255,100,60,0.7); }
            .sf-disenchant-btn:active { transform: scale(0.98); }
            .sf-disenchant-select {
                background: rgba(0,0,0,0.4); border: 1px solid rgba(255,120,40,0.3);
                border-radius: 4px; color: #eeddbb; font-size: 11px; padding: 5px;
                outline: none; cursor: pointer;
            }
            .global-zone-header .zone-dot {
                width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
            }
            .global-mob-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 2px 8px 2px 24px; font-family: 'Inter', sans-serif; font-size: 10px;
            }
            .global-mob-row + .global-mob-row { border-top: 1px solid rgba(255,255,255,0.02); }
            .global-mob-name { color: #88aa77; }
            .global-mob-count { color: #bbaa88; font-weight: 500; font-variant-numeric: tabular-nums; }
            .global-mob-count.zero { color: #444; }

            /* Fake Server Announcements */
            .chat-announcement { color: #ffdd44; font-weight: 700; text-shadow: 0 0 8px rgba(255,200,50,0.4); }
            .chat-announcement-rare { color: #66ccff; }
            .chat-announcement-epic { color: #cc88ff; }
            .chat-announcement-legendary { color: #ff6644; }

            /* ---- Party Panel ---- */
            #soulforge-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 560px; max-width: 96vw; max-height: 90vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(20,10,5,0.98) 0%, rgba(10,5,2,0.99) 100%);
                border: 1px solid rgba(255,120,40,0.4); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(255,100,30,0.15);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #soulforge-panel.open { display: flex; flex-direction: column; }
            #soulforge-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(255,120,40,0.25);
                background: linear-gradient(90deg, rgba(255,100,30,0.08) 0%, transparent 100%);
            }
            #soulforge-panel-title { font-family: 'Cinzel', serif; font-size: 16px; color: #ff9944; text-shadow: 0 0 8px rgba(255,120,40,0.4); }
            #soulforge-panel-body { padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 75vh; }
            #soulforge-panel-body::-webkit-scrollbar { width: 4px; }
            #soulforge-panel-body::-webkit-scrollbar-thumb { background: rgba(255,120,40,0.3); border-radius: 2px; }
            .sf-essence-bar { display:flex; align-items:center; gap:8px; padding:8px 12px; margin-bottom:10px; border-radius:6px; background:rgba(255,120,40,0.08); border:1px solid rgba(255,120,40,0.2); }
            .sf-essence-icon { font-size:20px; }
            .sf-essence-amount { font-family:'Inter',sans-serif; font-size:18px; color:#ffbb66; font-weight:700; }
            .sf-essence-rate { font-family:'Inter',sans-serif; font-size:11px; color:#aa8855; margin-left:auto; }
            .sf-spec-card { display:flex; flex-direction:column; gap:6px; padding:12px; margin-bottom:8px; border-radius:6px; cursor:pointer; transition:all 0.2s; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); }
            .sf-spec-card:hover { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.15); }
            .sf-spec-card.active { border-color:rgba(255,160,60,0.5); background:rgba(255,120,40,0.1); }
            .sf-spec-card.chosen { border-color:rgba(80,255,120,0.4); background:rgba(80,255,120,0.06); }
            .sf-spec-header { display:flex; align-items:center; gap:8px; }
            .sf-spec-icon { font-size:24px; }
            .sf-spec-name { font-family:'Cinzel',serif; font-size:15px; font-weight:700; }
            .sf-spec-tagline { font-size:11px; color:#998877; font-style:italic; }
            .sf-spec-desc { font-size:11px; color:#bbaa88; line-height:1.4; }
            .sf-spec-power { display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:4px; background:rgba(255,200,80,0.06); border:1px solid rgba(255,200,80,0.15); margin-top:4px; }
            .sf-spec-power-icon { font-size:16px; }
            .sf-spec-power-name { font-size:12px; color:#ffcc66; font-weight:600; }
            .sf-spec-power-desc { font-size:10px; color:#aa9966; }
            .sf-choose-btn { padding:6px 16px; border-radius:4px; border:1px solid rgba(255,160,60,0.4); background:rgba(255,120,40,0.15); color:#ffbb66; font-size:12px; font-weight:600; cursor:pointer; margin-top:6px; text-align:center; transition:all 0.2s; }
            .sf-choose-btn:hover { background:rgba(255,120,40,0.3); border-color:rgba(255,160,60,0.6); }
            .sf-choose-btn.chosen { border-color:rgba(80,255,120,0.4); background:rgba(80,255,120,0.1); color:#88ff88; cursor:default; }
            .sf-tier-row { display:flex; gap:6px; margin-bottom:8px; }
            .sf-tier-header { font-family:'Cinzel',serif; font-size:12px; color:#cc9955; margin:10px 0 4px; display:flex; align-items:center; gap:6px; }
            .sf-tier-cost { font-size:10px; color:#aa7744; margin-left:auto; }
            .sf-node { flex:1; padding:8px; border-radius:5px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); cursor:pointer; transition:all 0.2s; min-width:0; }
            .sf-node:hover { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.2); }
            .sf-node.locked { opacity:0.4; cursor:not-allowed; }
            .sf-node.chosen { border-color:rgba(80,255,120,0.5); background:rgba(80,255,120,0.08); }
            .sf-node.available { border-color:rgba(255,180,60,0.5); background:rgba(255,120,40,0.08); box-shadow:0 0 8px rgba(255,120,40,0.15); }
            .sf-node-icon { font-size:16px; margin-bottom:2px; }
            .sf-node-name { font-size:11px; font-weight:600; color:#eeddcc; }
            .sf-node-desc { font-size:9px; color:#aa9977; line-height:1.3; margin-top:2px; }
            .sf-respec-btn { padding:6px 14px; border-radius:4px; border:1px solid rgba(255,80,80,0.3); background:rgba(255,40,40,0.1); color:#ff8888; font-size:11px; cursor:pointer; transition:all 0.2s; margin-top:8px; text-align:center; }
            .sf-respec-btn:hover { background:rgba(255,40,40,0.2); border-color:rgba(255,80,80,0.5); }
            .sf-section-title { font-family:'Cinzel',serif; font-size:13px; color:#ffaa55; margin:12px 0 6px; padding-bottom:4px; border-bottom:1px solid rgba(255,120,40,0.15); }
            .sf-stat-summary { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
            .sf-stat-chip { padding:3px 8px; border-radius:3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); font-size:10px; color:#ccbb99; }
            .sf-stat-chip .val { color:#ffcc66; font-weight:600; }
            .sf-abil-banner {
                display:flex; align-items:center; gap:8px; margin:4px 0 8px; padding:7px 10px;
                border-radius:5px; border:1px solid rgba(100,100,120,0.15); background:rgba(0,0,0,0.15);
                transition: all 0.3s;
            }
            .sf-abil-banner.unlocked { background:rgba(255,180,50,0.06); border-color:rgba(255,180,50,0.25); }
            .sf-abil-banner-icon {
                width:28px; height:28px; display:flex; align-items:center; justify-content:center;
                background:rgba(0,0,0,0.3); border-radius:5px; border:1px solid rgba(255,255,255,0.06);
                position:relative; flex-shrink:0;
            }
            .sf-abil-banner.unlocked .sf-abil-banner-icon { border-color:rgba(255,180,50,0.3); }
            .sf-abil-banner-badge {
                position:absolute; bottom:-4px; right:-4px; font-size:10px; line-height:1;
            }
            .sf-abil-banner-info { flex:1; min-width:0; }
            .sf-abil-banner-name { font-family:'Cinzel',serif; font-size:11px; text-shadow:1px 1px 2px rgba(0,0,0,0.6); }
            .sf-abil-banner-desc { font-family:'Inter',sans-serif; font-size:9px; color:#889999; line-height:1.3; margin-top:1px; }
            .sf-abil-banner-status { font-family:'Inter',sans-serif; font-size:10px; font-weight:600; flex-shrink:0; white-space:nowrap; }

            #party-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 480px; max-width: 96vw; max-height: 85vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(8,16,28,0.97) 0%, rgba(5,10,20,0.99) 100%);
                border: 1px solid rgba(80,180,255,0.35); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 20px rgba(80,180,255,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #party-panel.open { display: flex; flex-direction: column; }
            #party-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(80,180,255,0.2);
            }
            #party-panel-title { font-family: 'Cinzel', serif; font-size: 16px; color: #88ccff; text-shadow: 0 0 8px rgba(80,180,255,0.3); }
            #party-panel-body { padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 65vh; }
            #party-panel-body::-webkit-scrollbar { width: 4px; }
            #party-panel-body::-webkit-scrollbar-thumb { background: rgba(80,180,255,0.3); border-radius: 2px; }

            .party-info-bar {
                display: flex; justify-content: space-between; align-items: center;
                padding: 8px 10px; margin-bottom: 10px; border-radius: 6px;
                background: rgba(80,180,255,0.06); border: 1px solid rgba(80,180,255,0.15);
                font-family: 'Inter', sans-serif; font-size: 12px; color: #88aacc;
            }
            .party-info-bar .party-dps { color: #ffcc44; font-weight: 600; }

            .party-member-card {
                background: rgba(0,0,0,0.3); border: 1px solid rgba(80,180,255,0.15);
                border-radius: 8px; padding: 12px; margin-bottom: 8px;
                transition: border-color 0.2s;
            }
            .party-member-card:hover { border-color: rgba(80,180,255,0.4); }
            .party-member-top {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 8px;
            }
            .party-member-name {
                font-family: 'Cinzel', serif; font-size: 14px; color: #ddeeff;
                display: flex; align-items: center; gap: 6px;
            }
            .party-member-class {
                font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
                padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;
            }
            .party-member-level {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #889aaa;
            }
            .party-member-stats {
                display: flex; gap: 14px; font-family: 'Inter', sans-serif; font-size: 11px;
                color: #99aabb; margin-bottom: 8px;
            }
            .party-member-stats .stat { display: flex; align-items: center; gap: 3px; }
            .party-member-stats .val { color: #ddeeff; font-weight: 600; }
            .party-member-gear {
                display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;
            }
            .party-gear-slot {
                width: 34px; height: 34px; border-radius: 4px;
                background: rgba(0,0,0,0.4); border: 1px solid rgba(80,180,255,0.15);
                display: flex; align-items: center; justify-content: center;
                position: relative; cursor: default;
            }
            .party-gear-slot .gear-rarity-dot {
                position: absolute; bottom: 1px; right: 1px;
                width: 6px; height: 6px; border-radius: 50%;
            }
            .party-kick-btn {
                font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
                color: #cc6644; border: 1px solid rgba(200,100,60,0.3);
                background: rgba(200,100,60,0.08); padding: 3px 10px; border-radius: 4px;
                cursor: pointer; transition: all 0.2s; float: right;
            }
            .party-kick-btn:hover { background: rgba(200,100,60,0.2); border-color: rgba(200,100,60,0.6); color: #ff8866; }

            .party-empty-slot {
                background: rgba(0,0,0,0.15); border: 1px dashed rgba(80,180,255,0.15);
                border-radius: 8px; padding: 14px; margin-bottom: 8px;
                text-align: center; font-family: 'Inter', sans-serif; font-size: 12px;
                color: #556677;
            }
            .party-empty-locked { color: #334455; }

            /* ---- Party Invite Popup ---- */
            #party-invite-popup {
                position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
                z-index: 400; pointer-events: auto;
                animation: party-invite-slide-in 0.4s ease-out;
            }
            @keyframes party-invite-slide-in {
                from { transform: translateX(-50%) translateY(-30px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            #party-invite-inner {
                background: linear-gradient(180deg, rgba(10,20,35,0.97) 0%, rgba(5,12,25,0.99) 100%);
                border: 1px solid rgba(80,180,255,0.5); border-radius: 10px;
                padding: 14px 20px; min-width: 320px; max-width: 400px;
                box-shadow: 0 4px 30px rgba(0,0,0,0.7), 0 0 20px rgba(80,180,255,0.15);
                backdrop-filter: blur(10px); text-align: center;
            }
            #party-invite-icon { font-size: 22px; margin-bottom: 4px; }
            #party-invite-text {
                font-family: 'Cinzel', serif; font-size: 14px; color: #ddeeff;
                margin-bottom: 4px;
            }
            #party-invite-details {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #88aacc;
                margin-bottom: 8px;
            }
            #party-invite-timer-bar {
                width: 100%; height: 3px; background: rgba(0,0,0,0.5);
                border-radius: 2px; overflow: hidden; margin-bottom: 10px;
            }
            #party-invite-timer-fill {
                height: 100%; background: linear-gradient(90deg, #4488cc, #66ccff);
                transition: width 0.5s linear; width: 100%;
            }
            #party-invite-buttons { display: flex; gap: 10px; justify-content: center; }
            .party-invite-btn {
                font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
                padding: 6px 20px; border-radius: 6px; cursor: pointer;
                transition: all 0.2s; border: 1px solid;
            }
            .party-invite-btn.accept {
                color: #44dd66; border-color: rgba(60,200,80,0.4);
                background: rgba(60,200,80,0.1);
            }
            .party-invite-btn.accept:hover {
                background: rgba(60,200,80,0.25); border-color: rgba(60,200,80,0.7);
                box-shadow: 0 0 10px rgba(60,200,80,0.2);
            }
            .party-invite-btn.decline {
                color: #cc6655; border-color: rgba(200,100,80,0.3);
                background: rgba(200,100,80,0.08);
            }
            .party-invite-btn.decline:hover {
                background: rgba(200,100,80,0.2); border-color: rgba(200,100,80,0.6);
            }

            /* ---- Party Frames (bottom-left, above chat log) ---- */
            #party-frames {
                position: absolute; bottom: 170px; left: 10px;
                display: flex; flex-direction: column; gap: 3px;
                pointer-events: none; z-index: 50; width: 310px;
            }
            .party-frame {
                background: linear-gradient(180deg, rgba(8,16,30,0.82) 0%, rgba(5,10,22,0.88) 100%);
                border: 1px solid rgba(80,180,255,0.22);
                border-radius: 5px; padding: 4px 8px;
                backdrop-filter: blur(3px);
                display: flex; align-items: center; gap: 8px;
            }
            .party-frame-icon {
                font-size: 14px; flex-shrink: 0; width: 20px; text-align: center;
            }
            .party-frame-info {
                flex: 1; min-width: 0;
            }
            .party-frame-top-row {
                display: flex; align-items: center; justify-content: space-between;
                margin-bottom: 2px;
            }
            .party-frame-name {
                font-family: 'Cinzel', serif; font-size: 10px; color: #aaccee;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                max-width: 130px;
            }
            .party-frame-level {
                font-family: 'Inter', sans-serif; font-size: 8px; color: #667799;
                font-weight: 600; flex-shrink: 0;
            }
            .party-frame-dps {
                font-family: 'Inter', sans-serif; font-size: 8px; color: #ffcc44;
                font-weight: 600; flex-shrink: 0;
            }
            .party-frame-bar-bg {
                width: 100%; height: 4px; background: rgba(0,0,0,0.5);
                border-radius: 2px; overflow: hidden;
            }
            .party-frame-bar-fill {
                height: 100%; background: linear-gradient(90deg, #2a8844, #44cc66);
                border-radius: 2px; width: 100%; transition: width 0.3s;
            }

            /* ---- Companion Health Frame (above party frames) ---- */
            #companion-frame {
                display: none;
                position: absolute; bottom: 170px; left: 10px;
                width: 310px; z-index: 50; pointer-events: none;
                background: linear-gradient(180deg, rgba(10,22,18,0.85) 0%, rgba(6,14,12,0.90) 100%);
                border: 1px solid rgba(80,220,160,0.30);
                border-radius: 5px; padding: 4px 8px;
                backdrop-filter: blur(3px);
                align-items: center; gap: 8px;
            }
            #companion-frame.visible { display: flex; }
            #companion-frame.dead { opacity: 0.45; }
            .comp-frame-icon { font-size: 14px; flex-shrink: 0; width: 20px; text-align: center; }
            .comp-frame-info { flex: 1; min-width: 0; }
            .comp-frame-top-row {
                display: flex; align-items: center; justify-content: space-between;
                margin-bottom: 2px;
            }
            .comp-frame-name {
                font-family: 'Cinzel', serif; font-size: 10px; color: #55ddaa;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                max-width: 130px;
            }
            .comp-frame-tag {
                font-family: 'Inter', sans-serif; font-size: 7px; color: #66aa88;
                font-weight: 700; letter-spacing: 0.5px; flex-shrink: 0;
            }
            .comp-frame-dps {
                font-family: 'Inter', sans-serif; font-size: 8px; color: #ffcc44;
                font-weight: 600; flex-shrink: 0;
            }
            .comp-frame-bar-bg {
                width: 100%; height: 4px; background: rgba(0,0,0,0.5);
                border-radius: 2px; overflow: hidden;
            }
            .comp-frame-bar-fill {
                height: 100%; border-radius: 2px; width: 100%;
                transition: width 0.3s;
                background: linear-gradient(90deg, #22aa88, #44ddaa);
            }
            .comp-frame-bar-fill.low { background: linear-gradient(90deg, #cc5533, #ee7744); }
            .comp-frame-bar-fill.mid { background: linear-gradient(90deg, #ccaa22, #eecc44); }
            .comp-frame-respawn {
                font-family: 'Inter', sans-serif; font-size: 8px; color: #ff8866;
                font-weight: 600; text-align: center; padding: 1px 0;
            }

            /* ═══════════════════════════════════════════════════════
               DUNGEON FINDER PANEL
               ═══════════════════════════════════════════════════════ */
            /* ── Companion Panel ── */
            #companion-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 540px; max-width: 96vw; max-height: 90vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(5,18,12,0.98) 0%, rgba(2,10,6,0.99) 100%);
                border: 1px solid rgba(80,220,160,0.4); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(60,200,140,0.12);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #companion-panel.open { display: flex; flex-direction: column; }
            #companion-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(80,220,160,0.25);
                background: linear-gradient(90deg, rgba(60,200,140,0.08) 0%, transparent 100%);
            }
            #companion-panel-title { font-family: 'Cinzel', serif; font-size: 16px; color: #55ddaa; text-shadow: 0 0 8px rgba(80,220,160,0.4); }
            #companion-panel-body { padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 75vh; }
            #companion-panel-body::-webkit-scrollbar { width: 4px; }
            #companion-panel-body::-webkit-scrollbar-thumb { background: rgba(80,220,160,0.3); border-radius: 2px; }
            .comp-active-slot {
                display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 14px;
                border-radius: 8px; border: 1px solid rgba(80,220,160,0.3);
                background: rgba(80,220,160,0.06); min-height: 60px;
            }
            .comp-active-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px; border: 2px solid rgba(80,220,160,0.4); background: rgba(0,0,0,0.3); }
            .comp-active-info { flex: 1; }
            .comp-active-name { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 700; color: #88ffcc; }
            .comp-active-stats { font-size: 11px; color: #77aa99; margin-top: 2px; }
            .comp-dismiss-btn {
                padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(255,100,100,0.3);
                background: rgba(255,60,60,0.1); color: #ff8888; font-size: 11px; cursor: pointer;
                transition: all 0.2s;
            }
            .comp-dismiss-btn:hover { background: rgba(255,60,60,0.25); border-color: rgba(255,100,100,0.5); }
            .comp-section-title { font-family: 'Cinzel', serif; font-size: 13px; color: #88aa99; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(80,220,160,0.15); }
            .comp-zone-group { margin-bottom: 12px; }
            .comp-zone-label { font-size: 11px; color: #667766; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
            .comp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
            .comp-card {
                display: flex; align-items: center; gap: 8px; padding: 8px 10px;
                border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.2s;
            }
            .comp-card:hover { background: rgba(80,220,160,0.1); border-color: rgba(80,220,160,0.3); }
            .comp-card.active { border-color: rgba(80,255,160,0.5); background: rgba(80,255,160,0.12); }
            .comp-card-swatch { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); flex-shrink: 0; }
            .comp-card-info { flex: 1; min-width: 0; }
            .comp-card-name { font-size: 12px; font-weight: 600; color: #ccddcc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .comp-card-meta { font-size: 10px; color: #667766; }
            .comp-card.locked { opacity: 0.6; filter: saturate(0.5); cursor: help; }
            .comp-card.locked:hover { border-color: rgba(120,140,120,0.3); background: rgba(0,0,0,0.2); }
            .comp-card-progress { height: 4px; background: rgba(0,0,0,0.4); border-radius: 2px; margin-top: 4px; overflow: hidden; border: 1px solid rgba(80,100,80,0.2); }
            .comp-card-progress-fill { height: 100%; background: linear-gradient(90deg, #448866, #66aa88); transition: width 0.3s; }
            .comp-card-progress-fill.locked { background: linear-gradient(90deg, #667766, #889988); }
            .comp-empty { text-align: center; padding: 20px; color: #556655; font-style: italic; font-size: 12px; }
            .comp-dps-label { font-size: 11px; color: #55ddaa; font-weight: 600; }

            #dungeon-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 600px; max-width: 97vw; max-height: 90vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(15,5,2,0.98) 0%, rgba(8,3,1,0.99) 100%);
                border: 1px solid rgba(255,80,20,0.4); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(255,60,10,0.12);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #dungeon-panel.open { display: flex; flex-direction: column; }
            #dungeon-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(255,80,20,0.25);
                background: linear-gradient(90deg, rgba(255,60,10,0.08) 0%, transparent 100%);
            }
            #dungeon-panel-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ff7733;
                text-shadow: 0 0 8px rgba(255,80,20,0.4);
                display: flex; align-items: center; gap: 8px;
            }
            #dungeon-panel-body {
                padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 75vh;
            }
            #dungeon-panel-body::-webkit-scrollbar { width: 4px; }
            #dungeon-panel-body::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.3); border-radius: 2px; }

            /* Dungeon card — browsing view */
            .dg-card {
                background: linear-gradient(180deg, rgba(20,8,3,0.9) 0%, rgba(12,5,2,0.95) 100%);
                border: 1px solid rgba(255,80,20,0.2); border-radius: 8px;
                padding: 14px; margin-bottom: 10px; cursor: pointer;
                transition: all 0.2s; position: relative; overflow: hidden;
            }
            .dg-card:hover { border-color: rgba(255,120,40,0.5); box-shadow: 0 0 15px rgba(255,80,20,0.12); }
            .dg-card.locked { opacity: 0.35; cursor: not-allowed; }
            .dg-card-top { display: flex; gap: 12px; align-items: flex-start; }
            .dg-card-icon { font-size: 32px; filter: drop-shadow(0 0 6px rgba(255,80,20,0.5)); flex-shrink: 0; }
            .dg-card-info { flex: 1; min-width: 0; }
            .dg-card-name {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ff9944;
                text-shadow: 1px 1px 3px black; margin-bottom: 2px;
            }
            .dg-card-subtitle {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #aa7744;
                text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;
            }
            .dg-card-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #998866;
                line-height: 1.4; margin-bottom: 8px;
            }
            .dg-card-meta {
                display: flex; gap: 12px; font-family: 'Inter', sans-serif; font-size: 10px; color: #887766;
                flex-wrap: wrap;
            }
            .dg-card-meta span { display: flex; align-items: center; gap: 4px; }
            .dg-card-meta .val { color: #ddbb88; font-weight: 600; }
            .dg-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
            .dg-card-stats {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #887766;
                text-align: right;
            }
            .dg-card-stats .val { color: #ddbb88; font-weight: 600; }
            .dg-queue-btn {
                font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600;
                padding: 8px 20px; border-radius: 5px; cursor: pointer;
                border: 2px solid rgba(255,120,40,0.5);
                background: linear-gradient(180deg, rgba(200,80,20,0.3) 0%, rgba(140,50,10,0.4) 100%);
                color: #ffbb66; text-shadow: 1px 1px 3px black;
                transition: all 0.2s; text-align: center; margin-top: 8px;
            }
            .dg-queue-btn:hover {
                border-color: rgba(255,160,60,0.7);
                background: linear-gradient(180deg, rgba(240,100,30,0.4) 0%, rgba(180,70,20,0.5) 100%);
                box-shadow: 0 0 12px rgba(255,120,40,0.2);
            }
            .dg-queue-btn.disabled {
                opacity: 0.35; cursor: not-allowed;
                border-color: rgba(120,60,20,0.3);
                background: rgba(40,20,5,0.3);
            }
            .dg-queue-btn.disabled:hover { opacity: 0.35; border-color: rgba(120,60,20,0.3); box-shadow: none; }

            /* Active dungeon instance view */
            .dg-active { padding: 0; }
            .dg-loading-screen {
                width: 100%; height: 180px; background-size: cover; background-position: center;
                border-radius: 6px; position: relative; margin-bottom: 10px; overflow: hidden;
            }
            .dg-loading-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);
                display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
                padding: 12px;
            }
            .dg-loading-text {
                font-family: 'Cinzel', serif; font-size: 20px; color: #ffcc66;
                text-shadow: 0 0 12px rgba(255,180,40,0.5), 2px 2px 6px black;
                margin-bottom: 6px;
            }
            .dg-loading-bar-bg {
                width: 80%; height: 6px; background: rgba(0,0,0,0.6);
                border-radius: 3px; overflow: hidden;
            }
            .dg-loading-bar-fill {
                height: 100%; background: linear-gradient(90deg, #ff6622, #ffaa44);
                border-radius: 3px; transition: width 0.5s;
            }

            /* Progress tracker */
            .dg-progress-tracker {
                display: flex; gap: 2px; align-items: center; margin-bottom: 12px;
                padding: 8px 10px; background: rgba(0,0,0,0.3); border-radius: 6px;
                border: 1px solid rgba(255,80,20,0.12);
            }
            .dg-progress-node {
                flex: 1; height: 6px; border-radius: 3px;
                background: rgba(60,30,10,0.6); border: 1px solid rgba(255,80,20,0.1);
                transition: background 0.3s; position: relative;
            }
            .dg-progress-node.cleared {
                background: linear-gradient(90deg, #66cc44, #88ee66);
                border-color: rgba(100,200,80,0.4);
            }
            .dg-progress-node.active {
                background: linear-gradient(90deg, #ff6622, #ffaa44);
                border-color: rgba(255,160,60,0.5);
                animation: dg-node-pulse 1s ease-in-out infinite;
            }
            @keyframes dg-node-pulse {
                0%,100% { box-shadow: 0 0 4px rgba(255,120,40,0.3); }
                50% { box-shadow: 0 0 10px rgba(255,120,40,0.6); }
            }
            .dg-progress-node.boss { border: 1px solid rgba(255,60,20,0.4); }
            .dg-progress-label {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #aa8855;
                text-align: center; margin-top: 4px;
            }

            /* Party frames (dungeon) */
            .dg-party-section { margin-bottom: 10px; }
            .dg-party-header {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #887766;
                text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
            }
            .dg-party-frames { display: flex; gap: 4px; flex-wrap: wrap; }
            .dg-party-frame {
                flex: 1; min-width: 100px; padding: 4px 8px;
                background: rgba(0,0,0,0.25); border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.06);
                font-family: 'Inter', sans-serif;
            }
            .dg-party-frame.dead { opacity: 0.4; }
            .dg-pf-top {
                display: flex; justify-content: space-between; align-items: center;
                font-size: 10px; margin-bottom: 2px;
            }
            .dg-pf-name { font-weight: 600; }
            .dg-pf-role {
                font-size: 8px; padding: 1px 4px; border-radius: 3px;
                background: rgba(255,255,255,0.06); text-transform: uppercase; letter-spacing: 0.5px;
            }
            .dg-pf-bar-bg {
                width: 100%; height: 3px; background: rgba(0,0,0,0.4);
                border-radius: 2px; overflow: hidden;
            }
            .dg-pf-bar-fill {
                height: 100%; background: linear-gradient(90deg, #22aa44, #44cc66);
                border-radius: 2px; transition: width 0.3s;
            }

            /* Mob health bars */
            .dg-mobs-section { margin-bottom: 10px; }
            .dg-mob-row {
                display: flex; align-items: center; gap: 8px; margin-bottom: 3px;
                padding: 3px 6px; border-radius: 3px;
                background: rgba(0,0,0,0.15);
            }
            .dg-mob-row.dead { opacity: 0.25; text-decoration: line-through; }
            .dg-mob-row.boss-mob {
                border: 1px solid rgba(255,60,20,0.3);
                background: rgba(255,40,10,0.08);
            }
            .dg-mob-name {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #dd8866;
                min-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .dg-mob-name.boss-name { color: #ffcc44; font-weight: 700; font-size: 11px; }
            .dg-mob-bar-bg {
                flex: 1; height: 6px; background: rgba(0,0,0,0.5);
                border-radius: 3px; overflow: hidden; min-width: 80px;
            }
            .dg-mob-bar-fill {
                height: 100%; background: linear-gradient(90deg, #cc3322, #ee5544);
                border-radius: 3px; transition: width 0.2s;
            }
            .dg-mob-bar-fill.boss-bar {
                background: linear-gradient(90deg, #cc4400, #ff6622, #ffaa44);
            }
            .dg-mob-hp {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #aa7755;
                min-width: 40px; text-align: right;
            }

            /* Party HP bar */
            .dg-party-hp-section { margin-bottom: 10px; }
            .dg-party-hp-label {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #887766;
                display: flex; justify-content: space-between; margin-bottom: 3px;
            }
            .dg-party-hp-bg {
                width: 100%; height: 12px; background: rgba(0,0,0,0.6);
                border: 1px solid rgba(80,180,80,0.2); border-radius: 4px; overflow: hidden;
            }
            .dg-party-hp-fill {
                height: 100%; border-radius: 3px; transition: width 0.3s;
                background: linear-gradient(90deg, #cc2222, #ee6622, #44cc44);
            }
            .dg-party-hp-fill.high { background: linear-gradient(90deg, #22aa44, #44cc66); }
            .dg-party-hp-fill.mid { background: linear-gradient(90deg, #ccaa22, #eecc44); }
            .dg-party-hp-fill.low { background: linear-gradient(90deg, #cc3322, #ee5544); }

            /* Chat feed (dungeon) */
            .dg-chat-section { margin-bottom: 10px; }
            .dg-chat-header {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #887766;
                text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
                display: flex; align-items: center; gap: 6px;
            }
            .dg-chat-feed {
                background: rgba(0,0,0,0.3); border: 1px solid rgba(255,80,20,0.1);
                border-radius: 4px; padding: 6px 8px;
                max-height: 120px; overflow-y: auto;
            }
            .dg-chat-feed::-webkit-scrollbar { width: 3px; }
            .dg-chat-feed::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.25); border-radius: 2px; }
            .dg-chat-line {
                font-family: 'Inter', sans-serif; font-size: 10.5px; color: #aa9977;
                line-height: 1.5; text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
            }
            .dg-chat-system { color: #ffcc44; font-weight: 500; }
            .dg-chat-user { font-weight: 600; }

            /* Encounter info */
            .dg-encounter-info {
                padding: 8px 10px; margin-bottom: 10px; border-radius: 5px;
                background: rgba(255,80,20,0.06); border: 1px solid rgba(255,80,20,0.15);
            }
            .dg-encounter-name {
                font-family: 'Cinzel', serif; font-size: 14px; color: #ffaa55;
                text-shadow: 1px 1px 3px black; margin-bottom: 2px;
                display: flex; align-items: center; gap: 6px;
            }
            .dg-encounter-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #886644;
                font-style: italic;
            }
            .dg-encounter-timer {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #ddbb88;
                float: right;
            }

            /* Loot summary */
            .dg-loot-section {
                padding: 12px 14px; border-radius: 6px; margin-bottom: 10px;
                background: linear-gradient(180deg, rgba(255,200,60,0.06) 0%, rgba(200,150,40,0.03) 100%);
                border: 1px solid rgba(255,200,60,0.2);
            }
            .dg-loot-title {
                font-family: 'Cinzel', serif; font-size: 14px; color: #ffdd55;
                text-shadow: 0 0 8px rgba(255,200,60,0.4); margin-bottom: 8px;
                text-align: center;
            }
            .dg-loot-grid {
                display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
            }
            .dg-loot-item {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #ddcc88;
                display: flex; align-items: center; gap: 4px;
                padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 4px;
                border: 1px solid rgba(255,200,60,0.15);
            }
            .dg-loot-item .val { color: #ffdd66; font-weight: 700; }

            /* Result screen */
            .dg-result {
                text-align: center; padding: 20px; margin-bottom: 10px;
                border-radius: 8px;
            }
            .dg-result.victory {
                background: linear-gradient(180deg, rgba(40,100,30,0.15) 0%, rgba(20,60,15,0.1) 100%);
                border: 1px solid rgba(80,200,60,0.3);
            }
            .dg-result.defeat {
                background: linear-gradient(180deg, rgba(100,20,10,0.15) 0%, rgba(60,10,5,0.1) 100%);
                border: 1px solid rgba(200,60,40,0.3);
            }
            .dg-result-icon { font-size: 40px; margin-bottom: 6px; }
            .dg-result-title {
                font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700;
                text-shadow: 0 0 12px rgba(0,0,0,0.5), 2px 2px 6px black;
                margin-bottom: 4px;
            }
            .dg-result.victory .dg-result-title { color: #66ee88; }
            .dg-result.defeat .dg-result-title { color: #ff6644; }
            .dg-result-sub {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #aa9977;
                margin-bottom: 8px;
            }
            .dg-result-time {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #888;
            }
            .dg-action-btn {
                font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600;
                padding: 10px 24px; border-radius: 5px; cursor: pointer;
                transition: all 0.2s; display: inline-block; margin-top: 10px;
            }
            .dg-action-btn.leave {
                border: 1px solid rgba(200,80,60,0.4); background: rgba(200,80,60,0.12);
                color: #cc8877;
            }
            .dg-action-btn.leave:hover {
                background: rgba(200,80,60,0.25); border-color: rgba(200,80,60,0.7);
            }
            .dg-action-btn.requeue {
                border: 2px solid rgba(255,120,40,0.5);
                background: linear-gradient(180deg, rgba(200,80,20,0.3) 0%, rgba(140,50,10,0.4) 100%);
                color: #ffbb66;
            }
            .dg-action-btn.requeue:hover {
                border-color: rgba(255,160,60,0.7);
                box-shadow: 0 0 12px rgba(255,120,40,0.2);
            }

            /* Cooldown bar */
            .dg-cooldown-bar {
                padding: 8px 12px; margin-bottom: 10px; border-radius: 5px;
                background: rgba(0,0,0,0.2); border: 1px solid rgba(100,100,100,0.15);
                text-align: center;
            }
            .dg-cooldown-text {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #887766;
            }

            /* Phase banner */
            .dg-phase-banner {
                text-align: center; padding: 6px 10px; margin-bottom: 8px;
                border-radius: 4px; background: rgba(255,60,20,0.12);
                border: 1px solid rgba(255,60,20,0.3);
                animation: dg-phase-flash 0.6s ease-out;
            }
            @keyframes dg-phase-flash {
                0% { background: rgba(255,60,20,0.4); }
                100% { background: rgba(255,60,20,0.12); }
            }
            .dg-phase-banner-text {
                font-family: 'Cinzel', serif; font-size: 12px; color: #ff8844;
                text-shadow: 0 0 6px rgba(255,80,20,0.4);
            }

            /* Dungeon button glow when active */
            .right-btn.dungeon-active {
                border-color: rgba(255,120,40,0.7) !important;
                animation: dungeon-btn-glow 1.5s ease-in-out infinite;
            }
            @keyframes dungeon-btn-glow {
                0%,100% { box-shadow: 0 0 6px rgba(255,120,40,0.2); }
                50% { box-shadow: 0 0 14px rgba(255,120,40,0.4); }
            }

            /* ═══════ Dungeon 3D HUD Overlay ═══════ */
            #dungeon-hud {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 90;
                font-family: 'Inter', 'Segoe UI', sans-serif;
            }
            #dungeon-hud * { pointer-events: auto; }
            #dg-hud-top {
                position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
                display: flex; flex-direction: column; align-items: center; gap: 4px;
            }
            #dg-hud-name {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ff9944;
                text-shadow: 0 0 12px rgba(255,80,20,0.6), 0 2px 6px rgba(0,0,0,0.8);
                letter-spacing: 2px; text-transform: uppercase;
            }
            #dg-hud-progress {
                display: flex; gap: 6px; align-items: center;
            }
            #dg-hud-progress .dg-hud-node {
                width: 12px; height: 12px; border-radius: 50%;
                border: 2px solid rgba(255,120,40,0.4); background: rgba(20,8,2,0.6);
                transition: all 0.3s;
            }
            #dg-hud-progress .dg-hud-node.cleared { background: #ff8833; border-color: #ffaa55; box-shadow: 0 0 6px rgba(255,140,50,0.5); }
            #dg-hud-progress .dg-hud-node.active { background: #ff4422; border-color: #ff6644; box-shadow: 0 0 10px rgba(255,60,20,0.7); animation: dg-hud-pulse 1s ease-in-out infinite; }
            #dg-hud-progress .dg-hud-node.boss { width: 16px; height: 16px; border-radius: 3px; }
            #dg-hud-progress .dg-hud-connector { width: 16px; height: 2px; background: rgba(255,120,40,0.2); }
            #dg-hud-progress .dg-hud-connector.done { background: rgba(255,140,50,0.5); }
            @keyframes dg-hud-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
            #dg-hud-timer {
                font-size: 11px; color: #aa8866;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            }

            /* ---- PvP Global Match Found Popup ---- */
            #pvp-ready-popup {
                position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
                width: 340px; background: linear-gradient(180deg, rgba(20,10,30,0.95) 0%, rgba(10,5,20,0.98) 100%);
                border: 2px solid #aa66ff; border-radius: 8px; padding: 18px;
                box-shadow: 0 0 40px rgba(120,60,255,0.3), inset 0 0 15px rgba(0,0,0,0.5);
                text-align: center; pointer-events: auto; z-index: 1000;
                display: none; animation: pvp-ready-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            @keyframes pvp-ready-pop {
                0% { transform: translate(-50%, -20px) scale(0.9); opacity: 0; }
                100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
            }
            .pvp-ready-title {
                font-family: 'Cinzel', serif; font-size: 18px; color: #cc88ff; margin-bottom: 8px;
                text-shadow: 0 0 12px rgba(160,80,255,0.4), 2px 2px 4px black;
                letter-spacing: 2px;
            }
            .pvp-ready-name { font-family: 'Cinzel', serif; font-size: 14px; color: #eeddaa; margin-bottom: 12px; }
            .pvp-ready-timer { font-family: 'Inter', sans-serif; font-size: 12px; color: #9988aa; margin-bottom: 15px; }
            .pvp-ready-timer .val { color: #ffdd44; font-weight: 700; font-variant-numeric: tabular-nums; }
            .pvp-ready-btns { display: flex; gap: 10px; justify-content: center; }
            .pvp-ready-btn {
                padding: 8px 16px; border-radius: 4px; font-family: 'Cinzel', serif; font-size: 11px;
                font-weight: 700; cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
            }
            .pvp-ready-btn.accept {
                background: linear-gradient(180deg, #8844cc, #6622aa); border-color: #aa66ff; color: white;
                box-shadow: 0 0 10px rgba(120,60,255,0.2);
            }
            .pvp-ready-btn.accept:hover { background: linear-gradient(180deg, #aa66ff, #8844cc); transform: translateY(-1px); }
            .pvp-ready-btn.decline {
                background: rgba(40,20,10,0.6); border-color: rgba(200,80,60,0.4); color: #cc8877;
            }
            .pvp-ready-btn.decline:hover { background: rgba(60,30,15,0.8); border-color: #ff6644; color: #ff8866; }

            /* Left panel — party frames */
            #dg-hud-left {
                position: absolute; top: 180px; left: 10px; width: 180px;
            }
            .dg-hud-pf {
                display: flex; flex-direction: column; gap: 2px;
                padding: 5px 8px; margin-bottom: 4px;
                background: rgba(10,4,2,0.7); border: 1px solid rgba(255,120,40,0.15);
                border-radius: 4px; backdrop-filter: blur(4px);
            }
            .dg-hud-pf.dead { opacity: 0.4; }
            .dg-hud-pf-name {
                font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
            }
            .dg-hud-pf-role {
                font-size: 8px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;
            }
            .dg-hud-pf-bar {
                width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
            }
            .dg-hud-pf-fill {
                height: 100%; background: #44bb44; border-radius: 2px; transition: width 0.3s;
            }
            .dg-hud-pf-fill.low { background: #cc3322; }
            /* Right panel — enemy frames */
            #dg-hud-right {
                position: absolute; top: 80px; right: 10px; width: 220px;
            }
            .dg-hud-mob {
                display: flex; align-items: center; gap: 6px;
                padding: 4px 8px; margin-bottom: 3px;
                background: rgba(30,8,2,0.7); border: 1px solid rgba(255,60,20,0.15);
                border-radius: 4px; backdrop-filter: blur(4px);
            }
            .dg-hud-mob.dead { opacity: 0.25; }
            .dg-hud-mob.boss-mob { border-color: rgba(255,60,20,0.4); background: rgba(40,10,2,0.8); }
            .dg-hud-mob-name {
                font-size: 9px; color: #cc8866; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .dg-hud-mob-name.boss-name { color: #ff6644; font-weight: 700; }
            .dg-hud-mob-bar {
                width: 80px; height: 5px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; flex-shrink: 0;
            }
            .dg-hud-mob-fill {
                height: 100%; background: #cc4422; border-radius: 2px; transition: width 0.2s;
            }
            .dg-hud-mob-fill.boss-fill { background: #ff4422; }
            .dg-hud-mob-hp {
                font-size: 9px; color: #aa7755; width: 28px; text-align: right; flex-shrink: 0;
            }
            /* Bottom — chat (now moved to top-left above party frames) */
            #dg-hud-bottom {
                position: absolute; top: 12px; left: 10px; width: 320px; max-width: 40vw;
            }
            #dg-hud-chat {
                background: rgba(10,4,2,0.65); border: 1px solid rgba(255,120,40,0.1);
                border-radius: 6px; padding: 6px 10px; backdrop-filter: blur(4px);
                max-height: 150px; overflow-y: auto; font-size: 10px; color: #aa9977;
            }
            #dg-hud-chat::-webkit-scrollbar { width: 3px; }
            #dg-hud-chat::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.2); border-radius: 2px; }
            .dg-hud-chat-sys { color: #ccbb99; line-height: 1.4; }
            .dg-hud-chat-user { font-weight: 600; }
            /* Center alert (boss phase etc) */
            #dg-hud-center-alert {
                position: absolute; top: 35%; left: 50%; transform: translate(-50%,-50%);
                font-family: 'Cinzel', serif; font-size: 20px; color: #ff5533;
                text-shadow: 0 0 20px rgba(255,80,20,0.8), 0 2px 8px rgba(0,0,0,0.9);
                letter-spacing: 3px; text-transform: uppercase; text-align: center;
                animation: dg-alert-fade 3s ease-out forwards;
                pointer-events: none;
            }
            @keyframes dg-alert-fade {
                0% { opacity: 0; transform: translate(-50%,-50%) scale(0.8); }
                15% { opacity: 1; transform: translate(-50%,-50%) scale(1.05); }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translate(-50%,-50%) scale(1); }
            }
            /* ═══════ Loot Summary Screen ═══════ */
            .dg-hud-result-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                pointer-events: auto; z-index: 50;
                animation: dg-overlay-fadein .5s ease-out;
            }
            @keyframes dg-overlay-fadein { from { opacity: 0; } to { opacity: 1; } }
            .dg-loot-screen {
                width: 420px; max-width: 92vw; max-height: 88vh; overflow-y: auto;
                background: linear-gradient(170deg, rgba(18,8,3,0.96) 0%, rgba(8,3,1,0.98) 100%);
                border: 2px solid rgba(255,120,40,0.25); border-radius: 14px;
                backdrop-filter: blur(16px); box-shadow: 0 0 60px rgba(255,80,20,0.12), 0 4px 40px rgba(0,0,0,0.7);
                padding: 0; animation: dg-loot-slidein .4s cubic-bezier(.17,.67,.35,1.1);
            }
            .dg-loot-screen::-webkit-scrollbar { width: 4px; }
            .dg-loot-screen::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.25); border-radius: 2px; }
            @keyframes dg-loot-slidein { from { opacity: 0; transform: scale(.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            .dg-loot-screen.defeat { border-color: rgba(200,40,20,0.3); }

            /* Header banner */
            .dg-loot-header {
                position: relative; padding: 22px 20px 16px; text-align: center;
                background: linear-gradient(180deg, rgba(255,140,40,0.08) 0%, transparent 100%);
                border-bottom: 1px solid rgba(255,120,40,0.12);
            }
            .dg-loot-header.defeat { background: linear-gradient(180deg, rgba(200,30,10,0.08) 0%, transparent 100%); }
            .dg-loot-header-glow {
                position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
                width: 200px; height: 80px; border-radius: 50%;
                background: radial-gradient(ellipse, rgba(255,200,60,0.15) 0%, transparent 70%);
                pointer-events: none;
            }
            .dg-loot-header.defeat .dg-loot-header-glow {
                background: radial-gradient(ellipse, rgba(200,40,20,0.12) 0%, transparent 70%);
            }
            .dg-loot-icon {
                font-size: 52px; line-height: 1; margin-bottom: 6px;
                animation: dg-loot-icon-bounce .6s .2s cubic-bezier(.17,.67,.35,1.3) both;
                filter: drop-shadow(0 0 12px rgba(255,200,60,0.4));
            }
            .defeat .dg-loot-icon { filter: drop-shadow(0 0 12px rgba(200,40,20,0.4)); }
            @keyframes dg-loot-icon-bounce { from { opacity:0; transform: scale(0.3) translateY(-20px); } to { opacity:1; transform: scale(1) translateY(0); } }
            .dg-loot-title {
                font-family: 'Cinzel', serif; font-size: 20px; color: #ffcc44;
                letter-spacing: 3px; text-transform: uppercase; margin-bottom: 2px;
                text-shadow: 0 0 18px rgba(255,180,40,0.4);
            }
            .defeat .dg-loot-title { color: #ff5533; text-shadow: 0 0 18px rgba(255,50,20,0.4); }
            .dg-loot-subtitle {
                font-size: 11px; color: #aa8866; letter-spacing: 1px;
            }

            /* Stats bar */
            .dg-loot-stats {
                display: flex; justify-content: center; gap: 16px; padding: 10px 16px;
                font-size: 10px; color: #887766; background: rgba(0,0,0,0.2);
                border-bottom: 1px solid rgba(255,120,40,0.06);
            }
            .dg-loot-stats .dg-stat {
                display: flex; flex-direction: column; align-items: center; gap: 2px;
            }
            .dg-loot-stats .dg-stat-val {
                font-size: 14px; font-weight: 700; color: #ddcc99;
                font-family: 'Cinzel', serif;
            }
            .dg-loot-stats .dg-stat-label {
                font-size: 8px; text-transform: uppercase; letter-spacing: 1px; opacity: .7;
            }

            /* Loot items grid */
            .dg-loot-body { padding: 14px 18px 10px; }
            .dg-loot-section-title {
                font-family: 'Cinzel', serif; font-size: 11px; color: #aa8855;
                text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;
                text-align: center; position: relative;
            }
            .dg-loot-section-title::before, .dg-loot-section-title::after {
                content: ''; position: absolute; top: 50%; width: 60px; height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255,120,40,0.2));
            }
            .dg-loot-section-title::before { right: calc(50% + 60px); transform: rotate(180deg); }
            .dg-loot-section-title::after { left: calc(50% + 60px); }

            .dg-loot-items {
                display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
            }
            .dg-loot-item {
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; border-radius: 8px;
                background: rgba(255,200,60,0.03); border: 1px solid rgba(255,200,60,0.08);
                opacity: 0; transform: translateY(8px);
                animation: dg-loot-reveal .35s ease-out forwards;
            }
            .dg-loot-item:nth-child(1) { animation-delay: .4s; }
            .dg-loot-item:nth-child(2) { animation-delay: .55s; }
            .dg-loot-item:nth-child(3) { animation-delay: .7s; }
            .dg-loot-item:nth-child(4) { animation-delay: .85s; }
            @keyframes dg-loot-reveal { to { opacity: 1; transform: translateY(0); } }
            .dg-loot-item-icon {
                width: 36px; height: 36px; border-radius: 6px;
                display: flex; align-items: center; justify-content: center;
                font-size: 20px; flex-shrink: 0;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(255,200,60,0.12);
            }
            .dg-loot-item-info { flex: 1; min-width: 0; }
            .dg-loot-item-val {
                font-size: 18px; font-weight: 700; color: #ffdd66;
                font-family: 'Cinzel', serif; line-height: 1.1;
            }
            .dg-loot-item-val.soul { color: #ff9944; }
            .dg-loot-item-label {
                font-size: 9px; color: #887766; text-transform: uppercase; letter-spacing: .5px;
            }

            /* First clear bonus badge */
            .dg-loot-first-clear {
                text-align: center; padding: 8px 12px; margin: 10px 0 4px;
                background: linear-gradient(90deg, transparent, rgba(255,200,60,0.06), transparent);
                border: 1px solid rgba(255,200,60,0.15); border-radius: 6px;
                font-family: 'Cinzel', serif; font-size: 11px; color: #ffcc44;
                letter-spacing: 2px; text-transform: uppercase;
                animation: dg-loot-reveal .4s .3s ease-out both;
            }
            .dg-loot-first-clear::before { content: '✨ '; }
            .dg-loot-first-clear::after { content: ' ✨'; }

            /* Party performance */
            .dg-loot-party {
                margin-top: 12px; padding: 10px 12px;
                background: rgba(0,0,0,0.15); border-radius: 8px;
                border: 1px solid rgba(255,120,40,0.06);
            }
            .dg-loot-party-title {
                font-size: 9px; color: #776655; text-transform: uppercase; letter-spacing: 1px;
                margin-bottom: 6px;
            }
            .dg-loot-party-row {
                display: flex; align-items: center; gap: 8px; padding: 3px 0;
                font-size: 10px;
            }
            .dg-loot-party-icon { font-size: 12px; width: 16px; text-align: center; }
            .dg-loot-party-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .dg-loot-party-role { font-size: 8px; color: #776655; text-transform: uppercase; letter-spacing: .5px; }
            .dg-loot-party-status { font-size: 9px; }
            .dg-loot-party-status.alive { color: #66bb66; }
            .dg-loot-party-status.dead { color: #cc4433; }

            /* Action buttons */
            .dg-loot-actions {
                display: flex; gap: 8px; justify-content: center; padding: 14px 18px 18px;
            }
            .dg-loot-btn {
                padding: 10px 22px; border-radius: 8px; cursor: pointer;
                font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600;
                border: 1px solid rgba(255,120,40,0.35); color: #ffaa66;
                background: linear-gradient(180deg, rgba(50,20,8,0.9) 0%, rgba(30,12,4,0.95) 100%);
                transition: all .2s; letter-spacing: 1px; text-transform: uppercase;
            }
            .dg-loot-btn:hover {
                background: linear-gradient(180deg, rgba(80,35,12,0.95) 0%, rgba(50,20,8,0.98) 100%);
                border-color: rgba(255,160,60,0.55); color: #ffcc88;
                box-shadow: 0 0 12px rgba(255,100,30,0.15);
            }
            .dg-loot-btn.primary {
                background: linear-gradient(180deg, rgba(180,70,15,0.8) 0%, rgba(120,40,8,0.9) 100%);
                border-color: rgba(255,160,60,0.5); color: #fff5e0;
            }
            .dg-loot-btn.primary:hover {
                background: linear-gradient(180deg, rgba(200,85,20,0.9) 0%, rgba(150,55,12,0.95) 100%);
                border-color: rgba(255,200,80,0.6); box-shadow: 0 0 16px rgba(255,120,30,0.25);
            }

            /* ═══════════════════════════════════════════ */
            /* PvP BATTLEGROUND PANEL                      */
            /* ═══════════════════════════════════════════ */
            #pvp-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 620px; max-width: 97vw; max-height: 92vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(10,4,20,0.98) 0%, rgba(5,2,12,0.99) 100%);
                border: 1px solid rgba(170,68,255,0.35); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(170,68,255,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #pvp-panel.open { display: flex; flex-direction: column; }
            #pvp-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(170,68,255,0.2);
                background: linear-gradient(90deg, rgba(170,68,255,0.08) 0%, transparent 100%);
            }
            #pvp-panel-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #cc88ff;
                text-shadow: 0 0 8px rgba(170,68,255,0.4);
                display: flex; align-items: center; gap: 8px;
            }
            #pvp-panel-vp {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #eeddaa;
                display: flex; align-items: center; gap: 4px;
            }
            #pvp-panel-body {
                padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 78vh;
            }
            #pvp-panel-body::-webkit-scrollbar { width: 4px; }
            #pvp-panel-body::-webkit-scrollbar-thumb { background: rgba(170,68,255,0.3); border-radius: 2px; }

            /* BG Card */
            .bg-card {
                background: linear-gradient(180deg, rgba(15,6,25,0.9) 0%, rgba(8,3,16,0.95) 100%);
                border: 1px solid rgba(170,68,255,0.2); border-radius: 8px;
                padding: 0; margin-bottom: 10px; overflow: hidden;
                transition: all 0.2s;
            }
            .bg-card:hover { border-color: rgba(200,100,255,0.4); }
            .bg-card.locked { opacity: 0.35; pointer-events: none; }
            .bg-card-banner {
                width: 100%; height: 110px; background-size: cover; background-position: center;
                position: relative;
            }
            .bg-card-banner-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(5,2,12,0.85) 100%);
                display: flex; flex-direction: column; justify-content: flex-end; padding: 10px 14px;
            }
            .bg-card-name {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ddbbff;
                text-shadow: 0 0 10px rgba(170,68,255,0.5), 1px 1px 3px black;
            }
            .bg-card-subtitle {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #9977bb;
                text-transform: uppercase; letter-spacing: 1.2px;
            }
            .bg-card-body { padding: 12px 14px; }
            .bg-card-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #887799;
                line-height: 1.45; margin-bottom: 10px;
            }
            .bg-card-meta {
                display: flex; gap: 14px; flex-wrap: wrap;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #776688;
                margin-bottom: 10px;
            }
            .bg-card-meta span { display: flex; align-items: center; gap: 3px; }
            .bg-card-meta .val { color: #ccaaee; font-weight: 600; }
            .bg-card-stats {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #776688;
                margin-bottom: 10px; display: flex; gap: 12px; flex-wrap: wrap;
            }
            .bg-card-stats .val { color: #ccaaee; font-weight: 600; }
            .bg-queue-btn {
                font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600;
                padding: 8px 20px; border-radius: 5px; cursor: pointer; width: 100%;
                border: 2px solid rgba(170,68,255,0.4);
                background: linear-gradient(180deg, rgba(120,40,200,0.3) 0%, rgba(80,20,140,0.4) 100%);
                color: #ddbbff; text-shadow: 1px 1px 3px black;
                transition: all 0.2s; text-align: center;
            }
            .bg-queue-btn:hover {
                border-color: rgba(200,100,255,0.6);
                background: linear-gradient(180deg, rgba(150,60,240,0.4) 0%, rgba(100,30,180,0.5) 100%);
                box-shadow: 0 0 12px rgba(170,68,255,0.2);
            }
            .bg-queue-btn.disabled { opacity: 0.35; cursor: not-allowed; }
            .bg-queue-btn.disabled:hover { opacity: 0.35; box-shadow: none; border-color: rgba(170,68,255,0.2); }

            /* BG Match Found Overlay */
            .pvp-match-found-overlay {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center;
                z-index: 400; backdrop-filter: blur(4px); border-radius: 8px;
                animation: fadeIn 0.3s ease-out;
            }
            .pvp-match-box {
                background: linear-gradient(180deg, rgba(20,15,10,0.98) 0%, rgba(10,8,5,0.99) 100%);
                border: 2px solid #ffcc44; border-radius: 12px; padding: 24px;
                text-align: center; max-width: 320px; width: 90%;
                box-shadow: 0 0 40px rgba(255,200,60,0.2), inset 0 0 20px rgba(0,0,0,0.5);
                animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .pvp-match-title { font-family: 'Cinzel', serif; font-size: 18px; color: #ffcc44; margin-bottom: 8px; letter-spacing: 1px; }
            .pvp-match-name { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3); margin-bottom: 12px; }
            .pvp-match-desc { font-family: 'Inter', sans-serif; font-size: 12px; color: #aabb99; margin-bottom: 16px; line-height: 1.4; }
            .pvp-match-timer { font-family: 'Inter', sans-serif; font-size: 13px; color: #eeddaa; margin-bottom: 20px; }
            .pvp-match-timer .val { font-weight: 700; color: #ffdd44; }
            .pvp-match-btns { display: flex; flex-direction: column; gap: 8px; }
            .pvp-match-btn {
                padding: 10px 24px; border-radius: 6px; cursor: pointer; font-family: 'Cinzel', serif;
                font-size: 14px; font-weight: 600; transition: all 0.2s; text-align: center;
            }
            .pvp-match-btn.accept {
                background: linear-gradient(180deg, rgba(80,180,80,0.3) 0%, rgba(40,120,40,0.4) 100%);
                border: 2px solid #66dd88; color: #aaeebb;
                text-shadow: 1px 1px 3px black; box-shadow: 0 0 12px rgba(80,200,100,0.15);
            }
            .pvp-match-btn.accept:hover { border-color: #88ffaa; background: rgba(80,200,100,0.4); box-shadow: 0 0 20px rgba(80,200,100,0.25); }
            .pvp-match-btn.decline {
                background: rgba(120,40,30,0.2); border: 1px solid rgba(200,80,60,0.4);
                color: #cc8877; font-size: 12px;
            }
            .pvp-match-btn.decline:hover { background: rgba(180,60,40,0.3); border-color: rgba(220,80,60,0.6); color: #ff8866; }

            @keyframes popIn {
                0% { transform: scale(0.8); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }

            /* Active BG Instance */
            .bg-active-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 12px; background: rgba(0,0,0,0.3); border-radius: 6px;
                margin-bottom: 8px; border: 1px solid rgba(170,68,255,0.1);
            }
            .bg-active-state {
                font-family: 'Cinzel', serif; font-size: 13px; color: #ddbbff;
                text-shadow: 0 0 8px rgba(170,68,255,0.4);
            }
            .bg-active-timer {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #aa88cc;
            }
            .bg-scoreboard {
                display: flex; justify-content: center; align-items: center; gap: 16px;
                padding: 10px; margin-bottom: 8px; background: rgba(0,0,0,0.25); border-radius: 6px;
                border: 1px solid rgba(170,68,255,0.08);
            }
            .bg-score-faction {
                display: flex; flex-direction: column; align-items: center; gap: 2px;
                min-width: 90px;
            }
            .bg-score-name { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
            .bg-score-num { font-family: 'Cinzel', serif; font-size: 28px; font-weight: 700; text-shadow: 0 0 12px currentColor; }
            .bg-score-vs { font-family: 'Cinzel', serif; font-size: 14px; color: #887799; }
            .bg-flag-status {
                font-size: 9px; padding: 2px 6px; border-radius: 3px;
                background: rgba(0,0,0,0.4); margin-top: 2px;
            }
            .bg-dampening {
                text-align: center; font-size: 10px; color: #886666; margin-bottom: 8px;
            }
            .bg-kill-feed {
                max-height: 90px; overflow-y: auto; padding: 6px 8px;
                background: rgba(0,0,0,0.2); border-radius: 4px; margin-bottom: 8px;
                border: 1px solid rgba(170,68,255,0.06);
                font-family: 'Inter', sans-serif; font-size: 10px;
            }
            .bg-kill-feed::-webkit-scrollbar { width: 3px; }
            .bg-kill-feed::-webkit-scrollbar-thumb { background: rgba(170,68,255,0.2); border-radius: 2px; }
            .bg-kill-entry { color: #998899; margin-bottom: 2px; }
            .bg-team-roster {
                display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;
            }
            .bg-roster-col { flex: 1; min-width: 200px; }
            .bg-roster-title {
                font-family: 'Cinzel', serif; font-size: 11px; margin-bottom: 4px;
                padding: 3px 6px; border-radius: 3px; text-align: center;
            }
            .bg-roster-row {
                display: flex; align-items: center; gap: 4px; padding: 2px 4px;
                font-size: 9px; border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .bg-roster-row.dead { opacity: 0.35; }
            .bg-roster-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .bg-roster-class { width: 16px; text-align: center; }
            .bg-roster-hp-bar {
                width: 40px; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden;
            }
            .bg-roster-hp-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
            .bg-roster-kd { width: 28px; text-align: right; color: #998899; }
            .bg-roster-flag { font-size: 10px; }
            .bg-chat-feed {
                max-height: 100px; overflow-y: auto; padding: 6px 8px;
                background: rgba(0,0,0,0.2); border-radius: 4px; margin-bottom: 8px;
                border: 1px solid rgba(170,68,255,0.06);
                font-family: 'Inter', sans-serif; font-size: 10px;
            }
            .bg-chat-feed::-webkit-scrollbar { width: 3px; }
            .bg-chat-feed::-webkit-scrollbar-thumb { background: rgba(170,68,255,0.2); border-radius: 2px; }
            .bg-chat-msg { margin-bottom: 2px; color: #998899; }
            .bg-chat-user { font-weight: 600; }
            .bg-chat-sys { color: #776688; font-style: italic; }

            /* ── BG Detailed Scoreboard ── */
            .bg-scoreboard-detail {
                margin-bottom: 8px; border-radius: 6px; overflow: hidden;
                border: 1px solid rgba(170,68,255,0.12);
                background: rgba(0,0,0,0.25);
            }
            .bg-sb-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 6px 10px; cursor: pointer; user-select: none;
                background: linear-gradient(90deg, rgba(170,68,255,0.08) 0%, transparent 100%);
            }
            .bg-sb-header:hover { background: linear-gradient(90deg, rgba(170,68,255,0.14) 0%, transparent 100%); }
            .bg-sb-title {
                font-family: 'Cinzel', serif; font-size: 11px; color: #cc88ff;
                text-shadow: 0 0 6px rgba(170,68,255,0.3);
                display: flex; align-items: center; gap: 6px;
            }
            .bg-sb-toggle { font-size: 10px; color: #887799; transition: transform 0.2s; }
            .bg-sb-body { padding: 0; }
            .bg-sb-table {
                width: 100%; border-collapse: collapse;
                font-family: 'Inter', sans-serif; font-size: 9px;
            }
            .bg-sb-table th {
                padding: 4px 6px; text-align: left; color: #887799;
                font-weight: 600; font-size: 8px; text-transform: uppercase;
                letter-spacing: 0.5px; border-bottom: 1px solid rgba(170,68,255,0.1);
                background: rgba(0,0,0,0.3);
                position: sticky; top: 0;
            }
            .bg-sb-table th.num { text-align: right; }
            .bg-sb-table td { padding: 3px 6px; border-bottom: 1px solid rgba(255,255,255,0.02); }
            .bg-sb-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
            .bg-sb-table tr.party-row { background: rgba(85,187,255,0.06); }
            .bg-sb-table tr.party-row td:first-child { border-left: 2px solid #55bbff; }
            .bg-sb-table tr.companion-row { background: rgba(100,220,170,0.06); }
            .bg-sb-table tr.companion-row td:first-child { border-left: 2px solid #66ddaa; }
            .bg-sb-table tr.dead-row { opacity: 0.45; }
            .bg-sb-table tr.team-divider td {
                padding: 1px 0; border-bottom: none;
            }
            .bg-sb-name { color: #ccaaee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; display: inline-block; vertical-align: middle; }
            .bg-sb-party-name { color: #55ccff; }
            .bg-sb-companion-name { color: #66ddaa; }
            .bg-sb-class { font-size: 10px; vertical-align: middle; }
            .bg-sb-dmg { color: #ff8866; }
            .bg-sb-heal { color: #44dd88; }
            .bg-sb-vp { color: #eedd66; }
            .bg-sb-kills { color: #ccaaee; }
            .bg-sb-deaths { color: #886677; }
            .bg-sb-caps { color: #ffcc44; }
            .bg-sb-team-label {
                padding: 4px 8px; font-family: 'Cinzel', serif; font-size: 9px;
                letter-spacing: 1px; text-transform: uppercase; font-weight: 600;
            }
            .bg-sb-team-totals td {
                font-weight: 700; font-size: 9px; padding: 4px 6px;
                border-top: 1px solid rgba(170,68,255,0.15);
                border-bottom: none;
                background: rgba(0,0,0,0.2);
            }
            .bg-sb-mvp {
                display: flex; align-items: center; gap: 6px; padding: 6px 10px;
                background: linear-gradient(90deg, rgba(255,200,50,0.06) 0%, transparent 100%);
                border-top: 1px solid rgba(255,200,50,0.1);
                font-family: 'Inter', sans-serif; font-size: 10px; color: #ccaa77;
            }
            .bg-sb-mvp-name { color: #ffdd66; font-weight: 700; }
            .bg-sb-scroll {
                max-height: 300px; overflow-y: auto;
            }
            .bg-sb-scroll::-webkit-scrollbar { width: 3px; }
            .bg-sb-scroll::-webkit-scrollbar-thumb { background: rgba(170,68,255,0.2); border-radius: 2px; }

            .bg-action-row {
                display: flex; gap: 8px; justify-content: center; margin-top: 8px;
            }
            .bg-action-btn {
                font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
                padding: 7px 18px; border-radius: 5px; cursor: pointer;
                border: 1px solid rgba(170,68,255,0.3);
                background: linear-gradient(180deg, rgba(60,20,100,0.4) 0%, rgba(40,12,70,0.5) 100%);
                color: #ccaaee; transition: all 0.2s;
            }
            .bg-action-btn:hover {
                border-color: rgba(200,120,255,0.5);
                background: linear-gradient(180deg, rgba(80,30,130,0.5) 0%, rgba(60,20,100,0.6) 100%);
                box-shadow: 0 0 10px rgba(170,68,255,0.15);
            }
            .bg-action-btn.primary {
                border-color: rgba(170,68,255,0.5);
                background: linear-gradient(180deg, rgba(140,50,220,0.5) 0%, rgba(100,30,170,0.6) 100%);
                color: #eeddff;
            }
            /* Result overlay */
            .bg-result-overlay {
                background: rgba(0,0,0,0.35); border-radius: 8px; padding: 16px;
                border: 1px solid rgba(170,68,255,0.15); margin-bottom: 10px;
                text-align: center; animation: dg-overlay-fadein .5s ease-out;
            }
            .bg-result-overlay.victory { border-color: rgba(255,220,60,0.3); }
            .bg-result-overlay.defeat { border-color: rgba(255,60,40,0.3); }
            .bg-result-title {
                font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700;
                text-shadow: 0 0 16px currentColor; margin-bottom: 6px;
            }
            .bg-result-score {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ccaaee; margin-bottom: 8px;
            }
            .bg-result-rewards {
                display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;
                font-family: 'Inter', sans-serif; font-size: 11px; color: #aa88cc;
            }
            .bg-result-rewards .val { color: #eeddaa; font-weight: 600; }
            /* PvP button glow */
            .right-btn.pvp-active {
                border-color: rgba(170,68,255,0.7) !important;
                animation: pvp-btn-glow 1.5s ease-in-out infinite;
            }
            @keyframes pvp-btn-glow {
                0%,100% { box-shadow: 0 0 6px rgba(170,68,255,0.2); }
                50% { box-shadow: 0 0 14px rgba(170,68,255,0.4); }
            }

            /* ═══════════════════════════════════════════ */
            /* PVP VENDOR PANEL                            */
            /* ═══════════════════════════════════════════ */
            #pvp-vendor-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 580px; max-width: 97vw; max-height: 92vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(12,5,28,0.98) 0%, rgba(6,2,14,0.99) 100%);
                border: 1px solid rgba(200,120,255,0.35); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(200,120,255,0.12);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #pvp-vendor-panel.open { display: flex; flex-direction: column; }
            #pvp-vendor-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(200,120,255,0.2);
                background: linear-gradient(90deg, rgba(200,120,255,0.08) 0%, transparent 100%);
            }
            #pvp-vendor-title {
                font-family: 'Cinzel', serif; font-size: 15px; color: #ddaaff;
                text-shadow: 0 0 8px rgba(200,120,255,0.4);
                display: flex; align-items: center; gap: 8px;
            }
            #pvp-vendor-currency {
                display: flex; align-items: center; gap: 12px;
                font-family: 'Inter', sans-serif; font-size: 11px; color: #bb99dd;
            }
            #pvp-vendor-currency .vp-val { color: #ffcc44; font-weight: 700; }
            #pvp-vendor-body {
                padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 78vh;
            }
            #pvp-vendor-body::-webkit-scrollbar { width: 4px; }
            #pvp-vendor-body::-webkit-scrollbar-thumb { background: rgba(200,120,255,0.3); border-radius: 2px; }

            .pvpv-section-title {
                font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600;
                color: #cc99ee; margin: 12px 0 8px; border-bottom: 1px solid rgba(200,120,255,0.15);
                padding-bottom: 4px; display: flex; align-items: center; gap: 6px;
            }
            .pvpv-section-title:first-child { margin-top: 0; }

            /* Gear Cards */
            .pvpv-gear-card {
                background: linear-gradient(135deg, rgba(20,8,40,0.8) 0%, rgba(10,4,20,0.9) 100%);
                border: 1px solid rgba(200,120,255,0.2); border-radius: 6px;
                padding: 10px 12px; margin-bottom: 8px; display: flex; gap: 10px; align-items: flex-start;
                transition: all 0.15s;
            }
            .pvpv-gear-card:hover { border-color: rgba(220,150,255,0.4); }
            .pvpv-gear-card.purchased { opacity: 0.55; border-color: rgba(100,200,100,0.3); }
            .pvpv-gear-icon {
                font-size: 26px; min-width: 36px; text-align: center; line-height: 1;
                padding-top: 2px;
            }
            .pvpv-gear-info { flex: 1; min-width: 0; }
            .pvpv-gear-name {
                font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; color: #ddbbff;
                margin-bottom: 2px;
            }
            .pvpv-gear-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #9977bb; line-height: 1.4;
                margin-bottom: 4px;
            }
            .pvpv-gear-slot {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #776699;
                text-transform: uppercase; letter-spacing: 0.8px;
            }
            .pvpv-gear-buy {
                font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600;
                padding: 5px 12px; border-radius: 4px; cursor: pointer; white-space: nowrap;
                border: 1px solid rgba(255,200,60,0.4);
                background: linear-gradient(180deg, rgba(200,160,40,0.25) 0%, rgba(160,120,20,0.35) 100%);
                color: #ffdd88; transition: all 0.15s;
            }
            .pvpv-gear-buy:hover {
                border-color: rgba(255,220,80,0.6);
                background: linear-gradient(180deg, rgba(220,180,60,0.35) 0%, rgba(180,140,30,0.45) 100%);
                box-shadow: 0 0 8px rgba(255,200,60,0.15);
            }
            .pvpv-gear-buy.cant-afford { opacity: 0.4; cursor: not-allowed; }
            .pvpv-gear-buy.cant-afford:hover { box-shadow: none; border-color: rgba(255,200,60,0.3); }
            .pvpv-gear-buy.owned {
                border-color: rgba(100,200,100,0.4); color: #88dd88;
                background: rgba(50,120,50,0.2); cursor: default;
            }

            /* Upgrade Rows */
            .pvpv-upg-row {
                background: rgba(15,6,30,0.7); border: 1px solid rgba(200,120,255,0.15);
                border-radius: 5px; padding: 8px 12px; margin-bottom: 6px;
                display: flex; align-items: center; gap: 10px; transition: all 0.15s;
            }
            .pvpv-upg-row:hover { border-color: rgba(220,150,255,0.3); }
            .pvpv-upg-icon { font-size: 20px; min-width: 28px; text-align: center; }
            .pvpv-upg-info { flex: 1; min-width: 0; }
            .pvpv-upg-name {
                font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; color: #ccaaee;
            }
            .pvpv-upg-desc {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #887799; line-height: 1.3;
            }
            .pvpv-upg-tier {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #aa88cc; font-weight: 600;
            }
            .pvpv-upg-buy {
                font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600;
                padding: 4px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap;
                border: 1px solid rgba(200,120,255,0.4);
                background: linear-gradient(180deg, rgba(160,80,220,0.25) 0%, rgba(120,50,180,0.35) 100%);
                color: #ddbbff; transition: all 0.15s;
            }
            .pvpv-upg-buy:hover {
                border-color: rgba(220,140,255,0.6);
                box-shadow: 0 0 8px rgba(200,120,255,0.15);
            }
            .pvpv-upg-buy.cant-afford { opacity: 0.4; cursor: not-allowed; }
            .pvpv-upg-buy.cant-afford:hover { box-shadow: none; }
            .pvpv-upg-buy.maxed {
                border-color: rgba(100,200,100,0.3); color: #88cc88;
                background: rgba(50,120,50,0.15); cursor: default;
            }

            /* VP Stats summary */
            .pvpv-stats {
                display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 10px;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #887799;
            }
            .pvpv-stats .val { color: #ccaaee; font-weight: 600; }

            /* Active bonuses display */
            .pvpv-bonuses {
                background: rgba(10,4,20,0.6); border: 1px solid rgba(200,120,255,0.1);
                border-radius: 5px; padding: 8px 10px; margin-bottom: 10px;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #887799;
                display: flex; flex-wrap: wrap; gap: 8px 14px;
            }
            .pvpv-bonuses .bonus-item { display: flex; align-items: center; gap: 3px; }
            .pvpv-bonuses .bonus-val { color: #88ddaa; font-weight: 600; }

            /* ═══════════════════════════════════════════ */
            /* RAID PANEL                                  */
            /* ═══════════════════════════════════════════ */
            #raid-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 640px; max-width: 97vw; max-height: 92vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(18,4,8,0.98) 0%, rgba(8,2,4,0.99) 100%);
                border: 1px solid rgba(204,51,68,0.35); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(204,51,68,0.1);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #raid-panel.open { display: flex; flex-direction: column; }
            #raid-panel-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(204,51,68,0.2);
                background: linear-gradient(90deg, rgba(204,51,68,0.08) 0%, transparent 100%);
            }
            #raid-panel-title {
                font-family: 'Cinzel', serif; font-size: 16px; color: #cc3344;
                text-shadow: 0 0 8px rgba(204,51,68,0.4);
                display: flex; align-items: center; gap: 8px;
            }
            #raid-panel-rp {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #eeddaa;
                display: flex; align-items: center; gap: 4px;
            }
            #raid-panel-body {
                padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 78vh;
            }
            #raid-panel-body::-webkit-scrollbar { width: 4px; }
            #raid-panel-body::-webkit-scrollbar-thumb { background: rgba(204,51,68,0.3); border-radius: 2px; }

            /* Raid Card */
            .rd-card {
                background: linear-gradient(180deg, rgba(20,5,8,0.9) 0%, rgba(10,3,5,0.95) 100%);
                border: 1px solid rgba(204,51,68,0.2); border-radius: 8px;
                padding: 0; margin-bottom: 10px; overflow: hidden;
                transition: all 0.2s;
            }
            .rd-card:hover { border-color: rgba(220,80,90,0.4); }
            .rd-card.locked { opacity: 0.35; pointer-events: none; }
            .rd-card-banner {
                width: 100%; height: 120px; background-size: cover; background-position: center;
                position: relative;
            }
            .rd-card-banner-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(8,2,4,0.85) 100%);
                display: flex; flex-direction: column; justify-content: flex-end; padding: 10px 14px;
            }
            .rd-card-name {
                font-family: 'Cinzel', serif; font-size: 16px; color: #ee8899;
                text-shadow: 0 0 10px rgba(204,51,68,0.5), 1px 1px 3px black;
            }
            .rd-card-subtitle {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #aa5566;
                text-transform: uppercase; letter-spacing: 1.2px;
            }
            .rd-card-body { padding: 12px 14px; }
            .rd-card-desc {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #886666;
                line-height: 1.45; margin-bottom: 10px;
            }
            .rd-card-meta {
                display: flex; gap: 14px; flex-wrap: wrap;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #775555;
                margin-bottom: 10px;
            }
            .rd-card-meta span { display: flex; align-items: center; gap: 3px; }
            .rd-card-meta .val { color: #dd9999; font-weight: 600; }
            .rd-card-stats {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #775555;
                margin-bottom: 10px; display: flex; gap: 12px; flex-wrap: wrap;
            }
            .rd-card-stats .val { color: #dd9999; font-weight: 600; }
            .rd-queue-btn {
                font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600;
                padding: 8px 20px; border-radius: 5px; cursor: pointer; width: 100%;
                border: 2px solid rgba(204,51,68,0.4);
                background: linear-gradient(180deg, rgba(180,40,50,0.3) 0%, rgba(120,25,35,0.4) 100%);
                color: #ee8899; text-shadow: 1px 1px 3px black;
                transition: all 0.2s; text-align: center;
            }
            .rd-queue-btn:hover {
                border-color: rgba(230,80,90,0.6);
                background: linear-gradient(180deg, rgba(210,60,70,0.4) 0%, rgba(150,40,50,0.5) 100%);
                box-shadow: 0 0 12px rgba(204,51,68,0.2);
            }
            .rd-queue-btn.disabled { opacity: 0.35; cursor: not-allowed; }
            .rd-queue-btn.disabled:hover { opacity: 0.35; box-shadow: none; border-color: rgba(204,51,68,0.2); }

            /* Active Raid Instance */
            .rd-loading-screen {
                width: 100%; height: 180px; background-size: cover; background-position: center;
                border-radius: 6px; position: relative; margin-bottom: 10px; overflow: hidden;
            }
            .rd-loading-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%);
                display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
                padding: 12px;
            }
            .rd-loading-text {
                font-family: 'Cinzel', serif; font-size: 20px; color: #ee8899;
                text-shadow: 0 0 12px rgba(204,51,68,0.5), 2px 2px 6px black;
                margin-bottom: 6px;
            }
            .rd-loading-bar-bg {
                width: 80%; height: 6px; background: rgba(0,0,0,0.6);
                border-radius: 3px; overflow: hidden;
            }
            .rd-loading-bar-fill {
                height: 100%; background: linear-gradient(90deg, #cc3344, #ee6677);
                border-radius: 3px; transition: width 0.5s;
            }

            /* Progress tracker (raid — 12 encounters) */
            .rd-progress-tracker {
                display: flex; gap: 2px; align-items: center; margin-bottom: 12px;
                padding: 8px 10px; background: rgba(0,0,0,0.3); border-radius: 6px;
                border: 1px solid rgba(204,51,68,0.12);
            }
            .rd-progress-node {
                flex: 1; height: 6px; border-radius: 3px;
                background: rgba(50,15,20,0.6); border: 1px solid rgba(204,51,68,0.1);
                transition: background 0.3s; position: relative;
            }
            .rd-progress-node.cleared {
                background: linear-gradient(90deg, #66cc44, #88ee66);
                border-color: rgba(100,200,80,0.4);
            }
            .rd-progress-node.active {
                background: linear-gradient(90deg, #cc3344, #ee6677);
                border-color: rgba(204,80,90,0.5);
                animation: rd-node-pulse 1s ease-in-out infinite;
            }
            @keyframes rd-node-pulse {
                0%,100% { box-shadow: 0 0 4px rgba(204,51,68,0.3); }
                50% { box-shadow: 0 0 10px rgba(204,51,68,0.6); }
            }
            .rd-progress-node.boss { border: 1px solid rgba(204,51,68,0.4); }

            /* Raid party frames (raid — 10 members) */
            .rd-party-section { margin-bottom: 10px; }
            .rd-party-header {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #886666;
                text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
            }
            .rd-party-frames { display: flex; gap: 4px; flex-wrap: wrap; }
            .rd-party-frame {
                flex: 1 0 90px; max-width: 120px; min-width: 90px; padding: 3px 6px;
                background: rgba(0,0,0,0.25); border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.06);
                font-family: 'Inter', sans-serif;
                position: relative;
            }
            .rd-party-frame.dead { opacity: 0.35; }
            .rd-party-frame.is-mercenary {
                border-color: rgba(255,200,60,0.4);
                background: linear-gradient(180deg, rgba(20,15,5,0.4) 0%, rgba(10,8,3,0.5) 100%);
                box-shadow: 0 0 8px rgba(255,200,60,0.1);
            }
            .rd-pf-top {
                display: flex; justify-content: space-between; align-items: center;
                font-size: 9px; margin-bottom: 2px;
            }
            .rd-pf-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px; }
            .rd-pf-role {
                font-size: 7px; padding: 1px 3px; border-radius: 3px;
                background: rgba(255,255,255,0.06); text-transform: uppercase; letter-spacing: 0.5px;
            }
            .rd-pf-bar-bg {
                width: 100%; height: 3px; background: rgba(0,0,0,0.4);
                border-radius: 2px; overflow: hidden;
            }
            .rd-pf-bar-fill {
                height: 100%; background: linear-gradient(90deg, #22aa44, #44cc66);
                border-radius: 2px; transition: width 0.3s;
            }
            .rd-pf-mercenary-star {
                position: absolute; top: -4px; right: -4px; font-size: 10px; color: #ffcc44;
                text-shadow: 0 0 4px rgba(0,0,0,0.8);
            }

            /* ── Raid Performance Summary ── */
            .rd-perf-section {
                margin-top: 15px; padding: 12px;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(204,51,68,0.15);
                border-radius: 8px;
            }
            .rd-perf-title {
                font-family: 'Cinzel', serif; font-size: 12px; color: #cc8888;
                text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;
                display: flex; align-items: center; gap: 6px;
            }
            .rd-perf-tabs { display: flex; gap: 2px; margin-bottom: 8px; }
            .rd-perf-tab {
                flex: 1; padding: 4px; font-size: 10px; text-align: center;
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 4px; cursor: pointer; color: #888; transition: all 0.2s;
            }
            .rd-perf-tab.active { background: rgba(204,51,68,0.2); border-color: rgba(204,51,68,0.4); color: #eeddaa; }
            .rd-perf-row {
                display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
                font-family: 'Inter', sans-serif; font-size: 11px;
            }
            .rd-perf-name { width: 85px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .rd-perf-bar-container { flex: 1; height: 14px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; position: relative; }
            .rd-perf-bar-fill { height: 100%; transition: width 0.5s ease-out; }
            .rd-perf-val { 
                position: absolute; right: 6px; top: 0; line-height: 14px; 
                font-size: 9px; font-weight: 700; color: #fff; text-shadow: 1px 1px 2px black;
            }
            .rd-perf-mvp-badge {
                font-size: 12px; filter: drop-shadow(0 0 4px rgba(0,0,0,0.8));
            }
            .rd-death-log {
                margin-top: 12px; max-height: 120px; overflow-y: auto;
                background: rgba(255,50,0,0.05); border: 1px solid rgba(255,50,0,0.1);
                border-radius: 6px; padding: 8px;
            }
            .rd-death-entry {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #aa8888;
                padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
                display: flex; justify-content: space-between;
            }
            .rd-death-entry .name { color: #ff8866; font-weight: 600; }
            .rd-death-entry .time { color: #666; font-size: 9px; }

            /* Mob health bars (raid) */
            .rd-mobs-section { margin-bottom: 10px; }
            .rd-mob-row {
                display: flex; align-items: center; gap: 8px; margin-bottom: 3px;
                padding: 3px 6px; border-radius: 3px;
                background: rgba(0,0,0,0.15);
            }
            .rd-mob-row.dead { opacity: 0.25; text-decoration: line-through; }
            .rd-mob-row.boss-mob {
                border: 1px solid rgba(204,51,68,0.3);
                background: rgba(204,40,50,0.08);
            }
            .rd-mob-name {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #dd7777;
                min-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .rd-mob-name.boss-name { color: #ffcc44; font-weight: 700; font-size: 11px; }
            .rd-mob-bar-bg {
                flex: 1; height: 6px; background: rgba(0,0,0,0.5);
                border-radius: 3px; overflow: hidden; min-width: 80px;
            }
            .rd-mob-bar-fill {
                height: 100%; background: linear-gradient(90deg, #cc3322, #ee5544);
                border-radius: 3px; transition: width 0.2s;
            }
            .rd-mob-bar-fill.boss-bar {
                background: linear-gradient(90deg, #cc3344, #ee5566, #ff8899);
            }
            .rd-mob-hp {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #aa6655;
                min-width: 40px; text-align: right;
            }

            /* Party HP bar (raid) */
            .rd-party-hp-section { margin-bottom: 10px; }
            .rd-party-hp-label {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #886666;
                display: flex; justify-content: space-between; margin-bottom: 3px;
            }
            .rd-party-hp-bg {
                width: 100%; height: 12px; background: rgba(0,0,0,0.6);
                border: 1px solid rgba(204,51,68,0.2); border-radius: 4px; overflow: hidden;
            }
            .rd-party-hp-fill {
                height: 100%; border-radius: 3px; transition: width 0.3s;
            }
            .rd-party-hp-fill.high { background: linear-gradient(90deg, #22aa44, #44cc66); }
            .rd-party-hp-fill.mid { background: linear-gradient(90deg, #ccaa22, #eecc44); }
            .rd-party-hp-fill.low { background: linear-gradient(90deg, #cc3322, #ee5544); }

            /* Chat feed (raid) */
            .rd-chat-section { margin-bottom: 10px; }
            .rd-chat-header {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #886666;
                text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
                display: flex; align-items: center; gap: 6px;
            }
            .rd-chat-feed {
                background: rgba(0,0,0,0.3); border: 1px solid rgba(204,51,68,0.1);
                border-radius: 4px; padding: 6px 8px;
                max-height: 120px; overflow-y: auto;
            }
            .rd-chat-feed::-webkit-scrollbar { width: 3px; }
            .rd-chat-feed::-webkit-scrollbar-thumb { background: rgba(204,51,68,0.25); border-radius: 2px; }
            .rd-chat-line {
                font-family: 'Inter', sans-serif; font-size: 10.5px; color: #aa8877;
                line-height: 1.5; text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
            }
            .rd-chat-system { color: #ffcc44; font-weight: 500; }
            .rd-chat-user { font-weight: 600; }

            /* Encounter info (raid) */
            .rd-encounter-info {
                padding: 8px 10px; margin-bottom: 10px; border-radius: 5px;
                background: rgba(204,51,68,0.06); border: 1px solid rgba(204,51,68,0.15);
            }
            .rd-encounter-name {
                font-family: 'Cinzel', serif; font-size: 14px; color: #ee7788;
                text-shadow: 1px 1px 3px black; margin-bottom: 2px;
                display: flex; align-items: center; gap: 6px;
            }
            .rd-encounter-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #885555;
                font-style: italic;
            }
            .rd-encounter-timer {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #ddbb88;
                float: right;
            }

            /* Phase banner (raid) */
            .rd-phase-banner {
                text-align: center; padding: 6px 10px; margin-bottom: 8px;
                border-radius: 4px; background: rgba(204,51,68,0.12);
                border: 1px solid rgba(204,51,68,0.3);
                animation: rd-phase-flash 0.6s ease-out;
            }
            @keyframes rd-phase-flash {
                0% { background: rgba(204,51,68,0.4); }
                100% { background: rgba(204,51,68,0.12); }
            }
            .rd-phase-banner-text {
                font-family: 'Cinzel', serif; font-size: 12px; color: #ee6677;
                text-shadow: 0 0 6px rgba(204,51,68,0.4);
            }

            /* Result screen (raid) */
            .rd-result {
                text-align: center; padding: 20px; margin-bottom: 10px;
                border-radius: 8px;
            }
            .rd-result.victory {
                background: linear-gradient(180deg, rgba(40,100,30,0.15) 0%, rgba(20,60,15,0.1) 100%);
                border: 1px solid rgba(80,200,60,0.3);
            }
            .rd-result.defeat {
                background: linear-gradient(180deg, rgba(100,20,10,0.15) 0%, rgba(60,10,5,0.1) 100%);
                border: 1px solid rgba(200,60,40,0.3);
            }
            .rd-result-icon { font-size: 48px; margin-bottom: 6px; }
            .rd-result-title {
                font-family: 'Cinzel', serif; font-size: 24px; font-weight: 700;
                text-shadow: 0 0 12px rgba(0,0,0,0.5), 2px 2px 6px black;
                margin-bottom: 4px;
            }
            .rd-result.victory .rd-result-title { color: #66ee88; }
            .rd-result.defeat .rd-result-title { color: #ff6644; }
            .rd-result-sub {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #aa9977;
                margin-bottom: 8px;
            }
            .rd-result-time {
                font-family: 'Inter', sans-serif; font-size: 11px; color: #888;
            }

            /* Loot summary (raid) */
            .rd-loot-section {
                padding: 12px 14px; border-radius: 6px; margin-bottom: 10px;
                background: linear-gradient(180deg, rgba(255,200,60,0.06) 0%, rgba(200,150,40,0.03) 100%);
                border: 1px solid rgba(255,200,60,0.2);
            }
            .rd-loot-title {
                font-family: 'Cinzel', serif; font-size: 14px; color: #ffdd55;
                text-shadow: 0 0 8px rgba(255,200,60,0.4); margin-bottom: 8px;
                text-align: center;
            }
            .rd-loot-grid {
                display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
            }
            .rd-loot-item {
                font-family: 'Inter', sans-serif; font-size: 12px; color: #ddcc88;
                display: flex; align-items: center; gap: 4px;
                padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 4px;
                border: 1px solid rgba(255,200,60,0.15);
            }
            .rd-loot-item .val { color: #ffdd66; font-weight: 700; }

            /* Action buttons (raid) */
            .rd-action-row {
                display: flex; gap: 8px; justify-content: center; margin-top: 8px;
            }
            .rd-action-btn {
                font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
                padding: 7px 18px; border-radius: 5px; cursor: pointer;
                border: 1px solid rgba(204,51,68,0.3);
                background: linear-gradient(180deg, rgba(120,25,35,0.4) 0%, rgba(80,15,25,0.5) 100%);
                color: #dd8899; transition: all 0.2s;
            }
            .rd-action-btn:hover {
                border-color: rgba(230,80,90,0.5);
                background: linear-gradient(180deg, rgba(150,35,45,0.5) 0%, rgba(100,25,35,0.6) 100%);
                box-shadow: 0 0 10px rgba(204,51,68,0.15);
            }
            .rd-action-btn.primary {
                border-color: rgba(204,51,68,0.5);
                background: linear-gradient(180deg, rgba(200,50,60,0.5) 0%, rgba(150,35,45,0.6) 100%);
                color: #ffccdd;
            }
            .rd-action-btn.leave {
                border: 1px solid rgba(200,80,60,0.4); background: rgba(200,80,60,0.12);
                color: #cc8877;
            }
            .rd-action-btn.leave:hover {
                background: rgba(200,80,60,0.25); border-color: rgba(200,80,60,0.7);
            }

            /* Raid Buff/Debuff Status Bar */
            .rd-buffs-bar {
                display: flex; gap: 4px; flex-wrap: wrap; align-items: center;
                margin-bottom: 8px; padding: 5px 8px;
                background: rgba(0,0,0,0.25); border-radius: 5px;
                border: 1px solid rgba(204,51,68,0.1);
            }
            .rd-buff-icon {
                display: inline-flex; align-items: center; gap: 3px;
                padding: 2px 6px; border-radius: 4px;
                font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600;
                white-space: nowrap; position: relative;
                border: 1px solid transparent;
                transition: all 0.3s;
            }
            .rd-buff-icon.buff {
                background: rgba(40,180,60,0.15); border-color: rgba(60,200,80,0.3);
                color: #88ee88;
            }
            .rd-buff-icon.debuff {
                background: rgba(200,40,30,0.15); border-color: rgba(220,60,50,0.3);
                color: #ff8866;
            }
            .rd-buff-icon.set-bonus {
                background: rgba(180,120,40,0.15); border-color: rgba(220,160,60,0.3);
                color: #ffcc66;
            }
            .rd-buff-icon.bloodlust-active {
                background: rgba(255,80,20,0.2); border-color: rgba(255,120,40,0.5);
                color: #ffaa44;
                animation: rd-bloodlust-pulse 0.8s ease-in-out infinite;
            }
            @keyframes rd-bloodlust-pulse {
                0%,100% { box-shadow: 0 0 4px rgba(255,120,40,0.2); }
                50% { box-shadow: 0 0 10px rgba(255,120,40,0.5); }
            }
            .rd-buff-icon.enrage-active {
                background: rgba(255,30,10,0.25); border-color: rgba(255,50,30,0.6);
                color: #ff4433;
                animation: rd-enrage-pulse 0.5s ease-in-out infinite;
            }
            @keyframes rd-enrage-pulse {
                0%,100% { box-shadow: 0 0 4px rgba(255,30,10,0.3); text-shadow: 0 0 4px rgba(255,50,30,0.3); }
                50% { box-shadow: 0 0 12px rgba(255,30,10,0.6); text-shadow: 0 0 8px rgba(255,50,30,0.6); }
            }
            .rd-buff-timer {
                font-size: 8px; opacity: 0.8; font-weight: 400;
            }

            /* Raid combat stats row */
            .rd-combat-stats {
                display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between;
                margin-bottom: 8px; padding: 4px 8px;
                background: rgba(0,0,0,0.15); border-radius: 4px;
                font-family: 'Inter', sans-serif; font-size: 9px; color: #886666;
            }

            /* ── Wipe Diagnostics ── */
            .rd-diagnostics-overlay {
                background: linear-gradient(180deg, rgba(30,10,10,0.98) 0%, rgba(15,5,5,0.99) 100%);
                border: 2px solid #ff4433; border-radius: 12px; padding: 20px;
                box-shadow: 0 0 40px rgba(255,50,30,0.2), inset 0 0 20px rgba(0,0,0,0.5);
                text-align: center; pointer-events: auto; animation: rd-loot-pop 0.5s ease-out;
                margin-top: 15px;
            }
            .rd-diag-cause { font-family: 'Cinzel', serif; font-size: 18px; color: #ff4433; margin-bottom: 8px; text-transform: uppercase; }
            .rd-diag-details { font-family: 'Inter', sans-serif; font-size: 13px; color: #ccaa99; line-height: 1.5; margin-bottom: 15px; }
            .rd-diag-log { text-align: left; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 10px; max-height: 120px; overflow-y: auto; }
            .rd-diag-entry { font-family: 'Inter', sans-serif; font-size: 11px; color: #bb9999; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .rd-diag-entry.major { color: #ff8866; font-weight: 600; }
            .rd-diag-entry-time { float: right; opacity: 0.5; font-size: 9px; }

            /* ── Raid Marker Controls ── */
            .rd-marker-controls {
                display: flex; gap: 4px; justify-content: center; margin-top: 8px;
                padding: 6px; background: rgba(0,0,0,0.4); border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.1); pointer-events: auto;
            }
            .rd-marker-btn {
                width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 4px; cursor: pointer; font-size: 18px; transition: all 0.2s;
            }
            .rd-marker-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); }
            .rd-marker-btn.active { border-color: #ffcc44; background: rgba(255,200,60,0.15); box-shadow: 0 0 8px rgba(255,200,60,0.2); }
            .rd-marker-btn.skull { color: #fff; }
            .rd-marker-btn.square { color: #4488ff; }
            .rd-marker-btn.cross { color: #ff4444; }
            .rd-marker-btn.circle { color: #44ff88; }
            .rd-combat-stat {
                display: flex; align-items: center; gap: 3px;
            }
            .rd-combat-stat .val {
                font-weight: 600;
            }
            .rd-combat-stat .val.good { color: #66cc66; }
            .rd-combat-stat .val.warn { color: #ccaa44; }
            .rd-combat-stat .val.danger { color: #cc4444; }

            /* Enrage timer bar */
            .rd-enrage-section {
                margin-bottom: 6px;
            }
            .rd-enrage-label {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #886666;
                display: flex; justify-content: space-between; margin-bottom: 2px;
            }
            .rd-enrage-bar-bg {
                width: 100%; height: 4px; background: rgba(0,0,0,0.4);
                border-radius: 2px; overflow: hidden;
                border: 1px solid rgba(204,51,68,0.12);
            }
            .rd-enrage-bar-fill {
                height: 100%; border-radius: 2px; transition: width 0.3s;
                background: linear-gradient(90deg, #cc8822, #ee4422);
            }
            .rd-enrage-bar-fill.enraged {
                background: linear-gradient(90deg, #ff3311, #ff6644);
                animation: rd-enrage-bar-flash 0.5s ease-in-out infinite;
            }
            @keyframes rd-enrage-bar-flash {
                0%,100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            /* Raid button glow when active */
            .right-btn.raid-active {
                border-color: rgba(204,51,68,0.7) !important;
                animation: raid-btn-glow 1.5s ease-in-out infinite;
            }
            @keyframes raid-btn-glow {
                0%,100% { box-shadow: 0 0 6px rgba(204,51,68,0.2); }
                50% { box-shadow: 0 0 14px rgba(204,51,68,0.4); }
            }

            /* ═══════════════════════════════════════════ */
            /* RAID VENDOR PANEL                           */
            /* ═══════════════════════════════════════════ */
            #raid-vendor-panel {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 580px; max-width: 97vw; max-height: 92vh; pointer-events: auto;
                background: linear-gradient(180deg, rgba(20,6,10,0.98) 0%, rgba(10,3,5,0.99) 100%);
                border: 1px solid rgba(220,80,90,0.35); border-radius: 8px;
                box-shadow: 0 0 50px rgba(0,0,0,0.8), 0 0 25px rgba(220,80,90,0.12);
                backdrop-filter: blur(10px); display: none; z-index: 350; overflow: hidden;
            }
            #raid-vendor-panel.open { display: flex; flex-direction: column; }
            #raid-vendor-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid rgba(220,80,90,0.2);
                background: linear-gradient(90deg, rgba(220,80,90,0.08) 0%, transparent 100%);
            }
            #raid-vendor-title {
                font-family: 'Cinzel', serif; font-size: 15px; color: #ee8899;
                text-shadow: 0 0 8px rgba(220,80,90,0.4);
                display: flex; align-items: center; gap: 8px;
            }
            #raid-vendor-currency {
                display: flex; align-items: center; gap: 12px;
                font-family: 'Inter', sans-serif; font-size: 11px; color: #cc8888;
            }
            #raid-vendor-currency .rp-val { color: #ffcc44; font-weight: 700; }
            #raid-vendor-body {
                padding: 12px 16px; overflow-y: auto; flex: 1; max-height: 78vh;
            }
            #raid-vendor-body::-webkit-scrollbar { width: 4px; }
            #raid-vendor-body::-webkit-scrollbar-thumb { background: rgba(220,80,90,0.3); border-radius: 2px; }

            .rv-section-title {
                font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600;
                color: #dd7788; margin: 12px 0 8px; border-bottom: 1px solid rgba(220,80,90,0.15);
                padding-bottom: 4px; display: flex; align-items: center; gap: 6px;
            }
            .rv-section-title:first-child { margin-top: 0; }

            /* Raid Gear Cards */
            .rv-gear-card {
                background: linear-gradient(135deg, rgba(25,8,12,0.8) 0%, rgba(12,4,6,0.9) 100%);
                border: 1px solid rgba(220,80,90,0.2); border-radius: 6px;
                padding: 10px 12px; margin-bottom: 8px; display: flex; gap: 10px; align-items: flex-start;
                transition: all 0.15s;
            }
            .rv-gear-card:hover { border-color: rgba(240,110,120,0.4); }
            .rv-gear-card.purchased { opacity: 0.55; border-color: rgba(100,200,100,0.3); }
            .rv-gear-icon {
                font-size: 26px; min-width: 36px; text-align: center; line-height: 1;
                padding-top: 2px;
            }
            .rv-gear-info { flex: 1; min-width: 0; }
            .rv-gear-name {
                font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; color: #ee99aa;
                margin-bottom: 2px;
            }
            .rv-gear-desc {
                font-family: 'Inter', sans-serif; font-size: 10px; color: #996666; line-height: 1.4;
                margin-bottom: 4px;
            }
            .rv-gear-slot {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #775555;
                text-transform: uppercase; letter-spacing: 0.8px;
            }
            .rv-gear-buy {
                font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600;
                padding: 5px 12px; border-radius: 4px; cursor: pointer; white-space: nowrap;
                border: 1px solid rgba(255,200,60,0.4);
                background: linear-gradient(180deg, rgba(200,160,40,0.25) 0%, rgba(160,120,20,0.35) 100%);
                color: #ffdd88; transition: all 0.15s;
            }
            .rv-gear-buy:hover {
                border-color: rgba(255,220,80,0.6);
                background: linear-gradient(180deg, rgba(220,180,60,0.35) 0%, rgba(180,140,30,0.45) 100%);
                box-shadow: 0 0 8px rgba(255,200,60,0.15);
            }
            .rv-gear-buy.cant-afford { opacity: 0.4; cursor: not-allowed; }
            .rv-gear-buy.cant-afford:hover { box-shadow: none; border-color: rgba(255,200,60,0.3); }
            .rv-gear-buy.owned {
                border-color: rgba(100,200,100,0.4); color: #88dd88;
                background: rgba(50,120,50,0.2); cursor: default;
            }

            /* Raid Upgrade Rows */
            .rv-upg-row {
                background: rgba(20,6,10,0.7); border: 1px solid rgba(220,80,90,0.15);
                border-radius: 5px; padding: 8px 12px; margin-bottom: 6px;
                display: flex; align-items: center; gap: 10px; transition: all 0.15s;
            }
            .rv-upg-row:hover { border-color: rgba(240,110,120,0.3); }
            .rv-upg-icon { font-size: 20px; min-width: 28px; text-align: center; }
            .rv-upg-info { flex: 1; min-width: 0; }
            .rv-upg-name {
                font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; color: #dd8899;
            }
            .rv-upg-desc {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #886666; line-height: 1.3;
            }
            .rv-upg-tier {
                font-family: 'Inter', sans-serif; font-size: 9px; color: #bb7788; font-weight: 600;
            }
            .rv-upg-buy {
                font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600;
                padding: 4px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap;
                border: 1px solid rgba(220,80,90,0.4);
                background: linear-gradient(180deg, rgba(180,50,60,0.25) 0%, rgba(140,35,45,0.35) 100%);
                color: #ee99aa; transition: all 0.15s;
            }
            .rv-upg-buy:hover {
                border-color: rgba(240,110,120,0.6);
                box-shadow: 0 0 8px rgba(220,80,90,0.15);
            }
            .rv-upg-buy.cant-afford { opacity: 0.4; cursor: not-allowed; }
            .rv-upg-buy.cant-afford:hover { box-shadow: none; }
            .rv-upg-buy.maxed {
                border-color: rgba(100,200,100,0.3); color: #88cc88;
                background: rgba(50,120,50,0.15); cursor: default;
            }

            /* RP Stats summary */
            .rv-stats {
                display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 10px;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #886666;
            }
            .rv-stats .val { color: #dd9999; font-weight: 600; }

            /* Active bonuses display */
            .rv-bonuses {
                background: rgba(15,4,8,0.6); border: 1px solid rgba(220,80,90,0.1);
                border-radius: 5px; padding: 8px 10px; margin-bottom: 10px;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #886666;
                display: flex; flex-wrap: wrap; gap: 8px 14px;
            }
            .rv-bonuses .bonus-item { display: flex; align-items: center; gap: 3px; }
            .rv-bonuses .bonus-val { color: #88ddaa; font-weight: 600; }

            /* Set bonus display */
            .rv-set-bonus {
                background: rgba(204,51,68,0.06); border: 1px solid rgba(204,51,68,0.12);
                border-radius: 4px; padding: 6px 10px; margin-bottom: 10px;
                font-family: 'Inter', sans-serif; font-size: 10px; color: #aa6677;
            }
            .rv-set-bonus .set-title { font-family: 'Cinzel', serif; font-size: 11px; color: #ee8899; margin-bottom: 4px; }
            .rv-set-bonus .set-count { color: #ffcc44; font-weight: 700; }

        </style>

        <!-- Nameplate -->
        <div id="nameplate">
            <div id="nameplate-text">${gameState.playerName} - Lvl ${gameState.level}${CONFIG.PLAYER_CLASS ? ' ' + CONFIG.PLAYER_CLASS : ''}</div>
            <div id="nameplate-bars">
                <div class="nameplate-bar-bg"><div class="nameplate-bar-fill hp-fill" id="np-hp" style="width:100%"></div></div>
                <div class="nameplate-bar-bg"><div class="nameplate-bar-fill mana-fill" id="np-mana" style="width:100%"></div></div>
            </div>
        </div>

        <!-- Hero Toast Stack -->
        <div id="hero-toast-container"></div>

        <!-- Loot Sidebar -->
        <div id="loot-sidebar"></div>

        <!-- Companion + Party Frames (left-side HUD) -->
        <div id="companion-frame">
            <div class="comp-frame-icon">🐾</div>
            <div class="comp-frame-info">
                <div class="comp-frame-top-row">
                    <span class="comp-frame-name" id="comp-frame-name">Companion</span>
                    <span class="comp-frame-tag">PET</span>
                    <span class="comp-frame-dps" id="comp-frame-dps">0 DPS</span>
                </div>
                <div class="comp-frame-bar-bg"><div class="comp-frame-bar-fill" id="comp-frame-bar-fill"></div></div>
                <div class="comp-frame-respawn" id="comp-frame-respawn" style="display:none;"></div>
            </div>
        </div>
        <div id="party-frames"></div>

        <!-- Buff Bar (active consumable buffs) -->
        <div id="buff-bar"></div>

        <!-- Target nameplate -->
        <div id="target-plate">
            <div id="boss-subtitle">⚔ Zone Boss ⚔</div>
            <div id="target-name"></div>
            <div id="target-hp-bg"><div id="target-hp-fill" style="width:100%"></div></div>
            <div id="boss-hp-text"></div>
        </div>

        <!-- Minimap -->
        <div id="minimap-container">
            <div id="minimap">
                <canvas id="minimap-canvas" width="140" height="140"></canvas>
                <div id="minimap-frame"></div>
                <div id="minimap-compass">N</div>
            </div>
        </div>

        <!-- Nearby Events (positioned to the left of minimap) -->
        <div id="events-panel" class="ui-panel">
            <div id="events-title">${iconImg('mapPin', 14)} Nearby Events</div>
            <div id="event-name">${iconImg('eventStar', 12)} <span id="event-name-text">Loading...</span></div>
            <div id="event-bar-bg"><div id="event-bar-fill" style="width:0%"></div></div>
            <div style="display:flex;justify-content:space-between;">
                <span id="event-est" class="ui-text">Est. Completion: --s</span>
                <span id="event-progress-text">0%</span>
            </div>
        </div>

        <!-- Right panel stats -->
        <div id="right-panel">
            <div class="stat-row"><span class="stat-value" id="stat-xphr">0 XP/hr</span> <span class="stat-icon">${iconImg('xpStar', 16)}</span></div>
            <div class="stat-row"><span class="stat-value" id="stat-gpm">0g/min</span> <span class="stat-icon">${iconImg('goldStack', 16)}</span></div>
            <div class="stat-row"><span class="stat-value" id="stat-gold">Gold</span> <span class="stat-icon">${iconImg('goldCoin', 16)}</span></div>
            <div class="stat-row"><span class="stat-value" id="stat-karma">${AETHERBIT_NAME}</span> <span class="stat-icon">${iconImg('aetherbit', 16)}</span></div>
            <div class="stat-row" id="stat-soul-essence-row" style="${soulForge.isUnlocked() ? '' : 'display:none;'}"><span class="stat-value" id="stat-soul-essence" style="color:#ff9944;">0 Soul Essence</span> <span class="stat-icon">${iconImg('soulEssence', 16)}</span></div>
            <div class="stat-row" id="stat-raid-points-row" style="${raidSystem.isUnlocked() ? '' : 'display:none;'}"><span class="stat-value" id="stat-raid-points" style="color:#cc3344;">0 Raid Points</span> <span class="stat-icon">${iconImg('raidPoints', 16)}</span></div>
            <div class="stat-row" id="stat-vp-row" style="${battlegroundSystem.isUnlocked() ? '' : 'display:none;'}"><span class="stat-value" id="stat-vp" style="color:#eeddaa;">0 Victory Points</span> <span class="stat-icon">${iconImg('victoryPoints', 16)}</span></div>
            
        </div>

        <!-- Status bars above action bar -->
        <div id="bottom-status">
            <div id="dps-display">${iconImg('sword', 12)} <span id="dps-value">8</span> DPS · Sustain <span id="sustain-value">100</span>%</div>
            <div class="status-bar-row">
                <span class="status-bar-label" style="color:#6688cc">Mana</span>
                <div class="status-bar-bg"><div class="status-bar-fill mana" id="mana-bar-fill" style="width:100%"></div></div>
                <span class="status-bar-text" id="mana-text" style="color:#88aadd">50/50</span>
            </div>
        </div>

        <!-- Bottom action bar — 4 left + orb + 4 right -->
        <div id="bottom-bar">
            <div id="action-bar-left">
                ${gameState.getSkills().slice(0, 4).map((s, i) => this._renderSkillSlot(s, i)).join('')}
            </div>
            
            <div id="health-orb-container">
                <div id="health-orb">
                    <div id="health-orb-fill" style="height:100%"></div>
                    <div id="health-orb-shine"></div>
                    <div id="health-orb-frame"></div>
                </div>
                <div id="health-orb-text"></div>
            </div>
            
            <div id="action-bar-right">
                ${gameState.getSkills().slice(4, 8).map((s, i) => this._renderSkillSlot(s, i + 4)).join('')}
            </div>
            <div id="talent-bar">
                ${this._renderTalentBar()}
            </div>
            <div id="soulforge-bar">
                ${this._renderSoulForgeBar()}
            </div>
        </div>

        <!-- Chat -->
        <div id="chat-container">
            <div id="chat-tabs">
                <div class="chat-tab active">Chat</div>
            </div>
            <div id="chat-body"></div>
        </div>

        <!-- XP Bar -->
        <div id="xp-bar-container">
            <div id="xp-bar-fill" style="width:0%"></div>
            <div id="xp-bar-overlay">
                <div id="xp-bar-overlay-text"></div>
            </div>
        </div>

        <!-- Level Up Notification -->
        <div id="level-up-notification">
            <div id="level-up-text">LEVEL UP!</div>
            <div id="level-up-sub">Level <span id="lu-level">2</span></div>
            <div id="skill-unlock-text"></div>
        </div>

        <!-- Quest Log Panel -->
        <div id="quest-log-panel">
            <div id="ql-header">
                <div id="ql-title">${iconImg('questScroll', 16)} Quest Log <span id="ql-count">(0)</span></div>
                <div id="ql-toggle">▼</div>
            </div>
            <div id="ql-body">
                <div id="ql-quests"></div>
                <div id="bg-log-container">
                    <div id="bg-log-body"></div>
                </div>
            </div>
        </div>

        <!-- HD Graphics Toggle (right of quest log) -->
        <div id="hd-toggle-btn" class="${gameState.lowResMode ? '' : 'hd-active'}">
            ${iconImg('hdGraphics', 13)} <span>HD Graphics</span> <span class="hd-badge">ON</span>
        </div>

        <!-- Progression Speed Slider (below HD toggle) -->
        <div id="speed-widget">
            <div id="speed-widget-label">${iconImg('progressionSpeed', 13)} Progression Speed</div>
            <input type="range" id="speed-slider" min="1" max="10" step="1" value="${Math.round(gameState.gameSpeed)}">
            <div id="speed-widget-val">${Math.round(gameState.gameSpeed)}x</div>
        </div>

        <!-- Right-side buttons (stacked, no overlap) -->
        <div id="right-buttons">
            <div class="right-btn" id="zone-btn">${iconImg('zoneMap', 16)} Zones <span id="zone-new-badge" class="new-content-badge">NEW</span></div>
            <div class="right-btn" id="talent-btn">${iconImg('talentTree', 16)} Talents <span id="talent-btn-badge" style="color:#ffdd44;font-size:10px;font-weight:700;display:none;margin-left:2px;"></span></div>
            <div class="right-btn" id="paragon-btn" style="${gameState.paragonUnlocked ? '' : 'display:none;'}border-color:rgba(180,100,255,0.4);color:#cc88ff;">✨ Paragon <span id="paragon-btn-badge" style="color:#cc88ff;font-size:10px;font-weight:700;display:none;margin-left:2px;"></span></div>
            <div class="right-btn" id="soulforge-btn" style="${soulForge.isUnlocked() ? '' : 'display:none;'}border-color:rgba(255,120,40,0.4);color:#ff9944;">⚒️ Soul Forge <span id="soulforge-btn-badge" style="color:#ff9944;font-size:10px;font-weight:700;margin-left:2px;"></span></div>
            <div class="right-btn" id="dungeon-btn" style="${dungeonSystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(255,80,20,0.4);color:#ff7733;">🏰 Dungeons <span id="dungeon-new-badge" class="new-content-badge">NEW</span><span id="dungeon-btn-badge" style="color:#ff7733;font-size:10px;font-weight:700;margin-left:2px;"></span></div>
            <div class="right-btn" id="pvp-btn" style="${battlegroundSystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(170,68,255,0.4);color:#cc88ff;">${iconImg('pvpArena', 16)} PvP <span id="pvp-btn-badge" style="color:#cc88ff;font-size:10px;font-weight:700;margin-left:2px;"></span></div>
            <div class="right-btn" id="pvp-vendor-btn" style="${battlegroundSystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(200,120,255,0.4);color:#ddaaff;">${iconImg('pvpVendor', 16)} War Quartermaster <span id="pvp-vendor-vp" style="color:#ffcc44;font-size:10px;font-weight:700;margin-left:2px;"></span></div>
            <div class="right-btn" id="raid-btn" style="${raidSystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(204,51,68,0.4);color:#cc3344;">${iconImg('raidSanctum', 16)} Raids <span id="raid-btn-badge" style="color:#cc3344;font-size:10px;font-weight:700;margin-left:2px;"></span></div>
            <div class="right-btn" id="raid-vendor-btn" style="${raidSystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(204,80,80,0.4);color:#dd6666;">${iconImg('raidVendor', 16)} Hivemind Quartermaster <span id="raid-vendor-rp" style="color:#cc3344;font-size:10px;font-weight:700;margin-left:2px;"></span></div>
            <div class="right-btn" id="companion-btn" style="${companionSystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(80,220,160,0.4);color:#55ddaa;">🐾 Companion</div>
            <div class="right-btn" id="gold-shop-btn" style="border-color:rgba(200,170,60,0.4);color:#ffdd88;">${iconImg('goldCoin', 16)} Merchant</div>
            <div class="right-btn" id="aetherbit-shop-btn" style="border-color:rgba(140,100,220,0.4);color:#cc88ff;">${iconImg('aetherbit', 16)} Emporium</div>
            <div class="right-btn" id="upgrade-btn">${iconImg('upgradeAnvil', 16)} Enhance</div>
            <div class="right-btn" id="achievement-btn" style="border-color:rgba(255,200,50,0.4);color:#eeddbb;">🏆 Medals</div>
            <div class="right-btn" id="party-btn" style="${partySystem.isUnlocked() ? '' : 'display:none;'}border-color:rgba(80,180,255,0.4);color:#66ccff;">👥 Party <span id="party-btn-badge" style="color:#66ccff;font-size:10px;font-weight:700;margin-left:2px;">0</span></div>
            <div class="right-btn" id="inv-toggle-btn">${iconImg('backpack', 16)} Inventory <span id="bag-full-badge" class="bag-full-badge" style="display:none;">${iconImg('bagFullWarning', 16)} FULL</span></div>
            <div class="right-btn" id="camera-toggle-btn" style="border-color:rgba(100,160,255,0.4);color:#88ccff;">${gameState.cameraMode === 'locked' ? '🔒 Camera: Locked' : '🔓 Camera: Dynamic'}</div>
            <div class="right-btn" id="settings-btn">${iconImg('settingsGear', 16)} Settings</div>
            <div class="right-btn unstuck-btn" id="unstuck-btn">${iconImg('mapPin', 16)} Unstuck</div>
        </div>

        <!-- Inventory / Character Panel -->
        <div id="inv-panel">
            <div id="inv-header">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div id="inv-title">${iconImg('shield', 18)} Character & Inventory</div>
                    <div id="inv-player-info" style="font-family:'Inter', sans-serif; font-size:11px; color:#eeddaa; background:rgba(255,255,255,0.05); padding:3px 10px; border-radius:12px; border:1px solid rgba(200,180,80,0.25); display:flex; align-items:center; gap:6px;"></div>
                </div>
                <div id="inv-close">✕</div>
            </div>
            <div id="inv-body">
                <div id="equip-section">
                    <div class="equip-label">Equipment</div>
                    <div id="equip-slots"></div>
                    <div id="char-stats"></div>
                </div>
                <div id="bag-section">
                    <div id="bag-header">
                        <span class="bag-label">Bag <span id="bag-count">0/24</span></span>
                        <div style="display:flex; gap:4px;">
                            <div id="sell-junk-btn">${iconImg('goldBag', 12)} Sell All Junk</div>
                        </div>
                    </div>
                    <div id="bag-grid"></div>
                </div>
            </div>
        </div>

        <!-- Settings Panel -->
        <div id="settings-panel">
            <div id="settings-header">
                <div id="settings-title">${iconImg('settingsGear', 18)} Settings</div>
                <div id="settings-close">✕</div>
            </div>
            <div id="settings-body">
                <!-- Game Speed slider moved to main HUD (below HD toggle) -->
                <div class="settings-section">
                    <div class="settings-section-title">Audio</div>
                    <div class="settings-row">
                        <span class="settings-label">Master Volume</span>
                        <div class="settings-slider-wrap">
                            <input type="range" class="settings-slider" id="vol-slider" min="0" max="100" value="${audioManager.volumePercent}">
                            <span class="settings-slider-val" id="vol-val">${audioManager.volumePercent}%</span>
                        </div>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Mute All Sound</span>
                        <div class="settings-toggle-btn ${audioManager.muted ? 'active' : 'on'}" id="mute-toggle">${audioManager.muted ? 'Muted' : 'Sound On'}</div>
                    </div>
                </div>
                <!-- Save data / reset options removed -->
            </div>
        </div>

        <!-- Zone Selection Panel -->
        <div id="zone-panel">
            <div id="zone-panel-header">
                <div id="zone-panel-title">${iconImg('zoneMap', 18)} Zone Selection</div>
                <div id="zone-panel-close">✕</div>
            </div>
            <div id="zone-panel-body">
                <div id="zone-current-label">Current Zone: <span id="zone-current-name">${gameState.getCurrentZone().name}</span></div>
                <div id="zone-card-list"></div>
            </div>
        </div>

        <!-- Talent Tree Panel -->
        <div id="talent-panel">
            <div id="talent-header">
                <div id="talent-title">${iconImg('talentTree', 18)} Talent Tree</div>
                <div id="talent-points-display">
                    <span>Points: <span class="talent-points-available" id="talent-avail">0</span></span>
                    <span style="color:#667766">Spent: <span id="talent-spent">0</span>/<span id="talent-total">0</span></span>
                    <div id="talent-reset-btn">Reset All</div>
                </div>
                <div id="talent-close">✕</div>
            </div>
            <div id="talent-body">
                <div id="talent-summary" class="talent-summary"></div>
                <div id="talent-branches"></div>
            </div>
        </div>

        <!-- Upgrade Station Panel -->
        <div id="upgrade-panel">
            <div id="upgrade-header">
                <div id="upgrade-title">${iconImg('upgradeAnvil', 18)} Aetherblade Forge</div>
                <div id="upgrade-currency">
                    <span>${iconImg('goldCoin', 14)} <span id="upgrade-gold">0</span>g</span>
                    <span>${iconImg('aetherbit', 14)} <span id="upgrade-aetherbit">0</span></span>
                </div>
                <div id="upgrade-close">✕</div>
            </div>
            <div id="upgrade-body">
                <div id="upgrade-desc">Select an equipped item to enhance. Higher tiers grant multiplicative stat bonuses but cost more and may fail.</div>
                <div id="upgrade-slots"></div>
                <div id="upgrade-detail" style="display:none;"></div>
                <div id="upgrade-stats-summary"></div>
            </div>
        </div>

        <!-- Victory Overlay -->
        <div id="victory-overlay">
            <div id="victory-content">
                <div class="victory-crown">🏆</div>
                <div class="victory-title">REALM COMPLETE</div>
                <div class="victory-subtitle">The Crimson Overmind has fallen</div>
                <div class="victory-rewards">
                    <div class="victory-reward">${iconImg('xpStar', 16)} <span class="vr-val">250,000</span> XP</div>
                    <div class="victory-reward">${iconImg('goldCoin', 16)} <span class="vr-val">15,000</span> Gold</div>
                    <div class="victory-reward">${iconImg('aetherbit', 16)} <span class="vr-val">8,000</span> ${AETHERBIT_NAME}</div>
                </div>
                <div class="victory-unlock">
                    <div class="victory-unlock-title">✨ PARAGON MILESTONES UNLOCKED ✨</div>
                    <div class="victory-unlock-desc">You have conquered the final realm! 50 unique milestone rewards await — from devastating combat bonuses to colossal companion pets. Each Paragon Level is a hard-fought achievement.</div>
                </div>
                <div class="victory-unlock" style="border-color:rgba(255,140,40,0.3);margin-top:8px;">
                    <div class="victory-unlock-title" style="color:#ffaa44;">⚡ ENDGAME WORLD SCALING ⚡</div>
                    <div class="victory-unlock-desc">All 7 zones have been reforged — every creature in the realm now scales to <span style="color:#ffcc66;font-weight:700;">Level 60</span>. Return to any zone for endgame combat, Paragon XP, and legendary loot.</div>
                </div>
                <div class="victory-close-btn" id="victory-close">Continue Journey</div>
            </div>
        </div>

        <!-- Aetherbit Emporium Panel -->
        <div id="aetherbit-shop-panel">
            <div class="shop-header" style="border-bottom-color:rgba(140,100,220,0.25);">
                <div class="shop-title" style="color:#cc88ff;">${iconImg('aetherbit', 18)} Aetherbit Emporium</div>
                <div class="shop-currency">
                    <span>Balance: <span class="curr-val" id="ashop-aeth" style="color:#cc88ff;">0</span></span>
                    <span class="curr-val">${iconImg('aetherbit', 14)}</span>
                </div>
                <div class="shop-close" id="aeth-shop-close">✕</div>
            </div>
            <div class="shop-body" id="aetherbit-shop-body"></div>
        </div>

        <!-- Gold Shop Panel -->
        <div id="gold-shop-panel">
            <div class="shop-header">
                <div class="shop-title" style="color:#ffdd88;">${iconImg('goldCoin', 18)} Wandering Merchant</div>
                <div class="shop-currency">
                    <span>Gold: <span class="curr-val" id="gshop-gold">0</span></span>
                    <span class="curr-val" id="shop-gold-icon">${iconImg('goldCoin', 14)}</span>
                </div>
                <div class="shop-close" id="shop-close">✕</div>
            </div>
            <div class="shop-body" id="gold-shop-body"></div>
        </div>

        <!-- Paragon Mastery Panel -->
        <div id="paragon-panel">
            <div id="paragon-header">
                <div id="paragon-title">✨ Paragon Milestones</div>
                <div id="paragon-points-display">
                    <span id="paragon-level-header">Level 0 / 50</span>
                    <div id="paragon-close">✕</div>
                </div>
            </div>
            <div id="paragon-body">
                <div id="paragon-level-section"></div>
                <div id="paragon-tracks-container"></div>
            </div>
        </div>

        <!-- Achievement Medals Panel -->
        <div id="achievement-panel">
            <div id="settings-header" style="border-bottom-color:rgba(255,200,50,0.3);">
                <div id="settings-title" style="color:#eeddbb;">🏆 Achievement Medals</div>
                <div id="achievement-close" class="shop-close">✕</div>
            </div>
            <div id="settings-body" style="padding:12px 16px;">
                <div class="ach-category-bar">
                    <div class="chat-tab active" data-ach-cat="all">All</div>
                    <div class="chat-tab" data-ach-cat="combat">Combat</div>
                    <div class="chat-tab" data-ach-cat="endgame">Endgame</div>
                    <div class="chat-tab" data-ach-cat="conquest">Conquest</div>
                    <div class="chat-tab" data-ach-cat="wealth">Wealth</div>
                    <div class="chat-tab" data-ach-cat="progression">Progress</div>
                    <div class="chat-tab" data-ach-cat="global">Global</div>
                </div>
                <div id="achievement-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; flex:1;"></div>
            </div>
        </div>

        <!-- Party Management Panel -->
        <div id="party-panel">
            <div id="party-panel-header">
                <div id="party-panel-title">👥 Party Management</div>
                <div id="party-panel-close" class="shop-close">✕</div>
            </div>
            <div id="party-panel-body"></div>
        </div>

        <!-- Soul Forge Panel -->
        <div id="soulforge-panel">
            <div id="soulforge-panel-header">
                <div id="soulforge-panel-title">⚒️ Soul Forge</div>
                <div id="soulforge-panel-close" class="shop-close">✕</div>
            </div>
            <div id="soulforge-panel-body"></div>
        </div>

        <!-- Dungeon Finder Panel -->
        <div id="dungeon-panel">
            <div id="dungeon-panel-header">
                <div id="dungeon-panel-title">🏰 Dungeon Finder</div>
                <div id="dungeon-panel-close" class="shop-close">✕</div>
            </div>
            <div id="dungeon-panel-body"></div>
        </div>

        <!-- PvP Battleground Panel -->
        <div id="pvp-panel">
            <div id="pvp-panel-header">
                <div id="pvp-panel-title">${iconImg('pvpArena', 18)} PvP Battlegrounds</div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div id="pvp-panel-vp">${iconImg('victoryPoints', 14)} VP: <span id="pvp-vp-header-val" style="color:#eeddaa;font-weight:600;">0</span></div>
                    <div id="pvp-panel-close" class="shop-close">✕</div>
                </div>
            </div>
            <div id="pvp-panel-body"></div>
        </div>

        <!-- PvP Vendor Panel -->
        <div id="pvp-vendor-panel">
            <div id="pvp-vendor-header">
                <div id="pvp-vendor-title">${iconImg('pvpVendor', 18)} War Quartermaster</div>
                <div id="pvp-vendor-currency">
                    <span>${iconImg('victoryPoints', 14)} VP: <span class="vp-val" id="pvpv-vp-val">0</span></span>
                    <div id="pvp-vendor-close" class="shop-close">✕</div>
                </div>
            </div>
            <div id="pvp-vendor-body"></div>
        </div>

        <!-- Raid Panel -->
        <div id="raid-panel">
            <div id="raid-panel-header">
                <div id="raid-panel-title">${iconImg('raidSanctum', 18)} Raid Finder</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div id="raid-panel-rp">${iconImg('raidPoints', 14)} RP: <span id="raid-rp-header-val" style="color:#eeddaa;font-weight:600;">0</span></div>
                    <div id="raid-panel-close" class="shop-close">✕</div>
                </div>
            </div>
            <div id="raid-panel-body"></div>
        </div>

        <!-- Match Ready Popups -->
        <!-- Mini Queue Indicators (Hidden by default) -->
        <div id="pvp-mini-queue">
            <div class="pvp-mini-queue-inner">
                <div class="pvp-mini-queue-top">
                    <div class="pvp-mini-queue-title">Searching Battleground...</div>
                </div>
                <div id="pvp-mini-queue-name" class="pvp-mini-queue-name">Voidstrike Basin</div>
                <div class="pvp-mini-queue-bottom">
                    <div class="pvp-mini-queue-timer">In Queue: <span id="pvp-mini-queue-timer-val" class="val">0s</span></div>
                    <div class="pvp-mini-queue-leave" onclick="window._pvpLeave()">Leave</div>
                </div>
            </div>
        </div>

        <div id="dungeon-mini-queue">
            <div class="pvp-mini-queue-inner" style="border-color:#ffaa44; background: linear-gradient(180deg, rgba(30,20,10,0.92) 0%, rgba(20,10,5,0.96) 100%);">
                <div class="pvp-mini-queue-top">
                    <div class="pvp-mini-queue-title" style="color:#ffaa44;">Searching Dungeon...</div>
                </div>
                <div id="dungeon-mini-queue-name" class="pvp-mini-queue-name">The Embercrypt</div>
                <div class="pvp-mini-queue-bottom">
                    <div class="pvp-mini-queue-timer">In Queue: <span id="dungeon-mini-queue-timer-val" class="val">0s</span></div>
                    <div class="pvp-mini-queue-leave" style="color:#ffcc88;" onclick="window._dungeonLeave()">Leave</div>
                </div>
            </div>
        </div>

        <div id="raid-mini-queue">
            <div class="pvp-mini-queue-inner" style="border-color:#ff4466; background: linear-gradient(180deg, rgba(30,10,15,0.92) 0%, rgba(20,5,10,0.96) 100%);">
                <div class="pvp-mini-queue-top">
                    <div class="pvp-mini-queue-title" style="color:#ff4466;">Searching Raid...</div>
                </div>
                <div id="raid-mini-queue-name" class="pvp-mini-queue-name">The Hivespire Sanctum</div>
                <div class="pvp-mini-queue-bottom">
                    <div class="pvp-mini-queue-timer">In Queue: <span id="raid-mini-queue-timer-val" class="val">0s</span></div>
                    <div class="pvp-mini-queue-leave" style="color:#ff88aa;" onclick="window._raidLeave()">Leave</div>
                </div>
            </div>
        </div>

        <div id="pvp-ready-popup">
            <div class="pvp-ready-title">MATCH READY!</div>
            <div class="pvp-ready-name" id="pvp-ready-name">Voidstrike Basin</div>
            <div class="pvp-ready-timer">Entering in: <span class="val" id="pvp-ready-timer-val">40s</span></div>
            <div class="pvp-ready-btns">
                <div class="pvp-ready-btn accept" id="pvp-ready-accept">ENTER BATTLE</div>
                <div class="pvp-ready-btn decline" id="pvp-ready-decline">DECLINE</div>
            </div>
        </div>

        <div id="dungeon-ready-popup">
            <div class="pvp-ready-title" style="color:#ffaa44; text-shadow: 0 0 12px rgba(255,160,60,0.4), 2px 2px 4px black;">DUNGEON READY!</div>
            <div class="pvp-ready-name" id="dungeon-ready-name">The Embercrypt</div>
            
            <div id="dungeon-ready-roster" style="margin: 12px 0; padding: 10px; background: rgba(0,0,0,0.35); border-radius: 6px; border: 1px solid rgba(255,160,60,0.25); text-align: left;">
                <!-- Filled dynamically -->
            </div>

            <div class="pvp-ready-timer">Entering in: <span class="val" id="dungeon-ready-timer-val">40s</span></div>
            <div class="pvp-ready-btns">
                <div class="pvp-ready-btn accept" id="dungeon-ready-accept" style="background: linear-gradient(180deg, #ffaa44, #cc7722); border-color: #ffaa44;">ENTER DUNGEON</div>
                <div class="pvp-ready-btn decline" id="dungeon-ready-decline">DECLINE</div>
            </div>
        </div>

        <div id="raid-ready-popup">
            <div class="pvp-ready-title" style="color:#ff4466; text-shadow: 0 0 12px rgba(255,60,100,0.4), 2px 2px 4px black;">RAID READY!</div>
            <div class="pvp-ready-name" id="raid-ready-name">The Hivespire Sanctum</div>
            <div class="pvp-ready-timer">Entering in: <span class="val" id="raid-ready-timer-val">40s</span></div>
            <div class="pvp-ready-btns">
                <div class="pvp-ready-btn accept" id="raid-ready-accept" style="background: linear-gradient(180deg, #ff4466, #cc2244); border-color: #ff4466;">ENTER RAID</div>
                <div class="pvp-ready-btn decline" id="raid-ready-decline">DECLINE</div>
            </div>
        </div>

        <!-- Raid Vendor Panel -->
        <div id="raid-vendor-panel">
            <div id="raid-vendor-header">
                <div id="raid-vendor-title">${iconImg('raidVendor', 18)} Hivemind Quartermaster</div>
                <div id="raid-vendor-currency">
                    <span>${iconImg('raidPoints', 14)} RP: <span class="rp-val" id="raidv-rp-val">0</span></span>
                    <div id="raid-vendor-close" class="shop-close">✕</div>
                </div>
            </div>
            <div id="raid-vendor-body"></div>
        </div>

        <!-- Companion Panel -->
        <div id="companion-panel">
            <div id="companion-panel-header">
                <div id="companion-panel-title">🐾 Companion</div>
                <div id="companion-panel-close" class="shop-close">✕</div>
            </div>
            <div id="companion-panel-body"></div>
        </div>

        <!-- Dungeon 3D HUD Overlay (shown during active dungeon) -->
        <div id="dungeon-hud" style="display:none;">
            <div id="dg-hud-top">
                <div id="dg-hud-name"></div>
                <div id="dg-hud-progress"></div>
                <div id="dg-hud-timer"></div>
            </div>
            <div id="dg-hud-left">
                <div id="dg-hud-party"></div>
            </div>
            <div id="dg-hud-right">
                <div id="dg-hud-mobs"></div>
            </div>
            <div id="dg-hud-bottom">
                <div id="dg-hud-chat"></div>
            </div>
            <div id="dg-hud-center-alert" style="display:none;"></div>
        </div>

        <!-- Party Invite Popup (floats top-center) -->
        <div id="party-invite-popup" style="display:none;">
            <div id="party-invite-inner">
                <div id="party-invite-icon">👥</div>
                <div id="party-invite-text"></div>
                <div id="party-invite-details"></div>
                <div id="party-invite-timer-bar"><div id="party-invite-timer-fill"></div></div>
                <div id="party-invite-buttons">
                    <div id="party-invite-accept" class="party-invite-btn accept">✓ Accept</div>
                    <div id="party-invite-decline" class="party-invite-btn decline">✕ Decline</div>
                </div>
            </div>
        </div>

        `;

        this._cacheDOM();
        this._setupEventListeners();
        this._setupTooltips();
        
        // Additional panel wiring
        this.setupSkillBar();
        this.setupSettingsPanel();
        this.setupZonePanel();
        this.setupTalentPanel();
        this.setupUpgradePanel();
        this.setupVictoryOverlay();
        this.setupParagonPanel();
        this.setupGoldShopPanel();
        this.setupAetherbitShopPanel();
        this._wireTalentBarTooltips();
        this._setupPartyListeners();
        this._setupSoulForgeListeners();
        this._setupDungeonListeners();
        this._setupPvpListeners();
        this._setupPvpVendorListeners();
        this._setupRaidListeners();
        this._setupRaidVendorListeners();
        this._setupCompanionListeners();

        // Initial chat messages
        const startZone = gameState.getCurrentZone();
        gameState.addChatMessage('Map', 'TybaltLover', 'Anyone for dungeon path 1?');
        gameState.addChatMessage('Map', 'MankriksMom', 'Has anyone seen my husband?');
        gameState.addChatMessage('Game', 'System', `${gameState.playerName} has entered ${startZone.name}.`);
    }

    /** Render the Soul Forge action bar — 3 ability slots */
    _renderSoulForgeBar() {
        if (!soulForge.isUnlocked() || !soulForge.activeSpec) return '';
        const abilities = soulForge.getSpecAbilities();
        const tierLabels = ['T1', 'T3', 'T5'];
        let html = `<div id="sf-bar-label">Soul Forge</div>`;
        for (let i = 0; i < 3; i++) {
            const abil = abilities[i];
            if (abil && abil.unlocked) {
                // Check if this was just unlocked (for flash animation)
                const justUnlocked = this._sfJustUnlocked && this._sfJustUnlocked.has(abil.id);
                const extraClass = justUnlocked ? ' just-unlocked' : '';
                html += `<div class="sf-slot unlocked${extraClass}" id="sf-abil-${i}" data-sf-slot="${i}" title="${abil.name}: ${abil.description}">`;
                html += `<span class="skill-icon">${iconImgLg(abil.iconKey, 22)}</span>`;
                html += `<span class="skill-keybind">S${i+1}</span>`;
                html += `<div class="sf-cooldown" id="sf-cd-${i}" style="display:none"></div>`;
                html += `</div>`;
            } else if (abil) {
                // Show the locked ability preview with grayscaled icon
                const tierNeeded = tierLabels[i];
                html += `<div class="sf-slot empty" id="sf-abil-${i}" data-sf-slot="${i}" data-locked-sf-abil="${abil.id}">`;
                html += `<span class="sf-lock-overlay">${iconImg(abil.iconKey, 16, 'filter:grayscale(1) brightness(0.4); opacity:0.5;')}</span>`;
                html += `<span class="sf-lock-tier">${tierNeeded}</span>`;
                html += `</div>`;
            } else {
                html += `<div class="sf-slot empty" id="sf-abil-${i}">`;
                html += `<span class="sf-lock-overlay">${iconImg('lock', 14, 'opacity:0.3;')}<span class="sf-lock-tier">${tierLabels[i]}</span></span>`;
                html += `</div>`;
            }
        }

        const hasAbilities = abilities.some(a => a && a.unlocked);

        // Update bar class for label styling
        requestAnimationFrame(() => {
            const bar = document.getElementById('soulforge-bar');
            if (bar) bar.classList.toggle('has-abilities', hasAbilities);
        });

        // Clear the just-unlocked set after rendering
        if (this._sfJustUnlocked) this._sfJustUnlocked = null;

        return html;
    }

    /** Rebuild Soul Forge bar HTML and re-wire tooltips */
    _refreshSoulForgeBar() {
        const bar = this._dom?.soulforgeBar || document.getElementById('soulforge-bar');
        if (!bar) return;
        const isActive = soulForge.isUnlocked() && soulForge.activeSpec;
        bar.classList.toggle('active', isActive);
        bar.innerHTML = this._renderSoulForgeBar();
        this._wireSoulForgeBarTooltips();
        // Re-cache cooldown DOM refs
        this._domSfCd = [];
        for (let i = 0; i < 3; i++) {
            this._domSfCd.push(document.getElementById(`sf-cd-${i}`));
        }
    }

    /** Wire Soul Forge bar slot hover tooltips */
    _wireSoulForgeBarTooltips() {
        for (let i = 0; i < 3; i++) {
            const el = document.getElementById(`sf-abil-${i}`);
            if (!el) continue;
            if (el.classList.contains('empty')) {
                // Wire locked slot tooltip
                el.addEventListener('mouseenter', (e) => this._showLockedSoulForgeTooltip(i, e));
                el.addEventListener('mouseleave', () => this.hideSkillTooltip());
            } else {
                el.addEventListener('mouseenter', (e) => this._showSoulForgeAbilityTooltip(i, e));
                el.addEventListener('mouseleave', () => this.hideSkillTooltip());
            }
        }
    }

    /** Show tooltip for a Soul Forge ability slot */
    _showSoulForgeAbilityTooltip(slotIdx, event) {
        this.hideSkillTooltip();
        const abilities = soulForge.getSpecAbilities();
        const abil = abilities[slotIdx];
        if (!abil || !abil.unlocked) return;

        const tt = document.createElement('div');
        tt.className = 'skill-tooltip';

        const cdText = abil.cooldown > 0 ? `${abil.cooldown}s CD` : 'No CD';
        const dmgText = abil.dpsMultiplier > 1 ? `${abil.dpsMultiplier}x Damage` : 'Utility';
        const durText = abil.duration > 0 ? `${abil.duration}s` : '';
        const tierLabel = abil.unlockTier === 0 ? 'Tier 1' : abil.unlockTier === 2 ? 'Tier 3' : 'Tier 5';

        let html = `<div class="stt-name" style="color:${abil.nameColor || '#ff9944'}">${iconImg(abil.iconKey, 16)} ${abil.name}</div>`;
        html += `<div class="stt-meta"><span>${cdText}</span>${durText ? `<span>${durText} Dur</span>` : ''}<span>${dmgText}</span></div>`;
        html += `<div class="stt-desc">${abil.description}</div>`;
        html += `<div class="stt-unlock ready">⚒️ Soul Forge · ${tierLabel} · Auto-cast in combat</div>`;

        tt.innerHTML = html;
        document.body.appendChild(tt);
        this._skillTooltip = tt;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 270);
        const y = Math.max(10, rect.top - tt.offsetHeight - 8);
        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
    }

    /** Show tooltip for a LOCKED Soul Forge ability slot — previews what you'll unlock */
    _showLockedSoulForgeTooltip(slotIdx, event) {
        this.hideSkillTooltip();
        const abilities = soulForge.getSpecAbilities();
        const abil = abilities[slotIdx];
        if (!abil) return;

        const tt = document.createElement('div');
        tt.className = 'skill-tooltip';

        const tierLabel = abil.unlockTier === 0 ? 'Tier I' : abil.unlockTier === 2 ? 'Tier III' : 'Tier V';
        const cdText = abil.cooldown > 0 ? `${abil.cooldown}s CD` : 'No CD';
        const dmgText = abil.dpsMultiplier > 1 ? `${abil.dpsMultiplier}x Damage` : 'Utility';
        const durText = abil.duration > 0 ? `${abil.duration}s` : '';

        let html = `<div class="stt-name" style="color:#667788">${iconImg(abil.iconKey, 16, 'filter:grayscale(1) brightness(0.6);')} ${abil.name}</div>`;
        html += `<div class="stt-meta"><span>${cdText}</span>${durText ? `<span>${durText} Dur</span>` : ''}<span>${dmgText}</span></div>`;
        html += `<div class="stt-desc">${abil.description}</div>`;
        html += `<div class="stt-unlock" style="color:#cc8855;">🔒 Unlock: Complete ${tierLabel} in Soul Forge</div>`;

        tt.innerHTML = html;
        document.body.appendChild(tt);
        this._skillTooltip = tt;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 270);
        const y = Math.max(10, rect.top - tt.offsetHeight - 8);
        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
    }

    /** Update Soul Forge ability cooldown overlays (called from update loop) */
    _updateSoulForgeCooldowns() {
        if (!this._domSfCd) {
            this._domSfCd = [];
            for (let i = 0; i < 3; i++) {
                this._domSfCd.push(document.getElementById(`sf-cd-${i}`));
            }
        }
        const abilities = soulForge.getSpecAbilities();
        for (let i = 0; i < 3; i++) {
            const cdEl = this._domSfCd[i];
            if (!cdEl) continue;
            const cd = soulForge.sfAbilityCooldowns[i];
            const slotEl = document.getElementById(`sf-abil-${i}`);
            if (cd > 0) {
                cdEl.style.display = 'flex';
                cdEl.textContent = Math.ceil(cd);
                if (slotEl) slotEl.classList.add('on-cooldown');
            } else {
                cdEl.style.display = 'none';
                if (slotEl) slotEl.classList.remove('on-cooldown');
            }
        }

        // Proc flash — detect when ability fires (CD jumps from 0 to max)
        if (!this._lastSfCd) this._lastSfCd = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            const cd = soulForge.sfAbilityCooldowns[i];
            if (this._lastSfCd[i] <= 0 && cd > 0) {
                // Ability just fired — play proc flash
                const slotEl = document.getElementById(`sf-abil-${i}`);
                if (slotEl && slotEl.classList.contains('unlocked')) {
                    slotEl.classList.remove('proc-flash');
                    void slotEl.offsetWidth; // trigger reflow for re-animation
                    slotEl.classList.add('proc-flash');
                    setTimeout(() => slotEl.classList.remove('proc-flash'), 600);
                }
            }
            this._lastSfCd[i] = cd;
        }
    }

    _setupEventListeners() {
        // Safe helper — avoids crash if an element doesn't exist in the template
        const on = (id, evt, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(evt, fn); };

        // Toggle inventory
        on('inv-toggle-btn', 'click', () => this.toggleInventory());
        on('inv-close', 'click', () => this.toggleInventory(false));

        // Settings
        on('settings-btn', 'click', () => this.toggleSettings());
        on('settings-close', 'click', () => this.toggleSettings(false));

        // Zones
        on('zone-btn', 'click', () => this.toggleZonePanel());
        on('zone-panel-close', 'click', () => this.toggleZonePanel(false));

        // Talents
        on('talent-btn', 'click', () => this.toggleTalentPanel());
        on('talent-close', 'click', () => this.toggleTalentPanel(false));
        on('talent-reset-btn', 'click', () => {
            if (confirm('Reset all talent points? This will refresh the UI.')) {
                talentTree.resetAll();
                this.renderTalentTree();
                this._refreshTalentBar();
            }
        });

        // Paragon
        on('paragon-btn', 'click', () => this.toggleParagonPanel());
        on('paragon-close', 'click', () => this.toggleParagonPanel(false));

        // Shops
        on('gold-shop-btn', 'click', () => this.toggleGoldShop());
        on('shop-close', 'click', () => this.toggleGoldShop(false));
        on('aetherbit-shop-btn', 'click', () => this.toggleAetherbitShop());
        on('aeth-shop-close', 'click', () => this.toggleAetherbitShop(false));

        // Upgrade Station
        on('upgrade-btn', 'click', () => this.toggleUpgradePanel());
        on('upgrade-close', 'click', () => this.toggleUpgradePanel(false));

        // Achievements
        on('achievement-btn', 'click', () => this.toggleAchievementPanel());
        on('achievement-close', 'click', () => this.toggleAchievementPanel(false));

        // Victory
        on('victory-close', 'click', () => {
            const overlay = document.getElementById('victory-overlay');
            if (overlay) overlay.classList.remove('active');
        });

        // Unstuck
        on('unstuck-btn', 'click', () => {
            const btn = document.getElementById('unstuck-btn');
            if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 100); }
            if (window._unstuckPlayer) window._unstuckPlayer();
        });

        // Camera
        on('camera-toggle-btn', 'click', () => {
            if (window._toggleCameraMode) window._toggleCameraMode();
        });

        // Volume
        const volSlider = document.getElementById('vol-slider');
        if (volSlider) volSlider.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            audioManager.setVolume(vol);
            const valEl = document.getElementById('vol-val');
            if (valEl) valEl.textContent = vol + '%';
        });

        on('mute-toggle', 'click', () => {
            audioManager.toggleMute();
            const btn = document.getElementById('mute-toggle');
            if (btn) { btn.textContent = audioManager.muted ? 'Muted' : 'Sound On'; btn.className = `settings-toggle-btn ${audioManager.muted ? 'active' : 'on'}`; }
        });

        // Game Speed slider (HUD widget below HD toggle)
        const speedSlider = document.getElementById('speed-slider');
        if (speedSlider) speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            gameState.gameSpeed = speed;
            const sv = document.getElementById('speed-widget-val');
            if (sv) sv.textContent = speed + 'x';
        });

        // HD Graphics toggle (next to quest log)
        on('hd-toggle-btn', 'click', () => {
            const isCurrentlyLowRes = gameState.lowResMode;
            // Toggle: if low-res → switch to HD; if HD → switch to low-res
            const newLowRes = !isCurrentlyLowRes;
            gameState.lowResMode = newLowRes;
            if (window._applyLowResMode) window._applyLowResMode(newLowRes);
            this._updateHdToggle();
        });

        // Save data / reset handlers removed

        // Quest Log toggle
        on('ql-header', 'click', () => {
            const body = document.getElementById('ql-body');
            const toggle = document.getElementById('ql-toggle');
            if (body) body.classList.toggle('collapsed');
            if (toggle) toggle.classList.toggle('collapsed');
        });

        // Inventory sell junk
        on('sell-junk-btn', 'click', () => {
            inventory.sellAllJunk();
            this.renderInventory();
        });
    }

    _showConfirmation(text, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'settings-confirm-overlay';
        overlay.innerHTML = `
            <div class="settings-confirm-box">
                <div class="settings-confirm-text">${text}</div>
                <div class="settings-confirm-btns">
                    <div class="settings-toggle-btn on" id="confirm-yes">Confirm</div>
                    <div class="settings-toggle-btn active" id="confirm-no">Cancel</div>
                </div>
            </div>
        `;
        document.getElementById('settings-panel').appendChild(overlay);
        overlay.querySelector('#confirm-yes').onclick = () => { overlay.remove(); onConfirm(); };
        overlay.querySelector('#confirm-no').onclick = () => overlay.remove();
    }

    _setupTooltips() {
        this._tooltip = document.createElement('div');
        this._tooltip.className = 'item-tooltip';
        this._tooltip.style.display = 'none';
        this.container.appendChild(this._tooltip);

        this._skillTooltip = document.createElement('div');
        this._skillTooltip.className = 'skill-tooltip';
        this._skillTooltip.style.display = 'none';
        this.container.appendChild(this._skillTooltip);

        // Listen for mouse moves on the whole container but only show tooltip for specific elements
        this.container.addEventListener('mousemove', (e) => {
            const bagSlot = e.target.closest('.bag-slot');
            const equipSlot = e.target.closest('.equip-slot');
            const upgSlot = e.target.closest('.upgrade-slot-card');
            
            if (bagSlot || equipSlot || upgSlot) {
                let item = null;
                if (bagSlot) item = inventory.items[bagSlot.dataset.index];
                if (equipSlot) item = inventory.equipped[equipSlot.dataset.slot];
                if (upgSlot) item = inventory.equipped[upgSlot.dataset.slot];

                if (item) {
                    this.showItemTooltip(item, e.clientX, e.clientY);
                    return;
                }
            }

            // Skill & talent tooltips handled by setupSkillBar() mouseenter and _wireTalentBarTooltips()
            // We must NOT hide tooltips if the mouse is currently over one of these slots.
            if (e.target.closest('.skill-slot') || e.target.closest('.talent-node') || e.target.closest('.sf-slot') || e.target.closest('.talent-slot')) {
                return;
            }

            const paragonTrack = e.target.closest('.paragon-track');
            if (paragonTrack) {
                // Inline help handled by track description
            }

            this.hideTooltips();
        });

        this.container.addEventListener('mouseleave', () => this.hideTooltips());
    }

    showItemTooltip(item, x, y) {
        if (!item) return;
        const rarity = item.rarity;
        const upgradeBonus = item.upgradeTier > 0 ? upgradeStation.getMultiplier(item.upgradeTier) : 1.0;
        const statBonusPct = Math.round((upgradeBonus - 1) * 100);

        // Armor type tag
        const ARMOR_TYPE_COLORS = { mail: '#7799cc', leather: '#cc9944', cloth: '#bb88dd' };
        const ARMOR_TYPE_NAMES = { mail: 'Mail', leather: 'Leather', cloth: 'Cloth' };
        let armorTypeHtml = '';
        if (item.armorType && ARMOR_TYPE_NAMES[item.armorType]) {
            armorTypeHtml = `<span style="color:${ARMOR_TYPE_COLORS[item.armorType]};font-size:10px;margin-left:6px;">${ARMOR_TYPE_NAMES[item.armorType]}</span>`;
        }

        // Slot label
        const slotLabels = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', legs: 'Legs', boots: 'Boots', ring: 'Ring', trinket: 'Trinket' };
        const slotName = slotLabels[item.slot] || item.slot;

        let html = `
            <div class="tt-name" style="color:${rarity.color}">${item.name}${item.upgradeTier > 0 ? ' +' + item.upgradeTier : ''}</div>
            <div class="tt-rarity" style="color:${rarity.color}">${rarity.name}</div>
            <div class="tt-slot">${slotName}${armorTypeHtml}</div>
        `;

        if (item.dps) {
            html += `<div class="tt-stat">Damage: ${item.dps} ${statBonusPct > 0 ? `<span class="tt-stat-bonus">(+${statBonusPct}%)</span>` : ''}</div>`;
        }
        if (item.armor) {
            html += `<div class="tt-stat">Armor: ${item.armor} ${statBonusPct > 0 ? `<span class="tt-stat-bonus">(+${statBonusPct}%)</span>` : ''}</div>`;
        }
        if (item.bonusStat) {
            html += `<div class="tt-stat">${item.bonusStat}: +${item.bonusStatValue} ${statBonusPct > 0 ? `<span class="tt-stat-bonus">(+${statBonusPct}%)</span>` : ''}</div>`;
        }

        const sellValue = item.value || item.sellValue || Math.max(1, (item.level || 1));
        html += `<div class="tt-stat" style="margin-top:4px;color:#ffdd44">Value: ${gameState.formatGold(sellValue)}</div>`;
        html += `<div class="tt-action">Click to equip/use · Shift+Click to sell</div>`;

        this._tooltip.innerHTML = html;
        this._tooltip.style.display = 'block';
        
        // Position relative to mouse
        const ttW = this._tooltip.offsetWidth;
        const ttH = this._tooltip.offsetHeight;
        let tx = x + 15;
        let ty = y + 15;
        if (tx + ttW > window.innerWidth) tx = x - ttW - 15;
        if (ty + ttH > window.innerHeight) ty = y - ttH - 15;
        
        this._tooltip.style.left = tx + 'px';
        this._tooltip.style.top = ty + 'px';
    }

    showSkillTooltip(skill, x, y, isTalent = false) {
        const unlocked = isTalent || gameState.level >= skill.unlockLevel;
        let html = `
            <div class="stt-name" style="color:${skill.nameColor || '#eeddaa'}">${skill.name}</div>
            <div class="stt-meta">
                <span>Cooldown: ${skill.cooldown}s</span>
                ${skill.manaCost ? `<span>Cost: ${skill.manaCost} Mana</span>` : ''}
            </div>
            <div class="stt-desc">${skill.description}</div>
        `;

        if (!unlocked) {
            html += `<div class="stt-unlock">Requires Level ${skill.unlockLevel}</div>`;
        } else {
            html += `<div class="stt-unlock ready">Ability Ready</div>`;
        }

        this._skillTooltip.innerHTML = html;
        this._skillTooltip.style.display = 'block';

        const ttW = this._skillTooltip.offsetWidth;
        const ttH = this._skillTooltip.offsetHeight;
        let tx = x + 15;
        let ty = y - ttH - 15; // Above mouse
        if (tx + ttW > window.innerWidth) tx = x - ttW - 15;
        if (ty < 0) ty = y + 15;

        this._skillTooltip.style.left = tx + 'px';
        this._skillTooltip.style.top = ty + 'px';
    }

    hideTooltips() {
        if (this._tooltip) this._tooltip.style.display = 'none';
        if (this._skillTooltip) this._skillTooltip.style.display = 'none';
    }

    toggleInventory(force) {
        const panel = document.getElementById('inv-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.invOpen = true;
            panel.classList.add('open');
            this.renderInventory();
            audioManager.playUiOpen();
        } else {
            this.invOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleSettings(force) {
        const panel = document.getElementById('settings-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.settingsOpen = true;
            panel.classList.add('open');
            audioManager.playUiOpen();
        } else {
            this.settingsOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleZonePanel(force) {
        const panel = document.getElementById('zone-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.zoneOpen = true;
            panel.classList.add('open');
            this.renderZoneCards();
            audioManager.playUiOpen();
            // Mark all currently accessible zones as seen — dismisses NEW badge
            gameState.seenZoneCount = Math.max(gameState.seenZoneCount, CONFIG.ZONES.filter(z => gameState.canAccessZone(z.id)).length);
        } else {
            this.zoneOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleTalentPanel(force) {
        const panel = document.getElementById('talent-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.talentOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.talent = false; // Reset notification glow
            this.renderTalentTree();
            audioManager.playUiOpen();
        } else {
            this.talentOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleParagonPanel(force) {
        const panel = document.getElementById('paragon-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.paragonOpen = true;
            panel.classList.add('open');
            this.renderParagonPanel();
            audioManager.playUiOpen();
        } else {
            this.paragonOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleGoldShop(force) {
        const panel = document.getElementById('gold-shop-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.goldShopOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.gold = false; // Reset notification glow
            this.renderGoldShop();
            audioManager.playUiOpen();
        } else {
            this.goldShopOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleAetherbitShop(force) {
        const panel = document.getElementById('aetherbit-shop-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.aetherbitShopOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.aether = false; // Reset notification glow
            this.renderAetherbitShop();
            audioManager.playUiOpen();
        } else {
            this.aetherbitShopOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleUpgradePanel(force) {
        const panel = document.getElementById('upgrade-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.upgradeOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.enhance = false; // Reset notification glow
            this._upgradeSelectedSlot = null;
            this.renderUpgradeStation();
            audioManager.playUiOpen();
        } else {
            this.upgradeOpen = false;
            panel.classList.remove('open');
        }
    }

    toggleAchievementPanel(force) {
        const panel = document.getElementById('achievement-panel');
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            panel.classList.add('open');
            this.renderAchievementList('all');
            audioManager.playUiOpen();
        } else {
            panel.classList.remove('open');
        }
    }

    /* ────── Paragon Methods ────── */
    // Alias for backward-compat calls
    renderParagonTracks() { this.renderParagonPanel(); }

    /* ────── Shop methods are defined below (near setupGoldShopPanel) ────── */

    /* ────── Upgrade Station Methods ────── */
    renderUpgradeSlots() {
        const container = document.getElementById('upgrade-slots');
        if (!container) return;

        const slots = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
        container.innerHTML = slots.map(slot => {
            const item = inventory.equipped[slot];
            if (!item) return `<div class="upgrade-slot-card empty"><div class="upgrade-slot-icon"></div><div class="upgrade-slot-info"><div class="upgrade-slot-name">Empty Slot</div></div></div>`;
            
            const selected = this._selectedUpgradeSlot === slot;
            return `
                <div class="upgrade-slot-card ${selected ? 'selected' : ''}" data-slot="${slot}">
                    <div class="upgrade-slot-icon" style="border-color:${item.rarity.color}">${item.icon}</div>
                    <div class="upgrade-slot-info">
                        <div class="upgrade-slot-name" style="color:${item.rarity.color}">${item.name}</div>
                        <div class="upgrade-slot-stat">${item.dps ? 'Damage: ' + item.dps : 'Armor: ' + item.armor}</div>
                    </div>
                    <div class="upgrade-slot-tier" style="color:${item.upgradeTier > 0 ? '#ffcc66' : '#666'}">${item.upgradeTier > 0 ? '+' + item.upgradeTier : 'No Enhancements'}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.upgrade-slot-card:not(.empty)').forEach(el => {
            el.onclick = () => {
                this._selectedUpgradeSlot = el.dataset.slot;
                this.renderUpgradeSlots();
                this.renderUpgradeDetail();
            };
        });

        document.getElementById('upgrade-gold').textContent = gameState.formatGold(gameState.gold);
        document.getElementById('upgrade-aetherbit').textContent = gameState.karma.toLocaleString();
        this.updateUpgradeSummary();
    }

    renderUpgradeDetail() {
        const detail = document.getElementById('upgrade-detail');
        const item = inventory.equipped[this._selectedUpgradeSlot];
        if (!item) { detail.style.display = 'none'; return; }

        detail.style.display = 'block';
        const nextTier = (item.upgradeTier || 0) + 1;
        const maxed = nextTier > MAX_UPGRADE_TIER;
        const config = UPGRADE_TIERS[nextTier];

        const currentMult = upgradeStation.getMultiplier(item.upgradeTier || 0);
        const nextMult = !maxed ? upgradeStation.getMultiplier(nextTier) : currentMult;
        
        const canAfford = !maxed && gameState.gold >= config.goldCost && gameState.karma >= config.karmaCost;

        detail.innerHTML = `
            <div class="upg-detail-top">
                <div class="upg-detail-item-icon" style="border-color:${item.rarity.color}">${item.icon}</div>
                <div class="upg-detail-item-info">
                    <div class="upg-detail-item-name" style="color:${item.rarity.color}">${item.name}</div>
                    <div class="upg-detail-item-tier" style="color:${item.upgradeTier > 0 ? '#ffcc66' : '#888'}">
                        Current: ${item.upgradeTier > 0 ? '+' + item.upgradeTier : 'Standard'}
                    </div>
                </div>
            </div>
            ${!maxed ? `
                <div class="upg-detail-arrow">
                    <span class="from">Tier ${item.upgradeTier}</span>
                    <span class="arrow">➜</span>
                    <span class="to">Tier ${nextTier}</span>
                </div>
                <div class="upg-detail-arrow" style="margin-top:-4px;">
                    <span class="from">${Math.round(currentMult * 100)}% Power</span>
                    <span class="arrow">➜</span>
                    <span class="to">${Math.round(nextMult * 100)}% Power</span>
                </div>
                <div class="upg-detail-cost">
                    <div class="upg-cost-item ${gameState.gold >= config.goldCost ? 'affordable' : 'expensive'}">${config.goldCost}g</div>
                    <div class="upg-cost-item ${gameState.karma >= config.karmaCost ? 'affordable' : 'expensive'}">${config.karmaCost} ${iconImg('aetherbit', 12)}</div>
                </div>
                <div class="upg-detail-chance">
                    <span>Success Rate:</span>
                    <span class="rate ${config.chance >= 0.8 ? 'safe' : (config.chance >= 0.5 ? 'risky' : 'danger')}">${Math.round(config.chance * 100)}%</span>
                </div>
                <div class="upg-enhance-btn ${canAfford ? '' : 'disabled'}" id="enhance-btn">ENHANCE EQUIPMENT</div>
            ` : `
                <div class="upg-enhance-btn maxed">MAXIMUM ENHANCEMENT REACHED</div>
            `}
            <div id="upg-toast-container"></div>
        `;

        if (!maxed && canAfford) {
            detail.querySelector('#enhance-btn').onclick = () => {
                const result = upgradeStation.upgradeItem(this._selectedUpgradeSlot);
                this.renderUpgradeSlots();
                this.renderUpgradeDetail();
                
                const toast = document.createElement('div');
                toast.className = `upg-result-toast ${result.success ? 'success' : 'fail'}`;
                toast.textContent = result.message;
                detail.querySelector('#upg-toast-container').appendChild(toast);
                
                if (result.success) {
                    audioManager.playUiSuccess();
                    // Sparkle effect
                    const slotCard = document.querySelector(`.upgrade-slot-card[data-slot="${this._selectedUpgradeSlot}"]`);
                    if (slotCard) {
                        slotCard.style.transition = 'none';
                        slotCard.style.boxShadow = '0 0 30px rgba(255,200,60,0.8)';
                        setTimeout(() => {
                            slotCard.style.transition = 'box-shadow 1s ease';
                            slotCard.style.boxShadow = 'none';
                        }, 50);
                    }
                } else {
                    audioManager.playUiFail();
                }
            };
        }
    }

    updateUpgradeSummary() {
        const summary = document.getElementById('upgrade-stats-summary');
        if (!summary) return;

        // Calculate average enhancement multiplier across equipped items
        let totalMult = 0;
        let upgradedCount = 0;
        for (const slot of Object.keys(inventory.equipped)) {
            const item = inventory.equipped[slot];
            if (item && (item.upgradeTier || 0) > 0) {
                const tier = upgradeStation.getCurrentTier(item);
                if (tier) { totalMult += tier.statMult; upgradedCount++; }
            }
        }
        const avgBonus = upgradedCount > 0 ? totalMult / upgradedCount : 1;
        summary.innerHTML = `
            <div class="upg-stats-row"><span>Avg Enhancement Power:</span> <span class="upg-stats-val">${Math.round(avgBonus * 100)}%</span></div>
            <div class="upg-stats-row"><span>Total Enhancements:</span> <span class="upg-stats-val">${gameState.totalItemsEnhanced || 0}</span></div>
        `;
    }

    /* ────── Zone Methods ────── */
    setupZonePanel() {
        // Zone panel open/close handled by _setupEventListeners → toggleZonePanel()
        // renderZoneCards() is called from toggleZonePanel()
    }

    showZoneUnlockToast(zoneId) {
        const zone = CONFIG.getZone(zoneId);
        const container = document.getElementById('hero-toast-container');
        if (!container || !zone) return;

        const toast = document.createElement('div');
        toast.className = 'zone-unlock-toast';
        toast.innerHTML = `
            <div class="zone-unlock-inner" style="border-color:${zone.color}">
                <div class="zone-unlock-label" style="color:${zone.color}">New Region Unlocked</div>
                <div class="zone-unlock-name" style="color:#eeeedd">${zone.name}</div>
            </div>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
        audioManager.playZoneUnlock();
    }

    setupSkillBar() {
        const skills = gameState.getSkills();
        for (let i = 0; i < skills.length; i++) {
            const el = document.getElementById(`skill-${i}`);
            if (!el) continue;
            
            el.addEventListener('click', () => {
                if (!gameState.isSkillUnlocked(i)) return;
                if (i === 0) return; // Slot 1 auto-attacks, no manual trigger
                gameState.useSkill(i);
            });

            el.addEventListener('mouseenter', (e) => this.showSkillTooltip(i, e));
            el.addEventListener('mouseleave', () => this.hideSkillTooltip());
        }
    }

    showSkillTooltip(index, event) {
        this.hideSkillTooltip();
        const skill = gameState.getSkills()[index];
        if (!skill) return;

        const tt = document.createElement('div');
        tt.className = 'skill-tooltip';

        const unlocked = gameState.isSkillUnlocked(index);
        const cdText = skill.cooldown > 0 ? `${skill.cooldown}s CD` : 'No CD';
        const manaText = skill.manaCost > 0 ? `${skill.manaCost} Mana` : 'Free';
        const dmgText = skill.dpsMultiplier > 0 ? `${skill.dpsMultiplier}x Damage` : 'Utility';

        let html = `<div class="stt-name" style="color:${skill.nameColor || '#ccddcc'}">${skill.name}</div>`;
        html += `<div class="stt-meta"><span>${cdText}</span><span>${manaText}</span><span>${dmgText}</span></div>`;
        html += `<div class="stt-desc">${skill.description}</div>`;
        if (!unlocked) {
            html += `<div class="stt-unlock">Unlocks at Level ${skill.unlockLevel}</div>`;
        } else {
            html += `<div class="stt-unlock ready">✓ Unlocked · Click or auto-cast</div>`;
        }

        tt.innerHTML = html;
        document.body.appendChild(tt);
        this._skillTooltip = tt;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 270);
        const y = Math.max(10, rect.top - tt.offsetHeight - 8);
        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
    }

    hideSkillTooltip() {
        if (this._skillTooltip) {
            this._skillTooltip.remove();
            this._skillTooltip = null;
        }
    }

    setupSettingsPanel() {
        // Settings panel open/close handled by _setupEventListeners → toggleSettings()
        // Game Speed slider moved to HUD widget — setup in _setupEventListeners
        // Low-res toggle removed from settings — now the HD toggle in the main HUD

        const volSlider = document.getElementById('vol-slider');
        const volVal = document.getElementById('vol-val');
        if (volSlider) {
            volSlider.addEventListener('input', () => {
                const pct = parseInt(volSlider.value);
                volVal.textContent = pct + '%';
                audioManager.setVolume(pct);
                if (!audioManager.initialized) audioManager.init();
            });
        }

        const muteToggle = document.getElementById('mute-toggle');
        if (muteToggle) {
            muteToggle.addEventListener('click', () => {
                if (!audioManager.initialized) audioManager.init();
                const muted = audioManager.toggleMute();
                muteToggle.textContent = muted ? 'Muted' : 'Sound On';
                muteToggle.classList.toggle('active', muted);
                muteToggle.classList.toggle('on', !muted);
            });
        }

        // Save data / reset handlers removed
    }

    showSettingsToast(msg, color = '#eeddaa') {
        const panel = document.getElementById('settings-body');
        if (!panel) return;
        const toast = document.createElement('div');
        toast.style.cssText = `font-family:'Inter',sans-serif;font-size:11px;color:${color};text-align:center;padding:8px 12px;margin-top:8px;background:rgba(0,0,0,0.3);border-radius:4px;border:1px solid ${color}33;animation:loot-slide 3s ease-out forwards;`;
        toast.textContent = msg;
        panel.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    renderZoneCards() {
        const container = document.getElementById('zone-card-list');
        const currentLabel = document.getElementById('zone-current-name');
        if (!container) return;

        const currentZone = gameState.getCurrentZone();
        if (currentLabel) currentLabel.textContent = currentZone.name;

        let html = '';
        for (const zone of CONFIG.ZONES) {
            const isCurrent = zone.id === gameState.currentZoneId;
            const canAccess = gameState.canAccessZone(zone.id);
            const levelText = gameState.endgameComplete 
                ? `Lv ${CONFIG.MAX_LEVEL}` 
                : `Lv ${zone.levelRange[0]}–${zone.levelRange[1]}`;

            // Determine lock reason for locked zones
            let lockReason = '';
            if (!canAccess) {
                const meetsLevel = gameState.level >= zone.levelRange[0];
                if (!meetsLevel) {
                    lockReason = `Requires Level ${zone.levelRange[0]}`;
                } else {
                    // Level met but boss not defeated — find which boss blocks access
                    const zoneIdx = CONFIG.getZoneIndex(zone.id);
                    for (let i = 0; i < zoneIdx; i++) {
                        const prevZoneId = CONFIG.ZONES[i].id;
                        const prevBoss = CONFIG.getBossForZone(prevZoneId);
                        if (prevBoss && !gameState.isBossDefeated(prevZoneId)) {
                            lockReason = `Defeat ${prevBoss.name} first`;
                            break;
                        }
                    }
                    if (!lockReason) lockReason = 'Locked';
                }
            }

            // Check if current zone's boss is active/needed
            const zoneBoss = CONFIG.getBossForZone(zone.id);
            const bossDefeated = zoneBoss ? gameState.isBossDefeated(zone.id) : true;

            // Check if zone is outleveled (boss defeated + player above max level, pre-endgame)
            const isOutleveled = canAccess && bossDefeated && !gameState.endgameComplete
                && gameState.level > zone.levelRange[1];

            let badgeHtml = '';
            let cardClass = 'zone-card';
            if (isCurrent && isOutleveled) {
                cardClass += ' active';
                badgeHtml = `<div class="zone-card-badge-inline" style="background:rgba(200,150,40,0.2);color:#ccaa44;border:1px solid rgba(200,150,40,0.3);">⚠ Outleveled</div>`;
            } else if (isCurrent) {
                cardClass += ' active';
                badgeHtml = `<div class="zone-card-badge-inline current">Current</div>`;
            } else if (!canAccess) {
                cardClass += ' locked';
                badgeHtml = `<div class="zone-card-badge-inline locked-badge">${iconImg('lock', 10)} Locked</div>`;
            } else if (isOutleveled) {
                badgeHtml = `<div class="zone-card-badge-inline" style="background:rgba(120,100,60,0.2);color:#998866;border:1px solid rgba(120,100,60,0.3);">Outleveled</div>`;
            } else {
                badgeHtml = `<div class="zone-card-badge-inline available">Travel</div>`;
            }

            // Boss status line
            let bossStatusHtml = '';
            if (zoneBoss) {
                if (bossDefeated) {
                    bossStatusHtml = `<div style="font-family:'Inter',sans-serif;font-size:10px;color:#55aa66;margin-top:4px;display:flex;align-items:center;gap:4px;">${iconImg('checkmark', 11)} <span>${this.escapeHtml(zoneBoss.name)} defeated</span></div>`;
                } else if (isCurrent || canAccess) {
                    bossStatusHtml = `<div style="font-family:'Inter',sans-serif;font-size:10px;color:#cc9944;margin-top:4px;display:flex;align-items:center;gap:4px;">☠ <span>Zone Boss: ${this.escapeHtml(zoneBoss.name)} (Lv ${zoneBoss.level})</span></div>`;
                }
            }

            // Lock reason line
            let lockReasonHtml = '';
            if (lockReason) {
                lockReasonHtml = `<div style="font-family:'Inter',sans-serif;font-size:10px;color:#cc7766;margin-top:4px;display:flex;align-items:center;gap:4px;">${iconImg('lock', 10)} <span>${this.escapeHtml(lockReason)}</span></div>`;
            }

            // Outleveled warning line
            let outleveledHtml = '';
            if (isOutleveled) {
                outleveledHtml = `<div style="font-family:'Inter',sans-serif;font-size:10px;color:#cc9944;margin-top:4px;display:flex;align-items:center;gap:4px;">⚠ <span>No XP or new quests — zone outleveled</span></div>`;
            }

            const levelBadgeStyle = gameState.endgameComplete ? 'color:#ffcc44; border-color:rgba(255,200,60,0.5); background:rgba(255,200,60,0.1);' : '';
            html += `<div class="${cardClass}" data-zone-id="${zone.id}">
                <div class="zone-card-top">
                    <span class="zone-card-icon">${zone.icon}</span>
                    <div class="zone-card-info">
                        <div class="zone-card-name" style="color:${zone.color}">${zone.name}</div>
                        <div class="zone-card-subtitle">${zone.subtitle}</div>
                    </div>
                    <div class="zone-card-right">
                        ${badgeHtml}
                        <div class="zone-card-level" style="${levelBadgeStyle}">${levelText}</div>
                    </div>
                </div>
                <div class="zone-card-desc">${zone.description}</div>
                ${bossStatusHtml}
                ${lockReasonHtml}
                ${outleveledHtml}
            </div>`;
        }
        container.innerHTML = html;

        // Attach click handlers to accessible cards
        container.querySelectorAll('.zone-card:not(.locked)').forEach(el => {
            el.addEventListener('click', () => {
                const zoneId = el.getAttribute('data-zone-id');
                if (zoneId === gameState.currentZoneId) return; // already here
                const success = gameState.changeZone(zoneId);
                if (success) {
                    this.zoneOpen = false;
                    document.getElementById('zone-panel').classList.remove('open');
                    this.renderZoneCards();
                }
            });
        });

        // Locked cards show a feedback toast on click
        container.querySelectorAll('.zone-card.locked').forEach(el => {
            el.addEventListener('click', () => {
                const zoneId = el.getAttribute('data-zone-id');
                const zone = CONFIG.getZone(zoneId);
                const meetsLevel = gameState.level >= zone.levelRange[0];
                let msg = '';
                if (!meetsLevel) {
                    msg = `You need to be Level ${zone.levelRange[0]} to enter ${zone.name}.`;
                } else {
                    // Boss gated
                    const zoneIdx = CONFIG.getZoneIndex(zoneId);
                    for (let i = 0; i < zoneIdx; i++) {
                        const prevZoneId = CONFIG.ZONES[i].id;
                        const prevBoss = CONFIG.getBossForZone(prevZoneId);
                        if (prevBoss && !gameState.isBossDefeated(prevZoneId)) {
                            msg = `Defeat ${prevBoss.name} in ${CONFIG.getZone(prevZoneId).name} to unlock this zone.`;
                            break;
                        }
                    }
                    if (!msg) msg = `${zone.name} is locked.`;
                }
                gameState.addGameLog(msg);
            });
        });
    }

    showZoneUnlockToast(zone) {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'zone-unlock-toast';
        toast.innerHTML = `<div class="zone-unlock-inner"><div class="zone-unlock-label">Zone Unlocked</div><div class="zone-unlock-name" style="color:${zone.color}">${zone.icon} ${zone.name}</div></div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    showBossDefeatToast(bossConfig, zoneId) {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        const nextZone = CONFIG.getNextZone(zoneId);
        const toast = document.createElement('div');
        toast.className = 'boss-defeat-toast';
        let html = `<div class="boss-defeat-inner">`;
        html += `<div class="boss-defeat-label">Boss Defeated</div>`;
        html += `<div class="boss-defeat-name">☠ ${this.escapeHtml(bossConfig.name)}</div>`;
        if (nextZone) {
            html += `<div class="boss-defeat-subtitle">${nextZone.icon} Path to ${nextZone.name} is now open!</div>`;
        } else {
            html += `<div class="boss-defeat-subtitle">You have conquered this zone!</div>`;
        }
        html += `<div class="boss-defeat-rewards">`;
        html += `<span>${iconImg('xpStar', 14)} ${bossConfig.xpReward} XP</span>`;
        html += `<span>${iconImg('goldCoin', 14)} ${bossConfig.goldReward}g</span>`;
        html += `<span>${iconImg('aetherbit', 14)} ${bossConfig.karmaReward}</span>`;
        html += `</div></div>`;
        toast.innerHTML = html;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5500);
    }

    showRaidClearToast(raidDef, loot, totalTime) {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'boss-defeat-toast'; // Reuse class for layout
        let html = `<div class="boss-defeat-inner" style="border-color:#cc3344; box-shadow: 0 0 40px rgba(204,51,68,0.25);">`;
        html += `<div class="boss-defeat-label" style="color:#ee6677">Raid Cleared</div>`;
        html += `<div class="boss-defeat-name" style="color:#ffccdd; text-shadow: 0 0 16px rgba(204,51,68,0.6);">🏆 ${this.escapeHtml(raidDef.name)}</div>`;
        
        const m = Math.floor(totalTime / 60);
        const s = Math.floor(totalTime % 60);
        const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
        
        html += `<div class="boss-defeat-subtitle" style="color:#aa8888">Time: ${timeStr} · The Sanctum has been conquered!</div>`;
        html += `<div class="boss-defeat-rewards">`;
        if (loot.xp) html += `<span>${iconImg('xpStar', 14)} ${loot.xp.toLocaleString()} XP</span>`;
        if (loot.gold) html += `<span>${iconImg('goldCoin', 14)} ${loot.gold.toLocaleString()}g</span>`;
        if (loot.raidPoints) html += `<span>${iconImg('raidPoints', 14)} ${loot.raidPoints} RP</span>`;
        if (loot.soulEssence) html += `<span>${iconImg('soulEssence', 14)} ${loot.soulEssence} SE</span>`;
        html += `</div></div>`;
        
        toast.innerHTML = html;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
        
        if (window.audioManager) window.audioManager.playZoneUnlock(); // Reuse for epic feel
    }

    checkBossDefeats() {
        const currentCount = gameState.defeatedBosses.size;
        if (currentCount > this._lastDefeatedBossCount) {
            // A new boss was defeated — find which one by checking against our snapshot
            for (const [zoneId, bossConfig] of Object.entries(CONFIG.ZONE_BOSSES)) {
                if (gameState.defeatedBosses.has(zoneId) && !this._knownDefeatedBosses?.has(zoneId)) {
                    this.showBossDefeatToast(bossConfig, zoneId);
                }
            }
        }
        this._lastDefeatedBossCount = currentCount;
        // Keep a snapshot of known defeated bosses
        this._knownDefeatedBosses = new Set(gameState.defeatedBosses);
    }

    checkZoneUnlocks() {
        const unlocked = CONFIG.ZONES.filter(z => gameState.canAccessZone(z.id)).length;
        if (unlocked > this._lastZoneUnlockCount) {
            // A new zone was unlocked
            for (const zone of CONFIG.ZONES) {
                if (gameState.level === zone.levelRange[0]) {
                    this.showZoneUnlockToast(zone);

                    // Party feature unlocks with Shattered Expanse
                    if (zone.id === 'shattered_expanse') {
                        setTimeout(() => this.showPartyUnlockToast(), 2500);
                    }
                    // Companion system unlocks with Abyssal Depths
                    if (zone.id === 'abyssal_depths') {
                        setTimeout(() => this._showCompanionUnlockToast(), 3200);
                    }
                    // Party capacity increases
                    const capZones = {
                        molten_abyss: 3,
                        abyssal_depths: 4,
                        neon_wastes: 5,
                    };
                    if (capZones[zone.id]) {
                        setTimeout(() => {
                            gameState.addGameLog(`Party capacity increased to ${capZones[zone.id]} members!`);
                            gameState.addChatMessage('Game', 'System', `👥 Party size now supports up to ${capZones[zone.id]} members!`);
                        }, 3000);
                    }
                }
            }
        }
        this._lastZoneUnlockCount = unlocked;
    }

    showPartyUnlockToast() {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'zone-unlock-toast';
        toast.innerHTML = `<div class="zone-unlock-inner" style="border-color:rgba(80,180,255,0.6)">
            <div class="zone-unlock-label" style="color:#66ccff">New Feature Unlocked</div>
            <div class="zone-unlock-name" style="color:#ddeeff">👥 Party System</div>
            <div style="font-size:11px;color:#88aacc;margin-top:4px;font-family:'Inter',sans-serif;">Other players can now join your party!</div>
        </div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
        gameState.addGameLog('NEW FEATURE UNLOCKED: Party System! Other players can now request to join your party.');
        gameState.addChatMessage('Game', 'System', '👥 Party System unlocked! Adventurers may ask to join your party.');
    }

    /* ────── Achievement Medals Panel ────── */
    setupAchievementPanel() {
        const achBtn = document.getElementById('achievement-btn');
        const achPanel = document.getElementById('achievement-panel');
        const achClose = document.getElementById('achievement-close');

        if (achBtn) {
            achBtn.addEventListener('click', () => {
                if (this.achOpen) {
                    this.achOpen = false;
                    achPanel.classList.remove('open');
                } else {
                    this._closeAllPanels();
                    this.achOpen = true;
                    achPanel.classList.add('open');
                    this.renderAchievementList('all');
                }
            });
        }
        if (achClose) {
            achClose.addEventListener('click', () => {
                this.achOpen = false;
                achPanel.classList.remove('open');
            });
        }
    }

    renderAchievementList(category = 'all') {
        const container = document.getElementById('achievement-list');
        if (!container) return;

        // ── Global Stats tab — completely different view ──
        if (category === 'global') {
            container.innerHTML = this._renderGlobalStats();
            return;
        }

        let html = '';
        const filtered = ACHIEVEMENT_DEFS.filter(def => category === 'all' || def.category === category);

        for (const def of filtered) {
            const completed = achievementManager.completedIds.has(def.id);
            const isSecret = def.secret && !completed;
            
            const current = achievementManager.getStatValue(def.id);
            const pct = Math.min(100, Math.floor((current / def.target) * 100));
            
            const title = isSecret ? '??? (Secret)' : def.title;
            const desc = isSecret ? 'Keep playing to discover this secret achievement.' : def.desc;
            const icon = isSecret ? 'lock' : def.icon;
            const tier = def.tier || 'common';

            const cardClass = `ach-card ${completed ? 'completed' : ''} ${isSecret ? 'secret' : ''} tier-${tier}`;
            const barColor = completed ? '#66dd88' : (tier === 'legendary' ? '#ff6644' : tier === 'epic' ? '#cc88ff' : '#4488ff');

            html += `
            <div class="${cardClass}">
                <div class="ach-icon-box" style="border-color:${barColor}40">
                    ${iconImg(icon, 24)}
                </div>
                <div class="ach-info">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="ach-title" style="color:${completed ? '#ffdd44' : '#eeddaa'}">${title}</span>
                        <span style="font-size:9px; color:#889977;">${isSecret ? '???' : current}/${isSecret ? '???' : def.target}</span>
                    </div>
                    <div class="ach-desc">${desc}</div>
                    <div class="ach-bar-bg">
                        <div class="ach-bar-fill" style="width:${isSecret ? 0 : pct}%; background:${barColor}"></div>
                    </div>
                </div>
                <div class="ach-reward-box">
                    <div class="ach-reward-label">Reward</div>
                    ${def.reward.gold ? `<div class="ach-reward-val" style="color:#ffdd44">+${isSecret ? '???' : def.reward.gold}g ${iconImg('goldCoin', 10)}</div>` : ''}
                    ${def.reward.xp ? `<div class="ach-reward-val" style="color:#66ccff">+${isSecret ? '???' : def.reward.xp} XP ${iconImg('xpStar', 10)}</div>` : ''}
                </div>
            </div>`;
        }

        container.innerHTML = html;
    }

    /** Format milliseconds into human-readable playtime */
    _formatPlayTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (days > 0) return `${days}d ${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    /** Render the Global Stats view for the medals panel */
    _renderGlobalStats() {
        const kills = questLog.getKillStats();
        const totalKills = gameState.totalMobsKilled;
        const classNames = { warrior: 'Warrior', mage: 'Mage', ranger: 'Ranger', cleric: 'Cleric' };
        const className = classNames[gameState.classId] || 'Hero';

        let html = `<div class="global-stats-container">`;

        // ── Character Overview ──
        html += `<div class="global-stats-section">`;
        html += `<div class="global-stats-section-title">⚔️ Character Overview</div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('sword', 13)} Character</span><span class="global-stat-value highlight">${this.escapeHtml(gameState.playerName)} — ${className}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">⏱️ Playtime</span><span class="global-stat-value highlight">${this._formatPlayTime(gameState.totalPlayTime)}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('xpStar', 13)} Level</span><span class="global-stat-value">${gameState.level}${gameState.paragonLevel > 0 ? ` (+P${gameState.paragonLevel}/50)` : ''}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('goldCoin', 13)} Total Gold Earned</span><span class="global-stat-value">${gameState.totalGoldGained.toLocaleString()}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('questScroll', 13)} Quests Completed</span><span class="global-stat-value">${questLog.totalQuestsCompleted}</span></div>`;
        html += `</div>`;

        // ── Dungeons ──
        html += `<div class="global-stats-section">`;
        html += `<div class="global-stats-section-title">🏰 Dungeons</div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">Total Dungeons Cleared</span><span class="global-stat-value highlight">${dungeonSystem.totalClears}</span></div>`;
        // Per-dungeon breakdown
        for (const dDef of DUNGEON_DEFS) {
            const stats = dungeonSystem.getDungeonStats(dDef.id);
            if (stats.clears > 0) {
                const bestStr = stats.bestTime < Infinity ? this._formatPlayTime(stats.bestTime) : '—';
                html += `<div class="global-stat-row"><span class="global-stat-label" style="padding-left:12px;">🔹 ${dDef.name}</span><span class="global-stat-value">${stats.clears} clears · Best: ${bestStr}</span></div>`;
            }
        }
        if (dungeonSystem.totalClears === 0) {
            html += `<div class="global-stat-row"><span class="global-stat-label" style="color:#555;font-style:italic;">No dungeons cleared yet</span><span class="global-stat-value"></span></div>`;
        }
        html += `</div>`;

        // ── Combat Stats ──
        html += `<div class="global-stats-section">`;
        html += `<div class="global-stats-section-title">${iconImg('sword', 14)} Combat</div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">Total Kills</span><span class="global-stat-value highlight">${totalKills.toLocaleString()}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('crit', 13)} Critical Hits</span><span class="global-stat-value">${(gameState.totalCrits || 0).toLocaleString()}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">☠️ Deaths</span><span class="global-stat-value">${(gameState.totalDeaths || 0).toLocaleString()}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('lightning', 13)} Skills Used</span><span class="global-stat-value">${(gameState.totalSkillsUsed || 0).toLocaleString()}</span></div>`;
        html += `<div class="global-stat-row"><span class="global-stat-label">${iconImg('mapPin', 13)} Distance Traveled</span><span class="global-stat-value">${Math.floor(gameState.totalDistanceTraveled || 0).toLocaleString()}m</span></div>`;
        html += `</div>`;

        // ── Kill Bestiary — grouped by zone ──
        html += `<div class="global-stats-section">`;
        html += `<div class="global-stats-section-title">📖 Bestiary — Kills by Zone</div>`;

        for (const zone of CONFIG.ZONES) {
            const zoneKills = gameState.mobsKilledByZone?.[zone.id] || 0;
            const mobEntries = zone.mobTypes.map(mt => ({
                name: mt.name,
                count: kills[mt.name] || 0,
            }));
            const hasAnyKills = zoneKills > 0 || mobEntries.some(m => m.count > 0);

            html += `<div class="global-zone-group">`;
            html += `<div class="global-zone-header" style="border-left-color:${zone.color};">`;
            html += `<span class="zone-dot" style="background:${zone.color};"></span>`;
            html += `<span style="color:${zone.color};flex:1;">${zone.icon} ${zone.name}</span>`;
            html += `<span style="font-size:10px;color:#88aa77;font-family:'Inter',sans-serif;">${zoneKills.toLocaleString()} total</span>`;
            html += `</div>`;

            if (hasAnyKills) {
                for (const mob of mobEntries) {
                    const countClass = mob.count === 0 ? 'zero' : '';
                    html += `<div class="global-mob-row">`;
                    html += `<span class="global-mob-name">${mob.name}</span>`;
                    html += `<span class="global-mob-count ${countClass}">${mob.count.toLocaleString()}</span>`;
                    html += `</div>`;
                }
            } else {
                html += `<div class="global-mob-row"><span class="global-mob-name" style="color:#444;font-style:italic;">No kills recorded</span><span></span></div>`;
            }
            html += `</div>`;
        }

        html += `</div>`; // close bestiary section
        html += `</div>`; // close container
        return html;
    }

    showMasteryToast(mobName, companionDef) {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;

        audioManager.playAchievement('rare');

        const toast = document.createElement('div');
        toast.className = 'hero-toast';
        toast.innerHTML = `
            <div class="quest-toast-inner" style="border-color: #44ffaa; box-shadow: 0 0 25px rgba(60,255,160,0.2);">
                <div class="quest-toast-label" style="color: #44ffaa;">★ NEW MASTERY UNLOCKED ★</div>
                <div class="quest-toast-name">${mobName}</div>
                <div class="quest-toast-rewards" style="color: #aaeebb;">
                    Companion Unlocked! Summon from the Bestiary.
                </div>
            </div>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    showAchievementToast(def) {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        audioManager.playAchievement(def.tier);
        if (window._spawnAchievementVFX) window._spawnAchievementVFX();
        
        const toast = document.createElement('div');
        toast.className = 'hero-toast';
        
        const tierColor = def.tier === 'legendary' ? '#ff6644' : def.tier === 'epic' ? '#cc88ff' : '#ffdd44';
        
        let html = `<div class="quest-toast-inner" style="border-color:${tierColor}; box-shadow: 0 0 30px ${tierColor}40;">`;
        html += `<div class="quest-toast-label" style="color:${tierColor};">🏆 Achievement Unlocked</div>`;
        html += `<div class="quest-toast-name">${def.title}</div>`;
        html += `<div class="quest-toast-rewards">`;
        if (def.reward.xp) html += `<span style="margin-right:8px;">${iconImg('xpStar', 14)} ${def.reward.xp} XP</span>`;
        if (def.reward.gold) html += `<span>${iconImg('goldCoin', 14)} ${def.reward.gold}g</span>`;
        html += `</div></div>`;
        
        toast.innerHTML = html;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);

        // Rare/Epic/Legendary announcements
        if (def.tier === 'epic' || def.tier === 'legendary') {
            const tierName = def.tier.toUpperCase();
            gameState.addChatMessage('Game', 'World', `✨ [System]: Player ${gameState.playerName} unlocked ${tierName} Achievement: [${def.title}]!`);
        }
    }

    /* ────── Talent Tree Panel ────── */
    setupTalentPanel() {
        // Talent panel open/close/reset handled by _setupEventListeners → toggleTalentPanel()
    }

    renderTalentTree() {
        const branchContainer = document.getElementById('talent-branches');
        const summaryEl = document.getElementById('talent-summary');
        if (!branchContainer) return;

        // Update points display
        const avail = talentTree.getAvailablePoints();
        const spent = talentTree.getSpentPoints();
        const total = talentTree.getTotalPoints();
        const availEl = document.getElementById('talent-avail');
        if (availEl) {
            availEl.textContent = avail;
            availEl.classList.toggle('none', avail === 0);
        }
        const spentEl = document.getElementById('talent-spent');
        if (spentEl) spentEl.textContent = spent;
        const totalEl = document.getElementById('talent-total');
        if (totalEl) totalEl.textContent = total;

        // Render summary bar of active bonuses
        this.renderTalentSummary(summaryEl);

        // Render branches
        let html = '';
        const branches = talentTree.getAvailableBranches();
        for (const branch of branches) {
            const branchSpent = talentTree.getSpentInBranch(branch.id);
            const maxPoints = talentTree.getMaxInBranch(branch.id);
            const isOpen = this._talentBranchOpen[branch.id] !== false;

            html += `<div class="talent-branch" style="border-color:${branch.colorDark}">`;
            html += `<div class="talent-branch-header" data-branch-toggle="${branch.id}">`;
            html += `<div class="talent-branch-icon" style="border-color:${branch.color};background:${branch.colorDark}">`;
            html += `${iconImgLg(branch.iconKey, 28)}`;
            html += `</div>`;
            html += `<div class="talent-branch-info">`;
            html += `<div class="talent-branch-name" style="color:${branch.color}">${branch.name}</div>`;
            html += `<div class="talent-branch-subtitle">${branch.subtitle}</div>`;
            html += `</div>`;
            html += `<div class="talent-branch-points" style="color:${branchSpent > 0 ? branch.color : '#667766'}">${branchSpent}/${maxPoints}</div>`;
            html += `<div class="talent-branch-toggle ${isOpen ? '' : 'collapsed'}">▼</div>`;
            html += `</div>`;

            html += `<div class="talent-branch-body ${isOpen ? '' : 'collapsed'}" id="talent-branch-body-${branch.id}">`;
            html += `<div class="talent-branch-desc">${branch.description}</div>`;

            // ── Iterate TIERS (5-tier deep structure) ──
            for (const tier of branch.tiers) {
                const tierUnlocked = branchSpent >= tier.pointsRequired;
                const tierLabelText = tier.name || 'Tier';
                const tierReqText = tier.pointsRequired > 0 ? `(requires ${tier.pointsRequired} pts in ${branch.name})` : '(available immediately)';
                const tierColor = tierUnlocked ? branch.color : '#556666';
                const tierGateClass = tierUnlocked ? 'met' : '';

                // Tier header with name
                html += `<div style="display:flex;align-items:center;gap:8px;margin:10px 0 6px;padding:4px 8px;border-bottom:1px solid ${tierUnlocked ? branch.color : 'rgba(100,100,120,0.2)'}33;">`;
                html += `<span style="font-family:'Cinzel',serif;font-size:11px;color:${tierColor};text-transform:uppercase;letter-spacing:1px;">${tierLabelText}</span>`;
                html += `<span class="talent-node-req ${tierGateClass}" style="font-size:9px;margin:0;">${tierReqText}</span>`;
                html += `</div>`;

                html += `<div class="talent-nodes">`;
                for (const node of tier.nodes) {
                    const rank = talentTree.getNodeRank(node.id);
                    const canAlloc = talentTree.canAllocate(node.id);
                    const isMaxed = rank >= node.maxRank;
                    const isAllocated = rank > 0;
                    const isLocked = branchSpent < tier.pointsRequired && !isAllocated;

                    let nodeClass = 'talent-node';
                    if (isMaxed) nodeClass += ' maxed';
                    else if (isAllocated) nodeClass += ' allocated';
                    if (isLocked && !isAllocated) nodeClass += ' locked';
                    else if (canAlloc) nodeClass += ' can-allocate';

                    const rankClass = isMaxed ? 'talent-node-rank full' : 'talent-node-rank';
                    const nameColor = isAllocated ? branch.color : (isLocked ? '#556666' : '#bbccaa');

                    // Rank pips
                    let pipsHtml = '<div class="talent-pips">';
                    for (let p = 0; p < node.maxRank; p++) {
                        const filled = p < rank;
                        pipsHtml += `<div class="talent-pip ${filled ? 'filled' : ''} ${filled && isMaxed ? 'maxed' : ''}"></div>`;
                    }
                    pipsHtml += '</div>';

                    // Requirement text
                    let reqHtml = '';
                    if (isLocked && !isAllocated) {
                        reqHtml = `<div class="talent-node-req">Requires ${tier.pointsRequired} points in ${branch.name}</div>`;
                    }

                    html += `<div class="${nodeClass}" data-node-id="${node.id}" data-branch-id="${branch.id}">`;
                    html += `<div class="talent-node-top">`;
                    html += `<div class="talent-node-name" style="color:${nameColor}">${node.name}</div>`;
                    html += `<div class="${rankClass}" style="${isMaxed ? '' : isAllocated ? `color:${branch.color}` : 'color:#778899'}">${rank}/${node.maxRank}</div>`;
                    html += `</div>`;
                    html += `<div class="talent-node-desc">${node.description}</div>`;
                    html += pipsHtml;
                    html += reqHtml;
                    html += `</div>`;
                }
                html += `</div>`;

                // ── Show ability unlock milestones after tier nodes ──
                for (const abilId of branch.abilities) {
                    const abil = TALENT_ABILITIES[abilId];
                    if (!abil) continue;
                    // Show ability unlock banner in the tier where the threshold falls
                    const tierIdx = branch.tiers.indexOf(tier);
                    const nextTierReq = tierIdx + 1 < branch.tiers.length ? branch.tiers[tierIdx + 1].pointsRequired : 999;
                    // The ability banner shows after the tier where spending enough points is first possible
                    if (abil.unlockReq > tier.pointsRequired && abil.unlockReq <= nextTierReq) {
                        const isUnlocked = branchSpent >= abil.unlockReq;
                        const abilColor = isUnlocked ? abil.nameColor : '#667788';
                        const lockIcon = isUnlocked ? '✨' : '🔒';
                        html += `<div style="display:flex;align-items:center;gap:8px;margin:6px 0 4px;padding:6px 10px;border-radius:4px;background:${isUnlocked ? 'rgba(255,220,80,0.06)' : 'rgba(0,0,0,0.15)'};border:1px solid ${isUnlocked ? abil.nameColor + '40' : 'rgba(100,100,120,0.15)'};">`;
                        html += `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border-radius:4px;position:relative;">`;
                        html += `${iconImg(abil.iconKey, 20, isUnlocked ? '' : 'filter:grayscale(1) opacity(0.4);')}`;
                        html += `<span style="position:absolute;bottom:-4px;right:-4px;font-size:10px;">${lockIcon}</span>`;
                        html += `</div>`;
                        html += `<div style="flex:1;">`;
                        html += `<div style="font-family:'Cinzel',serif;font-size:11px;color:${abilColor};text-shadow:1px 1px 2px rgba(0,0,0,0.6);">Ability: ${abil.name}</div>`;
                        html += `<div style="font-family:'Inter',sans-serif;font-size:9px;color:#889999;">${abil.description}</div>`;
                        html += `</div>`;
                        html += `<span style="font-family:'Inter',sans-serif;font-size:10px;color:${isUnlocked ? '#66dd88' : '#cc8855'};font-weight:600;">${isUnlocked ? '✓ Unlocked' : `${abil.unlockReq} pts`}</span>`;
                        html += `</div>`;
                    }
                }
            }

            html += `</div></div>`;
        }
        branchContainer.innerHTML = html;

        // Wire branch toggle
        branchContainer.querySelectorAll('[data-branch-toggle]').forEach(el => {
            el.addEventListener('click', () => {
                const bid = el.getAttribute('data-branch-toggle');
                this._talentBranchOpen[bid] = !this._talentBranchOpen[bid];
                this.renderTalentTree();
            });
        });

        // Wire node clicks — left click = allocate, right click = deallocate
        branchContainer.querySelectorAll('.talent-node').forEach(el => {
            el.addEventListener('click', (e) => {
                const nodeId = el.getAttribute('data-node-id');
                if (talentTree.canAllocate(nodeId)) {
                    talentTree.allocate(nodeId);
                    this.renderTalentTree();
                    this._refreshTalentBar();
                }
            });
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const nodeId = el.getAttribute('data-node-id');
                if (talentTree.deallocate(nodeId)) {
                    this.renderTalentTree();
                    this._refreshTalentBar();
                }
            });
        });
    }

    renderTalentSummary(el) {
        if (!el) return;
        const b = talentTree.bonuses;
        const stats = [];
        if (b.dpsPercent > 0) stats.push({ label: 'DPS', val: `+${Math.round(b.dpsPercent * 100)}%`, icon: 'sword' });
        if (b.critChance > 0) stats.push({ label: 'Crit', val: `+${Math.round(b.critChance * 100)}%`, icon: 'crit' });
        if (b.critDamage > 0) stats.push({ label: 'CritDmg', val: `+${Math.round(b.critDamage * 100)}%`, icon: 'lightning' });
        if (b.attackSpeed > 0) stats.push({ label: 'AtkSpd', val: `+${Math.round(b.attackSpeed * 100)}%`, icon: 'sword' });
        if (b.hpPercent > 0) stats.push({ label: 'HP', val: `+${Math.round(b.hpPercent * 100)}%`, icon: 'heart' });
        if (b.armorPercent > 0) stats.push({ label: 'Armor', val: `+${Math.round(b.armorPercent * 100)}%`, icon: 'shield' });
        if (b.regenPercent > 0) stats.push({ label: 'Regen', val: `+${Math.round(b.regenPercent * 100)}%`, icon: 'heart' });
        if (b.manaPercent > 0) stats.push({ label: 'Mana', val: `+${Math.round(b.manaPercent * 100)}%`, icon: 'crystal' });
        if (b.manaRegenPercent > 0) stats.push({ label: 'ManaReg', val: `+${Math.round(b.manaRegenPercent * 100)}%`, icon: 'crystal' });
        if (b.skillDamagePercent > 0) stats.push({ label: 'SkillDmg', val: `+${Math.round(b.skillDamagePercent * 100)}%`, icon: 'sparkle' });
        if (b.cooldownReduction > 0) stats.push({ label: 'CDR', val: `-${Math.round(b.cooldownReduction * 100)}%`, icon: 'lightning' });
        if (b.killHealPercent > 0) stats.push({ label: 'KillHeal', val: `+${Math.round(b.killHealPercent * 100)}%`, icon: 'heart' });
        if (b.killManaPercent > 0) stats.push({ label: 'KillMana', val: `+${Math.round(b.killManaPercent * 100)}%`, icon: 'crystal' });
        if (b.buffDurationPercent > 0) stats.push({ label: 'BuffDur', val: `+${Math.round(b.buffDurationPercent * 100)}%`, icon: 'sparkle' });

        if (stats.length === 0) {
            el.innerHTML = `<div class="talent-summary-stat" style="color:#667766;font-style:italic;">No talent bonuses yet — allocate points to power up!</div>`;
        } else {
            el.innerHTML = stats.map(s =>
                `<div class="talent-summary-stat">${iconImg(s.icon, 11)} ${s.label}: <span class="talent-summary-val">${s.val}</span></div>`
            ).join('');
        }
    }

    updateTalentBadge() {
        const badge = this._dom.talentBtnBadge;
        if (!badge) return;
        const avail = talentTree.getAvailablePoints();
        if (avail > 0) {
            badge.style.display = 'inline';
            badge.textContent = `(${avail})`;
        } else {
            badge.style.display = 'none';
        }
    }

    updateBagFullBadge() {
        const d = this._dom;
        if (!d.bagFullBadge || !d.invToggleBtn) return;
        const isFull = inventory.items.length >= inventory.maxSlots;
        if (isFull !== this._wasBagFull) {
            this._wasBagFull = isFull;
            d.bagFullBadge.style.display = isFull ? 'inline-flex' : 'none';
            d.invToggleBtn.classList.toggle('bag-full-glow', isFull);
        }
    }

    /* ────── NEW Content Badges (Zones & Dungeons) ────── */
    updateNewContentBadges() {
        const d = this._dom;

        // ── Zone NEW badge ──
        if (d.zoneNewBadge && d.zoneBtn) {
            const accessibleZones = CONFIG.ZONES.filter(z => gameState.canAccessZone(z.id)).length;
            const hasNew = accessibleZones > gameState.seenZoneCount;
            const wasNew = d.zoneNewBadge.classList.contains('visible');
            if (hasNew !== wasNew) {
                d.zoneNewBadge.classList.toggle('visible', hasNew);
                d.zoneBtn.classList.toggle('has-new-content', hasNew);
            }
        }

        // ── Dungeon NEW badge ──
        if (d.dungeonNewBadge && d.dungeonBtn) {
            const accessibleDungeons = DUNGEON_DEFS.filter(dd =>
                gameState.canAccessZone(dd.unlockZone) && gameState.level >= dd.levelRange[0]
            ).length;
            const hasNew = accessibleDungeons > gameState.seenDungeonCount;
            const wasNew = d.dungeonNewBadge.classList.contains('visible');
            if (hasNew !== wasNew) {
                d.dungeonNewBadge.classList.toggle('visible', hasNew);
                d.dungeonBtn.classList.toggle('has-new-content', hasNew);
            }
        }
    }

    /* ────── Upgrade Station Panel ────── */
    setupUpgradePanel() {
        // Upgrade panel open/close handled by _setupEventListeners → toggleUpgradePanel()
    }

    renderUpgradeStation() {
        const slotsContainer = document.getElementById('upgrade-slots');
        const detailEl = document.getElementById('upgrade-detail');
        const statsEl = document.getElementById('upgrade-stats-summary');
        if (!slotsContainer) return;

        // Update currency display in header
        const goldEl = document.getElementById('upgrade-gold');
        const dblEl = document.getElementById('upgrade-aetherbit');
        if (goldEl) goldEl.textContent = gameState.formatGold(gameState.gold);
        if (dblEl) dblEl.textContent = gameState.karma;

        // Render equipment slot cards
        const slotOrder = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
        const slotLabels = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', legs: 'Legs', boots: 'Boots', ring: 'Ring', trinket: 'Trinket' };
        const emptyIconKeys = { weapon: 'sword', helm: 'helm', chest: 'chestArmor', legs: 'legsArmor', boots: 'boots', ring: 'ring', trinket: 'karmaOrb' };

        let html = '';
        for (const slot of slotOrder) {
            const item = inventory.equipped[slot];
            const isSelected = this._upgradeSelectedSlot === slot;

            if (item) {
                const tierLabel = upgradeStation.getTierLabel(item);
                const tierColor = upgradeStation.getTierColor(item) || '#889977';
                const currentTier = item.upgradeTier || 0;
                const isMaxed = currentTier >= MAX_UPGRADE_TIER;
                const primaryStat = item.dps ? `+${item.dps} DPS` : item.armor ? `+${item.armor} Armor` : item.bonus ? `+${item.bonus} Bonus` : '';

                html += `<div class="upgrade-slot-card${isSelected ? ' selected' : ''}" data-upgrade-slot="${slot}">`;
                html += `<div class="upgrade-slot-icon" style="border-color:${item.rarity.color}40">${item.icon}</div>`;
                html += `<div class="upgrade-slot-info">`;
                html += `<div class="upgrade-slot-name" style="color:${item.rarity.color}">${this.escapeHtml(item.name)}</div>`;
                html += `<div class="upgrade-slot-stat">${primaryStat}${item.bonusStat ? ` · +${item.bonusStatValue} ${item.bonusStat}` : ''}</div>`;
                html += `</div>`;
                html += `<div class="upgrade-slot-tier" style="color:${tierColor}">${tierLabel || '—'}</div>`;
                html += `</div>`;
            } else {
                html += `<div class="upgrade-slot-card empty">`;
                html += `<div class="upgrade-slot-icon">${iconImgLg(emptyIconKeys[slot], 20, 'opacity:0.4;')}</div>`;
                html += `<div class="upgrade-slot-info">`;
                html += `<div class="upgrade-slot-type">${slotLabels[slot]}</div>`;
                html += `<div class="upgrade-slot-stat" style="color:#555">Empty</div>`;
                html += `</div>`;
                html += `</div>`;
            }
        }
        slotsContainer.innerHTML = html;

        // Wire slot card click handlers
        slotsContainer.querySelectorAll('.upgrade-slot-card:not(.empty)').forEach(el => {
            el.addEventListener('click', () => {
                const slot = el.getAttribute('data-upgrade-slot');
                this._upgradeSelectedSlot = (this._upgradeSelectedSlot === slot) ? null : slot;
                this.renderUpgradeStation();
            });
        });

        // Render detail section if a slot is selected
        if (this._upgradeSelectedSlot) {
            const item = inventory.equipped[this._upgradeSelectedSlot];
            if (item) {
                detailEl.style.display = 'block';
                this.renderUpgradeDetail(item, this._upgradeSelectedSlot);
            } else {
                detailEl.style.display = 'none';
                this._upgradeSelectedSlot = null;
            }
        } else {
            detailEl.style.display = 'none';
        }

        // Render stats summary
        if (statsEl) {
            const s = upgradeStation;
            let sh = '';
            sh += `<div class="upg-stats-row"><span>Total Attempts</span><span class="upg-stats-val">${s.totalUpgradesAttempted}</span></div>`;
            sh += `<div class="upg-stats-row"><span>Successes</span><span class="upg-stats-val">${s.totalUpgradesSucceeded}</span></div>`;
            sh += `<div class="upg-stats-row"><span>Gold Spent</span><span class="upg-stats-val">${gameState.formatGold(s.totalGoldSpent)}g</span></div>`;
            sh += `<div class="upg-stats-row"><span>Aetherbits Spent</span><span class="upg-stats-val">${s.totalAetherbitsSpent}</span></div>`;
            statsEl.innerHTML = sh;
        }
    }

    renderUpgradeDetail(item, slotKey) {
        const detailEl = document.getElementById('upgrade-detail');
        if (!detailEl) return;

        const currentTier = item.upgradeTier || 0;
        const isMaxed = currentTier >= MAX_UPGRADE_TIER;
        const nextTierDef = upgradeStation.getNextTier(item);
        const currentTierDef = upgradeStation.getCurrentTier(item);
        const tierLabel = upgradeStation.getTierLabel(item) || 'Base';
        const tierColor = upgradeStation.getTierColor(item) || '#aabb99';

        let html = '';
        // Item header
        html += `<div class="upg-detail-top">`;
        html += `<div class="upg-detail-item-icon" style="border-color:${item.rarity.color}50">${iconImgLg(item.iconKey, 32)}</div>`;
        html += `<div class="upg-detail-item-info">`;
        html += `<div class="upg-detail-item-name" style="color:${item.rarity.color}">${this.escapeHtml(item.name)}</div>`;
        html += `<div class="upg-detail-item-tier" style="color:${tierColor}">${tierLabel} ${isMaxed ? '(MAX)' : ''}</div>`;
        html += `</div></div>`;

        if (isMaxed) {
            // Max tier reached — show congratulations
            html += `<div style="text-align:center;padding:12px 0;">`;
            html += `<div style="font-family:'Cinzel',serif;font-size:16px;color:#cc88ff;text-shadow:0 0 10px rgba(180,100,255,0.4);margin-bottom:4px;">✦ Fully Enhanced ✦</div>`;
            html += `<div style="font-family:'Inter',sans-serif;font-size:11px;color:#9988aa;">This item has reached maximum enhancement tier.</div>`;
            html += `</div>`;
            html += `<button class="upg-enhance-btn maxed">Maximum Enhancement</button>`;
        } else {
            // Show current → next tier preview
            const primaryBase = item._baseDps ?? item._baseArmor ?? item._baseBonus ?? null;
            const primaryLabel = item._baseDps != null || item.dps ? 'DPS' : item._baseArmor != null || item.armor ? 'Armor' : 'Bonus';
            const currentStatVal = item.dps || item.armor || item.bonus || 0;
            const nextMult = nextTierDef.statMult;
            const baseStat = item._baseDps ?? item._baseArmor ?? item._baseBonus ?? currentStatVal;
            const nextStatVal = Math.max(1, Math.round(baseStat * nextMult));

            html += `<div class="upg-detail-arrow">`;
            html += `<span class="from">${tierLabel || 'Base'} (+${currentStatVal} ${primaryLabel})</span>`;
            html += `<span class="arrow">→</span>`;
            html += `<span class="to" style="color:${nextTierDef.color}">${nextTierDef.label} (+${nextStatVal} ${primaryLabel})</span>`;
            html += `</div>`;

            // Cost display
            const canAffordGold = gameState.gold >= nextTierDef.goldCost;
            const canAffordAeth = gameState.karma >= nextTierDef.aetherbitCost;

            html += `<div class="upg-detail-cost">`;
            html += `<span style="font-family:'Inter',sans-serif;font-size:11px;color:#889977;">Cost:</span>`;
            html += `<div class="upg-cost-item ${canAffordGold ? 'affordable' : 'expensive'}">${iconImg('goldCoin', 14)} ${nextTierDef.goldCost}g</div>`;
            html += `<div class="upg-cost-item ${canAffordAeth ? 'affordable' : 'expensive'}">${iconImg('aetherbit', 14)} ${nextTierDef.aetherbitCost}</div>`;
            html += `</div>`;

            // Success rate
            const ratePct = Math.round(nextTierDef.successRate * 100);
            let rateClass = 'safe';
            if (ratePct < 70) rateClass = 'danger';
            else if (ratePct < 90) rateClass = 'risky';

            html += `<div class="upg-detail-chance">`;
            html += `${iconImg('upgradeStar', 14)} Success Rate: <span class="rate ${rateClass}">${ratePct}%</span>`;
            if (ratePct < 100) html += ` <span style="font-size:10px;color:#887766;">(failure consumes materials)</span>`;
            html += `</div>`;

            // Enhance button
            const canAfford = canAffordGold && canAffordAeth;
            html += `<button class="upg-enhance-btn${canAfford ? '' : ' disabled'}" id="enhance-go-btn">${canAfford ? `${iconImg('upgradeAnvil', 16)} Enhance to ${nextTierDef.label}` : 'Insufficient Materials'}</button>`;
        }

        // Result toast placeholder
        html += `<div id="upgrade-result-area"></div>`;

        detailEl.innerHTML = html;

        // Wire enhance button
        const enhBtn = document.getElementById('enhance-go-btn');
        if (enhBtn && !isMaxed) {
            enhBtn.addEventListener('click', () => {
                if (enhBtn.classList.contains('disabled')) return;
                this.doEnhance(slotKey);
            });
        }
    }

    doEnhance(slotKey) {
        const result = upgradeStation.attemptUpgrade(slotKey);
        
        // Show result toast
        const area = document.getElementById('upgrade-result-area');
        if (area) {
            // Clear any existing toast
            if (this._upgradeResultTimer) clearTimeout(this._upgradeResultTimer);
            
            const toast = document.createElement('div');
            if (result.success) {
                toast.className = 'upg-result-toast success';
                toast.innerHTML = `${iconImg('upgradeStar', 14)} Enhancement Success! → ${result.label}`;
            } else if (result.failed) {
                toast.className = 'upg-result-toast fail';
                toast.innerHTML = `✗ Enhancement Failed — materials consumed`;
            } else {
                toast.className = 'upg-result-toast fail';
                toast.textContent = result.reason;
            }
            area.innerHTML = '';
            area.appendChild(toast);
            
            this._upgradeResultTimer = setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 3000);
        }

        // Re-render the station to show updated stats/costs
        // Small delay for the visual "beat" of the result
        setTimeout(() => this.renderUpgradeStation(), 150);
    }

    startDamageNumberSystem() {
        this.lastMobsKilled = 0;
    }

    showDamageNumber(x, y, amount, isCrit = false) {
        const el = document.createElement('div');
        el.className = 'dmg-number' + (isCrit ? ' crit' : '');
        el.textContent = isCrit ? `${amount}!` : amount;
        el.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
        el.style.top = y + 'px';
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }

    showLevelUp() {
        const lu = document.getElementById('level-up-notification');
        if (!lu) return;
        const luLevel = document.getElementById('lu-level');
        if (luLevel) luLevel.textContent = gameState.level;

        // Check if a skill unlocks at this level
        const unlockText = document.getElementById('skill-unlock-text');
        const newSkill = CONFIG.SKILLS.find(s => s.unlockLevel === gameState.level);
        let unlockHtml = '';
        if (newSkill) {
            unlockHtml += `<span style="color:${newSkill.nameColor}">⚔ New Ability: ${newSkill.name}</span>`;
        }
        if (gameState.level >= 2) {
            unlockHtml += `<br><span style="color:#ffdd44">★ +1 Talent Point Available</span>`;
        }
        if (unlockText) unlockText.innerHTML = unlockHtml;

        lu.classList.remove('visible');
        void lu.offsetWidth;
        lu.classList.add('visible');
        setTimeout(() => lu.classList.remove('visible'), 3000);
    }

    /* ────── Dynamic skill unlock/lock refresh ────── */
    refreshSkillSlots(force = false) {
        const skills = gameState.getSkills();
        for (let i = 0; i < skills.length; i++) {
            const unlocked = gameState.isSkillUnlocked(i);
            const wasUnlocked = this._skillUnlockStates[i];
            
            if (!force && unlocked === wasUnlocked) continue;

            this._skillUnlockStates[i] = unlocked;
            const el = document.getElementById(`skill-${i}`);
            if (!el) continue;

            if (unlocked) {
                el.classList.remove('locked');
                // Remove lock overlay if it exists
                const lockOverlay = el.querySelector('.skill-lock-overlay');
                if (lockOverlay) lockOverlay.remove();
            } else {
                el.classList.add('locked');
                // Ensure lock overlay exists if it should
                if (!el.querySelector('.skill-lock-overlay')) {
                    const skill = skills[i];
                    const overlay = document.createElement('div');
                    overlay.className = 'skill-lock-overlay';
                    overlay.id = `skill-lock-${i}`;
                    overlay.innerHTML = `${iconImg('lock', 16, 'opacity:0.6;')}<span class="skill-lock-level">Lv ${skill.unlockLevel}</span>`;
                    el.appendChild(overlay);
                }
            }
        }
    }

    updateMinimap(playerPos, mobs, worldPickups) {
        // Cache canvas/ctx references to avoid DOM lookup every tick
        if (!this._minimapCanvas) {
            this._minimapCanvas = document.getElementById('minimap-canvas');
            if (!this._minimapCanvas) return;
            this._minimapCtx = this._minimapCanvas.getContext('2d');
        }
        const canvas = this._minimapCanvas;
        if (!canvas) return;
        const ctx = this._minimapCtx;
        const w = canvas.width;
        const h = canvas.height;
        const scale = 2.0;
        
        // Zone-aware minimap colors
        const zone = gameState.getCurrentZone();
        const isIcy = zone.id === 'shattered_expanse';
        const bgColor = isIcy ? '#0a0f1e' : '#0a1a0a';
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
        
        // Draw quest-relevant world pickups as pulsing diamonds
        if (worldPickups) {
            const pickupDots = worldPickups.getQuestPickupPositions();
            const pulseAlpha = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;
            for (let i = 0; i < pickupDots.length; i++) {
                const pd = pickupDots[i];
                const px = w / 2 + (pd.x - playerPos.x) * scale;
                const py = h / 2 + (pd.z - playerPos.z) * scale;
                if (px < 0 || px > w || py < 0 || py > h) continue;
                const r = (pd.color >> 16) & 0xff;
                const g = (pd.color >> 8) & 0xff;
                const b = pd.color & 0xff;
                ctx.fillStyle = `rgba(${r},${g},${b},${pulseAlpha})`;
                ctx.beginPath();
                ctx.moveTo(px, py - 4);
                ctx.lineTo(px + 3, py);
                ctx.lineTo(px, py + 4);
                ctx.lineTo(px - 3, py);
                ctx.closePath();
                ctx.fill();
            }
        }
        
        if (mobs) {
            for (let i = 0; i < mobs.length; i++) {
                const mob = mobs[i];
                if (!mob.alive) continue;
                const mx = w / 2 + (mob.x - playerPos.x) * scale;
                const my = h / 2 + (mob.z - playerPos.z) * scale;
                if (mx < 0 || mx > w || my < 0 || my > h) continue;

                if (mob.isBoss) {
                    const bossPulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
                    ctx.fillStyle = `rgba(255,200,60,${bossPulse})`;
                    ctx.beginPath();
                    ctx.arc(mx, my, 6, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = mob.inCombat ? '#ff4444' : '#cc6644';
                    ctx.beginPath();
                    ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Player arrow
        ctx.fillStyle = '#44ccff';
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2 - 5);
        ctx.lineTo(w / 2 - 4, h / 2 + 4);
        ctx.lineTo(w / 2 + 4, h / 2 + 4);
        ctx.closePath();
        ctx.fill();
        
        // Circle masking
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.strokeStyle = isIcy ? 'rgba(100,140,200,0.15)' : 'rgba(180,160,60,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    update(playerPos, mobs, worldPickups) {
        const d = this._dom;
        if (!d) return; // DOM not cached yet

        // Inventory — only re-render when version changes & panel open
        this._lastInvVersion = this._lastInvVersion || 0;
        if (this.invOpen && inventory.version !== this._lastInvVersion) {
             this._lastInvVersion = inventory.version;
             this.renderInventory();
        }

        // Nameplate
        if (d.npText) d.npText.textContent = `${gameState.playerName} - Lvl ${gameState.level}${CONFIG.PLAYER_CLASS ? ' ' + CONFIG.PLAYER_CLASS : ''}`;
        if (d.npHp) d.npHp.style.width = `${(gameState.hp / gameState.maxHp) * 100}%`;
        if (d.npMana) d.npMana.style.width = `${(gameState.mana / gameState.maxMana) * 100}%`;
        
        // Target plate (with boss styling)
        if (d.targetPlate) {
            if (gameState.currentTarget && gameState.currentTarget.alive) {
                d.targetPlate.classList.add('visible');
                const target = gameState.currentTarget;
                const isBoss = target.isBoss;
                d.targetPlate.classList.toggle('boss', isBoss);
                if (d.targetName) d.targetName.textContent = `${isBoss ? '☠ ' : ''}${target.mobType.name} - Lvl ${target.level}`;
                if (d.targetHpFill) d.targetHpFill.style.width = `${(target.hp / target.maxHp) * 100}%`;
                if (isBoss && d.bossHpText) d.bossHpText.textContent = `${Math.floor(target.hp)} / ${target.maxHp} HP`;
            } else {
                d.targetPlate.classList.remove('visible');
                d.targetPlate.classList.remove('boss');
            }
        }
        
        // Stats
        if (d.statXphr) d.statXphr.textContent = `${gameState.xpPerHour} XP/hr`;
        if (d.statGpm) d.statGpm.textContent = `${gameState.goldPerMin}g/min`;
        if (d.statGold) d.statGold.textContent = `${gameState.formatGold(gameState.gold)} Gold`;
        if (d.statKarma) d.statKarma.textContent = `${gameState.karma} ${AETHERBIT_NAME}`;
        // Soul Essence stat (show/hide based on unlock, update value)
        if (d.statSoulEssenceRow) {
            const sfUnlocked = soulForge.isUnlocked();
            if (sfUnlocked) {
                d.statSoulEssenceRow.style.display = '';
                if (d.statSoulEssence) d.statSoulEssence.textContent = `${Math.floor(soulForge.soulEssence).toLocaleString()} Soul Essence`;
            } else {
                d.statSoulEssenceRow.style.display = 'none';
            }
        }
        // Raid Points stat (show/hide based on unlock)
        if (d.statRaidPointsRow) {
            const raidUnlocked = raidSystem.isUnlocked();
            if (raidUnlocked) {
                d.statRaidPointsRow.style.display = '';
                if (d.statRaidPoints) d.statRaidPoints.textContent = `${raidVendor.raidPoints.toLocaleString()} Raid Points`;
            } else {
                d.statRaidPointsRow.style.display = 'none';
            }
        }
        // Victory Points stat (show/hide based on PvP unlock)
        if (d.statVpRow) {
            const pvpUnlocked = battlegroundSystem.isUnlocked();
            if (pvpUnlocked) {
                d.statVpRow.style.display = '';
                if (d.statVp) d.statVp.textContent = `${pvpVendor.victoryPoints.toLocaleString()} Victory Points`;
            } else {
                d.statVpRow.style.display = 'none';
            }
        }
        
        // Event
        if (gameState.currentEvent) {
            if (d.eventNameText) d.eventNameText.textContent = `Event: ${gameState.currentEvent.name}`;
            const evtPct = `${gameState.getEventPercent()}%`;
            if (d.eventBarFill) d.eventBarFill.style.width = evtPct;
            if (d.eventProgressText) d.eventProgressText.textContent = evtPct;
            if (d.eventEst) d.eventEst.textContent = `Est. Completion: ${gameState.getEstCompletion()}s`;
        }
        
        // Mana bar
        if (d.manaBarFill) {
            const effectiveMaxMana = gameState.getEffectiveMaxMana();
            const manaPct = (gameState.mana / effectiveMaxMana) * 100;
            d.manaBarFill.style.width = `${manaPct}%`;
            if (d.manaText) d.manaText.textContent = `${Math.floor(gameState.mana)}/${effectiveMaxMana}`;
        }
        
        // Sustain & DPS (show party bonus separately if applicable)
        if (d.sustainValue) d.sustainValue.textContent = `${gameState.sustain}`;
        if (d.dpsValue) {
            const totalDps = gameState.getDPS();
            const partyDps = partySystem.isUnlocked() ? partySystem.getTotalPartyDps() : 0;
            d.dpsValue.textContent = partyDps > 0 ? `${totalDps} (+${partyDps})` : totalDps;
        }
        
        // Health orb
        if (d.healthOrbFill) d.healthOrbFill.style.height = `${(gameState.hp / gameState.maxHp) * 100}%`;
        if (d.healthOrbText) d.healthOrbText.textContent = `${Math.floor(gameState.hp)}`;
        
        // XP bar (skip if paragon XP bar is handling it)
        const isMaxLevel = gameState.level >= CONFIG.MAX_LEVEL;
        const isParagonMode = isMaxLevel && gameState.paragonUnlocked;
        if (!isParagonMode && d.xpBarFill) {
            const xpPct = isMaxLevel ? 100 : (gameState.xpToLevel > 0 ? (gameState.xp / gameState.xpToLevel) * 100 : 0);
            d.xpBarFill.style.width = `${xpPct}%`;
            if (isMaxLevel) {
                if (!d.xpBarFill.classList.contains('max-level') && !d.xpBarFill.classList.contains('paragon-bar')) d.xpBarFill.classList.add('max-level');
            } else {
                d.xpBarFill.classList.remove('max-level');
                d.xpBarFill.classList.remove('paragon-bar');
                d.xpBarFill.style.background = '';
                d.xpBarFill.style.boxShadow = '';
                d.xpBarFill.style.animation = '';
            }
            if (d.xpBarOverlayText) {
                if (isMaxLevel) {
                    d.xpBarOverlayText.textContent = `★ Lv ${gameState.level} — MAX LEVEL ★`;
                    if (d.xpBarOverlayText.parentElement) d.xpBarOverlayText.parentElement.style.opacity = '1';
                } else {
                    const xpFmt = gameState.xp >= 10000 ? (gameState.xp / 1000).toFixed(1) + 'k' : Math.floor(gameState.xp);
                    const xpNeedFmt = gameState.xpToLevel >= 10000 ? (gameState.xpToLevel / 1000).toFixed(1) + 'k' : gameState.xpToLevel;
                    const outleveled = gameState.isCurrentZoneOutleveled();
                    const outleveledTag = outleveled ? '  ⚠ NO XP — Zone Outleveled' : '';
                    d.xpBarOverlayText.textContent = `Lv ${gameState.level}  ·  ${xpFmt} / ${xpNeedFmt} XP  (${xpPct.toFixed(1)}%)${outleveledTag}`;
                    if (d.xpBarOverlayText.parentElement) d.xpBarOverlayText.parentElement.style.opacity = outleveled ? '1' : '';
                }
            }
        }
        
        // Skill cooldowns (cached refs)
        if (this._domSkillCd) {
            for (let i = 0; i < CONFIG.SKILLS.length; i++) {
                const cdEl = this._domSkillCd[i];
                if (cdEl) {
                    if (gameState.skillCooldowns[i] > 0) {
                        cdEl.style.display = 'flex';
                        cdEl.textContent = Math.ceil(gameState.skillCooldowns[i]);
                    } else {
                        cdEl.style.display = 'none';
                    }
                }
            }
        }

        // Dynamic skill unlock refresh
        this.refreshSkillSlots();

        // Party frames (HUD element — render early so it loads with other HUD elements)
        this.updatePartyButton();
        this.updatePartyFrames();
        
        // Chat — only rebuild if messages changed (uses version counter
        // since array length stays constant once capped at 50)
        if (gameState.chatVersion !== this._lastChatVersion) {
            this._lastChatVersion = gameState.chatVersion;
            this.updateChat();
        }
        
        // Level up notification
        if (gameState.level > this.prevLevel) {
            this.showLevelUp();
            this.prevLevel = gameState.level;
        }
        
        // Minimap
        this.updateMinimap(playerPos, mobs, worldPickups);

        // Quest log — only rebuild if quest state changed
        this._updateQuestLogIfDirty();
        this.checkQuestNotifications();

        // Loot popups
        this.checkLootNotifications();

        // Zone unlock checks & boss defeat celebrations
        this.checkZoneUnlocks();
        this.checkBossDefeats();

        // Talent badge is lightweight (just text update)
        this.updateTalentBadge();

        // Bag full warning badge
        this.updateBagFullBadge();

        // NEW content indicators (zones & dungeons)
        this.updateNewContentBadges();

        // Paragon badge & XP bar
        this.updateParagonBadge();
        if (gameState.paragonUnlocked) {
            this.updateParagonXpBar();
        }

        // Party system updates (frames + button already called earlier for fast load)
        this.updatePartyInvitePopup();
        if (this.partyPanelOpen) this.renderPartyPanel();

        // Buff bar (lightweight — only rebuilds if buff count changes)
        this.updateBuffBar();

        // Talent ability cooldowns (lightweight CD text update)
        this._updateTalentCooldowns();

        // Soul Forge button badge + panel live-refresh + action bar cooldowns
        this.updateSoulForgeBtn();
        this._updateSoulForgeCooldowns();
        this._updateSoulForgeBarVisibility();
        if (this.soulForgePanelOpen) this.renderSoulForgePanel();

        // Dungeon button + panel live-refresh
        this.updateDungeonBtn();
        if (this.dungeonPanelOpen) this.renderDungeonPanel();

        // PvP button + panel live-refresh
        this.updatePvpBtn();
        if (this.pvpPanelOpen) this._updatePvpPanelIfDirty();
        this._updatePvpReadyPopup();
        this._updatePvpMiniQueue();

        this._updateDungeonReadyPopup();
        this._updateDungeonMiniQueue();
        this._updateRaidReadyPopup();
        this._updateRaidMiniQueue();

        // Auto-open PvP panel on match completion
        const bgInst = battlegroundSystem.instance;
        if (bgInst) {
            if (bgInst.state === 'complete' && this._lastBgState !== 'complete') {
                this.togglePvpPanel(true);
            }
            this._lastBgState = bgInst.state;
        } else {
            this._lastBgState = null;
        }

        // PvP Vendor button + panel live-refresh
        this.updatePvpVendorBtn();
        if (this.pvpVendorOpen) this._refreshPvpVendorCurrency();

        // Raid button + panel live-refresh
        this.updateRaidBtn();
        if (this.raidPanelOpen) this.renderRaidPanel();

        // Auto-open Raid panel on completion or wipe
        const raidProg = raidSystem.getProgress();
        if (raidProg) {
            const raidState = raidProg.state;
            if ((raidState === 'complete' || raidState === 'failed') && this._lastRaidState !== raidState) {
                this.toggleRaidPanel(true);
            }
            this._lastRaidState = raidState;
        } else {
            this._lastRaidState = null;
        }

        // Raid Vendor button + panel live-refresh
        this.updateRaidVendorBtn();
        if (this.raidVendorOpen) this._refreshRaidVendorCurrency();

        // Companion button visibility + health frame
        this._updateCompanionBtn();
        this._updateCompanionFrame();

        // Dungeon 3D HUD overlay (live update when in dungeon scene)
        this._updateDungeonHud();

        // Open panels: only refresh currency/affordability display while open
        if (this.upgradeOpen) this._refreshUpgradeCurrency();
        if (this.goldShopOpen) this._refreshGoldShopCurrency();
        if (this.aetherbitShopOpen) this._refreshAetherbitShopCurrency();

        // Affordability glow on shop/vendor buttons (throttled internally to ~1s)
        this._updateAffordabilityGlows();
    }

    /** Lightweight currency-only refresh for the upgrade panel header (no innerHTML rebuild) */
    _refreshUpgradeCurrency() {
        const goldEl = document.getElementById('upgrade-gold');
        const dblEl = document.getElementById('upgrade-aetherbit');
        if (goldEl) goldEl.textContent = gameState.formatGold(gameState.gold);
        if (dblEl) dblEl.textContent = gameState.karma;
    }

    /** Only rebuild quest log HTML when objective progress actually changes */
    _updateQuestLogIfDirty() {
        const bgInst = battlegroundSystem.instance;
        const inBG = bgInst && (bgInst.state === 'countdown' || bgInst.state === 'active' || bgInst.state === 'complete');
        
        if (inBG) {
            this.updateQuestLog(); // Force update for BG log
            return;
        }

        const quests = questLog.getActiveQuests();
        // Build a lightweight hash of quest state
        let hash = quests.length + '|' + questLog.totalQuestsCompleted;
        for (const q of quests) {
            for (const o of q.objectives) hash += '|' + o.current;
        }
        if (hash !== this._lastQuestHash) {
            this._lastQuestHash = hash;
            this.updateQuestLog();
        }
    }

    updateChat() {
        const chatBody = this._dom.chatBody;
        if (!chatBody) return;

        // Build a lightweight merged view without allocating new wrapper objects per message.
        // We only need the last ~25 entries total, biased toward recency.
        const chatMsgs = gameState.chatMessages;
        const logMsgs = gameState.gameLog;
        const chatStart = Math.max(0, chatMsgs.length - 25);
        const logStart = Math.max(0, logMsgs.length - 5);

        // Merge by timestamp using two-pointer (no array allocation)
        let ci = chatStart, li = logStart;
        let html = '';
        let count = 0;
        while (count < 25 && (ci < chatMsgs.length || li < logMsgs.length)) {
            let useChat;
            if (ci >= chatMsgs.length) useChat = false;
            else if (li >= logMsgs.length) useChat = true;
            else useChat = chatMsgs[ci].time <= logMsgs[li].time;

            if (useChat) {
                const m = chatMsgs[ci++];
                if (m.channel === 'BG') {
                    // Skip BG channel messages in main chat if they are meant for the top-left log
                    count--; // Don't count toward the 25 limit since we didn't add HTML
                    continue; 
                }
                if (m.channel === 'Boss') {
                    html += `<div class="chat-line chat-line-boss"><span class="chat-channel-boss">[BOSS]</span> <span class="chat-user chat-user-boss">[${this.escapeHtml(m.user)}]</span>: <span class="chat-boss-msg">${this.escapeHtml(m.msg)}</span></div>`;
                } else {
                    const colorStyle = m.color ? `style="color:${m.color}"` : '';
                    html += `<div class="chat-line"><span class="chat-channel-${m.channel.toLowerCase()}" ${colorStyle}>[${m.channel}]</span> <span class="chat-user">[${this.escapeHtml(m.user)}]</span>: ${this.escapeHtml(m.msg)}</div>`;
                }
            } else {
                const m = logMsgs[li++];
                html += `<div class="chat-line"><span class="chat-channel-game">▾ [Game]</span> <span class="chat-system">${this.escapeHtml(m.msg)}</span></div>`;
            }
            count++;
        }

        chatBody.innerHTML = html;
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    updateBGLog(inst, body) {
        if (!inst || !body) return;
        const log = inst.chatLog;
        if (this._lastBGLogLength === log.length) return;
        this._lastBGLogLength = log.length;

        let html = '';
        // Last 30 messages
        const start = Math.max(0, log.length - 30);
        for (let i = start; i < log.length; i++) {
            const m = log[i];
            const timeStr = new Date(m.time * 1000).toISOString().substr(14, 5);
            const isSystem = m.user === 'SYSTEM';
            const userColor = m.color || '#ccaaee';
            
            html += `<div class="bg-log-line">`;
            html += `  <span class="bg-log-time">[${timeStr}]</span>`;
            if (isSystem) {
                html += `  <span class="bg-log-system">${this.escapeHtml(m.msg)}</span>`;
            } else {
                html += `  <span class="bg-log-user" style="color:${userColor}">${this.escapeHtml(m.user)}</span>: `;
                html += `  <span class="bg-log-msg">${this.escapeHtml(m.msg)}</span>`;
            }
            html += `</div>`;
        }
        body.innerHTML = html;
        body.scrollTop = body.scrollHeight;
    }

    updateQuestLog() {
        const bgInst = battlegroundSystem.instance;
        const inBG = bgInst && (bgInst.state === 'countdown' || bgInst.state === 'active' || bgInst.state === 'complete');
        
        const qlTitle = this._dom.qlTitle;
        const qlQuests = this._dom.qlQuests;
        const bgLogContainer = this._dom.bgLogContainer;
        const bgLogBody = this._dom.bgLogBody;
        const countEl = this._dom.qlCount;

        if (inBG) {
            // Battleground Mode: Show Action Log
            qlTitle.innerHTML = `${iconImg('sword', 16)} Battleground Log`;
            qlQuests.style.display = 'none';
            bgLogContainer.style.display = 'flex';
            countEl.style.display = 'none';

            this.updateBGLog(bgInst, bgLogBody);
            return;
        }

        // Overworld Mode: Show Quests
        qlTitle.innerHTML = `${iconImg('questScroll', 16)} Quest Log <span id="ql-count"></span>`;
        // Re-cache countEl since we just replaced innerHTML
        this._dom.qlCount = document.getElementById('ql-count');
        const countElRef = this._dom.qlCount;

        qlQuests.style.display = 'block';
        bgLogContainer.style.display = 'none';
        if (countElRef) countElRef.style.display = 'inline';

        const quests = questLog.getActiveQuests();
        const container = this._dom.qlQuests;
        if (!container) return;

        if (countElRef) countElRef.textContent = `(${quests.length}) — ${questLog.totalQuestsCompleted} done`;

        let html = '';
        for (const q of quests) {
            const allDone = q.objectives.every(o => o.current >= o.target);
            const isBossQuest = q.isBossQuest;
            const qIcon = allDone ? iconImg('checkmark', 14) : (isBossQuest ? '☠' : iconImg('sword', 14));
            const nameColor = isBossQuest ? 'color:#ffcc44;' : '';
            const bossGlow = isBossQuest ? 'border-left:2px solid rgba(255,200,60,0.4);padding-left:8px;' : '';
            html += `<div class="ql-quest" style="${bossGlow}">`;
            html += `  <div class="ql-quest-name" style="${nameColor}">${qIcon} ${this.escapeHtml(q.name)}</div>`;
            html += `  <div class="ql-quest-zone">${q.zone} · ${isBossQuest ? 'Boss quest' : 'Chain quest'}</div>`;
            html += `  <div class="ql-quest-desc">${this.escapeHtml(q.description)}</div>`;

            for (const obj of q.objectives) {
                const pct = Math.min(100, Math.floor((obj.current / obj.target) * 100));
                const done = obj.current >= obj.target;
                const isBossObj = obj.type === 'kill_boss';
                const isKillType = obj.type.startsWith('kill');
                const isCollectType = obj.type.startsWith('collect');
                const barType = done ? 'done' : (isBossObj ? 'kill' : (isKillType ? 'kill' : (isCollectType ? 'collect' : 'gather')));
                const checkIcon = done ? ` ${iconImg('checkmark', 11)}` : '';
                html += `<div class="ql-obj">`;
                html += `  <div class="ql-obj-label"><span>${this.escapeHtml(obj.label)}${checkIcon}</span><span class="ql-obj-count ${done ? 'done' : ''}">${obj.current}/${obj.target}</span></div>`;
                html += `  <div class="ql-obj-bar-bg"><div class="ql-obj-bar-fill ${barType}" style="width:${pct}%"></div></div>`;
                html += `</div>`;
            }

            html += `<div class="ql-rewards">`;
            html += `  <div class="ql-reward-item">${iconImg('xpStar', 13)} ${q.rewards.xp} XP</div>`;
            html += `  <div class="ql-reward-item">${iconImg('goldCoin', 13)} ${q.rewards.gold}g</div>`;
            html += `  <div class="ql-reward-item">${iconImg('aetherbit', 13)} ${q.rewards.karma}</div>`;
            html += `</div></div>`;
        }

        if (quests.length === 0) {
            html = `<div style="padding:10px;color:#667755;font-size:11px;text-align:center;font-family:'Inter',sans-serif;">Waiting for next quest…</div>`;
        }

        container.innerHTML = html;
    }

    checkQuestNotifications() {
        const notifs = questLog.notifications;
        while (this._lastNotifCount < notifs.length) {
            const n = notifs[this._lastNotifCount];
            this._lastNotifCount++;
            if (n.type === 'complete') this.showQuestToast(n.text);
        }
        if (this._lastNotifCount > notifs.length) this._lastNotifCount = notifs.length;
    }

    showQuestToast(text) {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        const nameMatch = text.match(/Quest Complete: (.+?)\s\s/);
        const rewardMatch = text.match(/\((.+)\)/);
        const questName = nameMatch ? nameMatch[1] : text;
        const rewards = rewardMatch ? rewardMatch[1] : '';

        const toast = document.createElement('div');
        toast.className = 'hero-toast';
        toast.innerHTML = `<div class="quest-toast-inner"><div class="quest-toast-label">Quest Complete</div><div class="quest-toast-name">${this.escapeHtml(questName)}</div>${rewards ? `<div class="quest-toast-rewards">${this.escapeHtml(rewards)}</div>` : ''}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    showGearUpgradeToast() {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'hero-toast';
        toast.innerHTML = `
            <div class="quest-toast-inner" style="border-color:#44ff66; box-shadow: 0 0 30px rgba(68,255,102,0.2);">
                <div class="quest-toast-label" style="color:#44ff66;">✦ Gear Enhancement ✦</div>
                <div class="quest-toast-name" style="font-size:16px;">Gear Upgrade Auto Equipped</div>
                <div class="quest-toast-rewards" style="color:#aaccff;">Primary stats have increased!</div>
            </div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    renderInventory() {
        // Update player info badge in header
        const infoEl = document.getElementById('inv-player-info');
        if (infoEl) {
            const classInfo = CLASS_DISPLAY[gameState.classId] || { name: 'Hero', icon: '👤', color: '#fff' };
            infoEl.innerHTML = `
                <span style="color:#bbaa88; font-weight:700;">Lv ${gameState.level}</span>
                <span style="opacity:0.3;">|</span>
                <span style="color:${classInfo.color}; font-weight:700; letter-spacing:0.5px;">${classInfo.icon} ${classInfo.name}</span>
            `;
        }
        this.renderEquipSlots();
        this.renderCharStats();
        this.renderBagGrid();
    }

    renderEquipSlots() {
        const container = document.getElementById('equip-slots');
        if (!container) return;
        const slotOrder = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
        const slotLabels = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', legs: 'Legs', boots: 'Boots', ring: 'Ring', trinket: 'Trinket' };
        const emptyIconKeys = { weapon: 'sword', helm: 'helm', chest: 'chestArmor', legs: 'legsArmor', boots: 'boots', ring: 'ring', trinket: 'karmaOrb' };
        const ATYPE_COLORS = { mail: '#7799cc', leather: '#cc9944', cloth: '#bb88dd' };
        const ATYPE_NAMES = { mail: 'Mail', leather: 'Leather', cloth: 'Cloth' };

        let html = '';
        for (const slot of slotOrder) {
            const item = inventory.equipped[slot];
            if (item) {
                const statText = item.dps ? `+${item.dps} DPS` : item.armor ? `+${item.armor} Armor` : item.bonus ? `+${item.bonus} Bonus` : '';
                const tierLabel = upgradeStation.getTierLabel(item);
                const tierColor = upgradeStation.getTierColor(item);
                const tierHtml = tierLabel ? ` <span style="color:${tierColor};font-size:10px;">${tierLabel}</span>` : '';
                const atypeTag = item.armorType && ATYPE_NAMES[item.armorType]
                    ? ` <span style="color:${ATYPE_COLORS[item.armorType]};font-size:9px;opacity:0.8;">${ATYPE_NAMES[item.armorType]}</span>` : '';
                html += `<div class="equip-slot" data-equip-slot="${slot}" data-action="unequip"><div class="equip-slot-icon" style="border-color:${item.rarity.color}40">${item.icon}</div><div class="equip-slot-info"><div class="equip-slot-name" style="color:${item.rarity.color}">${this.escapeHtml(item.name)}${tierHtml}</div><div class="equip-slot-stat">${statText}${atypeTag}${item.bonusStat ? ` · +${item.bonusStatValue} ${item.bonusStat}` : ''}</div></div></div>`;
            } else {
                html += `<div class="equip-slot"><div class="equip-slot-icon">${iconImgLg(emptyIconKeys[slot], 20, 'opacity:0.4;')}</div><div class="equip-slot-info"><div class="equip-slot-type">${slotLabels[slot]}</div><div class="equip-slot-stat" style="color:#555">Empty</div></div></div>`;
            }
        }
        container.innerHTML = html;

        container.querySelectorAll('[data-action="unequip"]').forEach(el => {
            el.addEventListener('click', () => {
                inventory.unequipItem(el.getAttribute('data-equip-slot'));
                this.renderInventory();
            });
            el.addEventListener('mouseenter', (e) => {
                const item = inventory.equipped[el.getAttribute('data-equip-slot')];
                if (item) this.showItemTooltip(item, e, 'Click to unequip');
            });
            el.addEventListener('mouseleave', () => this.hideItemTooltip());
        });
    }

    renderCharStats() {
        const el = document.getElementById('char-stats');
        if (!el) return;
        const totalDps = gameState.getDPS();
        const totalArmor = inventory.getTotalArmor();
        const reductionPct = Math.round(gameState.getArmorReduction() * 100);
        const critPct = Math.round(gameState.getEffectiveCritChance() * 100);
        const critDmg = Math.round(gameState.getEffectiveCritDamage() * 100);

        let html = '';
        html += `<div class="char-stat-row"><span>${iconImg('sword', 13)} Total DPS</span><span class="char-stat-val">${totalDps}</span></div>`;
        html += `<div class="char-stat-row"><span>${iconImg('shield', 13)} Armor</span><span class="char-stat-val">${totalArmor} (−${reductionPct}% dmg)</span></div>`;
        html += `<div class="char-stat-row"><span>${iconImg('heart', 13)} HP</span><span class="char-stat-val">${Math.floor(gameState.hp)} / ${gameState.getEffectiveMaxHp()}</span></div>`;
        html += `<div class="char-stat-row"><span>${iconImg('crystal', 13)} Mana</span><span class="char-stat-val">${Math.floor(gameState.mana)} / ${gameState.getEffectiveMaxMana()}</span></div>`;
        html += `<div class="char-stat-row"><span>${iconImg('crit', 13)} Crit</span><span class="char-stat-val">${critPct}% (${critDmg}% dmg)</span></div>`;
        const lvlText = gameState.level >= CONFIG.MAX_LEVEL ? `${gameState.level} <span style="color:#ffcc44;font-size:10px;">★ MAX</span>` : `${gameState.level} / ${CONFIG.MAX_LEVEL}`;
        html += `<div class="char-stat-row"><span>${iconImg('lightning', 13)} Level</span><span class="char-stat-val">${lvlText}</span></div>`;
        // Show talent summary
        const spent = talentTree.getSpentPoints();
        const avail = talentTree.getAvailablePoints();
        if (spent > 0 || avail > 0) {
            html += `<div class="char-stat-row"><span>${iconImg('talentTree', 13)} Talents</span><span class="char-stat-val">${spent} spent${avail > 0 ? ` (${avail} free)` : ''}</span></div>`;
        }
        // Show Paragon level if unlocked
        if (gameState.paragonUnlocked) {
            html += `<div class="char-stat-row"><span style="color:#cc88ff;">✨ Paragon</span><span class="char-stat-val" style="color:#cc88ff;">Lv ${gameState.paragonLevel} / 50</span></div>`;
        }
        el.innerHTML = html;
    }

    renderBagGrid() {
        const container = document.getElementById('bag-grid');
        const countEl = document.getElementById('bag-count');
        if (!container) return;

        countEl.textContent = `${inventory.items.length}/${inventory.maxSlots}`;

        // Compute the single best upgrade per slot — only those get the green arrow
        const bestUpgradeIds = inventory.getBestUpgradeIds();

        let html = '';
        for (let i = 0; i < inventory.maxSlots; i++) {
            const item = inventory.items[i];
            if (item) {
                const isBestUpgrade = item.id != null && bestUpgradeIds.has(item.id);
                const borderColor = item.rarity ? item.rarity.color : '#aabbaa';
                const arrowHtml = isBestUpgrade ? '<div class="bag-slot-upgrade-arrow">▲</div>' : '';
                html += `<div class="bag-slot${isBestUpgrade ? ' upgrade' : ''}" data-bag-idx="${i}" style="border-color:${borderColor}50"><span>${item.icon}</span>${arrowHtml}</div>`;
            } else {
                html += `<div class="bag-slot empty"></div>`;
            }
        }
        container.innerHTML = html;

        container.querySelectorAll('[data-bag-idx]').forEach(el => {
            const idx = parseInt(el.getAttribute('data-bag-idx'));
            el.addEventListener('click', () => {
                const item = inventory.items[idx];
                if (!item) return;
                if (item.type === 'junk') { inventory.sellItem(idx); } else { inventory.equipItem(idx); }
                this.renderInventory();
            });
            el.addEventListener('mouseenter', (e) => {
                const item = inventory.items[idx];
                if (item) {
                    const action = item.type === 'junk' ? `Click to sell (${item.sellValue || 1}g)` : 'Click to equip';
                    this.showItemTooltip(item, e, action);
                }
            });
            el.addEventListener('mouseleave', () => this.hideItemTooltip());
        });
    }

    showItemTooltip(item, event, actionText) {
        this.hideItemTooltip();
        const tt = document.createElement('div');
        tt.className = 'item-tooltip';
        const tierLabel = upgradeStation.getTierLabel(item);
        const tierColor = upgradeStation.getTierColor(item);
        const tierSuffix = tierLabel ? ` <span style="color:${tierColor}">${tierLabel}</span>` : '';
        let html = `<div class="tt-name" style="color:${item.rarity.color}">${this.escapeHtml(item.name)}${tierSuffix}</div>`;
        html += `<div class="tt-rarity" style="color:${item.rarity.color}">${item.rarity.name}</div>`;
        if (item.dps) html += `<div class="tt-stat">${iconImg('sword', 12)} +${item.dps} DPS</div>`;
        if (item.armor) html += `<div class="tt-stat">${iconImg('shield', 12)} +${item.armor} Armor</div>`;
        if (item.bonus) html += `<div class="tt-stat">${iconImg('sparkle', 12)} +${item.bonus} Bonus</div>`;
        if (item.bonusStat) html += `<div class="tt-stat tt-stat-bonus">+${item.bonusStatValue} ${item.bonusStat}</div>`;
        if ((item.upgradeTier || 0) > 0) {
            const mult = upgradeStation.getCurrentTier(item);
            if (mult) html += `<div class="tt-stat" style="color:${tierColor}">${iconImg('upgradeStar', 12)} Enhanced ×${mult.statMult.toFixed(2)}</div>`;
        }
        const _ATYPE = { mail: { n: 'Mail', c: '#7799cc' }, leather: { n: 'Leather', c: '#cc9944' }, cloth: { n: 'Cloth', c: '#bb88dd' } };
        const _slotNames = { weapon: 'Weapon', helm: 'Helm', chest: 'Chest', legs: 'Legs', boots: 'Boots', ring: 'Ring', trinket: 'Trinket' };
        const atInfo = item.armorType && _ATYPE[item.armorType];
        const atTag = atInfo ? ` · <span style="color:${atInfo.c}">${atInfo.n}</span>` : '';
        if (item.slot && item.type !== 'junk') html += `<div class="tt-slot">${_slotNames[item.slot] || item.slot}${atTag} · iLvl ${item.level}</div>`;
        if (item.type === 'junk') html += `<div class="tt-slot">Junk · Sell for ${item.sellValue || 1}g</div>`;

        // Comparison vs equipped item
        if (item.slot && item.type !== 'junk') {
            const equipped = inventory.equipped[item.slot];
            const { diff: upgDiff, isUpgrade: isUpg } = inventory.getUpgradeScore(item);
            const bestIds = inventory.getBestUpgradeIds();
            const isBest = item.id != null && bestIds.has(item.id);
            if (equipped) {
                html += `<div style="margin-top:6px;padding-top:5px;border-top:1px solid rgba(100,100,80,0.25);">`;
                html += `<div style="font-family:'Inter',sans-serif;font-size:10px;color:#778866;margin-bottom:3px;">vs Equipped: <span style="color:${equipped.rarity.color}">${this.escapeHtml(equipped.name)}</span></div>`;
                // Primary stat comparison
                if (item.dps != null && equipped.dps != null) {
                    const diff = item.dps - equipped.dps;
                    const color = diff > 0 ? '#44ee66' : diff < 0 ? '#ee5544' : '#999';
                    const sign = diff > 0 ? '+' : '';
                    html += `<div style="font-family:'Inter',sans-serif;font-size:11px;color:${color};font-weight:600;">${sign}${diff} DPS</div>`;
                }
                if (item.armor != null && equipped.armor != null) {
                    const diff = item.armor - equipped.armor;
                    const color = diff > 0 ? '#44ee66' : diff < 0 ? '#ee5544' : '#999';
                    const sign = diff > 0 ? '+' : '';
                    html += `<div style="font-family:'Inter',sans-serif;font-size:11px;color:${color};font-weight:600;">${sign}${diff} Armor</div>`;
                }
                if (item.bonus != null && equipped.bonus != null) {
                    const diff = item.bonus - equipped.bonus;
                    const color = diff > 0 ? '#44ee66' : diff < 0 ? '#ee5544' : '#999';
                    const sign = diff > 0 ? '+' : '';
                    html += `<div style="font-family:'Inter',sans-serif;font-size:11px;color:${color};font-weight:600;">${sign}${diff} Bonus</div>`;
                }
                html += `</div>`;
            }
            // Upgrade badge — only the best upgrade per slot gets the green badge
            if (isBest) {
                html += `<div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:700;margin-top:4px;color:#44ee66;">▲ BEST UPGRADE (+${upgDiff})</div>`;
            } else if (isUpg) {
                html += `<div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:700;margin-top:4px;color:#88aa66;">▲ Upgrade (+${upgDiff}) — not best</div>`;
            } else {
                html += `<div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:700;margin-top:4px;color:#cc7755;">▼ Not an upgrade</div>`;
            }
        }

        if (actionText) html += `<div class="tt-action">${actionText}</div>`;
        tt.innerHTML = html;
        document.body.appendChild(tt);
        this._tooltip = tt;
        const x = Math.min(event.clientX + 12, window.innerWidth - 260);
        const y = Math.min(event.clientY + 12, window.innerHeight - 200);
        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
    }

    hideItemTooltip() {
        if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
    }

    checkLootNotifications() {
        const notifs = inventory.lootNotifications;
        while (this._lastLootCount < notifs.length) {
            const n = notifs[this._lastLootCount];
            this._lastLootCount++;
            this.showLootPopup(n.item);
        }
        if (this._lastLootCount > notifs.length) this._lastLootCount = notifs.length;
        inventory.drainLootNotifications(4000);
    }

    showLootPopup(item) {
        const sidebar = document.getElementById('loot-sidebar');
        if (!sidebar) return;

        const popup = document.createElement('div');
        popup.className = 'loot-popup';
        
        // Only show upgrade arrow if this item is the best upgrade for its slot
        const bestIds = inventory.getBestUpgradeIds();
        const isBestUpgrade = item.id != null && bestIds.has(item.id);
        const upgBadge = isBestUpgrade ? '<span style="color:#44ee66;font-weight:700;font-size:11px;margin-left:4px;">▲</span>' : '';
        popup.innerHTML = `<span class="loot-popup-icon">${item.icon}</span><span class="loot-popup-name" style="color:${item.rarity.color}">${this.escapeHtml(item.name)}</span>${upgBadge}`;
        
        sidebar.appendChild(popup);
        this._lootPopups.push(popup);
        
        setTimeout(() => {
            popup.remove();
            this._lootPopups = this._lootPopups.filter(p => p !== popup);
        }, 3500);
    }

    /* ────── Victory Overlay ────── */
    setupVictoryOverlay() {
        const closeBtn = document.getElementById('victory-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const overlay = document.getElementById('victory-overlay');
                if (overlay) overlay.classList.remove('active');
                // Show the paragon button now
                const pBtn = document.getElementById('paragon-btn');
                if (pBtn) pBtn.style.display = '';
            });
        }
    }

    showVictoryOverlay() {
        const overlay = document.getElementById('victory-overlay');
        if (!overlay) return;
        // Small delay for dramatic effect
        setTimeout(() => {
            overlay.classList.add('active');
        }, 100);
    }

    /* ────── Paragon Milestones Panel ────── */
    setupParagonPanel() {
        // Paragon panel open/close handled by _setupEventListeners → toggleParagonPanel()
    }

    renderParagonPanel() {
        const levelSection = document.getElementById('paragon-level-section');
        const tracksContainer = document.getElementById('paragon-tracks-container');
        if (!levelSection || !tracksContainer) return;

        const pLv = gameState.paragonLevel;
        const isMaxed = pLv >= 50;

        // Update header
        const headerEl = document.getElementById('paragon-level-header');
        if (headerEl) headerEl.textContent = isMaxed ? 'MAX LEVEL 50 👑' : `Level ${pLv} / 50`;

        // Level display + XP bar
        const xpPct = gameState.paragonXpToLevel > 0 
            ? Math.min(100, (gameState.paragonXp / gameState.paragonXpToLevel) * 100) : 0;

        const fmtNum = (n) => {
            if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
            if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
            return Math.floor(n).toLocaleString();
        };

        levelSection.innerHTML = `
            <div class="paragon-level-display">
                <div class="paragon-level-label">Paragon Level</div>
                <div class="paragon-level-num">✨ ${pLv}${isMaxed ? ' 👑' : ''}</div>
                ${isMaxed 
                    ? `<div class="paragon-maxed-label">All 50 Milestones Unlocked — Ascendant</div>` 
                    : `<div class="paragon-xp-bar-bg"><div class="paragon-xp-bar-fill" style="width:${xpPct}%"></div></div>
                       <div class="paragon-xp-text">${fmtNum(gameState.paragonXp)} / ${fmtNum(gameState.paragonXpToLevel)} XP (${xpPct.toFixed(1)}%)</div>`
                }
            </div>
        `;

        // ── Milestone List ──
        let html = '<div class="paragon-milestone-list">';
        for (let i = 0; i < PARAGON_MILESTONES.length; i++) {
            const ms = PARAGON_MILESTONES[i];
            const unlocked = pLv >= ms.level;
            const isNext = !unlocked && ms.level === pLv + 1;
            let stateClass = unlocked ? 'unlocked' : (isNext ? 'next-unlock' : 'locked');

            let statusHtml = '';
            if (unlocked) {
                statusHtml = `<span class="paragon-ms-status active">✓ Active</span>`;
            } else if (isNext) {
                statusHtml = `<span class="paragon-ms-status next-status">Next</span>`;
            } else {
                statusHtml = `<span class="paragon-ms-status locked-status">Lv ${ms.level}</span>`;
            }

            html += `<div class="paragon-milestone ${stateClass}">`;
            html += `<div class="paragon-ms-level" style="${unlocked ? `color:${ms.color};` : 'color:#555;'}">${ms.level}</div>`;
            const msIconKey = ms.iconKey || PARAGON_STAT_ICONS[ms.stat] || PARAGON_CATEGORY_ICONS[ms.category] || 'paragonCombat';
            html += `<div class="paragon-ms-icon">${iconImg(msIconKey, 24)}</div>`;
            html += `<div class="paragon-ms-info">`;
            html += `<div class="paragon-ms-name" style="color:${unlocked ? ms.color : '#666'}">${ms.name}</div>`;
            html += `<div class="paragon-ms-desc">${ms.desc}</div>`;
            html += `</div>`;
            html += statusHtml;
            html += `</div>`;
        }
        html += '</div>';

        // ── Active Bonuses Summary ──
        if (pLv > 0) {
            const dpsMult = gameState.getParagonDPSMult();
            const hpMult = gameState.getParagonHPMult();
            const fortune = gameState.getParagonFortuneMult();
            const crit = gameState.getParagonMasteryBonus();
            const critDmg = gameState.getParagonCritDamageBonus();
            const cdr = gameState.getParagonCDRBonus();
            const companionScale = gameState.getParagonCompanionScale();
            const companionDps = gameState.getParagonCompanionDps();
            const regen = gameState.getParagonRegenBonus();
            const lifesteal = gameState.getParagonLifesteal();
            const partyDps = gameState.getParagonPartyDps();
            const soulEss = gameState.getParagonSoulEssenceBonus();

            html += `<div class="paragon-summary-section">`;
            html += `<div class="paragon-summary-title">Active Paragon Bonuses</div>`;
            html += `<div class="paragon-summary-grid">`;
            if (dpsMult > 1) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonDps', 14)} DPS</span><span class="ps-val" style="color:#ff6644">+${Math.round((dpsMult - 1) * 100)}%</span></div>`;
            if (hpMult > 1) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonMaxHp', 14)} Max HP</span><span class="ps-val" style="color:#44aaff">+${Math.round((hpMult - 1) * 100)}%</span></div>`;
            if (fortune > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonFortune', 14)} Gold & XP</span><span class="ps-val" style="color:#ffcc00">+${Math.round(fortune * 100)}%</span></div>`;
            if (crit > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonCrit', 14)} Crit Chance</span><span class="ps-val" style="color:#cc44ff">+${Math.round(crit * 100)}%</span></div>`;
            if (critDmg > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonCritDmg', 14)} Crit Damage</span><span class="ps-val" style="color:#ff6644">+${Math.round(critDmg * 100)}%</span></div>`;
            if (cdr > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonCdr', 14)} CDR</span><span class="ps-val" style="color:#cc44ff">-${Math.round(cdr * 100)}%</span></div>`;
            if (regen > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonRegen', 14)} HP Regen</span><span class="ps-val" style="color:#44aaff">+${Math.round(regen * 100)}%</span></div>`;
            if (lifesteal > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonLifesteal', 14)} Lifesteal</span><span class="ps-val" style="color:#ff4488">${Math.round(lifesteal * 100)}%</span></div>`;
            if (companionDps > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonCompanionDps', 14)} Companion DPS</span><span class="ps-val" style="color:#66dd66">+${Math.round(companionDps * 100)}%</span></div>`;
            if (companionScale > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonCompanionSize', 14)} Companion Size</span><span class="ps-val" style="color:#66dd66">+${Math.round(companionScale * 100)}%</span></div>`;
            if (partyDps > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonParty', 14)} Party DPS</span><span class="ps-val" style="color:#ffaa33">+${Math.round(partyDps * 100)}%</span></div>`;
            if (soulEss > 0) html += `<div class="paragon-summary-stat"><span>${iconImg('paragonSoul', 14)} Soul Essence</span><span class="ps-val" style="color:#cc88ff">+${Math.round(soulEss * 100)}%</span></div>`;
            html += `</div></div>`;
        }

        tracksContainer.innerHTML = html;
    }

    updateParagonBadge() {
        const d = this._dom;
        if (!d.paragonBtn || !d.paragonBtnBadge) return;
        // Show/hide paragon button based on unlock
        if (gameState.paragonUnlocked) {
            d.paragonBtn.style.display = '';
            if (gameState.paragonLevel > 0) {
                d.paragonBtnBadge.style.display = 'inline';
                d.paragonBtnBadge.textContent = `(${gameState.paragonLevel})`;
            } else {
                d.paragonBtnBadge.style.display = 'none';
            }
        }
    }

    updateParagonXpBar() {
        if (!gameState.paragonUnlocked) return;
        const d = this._dom;
        if (!d.xpBarFill || !d.xpBarOverlayText) return;

        const isMaxed = gameState.paragonLevel >= 50;

        // Override the max-level gold bar with paragon purple
        if (!d.xpBarFill.classList.contains('paragon-bar')) {
            d.xpBarFill.classList.remove('max-level');
            d.xpBarFill.classList.add('paragon-bar');
            d.xpBarFill.style.background = 'linear-gradient(90deg, #6622aa, #8844cc, #bb66ff, #8844cc, #6622aa)';
            d.xpBarFill.style.boxShadow = '0 0 10px rgba(180,100,255,0.4)';
            d.xpBarFill.style.animation = 'xp-max-shimmer 3s ease-in-out infinite';
        }

        if (isMaxed) {
            d.xpBarFill.style.width = '100%';
            d.xpBarOverlayText.textContent = `✨ Paragon 50 — MAX LEVEL 👑`;
        } else {
            const xpPct = gameState.paragonXpToLevel > 0 
                ? Math.min(100, (gameState.paragonXp / gameState.paragonXpToLevel) * 100) : 0;
            d.xpBarFill.style.width = `${xpPct}%`;

            const fmtNum = (n) => {
                if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
                if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
                return Math.floor(n).toLocaleString();
            };
            d.xpBarOverlayText.textContent = `✨ Paragon ${gameState.paragonLevel}  ·  ${fmtNum(gameState.paragonXp)} / ${fmtNum(gameState.paragonXpToLevel)} XP  (${xpPct.toFixed(1)}%)`;
        }
        if (d.xpBarOverlayText.parentElement) d.xpBarOverlayText.parentElement.style.opacity = '1';
    }

    /* ══════════════════════════════════════════════════════════════
       BUFF BAR — Shows active consumable buffs near the nameplate
       ══════════════════════════════════════════════════════════════ */
    updateBuffBar() {
        const bar = this._dom.buffBar;
        if (!bar) return;
        const buffs = goldShop.activeBuffs;
        // Track count to avoid full rebuild every tick
        const key = buffs.map(b => b.id + '|' + Math.ceil(b.timeLeft)).join(',');
        if (key === this._lastBuffKey) return;
        this._lastBuffKey = key;

        if (buffs.length === 0) {
            bar.innerHTML = '';
            return;
        }
        let html = '';
        for (const buff of buffs) {
            const secs = Math.ceil(buff.timeLeft);
            const timerStr = secs >= 60 ? Math.floor(secs / 60) + 'm' : secs + 's';
            const expiring = secs <= 10;
            html += `<div class="buff-icon-wrap${expiring ? ' expiring' : ''}" title="${buff.name}: ${timerStr} remaining">`;
            html += `<span>${buff.icon}</span>`;
            html += `<div class="buff-timer">${timerStr}</div>`;
            html += `</div>`;
        }
        bar.innerHTML = html;
    }

    /* ══════════════════════════════════════════════════════════════
       GOLD MERCHANT PANEL
       ══════════════════════════════════════════════════════════════ */
    _closeAllPanels() {
        this.invOpen = false; document.getElementById('inv-panel')?.classList.remove('open');
        this.talentOpen = false; document.getElementById('talent-panel')?.classList.remove('open');
        this.upgradeOpen = false; document.getElementById('upgrade-panel')?.classList.remove('open');
        this.settingsOpen = false; document.getElementById('settings-panel')?.classList.remove('open');
        this.zoneOpen = false; document.getElementById('zone-panel')?.classList.remove('open');
        this.paragonOpen = false; document.getElementById('paragon-panel')?.classList.remove('open');
        this.goldShopOpen = false; document.getElementById('gold-shop-panel')?.classList.remove('open');
        this.aetherbitShopOpen = false; document.getElementById('aetherbit-shop-panel')?.classList.remove('open');
        document.getElementById('achievement-panel')?.classList.remove('open');
        this.partyPanelOpen = false; document.getElementById('party-panel')?.classList.remove('open');
        this.soulForgePanelOpen = false; document.getElementById('soulforge-panel')?.classList.remove('open');
        this.dungeonPanelOpen = false; document.getElementById('dungeon-panel')?.classList.remove('open');
        this.pvpPanelOpen = false; document.getElementById('pvp-panel')?.classList.remove('open');
        this.pvpVendorOpen = false; document.getElementById('pvp-vendor-panel')?.classList.remove('open');
        this.raidPanelOpen = false; document.getElementById('raid-panel')?.classList.remove('open');
        this.raidVendorOpen = false; document.getElementById('raid-vendor-panel')?.classList.remove('open');
        const frames = document.getElementById('party-frames');
        if (frames) frames.style.display = '';
    }

    togglePartyPanel(force) {
        const panel = document.getElementById('party-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        const frames = document.getElementById('party-frames');
        if (isOpen) {
            this._closeAllPanels();
            this.partyPanelOpen = true;
            panel.classList.add('open');
            if (frames) frames.style.display = 'none';
            this.renderPartyPanel();
            audioManager.playUiOpen();
        } else {
            this.partyPanelOpen = false;
            panel.classList.remove('open');
            if (frames) frames.style.display = '';
        }
    }

    _setupPartyListeners() {
        // Party button
        const partyBtn = document.getElementById('party-btn');
        if (partyBtn) {
            partyBtn.addEventListener('click', () => this.togglePartyPanel());
        }
        // Party panel close
        const closeBtn = document.getElementById('party-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.togglePartyPanel(false));
        }
        // Invite accept/decline
        const acceptBtn = document.getElementById('party-invite-accept');
        const declineBtn = document.getElementById('party-invite-decline');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                partySystem.acceptInvite();
                document.getElementById('party-invite-popup').style.display = 'none';
                if (this.partyPanelOpen) this.renderPartyPanel();
                audioManager.playUiOpen();
            });
        }
        if (declineBtn) {
            declineBtn.addEventListener('click', () => {
                partySystem.declineInvite();
                document.getElementById('party-invite-popup').style.display = 'none';
            });
        }
        // Kick handler via delegation on party panel body
        const body = document.getElementById('party-panel-body');
        if (body) {
            body.addEventListener('click', (e) => {
                const kickBtn = e.target.closest('.party-kick-btn');
                if (kickBtn) {
                    const memberId = parseInt(kickBtn.dataset.memberId);
                    if (memberId) {
                        partySystem.removeMember(memberId);
                        this.renderPartyPanel();
                    }
                }
            });
        }
    }

    renderPartyPanel() {
        const body = document.getElementById('party-panel-body');
        if (!body) return;

        const maxSize = partySystem.getMaxPartySize();
        const members = partySystem.members;
        const totalPartyDps = partySystem.getTotalPartyDps();

        let html = '';

        // Info bar
        html += `<div class="party-info-bar">
            <span>Party: ${members.length}/${maxSize} members</span>
            <span>Party DPS Bonus: <span class="party-dps">+${totalPartyDps}</span></span>
        </div>`;

        // Member cards
        for (const m of members) {
            const cls = m.getDisplayClass();
            const dps = m.getDps();
            const armor = m.getTotalArmor();

            html += `<div class="party-member-card">
                <div class="party-member-top">
                    <div>
                        <div class="party-member-name">
                            ${cls.icon} ${m.name}
                            <span class="party-member-class" style="background:${cls.color}22;color:${cls.color};border:1px solid ${cls.color}44;">${cls.name}</span>
                        </div>
                        <div class="party-member-level">Level ${m.level}</div>
                    </div>
                    <div class="party-kick-btn" data-member-id="${m.id}">✕ Remove</div>
                </div>
                <div class="party-member-stats">
                    <div class="stat">${iconImg('sword', 12)} DPS: <span class="val">${dps}</span></div>
                    <div class="stat">${iconImg('shield', 12)} Armor: <span class="val">${armor}</span></div>
                </div>
                <div class="party-member-gear">`;

            // Gear slots
            const slots = ['weapon', 'helm', 'chest', 'legs', 'boots'];
            for (const slot of slots) {
                const item = m.gear[slot];
                if (item) {
                    html += `<div class="party-gear-slot" title="${item.name}\n${item.rarity.name} · ${item.dps ? 'DPS: ' + item.dps : 'Armor: ' + (item.armor || 0)}">
                        ${iconImgLg(item.iconKey, 20)}
                        <div class="gear-rarity-dot" style="background:${item.rarity.color}"></div>
                    </div>`;
                } else {
                    html += `<div class="party-gear-slot" style="opacity:0.3;" title="Empty ${slot}">—</div>`;
                }
            }

            html += `</div></div>`;
        }

        // Empty slots (unlocked but unfilled)
        for (let i = members.length; i < maxSize; i++) {
            html += `<div class="party-empty-slot">
                <span style="opacity:0.6;">— Open Slot —</span><br>
                <span style="font-size:10px;color:#445566;">Waiting for adventurers...</span>
            </div>`;
        }

        // Locked slots (future capacity unlocked by progressing zones)
        // maxSize is member slots (cap - 1). Total possible member slots = 4 (5 party - 1 player)
        const maxPossibleSlots = 4;
        const lockedSlotZones = [
            { slot: 1, zone: 'Shattered Expanse' },
            { slot: 2, zone: 'Molten Wasteland' },
            { slot: 3, zone: 'Abyssal Depths' },
            { slot: 4, zone: 'Neon Wastes' },
        ];
        for (const entry of lockedSlotZones) {
            if (entry.slot > maxSize && entry.slot <= maxPossibleSlots) {
                html += `<div class="party-empty-slot party-empty-locked">
                    🔒 Slot ${entry.slot} — Unlocks with ${entry.zone}
                </div>`;
            }
        }

        body.innerHTML = html;
    }

    /** Update party invite popup visibility + timer bar */
    updatePartyInvitePopup() {
        const popup = document.getElementById('party-invite-popup');
        if (!popup) return;

        const invite = partySystem.pendingInvite;
        if (!invite) {
            if (popup.style.display !== 'none') popup.style.display = 'none';
            return;
        }

        // Wait for the NPC to walk closer before showing the popup
        const now = Date.now();
        if (invite.showPopupAt && now < invite.showPopupAt) {
            if (popup.style.display !== 'none') popup.style.display = 'none';
            return;
        }

        // Show popup
        if (popup.style.display === 'none') {
            popup.style.display = '';
            // Re-trigger animation
            popup.style.animation = 'none';
            popup.offsetHeight; // force reflow
            popup.style.animation = '';

            const cls = invite.member.getDisplayClass();
            document.getElementById('party-invite-text').textContent =
                `${invite.member.name} wants to join your party!`;
            document.getElementById('party-invite-details').innerHTML =
                `<span style="color:${cls.color}">${cls.icon} ${cls.name}</span> · Level ${invite.member.level} · DPS: ${invite.member.getDps()}`;
        }

        // Update timer bar — timer is relative to the popup window (after approach delay)
        const popupStart = invite.showPopupAt || (invite.expiresAt - 20000);
        const popupDuration = invite.expiresAt - popupStart;
        const remaining = Math.max(0, invite.expiresAt - now);
        const pct = (remaining / popupDuration) * 100;
        const fill = document.getElementById('party-invite-timer-fill');
        if (fill) fill.style.width = pct + '%';
    }

    /* ══════════════════════════════════════════════════════════════
       SOUL FORGE PANEL
       ══════════════════════════════════════════════════════════════ */

    toggleSoulForgePanel(force) {
        const panel = document.getElementById('soulforge-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.soulForgePanelOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.soulforge = false; // Reset notification glow
            this.renderSoulForgePanel();
            audioManager.playUiOpen();
        } else {
            this.soulForgePanelOpen = false;
            panel.classList.remove('open');
        }
    }

    _setupSoulForgeListeners() {
        const btn = document.getElementById('soulforge-btn');
        if (btn) btn.addEventListener('click', () => this.toggleSoulForgePanel());
        const close = document.getElementById('soulforge-panel-close');
        if (close) close.addEventListener('click', () => this.toggleSoulForgePanel(false));
        const body = document.getElementById('soulforge-panel-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Spec selection
                const chooseBtn = e.target.closest('.sf-choose-btn');
                if (chooseBtn && !chooseBtn.classList.contains('chosen')) {
                    const specId = chooseBtn.dataset.specId;
                    if (specId) {
                        soulForge.chooseSpec(specId);
                        this.renderSoulForgePanel();
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Node selection
                const nodeEl = e.target.closest('.sf-node.available');
                if (nodeEl) {
                    const tierIdx = parseInt(nodeEl.dataset.tier);
                    const nodeId = nodeEl.dataset.nodeId;
                    if (soulForge.upgradeNode(tierIdx, nodeId)) {
                        this.renderSoulForgePanel();
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Respec
                const respecBtn = e.target.closest('.sf-respec-btn');
                if (respecBtn) {
                    if (soulForge.respec()) {
                        this.renderSoulForgePanel();
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Mass Disenchant
                const disBtn = e.target.closest('#sf-mass-dis-btn');
                if (disBtn) {
                    const raritySelect = document.getElementById('sf-mass-dis-rarity');
                    const maxRarity = parseInt(raritySelect?.value || '1');
                    const result = soulForge.massDisenchant(inventory, maxRarity);
                    if (result.count > 0) {
                        this.renderSoulForgePanel();
                        audioManager.playUiOpen();
                        // Special sound/effect for mass disenchant?
                    } else {
                        gameState.addGameLog("⚒️ Soul Forge: No matching items to scrape.");
                    }
                    return;
                }
            });
        }
    }

    renderSoulForgePanel() {
        const body = document.getElementById('soulforge-panel-body');
        if (!body) return;

        const specs = soulForge.getSpecsForClass();
        const activeSpec = soulForge.getActiveSpec();
        const essence = soulForge.soulEssence;
        const rate = soulForge._essencePerSecond;

        let html = '';

        // ── Essence Bar ──
        html += `<div class="sf-essence-bar">
            <span class="sf-essence-icon">${iconImg('soulEssence', 18)}</span>
            <span class="sf-essence-amount">${Math.floor(essence).toLocaleString()} Soul Essence</span>
            <span class="sf-essence-rate">${rate > 0 ? `+${rate.toFixed(1)}/s` : '🏰 Run Dungeons or Raids to gather more Soul Essence'}</span>
        </div>`;

        // ── No Spec Chosen: Show Spec Selection ──
        if (!activeSpec) {
            html += `<div class="sf-section-title">Choose Your Specialization</div>`;
            html += `<div style="font-size:11px;color:#887766;margin-bottom:10px;">Each specialization offers a unique power fantasy with 5 tiers of upgrades. Choose wisely — respecing costs Soul Essence.</div>`;

            for (const spec of specs) {
                const specAbils = SPEC_ABILITIES[spec.id] || [];
                html += `<div class="sf-spec-card">
                    <div class="sf-spec-header">
                        <span class="sf-spec-icon">${spec.icon}</span>
                        <span class="sf-spec-name" style="color:${spec.color}">${spec.name}</span>
                        <span class="sf-spec-tagline">${spec.tagline}</span>
                    </div>
                    <div class="sf-spec-desc">${spec.description}</div>
                    <div class="sf-spec-power">
                        <span class="sf-spec-power-icon">${spec.specPower.icon}</span>
                        <div>
                            <div class="sf-spec-power-name">${spec.specPower.name}</div>
                            <div class="sf-spec-power-desc">${spec.specPower.description}</div>
                        </div>
                    </div>`;
                // Show the 3 spec abilities that will be unlocked
                if (specAbils.length > 0) {
                    html += `<div style="margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,0.06);">`;
                    html += `<div style="font-size:9px;color:#776655;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Combat Abilities</div>`;
                    html += `<div style="display:flex;gap:4px;">`;
                    for (const ab of specAbils) {
                        const tLabel = ab.unlockTier === 0 ? 'T1' : ab.unlockTier === 2 ? 'T3' : 'T5';
                        html += `<div style="flex:1;display:flex;align-items:center;gap:4px;padding:3px 5px;border-radius:3px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.05);" title="${ab.name}: ${ab.description}">`;
                        html += `${iconImg(ab.iconKey, 14, 'opacity:0.7;')}`;
                        html += `<div style="min-width:0;overflow:hidden;">`;
                        html += `<div style="font-size:9px;color:${ab.nameColor || '#ccaa77'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ab.name}</div>`;
                        html += `<div style="font-size:7px;color:#776655;">${tLabel}</div>`;
                        html += `</div></div>`;
                    }
                    html += `</div></div>`;
                }
                html += `<div class="sf-choose-btn" data-spec-id="${spec.id}">⚒️ Forge as ${spec.name}</div>
                </div>`;
            }
        } else {
            // ── Active Spec Header ──
            html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-size:28px;">${activeSpec.icon}</span>
                <div>
                    <div style="font-family:'Cinzel',serif;font-size:16px;color:${activeSpec.color};font-weight:700;">${activeSpec.name}</div>
                    <div style="font-size:11px;color:#998877;font-style:italic;">${activeSpec.tagline}</div>
                </div>
            </div>`;

            // ── Spec Power ──
            const spCD = soulForge.specPowerCooldown;
            const spReady = spCD <= 0;
            html += `<div class="sf-spec-power" style="margin-bottom:10px;${spReady ? 'border-color:rgba(80,255,120,0.3);' : ''}">
                <span class="sf-spec-power-icon">${activeSpec.specPower.icon}</span>
                <div style="flex:1;">
                    <div class="sf-spec-power-name">${activeSpec.specPower.name} ${spReady ? '<span style="color:#88ff88;font-size:10px;">READY</span>' : `<span style="color:#aa6644;font-size:10px;">${Math.ceil(spCD)}s</span>`}</div>
                    <div class="sf-spec-power-desc">${activeSpec.specPower.description}</div>
                </div>
            </div>`;

            // ── Active Bonuses Summary ──
            const nodes = soulForge.getUnlockedNodes();
            if (nodes.length > 0) {
                html += `<div class="sf-section-title">Active Bonuses</div>`;
                html += `<div class="sf-stat-summary">`;
                const dpsMult = soulForge.getDPSMultiplier();
                const hpMult = soulForge.getHPMultiplier();
                const cdrBonus = soulForge.getCDRBonus();
                const critBonus = soulForge.getCritBonus();
                const critDmg = soulForge.getCritDamageBonus();
                if (dpsMult > 1) html += `<div class="sf-stat-chip">DPS <span class="val">+${Math.round((dpsMult - 1) * 100)}%</span></div>`;
                if (hpMult > 1) html += `<div class="sf-stat-chip">HP <span class="val">+${Math.round((hpMult - 1) * 100)}%</span></div>`;
                if (cdrBonus > 0) html += `<div class="sf-stat-chip">CDR <span class="val">-${Math.round(cdrBonus * 100)}%</span></div>`;
                if (critBonus > 0) html += `<div class="sf-stat-chip">Crit <span class="val">+${Math.round(critBonus * 100)}%</span></div>`;
                if (critDmg > 0) html += `<div class="sf-stat-chip">Crit Dmg <span class="val">+${Math.round(critDmg * 100)}%</span></div>`;
                html += `</div>`;
            }

            // ── Tier Tree ──
            html += `<div class="sf-section-title">Specialization Tree — ${soulForge.getUnlockedTierCount()}/5 Tiers</div>`;

            // Build a map of which abilities unlock after which tiers
            const specAbilities = SPEC_ABILITIES[activeSpec.id] || [];
            const tierCount = soulForge.getUnlockedTierCount();

            for (let ti = 0; ti < activeSpec.tiers.length; ti++) {
                const tier = activeSpec.tiers[ti];
                const currentTier = soulForge.chosenNodes[`tier${ti}`];
                const isUnlocked = currentTier !== undefined;
                const nodeLevel = currentTier?.level || 0;
                
                html += `<div class="sf-tier-header">
                    <span>${isUnlocked ? '✅' : '🔒'} ${tier.name}</span>
                    <span class="sf-tier-cost">${isUnlocked ? `Rank ${nodeLevel}/10` : `Locked`}</span>
                </div>`;

                html += `<div class="sf-tier-row">`;
                for (const node of tier.nodes) {
                    const isChosen = currentTier?.id === node.id;
                    const canUpgrade = soulForge.canUpgradeTier(ti, node.id);
                    const isMaxed = isChosen && nodeLevel >= 10;
                    const nextLevel = (isChosen ? nodeLevel : 0) + 1;
                    const cost = soulForge.getUpgradeCost(ti, nextLevel);
                    
                    let cls = 'sf-node';
                    if (isChosen) cls += ' chosen';
                    if (canUpgrade) cls += ' available';
                    if (!isChosen && isUnlocked) cls += ' locked'; // chosen other node in this tier
                    if (!isUnlocked && !soulForge.canUpgradeTier(ti, node.id)) cls += ' locked';

                    html += `<div class="${cls}" data-tier="${ti}" data-node-id="${node.id}">
                        <div class="sf-node-icon">${node.icon}</div>
                        <div class="sf-node-name">${node.name} ${isChosen ? `<span style="color:#ffcc66;font-size:9px;">(Rank ${nodeLevel})</span>` : ''}</div>
                        <div class="sf-node-desc">${node.desc}</div>
                        ${!isMaxed && (isChosen || !isUnlocked) ? `
                            <div class="sf-tier-cost" style="margin-top:4px; font-weight:700; color:${soulForge.soulEssence >= cost ? '#88dd66' : '#cc6655'};">
                                ${isChosen ? 'Upgrade' : 'Unlock'}: ${cost.toLocaleString()} ${iconImg('soulEssence', 10)}
                            </div>
                        ` : isMaxed ? `
                            <div class="sf-tier-cost" style="margin-top:4px; color:#66dd88; font-weight:700;">MAX RANK</div>
                        ` : ''}
                    </div>`;
                }
                html += `</div>`;

                // ── Show ability unlock banner after the tier where it's granted ──
                for (const abil of specAbilities) {
                    if (abil.unlockTier !== ti) continue;
                    const abilUnlocked = tierCount > abil.unlockTier;
                    const tierLabel = ti === 0 ? 'Tier I' : ti === 2 ? 'Tier III' : 'Tier V';
                    const abilColor = abilUnlocked ? (abil.nameColor || '#ffaa44') : '#667788';
                    const lockIcon = abilUnlocked ? '✨' : '🔒';
                    const statusColor = abilUnlocked ? '#66dd88' : '#cc8855';
                    const statusText = abilUnlocked ? '✓ Unlocked' : `Unlock: Complete ${tierLabel}`;
                    const iconStyle = abilUnlocked ? '' : 'filter:grayscale(1) opacity(0.4);';

                    html += `<div class="sf-abil-banner ${abilUnlocked ? 'unlocked' : ''}">`;
                    html += `<div class="sf-abil-banner-icon">`;
                    html += `${iconImg(abil.iconKey, 22, iconStyle)}`;
                    html += `<span class="sf-abil-banner-badge">${lockIcon}</span>`;
                    html += `</div>`;
                    html += `<div class="sf-abil-banner-info">`;
                    html += `<div class="sf-abil-banner-name" style="color:${abilColor}">⚔️ Ability: ${abil.name}</div>`;
                    html += `<div class="sf-abil-banner-desc">${abil.description}</div>`;
                    html += `</div>`;
                    html += `<span class="sf-abil-banner-status" style="color:${statusColor}">${statusText}</span>`;
                    html += `</div>`;
                }
            }

            // ── Respec ──
            const respecCost = soulForge.getRespecCost();
            const canRespec = soulForge.soulEssence >= respecCost && soulForge.getUnlockedTierCount() > 0;
            html += `<div class="sf-respec-btn" style="${canRespec ? '' : 'opacity:0.4;cursor:not-allowed;'}">
                🔄 Respec Nodes (${respecCost.toLocaleString()} ${iconImg('soulEssence', 12)}) — Refunds 50%
            </div>`;

            // ── Switch Spec ──
            html += `<div class="sf-section-title" style="margin-top:16px;">Change Specialization</div>`;
            html += `<div style="font-size:10px;color:#776655;margin-bottom:6px;">Switching resets all tier choices. Choose a new path:</div>`;
            html += `<div style="display:flex;gap:6px;">`;
            for (const spec of specs) {
                const isCurrent = spec.id === activeSpec.id;
                html += `<div class="sf-choose-btn${isCurrent ? ' chosen' : ''}" data-spec-id="${spec.id}" style="flex:1;text-align:center;">
                    ${spec.icon} ${spec.name}${isCurrent ? ' ✓' : ''}
                </div>`;
            }
            html += `</div>`;

            // ── Mass Disenchant (Soul Scraping) ──
            html += `<div class="sf-disenchant-section">
                <div class="sf-disenchant-title">⚒️ Soul Scraping (Mass-Disenchant)</div>
                <div style="font-size:10px;color:#887766;margin-bottom:8px;">Convert unequipped items into Soul Essence based on rarity and level.</div>
                <div class="sf-disenchant-controls">
                    <select class="sf-disenchant-select" id="sf-mass-dis-rarity">
                        <option value="0">Common & Below</option>
                        <option value="1" selected>Uncommon & Below</option>
                        <option value="2">Rare & Below</option>
                        <option value="3">Epic & Below</option>
                    </select>
                    <div class="sf-disenchant-btn" id="sf-mass-dis-btn">✨ Scrape Items</div>
                </div>
            </div>`;
        }

        body.innerHTML = html;
    }

    updateSoulForgeBtn() {
        const btn = document.getElementById('soulforge-btn');
        if (!btn) return;
        const unlocked = soulForge.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const badge = document.getElementById('soulforge-btn-badge');
            if (badge) {
                const tierCount = soulForge.getUnlockedTierCount();
                const spec = soulForge.getActiveSpec();
                badge.textContent = spec ? `${spec.icon}${tierCount}` : '!';
            }
        }
    }

    /** Show/hide & rebuild the Soul Forge action bar when spec changes */
    _updateSoulForgeBarVisibility() {
        const bar = this._dom?.soulforgeBar || document.getElementById('soulforge-bar');
        if (!bar) return;
        const shouldShow = soulForge.isUnlocked() && !!soulForge.activeSpec;
        const isShowing = bar.classList.contains('active');

        // Track spec + tier changes to rebuild bar when abilities change
        const currentSpec = soulForge.activeSpec || '';
        const currentTiers = soulForge.getUnlockedTierCount();
        const barKey = `${currentSpec}:${currentTiers}`;
        if (barKey !== this._lastSfBarKey) {
            // Detect which abilities are newly unlocked (compare old vs new)
            if (this._lastSfBarKey && this._lastSfBarKey !== '') {
                const prevUnlocked = this._lastSfUnlockedIds || new Set();
                const abilities = soulForge.getSpecAbilities();
                const newlyUnlocked = new Set();
                for (const abil of abilities) {
                    if (abil.unlocked && !prevUnlocked.has(abil.id)) {
                        newlyUnlocked.add(abil.id);
                        // Fire a toast for the newly unlocked ability
                        gameState.addGameLog(`⚒️ Soul Forge Ability Unlocked: ${abil.name}!`);
                    }
                }
                if (newlyUnlocked.size > 0) {
                    this._sfJustUnlocked = newlyUnlocked;
                }
            }
            // Update the tracking set of which abilities are currently unlocked
            const abilities = soulForge.getSpecAbilities();
            this._lastSfUnlockedIds = new Set(abilities.filter(a => a.unlocked).map(a => a.id));
            this._lastSfBarKey = barKey;
            this._refreshSoulForgeBar();
        } else if (shouldShow !== isShowing) {
            bar.classList.toggle('active', shouldShow);
        }
    }

    /** Update the party frames HUD (left side) */
    updatePartyFrames() {
        const container = document.getElementById('party-frames');
        if (!container) return;

        if (!partySystem.isUnlocked() || partySystem.members.length === 0) {
            if (container.innerHTML !== '') container.innerHTML = '';
            return;
        }

        // Only re-render if version changed
        if (this._lastPartyFrameVersion === partySystem.version && !this._forcePartyFrameUpdate) return;
        this._lastPartyFrameVersion = partySystem.version;

        let html = '';
        for (const m of partySystem.members) {
            const cls = m.getDisplayClass();
            const dps = m.getDps();
            html += `<div class="party-frame">
                <div class="party-frame-icon">${cls.icon}</div>
                <div class="party-frame-info">
                    <div class="party-frame-top-row">
                        <span class="party-frame-name" style="color:${cls.color}">${m.name}</span>
                        <span class="party-frame-level">Lv${m.level}</span>
                        <span class="party-frame-dps">${dps} DPS</span>
                    </div>
                    <div class="party-frame-bar-bg"><div class="party-frame-bar-fill"></div></div>
                </div>
            </div>`;
        }
        container.innerHTML = html;
    }

    /** Update party button visibility + badge */
    updatePartyButton() {
        const btn = document.getElementById('party-btn');
        if (!btn) return;
        const unlocked = partySystem.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const badge = document.getElementById('party-btn-badge');
            if (badge) badge.textContent = partySystem.members.length;
        }
    }

    setupGoldShopPanel() {
        // Handled by toggleGoldShop() via _setupEventListeners — no duplicate handlers needed
    }

    _refreshGoldShopCurrency() {
        const el = document.getElementById('gshop-gold');
        if (el) el.textContent = gameState.formatGold(gameState.gold);
    }

    renderGoldShop() {
        const body = document.getElementById('gold-shop-body');
        if (!body) return;
        this._refreshGoldShopCurrency();

        let html = '';

        // ── Consumable Buffs Section ──
        html += `<div class="shop-section-title">🧪 Consumable Buffs</div>`;
        for (const def of CONSUMABLE_BUFFS) {
            const cost = goldShop.getConsumableCost(def);
            const canAfford = gameState.gold >= cost;
            const activeBuff = goldShop.activeBuffs.find(b => b.id === def.id);
            const isActive = !!activeBuff;

            let cardClass = 'shop-item-card';
            if (isActive) cardClass += ' active-buff';
            else if (!canAfford) cardClass += ' cant-afford';

            html += `<div class="${cardClass}" data-consumable-id="${def.id}">`;
            html += `<div class="shop-item-icon">${def.icon}</div>`;
            html += `<div class="shop-item-info">`;
            html += `<div class="shop-item-name">${def.name}</div>`;
            html += `<div class="shop-item-desc">${def.description}</div>`;
            html += `</div>`;
            html += `<div class="shop-item-right">`;
            html += `<div class="shop-item-cost ${canAfford ? 'affordable' : 'expensive'}">${iconImg('goldCoin', 12)} ${cost}g</div>`;
            if (isActive) {
                const secs = Math.ceil(activeBuff.timeLeft);
                const timerStr = secs >= 60 ? Math.floor(secs / 60) + 'm ' + (secs % 60) + 's' : secs + 's';
                html += `<div class="shop-item-status active">Active · ${timerStr}</div>`;
            }
            html += `</div></div>`;
        }

        // ── Permanent Upgrades Section ──
        html += `<div class="shop-section-title">🔧 Permanent Upgrades</div>`;
        for (const def of GOLD_UPGRADES) {
            const currentTier = goldShop.upgradeLevels[def.id] || 0;
            const isMaxed = currentTier >= def.tiers.length;
            const next = goldShop.getNextUpgradeTier(def.id);
            const canAfford = next ? gameState.gold >= next.cost : false;

            let cardClass = 'shop-item-card';
            if (isMaxed) cardClass += ' maxed-upgrade';
            else if (!canAfford) cardClass += ' cant-afford';

            html += `<div class="${cardClass}" data-upgrade-id="${def.id}">`;
            html += `<div class="shop-item-icon">${def.icon}</div>`;
            html += `<div class="shop-item-info">`;
            html += `<div class="shop-item-name">${def.name}</div>`;
            html += `<div class="shop-item-desc">${isMaxed ? def.tiers[def.tiers.length - 1].label : (next ? next.label : def.description)}</div>`;
            html += `</div>`;
            html += `<div class="shop-item-right">`;
            if (isMaxed) {
                html += `<div class="shop-item-status maxed">✓ MAX</div>`;
            } else {
                html += `<div class="shop-item-cost ${canAfford ? 'affordable' : 'expensive'}">${iconImg('goldCoin', 12)} ${next.cost}g</div>`;
            }
            html += `<div class="shop-item-tier ${isMaxed ? 'maxed' : ''}">Tier ${currentTier}/${def.tiers.length}</div>`;
            html += `</div></div>`;
        }

        // ── Stats Summary ──
        html += `<div class="shop-stats-summary">`;
        html += `<div class="shop-stat-row"><span>Total Gold Spent</span><span class="shop-stat-val">${gameState.formatGold(goldShop.totalGoldSpent)}g</span></div>`;
        html += `<div class="shop-stat-row"><span>Buffs Purchased</span><span class="shop-stat-val">${goldShop.totalBuffsPurchased}</span></div>`;
        html += `<div class="shop-stat-row"><span>Active Buffs</span><span class="shop-stat-val">${goldShop.activeBuffs.length}</span></div>`;
        html += `<div class="shop-stat-row"><span>Extra Bag Slots</span><span class="shop-stat-val">+${goldShop.getExtraBagSlots()}</span></div>`;
        html += `</div>`;

        // Toast area
        html += `<div id="gold-shop-toast-area"></div>`;

        body.innerHTML = html;

        // ── Wire click handlers ──
        body.querySelectorAll('[data-consumable-id]').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-consumable-id');
                const result = goldShop.buyConsumable(id);
                this._showShopToast('gold-shop-toast-area', result.success, result.success ? 'Buff activated!' : result.reason);
                this.renderGoldShop();
            });
        });
        body.querySelectorAll('[data-upgrade-id]').forEach(el => {
            if (el.classList.contains('maxed-upgrade')) return;
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-upgrade-id');
                const result = goldShop.buyUpgrade(id);
                this._showShopToast('gold-shop-toast-area', result.success, result.success ? `Purchased: ${result.label}` : result.reason);
                this.renderGoldShop();
            });
        });
    }

    /* ══════════════════════════════════════════════════════════════
       AETHERBIT EMPORIUM PANEL
       ══════════════════════════════════════════════════════════════ */
    setupAetherbitShopPanel() {
        // Handled by toggleAetherbitShop() via _setupEventListeners — no duplicate handlers needed
    }

    _refreshAetherbitShopCurrency() {
        const el = document.getElementById('ashop-aeth');
        if (el) el.textContent = gameState.karma;
    }

    // ── Affordability Glow — highlights shop/vendor buttons when purchases are available ──
    _updateAffordabilityGlows() {
        // Throttle: only check every ~1s (60 frames at ~16ms each)
        this._affordGlowCounter = (this._affordGlowCounter || 0) + 1;
        if (this._affordGlowCounter < 60) return;
        this._affordGlowCounter = 0;

        // Helper: toggle the glow class on a button element
        const setGlow = (id, sysKey, affordable) => {
            const el = document.getElementById(id);
            if (!el) return;
            
            // If it just became affordable, mark as unseen
            if (affordable && !this._lastAffordable[sysKey]) {
                this._unseenUpgrades[sysKey] = true;
            }
            this._lastAffordable[sysKey] = affordable;

            // Only glow if affordable AND unseen
            const shouldGlow = affordable && this._unseenUpgrades[sysKey];
            
            if (shouldGlow) { if (!el.classList.contains('can-afford-glow')) el.classList.add('can-afford-glow'); }
            else { el.classList.remove('can-afford-glow'); }
        };

        // 1) Gold Shop — any consumable affordable OR any permanent upgrade affordable
        let goldShopAffordable = false;
        for (const def of CONSUMABLE_BUFFS) {
            if (goldShop.canAffordConsumable(def)) { goldShopAffordable = true; break; }
        }
        if (!goldShopAffordable) {
            for (const def of GOLD_UPGRADES) {
                if (goldShop.canAffordUpgrade(def.id)) { goldShopAffordable = true; break; }
            }
        }
        setGlow('gold-shop-btn', 'gold', goldShopAffordable);

        // 2) Aetherbit Emporium — any upgrade affordable
        let aetherAffordable = false;
        for (const def of AETHERBIT_UPGRADES) {
            if (aetherbitShop.canAfford(def.id)) { aetherAffordable = true; break; }
        }
        setGlow('aetherbit-shop-btn', 'aether', aetherAffordable);

        // 3) Enhance (Upgrade Station) — any equipped item upgradeable + affordable
        let enhanceAffordable = false;
        for (const slot of ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket']) {
            const item = inventory.equipped[slot];
            if (item && upgradeStation.canUpgrade(item) && upgradeStation.canAfford(item)) {
                enhanceAffordable = true; break;
            }
        }
        setGlow('upgrade-btn', 'enhance', enhanceAffordable);

        // 4) Talent Tree — unspent talent points
        setGlow('talent-btn', 'talent', talentTree.getAvailablePoints() > 0);

        // 5) Soul Forge — any tier unlockable (only if visible)
        setGlow('soulforge-btn', 'soulforge', soulForge.canAffordAnyUpgrade());

        // 6) PvP Vendor — any gear or upgrade affordable (only if visible)
        let pvpAffordable = false;
        if (battlegroundSystem.isUnlocked()) {
            for (const g of PVP_GEAR) {
                if (pvpVendor.canAffordGear(g.id)) { pvpAffordable = true; break; }
            }
            if (!pvpAffordable) {
                for (const u of PVP_UPGRADES) {
                    if (pvpVendor.canAffordUpgrade(u.id)) { pvpAffordable = true; break; }
                }
            }
        }
        setGlow('pvp-vendor-btn', 'pvp', pvpAffordable);

        // 7) Raid Vendor — any gear or upgrade affordable (only if visible)
        let raidAffordable = false;
        if (raidSystem.isUnlocked()) {
            for (const g of RAID_GEAR) {
                if (raidVendor.canAffordGear(g.id)) { raidAffordable = true; break; }
            }
            if (!raidAffordable) {
                for (const u of RAID_UPGRADES) {
                    if (raidVendor.canAffordUpgrade(u.id)) { raidAffordable = true; break; }
                }
            }
        }
        setGlow('raid-vendor-btn', 'raid', raidAffordable);
    }

    /* ══════════════════════════════════════════════════════════════
       SOCIAL TICKER (Server News Crawl)
       ══════════════════════════════════════════════════════════════ */
    _initSocialTicker() {
        this.tickerWrapper = document.getElementById('social-ticker-wrapper');
        if (!this.tickerWrapper) return;
        this._startTickerCycle();
    }

    _startTickerCycle() {
        const createNewsItem = (text) => {
            const item = document.createElement('div');
            item.className = 'ticker-item';
            item.innerHTML = text;
            return item;
        };

        const generateNews = () => {
            const names = ['Kaelthas', 'Jaina', 'Arthas', 'Sylvanas', 'Thrall', 'Illidan', 'Uther', 'Malfurion', 'Tyrande', 'Anduin', 'Valeera', 'Morgl', 'Genn', 'Teron', 'Grommash'];
            const zones = CONFIG.ZONES.map(z => z.name);
            const bosses = Object.values(CONFIG.ZONE_BOSSES).map(b => b.name);
            const items = ['Legendary Aetherblade', 'Void-Touched Mantle', 'Primal Thorn Bow', 'Sun-Blessed Scepter', 'Epoch-Shifting Ring', 'Hivespire Greatcloak', 'Ancient Ringworld Core'];
            
            const r = Math.random();
            const name = names[Math.floor(Math.random() * names.length)] + (Math.floor(Math.random() * 900) + 100);
            
            if (r < 0.25) {
                return `<span class="ticker-highlight">${name}</span> has reached <span class="ticker-legendary">Paragon Level ${Math.floor(Math.random() * 50) + 1}</span>!`;
            } else if (r < 0.5) {
                const item = items[Math.floor(Math.random() * items.length)];
                return `<span class="ticker-highlight">${name}</span> found <span class="ticker-legendary">[${item}]</span> in ${zones[Math.floor(Math.random() * zones.length)]}!`;
            } else if (r < 0.75) {
                const boss = bosses[Math.floor(Math.random() * bosses.length)];
                return `<span class="ticker-highlight">${name}</span>'s party has defeated <span class="ticker-boss">${boss}</span>!`;
            } else {
                const worldEvents = [
                    "The <span class='ticker-event'>Hivemind</span> is stirring in the <span style='color: #cc4444'>Crimson Reach</span>...",
                    "Aetheric storms detected in the <span style='color: #dd44ff'>Neon Wastes</span>.",
                    "The <span style='color: #44ddaa'>Ancient Ringworld</span> conduits are overcharging.",
                    "A rare <span style='color: #66bbff'>Frost Dragon</span> has been spotted in the Shattered Expanse.",
                    "Merchant caravans report heavy <span style='color: #44cc44'>Wurm activity</span> in the Verdant Wilds.",
                    "The <span class='ticker-boss'>Drowned God</span>'s pulse echoes from the depths...",
                    "New supply caches have been dropped in the <span class='ticker-event'>Battlegrounds</span>."
                ];
                return worldEvents[Math.floor(Math.random() * worldEvents.length)];
            }
        };

        // Initial items to fill space
        for (let i = 0; i < 6; i++) {
            this.tickerWrapper.appendChild(createNewsItem(generateNews()));
        }

        let offset = 0;
        const animate = () => {
            offset -= 0.6; // Speed (px per frame)
            this.tickerWrapper.style.transform = `translateX(${offset}px)`;

            const firstItem = this.tickerWrapper.firstElementChild;
            if (firstItem && firstItem.getBoundingClientRect().right < 0) {
                this.tickerWrapper.removeChild(firstItem);
                this.tickerWrapper.appendChild(createNewsItem(generateNews()));
                // Compensate offset for the removed item's width + margin
                // We don't actually need to jump offset if we use translateX relative to start, 
                // but for infinite scrolling we reset.
                // Simpler: just keep offset going and reset when it gets too large? 
                // Better: keep offset as is, but reposition wrapper.
                offset += firstItem.offsetWidth + 60; // 60 is ticker-item margin-right
                this.tickerWrapper.style.transform = `translateX(${offset}px)`;
            }
            this._tickerFrame = requestAnimationFrame(animate);
        };
        this._tickerFrame = requestAnimationFrame(animate);
    }

    renderAetherbitShop() {
        const body = document.getElementById('aetherbit-shop-body');
        if (!body) return;
        this._refreshAetherbitShopCurrency();

        let html = '';
        html += `<div style="font-family:'Inter',sans-serif;font-size:11px;color:#8899aa;line-height:1.4;margin-bottom:12px;font-style:italic;padding:8px 12px;background:rgba(0,0,0,0.2);border-radius:4px;border:1px solid rgba(120,80,180,0.15);">`;
        html += `Permanent account-wide upgrades purchased with ${AETHERBIT_NAME}. Each upgrade has 5 tiers — invest for lasting power.`;
        html += `</div>`;

        for (const def of AETHERBIT_UPGRADES) {
            const currentTier = aetherbitShop.upgradeLevels[def.id] || 0;
            const isMaxed = currentTier >= def.tiers.length;
            const next = aetherbitShop.getNextTier(def.id);
            const canAfford = next ? gameState.karma >= next.cost : false;

            let cardClass = 'aeth-upgrade-card';
            if (isMaxed) cardClass += ' maxed';
            else if (canAfford) cardClass += ' can-buy';
            else cardClass += ' cant-afford';

            // Compute current total bonus for display
            let bonusText = '';
            switch (def.effect) {
                case 'moveSpeed': bonusText = `+${Math.round(aetherbitShop.getMoveSpeedBonus() * 100)}% Move Speed`; break;
                case 'lootLuck': bonusText = `+${aetherbitShop.getLootLuckBonus()}% Rare Drop Chance`; break;
                case 'lifesteal': bonusText = `${Math.round(aetherbitShop.getLifestealFraction() * 100)}% Lifesteal`; break;
                case 'passiveGold': bonusText = `+${aetherbitShop.getPassiveGoldPerSec().toFixed(1)} Gold/sec`; break;
                case 'baseDps': bonusText = `+${Math.round(aetherbitShop.getBaseDPSBonus() * 100)}% Base DPS`; break;
                case 'cooldownReduction': bonusText = `-${Math.round(aetherbitShop.getCooldownReduction() * 100)}% Cooldowns`; break;
                case 'critDamage': bonusText = `+${Math.round(aetherbitShop.getCritDamageBonus() * 100)}% Crit Damage`; break;
                case 'damageReduction': bonusText = `${Math.round(aetherbitShop.getDamageReduction() * 100)}% Damage Reduction`; break;
                case 'gatherSpeed': bonusText = `+${Math.round(aetherbitShop.getGatherSpeedBonus() * 100)}% Gather Speed`; break;
                case 'xpBonus': bonusText = `+${Math.round(aetherbitShop.getXpBonus() * 100)}% XP Gained`; break;
                case 'hpRegen': bonusText = `+${Math.round(aetherbitShop.getHpRegenBonus() * 100)}% HP Regen`; break;
                case 'paragonXp': bonusText = `+${Math.round(aetherbitShop.getParagonXpBonus() * 100)}% Paragon XP`; break;
                case 'critChance': bonusText = `+${Math.round(aetherbitShop.getCritChanceBonus() * 100)}% Crit Chance`; break;
                case 'equipDropRate': bonusText = `+${Math.round(aetherbitShop.getEquipDropRateBonus() * 100)}% Equip Drop Rate`; break;
            }

            // Tier pips
            let pipsHtml = '<div class="aeth-tier-pips">';
            for (let p = 0; p < def.tiers.length; p++) {
                const filled = p < currentTier;
                pipsHtml += `<div class="aeth-pip ${filled ? 'filled' : ''} ${filled && isMaxed ? 'maxed' : ''}"></div>`;
            }
            pipsHtml += '</div>';

            // Name color
            const nameColor = isMaxed ? '#66ee88' : (currentTier > 0 ? '#cc88ff' : '#bbccdd');

            html += `<div class="${cardClass}" data-aeth-upgrade-id="${def.id}">`;
            html += `<div class="aeth-upgrade-icon">${def.icon}</div>`;
            html += `<div class="aeth-upgrade-info">`;
            html += `<div class="aeth-upgrade-name" style="color:${nameColor}">${def.name}</div>`;
            html += `<div class="aeth-upgrade-desc">${def.description}</div>`;
            if (currentTier > 0 || isMaxed) {
                html += `<div class="aeth-upgrade-bonus">Current: <span class="val" style="color:#cc88ff">${bonusText}</span>${isMaxed ? ' <span style="color:#66ee88;font-size:9px;">(MAX)</span>' : ''}</div>`;
            }
            html += pipsHtml;
            html += `</div>`;
            html += `<div class="aeth-upgrade-right">`;
            if (isMaxed) {
                html += `<div class="shop-item-status maxed">✓ MAX</div>`;
            } else {
                html += `<div class="shop-item-cost ${canAfford ? 'affordable' : 'expensive'}" style="${canAfford ? 'color:#bb88ee' : ''}">${iconImg('aetherbit', 12)} ${next.cost}</div>`;
                html += `<div class="shop-item-desc" style="font-size:9px;">Next: ${next.label}</div>`;
            }
            html += `</div></div>`;
        }

        // ── Stats Summary ──
        html += `<div class="shop-stats-summary" style="border-color:rgba(120,80,180,0.12);">`;
        html += `<div class="shop-stat-row"><span>Total ${AETHERBIT_NAME} Spent</span><span class="shop-stat-val" style="color:#bb88cc">${aetherbitShop.totalAetherbitsSpent}</span></div>`;
        const totalTiers = AETHERBIT_UPGRADES.reduce((s, u) => s + (aetherbitShop.upgradeLevels[u.id] || 0), 0);
        const maxTiers = AETHERBIT_UPGRADES.length * 5;
        html += `<div class="shop-stat-row"><span>Tiers Unlocked</span><span class="shop-stat-val" style="color:#bb88cc">${totalTiers}/${maxTiers}</span></div>`;
        const gps = aetherbitShop.getPassiveGoldPerSec();
        if (gps > 0) {
            html += `<div class="shop-stat-row"><span>Passive Gold Income</span><span class="shop-stat-val" style="color:#ffdd66">+${gps.toFixed(1)}/sec</span></div>`;
        }
        html += `</div>`;

        // Toast area
        html += `<div id="aetherbit-shop-toast-area"></div>`;

        body.innerHTML = html;

        // ── Wire click handlers ──
        body.querySelectorAll('[data-aeth-upgrade-id]').forEach(el => {
            if (el.classList.contains('maxed')) return;
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-aeth-upgrade-id');
                const result = aetherbitShop.buyUpgrade(id);
                this._showShopToast('aetherbit-shop-toast-area', result.success, result.success ? `Upgraded: ${result.label}` : result.reason);
                this.renderAetherbitShop();
            });
        });
    }

    /** Show a toast inside a shop panel */
    _showShopToast(areaId, success, msg) {
        const area = document.getElementById(areaId);
        if (!area) return;
        const toast = document.createElement('div');
        toast.className = `shop-toast ${success ? 'success' : 'fail'}`;
        toast.textContent = msg;
        area.innerHTML = '';
        area.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2800);
    }

    /* ────── Talent Ability Bar (4 slots right of action bar) ────── */
    _renderTalentBar() {
        const abilities = talentTree.getUnlockedTalentAbilities();
        const keybinds = ['F1', 'F2', 'F3', 'F4'];
        const hasAbilities = abilities.length > 0;

        // Gather ALL possible abilities for this class to show upcoming in empty slots
        const allAbilities = this._getAllTalentAbilitiesForClass();

        let html = `<div id="talent-bar-label">Talent Abilities</div>`;
        for (let i = 0; i < 4; i++) {
            const abil = abilities[i];
            if (abil) {
                // Check if this was just unlocked (for flash animation)
                const justUnlocked = this._talentJustUnlocked && this._talentJustUnlocked.has(abil.id);
                const extraClass = justUnlocked ? ' just-unlocked' : '';
                html += `<div class="talent-slot unlocked${extraClass}" id="talent-slot-${i}" data-talent-slot="${i}" title="${abil.name}: ${abil.description}">`;
                html += `<span class="skill-icon">${iconImgLg(abil.iconKey, 22)}</span>`;
                html += `<span class="skill-keybind">${keybinds[i]}</span>`;
                html += `<div class="skill-cooldown" id="talent-cd-${i}" style="display:none"></div>`;
                html += `</div>`;
            } else {
                // Show the next locked ability info if available
                const nextAbil = allAbilities[i];
                if (nextAbil) {
                    const branch = this._getBranchForAbility(nextAbil.id);
                    const branchSpent = branch ? talentTree.getSpentInBranch(branch.id) : 0;
                    const ptsNeeded = Math.max(0, nextAbil.unlockReq - branchSpent);
                    html += `<div class="talent-slot empty" id="talent-slot-${i}" data-talent-slot="${i}" data-locked-abil="${nextAbil.id}">`;
                    html += `<span class="talent-lock-overlay">${iconImg(nextAbil.iconKey, 16, 'filter:grayscale(1) brightness(0.4); opacity:0.5;')}</span>`;
                    html += `<span class="talent-lock-req">${ptsNeeded}pt</span>`;
                    html += `</div>`;
                } else {
                    html += `<div class="talent-slot empty" id="talent-slot-${i}">`;
                    html += `<span class="talent-lock-overlay">${iconImg('lock', 14, 'opacity:0.3;')}</span>`;
                    html += `</div>`;
                }
            }
        }

        // Update bar class for label styling
        requestAnimationFrame(() => {
            const bar = document.getElementById('talent-bar');
            if (bar) bar.classList.toggle('has-abilities', hasAbilities);
        });

        // Clear the just-unlocked set after rendering so animation only plays once
        if (this._talentJustUnlocked) this._talentJustUnlocked = null;

        return html;
    }

    /** Get all talent abilities for the current class, sorted by unlock requirement */
    _getAllTalentAbilitiesForClass() {
        const branches = talentTree.getAvailableBranches();
        const all = [];
        for (const branch of branches) {
            for (const abilId of branch.abilities) {
                const abil = TALENT_ABILITIES[abilId];
                if (abil) all.push(abil);
            }
        }
        all.sort((a, b) => a.unlockReq - b.unlockReq);
        return all;
    }

    /** Find the branch that contains a given ability */
    _getBranchForAbility(abilId) {
        const branches = talentTree.getAvailableBranches();
        return branches.find(b => b.abilities.includes(abilId)) || null;
    }

    /** Rebuild the talent bar HTML when abilities change (allocate/deallocate/reset) */
    _refreshTalentBar() {
        const bar = document.getElementById('talent-bar');
        if (!bar) return;
        bar.innerHTML = this._renderTalentBar();
        // Re-wire tooltips for new slots
        this._wireTalentBarTooltips();
        // Re-cache talent CD DOM refs
        this._domTalentCd = [];
        for (let i = 0; i < 4; i++) {
            this._domTalentCd.push(document.getElementById(`talent-cd-${i}`));
        }
    }

    /** Wire talent bar slot hover tooltips */
    _wireTalentBarTooltips() {
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`talent-slot-${i}`);
            if (!el || el.classList.contains('empty')) continue;
            el.addEventListener('mouseenter', (e) => this._showTalentAbilityTooltip(i, e));
            el.addEventListener('mouseleave', () => this.hideSkillTooltip());
        }
    }

    /** Show tooltip for a talent ability slot */
    _showTalentAbilityTooltip(slotIdx, event) {
        this.hideSkillTooltip();
        const abilities = talentTree.getUnlockedTalentAbilities();
        const abil = abilities[slotIdx];
        if (!abil) return;

        const tt = document.createElement('div');
        tt.className = 'skill-tooltip';

        const cdText = abil.cooldown > 0 ? `${abil.cooldown}s CD` : 'No CD';
        const manaText = abil.manaCost > 0 ? `${abil.manaCost} Mana` : 'Free';
        const dmgText = abil.dpsMultiplier > 0 ? `${abil.dpsMultiplier}x Damage` : 'Utility';

        let html = `<div class="stt-name" style="color:${abil.nameColor || '#ccddcc'}">${abil.name}</div>`;
        html += `<div class="stt-meta"><span>${cdText}</span><span>${manaText}</span><span>${dmgText}</span></div>`;
        html += `<div class="stt-desc">${abil.description}</div>`;
        html += `<div class="stt-unlock ready">✓ Talent Ability · Auto-cast in combat</div>`;

        tt.innerHTML = html;
        document.body.appendChild(tt);
        this._skillTooltip = tt;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.min(rect.left, window.innerWidth - 270);
        const y = Math.max(10, rect.top - tt.offsetHeight - 8);
        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
    }

    /** Update talent ability cooldown overlays (called from update loop) */
    _updateTalentCooldowns() {
        if (!this._domTalentCd) {
            this._domTalentCd = [];
            for (let i = 0; i < 4; i++) {
                this._domTalentCd.push(document.getElementById(`talent-cd-${i}`));
            }
        }
        for (let i = 0; i < 4; i++) {
            const cdEl = this._domTalentCd[i];
            if (!cdEl) continue;
            const cd = talentTree.talentAbilityCooldowns[i];
            if (cd > 0) {
                cdEl.style.display = 'flex';
                cdEl.textContent = Math.ceil(cd);
            } else {
                cdEl.style.display = 'none';
            }
        }
    }

    /** Update the HD Graphics toggle button visual state */
    _updateHdToggle() {
        const btn = document.getElementById('hd-toggle-btn');
        if (!btn) return;
        const hdOn = !gameState.lowResMode;
        btn.classList.toggle('hd-active', hdOn);
    }

    escapeHtml(text) {
        // Reuse a single off-screen element instead of creating one per call
        if (!this._escDiv) this._escDiv = document.createElement('div');
        this._escDiv.textContent = text;
        return this._escDiv.innerHTML;
    }

    /* ══════════════════════════════════════════════════════════════
       DUNGEON FINDER PANEL
       ══════════════════════════════════════════════════════════════ */

    toggleDungeonPanel(force) {
        const panel = document.getElementById('dungeon-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.dungeonPanelOpen = true;
            panel.classList.add('open');
            this.renderDungeonPanel();
            audioManager.playUiOpen();
            // Mark all currently accessible dungeons as seen — dismisses NEW badge
            const accessibleDungeons = DUNGEON_DEFS.filter(dd => gameState.canAccessZone(dd.unlockZone) && gameState.level >= dd.levelRange[0]).length;
            gameState.seenDungeonCount = Math.max(gameState.seenDungeonCount, accessibleDungeons);
        } else {
            this.dungeonPanelOpen = false;
            panel.classList.remove('open');
        }
    }

    _setupDungeonListeners() {
        const btn = document.getElementById('dungeon-btn');
        if (btn) btn.addEventListener('click', () => this.toggleDungeonPanel());
        const close = document.getElementById('dungeon-panel-close');
        if (close) close.addEventListener('click', () => this.toggleDungeonPanel(false));

        // Dungeon Ready Popup Listeners
        const dngReadyAccept = document.getElementById('dungeon-ready-accept');
        const dngReadyDecline = document.getElementById('dungeon-ready-decline');
        if (dngReadyAccept) dngReadyAccept.addEventListener('click', () => {
            dungeonSystem.acceptMatch();
            this._hideDungeonReadyPopup();
        });
        if (dngReadyDecline) dngReadyDecline.addEventListener('click', () => {
            dungeonSystem.declineMatch();
            this._hideDungeonReadyPopup();
        });

        const body = document.getElementById('dungeon-panel-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Queue button
                const queueBtn = e.target.closest('.dg-queue-btn');
                if (queueBtn && !queueBtn.classList.contains('disabled')) {
                    const dungeonId = queueBtn.dataset.dungeonId;
                    if (dungeonId && dungeonSystem.queueDungeon(dungeonId)) {
                        this.dungeonPanelOpen = false;
                        document.getElementById('dungeon-panel')?.classList.remove('open');
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Leave dungeon button
                const leaveBtn = e.target.closest('.dg-action-btn.leave');
                if (leaveBtn) {
                    dungeonSystem.leaveDungeon();
                    this.renderDungeonPanel();
                    return;
                }
                // Requeue button
                const requeueBtn = e.target.closest('.dg-action-btn.requeue');
                if (requeueBtn) {
                    const dungeonId = requeueBtn.dataset.dungeonId;
                    if (dungeonId) {
                        dungeonSystem.leaveDungeon();
                        // Small delay then requeue
                        setTimeout(() => {
                            dungeonSystem.queueDungeon(dungeonId);
                            this.renderDungeonPanel();
                        }, 100);
                    }
                    return;
                }
            });
        }
    }

    updateDungeonBtn() {
        const btn = document.getElementById('dungeon-btn');
        if (!btn) return;
        const unlocked = dungeonSystem.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const badge = document.getElementById('dungeon-btn-badge');
            const inDungeon = dungeonSystem.isInDungeon();
            if (badge) {
                if (inDungeon) {
                    const prog = dungeonSystem.getProgress();
                    const stateLabel = { queue: '⏳', forming: '👥', entering: '🚪', combat: '⚔️', complete: '🏆', failed: '☠️', loot: '💰' };
                    badge.textContent = stateLabel[prog?.state] || '';
                } else {
                    badge.textContent = dungeonSystem.totalClears > 0 ? `${dungeonSystem.totalClears}` : '';
                }
            }
            // Glow when in dungeon
            btn.classList.toggle('dungeon-active', inDungeon);
        }
    }

    _updateDungeonPanelIfDirty() {
        const inst = dungeonSystem.instance;
        // Build a state hash to detect if we actually need a full re-render
        let stateHash = inst ? `${inst.state}|${inst.chatLog?.length || 0}|${inst.mobs?.length || 0}` : 'no-inst';
        if (inst && inst.state === 'combat') {
            stateHash += `|${inst.encounterIndex}`;
        }
        
        if (this._lastDungeonStateHash !== stateHash) {
            this._lastDungeonStateHash = stateHash;
            this.renderDungeonPanel();
        } else if (inst) {
            // Update timers/progress bars without full re-render
            const timerEl = document.querySelector('.pvp-match-timer .val');
            if (timerEl && inst.state === 'queue') timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
            if (timerEl && inst.state === 'match_found') timerEl.textContent = `${Math.ceil(inst.timer)}s`;
        }
    }

    renderDungeonPanel() {
        const body = document.getElementById('dungeon-panel-body');
        if (!body) return;

        const inst = dungeonSystem.instance;
        let html = '';

        if (inst) {
            const state = inst.state;
            if (state === 'queue' || state === 'match_found' || state === 'forming' || state === 'entering') {
                // If in queue or ready states, we just show the browser.
                // The mini-queue widget or global ready popup handles the interaction.
                html = this._renderDungeonBrowser();
            } else {
                html = this._renderActiveDungeon(inst);
            }
        } else {
            html = this._renderDungeonBrowser();
        }

        body.innerHTML = html;

        // Auto-scroll chat feed
        const chatFeed = body.querySelector('.dg-chat-feed');
        if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    _renderDungeonBrowser() {
        let html = '';

        // Cooldown indicator
        if (dungeonSystem.cooldownTimer > 0) {
            html += `<div class="dg-cooldown-bar">
                <div class="dg-cooldown-text">⏳ Queue cooldown: ${Math.ceil(dungeonSystem.cooldownTimer)}s</div>
            </div>`;
        }

        // Available dungeons
        const available = DUNGEON_DEFS;
        for (const def of available) {
            const canAccess = gameState.canAccessZone(def.unlockZone) && gameState.level >= def.levelRange[0];
            const canQueue = dungeonSystem.canQueue(def.id);
            const stats = dungeonSystem.getDungeonStats(def.id);

            html += `<div class="dg-card ${canAccess ? '' : 'locked'}">`;

            // Loading image as header
            html += `<div class="dg-loading-screen" style="background-image:url('${def.loadingImage}');height:120px;">
                <div class="dg-loading-overlay" style="background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.75) 100%);">
                    <div class="dg-loading-text" style="font-size:16px;">${def.name}</div>
                </div>
            </div>`;

            html += `<div class="dg-card-top" style="margin-top:8px;">`;
            html += `<div class="dg-card-icon">${def.iconKey ? iconImgLg(def.iconKey, 36) : def.icon}</div>`;
            html += `<div class="dg-card-info">`;
            html += `<div class="dg-card-subtitle">${def.subtitle}</div>`;
            html += `<div class="dg-card-desc">${def.description}</div>`;
            html += `<div class="dg-card-meta">`;
            html += `<span>Level <span class="val">${def.levelRange[0]}-${def.levelRange[1]}</span></span>`;
            html += `<span>Encounters <span class="val">${def.encounters.length}</span></span>`;
            html += `<span>Est. <span class="val">${def.estimatedTime}</span></span>`;
            if (stats.clears > 0) {
                html += `<span>Clears <span class="val">${stats.clears}</span></span>`;
                if (stats.bestTime !== Infinity) {
                    html += `<span>Best <span class="val">${this._dgFormatTime(stats.bestTime)}</span></span>`;
                }
            }
            html += `</div>`;
            html += `</div></div>`; // close card-top

            // Rewards preview
            const rewards = stats.firstClear ? def.repeatRewards : def.firstClearRewards;
            const rewardLabel = stats.firstClear ? 'Repeat Rewards' : '✨ First Clear Rewards';
            html += `<div style="margin-top:8px;padding:6px 8px;background:rgba(255,200,60,0.04);border:1px solid rgba(255,200,60,0.1);border-radius:4px;">`;
            html += `<div style="font-family:'Inter',sans-serif;font-size:9px;color:#887766;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${rewardLabel}</div>`;
            html += `<div style="display:flex;gap:10px;flex-wrap:wrap;font-family:'Inter',sans-serif;font-size:10px;color:#ccbb88;">`;
            if (rewards.gold) html += `<span>${iconImg('goldCoin', 12)} <span style="color:#ffdd66;font-weight:600;">${rewards.gold}</span>g</span>`;
            if (rewards.xp) html += `<span>${iconImg('xpStar', 12)} <span style="color:#ffdd66;font-weight:600;">${rewards.xp}</span> XP</span>`;
            if (rewards.karma) html += `<span>${iconImg('aetherbit', 12)} <span style="color:#ffdd66;font-weight:600;">${rewards.karma}</span></span>`;
            if (rewards.soulEssence) html += `<span>${iconImg('soulEssence', 12)} <span style="color:#ff9944;font-weight:600;">${rewards.soulEssence}</span> Soul Ess.</span>`;
            html += `</div></div>`;

            // Queue button
            if (canAccess) {
                const btnClass = canQueue ? '' : ' disabled';
                const btnText = canQueue ? '⚔️ Enter Dungeon Finder' : (dungeonSystem.cooldownTimer > 0 ? `Cooldown ${Math.ceil(dungeonSystem.cooldownTimer)}s` : 'Level too low');
                html += `<div class="dg-queue-btn${btnClass}" data-dungeon-id="${def.id}">${btnText}</div>`;
            } else {
                html += `<div class="dg-queue-btn disabled">🔒 Requires Level ${def.levelRange[0]} & ${def.unlockZone === 'molten_abyss' ? 'Molten Wasteland' : def.unlockZone}</div>`;
            }

            html += `</div>`; // close dg-card
        }

        return html;
    }

    _renderActiveDungeon(inst) {
        const prog = dungeonSystem.getProgress();
        if (!prog) return '';
        let html = '';
        const def = prog.dungeonDef;
        const state = prog.state;

        // ── Queue / Match Found / Forming / Entering phases — show loading screen ──
        if (state === 'queue' || state === 'match_found' || state === 'forming' || state === 'entering') {
            html += `<div class="dg-loading-screen" style="background-image:url('${def.loadingImage}');">
                <div class="dg-loading-overlay">
                    <div class="dg-loading-text">${def.name}</div>
                    <div class="dg-loading-bar-bg">
                        <div class="dg-loading-bar-fill" style="width:${state === 'queue' ? '20' : state === 'match_found' ? '40' : state === 'forming' ? '65' : '90'}%;"></div>
                    </div>
                    <div style="font-family:'Inter',sans-serif;font-size:10px;color:#ccaa77;margin-top:4px;">
                        ${state === 'queue' ? '⏳ Searching for group...' : state === 'match_found' ? '🔔 Match found! Click the prompt to enter...' : state === 'forming' ? '👥 Group forming...' : '🚪 Entering dungeon...'}
                    </div>
                </div>
            </div>`;

            if (state === 'queue' || state === 'match_found') {
                const members = inst.partyMembers || [];
                const membersHtml = members.map(m => `
                    <div style="display:flex; align-items:center; gap:6px; font-size:10px; color:#ccaa77; margin-bottom:2px;">
                        <span>${m.display.icon}</span>
                        <span style="flex:1; text-align:left;">${m.name}</span>
                        <span style="opacity:0.7;">${m.role}</span>
                        <span style="color:#66dd66;">Ready</span>
                    </div>
                `).join('');

                const boxStyle = state === 'queue' ? 'border-color:#ffaa44;' : 'border-color:#ffaa44;';
                const title = state === 'queue' ? 'SEARCHING FOR GROUP...' : 'DUNGEON READY!';
                const desc = state === 'queue' ? 'Finding adventurers for the Embercrypt...' : 'Your group is ready. Check the notification to enter.';
                const timerLabel = state === 'queue' ? 'Time in queue:' : 'Time Remaining:';
                const timerVal = state === 'queue' ? `${Math.floor(inst.totalTime)}s` : `${Math.ceil(inst.timer)}s`;
                
                const acceptBtn = state === 'match_found' ? `
                    <div class="pvp-match-btn accept" style="background: linear-gradient(180deg, #ffaa44, #cc7722); border-color: #ffaa44;" onclick="window._dungeonAccept()">ENTER DUNGEON</div>
                ` : '';
                const declineLabel = state === 'queue' ? 'LEAVE QUEUE' : 'DECLINE';
                const declineFn = state === 'queue' ? 'window._dungeonLeave()' : 'window._dungeonDecline()';

                html += `
                <div class="pvp-match-found-overlay">
                    <div class="pvp-match-box" style="${boxStyle}">
                        <div class="pvp-match-title" style="color:#ffaa44;">${title}</div>
                        <div class="pvp-match-name">${def.name}</div>
                        <div class="pvp-match-desc">${desc}</div>
                        
                        ${members.length > 0 ? `
                            <div style="margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid rgba(255,160,60,0.15);">
                                <div style="font-size:9px; color:#887766; text-transform:uppercase; margin-bottom:6px; text-align:left;">Your Group (${members.length + 1}/5)</div>
                                <div style="display:flex; align-items:center; gap:6px; font-size:10px; color:#66ccff; margin-bottom:4px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span>👤</span>
                                    <span style="flex:1; text-align:left;">${gameState.playerName} (You)</span>
                                    <span style="color:#66dd66;">Ready</span>
                                </div>
                                ${membersHtml}
                                ${members.length < 4 ? `
                                    <div style="font-size:10px; color:#887766; font-style:italic; margin-top:4px; text-align:left;">Searching for ${4 - members.length} more...</div>
                                ` : ''}
                            </div>
                        ` : ''}

                        <div class="pvp-match-timer">${timerLabel} <span class="val">${timerVal}</span></div>
                        <div class="pvp-match-btns">
                            ${acceptBtn}
                            <div class="pvp-match-btn decline" onclick="${declineFn}">${declineLabel}</div>
                        </div>
                    </div>
                </div>`;
            }
        }

        // ── Combat / Complete / Failed — show dungeon HUD ──
        if (state === 'combat' || state === 'complete' || state === 'failed') {
            // Encounter progress tracker
            html += `<div class="dg-progress-tracker">`;
            for (let i = 0; i < prog.totalEncounters; i++) {
                const enc = def.encounters[i];
                const isBoss = enc.type === 'boss' || enc.type === 'miniboss';
                let nodeClass = 'dg-progress-node';
                if (i < prog.encounterIndex) nodeClass += ' cleared';
                else if (i === prog.encounterIndex && state === 'combat') nodeClass += ' active';
                if (isBoss) nodeClass += ' boss';
                html += `<div class="${nodeClass}" title="${enc.name}"></div>`;
            }
            html += `</div>`;

            // Timer
            html += `<div style="text-align:right;margin-bottom:6px;">
                <span class="dg-encounter-timer">⏱️ ${this._dgFormatTime(prog.totalTime)}</span>
            </div>`;
        }

        // ── Current encounter info (combat only) ──
        if (state === 'combat' && prog.currentEncounter) {
            const enc = prog.currentEncounter;
            const encIcon = enc.type === 'boss' ? '💀' : enc.type === 'miniboss' ? '⚠️' : '⚔️';
            html += `<div class="dg-encounter-info">
                <div class="dg-encounter-name">${encIcon} ${enc.name}</div>
                <div class="dg-encounter-desc">${enc.description}</div>
            </div>`;

            // Boss phase banners
            if (enc.phases) {
                const bossMob = prog.mobs.find(m => m.isBoss && m.alive);
                if (bossMob) {
                    const hpPct = bossMob.hp / bossMob.maxHp;
                    for (let pi = enc.phases.length - 1; pi >= 0; pi--) {
                        const phase = enc.phases[pi];
                        if (hpPct <= phase.hpThreshold) {
                            html += `<div class="dg-phase-banner">
                                <div class="dg-phase-banner-text">⚠️ ${phase.name} — ${phase.description}</div>
                            </div>`;
                            break;
                        }
                    }
                }
            }

            // Party HP bar
            const partyHp = Math.max(0, Math.min(100, prog.partyHp));
            const hpClass = partyHp > 60 ? 'high' : partyHp > 30 ? 'mid' : 'low';
            html += `<div class="dg-party-hp-section">
                <div class="dg-party-hp-label">
                    <span>Party Health</span>
                    <span style="color:${hpClass === 'high' ? '#66cc66' : hpClass === 'mid' ? '#ccaa44' : '#cc4444'};font-weight:600;">${Math.floor(partyHp)}%</span>
                </div>
                <div class="dg-party-hp-bg">
                    <div class="dg-party-hp-fill ${hpClass}" style="width:${partyHp}%;"></div>
                </div>
            </div>`;

            // Mob health bars
            const aliveMobs = prog.mobs.filter(m => m.alive);
            const deadMobs = prog.mobs.filter(m => !m.alive);
            if (aliveMobs.length > 0 || deadMobs.length > 0) {
                html += `<div class="dg-mobs-section">`;
                for (const mob of aliveMobs) {
                    const hpPct = Math.max(0, (mob.hp / mob.maxHp) * 100);
                    const isBoss = mob.isBoss;
                    html += `<div class="dg-mob-row ${isBoss ? 'boss-mob' : ''}">
                        <div class="dg-mob-name ${isBoss ? 'boss-name' : ''}">${isBoss ? '💀 ' : ''}${mob.name}</div>
                        <div class="dg-mob-bar-bg"><div class="dg-mob-bar-fill ${isBoss ? 'boss-bar' : ''}" style="width:${hpPct}%;"></div></div>
                        <div class="dg-mob-hp">${Math.floor(hpPct)}%</div>
                    </div>`;
                }
                for (const mob of deadMobs) {
                    html += `<div class="dg-mob-row dead">
                        <div class="dg-mob-name">${mob.name}</div>
                        <div class="dg-mob-bar-bg"><div class="dg-mob-bar-fill" style="width:0%;"></div></div>
                        <div class="dg-mob-hp">☠️</div>
                    </div>`;
                }
                html += `</div>`;
            }
        }

        // ── Party frames ──
        if (state === 'combat' || state === 'forming' || state === 'entering') {
            html += `<div class="dg-party-section">`;
            html += `<div class="dg-party-header">Party</div>`;
            html += `<div class="dg-party-frames">`;

            // Player frame
            const playerRole = gameState.classId === 'warrior' ? 'Tank' : gameState.classId === 'cleric' ? 'Healer' : 'DPS';
            const playerClassDisplay = { warrior: { color: '#4488cc', icon: '⚔️' }, mage: { color: '#aa66ff', icon: '🔮' }, ranger: { color: '#66bb44', icon: '🏹' }, cleric: { color: '#ffcc44', icon: '✨' } };
            const pcd = playerClassDisplay[gameState.classId] || { color: '#ccc', icon: '❓' };
            html += `<div class="dg-party-frame">
                <div class="dg-pf-top">
                    <span class="dg-pf-name" style="color:${pcd.color};">${pcd.icon} ${gameState.playerName}</span>
                    <span class="dg-pf-role" style="color:${pcd.color};">${playerRole}</span>
                </div>
                <div class="dg-pf-bar-bg"><div class="dg-pf-bar-fill" style="width:100%;"></div></div>
            </div>`;

            // NPC frames
            for (const m of prog.partyMembers) {
                html += `<div class="dg-party-frame ${m.alive ? '' : 'dead'}">
                    <div class="dg-pf-top">
                        <span class="dg-pf-name" style="color:${m.display.color};">${m.display.icon} ${m.name}</span>
                        <span class="dg-pf-role" style="color:${m.display.color};">${m.role}</span>
                    </div>
                    <div class="dg-pf-bar-bg"><div class="dg-pf-bar-fill" style="width:${m.alive ? '100' : '0'}%;${m.alive ? '' : 'background:#cc3322;'}"></div></div>
                </div>`;
            }
            html += `</div></div>`;
        }

        // ── Result screen (complete/failed) ──
        if (state === 'complete') {
            html += `<div class="dg-result victory">
                <div class="dg-result-icon">🏆</div>
                <div class="dg-result-title">DUNGEON CLEARED!</div>
                <div class="dg-result-sub">${def.name} — ${def.subtitle}</div>
                <div class="dg-result-time">Time: ${this._dgFormatTime(prog.totalTime)}</div>
            </div>`;

            // Loot summary
            const loot = prog.loot;
            html += `<div class="dg-loot-section">
                <div class="dg-loot-title">${prog.isFirstClear ? '✨ First Clear Rewards!' : '💰 Rewards'}</div>
                <div class="dg-loot-grid">`;
            if (loot.gold > 0) html += `<div class="dg-loot-item">${iconImg('goldCoin', 14)} <span class="val">${loot.gold}</span> Gold</div>`;
            if (loot.xp > 0) html += `<div class="dg-loot-item">${iconImg('xpStar', 14)} <span class="val">${loot.xp}</span> XP</div>`;
            if (loot.karma > 0) html += `<div class="dg-loot-item">${iconImg('aetherbit', 14)} <span class="val">${loot.karma}</span> ${AETHERBIT_NAME}</div>`;
            if (loot.soulEssence > 0) html += `<div class="dg-loot-item">${iconImg('soulEssence', 14)} <span class="val" style="color:#ff9944">${loot.soulEssence}</span> Soul Essence</div>`;
            html += `</div></div>`;

            // Action buttons
            html += `<div style="text-align:center;margin-top:10px;">
                <div class="dg-action-btn requeue" data-dungeon-id="${def.id}">⚔️ Queue Again</div>
                <div class="dg-action-btn leave" style="margin-left:10px;">Leave Dungeon</div>
            </div>`;
        }

        if (state === 'failed') {
            html += `<div class="dg-result defeat">
                <div class="dg-result-icon">☠️</div>
                <div class="dg-result-title">PARTY WIPED</div>
                <div class="dg-result-sub">${def.name} — Your party has been defeated</div>
                <div class="dg-result-time">Survived: ${this._dgFormatTime(prog.totalTime)}</div>
            </div>`;

            // Action buttons
            html += `<div style="text-align:center;margin-top:10px;">
                <div class="dg-action-btn requeue" data-dungeon-id="${def.id}">⚔️ Try Again</div>
                <div class="dg-action-btn leave" style="margin-left:10px;">Leave</div>
            </div>`;
        }

        // ── Chat feed (always visible during instance) ──
        if (prog.chatLog.length > 0) {
            html += `<div class="dg-chat-section">`;
            html += `<div class="dg-chat-header">💬 Dungeon Chat</div>`;
            html += `<div class="dg-chat-feed">`;
            const chatSlice = prog.chatLog.slice(-20); // last 20 messages
            for (const msg of chatSlice) {
                if (msg.user === 'SYSTEM') {
                    html += `<div class="dg-chat-line"><span class="dg-chat-system">${this.escapeHtml(msg.msg)}</span></div>`;
                } else {
                    const color = msg.color || '#ccbb88';
                    html += `<div class="dg-chat-line"><span class="dg-chat-user" style="color:${color};">[${this.escapeHtml(msg.user)}]</span>: ${this.escapeHtml(msg.msg)}</div>`;
                }
            }
            html += `</div></div>`;
        }

        // Leave button (during queue/forming/combat)
        if (state === 'queue' || state === 'forming' || state === 'entering' || state === 'combat') {
            html += `<div style="text-align:center;margin-top:6px;">
                <div class="dg-action-btn leave">✕ Leave Dungeon</div>
            </div>`;
        }

        return html;
    }

    _dgFormatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    /* ══════════════════════════════════════════════════════════════
       DUNGEON 3D HUD — Live overlay during active dungeon scene
       ══════════════════════════════════════════════════════════════ */
    _updateDungeonHud() {
        const hudEl = document.getElementById('dungeon-hud');
        if (!hudEl) return;

        const dgProg = dungeonSystem.getProgress();
        const rdProg = raidSystem.getProgress();
        const inDungeon = dungeonSystem.isInDungeon();
        const inRaid = raidSystem.isInRaid();
        
        const prog = rdProg || dgProg;
        const inInstance = inDungeon || inRaid;
        const inScene = prog && (prog.state === 'combat' || prog.state === 'complete' || prog.state === 'failed');

        // ── Hide / show overworld UI based on instance state ──
        const overworldIds = ['bottom-bar', 'overhead-nameplate', 'quest-log-panel', 'right-panel', 'nearby-events-panel'];
        const shouldHideOverworld = inInstance && (inScene || (prog && (prog.state === 'entering' || prog.state === 'forming')));
        if (shouldHideOverworld !== this._overworldHidden) {
            this._overworldHidden = shouldHideOverworld;
            for (const id of overworldIds) {
                const el = document.getElementById(id);
                if (el) el.style.display = shouldHideOverworld ? 'none' : '';
            }
        }

        // Show/hide HUD
        if (!inInstance || !inScene) {
            if (hudEl.style.display !== 'none') {
                hudEl.style.display = 'none';
                this._lastInstancePhase = null;
                this._dgHudListenersSet = false;
                const ro = document.getElementById('dg-hud-result-overlay');
                if (ro) ro.remove();
            }
            return;
        }
        if (hudEl.style.display === 'none') {
            hudEl.style.display = 'block';
            this._dgHudSetupListeners();
        }

        const def = inRaid ? prog.raidDef : prog.dungeonDef;

        // ── Top: Name + progress nodes + timer ──
        const nameEl = document.getElementById('dg-hud-name');
        if (nameEl) {
            nameEl.textContent = def.name + ' — ' + (def.subtitle || '');
            nameEl.style.color = inRaid ? '#cc3344' : '#ff9944'; // Red for raids, orange for dungeons
        }

        const progressEl = document.getElementById('dg-hud-progress');
        if (progressEl) {
            let html = '';
            for (let i = 0; i < prog.totalEncounters; i++) {
                if (i > 0) html += `<div class="dg-hud-connector${i <= prog.encounterIndex ? ' done' : ''}"></div>`;
                const enc = def.encounters[i];
                const isBoss = enc.type === 'boss' || enc.type === 'miniboss';
                let cls = 'dg-hud-node';
                if (i < prog.encounterIndex) cls += ' cleared';
                else if (i === prog.encounterIndex && prog.state === 'combat') cls += ' active';
                if (isBoss) cls += ' boss';
                html += `<div class="${cls}" title="${enc.name}"></div>`;
            }
            progressEl.innerHTML = html;
        }

        const timerEl = document.getElementById('dg-hud-timer');
        if (timerEl) timerEl.textContent = '⏱️ ' + this._rdFormatTime(prog.totalTime);

        // ── Left: Party frames ──
        const partyEl = document.getElementById('dg-hud-party');
        if (partyEl) {
            let html = '';
            // Player frame
            const pRole = gameState.classId === 'warrior' ? 'Tank' : gameState.classId === 'cleric' ? 'Healer' : 'DPS';
            const pColors = { warrior: '#4488cc', mage: '#aa66ff', ranger: '#66bb44', cleric: '#ffcc44' };
            const pIcons = { warrior: '⚔️', mage: '🔮', ranger: '🏹', cleric: '✨' };
            const pc = pColors[gameState.classId] || '#ccc';
            const pi = pIcons[gameState.classId] || '❓';
            html += `<div class="dg-hud-pf">
                <div class="dg-hud-pf-name" style="color:${pc}">${pi} ${gameState.playerName}</div>
                <div class="dg-hud-pf-role" style="color:${pc}">${pRole}</div>
                <div class="dg-hud-pf-bar"><div class="dg-hud-pf-fill" style="width:${Math.max(0,prog.partyHp)}%${prog.partyHp<30?' background:#cc3322':''}"></div></div>
            </div>`;
            
            // NPC frames (for Raid, we might want a slightly more compact view, but reusing DG frames for now)
            const members = prog.partyMembers || [];
            // Limit to first 4 for Dungeons, or show all for Raid but in a compact way?
            // User asked for "Party Frames (Middle)"
            for (const m of members) {
                html += `<div class="dg-hud-pf${m.alive ? '' : ' dead'}">
                    <div class="dg-hud-pf-name" style="color:${m.display?.color || '#ccc'}">${m.display?.icon || '👤'} ${m.name}</div>
                    <div class="dg-hud-pf-role" style="color:${m.display?.color || '#ccc'}">${m.role}</div>
                    <div class="dg-hud-pf-bar"><div class="dg-hud-pf-fill${m.alive ? '' : ' low'}" style="width:${m.alive ? (m.hp || 100) : '0'}%"></div></div>
                </div>`;
            }
            partyEl.innerHTML = html;
        }

        // ── Right: Mob frames ──
        const mobsEl = document.getElementById('dg-hud-mobs');
        if (mobsEl && prog.state === 'combat') {
            let html = '';
            if (prog.currentEncounter) {
                const encIcon = prog.currentEncounter.type === 'boss' ? '💀' : prog.currentEncounter.type === 'miniboss' ? '⚠️' : '⚔️';
                html += `<div style="font-size:11px;color:${inRaid ? '#cc3344' : '#ff9944'};margin-bottom:6px;font-family:'Cinzel',serif;letter-spacing:1px;">${encIcon} ${prog.currentEncounter.name}</div>`;
            }
            const mobs = prog.mobs || [];
            for (const mob of mobs) {
                const hpPct = mob.alive ? Math.max(0, (mob.hp / mob.maxHp) * 100) : 0;
                html += `<div class="dg-hud-mob${mob.alive ? '' : ' dead'}${mob.isBoss ? ' boss-mob' : ''}">
                    <div class="dg-hud-mob-name${mob.isBoss ? ' boss-name' : ''}">${mob.isBoss ? '💀 ' : ''}${mob.name}</div>
                    <div class="dg-hud-mob-bar"><div class="dg-hud-mob-fill${mob.isBoss ? ' boss-fill' : ''}" style="width:${hpPct}%"></div></div>
                    <div class="dg-hud-mob-hp">${mob.alive ? Math.floor(hpPct) + '%' : '☠️'}</div>
                </div>`;
            }
            mobsEl.innerHTML = html;
        } else if (mobsEl && (prog.state === 'complete' || prog.state === 'failed')) {
            mobsEl.innerHTML = '';
        }

        // ── Bottom: Instance Log ──
        const chatEl = document.getElementById('dg-hud-chat');
        if (chatEl && prog.chatLog && prog.chatLog.length > 0) {
            const slice = prog.chatLog.slice(-15);
            let html = '';
            for (const msg of slice) {
                if (msg.user === 'SYSTEM') {
                    html += `<div style="margin-bottom:2px;"><span class="dg-hud-chat-sys" style="color:${inRaid ? '#ee8899' : '#ccbb99'}">${this.escapeHtml(msg.msg)}</span></div>`;
                } else {
                    const c = msg.color || '#ccbb88';
                    html += `<div style="margin-bottom:2px;"><span class="dg-hud-chat-user" style="color:${c}">[${this.escapeHtml(msg.user)}]</span> ${this.escapeHtml(msg.msg)}</div>`;
                }
            }
            chatEl.innerHTML = html;
            chatEl.scrollTop = chatEl.scrollHeight;
        }

        // ── Center: Phase alert ──
        const alertEl = document.getElementById('dg-hud-center-alert');
        if (alertEl) {
            if (prog.lastPhaseAnnounced && this._lastInstancePhase !== prog.lastPhaseAnnounced.name) {
                this._lastInstancePhase = prog.lastPhaseAnnounced.name;
                alertEl.textContent = '⚠️ ' + prog.lastPhaseAnnounced.name;
                alertEl.style.color = inRaid ? '#cc3344' : '#ff5533';
                alertEl.style.display = 'block';
                alertEl.style.animation = 'none';
                void alertEl.offsetWidth; // force reflow
                alertEl.style.animation = 'dg-alert-fade 3s ease-out forwards';
                setTimeout(() => { alertEl.style.display = 'none'; }, 3200);
            }
        }

        // ── Result overlay (victory/defeat) ──
        if (inDungeon) {
            this._updateDgResultOverlay(prog, def);
        }
    }

    _updateDgResultOverlay(prog, def) {
        let resultEl = document.getElementById('dg-hud-result-overlay');
        if (prog.state === 'complete' || prog.state === 'failed') {
            if (!resultEl) {
                resultEl = document.createElement('div');
                resultEl.id = 'dg-hud-result-overlay';
                resultEl.className = 'dg-hud-result-overlay';
                document.getElementById('dungeon-hud')?.appendChild(resultEl);
                resultEl.innerHTML = this._buildLootSummaryScreen(prog, def);
                this._bindLootSummaryButtons(def);
                this._animateLootCounters();
            }
        } else {
            if (resultEl) { resultEl.remove(); }
        }
    }

    _buildLootSummaryScreen(prog, def) {
        const isVictory = prog.state === 'complete';
        const l = prog.loot;
        const encountersCleared = isVictory ? prog.totalEncounters : prog.encounterIndex;
        const aliveCount = prog.partyMembers.filter(m => m.alive).length + 1; // +1 for player
        const totalParty = prog.partyMembers.length + 1;
        const stats = dungeonSystem.getDungeonStats(def.id);
        const isBestTime = isVictory && prog.totalTime <= (stats.bestTime || Infinity);
        const pColors = { warrior: '#4488cc', mage: '#aa66ff', ranger: '#66bb44', cleric: '#ffcc44' };
        const pIcons = { warrior: '⚔️', mage: '🔮', ranger: '🏹', cleric: '✨' };

        let html = `<div class="dg-loot-screen ${isVictory ? '' : 'defeat'}">`;

        // ── Header ──
        html += `<div class="dg-loot-header ${isVictory ? '' : 'defeat'}">`;
        html += `<div class="dg-loot-header-glow"></div>`;
        html += `<div class="dg-loot-icon">${isVictory ? '🏆' : '☠️'}</div>`;
        html += `<div class="dg-loot-title">${isVictory ? 'Dungeon Cleared!' : 'Party Wiped'}</div>`;
        html += `<div class="dg-loot-subtitle">${def.name} — ${isVictory ? def.subtitle : 'Your party has been defeated'}</div>`;
        html += `</div>`;

        // ── Stats bar ──
        html += `<div class="dg-loot-stats">`;
        html += `<div class="dg-stat"><div class="dg-stat-val">⏱️ ${this._dgFormatTime(prog.totalTime)}</div><div class="dg-stat-label">Time${isBestTime && stats.clears > 1 ? ' 🏅 Best!' : ''}</div></div>`;
        html += `<div class="dg-stat"><div class="dg-stat-val">${encountersCleared}/${prog.totalEncounters}</div><div class="dg-stat-label">Encounters</div></div>`;
        html += `<div class="dg-stat"><div class="dg-stat-val">${aliveCount}/${totalParty}</div><div class="dg-stat-label">Survived</div></div>`;
        if (isVictory && stats.clears > 0) {
            html += `<div class="dg-stat"><div class="dg-stat-val">${stats.clears}</div><div class="dg-stat-label">Total Clears</div></div>`;
        }
        html += `</div>`;

        // ── Loot body ──
        html += `<div class="dg-loot-body">`;

        if (isVictory) {
            // First clear badge
            if (prog.isFirstClear) {
                html += `<div class="dg-loot-first-clear">First Clear Bonus</div>`;
            }

            html += `<div class="dg-loot-section-title">${prog.isFirstClear ? 'Rewards Earned' : 'Loot Collected'}</div>`;
            html += `<div class="dg-loot-items">`;
            if (l.gold > 0) {
                html += `<div class="dg-loot-item">
                    <div class="dg-loot-item-icon" style="border-color:rgba(255,220,60,0.2);">💰</div>
                    <div class="dg-loot-item-info">
                        <div class="dg-loot-item-val" data-loot-target="${l.gold}">0</div>
                        <div class="dg-loot-item-label">Gold</div>
                    </div>
                </div>`;
            }
            if (l.xp > 0) {
                html += `<div class="dg-loot-item">
                    <div class="dg-loot-item-icon" style="border-color:rgba(100,200,255,0.2);">⭐</div>
                    <div class="dg-loot-item-info">
                        <div class="dg-loot-item-val" data-loot-target="${l.xp}">0</div>
                        <div class="dg-loot-item-label">Experience</div>
                    </div>
                </div>`;
            }
            if (l.karma > 0) {
                html += `<div class="dg-loot-item">
                    <div class="dg-loot-item-icon" style="border-color:rgba(170,140,255,0.2);">💎</div>
                    <div class="dg-loot-item-info">
                        <div class="dg-loot-item-val" data-loot-target="${l.karma}">0</div>
                        <div class="dg-loot-item-label">${AETHERBIT_NAME}</div>
                    </div>
                </div>`;
            }
            if (l.soulEssence > 0) {
                html += `<div class="dg-loot-item">
                    <div class="dg-loot-item-icon" style="border-color:rgba(255,150,60,0.2);">🔥</div>
                    <div class="dg-loot-item-info">
                        <div class="dg-loot-item-val soul" data-loot-target="${l.soulEssence}">0</div>
                        <div class="dg-loot-item-label">Soul Essence</div>
                    </div>
                </div>`;
            }
            html += `</div>`; // close loot-items
        } else {
            // Defeat — show what was lost / what they faced
            html += `<div class="dg-loot-section-title" style="color:#aa5544;">Defeated By</div>`;
            const enc = def.encounters[prog.encounterIndex] || def.encounters[def.encounters.length - 1];
            html += `<div style="text-align:center;padding:8px 0;">`;
            html += `<div style="font-family:'Cinzel',serif;font-size:14px;color:#ff6644;margin-bottom:4px;">${enc.type === 'boss' ? '💀' : enc.type === 'miniboss' ? '⚠️' : '⚔️'} ${enc.name}</div>`;
            html += `<div style="font-size:10px;color:#886655;max-width:300px;margin:0 auto;">${enc.description}</div>`;
            html += `</div>`;
        }

        // ── Party Performance ──
        html += `<div class="dg-loot-party">`;
        html += `<div class="dg-loot-party-title">👥 Party Performance</div>`;
        // Player row
        const pRole = gameState.classId === 'warrior' ? 'Tank' : gameState.classId === 'cleric' ? 'Healer' : 'DPS';
        html += `<div class="dg-loot-party-row">
            <div class="dg-loot-party-icon">${pIcons[gameState.classId] || '❓'}</div>
            <div class="dg-loot-party-name" style="color:${pColors[gameState.classId] || '#ccc'};font-weight:600;">${gameState.playerName}</div>
            <div class="dg-loot-party-role">${pRole}</div>
            <div class="dg-loot-party-status alive">✓</div>
        </div>`;
        // NPC rows
        for (const m of prog.partyMembers) {
            html += `<div class="dg-loot-party-row">
                <div class="dg-loot-party-icon">${m.display.icon}</div>
                <div class="dg-loot-party-name" style="color:${m.display.color};">${m.name}</div>
                <div class="dg-loot-party-role">${m.role}</div>
                <div class="dg-loot-party-status ${m.alive ? 'alive' : 'dead'}">${m.alive ? '✓' : '☠️'}</div>
            </div>`;
        }
        html += `</div>`; // close party

        html += `</div>`; // close loot-body

        // ── Action buttons ──
        html += `<div class="dg-loot-actions">`;
        html += `<div class="dg-loot-btn primary" id="dg-hud-requeue" data-dungeon-id="${def.id}">⚔️ ${isVictory ? 'Queue Again' : 'Try Again'}</div>`;
        html += `<div class="dg-loot-btn" id="dg-hud-leave">🚪 Leave Dungeon</div>`;
        html += `</div>`;

        html += `</div>`; // close loot-screen
        return html;
    }

    _bindLootSummaryButtons(def) {
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
            const rqBtn = document.getElementById('dg-hud-requeue');
            const lvBtn = document.getElementById('dg-hud-leave');
            if (rqBtn && !rqBtn._bound) {
                rqBtn._bound = true;
                rqBtn.addEventListener('click', () => {
                    const did = rqBtn.dataset.dungeonId;
                    dungeonSystem.leaveDungeon();
                    setTimeout(() => { dungeonSystem.queueDungeon(did); }, 100);
                });
            }
            if (lvBtn && !lvBtn._bound) {
                lvBtn._bound = true;
                lvBtn.addEventListener('click', () => { dungeonSystem.leaveDungeon(); });
            }
        });
    }

    _animateLootCounters() {
        // Animate loot values counting up from 0
        const els = document.querySelectorAll('[data-loot-target]');
        if (!els.length) return;

        const duration = 1200; // ms
        const startTime = performance.now();
        const targets = [];
        els.forEach(el => {
            targets.push({ el, target: parseInt(el.dataset.lootTarget) || 0 });
        });

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            // Ease-out cubic for satisfying deceleration
            const ease = 1 - Math.pow(1 - t, 3);
            for (const { el, target } of targets) {
                const current = Math.floor(target * ease);
                el.textContent = current.toLocaleString();
            }
            if (t < 1) requestAnimationFrame(tick);
        };
        // Start after item reveal animations (~500ms delay)
        setTimeout(() => requestAnimationFrame(tick), 500);
    }

    _dgHudSetupListeners() {
        // One-time listener setup for HUD elements (if needed)
        if (this._dgHudListenersSet) return;
        this._dgHudListenersSet = true;
        this._lastDgPhase = null;
    }

    // ══════════════════════════════════════════════════════════════════
    // COMPANION SYSTEM UI
    // ══════════════════════════════════════════════════════════════════

    _setupCompanionListeners() {
        this.companionPanelOpen = false;
        const btn = document.getElementById('companion-btn');
        if (btn) btn.addEventListener('click', () => this.toggleCompanionPanel());
        const close = document.getElementById('companion-panel-close');
        if (close) close.addEventListener('click', () => this.toggleCompanionPanel(false));

        const body = document.getElementById('companion-panel-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Summon a companion
                const card = e.target.closest('.comp-card');
                if (card) {
                    const name = card.dataset.mobName;
                    if (name) {
                        if (companionSystem.activeCompanionName === name) {
                            companionSystem.dismiss();
                        } else {
                            companionSystem.summon(name);
                        }
                        this.renderCompanionPanel();
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Dismiss button
                const dismiss = e.target.closest('.comp-dismiss-btn');
                if (dismiss) {
                    companionSystem.dismiss();
                    this.renderCompanionPanel();
                    audioManager.playUiOpen();
                }
            });
        }
    }

    toggleCompanionPanel(forceState) {
        const panel = document.getElementById('companion-panel');
        if (!panel) return;
        const shouldOpen = forceState !== undefined ? forceState : !this.companionPanelOpen;
        this.companionPanelOpen = shouldOpen;
        panel.classList.toggle('open', shouldOpen);
        if (shouldOpen) {
            this.renderCompanionPanel();
            audioManager.playUiOpen();
        }
    }

    renderCompanionPanel() {
        const body = document.getElementById('companion-panel-body');
        if (!body) return;

        const active = companionSystem.getActiveCompanion();
        const discovered = companionSystem.getDiscoveredList();
        const dps = companionSystem.getCompanionDps();

        let html = '';

        // ── Active companion slot ──
        html += `<div class="comp-section-title">Active Companion</div>`;
        if (active) {
            const colorHex = '#' + active.color.toString(16).padStart(6, '0');
            html += `<div class="comp-active-slot">
                <div class="comp-active-icon" style="background:${colorHex}20;border-color:${colorHex}88;">
                    ${this._getCreatureEmoji(active.type)}
                </div>
                <div class="comp-active-info">
                    <div class="comp-active-name">${this.escapeHtml(active.name)}</div>
                    <div class="comp-active-stats">
                        <span class="comp-dps-label">⚔ ${dps} DPS</span> · 
                        Scale: ${(active.companionScale * 100).toFixed(0)}% · 
                        ${this._getCreatureTypeLabel(active.type)}
                    </div>
                </div>
                <div class="comp-dismiss-btn" title="Dismiss companion">✕ Dismiss</div>
            </div>`;
        } else {
            html += `<div class="comp-active-slot">
                <div class="comp-active-icon" style="opacity:0.3;">🐾</div>
                <div class="comp-active-info">
                    <div class="comp-active-name" style="color:#556655;">No Companion</div>
                    <div class="comp-active-stats">Select a creature from the bestiary below</div>
                </div>
            </div>`;
        }

        // ── Bestiary (grouped by zone) ──
        html += `<div class="comp-section-title">Bestiary — ${discovered.length} Creature${discovered.length !== 1 ? 's' : ''} Discovered</div>`;

        if (discovered.length === 0) {
            html += `<div class="comp-empty">No creatures discovered yet. Defeat enemies to add them to your bestiary!</div>`;
        } else {
            // Group by zone
            const byZone = {};
            for (const c of discovered) {
                if (!byZone[c.zoneId]) byZone[c.zoneId] = { zoneName: c.zoneName, zoneIcon: c.zoneIcon, zoneColor: c.zoneColor, creatures: [] };
                byZone[c.zoneId].creatures.push(c);
            }

            for (const zoneId of Object.keys(byZone)) {
                const zg = byZone[zoneId];
                html += `<div class="comp-zone-group">`;
                html += `<div class="comp-zone-label"><span style="color:${zg.zoneColor}">${zg.zoneIcon}</span> ${this.escapeHtml(zg.zoneName)}</div>`;
                html += `<div class="comp-grid">`;
                for (const c of zg.creatures) {
                    const colorHex = '#' + c.color.toString(16).padStart(6, '0');
                    const isActive = c.isActive;
                    const isUnlocked = c.isUnlocked;
                    const progress = Math.min(100, (c.killCount / c.unlockThreshold) * 100);

                    html += `<div class="comp-card${isActive ? ' active' : ''}${!isUnlocked ? ' locked' : ''}" 
                                 data-mob-name="${this.escapeHtml(c.name)}" 
                                 title="${isUnlocked ? 'Click to summon/dismiss' : `Mastery: ${c.killCount}/${c.unlockThreshold} kills needed to unlock`}">
                        <div class="comp-card-swatch" style="background:${colorHex}; opacity: ${isUnlocked ? 1 : 0.4};"></div>
                        <div class="comp-card-info">
                            <div class="comp-card-name" style="color: ${isUnlocked ? '#ccddcc' : '#889988'}">
                                ${this._getCreatureEmoji(c.type)} ${this.escapeHtml(c.name)}
                                ${!isUnlocked ? ` <span style="font-size:9px; color:#cc8855;">(Locked)</span>` : ''}
                            </div>
                            <div class="comp-card-meta">
                                ${isUnlocked ? `${this._getCreatureTypeLabel(c.type)} · ${c.killCount} kills` : `Progress: ${c.killCount} / ${c.unlockThreshold} kills`}
                            </div>
                            ${!isUnlocked ? `
                                <div class="comp-card-progress">
                                    <div class="comp-card-progress-fill locked" style="width:${progress}%"></div>
                                </div>
                            ` : ''}
                        </div>
                    </div>`;
                }
                html += `</div></div>`;
            }
        }

        // Companion DPS info
        html += `<div style="margin-top:12px;padding:8px 12px;border-radius:6px;background:rgba(80,220,160,0.06);border:1px solid rgba(80,220,160,0.15);font-size:11px;color:#77aa99;">
            <strong style="color:#55ddaa;">⚔ Companion DPS: ${dps}</strong> — scales with your level & gear (${(18 + gameState.level * 0.4).toFixed(1)}% of your DPS)
        </div>`;

        body.innerHTML = html;
    }

    _updateCompanionBtn() {
        const btn = document.getElementById('companion-btn');
        if (!btn) return;
        btn.style.display = companionSystem.isUnlocked() ? '' : 'none';
    }

    /** Update the companion HP frame (positioned above party frames) */
    _updateCompanionFrame() {
        const d = this._dom;
        if (!d.compFrame) return;

        const active = companionSystem.getActiveCompanion();
        if (!active) {
            d.compFrame.classList.remove('visible');
            return;
        }

        d.compFrame.classList.add('visible');

        // Compute position: stack above party frames
        const partyFrames = document.getElementById('party-frames');
        const partyCount = partySystem.members.length;
        // Each party frame is ~32px tall + 3px gap
        const partyHeight = partyCount > 0 ? (partyCount * 35 + 3) : 0;
        d.compFrame.style.bottom = (170 + partyHeight) + 'px';

        // Update name + DPS
        if (d.compFrameName) d.compFrameName.textContent = active.name;
        if (d.compFrameDps) d.compFrameDps.textContent = `${companionSystem.getCompanionDps()} DPS`;

        // Icon emoji
        const iconEl = d.compFrame.querySelector('.comp-frame-icon');
        if (iconEl) iconEl.textContent = this._getCreatureEmoji(active.type);

        // HP bar
        const alive = companionSystem.alive;
        d.compFrame.classList.toggle('dead', !alive);

        if (alive) {
            const hpFrac = companionSystem.getHpFraction();
            const hpPct = Math.max(0, Math.min(100, hpFrac * 100));
            if (d.compFrameBarFill) {
                d.compFrameBarFill.style.width = hpPct + '%';
                d.compFrameBarFill.className = 'comp-frame-bar-fill' +
                    (hpPct < 25 ? ' low' : hpPct < 50 ? ' mid' : '');
            }
            if (d.compFrameRespawn) d.compFrameRespawn.style.display = 'none';
        } else {
            if (d.compFrameBarFill) {
                d.compFrameBarFill.style.width = '0%';
                d.compFrameBarFill.className = 'comp-frame-bar-fill low';
            }
            if (d.compFrameRespawn) {
                d.compFrameRespawn.style.display = '';
                const t = Math.ceil(companionSystem.respawnTimer);
                d.compFrameRespawn.textContent = `Respawning in ${t}s...`;
            }
        }
    }

    _showCompanionUnlockToast() {
        const container = document.getElementById('hero-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'zone-unlock-toast';
        toast.innerHTML = `<div class="zone-unlock-inner" style="border-color:rgba(80,220,160,0.6)">
            <div class="zone-unlock-label" style="color:#55ddaa">New Feature Unlocked</div>
            <div class="zone-unlock-name" style="color:#88ffcc">🐾 Companion System</div>
        </div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
        gameState.addGameLog('🐾 Companion System unlocked! Summon creatures you\'ve defeated to fight alongside you.');
        gameState.addChatMessage('Game', 'System', '🐾 Companion System is now available! Open it from the side menu.');
    }

    _getCreatureEmoji(type) {
        const map = {
            beast: '🐺', elemental: '💎', plant: '🌿', dragon: '🐉',
            undead: '👻', serpent: '🐍', demon: '😈', insectoid: '🦂',
            jellyfish: '🪼', xenoswarm: '🦟', xenowalker: '🤖', xenotitan: '🗿',
            xenophantom: '👁', xenowyrm: '🐲', halogrunt: '👽', haloelite: '⚔',
            halohunter: '🎯', halosentinel: '🔮', halowraith: '💀',
            hivedrone: '🐝', spiresentinel: '🗼', sandcolossus: '🏛',
            forgeoverseer: '🔥', crimsonwyrm: '🔴',
        };
        return map[type] || '🐾';
    }

    _getCreatureTypeLabel(type) {
        const map = {
            beast: 'Beast', elemental: 'Elemental', plant: 'Plant', dragon: 'Dragon',
            undead: 'Undead', serpent: 'Serpent', demon: 'Demon', insectoid: 'Insectoid',
            jellyfish: 'Jellyfish', xenoswarm: 'Xeno-Swarm', xenowalker: 'Xeno-Walker',
            xenotitan: 'Xeno-Titan', xenophantom: 'Xeno-Phantom', xenowyrm: 'Xeno-Wyrm',
            halogrunt: 'Grunt', haloelite: 'Elite', halohunter: 'Hunter',
            halosentinel: 'Sentinel', halowraith: 'Wraith', hivedrone: 'Hive Drone',
            spiresentinel: 'Spire Sentinel', sandcolossus: 'Colossus',
            forgeoverseer: 'Overseer', crimsonwyrm: 'Wyrmlord',
        };
        return map[type] || type;
    }

    // ══════════════════════════════════════════════════════════════════
    // PvP BATTLEGROUND UI
    // ══════════════════════════════════════════════════════════════════

    togglePvpPanel(force) {
        const panel = document.getElementById('pvp-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.pvpPanelOpen = true;
            panel.classList.add('open');
            this.renderPvpPanel();
            audioManager.playUiOpen();
        } else {
            this.pvpPanelOpen = false;
            panel.classList.remove('open');
        }
    }

    _setupPvpListeners() {
        const btn = document.getElementById('pvp-btn');
        if (btn) btn.addEventListener('click', () => this.togglePvpPanel());
        const close = document.getElementById('pvp-panel-close');
        if (close) close.addEventListener('click', () => this.togglePvpPanel(false));

        // Global Ready Popup Listeners
        const readyAccept = document.getElementById('pvp-ready-accept');
        const readyDecline = document.getElementById('pvp-ready-decline');
        if (readyAccept) readyAccept.addEventListener('click', () => {
            battlegroundSystem.acceptMatch();
            this._hidePvpReadyPopup();
            this.renderPvpPanel();
        });
        if (readyDecline) readyDecline.addEventListener('click', () => {
            battlegroundSystem.declineMatch();
            this._hidePvpReadyPopup();
            this.renderPvpPanel();
        });

        window._pvpLeave = () => {
            battlegroundSystem.leaveBG();
            this.renderPvpPanel();
        };
        window._pvpAccept = () => {
            battlegroundSystem.acceptMatch();
            this.renderPvpPanel();
        };
        window._pvpDecline = () => {
            battlegroundSystem.declineMatch();
            this.renderPvpPanel();
        };

        window._dungeonLeave = () => {
            dungeonSystem.leaveDungeon();
            this.renderDungeonPanel();
        };
        window._dungeonAccept = () => {
            dungeonSystem.acceptMatch();
            this.renderDungeonPanel();
        };
        window._dungeonDecline = () => {
            dungeonSystem.declineMatch();
            this.renderDungeonPanel();
        };

        window._raidLeave = () => {
            raidSystem.leaveRaid();
            this.renderRaidPanel();
        };
        window._raidAccept = () => {
            raidSystem.acceptMatch();
            this.renderRaidPanel();
        };
        window._raidDecline = () => {
            raidSystem.declineMatch();
            this.renderRaidPanel();
        };

        const body = document.getElementById('pvp-panel-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Scoreboard toggle
                const sbToggle = e.target.closest('[data-sb-toggle]');
                if (sbToggle) {
                    this._bgScoreboardOpen = !this._bgScoreboardOpen;
                    const sbBody = body.querySelector('.bg-sb-body');
                    const sbArrow = body.querySelector('.bg-sb-toggle');
                    if (sbBody) sbBody.style.display = this._bgScoreboardOpen ? '' : 'none';
                    if (sbArrow) sbArrow.textContent = this._bgScoreboardOpen ? '▾' : '▸';
                    return;
                }
                // Queue button
                const queueBtn = e.target.closest('.bg-queue-btn');
                if (queueBtn && !queueBtn.classList.contains('disabled')) {
                    const bgId = queueBtn.dataset.bgId;
                    if (bgId && battlegroundSystem.queueBG(bgId)) {
                        this.togglePvpPanel(false); // Close panel when entering queue
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Leave BG button
                const leaveBtn = e.target.closest('.bg-action-btn.leave');
                if (leaveBtn) {
                    battlegroundSystem.leaveBG();
                    this.renderPvpPanel();
                    return;
                }
                // Requeue button
                const requeueBtn = e.target.closest('.bg-action-btn.requeue');
                if (requeueBtn) {
                    const bgId = requeueBtn.dataset.bgId;
                    if (bgId) {
                        battlegroundSystem.leaveBG();
                        setTimeout(() => {
                            battlegroundSystem.queueBG(bgId);
                            this.togglePvpPanel(false); // Close panel when requeueing
                        }, 100);
                    }
                    return;
                }
            });
        }
    }

    updatePvpBtn() {
        const btn = document.getElementById('pvp-btn');
        if (!btn) return;
        const unlocked = battlegroundSystem.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const badge = document.getElementById('pvp-btn-badge');
            const inst = battlegroundSystem.instance;
            if (badge) {
                if (inst) {
                    const stateLabel = { queue: '⏳', forming: '👥', countdown: '⏱️', active: '⚔️', complete: '🏆' };
                    badge.textContent = stateLabel[inst.state] || '';
                    // Pulse the badge if a match is found to alert the player
                    if (inst.state === 'match_found') {
                        badge.style.animation = 'bag-full-pulse 0.8s infinite';
                    } else {
                        badge.style.animation = '';
                    }
                } else {
                    badge.textContent = battlegroundSystem.totalMatches > 0 ? `${battlegroundSystem.totalMatches}` : '';
                    badge.style.animation = '';
                }
            }
            btn.classList.toggle('pvp-active', !!inst);
        }
    }

    _updatePvpReadyPopup() {
        const popup = document.getElementById('pvp-ready-popup');
        if (!popup) return;

        const inst = battlegroundSystem.instance;
        const isMatchFound = inst && inst.state === 'match_found';

        if (isMatchFound) {
            const nameEl = document.getElementById('pvp-ready-name');
            const timerEl = document.getElementById('pvp-ready-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.ceil(inst.timer)}s`;
            
            if (popup.style.display !== 'block') {
                popup.style.display = 'block';
                audioManager.playQueuePop();
            }
        } else {
            this._hidePvpReadyPopup();
        }
    }

    _hidePvpReadyPopup() {
        const popup = document.getElementById('pvp-ready-popup');
        if (popup) popup.style.display = 'none';
    }

    _updateDungeonReadyPopup() {
        const popup = document.getElementById('dungeon-ready-popup');
        if (!popup) return;

        const prog = dungeonSystem.getProgress();
        const isMatchFound = prog && prog.state === 'match_found';

        if (isMatchFound) {
            const inst = dungeonSystem.instance;
            const nameEl = document.getElementById('dungeon-ready-name');
            const timerEl = document.getElementById('dungeon-ready-timer-val');
            const rosterEl = document.getElementById('dungeon-ready-roster');

            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.ceil(inst.timer)}s`;
            
            if (rosterEl && (!this._lastDngPopupVersion || this._lastDngPopupVersion !== inst.partyMembers.length)) {
                this._lastDngPopupVersion = inst.partyMembers.length;
                const members = inst.partyMembers || [];
                const playerRole = gameState.classId === 'warrior' ? 'Tank' : gameState.classId === 'cleric' ? 'Healer' : 'DPS';
                
                let html = `
                    <div style="font-size:9px; color:#887766; text-transform:uppercase; margin-bottom:6px; letter-spacing:1px;">Matched Group (5/5)</div>
                    <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:#66ccff; margin-bottom:4px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span style="font-size:14px;">👤</span>
                        <span style="flex:1;">${gameState.playerName} (You)</span>
                        <span style="font-size:9px; opacity:0.7; text-transform:uppercase;">${playerRole}</span>
                        <span style="color:#66dd66; font-weight:700;">✓</span>
                    </div>
                `;

                html += members.map(m => `
                    <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:#ccaa77; margin-bottom:3px;">
                        <span style="font-size:14px; width:18px; text-align:center;">${m.display.icon}</span>
                        <span style="flex:1;">${m.name}</span>
                        <span style="font-size:9px; opacity:0.7; text-transform:uppercase;">${m.role}</span>
                        <span style="color:#66dd66; font-weight:700;">✓</span>
                    </div>
                `).join('');

                rosterEl.innerHTML = html;
            }

            if (popup.style.display !== 'block') {
                popup.style.display = 'block';
                // audioManager.playQueuePop() is handled by the system manager
            }
        } else {
            this._hideDungeonReadyPopup();
            this._lastDngPopupVersion = null;
        }
    }

    _hideDungeonReadyPopup() {
        const popup = document.getElementById('dungeon-ready-popup');
        if (popup) popup.style.display = 'none';
    }

    _updateRaidReadyPopup() {
        const popup = document.getElementById('raid-ready-popup');
        if (!popup) return;

        const prog = raidSystem.getProgress();
        const isMatchFound = prog && prog.state === 'match_found';

        if (isMatchFound) {
            const inst = raidSystem.instance;
            const nameEl = document.getElementById('raid-ready-name');
            const timerEl = document.getElementById('raid-ready-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.ceil(inst.timer)}s`;
            
            if (popup.style.display !== 'block') {
                popup.style.display = 'block';
                // audioManager.playQueuePop() is handled by the system manager
            }
        } else {
            this._hideRaidReadyPopup();
        }
    }

    _hideRaidReadyPopup() {
        const popup = document.getElementById('raid-ready-popup');
        if (popup) popup.style.display = 'none';
    }

    _updatePvpMiniQueue() {
        const mini = document.getElementById('pvp-mini-queue');
        if (!mini) return;

        const inst = battlegroundSystem.instance;
        // Show only if in queue AND the main PvP panel is closed
        const shouldShow = inst && inst.state === 'queue' && !this.pvpPanelOpen;

        if (shouldShow) {
            mini.style.display = 'block';
            const nameEl = document.getElementById('pvp-mini-queue-name');
            const timerEl = document.getElementById('pvp-mini-queue-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
        } else {
            mini.style.display = 'none';
        }
    }

    _updateDungeonMiniQueue() {
        const mini = document.getElementById('dungeon-mini-queue');
        if (!mini) return;

        const inst = dungeonSystem.instance;
        const shouldShow = inst && inst.state === 'queue' && !this.dungeonPanelOpen;

        if (shouldShow) {
            mini.style.display = 'block';
            const nameEl = document.getElementById('dungeon-mini-queue-name');
            const timerEl = document.getElementById('dungeon-mini-queue-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
        } else {
            mini.style.display = 'none';
        }
    }

    _updateRaidMiniQueue() {
        const mini = document.getElementById('raid-mini-queue');
        if (!mini) return;

        const inst = raidSystem.instance;
        const shouldShow = inst && inst.state === 'queue' && !this.raidPanelOpen;

        if (shouldShow) {
            mini.style.display = 'block';
            
            // Stack below Quest Log and other queues
            const ql = document.getElementById('quest-log-panel');
            const pvpMini = document.getElementById('pvp-mini-queue');
            const dungMini = document.getElementById('dungeon-mini-queue');
            
            let topOffset = 12;
            if (ql) topOffset += ql.offsetHeight + 8;
            if (pvpMini && pvpMini.style.display !== 'none') topOffset += pvpMini.offsetHeight + 6;
            if (dungMini && dungMini.style.display !== 'none') topOffset += dungMini.offsetHeight + 6;
            
            mini.style.top = topOffset + 'px';

            const nameEl = document.getElementById('raid-mini-queue-name');
            const timerEl = document.getElementById('raid-mini-queue-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
        } else {
            mini.style.display = 'none';
        }
    }

    _updateDungeonMiniQueue() {
        const mini = document.getElementById('dungeon-mini-queue');
        if (!mini) return;

        const inst = dungeonSystem.instance;
        const shouldShow = inst && inst.state === 'queue' && !this.dungeonPanelOpen;

        if (shouldShow) {
            mini.style.display = 'block';
            
            const ql = document.getElementById('quest-log-panel');
            const pvpMini = document.getElementById('pvp-mini-queue');
            
            let topOffset = 12;
            if (ql) topOffset += ql.offsetHeight + 8;
            if (pvpMini && pvpMini.style.display !== 'none') topOffset += pvpMini.offsetHeight + 6;
            
            mini.style.top = topOffset + 'px';

            const nameEl = document.getElementById('dungeon-mini-queue-name');
            const timerEl = document.getElementById('dungeon-mini-queue-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
        } else {
            mini.style.display = 'none';
        }
    }

    _updatePvpMiniQueue() {
        const mini = document.getElementById('pvp-mini-queue');
        if (!mini) return;

        const inst = battlegroundSystem.instance;
        const shouldShow = inst && inst.state === 'queue' && !this.pvpPanelOpen;

        if (shouldShow) {
            mini.style.display = 'block';
            
            const ql = document.getElementById('quest-log-panel');
            let topOffset = 12;
            if (ql) topOffset += ql.offsetHeight + 8;
            
            mini.style.top = topOffset + 'px';

            const nameEl = document.getElementById('pvp-mini-queue-name');
            const timerEl = document.getElementById('pvp-mini-queue-timer-val');
            if (nameEl) nameEl.textContent = inst.def.name;
            if (timerEl) timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
        } else {
            mini.style.display = 'none';
        }
    }

    _updatePvpPanelIfDirty() {
        const inst = battlegroundSystem.instance;
        // Build a state hash to detect if we actually need a full re-render
        // This stops the "flashing" caused by innerHTML replacement every frame
        let stateHash = inst ? `${inst.state}|${inst.chatLog.length}|${inst.killFeed.length}` : 'no-inst';
        if (inst && inst.state === 'active') {
            stateHash += `|${inst.score.voidborne}-${inst.score.ironcrest}|${inst.flags.voidborne.state}-${inst.flags.ironcrest.state}`;
        }
        
        if (this._lastPvpStateHash !== stateHash) {
            this._lastPvpStateHash = stateHash;
            this.renderPvpPanel();
        } else if (inst) {
            // Update timers/progress bars without full re-render to keep it smooth
            const timerEl = document.querySelector('.pvp-match-timer .val');
            if (timerEl && inst.state === 'queue') timerEl.textContent = `${Math.floor(inst.totalTime)}s`;
            if (timerEl && inst.state === 'match_found') timerEl.textContent = `${Math.ceil(inst.timer)}s`;
            
            if (inst.state === 'active') {
                const matchTimerEl = document.querySelector('.bg-match-timer .val');
                if (matchTimerEl) matchTimerEl.textContent = `${Math.floor(inst.matchTimer / 60)}:${(Math.floor(inst.matchTimer % 60)).toString().padStart(2, '0')}`;
            }
        }
    }

    renderPvpPanel() {
        const body = document.getElementById('pvp-panel-body');
        if (!body) return;

        // Update VP display in header
        const vpHeaderVal = document.getElementById('pvp-vp-header-val');
        if (vpHeaderVal) vpHeaderVal.textContent = pvpVendor.victoryPoints.toLocaleString();

        const inst = battlegroundSystem.instance;
        let html = '';

        if (inst) {
            if (inst.state === 'queue') {
                html = this._renderBGBrowser();
                // Add Queue Overlay
                html += `
                <div class="pvp-match-found-overlay">
                    <div class="pvp-match-box" style="border-color:rgba(80,160,220,0.5);">
                        <div class="pvp-match-title" style="color:#66ccff;">SEARCHING FOR MATCH...</div>
                        <div class="pvp-match-name">${inst.def.name}</div>
                        <div class="pvp-match-desc">Finding opponents in the Neon Wastes...</div>
                        <div class="pvp-match-timer">Time in queue: <span class="val">${Math.floor(inst.totalTime)}s</span></div>
                        <div class="pvp-match-btns">
                            <div class="pvp-match-btn decline" onclick="window._pvpLeave()">LEAVE QUEUE</div>
                        </div>
                    </div>
                </div>`;
            } else if (inst.state === 'match_found') {
                html = this._renderBGBrowser();
                // The global popup now handles the 'match_found' state, but we show a status message here too
                html += `
                <div class="pvp-match-found-overlay">
                    <div class="pvp-match-box">
                        <div class="pvp-match-title">MATCH READY!</div>
                        <div class="pvp-match-name">${inst.def.name}</div>
                        <div class="pvp-match-desc">Check the notification to enter.</div>
                        <div class="pvp-match-timer">Time Remaining: <span class="val">${Math.ceil(inst.timer)}s</span></div>
                    </div>
                </div>`;
            } else {
                html = this._renderActiveBG(inst);
            }
        } else {
            html = this._renderBGBrowser();
        }

        // Preserve scroll positions: only auto-scroll if user was at or near bottom
        const killFeedOld = body.querySelector('.bg-kill-feed');
        const chatFeedOld = body.querySelector('.bg-chat-feed');
        const killWasBottom = !killFeedOld || (killFeedOld.scrollHeight - killFeedOld.scrollTop - killFeedOld.clientHeight < 20);
        const chatWasBottom = !chatFeedOld || (chatFeedOld.scrollHeight - chatFeedOld.scrollTop - chatFeedOld.clientHeight < 20);

        body.innerHTML = html;

        // Auto-scroll feeds only if user was already at the bottom
        const killFeed = body.querySelector('.bg-kill-feed');
        if (killFeed && killWasBottom) killFeed.scrollTop = killFeed.scrollHeight;
        const chatFeed = body.querySelector('.bg-chat-feed');
        if (chatFeed && chatWasBottom) chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    _renderBGBrowser() {
        let html = '';

        // Cooldown
        if (battlegroundSystem.cooldownTimer > 0) {
            html += `<div style="text-align:center;color:#886688;font-size:11px;margin-bottom:8px;">⏳ Queue cooldown: ${Math.ceil(battlegroundSystem.cooldownTimer)}s</div>`;
        }

        for (const def of BG_DEFS) {
            const canAccess = gameState.canAccessZone(def.unlockZone) && gameState.level >= def.levelRange[0];
            const canQueue = battlegroundSystem.canQueue(def.id);
            const stats = battlegroundSystem.getBGStats(def.id);

            html += `<div class="bg-card ${canAccess ? '' : 'locked'}">`;

            // Banner image
            html += `<div class="bg-card-banner" style="background-image:url('${def.loadingImage}');">
                <div class="bg-card-banner-overlay">
                    <div class="bg-card-name">${def.name}</div>
                    <div class="bg-card-subtitle">${def.subtitle}</div>
                </div>
            </div>`;

            html += `<div class="bg-card-body">`;
            html += `<div class="bg-card-desc">${def.description}</div>`;

            // Meta info
            html += `<div class="bg-card-meta">`;
            html += `<span>Level <span class="val">${def.levelRange[0]}-${def.levelRange[1]}</span></span>`;
            html += `<span>Mode <span class="val">${def.mode.toUpperCase()}</span></span>`;
            html += `<span>Teams <span class="val">${def.teamSize}v${def.teamSize}</span></span>`;
            html += `<span>Caps to Win <span class="val">${def.capsToWin}</span></span>`;
            html += `<span>Est. <span class="val">${def.estimatedTime}</span></span>`;
            html += `</div>`;

            // Stats
            if (stats.wins > 0 || stats.losses > 0) {
                html += `<div class="bg-card-stats">`;
                html += `<span>W/L <span class="val">${stats.wins}/${stats.losses}</span></span>`;
                html += `<span>Kills <span class="val">${stats.totalKills}</span></span>`;
                if (stats.bestTime !== Infinity) {
                    html += `<span>Best <span class="val">${this._bgFormatTime(stats.bestTime)}</span></span>`;
                }
                if (stats.totalVP > 0) html += `<span>VP Earned <span class="val">${stats.totalVP} ${iconImg('victoryPoints', 12)}</span></span>`;
                html += `</div>`;
            }

            // Rewards preview
            html += `<div class="bg-card-meta" style="margin-bottom:8px;">`;
            html += `<span>Win: <span class="val">${def.rewards.win.gold}g ${def.rewards.win.xp}xp ${VP_REWARDS.bgWin} ${iconImg('victoryPoints', 12)}</span></span>`;
            html += `<span>Loss: <span class="val">${def.rewards.loss.gold}g ${def.rewards.loss.xp}xp ${VP_REWARDS.bgLoss} ${iconImg('victoryPoints', 12)}</span></span>`;
            html += `</div>`;

            // Queue button
            if (!canAccess) {
                html += `<div class="bg-queue-btn disabled">🔒 Requires Neon Wastes (Level ${def.levelRange[0]})</div>`;
            } else if (!canQueue) {
                html += `<div class="bg-queue-btn disabled">Cannot Queue</div>`;
            } else {
                html += `<div class="bg-queue-btn" data-bg-id="${def.id}">⚔️ Enter Queue</div>`;
            }

            html += `</div></div>`;
        }

        return html;
    }

    _renderActiveBG(inst) {
        let html = '';
        const def = inst.def;
        const state = inst.state;

        // State header
        const stateLabels = {
            queue: '⏳ In Queue…',
            forming: '👥 Forming Teams…',
            countdown: '⏱️ Preparing for Battle…',
            active: '⚔️ Battle in Progress',
            complete: inst.winner ? (inst.winner === inst.playerFaction ? '🏆 VICTORY!' : '💀 DEFEAT') : '⚔️ Complete',
        };

        html += `<div class="bg-active-header">
            <div class="bg-active-state">${stateLabels[state] || state}</div>
            <div class="bg-active-timer">`;
        if (state === 'queue') html += `Finding match…`;
        else if (state === 'countdown') html += `Starting in ${Math.ceil(inst.timer)}s`;
        else if (state === 'active') html += `${this._bgFormatTime(inst.matchTimer)} / ${this._bgFormatTime(def.matchTimeLimit)}`;
        else if (state === 'complete') html += `Match time: ${this._bgFormatTime(inst.matchTimer)}`;
        else html += `${def.name}`;
        html += `</div></div>`;

        // Result overlay for complete state
        if (state === 'complete') {
            const won = inst.winner === inst.playerFaction;
            const rewardSet = won ? def.rewards.win : def.rewards.loss;
            html += `<div class="bg-result-overlay ${won ? 'victory' : 'defeat'}">
                <div class="bg-result-title" style="color:${won ? '#ffdd44' : '#ff4444'};">${won ? '🏆 VICTORY' : '💀 DEFEAT'}</div>
                <div class="bg-result-score">Score: 🟣 ${inst.score.voidborne} — ${inst.score.ironcrest} 🔴</div>
                <div class="bg-result-rewards">
                    <span>${iconImg('xpStar', 14)} <span class="val">${rewardSet.xp.toLocaleString()} XP</span></span>
                    <span>${iconImg('goldCoin', 14)} <span class="val">${rewardSet.gold.toLocaleString()} Gold</span></span>
                    <span>${iconImg('victoryPoints', 14)} <span class="val">${won ? VP_REWARDS.bgWin : VP_REWARDS.bgLoss} VP</span></span>
                </div>
            </div>`;
        }

        // Scoreboard (visible during forming, countdown, active, complete)
        if (state !== 'queue') {
            html += `<div class="bg-scoreboard">
                <div class="bg-score-faction">
                    <div class="bg-score-name" style="color:#aa44ff;">🟣 Voidborne</div>
                    <div class="bg-score-num" style="color:#cc66ff;">${inst.score.voidborne}</div>
                    ${this._bgFlagStatusHtml(inst.flags.voidborne, '#aa44ff')}
                </div>
                <div class="bg-score-vs">VS</div>
                <div class="bg-score-faction">
                    <div class="bg-score-name" style="color:#ff6644;">Ironcrest 🔴</div>
                    <div class="bg-score-num" style="color:#ff8844;">${inst.score.ironcrest}</div>
                    ${this._bgFlagStatusHtml(inst.flags.ironcrest, '#ff6644')}
                </div>
            </div>`;
        }

        // Dampening + active debuff summary
        if (state === 'active') {
            let statusLine = '';
            if (inst.dampening > 0) {
                statusLine += `💀 Dampening: ${Math.floor(inst.dampening * 100)}% healing reduction`;
            }
            // Show any active FC debuffs compactly
            const carriers = inst.allCombatants.filter(c => c.alive && c.hasFlag && c.fcDebuffStacks > 0);
            for (const fc of carriers) {
                const fColor = fc.faction === 'voidborne' ? '#aa44ff' : '#ff6644';
                const spdPct = Math.round((1 - fc.moveSpeed / fc.baseMoveSpeed) * 100);
                statusLine += ` | <span style="color:${fColor};">${fc.name}</span> ⚡×${fc.fcDebuffStacks} (+${fc.fcDebuffStacks * 10}% dmg, -${spdPct}% spd, -${Math.round((1 - fc.fcHealReceivedMult) * 100)}% heals)`;
            }
            if (statusLine) {
                html += `<div class="bg-dampening">${statusLine}</div>`;
            }
        }

        // Team rosters (during active/complete)
        if ((state === 'active' || state === 'complete' || state === 'countdown') && inst.teamA.length > 0) {
            html += `<div class="bg-team-roster">`;
            html += this._bgRosterColumn(inst.teamA, 'Voidborne', '#aa44ff', '#2a1a3a');
            html += this._bgRosterColumn(inst.teamB, 'Ironcrest', '#ff6644', '#3a1a1a');
            html += `</div>`;
        }

        // ── Detailed Scoreboard (WoW-style stats table) ──
        if ((state === 'active' || state === 'complete') && inst.teamA.length > 0) {
            html += this._bgDetailedScoreboard(inst);
        }

        // Kill feed (during active/complete)
        if ((state === 'active' || state === 'complete') && inst.killFeed.length > 0) {
            html += `<div style="font-size:10px;color:#776688;margin-bottom:3px;font-weight:600;">Kill Feed</div>`;
            html += `<div class="bg-kill-feed">`;
            for (const k of inst.killFeed) {
                const aColor = k.attackerFaction === 'voidborne' ? '#aa44ff' : '#ff6644';
                const tColor = k.targetFaction === 'voidborne' ? '#aa44ff' : '#ff6644';
                const parts = k.msg.split(' killed ');
                if (parts.length === 2) {
                    html += `<div class="bg-kill-entry"><span style="color:${aColor};font-weight:600;">${parts[0]}</span> 💀 <span style="color:${tColor};">${parts[1]}</span></div>`;
                } else {
                    html += `<div class="bg-kill-entry">${k.msg}</div>`;
                }
            }
            html += `</div>`;
        }

        // Action buttons
        html += `<div class="bg-action-row">`;
        if (state === 'complete') {
            html += `<button class="bg-action-btn requeue" data-bg-id="${def.id}">🔄 Requeue</button>`;
            html += `<button class="bg-action-btn leave">🚪 Leave</button>`;
        } else if (state === 'queue') {
            html += `<button class="bg-action-btn leave">❌ Leave Queue</button>`;
        } else {
            html += `<button class="bg-action-btn leave">🚪 Desert (Leave)</button>`;
        }
        html += `</div>`;

        return html;
    }

    _bgRosterColumn(team, name, color, bgColor) {
        let html = `<div class="bg-roster-col">`;
        html += `<div class="bg-roster-title" style="color:${color};background:${bgColor};border:1px solid ${color}22;">${name}</div>`;
        for (const c of team) {
            const hpPct = c.alive ? Math.max(0, (c.hp / c.maxHp) * 100) : 0;
            const hpColor = hpPct > 50 ? '#44bb44' : hpPct > 20 ? '#ccaa22' : '#cc3322';
            const classIcons = { warrior: '⚔️', mage: '🔮', ranger: '🏹', cleric: '✨' };
            const isParty = c.isPartyMember;
            const isComp = c.isCompanion;
            const rowHighlight = isParty ? 'style="background:rgba(100,200,255,0.08);border-left:2px solid #55bbff;"'
                : isComp ? 'style="background:rgba(100,220,170,0.08);border-left:2px solid #66ddaa;"' : '';
            html += `<div class="bg-roster-row ${c.alive ? '' : 'dead'}" ${rowHighlight}>`;
            html += `<span class="bg-roster-class">${isComp ? '🐾' : (classIcons[c.classId] || '?')}</span>`;
            const nameColor = isParty ? '#55ccff' : isComp ? '#66ddaa' : color;
            const namePrefix = isParty ? '★ ' : isComp ? '🐾 ' : '';
            html += `<span class="bg-roster-name" style="color:${nameColor};">${namePrefix}${c.name}`;
            // Show debuff stacks on flag carriers
            if (c.hasFlag && c.fcDebuffStacks > 0) {
                const stackColor = c.fcDebuffStacks >= 7 ? '#ff2222' : c.fcDebuffStacks >= 4 ? '#ff8844' : '#ffcc44';
                html += ` <span style="color:${stackColor};font-size:8px;font-weight:700;" title="Focused Assault: +${c.fcDebuffStacks * 10}% dmg taken, ${Math.round((1 - c.moveSpeed / c.baseMoveSpeed) * 100)}% slowed">⚡×${c.fcDebuffStacks}</span>`;
            }
            html += `</span>`;
            // Show channeling indicator
            if (c.isChanneling) {
                const capPct = Math.min(100, (c.captureProgress / 2.5) * 100);
                html += `<span style="color:#ffdd44;font-size:8px;font-weight:700;" title="Capturing...">🏁${Math.floor(capPct)}%</span>`;
            } else {
                html += `<span class="bg-roster-flag">${c.hasFlag ? '🚩' : ''}</span>`;
            }
            html += `<div class="bg-roster-hp-bar"><div class="bg-roster-hp-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>`;
            html += `<span class="bg-roster-kd">${c.kills}/${c.deaths}</span>`;
            html += `</div>`;
        }
        html += `</div>`;
        return html;
    }

    _bgFlagStatusHtml(flag, color) {
        let label = 'At Base';
        let icon = '🏠';
        if (flag.state === 'carried') {
            const carrier = flag.carrier;
            if (carrier && carrier.isChanneling) {
                const capPct = Math.min(100, Math.floor((carrier.captureProgress / 2.5) * 100));
                label = `${carrier.name} CAPTURING ${capPct}%`;
                icon = '🏁';
            } else if (carrier && carrier.fcDebuffStacks > 0) {
                label = `${carrier?.name || '?'} ⚡×${carrier.fcDebuffStacks}`;
                icon = '🏃';
            } else {
                label = `${carrier?.name || '?'} has it`;
                icon = '🏃';
            }
        } else if (flag.state === 'dropped') {
            const timeLeft = Math.max(0, Math.ceil(20 - (flag.dropTimer || 0)));
            label = `Dropped! (${timeLeft}s)`;
            icon = '⚠️';
        }
        return `<div class="bg-flag-status" style="color:${color};">${icon} ${label}</div>`;
    }

    _bgFormatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    /** Format large numbers compactly: 1234 → 1.2K, 12345 → 12.3K, 1234567 → 1.2M */
    _bgFormatNum(n) {
        if (n < 1000) return n.toString();
        if (n < 10000) return (n / 1000).toFixed(1) + 'K';
        if (n < 1000000) return (n / 1000).toFixed(0) + 'K';
        return (n / 1000000).toFixed(1) + 'M';
    }

    /** ── Detailed BG Scoreboard — WoW-style tabular stats ── */
    _bgDetailedScoreboard(inst) {
        const classIcons = { warrior: '⚔️', mage: '🔮', ranger: '🏹', cleric: '✨' };

        // Calculate per-combatant VP contribution
        const calcVP = (c, isPlayerTeam, playerWon) => {
            let vp = 0;
            vp += c.kills * VP_REWARDS.perKill;
            vp += c.flagCaps * VP_REWARDS.perFlagCap;
            // Distribute base win/loss VP evenly across the team if match is complete
            if (inst.state === 'complete' && isPlayerTeam) {
                const baseVP = playerWon ? VP_REWARDS.bgWin : VP_REWARDS.bgLoss;
                vp += Math.floor(baseVP / 10); // Split among 10 players
            }
            return vp;
        };

        const playerWon = inst.winner === inst.playerFaction;

        // Sort each team: by damage desc (DPS/Tank), then healing desc (Healers)
        const sortTeam = (team) => [...team].sort((a, b) => {
            // Put alive players first
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            // Sort by damage (primary), then healing (secondary)
            return (b.damage + b.healing) - (a.damage + a.healing);
        });

        const sortedA = sortTeam(inst.teamA);
        const sortedB = sortTeam(inst.teamB);

        // Team totals
        const teamTotals = (team) => {
            let d = 0, h = 0, k = 0, de = 0, fc = 0;
            for (const c of team) { d += c.damage; h += c.healing; k += c.kills; de += c.deaths; fc += c.flagCaps; }
            return { d, h, k, de, fc };
        };
        const totA = teamTotals(inst.teamA);
        const totB = teamTotals(inst.teamB);

        // MVP: highest (damage + healing) on the winning team (or overall if active)
        let mvp = null;
        const mvpPool = inst.state === 'complete'
            ? (inst.winner === 'voidborne' ? inst.teamA : inst.teamB)
            : [...inst.teamA, ...inst.teamB];
        if (mvpPool.length > 0) {
            mvp = mvpPool.reduce((best, c) => (c.damage + c.healing * 1.5) > (best.damage + best.healing * 1.5) ? c : best, mvpPool[0]);
        }

        // Build the scoreboard rows for one team
        const buildRows = (team, factionColor, isPlayerTeam) => {
            let rows = '';
            for (const c of team) {
                const isParty = c.isPartyMember;
                const isComp = c.isCompanion;
                const dead = !c.alive;
                const rowClass = `${isParty ? 'party-row' : ''} ${isComp ? 'companion-row' : ''} ${dead ? 'dead-row' : ''}`;
                const nameClass = isParty ? 'bg-sb-name bg-sb-party-name'
                    : isComp ? 'bg-sb-name bg-sb-companion-name'
                    : 'bg-sb-name';
                const isMvp = mvp && c.id === mvp.id;
                const vp = calcVP(c, isPlayerTeam, playerWon);
                const namePrefix = isParty ? '★ ' : isComp ? '🐾 ' : '';
                const classIcon = isComp ? '🐾' : (classIcons[c.classId] || '?');
                const nameStyle = isParty || isComp ? '' : `color:${factionColor}`;

                rows += `<tr class="${rowClass}">`;
                rows += `<td><span class="bg-sb-class">${classIcon}</span> <span class="${nameClass}" style="${nameStyle}">${namePrefix}${c.name}${isMvp ? ' 👑' : ''}</span></td>`;
                rows += `<td class="num bg-sb-kills">${c.kills}</td>`;
                rows += `<td class="num bg-sb-deaths">${c.deaths}</td>`;
                rows += `<td class="num bg-sb-dmg" title="${c.damage.toLocaleString()}">${this._bgFormatNum(c.damage)}</td>`;
                rows += `<td class="num bg-sb-heal" title="${c.healing.toLocaleString()}">${this._bgFormatNum(c.healing)}</td>`;
                rows += `<td class="num bg-sb-caps">${c.flagCaps || 0}</td>`;
                if (isPlayerTeam) {
                    rows += `<td class="num bg-sb-vp">${vp > 0 ? '+' + vp : '—'}</td>`;
                }
                rows += `</tr>`;
            }
            return rows;
        };

        // Build full HTML
        let html = `<div class="bg-scoreboard-detail">`;
        const sbOpen = this._bgScoreboardOpen;
        html += `<div class="bg-sb-header" data-sb-toggle="1">`;
        html += `<div class="bg-sb-title">📊 Scoreboard</div>`;
        html += `<span class="bg-sb-toggle">${sbOpen ? '▾' : '▸'}</span>`;
        html += `</div>`;
        html += `<div class="bg-sb-body" style="${sbOpen ? '' : 'display:none;'}">`;
        html += `<div class="bg-sb-scroll">`;
        html += `<table class="bg-sb-table">`;

        // ── Voidborne (player team) ──
        html += `<thead><tr>`;
        html += `<th>Player</th><th class="num">K</th><th class="num">D</th><th class="num">Dmg</th><th class="num">Heal</th><th class="num">🚩</th><th class="num">${iconImg('victoryPoints', 10)}</th>`;
        html += `</tr></thead>`;
        html += `<tbody>`;
        html += `<tr><td colspan="7" class="bg-sb-team-label" style="color:#aa44ff;background:rgba(120,40,200,0.08);">🟣 Voidborne</td></tr>`;
        html += buildRows(sortTeam(inst.teamA), '#aa44ff', true);
        // Voidborne totals
        html += `<tr class="bg-sb-team-totals">`;
        html += `<td style="color:#aa44ff;">Team Total</td>`;
        html += `<td class="num bg-sb-kills">${totA.k}</td>`;
        html += `<td class="num bg-sb-deaths">${totA.de}</td>`;
        html += `<td class="num bg-sb-dmg">${this._bgFormatNum(totA.d)}</td>`;
        html += `<td class="num bg-sb-heal">${this._bgFormatNum(totA.h)}</td>`;
        html += `<td class="num bg-sb-caps">${totA.fc}</td>`;
        html += `<td class="num"></td>`;
        html += `</tr>`;

        // ── Divider ──
        html += `<tr class="team-divider"><td colspan="7" style="height:6px;"></td></tr>`;

        // ── Ironcrest (enemy team — no VP column) ──
        html += `<tr><td colspan="7" class="bg-sb-team-label" style="color:#ff6644;background:rgba(200,60,40,0.08);">🔴 Ironcrest</td></tr>`;

        // Enemy team rows (no VP column — use 6 cols)
        for (const c of sortTeam(inst.teamB)) {
            const dead = !c.alive;
            const rowClass = dead ? 'dead-row' : '';
            html += `<tr class="${rowClass}">`;
            html += `<td><span class="bg-sb-class">${classIcons[c.classId] || '?'}</span> <span class="bg-sb-name" style="color:#ff6644;">${c.name}${mvp && c.id === mvp.id ? ' 👑' : ''}</span></td>`;
            html += `<td class="num bg-sb-kills">${c.kills}</td>`;
            html += `<td class="num bg-sb-deaths">${c.deaths}</td>`;
            html += `<td class="num bg-sb-dmg" title="${c.damage.toLocaleString()}">${this._bgFormatNum(c.damage)}</td>`;
            html += `<td class="num bg-sb-heal" title="${c.healing.toLocaleString()}">${this._bgFormatNum(c.healing)}</td>`;
            html += `<td class="num bg-sb-caps">${c.flagCaps || 0}</td>`;
            html += `<td class="num"></td>`;
            html += `</tr>`;
        }
        // Ironcrest totals
        html += `<tr class="bg-sb-team-totals">`;
        html += `<td style="color:#ff6644;">Team Total</td>`;
        html += `<td class="num bg-sb-kills">${totB.k}</td>`;
        html += `<td class="num bg-sb-deaths">${totB.de}</td>`;
        html += `<td class="num bg-sb-dmg">${this._bgFormatNum(totB.d)}</td>`;
        html += `<td class="num bg-sb-heal">${this._bgFormatNum(totB.h)}</td>`;
        html += `<td class="num bg-sb-caps">${totB.fc}</td>`;
        html += `<td class="num"></td>`;
        html += `</tr>`;

        html += `</tbody></table>`;
        html += `</div>`; // scroll

        // ── MVP callout ──
        if (mvp && inst.state === 'complete') {
            const mvpFactionColor = mvp.faction === 'voidborne' ? '#aa44ff' : '#ff6644';
            const mvpStat = mvp.healing > mvp.damage
                ? `${this._bgFormatNum(mvp.healing)} healing`
                : `${this._bgFormatNum(mvp.damage)} damage`;
            html += `<div class="bg-sb-mvp">👑 MVP: <span class="bg-sb-mvp-name" style="text-shadow:0 0 6px ${mvpFactionColor};">${classIcons[mvp.classId]} ${mvp.name}</span> — ${mvpStat}, ${mvp.kills} kills</div>`;
        }

        html += `</div>`; // body
        html += `</div>`; // scoreboard-detail

        return html;
    }

    // ══════════════════════════════════════════════════════════════════
    // PVP VENDOR — War Quartermaster UI
    // ══════════════════════════════════════════════════════════════════

    _setupPvpVendorListeners() {
        const btn = document.getElementById('pvp-vendor-btn');
        if (btn) btn.addEventListener('click', () => this.togglePvpVendorPanel());
        const close = document.getElementById('pvp-vendor-close');
        if (close) close.addEventListener('click', () => this.togglePvpVendorPanel(false));

        const body = document.getElementById('pvp-vendor-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Gear buy button
                const gearBtn = e.target.closest('.pvpv-gear-buy');
                if (gearBtn && !gearBtn.classList.contains('owned') && !gearBtn.classList.contains('cant-afford')) {
                    const gearId = gearBtn.dataset.gearId;
                    if (gearId) {
                        const result = pvpVendor.buyGear(gearId);
                        if (result.success) {
                            audioManager.playUiOpen();
                            this.renderPvpVendorPanel();
                        }
                    }
                    return;
                }
                // Upgrade buy button
                const upgBtn = e.target.closest('.pvpv-upg-buy');
                if (upgBtn && !upgBtn.classList.contains('maxed') && !upgBtn.classList.contains('cant-afford')) {
                    const upgId = upgBtn.dataset.upgId;
                    if (upgId) {
                        const result = pvpVendor.buyUpgrade(upgId);
                        if (result.success) {
                            audioManager.playUiOpen();
                            this.renderPvpVendorPanel();
                        }
                    }
                    return;
                }
            });
        }
    }

    togglePvpVendorPanel(force) {
        const panel = document.getElementById('pvp-vendor-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.pvpVendorOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.pvp = false; // Reset notification glow
            this.renderPvpVendorPanel();
            audioManager.playUiOpen();
        } else {
            this.pvpVendorOpen = false;
            panel.classList.remove('open');
        }
    }

    updatePvpVendorBtn() {
        const btn = document.getElementById('pvp-vendor-btn');
        if (!btn) return;
        const unlocked = battlegroundSystem.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const vpBadge = document.getElementById('pvp-vendor-vp');
            if (vpBadge) vpBadge.textContent = pvpVendor.victoryPoints > 0 ? `${pvpVendor.victoryPoints}🏆` : '';
        }
    }

    /** Lightweight currency header refresh (no full rebuild) */
    _refreshPvpVendorCurrency() {
        const vpEl = document.getElementById('pvpv-vp-val');
        if (vpEl) vpEl.textContent = pvpVendor.victoryPoints.toLocaleString();
    }

    renderPvpVendorPanel() {
        const body = document.getElementById('pvp-vendor-body');
        if (!body) return;

        // Update currency header
        this._refreshPvpVendorCurrency();

        let html = '';

        // ── Active Bonuses Summary ───────────────────────────────
        const dmgRed = pvpVendor.getPvPDamageReduction();
        const dmgBoost = pvpVendor.getPvPDamageBoost();
        const teamHp = pvpVendor.getPvPTeamHpBoost();
        const vpBoost = pvpVendor.getVPBoostMult();
        const teamHeal = pvpVendor.getPvPTeamHealBoost();
        const critBonus = pvpVendor.getPvPCritBonus();
        const fcDebuff = pvpVendor.getFCDebuffSlowdown();
        const fcMove = pvpVendor.getFCMoveSlowReduction();

        const hasAnyBonus = dmgRed || dmgBoost || teamHp || vpBoost || teamHeal || critBonus || fcDebuff || fcMove;
        if (hasAnyBonus) {
            html += `<div class="pvpv-bonuses">`;
            if (dmgRed) html += `<div class="bonus-item">🛡️ PvP Dmg Taken: <span class="bonus-val">-${Math.round(dmgRed * 100)}%</span></div>`;
            if (dmgBoost) html += `<div class="bonus-item">⚔️ PvP Dmg Dealt: <span class="bonus-val">+${Math.round(dmgBoost * 100)}%</span></div>`;
            if (critBonus) html += `<div class="bonus-item">🎯 PvP Crit: <span class="bonus-val">+${Math.round(critBonus * 100)}%</span></div>`;
            if (teamHp) html += `<div class="bonus-item">💪 Team HP: <span class="bonus-val">+${Math.round(teamHp * 100)}%</span></div>`;
            if (teamHeal) html += `<div class="bonus-item">💚 Team Healing: <span class="bonus-val">+${Math.round(teamHeal * 100)}%</span></div>`;
            if (vpBoost) html += `<div class="bonus-item">${iconImg('victoryPoints', 14)} VP Earned: <span class="bonus-val">+${Math.round(vpBoost * 100)}%</span></div>`;
            if (fcDebuff) html += `<div class="bonus-item">⚡ FC Debuff Slow: <span class="bonus-val">-${Math.round(fcDebuff * 100)}%</span></div>`;
            if (fcMove) html += `<div class="bonus-item">👢 FC Move Slow: <span class="bonus-val">-${Math.round(fcMove * 100)}%</span></div>`;
            html += `</div>`;
        }

        // ── VP Stats ─────────────────────────────────────────────
        html += `<div class="pvpv-stats">`;
        html += `<span>Total Earned: <span class="val">${pvpVendor.totalVPEarned.toLocaleString()}</span></span>`;
        html += `<span>Total Spent: <span class="val">${pvpVendor.totalVPSpent.toLocaleString()}</span></span>`;
        html += `<span>Gear Owned: <span class="val">${pvpVendor.purchasedGear.size}/${PVP_GEAR.length}</span></span>`;
        html += `</div>`;

        // ── PvP Gear Section ─────────────────────────────────────
        html += `<div class="pvpv-section-title">⚔️ PvP Gear</div>`;

        // Sort gear by tier then cost
        const sortedGear = [...PVP_GEAR].sort((a, b) => a.tier - b.tier || a.cost - b.cost);
        for (const gear of sortedGear) {
            const owned = pvpVendor.isGearPurchased(gear.id);
            const canAfford = pvpVendor.victoryPoints >= gear.cost;

            html += `<div class="pvpv-gear-card ${owned ? 'purchased' : ''}">`;
            html += `<div class="pvpv-gear-icon">${gear.icon}</div>`;
            html += `<div class="pvpv-gear-info">`;
            html += `<div class="pvpv-gear-name">${gear.name}</div>`;
            html += `<div class="pvpv-gear-desc">${gear.description}</div>`;
            html += `<div class="pvpv-gear-slot">${gear.slot} — Tier ${gear.tier}</div>`;
            html += `</div>`;

            if (owned) {
                html += `<button class="pvpv-gear-buy owned">✓ Owned</button>`;
            } else {
                html += `<button class="pvpv-gear-buy ${canAfford ? '' : 'cant-afford'}" data-gear-id="${gear.id}">🏆 ${gear.cost} VP</button>`;
            }
            html += `</div>`;
        }

        // ── PvP Upgrades Section ─────────────────────────────────
        html += `<div class="pvpv-section-title">📈 Permanent Upgrades</div>`;

        for (const upg of PVP_UPGRADES) {
            const currentTier = pvpVendor.upgradeLevels[upg.id] || 0;
            const maxTier = upg.tiers.length;
            const isMaxed = currentTier >= maxTier;
            const next = pvpVendor.getNextUpgradeTier(upg.id);
            const canAfford = next ? pvpVendor.victoryPoints >= next.cost : false;

            html += `<div class="pvpv-upg-row">`;
            html += `<div class="pvpv-upg-icon">${upg.icon}</div>`;
            html += `<div class="pvpv-upg-info">`;
            html += `<div class="pvpv-upg-name">${upg.name}</div>`;
            html += `<div class="pvpv-upg-desc">${upg.description}</div>`;

            // Tier progress pips
            html += `<div class="pvpv-upg-tier">`;
            for (let i = 0; i < maxTier; i++) {
                const filled = i < currentTier;
                html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:3px;border:1px solid ${filled ? 'rgba(100,220,140,0.6)' : 'rgba(200,120,255,0.25)'};background:${filled ? 'rgba(80,200,120,0.5)' : 'transparent'};"></span>`;
            }
            html += ` ${currentTier}/${maxTier}`;
            if (!isMaxed && next) html += ` — Next: ${next.label}`;
            html += `</div>`;

            html += `</div>`;

            if (isMaxed) {
                html += `<button class="pvpv-upg-buy maxed">✓ MAX</button>`;
            } else {
                html += `<button class="pvpv-upg-buy ${canAfford ? '' : 'cant-afford'}" data-upg-id="${upg.id}">🏆 ${next.cost} VP</button>`;
            }
            html += `</div>`;
        }

        body.innerHTML = html;
    }

    // ══════════════════════════════════════════════════════════════════
    // RAID SYSTEM — Hivespire Sanctum Raid Finder UI
    // ══════════════════════════════════════════════════════════════════

    toggleRaidPanel(force) {
        const panel = document.getElementById('raid-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.raidPanelOpen = true;
            panel.classList.add('open');
            this.renderRaidPanel();
            audioManager.playUiOpen();
        } else {
            this.raidPanelOpen = false;
            panel.classList.remove('open');
        }
    }

    _setupRaidListeners() {
        const btn = document.getElementById('raid-btn');
        if (btn) btn.addEventListener('click', () => this.toggleRaidPanel());
        const close = document.getElementById('raid-panel-close');
        if (close) close.addEventListener('click', () => this.toggleRaidPanel(false));

        // Raid Ready Popup Listeners
        const raidReadyAccept = document.getElementById('raid-ready-accept');
        const raidReadyDecline = document.getElementById('raid-ready-decline');
        if (raidReadyAccept) raidReadyAccept.addEventListener('click', () => {
            raidSystem.acceptMatch();
            this._hideRaidReadyPopup();
        });
        if (raidReadyDecline) raidReadyDecline.addEventListener('click', () => {
            raidSystem.declineMatch();
            this._hideRaidReadyPopup();
        });

        const body = document.getElementById('raid-panel-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Queue button
                const queueBtn = e.target.closest('.rd-queue-btn');
                if (queueBtn && !queueBtn.classList.contains('disabled')) {
                    const raidId = queueBtn.dataset.raidId;
                    if (raidId && raidSystem.queueRaid(raidId)) {
                        this.toggleRaidPanel(false); // Close panel after queuing
                        this.renderRaidPanel();
                        audioManager.playUiOpen();
                    }
                    return;
                }
                // Leave raid button
                const leaveBtn = e.target.closest('.rd-action-btn.leave');
                if (leaveBtn) {
                    raidSystem.leaveRaid();
                    this.renderRaidPanel();
                    return;
                }
                // Requeue button
                const requeueBtn = e.target.closest('.rd-action-btn.requeue');
                if (requeueBtn) {
                    const raidId = requeueBtn.dataset.raidId;
                    if (raidId) {
                        raidSystem.leaveRaid();
                        setTimeout(() => {
                            raidSystem.queueRaid(raidId);
                            this.renderRaidPanel();
                        }, 100);
                    }
                    return;
                }
            });
        }
    }

    updateRaidBtn() {
        const btn = document.getElementById('raid-btn');
        if (!btn) return;
        const unlocked = raidSystem.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const badge = document.getElementById('raid-btn-badge');
            const inRaid = raidSystem.isInRaid();
            if (badge) {
                if (inRaid) {
                    const prog = raidSystem.getProgress();
                    const stateLabel = { queue: '⏳', forming: '👥', entering: '🚪', combat: '⚔️', complete: '🏆', failed: '☠️', loot: '💰' };
                    badge.textContent = stateLabel[prog?.state] || '';
                } else {
                    badge.textContent = raidSystem.totalClears > 0 ? `${raidSystem.totalClears}` : '';
                }
            }
            // Glow when in raid
            btn.classList.toggle('raid-active', inRaid);
        }
    }

    updateRaidVendorBtn() {
        const btn = document.getElementById('raid-vendor-btn');
        if (!btn) return;
        const unlocked = raidSystem.isUnlocked();
        btn.style.display = unlocked ? '' : 'none';
        if (unlocked) {
            const rpBadge = document.getElementById('raid-vendor-rp');
            if (rpBadge) rpBadge.innerHTML = raidVendor.raidPoints > 0 ? `${raidVendor.raidPoints} ${iconImg('raidPoints', 12)}` : '';
        }
    }

    renderRaidPanel() {
        const body = document.getElementById('raid-panel-body');
        if (!body) return;

        // Update RP display in header
        const rpHeaderVal = document.getElementById('raid-rp-header-val');
        if (rpHeaderVal) rpHeaderVal.textContent = raidVendor.raidPoints.toLocaleString();

        const inst = raidSystem.instance;
        let html = '';

        if (inst) {
            const state = inst.state;
            if (state === 'queue') {
                html = this._renderRaidBrowser();
                // We show the queue status non-blockingly at the bottom of the list if re-opened
                html += `
                <div style="margin-top:15px; padding:12px; background:rgba(204,51,68,0.1); border:1px solid rgba(204,51,68,0.3); border-radius:6px; text-align:center;">
                    <div style="font-family:'Cinzel',serif; color:#ff4466; font-size:12px; margin-bottom:4px;">SEARCHING FOR RAIDERS...</div>
                    <div style="font-family:'Inter',sans-serif; color:#eeddaa; font-size:11px;">You are currently in queue for ${inst.def.name}.</div>
                    <div style="margin-top:8px;">
                         <button class="pvp-match-btn decline" style="padding:4px 12px; font-size:10px;" onclick="window._raidLeave()">LEAVE QUEUE</button>
                    </div>
                </div>`;
            } else if (state === 'match_found') {
                html = this._renderRaidBrowser();
                html += `
                <div style="margin-top:15px; padding:12px; background:rgba(255,60,100,0.15); border:1px solid rgba(255,60,100,0.5); border-radius:6px; text-align:center;">
                    <div style="font-family:'Cinzel',serif; color:#ff4466; font-size:14px; margin-bottom:4px;">RAID READY!</div>
                    <div style="font-family:'Inter',sans-serif; color:#eeddaa; font-size:11px; margin-bottom:8px;">Your group for ${inst.def.name} is ready.</div>
                    <button class="pvp-match-btn accept" style="padding:6px 16px; background:linear-gradient(180deg,#ff4466,#cc2244); border-color:#ff4466; color:#fff;" onclick="window._raidAccept()">ENTER RAID</button>
                </div>`;
            } else if (state === 'forming') {
                html = this._renderRaidBrowser();
                html += `
                <div style="margin-top:15px; padding:12px; background:rgba(100,220,130,0.1); border:1px solid rgba(100,220,130,0.3); border-radius:6px; text-align:center;">
                    <div style="font-family:'Cinzel',serif; color:#66dd88; font-size:12px;">MATCH ACCEPTED!</div>
                    <div style="font-family:'Inter',sans-serif; color:#eeddaa; font-size:11px;">Assembling your 10-man team...</div>
                </div>`;
            } else {
                html = this._renderActiveRaid(inst);
            }
        } else {
            html = this._renderRaidBrowser();
        }

        // Preserve scroll position on chat feed
        const chatFeedOld = body.querySelector('.rd-chat-feed');
        const chatWasBottom = !chatFeedOld || (chatFeedOld.scrollHeight - chatFeedOld.scrollTop - chatFeedOld.clientHeight < 20);

        body.innerHTML = html;

        // Auto-scroll chat feed only if user was already at the bottom
        const chatFeed = body.querySelector('.rd-chat-feed');
        if (chatFeed && chatWasBottom) chatFeed.scrollTop = chatFeed.scrollHeight;
    }

    _renderRaidBrowser() {
        let html = '';

        // Cooldown indicator
        if (raidSystem.cooldownTimer > 0) {
            html += `<div style="text-align:center;color:#886666;font-size:11px;margin-bottom:8px;">⏳ Queue cooldown: ${Math.ceil(raidSystem.cooldownTimer)}s</div>`;
        }

        for (const def of RAID_DEFS) {
            const canAccess = gameState.canAccessZone(def.unlockZone) && gameState.level >= def.levelRange[0];
            const canQueue = raidSystem.canQueue(def.id);
            const stats = raidSystem.getRaidStats(def.id);

            html += `<div class="rd-card ${canAccess ? '' : 'locked'}">`;

            // Banner image
            html += `<div class="rd-card-banner" style="background-image:url('${def.loadingImage}');">
                <div class="rd-card-banner-overlay">
                    <div class="rd-card-name">${def.name}</div>
                    <div class="rd-card-subtitle">${def.subtitle}</div>
                </div>
            </div>`;

            html += `<div class="rd-card-body">`;
            html += `<div class="rd-card-desc">${def.description}</div>`;

            // Meta info
            html += `<div class="rd-card-meta">`;
            html += `<span>Level <span class="val">${def.levelRange[0]}-${def.levelRange[1]}</span></span>`;
            html += `<span>Raid Size <span class="val">10-Man</span></span>`;
            html += `<span>Encounters <span class="val">${def.encounters.length}</span></span>`;
            html += `<span>Bosses <span class="val">${def.encounters.filter(e => e.type === 'boss').length}</span></span>`;
            html += `<span>Est. <span class="val">8-12 min</span></span>`;
            html += `</div>`;

            // Stats
            if (stats.clears > 0) {
                html += `<div class="rd-card-stats">`;
                html += `<span>Clears <span class="val">${stats.clears}</span></span>`;
                if (stats.bestTime !== Infinity) {
                    html += `<span>Best <span class="val">${this._rdFormatTime(stats.bestTime)}</span></span>`;
                }
                html += `</div>`;
            }

            // Rewards preview
            html += `<div class="rd-card-meta" style="margin-bottom:8px;">`;
            html += `<span>Rewards: <span class="val">${iconImg('raidPoints', 12)} Raid Points, Gold, XP, Soul Essence</span></span>`;
            html += `</div>`;

            // Queue button
            if (!canAccess) {
                html += `<div class="rd-queue-btn disabled">🔒 Requires Crimson Reach (Level ${def.levelRange[0]})</div>`;
            } else if (!canQueue) {
                html += `<div class="rd-queue-btn disabled">${raidSystem.cooldownTimer > 0 ? `Cooldown ${Math.ceil(raidSystem.cooldownTimer)}s` : 'Cannot Queue'}</div>`;
            } else {
                html += `<div class="rd-queue-btn" data-raid-id="${def.id}">🏛️ Enter Raid Finder</div>`;
            }

            html += `</div>`; // close rd-card-body
            html += `</div>`; // close rd-card
        }

        return html;
    }

    _renderActiveRaid(inst) {
        const prog = raidSystem.getProgress();
        if (!prog) return '';
        let html = '';
        const def = prog.raidDef;
        const state = prog.state;

        // ── Queue / Forming / Entering phases — show loading screen ──
        if (state === 'queue' || state === 'match_found' || state === 'forming' || state === 'entering') {
            html += `<div class="rd-loading-screen" style="background-image:url('${def.loadingImage}');">
                <div class="rd-loading-overlay">
                    <div class="rd-loading-text">${def.name}</div>
                    <div class="rd-loading-bar-bg">
                        <div class="rd-loading-bar-fill" style="width:${state === 'queue' ? '25' : state === 'forming' ? '60' : '90'}%;"></div>
                    </div>
                    <div style="font-family:'Inter',sans-serif;font-size:10px;color:#cc8888;margin-top:4px;">
                        ${state === 'queue' ? '⏳ Searching for raid group (10 players)...' : state === 'forming' ? '👥 Raid group forming...' : '🚪 Entering the Sanctum...'}
                    </div>
                </div>
            </div>`;
        }

        // ── Combat / Complete / Failed — show raid HUD ──
        if (state === 'combat' || state === 'complete' || state === 'failed') {
            // Encounter progress tracker
            html += `<div class="rd-progress-tracker">`;
            for (let i = 0; i < prog.totalEncounters; i++) {
                const enc = def.encounters[i];
                const isBoss = enc.type === 'boss';
                let nodeClass = 'rd-progress-node';
                if (i < prog.encounterIndex) nodeClass += ' cleared';
                else if (i === prog.encounterIndex && state === 'combat') nodeClass += ' active';
                if (isBoss) nodeClass += ' boss';
                html += `<div class="${nodeClass}" title="${enc.name}"></div>`;
            }
            html += `</div>`;

            // Timer
            html += `<div style="text-align:right;margin-bottom:6px;">
                <span class="rd-encounter-timer">⏱️ ${this._rdFormatTime(prog.totalTime)}</span>
            </div>`;
        }

        // ── Active Buffs/Debuffs Bar (during combat) ──
        if (state === 'combat' && !prog.awaitingNext) {
            html += this._renderRaidBuffsBar(prog);
        }

        // ── Encounter transition (between encounters) ──
        if (state === 'combat' && prog.awaitingNext) {
            const nextIdx = prog.encounterIndex;
            const nextEnc = nextIdx < prog.totalEncounters ? def.encounters[nextIdx] : null;
            const nextLabel = nextEnc ? (nextEnc.type === 'boss' ? `💀 Boss: ${nextEnc.name}` : `⚔️ ${nextEnc.name}`) : '🏆 Final encounter cleared...';
            html += `<div class="rd-encounter-info" style="text-align:center;">
                <div class="rd-encounter-name" style="justify-content:center;">⏳ Advancing...</div>
                <div class="rd-encounter-desc">Preparing for next encounter: ${nextLabel}</div>
            </div>`;
        }

        // ── Current encounter info (combat only) ──
        if (state === 'combat' && prog.currentEncounter && !prog.awaitingNext) {
            const enc = prog.currentEncounter;
            const encIcon = enc.type === 'boss' ? '💀' : '⚔️';
            html += `<div class="rd-encounter-info">
                <div class="rd-encounter-name">${encIcon} ${enc.name}</div>
                <div class="rd-encounter-desc">${enc.description}</div>
            </div>`;

            // Boss phase banners
            if (enc.phases) {
                const bossMob = prog.mobs.find(m => m.isBoss && m.alive);
                if (bossMob) {
                    const hpPct = bossMob.hp / bossMob.maxHp;
                    for (let pi = enc.phases.length - 1; pi >= 0; pi--) {
                        const phase = enc.phases[pi];
                        if (hpPct <= phase.hpThreshold) {
                            html += `<div class="rd-phase-banner">
                                <div class="rd-phase-banner-text">⚠️ ${phase.name} — ${phase.description}</div>
                            </div>`;
                            break;
                        }
                    }
                }
            }

            // ── Boss Enrage Timer Bar (bosses only) ──
            if (enc.type === 'boss' && prog.raidState) {
                const enrageThreshold = prog.raidState.enrageThreshold || 90;
                const enrageTimer = prog.enrageTimer || 0;
                const enragePct = Math.min(100, (enrageTimer / enrageThreshold) * 100);
                const isEnraged = prog.enraged;
                html += `<div class="rd-enrage-section">
                    <div class="rd-enrage-label">
                        <span>${isEnraged ? '💢 ENRAGED!' : '⏳ Enrage Timer'}</span>
                        <span style="color:${isEnraged ? '#ff4433' : enragePct > 75 ? '#ccaa44' : '#886666'};">${isEnraged ? '∞' : `${Math.ceil(enrageThreshold - enrageTimer)}s`}</span>
                    </div>
                    <div class="rd-enrage-bar-bg">
                        <div class="rd-enrage-bar-fill ${isEnraged ? 'enraged' : ''}" style="width:${enragePct}%;"></div>
                    </div>
                </div>`;
            }
        }

        // ── Party HP bar (always visible during combat) ──
        if (state === 'combat') {
            const partyHp = Math.max(0, Math.min(100, prog.partyHp));
            const hpClass = partyHp > 60 ? 'high' : partyHp > 30 ? 'mid' : 'low';
            html += `<div class="rd-party-hp-section">
                <div class="rd-party-hp-label">
                    <span>Raid Health</span>
                    <span style="color:${hpClass === 'high' ? '#66cc66' : hpClass === 'mid' ? '#ccaa44' : '#cc4444'};font-weight:600;">${Math.floor(partyHp)}%</span>
                </div>
                <div class="rd-party-hp-bg">
                    <div class="rd-party-hp-fill ${hpClass}" style="width:${partyHp}%;"></div>
                </div>
            </div>`;

            // ── Combat Stats Row (Tanks, Healers, Efficiency) ──
            if (prog.raidState && !prog.awaitingNext) {
                const rs = prog.raidState;
                const effPct = Math.round(rs.raidEfficiency * 100);
                const effClass = effPct >= 90 ? 'good' : effPct >= 70 ? 'warn' : 'danger';
                const tankClass = rs.tanksAlive >= 2 ? 'good' : rs.tanksAlive === 1 ? 'warn' : 'danger';
                const healClass = rs.healersAlive >= 2 ? 'good' : rs.healersAlive === 1 ? 'warn' : 'danger';
                html += `<div class="rd-combat-stats">
                    <div class="rd-combat-stat">🛡️ Tanks: <span class="val ${tankClass}">${rs.tanksAlive}/2</span></div>
                    <div class="rd-combat-stat">✨ Healers: <span class="val ${healClass}">${rs.healersAlive}/2</span></div>
                    <div class="rd-combat-stat">👥 Alive: <span class="val ${effClass}">${rs.aliveCount}/${rs.fullRaid}</span></div>
                    <div class="rd-combat-stat">⚡ Efficiency: <span class="val ${effClass}">${effPct}%</span></div>
                </div>`;
            }

            // Mob health bars (only during active encounter, not transition)
            if (!prog.awaitingNext && prog.mobs) {
                const aliveMobs = prog.mobs.filter(m => m.alive);
                const deadMobs = prog.mobs.filter(m => !m.alive);
                if (aliveMobs.length > 0 || deadMobs.length > 0) {
                    html += `<div class="rd-mobs-section">`;
                    for (const mob of aliveMobs) {
                        const hpPct = Math.max(0, (mob.hp / mob.maxHp) * 100);
                        const isBoss = mob.isBoss;
                        const isSelected = this._selectedMobId === mob.id;
                        const marker = prog.markers ? prog.markers[mob.id] : null;
                        const markerIcon = marker === 'skull' ? '💀' : marker === 'square' ? '🟦' : marker === 'cross' ? '❌' : marker === 'circle' ? '⭕' : '';

                        html += `<div class="rd-mob-row ${isBoss ? 'boss-mob' : ''} ${isSelected ? 'selected' : ''}" data-mob-id="${mob.id}">
                            <div class="rd-mob-name ${isBoss ? 'boss-name' : ''}">${isBoss ? '💀 ' : ''}${mob.name} ${markerIcon ? `<span style="float:right;">${markerIcon}</span>` : ''}</div>
                            <div class="rd-mob-bar-bg"><div class="rd-mob-bar-fill ${isBoss ? 'boss-bar' : ''}" style="width:${hpPct}%;"></div></div>
                            <div class="rd-mob-hp">${Math.floor(hpPct)}%</div>
                        </div>`;
                    }
                    for (const mob of deadMobs) {
                        html += `<div class="rd-mob-row dead">
                            <div class="rd-mob-name">${mob.name}</div>
                            <div class="rd-mob-bar-bg"><div class="rd-mob-bar-fill" style="width:0%;"></div></div>
                            <div class="rd-mob-hp">☠️</div>
                        </div>`;
                    }
                    html += `</div>`;

                    // ── Raid Marker Controls (visible when a mob is selected) ──
                    if (this._selectedMobId && aliveMobs.some(m => m.id === this._selectedMobId)) {
                        html += this._renderRaidMarkers(prog);
                    }
                }
            }
        }

        // ── Raid party frames (all states except idle) ──
        if (state === 'combat' || state === 'forming' || state === 'entering') {
            html += `<div class="rd-party-section">`;
            html += `<div class="rd-party-header">Raid Group (10)</div>`;
            html += `<div class="rd-party-frames">`;

            // Player frame
            const playerRole = gameState.classId === 'warrior' ? 'Tank' : gameState.classId === 'cleric' ? 'Healer' : 'DPS';
            const playerClassDisplay = { warrior: { color: '#4488cc', icon: '⚔️' }, mage: { color: '#aa66ff', icon: '🔮' }, ranger: { color: '#66bb44', icon: '🏹' }, cleric: { color: '#ffcc44', icon: '✨' } };
            const pcd = playerClassDisplay[gameState.classId] || { color: '#ccc', icon: '❓' };
            const playerHpPct = gameState.maxHp > 0 ? Math.max(0, Math.min(100, (gameState.hp / gameState.maxHp) * 100)) : 100;
            html += `<div class="rd-party-frame">
                <div class="rd-pf-top">
                    <span class="rd-pf-name" style="color:${pcd.color};">${pcd.icon} ${gameState.playerName}</span>
                    <span class="rd-pf-role" style="color:${pcd.color};">${playerRole}</span>
                </div>
                <div class="rd-pf-bar-bg"><div class="rd-pf-bar-fill" style="width:${playerHpPct}%;"></div></div>
            </div>`;

            // NPC party member frames
            for (const m of prog.partyMembers) {
                const isMerc = m.isMercenary;
                html += `<div class="rd-party-frame ${m.alive ? '' : 'dead'} ${isMerc ? 'is-mercenary' : ''}">
                    ${isMerc ? '<span class="rd-pf-mercenary-star" title="Elite Mercenary">★</span>' : ''}
                    <div class="rd-pf-top">
                        <span class="rd-pf-name" style="color:${m.display.color};">${m.display.icon} ${m.name}</span>
                        <span class="rd-pf-role" style="color:${m.display.color};">${m.role}</span>
                    </div>
                    <div class="rd-pf-bar-bg"><div class="rd-pf-bar-fill" style="width:${m.alive ? m.hp : 0}%;${m.hp < 30 && m.alive ? 'background:linear-gradient(90deg,#cc3322,#ee5544);' : ''}"></div></div>
                </div>`;
            }

            html += `</div></div>`; // close rd-party-frames, rd-party-section
        }

        // ── Chat feed ──
        if (prog.chatLog && prog.chatLog.length > 0) {
            html += `<div class="rd-chat-section">`;
            html += `<div class="rd-chat-header">💬 Raid Chat</div>`;
            html += `<div class="rd-chat-feed">`;
            const recentChat = prog.chatLog.slice(-20); // show last 20 msgs
            for (const msg of recentChat) {
                if (msg.user === 'SYSTEM') {
                    html += `<div class="rd-chat-line rd-chat-system">${msg.msg}</div>`;
                } else {
                    const chatColor = msg.color || '#cc8888';
                    html += `<div class="rd-chat-line"><span class="rd-chat-user" style="color:${chatColor};">[${msg.user}]</span> ${msg.msg}</div>`;
                }
            }
            html += `</div></div>`;
        }

        // ── Victory/Defeat result ──
        if (state === 'complete') {
            const survivorCount = prog.raidState ? prog.raidState.aliveCount : 10;
            const fullRaid = prog.raidState ? prog.raidState.fullRaid : 10;
            html += `<div class="rd-result victory">
                <div class="rd-result-icon">🏆</div>
                <div class="rd-result-title">RAID CLEARED!</div>
                <div class="rd-result-sub">${def.name} — ${def.subtitle}</div>
                <div class="rd-result-time">⏱️ ${this._rdFormatTime(prog.totalTime)} · 👥 ${survivorCount}/${fullRaid} survived</div>
            </div>`;

            // Performance summary
            html += this._renderRaidPerformance(prog);

            // Loot
            if (prog.loot) {
                const lootBonus = prog.buffs ? prog.buffs.lootCouncil : 0;
                html += `<div class="rd-loot-section">
                    <div class="rd-loot-title">✨ Raid Rewards${lootBonus > 0 ? ` <span style="font-size:10px;color:#88ee88;font-family:Inter,sans-serif;font-weight:400;">(+${Math.round(lootBonus * 100)}% Loot Council)</span>` : ''}</div>
                    <div class="rd-loot-grid">`;
                if (prog.loot.gold) html += `<div class="rd-loot-item">${iconImg('goldCoin', 14)} <span class="val">${prog.loot.gold.toLocaleString()}</span> Gold</div>`;
                if (prog.loot.xp) html += `<div class="rd-loot-item">${iconImg('xpStar', 14)} <span class="val">${prog.loot.xp.toLocaleString()}</span> XP</div>`;
                if (prog.loot.raidPoints) html += `<div class="rd-loot-item">${iconImg('raidPoints', 14)} <span class="val">${prog.loot.raidPoints.toLocaleString()}</span> Raid Points</div>`;
                if (prog.loot.soulEssence) html += `<div class="rd-loot-item">${iconImg('soulEssence', 14)} <span class="val">${prog.loot.soulEssence.toLocaleString()}</span> Soul Essence</div>`;
                if (prog.loot.karma) html += `<div class="rd-loot-item">${iconImg('aetherbit', 14)} <span class="val">${prog.loot.karma.toLocaleString()}</span> Aetherbits</div>`;
                html += `</div></div>`;
            }

            // Action buttons
            html += `<div class="rd-action-row">
                <button class="rd-action-btn leave">Leave Raid</button>
                <button class="rd-action-btn requeue primary" data-raid-id="${def.id}">🏛️ Queue Again</button>
            </div>`;
        }

        if (state === 'failed') {
            const wipeEnc = prog.currentEncounter;
            const wipeName = wipeEnc ? wipeEnc.name : 'Unknown';
            const wipeProgress = `${prog.encounterIndex + 1}/${prog.totalEncounters}`;
            html += `<div class="rd-result defeat">
                <div class="rd-result-icon">☠️</div>
                <div class="rd-result-title">RAID WIPED</div>
                <div class="rd-result-sub">${def.name} — Wiped at ${wipeName}</div>
                <div class="rd-result-time">⏱️ ${this._rdFormatTime(prog.totalTime)} · Progress: ${wipeProgress} encounters</div>
            </div>`;

            // Performance summary
            html += this._renderRaidPerformance(prog);
            
            // Death Log
            html += this._renderRaidDeathLog(prog);

            html += `<div class="rd-action-row">
                <button class="rd-action-btn leave">Leave Raid</button>
                <button class="rd-action-btn requeue primary" data-raid-id="${def.id}">🏛️ Try Again</button>
            </div>`;
        }

        // Leave button during active phases
        if (state === 'queue' || state === 'forming' || state === 'entering' || state === 'combat') {
            html += `<div class="rd-action-row" style="margin-top:10px;">
                <button class="rd-action-btn leave">🚪 Leave Raid</button>
            </div>`;
        }

        return html;
    }

    _rdFormatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    _renderRaidPerformance(prog) {
        if (!prog.combatStats) return '';
        const mode = this._raidPerfTab || 'dps';
        const stats = mode === 'dps' ? prog.combatStats.damage : prog.combatStats.healing;
        const totalTime = prog.totalTime || 1;

        // Convert Map to sorted array of objects
        const list = [];
        stats.forEach((val, id) => {
            let name = 'Unknown';
            let color = '#ccc';
            let isPlayer = false;
            
            if (id === 'player') {
                name = gameState.playerName;
                const pDisplay = { warrior: '#4488cc', mage: '#aa66ff', ranger: '#66bb44', cleric: '#ffcc44' };
                color = pDisplay[gameState.classId] || '#ccc';
                isPlayer = true;
            } else {
                const member = prog.partyMembers.find(m => m.id === id);
                if (member) {
                    name = member.name;
                    color = member.display.color;
                }
            }
            list.push({ id, name, val, perSec: val / totalTime, color, isPlayer });
        });

        // Sort by value descending
        list.sort((a, b) => b.val - a.val);
        const maxVal = list.length > 0 ? list[0].val : 1;

        let html = `<div class="rd-perf-section">
            <div class="rd-perf-title">📊 Raid Throughput</div>
            <div class="rd-perf-tabs">
                <div class="rd-perf-tab ${mode === 'dps' ? 'active' : ''}" data-perf-tab="dps">DPS</div>
                <div class="rd-perf-tab ${mode === 'hps' ? 'active' : ''}" data-perf-tab="hps">HPS</div>
            </div>`;

        list.forEach((entry, i) => {
            const pct = Math.round((entry.val / maxVal) * 100);
            const valStr = mode === 'dps' ? `${Math.floor(entry.perSec).toLocaleString()} DPS` : `${Math.floor(entry.perSec).toLocaleString()} HPS`;
            
            // MVP Badges
            let badge = '';
            if (i === 0) {
                badge = mode === 'dps' ? '👑' : '❇️';
            }

            html += `<div class="rd-perf-row" title="${Math.floor(entry.val).toLocaleString()} Total">
                <div class="rd-perf-name" style="color:${entry.color};font-weight:${entry.isPlayer ? '700' : '400'};">${entry.name}</div>
                <div class="rd-perf-bar-container">
                    <div class="rd-perf-bar-fill" style="width:${pct}%;background:${entry.color};opacity:0.6;"></div>
                    <div class="rd-perf-val">${valStr}</div>
                </div>
                <div class="rd-perf-mvp-badge">${badge}</div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

    _renderRaidDeathLog(prog) {
        if (!prog.deathLog || prog.deathLog.length === 0) return '';
        let html = `<div class="rd-perf-section" style="margin-top:10px;">
            <div class="rd-perf-title">☠️ Wipe Diagnostics</div>
            <div class="rd-death-log">`;
        
        // Reverse log to show most recent deaths first
        const log = [...prog.deathLog].reverse();
        for (const entry of log) {
            html += `<div class="rd-death-entry">
                <span><span class="name">${entry.name}</span> (${entry.role})</span>
                <span class="time">${this._rdFormatTime(entry.time)} @ ${entry.encounterName}</span>
            </div>`;
        }

        html += `</div></div>`;
        return html;
    }

    // ── Raid Buffs/Debuffs Bar ──────────────────────────────────────
    _renderRaidBuffsBar(prog) {
        if (!prog.buffs) return '';
        const b = prog.buffs;
        const icons = [];

        // ── Buffs (green) ──

        // Bloodlust — pulsing orange when active
        if (b.bloodlust) {
            icons.push(`<div class="rd-buff-icon bloodlust-active" title="Bloodlust: +${Math.round(b.bloodlust.bonus * 100)}% DPS for ${Math.ceil(b.bloodlust.timer)}s">🔥 Bloodlust <span class="rd-buff-timer">${Math.ceil(b.bloodlust.timer)}s</span></div>`);
        }

        // Feast buff
        if (b.feast) {
            icons.push(`<div class="rd-buff-icon buff" title="Raid Feast: +${Math.round(b.feast.bonus * 100)}% max HP buff">🍖 Feast +${Math.round(b.feast.bonus * 100)}%</div>`);
        }

        // Boss Damage Boost (Hivemind Crown)
        if (b.bossDmgBoost > 0) {
            icons.push(`<div class="rd-buff-icon buff" title="Hivemind Crown: +${Math.round(b.bossDmgBoost * 100)}% boss damage">👑 +${Math.round(b.bossDmgBoost * 100)}% Boss Dmg</div>`);
        }

        // Damage Reduction (Hivemind Carapace)
        if (b.dmgReduction > 0) {
            icons.push(`<div class="rd-buff-icon buff" title="Hivemind Carapace: -${Math.round(b.dmgReduction * 100)}% incoming raid damage">🛡️ -${Math.round(b.dmgReduction * 100)}% Dmg Taken</div>`);
        }

        // Soulstone Reserve
        if (b.soulstoneChance > 0) {
            icons.push(`<div class="rd-buff-icon buff" title="Soulstone Reserve: ${Math.round(b.soulstoneChance * 100)}% self-rez chance on NPC death">💎 Soulstone ${Math.round(b.soulstoneChance * 100)}%</div>`);
        }

        // Loot Council
        if (b.lootCouncil > 0) {
            icons.push(`<div class="rd-buff-icon buff" title="Loot Council Favor: +${Math.round(b.lootCouncil * 100)}% loot bonus">💰 +${Math.round(b.lootCouncil * 100)}% Loot</div>`);
        }

        // Mass Rez
        if (b.massRezHP > 0) {
            icons.push(`<div class="rd-buff-icon buff" title="Mass Resurrection: revive dead NPCs at ${Math.round(b.massRezHP * 100)}% HP after boss kills">✨ Mass Rez ${Math.round(b.massRezHP * 100)}%</div>`);
        }

        // ── Set Bonuses (gold) ──
        if (b.hivemind2pc) {
            icons.push(`<div class="rd-buff-icon set-bonus" title="Hivemind 2-Piece: +8% raid DPS">[2] +8% DPS</div>`);
        }
        if (b.hivemind4pc) {
            icons.push(`<div class="rd-buff-icon set-bonus" title="Hivemind 4-Piece: -5% incoming damage, +12% healing">[4] -5% Dmg +12% Heal</div>`);
        }

        // ── Debuffs (red) ──
        if (prog.enraged) {
            icons.push(`<div class="rd-buff-icon enrage-active" title="Boss ENRAGED! Double damage output!">💢 ENRAGE</div>`);
        }

        // Only render the bar if there are any active effects
        if (icons.length === 0) return '';

        return `<div class="rd-buffs-bar">${icons.join('')}</div>`;
    }

    // ══════════════════════════════════════════════════════════════════
    // RAID VENDOR — Hivemind Quartermaster UI
    // ══════════════════════════════════════════════════════════════════

    _setupRaidVendorListeners() {
        const btn = document.getElementById('raid-vendor-btn');
        if (btn) btn.addEventListener('click', () => this.toggleRaidVendorPanel());
        const close = document.getElementById('raid-vendor-close');
        if (close) close.addEventListener('click', () => this.toggleRaidVendorPanel(false));

        const body = document.getElementById('raid-vendor-body');
        if (body) {
            body.addEventListener('click', (e) => {
                // Gear buy button
                const gearBtn = e.target.closest('.rv-gear-buy');
                if (gearBtn && !gearBtn.classList.contains('owned') && !gearBtn.classList.contains('cant-afford')) {
                    const gearId = gearBtn.dataset.gearId;
                    if (gearId) {
                        const result = raidVendor.buyGear(gearId);
                        if (result.success) {
                            audioManager.playUiOpen();
                            this.renderRaidVendorPanel();
                        }
                    }
                    return;
                }
                // Upgrade buy button
                const upgBtn = e.target.closest('.rv-upg-buy');
                if (upgBtn && !upgBtn.classList.contains('maxed') && !upgBtn.classList.contains('cant-afford')) {
                    const upgId = upgBtn.dataset.upgId;
                    if (upgId) {
                        const result = raidVendor.buyUpgrade(upgId);
                        if (result.success) {
                            audioManager.playUiOpen();
                            this.renderRaidVendorPanel();
                        }
                    }
                    return;
                }
            });
        }
    }

    toggleRaidVendorPanel(force) {
        const panel = document.getElementById('raid-vendor-panel');
        if (!panel) return;
        const isOpen = force !== undefined ? force : !panel.classList.contains('open');
        if (isOpen) {
            this._closeAllPanels();
            this.raidVendorOpen = true;
            panel.classList.add('open');
            this._unseenUpgrades.raid = false; // Reset notification glow
            this.renderRaidVendorPanel();
            audioManager.playUiOpen();
        } else {
            this.raidVendorOpen = false;
            panel.classList.remove('open');
        }
    }

    /** Lightweight currency header refresh (no full rebuild) */
    _refreshRaidVendorCurrency() {
        const rpEl = document.getElementById('raidv-rp-val');
        if (rpEl) rpEl.textContent = raidVendor.raidPoints.toLocaleString();
    }

    renderRaidVendorPanel() {
        const body = document.getElementById('raid-vendor-body');
        if (!body) return;

        // Update currency header
        this._refreshRaidVendorCurrency();

        let html = '';

        // ── Active Bonuses Summary ───────────────────────────────
        const bloodlust = raidVendor.getBloodlustBonus();
        const soulstone = raidVendor.getSoulstoneChance();
        const feast = raidVendor.getFeastBonus();
        const massRez = raidVendor.getMassRezHP();
        const rpBoost = raidVendor.getRPBoostMult();
        const lootCouncil = raidVendor.getLootCouncilBonus();
        const bossDmg = raidVendor.getRaidBossDmgBoost();
        const dmgReduce = raidVendor.getRaidDmgReduction();

        const hasAnyBonus = bloodlust.bonus || soulstone || feast || massRez || rpBoost || lootCouncil || bossDmg || dmgReduce;
        if (hasAnyBonus) {
            html += `<div class="rv-bonuses">`;
            if (bloodlust.bonus) html += `<div class="bonus-item">🔥 Bloodlust: <span class="bonus-val">+${Math.round(bloodlust.bonus * 100)}% DPS for ${bloodlust.duration}s</span></div>`;
            if (soulstone) html += `<div class="bonus-item">💎 Soulstone: <span class="bonus-val">${Math.round(soulstone * 100)}% rez chance</span></div>`;
            if (feast) html += `<div class="bonus-item">🍖 Feast: <span class="bonus-val">+${Math.round(feast * 100)}% boss HP</span></div>`;
            if (massRez) html += `<div class="bonus-item">✨ Mass Rez: <span class="bonus-val">${Math.round(massRez * 100)}% HP revive</span></div>`;
            if (rpBoost) html += `<div class="bonus-item">🚩 RP Boost: <span class="bonus-val">+${Math.round(rpBoost * 100)}%</span></div>`;
            if (lootCouncil) html += `<div class="bonus-item">💰 Loot Council: <span class="bonus-val">+${Math.round(lootCouncil * 100)}% gold/XP</span></div>`;
            if (bossDmg) html += `<div class="bonus-item">⚔️ Boss Dmg: <span class="bonus-val">+${Math.round(bossDmg * 100)}%</span></div>`;
            if (dmgReduce) html += `<div class="bonus-item">🛡️ Raid Dmg Taken: <span class="bonus-val">-${Math.round(dmgReduce * 100)}%</span></div>`;
            html += `</div>`;
        }

        // ── Set Bonus Tracker ──────────────────────────────────────
        const hivemindCount = raidVendor.getSetPieceCount('hivemind');
        if (hivemindCount > 0) {
            html += `<div class="rv-set-bonus">`;
            html += `<div class="set-title">🏛️ Hivemind Set — <span class="set-count">${hivemindCount}/4</span> pieces</div>`;
            if (hivemindCount >= 2) html += `<div style="color:#88ddaa;margin-top:2px;">✓ 2-piece: Raid boss damage boost + raid damage reduction active</div>`;
            if (hivemindCount >= 4) html += `<div style="color:#ffcc44;margin-top:2px;">✓ 4-piece: Full set! Phase shields + encounter healing active</div>`;
            if (hivemindCount < 4) html += `<div style="color:#886666;margin-top:2px;font-style:italic;">${4 - hivemindCount} more pieces for full set bonus</div>`;
            html += `</div>`;
        }

        // ── RP Stats ─────────────────────────────────────────────
        html += `<div class="rv-stats">`;
        html += `<span>Total Earned: <span class="val">${raidVendor.totalRPEarned.toLocaleString()}</span></span>`;
        html += `<span>Total Spent: <span class="val">${raidVendor.totalRPSpent.toLocaleString()}</span></span>`;
        html += `<span>Gear Owned: <span class="val">${raidVendor.purchasedGear.size}/${RAID_GEAR.length}</span></span>`;
        html += `</div>`;

        // ── Raid Gear Section ─────────────────────────────────────
        html += `<div class="rv-section-title">🏛️ Raid Gear — Hivemind Set</div>`;

        const sortedGear = [...RAID_GEAR].sort((a, b) => a.tier - b.tier || a.cost - b.cost);
        for (const gear of sortedGear) {
            const owned = raidVendor.isGearPurchased(gear.id);
            const canAfford = raidVendor.raidPoints >= gear.cost;

            html += `<div class="rv-gear-card ${owned ? 'purchased' : ''}">`;
            html += `<div class="rv-gear-icon">${gear.icon}</div>`;
            html += `<div class="rv-gear-info">`;
            html += `<div class="rv-gear-name">${gear.name}</div>`;
            html += `<div class="rv-gear-desc">${gear.description}</div>`;
            html += `<div class="rv-gear-slot">${gear.slot} — Tier ${gear.tier}</div>`;
            html += `</div>`;

            if (owned) {
                html += `<button class="rv-gear-buy owned">✓ Owned</button>`;
            } else {
                html += `<button class="rv-gear-buy ${canAfford ? '' : 'cant-afford'}" data-gear-id="${gear.id}">${iconImg('raidPoints', 12)} ${gear.cost} RP</button>`;
            }
            html += `</div>`;
        }

        // ── Raid Upgrades Section ─────────────────────────────────
        html += `<div class="rv-section-title">📈 Raid Upgrades</div>`;

        for (const upg of RAID_UPGRADES) {
            const currentTier = raidVendor.upgradeLevels[upg.id] || 0;
            const maxTier = upg.tiers.length;
            const isMaxed = currentTier >= maxTier;
            const next = raidVendor.getNextUpgradeTier(upg.id);
            const canAfford = next ? raidVendor.raidPoints >= next.cost : false;

            html += `<div class="rv-upg-row">`;
            html += `<div class="rv-upg-icon">${upg.icon}</div>`;
            html += `<div class="rv-upg-info">`;
            html += `<div class="rv-upg-name">${upg.name}</div>`;
            html += `<div class="rv-upg-desc">${upg.description}</div>`;

            // Tier progress pips
            html += `<div class="rv-upg-tier">`;
            for (let i = 0; i < maxTier; i++) {
                const filled = i < currentTier;
                html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:3px;border:1px solid ${filled ? 'rgba(100,220,140,0.6)' : 'rgba(220,80,90,0.25)'};background:${filled ? 'rgba(80,200,120,0.5)' : 'transparent'};"></span>`;
            }
            html += ` ${currentTier}/${maxTier}`;
            if (!isMaxed && next) html += ` — Next: ${next.label}`;
            html += `</div>`;

            html += `</div>`;

            if (isMaxed) {
                html += `<button class="rv-upg-buy maxed">✓ MAX</button>`;
            } else {
                html += `<button class="rv-upg-buy ${canAfford ? '' : 'cant-afford'}" data-upg-id="${upg.id}">${iconImg('raidPoints', 12)} ${next.cost} RP</button>`;
            }
            html += `</div>`;
        }

        body.innerHTML = html;
    }
}