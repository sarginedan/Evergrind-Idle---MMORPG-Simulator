// Combat Visual Effects - Damage numbers, particles, skill VFX for all 8 abilities
import * as THREE from 'three';

export class CombatEffects {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];
        this.damageNumbers = [];

        // ── Shared geometries (pooled to avoid GC) ──
        this._slashGeo = new THREE.TorusGeometry(0.8, 0.05, 4, 16, Math.PI * 0.8);
        this._sparkGeo = new THREE.SphereGeometry(0.04, 4, 4);
        this._ringGeo = new THREE.RingGeometry(0.1, 0.3, 16);
        this._levelUpSparkGeo = new THREE.SphereGeometry(0.06, 4, 4);

        // ── Skill-specific geometries ──
        // Skill 0: Aether Strike — sharp fast slash arc
        this._aetherSlashGeo = new THREE.TorusGeometry(1.0, 0.04, 4, 20, Math.PI * 0.6);

        // Skill 1: Whirlwind Slash — spinning ring
        this._whirlwindGeo = new THREE.TorusGeometry(1.5, 0.08, 4, 24, Math.PI * 2);
        this._whirlwindTrailGeo = new THREE.PlaneGeometry(0.6, 0.15);

        // Skill 2: Aegis Guard — shield dome
        this._aegisGeo = new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
        this._aegisHexGeo = new THREE.CircleGeometry(0.2, 6);
        this._aegisRingGeo = new THREE.RingGeometry(1.0, 1.15, 32);

        // Skill 3: War Cry — expanding shockwave ring
        this._warcryGeo = new THREE.RingGeometry(0.5, 0.7, 32);
        this._warcryPillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 6);

        // Skill 4: Rending Blades — twin slash arcs
        this._rendSlashGeo = new THREE.TorusGeometry(1.0, 0.035, 4, 16, Math.PI * 0.7);
        this._rendDripGeo = new THREE.SphereGeometry(0.035, 4, 4);

        // Skill 5: Dragon's Fury — fire cone burst
        this._fireGeo = new THREE.SphereGeometry(0.12, 6, 6);
        this._fireConeGeo = new THREE.ConeGeometry(0.8, 2.5, 8);
        this._fireRingGeo = new THREE.RingGeometry(0.3, 0.6, 16);

        // Skill 6: Void Rift — dark vortex
        this._voidRiftGeo = new THREE.TorusGeometry(1.0, 0.15, 6, 24, Math.PI * 2);
        this._voidSparkGeo = new THREE.SphereGeometry(0.06, 4, 4);
        this._voidCoreGeo = new THREE.SphereGeometry(0.3, 8, 8);
        this._voidTendrilGeo = new THREE.CylinderGeometry(0.02, 0.06, 1.5, 4);

        // Skill 7: Cataclysm — pillar of arcane devastation
        this._cataPillarGeo = new THREE.CylinderGeometry(0.3, 0.8, 5, 12);
        this._cataRingGeo = new THREE.RingGeometry(0.8, 1.2, 32);
        this._cataSparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
        this._cataOrbGeo = new THREE.SphereGeometry(0.5, 8, 8);
        this._cataGroundGeo = new THREE.RingGeometry(0.2, 2.0, 32);

        // Crit effect geometry
        this._critStarGeo = new THREE.ConeGeometry(0.15, 0.5, 3);

        // ═══════════════════════════════════════════════════════════
        // DAWNKEEPER (CLERIC) SKILL GEOMETRIES — Golden holy VFX
        // ═══════════════════════════════════════════════════════════
        
        // Dawn Strike — holy staff arc
        this._dawnSlashGeo = new THREE.TorusGeometry(0.9, 0.04, 4, 20, Math.PI * 0.7);
        
        // Holy Smite — beam pillar + impact ring
        this._smitePillarGeo = new THREE.CylinderGeometry(0.15, 0.4, 4, 8);
        this._smiteRingGeo = new THREE.RingGeometry(0.3, 0.6, 24);
        this._smiteSparkGeo = new THREE.SphereGeometry(0.05, 4, 4);
        
        // Divine Ward — golden dome shield
        this._wardDomeGeo = new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
        this._wardRuneGeo = new THREE.CircleGeometry(0.25, 8);
        this._wardRingGeo = new THREE.RingGeometry(1.0, 1.2, 32);
        
        // Benediction — ascending light motes
        this._beneOrbGeo = new THREE.SphereGeometry(0.08, 6, 6);
        this._beneRingGeo = new THREE.RingGeometry(0.4, 0.7, 24);
        this._beneRayGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.0, 4);
        
        // Radiant Flare — expanding sunburst
        this._flareGeo = new THREE.SphereGeometry(0.5, 12, 12);
        this._flareRayGeo = new THREE.PlaneGeometry(0.15, 1.8);
        this._flareRingGeo = new THREE.RingGeometry(0.5, 0.8, 24);
        
        // Solar Lance — piercing golden beam
        this._lanceGeo = new THREE.CylinderGeometry(0.05, 0.12, 3.5, 6);
        this._lanceHeadGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
        this._lanceTrailGeo = new THREE.PlaneGeometry(0.3, 3.0);
        
        // Sanctified Ground — consecrated ground ring + pillars
        this._consecGroundGeo = new THREE.RingGeometry(0.3, 2.2, 32);
        this._consecPillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
        this._consecRuneGeo = new THREE.CircleGeometry(0.15, 6);
        
        // Dawn Chorus — massive divine explosion (ultimate)
        this._chorusPillarGeo = new THREE.CylinderGeometry(0.4, 1.0, 6, 12);
        this._chorusRingGeo = new THREE.RingGeometry(1.0, 1.5, 32);
        this._chorusOrbGeo = new THREE.SphereGeometry(0.6, 10, 10);
        this._chorusRayGeo = new THREE.PlaneGeometry(0.2, 4.0);
        // Death effect geometries
        this._shardGeo = new THREE.TetrahedronGeometry(0.1);
        this._sporeGeo = new THREE.SphereGeometry(0.05, 4, 4);
        this._smokeGeo = new THREE.SphereGeometry(0.15, 5, 4);
    }

    // Performance: hard cap on total active effects to prevent VFX explosion at high game speed
    static MAX_EFFECTS = 80;

    _makeAdditiveMat(color, opacity = 0.9) {
        return new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
    }

    _makeDoubleSidedMat(color, opacity = 0.7) {
        return new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
    }

    /** Add effect with overflow protection — if at cap, remove oldest effect */
    _addEffect(fx) {
        if (fx.mesh) {
            fx.mesh.castShadow = false;
            fx.mesh.receiveShadow = false;
        }
        if (this.effects.length >= CombatEffects.MAX_EFFECTS) {
            // Remove oldest effect to make room
            const old = this.effects.shift();
            this.scene.remove(old.mesh);
            if (old.mesh.material) old.mesh.material.dispose();
        }
        this.effects.push(fx);
    }

    // ═══════════════════════════════════════════════════════════════
    // BASIC COMBAT EFFECTS
    // ═══════════════════════════════════════════════════════════════

    spawnSlashEffect(position, direction) {
        const arcMat = this._makeAdditiveMat(0xffdd44, 0.9);
        const arc = new THREE.Mesh(this._slashGeo, arcMat);
        arc.position.copy(position);
        arc.position.y += 1;
        arc.rotation.y = direction + Math.random() * 0.5 - 0.25;
        arc.rotation.x = Math.random() * 0.5 - 0.25;
        this.scene.add(arc);

        this._addEffect({
            mesh: arc, life: 0.4, maxLife: 0.4, type: 'slash',
        });

        this.spawnSparks(position, 5);
    }

    spawnSparks(position, count, color1 = 0xffdd44, color2 = 0xffaa22) {
        for (let i = 0; i < count; i++) {
            const sparkMat = this._makeAdditiveMat(Math.random() > 0.5 ? color1 : color2, 1);
            const spark = new THREE.Mesh(this._sparkGeo, sparkMat);
            spark.position.copy(position);
            spark.position.y += 0.8 + Math.random() * 0.5;

            this.scene.add(spark);
            this._addEffect({
                mesh: spark, life: 0.3 + Math.random() * 0.3, maxLife: 0.5, type: 'spark',
                vx: (Math.random() - 0.5) * 4,
                vy: 1 + Math.random() * 3,
                vz: (Math.random() - 0.5) * 4,
            });
        }
    }

    spawnHitEffect(position) {
        const ringMat = this._makeDoubleSidedMat(0xff6644, 0.8);
        const ring = new THREE.Mesh(this._ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.8;
        ring.lookAt(ring.position.x, ring.position.y + 1, ring.position.z);
        this.scene.add(ring);

        this._addEffect({
            mesh: ring, life: 0.3, maxLife: 0.3, type: 'ring',
        });

        this.spawnSparks(position, 3);
    }

    /** Crit hit visual — golden starburst */
    spawnCritEffect(position) {
        // Big golden flash ring
        const flashMat = this._makeDoubleSidedMat(0xffee44, 0.9);
        const flash = new THREE.Mesh(this._aegisRingGeo, flashMat);
        flash.position.copy(position);
        flash.position.y += 1.0;
        flash.rotation.x = Math.PI / 2;
        this.scene.add(flash);
        this._addEffect({
            mesh: flash, life: 0.4, maxLife: 0.4, type: 'crit_flash',
        });

        // Starburst sparks
        for (let i = 0; i < 8; i++) {
            const starMat = this._makeAdditiveMat(0xffcc00, 1);
            const star = new THREE.Mesh(this._critStarGeo, starMat);
            star.position.copy(position);
            star.position.y += 1.0;
            const angle = (i / 8) * Math.PI * 2;
            this.scene.add(star);
            this._addEffect({
                mesh: star, life: 0.5, maxLife: 0.5, type: 'crit_star',
                vx: Math.cos(angle) * 5,
                vy: 2 + Math.random() * 2,
                vz: Math.sin(angle) * 5,
                angle,
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SKILL EFFECTS — Unique VFX for each of the 8 abilities
    // ═══════════════════════════════════════════════════════════════

    spawnSkillEffect(position, skillIndex, targetPos = null, classId = 'warrior') {
        if (classId === 'cleric') {
            switch (skillIndex) {
                case 0: this._spawnDawnStrike(position); break;
                case 1: this._spawnHolySmite(position, targetPos); break;
                case 2: this._spawnDivineWard(position); break;
                case 3: this._spawnBenediction(position); break;
                case 4: this._spawnRadiantFlare(position); break;
                case 5: this._spawnSolarLance(position, targetPos); break;
                case 6: this._spawnSanctifiedGround(position, targetPos); break;
                case 7: this._spawnDawnChorus(position, targetPos); break;
            }
            return;
        }
        switch (skillIndex) {
            case 0: this._spawnAetherStrike(position); break;
            case 1: this._spawnWhirlwindSlash(position); break;
            case 2: this._spawnAegisGuard(position); break;
            case 3: this._spawnWarCry(position); break;
            case 4: this._spawnRendingBlades(position, targetPos); break;
            case 5: this._spawnDragonsFury(position, targetPos); break;
            case 6: this._spawnVoidRift(position, targetPos); break;
            case 7: this._spawnCataclysm(position, targetPos); break;
        }
    }

    // ── Skill 0: Aether Strike — Clean white-blue slash arc with aether sparks ──
    _spawnAetherStrike(position) {
        // Primary slash arc — white-blue aether energy
        const arcMat = this._makeAdditiveMat(0xaaddff, 0.95);
        const arc = new THREE.Mesh(this._aetherSlashGeo, arcMat);
        arc.position.copy(position);
        arc.position.y += 1.1;
        arc.rotation.y = Math.random() * Math.PI * 2;
        arc.rotation.x = -0.3 + Math.random() * 0.6;
        this.scene.add(arc);
        this._addEffect({
            mesh: arc, life: 0.35, maxLife: 0.35, type: 'aether_slash',
            rotSpeed: 3 + Math.random() * 2,
        });

        // Secondary smaller arc — slightly delayed feel
        const arc2Mat = this._makeAdditiveMat(0xddeeff, 0.7);
        const arc2 = new THREE.Mesh(this._slashGeo, arc2Mat);
        arc2.position.copy(position);
        arc2.position.y += 1.3;
        arc2.rotation.y = arc.rotation.y + 0.8;
        arc2.rotation.x = 0.2;
        this.scene.add(arc2);
        this._addEffect({
            mesh: arc2, life: 0.25, maxLife: 0.25, type: 'slash',
        });

        // White-blue sparks
        this.spawnSparks(position, 6, 0xaaddff, 0xeeffff);
    }

    // ── Skill 1: Whirlwind Slash — Spinning blue energy rings + sweeping trails ──
    _spawnWhirlwindSlash(position) {
        for (let i = 0; i < 3; i++) {
            const arcMat = this._makeAdditiveMat(0x44aaff, 0.7);
            const arc = new THREE.Mesh(this._whirlwindGeo, arcMat);
            arc.position.copy(position);
            arc.position.y += 0.3 + i * 0.5;
            arc.rotation.x = Math.PI / 2;
            this.scene.add(arc);

            this._addEffect({
                mesh: arc, life: 0.8, maxLife: 0.8, type: 'whirlwind',
                rotSpeed: 8 + i * 3,
            });
        }

        // Trailing blade streaks
        for (let i = 0; i < 8; i++) {
            const trailMat = this._makeAdditiveMat(0x66ccff, 0.6);
            const trail = new THREE.Mesh(this._whirlwindTrailGeo, trailMat);
            const angle = (i / 8) * Math.PI * 2;
            trail.position.set(
                position.x + Math.cos(angle) * 1.3,
                0.6 + Math.random() * 0.8,
                position.z + Math.sin(angle) * 1.3
            );
            trail.rotation.y = angle;
            trail.rotation.x = Math.PI / 2;
            this.scene.add(trail);
            this._addEffect({
                mesh: trail, life: 0.6, maxLife: 0.6, type: 'whirlwind_trail',
                angle, baseX: position.x, baseZ: position.z,
                radius: 1.3, rotSpeed: 10,
            });
        }

        // Blue sparks at periphery
        this.spawnSparks(position, 10, 0x44aaff, 0x88ddff);
    }

    // ── Skill 2: Aegis Guard — Golden dome shield with hex pattern ──
    _spawnAegisGuard(position) {
        // Main dome
        const domeMat = this._makeDoubleSidedMat(0x4488dd, 0.35);
        const dome = new THREE.Mesh(this._aegisGeo, domeMat);
        dome.position.copy(position);
        dome.position.y += 0.1;
        this.scene.add(dome);
        this._addEffect({
            mesh: dome, life: 1.5, maxLife: 1.5, type: 'aegis_dome',
        });

        // Hexagonal shield fragments orbiting
        for (let i = 0; i < 6; i++) {
            const hexMat = this._makeAdditiveMat(0x66aaee, 0.8);
            const hex = new THREE.Mesh(this._aegisHexGeo, hexMat);
            const angle = (i / 6) * Math.PI * 2;
            hex.position.set(
                position.x + Math.cos(angle) * 0.9,
                1.0 + Math.sin(angle * 2) * 0.3,
                position.z + Math.sin(angle) * 0.9
            );
            hex.rotation.x = Math.PI / 2 + Math.random() * 0.3;
            this.scene.add(hex);
            this._addEffect({
                mesh: hex, life: 1.5, maxLife: 1.5, type: 'aegis_hex',
                angle, baseX: position.x, baseZ: position.z,
                radius: 0.9, rotSpeed: 2, floatPhase: Math.random() * Math.PI * 2,
            });
        }

        // Ground ring pulse
        const ringMat = this._makeDoubleSidedMat(0x4488dd, 0.6);
        const ring = new THREE.Mesh(this._aegisRingGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.05;
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 1.0, maxLife: 1.0, type: 'aegis_ring',
        });

        this.spawnSparks(position, 6, 0x4488dd, 0x88ccff);
    }

    // ── Skill 3: War Cry — Red-orange shockwave + energy pillars ──
    _spawnWarCry(position) {
        // Primary expanding shockwave
        const cryMat = this._makeDoubleSidedMat(0xff4444, 0.6);
        const cry = new THREE.Mesh(this._warcryGeo, cryMat);
        cry.position.copy(position);
        cry.position.y += 0.3;
        cry.rotation.x = Math.PI / 2;
        this.scene.add(cry);
        this._addEffect({
            mesh: cry, life: 1.0, maxLife: 1.0, type: 'warcry',
        });

        // Secondary faster shockwave
        const cry2Mat = this._makeDoubleSidedMat(0xffaa44, 0.4);
        const cry2 = new THREE.Mesh(this._warcryGeo, cry2Mat);
        cry2.position.copy(position);
        cry2.position.y += 0.5;
        cry2.rotation.x = Math.PI / 2;
        this.scene.add(cry2);
        this._addEffect({
            mesh: cry2, life: 0.7, maxLife: 0.7, type: 'warcry_fast',
        });

        // Energy pillars shooting up
        for (let i = 0; i < 4; i++) {
            const pillarMat = this._makeAdditiveMat(0xff6622, 0.7);
            const pillar = new THREE.Mesh(this._warcryPillarGeo, pillarMat);
            const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
            pillar.position.set(
                position.x + Math.cos(angle) * 0.8,
                0,
                position.z + Math.sin(angle) * 0.8
            );
            this.scene.add(pillar);
            this._addEffect({
                mesh: pillar, life: 0.8, maxLife: 0.8, type: 'warcry_pillar',
                vy: 4 + Math.random() * 2,
            });
        }

        // Orange-red sparks
        this.spawnSparks(position, 12, 0xff4444, 0xffaa22);
    }

    // ── Skill 4: Rending Blades — Twin crimson slash arcs + blood drips ──
    _spawnRendingBlades(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x;
        const tz = targetPos ? targetPos.z : position.z;
        const dir = Math.atan2(tx - position.x, tz - position.z);

        // Twin slash arcs — scissor pattern
        for (let s = 0; s < 2; s++) {
            const slashMat = this._makeAdditiveMat(s === 0 ? 0xff2222 : 0xcc0000, 0.9);
            const slash = new THREE.Mesh(this._rendSlashGeo, slashMat);
            const midX = (position.x + tx) * 0.5;
            const midZ = (position.z + tz) * 0.5;
            slash.position.set(midX, 1.0 + s * 0.3, midZ);
            slash.rotation.y = dir + (s === 0 ? 0.4 : -0.4);
            slash.rotation.z = s === 0 ? 0.3 : -0.3;
            this.scene.add(slash);
            this._addEffect({
                mesh: slash, life: 0.4, maxLife: 0.4, type: 'rend_slash',
                rotSpeed: s === 0 ? 6 : -6,
            });
        }

        // Blood drip particles falling
        for (let i = 0; i < 10; i++) {
            const dripMat = this._makeAdditiveMat(0xcc1111, 0.9);
            const drip = new THREE.Mesh(this._rendDripGeo, dripMat);
            drip.position.set(
                tx + (Math.random() - 0.5) * 1.5,
                1.0 + Math.random() * 1.0,
                tz + (Math.random() - 0.5) * 1.5
            );
            this.scene.add(drip);
            this._addEffect({
                mesh: drip, life: 0.6 + Math.random() * 0.4, maxLife: 1.0, type: 'rend_drip',
                vx: (Math.random() - 0.5) * 1.5,
                vy: Math.random() * 1.0,
                vz: (Math.random() - 0.5) * 1.5,
            });
        }

        this.spawnSparks({ x: tx, y: 0, z: tz }, 8, 0xff3333, 0xcc1111);
    }

    // ── Skill 5: Dragon's Fury — Fire cone burst + ember shower ──
    _spawnDragonsFury(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x + 2;
        const tz = targetPos ? targetPos.z : position.z;
        const dir = Math.atan2(tx - position.x, tz - position.z);

        // Fire cone — directional blast
        const coneMat = this._makeAdditiveMat(0xff6600, 0.6);
        const cone = new THREE.Mesh(this._fireConeGeo, coneMat);
        const midX = (position.x + tx) * 0.5;
        const midZ = (position.z + tz) * 0.5;
        cone.position.set(midX, 0.8, midZ);
        cone.rotation.z = Math.PI / 2;
        cone.rotation.y = -dir;
        this.scene.add(cone);
        this._addEffect({
            mesh: cone, life: 0.6, maxLife: 0.6, type: 'fire_cone',
        });

        // Fire ring at impact
        const ringMat = this._makeDoubleSidedMat(0xff8800, 0.7);
        const ring = new THREE.Mesh(this._fireRingGeo, ringMat);
        ring.position.set(tx, 0.1, tz);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 0.8, maxLife: 0.8, type: 'fire_ring',
        });

        // Fire orbs / embers streaming
        for (let i = 0; i < 16; i++) {
            const t = i / 16;
            const fireMat = this._makeAdditiveMat(
                [0xff4400, 0xff6600, 0xffaa00, 0xffcc22][Math.floor(Math.random() * 4)], 0.9);
            const fire = new THREE.Mesh(this._fireGeo, fireMat);
            // Distribute along the cone path with spread
            const lerpX = position.x + (tx - position.x) * (t * 0.8 + 0.2);
            const lerpZ = position.z + (tz - position.z) * (t * 0.8 + 0.2);
            fire.position.set(
                lerpX + (Math.random() - 0.5) * t * 2,
                0.5 + Math.random() * 1.0,
                lerpZ + (Math.random() - 0.5) * t * 2
            );
            this.scene.add(fire);
            this._addEffect({
                mesh: fire, life: 0.4 + Math.random() * 0.5, maxLife: 0.9, type: 'fire_ember',
                vx: (Math.random() - 0.5) * 3,
                vy: 1 + Math.random() * 4,
                vz: (Math.random() - 0.5) * 3,
            });
        }

        // Bright flash at origin
        this.spawnSparks(position, 6, 0xff8800, 0xffcc44);
    }

    // ── Skill 6: Void Rift — Purple-black vortex with tendrils ──
    _spawnVoidRift(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x;
        const tz = targetPos ? targetPos.z : position.z;
        const cx = (position.x + tx) * 0.5;
        const cz = (position.z + tz) * 0.5;

        // Void core — dark sphere
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x220044,
            transparent: true,
            opacity: 0.8,
        });
        const core = new THREE.Mesh(this._voidCoreGeo, coreMat);
        core.position.set(cx, 1.0, cz);
        this.scene.add(core);
        this._addEffect({
            mesh: core, life: 1.2, maxLife: 1.2, type: 'void_core',
        });

        // Spinning rift ring
        const riftMat = this._makeAdditiveMat(0xaa44ff, 0.7);
        const rift = new THREE.Mesh(this._voidRiftGeo, riftMat);
        rift.position.set(cx, 1.0, cz);
        rift.rotation.x = Math.PI / 2;
        this.scene.add(rift);
        this._addEffect({
            mesh: rift, life: 1.2, maxLife: 1.2, type: 'void_ring',
            rotSpeed: 5,
        });

        // Secondary rift ring — perpendicular
        const rift2Mat = this._makeAdditiveMat(0x7722cc, 0.5);
        const rift2 = new THREE.Mesh(this._voidRiftGeo, rift2Mat);
        rift2.position.set(cx, 1.0, cz);
        rift2.rotation.y = Math.PI / 2;
        this.scene.add(rift2);
        this._addEffect({
            mesh: rift2, life: 1.0, maxLife: 1.0, type: 'void_ring',
            rotSpeed: -3,
        });

        // Tendrils reaching outward
        for (let i = 0; i < 6; i++) {
            const tenMat = this._makeAdditiveMat(0x8833cc, 0.6);
            const ten = new THREE.Mesh(this._voidTendrilGeo, tenMat);
            const angle = (i / 6) * Math.PI * 2;
            ten.position.set(cx, 0.8, cz);
            ten.rotation.z = Math.PI / 2;
            ten.rotation.y = angle;
            this.scene.add(ten);
            this._addEffect({
                mesh: ten, life: 1.0, maxLife: 1.0, type: 'void_tendril',
                angle, baseX: cx, baseZ: cz,
            });
        }

        // Purple sparks being pulled inward
        for (let i = 0; i < 12; i++) {
            const sparkMat = this._makeAdditiveMat(
                Math.random() > 0.5 ? 0xbb55ff : 0x7722cc, 1);
            const spark = new THREE.Mesh(this._voidSparkGeo, sparkMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 1.5 + Math.random() * 1.5;
            spark.position.set(
                cx + Math.cos(angle) * dist,
                0.5 + Math.random() * 1.5,
                cz + Math.sin(angle) * dist
            );
            this.scene.add(spark);
            this._addEffect({
                mesh: spark, life: 0.8 + Math.random() * 0.4, maxLife: 1.2, type: 'void_inward',
                centerX: cx, centerZ: cz, angle,
            });
        }
    }

    // ── Skill 7: Cataclysm — Arcane pillar of devastation (ultimate) ──
    _spawnCataclysm(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x;
        const tz = targetPos ? targetPos.z : position.z;

        // Main arcane pillar — massive column of light
        const pillarMat = this._makeAdditiveMat(0xffdd44, 0.6);
        const pillar = new THREE.Mesh(this._cataPillarGeo, pillarMat);
        pillar.position.set(tx, 2.5, tz);
        this.scene.add(pillar);
        this._addEffect({
            mesh: pillar, life: 1.5, maxLife: 1.5, type: 'cata_pillar',
        });

        // Inner pillar — brighter
        const innerMat = this._makeAdditiveMat(0xffffff, 0.4);
        const inner = new THREE.Mesh(this._cataPillarGeo, innerMat);
        inner.position.set(tx, 2.5, tz);
        inner.scale.set(0.5, 1.2, 0.5);
        this.scene.add(inner);
        this._addEffect({
            mesh: inner, life: 1.3, maxLife: 1.3, type: 'cata_pillar_inner',
        });

        // Energy orb at impact center
        const orbMat = this._makeAdditiveMat(0xffee88, 0.9);
        const orb = new THREE.Mesh(this._cataOrbGeo, orbMat);
        orb.position.set(tx, 1.0, tz);
        this.scene.add(orb);
        this._addEffect({
            mesh: orb, life: 1.0, maxLife: 1.0, type: 'cata_orb',
        });

        // Ground burn ring
        const groundMat = this._makeDoubleSidedMat(0xffaa22, 0.5);
        const ground = new THREE.Mesh(this._cataGroundGeo, groundMat);
        ground.position.set(tx, 0.05, tz);
        ground.rotation.x = Math.PI / 2;
        this.scene.add(ground);
        this._addEffect({
            mesh: ground, life: 2.0, maxLife: 2.0, type: 'cata_ground',
        });

        // Expanding shockwave rings (3 waves)
        for (let w = 0; w < 3; w++) {
            const ringMat = this._makeDoubleSidedMat(
                [0xffdd44, 0xffaa22, 0xff8800][w], 0.6);
            const ring = new THREE.Mesh(this._cataRingGeo, ringMat);
            ring.position.set(tx, 0.3 + w * 0.5, tz);
            ring.rotation.x = Math.PI / 2;
            this.scene.add(ring);
            this._addEffect({
                mesh: ring, life: 1.0 + w * 0.2, maxLife: 1.0 + w * 0.2,
                type: 'cata_ring', delay: w * 0.15,
            });
        }

        // Massive spark shower
        for (let i = 0; i < 24; i++) {
            const sMat = this._makeAdditiveMat(
                [0xffdd44, 0xffaa22, 0xffffff, 0xffee88][i % 4], 1);
            const s = new THREE.Mesh(this._cataSparkGeo, sMat);
            s.position.set(tx, 0.5 + Math.random() * 0.5, tz);
            this.scene.add(s);
            const angle = (i / 24) * Math.PI * 2;
            this._addEffect({
                mesh: s, life: 0.8 + Math.random() * 0.7, maxLife: 1.5, type: 'cata_spark',
                vx: Math.cos(angle) * (3 + Math.random() * 4),
                vy: 3 + Math.random() * 6,
                vz: Math.sin(angle) * (3 + Math.random() * 4),
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DAWNKEEPER (CLERIC) SKILL EFFECTS — Golden / Radiant holy VFX
    // ═══════════════════════════════════════════════════════════════

    // ── Cleric Skill 0: Dawn Strike — Golden staff arc + holy sparks ──
    _spawnDawnStrike(position) {
        // Primary holy slash arc — warm gold
        const arcMat = this._makeAdditiveMat(0xffdd66, 0.95);
        const arc = new THREE.Mesh(this._dawnSlashGeo, arcMat);
        arc.position.copy(position);
        arc.position.y += 1.1;
        arc.rotation.y = Math.random() * Math.PI * 2;
        arc.rotation.x = -0.2 + Math.random() * 0.4;
        this.scene.add(arc);
        this._addEffect({
            mesh: arc, life: 0.35, maxLife: 0.35, type: 'aether_slash',
            rotSpeed: 3 + Math.random() * 2,
        });

        // Secondary white-gold arc
        const arc2Mat = this._makeAdditiveMat(0xffeedd, 0.7);
        const arc2 = new THREE.Mesh(this._slashGeo, arc2Mat);
        arc2.position.copy(position);
        arc2.position.y += 1.3;
        arc2.rotation.y = arc.rotation.y + 0.9;
        arc2.rotation.x = 0.15;
        this.scene.add(arc2);
        this._addEffect({
            mesh: arc2, life: 0.25, maxLife: 0.25, type: 'slash',
        });

        // Golden holy sparks
        this.spawnSparks(position, 7, 0xffdd66, 0xffeebb);
    }

    // ── Cleric Skill 1: Holy Smite — Golden beam from above + impact ring ──
    _spawnHolySmite(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x;
        const tz = targetPos ? targetPos.z : position.z;

        // Divine beam pillar descending from above
        const pillarMat = this._makeAdditiveMat(0xffdd44, 0.7);
        const pillar = new THREE.Mesh(this._smitePillarGeo, pillarMat);
        pillar.position.set(tx, 3.0, tz);
        this.scene.add(pillar);
        this._addEffect({
            mesh: pillar, life: 0.6, maxLife: 0.6, type: 'smite_pillar',
        });

        // Inner bright core
        const innerMat = this._makeAdditiveMat(0xffffff, 0.5);
        const inner = new THREE.Mesh(this._smitePillarGeo, innerMat);
        inner.position.set(tx, 3.0, tz);
        inner.scale.set(0.4, 1.1, 0.4);
        this.scene.add(inner);
        this._addEffect({
            mesh: inner, life: 0.5, maxLife: 0.5, type: 'smite_pillar',
        });

        // Impact ring at ground
        const ringMat = this._makeDoubleSidedMat(0xffcc22, 0.7);
        const ring = new THREE.Mesh(this._smiteRingGeo, ringMat);
        ring.position.set(tx, 0.1, tz);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 0.8, maxLife: 0.8, type: 'smite_ring',
        });

        // Golden impact sparks
        for (let i = 0; i < 10; i++) {
            const sMat = this._makeAdditiveMat(Math.random() > 0.5 ? 0xffdd44 : 0xffeedd, 1);
            const s = new THREE.Mesh(this._smiteSparkGeo, sMat);
            s.position.set(tx, 0.3, tz);
            this.scene.add(s);
            const angle = (i / 10) * Math.PI * 2;
            this._addEffect({
                mesh: s, life: 0.5 + Math.random() * 0.3, maxLife: 0.8, type: 'spark',
                vx: Math.cos(angle) * (2 + Math.random() * 3),
                vy: 2 + Math.random() * 4,
                vz: Math.sin(angle) * (2 + Math.random() * 3),
            });
        }
    }

    // ── Cleric Skill 2: Divine Ward — Golden protective dome with rune fragments ──
    _spawnDivineWard(position) {
        // Main golden dome
        const domeMat = this._makeDoubleSidedMat(0xffcc44, 0.3);
        const dome = new THREE.Mesh(this._wardDomeGeo, domeMat);
        dome.position.copy(position);
        dome.position.y += 0.1;
        this.scene.add(dome);
        this._addEffect({
            mesh: dome, life: 1.5, maxLife: 1.5, type: 'aegis_dome',
        });

        // Orbiting holy rune fragments
        for (let i = 0; i < 6; i++) {
            const runeMat = this._makeAdditiveMat(0xffdd66, 0.8);
            const rune = new THREE.Mesh(this._wardRuneGeo, runeMat);
            const angle = (i / 6) * Math.PI * 2;
            rune.position.set(
                position.x + Math.cos(angle) * 1.0,
                1.0 + Math.sin(angle * 2) * 0.3,
                position.z + Math.sin(angle) * 1.0
            );
            rune.rotation.x = Math.PI / 2 + Math.random() * 0.3;
            this.scene.add(rune);
            this._addEffect({
                mesh: rune, life: 1.5, maxLife: 1.5, type: 'aegis_hex',
                angle, baseX: position.x, baseZ: position.z,
                radius: 1.0, rotSpeed: 2.5, floatPhase: Math.random() * Math.PI * 2,
            });
        }

        // Ground ring pulse
        const ringMat = this._makeDoubleSidedMat(0xffaa22, 0.6);
        const ring = new THREE.Mesh(this._wardRingGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.05;
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 1.0, maxLife: 1.0, type: 'aegis_ring',
        });

        this.spawnSparks(position, 6, 0xffcc44, 0xffeedd);
    }

    // ── Cleric Skill 3: Benediction — Ascending golden light motes + blessing rays ──
    _spawnBenediction(position) {
        // Ascending light motes spiraling upward
        for (let i = 0; i < 16; i++) {
            const orbMat = this._makeAdditiveMat(
                [0xffdd66, 0xffeedd, 0xffcc44, 0xffffff][i % 4], 0.9);
            const orb = new THREE.Mesh(this._beneOrbGeo, orbMat);
            const angle = (i / 16) * Math.PI * 2;
            orb.position.set(
                position.x + Math.cos(angle) * 0.6,
                0.3 + Math.random() * 0.3,
                position.z + Math.sin(angle) * 0.6
            );
            this.scene.add(orb);
            this._addEffect({
                mesh: orb, life: 1.2 + Math.random() * 0.5, maxLife: 1.7, type: 'bene_mote',
                angle, baseX: position.x, baseZ: position.z,
                radius: 0.6 + Math.random() * 0.5,
                vy: 1.5 + Math.random() * 2,
                rotSpeed: 3 + Math.random() * 2,
            });
        }

        // Blessing ring expanding
        const ringMat = this._makeDoubleSidedMat(0xffdd44, 0.6);
        const ring = new THREE.Mesh(this._beneRingGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.5;
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 0.8, maxLife: 0.8, type: 'warcry',
        });

        // Vertical light rays
        for (let i = 0; i < 4; i++) {
            const rayMat = this._makeAdditiveMat(0xffdd66, 0.4);
            const ray = new THREE.Mesh(this._beneRayGeo, rayMat);
            const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
            ray.position.set(
                position.x + Math.cos(angle) * 0.5,
                0.5,
                position.z + Math.sin(angle) * 0.5
            );
            this.scene.add(ray);
            this._addEffect({
                mesh: ray, life: 1.0, maxLife: 1.0, type: 'warcry_pillar',
                vy: 2 + Math.random() * 1.5,
            });
        }

        this.spawnSparks(position, 8, 0xffdd66, 0xffeedd);
    }

    // ── Cleric Skill 4: Radiant Flare — Expanding sunburst with rays ──
    _spawnRadiantFlare(position) {
        // Central sun sphere flash
        const flareMat = this._makeAdditiveMat(0xffdd44, 0.8);
        const flare = new THREE.Mesh(this._flareGeo, flareMat);
        flare.position.copy(position);
        flare.position.y += 1.0;
        this.scene.add(flare);
        this._addEffect({
            mesh: flare, life: 0.6, maxLife: 0.6, type: 'flare_core',
        });

        // Radiating sun rays
        for (let i = 0; i < 8; i++) {
            const rayMat = this._makeDoubleSidedMat(0xffcc22, 0.7);
            const ray = new THREE.Mesh(this._flareRayGeo, rayMat);
            const angle = (i / 8) * Math.PI * 2;
            ray.position.copy(position);
            ray.position.y += 1.0;
            ray.rotation.z = angle;
            this.scene.add(ray);
            this._addEffect({
                mesh: ray, life: 0.5, maxLife: 0.5, type: 'flare_ray',
                angle,
            });
        }

        // Expanding ring
        const ringMat = this._makeDoubleSidedMat(0xffaa22, 0.6);
        const ring = new THREE.Mesh(this._flareRingGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 1.0;
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 0.7, maxLife: 0.7, type: 'fire_ring',
        });

        // Burst sparks
        this.spawnSparks(position, 12, 0xffdd44, 0xffaa22);
    }

    // ── Cleric Skill 5: Solar Lance — Piercing golden beam with trail ──
    _spawnSolarLance(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x + 2;
        const tz = targetPos ? targetPos.z : position.z;
        const dir = Math.atan2(tx - position.x, tz - position.z);
        const midX = (position.x + tx) * 0.5;
        const midZ = (position.z + tz) * 0.5;

        // Lance beam body
        const lanceMat = this._makeAdditiveMat(0xffcc22, 0.8);
        const lance = new THREE.Mesh(this._lanceGeo, lanceMat);
        lance.position.set(midX, 1.0, midZ);
        lance.rotation.z = Math.PI / 2;
        lance.rotation.y = -dir;
        this.scene.add(lance);
        this._addEffect({
            mesh: lance, life: 0.5, maxLife: 0.5, type: 'lance_beam',
        });

        // Lance head — bright point
        const headMat = this._makeAdditiveMat(0xffffff, 0.9);
        const head = new THREE.Mesh(this._lanceHeadGeo, headMat);
        head.position.set(tx, 1.0, tz);
        head.rotation.z = Math.PI / 2;
        head.rotation.y = -dir;
        this.scene.add(head);
        this._addEffect({
            mesh: head, life: 0.4, maxLife: 0.4, type: 'lance_beam',
        });

        // Energy trail
        const trailMat = this._makeDoubleSidedMat(0xffdd66, 0.5);
        const trail = new THREE.Mesh(this._lanceTrailGeo, trailMat);
        trail.position.set(midX, 1.0, midZ);
        trail.rotation.y = -dir + Math.PI / 2;
        this.scene.add(trail);
        this._addEffect({
            mesh: trail, life: 0.4, maxLife: 0.4, type: 'slash',
        });

        // Impact burst
        for (let i = 0; i < 8; i++) {
            const sMat = this._makeAdditiveMat(0xffdd44, 1);
            const s = new THREE.Mesh(this._sparkGeo, sMat);
            s.position.set(tx, 1.0, tz);
            const angle = (i / 8) * Math.PI * 2;
            this.scene.add(s);
            this._addEffect({
                mesh: s, life: 0.4 + Math.random() * 0.3, maxLife: 0.7, type: 'spark',
                vx: Math.cos(angle) * (3 + Math.random() * 3),
                vy: 1 + Math.random() * 3,
                vz: Math.sin(angle) * (3 + Math.random() * 3),
            });
        }
    }

    // ── Cleric Skill 6: Sanctified Ground — Consecrated AoE ring with pillars ──
    _spawnSanctifiedGround(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x;
        const tz = targetPos ? targetPos.z : position.z;

        // Ground consecration ring
        const groundMat = this._makeDoubleSidedMat(0xffcc22, 0.5);
        const ground = new THREE.Mesh(this._consecGroundGeo, groundMat);
        ground.position.set(tx, 0.05, tz);
        ground.rotation.x = Math.PI / 2;
        this.scene.add(ground);
        this._addEffect({
            mesh: ground, life: 2.0, maxLife: 2.0, type: 'cata_ground',
        });

        // Holy light pillars rising
        for (let i = 0; i < 6; i++) {
            const pillarMat = this._makeAdditiveMat(0xffdd66, 0.6);
            const pillar = new THREE.Mesh(this._consecPillarGeo, pillarMat);
            const angle = (i / 6) * Math.PI * 2;
            pillar.position.set(
                tx + Math.cos(angle) * 1.5,
                0,
                tz + Math.sin(angle) * 1.5
            );
            this.scene.add(pillar);
            this._addEffect({
                mesh: pillar, life: 1.2, maxLife: 1.2, type: 'warcry_pillar',
                vy: 2 + Math.random() * 1.5,
            });
        }

        // Rune fragments on ground
        for (let i = 0; i < 4; i++) {
            const runeMat = this._makeDoubleSidedMat(0xffaa22, 0.7);
            const rune = new THREE.Mesh(this._consecRuneGeo, runeMat);
            const angle = (i / 4) * Math.PI * 2 + 0.4;
            rune.position.set(
                tx + Math.cos(angle) * 1.2,
                0.08,
                tz + Math.sin(angle) * 1.2
            );
            rune.rotation.x = Math.PI / 2;
            this.scene.add(rune);
            this._addEffect({
                mesh: rune, life: 1.5, maxLife: 1.5, type: 'consec_rune',
                angle, baseX: tx, baseZ: tz,
                floatPhase: Math.random() * Math.PI * 2,
            });
        }

        // Expanding pulse rings
        for (let w = 0; w < 2; w++) {
            const ringMat = this._makeDoubleSidedMat(0xffdd44, 0.5);
            const ring = new THREE.Mesh(this._smiteRingGeo, ringMat);
            ring.position.set(tx, 0.1 + w * 0.3, tz);
            ring.rotation.x = Math.PI / 2;
            this.scene.add(ring);
            this._addEffect({
                mesh: ring, life: 1.0 + w * 0.2, maxLife: 1.0 + w * 0.2,
                type: 'cata_ring', delay: w * 0.2,
            });
        }

        this.spawnSparks({ x: tx, y: 0, z: tz }, 10, 0xffcc44, 0xffeedd);
    }

    // ── Cleric Skill 7: Dawn Chorus — Massive divine pillar of radiant devastation (ultimate) ──
    _spawnDawnChorus(position, targetPos) {
        const tx = targetPos ? targetPos.x : position.x;
        const tz = targetPos ? targetPos.z : position.z;

        // Main radiant pillar — massive column of golden light
        const pillarMat = this._makeAdditiveMat(0xffdd44, 0.7);
        const pillar = new THREE.Mesh(this._chorusPillarGeo, pillarMat);
        pillar.position.set(tx, 3.0, tz);
        this.scene.add(pillar);
        this._addEffect({
            mesh: pillar, life: 1.5, maxLife: 1.5, type: 'cata_pillar',
        });

        // Inner white-hot core
        const innerMat = this._makeAdditiveMat(0xffffff, 0.5);
        const inner = new THREE.Mesh(this._chorusPillarGeo, innerMat);
        inner.position.set(tx, 3.0, tz);
        inner.scale.set(0.5, 1.2, 0.5);
        this.scene.add(inner);
        this._addEffect({
            mesh: inner, life: 1.3, maxLife: 1.3, type: 'cata_pillar_inner',
        });

        // Central sun orb
        const orbMat = this._makeAdditiveMat(0xffee88, 0.9);
        const orb = new THREE.Mesh(this._chorusOrbGeo, orbMat);
        orb.position.set(tx, 1.5, tz);
        this.scene.add(orb);
        this._addEffect({
            mesh: orb, life: 1.0, maxLife: 1.0, type: 'cata_orb',
        });

        // Radiating sun rays from center
        for (let i = 0; i < 10; i++) {
            const rayMat = this._makeDoubleSidedMat(0xffcc22, 0.6);
            const ray = new THREE.Mesh(this._chorusRayGeo, rayMat);
            const angle = (i / 10) * Math.PI * 2;
            ray.position.set(tx, 1.5, tz);
            ray.rotation.z = angle;
            this.scene.add(ray);
            this._addEffect({
                mesh: ray, life: 0.7, maxLife: 0.7, type: 'flare_ray',
                angle,
            });
        }

        // Ground consecration
        const groundMat = this._makeDoubleSidedMat(0xffaa22, 0.5);
        const ground = new THREE.Mesh(this._cataGroundGeo, groundMat);
        ground.position.set(tx, 0.05, tz);
        ground.rotation.x = Math.PI / 2;
        this.scene.add(ground);
        this._addEffect({
            mesh: ground, life: 2.0, maxLife: 2.0, type: 'cata_ground',
        });

        // Expanding shockwave rings (3 waves)
        for (let w = 0; w < 3; w++) {
            const ringMat = this._makeDoubleSidedMat(
                [0xffdd44, 0xffcc22, 0xffaa00][w], 0.6);
            const ring = new THREE.Mesh(this._chorusRingGeo, ringMat);
            ring.position.set(tx, 0.3 + w * 0.5, tz);
            ring.rotation.x = Math.PI / 2;
            this.scene.add(ring);
            this._addEffect({
                mesh: ring, life: 1.0 + w * 0.2, maxLife: 1.0 + w * 0.2,
                type: 'cata_ring', delay: w * 0.15,
            });
        }

        // Massive golden spark shower
        for (let i = 0; i < 24; i++) {
            const sMat = this._makeAdditiveMat(
                [0xffdd44, 0xffcc22, 0xffffff, 0xffee88][i % 4], 1);
            const s = new THREE.Mesh(this._chorusSparkGeo, sMat);
            s.position.set(tx, 0.5 + Math.random() * 0.5, tz);
            this.scene.add(s);
            const angle = (i / 24) * Math.PI * 2;
            this._addEffect({
                mesh: s, life: 0.8 + Math.random() * 0.7, maxLife: 1.5, type: 'cata_spark',
                vx: Math.cos(angle) * (3 + Math.random() * 4),
                vy: 3 + Math.random() * 6,
                vz: Math.sin(angle) * (3 + Math.random() * 4),
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LEVEL UP & ACHIEVEMENT EFFECTS
    // ═══════════════════════════════════════════════════════════════

    spawnLevelUpEffect(position) {
        for (let i = 0; i < 20; i++) {
            const sparkMat = this._makeAdditiveMat(0xffdd00, 1);
            const spark = new THREE.Mesh(this._levelUpSparkGeo, sparkMat);
            const angle = (i / 20) * Math.PI * 2;
            spark.position.set(
                position.x + Math.cos(angle) * 0.5,
                position.y,
                position.z + Math.sin(angle) * 0.5
            );
            this.scene.add(spark);
            this._addEffect({
                mesh: spark, life: 2.0, maxLife: 2.0, type: 'levelup',
                angle, vy: 2 + Math.random() * 2,
                baseX: position.x, baseZ: position.z,
            });
        }
    }

    spawnAchievementEffect(position) {
        // Massive golden sparkle burst
        for (let i = 0; i < 40; i++) {
            const sparkMat = this._makeAdditiveMat(i % 2 === 0 ? 0xffdd44 : 0xffffff, 1);
            const spark = new THREE.Mesh(this._sparkGeo, sparkMat);
            const angle = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 4 + Math.random() * 6;
            
            spark.position.set(position.x, position.y + 1.0, position.z);
            this.scene.add(spark);
            
            this._addEffect({
                mesh: spark, life: 1.0 + Math.random() * 0.5, maxLife: 1.5, type: 'achievement_spark',
                vx: Math.sin(phi) * Math.cos(angle) * speed,
                vy: Math.cos(phi) * speed + 2,
                vz: Math.sin(phi) * Math.sin(angle) * speed,
            });
        }
        
        // Expansion ring
        const ringMat = this._makeDoubleSidedMat(0xffcc00, 0.8);
        const ring = new THREE.Mesh(this._aegisRingGeo, ringMat);
        ring.position.set(position.x, position.y + 0.1, position.z);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        this._addEffect({
            mesh: ring, life: 0.8, maxLife: 0.8, type: 'ring',
        });
    }

    // ── Mob-Specific Death VFX ──
    spawnDeathVFX(position, mobType) {
        const type = mobType.type;
        const color = mobType.color || 0xffffff;
        const pos = { x: position.x, y: position.y + 0.5, z: position.z };

        if (type === 'elemental' || type === 'xenotitan') {
            // Crystalline Shards
            this._spawnShardBurst(pos, color, 12);
        } else if (type === 'plant' || type === 'xenoswarm') {
            // Spore Cloud
            this._spawnSporeCloud(pos, color, 15);
        } else if (type === 'dragon' || type === 'demon') {
            // Fire & Embers
            this._spawnFireBurst(pos, 0xff6600, 15);
        } else if (type === 'undead' || type === 'xenophantom' || type === 'jellyfish') {
            // Void Wisps
            this._spawnVoidWisps(pos, color, 10);
        } else {
            // Generic Organic / Blood
            this._spawnOrganicBurst(pos, color, 10);
        }
    }

    _spawnShardBurst(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const mat = this._makeAdditiveMat(color, 0.9);
            const shard = new THREE.Mesh(this._shardGeo, mat);
            shard.position.set(pos.x, pos.y, pos.z);
            shard.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            this.scene.add(shard);
            this._addEffect({
                mesh: shard, life: 0.6 + Math.random() * 0.4, maxLife: 1.0, type: 'spark',
                vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 4, vz: (Math.random() - 0.5) * 6,
            });
        }
    }

    _spawnSporeCloud(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const mat = this._makeAdditiveMat(color, 0.6);
            const spore = new THREE.Mesh(this._sporeGeo, mat);
            spore.position.set(pos.x, pos.y, pos.z);
            this.scene.add(spore);
            this._addEffect({
                mesh: spore, life: 1.0 + Math.random() * 1.0, maxLife: 2.0, type: 'smoke',
                vx: (Math.random() - 0.5) * 2, vy: 0.5 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2,
            });
        }
    }

    _spawnFireBurst(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const mat = this._makeAdditiveMat(Math.random() > 0.5 ? 0xff4400 : 0xffaa00, 1);
            const ember = new THREE.Mesh(this._sparkGeo, mat);
            ember.position.set(pos.x, pos.y, pos.z);
            this.scene.add(ember);
            this._addEffect({
                mesh: ember, life: 0.5 + Math.random() * 0.5, maxLife: 1.0, type: 'spark',
                vx: (Math.random() - 0.5) * 5, vy: 3 + Math.random() * 5, vz: (Math.random() - 0.5) * 5,
            });
        }
        // Smoke cloud
        this._spawnSmoke(pos, 0x333333, 5);
    }

    _spawnVoidWisps(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const mat = this._makeAdditiveMat(color, 0.7);
            const wisp = new THREE.Mesh(this._sparkGeo, mat);
            wisp.position.set(pos.x, pos.y, pos.z);
            this.scene.add(wisp);
            this._addEffect({
                mesh: wisp, life: 0.8 + Math.random() * 0.6, maxLife: 1.4, type: 'void_inward',
                centerX: pos.x, centerZ: pos.z, angle: Math.random() * Math.PI * 2,
            });
        }
    }

    _spawnOrganicBurst(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const mat = this._makeAdditiveMat(0xaa0000, 0.8); // blood color
            const drop = new THREE.Mesh(this._sporeGeo, mat);
            drop.position.set(pos.x, pos.y, pos.z);
            this.scene.add(drop);
            this._addEffect({
                mesh: drop, life: 0.4 + Math.random() * 0.4, maxLife: 0.8, type: 'spark',
                vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, vz: (Math.random() - 0.5) * 4,
            });
        }
    }

    _spawnSmoke(pos, color, count) {
        for (let i = 0; i < count; i++) {
            const mat = this._makeAdditiveMat(color, 0.4);
            const smoke = new THREE.Mesh(this._smokeGeo, mat);
            smoke.position.set(pos.x, pos.y, pos.z);
            this.scene.add(smoke);
            this._addEffect({
                mesh: smoke, life: 1.5, maxLife: 1.5, type: 'smoke',
                vx: (Math.random() - 0.5) * 1, vy: 1 + Math.random() * 1, vz: (Math.random() - 0.5) * 1,
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE LOOP — Animate all active effects
    // ═══════════════════════════════════════════════════════════════

    update(dt) {
        let writeIdx = 0;
        for (let i = 0; i < this.effects.length; i++) {
            const fx = this.effects[i];
            fx.life -= dt;

            if (fx.life <= 0) {
                this.scene.remove(fx.mesh);
                if (fx.mesh.material) fx.mesh.material.dispose();
                continue;
            }

            const t = 1 - (fx.life / fx.maxLife); // 0→1 over lifetime

            switch (fx.type) {
                // ── Basic effects ──
                case 'slash':
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(1 + t * 0.5);
                    break;
                case 'spark':
                    fx.mesh.position.x += fx.vx * dt;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.position.z += fx.vz * dt;
                    fx.vy -= 8 * dt;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(1 - t);
                    break;
                case 'ring':
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(1 + t * 3);
                    break;
                case 'achievement_spark':
                    fx.mesh.position.x += fx.vx * dt;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.position.z += fx.vz * dt;
                    fx.vy -= 9.8 * dt; // Gravity
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(1 - t * 0.8);
                    break;

                // ── Crit ──
                case 'crit_flash':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.9;
                    fx.mesh.scale.setScalar(1 + t * 4);
                    break;
                case 'crit_star':
                    fx.mesh.position.x += fx.vx * dt;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.position.z += fx.vz * dt;
                    fx.vy -= 6 * dt;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(1 - t * 0.5);
                    break;

                // ── Skill 0: Aether Strike ──
                case 'aether_slash':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.95;
                    fx.mesh.scale.setScalar(1 + t * 0.6);
                    fx.mesh.rotation.z += fx.rotSpeed * dt;
                    break;

                // ── Skill 1: Whirlwind ──
                case 'whirlwind':
                    fx.mesh.rotation.z += fx.rotSpeed * dt;
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.7;
                    fx.mesh.scale.setScalar(1 + t * 0.3);
                    break;
                case 'whirlwind_trail':
                    fx.angle += fx.rotSpeed * dt;
                    fx.mesh.position.x = fx.baseX + Math.cos(fx.angle) * fx.radius;
                    fx.mesh.position.z = fx.baseZ + Math.sin(fx.angle) * fx.radius;
                    fx.mesh.rotation.y = fx.angle + Math.PI / 2;
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    break;

                // ── Skill 2: Aegis Guard ──
                case 'aegis_dome':
                    fx.mesh.material.opacity = 0.2 + Math.sin(t * Math.PI * 4) * 0.1;
                    fx.mesh.rotation.y += 0.5 * dt;
                    break;
                case 'aegis_hex': {
                    fx.angle += fx.rotSpeed * dt;
                    fx.mesh.position.x = fx.baseX + Math.cos(fx.angle) * fx.radius;
                    fx.mesh.position.z = fx.baseZ + Math.sin(fx.angle) * fx.radius;
                    fx.mesh.position.y = 1.0 + Math.sin(t * Math.PI * 3 + fx.floatPhase) * 0.2;
                    fx.mesh.material.opacity = 0.5 + Math.sin(t * Math.PI * 6) * 0.3;
                    break;
                }
                case 'aegis_ring': {
                    const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.15;
                    fx.mesh.scale.set(pulse, pulse, 1);
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    break;
                }

                // ── Skill 3: War Cry ──
                case 'warcry':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    { const cryScale = 1 + t * 6; fx.mesh.scale.set(cryScale, cryScale, 1); }
                    break;
                case 'warcry_fast':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.4;
                    { const fastScale = 1 + t * 8; fx.mesh.scale.set(fastScale, fastScale, 1); }
                    break;
                case 'warcry_pillar':
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.y = 1 + t * 2;
                    break;

                // ── Skill 4: Rending Blades ──
                case 'rend_slash':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.9;
                    fx.mesh.scale.setScalar(1 + t * 0.4);
                    fx.mesh.rotation.z += fx.rotSpeed * dt;
                    break;
                case 'rend_drip':
                    fx.mesh.position.x += fx.vx * dt;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.position.z += fx.vz * dt;
                    fx.vy -= 5 * dt;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(0.6 + t * 0.4);
                    break;

                // ── Skill 5: Dragon's Fury ──
                case 'fire_cone':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    fx.mesh.scale.x = 1 + t * 0.5;
                    fx.mesh.scale.y = 1 + t * 0.3;
                    break;
                case 'fire_ring':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.7;
                    { const fireScale = 1 + t * 3; fx.mesh.scale.set(fireScale, fireScale, 1); }
                    break;
                case 'fire_ember':
                    fx.mesh.position.x += fx.vx * dt;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.position.z += fx.vz * dt;
                    fx.vy -= 6 * dt;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(Math.max(0.1, 1 - t));
                    break;

                // ── Skill 6: Void Rift ──
                case 'void_core':
                    fx.mesh.material.opacity = 0.6 + Math.sin(t * Math.PI * 6) * 0.2;
                    fx.mesh.scale.setScalar(0.5 + t * 0.8);
                    fx.mesh.rotation.y += 3 * dt;
                    break;
                case 'void_ring':
                    fx.mesh.rotation.z += fx.rotSpeed * dt;
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.7;
                    fx.mesh.scale.setScalar(1 + Math.sin(t * Math.PI * 3) * 0.2);
                    break;
                case 'void_tendril': {
                    const reach = t * 1.5;
                    fx.mesh.position.x = fx.baseX + Math.cos(fx.angle) * reach;
                    fx.mesh.position.z = fx.baseZ + Math.sin(fx.angle) * reach;
                    fx.mesh.scale.y = 0.5 + t * 1.5;
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    break;
                }
                case 'void_inward': {
                    // Spiral inward toward center
                    const progress = t;
                    const dist = (1 - progress) * 2.5;
                    fx.angle += 4 * dt;
                    fx.mesh.position.x = fx.centerX + Math.cos(fx.angle) * dist;
                    fx.mesh.position.z = fx.centerZ + Math.sin(fx.angle) * dist;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(0.5 + (1 - progress) * 0.8);
                    break;
                }

                // ── Skill 7: Cataclysm ──
                case 'cata_pillar':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    fx.mesh.scale.x = 0.8 + Math.sin(t * Math.PI * 6) * 0.2;
                    fx.mesh.scale.z = 0.8 + Math.sin(t * Math.PI * 6 + 1) * 0.2;
                    fx.mesh.scale.y = 1 + t * 0.3;
                    break;
                case 'cata_pillar_inner':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.4;
                    fx.mesh.scale.x = 0.4 + Math.sin(t * Math.PI * 8) * 0.15;
                    fx.mesh.scale.z = 0.4 + Math.sin(t * Math.PI * 8 + 1) * 0.15;
                    break;
                case 'cata_orb':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.9;
                    { const pulse = 1 + Math.sin(t * Math.PI * 10) * 0.3; fx.mesh.scale.setScalar(pulse); }
                    break;
                case 'cata_ground':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.5;
                    { const gScale = 1 + t * 2; fx.mesh.scale.set(gScale, gScale, 1); }
                    break;
                case 'cata_ring': {
                    const delay = fx.delay || 0;
                    const effT = Math.max(0, t - delay);
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.6;
                    const rScale = 1 + effT * 5;
                    fx.mesh.scale.set(rScale, rScale, 1);
                    break;
                }
                case 'cata_spark':
                    fx.mesh.position.x += fx.vx * dt;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.mesh.position.z += fx.vz * dt;
                    fx.vy -= 7 * dt;
                    fx.mesh.material.opacity = fx.life / fx.maxLife;
                    fx.mesh.scale.setScalar(Math.max(0.1, 1 - t * 0.7));
                    break;

                // ── Dawnkeeper: Holy Smite pillar (descends + fades) ──
                case 'smite_pillar':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.7;
                    fx.mesh.position.y = 3.0 - t * 1.5; // descend
                    fx.mesh.scale.x = 0.8 + Math.sin(t * Math.PI * 4) * 0.15;
                    fx.mesh.scale.z = 0.8 + Math.sin(t * Math.PI * 4 + 1) * 0.15;
                    break;
                case 'smite_ring':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.7;
                    { const smScale = 1 + t * 4; fx.mesh.scale.set(smScale, smScale, 1); }
                    break;

                // ── Dawnkeeper: Benediction ascending motes ──
                case 'bene_mote':
                    fx.angle += fx.rotSpeed * dt;
                    fx.mesh.position.x = fx.baseX + Math.cos(fx.angle) * fx.radius;
                    fx.mesh.position.z = fx.baseZ + Math.sin(fx.angle) * fx.radius;
                    fx.mesh.position.y += fx.vy * dt;
                    fx.radius *= (1 - 0.3 * dt); // spiral inward slightly
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.9;
                    fx.mesh.scale.setScalar(Math.max(0.2, 1 - t * 0.5));
                    break;

                // ── Dawnkeeper: Radiant Flare core ──
                case 'flare_core':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.8;
                    { const fScale = 1 + t * 2.5; fx.mesh.scale.setScalar(fScale); }
                    break;
                case 'flare_ray':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.7;
                    fx.mesh.scale.y = 1 + t * 1.5;
                    fx.mesh.scale.x = 1 - t * 0.5;
                    break;

                // ── Dawnkeeper: Solar Lance beam ──
                case 'lance_beam':
                    fx.mesh.material.opacity = (fx.life / fx.maxLife) * 0.8;
                    fx.mesh.scale.x = 1 + t * 0.3;
                    break;

                // ── Dawnkeeper: Sanctified Ground runes (pulsing) ──
                case 'consec_rune':
                    fx.mesh.material.opacity = 0.4 + Math.sin(t * Math.PI * 6 + fx.floatPhase) * 0.3;
                    { const rScale = 0.8 + Math.sin(t * Math.PI * 4) * 0.2;
                    fx.mesh.scale.set(rScale, rScale, 1); }
                    break;

                // ── Level up ──
                case 'levelup':
                    fx.mesh.position.y += fx.vy * dt;
                    { const phase = t * Math.PI * 4 + fx.angle;
                    fx.mesh.position.x = fx.baseX + Math.cos(phase) * (0.5 + t * 1.5);
                    fx.mesh.position.z = fx.baseZ + Math.sin(phase) * (0.5 + t * 1.5); }
                    fx.mesh.material.opacity = 1 - t;
                    break;
            }

            if (writeIdx !== i) this.effects[writeIdx] = fx;
            writeIdx++;
        }
        this.effects.length = writeIdx;
    }
}
