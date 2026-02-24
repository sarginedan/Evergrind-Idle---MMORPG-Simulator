// Player Character - Armored Warrior with auto-idle behavior
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { aetherbitShop } from './AetherbitShop.js';
import { goldShop } from './GoldShop.js';
import { buildVoidweaverModel, buildThornwardenModel, buildDawnkeeperModel } from './PlayerModels.js';

export class Player {
    constructor(scene, classId = 'warrior') {
        this.scene = scene;
        this.classId = classId;
        this.group = new THREE.Group();
        this.position = new THREE.Vector3(0, 0, 0);
        this.targetPosition = null;
        this._hasTarget = false;
        this.rotation = 0;
        this.targetRotation = 0;
        
        // Variable collision radius — used by resolveCharacterOverlaps() in main.js
        // Default NORMAL (0.4). Set to LARGE (0.6) when mounted, SMALL (0.25) for mini forms.
        this.collisionRadius = 0.40;
        
        // World reference for obstacle avoidance (set by main.js)
        this.world = null;
        
        // Obstacle avoidance — multi-obstacle fan-slide system
        this._playerRadius = 0.45;
        // Pre-allocated overlap array (max 8 simultaneous overlaps)
        this._overlaps = [];
        for (let i = 0; i < 8; i++) this._overlaps.push({ ox: 0, oz: 0, r: 0, sq: 0 });
        // Pre-computed slide angle lookup (avoids cos/sin per frame)
        this._slideAngles = [0.5, -0.5, 1.0, -1.0, 1.57, -1.57, 2.1, -2.1];
        this._slideCos = this._slideAngles.map(a => Math.cos(a));
        this._slideSin = this._slideAngles.map(a => Math.sin(a));
        this._slideResult = { x: 0, z: 0 };
        
        // Stuck detection
        this._stuckTimer = 0;
        this._stuckCheckX = 0;
        this._stuckCheckZ = 0;
        this._stuckCount = 0;           // consecutive stuck detections
        
        // Animation state
        this.walkPhase = 0;
        this.attackPhase = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.idleTimer = 0;
        this.swingDirection = 1;
        
        // Parts for animation
        this.parts = {};
        
        this.buildCharacter();
        this.scene.add(this.group);
        
        // Nameplate
        this.nameplate = null;
        this.healthBar = null;
    }

    setClass(classId) {
        if (this.classId === classId) return;
        this.classId = classId;
        this.buildCharacter();
        console.log(`🛡️ Player class updated to: ${classId}`);
    }

    buildCharacter() {
        // Clear existing model parts
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.parts = {};
        this._aetherMats = [];
        this._aetherBaseEmissive = [];

        // Dispatch to class-specific model builder
        if (this.classId === 'mage') {
            buildVoidweaverModel(this);
            return;
        }
        if (this.classId === 'ranger') {
            buildThornwardenModel(this);
            return;
        }
        if (this.classId === 'cleric') {
            buildDawnkeeperModel(this);
            return;
        }

        // ═══════════════════════════════════════════════════════════════
        // AETHERBLADE WARRIOR — UE5-quality arcane knight model
        // Default warrior model for 'warrior' classId (and any unknown)
        // ═══════════════════════════════════════════════════════════════

        // ── UE5-Grade Material Library (MeshStandardMaterial for key pieces) ──

        // Primary dark-blue metallic armor — clearcoated for wet specular
        let armorColor = 0x1a2a4a;
        let armorLightColor = 0x2a3d62;
        let glowColor = 0x55eeff;
        let emissiveColor = 0x33bbdd;

        const armorMat = new THREE.MeshStandardMaterial({
            color: armorColor,
            metalness: 0.88,
            roughness: 0.12,
            clearcoat: 0.6,
            clearcoatRoughness: 0.15,
            reflectivity: 0.9,
        });
        // Secondary lighter blue armor plates
        const armorLightMat = new THREE.MeshStandardMaterial({
            color: armorLightColor,
            metalness: 0.82,
            roughness: 0.18,
            clearcoat: 0.4,
            clearcoatRoughness: 0.2,
            reflectivity: 0.8,
        });
        // Dark undersuit / joints — subsurface look
        const undersuitMat = new THREE.MeshStandardMaterial({
            color: 0x0d1520,
            metalness: 0.2,
            roughness: 0.55,
            sheen: 0.3,
            sheenRoughness: 0.8,
            sheenColor: new THREE.Color(0x1a3050),
        });
        // Cyan aether glow trim
        const aetherGlowMat = new THREE.MeshStandardMaterial({
            color: glowColor,
            emissive: emissiveColor,
            emissiveIntensity: 2.0,
            metalness: 0.5,
            roughness: 0.15,
            transparent: true,
            opacity: 0.95,
            transmission: 0.1,
        });
        // Purple/violet arcane glow (off-hand magic)
        const arcaneMat = new THREE.MeshStandardMaterial({
            color: 0xbb77ff,
            emissive: 0x9955ee,
            emissiveIntensity: 1.6,
            metalness: 0.2,
            roughness: 0.25,
            transparent: true,
            opacity: 0.85,
            transmission: 0.15,
        });
        // Silver metallic accent (trim, buckles, shoulder edges)
        const silverMat = new THREE.MeshStandardMaterial({
            color: 0xb0c0d0,
            metalness: 0.95,
            roughness: 0.06,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            reflectivity: 1.0,
        });
        // Gold accent (belt buckle, gem settings)
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xd4ad50,
            metalness: 0.95,
            roughness: 0.08,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
        });
        // Skin tone — with subsurface approximation
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xd4a574,
            metalness: 0.0,
            roughness: 0.6,
            sheen: 0.4,
            sheenRoughness: 0.6,
            sheenColor: new THREE.Color(0xffccaa),
        });
        // Silver-white hair — with sheen for that silky look
        const hairMat = new THREE.MeshStandardMaterial({
            color: 0xd5dde5,
            metalness: 0.1,
            roughness: 0.45,
            sheen: 0.8,
            sheenRoughness: 0.3,
            sheenColor: new THREE.Color(0xeeeeff),
        });
        // Cape / tabard — silver-white with fabric sheen
        const capeFabricMat = new THREE.MeshStandardMaterial({
            color: 0xbcc4d0,
            metalness: 0.05,
            roughness: 0.65,
            sheen: 0.6,
            sheenRoughness: 0.5,
            sheenColor: new THREE.Color(0xdde0f0),
            side: THREE.DoubleSide,
        });
        // Dark cape inner lining
        const capeLiningMat = new THREE.MeshStandardMaterial({
            color: 0x141e30,
            metalness: 0.05,
            roughness: 0.8,
            sheen: 0.2,
            sheenRoughness: 0.7,
            sheenColor: new THREE.Color(0x1a2a50),
            side: THREE.DoubleSide,
        });
        // Glowing blade material — transmission for that ethereal look
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x99ddff,
            emissive: 0x55bbee,
            emissiveIntensity: 1.4,
            metalness: 0.7,
            roughness: 0.03,
            transparent: true,
            opacity: 0.9,
            transmission: 0.2,
            thickness: 0.5,
        });
        // Dark blade edge
        const bladeEdgeMat = new THREE.MeshStandardMaterial({
            color: 0x334466,
            metalness: 0.95,
            roughness: 0.06,
            clearcoat: 0.8,
            clearcoatRoughness: 0.05,
        });
        // Aether gem — iridescence for that magical crystal look
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0x22ffff,
            emissive: 0x00ddee,
            emissiveIntensity: 2.5,
            metalness: 0.4,
            roughness: 0.05,
            transparent: true,
            opacity: 0.92,
            iridescence: 0.8,
            iridescenceIOR: 1.8,
            transmission: 0.3,
            thickness: 0.3,
        });

        // Save materials for runtime aether pulse animation
        this._aetherMats = [aetherGlowMat, arcaneMat, bladeMat, gemMat];
        this._aetherBaseEmissive = this._aetherMats.map(m => m.emissiveIntensity);

        // ═══════════════════════════════════════════════════════════════
        // TORSO — Shaped chest armor with layered plates
        // ═══════════════════════════════════════════════════════════════
        const torso = new THREE.Group();
        
        // Core chest — tapered cylinder for organic shape
        const chestGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.65, 8);
        const chest = new THREE.Mesh(chestGeo, armorMat);
        chest.scale.set(1.2, 1.0, 0.7);
        chest.castShadow = true;
        torso.add(chest);

        // Front breastplate (raised overlay with bevel feel)
        const breastGeo = new THREE.CylinderGeometry(0.2, 0.23, 0.55, 8, 1, false, -Math.PI * 0.5, Math.PI);
        const breast = new THREE.Mesh(breastGeo, armorLightMat);
        breast.scale.set(1.1, 1.0, 0.5);
        breast.position.set(0, 0.02, 0.08);
        breast.castShadow = true;
        torso.add(breast);

        // Center chest gem housing
        const gemHouseGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.04, 12);
        const gemHouse = new THREE.Mesh(gemHouseGeo, silverMat);
        gemHouse.rotation.x = Math.PI / 2;
        gemHouse.position.set(0, 0.08, 0.22);
        torso.add(gemHouse);

        // Center chest gem (glowing aether core)
        const chestGemGeo = new THREE.SphereGeometry(0.045, 16, 16);
        const chestGem = new THREE.Mesh(chestGemGeo, gemMat);
        chestGem.position.set(0, 0.08, 0.24);
        torso.add(chestGem);
        this._chestGem = chestGem;

        // Aether V-trim lines on chest
        for (let side of [-1, 1]) {
            const trimGeo = new THREE.BoxGeometry(0.018, 0.38, 0.018);
            const trim = new THREE.Mesh(trimGeo, aetherGlowMat);
            trim.position.set(side * 0.1, -0.02, 0.22);
            trim.rotation.z = side * 0.18;
            torso.add(trim);
        }
        // Horizontal aether lines across chest
        for (let r = 0; r < 2; r++) {
            const hTrimGeo = new THREE.BoxGeometry(0.3, 0.012, 0.012);
            const hTrim = new THREE.Mesh(hTrimGeo, aetherGlowMat);
            hTrim.position.set(0, -0.08 - r * 0.2, 0.22);
            torso.add(hTrim);
        }

        // Gorget (neck armor) — more polygons
        const gorgetGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.12, 12);
        const gorget = new THREE.Mesh(gorgetGeo, armorLightMat);
        gorget.position.y = 0.37;
        gorget.castShadow = true;
        torso.add(gorget);

        // Gorget rim glow
        const gorgetRimGeo = new THREE.TorusGeometry(0.15, 0.01, 6, 16);
        const gorgetRim = new THREE.Mesh(gorgetRimGeo, aetherGlowMat);
        gorgetRim.rotation.x = Math.PI / 2;
        gorgetRim.position.y = 0.32;
        torso.add(gorgetRim);

        // Side plates / lames (ribs armor detail)
        for (let side of [-1, 1]) {
            for (let row = 0; row < 3; row++) {
                const lameGeo = new THREE.BoxGeometry(0.055, 0.11, 0.28);
                const lame = new THREE.Mesh(lameGeo, armorLightMat);
                lame.position.set(side * 0.29, 0.15 - row * 0.15, 0);
                torso.add(lame);
                // Lame edge glow
                const leGeo = new THREE.BoxGeometry(0.056, 0.008, 0.28);
                const le = new THREE.Mesh(leGeo, aetherGlowMat);
                le.position.set(side * 0.29, 0.1 - row * 0.15, 0);
                torso.add(le);
            }
        }

        // Back plate detail
        const backPlateGeo = new THREE.BoxGeometry(0.4, 0.5, 0.06);
        const backPlate = new THREE.Mesh(backPlateGeo, armorMat);
        backPlate.position.set(0, 0.02, -0.16);
        torso.add(backPlate);

        torso.position.y = 1.15;
        this.parts.torso = torso;
        this.group.add(torso);

        // ═══════════════════════════════════════════════════════════════
        // SHOULDER PAULDRONS — Ornate, with glowing rune lines
        // ═══════════════════════════════════════════════════════════════
        this._shoulderParts = [];
        for (let side of [-1, 1]) {
            const shoulderGroup = new THREE.Group();

            // Main pauldron dome — higher poly
            const pauldronGeo = new THREE.SphereGeometry(0.2, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.6);
            const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
            pauldron.scale.set(1.15, 0.9, 1.05);
            pauldron.castShadow = true;
            shoulderGroup.add(pauldron);

            // Layered pauldron ridge
            const ridgeGeo = new THREE.TorusGeometry(0.18, 0.022, 8, 16, Math.PI);
            const ridge = new THREE.Mesh(ridgeGeo, silverMat);
            ridge.rotation.x = Math.PI / 2;
            ridge.rotation.z = side * 0.3;
            ridge.position.y = -0.02;
            shoulderGroup.add(ridge);

            // Second ridge (smaller)
            const ridge2Geo = new THREE.TorusGeometry(0.14, 0.015, 6, 12, Math.PI * 0.8);
            const ridge2 = new THREE.Mesh(ridge2Geo, armorLightMat);
            ridge2.rotation.x = Math.PI / 2;
            ridge2.rotation.z = side * 0.2;
            ridge2.position.y = 0.04;
            shoulderGroup.add(ridge2);

            // Aether glow ring on pauldron
            const glowRingGeo = new THREE.TorusGeometry(0.12, 0.012, 8, 16);
            const glowRing = new THREE.Mesh(glowRingGeo, aetherGlowMat);
            glowRing.rotation.x = Math.PI / 2;
            glowRing.position.y = 0.02;
            shoulderGroup.add(glowRing);

            // Shoulder gem — larger with housing
            const sGemHouseGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.02, 8);
            const sGemHouse = new THREE.Mesh(sGemHouseGeo, goldMat);
            sGemHouse.position.y = 0.055;
            shoulderGroup.add(sGemHouse);
            const sGemGeo = new THREE.OctahedronGeometry(0.035, 1);
            const sGem = new THREE.Mesh(sGemGeo, gemMat);
            sGem.position.y = 0.075;
            shoulderGroup.add(sGem);

            // Shoulder guard plate (hanging protection)
            const guardGeo = new THREE.BoxGeometry(0.14, 0.18, 0.13);
            const guard = new THREE.Mesh(guardGeo, armorLightMat);
            guard.position.set(side * 0.04, -0.16, 0);
            shoulderGroup.add(guard);

            // Guard edge trim
            const guardTrimGeo = new THREE.BoxGeometry(0.145, 0.01, 0.135);
            const guardTrim = new THREE.Mesh(guardTrimGeo, aetherGlowMat);
            guardTrim.position.set(side * 0.04, -0.25, 0);
            shoulderGroup.add(guardTrim);

            shoulderGroup.position.set(side * 0.4, 1.47, 0);
            shoulderGroup.castShadow = true;
            this._shoulderParts.push(shoulderGroup);
            this.group.add(shoulderGroup);
        }

        // ═══════════════════════════════════════════════════════════════
        // WAIST — Belt with aether buckle and tabard attachment
        // ═══════════════════════════════════════════════════════════════
        const beltGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.1, 10);
        const belt = new THREE.Mesh(beltGeo, undersuitMat);
        belt.scale.set(1.05, 1, 0.7);
        belt.position.y = 0.82;
        this.group.add(belt);

        // Belt armor plates
        for (let i = -2; i <= 2; i++) {
            const plateGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
            const plate = new THREE.Mesh(plateGeo, armorLightMat);
            plate.position.set(i * 0.11, 0.82, 0.2);
            this.group.add(plate);
        }

        // Central belt buckle — ornate
        const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.05);
        const buckle = new THREE.Mesh(buckleGeo, goldMat);
        buckle.position.set(0, 0.82, 0.22);
        this.group.add(buckle);

        // Buckle inner design
        const buckleInnerGeo = new THREE.BoxGeometry(0.08, 0.06, 0.01);
        const buckleInner = new THREE.Mesh(buckleInnerGeo, armorMat);
        buckleInner.position.set(0, 0.82, 0.255);
        this.group.add(buckleInner);

        // Buckle gem
        const bGemGeo = new THREE.SphereGeometry(0.022, 8, 8);
        const bGem = new THREE.Mesh(bGemGeo, gemMat);
        bGem.position.set(0, 0.82, 0.26);
        this.group.add(bGem);

        // Front tabard panel — higher res for physics
        const frontTabardGeo = new THREE.PlaneGeometry(0.28, 0.55, 3, 6);
        const frontTabard = new THREE.Mesh(frontTabardGeo, capeFabricMat);
        frontTabard.position.set(0, 0.50, 0.18);
        this.group.add(frontTabard);
        this._frontTabard = frontTabard;

        // Tabard V-design (aether lines)
        for (let side of [-1, 1]) {
            const tvGeo = new THREE.BoxGeometry(0.01, 0.35, 0.005);
            const tv = new THREE.Mesh(tvGeo, aetherGlowMat);
            tv.position.set(side * 0.06, 0.42, 0.186);
            tv.rotation.z = side * 0.08;
            this.group.add(tv);
        }

        // Tabard bottom trim (aether glow edge)
        const tabardTrimGeo = new THREE.BoxGeometry(0.3, 0.015, 0.01);
        const tabardTrim = new THREE.Mesh(tabardTrimGeo, aetherGlowMat);
        tabardTrim.position.set(0, 0.24, 0.185);
        this.group.add(tabardTrim);

        // Tabard emblem — small diamond
        const emblemGeo = new THREE.BoxGeometry(0.04, 0.04, 0.005);
        const emblem = new THREE.Mesh(emblemGeo, aetherGlowMat);
        emblem.position.set(0, 0.52, 0.187);
        emblem.rotation.z = Math.PI / 4;
        this.group.add(emblem);

        // Side tassets (hip armor)
        for (let side of [-1, 1]) {
            const tassetGeo = new THREE.BoxGeometry(0.11, 0.24, 0.11);
            const tasset = new THREE.Mesh(tassetGeo, armorMat);
            tasset.position.set(side * 0.27, 0.66, 0.05);
            this.group.add(tasset);

            // Tasset detail plate
            const tdGeo = new THREE.BoxGeometry(0.09, 0.18, 0.03);
            const td = new THREE.Mesh(tdGeo, armorLightMat);
            td.position.set(side * 0.27, 0.66, 0.09);
            this.group.add(td);

            // Tasset aether trim
            const ttGeo = new THREE.BoxGeometry(0.12, 0.012, 0.12);
            const tt = new THREE.Mesh(ttGeo, aetherGlowMat);
            tt.position.set(side * 0.27, 0.55, 0.05);
            this.group.add(tt);
        }

        // ═══════════════════════════════════════════════════════════════
        // HEAD — Detailed face with silver-white swept-back hair
        // ═══════════════════════════════════════════════════════════════
        const headGroup = new THREE.Group();

        // Head shape — rounded for more organic look
        const headGeo = new THREE.SphereGeometry(0.16, 12, 10);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.scale.set(0.85, 1.0, 0.9);
        head.castShadow = true;
        headGroup.add(head);

        // Jaw definition — tapered box
        const jawGeo = new THREE.BoxGeometry(0.2, 0.1, 0.18);
        const jaw = new THREE.Mesh(jawGeo, skinMat);
        jaw.position.set(0, -0.12, 0.02);
        headGroup.add(jaw);

        // Chin point
        const chinGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const chin = new THREE.Mesh(chinGeo, skinMat);
        chin.position.set(0, -0.16, 0.06);
        headGroup.add(chin);

        // Eyes — glowing aether eyes
        for (let side of [-1, 1]) {
            // Eye socket recess
            const eyeSocketGeo = new THREE.SphereGeometry(0.03, 8, 8);
            const eyeSocket = new THREE.Mesh(eyeSocketGeo, undersuitMat);
            eyeSocket.position.set(side * 0.06, 0.02, 0.12);
            eyeSocket.scale.set(1.2, 0.6, 0.5);
            headGroup.add(eyeSocket);

            // Iris (glowing)
            const irisGeo = new THREE.SphereGeometry(0.015, 8, 8);
            const iris = new THREE.Mesh(irisGeo, aetherGlowMat);
            iris.position.set(side * 0.06, 0.02, 0.135);
            headGroup.add(iris);

            // Eyebrow ridge
            const browGeo = new THREE.BoxGeometry(0.06, 0.015, 0.02);
            const brow = new THREE.Mesh(browGeo, skinMat);
            brow.position.set(side * 0.06, 0.055, 0.12);
            brow.rotation.z = side * -0.15;
            headGroup.add(brow);
        }

        // Nose
        const noseGeo = new THREE.BoxGeometry(0.025, 0.05, 0.04);
        const nose = new THREE.Mesh(noseGeo, skinMat);
        nose.position.set(0, -0.02, 0.14);
        headGroup.add(nose);

        // Nose bridge
        const noseBridgeGeo = new THREE.BoxGeometry(0.02, 0.03, 0.02);
        const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMat);
        noseBridge.position.set(0, 0.02, 0.14);
        headGroup.add(noseBridge);

        // Mouth line
        const mouthGeo = new THREE.BoxGeometry(0.06, 0.005, 0.01);
        const mouth = new THREE.Mesh(mouthGeo, undersuitMat);
        mouth.position.set(0, -0.08, 0.12);
        headGroup.add(mouth);

        // Silver-white swept-back hair — more layered and volumetric
        // Main hair volume (rounded)
        const hairMainGeo = new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65);
        const hairMain = new THREE.Mesh(hairMainGeo, hairMat);
        hairMain.position.set(0, 0.06, -0.02);
        hairMain.scale.set(1.05, 1.0, 1.1);
        headGroup.add(hairMain);

        // Hair top swept crest
        const hairCrestGeo = new THREE.BoxGeometry(0.22, 0.06, 0.2);
        const hairCrest = new THREE.Mesh(hairCrestGeo, hairMat);
        hairCrest.position.set(0, 0.2, 0.02);
        hairCrest.rotation.x = -0.1;
        headGroup.add(hairCrest);

        // Swept-back hair strands (back of head flowing down)
        for (let i = 0; i < 7; i++) {
            const w = 0.04 + (i < 3 ? i * 0.01 : (6 - i) * 0.01);
            const strandGeo = new THREE.BoxGeometry(w, 0.03 + i * 0.015, 0.1 + i * 0.025);
            const strand = new THREE.Mesh(strandGeo, hairMat);
            strand.position.set((i - 3) * 0.042, 0.08 - i * 0.035, -0.16 - i * 0.018);
            strand.rotation.x = 0.15 + i * 0.04;
            headGroup.add(strand);
        }

        // Side hair locks (frame the face)
        for (let side of [-1, 1]) {
            const lockGeo = new THREE.BoxGeometry(0.04, 0.14, 0.08);
            const lock = new THREE.Mesh(lockGeo, hairMat);
            lock.position.set(side * 0.13, -0.02, 0.02);
            lock.rotation.z = side * 0.1;
            headGroup.add(lock);

            // Longer side strands
            const longLockGeo = new THREE.BoxGeometry(0.03, 0.08, 0.06);
            const longLock = new THREE.Mesh(longLockGeo, hairMat);
            longLock.position.set(side * 0.12, -0.12, -0.02);
            longLock.rotation.z = side * 0.15;
            headGroup.add(longLock);
        }

        // Ears
        for (let side of [-1, 1]) {
            const earGeo = new THREE.SphereGeometry(0.02, 6, 6);
            const ear = new THREE.Mesh(earGeo, skinMat);
            ear.scale.set(0.5, 1, 0.7);
            ear.position.set(side * 0.135, 0.0, 0.02);
            headGroup.add(ear);
        }

        headGroup.position.y = 1.72;
        this.parts.head = headGroup;
        this.group.add(headGroup);

        // ═══════════════════════════════════════════════════════════════
        // LEFT ARM — Arcane hand with energy vortex
        // ═══════════════════════════════════════════════════════════════
        const leftArmGroup = new THREE.Group();

        // Upper arm (armored) — tapered
        const lUpperArmGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.32, 8);
        const lUpperArm = new THREE.Mesh(lUpperArmGeo, armorMat);
        lUpperArm.position.y = -0.16;
        lUpperArm.castShadow = true;
        leftArmGroup.add(lUpperArm);

        // Upper arm plate
        const lArmPlateGeo = new THREE.BoxGeometry(0.08, 0.2, 0.04);
        const lArmPlate = new THREE.Mesh(lArmPlateGeo, armorLightMat);
        lArmPlate.position.set(0, -0.14, 0.06);
        leftArmGroup.add(lArmPlate);

        // Elbow joint
        const lElbowGeo = new THREE.SphereGeometry(0.055, 10, 10);
        const lElbow = new THREE.Mesh(lElbowGeo, undersuitMat);
        lElbow.position.y = -0.32;
        leftArmGroup.add(lElbow);

        // Forearm (vambrace) — tapered
        const lForearmGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.28, 8);
        const lForearm = new THREE.Mesh(lForearmGeo, armorLightMat);
        lForearm.position.y = -0.46;
        lForearm.castShadow = true;
        leftArmGroup.add(lForearm);

        // Vambrace aether lines (multiple)
        for (let side of [-1, 0, 1]) {
            const lVambLineGeo = new THREE.BoxGeometry(0.008, 0.2, 0.008);
            const lVambLine = new THREE.Mesh(lVambLineGeo, aetherGlowMat);
            lVambLine.position.set(side * 0.03, -0.46, 0.055);
            leftArmGroup.add(lVambLine);
        }

        // Hand
        const lHandGeo = new THREE.BoxGeometry(0.09, 0.08, 0.08);
        const lHand = new THREE.Mesh(lHandGeo, skinMat);
        lHand.position.y = -0.64;
        leftArmGroup.add(lHand);

        // Fingers (simplified)
        for (let f = 0; f < 4; f++) {
            const fGeo = new THREE.BoxGeometry(0.015, 0.04, 0.015);
            const finger = new THREE.Mesh(fGeo, skinMat);
            finger.position.set(-0.025 + f * 0.017, -0.7, 0.025);
            leftArmGroup.add(finger);
        }

        // Arcane energy orb — enhanced multi-layer vortex
        const orbGroup = new THREE.Group();
        
        // Inner core (bright white)
        const orbCoreGeo = new THREE.SphereGeometry(0.04, 12, 12);
        const orbCoreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xccddff,
            emissiveIntensity: 3.0,
            transparent: true,
            opacity: 0.9,
        });
        const orbCore = new THREE.Mesh(orbCoreGeo, orbCoreMat);
        orbGroup.add(orbCore);
        this._aetherMats.push(orbCoreMat);
        this._aetherBaseEmissive.push(3.0);

        // Mid shell (purple glow)
        const orbGeo = new THREE.SphereGeometry(0.07, 14, 14);
        const orb = new THREE.Mesh(orbGeo, arcaneMat);
        orbGroup.add(orb);

        // Outer shell (transparent wispy)
        const orbOuterGeo = new THREE.SphereGeometry(0.1, 10, 10);
        const orbOuterMat = new THREE.MeshStandardMaterial({
            color: 0x9966ee,
            emissive: 0x6633bb,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.25,
            transmission: 0.5,
        });
        const orbOuter = new THREE.Mesh(orbOuterGeo, orbOuterMat);
        orbGroup.add(orbOuter);

        // Orbiting ring 1
        const orbRingGeo = new THREE.TorusGeometry(0.13, 0.008, 8, 20);
        const orbRing = new THREE.Mesh(orbRingGeo, arcaneMat);
        orbGroup.add(orbRing);
        this._arcaneRing = orbRing;

        // Orbiting ring 2
        const orbRing2Geo = new THREE.TorusGeometry(0.11, 0.006, 8, 20);
        const orbRing2 = new THREE.Mesh(orbRing2Geo, aetherGlowMat);
        orbRing2.rotation.x = Math.PI / 2;
        orbGroup.add(orbRing2);
        this._arcaneRing2 = orbRing2;

        // Orbiting ring 3
        const orbRing3Geo = new THREE.TorusGeometry(0.09, 0.005, 6, 16);
        const orbRing3Mat = new THREE.MeshStandardMaterial({
            color: 0xcc88ff,
            emissive: 0xaa66dd,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.7,
        });
        const orbRing3 = new THREE.Mesh(orbRing3Geo, orbRing3Mat);
        orbRing3.rotation.z = Math.PI / 3;
        orbGroup.add(orbRing3);
        this._arcaneRing3 = orbRing3;

        orbGroup.position.set(0, -0.78, 0.12);
        this._arcaneOrb = orbGroup;
        leftArmGroup.add(orbGroup);

        // Arcane orb light (removed PointLight for perf — emissive materials provide the glow)
        this._orbLight = null;

        leftArmGroup.position.set(-0.42, 1.35, 0);
        this.parts.leftArm = leftArmGroup;
        this.group.add(leftArmGroup);

        // ═══════════════════════════════════════════════════════════════
        // RIGHT ARM — Weapon arm with Aether Greatsword
        // ═══════════════════════════════════════════════════════════════
        const rightArmGroup = new THREE.Group();

        // Upper arm — tapered
        const rUpperArmGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.32, 8);
        const rUpperArm = new THREE.Mesh(rUpperArmGeo, armorMat);
        rUpperArm.position.y = -0.16;
        rUpperArm.castShadow = true;
        rightArmGroup.add(rUpperArm);

        // Arm plate
        const rArmPlateGeo = new THREE.BoxGeometry(0.08, 0.2, 0.04);
        const rArmPlate = new THREE.Mesh(rArmPlateGeo, armorLightMat);
        rArmPlate.position.set(0, -0.14, 0.06);
        rightArmGroup.add(rArmPlate);

        // Elbow
        const rElbowGeo = new THREE.SphereGeometry(0.055, 10, 10);
        const rElbow = new THREE.Mesh(rElbowGeo, undersuitMat);
        rElbow.position.y = -0.32;
        rightArmGroup.add(rElbow);

        // Forearm (vambrace)
        const rForearmGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.28, 8);
        const rForearm = new THREE.Mesh(rForearmGeo, armorLightMat);
        rForearm.position.y = -0.46;
        rForearm.castShadow = true;
        rightArmGroup.add(rForearm);

        // Vambrace aether lines
        for (let side of [-1, 0, 1]) {
            const rVambLineGeo = new THREE.BoxGeometry(0.008, 0.2, 0.008);
            const rVambLine = new THREE.Mesh(rVambLineGeo, aetherGlowMat);
            rVambLine.position.set(side * 0.03, -0.46, 0.055);
            rightArmGroup.add(rVambLine);
        }

        // Gauntlet hand
        const rHandGeo = new THREE.BoxGeometry(0.09, 0.08, 0.08);
        const rHand = new THREE.Mesh(rHandGeo, armorMat);
        rHand.position.y = -0.64;
        rightArmGroup.add(rHand);

        // ── AETHER GREATSWORD — Enhanced ──
        const swordGroup = new THREE.Group();

        // Pommel — ornate
        const pommelGeo = new THREE.OctahedronGeometry(0.035, 1);
        const pommel = new THREE.Mesh(pommelGeo, silverMat);
        pommel.position.y = -0.22;
        swordGroup.add(pommel);
        const pommelGemGeo = new THREE.SphereGeometry(0.015, 8, 8);
        const pommelGem = new THREE.Mesh(pommelGemGeo, gemMat);
        pommelGem.position.y = -0.22;
        swordGroup.add(pommelGem);

        // Grip
        const gripGeo = new THREE.CylinderGeometry(0.02, 0.024, 0.3, 8);
        const gripMat2 = new THREE.MeshStandardMaterial({ color: 0x151525, roughness: 0.5, metalness: 0.3, sheen: 0.3, sheenColor: new THREE.Color(0x334466) });
        const grip = new THREE.Mesh(gripGeo, gripMat2);
        grip.position.y = -0.06;
        swordGroup.add(grip);

        // Grip wraps
        for (let i = 0; i < 6; i++) {
            const wrapGeo = new THREE.TorusGeometry(0.024, 0.003, 4, 10);
            const wrap = new THREE.Mesh(wrapGeo, silverMat);
            wrap.position.y = -0.18 + i * 0.045;
            wrap.rotation.x = Math.PI / 2;
            swordGroup.add(wrap);
        }

        // Crossguard — multi-layered ornate
        const guardBaseGeo = new THREE.BoxGeometry(0.3, 0.04, 0.06);
        const guardBase = new THREE.Mesh(guardBaseGeo, silverMat);
        guardBase.position.y = 0.07;
        swordGroup.add(guardBase);

        // Guard accent layer
        const guardAccentGeo = new THREE.BoxGeometry(0.24, 0.025, 0.04);
        const guardAccent = new THREE.Mesh(guardAccentGeo, armorMat);
        guardAccent.position.y = 0.065;
        swordGroup.add(guardAccent);

        // Guard wings (curved upward)
        for (let side of [-1, 1]) {
            const wingGeo = new THREE.BoxGeometry(0.05, 0.1, 0.035);
            const wing = new THREE.Mesh(wingGeo, armorMat);
            wing.position.set(side * 0.16, 0.11, 0);
            wing.rotation.z = side * -0.45;
            swordGroup.add(wing);

            // Wing tip glow
            const tipAccGeo = new THREE.ConeGeometry(0.018, 0.07, 6);
            const tipAcc = new THREE.Mesh(tipAccGeo, aetherGlowMat);
            tipAcc.position.set(side * 0.19, 0.15, 0);
            tipAcc.rotation.z = side * -0.5;
            swordGroup.add(tipAcc);

            // Guard scroll
            const scrollGeo = new THREE.TorusGeometry(0.02, 0.006, 6, 8, Math.PI);
            const scroll = new THREE.Mesh(scrollGeo, silverMat);
            scroll.position.set(side * 0.14, 0.08, 0.03);
            scroll.rotation.y = side * 0.5;
            swordGroup.add(scroll);
        }

        // Guard gem
        const gGemGeo = new THREE.SphereGeometry(0.028, 12, 12);
        const gGem = new THREE.Mesh(gGemGeo, gemMat);
        gGem.position.set(0, 0.07, 0.035);
        swordGroup.add(gGem);

        // Blade — main body (glowing ethereal)
        const mainBladeGeo = new THREE.BoxGeometry(0.06, 0.9, 0.018);
        const mainBlade = new THREE.Mesh(mainBladeGeo, bladeMat);
        mainBlade.position.y = 0.55;
        mainBlade.castShadow = true;
        swordGroup.add(mainBlade);

        // Blade — dark metal edges (sharpened look)
        for (let side of [-1, 1]) {
            const edgeGeo = new THREE.BoxGeometry(0.01, 0.9, 0.022);
            const edge = new THREE.Mesh(edgeGeo, bladeEdgeMat);
            edge.position.set(side * 0.032, 0.55, 0);
            swordGroup.add(edge);
        }

        // Blade center rune channel
        const runeGeo = new THREE.BoxGeometry(0.012, 0.8, 0.022);
        const rune = new THREE.Mesh(runeGeo, aetherGlowMat);
        rune.position.set(0, 0.55, 0.008);
        swordGroup.add(rune);

        // Rune inscriptions along blade
        for (let i = 0; i < 6; i++) {
            const markGeo = new THREE.BoxGeometry(0.035, 0.006, 0.024);
            const mark = new THREE.Mesh(markGeo, aetherGlowMat);
            mark.position.set(0, 0.18 + i * 0.13, 0.01);
            swordGroup.add(mark);
            // Dot at end of each mark
            const dotGeo = new THREE.SphereGeometry(0.006, 6, 6);
            const dot = new THREE.Mesh(dotGeo, gemMat);
            dot.position.set(0.022, 0.18 + i * 0.13, 0.01);
            swordGroup.add(dot);
        }

        // Blade tip — sharper cone
        const bladeTipGeo = new THREE.ConeGeometry(0.03, 0.18, 6);
        const bladeTip = new THREE.Mesh(bladeTipGeo, bladeMat);
        bladeTip.position.y = 1.05;
        swordGroup.add(bladeTip);

        // ── Blade energy crackling (lightning wisps) ──
        this._bladeSparks = [];
        for (let i = 0; i < 4; i++) {
            const sparkGroup = new THREE.Group();
            // Each spark = a series of tiny connected segments
            for (let s = 0; s < 3; s++) {
                const segGeo = new THREE.BoxGeometry(0.004, 0.06, 0.004);
                const seg = new THREE.Mesh(segGeo, aetherGlowMat);
                seg.position.set(
                    (Math.random() - 0.5) * 0.06,
                    0.15 + i * 0.2 + s * 0.04,
                    (Math.random() - 0.5) * 0.04
                );
                seg.rotation.z = (Math.random() - 0.5) * 1.5;
                sparkGroup.add(seg);
            }
            swordGroup.add(sparkGroup);
            this._bladeSparks.push(sparkGroup);
        }

        // Sword light (removed PointLight for perf — emissive glow edge provides visual)
        this._swordLight = null;

        swordGroup.position.y = -0.7;
        swordGroup.rotation.x = -0.3;
        rightArmGroup.add(swordGroup);
        this.parts.sword = swordGroup;

        rightArmGroup.position.set(0.42, 1.35, 0);
        this.parts.rightArm = rightArmGroup;
        this.group.add(rightArmGroup);

        // ═══════════════════════════════════════════════════════════════
        // BACK APPARATUS — Aether energy "wings" / arcane device
        // ═══════════════════════════════════════════════════════════════
        const backDevice = new THREE.Group();

        // Central housing (mechanical hub)
        const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12);
        const hub = new THREE.Mesh(hubGeo, silverMat);
        hub.rotation.x = Math.PI / 2;
        backDevice.add(hub);

        // Hub inner ring
        const hubRingGeo = new THREE.TorusGeometry(0.07, 0.01, 6, 12);
        const hubRing = new THREE.Mesh(hubRingGeo, aetherGlowMat);
        hubRing.rotation.x = Math.PI / 2;
        hubRing.position.z = -0.045;
        backDevice.add(hubRing);

        // Hub gem
        const hubGemGeo = new THREE.SphereGeometry(0.045, 12, 12);
        const hubGem = new THREE.Mesh(hubGemGeo, gemMat);
        hubGem.position.z = -0.048;
        backDevice.add(hubGem);

        // Mounting brackets
        for (let side of [-1, 1]) {
            const bracketGeo = new THREE.BoxGeometry(0.12, 0.04, 0.05);
            const bracket = new THREE.Mesh(bracketGeo, armorMat);
            bracket.position.set(side * 0.12, 0, 0);
            backDevice.add(bracket);
        }

        // Energy "wings" — crystalline projections (more elaborate)
        this._wingBlades = [];
        const wingPositions = [
            { x: -0.22, y: 0.2, angle: 0.45, length: 0.6 },
            { x: 0.22, y: 0.2, angle: -0.45, length: 0.6 },
            { x: -0.32, y: 0.0, angle: 0.7, length: 0.5 },
            { x: 0.32, y: 0.0, angle: -0.7, length: 0.5 },
            { x: -0.2, y: -0.15, angle: 1.0, length: 0.35 },
            { x: 0.2, y: -0.15, angle: -1.0, length: 0.35 },
        ];

        for (const wp of wingPositions) {
            const wingBlade = new THREE.Group();

            // Mechanical strut
            const strutGeo = new THREE.CylinderGeometry(0.012, 0.015, wp.length * 0.4, 6);
            const strut = new THREE.Mesh(strutGeo, silverMat);
            strut.position.y = wp.length * 0.2;
            wingBlade.add(strut);

            // Energy blade projection (wider, more visible)
            const eBGeo = new THREE.BoxGeometry(0.02, wp.length * 0.8, 0.008);
            const eB = new THREE.Mesh(eBGeo, aetherGlowMat);
            eB.position.y = wp.length * 0.5;
            wingBlade.add(eB);

            // Secondary energy trail
            const eB2Geo = new THREE.BoxGeometry(0.008, wp.length * 0.6, 0.004);
            const eB2Mat = new THREE.MeshStandardMaterial({
                color: 0x88eeff,
                emissive: 0x55ccdd,
                emissiveIntensity: 1.5,
                transparent: true,
                opacity: 0.5,
            });
            const eB2 = new THREE.Mesh(eB2Geo, eB2Mat);
            eB2.position.set(0.015, wp.length * 0.45, 0);
            wingBlade.add(eB2);

            // Joint node
            const jointGeo = new THREE.SphereGeometry(0.018, 8, 8);
            const joint = new THREE.Mesh(jointGeo, silverMat);
            joint.position.y = wp.length * 0.35;
            wingBlade.add(joint);

            // Tip crystal
            const sparkGeo = new THREE.OctahedronGeometry(0.022, 1);
            const spark = new THREE.Mesh(sparkGeo, gemMat);
            spark.position.y = wp.length * 0.9;
            wingBlade.add(spark);

            wingBlade.position.set(wp.x, wp.y, 0);
            wingBlade.rotation.z = wp.angle;
            this._wingBlades.push(wingBlade);
            backDevice.add(wingBlade);
        }

        backDevice.position.set(0, 1.35, -0.22);
        this._backDevice = backDevice;
        this.group.add(backDevice);

        // ═══════════════════════════════════════════════════════════════
        // LEGS — Armored greaves with organic shape
        // ═══════════════════════════════════════════════════════════════
        const buildLeg = (sideSign) => {
            const legGroup = new THREE.Group();

            // Upper thigh (undersuit) — tapered cylinder
            const thighGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.35, 8);
            const thigh = new THREE.Mesh(thighGeo, undersuitMat);
            thigh.position.y = -0.17;
            thigh.castShadow = true;
            legGroup.add(thigh);

            // Thigh plate (front armor)
            const thighPlateGeo = new THREE.BoxGeometry(0.12, 0.26, 0.04);
            const thighPlate = new THREE.Mesh(thighPlateGeo, armorLightMat);
            thighPlate.position.set(0, -0.17, 0.075);
            legGroup.add(thighPlate);

            // Thigh plate aether accent
            const thighAccGeo = new THREE.BoxGeometry(0.01, 0.2, 0.008);
            const thighAcc = new THREE.Mesh(thighAccGeo, aetherGlowMat);
            thighAcc.position.set(0, -0.17, 0.097);
            legGroup.add(thighAcc);

            // Knee joint — detailed
            const kneeGeo = new THREE.SphereGeometry(0.06, 10, 10);
            const knee = new THREE.Mesh(kneeGeo, armorMat);
            knee.position.y = -0.37;
            legGroup.add(knee);

            // Knee cap (pointed)
            const kneeCapGeo = new THREE.ConeGeometry(0.035, 0.06, 6);
            const kneeCap = new THREE.Mesh(kneeCapGeo, silverMat);
            kneeCap.rotation.x = -Math.PI / 2;
            kneeCap.position.set(0, -0.37, 0.065);
            legGroup.add(kneeCap);

            // Knee glow ring
            const kneeRingGeo = new THREE.TorusGeometry(0.045, 0.005, 6, 12);
            const kneeRing = new THREE.Mesh(kneeRingGeo, aetherGlowMat);
            kneeRing.position.y = -0.37;
            kneeRing.rotation.x = Math.PI / 2;
            legGroup.add(kneeRing);

            // Greave (shin armor) — tapered
            const greaveGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.3, 8);
            const greave = new THREE.Mesh(greaveGeo, armorMat);
            greave.position.y = -0.55;
            greave.castShadow = true;
            legGroup.add(greave);

            // Greave front plate
            const greavePlateGeo = new THREE.BoxGeometry(0.08, 0.26, 0.04);
            const greavePlate = new THREE.Mesh(greavePlateGeo, armorLightMat);
            greavePlate.position.set(0, -0.55, 0.07);
            legGroup.add(greavePlate);

            // Greave aether line
            const gLineGeo = new THREE.BoxGeometry(0.008, 0.22, 0.008);
            const gLine = new THREE.Mesh(gLineGeo, aetherGlowMat);
            gLine.position.set(0, -0.55, 0.092);
            legGroup.add(gLine);

            // Boot — with heel
            const bootGeo = new THREE.BoxGeometry(0.14, 0.1, 0.2);
            const bootMat2 = new THREE.MeshStandardMaterial({
                color: 0x111828,
                metalness: 0.5,
                roughness: 0.35,
                clearcoat: 0.3,
            });
            const boot = new THREE.Mesh(bootGeo, bootMat2);
            boot.position.set(0, -0.74, 0.02);
            boot.castShadow = true;
            legGroup.add(boot);

            // Boot ankle guard
            const ankleGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.04, 8);
            const ankle = new THREE.Mesh(ankleGeo, armorMat);
            ankle.position.set(0, -0.68, 0.02);
            legGroup.add(ankle);

            // Boot sole
            const soleGeo = new THREE.BoxGeometry(0.15, 0.02, 0.22);
            const sole = new THREE.Mesh(soleGeo, undersuitMat);
            sole.position.set(0, -0.8, 0.02);
            legGroup.add(sole);

            // Boot toe cap
            const toeGeo = new THREE.SphereGeometry(0.04, 6, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const toe = new THREE.Mesh(toeGeo, bootMat2);
            toe.rotation.x = Math.PI / 2;
            toe.position.set(0, -0.74, 0.12);
            legGroup.add(toe);

            legGroup.position.set(sideSign * 0.14, 0.78, 0);
            return legGroup;
        };

        const leftLeg = buildLeg(-1);
        this.parts.leftLeg = leftLeg;
        this.group.add(leftLeg);

        const rightLeg = buildLeg(1);
        this.parts.rightLeg = rightLeg;
        this.group.add(rightLeg);

        // ═══════════════════════════════════════════════════════════════
        // CAPE — Flowing silver-white fabric with dark blue inner lining
        // High-res geometry for better cloth simulation
        // ═══════════════════════════════════════════════════════════════
        const capeGeo = new THREE.PlaneGeometry(0.65, 1.1, 6, 10);
        this.capeMesh = new THREE.Mesh(capeGeo, capeFabricMat);
        this.capeMesh.position.set(0, 1.1, -0.24);
        this.parts.cape = this.capeMesh;
        this.group.add(this.capeMesh);

        // Inner lining
        const capeInnerGeo = new THREE.PlaneGeometry(0.61, 1.06, 6, 10);
        this._capeInner = new THREE.Mesh(capeInnerGeo, capeLiningMat);
        this._capeInner.position.set(0, 1.1, -0.235);
        this.group.add(this._capeInner);

        // Cape edge aether trim (thin glowing strip at bottom edge)
        const capeTrimGeo = new THREE.PlaneGeometry(0.65, 0.02, 6, 1);
        const capeTrimMesh = new THREE.Mesh(capeTrimGeo, aetherGlowMat);
        capeTrimMesh.position.set(0, 0.56, -0.24);
        this._capeTrim = capeTrimMesh;
        this.group.add(capeTrimMesh);

        // ═══════════════════════════════════════════════════════════════
        // GROUND RUNE CIRCLE — Multi-layered arcane sigil
        // ═══════════════════════════════════════════════════════════════
        const runeCircleGroup = new THREE.Group();

        // Outer ring
        const outerRingGeo = new THREE.RingGeometry(0.72, 0.78, 48);
        const outerRing = new THREE.Mesh(outerRingGeo, aetherGlowMat);
        outerRing.rotation.x = -Math.PI / 2;
        runeCircleGroup.add(outerRing);

        // Mid ring
        const midRingGeo = new THREE.RingGeometry(0.55, 0.58, 48);
        const midRing = new THREE.Mesh(midRingGeo, aetherGlowMat);
        midRing.rotation.x = -Math.PI / 2;
        runeCircleGroup.add(midRing);

        // Inner ring
        const innerRingGeo = new THREE.RingGeometry(0.35, 0.37, 48);
        const innerRing = new THREE.Mesh(innerRingGeo, aetherGlowMat);
        innerRing.rotation.x = -Math.PI / 2;
        runeCircleGroup.add(innerRing);

        // Rune segments between rings
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const segGeo = new THREE.BoxGeometry(0.012, 0.001, 0.15);
            const seg = new THREE.Mesh(segGeo, aetherGlowMat);
            seg.position.set(Math.cos(angle) * 0.63, 0, Math.sin(angle) * 0.63);
            seg.rotation.y = angle;
            runeCircleGroup.add(seg);
        }

        // Inner rune spokes
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
            const segGeo = new THREE.BoxGeometry(0.008, 0.001, 0.16);
            const seg = new THREE.Mesh(segGeo, gemMat);
            seg.position.set(Math.cos(angle) * 0.45, 0.001, Math.sin(angle) * 0.45);
            seg.rotation.y = angle;
            runeCircleGroup.add(seg);
        }

        // Center sigil — star pattern
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const symGeo = new THREE.BoxGeometry(0.035, 0.001, 0.14);
            const sym = new THREE.Mesh(symGeo, gemMat);
            sym.position.set(Math.cos(angle) * 0.15, 0.001, Math.sin(angle) * 0.15);
            sym.rotation.y = angle;
            runeCircleGroup.add(sym);
        }

        // Center gem disc
        const centerDiscGeo = new THREE.CircleGeometry(0.08, 16);
        const centerDiscMat = new THREE.MeshStandardMaterial({
            color: 0x22ccff,
            emissive: 0x11aadd,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.4,
        });
        const centerDisc = new THREE.Mesh(centerDiscGeo, centerDiscMat);
        centerDisc.rotation.x = -Math.PI / 2;
        centerDisc.position.y = 0.002;
        runeCircleGroup.add(centerDisc);

        // Outer glow disc (soft halo)
        const haloDiscGeo = new THREE.CircleGeometry(0.85, 24);
        const haloDiscMat = new THREE.MeshStandardMaterial({
            color: 0x2288cc,
            emissive: 0x115577,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.1,
        });
        const haloDisc = new THREE.Mesh(haloDiscGeo, haloDiscMat);
        haloDisc.rotation.x = -Math.PI / 2;
        haloDisc.position.y = 0.001;
        runeCircleGroup.add(haloDisc);

        runeCircleGroup.position.y = 0.01;
        this._runeCircle = runeCircleGroup;
        this.group.add(runeCircleGroup);

        // ═══════════════════════════════════════════════════════════════
        // AMBIENT AETHER PARTICLE SYSTEM — Floating energy motes
        // ═══════════════════════════════════════════════════════════════
        this._aetherParticles = [];
        const particleGeo = new THREE.SphereGeometry(0.012, 6, 6);
        const particleMats = [
            new THREE.MeshStandardMaterial({ color: 0x55ddff, emissive: 0x44bbdd, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 }),
            new THREE.MeshStandardMaterial({ color: 0x9977ff, emissive: 0x7755dd, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 }),
            new THREE.MeshStandardMaterial({ color: 0xeeffff, emissive: 0xaaddee, emissiveIntensity: 3.0, transparent: true, opacity: 0.5 }),
        ];
        for (let i = 0; i < 12; i++) {
            const p = new THREE.Mesh(particleGeo, particleMats[i % 3]);
            const angle = (i / 12) * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.5;
            const height = 0.3 + Math.random() * 1.5;
            p.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
            this._aetherParticles.push({
                mesh: p,
                baseAngle: angle,
                radius,
                baseY: height,
                speed: 0.3 + Math.random() * 0.6,
                bobSpeed: 1.5 + Math.random() * 2.0,
                bobAmp: 0.05 + Math.random() * 0.1,
                phaseOffset: Math.random() * Math.PI * 2,
            });
            this.group.add(p);
        }

        // ═══════════════════════════════════════════════════════════════
        // LIGHTING — Player-local lights for that UE5 hero lighting
        // ═══════════════════════════════════════════════════════════════
        // Main chest aether light (only 1 PointLight for player — others removed for perf)
        const aetherLight = new THREE.PointLight(0x44aaff, 1.0, 6);
        aetherLight.position.set(0, 1.4, 0.3);
        this._aetherLight = aetherLight;
        this.group.add(aetherLight);

        // Back device light — replaced with dummy for perf
        this._backLight = new THREE.Object3D();
        this._backLight.position.set(0, 1.5, -0.4);

        // Scale whole character
        this.group.scale.setScalar(1.0);
    }

    moveTo(x, z) {
        // Reuse existing vector — avoid GC from new Vector3 per call
        if (!this.targetPosition) this.targetPosition = new THREE.Vector3();
        this.targetPosition.set(x, 0, z);
        this._hasTarget = true;
    }

    clearTarget() {
        this._hasTarget = false;
        this._stuckCount = 0;
    }

    faceTarget(target) {
        if (!target) return;
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        this.targetRotation = Math.atan2(dx, dz);
    }

    startAttack() {
        if (!this.isAttacking) {
            this.isAttacking = true;
            this.attackPhase = 0;
            this.swingDirection *= -1;
        }
    }

    // ─── Obstacle avoidance helpers ───

    /**
     * Get ALL obstacles overlapping a circle at (px,pz).
     * Returns count written into this._overlaps[].
     */
    _findOverlaps(px, pz) {
        let count = 0;
        if (!this.world) return 0;
        const pr = this._playerRadius;
        const trees = this.world.trees;
        const rocks = this.world.rocks;
        for (let i = 0; i < trees.length; i++) {
            const t = trees[i];
            const dx = px - t.x, dz = pz - t.z;
            const md = t.radius + pr;
            const sq = dx * dx + dz * dz;
            if (sq < md * md) {
                if (count < this._overlaps.length) {
                    this._overlaps[count].ox = t.x;
                    this._overlaps[count].oz = t.z;
                    this._overlaps[count].r = t.radius;
                    this._overlaps[count].sq = sq;
                    count++;
                }
            }
        }
        for (let i = 0; i < rocks.length; i++) {
            const r = rocks[i];
            const dx = px - r.x, dz = pz - r.z;
            const md = r.radius + pr;
            const sq = dx * dx + dz * dz;
            if (sq < md * md) {
                if (count < this._overlaps.length) {
                    this._overlaps[count].ox = r.x;
                    this._overlaps[count].oz = r.z;
                    this._overlaps[count].r = r.radius;
                    this._overlaps[count].sq = sq;
                    count++;
                }
            }
        }
        return count;
    }

    /** Quick check — is the position blocked by ANY obstacle? */
    _isBlocked(px, pz) {
        if (!this.world) return false;
        const pr = this._playerRadius;
        const trees = this.world.trees;
        for (let i = 0; i < trees.length; i++) {
            const t = trees[i];
            const dx = px - t.x, dz = pz - t.z;
            const md = t.radius + pr;
            if (dx * dx + dz * dz < md * md) return true;
        }
        const rocks = this.world.rocks;
        for (let i = 0; i < rocks.length; i++) {
            const r = rocks[i];
            const dx = px - r.x, dz = pz - r.z;
            const md = r.radius + pr;
            if (dx * dx + dz * dz < md * md) return true;
        }
        return false;
    }

    /**
     * Push the player out of ALL overlapping obstacles using iterative resolution.
     * Handles multi-obstacle overlaps by accumulating push vectors.
     */
    _resolveOverlaps() {
        if (!this.world) return;
        const pr = this._playerRadius;
        const trees = this.world.trees;
        const rocks = this.world.rocks;
        for (let iter = 0; iter < 4; iter++) {
            let totalPx = 0, totalPz = 0, pushCount = 0;
            const pushFrom = (obs) => {
                const dx = this.position.x - obs.x, dz = this.position.z - obs.z;
                const md = obs.radius + pr;
                const sq = dx * dx + dz * dz;
                if (sq < md * md) {
                    const d = Math.sqrt(sq) || 0.01;
                    const pen = md - d + 0.05;
                    totalPx += (dx / d) * pen;
                    totalPz += (dz / d) * pen;
                    pushCount++;
                }
            };
            for (let i = 0; i < trees.length; i++) pushFrom(trees[i]);
            for (let i = 0; i < rocks.length; i++) pushFrom(rocks[i]);
            if (pushCount === 0) break;
            // Apply summed push (not averaged — each overlap contributes its full correction)
            this.position.x += totalPx;
            this.position.z += totalPz;
        }
    }

    /**
     * Try to find a clear movement direction by testing multiple angles around the
     * desired direction. Writes result into this._slideResult, returns true if found.
     */
    _findSlideDirection(nx, nz, subStep, goalX, goalZ) {
        const px = this.position.x;
        const pz = this.position.z;
        
        // Test angles from small to large deflections (radians)
        // ~29°, ~57°, 90°, ~115° on both sides of the movement direction
        let bestScore = -Infinity, found = false;
        
        for (let i = 0; i < 8; i++) {
            const a = this._slideAngles[i];
            const cos = this._slideCos[i], sin = this._slideSin[i];
            const dx = nx * cos - nz * sin;
            const dz = nx * sin + nz * cos;
            const cx = px + dx * subStep;
            const cz = pz + dz * subStep;
            
            if (!this._isBlocked(cx, cz)) {
                // Score = negative squared distance to goal (closer to goal = better)
                const tgx = goalX - cx, tgz = goalZ - cz;
                const score = -(tgx * tgx + tgz * tgz);
                if (score > bestScore) {
                    bestScore = score;
                    this._slideResult.x = cx;
                    this._slideResult.z = cz;
                    found = true;
                }
            }
        }
        
        return found;
    }

    update(dt, time) {
        // Track distance traveled for achievements
        const pos = this.getPosition();
        if (this._prevPos) {
            const dist = pos.distanceTo(this._prevPos);
            if (dist > 0.001) {
                gameState.totalDistanceTraveled = (gameState.totalDistanceTraveled || 0) + dist;
            }
        } else {
            this._prevPos = new THREE.Vector3();
        }
        this._prevPos.copy(pos);

        // Smooth rotation
        let rotDiff = this.targetRotation - this.rotation;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.rotation += rotDiff * Math.min(1, dt * 8);
        this.group.rotation.y = this.rotation;
        
        // ─── Movement with robust multi-obstacle avoidance ───
        let isMoving = false;
        if (this._hasTarget) {
            const goalX = this.targetPosition.x;
            const goalZ = this.targetPosition.z;

            const gdx = goalX - this.position.x;
            const gdz = goalZ - this.position.z;
            const goalDistSq = gdx * gdx + gdz * gdz;

            if (goalDistSq > 0.09) { // 0.3^2
                isMoving = true;
                const goalDist = Math.sqrt(goalDistSq);
                const speed = CONFIG.PLAYER_MOVE_SPEED * (1 + aetherbitShop.getMoveSpeedBonus() + goldShop.getMoveSpeedBoost()) * dt;
                const step = Math.min(speed, goalDist);
                const nx = gdx / goalDist;
                const nz = gdz / goalDist;

                // Sub-step for high game speeds
                const maxStep = 0.4;
                const subSteps = Math.max(1, Math.ceil(step / maxStep));
                const subStep = step / subSteps;

                for (let s = 0; s < subSteps; s++) {
                    // Recompute direction toward goal each sub-step for better pathing
                    const sgdx = goalX - this.position.x;
                    const sgdz = goalZ - this.position.z;
                    const sgd = Math.sqrt(sgdx * sgdx + sgdz * sgdz) || 0.01;
                    const snx = sgdx / sgd;
                    const snz = sgdz / sgd;
                    
                    const candX = this.position.x + snx * subStep;
                    const candZ = this.position.z + snz * subStep;

                    if (this.world && this._isBlocked(candX, candZ)) {
                        // Direct path blocked — try fan of alternative angles
                        if (this._findSlideDirection(snx, snz, subStep, goalX, goalZ)) {
                            this.position.x = this._slideResult.x;
                            this.position.z = this._slideResult.z;
                        }
                        // If no slide found, don't move this sub-step (resolveOverlaps will fix penetration)
                    } else {
                        this.position.x = candX;
                        this.position.z = candZ;
                    }
                }

                // Face movement direction
                this.targetRotation = Math.atan2(gdx, gdz);

                // Hard overlap resolution (catches any remaining penetration from multi-obstacle cases)
                if (this.world) this._resolveOverlaps();

                // ── Stuck detection ──
                // If barely moving over 0.5s despite trying, escalate escape attempts
                this._stuckTimer += dt;
                if (this._stuckTimer > 0.5) {
                    const movedX = this.position.x - this._stuckCheckX;
                    const movedZ = this.position.z - this._stuckCheckZ;
                    const movedSq = movedX * movedX + movedZ * movedZ;
                    if (movedSq < 0.04 && goalDistSq > 1.5) {
                        this._stuckCount++;
                        if (this._stuckCount >= 2) {
                            // Escalating escape: try increasingly wide perpendicular jumps
                            const side = (this._stuckCount % 2 === 0) ? 1 : -1;
                            const nudgeDist = 2.0 + this._stuckCount * 0.8;
                            
                            // Try 8 radial directions to find ANY clear position
                            let escaped = false;
                            for (let a = 0; a < 8 && !escaped; a++) {
                                const angle = (a / 8) * Math.PI * 2 + (side > 0 ? 0 : Math.PI / 8);
                                const testX = this.position.x + Math.cos(angle) * nudgeDist;
                                const testZ = this.position.z + Math.sin(angle) * nudgeDist;
                                if (!this._isBlocked(testX, testZ)) {
                                    this.position.x = testX;
                                    this.position.z = testZ;
                                    escaped = true;
                                }
                            }
                            if (this._stuckCount > 6) {
                                // After 6 consecutive failures, give up on this target
                                this._hasTarget = false;
                                this._stuckCount = 0;
                            }
                        }
                    } else {
                        if (movedSq > 0.2) this._stuckCount = 0;
                    }
                    this._stuckCheckX = this.position.x;
                    this._stuckCheckZ = this.position.z;
                    this._stuckTimer = 0;
                }
            } else {
                // Arrived at goal
                this._hasTarget = false;
                this._stuckCount = 0;
            }
        }
        
        this.group.position.copy(this.position);
        
        // Floor Logic: Snap to terrain height
        if (this.world) {
            const floorY = this.world.getTerrainHeight(this.position.x, this.position.z);
            this.group.position.y = floorY;
        }
        
        // Walking animation
        if (isMoving) {
            this.walkPhase += dt * 8;
            const walkSwing = Math.sin(this.walkPhase) * 0.5;
            this.parts.leftLeg.rotation.x = walkSwing;
            this.parts.rightLeg.rotation.x = -walkSwing;
            this.parts.leftArm.rotation.x = -walkSwing * 0.5;
            // Don't override right arm if attacking
            if (!this.isAttacking) {
                this.parts.rightArm.rotation.x = walkSwing * 0.3;
            }
            // Subtle body bob
            this.parts.torso.position.y = 1.15 + Math.abs(Math.sin(this.walkPhase)) * 0.03;
            // Head slight bob
            if (this.parts.head) {
                this.parts.head.position.y = 1.72 + Math.abs(Math.sin(this.walkPhase + 0.5)) * 0.015;
            }
        } else {
            // Idle breathing — more refined
            this.idleTimer += dt * 2;
            const breath = Math.sin(this.idleTimer) * 0.012;
            this.parts.torso.position.y = 1.15 + breath;
            this.parts.torso.scale.z = 1 + Math.sin(this.idleTimer) * 0.015;
            
            // Idle weight shift (subtle body sway)
            this.parts.torso.rotation.z = Math.sin(this.idleTimer * 0.3) * 0.015;
            
            // Gently sway arms
            this.parts.leftArm.rotation.x = Math.sin(this.idleTimer * 0.5) * 0.06;
            this.parts.leftArm.rotation.z = Math.sin(this.idleTimer * 0.3) * 0.03;
            if (!this.isAttacking) {
                this.parts.rightArm.rotation.x = Math.sin(this.idleTimer * 0.5 + 1) * 0.05;
            }
            
            // Head gentle look around
            if (this.parts.head) {
                this.parts.head.rotation.y = Math.sin(this.idleTimer * 0.25) * 0.08;
                this.parts.head.position.y = 1.72 + breath * 0.5;
            }
            
            // Return legs to rest
            this.parts.leftLeg.rotation.x *= 0.9;
            this.parts.rightLeg.rotation.x *= 0.9;
        }
        
        // Attack animation — enhanced with more dynamic motion
        if (this.isAttacking) {
            this.attackPhase += dt * 6;
            
            if (this.attackPhase < Math.PI) {
                // Wind up and swing
                const swing = Math.sin(this.attackPhase);
                const windUp = Math.sin(this.attackPhase * 0.5);
                this.parts.rightArm.rotation.x = -1.6 * swing;
                this.parts.rightArm.rotation.z = -0.5 * swing * this.swingDirection;
                this.parts.torso.rotation.y = 0.25 * swing * this.swingDirection;
                
                // Left arm recoil (slight)
                this.parts.leftArm.rotation.x = 0.3 * windUp;
                
                // Lean into the attack
                this.parts.torso.rotation.x = -0.08 * swing;
                
                // Step forward with attack
                if (this.parts.rightLeg) {
                    this.parts.rightLeg.rotation.x = -0.2 * swing * this.swingDirection;
                }
            } else {
                // Reset
                this.isAttacking = false;
                this.parts.rightArm.rotation.z = 0;
                this.parts.torso.rotation.y = 0;
                this.parts.torso.rotation.x = 0;
            }
        }
        
        // ── Enhanced cape physics (outer + inner lining) ──
        if (this.parts.cape) {
            const capePositions = this.parts.cape.geometry.attributes.position;
            for (let i = 0; i < capePositions.count; i++) {
                const vy = capePositions.getY(i);
                if (vy < 0) {
                    const windEffect = Math.sin(time * 2.5 + i * 0.4) * 0.06;
                    const windEffect2 = Math.sin(time * 1.5 + i * 0.7) * 0.03;
                    const moveEffect = isMoving ? 0.14 : 0.02;
                    const attackEffect = this.isAttacking ? 0.08 : 0;
                    capePositions.setZ(i, -(0.04 + windEffect + windEffect2 + (moveEffect + attackEffect) * Math.abs(vy)));
                    // Slight side sway
                    const sway = Math.sin(time * 1.8 + i * 0.3) * 0.02 * Math.abs(vy);
                    capePositions.setX(i, capePositions.getX(i) * 0.99 + sway * 0.01);
                }
            }
            capePositions.needsUpdate = true;
            
            // Inner lining follows outer cape
            if (this._capeInner) {
                const innerPos = this._capeInner.geometry.attributes.position;
                for (let i = 0; i < innerPos.count; i++) {
                    const vy = innerPos.getY(i);
                    if (vy < 0) {
                        const windEffect = Math.sin(time * 2.5 + i * 0.4) * 0.055;
                        const moveEffect = isMoving ? 0.13 : 0.015;
                        innerPos.setZ(i, -(0.035 + windEffect + moveEffect * Math.abs(vy)));
                    }
                }
                innerPos.needsUpdate = true;
            }
        }
        
        // ── Arcane orb animation (left hand) ──
        if (this._arcaneOrb) {
            this._arcaneOrb.rotation.y = time * 2.5;
            // Slight float bob
            this._arcaneOrb.position.y = -0.78 + Math.sin(time * 3) * 0.03;
        }
        if (this._arcaneRing) {
            this._arcaneRing.rotation.x = time * 1.8;
            this._arcaneRing.rotation.y = time * 1.2;
        }
        if (this._arcaneRing2) {
            this._arcaneRing2.rotation.y = time * 2.2;
            this._arcaneRing2.rotation.z = time * 1.5;
        }
        if (this._arcaneRing3) {
            this._arcaneRing3.rotation.x = time * 1.5;
            this._arcaneRing3.rotation.y = time * 0.8;
        }
        
        // ── Void Halo animation ──
        if (this._voidHalo) {
            this._voidHalo.rotation.y = time * 0.8;
            this._voidHalo.position.y = 0.3 + Math.sin(time * 2) * 0.05;
        }
        
        // ── Floating Grimoire animation ──
        if (this._floatingGrimoire) {
            this._floatingGrimoire.rotation.y = 0.8 + Math.sin(time * 1.2) * 0.3;
            this._floatingGrimoire.position.y = 0.1 + Math.sin(time * 1.8) * 0.06;
        }

        // ── Spirit Wisp animation ──
        if (this._spiritWisp) {
            // Orbit around the player gently
            const wispAngle = time * 0.8;
            this._spiritWisp.position.x = Math.cos(wispAngle) * 0.5;
            this._spiritWisp.position.z = Math.sin(wispAngle) * 0.5 - 0.1;
            this._spiritWisp.position.y = 0.5 + Math.sin(time * 2.5) * 0.15;
            this._spiritWisp.rotation.y = time * 3;
        }
        
        // ── Back device wing blade / tendril animation ──
        if (this._wingBlades) {
            for (let i = 0; i < this._wingBlades.length; i++) {
                const wb = this._wingBlades[i];
                // Gentle oscillation (breathing effect)
                const baseAngles = [0.45, -0.45, 0.7, -0.7, 1.0, -1.0];
                const baseAngle = baseAngles[i] || (i % 2 === 0 ? 0.5 : -0.5);
                wb.rotation.z = baseAngle + Math.sin(time * 1.5 + i * 1.2) * 0.08;
                // Combat flare — spread wings/tendrils wider during attack
                if (this.isAttacking) {
                    wb.rotation.z += (i < 2 ? 0.15 : 0.1) * (i % 2 === 0 ? 1 : -1) * Math.sin(this.attackPhase);
                }
            }
        }
        
        // ── Ground rune circle rotation ──
        if (this._runeCircle) {
            this._runeCircle.rotation.y = time * 0.4;
            // Pulse opacity during combat
            const combatPulse = this.isAttacking ? 1.0 : 0.5 + Math.sin(time * 2) * 0.2;
            this._runeCircle.visible = true;
            this._runeCircle.scale.setScalar(0.9 + Math.sin(time) * 0.1);
        }
        
        // ── Aether glow pulse — sync all emissive materials ──
        if (this._aetherMats) {
            const pulse = 0.85 + Math.sin(time * 3) * 0.15;
            const combatBoost = this.isAttacking ? 1.5 : 1.0;
            for (let i = 0; i < this._aetherMats.length; i++) {
                this._aetherMats[i].emissiveIntensity = this._aetherBaseEmissive[i] * pulse * combatBoost;
            }
        }
        
        // ── Aether point light pulse ──
        if (this._aetherLight) {
            this._aetherLight.intensity = 0.6 + Math.sin(time * 3) * 0.3 + (this.isAttacking ? 0.8 : 0);
        }
        if (this._orbLight) {
            this._orbLight.intensity = 0.4 + Math.sin(time * 2.5) * 0.2 + (this.isAttacking ? 0.5 : 0);
        }
        if (this._swordLight) {
            this._swordLight.intensity = 0.3 + Math.sin(time * 3.5) * 0.15 + (this.isAttacking ? 0.6 : 0);
        }
        
        // ── Front tabard physics (slight sway) ──
        if (this._frontTabard) {
            const tabPos = this._frontTabard.geometry.attributes.position;
            for (let i = 0; i < tabPos.count; i++) {
                const vy = tabPos.getY(i);
                if (vy < 0) {
                    const sway = Math.sin(time * 1.5 + i * 0.6) * 0.015;
                    const moveFlap = isMoving ? 0.02 * Math.abs(vy) : 0;
                    tabPos.setZ(i, sway + moveFlap);
                }
            }
            tabPos.needsUpdate = true;
        }
        
        // ── Shoulder pauldrons subtle movement ──
        if (this._shoulderParts) {
            for (let i = 0; i < this._shoulderParts.length; i++) {
                const sp = this._shoulderParts[i];
                sp.position.y = 1.47 + Math.sin(this.idleTimer + i * Math.PI) * 0.005;
            }
        }
        
        // ── Aether / nature particle orbiting ──
        if (this._aetherParticles) {
            for (const p of this._aetherParticles) {
                const a = p.baseAngle + time * p.speed;
                p.mesh.position.x = Math.cos(a) * p.radius;
                p.mesh.position.z = Math.sin(a) * p.radius;
                p.mesh.position.y = p.baseY + Math.sin(time * p.bobSpeed + p.phaseOffset) * p.bobAmp;
            }
        }

        // ── Blade spark flicker ──
        if (this._bladeSparks) {
            for (let i = 0; i < this._bladeSparks.length; i++) {
                const sg = this._bladeSparks[i];
                sg.visible = Math.sin(time * 8 + i * 2.5) > -0.3;
                sg.rotation.z = Math.sin(time * 4 + i) * 0.4;
            }
        }
    }

    /** Returns the player position vector (not a clone — do not mutate!) */
    getPosition() {
        return this.position;
    }
}
