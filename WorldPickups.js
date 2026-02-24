// WorldPickups — 3D collectible objects that spawn on the world map
// Players auto-collect these when in range and out of combat
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { questLog } from './QuestLog.js';
import { goldShop } from './GoldShop.js';

export class WorldPickups {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.pickups = [];    // { def, x, z, group, available, respawnTimer, bobPhase }
        this.pickupRange = 2.5;

        // Shared geometry for collection sparkle particles (avoid creating per-particle)
        this._collectSparkGeo = new THREE.SphereGeometry(0.03, 4, 4);

        this.spawnForZone(gameState.currentZoneId);
    }

    /** Remove all pickups and respawn for a new zone */
    resetForZone(zoneId, world) {
        this.despawnAll();
        this.world = world;
        this.spawnForZone(zoneId);
    }

    despawnAll() {
        for (const p of this.pickups) {
            if (p.group) {
                this.scene.remove(p.group);
                p.group.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) {
                        if (c.material.map) c.material.map.dispose();
                        c.material.dispose();
                    }
                });
            }
        }
        this.pickups = [];

        // Clean up any lingering collection particles
        if (this._collectParticles) {
            for (const p of this._collectParticles) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
            }
            this._collectParticles = [];
        }
    }

    spawnForZone(zoneId) {
        const defs = CONFIG.WORLD_PICKUPS[zoneId];
        if (!defs) return;

        for (const def of defs) {
            for (let i = 0; i < def.count; i++) {
                const pos = this.world.getRandomOpenPosition(1.5, 30);
                this._createPickup(def, pos.x, pos.z);
            }
        }
    }

    _createPickup(def, x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Build the 3D model based on type
        if (def.modelType === 'flower') {
            this._buildFlower(group, def.color, def.emissive);
        } else if (def.modelType === 'orchid') {
            this._buildOrchid(group, def.color, def.emissive);
        } else if (def.modelType === 'crystal') {
            this._buildCrystal(group, def.color, def.emissive);
        } else if (def.modelType === 'magma_crystal') {
            this._buildMagmaCrystal(group, def.color, def.emissive);
        } else if (def.modelType === 'ashbloom') {
            this._buildAshbloom(group, def.color, def.emissive);
        } else if (def.modelType === 'pearl') {
            this._buildPearl(group, def.color, def.emissive);
        } else if (def.modelType === 'kelp') {
            this._buildKelp(group, def.color, def.emissive);
        }

        // Glowing point light
        const light = new THREE.PointLight(def.emissive, 0.6, 6, 2);
        light.position.y = 0.5;
        group.add(light);

        this.scene.add(group);

        this.pickups.push({
            def,
            x, z,
            group,
            light,
            available: true,
            respawnTimer: 0,
            bobPhase: Math.random() * Math.PI * 2,
        });
    }

    _buildFlower(group, color, emissive) {
        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 5);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.8 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.2;
        group.add(stem);

        // Petals (5 arranged in a circle)
        const petalMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.4,
            roughness: 0.5,
            side: THREE.DoubleSide,
        });
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const petalGeo = new THREE.CircleGeometry(0.12, 6);
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.position.set(
                Math.cos(angle) * 0.08,
                0.42,
                Math.sin(angle) * 0.08
            );
            petal.rotation.x = -0.6;
            petal.rotation.y = angle;
            group.add(petal);
        }

        // Center
        const centerGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const centerMat = new THREE.MeshStandardMaterial({
            color: 0xffee55,
            emissive: 0xffdd22,
            emissiveIntensity: 0.6,
        });
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.y = 0.44;
        group.add(center);

        // Leaves at base
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.7, side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) {
            const lAngle = (i / 3) * Math.PI * 2 + 0.3;
            const leafGeo = new THREE.PlaneGeometry(0.15, 0.08);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(Math.cos(lAngle) * 0.06, 0.06, Math.sin(lAngle) * 0.06);
            leaf.rotation.x = -0.3;
            leaf.rotation.y = lAngle;
            group.add(leaf);
        }
    }

    _buildOrchid(group, color, emissive) {
        // Taller, more elegant flower
        const stemGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.55, 5);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x1a4a12, roughness: 0.8 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.275;
        group.add(stem);

        // Large petals (3 outer, 3 inner)
        const petalMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.5,
            roughness: 0.4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
        });
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const petalGeo = new THREE.PlaneGeometry(0.18, 0.12);
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.position.set(
                Math.cos(angle) * 0.08,
                0.58,
                Math.sin(angle) * 0.08
            );
            petal.rotation.x = -0.5;
            petal.rotation.y = angle;
            group.add(petal);
        }
        // Inner petals (smaller, tilted more)
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.PI / 3;
            const petalGeo = new THREE.PlaneGeometry(0.1, 0.08);
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.position.set(
                Math.cos(angle) * 0.04,
                0.60,
                Math.sin(angle) * 0.04
            );
            petal.rotation.x = -0.9;
            petal.rotation.y = angle;
            group.add(petal);
        }

        // Glowing pistil
        const pistilGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.12, 5);
        const pistilMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive,
            emissiveIntensity: 0.8,
        });
        const pistil = new THREE.Mesh(pistilGeo, pistilMat);
        pistil.position.y = 0.62;
        group.add(pistil);

        // Sparkle sphere at top
        const sparkleGeo = new THREE.SphereGeometry(0.03, 6, 6);
        const sparkleMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.7,
        });
        const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
        sparkle.position.y = 0.7;
        group.add(sparkle);
    }

    _buildCrystal(group, color, emissive) {
        // Ice/crystal shard sticking out of the ground
        const crystalMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.5,
            roughness: 0.1,
            metalness: 0.4,
            transparent: true,
            opacity: 0.8,
        });

        // Main shard
        const mainGeo = new THREE.ConeGeometry(0.08, 0.5, 5);
        const main = new THREE.Mesh(mainGeo, crystalMat);
        main.position.y = 0.25;
        main.rotation.x = 0.1;
        group.add(main);

        // Smaller shard
        const smallGeo = new THREE.ConeGeometry(0.04, 0.3, 4);
        const small = new THREE.Mesh(smallGeo, crystalMat);
        small.position.set(0.06, 0.15, 0.04);
        small.rotation.z = -0.3;
        group.add(small);

        // Glowing base
        const baseGeo = new THREE.SphereGeometry(0.1, 6, 4);
        const baseMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.3,
            roughness: 0.3,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.05;
        base.scale.y = 0.4;
        group.add(base);
    }

    _buildMagmaCrystal(group, color, emissive) {
        // Jagged volcanic crystal — glowing molten rock shard
        const crystalMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.7,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
        });

        // Main shard — angular
        const mainGeo = new THREE.ConeGeometry(0.1, 0.55, 4);
        const main = new THREE.Mesh(mainGeo, crystalMat);
        main.position.y = 0.28;
        main.rotation.x = 0.15;
        group.add(main);

        // Second smaller shard
        const smallGeo = new THREE.ConeGeometry(0.06, 0.35, 4);
        const small = new THREE.Mesh(smallGeo, crystalMat);
        small.position.set(0.08, 0.18, 0.05);
        small.rotation.z = -0.4;
        small.rotation.x = 0.1;
        group.add(small);

        // Third tiny shard
        const tinyGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
        const tiny = new THREE.Mesh(tinyGeo, crystalMat);
        tiny.position.set(-0.06, 0.12, -0.04);
        tiny.rotation.z = 0.3;
        group.add(tiny);

        // Glowing lava base pool
        const baseGeo = new THREE.CircleGeometry(0.12, 8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            emissive: 0xff4400,
            emissiveIntensity: 0.5,
            roughness: 0.2,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.rotation.x = -Math.PI / 2;
        base.position.y = 0.03;
        group.add(base);
    }

    _buildAshbloom(group, color, emissive) {
        // Volcanic flower — thrives in heat, fiery petals, charred stem
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.35, 5);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.9 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.175;
        group.add(stem);

        // Fiery petals (6 arranged in a circle)
        const petalMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.5,
            roughness: 0.4,
            side: THREE.DoubleSide,
        });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const petalGeo = new THREE.CircleGeometry(0.1, 6);
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.position.set(
                Math.cos(angle) * 0.07,
                0.38,
                Math.sin(angle) * 0.07
            );
            petal.rotation.x = -0.5;
            petal.rotation.y = angle;
            group.add(petal);
        }

        // Glowing ember center
        const centerGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const centerMat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 1.0,
        });
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.y = 0.40;
        group.add(center);

        // Ash particles around base
        for (let i = 0; i < 3; i++) {
            const ashGeo = new THREE.SphereGeometry(0.02, 4, 4);
            const ashMat = new THREE.MeshStandardMaterial({
                color: 0x332211,
                transparent: true,
                opacity: 0.5,
            });
            const ash = new THREE.Mesh(ashGeo, ashMat);
            const aAngle = (i / 3) * Math.PI * 2;
            ash.position.set(Math.cos(aAngle) * 0.08, 0.04, Math.sin(aAngle) * 0.08);
            group.add(ash);
        }
    }

    _buildPearl(group, color, emissive) {
        // Glowing deep-sea pearl in an open shell
        // Shell base (half clam)
        const shellGeo = new THREE.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const shellMat = new THREE.MeshStandardMaterial({
            color: 0x1a2a3a,
            roughness: 0.4,
            metalness: 0.3,
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.rotation.x = Math.PI;
        shell.position.y = 0.04;
        group.add(shell);

        // Shell lip (rim)
        const rimGeo = new THREE.TorusGeometry(0.15, 0.015, 6, 12);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x2a4a5a,
            roughness: 0.3,
            metalness: 0.4,
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.04;
        group.add(rim);

        // The pearl itself (glowing sphere)
        const pearlGeo = new THREE.SphereGeometry(0.08, 10, 8);
        const pearlMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.8,
            roughness: 0.05,
            metalness: 0.6,
        });
        const pearl = new THREE.Mesh(pearlGeo, pearlMat);
        pearl.position.y = 0.12;
        group.add(pearl);

        // Inner glow halo
        const haloGeo = new THREE.SphereGeometry(0.12, 8, 6);
        const haloMat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.25,
            roughness: 0.1,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.y = 0.12;
        group.add(halo);
    }

    _buildKelp(group, color, emissive) {
        // Cluster of glowing kelp fronds rising from the ground
        const frondCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < frondCount; i++) {
            const height = 0.35 + Math.random() * 0.3;
            const angle = (i / frondCount) * Math.PI * 2 + Math.random() * 0.5;
            const dist = Math.random() * 0.06;

            // Kelp stalk
            const stalkGeo = new THREE.CylinderGeometry(0.008, 0.015, height, 4);
            const stalkMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).multiplyScalar(0.5),
                emissive,
                emissiveIntensity: 0.2,
                roughness: 0.6,
            });
            const stalk = new THREE.Mesh(stalkGeo, stalkMat);
            stalk.position.set(
                Math.cos(angle) * dist,
                height / 2,
                Math.sin(angle) * dist
            );
            stalk.rotation.x = (Math.random() - 0.5) * 0.15;
            stalk.rotation.z = (Math.random() - 0.5) * 0.15;
            group.add(stalk);

            // Kelp leaf blades (flat ovals along the stalk)
            const leafCount = 2 + Math.floor(Math.random() * 2);
            for (let l = 0; l < leafCount; l++) {
                const leafY = 0.1 + (l / leafCount) * height * 0.7;
                const side = (l % 2 === 0) ? 1 : -1;
                const leafGeo = new THREE.PlaneGeometry(0.08, 0.05);
                const leafMat = new THREE.MeshStandardMaterial({
                    color,
                    emissive,
                    emissiveIntensity: 0.4,
                    roughness: 0.4,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8,
                });
                const leaf = new THREE.Mesh(leafGeo, leafMat);
                leaf.position.set(
                    Math.cos(angle) * dist + side * 0.04,
                    leafY,
                    Math.sin(angle) * dist
                );
                leaf.rotation.y = angle + side * 0.5;
                leaf.rotation.z = side * 0.3;
                group.add(leaf);
            }
        }

        // Glowing tip sphere at top
        const tipGeo = new THREE.SphereGeometry(0.025, 6, 6);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.7,
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.y = 0.55;
        group.add(tip);

        // Anchoring base
        const baseGeo = new THREE.SphereGeometry(0.06, 6, 4);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x0a2a1a,
            roughness: 0.8,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.02;
        base.scale.y = 0.3;
        group.add(base);
    }

    /** Check if player is near any pickup and collect it. Returns collected pickups.
     *  Pickups are now collected even during combat — the player auto-grabs anything
     *  at their feet, which is natural MMO behavior and speeds up quest completion. */
    checkCollection(playerX, playerZ, inCombat) {

        const effectiveRange = this.pickupRange + goldShop.getExtraPickupRange();
        const rangeSq = effectiveRange * effectiveRange;
        const collected = [];
        for (const p of this.pickups) {
            if (!p.available) continue;
            const dx = p.x - playerX;
            const dz = p.z - playerZ;

            if (dx * dx + dz * dz < rangeSq) {
                // Collect!
                p.available = false;
                p.respawnTimer = p.def.respawnTime;
                p.group.visible = false;
                if (p.light) p.light.intensity = 0;
                collected.push(p.def);

                // Spawn sparkle collection effect
                this._spawnCollectEffect(p.x, p.z, p.def.color);

                // Dispatch to quest log
                questLog.onPickupCollected(p.def.id);

                // Game log + chat
                gameState.addGameLog(`Collected ${p.def.name}!`);
            }
        }
        return collected;
    }

    /** Spawn a sparkle burst when a pickup is collected */
    _spawnCollectEffect(x, z, color) {
        const particleCount = 12;
        const particles = [];
        const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1,
        });

        for (let i = 0; i < particleCount; i++) {
            // Reuse shared geometry — only material is per-particle
            const mesh = new THREE.Mesh(this._collectSparkGeo, mat.clone());
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 1.5 + Math.random() * 1.5;
            mesh.position.set(x, 0.3 + Math.random() * 0.3, z);
            this.scene.add(mesh);
            particles.push({
                mesh,
                vx: Math.cos(angle) * speed,
                vy: 2 + Math.random() * 2,
                vz: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.3,
            });
        }

        if (!this._collectParticles) this._collectParticles = [];
        this._collectParticles.push(...particles);
    }

    /** Find the nearest available pickup. Used by IdleEngine to navigate to pickups. */
    findNearest(playerX, playerZ) {
        let nearest = null;
        let nearestDistSq = Infinity;

        for (const p of this.pickups) {
            if (!p.available) continue;
            const dx = p.x - playerX;
            const dz = p.z - playerZ;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = p;
            }
        }
        return nearest ? { x: nearest.x, z: nearest.z, dist: Math.sqrt(nearestDistSq), def: nearest.def } : null;
    }

    /** Find nearest pickup that is needed by an active quest (uses cached _neededSet) */
    findNearestNeeded(playerX, playerZ) {
        // Ensure _neededSet is populated (it's rebuilt every frame in update())
        const needed = this._neededSet;
        if (!needed || needed.size === 0) return null;

        let nearest = null;
        let nearestDistSq = Infinity;

        for (const p of this.pickups) {
            if (!p.available) continue;
            if (!needed.has(p.def.id)) continue;
            const dx = p.x - playerX;
            const dz = p.z - playerZ;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDistSq) {
                nearestDistSq = distSq;
                nearest = p;
            }
        }
        return nearest ? { x: nearest.x, z: nearest.z, dist: Math.sqrt(nearestDistSq), def: nearest.def } : null;
    }

    /** Check if there's an active quest needing a specific pickup id (legacy, uses cached set) */
    needsPickup(pickupId) {
        return this._neededSet ? this._neededSet.has(pickupId) : false;
    }

    update(dt, time) {
        // Build a set of needed pickup IDs once per frame (avoid per-pickup quest iteration)
        this._neededSet = this._neededSet || new Set();
        this._neededSet.clear();
        for (const q of questLog.activeQuests) {
            if (q.completed) continue;
            for (const obj of q.objectives) {
                if (obj.type === 'collect_pickup' && obj.current < obj.target) {
                    this._neededSet.add(obj.pickupId);
                }
            }
        }

        for (const p of this.pickups) {
            if (!p.available) {
                // Respawn timer
                p.respawnTimer -= dt;
                if (p.respawnTimer <= 0) {
                    p.available = true;
                    p.group.visible = true;
                    if (p.light) p.light.intensity = 0.6;

                    // Reposition to a new random spot
                    const pos = this.world.getRandomOpenPosition(1.5, 30);
                    p.x = pos.x;
                    p.z = pos.z;
                    p.group.position.set(p.x, 0, p.z);
                }
                continue;
            }

            // Bobbing animation
            p.bobPhase += dt * 2.5;
            p.group.position.y = Math.sin(p.bobPhase) * 0.06;

            // Gentle rotation
            p.group.rotation.y += dt * 0.5;

            // Pulse the light — brighter if quest-relevant (uses cached set)
            if (p.light) {
                const needed = this._neededSet.has(p.def.id);
                const baseIntensity = needed ? 0.6 : 0.35;
                const pulseAmp = needed ? 0.35 : 0.2;
                p.light.intensity = baseIntensity + Math.sin(p.bobPhase * 1.3) * pulseAmp;
            }
        }

        // Update collection sparkle particles — swap-and-pop for O(1) removal
        if (this._collectParticles && this._collectParticles.length > 0) {
            let wIdx = 0;
            for (let i = 0; i < this._collectParticles.length; i++) {
                const p = this._collectParticles[i];
                p.life -= dt;
                if (p.life <= 0) {
                    this.scene.remove(p.mesh);
                    // Only dispose material — geometry is shared (_collectSparkGeo)
                    p.mesh.material.dispose();
                    continue;
                }
                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                p.vy -= 6 * dt; // gravity
                p.mesh.material.opacity = Math.max(0, p.life / 0.6);
                p.mesh.scale.setScalar(Math.max(0.1, p.life));
                if (wIdx !== i) this._collectParticles[wIdx] = p;
                wIdx++;
            }
            this._collectParticles.length = wIdx;
        }
    }

    /** Get all available quest-relevant pickups for minimap rendering */
    getQuestPickupPositions() {
        const positions = [];
        const needed = this._neededSet || new Set();
        for (const p of this.pickups) {
            if (!p.available) continue;
            if (!needed.has(p.def.id)) continue;
            positions.push({ x: p.x, z: p.z, color: p.def.color });
        }
        return positions;
    }
}
