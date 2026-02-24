// World Builder - Zone-aware environment with UE5-style lighting
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';

export class World {
    constructor(scene, textureLoader) {
        this.scene = scene;
        this.loader = textureLoader;
        this.trees = [];
        this.rocks = [];
        this.bushes = [];
        this.ferns = [];
        this.particles = [];
        this.godRays = [];
        this.groundMesh = null;
        this.lights = [];
        this._worldObjects = []; // track all zone objects for cleanup
        
        // Minimum spacing constants to prevent object clusters
        this._minTreeSpacing = 8;     // large objects (trees, crystals, spires, corals)
        this._minRockSpacing = 5;     // medium objects (rocks)
        this._minBushSpacing = 4;     // small objects (bushes, drifts, mounds, kelp)
        this._centerClearRadius = 8;  // keep area around spawn clear
        this._neonPulse = 0;
        
        // Audio-visual sync hook
        window._onMusicGlitch = () => {
            this._neonPulse = 1.0;
        };
    }

    async buildWorld() {
        const zone = gameState.getCurrentZone();
        await this._buildForZone(zone);
    }

    /** Destroy all zone objects and rebuild for a new zone */
    async rebuildForZone(zoneId) {
        this._clearWorld();
        const zone = CONFIG.getZone(zoneId);
        await this._buildForZone(zone);
    }

    _yield() {
        return new Promise(r => setTimeout(r, 0));
    }

    _clearWorld() {
        // Remove all tracked objects
        for (const obj of this._worldObjects) {
            this.scene.remove(obj);
            if (obj.traverse) {
                obj.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                        } else {
                            if (child.material.map) child.material.map.dispose();
                            child.material.dispose();
                        }
                    }
                });
            }
        }
        this._worldObjects = [];
        this.trees = [];
        this.rocks = [];
        this.bushes = [];
        this.ferns = [];
        this.godRays = [];
        this.groundMesh = null;
        this.particleSystem = null;
        this.dirLight = null;
        this.lights = [];

        // Remove fog
        this.scene.fog = null;
    }

    async _buildForZone(zone) {
        if (zone.id === 'verdant_wilds') {
            await this._buildVerdantWilds(zone);
        } else if (zone.id === 'shattered_expanse') {
            await this._buildShatteredExpanse(zone);
        } else if (zone.id === 'molten_abyss') {
            await this._buildMoltenAbyss(zone);
        } else if (zone.id === 'abyssal_depths') {
            await this._buildAbyssalDepths(zone);
        } else if (zone.id === 'neon_wastes') {
            await this._buildNeonWastes(zone);
        } else if (zone.id === 'halo_ring') {
            await this._buildHaloRing(zone);
        } else if (zone.id === 'crimson_reach') {
            await this._buildCrimsonReach(zone);
        } else {
            // fallback
            await this._buildVerdantWilds(zone);
        }
    }

    _track(obj) {
        this._worldObjects.push(obj);
        return obj;
    }

    /**
     * Get the terrain height at a specific world position.
     * @param {number} x - world X position
     * @param {number} z - world Z position
     * @returns {number} - terrain Y position
     */
    getTerrainHeight(x, z) {
        if (!this._heightFunc) return 0;
        // In the displacement logic, PlaneGeometry's 'y' coordinate is world 'z'
        // and its 'z' coordinate becomes world 'y' after the -PI/2 rotation.
        return this._heightFunc(x, z);
    }

    /**
     * Generate a position that respects minimum spacing from existing placed objects.
     * @param {Array} placedList - array of {x, z} already placed objects to check against
     * @param {number} minSpacing - minimum distance from other placed objects
     * @param {number} minDist - minimum distance from world center
     * @param {number} maxDist - maximum distance from world center
     * @param {number} maxAttempts - max random attempts before fallback
     * @returns {{x: number, z: number}|null}
     */
    _getSpacedPosition(placedList, minSpacing, minDist, maxDist, maxAttempts = 40) {
        const clearR = this._centerClearRadius;
        const effectiveMinDist = Math.max(minDist, clearR);
        for (let a = 0; a < maxAttempts; a++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = effectiveMinDist + Math.random() * (maxDist - effectiveMinDist);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            
            // Check spacing against all placed objects
            let tooClose = false;
            for (let i = 0; i < placedList.length; i++) {
                const dx = x - placedList[i].x;
                const dz = z - placedList[i].z;
                if (dx * dx + dz * dz < minSpacing * minSpacing) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) return { x, z };
        }
        // Fallback — place it further out to avoid clusters
        const angle = Math.random() * Math.PI * 2;
        const dist = maxDist * 0.9 + Math.random() * maxDist * 0.1;
        return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist };
    }

    /**
     * Generate a position for rectangular area placement with spacing.
     * Used for rocks, bushes, ferns that use (random-0.5)*WORLD_SIZE style placement.
     */
    _getSpacedRectPosition(placedList, minSpacing, spread, maxAttempts = 40) {
        const clearR = this._centerClearRadius;
        for (let a = 0; a < maxAttempts; a++) {
            const x = (Math.random() - 0.5) * spread;
            const z = (Math.random() - 0.5) * spread;
            // Skip if too close to center
            if (x * x + z * z < clearR * clearR) continue;
            // Check spacing
            let tooClose = false;
            for (let i = 0; i < placedList.length; i++) {
                const dx = x - placedList[i].x;
                const dz = z - placedList[i].z;
                if (dx * dx + dz * dz < minSpacing * minSpacing) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) return { x, z };
        }
        const x = (Math.random() - 0.5) * spread;
        const z = (Math.random() - 0.5) * spread;
        return { x, z };
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 1 — VERDANT WILDS (original jungle forest)
    // ═══════════════════════════════════════════════════════════
    async _buildVerdantWilds(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createForestGround(zone);
        await this._yield();
        this._createForestTrees(zone);
        await this._yield();
        this._createForestRocks(zone);
        await this._yield();
        this._createForestBushes();
        this._createForestFerns();
        this._createGodRays(zone.colors.godRayColor, 0.04);
        this._createParticles(zone.colors.particleColor);
        this._createCanopyOverlay(zone);
        this._createForestLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    _createForestGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(20, 20);
        groundTex.colorSpace = THREE.SRGBColorSpace;
        
        // Define height function for this zone
        this._heightFunc = (x, z) => {
            return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.3 +
                   Math.sin(x * 0.3) * Math.cos(z * 0.2) * 0.15;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 32, 32);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();
        
        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.95, metalness: 0.0, color: 0x556644,
        });
        
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));
        
        // Moss patches (decorative only, no collision)
        for (let i = 0; i < 25; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const scale = 1 + Math.random() * 3;
            const mossGeo = new THREE.CircleGeometry(scale, 8);
            const mossMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.6, 0.15 + Math.random() * 0.1),
                roughness: 1.0, transparent: true, opacity: 0.7,
            });
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.rotation.x = -Math.PI / 2;
            moss.position.set(x, 0.02, z);
            this.scene.add(this._track(moss));
        }
    }

    _createForestTree(x, z, scale, zone) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        
        const barkTex = this.loader.load(zone.textures.bark);
        barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
        barkTex.repeat.set(1, 3);
        barkTex.colorSpace = THREE.SRGBColorSpace;

        const trunkHeight = (6 + Math.random() * 8) * scale;
        const trunkRadius = (0.4 + Math.random() * 0.4) * scale;
        const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, trunkHeight, 8, 4);
        
        const trunkPosAttr = trunkGeo.attributes.position;
        for (let i = 0; i < trunkPosAttr.count; i++) {
            const y = trunkPosAttr.getY(i);
            const bendAmount = (y / trunkHeight) * (Math.random() - 0.5) * 0.5;
            trunkPosAttr.setX(i, trunkPosAttr.getX(i) + bendAmount);
        }
        
        const trunkMat = new THREE.MeshStandardMaterial({
            map: barkTex, roughness: 0.95, metalness: 0.0,
            color: new THREE.Color().setHSL(0.08, 0.4, 0.15 + Math.random() * 0.08),
        });
        
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Roots
        for (let r = 0; r < 3 + Math.floor(Math.random() * 3); r++) {
            const rootAngle = (r / 5) * Math.PI * 2 + Math.random() * 0.5;
            const rootLen = trunkRadius * (2 + Math.random() * 2);
            const rootGeo = new THREE.CylinderGeometry(0.05 * scale, trunkRadius * 0.3, rootLen, 5);
            const root = new THREE.Mesh(rootGeo, trunkMat);
            root.position.set(Math.cos(rootAngle) * rootLen * 0.4, 0.15, Math.sin(rootAngle) * rootLen * 0.4);
            root.rotation.z = Math.PI / 2 - 0.3;
            root.rotation.y = rootAngle;
            root.castShadow = true;
            root.receiveShadow = true;
            group.add(root);
        }

        // Canopy
        const canopyBaseY = trunkHeight * 0.65;
        const canopyLayers = 3 + Math.floor(Math.random() * 3);
        for (let c = 0; c < canopyLayers; c++) {
            const cRadius = (2 + Math.random() * 3) * scale;
            const cY = canopyBaseY + c * 1.5 * scale + Math.random() * 2;
            const cX = (Math.random() - 0.5) * 2 * scale;
            const cZ = (Math.random() - 0.5) * 2 * scale;
            const canopyGeo = new THREE.SphereGeometry(cRadius, 8, 6);
            const cPosAttr = canopyGeo.attributes.position;
            for (let i = 0; i < cPosAttr.count; i++) {
                const vx = cPosAttr.getX(i);
                const vy = cPosAttr.getY(i);
                const vz = cPosAttr.getZ(i);
                const noise = 1 + (Math.sin(vx * 3) * Math.cos(vz * 3) * 0.2);
                cPosAttr.setX(i, vx * noise);
                cPosAttr.setY(i, vy * (0.6 + Math.random() * 0.2));
                cPosAttr.setZ(i, vz * noise);
            }
            canopyGeo.computeVertexNormals();
            const canopyMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.08, 0.5 + Math.random() * 0.3, 0.1 + Math.random() * 0.12),
                roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide,
            });
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.set(cX, cY, cZ);
            canopy.castShadow = true;
            canopy.receiveShadow = true;
            group.add(canopy);
        }

        // Vines
        const vineCount = Math.floor(Math.random() * 4);
        for (let v = 0; v < vineCount; v++) {
            const vineAngle = Math.random() * Math.PI * 2;
            const vineX = Math.cos(vineAngle) * (1.5 + Math.random()) * scale;
            const vineZ = Math.sin(vineAngle) * (1.5 + Math.random()) * scale;
            const vineHeight = 2 + Math.random() * 4;
            const vineStartY = canopyBaseY + Math.random() * 3;
            const vineGeo = new THREE.CylinderGeometry(0.02, 0.03, vineHeight, 4);
            const vineMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.3, 0.5, 0.15), roughness: 0.9 });
            const vine = new THREE.Mesh(vineGeo, vineMat);
            vine.position.set(vineX, vineStartY - vineHeight / 2, vineZ);
            group.add(vine);
            for (let l = 0; l < 3; l++) {
                const leafGeo = new THREE.PlaneGeometry(0.15, 0.2);
                const leafMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.3, 0.6, 0.2), side: THREE.DoubleSide, roughness: 0.8 });
                const leaf = new THREE.Mesh(leafGeo, leafMat);
                leaf.position.set(vineX + (Math.random() - 0.5) * 0.3, vineStartY - vineHeight * (l / 3) - Math.random(), vineZ + (Math.random() - 0.5) * 0.3);
                leaf.rotation.set(Math.random(), Math.random(), Math.random());
                group.add(leaf);
            }
        }

        this.scene.add(this._track(group));
        this.trees.push({ group, x, z, radius: trunkRadius + 0.3 });
        return group;
    }

    async _createForestTrees(zone) {
        const placed = [];
        for (let i = 0; i < CONFIG.TREE_COUNT; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            const scale = 0.7 + Math.random() * 0.8;
            this._createForestTree(pos.x, pos.z, scale, zone);
            placed.push(pos);
            if (i % 3 === 0) await this._yield();
        }
        // Perimeter trees
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            this._createForestTree(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.2 + Math.random() * 0.5, zone);
            if (i % 3 === 0) await this._yield();
        }
    }

    async _createForestRocks(zone) {
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;
        
        const placed = [];
        for (let i = 0; i < CONFIG.ROCK_COUNT; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2;
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                const rx = rpa.getX(j); const ry = rpa.getY(j); const rz = rpa.getZ(j);
                const n = 1 + (Math.sin(rx * 5) * Math.cos(rz * 5) * 0.15);
                rpa.setX(j, rx * n); rpa.setY(j, ry * 0.6); rpa.setZ(j, rz * n);
            }
            rockGeo.computeVertexNormals();
            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.9, metalness: 0.1,
                color: new THREE.Color().setHSL(0.25, 0.2, 0.2 + Math.random() * 0.1),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.3; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true; rock.receiveShadow = true;
            group.add(rock);
            const mossGeo = new THREE.SphereGeometry(scale * 0.7, 6, 4);
            const mossMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.3, 0.6, 0.15), roughness: 1.0 });
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.position.y = scale * 0.5; moss.scale.y = 0.3;
            group.add(moss);
            this.scene.add(this._track(group));
            this.rocks.push({ group, x, z, radius: scale * 0.6 + 0.3 });
            if (i % 8 === 0) await this._yield();
        }
    }

    async _createForestBushes() {
        const placed = [];
        for (let i = 0; i < CONFIG.BUSH_COUNT; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.3 + Math.random() * 0.8;
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            const bushCount = 2 + Math.floor(Math.random() * 3);
            for (let b = 0; b < bushCount; b++) {
                const bRadius = (0.3 + Math.random() * 0.5) * scale;
                const bushGeo = new THREE.SphereGeometry(bRadius, 6, 5);
                const bpa = bushGeo.attributes.position;
                for (let j = 0; j < bpa.count; j++) {
                    const noise = 1 + (Math.random() - 0.5) * 0.3;
                    bpa.setX(j, bpa.getX(j) * noise); bpa.setZ(j, bpa.getZ(j) * noise);
                }
                bushGeo.computeVertexNormals();
                const bushMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.27 + Math.random() * 0.06, 0.5 + Math.random() * 0.3, 0.08 + Math.random() * 0.12),
                    roughness: 0.9,
                });
                const bush = new THREE.Mesh(bushGeo, bushMat);
                bush.position.set((Math.random() - 0.5) * scale, bRadius * 0.7, (Math.random() - 0.5) * scale);
                bush.castShadow = false;
                group.add(bush);
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x, z });
            if (i % 10 === 0) await this._yield();
        }
    }

    async _createForestFerns() {
        const placed = [];
        for (let i = 0; i < CONFIG.FERN_COUNT; i++) {
            const pos = this._getSpacedRectPosition(placed, 3, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.3 + Math.random() * 0.6;
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            const frondCount = 4 + Math.floor(Math.random() * 4);
            for (let f = 0; f < frondCount; f++) {
                const angle = (f / frondCount) * Math.PI * 2 + Math.random() * 0.3;
                const frondLen = (0.5 + Math.random() * 0.8) * scale;
                const frondGeo = new THREE.PlaneGeometry(frondLen * 0.3, frondLen);
                const frondMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.3 + Math.random() * 0.05, 0.6, 0.15 + Math.random() * 0.1),
                    side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.9,
                });
                const frond = new THREE.Mesh(frondGeo, frondMat);
                frond.position.set(Math.cos(angle) * frondLen * 0.3, frondLen * 0.4, Math.sin(angle) * frondLen * 0.3);
                frond.rotation.x = -0.3 - Math.random() * 0.4;
                frond.rotation.y = angle;
                group.add(frond);
            }
            this.scene.add(this._track(group));
            this.ferns.push({ group, x, z });
            if (i % 15 === 0) await this._yield();
        }
    }

    _createCanopyOverlay(zone) {
        const canopyTex = this.loader.load(zone.textures.canopy);
        canopyTex.wrapS = canopyTex.wrapT = THREE.RepeatWrapping;
        canopyTex.repeat.set(6, 6);
        canopyTex.colorSpace = THREE.SRGBColorSpace;
        const canopyGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2);
        const canopyMat = new THREE.MeshBasicMaterial({
            map: canopyTex, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false, color: 0x224411,
        });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = 25; canopy.rotation.x = -Math.PI / 2;
        this.scene.add(this._track(canopy));
    }

    _createForestLighting(zone) {
        const ambient = new THREE.AmbientLight(0x1a3a1a, 0.6);
        this.scene.add(this._track(ambient));
        
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 1.2);
        dirLight.position.set(15, 30, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;
        
        const fillLight = new THREE.DirectionalLight(0xddccaa, 0.3);
        fillLight.position.set(-10, 15, -5);
        this.scene.add(this._track(fillLight));
        
        const bounceLight = new THREE.HemisphereLight(0x88aa66, 0x224411, 0.4);
        this.scene.add(this._track(bounceLight));
        
        // Reduced from 5 to 3 spotlights for performance (barely visible difference)
        for (let i = 0; i < 3; i++) {
            const spot = new THREE.SpotLight(0xffffaa, 1.5, 15, Math.PI / 6, 0.5, 1);
            spot.position.set((Math.random() - 0.5) * 30, 15 + Math.random() * 10, (Math.random() - 0.5) * 30);
            spot.target.position.set(spot.position.x + (Math.random() - 0.5) * 5, 0, spot.position.z + (Math.random() - 0.5) * 5);
            this.scene.add(this._track(spot));
            this.scene.add(this._track(spot.target));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 2 — SHATTERED EXPANSE (frozen crystalline wastes)
    // ═══════════════════════════════════════════════════════════
    async _buildShatteredExpanse(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createFrozenGround(zone);
        await this._yield();
        this._createIceCrystals(zone);
        await this._yield();
        this._createFrozenRocks(zone);
        await this._yield();
        this._createSnowDrifts();
        this._createIceShards();
        this._createGodRays(zone.colors.godRayColor, 0.03);
        this._createParticles(zone.colors.particleColor);
        this._createFrozenLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    _createFrozenGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(16, 16);
        groundTex.colorSpace = THREE.SRGBColorSpace;
        
        // Define height function for this zone
        this._heightFunc = (x, z) => {
            return Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.5 +
                   Math.sin(x * 0.2) * Math.cos(z * 0.15) * 0.2;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 24, 24);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();
        
        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.4, metalness: 0.2, color: 0x3a5577,
        });
        
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));

        // Frost patches
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const scale = 1.5 + Math.random() * 4;
            const frostGeo = new THREE.CircleGeometry(scale, 10);
            const frostMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.55 + Math.random() * 0.05, 0.3, 0.4 + Math.random() * 0.2),
                roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.5,
            });
            const frost = new THREE.Mesh(frostGeo, frostMat);
            frost.rotation.x = -Math.PI / 2;
            frost.position.set(x, 0.03, z);
            this.scene.add(this._track(frost));
        }
    }

    async _createIceCrystals(zone) {
        // Large ice crystal formations (replaces trees as landmark objects)
        const crystalCount = 22;
        const placed = [];
        for (let i = 0; i < crystalCount; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.5;
            
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Main crystal spire
            const spireCount = 1 + Math.floor(Math.random() * 4);
            for (let s = 0; s < spireCount; s++) {
                const height = (3 + Math.random() * 8) * scale;
                const radius = (0.3 + Math.random() * 0.5) * scale;
                const geo = new THREE.ConeGeometry(radius, height, 5 + Math.floor(Math.random() * 3));
                
                // Deform for natural crystal look
                const pa = geo.attributes.position;
                for (let j = 0; j < pa.count; j++) {
                    const vx = pa.getX(j);
                    const vy = pa.getY(j);
                    const vz = pa.getZ(j);
                    const n = 1 + (Math.sin(vy * 2 + j) * 0.15);
                    pa.setX(j, vx * n);
                    pa.setZ(j, vz * n);
                }
                geo.computeVertexNormals();
                
                const hue = 0.55 + Math.random() * 0.1;
                const mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.4 + Math.random() * 0.3, 0.2 + Math.random() * 0.3),
                    roughness: 0.1 + Math.random() * 0.2,
                    metalness: 0.3 + Math.random() * 0.3,
                    transparent: true,
                    opacity: 0.75 + Math.random() * 0.2,
                    emissive: new THREE.Color().setHSL(hue, 0.5, 0.05),
                    emissiveIntensity: 0.3,
                });
                
                const crystal = new THREE.Mesh(geo, mat);
                crystal.position.set(
                    (Math.random() - 0.5) * scale,
                    height / 2,
                    (Math.random() - 0.5) * scale
                );
                // Tilt slightly
                crystal.rotation.x = (Math.random() - 0.5) * 0.3;
                crystal.rotation.z = (Math.random() - 0.5) * 0.3;
                crystal.castShadow = false;
                crystal.receiveShadow = false;
                group.add(crystal);
            }
            
            // Glowing base
            const baseGeo = new THREE.SphereGeometry(scale * 0.8, 8, 6);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x1a3355,
                emissive: 0x1144aa,
                emissiveIntensity: 0.15,
                roughness: 0.3,
                metalness: 0.5,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = scale * 0.2;
            base.scale.y = 0.4;
            group.add(base);
            
            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: scale * 0.6 + 0.2 });
            if (i % 6 === 0) await this._yield();
        }
        
        // Perimeter crystals
        for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const scale = 1.5 + Math.random() * 1.0;
            
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            
            const height = (6 + Math.random() * 10) * scale;
            const radius = (0.5 + Math.random() * 0.6) * scale;
            const geo = new THREE.ConeGeometry(radius, height, 6);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.57, 0.3, 0.15),
                roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.6,
            });
            const crystal = new THREE.Mesh(geo, mat);
            crystal.position.y = height / 2;
            crystal.rotation.x = (Math.random() - 0.5) * 0.2;
            crystal.castShadow = false;
            group.add(crystal);
            
            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: radius + 0.2 });
            if (i % 6 === 0) await this._yield();
        }
    }

    async _createFrozenRocks(zone) {
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;
        
        const placed = [];
        for (let i = 0; i < 14; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2.5;
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            
            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                const rx = rpa.getX(j); const rz = rpa.getZ(j);
                const n = 1 + (Math.sin(rx * 4) * Math.cos(rz * 4) * 0.2);
                rpa.setX(j, rpa.getX(j) * n);
                rpa.setY(j, rpa.getY(j) * 0.5);
                rpa.setZ(j, rpa.getZ(j) * n);
            }
            rockGeo.computeVertexNormals();
            
            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.5, metalness: 0.3,
                color: new THREE.Color().setHSL(0.58, 0.2, 0.15 + Math.random() * 0.1),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.25; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true; rock.receiveShadow = true;
            group.add(rock);
            
            // Snow cap
            const snowGeo = new THREE.SphereGeometry(scale * 0.65, 6, 4);
            const snowMat = new THREE.MeshStandardMaterial({ color: 0xccddee, roughness: 0.6, metalness: 0.1 });
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = scale * 0.45; snow.scale.y = 0.2;
            group.add(snow);
            
            this.scene.add(this._track(group));
            this.rocks.push({ group, x, z, radius: scale * 0.6 + 0.3 });
            if (i % 8 === 0) await this._yield();
        }
    }

    async _createSnowDrifts() {
        // Snow mounds (replaces bushes)
        const placed = [];
        for (let i = 0; i < 22; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.2;
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            
            const driftCount = 1 + Math.floor(Math.random() * 3);
            for (let d = 0; d < driftCount; d++) {
                const dRadius = (0.5 + Math.random() * 0.8) * scale;
                const driftGeo = new THREE.SphereGeometry(dRadius, 8, 6);
                const dpa = driftGeo.attributes.position;
                for (let j = 0; j < dpa.count; j++) {
                    dpa.setY(j, Math.max(0, dpa.getY(j)) * 0.4);
                }
                driftGeo.computeVertexNormals();
                const driftMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.55, 0.1 + Math.random() * 0.1, 0.5 + Math.random() * 0.2),
                    roughness: 0.7, metalness: 0.05,
                });
                const drift = new THREE.Mesh(driftGeo, driftMat);
                drift.position.set((Math.random() - 0.5) * scale, 0, (Math.random() - 0.5) * scale);
                group.add(drift);
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x, z });
            if (i % 10 === 0) await this._yield();
        }
    }

    async _createIceShards() {
        // Small ice shards on the ground (replaces ferns)
        const placed = [];
        for (let i = 0; i < 30; i++) {
            const pos = this._getSpacedRectPosition(placed, 3, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.2 + Math.random() * 0.5;
            const group = new THREE.Group();
            group.position.set(x, 0, z);
            
            const shardCount = 2 + Math.floor(Math.random() * 4);
            for (let s = 0; s < shardCount; s++) {
                const angle = (s / shardCount) * Math.PI * 2 + Math.random() * 0.5;
                const height = (0.3 + Math.random() * 0.6) * scale;
                const shardGeo = new THREE.ConeGeometry(0.05 * scale, height, 4);
                const shardMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.55 + Math.random() * 0.08, 0.3, 0.3 + Math.random() * 0.3),
                    transparent: true, opacity: 0.6 + Math.random() * 0.3,
                    roughness: 0.1, metalness: 0.3,
                });
                const shard = new THREE.Mesh(shardGeo, shardMat);
                shard.position.set(Math.cos(angle) * 0.2 * scale, height / 2, Math.sin(angle) * 0.2 * scale);
                shard.rotation.x = (Math.random() - 0.5) * 0.4;
                shard.rotation.z = (Math.random() - 0.5) * 0.4;
                group.add(shard);
            }
            this.scene.add(this._track(group));
            this.ferns.push({ group, x, z });
            if (i % 15 === 0) await this._yield();
        }
    }

    _createFrozenLighting(zone) {
        // Cold ambient
        const ambient = new THREE.AmbientLight(zone.colors.ambientLight, 0.5);
        this.scene.add(this._track(ambient));
        
        // Main directional — cold blue-white
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 1.0);
        dirLight.position.set(15, 30, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;
        
        // Cold fill
        const fillLight = new THREE.DirectionalLight(0x88aacc, 0.25);
        fillLight.position.set(-10, 15, -5);
        this.scene.add(this._track(fillLight));
        
        // Icy hemisphere light
        const hemi = new THREE.HemisphereLight(0x6688bb, 0x111122, 0.5);
        this.scene.add(this._track(hemi));
        
        // Crystal glow point lights (reduced from 6 to 4 for perf)
        for (let i = 0; i < 4; i++) {
            const pl = new THREE.PointLight(0x4488ff, 0.8, 20, 2);
            pl.position.set(
                (Math.random() - 0.5) * 40,
                2 + Math.random() * 4,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(this._track(pl));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 3 — MOLTEN ABYSS (volcanic hellscape)
    // ═══════════════════════════════════════════════════════════
    async _buildMoltenAbyss(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createVolcanicGround(zone);
        await this._yield();
        this._createObsidianSpires(zone);
        await this._yield();
        this._createVolcanicRocks(zone);
        await this._yield();
        this._createLavaRivers();
        this._createAshMounds();
        this._createEmberVents();
        this._createGodRays(zone.colors.godRayColor, 0.035);
        this._createParticles(zone.colors.particleColor);
        this._createVolcanicLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    async _createVolcanicGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(14, 14);
        groundTex.colorSpace = THREE.SRGBColorSpace;

        // Define height function for this zone
        this._heightFunc = (x, z) => {
            return Math.sin(x * 0.06) * Math.cos(z * 0.06) * 0.6 +
                   Math.sin(x * 0.25) * Math.cos(z * 0.18) * 0.25 +
                   Math.sin(x * 0.5 + z * 0.5) * 0.1;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 28, 28);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            // More dramatic terrain — ridges and cracks
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.85, metalness: 0.15, color: 0x2a1510,
        });

        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));

        // Lava glow patches
        for (let i = 0; i < 35; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const scale = 1 + Math.random() * 3;
            const lavaGeo = new THREE.CircleGeometry(scale, 8);
            const lavaMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.05 + Math.random() * 0.04, 0.9, 0.15 + Math.random() * 0.15),
                emissive: 0xff3300,
                emissiveIntensity: 0.2 + Math.random() * 0.3,
                roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.6,
            });
            const lava = new THREE.Mesh(lavaGeo, lavaMat);
            lava.rotation.x = -Math.PI / 2;
            lava.position.set(x, 0.04, z);
            this.scene.add(this._track(lava));
            if (i % 10 === 0) await this._yield();
        }
    }

    async _createObsidianSpires(zone) {
        // Jagged obsidian pillars (replaces trees as landmark objects)
        const spireCount = 20;
        const placed = [];
        for (let i = 0; i < spireCount; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.5;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Main spire — angular, jagged
            const pillarCount = 1 + Math.floor(Math.random() * 3);
            for (let p = 0; p < pillarCount; p++) {
                const height = (4 + Math.random() * 10) * scale;
                const radius = (0.3 + Math.random() * 0.5) * scale;
                const sides = 4 + Math.floor(Math.random() * 3); // angular
                const geo = new THREE.ConeGeometry(radius, height, sides);

                // Deform for natural rock look
                const pa = geo.attributes.position;
                for (let j = 0; j < pa.count; j++) {
                    const vx = pa.getX(j);
                    const vy = pa.getY(j);
                    const vz = pa.getZ(j);
                    const n = 1 + (Math.sin(vy * 1.5 + j * 0.7) * 0.2);
                    pa.setX(j, vx * n);
                    pa.setZ(j, vz * n);
                }
                geo.computeVertexNormals();

                const hue = 0.0 + Math.random() * 0.05;
                const mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.15, 0.05 + Math.random() * 0.08),
                    roughness: 0.7 + Math.random() * 0.2,
                    metalness: 0.1 + Math.random() * 0.2,
                });

                const spire = new THREE.Mesh(geo, mat);
                spire.position.set(
                    (Math.random() - 0.5) * scale * 0.8,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.8
                );
                spire.rotation.x = (Math.random() - 0.5) * 0.2;
                spire.rotation.z = (Math.random() - 0.5) * 0.2;
                spire.castShadow = false;
                spire.receiveShadow = false;
                group.add(spire);
            }

            // Glowing lava base
            const baseGeo = new THREE.SphereGeometry(scale * 0.6, 8, 6);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x1a0800,
                emissive: 0xff2200,
                emissiveIntensity: 0.15,
                roughness: 0.5,
                metalness: 0.3,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = scale * 0.2;
            base.scale.y = 0.3;
            group.add(base);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: scale * 0.5 + 0.2 });
            if (i % 5 === 0) await this._yield();
        }

        // Perimeter obsidian wall
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const scale = 1.5 + Math.random() * 1.0;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const height = (8 + Math.random() * 12) * scale;
            const radius = (0.5 + Math.random() * 0.6) * scale;
            const geo = new THREE.ConeGeometry(radius, height, 5);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.02, 0.1, 0.04),
                roughness: 0.8, metalness: 0.15,
            });
            const spire = new THREE.Mesh(geo, mat);
            spire.position.y = height / 2;
            spire.rotation.x = (Math.random() - 0.5) * 0.15;
            spire.castShadow = false;
            group.add(spire);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: radius + 0.2 });
            if (i % 5 === 0) await this._yield();
        }
    }

    _createVolcanicRocks(zone) {
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;

        const placed = [];
        for (let i = 0; i < 14; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2.5;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                const rx = rpa.getX(j); const rz = rpa.getZ(j);
                const n = 1 + (Math.sin(rx * 3) * Math.cos(rz * 3) * 0.25);
                rpa.setX(j, rpa.getX(j) * n);
                rpa.setY(j, rpa.getY(j) * 0.55);
                rpa.setZ(j, rpa.getZ(j) * n);
            }
            rockGeo.computeVertexNormals();

            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.7, metalness: 0.2,
                color: new THREE.Color().setHSL(0.02, 0.15, 0.08 + Math.random() * 0.05),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.25; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true; rock.receiveShadow = true;
            group.add(rock);

            // Lava glow cap
            const glowGeo = new THREE.SphereGeometry(scale * 0.5, 6, 4);
            const glowMat = new THREE.MeshStandardMaterial({
                color: 0x331100,
                emissive: 0xff3300,
                emissiveIntensity: 0.2,
                roughness: 0.4,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = scale * 0.4; glow.scale.y = 0.2;
            group.add(glow);

            this.scene.add(this._track(group));
            this.rocks.push({ group, x, z, radius: scale * 0.6 + 0.3 });
        }
    }

    _createLavaRivers() {
        // Flowing lava channels (glowing strips on the ground)
        for (let r = 0; r < 6; r++) {
            const startAngle = Math.random() * Math.PI * 2;
            const startDist = 5 + Math.random() * 20;
            let cx = Math.cos(startAngle) * startDist;
            let cz = Math.sin(startAngle) * startDist;
            const dir = Math.random() * Math.PI * 2;
            const segCount = 8 + Math.floor(Math.random() * 8);

            for (let s = 0; s < segCount; s++) {
                const width = 0.5 + Math.random() * 1.5;
                const length = 2 + Math.random() * 3;
                const lavaGeo = new THREE.PlaneGeometry(width, length);
                const lavaMat = new THREE.MeshStandardMaterial({
                    color: 0xff4400,
                    emissive: 0xff2200,
                    emissiveIntensity: 0.5 + Math.random() * 0.3,
                    roughness: 0.2, metalness: 0.1,
                    transparent: true, opacity: 0.7,
                });
                const lava = new THREE.Mesh(lavaGeo, lavaMat);
                lava.rotation.x = -Math.PI / 2;
                lava.position.set(cx, 0.06, cz);
                lava.rotation.z = dir + (Math.random() - 0.5) * 0.3;
                this.scene.add(this._track(lava));

                cx += Math.cos(dir + (Math.random() - 0.5) * 0.5) * length * 0.8;
                cz += Math.sin(dir + (Math.random() - 0.5) * 0.5) * length * 0.8;
            }
        }
    }

    _createAshMounds() {
        // Ash/cinder mounds (replaces bushes)
        const placed = [];
        for (let i = 0; i < 20; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.4 + Math.random() * 1.0;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const moundCount = 1 + Math.floor(Math.random() * 3);
            for (let d = 0; d < moundCount; d++) {
                const mRadius = (0.4 + Math.random() * 0.6) * scale;
                const moundGeo = new THREE.SphereGeometry(mRadius, 8, 6);
                const mpa = moundGeo.attributes.position;
                for (let j = 0; j < mpa.count; j++) {
                    mpa.setY(j, Math.max(0, mpa.getY(j)) * 0.35);
                }
                moundGeo.computeVertexNormals();
                const moundMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.06, 0.1, 0.06 + Math.random() * 0.05),
                    roughness: 0.9, metalness: 0.0,
                });
                const mound = new THREE.Mesh(moundGeo, moundMat);
                mound.position.set((Math.random() - 0.5) * scale, 0, (Math.random() - 0.5) * scale);
                group.add(mound);
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x, z });
        }
    }

    _createEmberVents() {
        // Glowing ember vents (replaces ferns) — small ground-level fire glow spots
        const placed = [];
        for (let i = 0; i < 28; i++) {
            const pos = this._getSpacedRectPosition(placed, 3, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.15 + Math.random() * 0.3;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Vent hole
            const ventGeo = new THREE.CircleGeometry(scale, 6);
            const ventMat = new THREE.MeshStandardMaterial({
                color: 0x110500,
                emissive: 0xff4400,
                emissiveIntensity: 0.4 + Math.random() * 0.4,
                roughness: 0.3,
            });
            const vent = new THREE.Mesh(ventGeo, ventMat);
            vent.rotation.x = -Math.PI / 2;
            vent.position.y = 0.02;
            group.add(vent);

            // Small flame wisps
            const wispCount = 1 + Math.floor(Math.random() * 3);
            for (let w = 0; w < wispCount; w++) {
                const wGeo = new THREE.ConeGeometry(0.03 + Math.random() * 0.05, 0.15 + Math.random() * 0.2, 4);
                const wMat = new THREE.MeshStandardMaterial({
                    color: 0xff8822,
                    emissive: 0xff4400,
                    emissiveIntensity: 0.8,
                    transparent: true,
                    opacity: 0.5 + Math.random() * 0.3,
                });
                const wisp = new THREE.Mesh(wGeo, wMat);
                wisp.position.set(
                    (Math.random() - 0.5) * scale,
                    0.1 + Math.random() * 0.1,
                    (Math.random() - 0.5) * scale
                );
                group.add(wisp);
            }

            this.scene.add(this._track(group));
            this.ferns.push({ group, x, z });
        }
    }

    _createVolcanicLighting(zone) {
        // Warm, hellish ambient
        const ambient = new THREE.AmbientLight(zone.colors.ambientLight, 0.5);
        this.scene.add(this._track(ambient));

        // Main directional — warm orange-red
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 0.9);
        dirLight.position.set(15, 30, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;

        // Hot fill from below (simulates lava glow upward)
        const fillLight = new THREE.DirectionalLight(0xff4422, 0.3);
        fillLight.position.set(0, -5, 0);
        this.scene.add(this._track(fillLight));

        // Hellish hemisphere — warm top, dark bottom
        const hemi = new THREE.HemisphereLight(0x553311, 0x110500, 0.6);
        this.scene.add(this._track(hemi));

        // Lava glow point lights
        for (let i = 0; i < 5; i++) {
            const pl = new THREE.PointLight(0xff3300, 1.0, 25, 2);
            pl.position.set(
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 2,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(this._track(pl));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 4 — ABYSSAL DEPTHS (sunken bioluminescent caverns)
    // ═══════════════════════════════════════════════════════════
    async _buildAbyssalDepths(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createAbyssalGround(zone);
        await this._yield();
        this._createCoralPillars(zone);
        await this._yield();
        this._createAbyssalRocks(zone);
        await this._yield();
        this._createKelpForests();
        this._createBiolumVents();
        this._createGodRays(zone.colors.godRayColor, 0.025);
        this._createParticles(zone.colors.particleColor);
        this._createAbyssalLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    _createAbyssalGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(16, 16);
        groundTex.colorSpace = THREE.SRGBColorSpace;

        // Define height function for this zone
        this._heightFunc = (x, z) => {
            return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.4 +
                   Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.2;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 28, 28);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.6, metalness: 0.15, color: 0x0a1520,
        });

        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));

        // Bioluminescent glow patches on the ground
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const scale = 1 + Math.random() * 3;
            const hue = 0.42 + Math.random() * 0.15; // cyan-to-green
            const glowGeo = new THREE.CircleGeometry(scale, 8);
            const glowMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(hue, 0.8, 0.12),
                emissive: new THREE.Color().setHSL(hue, 0.9, 0.08),
                emissiveIntensity: 0.4 + Math.random() * 0.3,
                roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.5,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.rotation.x = -Math.PI / 2;
            glow.position.set(x, 0.04, z);
            this.scene.add(this._track(glow));
        }
    }

    _createCoralPillars(zone) {
        // Giant bioluminescent coral formations (replaces trees)
        const coralCount = 22;
        const placed = [];
        for (let i = 0; i < coralCount; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.5;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Main coral trunk — organic branching shape
            const branchCount = 2 + Math.floor(Math.random() * 4);
            for (let b = 0; b < branchCount; b++) {
                const height = (3 + Math.random() * 8) * scale;
                const radius = (0.2 + Math.random() * 0.4) * scale;
                const geo = new THREE.CylinderGeometry(radius * 0.3, radius, height, 6);
                const pa = geo.attributes.position;
                for (let j = 0; j < pa.count; j++) {
                    const vy = pa.getY(j);
                    const n = 1 + Math.sin(vy * 1.5 + j * 0.3) * 0.2;
                    pa.setX(j, pa.getX(j) * n);
                    pa.setZ(j, pa.getZ(j) * n);
                }
                geo.computeVertexNormals();

                const hue = 0.45 + Math.random() * 0.2;
                const mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.5, 0.08 + Math.random() * 0.1),
                    emissive: new THREE.Color().setHSL(hue, 0.7, 0.04),
                    emissiveIntensity: 0.3 + Math.random() * 0.3,
                    roughness: 0.5,
                    metalness: 0.2,
                });

                const coral = new THREE.Mesh(geo, mat);
                coral.position.set(
                    (Math.random() - 0.5) * scale * 0.8,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.8
                );
                coral.rotation.x = (Math.random() - 0.5) * 0.3;
                coral.rotation.z = (Math.random() - 0.5) * 0.3;
                coral.castShadow = false;
                coral.receiveShadow = false;
                group.add(coral);

                // Glowing tip
                const tipGeo = new THREE.SphereGeometry(radius * 0.6, 6, 6);
                const tipMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.8, 0.2),
                    emissive: new THREE.Color().setHSL(hue, 0.9, 0.15),
                    emissiveIntensity: 0.6,
                    roughness: 0.3,
                });
                const tip = new THREE.Mesh(tipGeo, tipMat);
                tip.position.set(coral.position.x, height, coral.position.z);
                group.add(tip);
            }

            // Glowing base
            const baseGeo = new THREE.SphereGeometry(scale * 0.5, 8, 6);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x051510,
                emissive: 0x11aa88,
                emissiveIntensity: 0.15,
                roughness: 0.4,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = scale * 0.2;
            base.scale.y = 0.3;
            group.add(base);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: scale * 0.5 + 0.2 });
        }

        // Perimeter coral wall
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const scale = 1.5 + Math.random() * 1.0;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const height = (7 + Math.random() * 12) * scale;
            const radius = (0.4 + Math.random() * 0.5) * scale;
            const geo = new THREE.CylinderGeometry(radius * 0.2, radius, height, 6);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.5, 0.3, 0.06),
                emissive: 0x115544,
                emissiveIntensity: 0.1,
                roughness: 0.6,
            });
            const coral = new THREE.Mesh(geo, mat);
            coral.position.y = height / 2;
            coral.rotation.x = (Math.random() - 0.5) * 0.15;
            coral.castShadow = false;
            group.add(coral);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: radius + 0.2 });
        }
    }

    _createAbyssalRocks(zone) {
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;

        const placed = [];
        for (let i = 0; i < 14; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2.5;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                const rx = rpa.getX(j); const rz = rpa.getZ(j);
                const n = 1 + (Math.sin(rx * 3) * Math.cos(rz * 3) * 0.2);
                rpa.setX(j, rpa.getX(j) * n);
                rpa.setY(j, rpa.getY(j) * 0.5);
                rpa.setZ(j, rpa.getZ(j) * n);
            }
            rockGeo.computeVertexNormals();

            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.5, metalness: 0.2,
                color: new THREE.Color().setHSL(0.52, 0.15, 0.06 + Math.random() * 0.04),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.25; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true; rock.receiveShadow = true;
            group.add(rock);

            // Bioluminescent patch on top
            const glowGeo = new THREE.SphereGeometry(scale * 0.5, 6, 4);
            const glowMat = new THREE.MeshStandardMaterial({
                color: 0x051510,
                emissive: 0x22ffaa,
                emissiveIntensity: 0.2,
                roughness: 0.4, transparent: true, opacity: 0.7,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = scale * 0.4; glow.scale.y = 0.2;
            group.add(glow);

            this.scene.add(this._track(group));
            this.rocks.push({ group, x, z, radius: scale * 0.6 + 0.3 });
        }
    }

    _createKelpForests() {
        // Swaying kelp strands (replaces bushes)
        const placed = [];
        for (let i = 0; i < 22; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.0;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const strandCount = 3 + Math.floor(Math.random() * 5);
            for (let s = 0; s < strandCount; s++) {
                const height = (1 + Math.random() * 2) * scale;
                const strandGeo = new THREE.CylinderGeometry(0.02 * scale, 0.04 * scale, height, 4);
                const hue = 0.4 + Math.random() * 0.15;
                const strandMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.6, 0.1),
                    emissive: new THREE.Color().setHSL(hue, 0.8, 0.05),
                    emissiveIntensity: 0.3,
                    roughness: 0.6,
                });
                const strand = new THREE.Mesh(strandGeo, strandMat);
                strand.position.set(
                    (Math.random() - 0.5) * scale * 0.5,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.5
                );
                strand.rotation.x = (Math.random() - 0.5) * 0.2;
                strand.rotation.z = (Math.random() - 0.5) * 0.2;
                group.add(strand);
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x, z });
        }
    }

    _createBiolumVents() {
        // Glowing bioluminescent vent spots (replaces ferns)
        const placed = [];
        for (let i = 0; i < 28; i++) {
            const pos = this._getSpacedRectPosition(placed, 3, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.15 + Math.random() * 0.3;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const hue = 0.42 + Math.random() * 0.2;
            const ventGeo = new THREE.CircleGeometry(scale, 6);
            const ventMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(hue, 0.5, 0.05),
                emissive: new THREE.Color().setHSL(hue, 0.9, 0.15),
                emissiveIntensity: 0.5 + Math.random() * 0.4,
                roughness: 0.3,
            });
            const vent = new THREE.Mesh(ventGeo, ventMat);
            vent.rotation.x = -Math.PI / 2;
            vent.position.y = 0.02;
            group.add(vent);

            // Small bubbles / particles above vent
            const bubbleCount = 1 + Math.floor(Math.random() * 3);
            for (let b = 0; b < bubbleCount; b++) {
                const bGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 4, 4);
                const bMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.7, 0.3),
                    emissive: new THREE.Color().setHSL(hue, 0.9, 0.2),
                    emissiveIntensity: 0.6,
                    transparent: true,
                    opacity: 0.5 + Math.random() * 0.3,
                });
                const bubble = new THREE.Mesh(bGeo, bMat);
                bubble.position.set(
                    (Math.random() - 0.5) * scale,
                    0.1 + Math.random() * 0.15,
                    (Math.random() - 0.5) * scale
                );
                group.add(bubble);
            }

            this.scene.add(this._track(group));
            this.ferns.push({ group, x, z });
        }
    }

    _createAbyssalLighting(zone) {
        // Deep blue-green ambient
        const ambient = new THREE.AmbientLight(zone.colors.ambientLight, 0.4);
        this.scene.add(this._track(ambient));

        // Main directional — cool cyan-teal
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 0.7);
        dirLight.position.set(15, 30, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;

        // Bioluminescent fill from below
        const fillLight = new THREE.DirectionalLight(0x22ffaa, 0.2);
        fillLight.position.set(0, -5, 0);
        this.scene.add(this._track(fillLight));

        // Deep ocean hemisphere — teal top, dark bottom
        const hemi = new THREE.HemisphereLight(0x114433, 0x010508, 0.5);
        this.scene.add(this._track(hemi));

        // Bioluminescent glow point lights
        for (let i = 0; i < 6; i++) {
            const hue = 0.42 + Math.random() * 0.2;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.4);
            const pl = new THREE.PointLight(color, 0.8, 20, 2);
            pl.position.set(
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 3,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(this._track(pl));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 5 — NEON WASTES (xenotech alien frontier)
    // ═══════════════════════════════════════════════════════════
    async _buildNeonWastes(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createNeonGround(zone);
        await this._yield();
        this._createPlasmaPylons(zone);
        await this._yield();
        this._createAlienRocks(zone);
        await this._yield();
        this._createXenoflora();
        this._createPlasmaVents();
        this._createNeonRifts();
        this._createGodRays(zone.colors.godRayColor, 0.03);
        this._createParticles(zone.colors.particleColor);
        this._createNeonLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    _createNeonGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(16, 16);
        groundTex.colorSpace = THREE.SRGBColorSpace;

        // Define height function for this zone
        this._heightFunc = (x, z) => {
            return Math.sin(x * 0.07) * Math.cos(z * 0.07) * 0.35 +
                   Math.sin(x * 0.22) * Math.cos(z * 0.18) * 0.18 +
                   Math.sin(x * 0.5 + z * 0.3) * 0.08;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 28, 28);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            // Cracked alien terrain — sharp ridges and hexagonal depressions
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.6, metalness: 0.2, color: 0x120818,
        });

        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));

        // Plasma glow patches on the ground (hexagonal cracks oozing energy)
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const scale = 1 + Math.random() * 3;
            const hue = 0.8 + Math.random() * 0.1; // magenta-purple
            const glowGeo = new THREE.CircleGeometry(scale, 6); // hexagonal
            const glowMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(hue, 0.9, 0.1),
                emissive: new THREE.Color().setHSL(hue, 1.0, 0.12),
                emissiveIntensity: 0.4 + Math.random() * 0.4,
                roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.5,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.rotation.x = -Math.PI / 2;
            glow.position.set(x, 0.04, z);
            this.scene.add(this._track(glow));
        }
    }

    _createPlasmaPylons(zone) {
        // Towering xenotech pylons — alien monoliths crackling with plasma energy
        const pylonCount = 20;
        const placed = [];
        for (let i = 0; i < pylonCount; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.5;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Main pylon — angular metallic column
            const pillarCount = 1 + Math.floor(Math.random() * 3);
            for (let p = 0; p < pillarCount; p++) {
                const height = (4 + Math.random() * 10) * scale;
                const radius = (0.2 + Math.random() * 0.35) * scale;
                const sides = 4 + Math.floor(Math.random() * 3);
                const geo = new THREE.CylinderGeometry(radius * 0.6, radius, height, sides);

                // Deform for alien weathering
                const pa = geo.attributes.position;
                for (let j = 0; j < pa.count; j++) {
                    const vy = pa.getY(j);
                    const n = 1 + Math.sin(vy * 2 + j * 0.5) * 0.12;
                    pa.setX(j, pa.getX(j) * n);
                    pa.setZ(j, pa.getZ(j) * n);
                }
                geo.computeVertexNormals();

                const mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.78 + Math.random() * 0.06, 0.2, 0.04 + Math.random() * 0.06),
                    roughness: 0.3 + Math.random() * 0.3,
                    metalness: 0.5 + Math.random() * 0.3,
                });

                const pylon = new THREE.Mesh(geo, mat);
                pylon.position.set(
                    (Math.random() - 0.5) * scale * 0.6,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.6
                );
                pylon.rotation.x = (Math.random() - 0.5) * 0.15;
                pylon.rotation.z = (Math.random() - 0.5) * 0.15;
                pylon.castShadow = false;
                pylon.receiveShadow = false;
                group.add(pylon);

                // Plasma conduit lines running up the pylon
                const conduitCount = 2 + Math.floor(Math.random() * 3);
                for (let c = 0; c < conduitCount; c++) {
                    const cAngle = (c / conduitCount) * Math.PI * 2;
                    const cGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, height * 0.8, 3);
                    const cMat = new THREE.MeshStandardMaterial({
                        color: 0xff44cc,
                        emissive: 0xff22aa,
                        emissiveIntensity: 0.6 + Math.random() * 0.4,
                        roughness: 0.1,
                    });
                    const conduit = new THREE.Mesh(cGeo, cMat);
                    conduit.position.set(
                        pylon.position.x + Math.cos(cAngle) * radius * 0.8,
                        height * 0.4,
                        pylon.position.z + Math.sin(cAngle) * radius * 0.8
                    );
                    group.add(conduit);
                }

                // Glowing tip — plasma capacitor
                const tipGeo = new THREE.OctahedronGeometry(radius * 0.5, 0);
                const tipMat = new THREE.MeshStandardMaterial({
                    color: 0xdd44ff,
                    emissive: 0xcc22ff,
                    emissiveIntensity: 0.8,
                    transparent: true,
                    opacity: 0.7,
                });
                const tip = new THREE.Mesh(tipGeo, tipMat);
                tip.position.set(pylon.position.x, height, pylon.position.z);
                group.add(tip);
            }

            // Base glow — plasma pool
            const baseGeo = new THREE.SphereGeometry(scale * 0.6, 8, 6);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x0a0015,
                emissive: 0xcc22ff,
                emissiveIntensity: 0.15,
                roughness: 0.3,
                metalness: 0.4,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = scale * 0.15;
            base.scale.y = 0.3;
            group.add(base);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: scale * 0.5 + 0.2 });
        }

        // Perimeter pylons — massive alien wall
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const scale = 1.5 + Math.random() * 1.0;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const height = (8 + Math.random() * 14) * scale;
            const radius = (0.4 + Math.random() * 0.5) * scale;
            const geo = new THREE.CylinderGeometry(radius * 0.5, radius, height, 5);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.8, 0.15, 0.03),
                roughness: 0.4, metalness: 0.6,
            });
            const pylon = new THREE.Mesh(geo, mat);
            pylon.position.y = height / 2;
            pylon.rotation.x = (Math.random() - 0.5) * 0.12;
            pylon.castShadow = false;
            group.add(pylon);

            // Plasma stripe
            const stripeGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, height * 0.9, 3);
            const stripeMat = new THREE.MeshStandardMaterial({
                color: 0xff22cc,
                emissive: 0xff11aa,
                emissiveIntensity: 0.5,
            });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(radius * 0.6, height * 0.45, 0);
            group.add(stripe);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: radius + 0.2 });
        }
    }

    _createAlienRocks(zone) {
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;

        const placed = [];
        for (let i = 0; i < 14; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2.5;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                const rx = rpa.getX(j); const rz = rpa.getZ(j);
                const n = 1 + (Math.sin(rx * 3.5) * Math.cos(rz * 3.5) * 0.25);
                rpa.setX(j, rpa.getX(j) * n);
                rpa.setY(j, rpa.getY(j) * 0.5);
                rpa.setZ(j, rpa.getZ(j) * n);
            }
            rockGeo.computeVertexNormals();

            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.4, metalness: 0.35,
                color: new THREE.Color().setHSL(0.8, 0.2, 0.05 + Math.random() * 0.04),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.25; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true; rock.receiveShadow = true;
            group.add(rock);

            // Plasma vein glow on top
            const glowGeo = new THREE.SphereGeometry(scale * 0.5, 6, 4);
            const glowMat = new THREE.MeshStandardMaterial({
                color: 0x100020,
                emissive: 0xff44cc,
                emissiveIntensity: 0.25,
                roughness: 0.2, transparent: true, opacity: 0.6,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = scale * 0.4; glow.scale.y = 0.2;
            group.add(glow);

            this.scene.add(this._track(group));
            this.rocks.push({ group, x, z, radius: scale * 0.6 + 0.3 });
        }
    }

    _createXenoflora() {
        // Alien xenoflora clusters — bioluminescent alien plants with tentacle fronds
        const placed = [];
        for (let i = 0; i < 22; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.4 + Math.random() * 1.0;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const stalkCount = 3 + Math.floor(Math.random() * 5);
            for (let s = 0; s < stalkCount; s++) {
                const height = (0.5 + Math.random() * 1.5) * scale;
                const hue = 0.78 + Math.random() * 0.12;
                const stalkGeo = new THREE.CylinderGeometry(0.015 * scale, 0.04 * scale, height, 4);
                const stalkMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.6, 0.08),
                    emissive: new THREE.Color().setHSL(hue, 0.8, 0.06),
                    emissiveIntensity: 0.4,
                    roughness: 0.5,
                });
                const stalk = new THREE.Mesh(stalkGeo, stalkMat);
                stalk.position.set(
                    (Math.random() - 0.5) * scale * 0.5,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.5
                );
                stalk.rotation.x = (Math.random() - 0.5) * 0.3;
                stalk.rotation.z = (Math.random() - 0.5) * 0.3;
                group.add(stalk);

                // Glowing bulb tip
                const bulbGeo = new THREE.SphereGeometry(0.04 * scale + Math.random() * 0.03 * scale, 6, 6);
                const bulbMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.9, 0.3),
                    emissive: new THREE.Color().setHSL(hue, 1.0, 0.2),
                    emissiveIntensity: 0.7,
                    transparent: true,
                    opacity: 0.8,
                });
                const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                bulb.position.set(stalk.position.x, height, stalk.position.z);
                group.add(bulb);
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x, z });
        }
    }

    _createPlasmaVents() {
        // Crackling plasma vent spots (replaces ferns)
        const placed = [];
        for (let i = 0; i < 28; i++) {
            const pos = this._getSpacedRectPosition(placed, 3, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.15 + Math.random() * 0.3;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Vent aperture — hexagonal
            const ventGeo = new THREE.CircleGeometry(scale, 6);
            const ventMat = new THREE.MeshStandardMaterial({
                color: 0x080010,
                emissive: 0xff22dd,
                emissiveIntensity: 0.5 + Math.random() * 0.5,
                roughness: 0.2,
            });
            const vent = new THREE.Mesh(ventGeo, ventMat);
            vent.rotation.x = -Math.PI / 2;
            vent.position.y = 0.02;
            group.add(vent);

            // Plasma wisps shooting upward
            const wispCount = 1 + Math.floor(Math.random() * 3);
            for (let w = 0; w < wispCount; w++) {
                const wGeo = new THREE.ConeGeometry(0.02 + Math.random() * 0.04, 0.12 + Math.random() * 0.15, 4);
                const wMat = new THREE.MeshStandardMaterial({
                    color: 0xff66dd,
                    emissive: 0xff44cc,
                    emissiveIntensity: 0.9,
                    transparent: true,
                    opacity: 0.4 + Math.random() * 0.3,
                });
                const wisp = new THREE.Mesh(wGeo, wMat);
                wisp.position.set(
                    (Math.random() - 0.5) * scale,
                    0.08 + Math.random() * 0.1,
                    (Math.random() - 0.5) * scale
                );
                group.add(wisp);
            }

            this.scene.add(this._track(group));
            this.ferns.push({ group, x, z });
        }
    }

    _createNeonRifts() {
        // Dimensional rift cracks on the ground — glowing plasma fissures
        for (let r = 0; r < 5; r++) {
            const startAngle = Math.random() * Math.PI * 2;
            const startDist = 5 + Math.random() * 20;
            let cx = Math.cos(startAngle) * startDist;
            let cz = Math.sin(startAngle) * startDist;
            const dir = Math.random() * Math.PI * 2;
            const segCount = 6 + Math.floor(Math.random() * 6);

            for (let s = 0; s < segCount; s++) {
                const width = 0.3 + Math.random() * 1.0;
                const length = 2 + Math.random() * 3;
                const riftGeo = new THREE.PlaneGeometry(width, length);
                const riftMat = new THREE.MeshStandardMaterial({
                    color: 0xcc22ff,
                    emissive: 0xaa11dd,
                    emissiveIntensity: 0.4 + Math.random() * 0.3,
                    roughness: 0.1, metalness: 0.2,
                    transparent: true, opacity: 0.6,
                });
                const rift = new THREE.Mesh(riftGeo, riftMat);
                rift.rotation.x = -Math.PI / 2;
                rift.position.set(cx, 0.05, cz);
                rift.rotation.z = dir + (Math.random() - 0.5) * 0.3;
                this.scene.add(this._track(rift));

                cx += Math.cos(dir + (Math.random() - 0.5) * 0.5) * length * 0.8;
                cz += Math.sin(dir + (Math.random() - 0.5) * 0.5) * length * 0.8;
            }
        }
    }

    _createNeonLighting(zone) {
        // Dark purple ambient
        const ambient = new THREE.AmbientLight(zone.colors.ambientLight, 0.45);
        this.scene.add(this._track(ambient));

        // Main directional — purple-tinged
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 0.8);
        dirLight.position.set(15, 30, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;

        // Plasma fill from below (simulates ground glow upward)
        const fillLight = new THREE.DirectionalLight(0xff44cc, 0.2);
        fillLight.position.set(0, -5, 0);
        this.scene.add(this._track(fillLight));

        // Alien hemisphere — purple top, deep dark bottom
        const hemi = new THREE.HemisphereLight(0x220a33, 0x020008, 0.5);
        this.scene.add(this._track(hemi));

        // Plasma glow point lights
        for (let i = 0; i < 6; i++) {
            const hue = 0.78 + Math.random() * 0.12;
            const color = new THREE.Color().setHSL(hue, 0.9, 0.5);
            const pl = new THREE.PointLight(color, 0.9, 22, 2);
            pl.position.set(
                (Math.random() - 0.5) * 40,
                1.5 + Math.random() * 3,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(this._track(pl));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 6 — HALO RING (ancient ringworld sanctum)
    // A colossal alien ring structure with Forerunner architecture,
    // terraformed grasslands gone feral, energy conduits, and
    // ancient technology humming beneath alloy plating.
    // ═══════════════════════════════════════════════════════════
    async _buildHaloRing(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createRingGround(zone);
        await this._yield();
        this._createForerunnerSpires(zone);
        await this._yield();
        this._createRingRocks(zone);
        await this._yield();
        this._createRingFlora();
        this._createEnergyConduits();
        this._createForerunnerGlyphs();
        this._createRingSkyband();
        this._createGodRays(zone.colors.godRayColor, 0.025);
        this._createParticles(zone.colors.particleColor);
        this._createRingLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    _createRingGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(18, 18);
        groundTex.colorSpace = THREE.SRGBColorSpace;

        // Define height function for this zone
        this._heightFunc = (x, z) => {
            const plate = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.25;
            const overgrowth = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 0.12;
            const seam = Math.abs(Math.sin(x * 0.5 + z * 0.5)) < 0.05 ? -0.08 : 0;
            return plate + overgrowth + seam;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 32, 32);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            // Ringworld terrain: mostly flat alloy plates with subtle warping
            // Forerunner construction = precise geometry with subtle organic overgrowth
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.45, metalness: 0.35, color: 0x0a1a12,
        });

        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));

        // Forerunner alloy plate patterns on the ground — hexagonal grid markings
        for (let i = 0; i < 45; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const scale = 1.5 + Math.random() * 3.5;
            const plateGeo = new THREE.CircleGeometry(scale, 6); // hexagonal
            const plateMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.42 + Math.random() * 0.06, 0.3, 0.04 + Math.random() * 0.03),
                emissive: 0x22ffaa,
                emissiveIntensity: 0.06 + Math.random() * 0.08,
                roughness: 0.25, metalness: 0.6,
                transparent: true, opacity: 0.5,
            });
            const plate = new THREE.Mesh(plateGeo, plateMat);
            plate.rotation.x = -Math.PI / 2;
            plate.position.set(x, 0.03, z);
            this.scene.add(this._track(plate));
        }

        // Energy conduit lines embedded in the ground (teal glowing strips)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
            const startDist = 4 + Math.random() * 8;
            const endDist = 25 + Math.random() * 30;
            let cx = Math.cos(angle) * startDist;
            let cz = Math.sin(angle) * startDist;
            const segCount = 10 + Math.floor(Math.random() * 6);

            for (let s = 0; s < segCount; s++) {
                const t = s / segCount;
                const dist = startDist + t * (endDist - startDist);
                const nx = Math.cos(angle + Math.sin(t * 3) * 0.1) * dist;
                const nz = Math.sin(angle + Math.sin(t * 3) * 0.1) * dist;
                const length = 2.0 + Math.random() * 1.5;
                const width = 0.08 + Math.random() * 0.12;
                const stripGeo = new THREE.PlaneGeometry(width, length);
                const stripMat = new THREE.MeshStandardMaterial({
                    color: 0x44ffaa,
                    emissive: 0x22dd88,
                    emissiveIntensity: 0.5 + Math.random() * 0.3,
                    roughness: 0.1, metalness: 0.3,
                    transparent: true, opacity: 0.6 + Math.random() * 0.2,
                });
                const strip = new THREE.Mesh(stripGeo, stripMat);
                strip.rotation.x = -Math.PI / 2;
                strip.position.set(nx, 0.05, nz);
                strip.rotation.z = angle + Math.PI / 2;
                this.scene.add(this._track(strip));
                cx = nx;
                cz = nz;
            }
        }
    }

    _createForerunnerSpires(zone) {
        // Massive Forerunner architecture — angular metallic spires with energy cores
        // Inspired by Halo's Forerunner structures: sleek, geometric, impossibly precise
        const spireCount = 20;
        const placed = [];
        for (let i = 0; i < spireCount; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.5;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Forerunner alloy material — dark gunmetal with teal edge glow
            const alloyMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.45 + Math.random() * 0.05, 0.15, 0.04 + Math.random() * 0.04),
                roughness: 0.2 + Math.random() * 0.15,
                metalness: 0.7 + Math.random() * 0.2,
            });

            const glowMat = new THREE.MeshStandardMaterial({
                color: 0x44ffaa,
                emissive: 0x22dd88,
                emissiveIntensity: 0.6 + Math.random() * 0.4,
                roughness: 0.1,
                metalness: 0.3,
            });

            // Main spire body — angular box column (Forerunner architecture is geometric, not organic)
            const pillarCount = 1 + Math.floor(Math.random() * 2);
            for (let p = 0; p < pillarCount; p++) {
                const height = (5 + Math.random() * 12) * scale;
                const baseW = (0.4 + Math.random() * 0.5) * scale;
                const topW = baseW * (0.3 + Math.random() * 0.3);

                // Tapered rectangular column
                const geo = new THREE.CylinderGeometry(topW, baseW, height, 4);
                // Rotate base so it's diamond-oriented (Forerunner aesthetic)
                geo.rotateY(Math.PI / 4);

                // Slight surface imperfections from millennia of exposure
                const pa = geo.attributes.position;
                for (let j = 0; j < pa.count; j++) {
                    const vy = pa.getY(j);
                    const n = 1 + Math.sin(vy * 1.2 + j * 0.4) * 0.06;
                    pa.setX(j, pa.getX(j) * n);
                    pa.setZ(j, pa.getZ(j) * n);
                }
                geo.computeVertexNormals();

                const spire = new THREE.Mesh(geo, alloyMat.clone());
                spire.position.set(
                    (Math.random() - 0.5) * scale * 0.5,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.5
                );
                spire.castShadow = false;
                spire.receiveShadow = false;
                group.add(spire);

                // Energy core at 2/3 height — teal glowing octahedron
                const coreSize = baseW * 0.35;
                const coreGeo = new THREE.OctahedronGeometry(coreSize, 0);
                const coreMat = new THREE.MeshStandardMaterial({
                    color: 0x66ffcc,
                    emissive: 0x44ffaa,
                    emissiveIntensity: 0.9,
                    transparent: true,
                    opacity: 0.8,
                    roughness: 0.05,
                    metalness: 0.5,
                });
                const core = new THREE.Mesh(coreGeo, coreMat);
                core.position.set(spire.position.x, height * 0.66, spire.position.z);
                group.add(core);

                // Hovering ring around the core (Forerunner energy containment)
                const ringGeo = new THREE.TorusGeometry(coreSize * 1.8, coreSize * 0.08, 6, 16);
                const ring = new THREE.Mesh(ringGeo, glowMat.clone());
                ring.position.copy(core.position);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);

                // Energy channel strips running vertically
                const channelCount = 2 + Math.floor(Math.random() * 2);
                for (let c = 0; c < channelCount; c++) {
                    const cAngle = (c / channelCount) * Math.PI * 2;
                    const chGeo = new THREE.BoxGeometry(0.02 * scale, height * 0.7, 0.02 * scale);
                    const channel = new THREE.Mesh(chGeo, glowMat.clone());
                    channel.position.set(
                        spire.position.x + Math.cos(cAngle) * baseW * 0.7,
                        height * 0.4,
                        spire.position.z + Math.sin(cAngle) * baseW * 0.7
                    );
                    group.add(channel);
                }

                // Floating glyph plate at top
                const capGeo = new THREE.BoxGeometry(topW * 1.8, 0.1 * scale, topW * 1.8);
                const capMat = alloyMat.clone();
                const cap = new THREE.Mesh(capGeo, capMat);
                cap.position.set(spire.position.x, height + 0.05, spire.position.z);
                group.add(cap);
            }

            // Forerunner base platform — hexagonal plinth
            const baseGeo = new THREE.CylinderGeometry(scale * 1.2, scale * 1.4, 0.3 * scale, 6);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x0a1a10,
                emissive: 0x11aa77,
                emissiveIntensity: 0.08,
                roughness: 0.25,
                metalness: 0.65,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = 0.15 * scale;
            group.add(base);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: scale * 0.6 + 0.2 });
        }

        // Perimeter structures — massive Forerunner wall pillars
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const scale = 1.5 + Math.random() * 1.0;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const height = (10 + Math.random() * 15) * scale;
            const baseW = (0.5 + Math.random() * 0.5) * scale;
            const geo = new THREE.CylinderGeometry(baseW * 0.4, baseW, height, 4);
            geo.rotateY(Math.PI / 4);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.45, 0.1, 0.03),
                roughness: 0.25, metalness: 0.75,
            });
            const pylon = new THREE.Mesh(geo, mat);
            pylon.position.y = height / 2;
            pylon.castShadow = false;
            group.add(pylon);

            // Vertical energy strip
            const stripGeo = new THREE.BoxGeometry(0.03 * scale, height * 0.85, 0.03 * scale);
            const stripMat = new THREE.MeshStandardMaterial({
                color: 0x44ffaa,
                emissive: 0x22dd88,
                emissiveIntensity: 0.5,
            });
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.set(baseW * 0.5, height * 0.45, 0);
            group.add(strip);

            // Top energy beacon
            const beaconGeo = new THREE.OctahedronGeometry(baseW * 0.3, 0);
            const beaconMat = new THREE.MeshStandardMaterial({
                color: 0x88ffdd,
                emissive: 0x44ffaa,
                emissiveIntensity: 0.7,
                transparent: true,
                opacity: 0.75,
            });
            const beacon = new THREE.Mesh(beaconGeo, beaconMat);
            beacon.position.y = height + baseW * 0.3;
            group.add(beacon);

            this.scene.add(this._track(group));
            this.trees.push({ group, x, z, radius: baseW + 0.2 });
        }
    }

    _createRingRocks(zone) {
        // Ancient alloy debris and overgrown Forerunner fragments
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;

        const placed = [];
        for (let i = 0; i < 14; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2.5;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Broken Forerunner slab — angular, geometric debris
            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                const rx = rpa.getX(j); const rz = rpa.getZ(j);
                // More angular deformation — sharper edges
                const n = 1 + (Math.sin(rx * 4) * Math.cos(rz * 4) * 0.2);
                rpa.setX(j, rpa.getX(j) * n);
                rpa.setY(j, rpa.getY(j) * 0.45); // flatten
                rpa.setZ(j, rpa.getZ(j) * n);
            }
            rockGeo.computeVertexNormals();

            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.3, metalness: 0.45,
                color: new THREE.Color().setHSL(0.45, 0.1, 0.04 + Math.random() * 0.04),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.22; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = true; rock.receiveShadow = true;
            group.add(rock);

            // Overgrown moss/lichen on the alloy
            const mossGeo = new THREE.SphereGeometry(scale * 0.55, 6, 4);
            const mossMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.38 + Math.random() * 0.08, 0.4, 0.06 + Math.random() * 0.04),
                roughness: 0.9, metalness: 0.0,
                transparent: true, opacity: 0.7,
            });
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.position.y = scale * 0.35; moss.scale.y = 0.2;
            group.add(moss);

            // Small energy leak from broken slab
            if (Math.random() > 0.5) {
                const leakGeo = new THREE.SphereGeometry(scale * 0.15, 6, 6);
                const leakMat = new THREE.MeshStandardMaterial({
                    color: 0x44ffaa,
                    emissive: 0x22dd88,
                    emissiveIntensity: 0.5,
                    transparent: true, opacity: 0.5,
                });
                const leak = new THREE.Mesh(leakGeo, leakMat);
                leak.position.set(
                    (Math.random() - 0.5) * scale * 0.5,
                    scale * 0.15,
                    (Math.random() - 0.5) * scale * 0.5
                );
                group.add(leak);
            }

            this.scene.add(this._track(group));
            this.rocks.push({ group, x, z, radius: scale * 0.6 + 0.3 });
        }
    }

    _createRingFlora() {
        // Terraformed alien grasslands gone feral — glowing ferns and vines
        // reclaiming Forerunner surfaces after millennia of neglect
        const placed = [];
        for (let i = 0; i < 22; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            placed.push(pos);
            const scale = 0.4 + Math.random() * 0.9;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Alien fern clusters — bioluminescent with teal-green tones
            const frondCount = 3 + Math.floor(Math.random() * 5);
            for (let f = 0; f < frondCount; f++) {
                const height = (0.4 + Math.random() * 1.2) * scale;
                const hue = 0.38 + Math.random() * 0.12;
                const frondGeo = new THREE.ConeGeometry(0.06 * scale, height, 3);
                const frondMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.5, 0.06 + Math.random() * 0.06),
                    emissive: new THREE.Color().setHSL(hue, 0.6, 0.03),
                    emissiveIntensity: 0.2 + Math.random() * 0.2,
                    roughness: 0.7,
                    side: THREE.DoubleSide,
                });
                const frond = new THREE.Mesh(frondGeo, frondMat);
                frond.position.set(
                    (Math.random() - 0.5) * scale * 0.5,
                    height / 2,
                    (Math.random() - 0.5) * scale * 0.5
                );
                frond.rotation.x = (Math.random() - 0.5) * 0.4;
                frond.rotation.z = (Math.random() - 0.5) * 0.4;
                group.add(frond);

                // Glowing spore tip
                if (Math.random() > 0.5) {
                    const sporeGeo = new THREE.SphereGeometry(0.025 * scale + Math.random() * 0.015 * scale, 4, 4);
                    const sporeMat = new THREE.MeshStandardMaterial({
                        color: new THREE.Color().setHSL(0.42, 0.8, 0.3),
                        emissive: new THREE.Color().setHSL(0.42, 0.9, 0.2),
                        emissiveIntensity: 0.6,
                        transparent: true,
                        opacity: 0.8,
                    });
                    const spore = new THREE.Mesh(sporeGeo, sporeMat);
                    spore.position.set(frond.position.x, height * 0.95, frond.position.z);
                    group.add(spore);
                }
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x, z });
        }

        // Small ground-level fern sprouts and energy-infused grass patches
        const fernPlaced = [];
        for (let i = 0; i < 28; i++) {
            const pos = this._getSpacedRectPosition(fernPlaced, 3, CONFIG.WORLD_SIZE * 1.4);
            const x = pos.x;
            const z = pos.z;
            fernPlaced.push(pos);
            const scale = 0.15 + Math.random() * 0.3;
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Tiny energy-grass blades
            const bladeCount = 4 + Math.floor(Math.random() * 6);
            for (let b = 0; b < bladeCount; b++) {
                const angle = (b / bladeCount) * Math.PI * 2 + Math.random() * 0.5;
                const height = (0.15 + Math.random() * 0.25) * scale;
                const bladeGeo = new THREE.PlaneGeometry(0.02 * scale, height);
                const hue = 0.38 + Math.random() * 0.1;
                const bladeMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(hue, 0.4, 0.08),
                    emissive: new THREE.Color().setHSL(hue, 0.6, 0.03),
                    emissiveIntensity: 0.15,
                    side: THREE.DoubleSide,
                    roughness: 0.8,
                });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                blade.position.set(
                    Math.cos(angle) * 0.1 * scale,
                    height / 2,
                    Math.sin(angle) * 0.1 * scale
                );
                blade.rotation.y = angle;
                blade.rotation.x = -0.2 - Math.random() * 0.3;
                group.add(blade);
            }

            this.scene.add(this._track(group));
            this.ferns.push({ group, x, z });
        }
    }

    _createEnergyConduits() {
        // Large Forerunner energy conduit pipes running across the terrain
        // These are the ring's power infrastructure, partially exposed
        for (let r = 0; r < 5; r++) {
            const startAngle = Math.random() * Math.PI * 2;
            const startDist = 8 + Math.random() * 15;
            let cx = Math.cos(startAngle) * startDist;
            let cz = Math.sin(startAngle) * startDist;
            const dir = startAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            const segCount = 5 + Math.floor(Math.random() * 5);

            for (let s = 0; s < segCount; s++) {
                // Conduit pipe segment
                const length = 3 + Math.random() * 4;
                const radius = 0.08 + Math.random() * 0.12;
                const pipeGeo = new THREE.CylinderGeometry(radius, radius, length, 6);
                const pipeMat = new THREE.MeshStandardMaterial({
                    color: 0x0a1510,
                    roughness: 0.25,
                    metalness: 0.7,
                });
                const pipe = new THREE.Mesh(pipeGeo, pipeMat);
                pipe.rotation.z = Math.PI / 2;
                pipe.rotation.y = dir + (Math.random() - 0.5) * 0.15;
                pipe.position.set(cx, 0.08 + Math.random() * 0.15, cz);
                this.scene.add(this._track(pipe));

                // Energy glow strip on top of pipe
                const glowGeo = new THREE.BoxGeometry(0.03, 0.03, length * 0.9);
                const glowMat = new THREE.MeshStandardMaterial({
                    color: 0x44ffaa,
                    emissive: 0x22dd88,
                    emissiveIntensity: 0.6 + Math.random() * 0.3,
                    roughness: 0.1,
                });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.position.set(cx, 0.15 + radius, cz);
                glow.rotation.y = dir;
                this.scene.add(this._track(glow));

                // Junction node every few segments
                if (s % 2 === 0) {
                    const nodeGeo = new THREE.OctahedronGeometry(radius * 1.5, 0);
                    const nodeMat = new THREE.MeshStandardMaterial({
                        color: 0x0a2018,
                        emissive: 0x22dd88,
                        emissiveIntensity: 0.3,
                        roughness: 0.2,
                        metalness: 0.6,
                    });
                    const node = new THREE.Mesh(nodeGeo, nodeMat);
                    node.position.set(cx, 0.15, cz);
                    this.scene.add(this._track(node));
                }

                cx += Math.cos(dir + (Math.random() - 0.5) * 0.3) * length * 0.85;
                cz += Math.sin(dir + (Math.random() - 0.5) * 0.3) * length * 0.85;
            }
        }
    }

    _createForerunnerGlyphs() {
        // Floating Forerunner glyph panels — holographic data markers
        // scattered across the ring, remnants of the builders' language
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 30;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Holographic panel — thin glowing rectangle floating above ground
            const panelW = 0.3 + Math.random() * 0.5;
            const panelH = 0.2 + Math.random() * 0.3;
            const panelGeo = new THREE.PlaneGeometry(panelW, panelH);
            const panelMat = new THREE.MeshStandardMaterial({
                color: 0x88ffdd,
                emissive: 0x44ffaa,
                emissiveIntensity: 0.5 + Math.random() * 0.3,
                transparent: true,
                opacity: 0.35 + Math.random() * 0.15,
                side: THREE.DoubleSide,
                roughness: 0.0,
                metalness: 0.8,
            });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.y = 1.0 + Math.random() * 1.5;
            panel.rotation.y = Math.random() * Math.PI;
            group.add(panel);

            // Second panel at slight angle (holographic depth effect)
            const panel2 = panel.clone();
            panel2.material = panelMat.clone();
            panel2.material.opacity *= 0.5;
            panel2.position.y = panel.position.y + 0.05;
            panel2.rotation.y = panel.rotation.y + 0.1;
            group.add(panel2);

            // Support pedestal
            const pedGeo = new THREE.CylinderGeometry(0.04, 0.06, panel.position.y - 0.1, 4);
            const pedMat = new THREE.MeshStandardMaterial({
                color: 0x081510,
                roughness: 0.3,
                metalness: 0.7,
            });
            const ped = new THREE.Mesh(pedGeo, pedMat);
            ped.position.y = (panel.position.y - 0.1) / 2;
            group.add(ped);

            this.scene.add(this._track(group));
        }
    }

    _createRingSkyband() {
        // The Halo ring curving upward in the sky — the signature visual
        // A massive curved band visible overhead, representing the other side of the ring

        // Inner ring band — the ring surface you can see curving up and over
        const ringGeo = new THREE.TorusGeometry(120, 1.5, 4, 64, Math.PI * 0.6);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x061a10,
            emissive: 0x0a2a18,
            emissiveIntensity: 0.15,
            roughness: 0.4,
            metalness: 0.6,
            side: THREE.DoubleSide,
        });
        const ringBand = new THREE.Mesh(ringGeo, ringMat);
        ringBand.position.y = 50;
        ringBand.rotation.x = Math.PI / 2;
        ringBand.rotation.z = -Math.PI * 0.3;
        this.scene.add(this._track(ringBand));

        // Energy conduit lines on the sky ring
        const conduitGeo = new THREE.TorusGeometry(120, 0.15, 3, 64, Math.PI * 0.6);
        const conduitMat = new THREE.MeshStandardMaterial({
            color: 0x44ffaa,
            emissive: 0x22dd88,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.4,
        });
        for (let i = 0; i < 3; i++) {
            const conduit = new THREE.Mesh(conduitGeo, conduitMat.clone());
            conduit.position.y = 50;
            conduit.rotation.x = Math.PI / 2;
            conduit.rotation.z = -Math.PI * 0.3;
            conduit.scale.set(1 + i * 0.005, 1 + i * 0.005, 1);
            this.scene.add(this._track(conduit));
        }

        // Distant star field — subtle ambient light sources in the void
        const starCount = 80;
        for (let i = 0; i < starCount; i++) {
            const starGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 4, 4);
            const starMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.15 + Math.random() * 0.3, 0.1, 0.5 + Math.random() * 0.4),
                transparent: true,
                opacity: 0.3 + Math.random() * 0.5,
            });
            const star = new THREE.Mesh(starGeo, starMat);
            // Place in a dome above
            const sAngle = Math.random() * Math.PI * 2;
            const sElev = 0.2 + Math.random() * 0.7; // elevation from horizon
            const sDist = 80 + Math.random() * 40;
            star.position.set(
                Math.cos(sAngle) * Math.cos(sElev * Math.PI / 2) * sDist,
                Math.sin(sElev * Math.PI / 2) * sDist + 20,
                Math.sin(sAngle) * Math.cos(sElev * Math.PI / 2) * sDist
            );
            this.scene.add(this._track(star));
        }
    }

    _createRingLighting(zone) {
        // Forerunner-style lighting: cool teal ambience with warm secondary
        // The ring's internal lighting systems still function, creating an eerie
        // mix of ancient technology and natural overgrowth

        // Teal-green ambient
        const ambient = new THREE.AmbientLight(zone.colors.ambientLight, 0.5);
        this.scene.add(this._track(ambient));

        // Main directional — cool teal-white (the ring's artificial sun)
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 0.9);
        dirLight.position.set(15, 35, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;

        // Warm fill light (simulating reflected light from the ring's surface)
        const fillLight = new THREE.DirectionalLight(0x88ccaa, 0.25);
        fillLight.position.set(-10, 15, -5);
        this.scene.add(this._track(fillLight));

        // Ground-up Forerunner energy glow
        const upLight = new THREE.DirectionalLight(0x22dd88, 0.15);
        upLight.position.set(0, -3, 0);
        this.scene.add(this._track(upLight));

        // Hemisphere: teal sky, dark ground
        const hemi = new THREE.HemisphereLight(0x1a4433, 0x020a06, 0.5);
        this.scene.add(this._track(hemi));

        // Forerunner energy node point lights
        for (let i = 0; i < 6; i++) {
            const pl = new THREE.PointLight(0x44ffaa, 0.7, 22, 2);
            pl.position.set(
                (Math.random() - 0.5) * 40,
                1.5 + Math.random() * 3,
                (Math.random() - 0.5) * 40
            );
            this.scene.add(this._track(pl));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 7 — CRIMSON REACH (Geonosian-inspired alien desert)
    // ═══════════════════════════════════════════════════════════
    async _buildCrimsonReach(zone) {
        this.scene.background = new THREE.Color(zone.colors.sceneBg);
        this._createCrimsonGround(zone);
        await this._yield();
        this._createSandstoneSpires(zone);
        await this._yield();
        this._createCrimsonRocks(zone);
        await this._yield();
        this._createHiveStructures();
        this._createDesertFlora();
        this._createSandstormParticles(zone);
        this._createGodRays(zone.colors.godRayColor, 0.03);
        this._createParticles(zone.colors.particleColor);
        this._createCrimsonLighting(zone);
        this.scene.fog = new THREE.FogExp2(zone.colors.fogColor, zone.colors.fogDensity);
    }

    _createCrimsonGround(zone) {
        const groundTex = this.loader.load(zone.textures.ground);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(16, 16);
        groundTex.colorSpace = THREE.SRGBColorSpace;

        // Define height function for this zone
        this._heightFunc = (x, z) => {
            const dune = Math.sin(x * 0.06 + 0.3) * Math.cos(z * 0.05) * 0.8;
            const crack = Math.abs(Math.sin(x * 0.4 + z * 0.3)) < 0.04 ? -0.15 : 0;
            const detail = Math.sin(x * 0.2) * Math.cos(z * 0.25) * 0.15;
            return dune + crack + detail;
        };

        const groundGeo = new THREE.PlaneGeometry(CONFIG.WORLD_SIZE * 2, CONFIG.WORLD_SIZE * 2, 48, 48);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i); const y = posAttr.getY(i);
            // Harsh desert terrain: wind-carved dunes + cracked hardpan
            const noise = this._heightFunc(x, y); // PlaneGeometry 'y' is our world 'z'
            posAttr.setZ(i, noise);
        }
        groundGeo.computeVertexNormals();
        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex, roughness: 0.92, metalness: 0.05, color: 0x3a1a0a,
        });
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this._track(this.groundMesh));
        // Cracked hardpan patches
        for (let i = 0; i < 30; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 1.5;
            const s = 1.5 + Math.random() * 3;
            const geo = new THREE.CircleGeometry(s, 5 + Math.floor(Math.random() * 3));
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.06 + Math.random() * 0.03, 0.5, 0.08 + Math.random() * 0.04),
                roughness: 1.0, transparent: true, opacity: 0.6,
            });
            const patch = new THREE.Mesh(geo, mat);
            patch.rotation.x = -Math.PI / 2; patch.position.set(x, 0.02, z);
            this.scene.add(this._track(patch));
        }
    }

    _createSandstoneSpires(zone) {
        // Massive Geonosian-inspired sandstone spires — towering, wind-carved, alien
        const count = 22; const placed = [];
        for (let i = 0; i < count; i++) {
            const pos = this._getSpacedPosition(placed, this._minTreeSpacing, 8, CONFIG.WORLD_SIZE * 0.7);
            placed.push(pos);
            const scale = 0.5 + Math.random() * 1.8;
            const group = new THREE.Group();
            group.position.set(pos.x, 0, pos.z);
            // Sandstone material — warm red-orange with rough surface
            const sandMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.05 + Math.random() * 0.04, 0.55 + Math.random() * 0.15, 0.12 + Math.random() * 0.06),
                roughness: 0.85 + Math.random() * 0.1, metalness: 0.05,
            });
            // Main spire — tall tapered cylinder with wind erosion
            const height = (6 + Math.random() * 14) * scale;
            const baseR = (0.5 + Math.random() * 0.7) * scale;
            const topR = baseR * (0.15 + Math.random() * 0.3);
            const geo = new THREE.CylinderGeometry(topR, baseR, height, 6 + Math.floor(Math.random() * 3));
            const pa = geo.attributes.position;
            for (let j = 0; j < pa.count; j++) {
                const vy = pa.getY(j);
                const n = 1 + Math.sin(vy * 0.8 + j * 0.6) * 0.12 + Math.cos(vy * 1.5) * 0.06;
                pa.setX(j, pa.getX(j) * n); pa.setZ(j, pa.getZ(j) * n);
            }
            geo.computeVertexNormals();
            const spire = new THREE.Mesh(geo, sandMat);
            spire.position.y = height / 2; spire.castShadow = false; spire.receiveShadow = false;
            group.add(spire);
            // Wind-carved horizontal bands (erosion lines)
            const bandCount = 2 + Math.floor(Math.random() * 3);
            for (let b = 0; b < bandCount; b++) {
                const bh = (0.2 + Math.random() * 0.6) * height;
                const br = baseR * (0.7 + (1 - bh / height) * 0.5);
                const bandGeo = new THREE.TorusGeometry(br * 1.1, 0.03 * scale, 4, 12);
                const bandMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.04, 0.4, 0.06), roughness: 0.9,
                });
                const band = new THREE.Mesh(bandGeo, bandMat);
                band.position.y = bh; band.rotation.x = Math.PI / 2;
                group.add(band);
            }
            // Glowing amber mineral vein
            if (Math.random() > 0.4) {
                const vGeo = new THREE.BoxGeometry(0.04 * scale, height * 0.5, 0.04 * scale);
                const vMat = new THREE.MeshStandardMaterial({
                    color: 0xffaa33, emissive: 0xcc7711, emissiveIntensity: 0.5, roughness: 0.2,
                });
                const vein = new THREE.Mesh(vGeo, vMat);
                vein.position.set(baseR * 0.6, height * 0.35, 0);
                vein.rotation.z = (Math.random() - 0.5) * 0.2;
                group.add(vein);
            }
            // Base rubble
            const rubbleGeo = new THREE.CylinderGeometry(baseR * 1.3, baseR * 1.5, 0.3 * scale, 6);
            const rubbleMat = sandMat.clone(); rubbleMat.color = new THREE.Color().setHSL(0.05, 0.4, 0.08);
            const rubble = new THREE.Mesh(rubbleGeo, rubbleMat);
            rubble.position.y = 0.15 * scale; group.add(rubble);
            this.scene.add(this._track(group));
            this.trees.push({ group, x: pos.x, z: pos.z, radius: baseR + 0.5 });
        }
        // Perimeter mega-spires (distant massive formations)
        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2;
            const dist = CONFIG.WORLD_SIZE * 0.8 + Math.random() * 5;
            const x = Math.cos(angle) * dist; const z = Math.sin(angle) * dist;
            const scale = 1.5 + Math.random() * 1.5;
            const height = (12 + Math.random() * 18) * scale;
            const baseR = (0.6 + Math.random() * 0.5) * scale;
            const geo = new THREE.CylinderGeometry(baseR * 0.2, baseR, height, 5);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.04, 0.45, 0.06), roughness: 0.9, metalness: 0.05,
            });
            const spire = new THREE.Mesh(geo, mat);
            spire.position.set(x, height / 2, z); spire.castShadow = false;
            this.scene.add(this._track(spire));
            this.trees.push({ group: spire, x, z, radius: baseR + 0.5 });
        }
    }

    _createCrimsonRocks(zone) {
        const rockTex = this.loader.load(zone.textures.rock);
        rockTex.colorSpace = THREE.SRGBColorSpace;
        const placed = [];
        for (let i = 0; i < 16; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minRockSpacing, CONFIG.WORLD_SIZE * 1.2);
            placed.push(pos);
            const scale = 0.5 + Math.random() * 2.5;
            const group = new THREE.Group(); group.position.set(pos.x, 0, pos.z);
            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rpa = rockGeo.attributes.position;
            for (let j = 0; j < rpa.count; j++) {
                rpa.setY(j, rpa.getY(j) * 0.4);
                const n = 1 + Math.sin(rpa.getX(j) * 3) * Math.cos(rpa.getZ(j) * 3) * 0.15;
                rpa.setX(j, rpa.getX(j) * n); rpa.setZ(j, rpa.getZ(j) * n);
            }
            rockGeo.computeVertexNormals();
            const rockMat = new THREE.MeshStandardMaterial({
                map: rockTex, roughness: 0.85, metalness: 0.08,
                color: new THREE.Color().setHSL(0.05 + Math.random() * 0.03, 0.5, 0.1 + Math.random() * 0.04),
            });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.y = scale * 0.2; rock.rotation.y = Math.random() * Math.PI;
            rock.castShadow = false; rock.receiveShadow = false; group.add(rock);
            this.scene.add(this._track(group));
            this.rocks.push({ group, x: pos.x, z: pos.z, radius: scale * 0.6 + 0.3 });
        }
    }

    _createHiveStructures() {
        // Geonosian-style hive mounds — bio-organic chitin architecture
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 12 + Math.random() * 28;
            const x = Math.cos(angle) * dist; const z = Math.sin(angle) * dist;
            const group = new THREE.Group(); group.position.set(x, 0, z);
            const scale = 0.6 + Math.random() * 1.0;
            // Main hive mound — organic dome shape
            const moundGeo = new THREE.SphereGeometry(2 * scale, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
            const moundMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.06, 0.4, 0.1), roughness: 0.8, metalness: 0.1,
            });
            const mound = new THREE.Mesh(moundGeo, moundMat);
            mound.castShadow = false; mound.receiveShadow = false; group.add(mound);
            // Hive tunnel entrances — dark holes
            const tunnelCount = 2 + Math.floor(Math.random() * 3);
            for (let t = 0; t < tunnelCount; t++) {
                const ta = (t / tunnelCount) * Math.PI * 2 + Math.random() * 0.5;
                const tGeo = new THREE.CircleGeometry(0.3 * scale, 6);
                const tMat = new THREE.MeshStandardMaterial({ color: 0x050200, roughness: 1.0 });
                const tunnel = new THREE.Mesh(tGeo, tMat);
                tunnel.position.set(Math.cos(ta) * 1.5 * scale, 0.3 + Math.random() * 0.8 * scale, Math.sin(ta) * 1.5 * scale);
                tunnel.lookAt(x, tunnel.position.y, z); group.add(tunnel);
            }
            // Chitin spikes on top
            const spikeCount = 3 + Math.floor(Math.random() * 4);
            for (let s = 0; s < spikeCount; s++) {
                const sh = (0.5 + Math.random() * 1.5) * scale;
                const sGeo = new THREE.ConeGeometry(0.08 * scale, sh, 4);
                const sMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.07, 0.5, 0.12), roughness: 0.6,
                    emissive: 0xaa4400, emissiveIntensity: 0.1,
                });
                const spike = new THREE.Mesh(sGeo, sMat);
                spike.position.set(
                    (Math.random() - 0.5) * 1.2 * scale,
                    1.5 * scale + sh / 2,
                    (Math.random() - 0.5) * 1.2 * scale
                );
                spike.rotation.x = (Math.random() - 0.5) * 0.3;
                spike.rotation.z = (Math.random() - 0.5) * 0.3;
                group.add(spike);
            }
            // Amber bio-luminescent glow from within
            const glowGeo = new THREE.SphereGeometry(0.6 * scale, 6, 4);
            const glowMat = new THREE.MeshStandardMaterial({
                color: 0xffaa33, emissive: 0xff8811, emissiveIntensity: 0.4,
                transparent: true, opacity: 0.4,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = 0.8 * scale; group.add(glow);
            this.scene.add(this._track(group));
            // Hive mounds have solid ground-level geometry — add collision
            this.rocks.push({ group, x, z, radius: 1.5 * scale });
        }
    }

    _createDesertFlora() {
        // Sparse, hardy alien desert plants — nothing like other zones
        const placed = [];
        for (let i = 0; i < 18; i++) {
            const pos = this._getSpacedRectPosition(placed, this._minBushSpacing, CONFIG.WORLD_SIZE * 1.3);
            placed.push(pos);
            const scale = 0.3 + Math.random() * 0.7;
            const group = new THREE.Group(); group.position.set(pos.x, 0, pos.z);
            // Crimson thorn bushes — spiky, hostile-looking
            const thornCount = 4 + Math.floor(Math.random() * 5);
            for (let t = 0; t < thornCount; t++) {
                const th = (0.3 + Math.random() * 0.8) * scale;
                const tGeo = new THREE.ConeGeometry(0.03 * scale, th, 3);
                const tMat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.02 + Math.random() * 0.04, 0.6, 0.12 + Math.random() * 0.05),
                    roughness: 0.7, emissive: new THREE.Color().setHSL(0.05, 0.5, 0.03), emissiveIntensity: 0.15,
                });
                const thorn = new THREE.Mesh(tGeo, tMat);
                const ta = (t / thornCount) * Math.PI * 2;
                thorn.position.set(Math.cos(ta) * 0.15 * scale, th / 2, Math.sin(ta) * 0.15 * scale);
                thorn.rotation.x = (Math.random() - 0.5) * 0.5;
                thorn.rotation.z = (Math.random() - 0.5) * 0.5;
                group.add(thorn);
            }
            this.scene.add(this._track(group));
            this.bushes.push({ group, x: pos.x, z: pos.z });
        }
    }

    _createSandstormParticles(zone) {
        // Horizontal sand drift particles — unique to this zone
        const count = 60;
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
            const y = 0.1 + Math.random() * 3;
            const length = 1 + Math.random() * 3;
            const geo = new THREE.PlaneGeometry(0.02, length);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xcc8855, transparent: true, opacity: 0.1 + Math.random() * 0.15,
                side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
            });
            const drift = new THREE.Mesh(geo, mat);
            drift.position.set(x, y, z);
            drift.rotation.x = Math.PI / 2;
            drift.rotation.z = Math.random() * 0.5;
            this.scene.add(this._track(drift));
        }
    }

    _createCrimsonLighting(zone) {
        const ambient = new THREE.AmbientLight(zone.colors.ambientLight, 0.5);
        this.scene.add(this._track(ambient));
        const dirLight = new THREE.DirectionalLight(zone.colors.directionalLight, 1.0);
        dirLight.position.set(15, 30, 10);
        dirLight.castShadow = false;
        dirLight.shadow.mapSize.width = 512; dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = 0.5; dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -30; dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30; dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.bias = -0.001;
        this.scene.add(this._track(dirLight));
        this.dirLight = dirLight;
        // Warm fill — scorching desert sun
        const fillLight = new THREE.DirectionalLight(0xcc6633, 0.3);
        fillLight.position.set(-10, 20, -5);
        this.scene.add(this._track(fillLight));
        // Hemisphere: orange-red sky, dark crimson ground
        const hemi = new THREE.HemisphereLight(0x331a08, 0x0a0402, 0.6);
        this.scene.add(this._track(hemi));
        // Amber glow point lights near hive structures
        for (let i = 0; i < 5; i++) {
            const pl = new THREE.PointLight(0xff8833, 0.6, 20, 2);
            pl.position.set((Math.random() - 0.5) * 40, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 40);
            this.scene.add(this._track(pl));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SHARED HELPERS
    // ═══════════════════════════════════════════════════════════
    _createGodRays(color, baseAlpha) {
        const rayCount = 8;
        for (let i = 0; i < rayCount; i++) {
            const x = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.8;
            const z = (Math.random() - 0.5) * CONFIG.WORLD_SIZE * 0.8;
            const rayHeight = 20 + Math.random() * 15;
            const rayWidth = 1 + Math.random() * 3;
            const rayGeo = new THREE.PlaneGeometry(rayWidth, rayHeight);
            const rayMat = new THREE.MeshBasicMaterial({
                color, transparent: true, opacity: baseAlpha + Math.random() * 0.03,
                side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
            });
            const ray = new THREE.Mesh(rayGeo, rayMat);
            ray.position.set(x, rayHeight / 2, z);
            ray.rotation.y = Math.random() * Math.PI;
            ray.rotation.z = (Math.random() - 0.5) * 0.15;
            this.scene.add(this._track(ray));
            this.godRays.push({ mesh: ray, baseOpacity: rayMat.opacity, phase: Math.random() * Math.PI * 2 });
            
            const ray2 = ray.clone();
            ray2.material = rayMat.clone();
            ray2.rotation.y = ray.rotation.y + Math.PI / 2;
            this.scene.add(this._track(ray2));
            this.godRays.push({ mesh: ray2, baseOpacity: ray2.material.opacity, phase: Math.random() * Math.PI * 2 });
        }
    }

    _createParticles(color) {
        const particleCount = 120;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
            positions[i * 3 + 1] = 0.5 + Math.random() * 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.WORLD_SIZE;
            sizes[i] = 0.03 + Math.random() * 0.06;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const particleMat = new THREE.PointsMaterial({
            color, size: 0.08, transparent: true, opacity: 0.4,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
        });
        this.particleSystem = new THREE.Points(particleGeo, particleMat);
        this.scene.add(this._track(this.particleSystem));
    }

    update(time, dt) {
        // God rays: update opacity
        const rays = this.godRays;
        for (let i = 0; i < rays.length; i++) {
            const ray = rays[i];
            ray.mesh.material.opacity = ray.baseOpacity * (0.6 + Math.sin(time * 0.3 + ray.phase) * 0.4);
        }
        // Particles: gentle drift using cheaper linear offset instead of per-particle trig
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const count = positions.length / 3;
            const drift = Math.sin(time * 0.3) * 0.002;
            const rise = dt * 0.15;
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                positions[i3] += drift;
                positions[i3 + 1] += rise;
                positions[i3 + 2] += drift;
                if (positions[i3 + 1] > 10) positions[i3 + 1] = 0.5;
            }
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }

    isPositionBlocked(x, z, radius = 1) {
        // Extra clearance buffer so entities don't spawn right at obstacle edges
        const buffer = 0.5;
        for (const tree of this.trees) {
            const dx = x - tree.x; const dz = z - tree.z;
            const minDist = tree.radius + radius + buffer;
            if (dx * dx + dz * dz < minDist * minDist) return true;
        }
        for (const rock of this.rocks) {
            const dx = x - rock.x; const dz = z - rock.z;
            const minDist = rock.radius + radius + buffer;
            if (dx * dx + dz * dz < minDist * minDist) return true;
        }
        return false;
    }

    getRandomOpenPosition(radius = 2, maxDist = 20) {
        for (let attempt = 0; attempt < 60; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 3 + Math.random() * maxDist;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            if (!this.isPositionBlocked(x, z, radius)) return { x, z };
        }
        // Fallback: try positions in the clear center area
        for (let attempt = 0; attempt < 20; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 2 + Math.random() * this._centerClearRadius;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            if (!this.isPositionBlocked(x, z, radius)) return { x, z };
        }
        return { x: Math.random() * 5, z: Math.random() * 5 };
    }
}
