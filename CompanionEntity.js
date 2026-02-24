// CompanionEntity.js — 3D Companion Pet with Independent AI
//
// REWORKED: Companion now operates independently from the player.
// It roams, patrols, seeks enemies, and fights with varied attack
// patterns. A floating health bar makes it easy to locate on the field.
//
// AI States:
//   IDLE:        Wanders near player in a loose radius, sniffing around
//   PATROL:      Picks a random point within leash range, trots to it
//   STALK:       Spotted an enemy, crouches/slows approach
//   LUNGE:       Burst-speed charge attack into melee range
//   FLURRY:      Multi-hit melee combo (2-3 rapid strikes)
//   STRAFE:      Circle-strafe around target between attacks
//   DISENGAGE:   Quick hop backwards to create gap, then re-engage
//   RETURN:      Heading back toward player (leash range exceeded)
//   CELEBRATE:   Tiny hop/spin after a kill
//   DEAD:        Faded out, respawning after timer

import * as THREE from 'three';
import { companionSystem } from './CompanionSystem.js';
import { gameState } from './GameState.js';

// Companion collision radius
const COMPANION_COLLISION_RADIUS = 0.50; // Doubled for visibility and size parity

// ── Roaming & Patrol ──
const ROAM_RADIUS = 8.0;           // How far the companion roams from player
const LEASH_RADIUS = 18.0;         // Soft leash — starts returning
const HARD_LEASH_RADIUS = 30.0;    // Teleport back
const PATROL_SPEED = 3.0;          // Trot speed while patrolling
const PATROL_PAUSE_MIN = 1.5;      // Min pause at patrol point
const PATROL_PAUSE_MAX = 3.5;      // Max pause at patrol point
const IDLE_WANDER_RADIUS = 3.0;    // Small wander radius during idle
const IDLE_WANDER_SPEED = 1.5;     // Slow idle wander speed

// ── Combat Constants ──
const DETECT_RANGE = 12.0;         // Enemy detection range
const DETECT_RANGE_SQ = DETECT_RANGE * DETECT_RANGE;
const STALK_SPEED = 2.5;           // Slow creep toward enemy
const STALK_RANGE = 5.0;           // Enter lunge when within this
const LUNGE_SPEED = 16.0;          // Burst charge speed
const LUNGE_RANGE = 1.8;           // Strike distance
const FLURRY_HITS = 3;             // Hits per flurry combo
const FLURRY_INTERVAL = 0.3;       // Seconds between flurry hits
const STRAFE_SPEED = 5.0;          // Circle-strafe speed
const STRAFE_RADIUS = 3.0;         // Strafe orbit radius
const STRAFE_DURATION_MIN = 1.0;
const STRAFE_DURATION_MAX = 2.5;
const DISENGAGE_SPEED = 8.0;       // Backwards hop speed
const DISENGAGE_DIST = 4.0;        // How far to hop back
const ATTACK_COOLDOWN = 2.0;       // Global attack CD between patterns
const MAX_CHASE_TIME = 4.0;        // Max chase before giving up
const RETURN_SPEED = 6.0;          // Speed returning to player
const CELEBRATE_DURATION = 0.6;

// ── Movement ──
const TURN_RATE = 8.0;
const BOB_AMP = 0.08;
const BOB_SPEED = 3.0;
const DEATH_FADE_DURATION = 1.2;
const RESPAWN_FADE_DURATION = 0.8;

// ── Health bar ──
const HP_BAR_WIDTH = 1.2;
const HP_BAR_HEIGHT = 0.12;
const HP_BAR_Y_OFFSET = 3.2;       // Height above companion (doubled for 2x scale)

// Pre-allocated scratch vectors
const _cDir = new THREE.Vector3();
const _cTarget = new THREE.Vector3();

// ══════════════════════════════════════════════════════════════════
// COMPANION ENTITY
// ══════════════════════════════════════════════════════════════════

export class CompanionEntity {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.parts = {};
        this.collisionRadius = COMPANION_COLLISION_RADIUS;

        // AI state
        this.state = 'idle';
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.combatTarget = null;
        this.time = 0;
        this.bobOffset = Math.random() * Math.PI * 2;

        // Track which mob type is currently built
        this._builtMobName = null;
        this._builtMobType = null;

        // Patrol / roam state
        this._patrolTarget = new THREE.Vector3();
        this._patrolPause = 0;
        this._idleWanderTarget = new THREE.Vector3();
        this._idleTimer = 0;

        // Combat state
        this._chaseTimer = 0;
        this._flurryCount = 0;
        this._flurryTimer = 0;
        this._strafeAngle = 0;
        this._strafeDir = 1;
        this._disengageDir = new THREE.Vector3();
        this._disengageTraveled = 0;
        this._attackPattern = 'lunge'; // lunge | flurry | strafe

        // Movement
        this._velocity = new THREE.Vector3();
        this._lastPlayerPos = new THREE.Vector3();
        this._initialized = false;

        // Death/respawn visual state
        this._deathFade = 0;
        this._respawnFade = 0;
        this._wasAlive = true;

        // World coords for mob targeting
        this.x = 0;
        this.z = 0;
        this.inCombat = false;
        this._combatTimer = 0;

        // Health bar (3D billboard sprite)
        this._hpBarGroup = new THREE.Group();
        this._hpBarBg = null;
        this._hpBarFill = null;
        this._hpBarBorder = null;
        this._nameSprite = null;
        this._buildHealthBar();
        this.group.add(this._hpBarGroup);

        this.scene.add(this.group);
        this.group.visible = false;
    }

    // ══════════════════════════════════════════════════════════════
    // HEALTH BAR — 3D floating bar above the companion
    // ══════════════════════════════════════════════════════════════

    _buildHealthBar() {
        const g = this._hpBarGroup;
        g.position.y = HP_BAR_Y_OFFSET;

        // Background bar (dark)
        const bgGeo = new THREE.PlaneGeometry(HP_BAR_WIDTH + 0.06, HP_BAR_HEIGHT + 0.06);
        const bgMat = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.7,
            depthTest: false, side: THREE.DoubleSide,
        });
        this._hpBarBorder = new THREE.Mesh(bgGeo, bgMat);
        this._hpBarBorder.renderOrder = 998;
        g.add(this._hpBarBorder);

        // Background bar (red/empty portion)
        const emptyGeo = new THREE.PlaneGeometry(HP_BAR_WIDTH, HP_BAR_HEIGHT);
        const emptyMat = new THREE.MeshBasicMaterial({
            color: 0x331111, transparent: true, opacity: 0.85,
            depthTest: false, side: THREE.DoubleSide,
        });
        this._hpBarBg = new THREE.Mesh(emptyGeo, emptyMat);
        this._hpBarBg.position.z = 0.001;
        this._hpBarBg.renderOrder = 999;
        g.add(this._hpBarBg);

        // Fill bar (green)
        const fillGeo = new THREE.PlaneGeometry(HP_BAR_WIDTH, HP_BAR_HEIGHT);
        const fillMat = new THREE.MeshBasicMaterial({
            color: 0x44dd77, transparent: true, opacity: 0.95,
            depthTest: false, side: THREE.DoubleSide,
        });
        this._hpBarFill = new THREE.Mesh(fillGeo, fillMat);
        this._hpBarFill.position.z = 0.002;
        this._hpBarFill.renderOrder = 1000;
        g.add(this._hpBarFill);

        // Name label sprite
        this._buildNameSprite(null);
    }

    _buildNameSprite(name) {
        if (this._nameSprite) {
            this._hpBarGroup.remove(this._nameSprite);
            if (this._nameSprite.material.map) this._nameSprite.material.map.dispose();
            this._nameSprite.material.dispose();
            this._nameSprite = null;
        }
        if (!name) return;

        const cv = document.createElement('canvas');
        cv.width = 256;
        cv.height = 40;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Text outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(`🐾 ${name}`, 128, 20);
        // Text fill — green for companion
        ctx.fillStyle = '#66ddaa';
        ctx.fillText(`🐾 ${name}`, 128, 20);

        const tx = new THREE.CanvasTexture(cv);
        tx.minFilter = THREE.LinearFilter;
        const spMat = new THREE.SpriteMaterial({
            map: tx, transparent: true, depthTest: false,
        });
        this._nameSprite = new THREE.Sprite(spMat);
        this._nameSprite.scale.set(1.6, 0.25, 1);
        this._nameSprite.position.y = HP_BAR_HEIGHT + 0.15;
        this._nameSprite.renderOrder = 1001;
        this._hpBarGroup.add(this._nameSprite);
    }

    _updateHealthBar(camera) {
        const hpFrac = companionSystem.getHpFraction();
        const alive = companionSystem.alive;

        // Update fill scale and position
        const clampedFrac = Math.max(0, Math.min(1, hpFrac));
        this._hpBarFill.scale.x = clampedFrac || 0.001;
        this._hpBarFill.position.x = -(HP_BAR_WIDTH * (1 - clampedFrac)) / 2;

        // Color: green → yellow → red
        const fillMat = this._hpBarFill.material;
        if (clampedFrac > 0.5) {
            fillMat.color.setHex(0x44dd77);
        } else if (clampedFrac > 0.25) {
            fillMat.color.setHex(0xddcc44);
        } else {
            fillMat.color.setHex(0xdd3333);
        }

        // Billboard — face camera
        if (camera) {
            this._hpBarGroup.quaternion.copy(camera.quaternion);
        }

        // Show/hide based on alive state
        this._hpBarGroup.visible = alive && this.group.visible;
    }

    // ══════════════════════════════════════════════════════════════
    // MODEL BUILDING — reuses Mob.js model patterns at small scale
    // ══════════════════════════════════════════════════════════════

    _rebuildModel(companionData) {
        if (!companionData) {
            this.group.visible = false;
            this._builtMobName = null;
            return;
        }
        if (this._builtMobName === companionData.name) return;

        // Clear old model (keep health bar group)
        const children = [...this.group.children];
        for (const child of children) {
            if (child === this._hpBarGroup) continue;
            this.group.remove(child);
            if (child.traverse) {
                child.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
            }
        }
        this.parts = {};

        this._buildCompanionModel(companionData);
        this.group.scale.setScalar(companionData.companionScale);

        // Rebuild name sprite for new companion
        this._buildNameSprite(companionData.name);
        // Adjust health bar Y based on scale
        this._hpBarGroup.position.y = HP_BAR_Y_OFFSET / companionData.companionScale;

        this.group.visible = true;
        this._builtMobName = companionData.name;
        this._builtMobType = companionData.type;
    }

    _buildCompanionModel(data) {
        const color = data.color;
        const type = data.type;

        const bodyMat = new THREE.MeshStandardMaterial({
            color, roughness: 0.6, metalness: 0.15,
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color).multiplyScalar(0.6), roughness: 0.7,
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
            emissive: color, emissiveIntensity: 1.2,
            transparent: true, opacity: 0.85,
        });
        const friendlyGlowMat = new THREE.MeshStandardMaterial({
            color: 0x66ffaa, emissive: 0x33dd77, emissiveIntensity: 1.5,
            transparent: true, opacity: 0.4,
        });

        const g = this.group;

        if (type === 'beast') {
            this._buildBeast(g, bodyMat, darkMat, glowMat);
        } else if (type === 'elemental') {
            this._buildElemental(g, bodyMat, darkMat, glowMat);
        } else if (type === 'plant') {
            this._buildPlant(g, bodyMat, darkMat, glowMat);
        } else if (type === 'dragon' || type === 'xenowyrm' || type === 'crimsonwyrm') {
            this._buildDrake(g, bodyMat, darkMat, glowMat);
        } else if (type === 'undead' || type === 'xenophantom') {
            this._buildWraith(g, bodyMat, darkMat, glowMat);
        } else if (type === 'serpent') {
            this._buildSerpent(g, bodyMat, darkMat, glowMat);
        } else if (type === 'insectoid' || type === 'xenoswarm' || type === 'hivedrone') {
            this._buildInsectoid(g, bodyMat, darkMat, glowMat);
        } else if (type === 'jellyfish') {
            this._buildJellyfish(g, bodyMat, darkMat, glowMat);
        } else if (type === 'demon' || type === 'forgeoverseer') {
            this._buildDemon(g, bodyMat, darkMat, glowMat);
        } else if (type === 'xenowalker' || type === 'haloelite' || type === 'halohunter') {
            this._buildBiped(g, bodyMat, darkMat, glowMat);
        } else if (type === 'xenotitan' || type === 'sandcolossus') {
            this._buildGolem(g, bodyMat, darkMat, glowMat);
        } else if (type === 'halogrunt' || type === 'spiresentinel') {
            this._buildBiped(g, bodyMat, darkMat, glowMat);
        } else if (type === 'halosentinel') {
            this._buildDrone(g, bodyMat, darkMat, glowMat);
        } else if (type === 'halowraith') {
            this._buildWraith(g, bodyMat, darkMat, glowMat);
        } else {
            this._buildBeast(g, bodyMat, darkMat, glowMat);
        }

        // Friendly halo ring
        const haloGeo = new THREE.RingGeometry(0.5, 0.65, 24);
        const halo = new THREE.Mesh(haloGeo, friendlyGlowMat);
        halo.rotation.x = -Math.PI / 2;
        halo.position.y = 0.02;
        this.parts.halo = halo;
        g.add(halo);
    }

    // ── Simplified mob model builders (cute companion versions) ──

    _buildBeast(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), bodyMat);
        body.scale.set(1.2, 0.8, 1.5); body.position.y = 0.5;
        this.parts.body = body; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bodyMat);
        head.position.set(0, 0.65, 0.5); this.parts.head = head; g.add(head);
        for (let s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), glowMat);
            eye.position.set(s * 0.12, 0.72, 0.65); g.add(eye);
        }
        for (let i = 0; i < 4; i++) {
            const x = (i < 2 ? -1 : 1) * 0.25;
            const z = (i % 2 === 0 ? 1 : -1) * 0.35;
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6), darkMat);
            leg.position.set(x, 0.18, z); g.add(leg);
        }
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.4, 5), bodyMat);
        tail.position.set(0, 0.55, -0.55); tail.rotation.x = -0.6;
        this.parts.tail = tail; g.add(tail);
    }

    _buildElemental(g, bodyMat, darkMat, glowMat) {
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 1), glowMat);
        core.position.y = 0.7; this.parts.body = core; g.add(core);
        for (let i = 0; i < 4; i++) {
            const frag = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), bodyMat);
            const angle = (i / 4) * Math.PI * 2;
            frag.position.set(Math.cos(angle) * 0.5, 0.6 + Math.sin(i) * 0.15, Math.sin(angle) * 0.5);
            g.add(frag);
        }
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), glowMat);
        glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow);
    }

    _buildPlant(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bodyMat);
        body.position.y = 0.45; body.scale.set(1, 1.2, 1);
        this.parts.body = body; g.add(body);
        for (let i = 0; i < 5; i++) {
            const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), darkMat);
            const angle = (i / 5) * Math.PI * 2;
            petal.position.set(Math.cos(angle) * 0.3, 0.75, Math.sin(angle) * 0.3);
            petal.scale.set(1.5, 0.5, 1); g.add(petal);
        }
        for (let i = 0; i < 3; i++) {
            const root = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.25, 4), darkMat);
            const angle = (i / 3) * Math.PI * 2;
            root.position.set(Math.cos(angle) * 0.15, 0.12, Math.sin(angle) * 0.15); g.add(root);
        }
    }

    _buildDrake(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bodyMat);
        body.scale.set(1.0, 0.7, 1.5); body.position.y = 0.55;
        this.parts.body = body; g.add(body);
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 6), bodyMat);
        head.rotation.x = -Math.PI / 2; head.position.set(0, 0.65, 0.55);
        this.parts.head = head; g.add(head);
        for (let s of [-1, 1]) {
            const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.35), darkMat);
            wing.position.set(s * 0.4, 0.7, -0.1);
            wing.rotation.set(0, s * 0.3, s * -0.4);
            wing.material = wing.material.clone(); wing.material.side = THREE.DoubleSide;
            g.add(wing);
        }
        for (let s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), glowMat);
            eye.position.set(s * 0.08, 0.7, 0.7); g.add(eye);
        }
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.02, 0.5, 5), bodyMat);
        tail.position.set(0, 0.45, -0.5); tail.rotation.x = 0.5;
        this.parts.tail = tail; g.add(tail);
    }

    _buildWraith(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), bodyMat);
        body.position.y = 0.6; body.material = body.material.clone();
        body.material.transparent = true; body.material.opacity = 0.7;
        this.parts.body = body; g.add(body);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), glowMat);
        core.position.y = 0.8; g.add(core);
        for (let s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), glowMat);
            eye.position.set(s * 0.1, 0.85, 0.15); g.add(eye);
        }
        for (let i = 0; i < 3; i++) {
            const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.005, 0.3, 4), darkMat);
            tendril.material = tendril.material.clone();
            tendril.material.transparent = true; tendril.material.opacity = 0.5;
            const angle = (i / 3) * Math.PI * 2;
            tendril.position.set(Math.cos(angle) * 0.15, 0.25, Math.sin(angle) * 0.15);
            tendril.rotation.z = Math.cos(angle) * 0.3; g.add(tendril);
        }
    }

    _buildSerpent(g, bodyMat, darkMat, glowMat) {
        for (let i = 0; i < 5; i++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry(0.15 - i * 0.015, 6, 6), i === 0 ? bodyMat : darkMat);
            seg.position.set(0, 0.3, -i * 0.22); seg.scale.set(1, 0.8, 1);
            if (i === 0) this.parts.head = seg; g.add(seg);
        }
        for (let s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), glowMat);
            eye.position.set(s * 0.08, 0.38, 0.1); g.add(eye);
        }
        this.parts.body = g.children[0];
    }

    _buildInsectoid(g, bodyMat, darkMat, glowMat) {
        const abd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), bodyMat);
        abd.scale.set(1, 0.7, 1.3); abd.position.set(0, 0.4, -0.15);
        this.parts.body = abd; g.add(abd);
        const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), darkMat);
        thorax.position.set(0, 0.45, 0.2); g.add(thorax);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), bodyMat);
        head.position.set(0, 0.48, 0.4); this.parts.head = head; g.add(head);
        for (let i = 0; i < 6; i++) {
            const s = i < 3 ? -1 : 1; const z = (i % 3 - 1) * 0.15;
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.3, 4), darkMat);
            leg.position.set(s * 0.25, 0.2, z); leg.rotation.z = s * 0.6; g.add(leg);
        }
        for (let s of [-1, 1]) {
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.005, 0.25, 4), glowMat);
            ant.position.set(s * 0.06, 0.6, 0.5); ant.rotation.x = -0.5; ant.rotation.z = s * 0.3; g.add(ant);
        }
    }

    _buildJellyfish(g, bodyMat, darkMat, glowMat) {
        const bell = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), bodyMat
        );
        bell.material = bell.material.clone();
        bell.material.transparent = true; bell.material.opacity = 0.7;
        bell.position.y = 0.7; this.parts.body = bell; g.add(bell);
        const inner = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), glowMat);
        inner.position.y = 0.65; g.add(inner);
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.45, 4), darkMat);
            tent.material = tent.material.clone();
            tent.material.transparent = true; tent.material.opacity = 0.6;
            tent.position.set(Math.cos(angle) * 0.15, 0.35, Math.sin(angle) * 0.15); g.add(tent);
        }
    }

    _buildDemon(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.5, 8), bodyMat);
        body.position.y = 0.5; this.parts.body = body; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), darkMat);
        head.position.y = 0.9; this.parts.head = head; g.add(head);
        for (let s of [-1, 1]) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 5), glowMat);
            horn.position.set(s * 0.12, 1.05, 0); horn.rotation.z = s * 0.3; g.add(horn);
        }
        for (let s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), glowMat);
            eye.position.set(s * 0.08, 0.95, 0.15); g.add(eye);
        }
        for (let s of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.35, 5), bodyMat);
            arm.position.set(s * 0.3, 0.55, 0); arm.rotation.z = s * 0.4; g.add(arm);
        }
    }

    _buildBiped(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8), bodyMat);
        body.position.y = 0.6; this.parts.body = body; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), darkMat);
        head.position.y = 1.0; this.parts.head = head; g.add(head);
        for (let s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), glowMat);
            eye.position.set(s * 0.06, 1.03, 0.12); g.add(eye);
        }
        for (let s of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.35, 5), bodyMat);
            arm.position.set(s * 0.25, 0.55, 0); g.add(arm);
        }
        for (let s of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.35, 5), darkMat);
            leg.position.set(s * 0.1, 0.2, 0); g.add(leg);
        }
    }

    _buildGolem(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), bodyMat);
        body.position.y = 0.6; this.parts.body = body; g.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.25), darkMat);
        head.position.y = 1.05; this.parts.head = head; g.add(head);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), glowMat);
        eye.position.set(0, 1.1, 0.14); g.add(eye);
        for (let s of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), bodyMat);
            arm.position.set(s * 0.35, 0.5, 0); g.add(arm);
        }
        for (let s of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), darkMat);
            leg.position.set(s * 0.15, 0.15, 0); g.add(leg);
        }
    }

    _buildDrone(g, bodyMat, darkMat, glowMat) {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bodyMat);
        body.scale.set(1.2, 0.6, 1.2); body.position.y = 0.7;
        this.parts.body = body; g.add(body);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), glowMat);
        eye.position.set(0, 0.7, 0.2); g.add(eye);
        for (let s of [-1, 1]) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.15), darkMat);
            panel.position.set(s * 0.3, 0.7, 0); g.add(panel);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // UPDATE — Independent AI with varied attack patterns
    // ══════════════════════════════════════════════════════════════

    update(dt, time, playerGroup, camera, world) {
        this.time += dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.stateTimer > 0) this.stateTimer -= dt;
        if (this._combatTimer > 0) this._combatTimer -= dt;
        else this.inCombat = false;

        const companionData = companionSystem.getActiveCompanion();
        if (!companionData) {
            this.group.visible = false;
            this._builtMobName = null;
            this._initialized = false;
            return;
        }

        this._rebuildModel(companionData);

        const pos = this.group.position;
        const playerPos = playerGroup.position;

        // Initialize on first summon
        if (!this._initialized) {
            pos.set(playerPos.x + 2, 0, playerPos.z - 2);
            this._lastPlayerPos.copy(playerPos);
            this._velocity.set(0, 0, 0);
            this._pickPatrolTarget(playerPos);
            this._initialized = true;
            this.state = 'idle';
            this._idleTimer = 0;
        }
        this._lastPlayerPos.copy(playerPos);

        const floorY = world ? world.getTerrainHeight(pos.x, pos.z) : 0;

        // Handle death state
        if (!companionSystem.alive) {
            if (this.state !== 'dead') {
                this.state = 'dead';
                this._deathFade = DEATH_FADE_DURATION;
                this.combatTarget = null;
            }
            this._updateDead(dt, floorY);
            companionSystem.updateRespawn(dt);
            this._updateHealthBar(camera);
            return;
        }

        // Handle respawn fade-in
        if (!this._wasAlive && companionSystem.alive) {
            this._respawnFade = RESPAWN_FADE_DURATION;
            this.state = 'idle';
            pos.set(playerPos.x + 2, floorY, playerPos.z - 2);
            this._velocity.set(0, 0, 0);
        }
        this._wasAlive = companionSystem.alive;

        if (this._respawnFade > 0) {
            this._respawnFade -= dt;
            const alpha = 1 - (this._respawnFade / RESPAWN_FADE_DURATION);
            this._setModelOpacity(Math.min(1, alpha));
        }

        // Regen HP when out of combat
        if (!this.inCombat) {
            companionSystem.regenHp(dt);
        }

        // Update world-space coordinates
        this.x = pos.x;
        this.z = pos.z;

        // ── Distance checks ──
        const toPlayerSq = (pos.x - playerPos.x) ** 2 + (pos.z - playerPos.z) ** 2;

        // Hard leash — teleport back
        if (toPlayerSq > HARD_LEASH_RADIUS * HARD_LEASH_RADIUS) {
            pos.set(playerPos.x + 2, floorY, playerPos.z - 2);
            this._velocity.set(0, 0, 0);
            this.state = 'idle';
            this.combatTarget = null;
        }

        // Soft leash — return to player if too far (but not during combat)
        const inCombatState = this.state === 'lunge' || this.state === 'flurry' || this.state === 'strafe' || this.state === 'stalk' || this.state === 'disengage';
        if (toPlayerSq > LEASH_RADIUS * LEASH_RADIUS && !inCombatState) {
            if (this.state !== 'return') {
                this.state = 'return';
                this.combatTarget = null;
            }
        }

        // ── State machine ──
        switch (this.state) {
            case 'idle':
                this._updateIdle(dt, time, playerPos, floorY);
                break;
            case 'patrol':
                this._updatePatrol(dt, time, playerPos, floorY);
                break;
            case 'stalk':
                this._updateStalk(dt, floorY);
                break;
            case 'lunge':
                this._updateLunge(dt, floorY);
                break;
            case 'flurry':
                this._updateFlurry(dt, floorY);
                break;
            case 'strafe':
                this._updateStrafe(dt, floorY);
                break;
            case 'disengage':
                this._updateDisengage(dt, floorY);
                break;
            case 'return':
                this._updateReturn(dt, playerPos, floorY);
                break;
            case 'celebrate':
                this._updateCelebrate(dt, time, floorY);
                break;
        }

        // Animate
        this._animate(dt, time);

        // Update health bar
        this._updateHealthBar(camera);
    }

    /** Called on throttled logic tick — find targets independently */
    updateAI(mobManager) {
        if (!this.group.visible) return;
        if (!companionSystem.getActiveCompanion()) return;
        if (!companionSystem.alive) return;

        // Only seek targets when idle/patrolling/returning and attack is off cooldown
        const canSeek = this.state === 'idle' || this.state === 'patrol' || this.state === 'return';
        if (!canSeek || this.attackCooldown > 0) return;

        const pos = this.group.position;
        let bestTarget = null;
        let bestDistSq = DETECT_RANGE_SQ;

        // Prioritize player's current target
        const playerTarget = gameState.currentTarget;
        if (playerTarget && playerTarget.alive) {
            const dx = playerTarget.x - pos.x;
            const dz = playerTarget.z - pos.z;
            const dSq = dx * dx + dz * dz;
            if (dSq < DETECT_RANGE_SQ) {
                bestTarget = playerTarget;
                bestDistSq = dSq;
            }
        }

        // Find nearest mob in range
        if (!bestTarget && mobManager && mobManager.mobs) {
            for (const mob of mobManager.mobs) {
                if (!mob.alive) continue;
                const dx = mob.x - pos.x;
                const dz = mob.z - pos.z;
                const dSq = dx * dx + dz * dz;
                if (dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestTarget = mob;
                }
            }
        }

        if (bestTarget) {
            this.combatTarget = bestTarget;
            this._chaseTimer = 0;

            // Choose attack pattern based on distance and randomness
            const dist = Math.sqrt(bestDistSq);
            if (dist > STALK_RANGE) {
                // Far away — stalk first (creep closer)
                this.state = 'stalk';
            } else {
                // Close enough — pick a random attack pattern
                this._pickAttackPattern();
            }

            this.inCombat = true;
            this._combatTimer = 5.0;
        }
    }

    // ══════════════════════════════════════════════════════════════
    // AI STATE UPDATES
    // ══════════════════════════════════════════════════════════════

    _updateIdle(dt, time, playerPos, floorY) {
        this._idleTimer += dt;

        // Wander slowly in a small area
        const pos = this.group.position;
        const dx = this._idleWanderTarget.x - pos.x;
        const dz = this._idleWanderTarget.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5 || this._idleTimer > 3.0) {
            // Pick a new idle wander target near the player
            this._idleTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * IDLE_WANDER_RADIUS + 1.5;
            this._idleWanderTarget.set(
                playerPos.x + Math.cos(angle) * r,
                0,
                playerPos.z + Math.sin(angle) * r
            );
        }

        // Move slowly
        if (dist > 0.3) {
            const speed = IDLE_WANDER_SPEED * dt;
            pos.x += (dx / dist) * Math.min(speed, dist);
            pos.z += (dz / dist) * Math.min(speed, dist);
            this._faceDirection(dx, dz, dt);
        }

        pos.y = floorY + BOB_AMP * Math.sin(time * BOB_SPEED + this.bobOffset);

        // Transition to patrol after some idle time
        if (this._idleTimer > PATROL_PAUSE_MIN + Math.random() * PATROL_PAUSE_MAX) {
            this._pickPatrolTarget(playerPos);
            this.state = 'patrol';
            this._patrolPause = 0;
        }
    }

    _updatePatrol(dt, time, playerPos, floorY) {
        const pos = this.group.position;

        // Check if patrol target is now too far from player (player moved)
        const ptToPlayer = (this._patrolTarget.x - playerPos.x) ** 2 + (this._patrolTarget.z - playerPos.z) ** 2;
        if (ptToPlayer > ROAM_RADIUS * ROAM_RADIUS * 1.5) {
            // Re-pick closer to player
            this._pickPatrolTarget(playerPos);
        }

        const dx = this._patrolTarget.x - pos.x;
        const dz = this._patrolTarget.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.8) {
            // Arrived at patrol point — pause then go idle or pick new patrol
            this._patrolPause += dt;
            pos.y = floorY + BOB_AMP * Math.sin(time * BOB_SPEED + this.bobOffset);
            if (this._patrolPause > PATROL_PAUSE_MIN + Math.random() * (PATROL_PAUSE_MAX - PATROL_PAUSE_MIN)) {
                if (Math.random() < 0.4) {
                    // Go idle near here
                    this.state = 'idle';
                    this._idleTimer = 0;
                    this._idleWanderTarget.copy(pos);
                } else {
                    // Pick another patrol target
                    this._pickPatrolTarget(playerPos);
                    this._patrolPause = 0;
                }
            }
            return;
        }

        // Move toward patrol target
        const speed = PATROL_SPEED * dt;
        pos.x += (dx / dist) * Math.min(speed, dist);
        pos.z += (dz / dist) * Math.min(speed, dist);
        pos.y = floorY + BOB_AMP * Math.sin(time * BOB_SPEED + this.bobOffset);
        this._faceDirection(dx, dz, dt);
    }

    _updateStalk(dt, floorY) {
        // Slow creep toward enemy — crouched approach
        if (!this.combatTarget || !this.combatTarget.alive) {
            this._exitCombat(floorY);
            return;
        }

        this._chaseTimer += dt;
        if (this._chaseTimer > MAX_CHASE_TIME) {
            this._exitCombat(floorY);
            return;
        }

        const pos = this.group.position;
        const tx = this.combatTarget.x;
        const tz = this.combatTarget.z;
        const dx = tx - pos.x;
        const dz = tz - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // If target ran far out of detection range, abort stalk
        if (dist > DETECT_RANGE * 1.5) {
            this._exitCombat(floorY);
            return;
        }

        // Crouch bob (lower position)
        pos.y = floorY - 0.05 + Math.sin(this.time * 6) * 0.02;

        if (dist < STALK_RANGE) {
            // Close enough — pick attack
            this._pickAttackPattern();
            return;
        }

        const speed = STALK_SPEED * dt;
        pos.x += (dx / dist) * Math.min(speed, dist);
        pos.z += (dz / dist) * Math.min(speed, dist);
        this._faceDirection(dx, dz, dt * 2);
    }

    _updateLunge(dt, floorY) {
        // Burst charge at enemy
        if (!this.combatTarget || !this.combatTarget.alive) {
            this._exitCombat(floorY);
            return;
        }

        this._chaseTimer += dt;
        if (this._chaseTimer > MAX_CHASE_TIME) {
            this._exitCombat(floorY);
            return;
        }

        const pos = this.group.position;
        const tx = this.combatTarget.x;
        const tz = this.combatTarget.z;
        const dx = tx - pos.x;
        const dz = tz - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < LUNGE_RANGE) {
            // Strike!
            this._dealDamage(floorY);
            // After lunge, either disengage or continue
            if (Math.random() < 0.4) {
                this._startDisengage();
            } else {
                this._exitCombat(floorY);
            }
            return;
        }

        const speed = LUNGE_SPEED * dt;
        pos.x += (dx / dist) * Math.min(speed, dist);
        pos.z += (dz / dist) * Math.min(speed, dist);
        pos.y = floorY + 0.05; // Slight lift during lunge
        this._faceDirection(dx, dz, dt * 3);
    }

    _updateFlurry(dt, floorY) {
        // Multi-hit combo — rapid strikes while in melee range
        if (!this.combatTarget || !this.combatTarget.alive) {
            this._exitCombat(floorY);
            return;
        }

        this._chaseTimer += dt;
        // Abort flurry if target is too far away for too long
        if (this._chaseTimer > MAX_CHASE_TIME) {
            this._exitCombat(floorY);
            return;
        }

        const pos = this.group.position;
        const tx = this.combatTarget.x;
        const tz = this.combatTarget.z;
        const dx = tx - pos.x;
        const dz = tz - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Stay in melee range
        if (dist > LUNGE_RANGE * 1.5) {
            // Chase to get back in range
            const speed = LUNGE_SPEED * 0.7 * dt;
            pos.x += (dx / dist) * Math.min(speed, dist);
            pos.z += (dz / dist) * Math.min(speed, dist);
        }

        pos.y = floorY;
        this._faceDirection(dx, dz, dt * 3);

        // Flurry hit timer
        this._flurryTimer -= dt;
        if (this._flurryTimer <= 0 && this._flurryCount > 0) {
            if (dist < LUNGE_RANGE * 2.0) {
                this._dealDamage(0.6, floorY); // Flurry hits do 60% damage each
                this._flurryCount--;
                this._flurryTimer = FLURRY_INTERVAL;
                this._chaseTimer = 0; // Reset chase timer on successful hit

                // Visual: quick side-to-side shake
                pos.x += (Math.random() - 0.5) * 0.3;
                pos.z += (Math.random() - 0.5) * 0.3;
            }
        }

        if (this._flurryCount <= 0) {
            // Flurry complete — disengage
            if (Math.random() < 0.5) {
                this._startDisengage();
            } else {
                this._exitCombat(floorY);
            }
        }
    }

    _updateStrafe(dt, floorY) {
        // Circle-strafe around target, dealing damage at intervals
        if (!this.combatTarget || !this.combatTarget.alive) {
            this._exitCombat(floorY);
            return;
        }

        // NOTE: stateTimer is already decremented in the main update() tick.
        // Do NOT decrement it again here (was causing 2x countdown bug).

        const pos = this.group.position;
        const tx = this.combatTarget.x;
        const tz = this.combatTarget.z;

        // Safety: if target is far outside strafe orbit, abort
        const rawDist = Math.sqrt((tx - pos.x) ** 2 + (tz - pos.z) ** 2);
        if (rawDist > DETECT_RANGE * 1.5) {
            this._exitCombat(floorY);
            return;
        }

        // Orbit around target
        this._strafeAngle += this._strafeDir * (STRAFE_SPEED / STRAFE_RADIUS) * dt;
        const targetX = tx + Math.cos(this._strafeAngle) * STRAFE_RADIUS;
        const targetZ = tz + Math.sin(this._strafeAngle) * STRAFE_RADIUS;

        const dx = targetX - pos.x;
        const dz = targetZ - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.01) {
            const speed = STRAFE_SPEED * dt;
            pos.x += (dx / dist) * Math.min(speed, dist);
            pos.z += (dz / dist) * Math.min(speed, dist);
        }
        pos.y = floorY + 0.03;

        // Face the target, not movement direction
        this._faceDirection(tx - pos.x, tz - pos.z, dt * 2);

        // Deal damage periodically while strafing
        this._flurryTimer -= dt;
        if (this._flurryTimer <= 0) {
            const dToTarget = Math.sqrt((tx - pos.x) ** 2 + (tz - pos.z) ** 2);
            if (dToTarget < STRAFE_RADIUS * 1.5) {
                this._dealDamage(0.45, floorY); // Strafe hits do 45% each
                this._flurryTimer = 0.8 + Math.random() * 0.5;
            }
        }

        if (this.stateTimer <= 0) {
            // Strafe complete — exit or lunge for a finisher
            if (Math.random() < 0.3 && this.combatTarget && this.combatTarget.alive) {
                this.state = 'lunge';
                this._chaseTimer = 0;
            } else {
                this._exitCombat(floorY);
            }
        }
    }

    _updateDisengage(dt, floorY) {
        // Quick backwards hop
        const pos = this.group.position;
        const speed = DISENGAGE_SPEED * dt;
        pos.x += this._disengageDir.x * speed;
        pos.z += this._disengageDir.z * speed;
        pos.y = floorY + Math.sin((this._disengageTraveled / DISENGAGE_DIST) * Math.PI) * 0.4; // Arc

        this._disengageTraveled += speed;

        if (this._disengageTraveled >= DISENGAGE_DIST) {
            pos.y = floorY;
            // After disengaging, re-engage or go idle
            if (this.combatTarget && this.combatTarget.alive && Math.random() < 0.6) {
                this._pickAttackPattern();
            } else {
                this._exitCombat(floorY);
            }
        }
    }

    _updateReturn(dt, playerPos, floorY) {
        const pos = this.group.position;
        const dx = playerPos.x - pos.x;
        const dz = playerPos.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < ROAM_RADIUS * 0.5) {
            // Close enough to player — go idle
            this.state = 'idle';
            this._idleTimer = 0;
            this._idleWanderTarget.copy(pos);
            pos.y = floorY;
            return;
        }

        const speed = RETURN_SPEED * dt;
        pos.x += (dx / dist) * Math.min(speed, dist);
        pos.z += (dz / dist) * Math.min(speed, dist);
        pos.y = floorY + BOB_AMP * Math.sin(this.time * BOB_SPEED + this.bobOffset);
        this._faceDirection(dx, dz, dt);
    }

    _updateCelebrate(dt, time, floorY) {
        const t = 1 - (this.stateTimer / CELEBRATE_DURATION);
        this.group.position.y = floorY + Math.sin(t * Math.PI) * 0.4;
        this.group.rotation.y += dt * 12;

        if (this.stateTimer <= 0) {
            this.state = 'idle';
            this._idleTimer = 0;
            this.group.position.y = floorY;
        }
    }

    _updateDead(dt, floorY) {
        if (this._deathFade > 0) {
            this._deathFade -= dt;
            const alpha = Math.max(0, this._deathFade / DEATH_FADE_DURATION);
            this._setModelOpacity(alpha);
            this.group.position.y = floorY - 0.3 * (1 - alpha);
        } else {
            this.group.visible = false;
        }
    }

    // ══════════════════════════════════════════════════════════════
    // COMBAT HELPERS
    // ══════════════════════════════════════════════════════════════

    _pickAttackPattern() {
        const roll = Math.random();
        if (roll < 0.35) {
            // Lunge — single powerful strike
            this.state = 'lunge';
            this._chaseTimer = 0;
            this._attackPattern = 'lunge';
        } else if (roll < 0.65) {
            // Flurry — rapid multi-hit combo
            this.state = 'flurry';
            this._chaseTimer = 0;
            this._flurryCount = FLURRY_HITS;
            this._flurryTimer = 0.1; // First hit almost immediately
            this._attackPattern = 'flurry';
        } else {
            // Strafe — circle enemy dealing damage over time
            this.state = 'strafe';
            this._strafeAngle = Math.atan2(
                this.group.position.z - (this.combatTarget?.z || 0),
                this.group.position.x - (this.combatTarget?.x || 0)
            );
            this._strafeDir = Math.random() > 0.5 ? 1 : -1;
            this.stateTimer = STRAFE_DURATION_MIN + Math.random() * (STRAFE_DURATION_MAX - STRAFE_DURATION_MIN);
            this._flurryTimer = 0.5; // First strafe hit after 0.5s
            this._attackPattern = 'strafe';
        }
        this.inCombat = true;
        this._combatTimer = 5.0;
    }

    _dealDamage(mult = 1.0, floorY = 0) {
        if (!this.combatTarget || !this.combatTarget.alive) return;

        const dps = companionSystem.getCompanionDps();
        const dmg = Math.max(1, Math.floor(dps * mult));
        const wasAlive = this.combatTarget.alive;
        this.combatTarget.takeDamage(dmg);

        if (wasAlive && !this.combatTarget.alive) {
            this.state = 'celebrate';
            this.stateTimer = CELEBRATE_DURATION;
            this.combatTarget = null;
        }

        this.attackCooldown = ATTACK_COOLDOWN;
        this.inCombat = true;
        this._combatTimer = 5.0;
    }

    _startDisengage() {
        if (!this.combatTarget) {
            this._exitCombat();
            return;
        }
        // Hop away from target
        const pos = this.group.position;
        const dx = pos.x - this.combatTarget.x;
        const dz = pos.z - this.combatTarget.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        this._disengageDir.set(dx / dist, 0, dz / dist);
        this._disengageTraveled = 0;
        this.state = 'disengage';
    }

    _exitCombat(floorY = 0) {
        this.combatTarget = null;
        this.state = 'idle';
        this._idleTimer = 0;
        this._idleWanderTarget.copy(this.group.position);
        this.group.position.y = floorY;
    }

    _pickPatrolTarget(playerPos) {
        const angle = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * (ROAM_RADIUS - 3);
        this._patrolTarget.set(
            playerPos.x + Math.cos(angle) * r,
            0,
            playerPos.z + Math.sin(angle) * r
        );
    }

    // ══════════════════════════════════════════════════════════════
    // VISUAL HELPERS
    // ══════════════════════════════════════════════════════════════

    _setModelOpacity(alpha) {
        this.group.visible = alpha > 0.01;
        this.group.traverse(child => {
            if (child === this._hpBarBg || child === this._hpBarFill ||
                child === this._hpBarBorder || child === this._nameSprite) return;
            if (child.isMesh && child.material) {
                if (!child.material._origOpacity) {
                    child.material._origOpacity = child.material.opacity;
                    child.material._origTransparent = child.material.transparent;
                }
                child.material.transparent = true;
                child.material.opacity = (child.material._origOpacity || 1) * alpha;
            }
        });
    }

    _faceDirection(dx, dz, dt) {
        if (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) return;
        const targetRot = Math.atan2(dx, dz);
        let diff = targetRot - this.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1, TURN_RATE * dt);
    }

    _animate(dt, time) {
        if (this.parts.tail) {
            const speed = this.inCombat ? 8 : 5;
            this.parts.tail.rotation.z = Math.sin(time * speed) * (this.inCombat ? 0.5 : 0.3);
        }
        if (this.parts.halo) {
            const combatPulse = this.inCombat ? 0.6 + Math.sin(time * 4) * 0.2 : 0.3 + Math.sin(time * 2) * 0.1;
            this.parts.halo.material.opacity = combatPulse;
            this.parts.halo.rotation.z = time * (this.inCombat ? 2.0 : 0.5);
            // Combat: halo turns red-ish
            if (this.inCombat) {
                this.parts.halo.material.color.setHex(0xff8844);
                this.parts.halo.material.emissive.setHex(0xdd6622);
            } else {
                this.parts.halo.material.color.setHex(0x66ffaa);
                this.parts.halo.material.emissive.setHex(0x33dd77);
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    // Zone Change — reset position
    // ══════════════════════════════════════════════════════════════

    onZoneChange(playerGroup) {
        if (playerGroup) {
            const px = playerGroup.position.x;
            const pz = playerGroup.position.z;
            this.group.position.set(px + 2, 0, pz - 2);
            this._lastPlayerPos.copy(playerGroup.position);
            this._velocity.set(0, 0, 0);
        }
        this.state = 'idle';
        this._idleTimer = 0;
        this.combatTarget = null;
        this._initialized = true;
    }

    // ══════════════════════════════════════════════════════════════
    // CLEANUP
    // ══════════════════════════════════════════════════════════════

    destroy() {
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }
}