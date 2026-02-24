import * as THREE from 'three';
import { buildVoidweaverModel, buildThornwardenModel, buildDawnkeeperModel } from './PlayerModels.js';
import { gameState } from './GameState.js';
import { CONFIG } from './config.js';
import { generateBubbleMessage, generateName } from './BarrensChat.js';

// Pre-allocated scratch vectors to avoid GC pressure
const _fpTargetPos = new THREE.Vector3();
const _fpSubVec = new THREE.Vector3();
const _fpDir = new THREE.Vector3();
const _fpCheckVec = new THREE.Vector3();

export class FakePlayer {
    constructor(scene, classId, name = null) {
        this.scene = scene;
        this.classId = classId;
        this.name = name || generateName();
        
        this.group = new THREE.Group();
        this.parts = {};
        
        // Setup internal properties required by model builders
        this._aetherMats = [];
        this._aetherBaseEmissive = [];
        
        // Build proper class model for ALL classes
        if (classId === 'mage') {
            buildVoidweaverModel(this);
        } else if (classId === 'ranger') {
            buildThornwardenModel(this);
        } else if (classId === 'cleric') {
            buildDawnkeeperModel(this);
        } else {
            this._buildWarriorModel();
        }

        // Slightly randomize scale
        const sc = 0.88 + Math.random() * 0.18;
        this.group.scale.setScalar(sc);
        
        this.scene.add(this.group);
        
        // Chat bubble state
        this.chatBubble = null;
        this.chatTimer = 0;
        this.nextChatIn = 15 + Math.random() * 45; 
        
        // Animation & Physics state
        this.time = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.state = 'idle';
        this.stateTimer = 0;
        this.target = new THREE.Vector3();
        this.moveSpeed = 2 + Math.random() * 1.5;
        this.velocity = new THREE.Vector3();
        this.yVelocity = 0;
        this.isJumping = false;
        
        // Combat & Social
        this.combatTarget = null;
        this.attackTimer = 0;
        this.leader = null;
        this.groupOffset = new THREE.Vector3();
        this._bossRushTimer = 0;
        
        // Questing simulation
        this.isQuesting = Math.random() > 0.3; // Most NPCs are "questing"
        this.questPoint = null;
        
        // Mount visual
        this._initMountEffect();
    }

    _initMountEffect() {
        // Simple glowing disk for "mounted" speed
        const geo = new THREE.RingGeometry(0.4, 0.45, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
        this.mountDisk = new THREE.Mesh(geo, mat);
        this.mountDisk.rotation.x = Math.PI / 2;
        this.mountDisk.position.y = 0.05;
        this.group.add(this.mountDisk);
    }

    _updateMountVisual(dt) {
        const isMounted = this.state === 'wander' && this.velocity.lengthSq() > 1;
        const targetOpacity = isMounted ? 0.6 : 0;
        this.mountDisk.material.opacity = THREE.MathUtils.lerp(this.mountDisk.material.opacity, targetOpacity, dt * 5);
        if (this.mountDisk.material.opacity > 0.01) {
            this.mountDisk.rotation.z += dt * 3;
            this.moveSpeed = 5.5; // Mount speed
        } else {
            this.moveSpeed = 2 + Math.random() * 1.5;
        }
    }

    /** Full Warrior class model */
    _buildWarriorModel() {
        const g = this.group;
        const parts = this.parts;

        const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, metalness: 0.88, roughness: 0.12 });
        const armorLightMat = new THREE.MeshStandardMaterial({ color: 0x2a3d62, metalness: 0.85, roughness: 0.15 });
        const silverMat = new THREE.MeshStandardMaterial({ color: 0xb0c0d0, metalness: 0.92, roughness: 0.06 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x55eeff, emissive: 0x33bbdd, emissiveIntensity: 2.0, metalness: 0.5, roughness: 0.15, transparent: true, opacity: 0.95 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 });
        const capeMat = new THREE.MeshStandardMaterial({ color: 0x0a1a3a, roughness: 0.7, side: THREE.DoubleSide });
        const capeInnerMat = new THREE.MeshStandardMaterial({ color: 0x050a15, roughness: 0.8, side: THREE.DoubleSide });

        this._aetherMats = [glowMat];
        this._aetherBaseEmissive = [glowMat.emissiveIntensity];

        // Torso
        const torso = new THREE.Group();
        const chestGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.65, 10);
        const chest = new THREE.Mesh(chestGeo, armorMat);
        chest.scale.set(1.1, 1.0, 0.65);
        chest.castShadow = true;
        torso.add(chest);
        const breastGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.55, 8, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
        const breast = new THREE.Mesh(breastGeo, armorLightMat);
        breast.scale.set(1.05, 1.0, 0.5);
        breast.position.set(0, 0.0, 0.06);
        torso.add(breast);
        for (let i = 0; i < 3; i++) {
            const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.008), glowMat);
            r.position.set(0, -0.06 - i * 0.12, 0.2);
            torso.add(r);
        }
        const collarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.12, 10);
        const collar = new THREE.Mesh(collarGeo, armorLightMat);
        collar.position.y = 0.36;
        torso.add(collar);
        const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.04), armorMat);
        backPlate.position.set(0, 0.02, -0.14);
        torso.add(backPlate);
        torso.position.y = 1.15;
        parts.torso = torso;
        g.add(torso);

        // Shoulders
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

        // Head
        const headGroup = new THREE.Group();
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skinMat);
        headMesh.scale.set(0.85, 1.0, 0.9);
        headGroup.add(headMesh);
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), armorMat);
        helmet.position.set(0, 0.04, -0.02);
        headGroup.add(helmet);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.02), glowMat);
        visor.position.set(0, 0.02, 0.14);
        headGroup.add(visor);
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), glowMat);
            eye.position.set(side * 0.04, 0.02, 0.13);
            headGroup.add(eye);
        }
        headGroup.position.y = 1.72;
        parts.head = headGroup;
        g.add(headGroup);

        // Belt
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.1, 10), armorLightMat);
        belt.scale.set(1.0, 1, 0.65);
        belt.position.y = 0.82;
        g.add(belt);
        const beltTrim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.01, 6, 16), silverMat);
        beltTrim.rotation.x = Math.PI / 2;
        beltTrim.position.y = 0.82;
        g.add(beltTrim);

        // Arms
        const buildArm = (sideSign) => {
            const ag = new THREE.Group();
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.32, 8), armorMat);
            upper.position.y = -0.16;
            ag.add(upper);
            const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), armorLightMat);
            elbow.position.y = -0.32;
            ag.add(elbow);
            const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.28, 8), armorMat);
            lower.position.y = -0.46;
            ag.add(lower);
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), silverMat);
            hand.position.y = -0.64;
            ag.add(hand);
            ag.position.set(sideSign * 0.38, 1.35, 0);
            return ag;
        };
        parts.leftArm = buildArm(-1);
        g.add(parts.leftArm);
        parts.rightArm = buildArm(1);
        g.add(parts.rightArm);

        // Sword
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

        // Shield
        const shieldGroup = new THREE.Group();
        shieldGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.04), armorMat));
        const shieldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.02), silverMat);
        shieldBorder.position.z = -0.01;
        shieldGroup.add(shieldBorder);
        const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), glowMat);
        emblem.position.z = 0.03;
        emblem.rotation.z = Math.PI / 4;
        shieldGroup.add(emblem);
        shieldGroup.position.set(0, -0.55, 0.15);
        shieldGroup.rotation.x = -0.1;
        parts.leftArm.add(shieldGroup);

        // Legs
        const buildLeg = (sideSign) => {
            const lg = new THREE.Group();
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.35, 8), armorMat);
            thigh.position.y = -0.17;
            lg.add(thigh);
            const knee = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), armorLightMat);
            knee.position.y = -0.37;
            lg.add(knee);
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), armorMat);
            shin.position.y = -0.55;
            lg.add(shin);
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.18), armorMat);
            boot.position.set(0, -0.74, 0.02);
            boot.castShadow = true;
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

        // Cape
        const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1, 6, 10), capeMat);
        cape.position.set(0, 1.05, -0.22);
        parts.cape = cape;
        g.add(cape);
        this._capeInner = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.06, 6, 10), capeInnerMat);
        this._capeInner.position.set(0, 1.05, -0.215);
        g.add(this._capeInner);

        // Tabard
        const tabard = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.5, 3, 5), armorLightMat);
        tabard.position.set(0, 0.5, 0.16);
        this._frontTabard = tabard;
        g.add(tabard);

        // Ground rune
        const runeCircle = new THREE.Group();
        runeCircle.add(new THREE.Mesh(new THREE.RingGeometry(0.7, 0.75, 48), glowMat));
        runeCircle.add(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.53, 48), glowMat));
        for (const m of runeCircle.children) m.rotation.x = -Math.PI / 2;
        runeCircle.position.y = 0.01;
        this._runeCircle = runeCircle;
        g.add(runeCircle);

        // Particles
        this._aetherParticles = [];
        const pGeo = new THREE.SphereGeometry(0.01, 3, 3);
        const pMat = new THREE.MeshStandardMaterial({ color: 0x55eeff, emissive: 0x33bbdd, emissiveIntensity: 2.5, transparent: true, opacity: 0.6 });
        for (let i = 0; i < 3; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            const angle = (i / 3) * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.4;
            const height = 0.3 + Math.random() * 1.3;
            p.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
            this._aetherParticles.push({ mesh: p, baseAngle: angle, radius, baseY: height, speed: 0.3 + Math.random() * 0.5, bobSpeed: 1.5 + Math.random() * 2.0, bobAmp: 0.04 + Math.random() * 0.08, phaseOffset: Math.random() * Math.PI * 2 });
            g.add(p);
        }
    }

    setPosition(x, z) {
        this.group.position.set(x, 0, z);
        this.group.rotation.y = Math.random() * Math.PI * 2;
    }

    /** Physics/Animation (60fps) */
    update(dt, time, world, mobManager) {
        this.time += dt;
        this.stateTimer -= dt;

        const floorY = world ? world.getTerrainHeight(this.group.position.x, this.group.position.z) : 0;

        // Physics
        if (this.isJumping) {
            this.yVelocity -= dt * 25; // Gravity
            this.group.position.y += this.yVelocity * dt;
            if (this.group.position.y <= floorY) {
                this.group.position.y = floorY;
                this.yVelocity = 0;
                this.isJumping = false;
            }
        } else if (this.velocity.lengthSq() > 0.1 && Math.random() < 0.005) {
            // Random jump while moving
            this.isJumping = true;
            this.yVelocity = 6 + Math.random() * 4;
        }

        this._updateMountVisual(dt);

        // Movement Logic
        if (this.state === 'wander' || this.state === 'follow' || this.state === 'approach' || this.state === 'quest' || this.state === 'dash') {
            _fpTargetPos.copy((this.state === 'follow' && this.leader) 
                ? _fpSubVec.copy(this.leader.group.position).add(this.groupOffset)
                : this.target);

            const distSq = this.group.position.distanceToSquared(_fpTargetPos);
            const arrivalThreshold = this.state === 'dash' ? 1.0 : 0.36;

            if (distSq > arrivalThreshold) {
                _fpDir.copy(_fpTargetPos).sub(this.group.position).normalize();
                
                let actualSpeed = this.moveSpeed;
                if (this.state === 'dash') actualSpeed *= 3; // Class-specific flair speed

                this.velocity.lerp(_fpDir.multiplyScalar(actualSpeed), dt * (this.state === 'dash' ? 10 : 5));
                
                _fpCheckVec.set(this.group.position.x + this.velocity.x * dt * 2, 0, this.group.position.z + this.velocity.z * dt * 2);
                if (world && world.isPositionBlocked(_fpCheckVec.x, _fpCheckVec.z)) {
                    this.velocity.set(0,0,0);
                    this.state = 'idle';
                    this.stateTimer = 1;
                }

                _fpSubVec.copy(this.velocity).multiplyScalar(dt);
                this.group.position.add(_fpSubVec);
                
                // Snap to floor during movement
                if (!this.isJumping) {
                    this.group.position.y = floorY;
                }

                const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
                let angleDiff = targetRotation - this.group.rotation.y;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                this.group.rotation.y += angleDiff * dt * 5;

                // Walk animation
                const walkCycle = Math.sin(this.time * 8);
                const walkAmp = this.state === 'dash' ? 0.8 : 0.4;
                if (this.parts.leftLeg) this.parts.leftLeg.rotation.x = walkCycle * walkAmp;
                if (this.parts.rightLeg) this.parts.rightLeg.rotation.x = -walkCycle * walkAmp;
                if (this.parts.leftArm) this.parts.leftArm.rotation.x = -walkCycle * walkAmp * 0.7;
                if (this.parts.rightArm) this.parts.rightArm.rotation.x = walkCycle * walkAmp * 0.7;
            } else {
                if (this.state === 'dash') {
                    this.state = 'idle';
                    this.stateTimer = 0.5;
                } else if (this.state === 'approach') {
                    this.state = 'combat';
                    this.stateTimer = 2;
                } else if (this.state === 'quest') {
                    this.state = 'looting';
                    this.stateTimer = 2 + Math.random() * 2;
                    if (Math.random() < 0.3) this.say(Math.random() < 0.5 ? "Questing..." : "Looting quest item.");
                } else if (this.state !== 'follow') {
                    this.state = 'idle';
                    this.stateTimer = 2 + Math.random() * 3;
                }
                this.velocity.set(0,0,0);
            }
        } else if (this.state === 'looting') {
            // Bend over animation
            if (this.parts.torso) this.parts.torso.rotation.x = THREE.MathUtils.lerp(this.parts.torso.rotation.x, 0.8, dt * 5);
            if (this.parts.leftArm) this.parts.leftArm.rotation.x = THREE.MathUtils.lerp(this.parts.leftArm.rotation.x, -1.2, dt * 5);
            if (this.stateTimer <= 0) {
                this.state = 'idle';
                this.stateTimer = 1;
                if (this.parts.torso) this.parts.torso.rotation.x = 0;
            }
        } else {
            // Idle animation
            const bob = Math.sin(this.time * 2 + this.bobOffset) * 0.05;
            this.group.position.y = this.isJumping ? this.group.position.y : (floorY + bob);
            if (this.parts.leftLeg) this.parts.leftLeg.rotation.x *= 0.9;
            if (this.parts.rightLeg) this.parts.rightLeg.rotation.x *= 0.9;
            if (this.parts.torso) this.parts.torso.rotation.x = THREE.MathUtils.lerp(this.parts.torso.rotation.x, 0, dt * 5);
        }

        // Combat Behavior
        if (this.state === 'combat') {
            this.attackTimer += dt;
            const speedScale = (this.classId === 'mage' || this.classId === 'ranger') ? 0.8 : 1.2;

            if (this.attackTimer > speedScale) {
                this.attackTimer = 0;
                if (this.classId === 'mage') {
                    if (this.parts.leftArm) this.parts.leftArm.rotation.x = -1.5;
                    if (this.parts.rightArm) this.parts.rightArm.rotation.x = -1.5;
                    setTimeout(() => { if (this.parts.leftArm) this.parts.leftArm.rotation.x = 0; if (this.parts.rightArm) this.parts.rightArm.rotation.x = 0; }, 400);
                } else if (this.classId === 'ranger') {
                    if (this.parts.leftArm) this.parts.leftArm.rotation.x = -1.2;
                    if (this.parts.rightArm) this.parts.rightArm.rotation.x = -0.5;
                    setTimeout(() => { if (this.parts.leftArm) this.parts.leftArm.rotation.x = 0; if (this.parts.rightArm) this.parts.rightArm.rotation.x = 0; }, 300);
                } else {
                    if (this.parts.rightArm) {
                        this.parts.rightArm.rotation.x = -1.2;
                        setTimeout(() => { if (this.parts.rightArm) this.parts.rightArm.rotation.x = 0; }, 200);
                    }
                }
                if (this.combatTarget && !this.combatTarget.alive) {
                    this.state = 'idle';
                    this.stateTimer = 1;
                    this.combatTarget = null;
                }
            }
            if (this.combatTarget) {
                const dx = this.combatTarget.x - this.group.position.x;
                const dz = this.combatTarget.z - this.group.position.z;
                const targetRot = Math.atan2(dx, dz);
                let diff = targetRot - this.group.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                this.group.rotation.y += diff * dt * 5;
            }
        }

        // Particle update
        if (this._aetherParticles) {
            for (const p of this._aetherParticles) {
                p.mesh.position.y = p.baseY + Math.sin(this.time * p.bobSpeed + p.phaseOffset) * p.bobAmp;
                const angle = p.baseAngle + this.time * p.speed;
                p.mesh.position.x = Math.cos(angle) * p.radius;
                p.mesh.position.z = Math.sin(angle) * p.radius;
            }
        }

        // Chat logic
        this.chatTimer += dt;
        if (this.chatTimer >= this.nextChatIn) {
            this.say(generateBubbleMessage());
            this.chatTimer = 0;
            this.nextChatIn = 15 + Math.random() * 45; 
        }
    }

    /** AI/Decision Making (LOGIC_TICK) */
    updateAI(world, mobManager) {
        if (this.stateTimer > 0) return;

        if (this.leader) {
            this.state = 'follow';
            this.stateTimer = 0.5;
            return;
        }

        // Check for nearby mobs
        if (mobManager && mobManager.mobs) {
            let nearest = null;
            let minDistSq = 400; // 20 units
            let boss = null;
            let bossDistSq = 2500;

            for (let i = 0; i < mobManager.mobs.length; i++) {
                const m = mobManager.mobs[i];
                if (!m.alive) continue;
                const dx = m.x - this.group.position.x;
                const dz = m.z - this.group.position.z;
                const dSq = dx * dx + dz * dz;
                if (m.isBoss && dSq < bossDistSq) { bossDistSq = dSq; boss = m; }
                if (dSq < minDistSq) { minDistSq = dSq; nearest = m; }
            }

            if (boss) { nearest = boss; minDistSq = bossDistSq; }

            if (nearest) {
                this.combatTarget = nearest;
                const ranges = CONFIG.CLASS_RANGES[this.classId] || CONFIG.CLASS_RANGES.warrior;
                const dist = Math.sqrt(minDistSq);

                if (ranges.kite && dist < ranges.min) {
                    _fpDir.copy(this.group.position).sub(_fpSubVec.set(nearest.x, 0, nearest.z)).normalize();
                    this.target.copy(this.group.position).add(_fpDir.multiplyScalar(ranges.ideal - dist));
                    this.state = 'wander';
                    this.stateTimer = 1.0;
                    return;
                }

                if (dist > ranges.ideal + 1.0) {
                    // Chance to "dash" or "charge" to target
                    if (this.state !== 'approach' && Math.random() < 0.2) {
                        this.state = 'dash';
                        this.stateTimer = 1.0;
                        if (this.classId === 'warrior') this.say("Charge!");
                        if (this.classId === 'mage') this.say("Blink!");
                    } else {
                        this.state = 'approach';
                    }
                    this.target.set(nearest.x, 0, nearest.z);
                } else if (dist < ranges.max) {
                    this.state = 'combat';
                } else {
                    this.target.set(nearest.x, 0, nearest.z);
                    this.state = 'approach';
                }
                this.stateTimer = nearest.isBoss ? 0.2 : (0.5 + Math.random());
                return;
            }
        }

        // Default behaviors: Questing, Wandering, or AFK
        const roll = Math.random();
        if (roll < 0.05) {
            this.state = 'idle';
            this.stateTimer = 10 + Math.random() * 20;
            if (Math.random() < 0.3) this.say(Math.random() < 0.5 ? "brb bio" : "AFK a sec");
        } else if (roll < 0.4 && this.isQuesting) {
            // Questing: go to a specific spot
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 25;
            this.target.set(this.group.position.x + Math.cos(angle) * dist, 0, this.group.position.z + Math.sin(angle) * dist);
            this.state = 'quest';
            this.stateTimer = 10;
        } else {
            // Standard wander
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 10;
            this.target.set(this.group.position.x + Math.cos(angle) * dist, 0, this.group.position.z + Math.sin(angle) * dist);
            this.state = 'wander';
            this.stateTimer = 5;
        }
    }

    say(text) {
        this.lastMessage = text;
        this.messageTime = Date.now();
        this.showBubble = true;
        gameState.addChatMessage('Say', this.name, text);
        setTimeout(() => { if (this.lastMessage === text) this.showBubble = false; }, 5000);
    }

    destroy() {
        this.scene.remove(this.group);
    }
}
