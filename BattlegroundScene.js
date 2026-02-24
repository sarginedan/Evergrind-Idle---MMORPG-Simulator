// ══════════════════════════════════════════════════════════════════════
// BATTLEGROUND SCENE — 3D Arena Renderer for PvP Battlegrounds
// Lightweight class-styled character models for all 20 combatants.
// Player walks around as a visible participant.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { gameState } from './GameState.js';
import { battlegroundSystem } from './BattlegroundSystem.js';

// ── Helper: quick mesh ──
function _m(geo, mat, x, y, z) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
}

// ══════════════════════════════════════════════════════════════════════
// LIGHTWEIGHT CLASS CHARACTER BUILDERS
// These are simplified but visually distinct per-class models
// designed to be performant at 20 simultaneous instances.
// ══════════════════════════════════════════════════════════════════════

function _buildWarrior(g, parts) {
    const armor = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, metalness: 0.85, roughness: 0.15 });
    const armorLt = new THREE.MeshStandardMaterial({ color: 0x2a3d62, metalness: 0.8, roughness: 0.2 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xb0c0d0, metalness: 0.9, roughness: 0.1 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x55eeff, emissive: 0x33bbdd, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 });
    const cape = new THREE.MeshStandardMaterial({ color: 0x0a1a3a, roughness: 0.7, side: THREE.DoubleSide });

    // Torso
    const torso = new THREE.Group();
    torso.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.65, 8), armor));
    torso.children[0].scale.set(1.1, 1, 0.65);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.12, 8), armorLt);
    collar.position.y = 0.36;
    torso.add(collar);
    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // Shoulders
    for (const side of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), armorLt);
        sg.scale.set(1.2, 0.8, 1.0);
        sg.position.set(side * 0.36, 1.45, 0);
        g.add(sg);
    }

    // Head
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), skin));
    head.children[0].scale.set(0.85, 1.0, 0.9);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), armor);
    helmet.position.set(0, 0.04, -0.02);
    head.add(helmet);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.02), glow);
    visor.position.set(0, 0.02, 0.14);
    head.add(visor);
    head.position.y = 1.72;
    parts.head = head;
    g.add(head);

    // Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.1, 8), armorLt);
    belt.scale.set(1, 1, 0.65);
    belt.position.y = 0.82;
    g.add(belt);

    // Arms
    const buildArm = (s) => {
        const ag = new THREE.Group();
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.32, 6), armor));
        ag.children[0].position.y = -0.16;
        ag.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), armorLt));
        ag.children[1].position.y = -0.32;
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.28, 6), armor));
        ag.children[2].position.y = -0.46;
        ag.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), silver));
        ag.children[3].position.y = -0.64;
        ag.position.set(s * 0.38, 1.35, 0);
        return ag;
    };
    parts.leftArm = buildArm(-1); g.add(parts.leftArm);
    parts.rightArm = buildArm(1); g.add(parts.rightArm);

    // Sword
    const sw = new THREE.Group();
    sw.add(_m(new THREE.BoxGeometry(0.04, 0.9, 0.015), silver, 0, 0.2, 0));
    sw.add(_m(new THREE.BoxGeometry(0.025, 0.85, 0.008), glow, 0, 0.22, 0));
    sw.add(_m(new THREE.BoxGeometry(0.14, 0.03, 0.03), silver, 0, -0.25, 0));
    sw.position.y = -0.7; sw.rotation.x = -0.15;
    parts.rightArm.add(sw);

    // Shield
    const sh = new THREE.Group();
    sh.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.04), armor));
    sh.position.set(0, -0.55, 0.15);
    parts.leftArm.add(sh);

    // Legs
    const buildLeg = (s) => {
        const lg = new THREE.Group();
        lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.35, 6), armor));
        lg.children[0].position.y = -0.17;
        lg.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), armorLt));
        lg.children[1].position.y = -0.37;
        lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6), armor));
        lg.children[2].position.y = -0.55;
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.18), armor);
        boot.position.set(0, -0.74, 0.02);
        lg.add(boot);
        lg.position.set(s * 0.12, 0.78, 0);
        return lg;
    };
    parts.leftLeg = buildLeg(-1); g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1); g.add(parts.rightLeg);

    // Cape
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1, 4, 6), cape);
    cp.position.set(0, 1.05, -0.22);
    parts.cape = cp;
    g.add(cp);
}

function _buildMage(g, parts) {
    const robe = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.7 });
    const robeSec = new THREE.MeshStandardMaterial({ color: 0x2a1548, roughness: 0.6 });
    const vGlow = new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0x8844cc, emissiveIntensity: 1.8, transparent: true, opacity: 0.9 });
    const silver = new THREE.MeshStandardMaterial({ color: 0x9090a8, metalness: 0.9, roughness: 0.1 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xa08070, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0d0518, roughness: 0.8, side: THREE.DoubleSide });

    // Torso (robed)
    const torso = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.6, 8), robe);
    chest.scale.set(1.0, 1.0, 0.6);
    torso.add(chest);
    // Robe inner
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.5, 8, 1, false, -Math.PI * 0.35, Math.PI * 0.7), robeSec);
    inner.scale.set(1.0, 1.0, 0.5);
    inner.position.z = 0.04;
    torso.add(inner);
    // Chest gem
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), vGlow);
    gem.position.set(0, 0.15, 0.16);
    torso.add(gem);
    // High collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 8), robeSec);
    collar.position.y = 0.38;
    torso.add(collar);
    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // Head
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skin));
    // Hood
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.65), robe);
    hood.position.set(0, 0.03, -0.03);
    head.add(hood);
    // Eyes glow
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), vGlow);
    eyeL.position.set(-0.05, 0.02, 0.12);
    head.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.05; head.add(eyeR);
    head.position.y = 1.72;
    parts.head = head;
    g.add(head);

    // Shoulders (arcane pads)
    for (const side of [-1, 1]) {
        const sp = new THREE.Group();
        sp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.12, 6), robeSec));
        const spGem = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), vGlow);
        spGem.position.y = 0.08;
        sp.add(spGem);
        sp.position.set(side * 0.32, 1.48, 0);
        g.add(sp);
    }

    // Arms
    const buildArm = (s) => {
        const ag = new THREE.Group();
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), robe));
        ag.children[0].position.y = -0.15;
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.26, 6), robeSec));
        ag.children[1].position.y = -0.42;
        ag.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skin));
        ag.children[2].position.y = -0.58;
        ag.position.set(s * 0.32, 1.35, 0);
        return ag;
    };
    parts.leftArm = buildArm(-1); g.add(parts.leftArm);
    parts.rightArm = buildArm(1); g.add(parts.rightArm);

    // Staff on right arm
    const staff = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 6), silver);
    pole.position.y = 0.5;
    staff.add(pole);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), vGlow);
    orb.position.y = 1.45;
    staff.add(orb);
    staff.position.y = -0.65;
    staff.rotation.x = -0.1;
    parts.rightArm.add(staff);

    // Robe skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.35, 0.75, 8), robe);
    skirt.position.y = 0.45;
    g.add(skirt);

    // Legs (hidden under robe, simplified)
    const buildLeg = (s) => {
        const lg = new THREE.Group();
        lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 6), dark));
        lg.children[0].position.y = -0.17;
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), robeSec);
        boot.position.set(0, -0.38, 0.01);
        lg.add(boot);
        lg.position.set(s * 0.1, 0.45, 0);
        return lg;
    };
    parts.leftLeg = buildLeg(-1); g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1); g.add(parts.rightLeg);
}

function _buildRanger(g, parts) {
    const leather = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: 0.65 });
    const leatherLt = new THREE.MeshStandardMaterial({ color: 0x3d2a18, roughness: 0.6 });
    const green = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.5 });
    const greenGlow = new THREE.MeshStandardMaterial({ color: 0x44ff66, emissive: 0x22aa44, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
    const silver = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.15 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc4a070, roughness: 0.6 });
    const cloak = new THREE.MeshStandardMaterial({ color: 0x1a2a12, roughness: 0.7, side: THREE.DoubleSide });

    // Torso
    const torso = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.58, 8), leather);
    chest.scale.set(1.0, 1.0, 0.6);
    torso.add(chest);
    // Chest strap
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.3), leatherLt);
    strap.position.set(0.08, 0, 0);
    strap.rotation.z = 0.5;
    torso.add(strap);
    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // Head
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skin));
    // Hood/cowl
    const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), green);
    cowl.position.set(0, 0.04, -0.02);
    head.add(cowl);
    head.position.y = 1.68;
    parts.head = head;
    g.add(head);

    // Shoulders (light pads)
    for (const side of [-1, 1]) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), leatherLt);
        pad.position.set(side * 0.3, 1.45, 0);
        g.add(pad);
    }

    // Arms
    const buildArm = (s) => {
        const ag = new THREE.Group();
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 6), leather));
        ag.children[0].position.y = -0.14;
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 6), leatherLt));
        ag.children[1].position.y = -0.42;
        ag.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skin));
        ag.children[2].position.y = -0.58;
        ag.position.set(s * 0.34, 1.35, 0);
        return ag;
    };
    parts.leftArm = buildArm(-1); g.add(parts.leftArm);
    parts.rightArm = buildArm(1); g.add(parts.rightArm);

    // Bow on left arm
    const bow = new THREE.Group();
    const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 6, 12, Math.PI), leather);
    bowCurve.rotation.z = Math.PI / 2;
    bowCurve.position.y = -0.2;
    bow.add(bowCurve);
    // Bowstring
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.8, 4), silver);
    string.position.y = -0.2;
    bow.add(string);
    bow.position.set(0.1, -0.35, 0.1);
    parts.leftArm.add(bow);

    // Quiver on back
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 6), leather);
    quiver.position.set(0.15, 1.2, -0.18);
    quiver.rotation.z = 0.15;
    g.add(quiver);
    // Arrow tips
    for (let i = 0; i < 3; i++) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 4), silver);
        tip.position.set(0.15 + (i - 1) * 0.03, 1.5, -0.18);
        g.add(tip);
    }

    // Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.08, 8), leatherLt);
    belt.scale.set(1, 1, 0.6);
    belt.position.y = 0.84;
    g.add(belt);

    // Legs
    const buildLeg = (s) => {
        const lg = new THREE.Group();
        lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.35, 6), leather));
        lg.children[0].position.y = -0.17;
        lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 6), leatherLt));
        lg.children[1].position.y = -0.50;
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.16), leather);
        boot.position.set(0, -0.70, 0.02);
        lg.add(boot);
        lg.position.set(s * 0.11, 0.78, 0);
        return lg;
    };
    parts.leftLeg = buildLeg(-1); g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1); g.add(parts.rightLeg);

    // Cloak
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9, 4, 6), cloak);
    cp.position.set(0, 1.0, -0.2);
    parts.cape = cp;
    g.add(cp);
}

function _buildCleric(g, parts) {
    const cloth = new THREE.MeshStandardMaterial({ color: 0xd4c090, roughness: 0.6 });
    const clothDk = new THREE.MeshStandardMaterial({ color: 0xa09060, roughness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xddaa44, metalness: 0.8, roughness: 0.15 });
    const holyGlow = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffdd66, emissiveIntensity: 1.8, transparent: true, opacity: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.5 });

    // Torso (vestments)
    const torso = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.6, 8), cloth);
    chest.scale.set(1.0, 1.0, 0.6);
    torso.add(chest);
    // Tabard front
    const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.02), white);
    tabard.position.set(0, -0.05, 0.14);
    torso.add(tabard);
    // Holy symbol on chest
    const sym = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.01), holyGlow);
    sym.position.set(0, 0.12, 0.16);
    torso.add(sym);
    const symH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.01), holyGlow);
    symH.position.set(0, 0.12, 0.165);
    torso.add(symH);
    // Collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.14, 8), cloth);
    collar.position.y = 0.36;
    torso.add(collar);
    torso.position.y = 1.15;
    parts.torso = torso;
    g.add(torso);

    // Head
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skin));
    // Circlet/halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 8, 16), holyGlow);
    halo.position.y = 0.18;
    halo.rotation.x = Math.PI / 2;
    head.add(halo);
    head.position.y = 1.72;
    parts.head = head;
    g.add(head);

    // Shoulders (golden pads)
    for (const side of [-1, 1]) {
        const sp = new THREE.Group();
        sp.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), gold));
        sp.children[0].scale.set(1.3, 0.7, 1.0);
        sp.position.set(side * 0.32, 1.46, 0);
        g.add(sp);
    }

    // Arms
    const buildArm = (s) => {
        const ag = new THREE.Group();
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 6), cloth));
        ag.children[0].position.y = -0.14;
        ag.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.26, 6), clothDk));
        ag.children[1].position.y = -0.42;
        ag.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skin));
        ag.children[2].position.y = -0.58;
        ag.position.set(s * 0.32, 1.35, 0);
        return ag;
    };
    parts.leftArm = buildArm(-1); g.add(parts.leftArm);
    parts.rightArm = buildArm(1); g.add(parts.rightArm);

    // Mace on right arm
    const mace = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.6, 6), gold);
    handle.position.y = -0.05;
    mace.add(handle);
    const maceHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), gold);
    maceHead.position.y = 0.28;
    mace.add(maceHead);
    const maceGlow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), holyGlow);
    maceGlow.position.y = 0.28;
    mace.add(maceGlow);
    mace.position.y = -0.65;
    mace.rotation.x = -0.15;
    parts.rightArm.add(mace);

    // Book/shield in left hand
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.04), clothDk);
    book.position.set(0, -0.55, 0.12);
    parts.leftArm.add(book);

    // Robe skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.7, 8), cloth);
    skirt.position.y = 0.48;
    g.add(skirt);

    // Legs
    const buildLeg = (s) => {
        const lg = new THREE.Group();
        lg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), clothDk));
        lg.children[0].position.y = -0.15;
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), cloth);
        boot.position.set(0, -0.35, 0.01);
        lg.add(boot);
        lg.position.set(s * 0.1, 0.5, 0);
        return lg;
    };
    parts.leftLeg = buildLeg(-1); g.add(parts.leftLeg);
    parts.rightLeg = buildLeg(1); g.add(parts.rightLeg);
}

// ══════════════════════════════════════════════════════════════════════
// Build a combatant model with class appearance + faction ring
// ══════════════════════════════════════════════════════════════════════
const CLASS_BUILDERS = {
    warrior: _buildWarrior,
    mage: _buildMage,
    ranger: _buildRanger,
    cleric: _buildCleric,
};

// ── RAID TIER SET VISUALS (Bio-Mechanical / Chitinous) ──
// Adapted for Battleground performance

function _applyWarriorTierSet(w) {
    const chitinMat = new THREE.MeshStandardMaterial({ color: 0x440505, roughness: 0.4, metalness: 0.6 });
    
    // Add chitinous shoulder spikes
    [-1, 1].forEach(s => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), chitinMat);
        spike.position.set(s * 0.35, 1.45, 0.05);
        spike.rotation.z = s * -0.5;
        w.group.add(spike);
    });
}

function _applyMageTierSet(w) {
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x33bbaa, emissive: 0x22aa88, emissiveIntensity: 2.0, transparent: true, opacity: 0.8 });
    
    // Add floating crystals around head
    for (let i = 0; i < 3; i++) {
        const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), crystalMat);
        const a = (i / 3) * Math.PI * 2;
        cry.position.set(Math.cos(a) * 0.25, 1.8, Math.sin(a) * 0.25);
        w.group.add(cry);
    }
}

function _applyRangerTierSet(w) {
    const chitinMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xeeaa44, emissive: 0xcc8822, emissiveIntensity: 2.0 });
    
    // Add insectoid wings on back
    [-1, 1].forEach(s => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.15), chitinMat);
        wing.position.set(s * 0.15, 1.2, -0.2);
        wing.rotation.z = s * 0.8;
        wing.rotation.y = s * 0.3;
        w.group.add(wing);
        
        const vein = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.55, 0.01), glowMat);
        vein.position.copy(wing.position);
        vein.rotation.copy(wing.rotation);
        vein.position.z += 0.01;
        w.group.add(vein);
    });
}

function _applyClericTierSet(w) {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xcc8822, metalness: 0.8, roughness: 0.2 });
    
    // Massive ornate halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 8, 32), goldMat);
    halo.position.set(0, 1.8, -0.1);
    w.group.add(halo);
}

function buildBGCombatantModel(classId, factionColor, partyMemberRef = null) {
    const group = new THREE.Group();
    const parts = {};
    const builder = CLASS_BUILDERS[classId] || _buildWarrior;
    builder(group, parts);

    // ── Apply Tier Sets for persistent party members ──
    if (partyMemberRef) {
        const isTierSet = partyMemberRef.level >= 58 || partyMemberRef.isMercenary;
        if (isTierSet) {
            if (classId === 'warrior') _applyWarriorTierSet({ group, parts });
            else if (classId === 'mage') _applyMageTierSet({ group, parts });
            else if (classId === 'ranger') _applyRangerTierSet({ group, parts });
            else if (classId === 'cleric') _applyClericTierSet({ group, parts });
        }
    }

    // Faction ring at feet
    const ringGeo = new THREE.RingGeometry(0.35, 0.42, 24);
    const ringMat = new THREE.MeshStandardMaterial({
        color: factionColor, emissive: factionColor,
        emissiveIntensity: 1.2, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    // Slight random scale for variety
    const sc = 0.88 + Math.random() * 0.18;
    group.scale.setScalar(sc);

    return { group, parts };
}

// ══════════════════════════════════════════════════════════════════════
// BATTLEGROUND SCENE CLASS
// ══════════════════════════════════════════════════════════════════════
export class BattlegroundScene {
    constructor(scene, camera, textureLoader) {
        this.parentScene = scene;
        this.camera = camera;
        this.textureLoader = textureLoader;
        this.active = false;
        this._objects = [];
        this._npcData = {};       // combatantId → { group, parts, animTime, prevX, prevZ, ... }
        this._flagModels = {};
        this._lights = [];
        this._time = 0;
        this._playerWalkTarget = { x: -24, z: 0 };

        // Reusable projection objects
        this._projScreenMatrix = new THREE.Matrix4();
        this._frustum = new THREE.Frustum();
        this._tempVec = new THREE.Vector3();

        this.uiContainer = null;
        this._initUI();
    }

    _initUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'bg-ui-container';
        this.uiContainer.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 45; display: none;
        `;
        document.body.appendChild(this.uiContainer);

        const style = document.createElement('style');
        style.id = 'bg-ui-styles';
        style.textContent = `
            .bg-nameplate {
                position: absolute;
                display: flex; flex-direction: column; align-items: center;
                pointer-events: none;
                font-family: 'Cinzel', serif;
                width: 120px;
                transform: translate(-50%, -100%);
            }
            .bg-name {
                font-size: 10px; font-weight: bold;
                text-shadow: 0 1px 3px #000, 0 0 5px rgba(0,0,0,0.8);
                white-space: nowrap;
                margin-bottom: 2px;
            }
            .bg-name.party { color: #ffffff; text-decoration: underline; }
            .bg-name.voidborne { color: #cc88ff; }
            .bg-name.ironcrest { color: #ff8866; }
            
            .bg-hp-bg {
                width: 100%; height: 4px; background: rgba(0,0,0,0.7);
                border: 1px solid rgba(255,255,255,0.1); border-radius: 2px;
                overflow: hidden;
            }
            .bg-hp-fill {
                height: 100%; width: 100%; background: #44cc44;
                transition: width 0.2s ease-out;
            }
            .bg-hp-fill.enemy { background: #cc4444; }
            .bg-tag {
                font-size: 7px; color: #ffcc44; font-weight: 800;
                letter-spacing: 0.5px; margin-top: 1px;
                text-shadow: 0 1px 2px black;
            }
        `;
        document.head.appendChild(style);
    }

    _createNameplate(combatant) {
        const plate = document.createElement('div');
        const isEnemy = combatant.faction === 'ironcrest'; // Player is voidborne
        const nameClass = combatant.isPartyMember ? 'party' : combatant.faction;
        const roleIcon = combatant.display ? combatant.display.icon : '';
        
        plate.className = 'bg-nameplate';
        plate.innerHTML = `
            <div class="bg-name ${nameClass}">${roleIcon} ${combatant.name}</div>
            <div class="bg-hp-bg">
                <div class="bg-hp-fill ${isEnemy ? 'enemy' : ''}"></div>
            </div>
            ${combatant.isPartyMember ? '<div class="bg-tag">★ YOUR PARTY ★</div>' : ''}
            ${combatant.isCompanion ? '<div class="bg-tag">🐾 COMPANION</div>' : ''}
        `;
        this.uiContainer.appendChild(plate);
        return {
            plate,
            fill: plate.querySelector('.bg-hp-fill')
        };
    }

    enter(bgDef) {
        if (this.active) return;
        this.active = true;
        if (this.uiContainer) this.uiContainer.style.display = 'block';
        this._buildArena(bgDef);
    }

    exit() {
        if (!this.active) return;
        this.active = false;
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
            this.uiContainer.innerHTML = '';
        }
        this._cleanup();
    }

    // ── BUILD ARENA ──────────────────────────────────────────────────
    _buildArena(bgDef) {
        const scene = this.parentScene;
        const colors = bgDef.colors;

        scene.background = new THREE.Color(colors.sceneBg);
        scene.fog = new THREE.FogExp2(colors.fogColor, colors.fogDensity);

        const ambient = new THREE.AmbientLight(colors.ambientLight, 2.2);
        scene.add(ambient); this._lights.push(ambient);

        const hemi = new THREE.HemisphereLight(0x4422aa, 0x110022, 1.0);
        scene.add(hemi); this._lights.push(hemi);

        const dir = new THREE.DirectionalLight(colors.directionalLight, 1.2);
        dir.position.set(10, 25, 5);
        scene.add(dir); this._lights.push(dir);

        // Ground
        const groundGeo = new THREE.PlaneGeometry(100, 50);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.85, metalness: 0.1 });
        if (bgDef.textures?.ground) {
            this.textureLoader.load(bgDef.textures.ground, tex => {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(10, 5);
                groundMat.map = tex;
                groundMat.needsUpdate = true;
            });
        }
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground); this._objects.push(ground);

        // Bases
        this._buildBase(scene, -30, 0, 0xaa44ff, 0x6622aa);
        this._buildBase(scene, 30, 0, 0xff6644, 0xaa3311);

        // Center void pool
        const poolMat = new THREE.MeshStandardMaterial({ color: 0x5522aa, emissive: 0x4411aa, emissiveIntensity: 1.2, transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.5 });
        const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 32), poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(0, 0.02, 0);
        scene.add(pool); this._objects.push(pool);

        // Crystal spires
        const crystalMat = new THREE.MeshStandardMaterial({ color: 0x6633aa, emissive: 0x4422cc, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.85 });
        const spirePositions = [[-14, 7], [-14, -7], [14, 7], [14, -7], [-7, 12], [-7, -12], [7, 12], [7, -12], [0, 10], [0, -10]];
        for (const [x, z] of spirePositions) {
            const h = 3 + Math.random() * 4;
            const r = 0.5 + Math.random() * 0.5;
            const spire = _m(new THREE.ConeGeometry(r, h, 5), crystalMat, x, h / 2, z);
            spire.rotation.y = Math.random() * Math.PI;
            scene.add(spire); this._objects.push(spire);
            if (h > 4.5) {
                const glow = new THREE.PointLight(0xaa55ff, 0.8, 12);
                glow.position.set(x, h, z);
                scene.add(glow); this._lights.push(glow);
            }
        }

        // Energy rivers
        for (const zOff of [-4, 4]) {
            const riverMat = new THREE.MeshStandardMaterial({ color: 0x7733cc, emissive: 0x5522aa, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
            const river = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.0), riverMat);
            river.rotation.x = -Math.PI / 2;
            river.position.set(0, 0.03, zOff);
            scene.add(river); this._objects.push(river);
        }

        // Rocks
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.9, metalness: 0.1 });
        for (let i = 0; i < 30; i++) {
            const rx = (Math.random() - 0.5) * 80;
            const rz = (Math.random() - 0.5) * 35;
            const rs = 0.3 + Math.random() * 0.8;
            const rock = _m(new THREE.DodecahedronGeometry(rs, 0), rockMat, rx, rs * 0.4, rz);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(rock); this._objects.push(rock);
        }

        // Flags
        this._buildFlagModel(scene, 'voidborne', -30, 0);
        this._buildFlagModel(scene, 'ironcrest', 30, 0);

        // Spawn combatant models
        const inst = battlegroundSystem.instance;
        if (inst) {
            for (const c of inst.allCombatants) {
                this._spawnCombatantModel(scene, c);
            }
        }
    }

    _buildBase(scene, x, z, color, darkColor) {
        const baseMat = new THREE.MeshStandardMaterial({ color: darkColor, metalness: 0.6, roughness: 0.3 });
        const glowMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.4 });

        const platform = _m(new THREE.CylinderGeometry(6, 6.5, 0.5, 8), baseMat, x, 0.25, z);
        scene.add(platform); this._objects.push(platform);

        const capRingMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const capRing = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.7, 32), capRingMat);
        capRing.rotation.x = -Math.PI / 2;
        capRing.position.set(x, 0.52, z);
        scene.add(capRing); this._objects.push(capRing);

        const capDiscMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, transparent: true, opacity: 0.12 });
        const capDisc = new THREE.Mesh(new THREE.CircleGeometry(5.0, 24), capDiscMat);
        capDisc.rotation.x = -Math.PI / 2;
        capDisc.position.set(x, 0.51, z);
        scene.add(capDisc); this._objects.push(capDisc);

        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const px = x + Math.cos(angle) * 5;
            const pz = z + Math.sin(angle) * 5;
            const pillar = _m(new THREE.CylinderGeometry(0.4, 0.45, 5, 6), baseMat, px, 2.5, pz);
            scene.add(pillar); this._objects.push(pillar);
            const top = _m(new THREE.SphereGeometry(0.5, 8, 8), glowMat, px, 5.2, pz);
            scene.add(top); this._objects.push(top);
        }

        const bLight = new THREE.PointLight(color, 2.0, 20);
        bLight.position.set(x, 4, z);
        scene.add(bLight); this._lights.push(bLight);
    }

    _buildFlagModel(scene, faction, x, z) {
        const color = faction === 'voidborne' ? 0xaa44ff : 0xff6644;
        const g = new THREE.Group();

        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 });
        g.add(_m(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), poleMat, 0, 2, 0));

        const flagMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, side: THREE.DoubleSide });
        g.add(_m(new THREE.PlaneGeometry(1.2, 0.8), flagMat, 0.6, 3.6, 0));

        const orbMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
        g.add(_m(new THREE.SphereGeometry(0.15, 8, 8), orbMat, 0, 4.2, 0));

        g.position.set(x, 0, z);
        scene.add(g); this._objects.push(g);
        this._flagModels[faction] = g;
    }

    _spawnCombatantModel(scene, combatant) {
        const factionColor = combatant.faction === 'voidborne' ? 0xaa44ff : 0xff6644;
        const { group, parts } = buildBGCombatantModel(combatant.classId, factionColor, combatant.partyMemberRef);
        group.position.set(combatant.x, 0, combatant.z);
        // Store original scale for respawn restoration
        group.userData._origScale = group.scale.x;
        scene.add(group);
        this._objects.push(group);

        const nameplate = this._createNameplate(combatant);

        this._npcData[combatant.id] = {
            group,
            parts,
            nameplate,
            animTime: Math.random() * 10,
            attackAnim: 0,
            wasAlive: true,
            // Track last known sim position to detect sim-side movement
            lastSimX: combatant.x,
            lastSimZ: combatant.z,
            // Timer: how long ago the sim position last changed
            // Keeps walk anim playing between throttled logic ticks
            movingTimer: 0,
        };
    }

    // ── UPDATE (every frame) ─────────────────────────────────────────
    update(dt, time, player) {
        if (!this.active) return;
        this._time = time;

        const inst = battlegroundSystem.instance;
        if (!inst) return;

        // Update frustum for nameplate culling
        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

        // ── Inject player position into system for healer AI ──
        if (player) {
            const pPos = player.getPosition();
            inst.playerX = pPos.x;
            inst.playerZ = pPos.z;
        }

        const isComplete = inst.state === 'complete';

        for (const c of inst.allCombatants) {
            const data = this._npcData[c.id];
            if (!data) continue;
            const { group, parts, nameplate } = data;

            data.animTime += dt;

            // ── Update Nameplate ──
            if (nameplate) {
                const tv = this._tempVec;
                tv.copy(group.position);
                tv.y += 2.2; // height above head

                const distSq = tv.distanceToSquared(this.camera.position);
                if (c.alive && distSq < 2500 && this._frustum.containsPoint(tv)) {
                    tv.project(this.camera);
                    const x = (tv.x * 0.5 + 0.5) * window.innerWidth;
                    const y = (tv.y * -0.5 + 0.5) * window.innerHeight;
                    nameplate.plate.style.display = 'flex';
                    nameplate.plate.style.left = `${x}px`;
                    nameplate.plate.style.top = `${y}px`;
                    
                    // HP bar update
                    if (nameplate.fill) {
                        const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
                        nameplate.fill.style.width = `${hpPct}%`;
                    }
                } else {
                    nameplate.plate.style.display = 'none';
                }
            }

            if (c.alive) {
                const factionColor = c.faction === 'voidborne' ? 0xaa44ff : 0xff6644;
                // ── Kill Streak VFX ──
                if (c.kills >= 3) {
                    if (!data.streakVfx) {
                        const auraGeo = new THREE.RingGeometry(0.4, 0.5, 24);
                        const auraMat = new THREE.MeshBasicMaterial({ 
                            color: factionColor, 
                            transparent: true, 
                            opacity: 0.5, 
                            side: THREE.DoubleSide 
                        });
                        const aura = new THREE.Mesh(auraGeo, auraMat);
                        aura.rotation.x = -Math.PI / 2;
                        aura.position.y = 0.05;
                        group.add(aura);
                        
                        const flame = new THREE.PointLight(factionColor, 1.5, 4);
                        flame.position.y = 1.0;
                        group.add(flame);
                        
                        data.streakVfx = { aura, flame };
                    }
                    // Pulse streak VFX
                    data.streakVfx.aura.scale.setScalar(1 + Math.sin(time * 5) * 0.1);
                    data.streakVfx.aura.material.opacity = 0.4 + Math.sin(time * 8) * 0.2;
                    data.streakVfx.flame.intensity = 1.0 + Math.sin(time * 10) * 0.5;
                } else if (data.streakVfx) {
                    group.remove(data.streakVfx.aura);
                    group.remove(data.streakVfx.flame);
                    data.streakVfx.aura.geometry.dispose();
                    data.streakVfx.aura.material.dispose();
                    data.streakVfx = null;
                }

                // ── RESPAWN RECOVERY: reset transforms if was dead ──
                if (!data.wasAlive) {
                    group.rotation.x = 0;
                    group.rotation.z = 0;
                    group.scale.set(1, 1, 1);
                    // Reapply random scale
                    const sc = group.userData._origScale || 1;
                    group.scale.setScalar(sc);
                    group.position.y = 0;
                    // Reset all limb rotations
                    if (parts.leftLeg) parts.leftLeg.rotation.x = 0;
                    if (parts.rightLeg) parts.rightLeg.rotation.x = 0;
                    if (parts.leftArm) parts.leftArm.rotation.x = 0;
                    if (parts.rightArm) parts.rightArm.rotation.x = 0;
                }
                data.wasAlive = true;

                group.visible = true;

                // ── Detect sim-side movement (logic tick changed position) ──
                const simDx = c.x - data.lastSimX;
                const simDz = c.z - data.lastSimZ;
                const simMoved = (simDx * simDx + simDz * simDz) > 0.0001;
                if (simMoved) {
                    data.movingTimer = 0.15; // Hold walk anim for 150ms after last sim move
                    data.lastSimX = c.x;
                    data.lastSimZ = c.z;
                } else {
                    data.movingTimer = Math.max(0, data.movingTimer - dt);
                }

                // ── Smooth position interpolation (dt-based for frame independence) ──
                const lerpFactor = 1 - Math.pow(0.001, dt); // ~smooth exponential lerp
                group.position.x += (c.x - group.position.x) * lerpFactor;
                group.position.z += (c.z - group.position.z) * lerpFactor;

                // ── Face movement direction ──
                const dx = c.targetX - c.x;
                const dz = c.targetZ - c.z;
                if (dx * dx + dz * dz > 0.1) {
                    const targetRot = Math.atan2(dx, dz);
                    let diff = targetRot - group.rotation.y;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    group.rotation.y += diff * 0.1;
                }

                // ── Is this NPC effectively in motion? ──
                const isMoving = data.movingTimer > 0;

                if (isComplete) {
                    // ── Victory/post-match: celebratory idle ──
                    const iWin = (inst.winner === c.faction);
                    const bobSpeed = iWin ? 4.0 : 1.5;
                    const bobAmp = iWin ? 0.08 : 0.02;
                    group.position.y = Math.abs(Math.sin(data.animTime * bobSpeed)) * bobAmp;
                    if (iWin) {
                        const cheer = Math.sin(data.animTime * 5);
                        if (parts.leftArm) parts.leftArm.rotation.x = -0.8 + cheer * 0.3;
                        if (parts.rightArm) parts.rightArm.rotation.x = -0.8 - cheer * 0.3;
                        if (parts.leftLeg) parts.leftLeg.rotation.x *= 0.9;
                        if (parts.rightLeg) parts.rightLeg.rotation.x *= 0.9;
                    } else {
                        if (parts.leftArm) parts.leftArm.rotation.x *= 0.95;
                        if (parts.rightArm) parts.rightArm.rotation.x *= 0.95;
                        if (parts.leftLeg) parts.leftLeg.rotation.x *= 0.95;
                        if (parts.rightLeg) parts.rightLeg.rotation.x *= 0.95;
                    }
                } else if (c.rootedTimer > 0) {
                    // ── Rooted (Frost Nova) — frozen in place, slight shake ──
                    group.position.y = 0;
                    const shake = Math.sin(data.animTime * 20) * 0.015;
                    group.position.x += shake;
                    if (parts.leftArm) parts.leftArm.rotation.x = -0.3;
                    if (parts.rightArm) parts.rightArm.rotation.x = -0.3;
                    if (parts.leftLeg) parts.leftLeg.rotation.x *= 0.95;
                    if (parts.rightLeg) parts.rightLeg.rotation.x *= 0.95;
                } else if (c.isCharging) {
                    // ── Warrior Charge — leaned forward, fast run cycle ──
                    const chargeCycle = Math.sin(data.animTime * 16); // Fast run
                    if (parts.leftLeg) parts.leftLeg.rotation.x = chargeCycle * 0.6;
                    if (parts.rightLeg) parts.rightLeg.rotation.x = -chargeCycle * 0.6;
                    if (parts.leftArm) parts.leftArm.rotation.x = -chargeCycle * 0.4;
                    if (parts.rightArm) parts.rightArm.rotation.x = chargeCycle * 0.4;
                    if (parts.torso) parts.torso.rotation.x = 0.15; // Lean forward
                    group.position.y = Math.abs(chargeCycle) * 0.04;
                } else if (c.isRetreating) {
                    // ── Retreating — fast run, arms back ──
                    const runCycle = Math.sin(data.animTime * 12);
                    if (parts.leftLeg) parts.leftLeg.rotation.x = runCycle * 0.5;
                    if (parts.rightLeg) parts.rightLeg.rotation.x = -runCycle * 0.5;
                    if (parts.leftArm) parts.leftArm.rotation.x = 0.3;
                    if (parts.rightArm) parts.rightArm.rotation.x = 0.3;
                    group.position.y = 0;
                } else if (isMoving) {
                    // ── Class-specific walk/run animation ──
                    let walkSpeed = 8; // Default walk anim speed
                    let legSwing = 0.4;
                    let armSwing = 0.25;

                    if (c.classId === 'warrior') {
                        walkSpeed = 7; legSwing = 0.35; armSwing = 0.2;
                        // Heavy plate walk — slight torso lean
                        if (parts.torso) {
                            parts.torso.rotation.x *= 0.9; // Reset charge lean
                        }
                    } else if (c.classId === 'mage') {
                        walkSpeed = 6; legSwing = 0.25; armSwing = 0.15;
                        // Mages glide — less bounce, staff held high
                    } else if (c.classId === 'ranger') {
                        walkSpeed = 10; legSwing = 0.45; armSwing = 0.3;
                        // Rangers have a quick, agile stride
                    } else if (c.classId === 'cleric') {
                        walkSpeed = 7; legSwing = 0.3; armSwing = 0.2;
                    }

                    // Slow debuff visual: slower animation
                    if (c.slowedTimer > 0) {
                        walkSpeed *= 0.5;
                        legSwing *= 0.6;
                    }

                    const walkCycle = Math.sin(data.animTime * walkSpeed);
                    if (parts.leftLeg) parts.leftLeg.rotation.x = walkCycle * legSwing;
                    if (parts.rightLeg) parts.rightLeg.rotation.x = -walkCycle * legSwing;
                    if (parts.leftArm) parts.leftArm.rotation.x = -walkCycle * armSwing;
                    if (parts.rightArm) parts.rightArm.rotation.x = walkCycle * armSwing;
                    if (parts.torso) parts.torso.rotation.x *= 0.9; // Reset any lean
                    group.position.y = 0;
                } else {
                    // ── Idle — class-specific idle stances ──
                    if (parts.torso) parts.torso.rotation.x *= 0.9;

                    if (c.classId === 'warrior') {
                        // Warrior idle: slight sway, shield at ready
                        group.position.y = Math.sin(data.animTime * 1.5) * 0.02;
                    } else if (c.classId === 'mage') {
                        // Mage idle: floating bob, staff glow pulse
                        group.position.y = Math.sin(data.animTime * 2) * 0.04;
                    } else if (c.classId === 'ranger') {
                        // Ranger idle: alert stance, slight weight shift
                        group.position.y = Math.sin(data.animTime * 2.5) * 0.02;
                    } else {
                        // Cleric idle: serene bob
                        group.position.y = Math.sin(data.animTime * 1.8) * 0.03;
                    }

                    // Attack animation when cooldown active (just attacked)
                    if (c.attackCooldown > 0.3 && data.attackAnim <= 0) {
                        data.attackAnim = 1.0;
                    }

                    if (data.attackAnim > 0) {
                        data.attackAnim -= dt * 3;
                        const swing = Math.sin(data.attackAnim * Math.PI);

                        if (c.classId === 'mage') {
                            // Mage: both arms thrust forward (casting)
                            if (parts.rightArm) parts.rightArm.rotation.x = -swing * 0.8;
                            if (parts.leftArm) parts.leftArm.rotation.x = -swing * 0.6;
                        } else if (c.classId === 'ranger') {
                            // Ranger: draw and release bow
                            if (parts.rightArm) parts.rightArm.rotation.x = -swing * 0.9;
                            if (parts.leftArm) parts.leftArm.rotation.x = -0.3;
                        } else if (c.classId === 'cleric') {
                            // Cleric: raise arms (heal cast)
                            if (parts.rightArm) parts.rightArm.rotation.x = -swing * 0.7;
                            if (parts.leftArm) parts.leftArm.rotation.x = -swing * 0.5;
                        } else {
                            // Warrior: overhead swing
                            if (parts.rightArm) parts.rightArm.rotation.x = -swing * 1.2;
                            if (parts.leftArm) parts.leftArm.rotation.x *= 0.9;
                        }
                    } else {
                        // Decay limbs to idle
                        if (parts.leftLeg) parts.leftLeg.rotation.x *= 0.9;
                        if (parts.rightLeg) parts.rightLeg.rotation.x *= 0.9;
                        if (parts.leftArm) parts.leftArm.rotation.x *= 0.9;
                        if (parts.rightArm) parts.rightArm.rotation.x *= 0.9;
                    }
                }

                // ── HP-based body tint for low health / FC debuff ──
                const hpPct = c.hp / c.maxHp;
                if (parts.torso && parts.torso.children[0]) {
                    const torsoMesh = parts.torso.children[0];
                    if (torsoMesh.material) {
                        if (c.hasFlag && c.fcDebuffStacks > 0) {
                            const stackPct = c.fcDebuffStacks / 10;
                            if (!torsoMesh.material.emissive) torsoMesh.material.emissive = new THREE.Color();
                            torsoMesh.material.emissive.setRGB(1.0, 0.5 * (1 - stackPct), 0);
                            torsoMesh.material.emissiveIntensity = 0.3 + stackPct * 0.8;
                        } else if (hpPct < 0.3) {
                            if (!torsoMesh.material.emissive) torsoMesh.material.emissive = new THREE.Color();
                            torsoMesh.material.emissive.setRGB(1, 0, 0);
                            torsoMesh.material.emissiveIntensity = 0.4 * (1 - hpPct);
                        } else {
                            torsoMesh.material.emissiveIntensity = 0;
                        }
                    }
                }
            } else {
                // ── Dead — fade out and lay flat ──
                data.wasAlive = false;
                group.visible = true;
                group.position.y = 0;

                // Smoothly fall over
                const targetRotX = Math.PI / 2;
                group.rotation.x += (targetRotX - group.rotation.x) * 0.08;

                // Reduce opacity of faction ring as visual death indicator
                // (model stays visible but tipped over)
            }
        }

        // ── Update flags ──
        for (const faction of ['voidborne', 'ironcrest']) {
            const flagModel = this._flagModels[faction];
            if (!flagModel) continue;
            const flag = inst.flags[faction];

            if (flag.state === 'base') {
                const base = faction === 'voidborne' ? { x: -30, z: 0 } : { x: 30, z: 0 };
                flagModel.position.set(base.x, 0, base.z);
                flagModel.visible = true;
            } else if (flag.state === 'carried' && flag.carrier) {
                flagModel.position.set(flag.carrier.x, 0, flag.carrier.z);
                flagModel.visible = true;
            } else if (flag.state === 'dropped') {
                flagModel.position.set(flag.dropX, 0, flag.dropZ);
                flagModel.visible = true;
            }

            const flagCloth = flagModel.children.find(ch => ch.geometry?.type === 'PlaneGeometry');
            if (flagCloth) flagCloth.rotation.y = Math.sin(time * 3 + flagModel.position.x) * 0.3;
        }

        // ── Player walk target ──
        this._updatePlayerWalkTarget(inst);
    }

    _updatePlayerWalkTarget(inst) {
        if (inst.state !== 'active' && inst.state !== 'countdown') {
            this._playerWalkTarget = { x: -24, z: 0 };
            return;
        }

        const playerTeam = inst.teamA;
        const enemyTeam = inst.teamB;

        // Follow our flag carrier
        const ourFC = playerTeam.find(c => c.hasFlag && c.alive);
        if (ourFC) {
            this._playerWalkTarget = { x: ourFC.x + 2, z: ourFC.z + 1 };
            return;
        }

        // Chase enemy flag carrier
        const enemyFC = enemyTeam.find(c => c.hasFlag && c.alive);
        if (enemyFC) {
            this._playerWalkTarget = { x: enemyFC.x, z: enemyFC.z };
            return;
        }

        // Move toward team center
        let avgX = 0, avgZ = 0, count = 0;
        for (const c of playerTeam) {
            if (!c.alive) continue;
            avgX += c.x;
            avgZ += c.z;
            count++;
        }
        if (count > 0) {
            this._playerWalkTarget = { x: avgX / count, z: avgZ / count };
        } else {
            this._playerWalkTarget = { x: -24, z: 0 };
        }
    }

    getPlayerWalkTarget() {
        return this._playerWalkTarget;
    }

    // ── CLEANUP ──────────────────────────────────────────────────────
    _cleanup() {
        const disposeRecursive = (obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
            if (obj.children) {
                for (const child of [...obj.children]) disposeRecursive(child);
            }
        };

        for (const obj of this._objects) {
            this.parentScene.remove(obj);
            disposeRecursive(obj);
        }
        for (const light of this._lights) {
            this.parentScene.remove(light);
        }
        this._objects = [];
        this._lights = [];
        this._npcData = {};
        this._flagModels = {};
    }
}
