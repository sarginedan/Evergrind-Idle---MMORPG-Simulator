// Evergrind Idle — MMORPG Simulator
// Full 3D idle MMO with auto-combat, questing, gathering, and progression
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState, bindShops, bindPartySystem } from './GameState.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { MobManager } from './MobManager.js';
import { IdleEngine } from './IdleEngine.js';
import { CombatEffects } from './CombatEffects.js';
import { UI } from './UI.js';
import { questLog } from './QuestLog.js';
import { saveManager } from './SaveManager.js';
import { WorldPickups } from './WorldPickups.js';
import { talentTree } from './TalentTree.js';
import { upgradeStation } from './UpgradeStation.js';
import { goldShop } from './GoldShop.js';
import { aetherbitShop } from './AetherbitShop.js';
import { IntroScreen } from './IntroScreen.js';
import { audioManager } from './AudioManager.js';
import { achievementManager } from './Achievements.js';
import { FakePlayerManager } from './FakePlayerManager.js';
import { loadingScreen } from './LoadingScreen.js';
import { generateMessage as generateBarrensMsg, clearPendingChains } from './BarrensChat.js';
import { inventory } from './Inventory.js';
import { partySystem } from './PartySystem.js';
import { PartyMemberManager } from './PartyMemberManager.js';
import { soulForge } from './SoulForge.js';
import { dungeonSystem } from './DungeonSystem.js';
import { DungeonScene } from './DungeonScene.js';
import { companionSystem } from './CompanionSystem.js';
import { CompanionEntity } from './CompanionEntity.js';
import { battlegroundSystem } from './BattlegroundSystem.js';
import { BattlegroundScene } from './BattlegroundScene.js';
import { raidSystem } from './RaidSystem.js';
import { RaidScene } from './RaidScene.js';
import { raidVendor } from './RaidVendor.js';

// ═══════════════════════════════════════════════════════════════════
// INTER-CHARACTER COLLISION SEPARATION
// Lightweight post-movement pass — prevents player, party, and NPCs
// from overlapping. Runs every visual frame. Zero allocations.
//
// Supports variable collision radii per entity type:
//   COLLISION_RADIUS_SMALL  (0.25) — pets, companions, small summons
//   COLLISION_RADIUS_NORMAL (0.40) — standard characters (player, party, NPCs)
//   COLLISION_RADIUS_LARGE  (0.60) — mounted characters, elite mobs
//   COLLISION_RADIUS_HUGE   (0.85) — raid bosses, massive creatures
//
// Each entity stores its own `collisionRadius` property. The separation
// distance for any pair is (radiusA + radiusB) — asymmetric combos
// (e.g. mounted player vs pet) naturally produce correct spacing.
// ═══════════════════════════════════════════════════════════════════

// Named collision size constants — import-friendly for other modules
export const COLLISION_RADIUS_SMALL  = 0.25;
export const COLLISION_RADIUS_NORMAL = 0.40;
export const COLLISION_RADIUS_LARGE  = 0.60;
export const COLLISION_RADIUS_HUGE   = 0.85;

const NPC_CHECK_RANGE_SQ = 12 * 12;  // Only check NPCs within 12 units of player
const SEPARATION_STRENGTH = 0.55;    // How aggressively to push apart (0-1)
const PLAYER_PUSH_RATIO = 0.15;      // Player gets pushed 15%, other entity 85%

// Pre-allocated array for party data (max 4 party members) — zero GC
// Each slot holds { pos: Vector3, radius: number }
const _partySlots = new Array(4);
for (let i = 0; i < 4; i++) _partySlots[i] = { pos: null, radius: COLLISION_RADIUS_NORMAL };
let _partyCount = 0;

/**
 * Get an entity's collision radius, falling back to NORMAL if unset.
 * Reads `entity.collisionRadius` (a simple number property).
 */
function _getRadius(entity) {
    return entity.collisionRadius || COLLISION_RADIUS_NORMAL;
}

/**
 * Resolve overlaps between player, party members, and nearby fake players.
 * Uses per-entity collision radii for variable-size characters.
 * 1-2 iterations per frame is plenty since characters move slowly relative to frame rate.
 */
function resolveCharacterOverlaps(player, partyMemberMgr, fakePlayerMgr, playerPos) {
    // ── Gather all "owned" character positions + radii ──
    const pPos = player.position;
    const pRad = _getRadius(player);

    // Party member group positions + radii (reuse pre-allocated slots)
    _partyCount = 0;
    if (partyMemberMgr && partyMemberMgr.entities) {
        for (const entry of partyMemberMgr.entities) {
            if (_partyCount < 4) {
                const slot = _partySlots[_partyCount];
                slot.pos = entry.entity.group.position;
                slot.radius = _getRadius(entry.entity);
                _partyCount++;
            }
        }
    }

    const partyCount = _partyCount;
    if (partyCount === 0 && (!fakePlayerMgr || fakePlayerMgr.fakePlayers.length === 0)) return;

    // ── Pass 1: Separate party members from each other ──
    for (let i = 0; i < partyCount; i++) {
        for (let j = i + 1; j < partyCount; j++) {
            const a = _partySlots[i].pos;
            const b = _partySlots[j].pos;
            const minDist = _partySlots[i].radius + _partySlots[j].radius;
            const minDistSq = minDist * minDist;
            const dx = a.x - b.x;
            const dz = a.z - b.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < minDistSq && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const push = overlap * SEPARATION_STRENGTH * 0.5;
                const nx = dx / dist;
                const nz = dz / dist;
                a.x += nx * push;
                a.z += nz * push;
                b.x -= nx * push;
                b.z -= nz * push;
            } else if (distSq <= 0.0001) {
                // Exactly overlapping — nudge with deterministic offset
                const angle = (i * 2.39996) % (Math.PI * 2); // golden angle
                a.x += Math.cos(angle) * 0.15;
                a.z += Math.sin(angle) * 0.15;
            }
        }
    }

    // ── Pass 2: Separate party members from the player ──
    for (let i = 0; i < partyCount; i++) {
        const pm = _partySlots[i].pos;
        const minDist = pRad + _partySlots[i].radius;
        const minDistSq = minDist * minDist;
        const dx = pm.x - pPos.x;
        const dz = pm.z - pPos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDistSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const push = overlap * SEPARATION_STRENGTH;
            const nx = dx / dist;
            const nz = dz / dist;
            // Player is pushed less, party member more
            pPos.x -= nx * push * PLAYER_PUSH_RATIO;
            pPos.z -= nz * push * PLAYER_PUSH_RATIO;
            pm.x += nx * push * (1 - PLAYER_PUSH_RATIO);
            pm.z += nz * push * (1 - PLAYER_PUSH_RATIO);
        } else if (distSq <= 0.0001) {
            pm.x += 0.3;
            pm.z += 0.15;
        }
    }

    // ── Pass 3: Separate nearby fake players from player & party ──
    if (fakePlayerMgr && fakePlayerMgr.fakePlayers) {
        const fakes = fakePlayerMgr.fakePlayers;
        for (let f = 0; f < fakes.length; f++) {
            const fakeEntity = fakes[f];
            const fp = fakeEntity.group.position;
            const fRad = _getRadius(fakeEntity);

            // Quick range check — skip distant NPCs
            const tpDx = fp.x - playerPos.x;
            const tpDz = fp.z - playerPos.z;
            if (tpDx * tpDx + tpDz * tpDz > NPC_CHECK_RANGE_SQ) continue;

            // Check vs player
            {
                const minDist = pRad + fRad;
                const minDistSq = minDist * minDist;
                const dx = fp.x - pPos.x;
                const dz = fp.z - pPos.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < minDistSq && distSq > 0.0001) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    const push = overlap * SEPARATION_STRENGTH;
                    const nx = dx / dist;
                    const nz = dz / dist;
                    // NPC gets pushed mostly, player barely moves
                    fp.x += nx * push * 0.9;
                    fp.z += nz * push * 0.9;
                    pPos.x -= nx * push * 0.1;
                    pPos.z -= nz * push * 0.1;
                }
            }

            // Check vs party members
            for (let i = 0; i < partyCount; i++) {
                const pm = _partySlots[i].pos;
                const minDist = _partySlots[i].radius + fRad;
                const minDistSq = minDist * minDist;
                const dx = fp.x - pm.x;
                const dz = fp.z - pm.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < minDistSq && distSq > 0.0001) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    const push = overlap * SEPARATION_STRENGTH;
                    const nx = dx / dist;
                    const nz = dz / dist;
                    // Both get pushed equally
                    fp.x += nx * push * 0.5;
                    fp.z += nz * push * 0.5;
                    pm.x -= nx * push * 0.5;
                    pm.z -= nz * push * 0.5;
                }
            }
        }
    }

    // ── Sync player group position (Player.js copies position→group in update,
    //    but we mutated position after update, so re-sync) ──
    player.group.position.x = pPos.x;
    player.group.position.z = pPos.z;
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL RENDERER & SCENE SETUP
// ═══════════════════════════════════════════════════════════════════
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: 'high-performance',
    precision: 'mediump', // Better performance on mobile/integrated GPUs
});

// Utility to ensure the DOM has painted before moving to heavy tasks
const waitForPaint = () => new Promise(r => {
    requestAnimationFrame(() => {
        setTimeout(r, 0);
    });
});

// Initialize audio on first interaction
const initAudio = () => {
    if (!audioManager.initialized) audioManager.init();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('keydown', initAudio);
    window.removeEventListener('touchstart', initAudio);
};
window.addEventListener('click', initAudio);
window.addEventListener('keydown', initAudio);
window.addEventListener('touchstart', initAudio);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(0.5); // Start in low-res mode (default)
renderer.shadowMap.enabled = false; // Default off
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows when enabled
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020408); // Deep black for intro

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.6, 5); // Select screen camera position
camera.lookAt(0, 1.2, 0);

const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    if (gameState.isLoading) {
        loadingScreen.setProgress(Math.floor(progress), `Loading Assets: ${itemsLoaded}/${itemsTotal}`);
    }
};

const textureLoader = new THREE.TextureLoader(loadingManager);

// ═══════════════════════════════════════════════════════════════════
// INTRO SCREEN — Show title & character select before anything loads
// ═══════════════════════════════════════════════════════════════════
const slots = saveManager.getSlots();
const lastUsedSlotId = Object.entries(slots).sort((a,b) => b[1].timestamp - a[1].timestamp)[0]?.[0] || 0;
const initialClassId = slots[lastUsedSlotId]?.classId || 'warrior';

const introPlayer = new Player(scene, initialClassId); // Temporary player for selection screen
introPlayer.group.position.set(0, 0, 0);

// Register a GLOBAL beforeunload save handler immediately — protects saves
// even during the intro screen (the in-game handler inside initGame replaces this behavior)
window.addEventListener('beforeunload', () => {
    // Only save if the game has actually started (initGame sets this flag)
    if (window._gameInitialized) saveManager.forceSave();
});

const intro = new IntroScreen();
intro.show(scene, camera, renderer, introPlayer).then(async ({ isNewGame, playerName, classId, slotId }) => {
    // Set the active slot before doing anything else
    saveManager.setCurrentSlot(slotId);

    let startZoneId = 'verdant_wilds';
    if (!isNewGame) {
        const loadedData = saveManager.peek(slotId);
        if (loadedData?.gs?.currentZoneId) {
            startZoneId = loadedData.gs.currentZoneId;
        }
    }

    // Show loading screen immediately with themed background
    gameState.isLoading = true;
    loadingScreen.show(startZoneId);
    loadingScreen.setProgress(10, "Initializing Systems...");
    
    // Crucial: Wait for the loading screen to actually appear in the DOM
    await waitForPaint();

    // Cleanup intro player
    scene.remove(introPlayer.group);
    
    if (isNewGame) {
        // Clear save FIRST, then set new character data on gameState
        saveManager.clearSave();
        
        // Set name and class AFTER clearing so they aren't stale
        if (playerName) {
            CONFIG.PLAYER_NAME = playerName;
            gameState.playerName = playerName;
        }
        if (classId) {
            gameState.classId = classId;
        }
    } else {
        // For continue, we set these temporarily — saveManager.load() will
        // overwrite them with the authoritative saved values.
        if (playerName) {
            CONFIG.PLAYER_NAME = playerName;
            gameState.playerName = playerName;
        }
        if (classId) {
            gameState.classId = classId;
        }
    }
    
    await initGame(isNewGame);
});

// ═══════════════════════════════════════════════════════════════════
// MAIN GAME — All initialization wrapped in a function called after intro
// ═══════════════════════════════════════════════════════════════════
async function initGame(isNewGame) {
    loadingScreen.setProgress(20, "Forging World Geometry...");
    await waitForPaint();

    // Reset scene background for world
    scene.background = new THREE.Color(0x0a150a);

    // ---- Build World ----
    let world = new World(scene, textureLoader);
    await world.buildWorld(); // Properly await the async building process
    await waitForPaint();

    loadingScreen.setProgress(40, "Summoning Mobs...");
    await waitForPaint();
    
    // ---- Player ----
    const player = new Player(scene, gameState.classId);
    player.world = world;
    // Tag player group so RaidScene NPC system can find it for formation anchoring
    player.group.userData.isPlayer = true;
    
    // ---- Mob Manager ----
    let mobManager = new MobManager(scene, world);
    await waitForPaint();

    // ---- Combat Effects ----
    const combatEffects = new CombatEffects(scene);
    mobManager.setCombatEffects(combatEffects);
    loadingScreen.setProgress(60, "Binding Arcane Systems...");
    await waitForPaint();

    // ---- World Pickups ----
    let worldPickups = new WorldPickups(scene, world);

    // ---- Idle Engine ----
    let idleEngine = new IdleEngine(player, world, mobManager, worldPickups);
    await waitForPaint();

    // ---- UI ----
    const ui = new UI();
    window.audioManager = audioManager;
    window._spawnAchievementVFX = () => combatEffects.spawnAchievementEffect(player.getPosition());

    // ---- Fake Players (MMO Sim) ----
    const fakePlayerManager = new FakePlayerManager(scene, camera);
    await fakePlayerManager.spawnFakePlayers(gameState.currentZoneId, world);
    loadingScreen.setProgress(80, "Synchronizing Social Layers...");
    await waitForPaint();

    // ---- Party Member 3D Entities ----
    const partyMemberManager = new PartyMemberManager(scene, camera);
    partyMemberManager.setPlayerGroup(player.group);
    partyMemberManager.setCombatEffects(combatEffects);

    // Wire PartySystem → 3D prospect NPC hooks
    partySystem._onInviteCreated = (member) => {
        partyMemberManager.spawnProspect(member);
    };
    partySystem._onInviteResolved = (outcome, member) => {
        partyMemberManager.resolveProspect(outcome, member);
    };

    // ---- Companion Pet Entity ----
    const companionEntity = new CompanionEntity(scene);
    // Wire entity ref so mobs can check companion proximity for aggro
    companionSystem._entityRef = companionEntity;
    // Sync bestiary from existing kills (for saves that predate companion system)
    companionSystem.syncFromKillLog();

    // ---- Dungeon 3D Scene ----
    const dungeonScene = new DungeonScene(scene, camera, textureLoader);
    window._dungeonScene = dungeonScene;

    // ---- Battleground 3D Scene ----
    const bgScene = new BattlegroundScene(scene, camera, textureLoader);

    // ---- Raid 3D Scene ----
    const raidScene = new RaidScene(scene, camera, textureLoader);

    // Track whether we're in dungeon mode (hides overworld)
    let _inDungeonMode = false;
    let _inBGMode = false;
    let _inRaidMode = false;
    // Saved overworld visibility for restore
    let _overworldObjects = []; // populated on first dungeon entry

    function enterDungeonMode(dungeonDef) {
        if (_inDungeonMode || _inBGMode || _inRaidMode) return;
        _inDungeonMode = true;

        // Hide overworld environment (but keep player, party, companion visible!)
        if (world.groundMesh) world.groundMesh.visible = false;
        if (world._worldObjects) {
            for (const obj of world._worldObjects) obj.visible = false;
        }
        // Hide overworld mobs (dungeon has its own)
        for (const mob of mobManager.mobs) {
            if (mob.group) mob.group.visible = false;
        }
        // Hide fake players (no randoms in dungeon instances)
        fakePlayerManager.setVisible(false);
        // Hide overworld world labels (dungeon handles its own high-fidelity ones)
        // BUT keep the 3D entities updating and visible!
        partyMemberManager._visible = true; // Ensure movement logic runs
        for (const ent of partyMemberManager.entities) {
            if (ent.ui && ent.ui.nameLabel) ent.ui.nameLabel.style.display = 'none';
        }

        // Hide world pickups
        if (worldPickups.pickups) {
            for (const p of worldPickups.pickups) {
                if (p.group) p.group.visible = false;
            }
        }

        // Teleport player to dungeon start position (slightly ahead of first room)
        player.position.set(0, 0, 6);
        player.group.position.set(0, 0, 6);
        player.clearTarget();
        player.isAttacking = false;

        // Disable obstacle avoidance (no overworld trees/rocks in dungeon)
        player._savedWorld = player.world;
        player.world = null;

        // Enter 3D dungeon scene (builds the dungeon environment)
        dungeonScene.enter(dungeonDef);

        // Set dungeon-themed vignette (warm volcanic glow)
        if (vignetteOverlay) {
            vignetteOverlay.style.background = `radial-gradient(ellipse at center, 
                transparent 0%, 
                transparent 50%, 
                rgba(15,4,0,0.3) 75%, 
                rgba(15,4,0,0.5) 100%
            )`;
        }

        // Reposition party members and companion to new player position
        partyMemberManager.onZoneChange();
        companionEntity.onZoneChange(player.group);
    }

    function exitDungeonMode() {
        if (!_inDungeonMode) return;
        _inDungeonMode = false;

        // Exit 3D dungeon scene
        dungeonScene.exit();

        // Restore overworld objects
        if (world.groundMesh) world.groundMesh.visible = true;
        if (world._worldObjects) {
            for (const obj of world._worldObjects) obj.visible = true;
        }
        for (const mob of mobManager.mobs) {
            if (mob.group) mob.group.visible = true;
        }
        fakePlayerManager.setVisible(true);
        partyMemberManager.setVisible(true);
        // Companion restores visibility via its own update (checks activeCompanion)
        if (worldPickups.pickups) {
            for (const p of worldPickups.pickups) {
                if (p.group) p.group.visible = true;
            }
        }

        // Restore obstacle avoidance
        if (player._savedWorld) {
            player.world = player._savedWorld;
            player._savedWorld = null;
        }

        // Teleport player back to overworld origin
        player.position.set(0, 0, 0);
        player.group.position.set(0, 0, 0);
        player.clearTarget();
        player.isAttacking = false;

        // Reset idle engine so it starts finding targets again
        idleEngine.state = 'idle';
        idleEngine.currentTarget = null;
        idleEngine.stateTimer = 0;
        idleEngine.searchTimer = 0;

        // Restore vignette for current overworld zone
        updateVignetteForZone(gameState.currentZoneId);

        // Reposition party/companion back to overworld
        partyMemberManager.onZoneChange();
        companionEntity.onZoneChange(player.group);
    }

    // Wire dungeon system state changes to 3D scene
    dungeonSystem._onEnterDungeon = (def) => enterDungeonMode(def);
    dungeonSystem._onLeaveDungeon = () => exitDungeonMode();

    // ── Battleground enter/exit ──
    function enterBGMode(bgDef) {
        if (_inBGMode || _inDungeonMode || _inRaidMode) return;
        _inBGMode = true;

        // Hide overworld
        if (world.groundMesh) world.groundMesh.visible = false;
        if (world._worldObjects) {
            for (const obj of world._worldObjects) obj.visible = false;
        }
        for (const mob of mobManager.mobs) {
            if (mob.group) mob.group.visible = false;
        }
        fakePlayerManager.setVisible(false);
        if (worldPickups.pickups) {
            for (const p of worldPickups.pickups) {
                if (p.group) p.group.visible = false;
            }
        }

        // Player participates in BG — visible and walking around
        // Position at Voidborne base to start
        player.position.set(-24, 0, 0);
        player.group.position.set(-24, 0, 0);
        player.group.visible = true;
        player.clearTarget();
        player.isAttacking = false;
        player._savedWorld = player.world;
        player.world = null;

        // Hide party members and companion — they don't participate
        partyMemberManager.setVisible(false);
        if (companionEntity.group) companionEntity.group.visible = false;

        bgScene.enter(bgDef);

        // PvP-themed vignette
        if (vignetteOverlay) {
            vignetteOverlay.style.background = `radial-gradient(ellipse at center,
                transparent 0%,
                transparent 50%,
                rgba(10,2,20,0.3) 75%,
                rgba(10,2,20,0.6) 100%
            )`;
        }
    }

    function exitBGMode() {
        if (!_inBGMode) return;
        _inBGMode = false;

        bgScene.exit();

        // Restore overworld
        if (world.groundMesh) world.groundMesh.visible = true;
        if (world._worldObjects) {
            for (const obj of world._worldObjects) obj.visible = true;
        }
        for (const mob of mobManager.mobs) {
            if (mob.group) mob.group.visible = true;
        }
        fakePlayerManager.setVisible(true);
        if (worldPickups.pickups) {
            for (const p of worldPickups.pickups) {
                if (p.group) p.group.visible = true;
            }
        }

        if (player._savedWorld) {
            player.world = player._savedWorld;
            player._savedWorld = null;
        }

        // Restore player model, party members, and companion
        player.group.visible = true;
        player.position.set(0, 0, 0);
        player.group.position.set(0, 0, 0);
        player.clearTarget();
        player.isAttacking = false;

        partyMemberManager.setVisible(true);
        if (companionEntity.group) companionEntity.group.visible = true;

        idleEngine.state = 'idle';
        idleEngine.currentTarget = null;
        idleEngine.stateTimer = 0;
        idleEngine.searchTimer = 0;

        updateVignetteForZone(gameState.currentZoneId);
        partyMemberManager.onZoneChange();
        companionEntity.onZoneChange(player.group);
    }

    // Wire battleground system
    battlegroundSystem._onEnterBG = (def) => enterBGMode(def);
    battlegroundSystem._onLeaveBG = () => exitBGMode();

    // ── Raid enter/exit ──
    function enterRaidMode(raidDef) {
        if (_inRaidMode || _inDungeonMode || _inBGMode) return;
        _inRaidMode = true;

        // Hide overworld
        if (world.groundMesh) world.groundMesh.visible = false;
        if (world._worldObjects) {
            for (const obj of world._worldObjects) obj.visible = false;
        }
        for (const mob of mobManager.mobs) {
            if (mob.group) mob.group.visible = false;
        }
        fakePlayerManager.setVisible(false);
        if (worldPickups.pickups) {
            for (const p of worldPickups.pickups) {
                if (p.group) p.group.visible = false;
            }
        }

        // Position player at raid entrance
        player.position.set(0, 0, 6);
        player.group.position.set(0, 0, 6);
        player.group.visible = true;
        player.clearTarget();
        player.isAttacking = false;
        player._savedWorld = player.world;
        player.world = null;

        // Enter 3D raid scene
        raidScene.enter(raidDef);

        // Raid-themed vignette (crimson/teal hive aesthetic)
        if (vignetteOverlay) {
            vignetteOverlay.style.background = `radial-gradient(ellipse at center,
                transparent 0%,
                transparent 50%,
                rgba(20,3,8,0.3) 75%,
                rgba(20,3,8,0.6) 100%
            )`;
        }

        // Hide overworld party members & companion — raid uses its own 9-NPC system
        partyMemberManager.setVisible(false);
        if (companionEntity.group) companionEntity.group.visible = false;
    }

    function exitRaidMode() {
        if (!_inRaidMode) return;
        _inRaidMode = false;

        raidScene.exit();

        // Restore overworld
        if (world.groundMesh) world.groundMesh.visible = true;
        if (world._worldObjects) {
            for (const obj of world._worldObjects) obj.visible = true;
        }
        for (const mob of mobManager.mobs) {
            if (mob.group) mob.group.visible = true;
        }
        fakePlayerManager.setVisible(true);
        if (worldPickups.pickups) {
            for (const p of worldPickups.pickups) {
                if (p.group) p.group.visible = true;
            }
        }

        if (player._savedWorld) {
            player.world = player._savedWorld;
            player._savedWorld = null;
        }

        player.group.visible = true;
        player.position.set(0, 0, 0);
        player.group.position.set(0, 0, 0);
        player.clearTarget();
        player.isAttacking = false;

        partyMemberManager.setVisible(true);
        if (companionEntity.group) companionEntity.group.visible = true;

        idleEngine.state = 'idle';
        idleEngine.currentTarget = null;
        idleEngine.stateTimer = 0;
        idleEngine.searchTimer = 0;

        updateVignetteForZone(gameState.currentZoneId);
        partyMemberManager.onZoneChange();
        companionEntity.onZoneChange(player.group);
    }

    // Wire raid system
    raidSystem._onEnterRaid = (def) => enterRaidMode(def);
    raidSystem._onLeaveRaid = () => exitRaidMode();
    raidSystem._onTriggerMechanic = (type, x, z, scale, life, color, rotation) => {
        raidScene.spawnGroundIndicator(type, x, z, scale, life, color, rotation);
    };

    // Wire party chat → 3D speech bubbles
    const _origAddChat = gameState.addChatMessage.bind(gameState);
    gameState.addChatMessage = (channel, user, msg) => {
        _origAddChat(channel, user, msg);
        if (channel === 'Party') {
            // Find the party member by name and show their bubble
            const member = partySystem.members.find(m => m.name === user);
            if (member) {
                partyMemberManager.showMemberBubble(member.id, msg);
            }
        }
    };

    // ---- Quest Log wiring ----
    gameState.setQuestLog(questLog);

    // ---- Shop wiring (late-bound to avoid circular deps) ----
    bindShops(goldShop, aetherbitShop);
    bindPartySystem(partySystem);

    // ---- Victory UI hookup ----
    gameState._onVictory = () => {
        ui.showVictoryOverlay();
    };

    // ---- Endgame World Scaling Trigger ----
    // When the Crimson Reach boss is defeated and endgameComplete flips to true,
    // immediately respawn all mobs in the current zone with level 60 endgame stats.
    // This creates the visible "world shift" moment — existing low-level mobs are
    // replaced with endgame-scaled versions. Also shows the Paragon button and
    // forces a save so the endgame state persists.
    gameState._onEndgameActivated = () => {
        // 1. Despawn all current mobs and respawn with endgame scaling
        //    (getMobStats() now reads endgameComplete=true → level 60 stats)
        mobManager.despawnAll();
        mobManager.resetForZone();

        // 2. Reset idle engine combat state so it retargets the new mobs
        idleEngine.state = 'idle';
        idleEngine.currentTarget = null;
        idleEngine.stateTimer = 0;

        // 3. Show the Paragon button immediately
        ui.updateParagonBadge();

        // 4. Force save to persist endgame state
        saveManager.forceSave();

        // 5. Log the dramatic world shift
        gameState.addGameLog('⚡ The world trembles… All zones have been reforged at Level 60!');
        gameState.addChatMessage('Game', 'System', '⚡ Endgame scaling activated — every zone in the realm now challenges Level 60 heroes.');
    };

    // ---- Zone Change Handler ----
    gameState._onZoneChange = async (zoneId) => {
        // Show loading screen immediately to hide the freeze
        gameState.isLoading = true;
        loadingScreen.show(zoneId);
        loadingScreen.setProgress(10, `Preparing departure...`);
        await waitForPaint();
        
        loadingScreen.setProgress(30, `Traveling to ${CONFIG.getZone(zoneId).name}...`);
        await waitForPaint();

        // 1. Reset player position
        player.position.set(0, 0, 0);
        player.clearTarget();
        player.group.position.set(0, 0, 0);
        
        // 2. Rebuild world for new zone
        loadingScreen.setProgress(50, `Synthesizing environment...`);
        await waitForPaint();
        await world.rebuildForZone(zoneId);
        
        // 3. Despawn all mobs and respawn for new zone
        loadingScreen.setProgress(70, `Populating region...`);
        await waitForPaint();
        mobManager.despawnAll();
        mobManager.world = world;
        mobManager.resetForZone();
        
        // 4. Reset world pickups for new zone
        worldPickups.resetForZone(zoneId, world);

        // 5. Update player world reference for obstacle avoidance
        player.world = world;

        // 6. Reset idle engine state & clear pending chat chains
        idleEngine.state = 'idle';
        idleEngine.currentTarget = null;
        idleEngine.gatherNode = null;
        idleEngine.stateTimer = 0;
        idleEngine.searchTimer = 0;
        idleEngine.world = world;
        idleEngine.mobManager = mobManager;
        idleEngine.worldPickups = worldPickups;
        idleEngine.gatherNodes = [];
        idleEngine.generateGatherNodes();
        clearPendingChains(); // Cancel any in-flight chat chains from previous zone

        // 7. Update vignette overlay for zone colors
        updateVignetteForZone(zoneId);

        // 8. Respawn fake players for new zone
        await fakePlayerManager.spawnFakePlayers(zoneId, world);

        // 9. Refresh party member levels/gear for new zone
        partySystem.refreshAllMembers();

        // 9b. Re-sync party member 3D entities for new zone
        partyMemberManager.onZoneChange();

        // 9c. Re-sync companion entity position for new zone
        companionEntity.onZoneChange(player.group);

        // 10. Save immediately after zone change
        saveManager.forceSave();

        // Hide loading screen after work is done
        loadingScreen.setProgress(100, "Arrival Complete");
        await waitForPaint();
        
        setTimeout(() => {
            loadingScreen.hide();
            gameState.isLoading = false;
        }, 400);
    };

// ---- Load Save (before game loop) ----
// Re-enable saving now that game state is properly initialized
// (clearSave may have blocked it during new-game reset)
saveManager.enableSaving();

const hadSave = !isNewGame && saveManager.load();
if (!hadSave) {
    // No save found or new game — reset inventory with class-appropriate starter gear
    inventory.reset(gameState.classId);
    partySystem.reset();

    // Start the first quest chain
    questLog.initDefaultQuest();
    
    // Verify gameState has the character info before saving
    console.log(`💾 New character: "${gameState.playerName}" (${gameState.classId})`);
    
    // Immediately save the new character so it persists on the select screen
    saveManager.forceSave();
} else {
    // Sync CONFIG.PLAYER_NAME with the authoritative loaded save data
    CONFIG.PLAYER_NAME = gameState.playerName;
    
    // If we loaded a save into a non-default zone, rebuild world for that zone
    if (gameState.currentZoneId !== 'verdant_wilds') {
        await world.rebuildForZone(gameState.currentZoneId);
        player.world = world;
        mobManager.despawnAll();
        mobManager.world = world;
        mobManager.resetForZone();
        worldPickups.resetForZone(gameState.currentZoneId, world);
        idleEngine.world = world;
        idleEngine.mobManager = mobManager;
        idleEngine.worldPickups = worldPickups;
        idleEngine.gatherNodes = [];
        idleEngine.generateGatherNodes();
        updateVignetteForZone(gameState.currentZoneId);
        // Re-spawn fake players for the correct zone (initial spawn used default zone)
        await fakePlayerManager.spawnFakePlayers(gameState.currentZoneId, world);
    } else if (gameState.endgameComplete) {
        // Verdant Wilds with endgame active: mobs were spawned before save loaded
        // (with pre-endgame stats). Respawn them now with level 60 endgame scaling.
        mobManager.despawnAll();
        mobManager.resetForZone();
    }
    // Sync UI tracking state to loaded save — prevents "LEVEL UP", "BOSS DEFEATED",
    // quest complete, and zone unlock popups from replaying on reload
    ui.syncToCurrentState();

    // Eagerly render party frames so they appear on the first paint (not delayed until game loop)
    ui.updatePartyButton();
    ui.updatePartyFrames();

    // Update camera toggle button text if it exists
    const camBtn = document.getElementById('camera-toggle-btn');
    if (camBtn) {
        camBtn.innerHTML = gameState.cameraMode === 'locked' ? '🔒 Camera: Locked' : '🔓 Camera: Dynamic';
    }
}

loadingScreen.setProgress(100, "Entering World...");
setTimeout(() => {
    loadingScreen.hide();
    gameState.isLoading = false;
}, 500);

// ---- Unstuck Helper (called by UI button) ----
window._unstuckPlayer = () => {
    const pos = world.getRandomOpenPosition(2, 10);
    player.position.set(pos.x, 0, pos.z);
    player.group.position.set(pos.x, 0, pos.z);
    player.clearTarget();
    player._detourTarget = null;
    player._stuckTimer = 0;
    idleEngine.state = 'idle';
    idleEngine.currentTarget = null;
    idleEngine.gatherNode = null;
    idleEngine.pickupTarget = null;
    idleEngine.stateTimer = 0;
    idleEngine.searchTimer = 0;
    gameState.inCombat = false;
    gameState.isMovingToTarget = false;
    gameState.isGathering = false;
    gameState.currentTarget = null;
    gameState.addGameLog('Used Unstuck — teleported to a clear area.');
};

// ---- Low-Res Mode Helper (called by UI settings) ----
window._idleRealmsRenderer = renderer;
window._applyLowResMode = (enabled) => {
    gameState.lowResMode = enabled;
    
    // Performance optimization: 
    // - Low Res: 0.5x resolution for maximum performance.
    // - HD Mode: Cap at 1.5x resolution. 2.0x is 4x the pixels and cripples most mobile/integrated GPUs.
    //   1.5x is sharp even on Retina screens but uses ~45% less GPU than 2.0x.
    const pixelRatio = enabled ? 0.5 : Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Global shadow map toggle
    renderer.shadowMap.enabled = !enabled;
    
    // If enabling HD for the first time, ensure lights and meshes are ready for shadows
    if (!enabled && !window._shadowsReady) {
        window._shadowsReady = true;
        scene.traverse(node => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        // Ensure world lights are ready
        if (world && world.dirLight) world.dirLight.castShadow = true;
    }
};
// Apply initial low-res mode from save
if (gameState.lowResMode) {
    renderer.setPixelRatio(0.5);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Mark game as initialized so the global beforeunload handler can fire saves
window._gameInitialized = true;

// ---- Camera Mode Toggle Helper ----
window._toggleCameraMode = () => {
    gameState.cameraMode = gameState.cameraMode === 'locked' ? 'dynamic' : 'locked';
    const btn = document.getElementById('camera-toggle-btn');
    if (btn) {
        btn.innerHTML = gameState.cameraMode === 'locked' ? '🔒 Camera: Locked' : '🔓 Camera: Dynamic';
        btn.title = gameState.cameraMode === 'locked' ? 'Camera follows player rotation' : 'Camera is free-look';
    }
    gameState.addGameLog(`Camera set to ${gameState.cameraMode} mode.`);
};

// Also save on visibility change (mobile tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveManager.forceSave();
});

// ---- Camera Controller (MMO orbit + zoom) ----
const camState = {
    yaw: Math.PI,          // horizontal orbit angle (start behind player)
    pitch: 0.45,           // vertical angle (radians from horizontal)
    distance: CONFIG.CAMERA_DISTANCE,
    targetDistance: CONFIG.CAMERA_DISTANCE,
    minDistance: 3,
    maxDistance: 25,
    minPitch: 0.1,         // don't go below ground
    maxPitch: 1.3,         // don't go fully overhead
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    sensitivity: 0.005,
    zoomSpeed: 1.2,
    lookHeight: 1.2,       // height offset we look at on the player
    shake: 0,
};
let cameraShake = 0; // alias kept for combat effect compatibility

// Pre-allocated vectors for camera (avoid GC pressure from creating new Vector3 every frame)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _combatTargetPos = new THREE.Vector3();
const _worldToScreenVec = new THREE.Vector3();

// Mouse / pointer events on the renderer canvas
renderer.domElement.addEventListener('mousedown', (e) => {
    // Only orbit on left or right click
    if (e.button === 0 || e.button === 2) {
        camState.isDragging = true;
        camState.lastMouseX = e.clientX;
        camState.lastMouseY = e.clientY;

        // If we were in locked mode, dragging switches to dynamic mode
        if (gameState.cameraMode === 'locked') {
            window._toggleCameraMode();
        }
    }
});

window.addEventListener('mouseup', () => {
    camState.isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (!camState.isDragging) return;
    const dx = e.clientX - camState.lastMouseX;
    const dy = e.clientY - camState.lastMouseY;
    camState.lastMouseX = e.clientX;
    camState.lastMouseY = e.clientY;

    camState.yaw -= dx * camState.sensitivity;
    camState.pitch += dy * camState.sensitivity;
    camState.pitch = Math.max(camState.minPitch, Math.min(camState.maxPitch, camState.pitch));
});

// Scroll to zoom
renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDir = e.deltaY > 0 ? 1 : -1;
    camState.targetDistance += zoomDir * camState.zoomSpeed;
    camState.targetDistance = Math.max(camState.minDistance, Math.min(camState.maxDistance, camState.targetDistance));
}, { passive: false });

// Prevent context menu on right-click so orbit feels smooth
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// Touch support for mobile drag & pinch-zoom
let touchStartDist = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        camState.isDragging = true;
        camState.lastMouseX = e.touches[0].clientX;
        camState.lastMouseY = e.touches[0].clientY;

        // If we were in locked mode, dragging switches to dynamic mode
        if (gameState.cameraMode === 'locked') {
            window._toggleCameraMode();
        }
    } else if (e.touches.length === 2) {
        camState.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && camState.isDragging) {
        const dx = e.touches[0].clientX - camState.lastMouseX;
        const dy = e.touches[0].clientY - camState.lastMouseY;
        camState.lastMouseX = e.touches[0].clientX;
        camState.lastMouseY = e.touches[0].clientY;
        camState.yaw -= dx * camState.sensitivity * 1.5;
        camState.pitch += dy * camState.sensitivity * 1.5;
        camState.pitch = Math.max(camState.minPitch, Math.min(camState.maxPitch, camState.pitch));
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (touchStartDist > 0) {
            const delta = touchStartDist - dist;
            camState.targetDistance += delta * 0.03;
            camState.targetDistance = Math.max(camState.minDistance, Math.min(camState.maxDistance, camState.targetDistance));
        }
        touchStartDist = dist;
    }
}, { passive: true });

renderer.domElement.addEventListener('touchend', () => {
    camState.isDragging = false;
    touchStartDist = 0;
});

function updateCamera(dt, time) {
    const playerPos = player.getPosition();

    // In Locked mode, camera yaw follows the player rotation
    if (gameState.cameraMode === 'locked') {
        const targetYaw = player.rotation + Math.PI;
        let diff = targetYaw - camState.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        camState.yaw += diff * Math.min(1, dt * 4); // Smoothly follow
    }

    // Smooth zoom interpolation
    camState.distance += (camState.targetDistance - camState.distance) * Math.min(1, dt * 8);

    // Spherical coords → offset
    const cosP = Math.cos(camState.pitch);
    const sinP = Math.sin(camState.pitch);
    const offsetX = Math.sin(camState.yaw) * cosP * camState.distance;
    const offsetY = sinP * camState.distance;
    const offsetZ = Math.cos(camState.yaw) * cosP * camState.distance;

    _camTargetPos.set(
        playerPos.x + offsetX,
        playerPos.y + offsetY,
        playerPos.z + offsetZ
    );

    // Camera shake on hits (use cheap deterministic shake instead of Math.random per frame)
    if (cameraShake > 0) {
        cameraShake -= dt * 5;
        const shakeT = time * 37.7; // fast oscillation
        _camTargetPos.x += Math.sin(shakeT) * cameraShake * 0.1;
        _camTargetPos.y += Math.cos(shakeT * 1.3) * cameraShake * 0.05;
    }

    camera.position.lerp(_camTargetPos, Math.min(1, dt * 6));

    _camLookTarget.set(
        playerPos.x,
        playerPos.y + camState.lookHeight,
        playerPos.z
    );
    camera.lookAt(_camLookTarget);
    if (!camera.userData.target) camera.userData.target = new THREE.Vector3();
    camera.userData.target.copy(_camLookTarget);
}

// ---- Combat Effect Triggers ----
let lastAttackState = false;
let lastPlayerLevel = 1;
// Track which skill cooldowns were previously zero (to detect just-activated skills)
const _prevSkillCDs = new Float32Array(8);
// Track talent ability cooldowns for edge-detection (4 talent slots)
const _prevTalentCDs = new Float32Array(4);

function checkCombatEvents() {
    // Trigger slash effects when player attacks
    if (player.isAttacking && !lastAttackState) {
        if (gameState.currentTarget && gameState.currentTarget.alive) {
            _combatTargetPos.set(
                gameState.currentTarget.x,
                0,
                gameState.currentTarget.z
            );
            // Use Aether Strike VFX for auto-attacks (skill 0 = basic attack)
            combatEffects.spawnSkillEffect(_combatTargetPos, 0);
            cameraShake = 0.5;
            
            // Show damage number on screen
            const damage = gameState.getDPS();
            const isCrit = Math.random() < gameState.getEffectiveCritChance();
            const critMult = gameState.getEffectiveCritDamage();
            const finalDmg = isCrit ? Math.floor(damage * critMult) : damage;
            const screenPos = worldToScreen(_combatTargetPos);
            if (screenPos) {
                ui.showDamageNumber(screenPos.x, screenPos.y, finalDmg, isCrit);
            }

            // Audio: basic hit or crit sound
            if (isCrit) {
                gameState.totalCrits = (gameState.totalCrits || 0) + 1;
                audioManager.playCrit();
                combatEffects.spawnCritEffect(_combatTargetPos);
                cameraShake = 1.2; // Bigger screen shake on crit
            } else {
                audioManager.playHit();
            }
        }
    }
    lastAttackState = player.isAttacking;
    
    // ── Skill effects — detect activation by CD going from 0 to > 0 ──
    if (gameState._anyCooldownActive) {
        for (let i = 0; i < CONFIG.SKILLS.length; i++) {
            const cd = gameState.skillCooldowns[i];
            const prevCD = _prevSkillCDs[i];
            // Skill just activated: CD was ≤ 0 last frame, now > 0
            if (cd > 0 && prevCD <= 0) {
                // Get target position for directional effects
                let targetWorldPos = null;
                if (gameState.currentTarget && gameState.currentTarget.alive) {
                    _combatTargetPos.set(
                        gameState.currentTarget.x, 0,
                        gameState.currentTarget.z
                    );
                    targetWorldPos = _combatTargetPos;
                }
                combatEffects.spawnSkillEffect(player.getPosition(), i, targetWorldPos, gameState.classId);
                audioManager.playSkill(i, gameState.classId);
                
                // Scale camera shake by skill power tier
                const skill = CONFIG.SKILLS[i];
                if (skill.dpsMultiplier >= 4.0) cameraShake = 2.5;       // Cataclysm
                else if (skill.dpsMultiplier >= 2.5) cameraShake = 1.5;  // Big hitters
                else if (skill.dpsMultiplier >= 1.5) cameraShake = 1.0;  // Medium
                else if (skill.buffType) cameraShake = 0.6;              // Buffs
                else cameraShake = 0.7;                                   // Aether Strike
            }
            _prevSkillCDs[i] = cd;
        }
    } else {
        // No cooldowns active — reset tracking
        for (let i = 0; i < _prevSkillCDs.length; i++) _prevSkillCDs[i] = 0;
    }
    
    // ── Talent ability effects — detect activation by CD going from 0 to > 0 ──
    if (talentTree._anyTalentCDActive) {
        const talentAbilities = talentTree.getUnlockedTalentAbilities();
        for (let i = 0; i < 4; i++) {
            const cd = talentTree.talentAbilityCooldowns[i];
            const prevCD = _prevTalentCDs[i];
            if (cd > 0 && prevCD <= 0) {
                const abil = talentAbilities[i];
                if (abil) {
                    // Map talent ability iconKey to a suitable skill VFX index
                    const vfxMap = {
                        stormcleave: 0, // Aether Strike VFX (lightning bolt look)
                        whirlwind: 1,   // Whirlwind Slash VFX (tempest)
                        shield: 2,      // Aegis Guard VFX (shield wall)
                        warcry: 3,      // War Cry VFX (rallying cry)
                        voidRift: 6,    // Void Rift VFX (void lance)
                        cataclysm: 7,   // Cataclysm VFX (oblivion nova)
                        voidedge: 6,    // Void Rift VFX (ether siphon)
                        ironward: 2,    // Aegis Guard VFX (iron skin)
                        trueshot: 0,
                        piercingArrow: 6,
                        clusterTrap: 1,
                        barrage: 7,
                        wolfPack: 0,
                        mendingVines: 2,
                        poisonCloud: 7,
                        avatarOfNature: 3,
                        // ── Dawnkeeper (Cleric) talent abilities ──
                        divineLance: 5,      // Solar Lance VFX (piercing beam)
                        sunfireBurst: 4,      // Radiant Flare VFX (sunburst AoE)
                        judgmentHammer: 1,    // Holy Smite VFX (divine impact)
                        dawnAvatar: 3,        // Benediction VFX (blessing buff)
                        blessedShield: 2,     // Divine Ward VFX (holy shield)
                        holyBulwark: 2,       // Divine Ward VFX (divine barrier)
                        prayerOfHealing: 3,   // Benediction VFX (healing prayer)
                        divineAegis: 2        // Divine Ward VFX (ultimate protection)
                    };
                    
                    let vfxIdx = vfxMap[abil.iconKey] ?? 0;
                    
                    // Override for capstones
                    if (abil.id === 'stormlords_wrath') vfxIdx = 7;
                    if (abil.id === 'singularity') vfxIdx = 7;
                    if (abil.id === 'sentinels_resolve') vfxIdx = 3;
                    
                    let targetWorldPos = null;
                    if (gameState.currentTarget && gameState.currentTarget.alive) {
                        _combatTargetPos.set(
                            gameState.currentTarget.x, 0,
                            gameState.currentTarget.z
                        );
                        targetWorldPos = _combatTargetPos;
                    }
                    // Determine class for VFX routing — cleric talent abilities use cleric VFX
                    const talentClassId = (abil.tree === 'radiance' || abil.tree === 'bastion') ? 'cleric' : gameState.classId;
                    combatEffects.spawnSkillEffect(player.getPosition(), vfxIdx, targetWorldPos, talentClassId);
                    audioManager.playSkill(vfxIdx, talentClassId);
                    
                    // Camera shake scaled by ability power
                    if (abil.dpsMultiplier >= 4.0) cameraShake = 2.5;
                    else if (abil.dpsMultiplier >= 2.0) cameraShake = 1.5;
                    else if (abil.buffType) cameraShake = 0.8;
                    else cameraShake = 1.0;
                }
            }
            _prevTalentCDs[i] = cd;
        }
    } else {
        for (let i = 0; i < _prevTalentCDs.length; i++) _prevTalentCDs[i] = 0;
    }

    // Level up effect
    if (gameState.level > lastPlayerLevel) {
        combatEffects.spawnLevelUpEffect(player.getPosition());
        audioManager.playLevelUp();
        lastPlayerLevel = gameState.level;
    }
}

// Pre-allocated screen projection result to avoid object creation per-call
const _screenResult = { x: 0, y: 0 };

function worldToScreen(worldPos) {
    _worldToScreenVec.set(worldPos.x, worldPos.y + 1.5, worldPos.z);
    _worldToScreenVec.project(camera);
    
    if (_worldToScreenVec.z > 1) return null;
    
    _screenResult.x = (_worldToScreenVec.x * 0.5 + 0.5) * window.innerWidth;
    _screenResult.y = (-_worldToScreenVec.y * 0.5 + 0.5) * window.innerHeight;
    return _screenResult;
}

// ---- Post Processing - Zone-aware Vignette Overlay ----
var vignetteOverlay = null;
function createVignetteOverlay() {
    vignetteOverlay = document.createElement('div');
    vignetteOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 50; transition: background 1.5s ease;
    `;
    document.body.appendChild(vignetteOverlay);
    updateVignetteForZone(gameState.currentZoneId);
}
function updateVignetteForZone(zoneId) {
    if (!vignetteOverlay) return;
    const zone = CONFIG.getZone(zoneId);
    // Extract a dark tint from the zone's scene background color
    let r = 0, g = 0, b = 0;
    if (zone.id === 'shattered_expanse') { r = 0; g = 3; b = 10; }
    else if (zone.id === 'molten_abyss') { r = 12; g = 3; b = 0; }
    else if (zone.id === 'abyssal_depths') { r = 0; g = 6; b = 12; }
    else if (zone.id === 'neon_wastes') { r = 8; g = 2; b = 12; }
    else if (zone.id === 'halo_ring') { r = 2; g = 8; b = 5; }
    else if (zone.id === 'crimson_reach') { r = 12; g = 4; b = 2; }
    else { r = 0; g = 5; b = 0; }
    vignetteOverlay.style.background = `radial-gradient(ellipse at center, 
        transparent 0%, 
        transparent 50%, 
        rgba(${r},${g},${b},0.3) 75%, 
        rgba(${r},${g},${b},0.6) 100%
    )`;
}
createVignetteOverlay();

// ---- Resize ----
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(gameState.lowResMode ? 0.5 : Math.min(window.devicePixelRatio, 2.0));
    renderer.setSize(w, h);
});

// ---- Game Loop ----
const clock = new THREE.Clock();
let lastUiUpdate = 0;
let logicTimer = 0;
const LOGIC_TICK = 1 / 15; // 15Hz logic updates (AI, targeting)

// Performance: cap raw frame delta to prevent massive spikes from tab-away / hitches
// Game speed multiplier is applied on top — all systems see the accelerated time.
// The key insight: we cap rawDt (real wall-clock frame time) to prevent single
// 500ms+ frames from causing huge logic spikes, but gameSpeed scaling is allowed
// to work fully so the slider feels responsive.
const MAX_RAW_DT = 0.05; // 50ms max real-time per frame (prevents tab-away spikes)

function animate() {
    requestAnimationFrame(animate);
    
    const rawDt = Math.min(clock.getDelta(), MAX_RAW_DT);
    const dt = rawDt * gameState.gameSpeed;
    const time = clock.getElapsedTime();
    
    // Skip updates during zone transitions to prevent logic "hiccups"
    if (gameState.isLoading) {
        renderer.render(scene, camera);
        return;
    }

    try {
    
    // 1. UPDATE ANIMATIONS & PHYSICS (60fps, capped dt for smooth visuals)
    // ─────────────────────────────────────────────────────────────────
    
    // Game state timers/regen use full game-speed-scaled dt
    gameState.update(dt);

    // ══════════════════════════════════════════════════════════════════
    // UNIFIED UPDATE — Player, camera, party, companion run in ALL modes.
    // Dungeons are just a different environment; same character systems.
    // ══════════════════════════════════════════════════════════════════

    // Visual/animation updates use capped dt for smooth 60fps rendering
    player.update(dt, time);
    const _inInstance = _inDungeonMode || _inBGMode || _inRaidMode;
    if (!_inInstance) {
        world.update(time, dt);
        worldPickups.update(dt, time);
    }
    combatEffects.update(dt);
    
    const playerPos = player.getPosition();

    if (!_inInstance) {
        mobManager.update(dt, time, playerPos, questLog);
    }

    // Always sync party members
    partyMemberManager.syncMembers();

    // Only update NPC visuals every other frame at high speeds to save CPU
    const skipNpcVisuals = gameState.gameSpeed > 5 && (animate._frameCount & 1);
    if (!skipNpcVisuals) {
        if (!_inInstance) {
            fakePlayerManager.update(dt, time, world, mobManager);
        }
        if (!_inBGMode) {
            const inInst = _inDungeonMode || _inRaidMode;
            // In dungeons/raids, we pass null for world/mobs to the visual update 
            // because they are handled by the scene renderers, but the party still needs to move.
            partyMemberManager.update(dt, time, inInst ? null : world, inInst ? null : mobManager);
        }
    }

    // Companion pet update (every frame for smooth independent movement)
    if (companionSystem.isUnlocked() && !_inBGMode && !_inRaidMode) {
        companionEntity.update(dt, time, player.group, camera, world);
    }

    // Dungeon scene visual updates (mob animations, VFX, particles)
    if (_inDungeonMode) {
        dungeonScene.update(dt, time);

        // ── Dungeon auto-navigation: walk player between encounter rooms ──
        // Works just like overworld idle engine: walk to target, face mob, attack
        const walkTarget = dungeonScene.getPlayerWalkTarget();
        if (walkTarget) {
            const dx = walkTarget.x - player.position.x;
            const dz = walkTarget.z - player.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            const hasCombat = dungeonScene.hasCombatTarget();
            const mobPos = dungeonScene.getNearestMobPos(player.position.x, player.position.z);

            if (hasCombat && mobPos && dist < 4.0) {
                // In combat range — face the nearest mob and attack
                // Don't walk into the mob; just face it and swing
                const mdx = mobPos.x - player.position.x;
                const mdz = mobPos.z - player.position.z;
                const mobDist = Math.sqrt(mdx * mdx + mdz * mdz);

                if (mobDist > 2.5) {
                    // Walk closer to mob (but not on top of it)
                    const nx = mdx / mobDist;
                    const nz = mdz / mobDist;
                    player.moveTo(
                        mobPos.x - nx * 2.0,
                        mobPos.z - nz * 2.0
                    );
                } else {
                    // Close enough — stop walking, face mob, attack
                    player.clearTarget();
                    player.targetRotation = Math.atan2(mdx, mdz);
                    player.startAttack();
                }
            } else if (dist > 0.5) {
                // Walk toward the encounter room / next room
                player.moveTo(walkTarget.x, walkTarget.z);
                // Stop attacking when walking between encounters
                if (player.isAttacking && !hasCombat) {
                    player.isAttacking = false;
                }
            } else {
                // Arrived at walk target, no combat — idle
                player.clearTarget();
                if (!hasCombat) {
                    player.isAttacking = false;
                }
            }
        } else {
            // No walk target (dungeon complete/failed) — stop
            player.clearTarget();
            player.isAttacking = false;
        }
    }

    // Battleground scene visual updates (NPC positions, flag animations)
    // Player walks around the arena as a participant
    if (_inBGMode) {
        bgScene.update(dt, time, player);

        const bgWalk = bgScene.getPlayerWalkTarget();
        if (bgWalk) {
            const bdx = bgWalk.x - player.position.x;
            const bdz = bgWalk.z - player.position.z;
            const bDist = Math.sqrt(bdx * bdx + bdz * bdz);
            if (bDist > 2.0) {
                player.moveTo(bgWalk.x, bgWalk.z);
                player.isAttacking = false;
            } else {
                // Close to target — face nearest action and play attack anim
                player.clearTarget();
                // Look toward nearest NPC action
                const inst = battlegroundSystem.instance;
                if (inst && inst.state === 'active') {
                    let nearestDist = Infinity;
                    let nearX = 0, nearZ = 0;
                    for (const c of inst.allCombatants) {
                        if (!c.alive) continue;
                        const cx = c.x - player.position.x;
                        const cz = c.z - player.position.z;
                        const cd = cx * cx + cz * cz;
                        if (cd < nearestDist) {
                            nearestDist = cd;
                            nearX = c.x;
                            nearZ = c.z;
                        }
                    }
                    if (nearestDist < 100) {
                        player.targetRotation = Math.atan2(nearX - player.position.x, nearZ - player.position.z);
                        player.startAttack();
                    }
                }
            }
        }
    }

    // Raid scene visual updates (mob animations, VFX, particles)
    // Player walks through encounter rooms same as dungeon
    if (_inRaidMode) {
        raidScene.update(dt, time);

        // ── Raid auto-navigation: walk player between encounter rooms ──
        const raidWalk = raidScene.getPlayerWalkTarget();
        if (raidWalk) {
            const rdx = raidWalk.x - player.position.x;
            const rdz = raidWalk.z - player.position.z;
            const rDist = Math.sqrt(rdx * rdx + rdz * rdz);

            const raidHasCombat = raidScene.hasCombatTarget();
            const raidMobPos = raidScene.getNearestMobPos(player.position.x, player.position.z);

            if (raidHasCombat && raidMobPos && rDist < 5.0) {
                // In combat range — face nearest mob and attack
                const rmdx = raidMobPos.x - player.position.x;
                const rmdz = raidMobPos.z - player.position.z;
                const rMobDist = Math.sqrt(rmdx * rmdx + rmdz * rmdz);

                if (rMobDist > 3.0) {
                    // Walk closer to mob (wider spacing for 10-man encounters)
                    const rnx = rmdx / rMobDist;
                    const rnz = rmdz / rMobDist;
                    player.moveTo(
                        raidMobPos.x - rnx * 2.5,
                        raidMobPos.z - rnz * 2.5
                    );
                } else {
                    // Close enough — stop walking, face mob, attack
                    player.clearTarget();
                    player.targetRotation = Math.atan2(rmdx, rmdz);
                    player.startAttack();
                }
            } else if (rDist > 0.5) {
                // Walk toward the encounter room / next room
                player.moveTo(raidWalk.x, raidWalk.z);
                if (player.isAttacking && !raidHasCombat) {
                    player.isAttacking = false;
                }
            } else {
                // Arrived at walk target, no combat — idle
                player.clearTarget();
                if (!raidHasCombat) {
                    player.isAttacking = false;
                }
            }
        } else {
            // No walk target (raid complete/failed) — stop
            player.clearTarget();
            player.isAttacking = false;
        }
    }

    // ── Inter-character collision separation ──
    resolveCharacterOverlaps(player, partyMemberManager, _inInstance ? null : fakePlayerManager, playerPos);
    
    // ── Camera — ALWAYS uses the same orbit camera system ──
    updateCamera(dt, time);
    
    // Update directional light position
    if (!_inInstance && world.dirLight) {
        world.dirLight.position.set(playerPos.x + 15, 30, playerPos.z + 10);
        world.dirLight.target.position.set(playerPos.x, 0, playerPos.z);
        world.dirLight.target.updateMatrixWorld();
    }

    // 2. UPDATE HEAVY LOGIC (Throttled to LOGIC_TICK)
    // ─────────────────────────────────────────────────────────────────
    logicTimer += rawDt;
    if (logicTimer >= LOGIC_TICK) {
        const logicDt = logicTimer * gameState.gameSpeed;
        logicTimer = 0;

        if (!_inDungeonMode && !_inBGMode && !_inRaidMode) {
            idleEngine.update(logicDt, time);
            mobManager.updateAI(playerPos);
            fakePlayerManager.updateAI(world, mobManager);
            worldPickups.checkCollection(playerPos.x, playerPos.z, gameState.inCombat);
        }

        if (!_inBGMode) {
            let activeMobManager = mobManager;
            if (_inDungeonMode) {
                const prog = dungeonSystem.getProgress();
                if (prog && prog.mobs) activeMobManager = { mobs: prog.mobs };
            } else if (_inRaidMode) {
                const prog = raidSystem.getProgress();
                if (prog && prog.mobs) activeMobManager = { mobs: prog.mobs };
            }
            partyMemberManager.updateAI(activeMobManager);
            if (companionSystem.isUnlocked() && !_inRaidMode) {
                companionEntity.updateAI(activeMobManager);
            }
        }
        
        if (!_inBGMode && !_inRaidMode) checkCombatEvents();
        
        goldShop.update(logicDt);
        aetherbitShop.update(logicDt);
        partySystem.update(logicDt);
        soulForge.update(logicDt);
        dungeonSystem.update(logicDt);
        battlegroundSystem.update(logicDt);
        raidSystem.update(logicDt);
        saveManager.update(logicDt);
    }
    
    // 3. UPDATE UI (Throttled — slower at high game speeds to save CPU)
    // ─────────────────────────────────────────────────────────────────
    const uiInterval = gameState.gameSpeed > 5 ? 0.2 : 0.1;
    lastUiUpdate += rawDt;
    if (lastUiUpdate > uiInterval) {
        lastUiUpdate = 0;
        if (!animate._achieveTimer) animate._achieveTimer = 0;
        animate._achieveTimer += uiInterval;
        if (animate._achieveTimer >= 1.0) {
            animate._achieveTimer = 0;
            achievementManager.checkAll();
        }
        ui.update(playerPos, mobManager.mobs, worldPickups);
        updateFakeSocialSim(rawDt);
    }

    } catch (e) {
        if (!animate._errLogged) { console.error('⚠ Game loop error (suppressed future repeats):', e); animate._errLogged = true; }
    }
    animate._frameCount = (animate._frameCount || 0) + 1;
    
    // Render always, even if logic errored, so the screen doesn't go black
    renderer.render(scene, camera);
}

// ── Fake Social Sim — Living MMO feel ──
let socialTimer = 0;
// Social sim now powered by procedural BarrensChat generator (unique messages every time)
function updateFakeSocialSim(dt) {
    socialTimer += dt;
    if (socialTimer > 15 + Math.random() * 20) { // Every 15-35 seconds
        socialTimer = 0;
        const msg = generateBarrensMsg();
        gameState.addChatMessage(msg.channel, msg.user, msg.msg);
    }
}

// Start
animate();

const zoneName = gameState.getCurrentZone().name;
console.log('🌲 Evergrind Idle — MMORPG Simulator loaded!');
console.log(`💾 Autosave every 30s. ${hadSave ? 'Progress restored!' : 'Fresh adventure started.'}`);
console.log(`📍 Current zone: ${zoneName}`);

} // end initGame()
