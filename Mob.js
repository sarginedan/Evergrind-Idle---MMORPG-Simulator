// Mob / Enemy Entity - Various creature types
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { questLog } from './QuestLog.js';
import { inventory } from './Inventory.js';
import { partySystem } from './PartySystem.js';
import { companionSystem } from './CompanionSystem.js';
// soulForge import removed — Soul Essence is dungeon/raid exclusive only

export class Mob {
    constructor(scene, mobType, level, x, z, bossConfig = null, world = null) {
        this.scene = scene;
        this.mobType = mobType;
        this.level = level;
        this.x = x;
        this.z = z;
        this.isBoss = !!bossConfig;
        this.bossZoneId = bossConfig ? bossConfig._zoneId : null;
        this.world = world;
        
        const stats = gameState.getMobStats(mobType);
        if (bossConfig) {
            this.maxHp = Math.floor(stats.hp * bossConfig.hpMultiplier);
            this.damage = Math.floor(stats.damage * bossConfig.damageMultiplier);
            this.xpReward = bossConfig.xpReward;
            this.goldReward = bossConfig.goldReward;
            this.karmaReward = bossConfig.karmaReward;
        } else {
            this.maxHp = stats.hp;
            this.damage = stats.damage;
            this.xpReward = stats.xpReward;
            this.goldReward = stats.goldReward;
            this.karmaReward = stats.karmaReward;
        }
        
        this.hp = this.maxHp;
        this.alive = true;
        this.inCombat = false;
        this.deathTimer = 0;
        this.hitFlash = 0;
        this.group = new THREE.Group();
        this.animPhase = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderTarget = null;
        this.baseX = x;
        this.baseZ = z;
        this.attackTimer = 0;
        
        this.buildMob();
        this.group.position.set(x, 0, z);
        scene.add(this.group);
        
        // Pre-allocate hit flash color to avoid creating new Color objects per frame
        this._hitColor = new THREE.Color(0xff0000);
        this._zeroColor = new THREE.Color(0x000000);

        // Pre-allocate wander target to avoid creating { x, z } every wander cycle
        this._wanderTarget = { x: 0, z: 0 };
        this._hasWanderTarget = false;
    }

    buildMob() {
        const color = this.mobType.color;
        const scale = this.mobType.scale;
        const type = this.mobType.type;
        
        const bodyMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.7,
            metalness: 0.1,
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color).multiplyScalar(0.6),
            roughness: 0.8,
        });
        
        if (type === 'beast') {
            this.buildBeast(bodyMat, darkMat, scale);
        } else if (type === 'elemental') {
            this.buildElemental(bodyMat, darkMat, scale);
        } else if (type === 'plant') {
            this.buildPlant(bodyMat, darkMat, scale);
        } else if (type === 'dragon') {
            this.buildDrake(bodyMat, darkMat, scale);
        } else if (type === 'undead') {
            this.buildUndead(bodyMat, darkMat, scale);
        } else if (type === 'serpent') {
            this.buildSerpent(bodyMat, darkMat, scale);
        } else if (type === 'demon') {
            this.buildDemon(bodyMat, darkMat, scale);
        } else if (type === 'insectoid') {
            this.buildInsectoid(bodyMat, darkMat, scale);
        } else if (type === 'jellyfish') {
            this.buildJellyfish(bodyMat, darkMat, scale);
        } else if (type === 'xenoswarm') {
            this.buildXenoswarm(bodyMat, darkMat, scale);
        } else if (type === 'xenowalker') {
            this.buildXenowalker(bodyMat, darkMat, scale);
        } else if (type === 'xenotitan') {
            this.buildXenotitan(bodyMat, darkMat, scale);
        } else if (type === 'xenophantom') {
            this.buildXenophantom(bodyMat, darkMat, scale);
        } else if (type === 'xenowyrm') {
            this.buildXenowyrm(bodyMat, darkMat, scale);
        } else if (type === 'halogrunt') {
            this.buildHaloGrunt(bodyMat, darkMat, scale);
        } else if (type === 'haloelite') {
            this.buildHaloElite(bodyMat, darkMat, scale);
        } else if (type === 'halohunter') {
            this.buildHaloHunter(bodyMat, darkMat, scale);
        } else if (type === 'halosentinel') {
            this.buildHaloSentinel(bodyMat, darkMat, scale);
        } else if (type === 'halowraith') {
            this.buildHaloWraith(bodyMat, darkMat, scale);
        } else if (type === 'hivedrone') {
            this.buildHiveDrone(bodyMat, darkMat, scale);
        } else if (type === 'spiresentinel') {
            this.buildSpireSentinel(bodyMat, darkMat, scale);
        } else if (type === 'sandcolossus') {
            this.buildSandColossus(bodyMat, darkMat, scale);
        } else if (type === 'forgeoverseer') {
            this.buildForgeOverseer(bodyMat, darkMat, scale);
        } else if (type === 'crimsonwyrm') {
            this.buildCrimsonWyrm(bodyMat, darkMat, scale);
        } else {
            // Fallback — generic beast
            this.buildBeast(bodyMat, darkMat, scale);
        }
    }

    buildBeast(bodyMat, darkMat, scale) {
        // Quadruped beast body
        const bodyGeo = new THREE.BoxGeometry(0.8 * scale, 0.5 * scale, 1.2 * scale);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.4 * scale, 0.35 * scale, 0.4 * scale);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0, 0.75 * scale, 0.7 * scale);
        head.castShadow = true;
        this.group.add(head);
        this.headMesh = head;
        
        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 0.5 });
        for (let side of [-1, 1]) {
            const eyeGeo = new THREE.SphereGeometry(0.04 * scale, 6, 6);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.15 * scale, 0.8 * scale, 0.88 * scale);
            this.group.add(eye);
        }
        
        // Legs
        const legGeo = new THREE.BoxGeometry(0.12 * scale, 0.4 * scale, 0.12 * scale);
        this.legs = [];
        for (let fz of [-0.4, 0.4]) {
            for (let fx of [-0.3, 0.3]) {
                const leg = new THREE.Mesh(legGeo, darkMat);
                leg.position.set(fx * scale, 0.2 * scale, fz * scale);
                this.group.add(leg);
                this.legs.push(leg);
            }
        }
        
        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.03 * scale, 0.06 * scale, 0.5 * scale, 6);
        const tail = new THREE.Mesh(tailGeo, darkMat);
        tail.position.set(0, 0.55 * scale, -0.7 * scale);
        tail.rotation.x = 0.5;
        this.group.add(tail);
        this.tailMesh = tail;
    }

    buildElemental(bodyMat, darkMat, scale) {
        // Large rocky/mossy golem
        const bodyGeo = new THREE.DodecahedronGeometry(0.6 * scale, 1);
        const posAttr = bodyGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const n = 1 + (Math.random() - 0.5) * 0.3;
            posAttr.setX(i, posAttr.getX(i) * n);
            posAttr.setY(i, posAttr.getY(i) * (0.8 + Math.random() * 0.4));
            posAttr.setZ(i, posAttr.getZ(i) * n);
        }
        bodyGeo.computeVertexNormals();
        
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;
        
        // Moss patches
        for (let i = 0; i < 4; i++) {
            const mossGeo = new THREE.SphereGeometry(0.2 * scale, 5, 4);
            const mossMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.3, 0.7, 0.15),
                roughness: 1.0,
            });
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.position.set(
                (Math.random() - 0.5) * 0.5 * scale,
                (0.6 + Math.random() * 0.6) * scale,
                (Math.random() - 0.5) * 0.5 * scale
            );
            moss.scale.y = 0.5;
            this.group.add(moss);
        }
        
        // Glowing eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22ff22, emissiveIntensity: 0.8 });
        for (let side of [-1, 1]) {
            const eyeGeo = new THREE.SphereGeometry(0.06 * scale, 6, 6);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.2 * scale, 1.0 * scale, 0.4 * scale);
            this.group.add(eye);
        }
        
        // Stone arms
        for (let side of [-1, 1]) {
            const armGeo = new THREE.BoxGeometry(0.2 * scale, 0.5 * scale, 0.2 * scale);
            const arm = new THREE.Mesh(armGeo, darkMat);
            arm.position.set(side * 0.6 * scale, 0.5 * scale, 0);
            arm.rotation.z = side * 0.3;
            this.group.add(arm);
        }
        
        this.legs = [];
    }

    buildPlant(bodyMat, darkMat, scale) {
        // Plant creature with tendrils
        const bodyGeo = new THREE.ConeGeometry(0.4 * scale, 1.0 * scale, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;
        
        // Large leaves
        for (let i = 0; i < 5; i++) {
            const leafAngle = (i / 5) * Math.PI * 2;
            const leafGeo = new THREE.PlaneGeometry(0.5 * scale, 0.8 * scale);
            const leafMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.3, 0.7, 0.2),
                side: THREE.DoubleSide,
                roughness: 0.7,
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(
                Math.cos(leafAngle) * 0.4 * scale,
                0.4 * scale,
                Math.sin(leafAngle) * 0.4 * scale
            );
            leaf.rotation.y = leafAngle;
            leaf.rotation.x = -0.4;
            this.group.add(leaf);
        }
        
        // Eye bud
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff44, emissive: 0xffff00, emissiveIntensity: 0.5 });
        const eyeGeo = new THREE.SphereGeometry(0.08 * scale, 6, 6);
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0, 1.0 * scale, 0.2 * scale);
        this.group.add(eye);
        
        this.legs = [];
    }

    buildDrake(bodyMat, darkMat, scale) {
        // Dragon-like creature
        const bodyGeo = new THREE.BoxGeometry(0.6 * scale, 0.5 * scale, 1.4 * scale);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;
        
        // Long neck
        const neckGeo = new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 0.6 * scale, 6);
        const neck = new THREE.Mesh(neckGeo, bodyMat);
        neck.position.set(0, 1.0 * scale, 0.7 * scale);
        neck.rotation.x = -0.5;
        this.group.add(neck);
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.25 * scale, 0.2 * scale, 0.35 * scale);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 1.2 * scale, 1.0 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);
        
        // Eyes
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff4400, emissiveIntensity: 0.6 });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.1 * scale, 1.25 * scale, 1.15 * scale);
            this.group.add(eye);
        }
        
        // Wings (folded)
        for (let side of [-1, 1]) {
            const wingGeo = new THREE.PlaneGeometry(0.8 * scale, 0.5 * scale);
            const wingMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(this.mobType.color).multiplyScalar(0.8),
                side: THREE.DoubleSide,
                roughness: 0.6,
            });
            const wing = new THREE.Mesh(wingGeo, wingMat);
            wing.position.set(side * 0.5 * scale, 1.0 * scale, 0);
            wing.rotation.z = side * 1.2;
            wing.rotation.y = side * 0.3;
            this.group.add(wing);
        }
        
        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.02 * scale, 0.1 * scale, 0.8 * scale, 6);
        this.tailMesh = new THREE.Mesh(tailGeo, darkMat);
        this.tailMesh.position.set(0, 0.65 * scale, -0.8 * scale);
        this.tailMesh.rotation.x = 0.4;
        this.group.add(this.tailMesh);
        
        // Legs
        this.legs = [];
        const legGeo = new THREE.BoxGeometry(0.12 * scale, 0.5 * scale, 0.12 * scale);
        for (let fz of [-0.3, 0.3]) {
            for (let fx of [-0.25, 0.25]) {
                const leg = new THREE.Mesh(legGeo, darkMat);
                leg.position.set(fx * scale, 0.25 * scale, fz * scale);
                this.group.add(leg);
                this.legs.push(leg);
            }
        }

        // Spines
        for (let i = 0; i < 5; i++) {
            const spineGeo = new THREE.ConeGeometry(0.04 * scale, 0.2 * scale, 4);
            const spine = new THREE.Mesh(spineGeo, darkMat);
            spine.position.set(0, 1.05 * scale, -0.4 * scale + i * 0.3 * scale);
            this.group.add(spine);
        }
    }

    buildUndead(bodyMat, darkMat, scale) {
        // Ghostly wraith — floating ethereal form with no legs
        const glowMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.7,
            roughness: 0.3,
        });

        // Spectral body — elongated, tapering downward
        const bodyGeo = new THREE.ConeGeometry(0.4 * scale, 1.2 * scale, 8);
        const body = new THREE.Mesh(bodyGeo, glowMat);
        body.position.y = 0.8 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Head — skull-like sphere
        const headGeo = new THREE.SphereGeometry(0.25 * scale, 8, 6);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0, 1.5 * scale, 0);
        head.castShadow = true;
        this.group.add(head);
        this.headMesh = head;

        // Hollow eye sockets (dark with emissive glow)
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            emissive: 0xff4400,
            emissiveIntensity: 1.2,
        });
        for (let side of [-1, 1]) {
            const eyeGeo = new THREE.SphereGeometry(0.05 * scale, 6, 6);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.1 * scale, 1.55 * scale, 0.2 * scale);
            this.group.add(eye);
        }

        // Ghostly wisps (floating tendrils)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const wispGeo = new THREE.CylinderGeometry(0.02 * scale, 0.06 * scale, 0.6 * scale, 4);
            const wisp = new THREE.Mesh(wispGeo, glowMat);
            wisp.position.set(
                Math.cos(angle) * 0.25 * scale,
                0.3 * scale,
                Math.sin(angle) * 0.25 * scale
            );
            wisp.rotation.x = (Math.random() - 0.5) * 0.5;
            wisp.rotation.z = (Math.random() - 0.5) * 0.5;
            this.group.add(wisp);
        }

        // Spectral arms
        for (let side of [-1, 1]) {
            const armGeo = new THREE.BoxGeometry(0.08 * scale, 0.6 * scale, 0.08 * scale);
            const arm = new THREE.Mesh(armGeo, glowMat);
            arm.position.set(side * 0.4 * scale, 1.0 * scale, 0);
            arm.rotation.z = side * 0.4;
            this.group.add(arm);
        }

        this.legs = [];
    }

    buildSerpent(bodyMat, darkMat, scale) {
        // Segmented serpent body — multiple linked cylindrical segments
        const segmentCount = 8;
        const segmentLength = 0.25 * scale;
        const segmentRadius = 0.15 * scale;
        this._serpentSegments = [];

        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const r = segmentRadius * (1 - t * 0.4); // taper toward tail
            const geo = new THREE.CylinderGeometry(r * 0.9, r, segmentLength, 6);
            const mat = i === 0 ? bodyMat : (i % 2 === 0 ? bodyMat : darkMat);
            const seg = new THREE.Mesh(geo, mat);
            // Arrange in a curved S-shape
            const angle = Math.sin(i * 0.8) * 0.5;
            seg.position.set(
                Math.sin(angle) * i * segmentLength * 0.6,
                segmentRadius + 0.1 * scale,
                -i * segmentLength * 0.8
            );
            seg.rotation.x = Math.PI / 2;
            seg.rotation.z = angle;
            seg.castShadow = true;
            this.group.add(seg);
            this._serpentSegments.push(seg);
        }

        this.bodyMesh = this._serpentSegments[0];

        // Head — wedge shape
        const headGeo = new THREE.BoxGeometry(0.2 * scale, 0.12 * scale, 0.3 * scale);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, segmentRadius + 0.15 * scale, 0.2 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Eyes — fiery
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xff6600,
            emissiveIntensity: 0.8,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.08 * scale, segmentRadius + 0.2 * scale, 0.35 * scale);
            this.group.add(eye);
        }

        // Fangs
        for (let side of [-1, 1]) {
            const fangGeo = new THREE.ConeGeometry(0.02 * scale, 0.1 * scale, 4);
            const fangMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, roughness: 0.4 });
            const fang = new THREE.Mesh(fangGeo, fangMat);
            fang.position.set(side * 0.06 * scale, segmentRadius + 0.05 * scale, 0.35 * scale);
            fang.rotation.x = Math.PI;
            this.group.add(fang);
        }

        // Dorsal ridge
        for (let i = 0; i < 5; i++) {
            const spineGeo = new THREE.ConeGeometry(0.03 * scale, 0.1 * scale, 4);
            const spine = new THREE.Mesh(spineGeo, darkMat);
            spine.position.set(0, segmentRadius + 0.25 * scale, -i * segmentLength * 0.8);
            this.group.add(spine);
        }

        this.legs = [];
    }

    buildDemon(bodyMat, darkMat, scale) {
        // Massive demon-titan — broad chest, horns, clawed arms, fiery core
        const lavaMat = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff2200,
            emissiveIntensity: 0.8,
            roughness: 0.3,
        });

        // Torso — large imposing box
        const torsoGeo = new THREE.BoxGeometry(0.9 * scale, 1.0 * scale, 0.6 * scale);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 1.2 * scale;
        torso.castShadow = true;
        this.group.add(torso);
        this.bodyMesh = torso;

        // Molten core (glowing center)
        const coreGeo = new THREE.SphereGeometry(0.2 * scale, 8, 6);
        const core = new THREE.Mesh(coreGeo, lavaMat);
        core.position.set(0, 1.2 * scale, 0.25 * scale);
        this.group.add(core);

        // Head — angular, demonic
        const headGeo = new THREE.BoxGeometry(0.35 * scale, 0.3 * scale, 0.3 * scale);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 1.9 * scale, 0);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Horns — large curving
        for (let side of [-1, 1]) {
            const hornGeo = new THREE.ConeGeometry(0.06 * scale, 0.5 * scale, 5);
            const hornMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.5, metalness: 0.3 });
            const horn = new THREE.Mesh(hornGeo, hornMat);
            horn.position.set(side * 0.2 * scale, 2.15 * scale, -0.05 * scale);
            horn.rotation.z = side * -0.4;
            horn.rotation.x = -0.3;
            this.group.add(horn);
        }

        // Eyes — blazing
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xff8800,
            emissiveIntensity: 1.5,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.12 * scale, 1.95 * scale, 0.14 * scale);
            this.group.add(eye);
        }

        // Massive arms with claws
        for (let side of [-1, 1]) {
            // Upper arm
            const armGeo = new THREE.BoxGeometry(0.2 * scale, 0.6 * scale, 0.2 * scale);
            const arm = new THREE.Mesh(armGeo, darkMat);
            arm.position.set(side * 0.6 * scale, 1.0 * scale, 0);
            arm.rotation.z = side * 0.25;
            this.group.add(arm);

            // Forearm
            const foreGeo = new THREE.BoxGeometry(0.15 * scale, 0.5 * scale, 0.15 * scale);
            const fore = new THREE.Mesh(foreGeo, darkMat);
            fore.position.set(side * 0.75 * scale, 0.5 * scale, 0.1 * scale);
            fore.rotation.z = side * 0.15;
            this.group.add(fore);

            // Claws
            for (let c = 0; c < 3; c++) {
                const clawGeo = new THREE.ConeGeometry(0.02 * scale, 0.15 * scale, 4);
                const claw = new THREE.Mesh(clawGeo, lavaMat);
                claw.position.set(
                    side * 0.75 * scale + (c - 1) * 0.06 * scale,
                    0.2 * scale,
                    0.15 * scale
                );
                claw.rotation.x = 0.3;
                this.group.add(claw);
            }
        }

        // Legs — thick pillars
        this.legs = [];
        const legGeo = new THREE.BoxGeometry(0.2 * scale, 0.7 * scale, 0.2 * scale);
        for (let side of [-1, 1]) {
            const leg = new THREE.Mesh(legGeo, darkMat);
            leg.position.set(side * 0.3 * scale, 0.35 * scale, 0);
            this.group.add(leg);
            this.legs.push(leg);
        }

        // Lava cracks on torso (emissive strips)
        for (let i = 0; i < 3; i++) {
            const crackGeo = new THREE.BoxGeometry(0.02 * scale, 0.4 * scale, 0.5 * scale);
            const crack = new THREE.Mesh(crackGeo, lavaMat);
            crack.position.set((i - 1) * 0.25 * scale, 1.2 * scale, 0.31 * scale);
            this.group.add(crack);
        }
    }

    buildInsectoid(bodyMat, darkMat, scale) {
        // Multi-legged crustacean/crab-like creature
        const shellMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            roughness: 0.4,
            metalness: 0.3,
        });

        // Segmented carapace — flat oval body
        const bodyGeo = new THREE.SphereGeometry(0.5 * scale, 8, 6);
        const bpa = bodyGeo.attributes.position;
        for (let i = 0; i < bpa.count; i++) {
            bpa.setY(i, bpa.getY(i) * 0.4); // flatten
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, shellMat);
        body.position.y = 0.35 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Head — small wedge
        const headGeo = new THREE.BoxGeometry(0.25 * scale, 0.15 * scale, 0.2 * scale);
        this.headMesh = new THREE.Mesh(headGeo, shellMat);
        this.headMesh.position.set(0, 0.35 * scale, 0.45 * scale);
        this.group.add(this.headMesh);

        // Eyes — glowing
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 0.8,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.1 * scale, 0.4 * scale, 0.55 * scale);
            this.group.add(eye);
        }

        // Mandibles
        for (let side of [-1, 1]) {
            const mandGeo = new THREE.ConeGeometry(0.03 * scale, 0.15 * scale, 4);
            const mandMat = new THREE.MeshStandardMaterial({ color: 0x224433, roughness: 0.5 });
            const mand = new THREE.Mesh(mandGeo, mandMat);
            mand.position.set(side * 0.08 * scale, 0.3 * scale, 0.6 * scale);
            mand.rotation.x = 0.8; mand.rotation.z = side * 0.3;
            this.group.add(mand);
        }

        // 6 legs (3 per side)
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.03 * scale, 0.4 * scale, 4);
        for (let side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const leg = new THREE.Mesh(legGeo, darkMat);
                const zOff = (i - 1) * 0.2 * scale;
                leg.position.set(side * 0.4 * scale, 0.15 * scale, zOff);
                leg.rotation.z = side * 0.8;
                this.group.add(leg);
                this.legs.push(leg);
            }
        }

        // Tail segment
        const tailGeo = new THREE.ConeGeometry(0.1 * scale, 0.3 * scale, 5);
        this.tailMesh = new THREE.Mesh(tailGeo, darkMat);
        this.tailMesh.position.set(0, 0.3 * scale, -0.5 * scale);
        this.tailMesh.rotation.x = -1.2;
        this.group.add(this.tailMesh);
    }

    buildJellyfish(bodyMat, darkMat, scale) {
        // Floating ethereal jellyfish — translucent bell with trailing tentacles
        const glowMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.6,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        // Bell (dome)
        const bellGeo = new THREE.SphereGeometry(0.5 * scale, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const bell = new THREE.Mesh(bellGeo, glowMat);
        bell.position.y = 1.0 * scale;
        bell.castShadow = true;
        this.group.add(bell);
        this.bodyMesh = bell;

        // Inner glow core
        const coreGeo = new THREE.SphereGeometry(0.2 * scale, 8, 6);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: this.mobType.color,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.8,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 0.9 * scale;
        this.group.add(core);

        // Eyes — bright spots on the bell
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xccaaff,
            emissiveIntensity: 1.2,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.15 * scale, 1.0 * scale, 0.3 * scale);
            this.group.add(eye);
        }
        this.headMesh = bell; // use bell for head animation

        // Tentacles — trailing downward
        for (let t = 0; t < 8; t++) {
            const angle = (t / 8) * Math.PI * 2;
            const tentLen = (0.6 + Math.random() * 0.8) * scale;
            const tentRadius = (0.015 + Math.random() * 0.02) * scale;
            const tentGeo = new THREE.CylinderGeometry(tentRadius * 0.3, tentRadius, tentLen, 4);
            const tentMat = new THREE.MeshStandardMaterial({
                color: this.mobType.color,
                emissive: this.mobType.color,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.4 + Math.random() * 0.2,
            });
            const tent = new THREE.Mesh(tentGeo, tentMat);
            tent.position.set(
                Math.cos(angle) * 0.3 * scale,
                0.6 * scale - tentLen / 2,
                Math.sin(angle) * 0.3 * scale
            );
            tent.rotation.x = (Math.random() - 0.5) * 0.3;
            tent.rotation.z = (Math.random() - 0.5) * 0.3;
            this.group.add(tent);
        }

        // Longer central feeding tentacles
        for (let t = 0; t < 3; t++) {
            const angle = (t / 3) * Math.PI * 2 + 0.5;
            const tentLen = (1.0 + Math.random() * 0.5) * scale;
            const tentGeo = new THREE.CylinderGeometry(0.01 * scale, 0.025 * scale, tentLen, 4);
            const tent = new THREE.Mesh(tentGeo, glowMat);
            tent.position.set(
                Math.cos(angle) * 0.1 * scale,
                0.5 * scale - tentLen / 2,
                Math.sin(angle) * 0.1 * scale
            );
            this.group.add(tent);
        }

        this.legs = [];
        this.tailMesh = null;
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 5 — NEON WASTES (xenotech alien creatures)
    // ═══════════════════════════════════════════════════════════

    buildXenoswarm(bodyMat, darkMat, scale) {
        // Plasma Mite — small swarming insectoid alien, No Man's Sky biological horror inspired
        // Scuttling multi-legged plasma bug with bioluminescent abdomen
        const plasmaMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.6,
            roughness: 0.3,
            metalness: 0.4,
        });

        // Thorax — flattened, segmented
        const thoraxGeo = new THREE.SphereGeometry(0.35 * scale, 8, 6);
        const tpa = thoraxGeo.attributes.position;
        for (let i = 0; i < tpa.count; i++) {
            tpa.setY(i, tpa.getY(i) * 0.5);
        }
        thoraxGeo.computeVertexNormals();
        const thorax = new THREE.Mesh(thoraxGeo, bodyMat);
        thorax.position.y = 0.25 * scale;
        thorax.castShadow = true;
        this.group.add(thorax);
        this.bodyMesh = thorax;

        // Glowing abdomen (plasma sac)
        const abdGeo = new THREE.SphereGeometry(0.25 * scale, 8, 6);
        const abd = new THREE.Mesh(abdGeo, plasmaMat);
        abd.position.set(0, 0.2 * scale, -0.3 * scale);
        abd.scale.set(1, 0.7, 1.3);
        this.group.add(abd);

        // Head — small wedge with compound eyes
        const headGeo = new THREE.BoxGeometry(0.2 * scale, 0.12 * scale, 0.18 * scale);
        this.headMesh = new THREE.Mesh(headGeo, darkMat);
        this.headMesh.position.set(0, 0.28 * scale, 0.35 * scale);
        this.group.add(this.headMesh);

        // Compound eyes — large glowing orbs
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff44ff,
            emissive: 0xff22dd,
            emissiveIntensity: 1.2,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.1 * scale, 0.32 * scale, 0.42 * scale);
            this.group.add(eye);
        }

        // Mandibles
        for (let side of [-1, 1]) {
            const mandGeo = new THREE.ConeGeometry(0.02 * scale, 0.1 * scale, 4);
            const mand = new THREE.Mesh(mandGeo, plasmaMat);
            mand.position.set(side * 0.07 * scale, 0.22 * scale, 0.48 * scale);
            mand.rotation.x = 0.6; mand.rotation.z = side * 0.4;
            this.group.add(mand);
        }

        // 6 scuttling legs (3 per side)
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.015 * scale, 0.025 * scale, 0.3 * scale, 4);
        for (let side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const leg = new THREE.Mesh(legGeo, darkMat);
                const zOff = (i - 1) * 0.15 * scale;
                leg.position.set(side * 0.3 * scale, 0.1 * scale, zOff);
                leg.rotation.z = side * 0.9;
                this.group.add(leg);
                this.legs.push(leg);
            }
        }

        // Antennae
        for (let side of [-1, 1]) {
            const antGeo = new THREE.CylinderGeometry(0.005 * scale, 0.01 * scale, 0.2 * scale, 3);
            const ant = new THREE.Mesh(antGeo, plasmaMat);
            ant.position.set(side * 0.06 * scale, 0.35 * scale, 0.45 * scale);
            ant.rotation.x = -0.8;
            ant.rotation.z = side * 0.3;
            this.group.add(ant);
        }
    }

    buildXenowalker(bodyMat, darkMat, scale) {
        // Void Strider — tall, bipedal alien stalker. Inspired by NMS Striders / Elden Ring Cleanrot
        // Long legs, narrow torso, elongated head, phase-glow accents
        const phaseMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8,
            roughness: 0.2,
            metalness: 0.5,
        });

        // Narrow torso — tall and thin
        const torsoGeo = new THREE.BoxGeometry(0.3 * scale, 0.8 * scale, 0.25 * scale);
        const torso = new THREE.Mesh(torsoGeo, bodyMat);
        torso.position.y = 1.4 * scale;
        torso.castShadow = true;
        this.group.add(torso);
        this.bodyMesh = torso;

        // Phase core (glowing center)
        const coreGeo = new THREE.SphereGeometry(0.1 * scale, 8, 6);
        const core = new THREE.Mesh(coreGeo, phaseMat);
        core.position.set(0, 1.4 * scale, 0.12 * scale);
        this.group.add(core);

        // Elongated head — alien smooth wedge
        const headGeo = new THREE.ConeGeometry(0.12 * scale, 0.4 * scale, 6);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 2.0 * scale, 0.08 * scale);
        this.headMesh.rotation.x = -0.3;
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Eyes — narrow slit-like
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xcc44ff,
            emissive: 0xaa22ff,
            emissiveIntensity: 1.5,
        });
        for (let side of [-1, 1]) {
            const eyeGeo = new THREE.BoxGeometry(0.02 * scale, 0.04 * scale, 0.06 * scale);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.06 * scale, 1.95 * scale, 0.18 * scale);
            this.group.add(eye);
        }

        // Long arms with clawed tips
        for (let side of [-1, 1]) {
            // Upper arm
            const armGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.5 * scale, 5);
            const arm = new THREE.Mesh(armGeo, darkMat);
            arm.position.set(side * 0.25 * scale, 1.2 * scale, 0);
            arm.rotation.z = side * 0.3;
            this.group.add(arm);

            // Forearm
            const foreGeo = new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, 0.45 * scale, 5);
            const fore = new THREE.Mesh(foreGeo, darkMat);
            fore.position.set(side * 0.35 * scale, 0.8 * scale, 0.08 * scale);
            fore.rotation.z = side * 0.15;
            this.group.add(fore);

            // Claws — 3 per hand
            for (let c = 0; c < 3; c++) {
                const clawGeo = new THREE.ConeGeometry(0.015 * scale, 0.12 * scale, 4);
                const claw = new THREE.Mesh(clawGeo, phaseMat);
                claw.position.set(
                    side * 0.35 * scale + (c - 1) * 0.04 * scale,
                    0.55 * scale,
                    0.12 * scale
                );
                claw.rotation.x = 0.4;
                this.group.add(claw);
            }
        }

        // Long digitigrade legs
        this.legs = [];
        for (let side of [-1, 1]) {
            // Thigh
            const thighGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.5 * scale, 5);
            const thigh = new THREE.Mesh(thighGeo, darkMat);
            thigh.position.set(side * 0.12 * scale, 0.85 * scale, 0);
            this.group.add(thigh);
            this.legs.push(thigh);

            // Shin (reversed knee — digitigrade)
            const shinGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.55 * scale, 5);
            const shin = new THREE.Mesh(shinGeo, darkMat);
            shin.position.set(side * 0.12 * scale, 0.35 * scale, 0.1 * scale);
            this.group.add(shin);
            this.legs.push(shin);

            // Foot
            const footGeo = new THREE.BoxGeometry(0.1 * scale, 0.03 * scale, 0.15 * scale);
            const foot = new THREE.Mesh(footGeo, darkMat);
            foot.position.set(side * 0.12 * scale, 0.05 * scale, 0.12 * scale);
            this.group.add(foot);
        }

        // Phase energy wisps along spine
        for (let i = 0; i < 3; i++) {
            const wispGeo = new THREE.SphereGeometry(0.04 * scale, 4, 4);
            const wisp = new THREE.Mesh(wispGeo, phaseMat);
            wisp.position.set(0, 1.6 * scale + i * 0.15 * scale, -0.15 * scale);
            this.group.add(wisp);
        }
    }

    buildXenotitan(bodyMat, darkMat, scale) {
        // Neon Behemoth — massive quadruped alien tank. Inspired by NMS Titan fauna / UE5 Kaiju
        // Enormous armored body, heavy legs, glowing plasma veins, head crest
        const plasmaMat = new THREE.MeshStandardMaterial({
            color: 0xff44cc,
            emissive: 0xff22aa,
            emissiveIntensity: 0.7,
            roughness: 0.2,
            metalness: 0.3,
        });
        const armorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.mobType.color).multiplyScalar(0.5),
            roughness: 0.4,
            metalness: 0.6,
        });

        // Massive body — armored oval
        const bodyGeo = new THREE.SphereGeometry(0.7 * scale, 10, 8);
        const bpa = bodyGeo.attributes.position;
        for (let i = 0; i < bpa.count; i++) {
            const n = 1 + (Math.sin(bpa.getX(i) * 3 + bpa.getZ(i) * 2) * 0.1);
            bpa.setX(i, bpa.getX(i) * 1.3 * n);
            bpa.setY(i, bpa.getY(i) * 0.7);
            bpa.setZ(i, bpa.getZ(i) * 1.1 * n);
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Armor plates on back
        for (let i = 0; i < 5; i++) {
            const plateGeo = new THREE.BoxGeometry(0.3 * scale, 0.08 * scale, 0.25 * scale);
            const plate = new THREE.Mesh(plateGeo, armorMat);
            plate.position.set(
                (i - 2) * 0.22 * scale,
                1.25 * scale + Math.sin(i * 0.8) * 0.05 * scale,
                0
            );
            plate.rotation.z = (i - 2) * 0.1;
            this.group.add(plate);
        }

        // Plasma veins (glowing strips along body)
        for (let i = 0; i < 4; i++) {
            const veinGeo = new THREE.BoxGeometry(0.02 * scale, 0.03 * scale, 0.8 * scale);
            const vein = new THREE.Mesh(veinGeo, plasmaMat);
            vein.position.set((i - 1.5) * 0.2 * scale, 0.95 * scale, 0);
            this.group.add(vein);
        }

        // Head — heavy, low-slung with crest
        const headGeo = new THREE.BoxGeometry(0.45 * scale, 0.3 * scale, 0.4 * scale);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 0.7 * scale, 0.85 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Head crest — bony protrusion
        const crestGeo = new THREE.ConeGeometry(0.15 * scale, 0.35 * scale, 5);
        const crest = new THREE.Mesh(crestGeo, armorMat);
        crest.position.set(0, 0.95 * scale, 0.7 * scale);
        crest.rotation.x = -0.5;
        this.group.add(crest);

        // Eyes — deep set, glowing
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff66ff,
            emissive: 0xff44dd,
            emissiveIntensity: 1.0,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.18 * scale, 0.8 * scale, 1.0 * scale);
            this.group.add(eye);
        }

        // 4 massive legs — thick pillars
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 0.6 * scale, 6);
        for (let fz of [-0.35, 0.35]) {
            for (let fx of [-0.4, 0.4]) {
                const leg = new THREE.Mesh(legGeo, darkMat);
                leg.position.set(fx * scale, 0.3 * scale, fz * scale);
                this.group.add(leg);
                this.legs.push(leg);
            }
        }

        // Tail — short, armored
        const tailGeo = new THREE.ConeGeometry(0.1 * scale, 0.5 * scale, 5);
        this.tailMesh = new THREE.Mesh(tailGeo, armorMat);
        this.tailMesh.position.set(0, 0.7 * scale, -0.9 * scale);
        this.tailMesh.rotation.x = -1.2;
        this.group.add(this.tailMesh);

        // Plasma glow underneath
        const underGlowGeo = new THREE.SphereGeometry(0.4 * scale, 8, 4);
        const underGlow = new THREE.Mesh(underGlowGeo, new THREE.MeshStandardMaterial({
            color: 0x220033,
            emissive: 0xff22cc,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.5,
        }));
        underGlow.position.y = 0.35 * scale;
        underGlow.scale.y = 0.3;
        this.group.add(underGlow);
    }

    buildXenophantom(bodyMat, darkMat, scale) {
        // Rift Phantom — ethereal phase-shifting alien ghost. Inspired by NMS anomalies / Destiny Taken
        // Translucent, distorted humanoid form that flickers between dimensions
        const phantomMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.5,
            roughness: 0.1,
            metalness: 0.2,
            side: THREE.DoubleSide,
        });
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xff88ff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.9,
        });

        // Spectral body — elongated teardrop, floating
        const bodyGeo = new THREE.ConeGeometry(0.35 * scale, 1.0 * scale, 8);
        const body = new THREE.Mesh(bodyGeo, phantomMat);
        body.position.y = 1.0 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Phase core — brilliant glowing center
        const coreGeo = new THREE.OctahedronGeometry(0.15 * scale, 0);
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 1.1 * scale, 0);
        this.group.add(core);

        // Head — alien skull-like form
        const headGeo = new THREE.SphereGeometry(0.2 * scale, 8, 6);
        const hpa = headGeo.attributes.position;
        for (let i = 0; i < hpa.count; i++) {
            hpa.setZ(i, hpa.getZ(i) * 0.7);
        }
        headGeo.computeVertexNormals();
        this.headMesh = new THREE.Mesh(headGeo, phantomMat);
        this.headMesh.position.set(0, 1.65 * scale, 0);
        this.group.add(this.headMesh);

        // Eyes — three alien eyes in a triangle pattern
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xff44ff,
            emissiveIntensity: 2.0,
        });
        // Two primary eyes
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.1 * scale, 1.7 * scale, 0.15 * scale);
            this.group.add(eye);
        }
        // Third eye (upper center)
        const thirdEye = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 6, 6), eyeMat);
        thirdEye.position.set(0, 1.8 * scale, 0.12 * scale);
        this.group.add(thirdEye);

        // Spectral arms — longer, wispy
        for (let side of [-1, 1]) {
            const armGeo = new THREE.CylinderGeometry(0.02 * scale, 0.06 * scale, 0.7 * scale, 4);
            const arm = new THREE.Mesh(armGeo, phantomMat);
            arm.position.set(side * 0.35 * scale, 1.1 * scale, 0);
            arm.rotation.z = side * 0.5;
            this.group.add(arm);

            // Phantom claw tips
            const tipGeo = new THREE.ConeGeometry(0.04 * scale, 0.15 * scale, 4);
            const tip = new THREE.Mesh(tipGeo, coreMat);
            tip.position.set(side * 0.5 * scale, 0.65 * scale, 0.05 * scale);
            this.group.add(tip);
        }

        // Rift wisps — floating phase-energy tendrils
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const wispLen = (0.3 + Math.random() * 0.5) * scale;
            const wispGeo = new THREE.CylinderGeometry(0.01 * scale, 0.035 * scale, wispLen, 4);
            const wispMat = new THREE.MeshStandardMaterial({
                color: this.mobType.color,
                emissive: this.mobType.color,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.2,
            });
            const wisp = new THREE.Mesh(wispGeo, wispMat);
            wisp.position.set(
                Math.cos(angle) * 0.2 * scale,
                0.5 * scale - wispLen / 2,
                Math.sin(angle) * 0.2 * scale
            );
            wisp.rotation.x = (Math.random() - 0.5) * 0.4;
            wisp.rotation.z = (Math.random() - 0.5) * 0.4;
            this.group.add(wisp);
        }

        // Phase distortion ring around base
        const ringGeo = new THREE.TorusGeometry(0.3 * scale, 0.02 * scale, 6, 16);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
            color: 0xcc44ff,
            emissive: 0xaa22dd,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.4,
        }));
        ring.position.y = 0.5 * scale;
        ring.rotation.x = Math.PI / 2;
        this.group.add(ring);

        this.legs = [];
        this.tailMesh = null;
    }

    buildXenowyrm(bodyMat, darkMat, scale) {
        // Chrono Wyrm — massive alien serpent that phase-shifts through time
        // Inspired by NMS giant sandworms / Subnautica Ghost Leviathan
        // Multi-segmented glowing body with temporal distortion effects
        const chronoMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7,
            roughness: 0.2,
            metalness: 0.4,
        });
        const temporalMat = new THREE.MeshStandardMaterial({
            color: 0xff88ff,
            emissive: 0xff44dd,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.6,
        });

        // Segmented body — 10 linked segments with S-curve
        const segmentCount = 10;
        const segmentLength = 0.2 * scale;
        this._serpentSegments = [];

        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const r = (0.18 - t * 0.06) * scale; // taper toward tail
            const geo = new THREE.CylinderGeometry(r * 0.85, r, segmentLength, 6);
            const mat = i % 2 === 0 ? bodyMat : darkMat;
            const seg = new THREE.Mesh(geo, mat);
            const angle = Math.sin(i * 0.7) * 0.6;
            seg.position.set(
                Math.sin(angle) * i * segmentLength * 0.5,
                0.2 * scale,
                -i * segmentLength * 0.75
            );
            seg.rotation.x = Math.PI / 2;
            seg.rotation.z = angle;
            seg.castShadow = true;
            this.group.add(seg);
            this._serpentSegments.push(seg);

            // Chrono glow ring on every other segment
            if (i % 2 === 0 && i > 0) {
                const ringGeo = new THREE.TorusGeometry(r * 1.3, 0.015 * scale, 4, 8);
                const ring = new THREE.Mesh(ringGeo, chronoMat);
                ring.position.copy(seg.position);
                ring.position.y += 0.05 * scale;
                ring.rotation.x = Math.PI / 2;
                this.group.add(ring);
            }
        }

        this.bodyMesh = this._serpentSegments[0];

        // Head — elongated alien maw
        const headGeo = new THREE.BoxGeometry(0.22 * scale, 0.14 * scale, 0.35 * scale);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 0.25 * scale, 0.25 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Crown — temporal crest (3 horn-like protrusions)
        for (let i = -1; i <= 1; i++) {
            const crownGeo = new THREE.ConeGeometry(0.03 * scale, 0.2 * scale, 4);
            const crown = new THREE.Mesh(crownGeo, temporalMat);
            crown.position.set(i * 0.07 * scale, 0.4 * scale, 0.2 * scale);
            crown.rotation.x = -0.3;
            this.group.add(crown);
        }

        // Eyes — dual pairs (4 total, alien)
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xff66ff,
            emissiveIntensity: 1.8,
        });
        for (let row = 0; row < 2; row++) {
            for (let side of [-1, 1]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025 * scale, 6, 6), eyeMat);
                eye.position.set(
                    side * (0.06 + row * 0.03) * scale,
                    0.3 * scale + row * 0.06 * scale,
                    0.4 * scale
                );
                this.group.add(eye);
            }
        }

        // Mandible fangs
        for (let side of [-1, 1]) {
            const fangGeo = new THREE.ConeGeometry(0.02 * scale, 0.12 * scale, 4);
            const fang = new THREE.Mesh(fangGeo, temporalMat);
            fang.position.set(side * 0.07 * scale, 0.14 * scale, 0.42 * scale);
            fang.rotation.x = Math.PI;
            this.group.add(fang);
        }

        // Temporal distortion fins (side fins that glow)
        for (let side of [-1, 1]) {
            const finGeo = new THREE.PlaneGeometry(0.25 * scale, 0.15 * scale);
            const finMat = new THREE.MeshStandardMaterial({
                color: this.mobType.color,
                emissive: this.mobType.color,
                emissiveIntensity: 0.4,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5,
            });
            const fin = new THREE.Mesh(finGeo, finMat);
            fin.position.set(side * 0.2 * scale, 0.25 * scale, 0.05 * scale);
            fin.rotation.y = side * 0.6;
            this.group.add(fin);
        }

        // Dorsal spines
        for (let i = 0; i < 6; i++) {
            const spineGeo = new THREE.ConeGeometry(0.025 * scale, 0.12 * scale, 4);
            const spine = new THREE.Mesh(spineGeo, chronoMat);
            spine.position.set(0, 0.35 * scale, 0.1 * scale - i * segmentLength * 0.75);
            this.group.add(spine);
        }

        // Tail tip — temporal energy orb
        const tailTipGeo = new THREE.SphereGeometry(0.06 * scale, 6, 6);
        const tailTip = new THREE.Mesh(tailTipGeo, temporalMat);
        const lastSeg = this._serpentSegments[segmentCount - 1];
        tailTip.position.set(lastSeg.position.x, lastSeg.position.y + 0.05 * scale, lastSeg.position.z - 0.1 * scale);
        this.group.add(tailTip);

        this.legs = [];
        this.tailMesh = null;
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 6 — HALO RING (Forerunner / Covenant-inspired RPG creatures)
    // ═══════════════════════════════════════════════════════════

    buildHaloGrunt(bodyMat, darkMat, scale) {
        // Grunt Zealot — short, hunched bipedal alien with methane breathing apparatus
        // Halo Grunt + RPG spin: ornate zealot armor, tribal energy markings
        const armorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.mobType.color).multiplyScalar(0.7),
            roughness: 0.35,
            metalness: 0.5,
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: 0x44ffaa,
            emissive: 0x22dd88,
            emissiveIntensity: 0.7,
            roughness: 0.2,
        });

        // Hunched torso — wide and squat
        const torsoGeo = new THREE.SphereGeometry(0.3 * scale, 8, 6);
        const tpa = torsoGeo.attributes.position;
        for (let i = 0; i < tpa.count; i++) {
            tpa.setY(i, tpa.getY(i) * 0.8);
            tpa.setZ(i, tpa.getZ(i) * 1.2);
        }
        torsoGeo.computeVertexNormals();
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 0.5 * scale;
        torso.castShadow = true;
        this.group.add(torso);
        this.bodyMesh = torso;

        // Methane tank (backpack) — cylindrical canister
        const tankGeo = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.25 * scale, 6);
        const tank = new THREE.Mesh(tankGeo, new THREE.MeshStandardMaterial({
            color: 0x556677, roughness: 0.3, metalness: 0.6,
        }));
        tank.position.set(0, 0.55 * scale, -0.2 * scale);
        this.group.add(tank);

        // Methane tubes from tank to mask
        for (let side of [-1, 1]) {
            const tubeGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.2 * scale, 4);
            const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.4, roughness: 0.3 }));
            tube.position.set(side * 0.08 * scale, 0.6 * scale, -0.1 * scale);
            tube.rotation.x = -0.5;
            tube.rotation.z = side * 0.3;
            this.group.add(tube);
        }

        // Head — triangular alien skull with breathing mask
        const headGeo = new THREE.SphereGeometry(0.18 * scale, 7, 6);
        const hpa = headGeo.attributes.position;
        for (let i = 0; i < hpa.count; i++) {
            const z = hpa.getZ(i);
            if (z > 0) hpa.setZ(i, z * 1.3); // elongated snout
        }
        headGeo.computeVertexNormals();
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 0.75 * scale, 0.15 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Breathing mask — angular plate over lower face
        const maskGeo = new THREE.BoxGeometry(0.15 * scale, 0.08 * scale, 0.12 * scale);
        const mask = new THREE.Mesh(maskGeo, new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.6, roughness: 0.3 }));
        mask.position.set(0, 0.7 * scale, 0.28 * scale);
        this.group.add(mask);

        // Eyes — large, panicked-looking orbs (Halo Grunt iconic)
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x88ffdd, emissive: 0x44ffaa, emissiveIntensity: 1.2,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.1 * scale, 0.8 * scale, 0.25 * scale);
            this.group.add(eye);
        }

        // Short arms with 3-fingered claws
        for (let side of [-1, 1]) {
            const armGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.3 * scale, 5);
            const arm = new THREE.Mesh(armGeo, darkMat);
            arm.position.set(side * 0.28 * scale, 0.4 * scale, 0.05 * scale);
            arm.rotation.z = side * 0.5;
            this.group.add(arm);

            // Plasma pistol-like weapon in right hand
            if (side === 1) {
                const weapGeo = new THREE.BoxGeometry(0.06 * scale, 0.04 * scale, 0.12 * scale);
                const weap = new THREE.Mesh(weapGeo, glowMat);
                weap.position.set(side * 0.35 * scale, 0.25 * scale, 0.12 * scale);
                this.group.add(weap);
            }
        }

        // Short stubby legs
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.25 * scale, 5);
        for (let side of [-1, 1]) {
            const leg = new THREE.Mesh(legGeo, darkMat);
            leg.position.set(side * 0.12 * scale, 0.13 * scale, 0);
            this.group.add(leg);
            this.legs.push(leg);
        }

        // Energy markings on armor (glowing strips — zealot decoration)
        for (let i = 0; i < 3; i++) {
            const stripGeo = new THREE.BoxGeometry(0.01 * scale, 0.15 * scale, 0.01 * scale);
            const strip = new THREE.Mesh(stripGeo, glowMat);
            strip.position.set((i - 1) * 0.1 * scale, 0.5 * scale, 0.28 * scale);
            this.group.add(strip);
        }
    }

    buildHaloElite(bodyMat, darkMat, scale) {
        // Elite Warden — tall, armored bipedal warrior with energy sword and split jaw
        // Halo Elite + RPG Warden: ornate energy shields, ancient rune markings
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            emissive: 0x2288dd,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.3,
            side: THREE.DoubleSide,
        });
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x88ffff,
            emissive: 0x44ddff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.8,
        });
        const armorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.mobType.color),
            roughness: 0.3,
            metalness: 0.6,
        });

        // Tall, angular torso — broad shoulders, narrow waist
        const torsoGeo = new THREE.BoxGeometry(0.45 * scale, 0.8 * scale, 0.3 * scale);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 1.3 * scale;
        torso.castShadow = true;
        this.group.add(torso);
        this.bodyMesh = torso;

        // Shoulder pauldrons — angular armor plates
        for (let side of [-1, 1]) {
            const pauldGeo = new THREE.BoxGeometry(0.2 * scale, 0.1 * scale, 0.2 * scale);
            const pauld = new THREE.Mesh(pauldGeo, armorMat);
            pauld.position.set(side * 0.3 * scale, 1.65 * scale, 0);
            pauld.rotation.z = side * 0.2;
            this.group.add(pauld);
        }

        // Head — elongated with split mandible jaw (iconic Elite look)
        const headGeo = new THREE.BoxGeometry(0.2 * scale, 0.25 * scale, 0.22 * scale);
        this.headMesh = new THREE.Mesh(headGeo, bodyMat);
        this.headMesh.position.set(0, 1.85 * scale, 0.05 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Split mandibles — 4 jaw sections (Halo Elite signature)
        for (let side of [-1, 1]) {
            for (let fwd of [0, 1]) {
                const jawGeo = new THREE.BoxGeometry(0.04 * scale, 0.12 * scale, 0.04 * scale);
                const jaw = new THREE.Mesh(jawGeo, darkMat);
                jaw.position.set(
                    side * 0.08 * scale,
                    1.7 * scale,
                    0.08 * scale + fwd * 0.06 * scale
                );
                jaw.rotation.x = 0.3;
                jaw.rotation.z = side * 0.15;
                this.group.add(jaw);
            }
        }

        // Eyes — narrow, menacing slits
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 1.5,
        });
        for (let side of [-1, 1]) {
            const eyeGeo = new THREE.BoxGeometry(0.03 * scale, 0.02 * scale, 0.06 * scale);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.07 * scale, 1.9 * scale, 0.14 * scale);
            this.group.add(eye);
        }

        // Energy sword — held in right hand (iconic Halo weapon)
        const swordGeo = new THREE.BoxGeometry(0.03 * scale, 0.03 * scale, 0.7 * scale);
        const sword = new THREE.Mesh(swordGeo, bladeMat);
        sword.position.set(0.4 * scale, 0.85 * scale, 0.3 * scale);
        sword.rotation.x = -0.3;
        this.group.add(sword);

        // Sword hilt
        const hiltGeo = new THREE.CylinderGeometry(0.02 * scale, 0.025 * scale, 0.12 * scale, 5);
        const hilt = new THREE.Mesh(hiltGeo, armorMat);
        hilt.position.set(0.4 * scale, 0.85 * scale, -0.05 * scale);
        hilt.rotation.x = Math.PI / 2;
        this.group.add(hilt);

        // Arms — powerful, armored
        for (let side of [-1, 1]) {
            const upperGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.4 * scale, 5);
            const upper = new THREE.Mesh(upperGeo, darkMat);
            upper.position.set(side * 0.3 * scale, 1.15 * scale, 0);
            upper.rotation.z = side * 0.25;
            this.group.add(upper);

            const foreGeo = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.35 * scale, 5);
            const fore = new THREE.Mesh(foreGeo, armorMat);
            fore.position.set(side * 0.38 * scale, 0.85 * scale, 0.1 * scale);
            fore.rotation.z = side * 0.1;
            this.group.add(fore);
        }

        // Digitigrade legs (Halo Elite signature)
        this.legs = [];
        for (let side of [-1, 1]) {
            const thighGeo = new THREE.CylinderGeometry(0.07 * scale, 0.09 * scale, 0.45 * scale, 5);
            const thigh = new THREE.Mesh(thighGeo, darkMat);
            thigh.position.set(side * 0.14 * scale, 0.75 * scale, -0.05 * scale);
            this.group.add(thigh);
            this.legs.push(thigh);

            const shinGeo = new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.45 * scale, 5);
            const shin = new THREE.Mesh(shinGeo, armorMat);
            shin.position.set(side * 0.14 * scale, 0.3 * scale, 0.1 * scale);
            this.group.add(shin);
            this.legs.push(shin);

            // Hooved feet
            const footGeo = new THREE.BoxGeometry(0.08 * scale, 0.04 * scale, 0.18 * scale);
            const foot = new THREE.Mesh(footGeo, darkMat);
            foot.position.set(side * 0.14 * scale, 0.04 * scale, 0.15 * scale);
            this.group.add(foot);
        }

        // Overshield effect — faint bubble
        const shieldGeo = new THREE.SphereGeometry(0.65 * scale, 12, 8);
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.y = 1.2 * scale;
        this.group.add(shield);

        // Energy rune markings on torso
        for (let i = 0; i < 2; i++) {
            const runeGeo = new THREE.BoxGeometry(0.01 * scale, 0.3 * scale, 0.01 * scale);
            const rune = new THREE.Mesh(runeGeo, bladeMat);
            rune.position.set((i - 0.5) * 0.15 * scale, 1.3 * scale, 0.16 * scale);
            this.group.add(rune);
        }
    }

    buildHaloHunter(bodyMat, darkMat, scale) {
        // Hunter Pair — massive armored colony organism with fuel rod cannon and shield
        // Halo Hunter + RPG: living worm colony in heavy Forerunner plate, glowing orange weak points
        const plateMat = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            roughness: 0.3,
            metalness: 0.7,
        });
        const wormMat = new THREE.MeshStandardMaterial({
            color: 0xff6622,
            emissive: 0xff4400,
            emissiveIntensity: 0.8,
            roughness: 0.4,
        });
        const fuelMat = new THREE.MeshStandardMaterial({
            color: 0x44ff88,
            emissive: 0x22dd66,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.8,
        });

        // Massive hunched body — wide, armored
        const bodyGeo = new THREE.SphereGeometry(0.55 * scale, 10, 8);
        const bpa = bodyGeo.attributes.position;
        for (let i = 0; i < bpa.count; i++) {
            bpa.setY(i, bpa.getY(i) * 0.9);
            bpa.setX(i, bpa.getX(i) * 1.1);
            const n = 1 + Math.sin(bpa.getX(i) * 3 + bpa.getZ(i) * 2) * 0.08;
            bpa.setX(i, bpa.getX(i) * n);
            bpa.setZ(i, bpa.getZ(i) * n);
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, plateMat);
        body.position.y = 1.0 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Exposed worm colony — glowing orange patches (weak points)
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const wormGeo = new THREE.SphereGeometry(0.08 * scale, 5, 4);
            const worm = new THREE.Mesh(wormGeo, wormMat);
            worm.position.set(
                Math.cos(angle) * 0.4 * scale,
                1.0 * scale + (Math.random() - 0.5) * 0.2 * scale,
                Math.sin(angle) * 0.4 * scale
            );
            this.group.add(worm);
        }

        // Neck — thick, short, also armored
        const neckGeo = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 0.3 * scale, 6);
        const neck = new THREE.Mesh(neckGeo, plateMat);
        neck.position.set(0, 1.45 * scale, 0.15 * scale);
        this.group.add(neck);

        // Head — small, helmeted, heavily armored (Halo Hunter — barely any exposed head)
        const headGeo = new THREE.SphereGeometry(0.18 * scale, 8, 6);
        const hpa2 = headGeo.attributes.position;
        for (let i = 0; i < hpa2.count; i++) {
            hpa2.setY(i, hpa2.getY(i) * 0.7);
        }
        headGeo.computeVertexNormals();
        this.headMesh = new THREE.Mesh(headGeo, plateMat);
        this.headMesh.position.set(0, 1.65 * scale, 0.2 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Single visor eye (Hunter has limited vision)
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff8844, emissive: 0xff6622, emissiveIntensity: 1.5,
        });
        const visorGeo = new THREE.BoxGeometry(0.2 * scale, 0.04 * scale, 0.06 * scale);
        const visor = new THREE.Mesh(visorGeo, eyeMat);
        visor.position.set(0, 1.68 * scale, 0.35 * scale);
        this.group.add(visor);

        // Giant shield arm (left) — huge slab of Forerunner metal
        const shieldGeo = new THREE.BoxGeometry(0.08 * scale, 0.6 * scale, 0.5 * scale);
        const shield = new THREE.Mesh(shieldGeo, plateMat);
        shield.position.set(-0.55 * scale, 0.9 * scale, 0.2 * scale);
        shield.rotation.y = 0.2;
        this.group.add(shield);

        // Shield edge glow
        const shieldEdgeGeo = new THREE.BoxGeometry(0.01 * scale, 0.55 * scale, 0.48 * scale);
        const shieldEdge = new THREE.Mesh(shieldEdgeGeo, fuelMat);
        shieldEdge.position.set(-0.59 * scale, 0.9 * scale, 0.2 * scale);
        this.group.add(shieldEdge);

        // Fuel rod cannon arm (right) — barrel extending from forearm
        const cannonArmGeo = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.5 * scale, 6);
        const cannonArm = new THREE.Mesh(cannonArmGeo, plateMat);
        cannonArm.position.set(0.45 * scale, 0.9 * scale, 0.15 * scale);
        cannonArm.rotation.z = 0.3;
        this.group.add(cannonArm);

        // Cannon barrel
        const barrelGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.4 * scale, 6);
        const barrel = new THREE.Mesh(barrelGeo, plateMat);
        barrel.position.set(0.55 * scale, 0.65 * scale, 0.35 * scale);
        barrel.rotation.x = -0.8;
        this.group.add(barrel);

        // Fuel rod glow at barrel tip
        const fuelTipGeo = new THREE.SphereGeometry(0.05 * scale, 6, 6);
        const fuelTip = new THREE.Mesh(fuelTipGeo, fuelMat);
        fuelTip.position.set(0.55 * scale, 0.5 * scale, 0.55 * scale);
        this.group.add(fuelTip);

        // Massive legs — thick pillars
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 0.6 * scale, 6);
        for (let side of [-1, 1]) {
            const leg = new THREE.Mesh(legGeo, plateMat);
            leg.position.set(side * 0.22 * scale, 0.3 * scale, 0);
            this.group.add(leg);
            this.legs.push(leg);
        }

        // Spine protrusions (worm colony poking through armor gaps)
        for (let i = 0; i < 4; i++) {
            const spineGeo = new THREE.ConeGeometry(0.04 * scale, 0.15 * scale, 4);
            const spine = new THREE.Mesh(spineGeo, wormMat);
            spine.position.set(
                (i - 1.5) * 0.15 * scale,
                1.35 * scale,
                -0.3 * scale
            );
            this.group.add(spine);
        }

        this.tailMesh = null;
    }

    buildHaloSentinel(bodyMat, darkMat, scale) {
        // Sentinel Drone — floating Forerunner construct with beam weapon
        // Halo Sentinel + RPG: ornate ancient panels, beam lens eye, energy wings
        const forerunnerMat = new THREE.MeshStandardMaterial({
            color: 0x99bbaa,
            roughness: 0.2,
            metalness: 0.7,
        });
        const beamMat = new THREE.MeshStandardMaterial({
            color: 0xffdd44,
            emissive: 0xffcc22,
            emissiveIntensity: 1.2,
        });
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x667766,
            roughness: 0.25,
            metalness: 0.6,
        });

        // Central body — angular diamond shape (Forerunner aesthetic)
        const bodyGeo = new THREE.OctahedronGeometry(0.3 * scale, 0);
        const bpa2 = bodyGeo.attributes.position;
        for (let i = 0; i < bpa2.count; i++) {
            bpa2.setY(i, bpa2.getY(i) * 0.6); // flatten slightly
        }
        bodyGeo.computeVertexNormals();
        const body2 = new THREE.Mesh(bodyGeo, forerunnerMat);
        body2.position.y = 1.0 * scale;
        body2.castShadow = true;
        this.group.add(body2);
        this.bodyMesh = body2;

        // Central beam eye — large glowing lens (Sentinel's iconic feature)
        const lensGeo = new THREE.SphereGeometry(0.08 * scale, 8, 8);
        const lens = new THREE.Mesh(lensGeo, beamMat);
        lens.position.set(0, 1.0 * scale, 0.25 * scale);
        this.group.add(lens);
        this.headMesh = body2;

        // Lens ring
        const ringGeo = new THREE.TorusGeometry(0.1 * scale, 0.015 * scale, 6, 12);
        const ring = new THREE.Mesh(ringGeo, forerunnerMat);
        ring.position.set(0, 1.0 * scale, 0.25 * scale);
        this.group.add(ring);

        // Wing panels — 4 angular panels extending from body (Sentinel arms)
        for (let side of [-1, 1]) {
            for (let vert of [-1, 1]) {
                const wingGeo = new THREE.BoxGeometry(0.35 * scale, 0.015 * scale, 0.2 * scale);
                const wing = new THREE.Mesh(wingGeo, panelMat);
                wing.position.set(
                    side * 0.35 * scale,
                    1.0 * scale + vert * 0.12 * scale,
                    -0.05 * scale
                );
                wing.rotation.z = side * vert * 0.15;
                wing.rotation.y = side * 0.1;
                this.group.add(wing);
            }
        }

        // Energy conduit lines on wings
        for (let side of [-1, 1]) {
            const condGeo = new THREE.BoxGeometry(0.3 * scale, 0.005 * scale, 0.01 * scale);
            const cond = new THREE.Mesh(condGeo, beamMat);
            cond.position.set(side * 0.35 * scale, 1.0 * scale, -0.02 * scale);
            this.group.add(cond);
        }

        // Beam weapon barrel (extends downward from front)
        const barrelGeo2 = new THREE.CylinderGeometry(0.02 * scale, 0.04 * scale, 0.2 * scale, 6);
        const barrel2 = new THREE.Mesh(barrelGeo2, forerunnerMat);
        barrel2.position.set(0, 0.8 * scale, 0.2 * scale);
        this.group.add(barrel2);

        // Beam tip glow
        const tipGeo = new THREE.SphereGeometry(0.03 * scale, 6, 6);
        const tip = new THREE.Mesh(tipGeo, beamMat);
        tip.position.set(0, 0.68 * scale, 0.2 * scale);
        this.group.add(tip);

        // Forerunner glyph markings on body (decorative emissive panels)
        for (let i = 0; i < 3; i++) {
            const glyphGeo = new THREE.BoxGeometry(0.04 * scale, 0.01 * scale, 0.1 * scale);
            const glyphMat = new THREE.MeshStandardMaterial({
                color: 0x44ffaa,
                emissive: 0x22dd88,
                emissiveIntensity: 0.6,
            });
            const glyph = new THREE.Mesh(glyphGeo, glyphMat);
            glyph.position.set(
                (i - 1) * 0.1 * scale,
                1.0 * scale,
                -0.2 * scale
            );
            this.group.add(glyph);
        }

        // Anti-gravity glow underneath
        const agGeo = new THREE.SphereGeometry(0.15 * scale, 8, 4);
        const ag = new THREE.Mesh(agGeo, new THREE.MeshStandardMaterial({
            color: 0x113322,
            emissive: 0x44ffaa,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.4,
        }));
        ag.position.y = 0.75 * scale;
        ag.scale.y = 0.3;
        this.group.add(ag);

        this.legs = [];
        this.tailMesh = null;
    }

    buildHaloWraith(bodyMat, darkMat, scale) {
        // Arbiter Wraith — spectral echo of an ancient Forerunner warrior-priest
        // Halo Arbiter + undead wraith + RPG: phase-shifting energy construct in ceremonial armor
        const spectreMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: this.mobType.color,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            metalness: 0.3,
            side: THREE.DoubleSide,
        });
        const coreMat2 = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x44ffcc,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.9,
        });
        const ceremonyMat = new THREE.MeshStandardMaterial({
            color: 0x446655,
            emissive: 0x22aa88,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.5,
        });

        // Spectral torso — tall, imposing, semi-transparent
        const torsoGeo2 = new THREE.BoxGeometry(0.5 * scale, 0.9 * scale, 0.35 * scale);
        const torso2 = new THREE.Mesh(torsoGeo2, spectreMat);
        torso2.position.y = 1.3 * scale;
        torso2.castShadow = true;
        this.group.add(torso2);
        this.bodyMesh = torso2;

        // Ceremonial armor plates over ghostly form
        for (let side of [-1, 1]) {
            const plateGeo = new THREE.BoxGeometry(0.12 * scale, 0.5 * scale, 0.25 * scale);
            const plate = new THREE.Mesh(plateGeo, ceremonyMat);
            plate.position.set(side * 0.3 * scale, 1.35 * scale, 0);
            this.group.add(plate);
        }

        // Chest plate with Forerunner glyph
        const chestGeo = new THREE.BoxGeometry(0.35 * scale, 0.4 * scale, 0.05 * scale);
        const chest = new THREE.Mesh(chestGeo, ceremonyMat);
        chest.position.set(0, 1.35 * scale, 0.18 * scale);
        this.group.add(chest);

        // Phase core — brilliant energy center
        const coreGeo2 = new THREE.OctahedronGeometry(0.12 * scale, 0);
        const core2 = new THREE.Mesh(coreGeo2, coreMat2);
        core2.position.set(0, 1.35 * scale, 0.2 * scale);
        this.group.add(core2);

        // Head — elongated Arbiter helmet with mandible extensions
        const headGeo2 = new THREE.BoxGeometry(0.25 * scale, 0.3 * scale, 0.25 * scale);
        this.headMesh = new THREE.Mesh(headGeo2, ceremonyMat);
        this.headMesh.position.set(0, 1.95 * scale, 0.05 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Helmet crest — angular dorsal fin
        const crestGeo = new THREE.BoxGeometry(0.04 * scale, 0.2 * scale, 0.3 * scale);
        const crest = new THREE.Mesh(crestGeo, ceremonyMat);
        crest.position.set(0, 2.1 * scale, -0.05 * scale);
        this.group.add(crest);

        // Ghost mandibles (spectral — phase energy jaw extensions)
        for (let side of [-1, 1]) {
            const jawGeo = new THREE.ConeGeometry(0.03 * scale, 0.18 * scale, 4);
            const jaw = new THREE.Mesh(jawGeo, spectreMat);
            jaw.position.set(side * 0.1 * scale, 1.78 * scale, 0.18 * scale);
            jaw.rotation.x = 0.4;
            jaw.rotation.z = side * 0.2;
            this.group.add(jaw);
        }

        // Eyes — blazing ancient light
        const eyeMat2 = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x44ffcc,
            emissiveIntensity: 2.0,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 6, 6), eyeMat2);
            eye.position.set(side * 0.08 * scale, 2.0 * scale, 0.15 * scale);
            this.group.add(eye);
        }

        // Dual energy blades — one in each hand (Arbiter's signature)
        for (let side of [-1, 1]) {
            // Arm
            const armGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.55 * scale, 5);
            const arm = new THREE.Mesh(armGeo, spectreMat);
            arm.position.set(side * 0.35 * scale, 1.05 * scale, 0.05 * scale);
            arm.rotation.z = side * 0.3;
            this.group.add(arm);

            // Energy blade
            const bladeGeo = new THREE.BoxGeometry(0.02 * scale, 0.02 * scale, 0.55 * scale);
            const bladeMat2 = new THREE.MeshStandardMaterial({
                color: 0x88ffdd,
                emissive: 0x44ffbb,
                emissiveIntensity: 1.0,
                transparent: true,
                opacity: 0.75,
            });
            const blade = new THREE.Mesh(bladeGeo, bladeMat2);
            blade.position.set(side * 0.45 * scale, 0.7 * scale, 0.35 * scale);
            blade.rotation.x = -0.4;
            this.group.add(blade);
        }

        // Spectral lower body — flowing energy robes (no legs, wraith floats)
        const robeGeo = new THREE.ConeGeometry(0.35 * scale, 0.9 * scale, 8);
        const robe = new THREE.Mesh(robeGeo, spectreMat);
        robe.position.y = 0.55 * scale;
        this.group.add(robe);

        // Phase-energy tendrils trailing below
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const tendLen = (0.3 + Math.random() * 0.4) * scale;
            const tendGeo = new THREE.CylinderGeometry(0.01 * scale, 0.03 * scale, tendLen, 4);
            const tendMat = new THREE.MeshStandardMaterial({
                color: this.mobType.color,
                emissive: this.mobType.color,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.2,
            });
            const tend = new THREE.Mesh(tendGeo, tendMat);
            tend.position.set(
                Math.cos(angle) * 0.2 * scale,
                0.15 * scale - tendLen / 2,
                Math.sin(angle) * 0.2 * scale
            );
            tend.rotation.x = (Math.random() - 0.5) * 0.3;
            tend.rotation.z = (Math.random() - 0.5) * 0.3;
            this.group.add(tend);
        }

        // Phase distortion ring
        const phaseRingGeo = new THREE.TorusGeometry(0.4 * scale, 0.02 * scale, 6, 16);
        const phaseRing = new THREE.Mesh(phaseRingGeo, new THREE.MeshStandardMaterial({
            color: 0x22aa88,
            emissive: 0x11dd99,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.35,
        }));
        phaseRing.position.y = 0.5 * scale;
        phaseRing.rotation.x = Math.PI / 2;
        this.group.add(phaseRing);

        this.legs = [];
        this.tailMesh = null;
    }

    // ═══════════════════════════════════════════════════════════
    // ZONE 7 — CRIMSON REACH (Geonosian-inspired hive creatures)
    // ═══════════════════════════════════════════════════════════

    buildHiveDrone(bodyMat, darkMat, scale) {
        // Hive Drone — insectoid Geonosian worker-warrior, chitinous exoskeleton
        const chitinMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            roughness: 0.4,
            metalness: 0.3,
        });
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0xcc9966,
            emissive: 0x885522,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.0,
        });

        // Thorax — segmented insectoid
        const thoraxGeo = new THREE.SphereGeometry(0.3 * scale, 8, 6);
        const tpa = thoraxGeo.attributes.position;
        for (let i = 0; i < tpa.count; i++) {
            tpa.setY(i, tpa.getY(i) * 0.7);
            tpa.setZ(i, tpa.getZ(i) * 1.2);
        }
        thoraxGeo.computeVertexNormals();
        const thorax = new THREE.Mesh(thoraxGeo, chitinMat);
        thorax.position.y = 0.6 * scale;
        thorax.castShadow = true;
        this.group.add(thorax);
        this.bodyMesh = thorax;

        // Abdomen — bulbous rear section
        const abdGeo = new THREE.SphereGeometry(0.22 * scale, 7, 5);
        const abd = new THREE.Mesh(abdGeo, darkMat);
        abd.position.set(0, 0.5 * scale, -0.35 * scale);
        abd.scale.set(0.9, 0.7, 1.3);
        this.group.add(abd);

        // Head — elongated insectoid skull
        const headGeo = new THREE.SphereGeometry(0.16 * scale, 7, 6);
        const hpa = headGeo.attributes.position;
        for (let i = 0; i < hpa.count; i++) {
            const z = hpa.getZ(i);
            if (z > 0) hpa.setZ(i, z * 1.5); // elongated snout
        }
        headGeo.computeVertexNormals();
        this.headMesh = new THREE.Mesh(headGeo, chitinMat);
        this.headMesh.position.set(0, 0.72 * scale, 0.3 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Compound eyes
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.1 * scale, 0.78 * scale, 0.38 * scale);
            this.group.add(eye);
        }

        // Mandibles
        for (let side of [-1, 1]) {
            const mandGeo = new THREE.ConeGeometry(0.02 * scale, 0.12 * scale, 4);
            const mand = new THREE.Mesh(mandGeo, darkMat);
            mand.position.set(side * 0.06 * scale, 0.62 * scale, 0.45 * scale);
            mand.rotation.x = 0.7; mand.rotation.z = side * 0.4;
            this.group.add(mand);
        }

        // Translucent wings (2 pairs)
        for (let side of [-1, 1]) {
            for (let pair = 0; pair < 2; pair++) {
                const wGeo = new THREE.PlaneGeometry(0.4 * scale, 0.15 * scale);
                const wing = new THREE.Mesh(wGeo, wingMat);
                wing.position.set(side * 0.22 * scale, 0.8 * scale + pair * 0.08 * scale, -0.05 * scale - pair * 0.1 * scale);
                wing.rotation.y = side * 0.3; wing.rotation.z = side * (0.5 + pair * 0.2);
                this.group.add(wing);
            }
        }

        // 6 spindly legs
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.015 * scale, 0.025 * scale, 0.35 * scale, 4);
        for (let side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const leg = new THREE.Mesh(legGeo, darkMat);
                const zOff = (i - 1) * 0.15 * scale;
                leg.position.set(side * 0.25 * scale, 0.2 * scale, zOff);
                leg.rotation.z = side * 0.8;
                this.group.add(leg);
                this.legs.push(leg);
            }
        }

        // Spinal ridges on thorax
        for (let i = 0; i < 3; i++) {
            const rGeo = new THREE.ConeGeometry(0.02 * scale, 0.08 * scale, 3);
            const ridge = new THREE.Mesh(rGeo, chitinMat);
            ridge.position.set(0, 0.75 * scale, -0.1 * scale + i * 0.12 * scale);
            this.group.add(ridge);
        }
        this.tailMesh = null;
    }

    buildSpireSentinel(bodyMat, darkMat, scale) {
        // Spire Sentinel — tall stone-and-chitin guardian construct, Geonosian architecture
        const stoneMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.mobType.color),
            roughness: 0.7,
            metalness: 0.2,
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: 0xffaa33, emissive: 0xff8811, emissiveIntensity: 0.8,
            roughness: 0.2,
        });

        // Tall pillar body — sandstone construct
        const bodyGeo = new THREE.CylinderGeometry(0.2 * scale, 0.35 * scale, 1.4 * scale, 6);
        const bpa = bodyGeo.attributes.position;
        for (let i = 0; i < bpa.count; i++) {
            const n = 1 + Math.sin(bpa.getY(i) * 4 + i * 0.5) * 0.08;
            bpa.setX(i, bpa.getX(i) * n); bpa.setZ(i, bpa.getZ(i) * n);
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, stoneMat);
        body.position.y = 0.9 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Head — angular sandstone block with carved face
        const headGeo = new THREE.BoxGeometry(0.3 * scale, 0.25 * scale, 0.25 * scale);
        this.headMesh = new THREE.Mesh(headGeo, stoneMat);
        this.headMesh.position.set(0, 1.75 * scale, 0);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Glowing eye slit
        const eyeGeo = new THREE.BoxGeometry(0.2 * scale, 0.03 * scale, 0.06 * scale);
        const eye = new THREE.Mesh(eyeGeo, glowMat);
        eye.position.set(0, 1.78 * scale, 0.13 * scale);
        this.group.add(eye);

        // Shoulder pylons — angular stone protrusions
        for (let side of [-1, 1]) {
            const pylonGeo = new THREE.BoxGeometry(0.12 * scale, 0.35 * scale, 0.12 * scale);
            const pylon = new THREE.Mesh(pylonGeo, stoneMat);
            pylon.position.set(side * 0.32 * scale, 1.5 * scale, 0);
            pylon.rotation.z = side * 0.15;
            this.group.add(pylon);
            // Pylon glow tip
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 5, 5), glowMat);
            tip.position.set(side * 0.32 * scale, 1.72 * scale, 0);
            this.group.add(tip);
        }

        // Arms — thick stone limbs with chitin plating
        for (let side of [-1, 1]) {
            const armGeo = new THREE.CylinderGeometry(0.06 * scale, 0.09 * scale, 0.5 * scale, 5);
            const arm = new THREE.Mesh(armGeo, darkMat);
            arm.position.set(side * 0.35 * scale, 1.0 * scale, 0.05 * scale);
            arm.rotation.z = side * 0.4;
            this.group.add(arm);
            // Stone fist
            const fist = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.1 * scale), stoneMat);
            fist.position.set(side * 0.5 * scale, 0.7 * scale, 0.08 * scale);
            this.group.add(fist);
        }

        // Legs — thick pillars
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 0.5 * scale, 5);
        for (let side of [-1, 1]) {
            const leg = new THREE.Mesh(legGeo, darkMat);
            leg.position.set(side * 0.15 * scale, 0.25 * scale, 0);
            this.group.add(leg);
            this.legs.push(leg);
        }

        // Amber energy veins on body
        for (let i = 0; i < 3; i++) {
            const vGeo = new THREE.BoxGeometry(0.015 * scale, 0.3 * scale, 0.015 * scale);
            const vein = new THREE.Mesh(vGeo, glowMat);
            vein.position.set((i - 1) * 0.08 * scale, 0.8 * scale + i * 0.1 * scale, 0.2 * scale);
            this.group.add(vein);
        }

        // Base — cracked stone platform
        const baseGeo = new THREE.CylinderGeometry(0.35 * scale, 0.4 * scale, 0.1 * scale, 6);
        const base = new THREE.Mesh(baseGeo, darkMat);
        base.position.y = 0.05 * scale;
        this.group.add(base);
        this.tailMesh = null;
    }

    buildSandColossus(bodyMat, darkMat, scale) {
        // Sand Colossus — massive stone golem animated by hive bio-engineering
        const sandMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.mobType.color),
            roughness: 0.85,
            metalness: 0.1,
        });
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 0.6,
            roughness: 0.3,
        });

        // Massive boulder body — irregular, imposing
        const bodyGeo = new THREE.DodecahedronGeometry(0.7 * scale, 1);
        const bpa = bodyGeo.attributes.position;
        for (let i = 0; i < bpa.count; i++) {
            const n = 1 + (Math.random() - 0.5) * 0.25;
            bpa.setX(i, bpa.getX(i) * n * 1.1);
            bpa.setY(i, bpa.getY(i) * (0.85 + Math.random() * 0.15));
            bpa.setZ(i, bpa.getZ(i) * n);
        }
        bodyGeo.computeVertexNormals();
        const body = new THREE.Mesh(bodyGeo, sandMat);
        body.position.y = 1.0 * scale;
        body.castShadow = true;
        this.group.add(body);
        this.bodyMesh = body;

        // Glowing core cracks — visible through body seams
        for (let i = 0; i < 5; i++) {
            const crGeo = new THREE.BoxGeometry(0.02 * scale, (0.2 + Math.random() * 0.3) * scale, 0.02 * scale);
            const crack = new THREE.Mesh(crGeo, coreMat);
            const angle = (i / 5) * Math.PI * 2;
            crack.position.set(
                Math.cos(angle) * 0.55 * scale,
                0.8 * scale + Math.random() * 0.4 * scale,
                Math.sin(angle) * 0.55 * scale
            );
            crack.rotation.z = (Math.random() - 0.5) * 0.5;
            this.group.add(crack);
        }

        // Head — rough hewn boulder sitting on shoulders
        const headGeo = new THREE.DodecahedronGeometry(0.25 * scale, 0);
        this.headMesh = new THREE.Mesh(headGeo, sandMat);
        this.headMesh.position.set(0, 1.65 * scale, 0.2 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Eyes — deep glowing amber
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffaa22, emissive: 0xff8800, emissiveIntensity: 1.5,
        });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 6), eyeMat);
            eye.position.set(side * 0.12 * scale, 1.7 * scale, 0.38 * scale);
            this.group.add(eye);
        }

        // Massive stone arms
        for (let side of [-1, 1]) {
            const upperGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.6 * scale, 5);
            const upper = new THREE.Mesh(upperGeo, darkMat);
            upper.position.set(side * 0.7 * scale, 0.95 * scale, 0);
            upper.rotation.z = side * 0.35;
            upper.castShadow = true;
            this.group.add(upper);
            const fistGeo = new THREE.DodecahedronGeometry(0.15 * scale, 0);
            const fist = new THREE.Mesh(fistGeo, sandMat);
            fist.position.set(side * 0.95 * scale, 0.55 * scale, 0.1 * scale);
            this.group.add(fist);
        }

        // Thick pillar legs
        this.legs = [];
        const legGeo = new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 0.65 * scale, 6);
        for (let side of [-1, 1]) {
            const leg = new THREE.Mesh(legGeo, darkMat);
            leg.position.set(side * 0.28 * scale, 0.3 * scale, 0);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        }

        // Sand/debris cloud at base
        const debrisGeo = new THREE.SphereGeometry(0.5 * scale, 8, 4);
        const debris = new THREE.Mesh(debrisGeo, new THREE.MeshStandardMaterial({
            color: 0x332211, emissive: 0x221100, emissiveIntensity: 0.1,
            transparent: true, opacity: 0.3,
        }));
        debris.position.y = 0.2 * scale;
        debris.scale.y = 0.3;
        this.group.add(debris);
        this.tailMesh = null;
    }

    buildForgeOverseer(bodyMat, darkMat, scale) {
        // Forge Overseer — elite Geonosian engineer with thermal beam weapon and bio-tech armor
        const armorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.mobType.color),
            roughness: 0.35,
            metalness: 0.5,
        });
        const beamMat = new THREE.MeshStandardMaterial({
            color: 0xff6633, emissive: 0xff4411, emissiveIntensity: 1.0,
            roughness: 0.1,
        });
        const techMat = new THREE.MeshStandardMaterial({
            color: 0x665544, roughness: 0.3, metalness: 0.6,
        });

        // Upright torso — armored insectoid officer
        const torsoGeo = new THREE.BoxGeometry(0.35 * scale, 0.7 * scale, 0.25 * scale);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 1.1 * scale;
        torso.castShadow = true;
        this.group.add(torso);
        this.bodyMesh = torso;

        // Chitin shoulder armor
        for (let side of [-1, 1]) {
            const pGeo = new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.18 * scale);
            const pauld = new THREE.Mesh(pGeo, techMat);
            pauld.position.set(side * 0.25 * scale, 1.4 * scale, 0);
            pauld.rotation.z = side * 0.15;
            this.group.add(pauld);
        }

        // Head — angular insectoid with visor
        const headGeo = new THREE.BoxGeometry(0.2 * scale, 0.22 * scale, 0.2 * scale);
        this.headMesh = new THREE.Mesh(headGeo, armorMat);
        this.headMesh.position.set(0, 1.58 * scale, 0.04 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Thermal visor
        const visorGeo = new THREE.BoxGeometry(0.18 * scale, 0.04 * scale, 0.06 * scale);
        const visor = new THREE.Mesh(visorGeo, beamMat);
        visor.position.set(0, 1.6 * scale, 0.14 * scale);
        this.group.add(visor);

        // Antennae
        for (let side of [-1, 1]) {
            const antGeo = new THREE.CylinderGeometry(0.008 * scale, 0.015 * scale, 0.2 * scale, 3);
            const ant = new THREE.Mesh(antGeo, armorMat);
            ant.position.set(side * 0.06 * scale, 1.75 * scale, 0.05 * scale);
            ant.rotation.x = -0.5; ant.rotation.z = side * 0.3;
            this.group.add(ant);
        }

        // Thermal beam weapon — right arm cannon
        const cannonGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.5 * scale, 6);
        const cannon = new THREE.Mesh(cannonGeo, techMat);
        cannon.position.set(0.35 * scale, 0.85 * scale, 0.15 * scale);
        cannon.rotation.z = 0.3; cannon.rotation.x = -0.4;
        this.group.add(cannon);
        // Beam glow tip
        const tipGeo = new THREE.SphereGeometry(0.05 * scale, 6, 6);
        const tip = new THREE.Mesh(tipGeo, beamMat);
        tip.position.set(0.4 * scale, 0.6 * scale, 0.35 * scale);
        this.group.add(tip);

        // Left arm — manipulator claw
        const lArmGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.4 * scale, 5);
        const lArm = new THREE.Mesh(lArmGeo, darkMat);
        lArm.position.set(-0.3 * scale, 0.9 * scale, 0.05 * scale);
        lArm.rotation.z = -0.35;
        this.group.add(lArm);
        // Claw tips
        for (let c = 0; c < 3; c++) {
            const clawGeo = new THREE.ConeGeometry(0.015 * scale, 0.1 * scale, 4);
            const claw = new THREE.Mesh(clawGeo, beamMat);
            claw.position.set(-0.38 * scale + (c - 1) * 0.03 * scale, 0.62 * scale, 0.12 * scale);
            claw.rotation.x = 0.5;
            this.group.add(claw);
        }

        // Digitigrade legs
        this.legs = [];
        for (let side of [-1, 1]) {
            const thGeo = new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 0.4 * scale, 5);
            const thigh = new THREE.Mesh(thGeo, darkMat);
            thigh.position.set(side * 0.12 * scale, 0.6 * scale, 0);
            this.group.add(thigh);
            this.legs.push(thigh);
            const shGeo = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.35 * scale, 5);
            const shin = new THREE.Mesh(shGeo, armorMat);
            shin.position.set(side * 0.12 * scale, 0.25 * scale, 0.08 * scale);
            this.group.add(shin);
            this.legs.push(shin);
            const fGeo = new THREE.BoxGeometry(0.08 * scale, 0.03 * scale, 0.12 * scale);
            const foot = new THREE.Mesh(fGeo, darkMat);
            foot.position.set(side * 0.12 * scale, 0.04 * scale, 0.1 * scale);
            this.group.add(foot);
        }

        // Backpack — forge power unit with heat vents
        const packGeo = new THREE.BoxGeometry(0.2 * scale, 0.25 * scale, 0.15 * scale);
        const pack = new THREE.Mesh(packGeo, techMat);
        pack.position.set(0, 1.15 * scale, -0.18 * scale);
        this.group.add(pack);
        // Heat vent glow
        const ventGeo = new THREE.SphereGeometry(0.04 * scale, 5, 5);
        for (let i = 0; i < 2; i++) {
            const vent = new THREE.Mesh(ventGeo, beamMat);
            vent.position.set((i - 0.5) * 0.1 * scale, 1.25 * scale, -0.25 * scale);
            this.group.add(vent);
        }
        this.tailMesh = null;
    }

    buildCrimsonWyrm(bodyMat, darkMat, scale) {
        // Crimson Wyrmlord — massive burrowing serpent, Geonosian arena beast
        // Segmented armored body, massive jaws, crimson venom glow
        const crimsonMat = new THREE.MeshStandardMaterial({
            color: this.mobType.color,
            emissive: new THREE.Color(this.mobType.color).multiplyScalar(0.3),
            emissiveIntensity: 0.4,
            roughness: 0.5,
            metalness: 0.2,
        });
        const venomMat = new THREE.MeshStandardMaterial({
            color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 1.0,
            transparent: true, opacity: 0.8,
        });

        // Segmented body — 12 armored segments in S-curve
        const segmentCount = 12;
        const segLen = 0.22 * scale;
        this._serpentSegments = [];
        for (let i = 0; i < segmentCount; i++) {
            const t = i / segmentCount;
            const r = (0.2 - t * 0.08) * scale;
            const geo = new THREE.CylinderGeometry(r * 0.85, r, segLen, 6);
            const mat = i % 3 === 0 ? crimsonMat : (i % 3 === 1 ? bodyMat : darkMat);
            const seg = new THREE.Mesh(geo, mat);
            const angle = Math.sin(i * 0.6) * 0.7;
            seg.position.set(
                Math.sin(angle) * i * segLen * 0.4,
                0.25 * scale,
                -i * segLen * 0.7
            );
            seg.rotation.x = Math.PI / 2;
            seg.rotation.z = angle;
            seg.castShadow = true;
            this.group.add(seg);
            this._serpentSegments.push(seg);

            // Dorsal spine on every 2nd segment
            if (i % 2 === 0 && i > 0) {
                const spineGeo = new THREE.ConeGeometry(0.03 * scale, 0.15 * scale, 4);
                const spine = new THREE.Mesh(spineGeo, crimsonMat);
                spine.position.set(seg.position.x, 0.4 * scale, seg.position.z);
                this.group.add(spine);
            }

            // Crimson energy ring on every 3rd segment
            if (i % 3 === 0 && i > 0) {
                const ringGeo = new THREE.TorusGeometry(r * 1.2, 0.015 * scale, 4, 8);
                const ring = new THREE.Mesh(ringGeo, venomMat);
                ring.position.copy(seg.position);
                ring.position.y += 0.05 * scale;
                ring.rotation.x = Math.PI / 2;
                this.group.add(ring);
            }
        }
        this.bodyMesh = this._serpentSegments[0];

        // Head — massive armored maw
        const headGeo = new THREE.BoxGeometry(0.28 * scale, 0.18 * scale, 0.4 * scale);
        this.headMesh = new THREE.Mesh(headGeo, crimsonMat);
        this.headMesh.position.set(0, 0.3 * scale, 0.3 * scale);
        this.headMesh.castShadow = true;
        this.group.add(this.headMesh);

        // Upper jaw crest — horn-like protrusions
        for (let i = -1; i <= 1; i++) {
            const hornGeo = new THREE.ConeGeometry(0.035 * scale, 0.25 * scale, 4);
            const horn = new THREE.Mesh(hornGeo, darkMat);
            horn.position.set(i * 0.08 * scale, 0.5 * scale, 0.2 * scale);
            horn.rotation.x = -0.3;
            this.group.add(horn);
        }

        // Eyes — 4 (two rows), burning crimson
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: 0xff4400, emissiveIntensity: 2.0,
        });
        for (let row = 0; row < 2; row++) {
            for (let side of [-1, 1]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025 * scale, 6, 6), eyeMat);
                eye.position.set(
                    side * (0.07 + row * 0.03) * scale,
                    0.35 * scale + row * 0.06 * scale,
                    0.48 * scale
                );
                this.group.add(eye);
            }
        }

        // Massive fangs
        for (let side of [-1, 1]) {
            const fangGeo = new THREE.ConeGeometry(0.025 * scale, 0.15 * scale, 4);
            const fang = new THREE.Mesh(fangGeo, venomMat);
            fang.position.set(side * 0.08 * scale, 0.15 * scale, 0.5 * scale);
            fang.rotation.x = Math.PI;
            this.group.add(fang);
        }

        // Side fins — armored plate wings
        for (let side of [-1, 1]) {
            const finGeo = new THREE.PlaneGeometry(0.3 * scale, 0.18 * scale);
            const finMat = new THREE.MeshStandardMaterial({
                color: this.mobType.color, emissive: this.mobType.color,
                emissiveIntensity: 0.3, side: THREE.DoubleSide,
                transparent: true, opacity: 0.6,
            });
            const fin = new THREE.Mesh(finGeo, finMat);
            fin.position.set(side * 0.22 * scale, 0.3 * scale, 0.05 * scale);
            fin.rotation.y = side * 0.5;
            this.group.add(fin);
        }

        // Tail tip — venom stinger
        const lastSeg = this._serpentSegments[segmentCount - 1];
        const stingerGeo = new THREE.ConeGeometry(0.04 * scale, 0.2 * scale, 4);
        const stinger = new THREE.Mesh(stingerGeo, venomMat);
        stinger.position.set(lastSeg.position.x, lastSeg.position.y, lastSeg.position.z - 0.15 * scale);
        stinger.rotation.x = -Math.PI / 2;
        this.group.add(stinger);

        this.legs = [];
        this.tailMesh = null;
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.hp -= amount;
        this.hitFlash = 0.15;
        this.inCombat = true;
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        this.alive = false;
        this.deathTimer = this.isBoss ? 4.0 : 2.0;

        // Trigger thematic death VFX
        if (this.combatEffects) {
            this.combatEffects.spawnDeathVFX(this.group.position, this.mobType);
        }
        
        // Track kills by zone for achievements
        if (!gameState.mobsKilledByZone) gameState.mobsKilledByZone = {};
        const zoneId = gameState.currentZoneId;
        gameState.mobsKilledByZone[zoneId] = (gameState.mobsKilledByZone[zoneId] || 0) + 1;

        // ── Zone out-leveled check: suppress XP if player has exceeded zone level cap ──
        // Gold, karma, loot, and quest progress still awarded — only XP is withheld.
        const zoneOutleveled = gameState.isCurrentZoneOutleveled();
        
        if (zoneOutleveled) {
            // No XP from kills in outleveled zones — gold & karma still awarded
            gameState.addGold(this.goldReward);
            gameState.addKarma(this.karmaReward);
        } else {
            gameState.addXp(this.xpReward);
            gameState.addGold(this.goldReward);
            gameState.addKarma(this.karmaReward);
        }
        
        // Soul Essence is EXCLUSIVELY earned from Dungeons & Raids — no mob kill generation
        
        // Progress event if it's a kill event
        if (gameState.currentEvent && gameState.currentEvent.type === 'kill') {
            gameState.progressEvent(1);
        }

        // Dispatch to quest log (quest progress always counts — player can finish current quest)
        questLog.onMobKilled(this.mobType.name);

        // Track in companion bestiary (discovers creature for companion summon)
        companionSystem.onMobKilled(this.mobType.name);
        
        // Check for quest item drops (Wurm Fangs, Golem Cores, etc.)
        questLog.onMobKilledForDrops(this.mobType.name);

        // Boss-specific death handling — only count if the boss quest is active
        if (this.isBoss && this.bossZoneId) {
            const bossConfig = CONFIG.getBossForZone(this.bossZoneId);
            const hasBossQuest = bossConfig && questLog.activeQuests.some(q => q.id === bossConfig.questId);
            if (hasBossQuest) {
                gameState.defeatBoss(this.bossZoneId);
                questLog.onBossKilled(this.bossZoneId);
            } else {
                // Boss killed without quest active — log warning but don't count
                gameState.addGameLog(`${this.mobType.name} was defeated but the quest was not active. It will respawn.`);
            }
        }

        // Roll loot (bosses drop more)
        const drops = inventory.rollLoot(this.mobType, this.level);
        for (const item of drops) {
            inventory.addItem(item);
        }
        // Boss bonus loot: roll extra drops
        if (this.isBoss) {
            for (let i = 0; i < 3; i++) {
                const bonusDrops = inventory.rollLoot(this.mobType, this.level + 3);
                for (const item of bonusDrops) {
                    inventory.addItem(item);
                }
            }
        }
        // Auto-equip upgrades (idle convenience)
        const upgraded = inventory.autoEquipUpgrades();
        if (upgraded && window._showGearUpgradeToast) {
            window._showGearUpgradeToast();
        }

        // Party member loot rolls (independent gear for each member)
        if (partySystem.members.length > 0) {
            const partyLoot = partySystem.rollPartyLoot(this.mobType, this.level);
            for (const { member, item } of partyLoot) {
                gameState.addGameLog(`${member.name} equipped ${item.name}!`);
            }
        }
        
        const bossTag = this.isBoss ? ' ⚔ BOSS' : '';
        const xpText = zoneOutleveled ? '0 XP (outleveled)' : `${this.xpReward} XP`;
        gameState.addGameLog(`Defeated ${this.mobType.name}${bossTag} (+${xpText}, +${this.goldReward}g)`);

        // Party members react to boss kills
        if (this.isBoss && partySystem.members.length > 0) {
            partySystem.fireEventChat('bossKill', gameState.playerName);
        }
    }

    /** Physics/Animation (60fps) */
    update(dt, time, playerPos) {
        if (!this.alive) {
            this.deathTimer -= dt;
            this.group.position.y -= dt * 0.5;
            const opacity = Math.max(0, this.deathTimer / 2.0);
            if (this.bodyMesh) {
                this.bodyMesh.material.transparent = true;
                this.bodyMesh.material.opacity = opacity;
            }
            return this.deathTimer > 0;
        }
        
        this.animPhase += dt * 3;
        
        // Hit flash (reuse pre-allocated color objects)
        if (this.hitFlash > 0) {
            this.hitFlash -= dt;
            if (this.bodyMesh) {
                this.bodyMesh.material.emissive.copy(this._hitColor);
                this.bodyMesh.material.emissiveIntensity = this.hitFlash * 5;
            }
        } else if (this.bodyMesh && this.bodyMesh.material.emissiveIntensity !== 0) {
            this.bodyMesh.material.emissiveIntensity = 0;
        }
        
        // Animations
        if (this.bodyMesh) this.bodyMesh.position.y += Math.sin(this.animPhase) * 0.002;
        if (this.headMesh) this.headMesh.rotation.y = Math.sin(this.animPhase * 0.5) * 0.1;
        if (this.tailMesh) this.tailMesh.rotation.y = Math.sin(this.animPhase) * 0.2;
        
        if (this.legs && this.legs.length > 0) {
            for (let i = 0; i < this.legs.length; i++) {
                this.legs[i].rotation.x = Math.sin(this.animPhase + i * Math.PI / 2) * 0.15;
            }
        }
        
        // Wander movement (always processed for smooth interpolation)
        if (!this.inCombat && this._hasWanderTarget) {
            const dx = this._wanderTarget.x - this.x;
            const dz = this._wanderTarget.z - this.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > 0.04) {
                const dist = Math.sqrt(distSq);
                const speed = 0.8 * dt;
                this.x += (dx / dist) * speed;
                this.z += (dz / dist) * speed;
                this.group.position.x = this.x;
                this.group.position.z = this.z;
                // Rotating toward movement can be throttled but looks better smooth
                this.group.rotation.y = Math.atan2(dx, dz);
            } else {
                this._hasWanderTarget = false;
            }
        }

        // Floor Logic: Snap to terrain height
        if (this.world) {
            const floorY = this.world.getTerrainHeight(this.x, this.z);
            this.group.position.y = floorY;
        }

        return true;
    }

    /** AI/Combat Logic (LOGIC_TICK) */
    updateAI(playerPos) {
        if (!this.alive) return;

        if (this.inCombat && playerPos) {
            // Face player
            const dx = playerPos.x - this.x;
            const dz = playerPos.z - this.z;
            this.group.rotation.y = Math.atan2(dx, dz);

            // Attack player (or occasionally companion)
            // Note: Since logic tick is 15Hz, we adjust timers accordingly
            const logicDt = 1 / 15;
            this.attackTimer -= logicDt;
            if (this.attackTimer <= 0) {
                this.attackTimer = 1.5;
                // 20% chance to target companion if one is active and alive nearby
                if (companionSystem.activeCompanionName && companionSystem.alive && Math.random() < 0.20) {
                    const cdx = companionSystem._entityRef ? companionSystem._entityRef.x - this.x : 0;
                    const cdz = companionSystem._entityRef ? companionSystem._entityRef.z - this.z : 0;
                    if (cdx * cdx + cdz * cdz < 12 * 12) {
                        companionSystem.takeDamage(this.damage);
                    } else {
                        gameState.takeDamage(this.damage);
                    }
                } else {
                    gameState.takeDamage(this.damage);
                }
            }
        } else {
            // Decide to wander
            this.wanderTimer -= 1/15;
            if (this.wanderTimer <= 0) {
                this.wanderTimer = 3 + Math.random() * 5;
                const wanderAngle = Math.random() * Math.PI * 2;
                const wanderDist = 1 + Math.random() * 3;
                this._wanderTarget.x = this.baseX + Math.cos(wanderAngle) * wanderDist;
                this._wanderTarget.z = this.baseZ + Math.sin(wanderAngle) * wanderDist;
                this._hasWanderTarget = true;
            }
        }
    }

    getDistanceTo(x, z) {
        const dx = this.x - x;
        const dz = this.z - z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /** Squared distance — use for range comparisons to avoid sqrt */
    getDistSqTo(x, z) {
        const dx = this.x - x;
        const dz = this.z - z;
        return dx * dx + dz * dz;
    }

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
