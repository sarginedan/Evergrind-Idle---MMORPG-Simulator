// PlayerModels.js — Class-specific 3D character model builders
// Each builder returns geometry parts compatible with Player animation system
// Required parts: torso, head, leftArm, rightArm, leftLeg, rightLeg, cape, sword
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════
// VOIDWEAVER — Dark Sorcerer with flowing robes, void staff, grimoire
// Deep purple fabrics, spectral void energy, floating halo, arcane rings
// ═══════════════════════════════════════════════════════════════════════
export function buildVoidweaverModel(player) {
    const g = player.group;
    const parts = player.parts;

    // ── Material Library ──
    const robePrimaryMat = new THREE.MeshStandardMaterial({
        color: 0x1a0a2e, metalness: 0.1, roughness: 0.7,
        sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x4422aa),
    });
    const robeSecondaryMat = new THREE.MeshStandardMaterial({
        color: 0x2a1548, metalness: 0.15, roughness: 0.6,
        sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x6633cc),
    });
    const robeInnerMat = new THREE.MeshStandardMaterial({
        color: 0x0d0518, metalness: 0.05, roughness: 0.8,
        sheen: 0.2, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x220a44),
        side: THREE.DoubleSide,
    });
    const voidGlowMat = new THREE.MeshStandardMaterial({
        color: 0xcc88ff, emissive: 0x8844cc, emissiveIntensity: 2.0,
        metalness: 0.5, roughness: 0.15, transparent: true, opacity: 0.95, transmission: 0.1,
    });
    const voidCoreMat = new THREE.MeshStandardMaterial({
        color: 0xee99ff, emissive: 0xbb66ee, emissiveIntensity: 3.0,
        transparent: true, opacity: 0.9,
    });
    const silverMat = new THREE.MeshStandardMaterial({
        color: 0x9090a8, metalness: 0.95, roughness: 0.06,
        clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 1.0,
    });
    const darkSilverMat = new THREE.MeshStandardMaterial({
        color: 0x505068, metalness: 0.9, roughness: 0.1,
        clearcoat: 0.6, clearcoatRoughness: 0.1,
    });
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xa08070, metalness: 0.0, roughness: 0.6,
        sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xccaa99),
    });
    const voidGemMat = new THREE.MeshStandardMaterial({
        color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 2.5,
        metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.92,
        iridescence: 0.8, iridescenceIOR: 1.8, transmission: 0.3, thickness: 0.3,
    });
    const staffWoodMat = new THREE.MeshStandardMaterial({
        color: 0x1a1024, metalness: 0.2, roughness: 0.5,
        sheen: 0.3, sheenColor: new THREE.Color(0x332244),
    });

    player._aetherMats = [voidGlowMat, voidCoreMat, voidGemMat];
    player._aetherBaseEmissive = player._aetherMats.map(m => m.emissiveIntensity);

    // ═══════════════════════════════════════════════════════════════
    // TORSO — Layered robes with silver clasps and void runes
    // ═══════════════════════════════════════════════════════════════
    const torso = new THREE.Group();

    // Inner robe body — slightly tapered
    const robeBodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.65, 10);
    const robeBody = new THREE.Mesh(robeBodyGeo, robePrimaryMat);
    robeBody.scale.set(1.1, 1.0, 0.65);
    robeBody.castShadow = true;
    torso.add(robeBody);

    // Front robe panel (overlapping fold)
    const frontPanelGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.6, 8, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    const frontPanel = new THREE.Mesh(frontPanelGeo, robeSecondaryMat);
    frontPanel.scale.set(1.05, 1.0, 0.5);
    frontPanel.position.set(0, 0.0, 0.06);
    torso.add(frontPanel);

    // Silver chain clasp across chest
    const claspGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 12);
    for (let side of [-1, 1]) {
        const clasp = new THREE.Mesh(claspGeo, silverMat);
        clasp.position.set(side * 0.12, 0.12, 0.2);
        clasp.rotation.y = Math.PI / 2;
        torso.add(clasp);
    }
    // Chain between clasps
    const chainGeo = new THREE.TorusGeometry(0.13, 0.006, 6, 20, Math.PI * 0.6);
    const chain = new THREE.Mesh(chainGeo, silverMat);
    chain.position.set(0, 0.08, 0.2);
    chain.rotation.x = Math.PI * 0.15;
    torso.add(chain);

    // Void crystal pendant on chain
    const pendantGeo = new THREE.OctahedronGeometry(0.035, 1);
    const pendant = new THREE.Mesh(pendantGeo, voidGemMat);
    pendant.position.set(0, 0.0, 0.22);
    torso.add(pendant);

    // Rune lines on robe
    for (let i = 0; i < 3; i++) {
        const runeGeo = new THREE.BoxGeometry(0.15, 0.008, 0.008);
        const rune = new THREE.Mesh(runeGeo, voidGlowMat);
        rune.position.set(0, -0.08 - i * 0.12, 0.2);
        torso.add(rune);
    }
    // Vertical rune lines
    for (let side of [-1, 1]) {
        const vRuneGeo = new THREE.BoxGeometry(0.008, 0.35, 0.008);
        const vRune = new THREE.Mesh(vRuneGeo, voidGlowMat);
        vRune.position.set(side * 0.08, -0.04, 0.2);
        torso.add(vRune);
    }

    // Collar / high neckline
    const collarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.15, 10);
    const collar = new THREE.Mesh(collarGeo, robeSecondaryMat);
    collar.position.y = 0.38;
    torso.add(collar);

    // Collar flare (raised collar pieces)
    for (let side of [-1, 1]) {
        const flareGeo = new THREE.BoxGeometry(0.04, 0.18, 0.12);
        const flare = new THREE.Mesh(flareGeo, robePrimaryMat);
        flare.position.set(side * 0.14, 0.4, -0.02);
        flare.rotation.z = side * -0.2;
        torso.add(flare);
    }

    // Silver shoulder brooches
    for (let side of [-1, 1]) {
        const broochGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const brooch = new THREE.Mesh(broochGeo, silverMat);
        brooch.position.set(side * 0.24, 0.25, 0.06);
        torso.add(brooch);
        const broochGemGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const broochGem = new THREE.Mesh(broochGemGeo, voidGemMat);
        broochGem.position.set(side * 0.24, 0.25, 0.1);
        torso.add(broochGem);
    }

    // Back plate
    const backGeo = new THREE.BoxGeometry(0.36, 0.5, 0.04);
    const back = new THREE.Mesh(backGeo, robePrimaryMat);
    back.position.set(0, 0.02, -0.14);
    torso.add(back);

    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // ═══════════════════════════════════════════════════════════════
    // SHOULDER PADS — Layered fabric with silver trim
    // ═══════════════════════════════════════════════════════════════
    player._shoulderParts = [];
    for (let side of [-1, 1]) {
        const shoulderGroup = new THREE.Group();
        // Layered fabric shoulder
        const padGeo = new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const pad = new THREE.Mesh(padGeo, robeSecondaryMat);
        pad.scale.set(1.2, 0.8, 1.0);
        pad.castShadow = true;
        shoulderGroup.add(pad);

        // Silver trim ring
        const trimGeo = new THREE.TorusGeometry(0.14, 0.008, 6, 12, Math.PI);
        const trim = new THREE.Mesh(trimGeo, silverMat);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = -0.02;
        shoulderGroup.add(trim);

        // Hanging fabric drape
        const drapeGeo = new THREE.BoxGeometry(0.1, 0.14, 0.08);
        const drape = new THREE.Mesh(drapeGeo, robePrimaryMat);
        drape.position.set(side * 0.02, -0.12, 0);
        shoulderGroup.add(drape);

        // Void rune on shoulder
        const sRuneGeo = new THREE.BoxGeometry(0.06, 0.06, 0.01);
        const sRune = new THREE.Mesh(sRuneGeo, voidGlowMat);
        sRune.position.set(0, 0.02, 0.1);
        sRune.rotation.z = Math.PI / 4;
        shoulderGroup.add(sRune);

        shoulderGroup.position.set(side * 0.36, 1.45, 0);
        player._shoulderParts.push(shoulderGroup);
        g.add(shoulderGroup);
    }

    // ═══════════════════════════════════════════════════════════════
    // WAIST — Ornate sash with void crystal belt
    // ═══════════════════════════════════════════════════════════════
    const sashGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.1, 10);
    const sash = new THREE.Mesh(sashGeo, robeSecondaryMat);
    sash.scale.set(1.0, 1, 0.65);
    sash.position.y = 0.82;
    g.add(sash);

    // Belt cord with tassels
    const cordGeo = new THREE.TorusGeometry(0.22, 0.012, 6, 16);
    const cord = new THREE.Mesh(cordGeo, silverMat);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.82;
    g.add(cord);

    // Belt gem
    const beltGemGeo = new THREE.OctahedronGeometry(0.025, 1);
    const beltGem = new THREE.Mesh(beltGemGeo, voidGemMat);
    beltGem.position.set(0, 0.82, 0.2);
    g.add(beltGem);

    // Hanging sash tails
    for (let side of [-1, 1]) {
        const tailGeo = new THREE.PlaneGeometry(0.08, 0.35, 1, 4);
        const tail = new THREE.Mesh(tailGeo, robeSecondaryMat);
        tail.position.set(side * 0.08, 0.58, 0.16);
        tail.rotation.y = side * 0.2;
        g.add(tail);
    }

    // Front robe skirt (long flowing)
    const frontSkirtGeo = new THREE.PlaneGeometry(0.32, 0.6, 3, 6);
    const frontSkirt = new THREE.Mesh(frontSkirtGeo, robePrimaryMat);
    frontSkirt.position.set(0, 0.48, 0.16);
    g.add(frontSkirt);
    player._frontTabard = frontSkirt;

    // Rune embroidery on skirt
    for (let i = 0; i < 2; i++) {
        const embGeo = new THREE.BoxGeometry(0.2, 0.008, 0.005);
        const emb = new THREE.Mesh(embGeo, voidGlowMat);
        emb.position.set(0, 0.38 - i * 0.15, 0.165);
        g.add(emb);
    }

    // ═══════════════════════════════════════════════════════════════
    // HEAD — Hooded, shadowed face, glowing eyes
    // ═══════════════════════════════════════════════════════════════
    const headGroup = new THREE.Group();

    // Base head
    const headGeo = new THREE.SphereGeometry(0.15, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(0.85, 1.0, 0.9);
    head.castShadow = true;
    headGroup.add(head);

    // Jaw
    const jawGeo = new THREE.BoxGeometry(0.18, 0.08, 0.16);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.position.set(0, -0.12, 0.02);
    headGroup.add(jaw);

    // Chin
    const chinGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, -0.15, 0.05);
    headGroup.add(chin);

    // Glowing void eyes
    for (let side of [-1, 1]) {
        const socketGeo = new THREE.SphereGeometry(0.028, 8, 8);
        const socket = new THREE.Mesh(socketGeo, new THREE.MeshStandardMaterial({ color: 0x0a0510, roughness: 0.9 }));
        socket.position.set(side * 0.055, 0.02, 0.11);
        socket.scale.set(1.2, 0.6, 0.5);
        headGroup.add(socket);

        const irisGeo = new THREE.SphereGeometry(0.014, 8, 8);
        const iris = new THREE.Mesh(irisGeo, voidGlowMat);
        iris.position.set(side * 0.055, 0.02, 0.13);
        headGroup.add(iris);

        const browGeo = new THREE.BoxGeometry(0.055, 0.012, 0.018);
        const brow = new THREE.Mesh(browGeo, skinMat);
        brow.position.set(side * 0.055, 0.05, 0.11);
        brow.rotation.z = side * -0.15;
        headGroup.add(brow);
    }

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.022, 0.04, 0.035);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.02, 0.13);
    headGroup.add(nose);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.05, 0.004, 0.008);
    const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ color: 0x3a2020, roughness: 0.8 }));
    mouth.position.set(0, -0.07, 0.11);
    headGroup.add(mouth);

    // Deep hood — main volume
    const hoodGeo = new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hood = new THREE.Mesh(hoodGeo, robePrimaryMat);
    hood.position.set(0, 0.04, -0.04);
    hood.scale.set(1.0, 1.05, 1.15);
    headGroup.add(hood);

    // Hood brim (forward overhang for shadow)
    const brimGeo = new THREE.BoxGeometry(0.32, 0.04, 0.18);
    const brim = new THREE.Mesh(brimGeo, robePrimaryMat);
    brim.position.set(0, 0.16, 0.1);
    brim.rotation.x = -0.25;
    headGroup.add(brim);

    // Hood fabric sides
    for (let side of [-1, 1]) {
        const sideGeo = new THREE.BoxGeometry(0.04, 0.2, 0.15);
        const sidePiece = new THREE.Mesh(sideGeo, robePrimaryMat);
        sidePiece.position.set(side * 0.17, 0.0, 0.0);
        headGroup.add(sidePiece);
    }

    // Hood trim glow
    const hoodTrimGeo = new THREE.TorusGeometry(0.2, 0.006, 6, 20, Math.PI * 0.8);
    const hoodTrim = new THREE.Mesh(hoodTrimGeo, voidGlowMat);
    hoodTrim.rotation.x = Math.PI / 2 + 0.3;
    hoodTrim.position.set(0, 0.15, 0.06);
    headGroup.add(hoodTrim);

    // Ears (hidden beneath hood)
    for (let side of [-1, 1]) {
        const earGeo = new THREE.SphereGeometry(0.018, 6, 6);
        const ear = new THREE.Mesh(earGeo, skinMat);
        ear.scale.set(0.5, 1, 0.7);
        ear.position.set(side * 0.13, 0.0, 0.02);
        headGroup.add(ear);
    }

    // ── Floating Void Halo ──
    const haloGroup = new THREE.Group();
    const haloRingGeo = new THREE.TorusGeometry(0.24, 0.012, 8, 32);
    const haloRing = new THREE.Mesh(haloRingGeo, voidGlowMat);
    haloRing.rotation.x = Math.PI / 2;
    haloGroup.add(haloRing);
    // Halo inner ring
    const haloInnerGeo = new THREE.TorusGeometry(0.18, 0.006, 6, 24);
    const haloInner = new THREE.Mesh(haloInnerGeo, voidCoreMat);
    haloInner.rotation.x = Math.PI / 2;
    haloGroup.add(haloInner);
    // Halo rune nodes
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const nodeGeo = new THREE.OctahedronGeometry(0.018, 0);
        const node = new THREE.Mesh(nodeGeo, voidGemMat);
        node.position.set(Math.cos(angle) * 0.24, 0, Math.sin(angle) * 0.24);
        haloGroup.add(node);
    }
    haloGroup.position.y = 0.3;
    headGroup.add(haloGroup);
    player._voidHalo = haloGroup;

    headGroup.position.y = 1.72;
    parts.head = headGroup;
    g.add(headGroup);

    // ═══════════════════════════════════════════════════════════════
    // LEFT ARM — Spell hand with void vortex orb
    // ═══════════════════════════════════════════════════════════════
    const leftArmGroup = new THREE.Group();

    // Robed upper arm
    const lUpperGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.32, 8);
    const lUpper = new THREE.Mesh(lUpperGeo, robePrimaryMat);
    lUpper.position.y = -0.16;
    leftArmGroup.add(lUpper);

    // Elbow
    const lElbowGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const lElbow = new THREE.Mesh(lElbowGeo, robeSecondaryMat);
    lElbow.position.y = -0.32;
    leftArmGroup.add(lElbow);

    // Forearm sleeve (wider, flowing)
    const lForeGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.28, 8);
    const lFore = new THREE.Mesh(lForeGeo, robeSecondaryMat);
    lFore.position.y = -0.46;
    leftArmGroup.add(lFore);

    // Wide sleeve opening trim
    const sleeveTrimGeo = new THREE.TorusGeometry(0.068, 0.005, 6, 12);
    const sleeveTrim = new THREE.Mesh(sleeveTrimGeo, voidGlowMat);
    sleeveTrim.rotation.x = Math.PI / 2;
    sleeveTrim.position.y = -0.6;
    leftArmGroup.add(sleeveTrim);

    // Hand (partially visible)
    const lHandGeo = new THREE.BoxGeometry(0.07, 0.06, 0.06);
    const lHand = new THREE.Mesh(lHandGeo, skinMat);
    lHand.position.y = -0.63;
    leftArmGroup.add(lHand);

    // Fingers
    for (let f = 0; f < 4; f++) {
        const fGeo = new THREE.BoxGeometry(0.012, 0.035, 0.012);
        const finger = new THREE.Mesh(fGeo, skinMat);
        finger.position.set(-0.02 + f * 0.014, -0.67, 0.02);
        leftArmGroup.add(finger);
    }

    // ── Void Vortex Orb (channeling spell) ──
    const orbGroup = new THREE.Group();
    const orbCoreGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const orbCore = new THREE.Mesh(orbCoreGeo, voidCoreMat);
    orbGroup.add(orbCore);

    const orbShellGeo = new THREE.SphereGeometry(0.08, 14, 14);
    const orbShellMat = new THREE.MeshStandardMaterial({
        color: 0x8833cc, emissive: 0x6622aa, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.4, transmission: 0.3,
    });
    const orbShell = new THREE.Mesh(orbShellGeo, orbShellMat);
    orbGroup.add(orbShell);

    const orbOuterGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const orbOuterMat = new THREE.MeshStandardMaterial({
        color: 0x5522aa, emissive: 0x331177, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.15, transmission: 0.5,
    });
    const orbOuter = new THREE.Mesh(orbOuterGeo, orbOuterMat);
    orbGroup.add(orbOuter);

    // Three orbiting void rings
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xaa66ee, emissive: 0x8844cc, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.7,
    });
    const r1Geo = new THREE.TorusGeometry(0.14, 0.006, 6, 20);
    const r1 = new THREE.Mesh(r1Geo, voidGlowMat);
    orbGroup.add(r1);
    player._arcaneRing = r1;

    const r2Geo = new THREE.TorusGeometry(0.12, 0.005, 6, 18);
    const r2 = new THREE.Mesh(r2Geo, ringMat);
    r2.rotation.x = Math.PI / 2;
    orbGroup.add(r2);
    player._arcaneRing2 = r2;

    const r3Geo = new THREE.TorusGeometry(0.1, 0.004, 6, 16);
    const r3 = new THREE.Mesh(r3Geo, voidCoreMat);
    r3.rotation.z = Math.PI / 3;
    orbGroup.add(r3);
    player._arcaneRing3 = r3;

    orbGroup.position.set(0, -0.78, 0.12);
    player._arcaneOrb = orbGroup;
    leftArmGroup.add(orbGroup);

    const orbLight = new THREE.Object3D(/* PointLight removed for perf */); //0x9944ff, 0.8, 3);
    orbLight.position.copy(orbGroup.position);
    player._orbLight = orbLight;
    leftArmGroup.add(orbLight);

    leftArmGroup.position.set(-0.38, 1.35, 0);
    parts.leftArm = leftArmGroup;
    g.add(leftArmGroup);

    // ═══════════════════════════════════════════════════════════════
    // RIGHT ARM — Void Staff (weapon)
    // ═══════════════════════════════════════════════════════════════
    const rightArmGroup = new THREE.Group();

    // Robed upper arm
    const rUpperGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.32, 8);
    const rUpper = new THREE.Mesh(rUpperGeo, robePrimaryMat);
    rUpper.position.y = -0.16;
    rightArmGroup.add(rUpper);

    // Elbow
    const rElbowGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const rElbow = new THREE.Mesh(rElbowGeo, robeSecondaryMat);
    rElbow.position.y = -0.32;
    rightArmGroup.add(rElbow);

    // Forearm (tighter sleeve for grip)
    const rForeGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.28, 8);
    const rFore = new THREE.Mesh(rForeGeo, robeSecondaryMat);
    rFore.position.y = -0.46;
    rightArmGroup.add(rFore);

    // Gauntlet (thin glove)
    const rHandGeo = new THREE.BoxGeometry(0.07, 0.06, 0.06);
    const rHand = new THREE.Mesh(rHandGeo, darkSilverMat);
    rHand.position.y = -0.64;
    rightArmGroup.add(rHand);

    // ── VOID STAFF ──
    const staffGroup = new THREE.Group();

    // Staff shaft — dark twisted wood
    const shaftGeo = new THREE.CylinderGeometry(0.018, 0.022, 1.6, 8);
    const shaft = new THREE.Mesh(shaftGeo, staffWoodMat);
    shaft.position.y = 0.3;
    staffGroup.add(shaft);

    // Spiral groove on shaft
    for (let i = 0; i < 10; i++) {
        const grooveGeo = new THREE.TorusGeometry(0.022, 0.003, 4, 8);
        const groove = new THREE.Mesh(grooveGeo, voidGlowMat);
        groove.position.y = -0.3 + i * 0.18;
        groove.rotation.x = Math.PI / 2;
        groove.rotation.z = i * 0.3;
        staffGroup.add(groove);
    }

    // Staff head — ornate silver cradle
    const cradleGeo = new THREE.TorusGeometry(0.06, 0.012, 6, 8);
    const cradle = new THREE.Mesh(cradleGeo, silverMat);
    cradle.position.y = 1.12;
    staffGroup.add(cradle);

    // Staff head prongs
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const prongGeo = new THREE.ConeGeometry(0.012, 0.12, 5);
        const prong = new THREE.Mesh(prongGeo, silverMat);
        prong.position.set(Math.cos(angle) * 0.05, 1.16, Math.sin(angle) * 0.05);
        prong.rotation.z = Math.cos(angle) * 0.3;
        prong.rotation.x = -Math.sin(angle) * 0.3;
        staffGroup.add(prong);
    }

    // Void crystal atop staff
    const crystalGeo = new THREE.OctahedronGeometry(0.055, 1);
    const crystal = new THREE.Mesh(crystalGeo, voidGemMat);
    crystal.position.y = 1.2;
    staffGroup.add(crystal);

    // Crystal glow shell
    const crystalGlowGeo = new THREE.SphereGeometry(0.07, 10, 10);
    const crystalGlowMat = new THREE.MeshStandardMaterial({
        color: 0x8833dd, emissive: 0x6622bb, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.2, transmission: 0.4,
    });
    const crystalGlow = new THREE.Mesh(crystalGlowGeo, crystalGlowMat);
    crystalGlow.position.y = 1.2;
    staffGroup.add(crystalGlow);

    // Staff bottom cap
    const capGeo = new THREE.ConeGeometry(0.025, 0.06, 6);
    const cap = new THREE.Mesh(capGeo, silverMat);
    cap.position.y = -0.52;
    cap.rotation.x = Math.PI;
    staffGroup.add(cap);

    // Staff point light
    const staffLight = new THREE.Object3D(/* PointLight removed for perf */); //0x8844dd, 0.5, 3);
    staffLight.position.y = 1.2;
    player._swordLight = staffLight;
    staffGroup.add(staffLight);

    // Blade sparks (void energy wisps on staff head)
    player._bladeSparks = [];
    for (let i = 0; i < 4; i++) {
        const sparkG = new THREE.Group();
        for (let s = 0; s < 3; s++) {
            const segGeo = new THREE.BoxGeometry(0.004, 0.04, 0.004);
            const seg = new THREE.Mesh(segGeo, voidGlowMat);
            seg.position.set(
                (Math.random() - 0.5) * 0.08,
                1.1 + (Math.random()) * 0.2,
                (Math.random() - 0.5) * 0.08
            );
            seg.rotation.z = (Math.random() - 0.5) * 1.5;
            sparkG.add(seg);
        }
        staffGroup.add(sparkG);
        player._bladeSparks.push(sparkG);
    }

    staffGroup.position.y = -0.7;
    staffGroup.rotation.x = -0.15;
    rightArmGroup.add(staffGroup);
    parts.sword = staffGroup;

    rightArmGroup.position.set(0.38, 1.35, 0);
    parts.rightArm = rightArmGroup;
    g.add(rightArmGroup);

    // ═══════════════════════════════════════════════════════════════
    // BACK — Floating Grimoire + Void tendrils
    // ═══════════════════════════════════════════════════════════════
    const backDevice = new THREE.Group();

    // Floating grimoire
    const bookGroup = new THREE.Group();
    const coverGeo = new THREE.BoxGeometry(0.18, 0.24, 0.04);
    const coverMat = new THREE.MeshStandardMaterial({
        color: 0x1a0828, metalness: 0.3, roughness: 0.4, clearcoat: 0.5,
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    bookGroup.add(cover);

    // Book spine
    const spineGeo = new THREE.BoxGeometry(0.04, 0.24, 0.05);
    const spine = new THREE.Mesh(spineGeo, darkSilverMat);
    spine.position.set(-0.11, 0, 0);
    bookGroup.add(spine);

    // Book emblem
    const bookEmblemGeo = new THREE.BoxGeometry(0.06, 0.06, 0.005);
    const bookEmblem = new THREE.Mesh(bookEmblemGeo, voidGlowMat);
    bookEmblem.position.set(0, 0, 0.025);
    bookEmblem.rotation.z = Math.PI / 4;
    bookGroup.add(bookEmblem);

    // Book gem
    const bookGemGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const bookGem = new THREE.Mesh(bookGemGeo, voidGemMat);
    bookGem.position.set(0, 0, 0.03);
    bookGroup.add(bookGem);

    // Pages (visible from side)
    const pagesGeo = new THREE.BoxGeometry(0.16, 0.22, 0.025);
    const pagesMat = new THREE.MeshStandardMaterial({ color: 0xd0c8b0, roughness: 0.9 });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.set(0.01, 0, 0);
    bookGroup.add(pages);

    bookGroup.rotation.set(0.3, 0.8, 0.1);
    bookGroup.position.set(0.2, 0.1, 0);
    backDevice.add(bookGroup);
    player._floatingGrimoire = bookGroup;

    // Void tendrils (spectral wisps)
    player._wingBlades = [];
    const tendrilPositions = [
        { x: -0.15, y: 0.15, angle: 0.4, length: 0.45 },
        { x: 0.15, y: 0.15, angle: -0.4, length: 0.45 },
        { x: -0.25, y: -0.05, angle: 0.7, length: 0.35 },
        { x: 0.25, y: -0.05, angle: -0.7, length: 0.35 },
    ];
    const tendrilMat = new THREE.MeshStandardMaterial({
        color: 0x8844cc, emissive: 0x5522aa, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.4,
    });
    for (const tp of tendrilPositions) {
        const tendril = new THREE.Group();
        for (let s = 0; s < 4; s++) {
            const segGeo = new THREE.BoxGeometry(0.015, tp.length * 0.25, 0.008);
            const seg = new THREE.Mesh(segGeo, tendrilMat);
            seg.position.y = s * tp.length * 0.22;
            seg.rotation.z = (Math.random() - 0.5) * 0.3;
            tendril.add(seg);
        }
        // Tip orb
        const tipGeo = new THREE.SphereGeometry(0.015, 6, 6);
        const tip = new THREE.Mesh(tipGeo, voidGemMat);
        tip.position.y = tp.length * 0.85;
        tendril.add(tip);

        tendril.position.set(tp.x, tp.y, 0);
        tendril.rotation.z = tp.angle;
        player._wingBlades.push(tendril);
        backDevice.add(tendril);
    }

    backDevice.position.set(0, 1.35, -0.22);
    player._backDevice = backDevice;
    g.add(backDevice);

    // ═══════════════════════════════════════════════════════════════
    // LEGS — Robed legs with boots barely visible
    // ═══════════════════════════════════════════════════════════════
    const buildLeg = (sideSign) => {
        const legGroup = new THREE.Group();

        // Thigh (hidden under robe)
        const thighGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8);
        const thigh = new THREE.Mesh(thighGeo, robePrimaryMat);
        thigh.position.y = -0.17;
        legGroup.add(thigh);

        // Knee
        const kneeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const knee = new THREE.Mesh(kneeGeo, robePrimaryMat);
        knee.position.y = -0.37;
        legGroup.add(knee);

        // Shin (robe continues)
        const shinGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.3, 8);
        const shin = new THREE.Mesh(shinGeo, robePrimaryMat);
        shin.position.y = -0.55;
        legGroup.add(shin);

        // Dark leather boot (barely visible under robes)
        const bootGeo = new THREE.BoxGeometry(0.12, 0.1, 0.18);
        const bootMat = new THREE.MeshStandardMaterial({
            color: 0x0d0818, metalness: 0.3, roughness: 0.5, clearcoat: 0.3,
        });
        const boot = new THREE.Mesh(bootGeo, bootMat);
        boot.position.set(0, -0.74, 0.02);
        boot.castShadow = true;
        legGroup.add(boot);

        const soleGeo = new THREE.BoxGeometry(0.13, 0.02, 0.2);
        const sole = new THREE.Mesh(soleGeo, new THREE.MeshStandardMaterial({ color: 0x080410, roughness: 0.9 }));
        sole.position.set(0, -0.8, 0.02);
        legGroup.add(sole);

        const toeGeo = new THREE.SphereGeometry(0.035, 6, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const toe = new THREE.Mesh(toeGeo, bootMat);
        toe.rotation.x = Math.PI / 2;
        toe.position.set(0, -0.74, 0.11);
        legGroup.add(toe);

        legGroup.position.set(sideSign * 0.12, 0.78, 0);
        return legGroup;
    };

    parts.leftLeg = buildLeg(-1);
    g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1);
    g.add(parts.rightLeg);

    // ═══════════════════════════════════════════════════════════════
    // CAPE — Long flowing dark purple cloak
    // ═══════════════════════════════════════════════════════════════
    const capeMat = new THREE.MeshStandardMaterial({
        color: 0x1a0a30, metalness: 0.05, roughness: 0.7,
        sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x332266),
        side: THREE.DoubleSide,
    });
    const capeGeo = new THREE.PlaneGeometry(0.7, 1.2, 6, 10);
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 1.05, -0.22);
    parts.cape = cape;
    g.add(cape);

    const capeInnerGeo = new THREE.PlaneGeometry(0.66, 1.16, 6, 10);
    player._capeInner = new THREE.Mesh(capeInnerGeo, robeInnerMat);
    player._capeInner.position.set(0, 1.05, -0.215);
    g.add(player._capeInner);

    // Cape trim glow
    const capeTrimGeo = new THREE.PlaneGeometry(0.7, 0.02, 6, 1);
    player._capeTrim = new THREE.Mesh(capeTrimGeo, voidGlowMat);
    player._capeTrim.position.set(0, 0.46, -0.22);
    g.add(player._capeTrim);

    // ═══════════════════════════════════════════════════════════════
    // GROUND RUNE — Void sigil circle
    // ═══════════════════════════════════════════════════════════════
    const runeCircle = new THREE.Group();
    const outerGeo = new THREE.RingGeometry(0.72, 0.78, 48);
    runeCircle.add(new THREE.Mesh(outerGeo, voidGlowMat));
    const midGeo = new THREE.RingGeometry(0.55, 0.58, 48);
    runeCircle.add(new THREE.Mesh(midGeo, voidGlowMat));
    const innerGeo = new THREE.RingGeometry(0.35, 0.37, 48);
    runeCircle.add(new THREE.Mesh(innerGeo, voidGlowMat));

    for (const mesh of runeCircle.children) mesh.rotation.x = -Math.PI / 2;

    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const segGeo = new THREE.BoxGeometry(0.012, 0.001, 0.15);
        const seg = new THREE.Mesh(segGeo, voidGlowMat);
        seg.position.set(Math.cos(angle) * 0.63, 0, Math.sin(angle) * 0.63);
        seg.rotation.y = angle;
        runeCircle.add(seg);
    }
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const symGeo = new THREE.BoxGeometry(0.035, 0.001, 0.14);
        const sym = new THREE.Mesh(symGeo, voidGemMat);
        sym.position.set(Math.cos(angle) * 0.15, 0.001, Math.sin(angle) * 0.15);
        sym.rotation.y = angle;
        runeCircle.add(sym);
    }
    const centerGeo = new THREE.CircleGeometry(0.08, 16);
    const centerMat = new THREE.MeshStandardMaterial({
        color: 0x8833dd, emissive: 0x6622bb, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.4,
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.002;
    runeCircle.add(center);

    runeCircle.position.y = 0.01;
    player._runeCircle = runeCircle;
    g.add(runeCircle);

    // ═══════════════════════════════════════════════════════════════
    // PARTICLES — Void motes
    // ═══════════════════════════════════════════════════════════════
    player._aetherParticles = [];
    const pGeo = new THREE.SphereGeometry(0.012, 6, 6);
    const pMats = [
        new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844dd, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66ee, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 }),
        new THREE.MeshStandardMaterial({ color: 0xeeccff, emissive: 0xddaaee, emissiveIntensity: 3.0, transparent: true, opacity: 0.5 }),
    ];
    for (let i = 0; i < 14; i++) {
        const p = new THREE.Mesh(pGeo, pMats[i % 3]);
        const angle = (i / 14) * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.5;
        const height = 0.3 + Math.random() * 1.5;
        p.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        player._aetherParticles.push({
            mesh: p, baseAngle: angle, radius, baseY: height,
            speed: 0.3 + Math.random() * 0.6, bobSpeed: 1.5 + Math.random() * 2.0,
            bobAmp: 0.05 + Math.random() * 0.1, phaseOffset: Math.random() * Math.PI * 2,
        });
        g.add(p);
    }

    // ═══════════════════════════════════════════════════════════════
    // LIGHTING
    // ═══════════════════════════════════════════════════════════════
    const mainLight = new THREE.Object3D(/* PointLight removed for perf */); //0x8844ff, 1.0, 6);
    mainLight.position.set(0, 1.4, 0.3);
    player._aetherLight = mainLight;
    g.add(mainLight);

    const backLight = new THREE.Object3D(/* PointLight removed for perf */); //0x6633cc, 0.4, 4);
    backLight.position.set(0, 1.5, -0.4);
    player._backLight = backLight;
    g.add(backLight);

    const rimLight = new THREE.Object3D(/* PointLight removed for perf */); //0x8877aa, 0.3, 5);
    rimLight.position.set(0, 2.5, 0);
    g.add(rimLight);
}


// ═══════════════════════════════════════════════════════════════════════
// THORNWARDEN — Nature Ranger with leather armor, longbow, hood, quiver
// Earthy tones, emerald glow, spirit wisp companion, vine details
// ═══════════════════════════════════════════════════════════════════════
export function buildThornwardenModel(player) {
    const g = player.group;
    const parts = player.parts;

    // ── Material Library ──
    const leatherMat = new THREE.MeshStandardMaterial({
        color: 0x2a1a0e, metalness: 0.15, roughness: 0.65,
        sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x4a3020),
    });
    const leatherLightMat = new THREE.MeshStandardMaterial({
        color: 0x3d2a18, metalness: 0.12, roughness: 0.6,
        sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x5a4030),
    });
    const hideArmorMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a1a, metalness: 0.2, roughness: 0.5,
        clearcoat: 0.2, clearcoatRoughness: 0.3,
    });
    const hideAccentMat = new THREE.MeshStandardMaterial({
        color: 0x2a4d2a, metalness: 0.25, roughness: 0.45,
        clearcoat: 0.15,
    });
    const fabricMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a12, metalness: 0.05, roughness: 0.75,
        sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x2a4020),
        side: THREE.DoubleSide,
    });
    const fabricInnerMat = new THREE.MeshStandardMaterial({
        color: 0x0d150a, metalness: 0.05, roughness: 0.8,
        sheen: 0.2, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x1a2a10),
        side: THREE.DoubleSide,
    });
    const natureGlowMat = new THREE.MeshStandardMaterial({
        color: 0x66ff88, emissive: 0x33dd55, emissiveIntensity: 2.0,
        metalness: 0.5, roughness: 0.15, transparent: true, opacity: 0.95, transmission: 0.1,
    });
    const vineGlowMat = new THREE.MeshStandardMaterial({
        color: 0x44cc66, emissive: 0x22aa44, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.8,
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
        color: 0x8a6832, metalness: 0.85, roughness: 0.15,
        clearcoat: 0.5, clearcoatRoughness: 0.1,
    });
    const darkBronzeMat = new THREE.MeshStandardMaterial({
        color: 0x5a4422, metalness: 0.8, roughness: 0.2,
        clearcoat: 0.3,
    });
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xc89a70, metalness: 0.0, roughness: 0.6,
        sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xeebb99),
    });
    const hairMat = new THREE.MeshStandardMaterial({
        color: 0x8a3a1a, metalness: 0.05, roughness: 0.5,
        sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xbb5522),
    });
    const natureGemMat = new THREE.MeshStandardMaterial({
        color: 0x44ff66, emissive: 0x22dd44, emissiveIntensity: 2.5,
        metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.92,
        iridescence: 0.6, iridescenceIOR: 1.6, transmission: 0.3, thickness: 0.3,
    });
    const bowWoodMat = new THREE.MeshStandardMaterial({
        color: 0x3a2810, metalness: 0.1, roughness: 0.5,
        sheen: 0.3, sheenColor: new THREE.Color(0x5a4020),
    });
    const bowStringMat = new THREE.MeshStandardMaterial({
        color: 0xccddbb, metalness: 0.0, roughness: 0.8,
    });

    player._aetherMats = [natureGlowMat, vineGlowMat, natureGemMat];
    player._aetherBaseEmissive = player._aetherMats.map(m => m.emissiveIntensity);

    // ═══════════════════════════════════════════════════════════════
    // TORSO — Leather vest with leaf-embossed hide panels
    // ═══════════════════════════════════════════════════════════════
    const torso = new THREE.Group();

    // Core leather vest
    const vestGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.6, 10);
    const vest = new THREE.Mesh(vestGeo, leatherMat);
    vest.scale.set(1.05, 1.0, 0.65);
    vest.castShadow = true;
    torso.add(vest);

    // Front hide breastpiece (lighter green-tinted)
    const breastGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.5, 8, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
    const breast = new THREE.Mesh(breastGeo, hideArmorMat);
    breast.scale.set(1.0, 1.0, 0.45);
    breast.position.set(0, 0.0, 0.07);
    torso.add(breast);

    // Leaf-scale overlay panels
    for (let row = 0; row < 3; row++) {
        for (let col = -1; col <= 1; col++) {
            const leafGeo = new THREE.BoxGeometry(0.06, 0.08, 0.015);
            const leaf = new THREE.Mesh(leafGeo, hideAccentMat);
            leaf.position.set(col * 0.07, 0.12 - row * 0.12, 0.2);
            leaf.rotation.z = col * 0.1;
            torso.add(leaf);
        }
    }

    // Cross-strap (bandolier)
    const strapGeo = new THREE.BoxGeometry(0.04, 0.55, 0.015);
    const strap = new THREE.Mesh(strapGeo, leatherLightMat);
    strap.position.set(0.05, 0.05, 0.19);
    strap.rotation.z = -0.35;
    torso.add(strap);

    // Strap buckle
    const strapBuckleGeo = new THREE.BoxGeometry(0.05, 0.04, 0.02);
    const strapBuckle = new THREE.Mesh(strapBuckleGeo, bronzeMat);
    strapBuckle.position.set(-0.04, 0.16, 0.2);
    strapBuckle.rotation.z = -0.35;
    torso.add(strapBuckle);

    // Vine accents on torso
    for (let i = 0; i < 2; i++) {
        const vineGeo = new THREE.TorusGeometry(0.2, 0.006, 4, 16, Math.PI * 0.5);
        const vine = new THREE.Mesh(vineGeo, vineGlowMat);
        vine.position.set(0, -0.05 + i * 0.2, 0.2);
        vine.rotation.set(0.2, 0, i * 0.5);
        torso.add(vine);
    }

    // Collar — wrapped leather with leaf clasp
    const collarGeo = new THREE.CylinderGeometry(0.13, 0.17, 0.1, 10);
    const collar = new THREE.Mesh(collarGeo, leatherLightMat);
    collar.position.y = 0.35;
    torso.add(collar);

    // Leaf clasp at throat
    const leafClaspGeo = new THREE.BoxGeometry(0.04, 0.05, 0.01);
    const leafClasp = new THREE.Mesh(leafClaspGeo, natureGlowMat);
    leafClasp.position.set(0, 0.35, 0.14);
    leafClasp.rotation.z = Math.PI / 4;
    torso.add(leafClasp);

    // Back panel
    const backGeo = new THREE.BoxGeometry(0.34, 0.5, 0.04);
    const back = new THREE.Mesh(backGeo, leatherMat);
    back.position.set(0, 0.02, -0.13);
    torso.add(back);

    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // ═══════════════════════════════════════════════════════════════
    // SHOULDER GUARDS — Asymmetric leather with leaf motifs
    // ═══════════════════════════════════════════════════════════════
    player._shoulderParts = [];
    for (let side of [-1, 1]) {
        const shoulderGroup = new THREE.Group();

        // Layered leather pad
        const padGeo = new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const pad = new THREE.Mesh(padGeo, side === -1 ? hideArmorMat : leatherLightMat);
        pad.scale.set(1.1, 0.8, 1.0);
        pad.castShadow = true;
        shoulderGroup.add(pad);

        // Leaf overlay
        const leafGeo = new THREE.BoxGeometry(0.08, 0.08, 0.01);
        const leafOverlay = new THREE.Mesh(leafGeo, natureGlowMat);
        leafOverlay.position.set(0, 0.02, 0.08);
        leafOverlay.rotation.z = Math.PI / 4;
        shoulderGroup.add(leafOverlay);

        // Dangling leather strips
        for (let i = 0; i < 2; i++) {
            const stripGeo = new THREE.BoxGeometry(0.03, 0.1 + i * 0.03, 0.01);
            const strip = new THREE.Mesh(stripGeo, leatherMat);
            strip.position.set(side * 0.02 + i * 0.03, -0.1, 0.02);
            shoulderGroup.add(strip);
        }

        shoulderGroup.position.set(side * 0.36, 1.44, 0);
        player._shoulderParts.push(shoulderGroup);
        g.add(shoulderGroup);
    }

    // ═══════════════════════════════════════════════════════════════
    // WAIST — Utility belt with pouches & nature charms
    // ═══════════════════════════════════════════════════════════════
    const beltGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.1, 10);
    const belt = new THREE.Mesh(beltGeo, leatherMat);
    belt.scale.set(1.0, 1, 0.65);
    belt.position.y = 0.82;
    g.add(belt);

    // Belt cord
    const beltCordGeo = new THREE.TorusGeometry(0.22, 0.01, 6, 16);
    const beltCord = new THREE.Mesh(beltCordGeo, bronzeMat);
    beltCord.rotation.x = Math.PI / 2;
    beltCord.position.y = 0.82;
    g.add(beltCord);

    // Belt buckle — leaf-shaped bronze
    const buckleGeo = new THREE.BoxGeometry(0.08, 0.06, 0.025);
    const buckle = new THREE.Mesh(buckleGeo, bronzeMat);
    buckle.position.set(0, 0.82, 0.2);
    g.add(buckle);
    const buckleGemGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const buckleGem = new THREE.Mesh(buckleGemGeo, natureGemMat);
    buckleGem.position.set(0, 0.82, 0.215);
    g.add(buckleGem);

    // Side pouches
    for (let side of [-1, 1]) {
        const pouchGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);
        const pouch = new THREE.Mesh(pouchGeo, leatherLightMat);
        pouch.position.set(side * 0.22, 0.78, 0.1);
        g.add(pouch);
        // Pouch flap
        const flapGeo = new THREE.BoxGeometry(0.085, 0.03, 0.065);
        const flap = new THREE.Mesh(flapGeo, leatherMat);
        flap.position.set(side * 0.22, 0.83, 0.1);
        g.add(flap);
        // Pouch buckle
        const pbGeo = new THREE.SphereGeometry(0.008, 6, 6);
        const pb = new THREE.Mesh(pbGeo, bronzeMat);
        pb.position.set(side * 0.22, 0.82, 0.135);
        g.add(pb);
    }

    // Hanging leather loincloth / front flap
    const frontFlapGeo = new THREE.PlaneGeometry(0.24, 0.45, 3, 5);
    const frontFlap = new THREE.Mesh(frontFlapGeo, fabricMat);
    frontFlap.position.set(0, 0.52, 0.16);
    g.add(frontFlap);
    player._frontTabard = frontFlap;

    // Vine accent on flap
    const flapVineGeo = new THREE.BoxGeometry(0.16, 0.008, 0.005);
    const flapVine = new THREE.Mesh(flapVineGeo, vineGlowMat);
    flapVine.position.set(0, 0.42, 0.165);
    g.add(flapVine);

    // ═══════════════════════════════════════════════════════════════
    // HEAD — Auburn hair, elven features, nature-bonded markings
    // ═══════════════════════════════════════════════════════════════
    const headGroup = new THREE.Group();

    // Base head
    const headGeo = new THREE.SphereGeometry(0.15, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(0.85, 1.0, 0.9);
    head.castShadow = true;
    headGroup.add(head);

    // Jaw
    const jawGeo = new THREE.BoxGeometry(0.19, 0.08, 0.17);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.position.set(0, -0.12, 0.02);
    headGroup.add(jaw);

    // Chin
    const chinGeo = new THREE.SphereGeometry(0.032, 6, 6);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, -0.14, 0.06);
    headGroup.add(chin);

    // Emerald-glow eyes
    for (let side of [-1, 1]) {
        const socketGeo = new THREE.SphereGeometry(0.026, 8, 8);
        const socket = new THREE.Mesh(socketGeo, new THREE.MeshStandardMaterial({ color: 0x0a1508, roughness: 0.9 }));
        socket.position.set(side * 0.055, 0.02, 0.11);
        socket.scale.set(1.2, 0.6, 0.5);
        headGroup.add(socket);

        const irisGeo = new THREE.SphereGeometry(0.013, 8, 8);
        const iris = new THREE.Mesh(irisGeo, natureGlowMat);
        iris.position.set(side * 0.055, 0.02, 0.13);
        headGroup.add(iris);

        const browGeo = new THREE.BoxGeometry(0.05, 0.012, 0.016);
        const brow = new THREE.Mesh(browGeo, skinMat);
        brow.position.set(side * 0.055, 0.05, 0.11);
        brow.rotation.z = side * -0.12;
        headGroup.add(brow);
    }

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.02, 0.04, 0.03);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.02, 0.13);
    headGroup.add(nose);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.045, 0.004, 0.008);
    const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.8 }));
    mouth.position.set(0, -0.07, 0.11);
    headGroup.add(mouth);

    // Face markings (nature tattoos — glowing vine lines)
    for (let side of [-1, 1]) {
        const markGeo = new THREE.BoxGeometry(0.004, 0.06, 0.004);
        const mark = new THREE.Mesh(markGeo, vineGlowMat);
        mark.position.set(side * 0.08, -0.02, 0.1);
        mark.rotation.z = side * 0.2;
        headGroup.add(mark);
        // Short cross marks
        const crossGeo = new THREE.BoxGeometry(0.025, 0.003, 0.003);
        const cross = new THREE.Mesh(crossGeo, vineGlowMat);
        cross.position.set(side * 0.075, -0.04, 0.1);
        headGroup.add(cross);
    }

    // Pointed ears (elven)
    for (let side of [-1, 1]) {
        const earGeo = new THREE.ConeGeometry(0.015, 0.06, 4);
        const ear = new THREE.Mesh(earGeo, skinMat);
        ear.position.set(side * 0.14, 0.02, 0.0);
        ear.rotation.z = side * -0.7;
        ear.rotation.x = -0.15;
        headGroup.add(ear);
    }

    // Auburn hair — layered, wild
    const hairMainGeo = new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairMain = new THREE.Mesh(hairMainGeo, hairMat);
    hairMain.position.set(0, 0.06, -0.02);
    hairMain.scale.set(1.05, 1.0, 1.1);
    headGroup.add(hairMain);

    // Wild hair strands
    for (let i = 0; i < 6; i++) {
        const w = 0.035 + Math.random() * 0.015;
        const strandGeo = new THREE.BoxGeometry(w, 0.04 + i * 0.012, 0.1 + i * 0.02);
        const strand = new THREE.Mesh(strandGeo, hairMat);
        strand.position.set((i - 2.5) * 0.04, 0.06 - i * 0.03, -0.14 - i * 0.015);
        strand.rotation.x = 0.2 + i * 0.04;
        headGroup.add(strand);
    }

    // Side locks
    for (let side of [-1, 1]) {
        const lockGeo = new THREE.BoxGeometry(0.035, 0.12, 0.06);
        const lock = new THREE.Mesh(lockGeo, hairMat);
        lock.position.set(side * 0.12, -0.04, 0.0);
        lock.rotation.z = side * 0.15;
        headGroup.add(lock);
    }

    // Small leaf ornament in hair
    const hairLeafGeo = new THREE.BoxGeometry(0.03, 0.03, 0.005);
    const hairLeaf = new THREE.Mesh(hairLeafGeo, natureGlowMat);
    hairLeaf.position.set(-0.1, 0.08, 0.06);
    hairLeaf.rotation.z = Math.PI / 4;
    headGroup.add(hairLeaf);

    headGroup.position.y = 1.72;
    parts.head = headGroup;
    g.add(headGroup);

    // ═══════════════════════════════════════════════════════════════
    // LEFT ARM — Gauntleted hand with nature-glow bracer
    // ═══════════════════════════════════════════════════════════════
    const leftArmGroup = new THREE.Group();

    // Upper arm (leather)
    const lUpperGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.32, 8);
    const lUpper = new THREE.Mesh(lUpperGeo, leatherMat);
    lUpper.position.y = -0.16;
    leftArmGroup.add(lUpper);

    // Elbow
    const lElbowGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const lElbow = new THREE.Mesh(lElbowGeo, leatherLightMat);
    lElbow.position.y = -0.32;
    leftArmGroup.add(lElbow);

    // Forearm bracer
    const lForeGeo = new THREE.CylinderGeometry(0.04, 0.058, 0.28, 8);
    const lFore = new THREE.Mesh(lForeGeo, hideArmorMat);
    lFore.position.y = -0.46;
    leftArmGroup.add(lFore);

    // Bracer vine glow
    const bracerVineGeo = new THREE.TorusGeometry(0.05, 0.005, 4, 12, Math.PI * 1.5);
    const bracerVine = new THREE.Mesh(bracerVineGeo, vineGlowMat);
    bracerVine.position.y = -0.46;
    bracerVine.rotation.x = Math.PI / 2;
    leftArmGroup.add(bracerVine);

    // Hand
    const lHandGeo = new THREE.BoxGeometry(0.07, 0.06, 0.06);
    const lHand = new THREE.Mesh(lHandGeo, skinMat);
    lHand.position.y = -0.63;
    leftArmGroup.add(lHand);

    // Fingers
    for (let f = 0; f < 4; f++) {
        const fGeo = new THREE.BoxGeometry(0.012, 0.035, 0.012);
        const finger = new THREE.Mesh(fGeo, skinMat);
        finger.position.set(-0.02 + f * 0.014, -0.67, 0.02);
        leftArmGroup.add(finger);
    }

    // ── Nature spirit orb (channeling) ──
    const orbGroup = new THREE.Group();
    const orbCoreGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const orbCore = new THREE.Mesh(orbCoreGeo, new THREE.MeshStandardMaterial({
        color: 0xeeffcc, emissive: 0xccffaa, emissiveIntensity: 3.0, transparent: true, opacity: 0.9,
    }));
    orbGroup.add(orbCore);

    const orbShellGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const orbShellMat = new THREE.MeshStandardMaterial({
        color: 0x44bb55, emissive: 0x22aa33, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.35, transmission: 0.3,
    });
    orbGroup.add(new THREE.Mesh(orbShellGeo, orbShellMat));

    // Orbiting leaf ring
    const leafRingGeo = new THREE.TorusGeometry(0.1, 0.005, 6, 18);
    const leafRing = new THREE.Mesh(leafRingGeo, vineGlowMat);
    orbGroup.add(leafRing);
    player._arcaneRing = leafRing;

    const leafRing2Geo = new THREE.TorusGeometry(0.08, 0.004, 6, 14);
    const leafRing2 = new THREE.Mesh(leafRing2Geo, natureGlowMat);
    leafRing2.rotation.x = Math.PI / 2;
    orbGroup.add(leafRing2);
    player._arcaneRing2 = leafRing2;

    const leafRing3Geo = new THREE.TorusGeometry(0.06, 0.003, 6, 12);
    const leafRing3 = new THREE.Mesh(leafRing3Geo, natureGemMat);
    leafRing3.rotation.z = Math.PI / 3;
    orbGroup.add(leafRing3);
    player._arcaneRing3 = leafRing3;

    // Small floating leaves inside
    for (let i = 0; i < 3; i++) {
        const tinyLeafGeo = new THREE.BoxGeometry(0.02, 0.015, 0.003);
        const tinyLeaf = new THREE.Mesh(tinyLeafGeo, natureGlowMat);
        const a = (i / 3) * Math.PI * 2;
        tinyLeaf.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0);
        tinyLeaf.rotation.z = a;
        orbGroup.add(tinyLeaf);
    }

    orbGroup.position.set(0, -0.76, 0.12);
    player._arcaneOrb = orbGroup;
    leftArmGroup.add(orbGroup);

    const orbLight = new THREE.Object3D(/* PointLight removed for perf */); //0x44ff66, 0.6, 3);
    orbLight.position.copy(orbGroup.position);
    player._orbLight = orbLight;
    leftArmGroup.add(orbLight);

    leftArmGroup.position.set(-0.36, 1.35, 0);
    parts.leftArm = leftArmGroup;
    g.add(leftArmGroup);

    // ═══════════════════════════════════════════════════════════════
    // RIGHT ARM — Living-wood Longbow
    // ═══════════════════════════════════════════════════════════════
    const rightArmGroup = new THREE.Group();

    // Upper arm
    const rUpperGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.32, 8);
    const rUpper = new THREE.Mesh(rUpperGeo, leatherMat);
    rUpper.position.y = -0.16;
    rightArmGroup.add(rUpper);

    // Elbow
    const rElbowGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const rElbow = new THREE.Mesh(rElbowGeo, leatherLightMat);
    rElbow.position.y = -0.32;
    rightArmGroup.add(rElbow);

    // Forearm bracer
    const rForeGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.28, 8);
    const rFore = new THREE.Mesh(rForeGeo, hideArmorMat);
    rFore.position.y = -0.46;
    rightArmGroup.add(rFore);

    // Hand (gripping bow)
    const rHandGeo = new THREE.BoxGeometry(0.065, 0.06, 0.06);
    const rHand = new THREE.Mesh(rHandGeo, skinMat);
    rHand.position.y = -0.64;
    rightArmGroup.add(rHand);

    // ── LIVING-WOOD LONGBOW ──
    const bowGroup = new THREE.Group();

    // Bow limbs — curved wood with vine accents
    const bowCurve = new THREE.Path();
    bowCurve.moveTo(0, -0.55);
    bowCurve.quadraticCurveTo(0.2, -0.3, 0.15, 0);
    bowCurve.quadraticCurveTo(0.2, 0.3, 0, 0.55);
    const bowPoints = bowCurve.getPoints(20);
    const bowShape = [];
    for (const p of bowPoints) bowShape.push(new THREE.Vector3(p.x, p.y, 0));
    
    // Build bow from segments
    for (let i = 0; i < bowPoints.length - 1; i++) {
        const p1 = bowPoints[i], p2 = bowPoints[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        const angle = Math.atan2(dx, dy);
        const thickness = 0.015 - Math.abs(my) * 0.008; // thinner at tips
        const segGeo = new THREE.BoxGeometry(thickness, len, thickness);
        const seg = new THREE.Mesh(segGeo, bowWoodMat);
        seg.position.set(mx, my, 0);
        seg.rotation.z = -angle;
        bowGroup.add(seg);
    }

    // Vine wraps on bow
    for (let i = 0; i < 5; i++) {
        const t = (i / 4) * 0.8 + 0.1;
        const idx = Math.floor(t * (bowPoints.length - 1));
        const p = bowPoints[Math.min(idx, bowPoints.length - 1)];
        const vineWrapGeo = new THREE.TorusGeometry(0.018, 0.004, 4, 8);
        const vineWrap = new THREE.Mesh(vineWrapGeo, vineGlowMat);
        vineWrap.position.set(p.x, p.y, 0);
        vineWrap.rotation.x = Math.PI / 2;
        bowGroup.add(vineWrap);
    }

    // Bowstring
    const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, 1.08, 4);
    const bowString = new THREE.Mesh(stringGeo, bowStringMat);
    bowString.position.set(0.0, 0, 0);
    bowGroup.add(bowString);

    // Nature gem inset at grip
    const bowGemGeo = new THREE.SphereGeometry(0.018, 8, 8);
    const bowGem = new THREE.Mesh(bowGemGeo, natureGemMat);
    bowGem.position.set(0.1, 0, 0);
    bowGroup.add(bowGem);

    // Bow tips (horn-like caps)
    for (let side of [-1, 1]) {
        const tipGeo = new THREE.ConeGeometry(0.01, 0.05, 5);
        const tip = new THREE.Mesh(tipGeo, bronzeMat);
        tip.position.set(0.02, side * 0.56, 0);
        tip.rotation.z = side * 0.3;
        bowGroup.add(tip);
    }

    // Blade sparks (nature wisps around bow)
    player._bladeSparks = [];
    for (let i = 0; i < 4; i++) {
        const sparkG = new THREE.Group();
        for (let s = 0; s < 2; s++) {
            const segGeo = new THREE.BoxGeometry(0.004, 0.03, 0.004);
            const seg = new THREE.Mesh(segGeo, natureGlowMat);
            seg.position.set(
                0.1 + (Math.random() - 0.5) * 0.06,
                (i - 1.5) * 0.25 + (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.04
            );
            sparkG.add(seg);
        }
        bowGroup.add(sparkG);
        player._bladeSparks.push(sparkG);
    }

    // Bow light
    const bowLight = new THREE.Object3D(/* PointLight removed for perf */); //0x44dd66, 0.4, 3);
    bowLight.position.set(0.1, 0, 0);
    player._swordLight = bowLight;
    bowGroup.add(bowLight);

    bowGroup.position.y = -0.65;
    bowGroup.rotation.x = -0.15;
    bowGroup.rotation.z = 0.1;
    rightArmGroup.add(bowGroup);
    parts.sword = bowGroup;

    rightArmGroup.position.set(0.36, 1.35, 0);
    parts.rightArm = rightArmGroup;
    g.add(rightArmGroup);

    // ═══════════════════════════════════════════════════════════════
    // BACK — Quiver of arrows + hooded cloak attachment
    // ═══════════════════════════════════════════════════════════════
    const backDevice = new THREE.Group();

    // Quiver body
    const quiverGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.55, 8);
    const quiver = new THREE.Mesh(quiverGeo, leatherMat);
    quiver.position.set(0.12, 0.05, 0);
    quiver.rotation.z = -0.15;
    backDevice.add(quiver);

    // Quiver strap
    const qStrapGeo = new THREE.BoxGeometry(0.025, 0.6, 0.01);
    const qStrap = new THREE.Mesh(qStrapGeo, leatherLightMat);
    qStrap.position.set(0.05, 0.1, 0.04);
    qStrap.rotation.z = -0.2;
    backDevice.add(qStrap);

    // Arrow shafts (visible above quiver)
    for (let i = 0; i < 5; i++) {
        const arrowGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.35, 4);
        const arrow = new THREE.Mesh(arrowGeo, bowWoodMat);
        const angle = (i / 5) * Math.PI * 0.6 - 0.3;
        arrow.position.set(0.12 + Math.sin(angle) * 0.02, 0.4, Math.cos(angle) * 0.02);
        arrow.rotation.z = -0.15 + (Math.random() - 0.5) * 0.1;
        backDevice.add(arrow);

        // Arrowhead
        const headGeo2 = new THREE.ConeGeometry(0.008, 0.03, 4);
        const arrowHead = new THREE.Mesh(headGeo2, bronzeMat);
        arrowHead.position.set(arrow.position.x, 0.58, arrow.position.z);
        backDevice.add(arrowHead);

        // Fletching
        const fletchGeo = new THREE.BoxGeometry(0.015, 0.025, 0.002);
        const fletch = new THREE.Mesh(fletchGeo, new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.8 }));
        fletch.position.set(arrow.position.x, 0.25, arrow.position.z + 0.005);
        backDevice.add(fletch);
    }

    // Quiver nature emblem
    const qEmblemGeo = new THREE.BoxGeometry(0.04, 0.04, 0.01);
    const qEmblem = new THREE.Mesh(qEmblemGeo, natureGlowMat);
    qEmblem.position.set(0.12, 0.05, 0.05);
    qEmblem.rotation.z = Math.PI / 4;
    backDevice.add(qEmblem);

    // Vine tendrils (wing-like nature wisps from back)
    player._wingBlades = [];
    const tendrilPositions = [
        { x: -0.18, y: 0.15, angle: 0.45, length: 0.4 },
        { x: 0.18, y: 0.15, angle: -0.45, length: 0.4 },
        { x: -0.25, y: -0.05, angle: 0.7, length: 0.3 },
        { x: 0.25, y: -0.05, angle: -0.7, length: 0.3 },
    ];
    const tendrilMat = new THREE.MeshStandardMaterial({
        color: 0x44bb66, emissive: 0x22aa44, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.5,
    });
    for (const tp of tendrilPositions) {
        const tendril = new THREE.Group();
        for (let s = 0; s < 3; s++) {
            const segGeo = new THREE.BoxGeometry(0.012, tp.length * 0.28, 0.006);
            const seg = new THREE.Mesh(segGeo, tendrilMat);
            seg.position.y = s * tp.length * 0.25;
            seg.rotation.z = (Math.random() - 0.5) * 0.3;
            tendril.add(seg);
        }
        // Leaf tip
        const leafTipGeo = new THREE.BoxGeometry(0.025, 0.02, 0.003);
        const leafTip = new THREE.Mesh(leafTipGeo, natureGlowMat);
        leafTip.position.y = tp.length * 0.75;
        leafTip.rotation.z = Math.PI / 4;
        tendril.add(leafTip);

        tendril.position.set(tp.x, tp.y, 0);
        tendril.rotation.z = tp.angle;
        player._wingBlades.push(tendril);
        backDevice.add(tendril);
    }

    backDevice.position.set(0, 1.35, -0.2);
    player._backDevice = backDevice;
    g.add(backDevice);

    // ═══════════════════════════════════════════════════════════════
    // LEGS — Leather breeches with hide boots
    // ═══════════════════════════════════════════════════════════════
    const buildLeg = (sideSign) => {
        const legGroup = new THREE.Group();

        // Thigh
        const thighGeo = new THREE.CylinderGeometry(0.052, 0.062, 0.35, 8);
        const thigh = new THREE.Mesh(thighGeo, leatherMat);
        thigh.position.y = -0.17;
        legGroup.add(thigh);

        // Knee guard
        const kneeGeo = new THREE.SphereGeometry(0.052, 8, 8);
        const knee = new THREE.Mesh(kneeGeo, hideArmorMat);
        knee.position.y = -0.37;
        legGroup.add(knee);

        // Shin
        const shinGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.3, 8);
        const shin = new THREE.Mesh(shinGeo, leatherMat);
        shin.position.y = -0.55;
        legGroup.add(shin);

        // Shin guard (leather strap)
        const guardGeo = new THREE.BoxGeometry(0.06, 0.15, 0.025);
        const guard = new THREE.Mesh(guardGeo, hideArmorMat);
        guard.position.set(0, -0.5, 0.055);
        legGroup.add(guard);

        // Ranger boots — wrapped leather
        const bootGeo = new THREE.BoxGeometry(0.12, 0.12, 0.18);
        const bootMat = new THREE.MeshStandardMaterial({
            color: 0x1a1208, metalness: 0.2, roughness: 0.55, clearcoat: 0.2,
        });
        const boot = new THREE.Mesh(bootGeo, bootMat);
        boot.position.set(0, -0.72, 0.02);
        boot.castShadow = true;
        legGroup.add(boot);

        // Boot wraps
        for (let i = 0; i < 2; i++) {
            const wrapGeo = new THREE.TorusGeometry(0.055, 0.005, 4, 8);
            const wrap = new THREE.Mesh(wrapGeo, leatherLightMat);
            wrap.rotation.x = Math.PI / 2;
            wrap.position.set(0, -0.68 + i * 0.06, 0.02);
            legGroup.add(wrap);
        }

        const soleGeo = new THREE.BoxGeometry(0.13, 0.02, 0.2);
        const sole = new THREE.Mesh(soleGeo, new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 0.9 }));
        sole.position.set(0, -0.79, 0.02);
        legGroup.add(sole);

        const toeGeo = new THREE.SphereGeometry(0.035, 6, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const toe = new THREE.Mesh(toeGeo, bootMat);
        toe.rotation.x = Math.PI / 2;
        toe.position.set(0, -0.72, 0.11);
        legGroup.add(toe);

        legGroup.position.set(sideSign * 0.12, 0.78, 0);
        return legGroup;
    };

    parts.leftLeg = buildLeg(-1);
    g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1);
    g.add(parts.rightLeg);

    // ═══════════════════════════════════════════════════════════════
    // CAPE — Hooded cloak with leaf pattern
    // ═══════════════════════════════════════════════════════════════
    const capeMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a12, metalness: 0.05, roughness: 0.7,
        sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x2a4020),
        side: THREE.DoubleSide,
    });
    const capeGeo = new THREE.PlaneGeometry(0.6, 1.1, 6, 10);
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 1.05, -0.22);
    parts.cape = cape;
    g.add(cape);

    const capeInnerGeo = new THREE.PlaneGeometry(0.56, 1.06, 6, 10);
    player._capeInner = new THREE.Mesh(capeInnerGeo, fabricInnerMat);
    player._capeInner.position.set(0, 1.05, -0.215);
    g.add(player._capeInner);

    // Cape trim (vine glow)
    const capeTrimGeo = new THREE.PlaneGeometry(0.6, 0.02, 6, 1);
    player._capeTrim = new THREE.Mesh(capeTrimGeo, vineGlowMat);
    player._capeTrim.position.set(0, 0.51, -0.22);
    g.add(player._capeTrim);

    // ═══════════════════════════════════════════════════════════════
    // GROUND RUNE — Verdant sigil circle
    // ═══════════════════════════════════════════════════════════════
    const runeCircle = new THREE.Group();
    const outerGeo = new THREE.RingGeometry(0.65, 0.70, 48);
    runeCircle.add(new THREE.Mesh(outerGeo, vineGlowMat));
    const midGeo = new THREE.RingGeometry(0.48, 0.51, 48);
    runeCircle.add(new THREE.Mesh(midGeo, vineGlowMat));
    const innerGeo2 = new THREE.RingGeometry(0.3, 0.32, 48);
    runeCircle.add(new THREE.Mesh(innerGeo2, vineGlowMat));

    for (const mesh of runeCircle.children) mesh.rotation.x = -Math.PI / 2;

    // Leaf-shaped radial segments
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const segGeo = new THREE.BoxGeometry(0.015, 0.001, 0.12);
        const seg = new THREE.Mesh(segGeo, vineGlowMat);
        seg.position.set(Math.cos(angle) * 0.57, 0, Math.sin(angle) * 0.57);
        seg.rotation.y = angle;
        runeCircle.add(seg);
    }
    // Inner leaf symbols
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const leafSymGeo = new THREE.BoxGeometry(0.04, 0.001, 0.04);
        const leafSym = new THREE.Mesh(leafSymGeo, natureGemMat);
        leafSym.position.set(Math.cos(angle) * 0.2, 0.001, Math.sin(angle) * 0.2);
        leafSym.rotation.y = angle + Math.PI / 4;
        runeCircle.add(leafSym);
    }
    // Center glow
    const centerGeo = new THREE.CircleGeometry(0.06, 12);
    const centerMat = new THREE.MeshStandardMaterial({
        color: 0x33cc55, emissive: 0x22bb44, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.35,
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.002;
    runeCircle.add(center);

    runeCircle.position.y = 0.01;
    player._runeCircle = runeCircle;
    g.add(runeCircle);

    // ═══════════════════════════════════════════════════════════════
    // PARTICLES — Floating leaves & nature motes
    // ═══════════════════════════════════════════════════════════════
    player._aetherParticles = [];
    const pMats = [
        new THREE.MeshStandardMaterial({ color: 0x66ff88, emissive: 0x44dd66, emissiveIntensity: 2.0, transparent: true, opacity: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0x88ffaa, emissive: 0x66ee88, emissiveIntensity: 1.5, transparent: true, opacity: 0.6 }),
        new THREE.MeshStandardMaterial({ color: 0xccffdd, emissive: 0xaaeebb, emissiveIntensity: 2.5, transparent: true, opacity: 0.5 }),
    ];
    for (let i = 0; i < 10; i++) {
        // Alternate between motes (spheres) and tiny leaves (boxes)
        const isLeaf = i % 3 === 0;
        const pGeo = isLeaf
            ? new THREE.BoxGeometry(0.02, 0.012, 0.004)
            : new THREE.SphereGeometry(0.01, 6, 6);
        const p = new THREE.Mesh(pGeo, pMats[i % 3]);
        const angle = (i / 10) * Math.PI * 2;
        const radius = 0.25 + Math.random() * 0.45;
        const height = 0.3 + Math.random() * 1.4;
        p.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        player._aetherParticles.push({
            mesh: p, baseAngle: angle, radius, baseY: height,
            speed: 0.25 + Math.random() * 0.5, bobSpeed: 1.2 + Math.random() * 1.8,
            bobAmp: 0.04 + Math.random() * 0.08, phaseOffset: Math.random() * Math.PI * 2,
        });
        g.add(p);
    }

    // ═══════════════════════════════════════════════════════════════
    // SPIRIT WISP COMPANION — Floating nature sprite
    // ═══════════════════════════════════════════════════════════════
    const wispGroup = new THREE.Group();
    const wispCoreGeo = new THREE.SphereGeometry(0.05, 10, 10);
    const wispCoreMat = new THREE.MeshStandardMaterial({
        color: 0x88ffaa, emissive: 0x44ff66, emissiveIntensity: 2.5,
        transparent: true, opacity: 0.85,
    });
    wispGroup.add(new THREE.Mesh(wispCoreGeo, wispCoreMat));
    // Wisp glow shell
    const wispShellGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const wispShellMat = new THREE.MeshStandardMaterial({
        color: 0x55ff77, emissive: 0x33dd55, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.25, transmission: 0.4,
    });
    wispGroup.add(new THREE.Mesh(wispShellGeo, wispShellMat));
    // Tiny wings
    for (let side of [-1, 1]) {
        const wingGeo = new THREE.BoxGeometry(0.04, 0.03, 0.003);
        const wing = new THREE.Mesh(wingGeo, natureGlowMat);
        wing.position.set(side * 0.06, 0.01, -0.01);
        wing.rotation.z = side * 0.3;
        wispGroup.add(wing);
    }
    // Wisp light
    const wispLight = new THREE.Object3D(/* PointLight removed for perf */); //0x44ff66, 0.5, 3);
    wispGroup.add(wispLight);
    wispGroup.position.set(0.45, 0.5, -0.25);
    player._spiritWisp = wispGroup;
    g.add(wispGroup);

    // ═══════════════════════════════════════════════════════════════
    // LIGHTING
    // ═══════════════════════════════════════════════════════════════
    const mainLight = new THREE.Object3D(/* PointLight removed for perf */); //0x44dd66, 0.8, 6);
    mainLight.position.set(0, 1.4, 0.3);
    player._aetherLight = mainLight;
    g.add(mainLight);

    const backLight = new THREE.Object3D(/* PointLight removed for perf */); //0x33bb44, 0.3, 4);
    backLight.position.set(0, 1.5, -0.4);
    player._backLight = backLight;
    g.add(backLight);

    const rimLight = new THREE.Object3D(/* PointLight removed for perf */); //0x66aa77, 0.25, 5);
    rimLight.position.set(0, 2.5, 0);
    g.add(rimLight);
}


// ═══════════════════════════════════════════════════════════════════════
// DAWNKEEPER — Holy Cleric with cloth vestments, golden staff, sun halo
// Warm gold/white fabrics, divine radiance, sacred symbols, healing aura
// ═══════════════════════════════════════════════════════════════════════
export function buildDawnkeeperModel(player) {
    const g = player.group;
    const parts = player.parts;

    // ── Material Library ──
    const clothPrimaryMat = new THREE.MeshStandardMaterial({
        color: 0xfaf3e0, metalness: 0.05, roughness: 0.7,
        sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffe8b0),
    });
    const clothSecondaryMat = new THREE.MeshStandardMaterial({
        color: 0xd4a44a, metalness: 0.15, roughness: 0.55,
        sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffcc66),
    });
    const clothInnerMat = new THREE.MeshStandardMaterial({
        color: 0x2a2218, metalness: 0.05, roughness: 0.8,
        sheen: 0.2, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x443322),
        side: THREE.DoubleSide,
    });
    const holyGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffdd66, emissive: 0xddaa33, emissiveIntensity: 2.0,
        metalness: 0.5, roughness: 0.15, transparent: true, opacity: 0.95, transmission: 0.1,
    });
    const holyCoreMat = new THREE.MeshStandardMaterial({
        color: 0xfff0aa, emissive: 0xffcc44, emissiveIntensity: 3.0,
        transparent: true, opacity: 0.9,
    });
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xd4a44a, metalness: 0.92, roughness: 0.08,
        clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 1.0,
    });
    const darkGoldMat = new THREE.MeshStandardMaterial({
        color: 0x8a6d3b, metalness: 0.88, roughness: 0.12,
        clearcoat: 0.6, clearcoatRoughness: 0.1,
    });
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xc89a70, metalness: 0.0, roughness: 0.6,
        sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xeebb99),
    });
    const holyGemMat = new THREE.MeshStandardMaterial({
        color: 0xffee88, emissive: 0xddcc44, emissiveIntensity: 2.5,
        metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.92,
        iridescence: 0.6, iridescenceIOR: 1.6, transmission: 0.3, thickness: 0.3,
    });
    const staffWoodMat = new THREE.MeshStandardMaterial({
        color: 0x5a4020, metalness: 0.1, roughness: 0.5,
        sheen: 0.3, sheenColor: new THREE.Color(0x8a6d3b),
    });
    const hairMat = new THREE.MeshStandardMaterial({
        color: 0xe8d8c0, metalness: 0.08, roughness: 0.45,
        sheen: 0.8, sheenRoughness: 0.3, sheenColor: new THREE.Color(0xfff0dd),
    });

    player._aetherMats = [holyGlowMat, holyCoreMat, holyGemMat];
    player._aetherBaseEmissive = player._aetherMats.map(m => m.emissiveIntensity);

    // ═══════════════════════════════════════════════════════════════
    // TORSO — Layered priestly vestments with sacred embroidery
    // ═══════════════════════════════════════════════════════════════
    const torso = new THREE.Group();

    // Inner robe body
    const robeBodyGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.65, 10);
    const robeBody = new THREE.Mesh(robeBodyGeo, clothPrimaryMat);
    robeBody.scale.set(1.1, 1.0, 0.65);
    robeBody.castShadow = true;
    torso.add(robeBody);

    // Front stole (liturgical overlay)
    const stoleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    const stole = new THREE.Mesh(stoleGeo, clothSecondaryMat);
    stole.scale.set(1.05, 1.0, 0.5);
    stole.position.set(0, 0.0, 0.06);
    torso.add(stole);

    // Gold chain clasp across chest
    const claspGeo = new THREE.TorusGeometry(0.035, 0.01, 6, 12);
    for (let side of [-1, 1]) {
        const clasp = new THREE.Mesh(claspGeo, goldMat);
        clasp.position.set(side * 0.12, 0.14, 0.2);
        clasp.rotation.y = Math.PI / 2;
        torso.add(clasp);
    }
    // Chain between clasps
    const chainGeo = new THREE.TorusGeometry(0.14, 0.007, 6, 20, Math.PI * 0.6);
    const chain = new THREE.Mesh(chainGeo, goldMat);
    chain.position.set(0, 0.1, 0.2);
    chain.rotation.x = Math.PI * 0.15;
    torso.add(chain);

    // Sun pendant on chain
    const pendantGeo = new THREE.SphereGeometry(0.035, 10, 10);
    const pendant = new THREE.Mesh(pendantGeo, holyGemMat);
    pendant.position.set(0, 0.02, 0.22);
    torso.add(pendant);
    // Sun rays around pendant
    for (let i = 0; i < 8; i++) {
        const rayGeo = new THREE.BoxGeometry(0.008, 0.025, 0.005);
        const ray = new THREE.Mesh(rayGeo, holyGlowMat);
        const a = (i / 8) * Math.PI * 2;
        ray.position.set(
            Math.cos(a) * 0.05,
            0.02 + Math.sin(a) * 0.05,
            0.225
        );
        ray.rotation.z = a;
        torso.add(ray);
    }

    // Sacred embroidery lines
    for (let i = 0; i < 3; i++) {
        const embGeo = new THREE.BoxGeometry(0.16, 0.008, 0.008);
        const emb = new THREE.Mesh(embGeo, holyGlowMat);
        emb.position.set(0, -0.08 - i * 0.12, 0.2);
        torso.add(emb);
    }
    // Vertical gold trim lines
    for (let side of [-1, 1]) {
        const vTrimGeo = new THREE.BoxGeometry(0.008, 0.35, 0.008);
        const vTrim = new THREE.Mesh(vTrimGeo, holyGlowMat);
        vTrim.position.set(side * 0.08, -0.04, 0.2);
        torso.add(vTrim);
    }

    // Collar — high priestly neckline
    const collarGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.15, 10);
    const collar = new THREE.Mesh(collarGeo, clothSecondaryMat);
    collar.position.y = 0.38;
    torso.add(collar);

    // Collar flare (raised pieces)
    for (let side of [-1, 1]) {
        const flareGeo = new THREE.BoxGeometry(0.04, 0.18, 0.12);
        const flare = new THREE.Mesh(flareGeo, clothPrimaryMat);
        flare.position.set(side * 0.14, 0.4, -0.02);
        flare.rotation.z = side * -0.2;
        torso.add(flare);
    }

    // Gold shoulder brooches
    for (let side of [-1, 1]) {
        const broochGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const brooch = new THREE.Mesh(broochGeo, goldMat);
        brooch.position.set(side * 0.24, 0.25, 0.06);
        torso.add(brooch);
        const broochGemGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const broochGem = new THREE.Mesh(broochGemGeo, holyGemMat);
        broochGem.position.set(side * 0.24, 0.25, 0.1);
        torso.add(broochGem);
    }

    // Back panel
    const backGeo = new THREE.BoxGeometry(0.36, 0.5, 0.04);
    const back = new THREE.Mesh(backGeo, clothPrimaryMat);
    back.position.set(0, 0.02, -0.14);
    torso.add(back);

    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // ═══════════════════════════════════════════════════════════════
    // SHOULDER PADS — Ornate cloth with gold sun emblems
    // ═══════════════════════════════════════════════════════════════
    player._shoulderParts = [];
    for (let side of [-1, 1]) {
        const shoulderGroup = new THREE.Group();
        // Layered fabric shoulder
        const padGeo = new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const pad = new THREE.Mesh(padGeo, clothSecondaryMat);
        pad.scale.set(1.2, 0.8, 1.0);
        pad.castShadow = true;
        shoulderGroup.add(pad);

        // Gold trim ring
        const trimGeo = new THREE.TorusGeometry(0.14, 0.01, 6, 12, Math.PI);
        const trim = new THREE.Mesh(trimGeo, goldMat);
        trim.rotation.x = Math.PI / 2;
        trim.position.y = -0.02;
        shoulderGroup.add(trim);

        // Hanging gold fringe
        for (let f = 0; f < 3; f++) {
            const fringeGeo = new THREE.BoxGeometry(0.008, 0.08 + f * 0.02, 0.008);
            const fringe = new THREE.Mesh(fringeGeo, goldMat);
            fringe.position.set(side * 0.02 + (f - 1) * 0.04, -0.1, 0);
            shoulderGroup.add(fringe);
        }

        // Sun emblem on shoulder
        const sunGeo = new THREE.CircleGeometry(0.04, 12);
        const sun = new THREE.Mesh(sunGeo, holyGlowMat);
        sun.position.set(0, 0.02, 0.1);
        shoulderGroup.add(sun);

        shoulderGroup.position.set(side * 0.36, 1.45, 0);
        player._shoulderParts.push(shoulderGroup);
        g.add(shoulderGroup);
    }

    // ═══════════════════════════════════════════════════════════════
    // WAIST — Ornate sash with holy gem belt
    // ═══════════════════════════════════════════════════════════════
    const sashGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.1, 10);
    const sash = new THREE.Mesh(sashGeo, clothSecondaryMat);
    sash.scale.set(1.0, 1, 0.65);
    sash.position.y = 0.82;
    g.add(sash);

    // Belt cord
    const cordGeo = new THREE.TorusGeometry(0.22, 0.012, 6, 16);
    const cord = new THREE.Mesh(cordGeo, goldMat);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.82;
    g.add(cord);

    // Belt gem
    const beltGemGeo = new THREE.OctahedronGeometry(0.03, 1);
    const beltGem = new THREE.Mesh(beltGemGeo, holyGemMat);
    beltGem.position.set(0, 0.82, 0.2);
    g.add(beltGem);

    // Hanging sash tails
    for (let side of [-1, 1]) {
        const tailGeo = new THREE.PlaneGeometry(0.09, 0.4, 1, 4);
        const tail = new THREE.Mesh(tailGeo, clothSecondaryMat);
        tail.position.set(side * 0.08, 0.55, 0.16);
        tail.rotation.y = side * 0.2;
        g.add(tail);
    }

    // Front robe skirt (long flowing)
    const frontSkirtGeo = new THREE.PlaneGeometry(0.34, 0.6, 3, 6);
    const frontSkirt = new THREE.Mesh(frontSkirtGeo, clothPrimaryMat);
    frontSkirt.position.set(0, 0.48, 0.16);
    g.add(frontSkirt);
    player._frontTabard = frontSkirt;

    // Gold embroidery on skirt
    for (let i = 0; i < 2; i++) {
        const embGeo = new THREE.BoxGeometry(0.22, 0.008, 0.005);
        const emb = new THREE.Mesh(embGeo, holyGlowMat);
        emb.position.set(0, 0.38 - i * 0.15, 0.165);
        g.add(emb);
    }

    // ═══════════════════════════════════════════════════════════════
    // HEAD — Serene face, platinum blonde hair, sacred circlet
    // ═══════════════════════════════════════════════════════════════
    const headGroup = new THREE.Group();

    // Base head
    const headGeo = new THREE.SphereGeometry(0.15, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(0.85, 1.0, 0.9);
    head.castShadow = true;
    headGroup.add(head);

    // Jaw
    const jawGeo = new THREE.BoxGeometry(0.18, 0.08, 0.16);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.position.set(0, -0.12, 0.02);
    headGroup.add(jaw);

    // Chin
    const chinGeo = new THREE.SphereGeometry(0.032, 6, 6);
    const chin = new THREE.Mesh(chinGeo, skinMat);
    chin.position.set(0, -0.14, 0.06);
    headGroup.add(chin);

    // Glowing golden eyes
    for (let side of [-1, 1]) {
        const socketGeo = new THREE.SphereGeometry(0.026, 8, 8);
        const socket = new THREE.Mesh(socketGeo, new THREE.MeshStandardMaterial({ color: 0x1a1508, roughness: 0.9 }));
        socket.position.set(side * 0.055, 0.02, 0.11);
        socket.scale.set(1.2, 0.6, 0.5);
        headGroup.add(socket);

        const irisGeo = new THREE.SphereGeometry(0.013, 8, 8);
        const iris = new THREE.Mesh(irisGeo, holyGlowMat);
        iris.position.set(side * 0.055, 0.02, 0.13);
        headGroup.add(iris);

        const browGeo = new THREE.BoxGeometry(0.05, 0.012, 0.016);
        const brow = new THREE.Mesh(browGeo, skinMat);
        brow.position.set(side * 0.055, 0.05, 0.11);
        brow.rotation.z = side * -0.1;
        headGroup.add(brow);
    }

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.02, 0.04, 0.03);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.02, 0.13);
    headGroup.add(nose);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.04, 0.004, 0.008);
    const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.8 }));
    mouth.position.set(0, -0.07, 0.11);
    headGroup.add(mouth);

    // Ears
    for (let side of [-1, 1]) {
        const earGeo = new THREE.SphereGeometry(0.018, 6, 6);
        const ear = new THREE.Mesh(earGeo, skinMat);
        ear.scale.set(0.5, 1, 0.7);
        ear.position.set(side * 0.13, 0.0, 0.02);
        headGroup.add(ear);
    }

    // Platinum blonde hair — swept back, shorter and regal
    const hairMainGeo = new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairMain = new THREE.Mesh(hairMainGeo, hairMat);
    hairMain.position.set(0, 0.06, -0.02);
    hairMain.scale.set(1.05, 1.0, 1.1);
    headGroup.add(hairMain);

    // Hair strands
    for (let i = 0; i < 5; i++) {
        const w = 0.04 + Math.random() * 0.01;
        const strandGeo = new THREE.BoxGeometry(w, 0.03 + i * 0.01, 0.08 + i * 0.015);
        const strand = new THREE.Mesh(strandGeo, hairMat);
        strand.position.set((i - 2) * 0.04, 0.06 - i * 0.025, -0.14 - i * 0.012);
        strand.rotation.x = 0.15 + i * 0.03;
        headGroup.add(strand);
    }

    // Side locks
    for (let side of [-1, 1]) {
        const lockGeo = new THREE.BoxGeometry(0.03, 0.1, 0.05);
        const lock = new THREE.Mesh(lockGeo, hairMat);
        lock.position.set(side * 0.12, -0.03, 0.0);
        lock.rotation.z = side * 0.12;
        headGroup.add(lock);
    }

    // ── Sacred Circlet ──
    const circletGeo = new THREE.TorusGeometry(0.17, 0.008, 6, 24);
    const circlet = new THREE.Mesh(circletGeo, goldMat);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.set(0, 0.1, 0.02);
    headGroup.add(circlet);

    // Circlet center gem
    const circletGemGeo = new THREE.OctahedronGeometry(0.025, 1);
    const circletGem = new THREE.Mesh(circletGemGeo, holyGemMat);
    circletGem.position.set(0, 0.1, 0.14);
    headGroup.add(circletGem);

    // ── Floating Sun Halo ──
    const haloGroup = new THREE.Group();
    const haloRingGeo = new THREE.TorusGeometry(0.26, 0.014, 8, 32);
    const haloRing = new THREE.Mesh(haloRingGeo, holyGlowMat);
    haloRing.rotation.x = Math.PI / 2;
    haloGroup.add(haloRing);
    // Halo inner ring
    const haloInnerGeo = new THREE.TorusGeometry(0.19, 0.007, 6, 24);
    const haloInner = new THREE.Mesh(haloInnerGeo, holyCoreMat);
    haloInner.rotation.x = Math.PI / 2;
    haloGroup.add(haloInner);
    // Sun ray nodes on halo
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const rayGeo = new THREE.BoxGeometry(0.015, 0.001, 0.06);
        const ray = new THREE.Mesh(rayGeo, holyGlowMat);
        ray.position.set(Math.cos(angle) * 0.26, 0, Math.sin(angle) * 0.26);
        ray.rotation.y = angle;
        haloGroup.add(ray);
    }
    haloGroup.position.y = 0.32;
    headGroup.add(haloGroup);
    player._voidHalo = haloGroup; // Reuse same animation hook as Voidweaver

    headGroup.position.y = 1.72;
    parts.head = headGroup;
    g.add(headGroup);

    // ═══════════════════════════════════════════════════════════════
    // LEFT ARM — Spell hand with holy orb
    // ═══════════════════════════════════════════════════════════════
    const leftArmGroup = new THREE.Group();

    // Robed upper arm
    const lUpperGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.32, 8);
    const lUpper = new THREE.Mesh(lUpperGeo, clothPrimaryMat);
    lUpper.position.y = -0.16;
    leftArmGroup.add(lUpper);

    // Elbow
    const lElbowGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const lElbow = new THREE.Mesh(lElbowGeo, clothSecondaryMat);
    lElbow.position.y = -0.32;
    leftArmGroup.add(lElbow);

    // Forearm sleeve (wide, flowing)
    const lForeGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.28, 8);
    const lFore = new THREE.Mesh(lForeGeo, clothPrimaryMat);
    lFore.position.y = -0.46;
    leftArmGroup.add(lFore);

    // Sleeve opening trim
    const sleeveTrimGeo = new THREE.TorusGeometry(0.068, 0.006, 6, 12);
    const sleeveTrim = new THREE.Mesh(sleeveTrimGeo, holyGlowMat);
    sleeveTrim.rotation.x = Math.PI / 2;
    sleeveTrim.position.y = -0.6;
    leftArmGroup.add(sleeveTrim);

    // Hand
    const lHandGeo = new THREE.BoxGeometry(0.07, 0.06, 0.06);
    const lHand = new THREE.Mesh(lHandGeo, skinMat);
    lHand.position.y = -0.63;
    leftArmGroup.add(lHand);

    // Fingers
    for (let f = 0; f < 4; f++) {
        const fGeo = new THREE.BoxGeometry(0.012, 0.035, 0.012);
        const finger = new THREE.Mesh(fGeo, skinMat);
        finger.position.set(-0.02 + f * 0.014, -0.67, 0.02);
        leftArmGroup.add(finger);
    }

    // ── Holy Radiance Orb (channeling divine energy) ──
    const orbGroup = new THREE.Group();
    const orbCoreGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const orbCore = new THREE.Mesh(orbCoreGeo, holyCoreMat);
    orbGroup.add(orbCore);

    const orbShellGeo = new THREE.SphereGeometry(0.08, 14, 14);
    const orbShellMat = new THREE.MeshStandardMaterial({
        color: 0xddaa33, emissive: 0xcc9922, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.4, transmission: 0.3,
    });
    const orbShell = new THREE.Mesh(orbShellGeo, orbShellMat);
    orbGroup.add(orbShell);

    const orbOuterGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const orbOuterMat = new THREE.MeshStandardMaterial({
        color: 0xaa8822, emissive: 0x886611, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.15, transmission: 0.5,
    });
    orbGroup.add(new THREE.Mesh(orbOuterGeo, orbOuterMat));

    // Three orbiting divine rings
    const r1Geo = new THREE.TorusGeometry(0.14, 0.006, 6, 20);
    const r1 = new THREE.Mesh(r1Geo, holyGlowMat);
    orbGroup.add(r1);
    player._arcaneRing = r1;

    const r2Geo = new THREE.TorusGeometry(0.12, 0.005, 6, 18);
    const r2Mat = new THREE.MeshStandardMaterial({
        color: 0xffcc66, emissive: 0xddaa44, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.7,
    });
    const r2 = new THREE.Mesh(r2Geo, r2Mat);
    r2.rotation.x = Math.PI / 2;
    orbGroup.add(r2);
    player._arcaneRing2 = r2;

    const r3Geo = new THREE.TorusGeometry(0.1, 0.004, 6, 16);
    const r3 = new THREE.Mesh(r3Geo, holyCoreMat);
    r3.rotation.z = Math.PI / 3;
    orbGroup.add(r3);
    player._arcaneRing3 = r3;

    orbGroup.position.set(0, -0.78, 0.12);
    player._arcaneOrb = orbGroup;
    leftArmGroup.add(orbGroup);

    const orbLight = new THREE.Object3D(/* PointLight removed for perf */); //0xffcc44, 0.8, 3);
    orbLight.position.copy(orbGroup.position);
    player._orbLight = orbLight;
    leftArmGroup.add(orbLight);

    leftArmGroup.position.set(-0.38, 1.35, 0);
    parts.leftArm = leftArmGroup;
    g.add(leftArmGroup);

    // ═══════════════════════════════════════════════════════════════
    // RIGHT ARM — Golden Holy Staff
    // ═══════════════════════════════════════════════════════════════
    const rightArmGroup = new THREE.Group();

    // Robed upper arm
    const rUpperGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.32, 8);
    const rUpper = new THREE.Mesh(rUpperGeo, clothPrimaryMat);
    rUpper.position.y = -0.16;
    rightArmGroup.add(rUpper);

    // Elbow
    const rElbowGeo = new THREE.SphereGeometry(0.048, 8, 8);
    const rElbow = new THREE.Mesh(rElbowGeo, clothSecondaryMat);
    rElbow.position.y = -0.32;
    rightArmGroup.add(rElbow);

    // Forearm (tighter sleeve for grip)
    const rForeGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.28, 8);
    const rFore = new THREE.Mesh(rForeGeo, clothPrimaryMat);
    rFore.position.y = -0.46;
    rightArmGroup.add(rFore);

    // Gauntlet
    const rHandGeo = new THREE.BoxGeometry(0.07, 0.06, 0.06);
    const rHand = new THREE.Mesh(rHandGeo, darkGoldMat);
    rHand.position.y = -0.64;
    rightArmGroup.add(rHand);

    // ── GOLDEN HOLY STAFF ──
    const staffGroup = new THREE.Group();

    // Staff shaft — warm wood
    const shaftGeo = new THREE.CylinderGeometry(0.02, 0.024, 1.6, 8);
    const shaft = new THREE.Mesh(shaftGeo, staffWoodMat);
    shaft.position.y = 0.3;
    staffGroup.add(shaft);

    // Gold spiral wraps
    for (let i = 0; i < 10; i++) {
        const wrapGeo = new THREE.TorusGeometry(0.025, 0.004, 4, 8);
        const wrap = new THREE.Mesh(wrapGeo, goldMat);
        wrap.position.y = -0.3 + i * 0.18;
        wrap.rotation.x = Math.PI / 2;
        wrap.rotation.z = i * 0.3;
        staffGroup.add(wrap);
    }

    // Staff head — ornate golden sun cradle
    const cradleGeo = new THREE.TorusGeometry(0.07, 0.014, 6, 8);
    const cradle = new THREE.Mesh(cradleGeo, goldMat);
    cradle.position.y = 1.12;
    staffGroup.add(cradle);

    // Staff head prongs (sun rays)
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const prongGeo = new THREE.ConeGeometry(0.01, 0.1, 5);
        const prong = new THREE.Mesh(prongGeo, goldMat);
        prong.position.set(Math.cos(angle) * 0.06, 1.18, Math.sin(angle) * 0.06);
        prong.rotation.z = Math.cos(angle) * 0.35;
        prong.rotation.x = -Math.sin(angle) * 0.35;
        staffGroup.add(prong);
    }

    // Sun crystal atop staff
    const crystalGeo = new THREE.OctahedronGeometry(0.06, 1);
    const crystal = new THREE.Mesh(crystalGeo, holyGemMat);
    crystal.position.y = 1.22;
    staffGroup.add(crystal);

    // Crystal glow shell
    const crystalGlowGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const crystalGlowMat = new THREE.MeshStandardMaterial({
        color: 0xddaa33, emissive: 0xcc9922, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.2, transmission: 0.4,
    });
    staffGroup.add(new THREE.Mesh(crystalGlowGeo, crystalGlowMat));
    staffGroup.children[staffGroup.children.length - 1].position.y = 1.22;

    // Staff bottom cap
    const capGeo = new THREE.ConeGeometry(0.028, 0.06, 6);
    const cap = new THREE.Mesh(capGeo, goldMat);
    cap.position.y = -0.52;
    cap.rotation.x = Math.PI;
    staffGroup.add(cap);

    // Staff point light
    const staffLight = new THREE.Object3D(/* PointLight removed for perf */); //0xffcc44, 0.6, 3);
    staffLight.position.y = 1.22;
    player._swordLight = staffLight;
    staffGroup.add(staffLight);

    // Blade sparks (holy motes on staff head)
    player._bladeSparks = [];
    for (let i = 0; i < 4; i++) {
        const sparkG = new THREE.Group();
        for (let s = 0; s < 3; s++) {
            const segGeo = new THREE.BoxGeometry(0.004, 0.04, 0.004);
            const seg = new THREE.Mesh(segGeo, holyGlowMat);
            seg.position.set(
                (Math.random() - 0.5) * 0.08,
                1.12 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.08
            );
            seg.rotation.z = (Math.random() - 0.5) * 1.5;
            sparkG.add(seg);
        }
        staffGroup.add(sparkG);
        player._bladeSparks.push(sparkG);
    }

    staffGroup.position.y = -0.7;
    staffGroup.rotation.x = -0.15;
    rightArmGroup.add(staffGroup);
    parts.sword = staffGroup;

    rightArmGroup.position.set(0.38, 1.35, 0);
    parts.rightArm = rightArmGroup;
    g.add(rightArmGroup);

    // ═══════════════════════════════════════════════════════════════
    // BACK — Floating Sacred Tome + Divine Wings of Light
    // ═══════════════════════════════════════════════════════════════
    const backDevice = new THREE.Group();

    // Floating sacred tome
    const bookGroup = new THREE.Group();
    const coverGeo = new THREE.BoxGeometry(0.18, 0.24, 0.04);
    const coverMat = new THREE.MeshStandardMaterial({
        color: 0x5a4020, metalness: 0.3, roughness: 0.4, clearcoat: 0.5,
    });
    bookGroup.add(new THREE.Mesh(coverGeo, coverMat));

    // Book spine
    const spineGeo = new THREE.BoxGeometry(0.04, 0.24, 0.05);
    const spine = new THREE.Mesh(spineGeo, darkGoldMat);
    spine.position.set(-0.11, 0, 0);
    bookGroup.add(spine);

    // Book emblem (sun cross)
    const bookEmblemGeo = new THREE.BoxGeometry(0.06, 0.06, 0.005);
    const bookEmblem = new THREE.Mesh(bookEmblemGeo, holyGlowMat);
    bookEmblem.position.set(0, 0, 0.025);
    bookEmblem.rotation.z = Math.PI / 4;
    bookGroup.add(bookEmblem);
    // Cross overlay
    const crossHGeo = new THREE.BoxGeometry(0.06, 0.015, 0.006);
    const crossH = new THREE.Mesh(crossHGeo, holyGlowMat);
    crossH.position.set(0, 0, 0.028);
    bookGroup.add(crossH);
    const crossVGeo = new THREE.BoxGeometry(0.015, 0.06, 0.006);
    const crossV = new THREE.Mesh(crossVGeo, holyGlowMat);
    crossV.position.set(0, 0, 0.028);
    bookGroup.add(crossV);

    // Book gem
    const bookGemGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const bookGem = new THREE.Mesh(bookGemGeo, holyGemMat);
    bookGem.position.set(0, 0, 0.035);
    bookGroup.add(bookGem);

    // Pages
    const pagesGeo = new THREE.BoxGeometry(0.16, 0.22, 0.025);
    const pagesMat = new THREE.MeshStandardMaterial({ color: 0xeee8d0, roughness: 0.9 });
    bookGroup.add(new THREE.Mesh(pagesGeo, pagesMat));
    bookGroup.children[bookGroup.children.length - 1].position.set(0.01, 0, 0);

    bookGroup.rotation.set(0.3, 0.8, 0.1);
    bookGroup.position.set(0.2, 0.1, 0);
    backDevice.add(bookGroup);
    player._floatingGrimoire = bookGroup;

    // Divine light wisps (wing-like projections)
    player._wingBlades = [];
    const wispPositions = [
        { x: -0.15, y: 0.15, angle: 0.4, length: 0.5 },
        { x: 0.15, y: 0.15, angle: -0.4, length: 0.5 },
        { x: -0.25, y: -0.05, angle: 0.7, length: 0.38 },
        { x: 0.25, y: -0.05, angle: -0.7, length: 0.38 },
    ];
    const wispMat = new THREE.MeshStandardMaterial({
        color: 0xffdd66, emissive: 0xddaa33, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.45,
    });
    for (const wp of wispPositions) {
        const wisp = new THREE.Group();
        for (let s = 0; s < 4; s++) {
            const segGeo = new THREE.BoxGeometry(0.015, wp.length * 0.25, 0.008);
            const seg = new THREE.Mesh(segGeo, wispMat);
            seg.position.y = s * wp.length * 0.22;
            seg.rotation.z = (Math.random() - 0.5) * 0.3;
            wisp.add(seg);
        }
        // Tip orb
        const tipGeo = new THREE.SphereGeometry(0.018, 6, 6);
        const tip = new THREE.Mesh(tipGeo, holyGemMat);
        tip.position.y = wp.length * 0.85;
        wisp.add(tip);

        wisp.position.set(wp.x, wp.y, 0);
        wisp.rotation.z = wp.angle;
        player._wingBlades.push(wisp);
        backDevice.add(wisp);
    }

    backDevice.position.set(0, 1.35, -0.22);
    player._backDevice = backDevice;
    g.add(backDevice);

    // ═══════════════════════════════════════════════════════════════
    // LEGS — Robed legs with gold-trimmed sandals
    // ═══════════════════════════════════════════════════════════════
    const buildLeg = (sideSign) => {
        const legGroup = new THREE.Group();

        // Thigh (hidden under robe)
        const thighGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.35, 8);
        const thigh = new THREE.Mesh(thighGeo, clothPrimaryMat);
        thigh.position.y = -0.17;
        legGroup.add(thigh);

        // Knee
        const kneeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const knee = new THREE.Mesh(kneeGeo, clothPrimaryMat);
        knee.position.y = -0.37;
        legGroup.add(knee);

        // Shin
        const shinGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.3, 8);
        const shin = new THREE.Mesh(shinGeo, clothPrimaryMat);
        shin.position.y = -0.55;
        legGroup.add(shin);

        // Gold-trimmed sandals
        const bootGeo = new THREE.BoxGeometry(0.12, 0.1, 0.18);
        const bootMat = new THREE.MeshStandardMaterial({
            color: 0x3a2a18, metalness: 0.2, roughness: 0.55, clearcoat: 0.2,
        });
        const boot = new THREE.Mesh(bootGeo, bootMat);
        boot.position.set(0, -0.74, 0.02);
        boot.castShadow = true;
        legGroup.add(boot);

        // Gold strap
        const strapGeo = new THREE.TorusGeometry(0.055, 0.005, 4, 8);
        const strap = new THREE.Mesh(strapGeo, goldMat);
        strap.rotation.x = Math.PI / 2;
        strap.position.set(0, -0.7, 0.02);
        legGroup.add(strap);

        const soleGeo = new THREE.BoxGeometry(0.13, 0.02, 0.2);
        const sole = new THREE.Mesh(soleGeo, new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.9 }));
        sole.position.set(0, -0.8, 0.02);
        legGroup.add(sole);

        const toeGeo = new THREE.SphereGeometry(0.035, 6, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const toe = new THREE.Mesh(toeGeo, bootMat);
        toe.rotation.x = Math.PI / 2;
        toe.position.set(0, -0.74, 0.11);
        legGroup.add(toe);

        legGroup.position.set(sideSign * 0.12, 0.78, 0);
        return legGroup;
    };

    parts.leftLeg = buildLeg(-1);
    g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1);
    g.add(parts.rightLeg);

    // ═══════════════════════════════════════════════════════════════
    // CAPE — Flowing white-gold priestly mantle
    // ═══════════════════════════════════════════════════════════════
    const capeMat = new THREE.MeshStandardMaterial({
        color: 0xfaf3e0, metalness: 0.05, roughness: 0.7,
        sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffe8b0),
        side: THREE.DoubleSide,
    });
    const capeGeo = new THREE.PlaneGeometry(0.65, 1.15, 6, 10);
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 1.05, -0.22);
    parts.cape = cape;
    g.add(cape);

    const capeInnerGeo = new THREE.PlaneGeometry(0.61, 1.11, 6, 10);
    player._capeInner = new THREE.Mesh(capeInnerGeo, clothInnerMat);
    player._capeInner.position.set(0, 1.05, -0.215);
    g.add(player._capeInner);

    // Cape trim glow
    const capeTrimGeo = new THREE.PlaneGeometry(0.65, 0.02, 6, 1);
    player._capeTrim = new THREE.Mesh(capeTrimGeo, holyGlowMat);
    player._capeTrim.position.set(0, 0.48, -0.22);
    g.add(player._capeTrim);

    // ═══════════════════════════════════════════════════════════════
    // GROUND RUNE — Sacred sun sigil circle
    // ═══════════════════════════════════════════════════════════════
    const runeCircle = new THREE.Group();
    const outerGeo = new THREE.RingGeometry(0.70, 0.76, 48);
    runeCircle.add(new THREE.Mesh(outerGeo, holyGlowMat));
    const midGeo = new THREE.RingGeometry(0.52, 0.55, 48);
    runeCircle.add(new THREE.Mesh(midGeo, holyGlowMat));
    const innerGeo = new THREE.RingGeometry(0.33, 0.35, 48);
    runeCircle.add(new THREE.Mesh(innerGeo, holyGlowMat));

    for (const mesh of runeCircle.children) mesh.rotation.x = -Math.PI / 2;

    // Sun ray segments
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const segGeo = new THREE.BoxGeometry(0.014, 0.001, 0.14);
        const seg = new THREE.Mesh(segGeo, holyGlowMat);
        seg.position.set(Math.cos(angle) * 0.61, 0, Math.sin(angle) * 0.61);
        seg.rotation.y = angle;
        runeCircle.add(seg);
    }
    // Inner sun cross symbols
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const symGeo = new THREE.BoxGeometry(0.04, 0.001, 0.12);
        const sym = new THREE.Mesh(symGeo, holyGemMat);
        sym.position.set(Math.cos(angle) * 0.15, 0.001, Math.sin(angle) * 0.15);
        sym.rotation.y = angle;
        runeCircle.add(sym);
    }
    const centerGeo = new THREE.CircleGeometry(0.08, 16);
    const centerMat = new THREE.MeshStandardMaterial({
        color: 0xddaa33, emissive: 0xcc9922, emissiveIntensity: 1.5,
        transparent: true, opacity: 0.4,
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.002;
    runeCircle.add(center);

    runeCircle.position.y = 0.01;
    player._runeCircle = runeCircle;
    g.add(runeCircle);

    // ═══════════════════════════════════════════════════════════════
    // PARTICLES — Holy motes
    // ═══════════════════════════════════════════════════════════════
    player._aetherParticles = [];
    const pGeo = new THREE.SphereGeometry(0.012, 6, 6);
    const pMats = [
        new THREE.MeshStandardMaterial({ color: 0xffdd66, emissive: 0xddaa33, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 }),
        new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xeedd66, emissiveIntensity: 2.0, transparent: true, opacity: 0.6 }),
        new THREE.MeshStandardMaterial({ color: 0xfffff0, emissive: 0xffeedd, emissiveIntensity: 3.0, transparent: true, opacity: 0.5 }),
    ];
    for (let i = 0; i < 12; i++) {
        const p = new THREE.Mesh(pGeo, pMats[i % 3]);
        const angle = (i / 12) * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.5;
        const height = 0.3 + Math.random() * 1.5;
        p.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        player._aetherParticles.push({
            mesh: p, baseAngle: angle, radius, baseY: height,
            speed: 0.3 + Math.random() * 0.6, bobSpeed: 1.5 + Math.random() * 2.0,
            bobAmp: 0.05 + Math.random() * 0.1, phaseOffset: Math.random() * Math.PI * 2,
        });
        g.add(p);
    }

    // ═══════════════════════════════════════════════════════════════
    // LIGHTING
    // ═══════════════════════════════════════════════════════════════
    const mainLight = new THREE.Object3D(/* PointLight removed for perf */); //0xffcc44, 1.0, 6);
    mainLight.position.set(0, 1.4, 0.3);
    player._aetherLight = mainLight;
    g.add(mainLight);

    const backLight = new THREE.Object3D(/* PointLight removed for perf */); //0xddaa33, 0.4, 4);
    backLight.position.set(0, 1.5, -0.4);
    player._backLight = backLight;
    g.add(backLight);

    const rimLight2 = new THREE.Object3D(/* PointLight removed for perf */); //0xaa8855, 0.3, 5);
    rimLight2.position.set(0, 2.5, 0);
    g.add(rimLight2);
}