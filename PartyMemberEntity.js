// PartyMemberEntity.js — 3D world representation of a party member
// WoW-STYLE GROUP QUESTING: Role-based formation, dynamic speed matching,
// path smoothing with stagger delays, combat positioning by role,
// boss priority targeting, organic movement feel.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { buildVoidweaverModel, buildThornwardenModel, buildDawnkeeperModel } from './PlayerModels.js';

// Pre-allocated scratch vectors (shared across ALL party entities — zero GC)
const _pmDir = new THREE.Vector3();
const _pmTarget = new THREE.Vector3();
const _pmSub = new THREE.Vector3();
const _pmCheck = new THREE.Vector3();
const _pmPlayerVel = new THREE.Vector3();

// ── Role-based formation offsets (WoW-style) ──
// Tank holds front-left, DPS flanks, Healer stays back-center
const ROLE_FORMATIONS = {
    Tank:   { x: -1.8, z:  0.5 },   // Slightly ahead, left flank — ready to intercept
    DPS:    { x:  2.2, z: -1.8 },    // Right flank, slightly behind
    Healer: { x:  0.0, z: -3.5 },    // Dead center rear — max safety
};

// Slot-based offsets when multiple DPS (indexed by slot within role)
const DPS_SLOT_OFFSETS = [
    { x:  2.2, z: -1.8 },    // First DPS — right flank
    { x: -2.2, z: -2.0 },    // Second DPS — left flank
    { x:  3.5, z: -3.2 },    // Third DPS — far right
    { x: -3.5, z: -3.2 },    // Fourth DPS — far left
];

// Fallback formation for unknown roles (diamond spread)
const FALLBACK_OFFSETS = [
    { x: -2.5, z: -2.2 },
    { x:  2.5, z: -2.2 },
    { x: -4.0, z: -4.5 },
    { x:  4.0, z: -4.5 },
];

// ── Movement tuning constants ──
const FORMATION_ARRIVE_DIST = 1.5;       // "close enough" to formation point
const FORMATION_ARRIVE_DIST_SQ = FORMATION_ARRIVE_DIST * FORMATION_ARRIVE_DIST;
const FORMATION_SPRINT_DIST = 10;         // Sprint threshold
const FORMATION_TELEPORT_DIST = 35;       // Teleport if too far
const COMBAT_DISENGAGE_DIST_SQ = 25 * 25; // Leash distance squared

// Speed matching — members try to match player speed with slight damping
const BASE_MOVE_SPEED = 4.0;
const SPRINT_MULTIPLIER = 1.6;
const CATCH_UP_MULTIPLIER = 1.35;
const STAGGER_DELAY_PER_SLOT = 0.08;     // Seconds of stagger between slots (prevents clumping)
const TURN_RATE = 6.0;                    // Radians/sec for smooth turning

// Combat positioning
const TANK_ENGAGE_DIST = 2.0;            // Tanks close to melee range
const HEALER_MAX_DIST = 8.0;             // Healers maintain safe range
const BOSS_DETECTION_RANGE_SQ = 60 * 60; // Party members detect bosses from very far

// ══════════════════════════════════════════════════════════════════
// SHARED VFX POOLS — created once, reused by all party member entities.
// Body/armor geometry is now instance-specific via the full class model
// builders (PlayerModels.js + inline warrior). Only VFX geo/mat remain shared.
// ══════════════════════════════════════════════════════════════════
let _sharedInit = false;

// VFX geometries/materials (shared across all entities)
const _vfxGeo = {};
const _vfxMat = {};

function _initShared() {
    if (_sharedInit) return;
    _sharedInit = true;

    // ── VFX shared geometries ──
    _vfxGeo.projectile = new THREE.SphereGeometry(0.1, 4, 4);
    _vfxGeo.slash = new THREE.RingGeometry(0.3, 0.8, 6, 1, 0, Math.PI * 0.8);
    _vfxGeo.slashBig = new THREE.RingGeometry(0.3, 1.1, 6, 1, 0, Math.PI * 0.8);

    // ── VFX shared materials (per-class projectile colors) ──
    _vfxMat.projMage = new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.85 });
    _vfxMat.projRanger = new THREE.MeshBasicMaterial({ color: 0x88cc44, transparent: true, opacity: 0.85 });
    _vfxMat.projCleric = new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0.85 });
    _vfxMat.slash = new THREE.MeshBasicMaterial({ color: 0x55ccff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    _vfxMat.slashBig = new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
}

// Map class to projectile material key
const PROJ_MAT_KEY = { mage: 'projMage', ranger: 'projRanger', cleric: 'projCleric' };

// Max active VFX per entity (hard cap to prevent runaway)
const MAX_PROJECTILES = 3;
const MAX_VFX = 4;

export class PartyMemberEntity {
    constructor(scene, partyMember, slotIndex) {
        _initShared(); // Lazy-init shared pools

        this.scene = scene;
        this.partyMember = partyMember;
        this.slotIndex = slotIndex;
        this.memberId = partyMember.id;
        this.classId = partyMember.classId;
        this.name = partyMember.name;
        this.role = partyMember.role || 'DPS'; // Tank, DPS, Healer

        this.group = new THREE.Group();
        this.group.userData.memberId = this.memberId;
        this.parts = {};

        this._buildDetailedModel();
        this.group.scale.setScalar(0.92);
        this.scene.add(this.group);

        // ── Movement (WoW-style group questing) ──
        this.time = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.state = 'follow';           // follow | approach | combat | returning | idle
        this.stateTimer = 0;
        this.moveSpeed = BASE_MOVE_SPEED;
        this.velocity = new THREE.Vector3();
        this.formationTarget = new THREE.Vector3();

        // Stagger delay — prevents all members from moving at exactly the same time
        this._staggerDelay = slotIndex * STAGGER_DELAY_PER_SLOT;
        this._staggerTimer = this._staggerDelay;

        // Player velocity tracking for predictive formation
        this._lastPlayerPos = new THREE.Vector3();
        this._playerVelocity = new THREE.Vector3();
        this._playerMoving = false;
        this._playerStoppedTime = 0;

        // Formation offset (computed from role)
        this._formationOffset = this._computeFormationOffset();

        // ── Combat ──
        this.combatTarget = null;
        this.attackTimer = 0;
        this.attackCooldown = this._getAttackCooldown();
        this.combatTime = 0;
        this.skillCooldown = 0;
        this._combatEngageDelay = 0;
        this._lastAttackWasCrit = false;
        this._lastDamageDealt = 0;
        this._lastWasSkill = false;

        // ── Chat bubble ──
        this.lastMessage = '';
        this.showBubble = false;
        this.messageTime = 0;

        // ── VFX pools (capped) ──
        this.projectiles = []; // max MAX_PROJECTILES
        this._attackVfx = [];  // max MAX_VFX
        this._leashDist = 25;
    }

    /** Compute formation offset based on party role (WoW-style) */
    _computeFormationOffset() {
        const role = this.role;
        if (role === 'Tank') {
            return { ...ROLE_FORMATIONS.Tank };
        } else if (role === 'Healer') {
            return { ...ROLE_FORMATIONS.Healer };
        } else {
            // DPS — use slot-based spread for multiple DPS
            // Count how many DPS come before this member's slot
            const dpsSlot = this.slotIndex; // crude but works — refine in syncMembers
            return { ...(DPS_SLOT_OFFSETS[dpsSlot] || DPS_SLOT_OFFSETS[0]) };
        }
    }

    _getAttackCooldown() {
        switch (this.classId) {
            case 'mage': return 1.6;
            case 'ranger': return 1.0;
            case 'cleric': return 1.5;
            default: return 0.9;
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // DETAILED CLASS MODEL — uses the same full-fidelity builders as
    // the player character and NPC fake players. Mage/Ranger/Cleric
    // delegate to PlayerModels.js; Warrior uses an inline Aetherblade
    // builder matching FakePlayer's approach.
    // ══════════════════════════════════════════════════════════════════
    _buildDetailedModel() {
        // Properties expected by the PlayerModels.js builders
        this._aetherMats = [];
        this._aetherBaseEmissive = [];

        if (this.classId === 'mage') {
            buildVoidweaverModel(this);
        } else if (this.classId === 'ranger') {
            buildThornwardenModel(this);
        } else if (this.classId === 'cleric') {
            buildDawnkeeperModel(this);
        } else {
            this._buildWarriorModel();
        }
    }

    /** Full Aetherblade Warrior model — matches Player & FakePlayer fidelity */
    _buildWarriorModel() {
        const g = this.group;
        const parts = this.parts;

        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x1a2a4a, metalness: 0.88, roughness: 0.12,
        });
        const armorLightMat = new THREE.MeshStandardMaterial({
            color: 0x2a3d62, metalness: 0.85, roughness: 0.15,
        });
        const silverMat = new THREE.MeshStandardMaterial({
            color: 0xb0c0d0, metalness: 0.92, roughness: 0.06,
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: 0x55eeff, emissive: 0x33bbdd, emissiveIntensity: 2.0,
            metalness: 0.5, roughness: 0.15, transparent: true, opacity: 0.95,
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xd4a574, roughness: 0.6,
        });
        const capeMat = new THREE.MeshStandardMaterial({
            color: 0x0a1a3a, roughness: 0.7, side: THREE.DoubleSide,
        });
        const capeInnerMat = new THREE.MeshStandardMaterial({
            color: 0x050a15, roughness: 0.8, side: THREE.DoubleSide,
        });

        this._aetherMats = [glowMat];
        this._aetherBaseEmissive = [glowMat.emissiveIntensity];

        // ── Torso ──
        const torso = new THREE.Group();
        const chestGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.65, 10);
        const chest = new THREE.Mesh(chestGeo, armorMat);
        chest.scale.set(1.1, 1.0, 0.65);
        torso.add(chest);
        // Breast plate
        const breastGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.55, 8, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
        const breast = new THREE.Mesh(breastGeo, armorLightMat);
        breast.scale.set(1.05, 1.0, 0.5);
        breast.position.set(0, 0.0, 0.06);
        torso.add(breast);
        // Rune lines
        for (let i = 0; i < 3; i++) {
            const rg = new THREE.BoxGeometry(0.14, 0.008, 0.008);
            const r = new THREE.Mesh(rg, glowMat);
            r.position.set(0, -0.06 - i * 0.12, 0.2);
            torso.add(r);
        }
        // Collar
        const collarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.12, 10);
        const collar = new THREE.Mesh(collarGeo, armorLightMat);
        collar.position.y = 0.36;
        torso.add(collar);
        // Back plate
        const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.04), armorMat);
        backPlate.position.set(0, 0.02, -0.14);
        torso.add(backPlate);
        torso.position.y = 1.15;
        parts.torso = torso;
        g.add(torso);

        // ── Shoulder pads ──
        this._shoulderParts = [];
        for (let side of [-1, 1]) {
            const sg = new THREE.Group();
            const pad = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), armorLightMat);
            pad.scale.set(1.2, 0.8, 1.0);
            sg.add(pad);
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 5), silverMat);
            spike.position.set(side * 0.04, 0.08, 0.06);
            spike.rotation.z = side * -0.3;
            sg.add(spike);
            sg.position.set(side * 0.36, 1.45, 0);
            this._shoulderParts.push(sg);
            g.add(sg);
        }

        // ── Head ──
        const headGroup = new THREE.Group();
        headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skinMat));
        headGroup.children[0].scale.set(0.85, 1.0, 0.9);
        // Helmet
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), armorMat);
        helmet.position.set(0, 0.04, -0.02);
        headGroup.add(helmet);
        // Visor slit
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.02), glowMat);
        visor.position.set(0, 0.02, 0.14);
        headGroup.add(visor);
        // Eyes behind visor
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), glowMat);
            eye.position.set(side * 0.04, 0.02, 0.13);
            headGroup.add(eye);
        }
        headGroup.position.y = 1.72;
        parts.head = headGroup;
        g.add(headGroup);

        // ── Belt ──
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.1, 10), armorLightMat);
        belt.scale.set(1.0, 1, 0.65);
        belt.position.y = 0.82;
        g.add(belt);
        const beltRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.01, 6, 16), silverMat);
        beltRing.rotation.x = Math.PI / 2;
        beltRing.position.y = 0.82;
        g.add(beltRing);

        // ── Arms ──
        const buildArm = (sideSign) => {
            const ag = new THREE.Group();
            ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.32, 8), armorMat));
            ag.children[0].position.y = -0.16;
            ag.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), armorLightMat));
            ag.children[1].position.y = -0.32;
            ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.28, 8), armorMat));
            ag.children[2].position.y = -0.46;
            ag.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), silverMat));
            ag.children[3].position.y = -0.64;
            ag.position.set(sideSign * 0.38, 1.35, 0);
            return ag;
        };
        parts.leftArm = buildArm(-1);
        g.add(parts.leftArm);
        parts.rightArm = buildArm(1);
        g.add(parts.rightArm);

        // ── Sword ──
        const swordGroup = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.015), silverMat);
        blade.position.y = 0.2;
        swordGroup.add(blade);
        const bladeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.85, 0.008), glowMat);
        bladeGlow.position.y = 0.22;
        swordGroup.add(bladeGlow);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), silverMat);
        guard.position.y = -0.25;
        swordGroup.add(guard);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7 }));
        grip.position.y = -0.35;
        swordGroup.add(grip);
        swordGroup.position.y = -0.7;
        swordGroup.rotation.x = -0.15;
        parts.rightArm.add(swordGroup);
        parts.sword = swordGroup;

        // ── Shield on left arm ──
        const shieldGroup = new THREE.Group();
        const shieldBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.04), armorMat);
        shieldGroup.add(shieldBody);
        const shieldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.02), silverMat);
        shieldBorder.position.z = -0.01;
        shieldGroup.add(shieldBorder);
        const shieldEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), glowMat);
        shieldEmblem.position.z = 0.03;
        shieldEmblem.rotation.z = Math.PI / 4;
        shieldGroup.add(shieldEmblem);
        shieldGroup.position.set(0, -0.55, 0.15);
        shieldGroup.rotation.x = -0.1;
        parts.leftArm.add(shieldGroup);

        // ── Legs ──
        const buildLeg = (sideSign) => {
            const lg = new THREE.Group();
            lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.35, 8), armorMat));
            lg.children[0].position.y = -0.17;
            lg.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), armorLightMat));
            lg.children[1].position.y = -0.37;
            lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), armorMat));
            lg.children[2].position.y = -0.55;
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.18), armorMat);
            boot.position.set(0, -0.74, 0.02);
            lg.add(boot);
            const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }));
            sole.position.set(0, -0.8, 0.02);
            lg.add(sole);
            lg.position.set(sideSign * 0.12, 0.78, 0);
            return lg;
        };
        parts.leftLeg = buildLeg(-1);
        g.add(parts.leftLeg);
        parts.rightLeg = buildLeg(1);
        g.add(parts.rightLeg);

        // ── Cape ──
        const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1, 6, 10), capeMat);
        cape.position.set(0, 1.05, -0.22);
        parts.cape = cape;
        g.add(cape);
        this._capeInner = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.06, 6, 10), capeInnerMat);
        this._capeInner.position.set(0, 1.05, -0.215);
        g.add(this._capeInner);

        // ── Front tabard ──
        const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.5, 3, 5), armorLightMat);
        tabard.position.set(0, 0.5, 0.16);
        this._frontTabard = tabard;
        g.add(tabard);
    }

    // ══════════════════════════════════════════════════════════════════
    // UPDATE (60fps) — WoW-style group movement
    // ══════════════════════════════════════════════════════════════════
    update(dt, time, playerGroup, world) {
        this.time += dt;
        this.stateTimer -= dt;
        if (this.skillCooldown > 0) this.skillCooldown -= dt;
        if (this._combatEngageDelay > 0) this._combatEngageDelay -= dt;

        const playerPos = playerGroup.position;

        // ── Track player velocity for predictive formation ──
        _pmPlayerVel.copy(playerPos).sub(this._lastPlayerPos).divideScalar(Math.max(dt, 0.001));
        this._playerVelocity.lerp(_pmPlayerVel, dt * 8); // smooth it
        this._lastPlayerPos.copy(playerPos);
        const playerSpeed = this._playerVelocity.length();
        this._playerMoving = playerSpeed > 0.5;

        if (this._playerMoving) {
            this._playerStoppedTime = 0;
        } else {
            this._playerStoppedTime += dt;
        }

        const floorY = world ? world.getTerrainHeight(this.group.position.x, this.group.position.z) : 0;

        // ── Compute formation target (role-based, rotated to player facing) ──
        const offset = this._formationOffset;
        const playerRot = playerGroup.rotation.y;
        const cosR = Math.cos(playerRot);
        const sinR = Math.sin(playerRot);

        // When player is moving, predict slightly ahead for smoother following
        const predictDist = this._playerMoving ? Math.min(playerSpeed * 0.15, 1.5) : 0;
        const predictX = playerPos.x + this._playerVelocity.x * 0.15 * (this._playerMoving ? 1 : 0);
        const predictZ = playerPos.z + this._playerVelocity.z * 0.15 * (this._playerMoving ? 1 : 0);

        this.formationTarget.set(
            predictX + offset.x * cosR - offset.z * sinR,
            0,
            predictZ + offset.x * sinR + offset.z * cosR
        );

        const toFormSq = this.group.position.distanceToSquared(this.formationTarget);
        const toPlayerSq = this.group.position.distanceToSquared(playerPos);

        // ── Teleport if way too far ──
        if (toPlayerSq > FORMATION_TELEPORT_DIST * FORMATION_TELEPORT_DIST) {
            this.group.position.copy(this.formationTarget);
            this.group.position.y = floorY;
            this.velocity.set(0, 0, 0);
            this._lastPlayerPos.copy(playerPos);
            this._playerVelocity.set(0, 0, 0);
            this.state = 'follow';
            this.combatTarget = null;
            return;
        }

        // ── Leash: return if combat pulls too far from player ──
        if ((this.state === 'combat' || this.state === 'approach') &&
            toPlayerSq > COMBAT_DISENGAGE_DIST_SQ) {
            this.state = 'returning';
            this.combatTarget = null;
            this.combatTime = 0;
        }

        // ── State machine ──
        if (this.state === 'combat') {
            this._updateCombat(dt, floorY);
        } else if (this.state === 'approach') {
            this._updateApproach(dt, world, floorY);
        } else {
            // follow, returning, idle
            this._updateFollow(dt, toFormSq, world, playerSpeed, floorY);
            if (this.state === 'returning' && toFormSq < FORMATION_ARRIVE_DIST_SQ * 4) {
                this.state = 'follow';
            }
        }

        // ── Idle animation when stationary in formation ──
        if (this.state === 'follow' && toFormSq < FORMATION_ARRIVE_DIST_SQ) {
            this.group.position.y = floorY + Math.sin(this.time * 2 + this.bobOffset) * 0.04;
            // Gently dampen limb rotations back to rest
            if (this.parts.leftLeg) this.parts.leftLeg.rotation.x *= 0.9;
            if (this.parts.rightLeg) this.parts.rightLeg.rotation.x *= 0.9;
            if (this.parts.leftArm) this.parts.leftArm.rotation.x *= 0.9;
            if (this.parts.rightArm) this.parts.rightArm.rotation.x *= 0.9;

            // If player stopped, slowly face same direction as player
            if (this._playerStoppedTime > 1.0) {
                const targetRot = playerGroup.rotation.y;
                let d = targetRot - this.group.rotation.y;
                while (d > Math.PI) d -= Math.PI * 2;
                while (d < -Math.PI) d += Math.PI * 2;
                this.group.rotation.y += d * dt * 1.5; // Slow, casual turn
            }
        }

        // ── Cape flutter (responds to movement speed) ──
        if (this.parts.cape) {
            const velSq = this.velocity.lengthSq();
            this.parts.cape.rotation.x = 0.1 + (velSq > 1
                ? Math.sin(this.time * 6) * 0.12 + Math.min(velSq * 0.005, 0.1) // More flutter when running fast
                : Math.sin(this.time * 1.5) * 0.04);
        }

        // Update active projectiles
        this._updateProjectiles(dt);
        // Update attack VFX
        this._updateAttackVfx(dt);
    }

    /** WoW-style follow behavior — matches player speed, formation-aware */
    _updateFollow(dt, toFormSq, world, playerSpeed, floorY) {
        // Already at formation position — stop
        if (toFormSq < FORMATION_ARRIVE_DIST_SQ) {
            this.velocity.multiplyScalar(0.85); // Gentle brake
            return;
        }

        const dist = Math.sqrt(toFormSq);

        // ── Speed matching (WoW-style): match player speed, sprint to catch up ──
        let speed = BASE_MOVE_SPEED;

        if (this._playerMoving) {
            // Match player speed with slight buffer so we don't fall behind
            speed = Math.max(BASE_MOVE_SPEED, playerSpeed * 1.05);
        }

        // Sprint if far behind (like WoW auto-run catch-up)
        if (dist > FORMATION_SPRINT_DIST) {
            speed *= SPRINT_MULTIPLIER;
        } else if (dist > 5) {
            speed *= CATCH_UP_MULTIPLIER;
        }

        // ── Stagger: slight delay before starting to follow (prevents clumping) ──
        if (this._staggerTimer > 0) {
            this._staggerTimer -= dt;
            // Still decelerate smoothly
            this.velocity.multiplyScalar(0.9);
            return;
        }

        // ── Compute movement direction with slight smoothing ──
        _pmDir.copy(this.formationTarget).sub(this.group.position).normalize();

        // Smooth velocity interpolation — heavier lerp for more organic feel
        const lerpFactor = this._playerMoving ? dt * 5.5 : dt * 4;
        this.velocity.lerp(_pmDir.multiplyScalar(speed), lerpFactor);

        // ── Obstacle avoidance (slide along walls) ──
        _pmCheck.set(
            this.group.position.x + this.velocity.x * dt * 2, 0,
            this.group.position.z + this.velocity.z * dt * 2
        );
        if (world && world.isPositionBlocked && world.isPositionBlocked(_pmCheck.x, _pmCheck.z)) {
            // Rotate velocity to slide along obstacle
            const slideAngle = (this.slotIndex % 2 === 0) ? 1.2 : -1.2;
            const c = Math.cos(slideAngle), s = Math.sin(slideAngle);
            const vx = this.velocity.x, vz = this.velocity.z;
            this.velocity.x = vx * c - vz * s;
            this.velocity.z = vx * s + vz * c;
        }

        // Apply velocity
        _pmSub.copy(this.velocity).multiplyScalar(dt);
        this.group.position.add(_pmSub);
        this.group.position.y = floorY;

        // ── Smooth facing (turn rate limited for natural look) ──
        if (this.velocity.lengthSq() > 0.1) {
            const tr = Math.atan2(this.velocity.x, this.velocity.z);
            let d = tr - this.group.rotation.y;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            this.group.rotation.y += d * dt * TURN_RATE;
        }

        // ── Walk/run animation (adjusts cadence to speed) ──
        const animSpeed = Math.min(speed / BASE_MOVE_SPEED, 1.8); // Cap animation speed
        const wc = Math.sin(this.time * 8 * animSpeed);
        const legAmp = 0.4 * Math.min(animSpeed, 1.3);
        const armAmp = 0.3 * Math.min(animSpeed, 1.3);
        if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = wc * legAmp;
        if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -wc * legAmp;
        if (this.parts.leftArm) this.parts.leftArm.rotation.x = -wc * armAmp;
        if (this.parts.rightArm) this.parts.rightArm.rotation.x = wc * armAmp;
    }

    _updateApproach(dt, world, floorY) {
        if (!this.combatTarget || !this.combatTarget.alive) {
            this.state = 'follow'; this.combatTarget = null; this.combatTime = 0; return;
        }
        if (this._combatEngageDelay > 0) return;

        _pmTarget.set(this.combatTarget.x, 0, this.combatTarget.z);
        const distSq = this.group.position.distanceToSquared(_pmTarget);
        const ranges = CONFIG.CLASS_RANGES[this.classId] || CONFIG.CLASS_RANGES.warrior;
        const ideal = ranges.ideal || 2.5;

        // Role-based engagement distance
        let engageDist = ideal + 0.8;
        if (this.role === 'Tank') engageDist = TANK_ENGAGE_DIST + 0.5;
        else if (this.role === 'Healer') engageDist = Math.min(ideal + 1.5, HEALER_MAX_DIST);

        if (distSq < engageDist * engageDist) {
            this.state = 'combat';
            this.attackTimer = 0.3;
            this.combatTime = 0;
            this.velocity.set(0, 0, 0);
            return;
        }

        // Sprint toward target — faster for tanks engaging bosses
        let approachSpeed = this.moveSpeed * 1.15;
        if (this.role === 'Tank' && this.combatTarget.isBoss) approachSpeed *= 1.3;

        _pmDir.copy(_pmTarget).sub(this.group.position).normalize();
        this.velocity.lerp(_pmDir.multiplyScalar(approachSpeed), dt * 6);
        _pmSub.copy(this.velocity).multiplyScalar(dt);
        this.group.position.add(_pmSub);
        this.group.position.y = floorY;

        if (this.velocity.lengthSq() > 0.1) {
            const tr = Math.atan2(this.velocity.x, this.velocity.z);
            let d = tr - this.group.rotation.y;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            this.group.rotation.y += d * dt * 8;
        }

        const wc = Math.sin(this.time * 10);
        if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = wc * 0.5;
        if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -wc * 0.5;
    }

    _updateCombat(dt, floorY) {
        if (!this.combatTarget || !this.combatTarget.alive) {
            this.state = 'follow'; this.combatTarget = null; this.combatTime = 0; return;
        }
        this.combatTime += dt;

        // Face target
        const dx = this.combatTarget.x - this.group.position.x;
        const dz = this.combatTarget.z - this.group.position.z;
        const tr = Math.atan2(dx, dz);
        let d = tr - this.group.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.group.rotation.y += d * dt * 8;

        // ── Role-based combat positioning ──
        const distSq = dx * dx + dz * dz;
        const ranges = CONFIG.CLASS_RANGES[this.classId] || CONFIG.CLASS_RANGES.warrior;

        // Tanks stay in melee range — strafe slightly around the target
        if (this.role === 'Tank') {
            if (distSq > TANK_ENGAGE_DIST * TANK_ENGAGE_DIST * 2.5) {
                // Too far, close the gap
                _pmDir.set(dx, 0, dz).normalize().multiplyScalar(this.moveSpeed * 0.8);
                _pmSub.copy(_pmDir).multiplyScalar(dt);
                this.group.position.add(_pmSub);
                this.group.position.y = floorY;
            }
        }
        // Healers maintain safe distance
        else if (this.role === 'Healer') {
            const idealSq = (ranges.ideal || 3) * (ranges.ideal || 3);
            if (distSq < ranges.min * ranges.min) {
                _pmDir.set(-dx, 0, -dz).normalize().multiplyScalar(this.moveSpeed * 0.6);
                _pmSub.copy(_pmDir).multiplyScalar(dt);
                this.group.position.add(_pmSub);
                this.group.position.y = floorY;
            }
        }
        // DPS — standard kiting behavior
        else if (ranges.kite && distSq < ranges.min * ranges.min) {
            _pmDir.set(-dx, 0, -dz).normalize().multiplyScalar(this.moveSpeed * 0.7);
            _pmSub.copy(_pmDir).multiplyScalar(dt);
            this.group.position.add(_pmSub);
            this.group.position.y = floorY;
        }

        // Attack
        this.attackTimer += dt;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            const isSkill = this.skillCooldown <= 0 && this.combatTime > 3 && Math.random() < 0.25;
            if (isSkill) this.skillCooldown = 7 + Math.random() * 4;
            this._dealDamage(isSkill);
            this._playAttack(isSkill);
        }

        this.group.position.y = floorY + Math.sin(this.time * 3 + this.bobOffset) * 0.02;
    }

    _dealDamage(isSkill) {
        if (!this.combatTarget || !this.combatTarget.alive) return;
        let damage = this.partyMember.getDps();
        if (isSkill) damage = Math.floor(damage * (2 + Math.random()));
        this._lastAttackWasCrit = Math.random() < 0.15;
        if (this._lastAttackWasCrit) damage = Math.floor(damage * 1.8);
        this.combatTarget.takeDamage(damage);
        this.combatTarget.inCombat = true;
        this._lastDamageDealt = damage;
        this._lastWasSkill = isSkill;
    }

    _playAttack(isSkill) {
        const isRanged = this.classId === 'mage' || this.classId === 'ranger' || this.classId === 'cleric';

        // Arm animation
        if (isRanged) {
            if (this.parts.leftArm) this.parts.leftArm.rotation.x = -1.4;
            if (this.parts.rightArm) this.parts.rightArm.rotation.x = -1.4;
            if (this.combatTarget && this.combatTarget.alive) this._spawnProjectile();
            setTimeout(() => {
                if (this.parts.leftArm) this.parts.leftArm.rotation.x = 0;
                if (this.parts.rightArm) this.parts.rightArm.rotation.x = 0;
            }, isSkill ? 500 : 350);
        } else {
            // Warrior melee
            if (this.parts.rightArm) this.parts.rightArm.rotation.x = isSkill ? -2.0 : -1.4;
            this._spawnSlash(isSkill);
            setTimeout(() => {
                if (this.parts.rightArm) this.parts.rightArm.rotation.x = 0;
            }, isSkill ? 300 : 180);
        }
    }

    // ── Pooled VFX spawners ──

    _spawnProjectile() {
        // Hard cap
        if (this.projectiles.length >= MAX_PROJECTILES) return;
        const matKey = PROJ_MAT_KEY[this.classId];
        if (!matKey) return;

        // Reuse shared geo + material (no new allocations!)
        const mesh = new THREE.Mesh(_vfxGeo.projectile, _vfxMat[matKey]);
        mesh.position.copy(this.group.position);
        mesh.position.y += 1.4;
        const tx = this.combatTarget.x - mesh.position.x;
        const tz = this.combatTarget.z - mesh.position.z;
        const len = Math.sqrt(tx * tx + tz * tz) || 1;
        this.scene.add(mesh);
        this.projectiles.push({ mesh, dx: tx / len, dz: tz / len, life: 1.5 });
    }

    _spawnSlash(big) {
        if (this._attackVfx.length >= MAX_VFX) return;
        const mesh = new THREE.Mesh(
            big ? _vfxGeo.slashBig : _vfxGeo.slash,
            big ? _vfxMat.slashBig : _vfxMat.slash
        );
        mesh.position.copy(this.group.position);
        mesh.position.y += 1.1;
        mesh.rotation.y = this.group.rotation.y + (Math.random() - 0.5) * 0.4;
        this.scene.add(mesh);
        this._attackVfx.push({ mesh, life: 0.25, maxLife: 0.25 });
    }

    _updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            p.mesh.position.x += p.dx * 20 * dt;
            p.mesh.position.z += p.dz * 20 * dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                // Don't dispose shared geo/mat!
                this.projectiles.splice(i, 1);
            }
        }
    }

    _updateAttackVfx(dt) {
        for (let i = this._attackVfx.length - 1; i >= 0; i--) {
            const v = this._attackVfx[i];
            v.life -= dt;
            const t = 1 - (v.life / v.maxLife);
            v.mesh.scale.setScalar(1 + t * 0.4);
            // Shared material — can't modify opacity per-instance, just scale out
            if (v.life <= 0) {
                this.scene.remove(v.mesh);
                this._attackVfx.splice(i, 1);
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // AI (logic tick) — Boss priority + role-aware targeting
    // ══════════════════════════════════════════════════════════════════
    updateAI(playerGroup, mobManager) {
        // If already in combat/approach, check if target is still valid
        if (this.state === 'combat' || this.state === 'approach') {
            if (!this.combatTarget || !this.combatTarget.alive) {
                this.combatTarget = null;
                this.state = 'follow';
                this.combatTime = 0;
                // Reset stagger when re-entering follow (creates natural re-formation)
                this._staggerTimer = this._staggerDelay * 0.5;
            } else {
                // Even in combat, check for boss override
                if (!this.combatTarget.isBoss && mobManager && mobManager.mobs) {
                    const boss = this._findBoss(mobManager);
                    if (boss) {
                        this.combatTarget = boss;
                        this.state = 'approach';
                        this._combatEngageDelay = 0; // Immediate boss switch
                    }
                }
                return;
            }
        }
        if (this.state === 'returning') return;

        // ── Priority 0: Boss detection (HIGHEST — long range, all roles focus) ──
        if (mobManager && mobManager.mobs) {
            const boss = this._findBoss(mobManager);
            if (boss) {
                this.combatTarget = boss;
                this.state = 'approach';
                // Tanks engage immediately, DPS/Healers stagger slightly
                this._combatEngageDelay = this.role === 'Tank' ? 0 : this.slotIndex * 0.15;
                this.moveSpeed = BASE_MOVE_SPEED * 1.4; // Speed boost for boss rush
                return;
            }
        }

        // ── Priority 1: Player's current target ──
        const pt = gameState.currentTarget;
        if (pt && pt.alive) {
            this.combatTarget = pt;
            this.state = 'approach';
            // Tanks engage first, then DPS, then Healers
            this._combatEngageDelay = this.role === 'Tank' ? 0
                : this.role === 'DPS' ? 0.15 + this.slotIndex * 0.1
                : 0.4; // Healer waits a beat
            this.moveSpeed = BASE_MOVE_SPEED;
            return;
        }

        // ── Priority 2: Nearest mob within 12u of player ──
        if (mobManager && mobManager.mobs) {
            const pp = playerGroup.position;
            let nearest = null, minSq = 144; // 12 * 12
            for (let i = 0; i < mobManager.mobs.length; i++) {
                const m = mobManager.mobs[i];
                if (!m.alive) continue;
                const dx = m.x - pp.x, dz = m.z - pp.z;
                const sq = dx * dx + dz * dz;
                if (sq < minSq) { minSq = sq; nearest = m; }
            }
            if (nearest) {
                this.combatTarget = nearest;
                this.state = 'approach';
                this._combatEngageDelay = this.role === 'Tank' ? 0 : this.slotIndex * 0.2;
                this.moveSpeed = BASE_MOVE_SPEED;
                return;
            }
        }

        this.state = 'follow';
        this.moveSpeed = BASE_MOVE_SPEED;
    }

    /** Scan for boss mobs in extended range */
    _findBoss(mobManager) {
        let boss = null;
        let bestDistSq = BOSS_DETECTION_RANGE_SQ;
        for (let i = 0; i < mobManager.mobs.length; i++) {
            const m = mobManager.mobs[i];
            if (!m.alive || !m.isBoss) continue;
            const dx = m.x - this.group.position.x;
            const dz = m.z - this.group.position.z;
            const sq = dx * dx + dz * dz;
            if (sq < bestDistSq) {
                bestDistSq = sq;
                boss = m;
            }
        }
        return boss;
    }

    // ── Chat ──
    say(text) {
        this.lastMessage = text;
        this.messageTime = Date.now();
        this.showBubble = true;
        // Increase duration for longer sentences
        const duration = Math.max(3000, text.length * 80);
        if (this._chatTimeout) clearTimeout(this._chatTimeout);
        this._chatTimeout = setTimeout(() => { 
            if (this.lastMessage === text) this.showBubble = false; 
        }, duration);
    }

    setPosition(x, z) { this.group.position.set(x, 0, z); }

    getCombatInfo() {
        return {
            inCombat: this.state === 'combat' || this.state === 'approach',
            lastDamage: this._lastDamageDealt,
            wasCrit: this._lastAttackWasCrit,
            wasSkill: this._lastWasSkill,
        };
    }

    destroy() {
        // Remove active VFX meshes from scene (don't dispose shared geo/mat)
        for (const p of this.projectiles) this.scene.remove(p.mesh);
        this.projectiles.length = 0;
        for (const v of this._attackVfx) this.scene.remove(v.mesh);
        this._attackVfx.length = 0;

        this.scene.remove(this.group);
        // Dispose instance-specific geometry and materials.
        // VFX shared geo/mat are protected by the _isSharedGeo / _isSharedMat checks.
        this.group.traverse(child => {
            if (child.geometry && !_isSharedGeo(child.geometry)) {
                child.geometry.dispose();
            }
            if (child.material && !_isSharedMat(child.material)) {
                child.material.dispose();
            }
        });
    }
}

// Helper: check if a geometry is from the shared VFX pool
function _isSharedGeo(geo) {
    for (const key in _vfxGeo) {
        if (_vfxGeo[key] === geo) return true;
    }
    return false;
}

// Helper: check if a material is from the shared VFX pool
function _isSharedMat(mat) {
    for (const key in _vfxMat) {
        if (_vfxMat[key] === mat) return true;
    }
    return false;
}
