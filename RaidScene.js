// ══════════════════════════════════════════════════════════════════════
// RAID SCENE — The Hivespire Sanctum 3D Environment
// 10-man raid instance: bio-mechanical alien cathedral
// Mirrors DungeonScene.js architecture but scaled up for raids.
// Teal/crimson/chitin aesthetic — Ahn'Qiraj × Geonosian hive vibes.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { gameState } from './GameState.js';
import { raidSystem } from './RaidSystem.js';
import { buildVoidweaverModel, buildThornwardenModel, buildDawnkeeperModel } from './PlayerModels.js';

// ── Helper: create mesh at position ──
function _m(geo, mat, x, y, z) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

// ══════════════════════════════════════════════════════════════════════
// RAID MOB MODEL BUILDERS — Unique Hivespire creatures
// All new models: chitin-armored, psionic, bio-mechanical
// ══════════════════════════════════════════════════════════════════════

function buildHiveSentryModel(c, s) {
    // Tall chitin-armored bipedal warrior with glowing teal joints
    const g = new THREE.Group();
    const chitin = new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .45 });
    const chitinDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(.4), roughness: .7, metalness: .3 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x33ccaa, emissive: 0x22aa88, emissiveIntensity: 2.0, transparent: true, opacity: .85 });
    // Armored torso — broad chitin plates
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.5*s, .7*s, .35*s), chitin);
    torso.position.y = .9*s; torso.castShadow = true; g.add(torso);
    // Shoulder plates — angular chitin spaulders
    [-1,1].forEach(x => {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(.22*s, .12*s, .25*s), chitin);
        sp.position.set(x*.35*s, 1.25*s, 0); sp.rotation.z = x*.3; g.add(sp);
        const spike = new THREE.Mesh(new THREE.ConeGeometry(.04*s, .2*s, 5), chitinDark);
        spike.position.set(x*.42*s, 1.35*s, 0); spike.rotation.z = x*-.5; g.add(spike);
    });
    // Head — insectoid with mandibles
    const head = new THREE.Mesh(new THREE.SphereGeometry(.14*s, 8, 6), chitinDark);
    head.position.y = 1.45*s; head.scale.set(1, 1.1, .9); g.add(head);
    // Compound eyes — glowing teal
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x44ffcc, emissive: 0x33eebb, emissiveIntensity: 3.0 });
    [-1,1].forEach(x => { g.add(_m(new THREE.SphereGeometry(.04*s, 6, 6), eyeMat, x*.07*s, 1.48*s, .1*s)) });
    // Mandibles
    [-1,1].forEach(x => {
        const md = new THREE.Mesh(new THREE.ConeGeometry(.02*s, .12*s, 4), chitinDark);
        md.position.set(x*.06*s, 1.35*s, .14*s); md.rotation.x = -.6; md.rotation.z = x*.4; g.add(md);
    });
    // Arms with blade weapons
    [-1,1].forEach(x => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05*s, .04*s, .5*s, 6), chitin);
        arm.position.set(x*.35*s, .8*s, 0); arm.rotation.z = x*.2; g.add(arm);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(.03*s, .4*s, .08*s), glow);
        blade.position.set(x*.38*s, .4*s, .05*s); g.add(blade);
    });
    // Legs — digitigrade
    [-1,1].forEach(x => {
        g.add(_m(new THREE.CylinderGeometry(.06*s, .04*s, .45*s, 6), chitinDark, x*.15*s, .35*s, 0));
        g.add(_m(new THREE.CylinderGeometry(.04*s, .06*s, .25*s, 6), chitinDark, x*.15*s, .08*s, .05*s));
    });
    // Teal energy core in chest
    const core = new THREE.Mesh(new THREE.SphereGeometry(.06*s, 8, 6), glow);
    core.position.set(0, 1.0*s, .18*s); g.add(core);
    g.userData.bodyMesh = torso; return g;
}

function buildSporeDrifterModel(c, s) {
    // Floating alien jellyfish — bioluminescent with trailing tendrils
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.3), emissiveIntensity: 1.2, roughness: .3, transparent: true, opacity: .85 });
    const tendrilMat = new THREE.MeshStandardMaterial({ color: 0x88ffcc, emissive: 0x44ddaa, emissiveIntensity: 1.5, transparent: true, opacity: .6 });
    const sporeMat = new THREE.MeshStandardMaterial({ color: 0xaaffdd, emissive: 0x88eebb, emissiveIntensity: 2.5, transparent: true, opacity: .5 });
    // Bell/dome body
    const bell = new THREE.Mesh(new THREE.SphereGeometry(.3*s, 10, 8, 0, Math.PI*2, 0, Math.PI*.6), bodyMat);
    bell.position.y = .8*s; bell.castShadow = true; g.add(bell);
    // Inner glow
    const inner = new THREE.Mesh(new THREE.SphereGeometry(.18*s, 8, 6), sporeMat);
    inner.position.y = .7*s; g.add(inner);
    // Trailing tendrils
    for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        const r = .15*s;
        for (let j = 0; j < 4; j++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry((.03-.005*j)*s, 4, 4), tendrilMat);
            seg.position.set(Math.cos(a)*r, (.5-.12*j)*s, Math.sin(a)*r);
            g.add(seg);
        }
    }
    // Floating spore particles
    for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(.02*s, 4, 4), sporeMat);
        sp.position.set((Math.random()-.5)*.5*s, .4+Math.random()*.6*s, (Math.random()-.5)*.5*s);
        g.add(sp);
    }
    g.userData.bodyMesh = bell; return g;
}

function buildCrystalResonatorModel(c, s) {
    // Living crystal construct — geometric with psionic energy veins
    const g = new THREE.Group();
    const crystalMat = new THREE.MeshStandardMaterial({ color: c, roughness: .15, metalness: .7 });
    const veinMat = new THREE.MeshStandardMaterial({ color: 0x44ffdd, emissive: 0x33eebb, emissiveIntensity: 2.5 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x66ffee, emissive: 0x44ddcc, emissiveIntensity: 3.0, transparent: true, opacity: .8 });
    // Main crystal body — tall hexagonal prism
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.2*s, .3*s, .9*s, 6), crystalMat);
    body.position.y = .6*s; body.castShadow = true; g.add(body);
    // Crystal spires growing from the body
    for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI*2;
        const h = (.3+Math.random()*.4)*s;
        const sp = new THREE.Mesh(new THREE.ConeGeometry(.06*s, h, 5), crystalMat);
        sp.position.set(Math.cos(a)*.2*s, (.5+Math.random()*.4)*s, Math.sin(a)*.2*s);
        sp.rotation.set((Math.random()-.5)*.4, a, (Math.random()-.5)*.3);
        g.add(sp);
    }
    // Energy veins
    for (let i = 0; i < 3; i++) {
        const vein = new THREE.Mesh(new THREE.BoxGeometry(.03*s, .3*s, .03*s), veinMat);
        const a = (i/3)*Math.PI*2;
        vein.position.set(Math.cos(a)*.15*s, (.4+i*.15)*s, Math.sin(a)*.15*s);
        vein.rotation.set(0, a, Math.random()*.3);
        g.add(vein);
    }
    // Psionic core
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(.1*s, 0), coreMat);
    core.position.y = 1.1*s; g.add(core);
    // Eye-like sensor
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x44ffcc, emissiveIntensity: 4.0 });
    g.add(_m(new THREE.SphereGeometry(.04*s, 8, 8), eyeMat, 0, .8*s, .2*s));
    g.userData.bodyMesh = body; return g;
}

function buildChitinStalkerModel(c, s) {
    // Low-slung insectoid ambush predator — spider/scorpion hybrid
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: .5, metalness: .3 });
    const dm = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(.4), roughness: .6 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 2.5 });
    // Flat oval body — low to ground
    const body = new THREE.Mesh(new THREE.SphereGeometry(.25*s, 8, 6), m);
    body.position.y = .18*s; body.scale.set(1.2, .4, 1.5); body.castShadow = true; g.add(body);
    // Head segment
    const head = new THREE.Mesh(new THREE.SphereGeometry(.12*s, 6, 6), dm);
    head.position.set(0, .2*s, .3*s); head.scale.set(1, .7, 1.2); g.add(head);
    // Multiple red eyes
    for (let i = 0; i < 6; i++) {
        const ex = (i-2.5)*.03*s;
        const ey = .22*s + (Math.abs(i-2.5) < 1.5 ? .02*s : 0);
        g.add(_m(new THREE.SphereGeometry(.012*s, 4, 4), eyeMat, ex, ey, .38*s));
    }
    // Mandible pincers
    [-1,1].forEach(x => {
        const pincer = new THREE.Mesh(new THREE.ConeGeometry(.02*s, .15*s, 4), dm);
        pincer.position.set(x*.08*s, .15*s, .42*s); pincer.rotation.x = -.7; pincer.rotation.z = x*.5;
        g.add(pincer);
    });
    // 8 legs — spidery
    for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const idx = i % 4;
        const a = (idx - 1.5) * .25;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(.012*s, .008*s, .25*s, 4), dm);
        leg.position.set(side*.22*s, .1*s, (a)*.3*s);
        leg.rotation.z = side*.9; leg.rotation.y = a;
        g.add(leg);
    }
    // Tail stinger
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.03*s, .2*s, 5), m);
    tail.position.set(0, .25*s, -.35*s); tail.rotation.x = .8; g.add(tail);
    g.userData.bodyMesh = body; return g;
}

function buildThoughtweaverModel(c, s) {
    // Ethereal psionic construct — floating robed figure with energy tendrils
    const g = new THREE.Group();
    const ghostMat = new THREE.MeshStandardMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.3), emissiveIntensity: 1.0, transparent: true, opacity: .65 });
    const psionicMat = new THREE.MeshStandardMaterial({ color: 0x8866ff, emissive: 0x6644dd, emissiveIntensity: 2.5, transparent: true, opacity: .7 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xcc88ff, emissive: 0xaa66ee, emissiveIntensity: 4.0 });
    // Flowing robed lower body — conical
    const robe = new THREE.Mesh(new THREE.ConeGeometry(.3*s, 1.0*s, 8), ghostMat);
    robe.position.y = .7*s; robe.rotation.x = Math.PI; g.add(robe);
    // Upper torso
    const torso = new THREE.Mesh(new THREE.SphereGeometry(.2*s, 8, 6), ghostMat);
    torso.position.y = 1.2*s; torso.scale.set(1, 1.3, .8); g.add(torso);
    // Hooded head
    const hood = new THREE.Mesh(new THREE.SphereGeometry(.15*s, 8, 6, 0, Math.PI*2, 0, Math.PI*.7), ghostMat);
    hood.position.y = 1.5*s; g.add(hood);
    // Glowing eyes in the hood
    [-1,1].forEach(x => { g.add(_m(new THREE.SphereGeometry(.03*s, 6, 6), eyeMat, x*.05*s, 1.52*s, .08*s)) });
    // Psionic energy arms — tendrils of light
    [-1,1].forEach(x => {
        for (let j = 0; j < 4; j++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry((.04-.008*j)*s, 4, 4), psionicMat);
            seg.position.set(x*(.2+j*.08)*s, (1.1-.1*j)*s, (.1+j*.05)*s);
            g.add(seg);
        }
    });
    // Floating rune circles
    for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry((.12+i*.06)*s, (.14+i*.06)*s, 16), psionicMat);
        ring.position.y = (1.0+i*.3)*s;
        ring.rotation.x = Math.PI/2 + (Math.random()-.5)*.3;
        g.add(ring);
    }
    g.userData.bodyMesh = torso; return g;
}

function buildNeuralParasiteModel(c, s) {
    // Brain-like creature with tendrils — psionic leech
    const g = new THREE.Group();
    const brainMat = new THREE.MeshStandardMaterial({ color: c, roughness: .35, metalness: .1 });
    const nerveMat = new THREE.MeshStandardMaterial({ color: 0x66ddbb, emissive: 0x44bb99, emissiveIntensity: 1.8, transparent: true, opacity: .7 });
    // Brain dome — wrinkled sphere
    const brainGeo = new THREE.SphereGeometry(.15*s, 10, 8);
    const pa = brainGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
        const n = 1 + Math.sin(pa.getX(i)*15)*.08 + Math.cos(pa.getZ(i)*12)*.06;
        pa.setX(i, pa.getX(i)*n); pa.setZ(i, pa.getZ(i)*n);
    }
    brainGeo.computeVertexNormals();
    const brain = new THREE.Mesh(brainGeo, brainMat);
    brain.position.y = .25*s; brain.castShadow = true; g.add(brain);
    // Neural tendrils spreading outward
    for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2;
        for (let j = 0; j < 3; j++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry((.02-.004*j)*s, 4, 4), nerveMat);
            const r = (.15+j*.08)*s;
            seg.position.set(Math.cos(a)*r, (.15-.04*j)*s, Math.sin(a)*r);
            g.add(seg);
        }
    }
    // Central eye
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff44aa, emissive: 0xdd2288, emissiveIntensity: 3.0 });
    g.add(_m(new THREE.SphereGeometry(.03*s, 6, 6), eyeMat, 0, .3*s, .12*s));
    g.userData.bodyMesh = brain; return g;
}

function buildForgeAssemblerModel(c, s) {
    // Massive bio-mechanical construct — industrial golem with molten internals
    const g = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .7 });
    const moltenMat = new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4411, emissiveIntensity: 2.0 });
    const plateMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(.5), roughness: .5, metalness: .6 });
    // Massive blocky torso with armor plates
    const bodyGeo = new THREE.DodecahedronGeometry(.45*s, 1);
    const bpa = bodyGeo.attributes.position;
    for (let i = 0; i < bpa.count; i++) {
        bpa.setY(i, bpa.getY(i)*1.2);
        const n = 1+(Math.random()-.5)*.15;
        bpa.setX(i, bpa.getX(i)*n); bpa.setZ(i, bpa.getZ(i)*n);
    }
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, metalMat);
    body.position.y = .9*s; body.castShadow = true; g.add(body);
    // Armor plates
    for (let i = 0; i < 4; i++) {
        const a = (i/4)*Math.PI*2;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(.2*s, .3*s, .04*s), plateMat);
        plate.position.set(Math.cos(a)*.35*s, (.7+Math.random()*.3)*s, Math.sin(a)*.35*s);
        plate.rotation.y = a; g.add(plate);
    }
    // Head — small relative to body, with visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(.22*s, .18*s, .2*s), plateMat);
    head.position.y = 1.5*s; g.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.18*s, .04*s, .02*s), moltenMat);
    visor.position.set(0, 1.5*s, .1*s); g.add(visor);
    // Massive arms with forge hammers
    [-1,1].forEach(x => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(.18*s, .6*s, .15*s), metalMat);
        arm.position.set(x*.55*s, .7*s, 0); g.add(arm);
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(.15*s, .15*s, .25*s), plateMat);
        hammer.position.set(x*.55*s, .3*s, .08*s); g.add(hammer);
    });
    // Legs — thick pillars
    [-1,1].forEach(x => {
        g.add(_m(new THREE.CylinderGeometry(.1*s, .12*s, .5*s, 6), metalMat, x*.22*s, .25*s, 0));
    });
    // Molten vents
    for (let i = 0; i < 4; i++) {
        const a = (i/4)*Math.PI*2+.4;
        g.add(_m(new THREE.SphereGeometry(.04*s, 4, 4), moltenMat, Math.cos(a)*.3*s, (.6+Math.random()*.3)*s, Math.sin(a)*.3*s));
    }
    const lt = new THREE.PointLight(0xff6622, .6, 5*s); lt.position.y = .8*s; g.add(lt);
    g.userData.bodyMesh = body; return g;
}

function buildMoltenDroneModel(c, s) {
    // Armored hive war-hound — four-legged bio-mech attack dog
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .35 });
    const hotMat = new THREE.MeshStandardMaterial({ color: 0xff5522, emissive: 0xff3311, emissiveIntensity: 1.5 });
    const dm = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(.5), roughness: .6 });
    // Sleek body — elongated
    const body = new THREE.Mesh(new THREE.BoxGeometry(.3*s, .22*s, .55*s), m);
    body.position.y = .35*s; body.castShadow = true; g.add(body);
    // Head with chitin plates
    const head = new THREE.Mesh(new THREE.BoxGeometry(.18*s, .15*s, .22*s), m);
    head.position.set(0, .4*s, .35*s); g.add(head);
    // Heated maw
    g.add(_m(new THREE.BoxGeometry(.1*s, .05*s, .08*s), hotMat, 0, .35*s, .45*s));
    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 2.5 });
    [-1,1].forEach(x => { g.add(_m(new THREE.SphereGeometry(.02*s, 6, 6), eyeMat, x*.06*s, .44*s, .42*s)) });
    // Four legs
    [[-0.12,.18],[.12,.18],[-.12,-.18],[.12,-.18]].forEach(([lx,lz]) => {
        g.add(_m(new THREE.CylinderGeometry(.03*s, .025*s, .25*s, 6), dm, lx*s, .12*s, lz*s));
    });
    // Tail — superheated blade
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.03*s, .25*s, 5), hotMat);
    tail.position.set(0, .38*s, -.35*s); tail.rotation.x = .7; g.add(tail);
    // Dorsal vents
    for (let i = 0; i < 3; i++) {
        g.add(_m(new THREE.ConeGeometry(.025*s, .08*s, 4), hotMat, 0, .5*s, (.1-.1*i)*s));
    }
    g.userData.bodyMesh = body; return g;
}

function buildMindshatterEliteModel(c, s) {
    // Overmind's personal guard — tall knight with psionic halberd
    const g = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: c, roughness: .25, metalness: .65 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: .4, metalness: .5 });
    const psionicMat = new THREE.MeshStandardMaterial({ color: 0xaa66ff, emissive: 0x8844dd, emissiveIntensity: 2.0 });
    // Tall armored body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.22*s, .28*s, .9*s, 8), armorMat);
    body.position.y = .65*s; body.castShadow = true; g.add(body);
    // Helmet — enclosed with psionic visor
    const helm = new THREE.Mesh(new THREE.BoxGeometry(.22*s, .24*s, .22*s), darkMat);
    helm.position.y = 1.2*s; g.add(helm);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.16*s, .03*s, .02*s), psionicMat);
    visor.position.set(0, 1.18*s, .11*s); g.add(visor);
    // Crown spikes
    g.add(_m(new THREE.ConeGeometry(.03*s, .18*s, 5), armorMat, 0, 1.4*s, 0));
    [-1,1].forEach(x => { g.add(_m(new THREE.ConeGeometry(.02*s, .12*s, 4), armorMat, x*.08*s, 1.35*s, 0)) });
    // Shoulder guards
    [-1,1].forEach(x => {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(.18*s, .1*s, .15*s), armorMat);
        sp.position.set(x*.3*s, 1.0*s, 0); g.add(sp);
    });
    // Psionic halberd
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.015*s, .015*s, 1.3*s, 6), darkMat);
    shaft.position.set(.3*s, .7*s, .1*s); g.add(shaft);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.04*s, .3*s, .12*s), psionicMat);
    blade.position.set(.3*s, 1.4*s, .1*s); g.add(blade);
    // Legs
    [-1,1].forEach(x => {
        g.add(_m(new THREE.CylinderGeometry(.06*s, .05*s, .4*s, 6), darkMat, x*.12*s, .2*s, 0));
    });
    // Psionic aura
    const aura = new THREE.Mesh(new THREE.RingGeometry(.35*s, .38*s, 24), psionicMat);
    aura.rotation.x = -Math.PI/2; aura.position.y = .02; g.add(aura);
    g.userData.bodyMesh = body; return g;
}

function buildVoidLasherModel(c, s) {
    // Psionic serpent with corrosive tendrils
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: .35, metalness: .2 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x9955ff, emissive: 0x7733dd, emissiveIntensity: 2.0, transparent: true, opacity: .75 });
    // Serpentine body segments
    for (let i = 0; i < 10; i++) {
        const r = (.1-.006*i)*s;
        const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), i%3===0 ? glowMat : m);
        seg.position.set(Math.sin(i*.5)*.12*s, (.2+i*.05)*s, -i*.1*s);
        g.add(seg);
    }
    // Cobra-like hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(.3*s, .18*s, .03*s), m);
    hood.position.set(0, .35*s, .05*s); g.add(hood);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(.15*s, .1*s, .15*s), m);
    head.position.set(0, .4*s, .1*s); g.add(head);
    // Psionic eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xdd55ff, emissive: 0xbb33dd, emissiveIntensity: 3.0 });
    [-1,1].forEach(x => { g.add(_m(new THREE.SphereGeometry(.02*s, 6, 6), eyeMat, x*.05*s, .43*s, .16*s)) });
    // Lashing tendrils from sides
    [-1,1].forEach(x => {
        for (let j = 0; j < 3; j++) {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(.008*s, .004*s, .2*s, 4), glowMat);
            t.position.set(x*.18*s, .3*s, -.1*j*s);
            t.rotation.z = x*1.2; t.rotation.y = j*.3;
            g.add(t);
        }
    });
    g.userData.bodyMesh = head; return g;
}

function buildHivePriestModel(c, s) {
    // Hive clergy — robed insectoid with psionic staff and ritual ornaments
    const g = new THREE.Group();
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: .6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .7 });
    const holyMat = new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xddaa22, emissiveIntensity: 2.0 });
    // Robed body
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(.18*s, .35*s, 1.1*s, 8), robeMat);
    robe.position.y = .55*s; robe.castShadow = true; g.add(robe);
    // Head — insectoid with golden crown
    g.add(_m(new THREE.SphereGeometry(.12*s, 8, 6), goldMat, 0, 1.2*s, 0));
    g.add(_m(new THREE.ConeGeometry(.16*s, .2*s, 6), goldMat, 0, 1.35*s, 0));
    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.5 });
    [-1,1].forEach(x => { g.add(_m(new THREE.SphereGeometry(.02*s, 6, 6), eyeMat, x*.04*s, 1.22*s, .09*s)) });
    // Psionic staff
    g.add(_m(new THREE.CylinderGeometry(.012*s, .012*s, 1.2*s, 6), new THREE.MeshStandardMaterial({ color: 0x332200 }), .22*s, .6*s, 0));
    g.add(_m(new THREE.OctahedronGeometry(.06*s, 0), holyMat, .22*s, 1.25*s, 0));
    // Ritual rings
    for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry((.18+i*.06)*s, .012*s, 4, 12), holyMat);
        ring.position.y = (.7+i*.2)*s; ring.rotation.x = Math.PI/2+(Math.random()-.5)*.3;
        g.add(ring);
    }
    g.userData.bodyMesh = robe; return g;
}

function buildConduitHorrorModel(c, s) {
    // Manifestation of raw hive consciousness — larger, more terrifying wraith
    const g = new THREE.Group();
    const ghostMat = new THREE.MeshStandardMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.4), emissiveIntensity: 1.2, transparent: true, opacity: .55 });
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xaa44ff, emissive: 0x8822dd, emissiveIntensity: 3.0, transparent: true, opacity: .7 });
    // Massive ethereal body
    const body = new THREE.Mesh(new THREE.ConeGeometry(.35*s, 1.2*s, 8), ghostMat);
    body.position.y = .8*s; body.rotation.x = Math.PI; g.add(body);
    // Multiple faces/heads merged together
    for (let i = 0; i < 3; i++) {
        const a = (i/3)*Math.PI*2;
        const hd = new THREE.Mesh(new THREE.SphereGeometry(.12*s, 6, 6), ghostMat);
        hd.position.set(Math.cos(a)*.1*s, 1.4*s+i*.05*s, Math.sin(a)*.1*s);
        g.add(hd);
        // Eyes for each face
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff44aa, emissive: 0xdd2288, emissiveIntensity: 4.0 });
        [-1,1].forEach(x => {
            g.add(_m(new THREE.SphereGeometry(.02*s, 4, 4), eyeMat,
                Math.cos(a)*.1*s+x*.04*s, 1.43*s+i*.05*s, Math.sin(a)*.1*s+.08*s));
        });
    }
    // Psionic fire trail
    for (let i = 0; i < 8; i++) {
        g.add(_m(new THREE.SphereGeometry(.05*s, 4, 4), fireMat,
            (Math.random()-.5)*.5*s, .2+Math.random()*.8*s, (Math.random()-.5)*.5*s));
    }
    const lt = new THREE.PointLight(0x8844dd, 1.0, 6*s); lt.position.y = .8*s; g.add(lt);
    g.userData.bodyMesh = body; return g;
}

function buildCoreWardenModel(c, s) {
    // Massive chitin-crystal hybrid golem fused to the sanctum
    const g = new THREE.Group();
    const crystalMat = new THREE.MeshStandardMaterial({ color: c, roughness: .15, metalness: .6 });
    const chitinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(.4), roughness: .5, metalness: .4 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x66ffee, emissive: 0x44ddcc, emissiveIntensity: 2.5, transparent: true, opacity: .8 });
    // Huge irregular body
    const bodyGeo = new THREE.DodecahedronGeometry(.5*s, 1);
    const bpa = bodyGeo.attributes.position;
    for (let i = 0; i < bpa.count; i++) {
        bpa.setY(i, bpa.getY(i)*1.4);
        const n = 1+(Math.random()-.5)*.25;
        bpa.setX(i, bpa.getX(i)*n); bpa.setZ(i, bpa.getZ(i)*n);
    }
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, crystalMat);
    body.position.y = .9*s; body.castShadow = true; g.add(body);
    // Crystal formations erupting from body
    for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        const h = (.25+Math.random()*.35)*s;
        const cr = new THREE.Mesh(new THREE.ConeGeometry(.06*s, h, 5), crystalMat);
        cr.position.set(Math.cos(a)*.35*s, (.6+Math.random()*.5)*s, Math.sin(a)*.35*s);
        cr.rotation.set((Math.random()-.5)*.5, 0, (Math.random()-.5)*.5);
        g.add(cr);
    }
    // Energy core
    const core = new THREE.Mesh(new THREE.SphereGeometry(.15*s, 10, 8), coreMat);
    core.position.y = 1.0*s; g.add(core);
    // Eye
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x44ffdd, emissiveIntensity: 4.0 });
    g.add(_m(new THREE.SphereGeometry(.06*s, 8, 8), eyeMat, 0, 1.5*s, .15*s));
    // Arms — crystal pillars
    [-1,1].forEach(x => {
        g.add(_m(new THREE.BoxGeometry(.18*s, .7*s, .15*s), chitinMat, x*.55*s, .7*s, 0));
        g.add(_m(new THREE.DodecahedronGeometry(.12*s, 0), crystalMat, x*.55*s, .25*s, 0));
    });
    // Legs
    [-1,1].forEach(x => {
        g.add(_m(new THREE.BoxGeometry(.16*s, .45*s, .16*s), chitinMat, x*.22*s, .22*s, 0));
    });
    const lt = new THREE.PointLight(0x44ddcc, .8, 6*s); lt.position.y = 1.0*s; g.add(lt);
    g.userData.bodyMesh = body; return g;
}

function buildBroodmotherModel(c, s) {
    // Boss 1 — massive insectoid queen with egg sacs and chitinous armor
    const g = new THREE.Group();
    const chitin = new THREE.MeshStandardMaterial({ color: c, roughness: .4, metalness: .4 });
    const softMat = new THREE.MeshStandardMaterial({ color: 0x662222, roughness: .6, metalness: .1 });
    const eggMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, emissive: 0xaa6622, emissiveIntensity: .8, transparent: true, opacity: .7 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 4.0 });
    // Massive thorax
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(.5*s, 10, 8), chitin);
    thorax.position.y = .7*s; thorax.scale.set(1, .7, 1.4); thorax.castShadow = true; g.add(thorax);
    // Abdomen — bulging with eggs
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(.6*s, 10, 8), softMat);
    abdomen.position.set(0, .5*s, -.6*s); abdomen.scale.set(.8, .6, 1.2); g.add(abdomen);
    // Egg sacs
    for (let i = 0; i < 4; i++) {
        const a = (i/4)*Math.PI*2;
        const egg = new THREE.Mesh(new THREE.SphereGeometry(.12*s, 6, 6), eggMat);
        egg.position.set(Math.cos(a)*.35*s, .35*s, -.6*s+Math.sin(a)*.3*s);
        g.add(egg);
    }
    // Head with massive mandibles
    const head = new THREE.Mesh(new THREE.SphereGeometry(.2*s, 8, 6), chitin);
    head.position.set(0, 1.0*s, .4*s); g.add(head);
    // Crown
    for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI;
        const horn = new THREE.Mesh(new THREE.ConeGeometry(.04*s, .3*s, 5), chitin);
        horn.position.set(Math.cos(a)*.12*s, 1.2*s, .4*s+Math.sin(a)*.06*s);
        horn.rotation.x = -.3; horn.rotation.z = (Math.random()-.5)*.3;
        g.add(horn);
    }
    // Eyes — many
    for (let i = 0; i < 4; i++) {
        g.add(_m(new THREE.SphereGeometry(.03*s, 6, 6), eyeMat, (i-1.5)*.06*s, 1.05*s, .55*s));
    }
    // Mandibles
    [-1,1].forEach(x => {
        const md = new THREE.Mesh(new THREE.ConeGeometry(.04*s, .25*s, 5), chitin);
        md.position.set(x*.12*s, .9*s, .55*s); md.rotation.x = -.8; md.rotation.z = x*.5;
        g.add(md);
    });
    // Legs
    for (let i = 0; i < 6; i++) {
        const side = i < 3 ? -1 : 1;
        const idx = i % 3;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04*s, .025*s, .5*s, 5), chitin);
        leg.position.set(side*.45*s, .3*s, (.2-.3*idx)*s);
        leg.rotation.z = side*.9;
        g.add(leg);
    }
    const lt = new THREE.PointLight(0xff2200, 1.5, 8*s); lt.position.y = .8*s; g.add(lt);
    g.userData.bodyMesh = thorax; return g;
}

function buildCrystalwardenBossModel(c, s) {
    // Boss 2 — colossal crystal construct absorbing psionic energy
    const g = new THREE.Group();
    const crystalMat = new THREE.MeshStandardMaterial({ color: c, roughness: .1, metalness: .75 });
    const energyMat = new THREE.MeshStandardMaterial({ color: 0x66ffee, emissive: 0x44ddcc, emissiveIntensity: 3.0, transparent: true, opacity: .8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x112222, roughness: .3, metalness: .6 });
    // Massive crystalline body
    const bodyGeo = new THREE.DodecahedronGeometry(.6*s, 1);
    const pa = bodyGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) { pa.setY(i, pa.getY(i)*1.5); const n=1+(Math.random()-.5)*.2; pa.setX(i, pa.getX(i)*n); pa.setZ(i, pa.getZ(i)*n) }
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, crystalMat);
    body.position.y = 1.0*s; body.castShadow = true; g.add(body);
    // Crystal crown of spires
    for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2;
        const h = (.3+Math.random()*.5)*s;
        const cr = new THREE.Mesh(new THREE.ConeGeometry(.05*s, h, 5), crystalMat);
        cr.position.set(Math.cos(a)*.3*s, (1.4+Math.random()*.2)*s, Math.sin(a)*.3*s);
        cr.rotation.set((Math.random()-.5)*.3, 0, (Math.random()-.5)*.3);
        g.add(cr);
    }
    // Central energy core — visible through "chest"
    const core = new THREE.Mesh(new THREE.SphereGeometry(.2*s, 12, 10), energyMat);
    core.position.y = 1.1*s; g.add(core);
    // Eye
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x33eedd, emissiveIntensity: 5.0 });
    g.add(_m(new THREE.SphereGeometry(.07*s, 8, 8), eyeMat, 0, 1.7*s, .2*s));
    // Arms — massive crystal formations
    [-1,1].forEach(x => {
        g.add(_m(new THREE.BoxGeometry(.2*s, .8*s, .18*s), darkMat, x*.6*s, .8*s, 0));
        g.add(_m(new THREE.OctahedronGeometry(.15*s, 0), energyMat, x*.6*s, .3*s, 0));
    });
    // Legs
    [-1,1].forEach(x => { g.add(_m(new THREE.BoxGeometry(.18*s, .5*s, .18*s), darkMat, x*.25*s, .25*s, 0)) });
    // Energy ring orbiting
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.5*s, .02*s, 6, 24), energyMat);
    ring.position.y = 1.0*s; ring.rotation.x = Math.PI/2; g.add(ring);
    const lt = new THREE.PointLight(0x44ddcc, 2.0, 10*s); lt.position.y = 1.2*s; g.add(lt);
    g.userData.bodyMesh = body; return g;
}

function buildQueenBossModel(c, s) {
    // Boss 3 — Psionic Matriarch, elegant and terrifying
    const g = new THREE.Group();
    const chitin = new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xcc8822, roughness: .2, metalness: .8 });
    const psionicMat = new THREE.MeshStandardMaterial({ color: 0xff3388, emissive: 0xdd1166, emissiveIntensity: 2.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0066, emissive: 0xff0044, emissiveIntensity: 5.0 });
    // Tall slender armored body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.25*s, .35*s, 1.2*s, 8), chitin);
    body.position.y = .8*s; body.castShadow = true; g.add(body);
    // Regal crown/crest
    for (let i = 0; i < 7; i++) {
        const a = (i/7)*Math.PI;
        const horn = new THREE.Mesh(new THREE.ConeGeometry(.03*s, (.3+Math.random()*.2)*s, 5), goldMat);
        horn.position.set(Math.cos(a)*.1*s, 1.6*s, Math.sin(a)*.06*s-.02*s);
        horn.rotation.x = -.2; horn.rotation.z = (i-3)*.15;
        g.add(horn);
    }
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(.16*s, 8, 6), chitin);
    head.position.y = 1.5*s; head.scale.set(1, 1.2, .9); g.add(head);
    // Eyes
    [-1,1].forEach(x => { g.add(_m(new THREE.SphereGeometry(.04*s, 8, 8), eyeMat, x*.06*s, 1.53*s, .1*s)) });
    // Four razor limbs (2 upper, 2 lower)
    [-1,1].forEach(x => {
        // Upper arms — blade-like
        const arm = new THREE.Mesh(new THREE.BoxGeometry(.04*s, .6*s, .12*s), goldMat);
        arm.position.set(x*.4*s, 1.0*s, .1*s); arm.rotation.z = x*.3; g.add(arm);
        // Lower arms
        const arm2 = new THREE.Mesh(new THREE.BoxGeometry(.03*s, .5*s, .08*s), chitin);
        arm2.position.set(x*.35*s, .6*s, .05*s); arm2.rotation.z = x*.2; g.add(arm2);
    });
    // Flowing "robe" base — chitin plates
    g.add(_m(new THREE.CylinderGeometry(.3*s, .45*s, .3*s, 8), chitin, 0, .2*s, 0));
    // Psionic aura ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.4*s, .015*s, 6, 24), psionicMat);
    ring.position.y = 1.0*s; ring.rotation.x = Math.PI/2; g.add(ring);
    // Psionic crown glow
    const crownGlow = new THREE.Mesh(new THREE.RingGeometry(.15*s, .18*s, 16), psionicMat);
    crownGlow.position.y = 1.7*s; crownGlow.rotation.x = -Math.PI/2; g.add(crownGlow);
    const lt = new THREE.PointLight(0xff2266, 1.5, 8*s); lt.position.y = 1.2*s; g.add(lt);
    g.userData.bodyMesh = body; return g;
}

function buildOvermindBossModel(c, s) {
    // Final Boss — colossal crystalline brain in psionic web
    const g = new THREE.Group();
    const crystalMat = new THREE.MeshStandardMaterial({ color: c, roughness: .1, metalness: .6 });
    const brainMat = new THREE.MeshStandardMaterial({ color: 0x226655, roughness: .3, metalness: .2 });
    const psionicMat = new THREE.MeshStandardMaterial({ color: 0x66ffee, emissive: 0x44ddcc, emissiveIntensity: 3.5, transparent: true, opacity: .75 });
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0xdd2233, emissiveIntensity: 2.0, transparent: true, opacity: .7 });
    // Massive crystalline brain
    const brainGeo = new THREE.SphereGeometry(.7*s, 14, 12);
    const bpa = brainGeo.attributes.position;
    for (let i = 0; i < bpa.count; i++) {
        const n = 1 + Math.sin(bpa.getX(i)*8)*.1 + Math.cos(bpa.getZ(i)*6)*.08;
        bpa.setX(i, bpa.getX(i)*n); bpa.setZ(i, bpa.getZ(i)*n);
        bpa.setY(i, bpa.getY(i)*(1+Math.sin(bpa.getX(i)*5)*.05));
    }
    brainGeo.computeVertexNormals();
    const brain = new THREE.Mesh(brainGeo, brainMat);
    brain.position.y = 1.2*s; brain.castShadow = true; g.add(brain);
    // Crystalline shell fragments
    for (let i = 0; i < 10; i++) {
        const a = (i/10)*Math.PI*2;
        const cr = new THREE.Mesh(new THREE.ConeGeometry(.08*s, (.3+Math.random()*.4)*s, 5), crystalMat);
        cr.position.set(Math.cos(a)*.6*s, (.8+Math.random()*.8)*s, Math.sin(a)*.6*s);
        cr.rotation.set((Math.random()-.5)*.5, a, (Math.random()-.5)*.5);
        g.add(cr);
    }
    // Central psionic eye
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0033, emissiveIntensity: 6.0 });
    g.add(_m(new THREE.SphereGeometry(.1*s, 10, 10), eyeMat, 0, 1.3*s, .5*s));
    // Psionic tendrils extending outward
    for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2;
        for (let j = 0; j < 5; j++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry((.05-.006*j)*s, 4, 4), psionicMat);
            const r = (.5+j*.15)*s;
            seg.position.set(Math.cos(a)*r, (1.0-.08*j)*s, Math.sin(a)*r);
            g.add(seg);
        }
    }
    // Crimson fire particles
    for (let i = 0; i < 6; i++) {
        g.add(_m(new THREE.SphereGeometry(.06*s, 4, 4), fireMat,
            (Math.random()-.5)*1.0*s, .5+Math.random()*1.5*s, (Math.random()-.5)*1.0*s));
    }
    // Energy rings
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry((.5+i*.15)*s, .015*s, 6, 24), psionicMat);
        ring.position.y = (1.0+i*.15)*s;
        ring.rotation.x = Math.PI/2+(i-.5)*.3;
        ring.rotation.z = i*.5;
        g.add(ring);
    }
    // Base — psionic web/roots
    for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(.03*s, .06*s, .8*s, 5), brainMat);
        root.position.set(Math.cos(a)*.4*s, .2*s, Math.sin(a)*.4*s);
        root.rotation.z = Math.cos(a)*.6; root.rotation.x = Math.sin(a)*.6;
        g.add(root);
    }
    const lt = new THREE.PointLight(0x33eedd, 2.5, 12*s); lt.position.y = 1.2*s; g.add(lt);
    const lt2 = new THREE.PointLight(0xff2233, 1.0, 8*s); lt2.position.y = .5*s; g.add(lt2);
    g.userData.bodyMesh = brain; return g;
}

function buildLootChestModel(s = 1.0) {
    // Bio-mechanical chitin crate with pulsing teal energy
    const g = new THREE.Group();
    const chitin = new THREE.MeshStandardMaterial({ color: 0x220505, roughness: .6, metalness: .4 });
    const crystal = new THREE.MeshStandardMaterial({ color: 0x44ccaa, emissive: 0x33aa88, emissiveIntensity: 2.0 });
    const rim = new THREE.MeshStandardMaterial({ color: 0x110202, roughness: .4, metalness: .6 });

    // Main box body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8*s, 0.5*s, 0.55*s), chitin);
    body.position.y = 0.25*s;
    body.castShadow = true;
    g.add(body);

    // Lid - slightly larger
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.85*s, 0.15*s, 0.6*s), chitin);
    // Pivot lid from the back edge
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.5*s, -0.3*s); // Move to back edge
    lid.position.set(0, 0.075*s, 0.3*s); // Center lid relative to pivot
    lidGroup.add(lid);
    g.add(lidGroup);
    g.userData.lid = lidGroup;

    // Crystal lock/glow
    const lock = new THREE.Mesh(new THREE.OctahedronGeometry(0.08*s, 0), crystal);
    lock.position.set(0, 0.075*s, 0.6*s); // Position on lid
    lidGroup.add(lock);

    // Angular chitin trim/reinforcement
    [-1, 1].forEach(x => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.05*s, 0.6*s, 0.6*s), rim);
        trim.position.set(x * 0.4*s, 0.3*s, 0);
        g.add(trim);
    });

    // Pulse energy strips on sides
    [-1, 1].forEach(z => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.6*s, 0.04*s, 0.02*s), crystal);
        strip.position.set(0, 0.3*s, z * 0.28*s);
        g.add(strip);
    });

    const lt = new THREE.PointLight(0x44ccaa, 1.2, 4*s);
    lt.position.set(0, 0.5*s, 0);
    g.add(lt);

    return g;
}

// Map mobShape names to builders — raid-specific shapes override dungeon ones
const RAID_MOB_BUILDERS = {
    hiveSentry: buildHiveSentryModel,
    sporeDrifter: buildSporeDrifterModel,
    crystalResonator: buildCrystalResonatorModel,
    chitinStalker: buildChitinStalkerModel,
    thoughtweaver: buildThoughtweaverModel,
    neuralParasite: buildNeuralParasiteModel,
    forgeAssembler: buildForgeAssemblerModel,
    moltenDrone: buildMoltenDroneModel,
    mindshatterElite: buildMindshatterEliteModel,
    voidLasher: buildVoidLasherModel,
    hivePriest: buildHivePriestModel,
    conduitHorror: buildConduitHorrorModel,
    coreWarden: buildCoreWardenModel,
    broodmother: buildBroodmotherModel,
    crystalwardenBoss: buildCrystalwardenBossModel,
    queenBoss: buildQueenBossModel,
    overmindBoss: buildOvermindBossModel,
    // Fallbacks for dungeon shape names still referenced
    knight: buildHiveSentryModel,
    sporecap: buildSporeDrifterModel,
    golem: buildCrystalResonatorModel,
    crawler: buildChitinStalkerModel,
    wraith: buildThoughtweaverModel,
    leech: buildNeuralParasiteModel,
    channeler: buildHivePriestModel,
    hound: buildMoltenDroneModel,
    serpent: buildVoidLasherModel,
    troggoth: buildForgeAssemblerModel,
    troggothBoss: buildCrystalwardenBossModel,
    demonLord: buildOvermindBossModel,
};

// ══════════════════════════════════════════════════════════════════════
// COMBAT VFX POOL
// ══════════════════════════════════════════════════════════════════════
const _rvfxPool = [];
const MAX_RVFX = 50;

function _spawnRVfx(root, x, y, z, color, size, life) {
    if (_rvfxPool.length >= MAX_RVFX) {
        const old = _rvfxPool.shift();
        root.remove(old.mesh);
        old.mesh.geometry.dispose(); old.mesh.material.dispose();
    }
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), mat);
    mesh.position.set(x, y, z);
    root.add(mesh);
    const vfx = { mesh, life, maxLife: life, vx: (Math.random()-.5)*2, vy: 1.5+Math.random()*2, vz: (Math.random()-.5)*2 };
    _rvfxPool.push(vfx);
    return vfx;
}

// ══════════════════════════════════════════════════════════════════════
// RAID SCENE — The Hivespire Sanctum
// Bio-mechanical alien cathedral with teal/crimson palette
// Larger rooms for 10-man raids, more dramatic props
// ══════════════════════════════════════════════════════════════════════

const RAID_ROOM_SPACING = 16;
const RAID_ARENA_RADIUS = 10;

// ══════════════════════════════════════════════════════════════════════
// RAID PARTY NPC — Lightweight 3D player-class models for 9 raid NPCs
// Uses PlayerModels.js builders for proper class silhouettes.
// ══════════════════════════════════════════════════════════════════════

// 10-man formation: player at center, NPCs in a WoW-raid spread
// Tanks front-left/right, Healers mid-rear, DPS flanking
const RAID_FORMATION = {
    Tank:   [{ x: -1.6, z:  1.5 }, { x:  1.6, z:  1.5 }],
    Healer: [{ x: -0.8, z: -3.0 }, { x:  0.8, z: -3.0 }],
    DPS:    [
        { x: -2.8, z: -0.8 },
        { x:  2.8, z: -0.8 },
        { x: -3.6, z: -2.0 },
        { x:  3.6, z: -2.0 },
        { x:  0.0, z: -1.6 },
    ],
};

function _buildRaidNpcModel(classId, isTierSet = false) {
    // Create a lightweight wrapper that exposes `group` and `parts`
    // so PlayerModels.js builders can attach meshes.
    const wrapper = {
        group: new THREE.Group(),
        parts: {},
        _aetherMats: [],
        _aetherBaseEmissive: [],
    };

    if (classId === 'mage') {
        buildVoidweaverModel(wrapper);
        if (isTierSet) _applyMageTierSet(wrapper);
    } else if (classId === 'ranger') {
        buildThornwardenModel(wrapper);
        if (isTierSet) _applyRangerTierSet(wrapper);
    } else if (classId === 'cleric') {
        buildDawnkeeperModel(wrapper);
        if (isTierSet) _applyClericTierSet(wrapper);
    } else {
        // Warrior — inline simplified Aetherblade model
        _buildSimpleWarrior(wrapper);
        if (isTierSet) _applyWarriorTierSet(wrapper);
    }

    return wrapper;
}

// ── RAID TIER SET VISUALS (Bio-Mechanical / Chitinous) ──

function _applyWarriorTierSet(w) {
    const chitinMat = new THREE.MeshStandardMaterial({ color: 0x440505, roughness: 0.4, metalness: 0.6 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0xaa1122, emissiveIntensity: 3.0 });
    
    // Add chitinous shoulder spikes
    [-1, 1].forEach(s => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), chitinMat);
        spike.position.set(s * 0.35, 1.4, 0.05);
        spike.rotation.z = s * -0.5;
        w.group.add(spike);
    });
    
    // Change sword glow to crimson
    if (w._aetherMats) {
        w._aetherMats.forEach(m => m.emissive.setHex(0xaa1122));
    }
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
    
    // Change all void glows to teal/bio-mechanical
    if (w._aetherMats) {
        w._aetherMats.forEach(m => {
            m.color.setHex(0x44ffcc);
            m.emissive.setHex(0x33eebb);
        });
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
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x44ffdd, emissive: 0x33eebb, emissiveIntensity: 2.5 });
    
    // Massive ornate halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 8, 32), goldMat);
    halo.position.set(0, 1.8, -0.1);
    w.group.add(halo);
    
    // Change holy glows to bio-teal
    if (w._aetherMats) {
        w._aetherMats.forEach(m => {
            m.color.setHex(0x44ffcc);
            m.emissive.setHex(0x33eebb);
        });
    }
}

function _buildSimpleWarrior(w) {
    const g = w.group;
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, metalness: 0.85, roughness: 0.15 });
    const armorLt = new THREE.MeshStandardMaterial({ color: 0x2a3d62, metalness: 0.82, roughness: 0.18 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xb0c0d0, metalness: 0.9, roughness: 0.1 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x55eeff, emissive: 0x33bbdd, emissiveIntensity: 2.0, transparent: true, opacity: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.6 });

    w._aetherMats = [glowMat];
    w._aetherBaseEmissive = [glowMat.emissiveIntensity];

    // Torso
    const torso = new THREE.Group();
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.65, 8), armorMat);
    chest.scale.set(1.1, 1.0, 0.65); chest.castShadow = true; torso.add(chest);
    const breast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.55, 6, 1, false, -Math.PI*.4, Math.PI*.8), armorLt);
    breast.scale.set(1.05, 1.0, 0.5); breast.position.set(0, 0, 0.06); torso.add(breast);
    torso.position.y = 0.95; g.add(torso); w.parts.torso = torso;

    // Head
    const head = new THREE.Group();
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), armorMat);
    helm.scale.set(1, 1.08, 0.9); helm.position.y = 0.02; head.add(helm);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), glowMat);
    visor.position.set(0, 0.01, 0.12); head.add(visor);
    head.position.y = 1.52; g.add(head); w.parts.head = head;

    // Shoulders
    [-1, 1].forEach(s => {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.12), silverMat);
        sp.position.set(s * 0.3, 1.22, 0); g.add(sp);
    });

    // Arms
    [-1, 1].forEach(s => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 6), armorMat);
        arm.position.set(s * 0.32, 0.85, 0); arm.rotation.z = s * 0.15; g.add(arm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), skinMat);
        hand.position.set(s * 0.34, 0.6, 0); g.add(hand);
    });

    // Legs
    [-1, 1].forEach(s => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 6), armorMat);
        leg.position.set(s * 0.1, 0.35, 0); g.add(leg);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), armorLt);
        boot.position.set(s * 0.1, 0.08, 0.02); g.add(boot);
    });

    // Sword
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.06), silverMat);
    blade.position.set(0.36, 0.75, 0.1); blade.rotation.z = 0.15; g.add(blade);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x332211 }));
    hilt.position.set(0.35, 0.48, 0.1); hilt.rotation.z = Math.PI/2; g.add(hilt);

    // Shield
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.22), armorLt);
    shield.position.set(-0.34, 0.78, 0.08); g.add(shield);
    const shieldGem = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), glowMat);
    shieldGem.position.set(-0.36, 0.78, 0.1); g.add(shieldGem);
}

export class RaidScene {
    constructor(mainScene, camera, textureLoader) {
        this.mainScene = mainScene;
        this.camera = camera;
        this.loader = textureLoader;
        this.active = false;

        this.root = new THREE.Group();
        this.root.visible = false;
        mainScene.add(this.root);

        this._objects = [];
        this._mobEntities = [];
        this._particles = [];
        this._lavaPlanes = [];
        this._currentRoomIndex = -1;
        this._spawnedForEncounter = -1;
        this._savedFog = null;
        this._savedBg = null;
        this._time = 0;
        this._attackTimer = 0;
        this._endVfxDone = false;
        this._savedOverworldLights = [];

        this._tempVec = new THREE.Vector3();
        this._projScreenMatrix = new THREE.Matrix4();
        this._frustum = new THREE.Frustum();

        this._indicatorGeo = {
            circle: new THREE.CircleGeometry(1, 32),
            line: new THREE.PlaneGeometry(1, 1),
            cone: new THREE.CircleGeometry(1, 32, 0, Math.PI / 3) // 60 degree cone
        };

        // ── Raid Party NPC entities (9 NPCs for 10-man) ──
        this._raidNpcs = [];        // { group, wrapper, memberRef, formationOffset, bobPhase }
        this._raidNpcsSpawned = false;

        // AoE Indicators
        this._indicators = [];
        this._tethers = []; // Psionic Tethers (3D lines)

        // DOM UI for high-fidelity nameplates
        this.uiContainer = null;
        this._initUI();
    }

    _initUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'raid-ui-container';
        this.uiContainer.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 45; display: none;
            perspective: 1000px;
        `;
        document.body.appendChild(this.uiContainer);

        const style = document.createElement('style');
        style.id = 'raid-ui-styles';
        style.textContent = `
            .rd-nameplate {
                position: absolute;
                display: flex; flex-direction: column; align-items: center;
                pointer-events: none;
                font-family: 'Cinzel', serif;
                width: 130px;
                transition: opacity 0.2s ease-in-out;
                will-change: transform;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .rd-name {
                color: #b89868; font-size: 11px; font-weight: 700;
                text-transform: none; letter-spacing: 0.5px;
                margin-bottom: 3px;
                text-shadow: 0 1px 2px #000, 0 0 4px rgba(0,0,0,0.8);
                white-space: nowrap;
            }
            .rd-name.boss { color: #ffcc44; font-size: 14px; text-shadow: 0 0 10px rgba(255,180,40,0.5), 0 1px 3px black; }
            .rd-name.player { color: #66ccff; }
            .rd-name.raid-member { color: #cc88ff; }
            .rd-name.mercenary { color: #ffcc44; opacity: 0.9; }
            
            .rd-hp-bg {
                width: 100%; height: 5px; background: rgba(0,0,0,0.75);
                border: 1px solid rgba(255,255,255,0.15); border-radius: 2px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.6);
                position: relative;
            }
            .rd-hp-fill {
                height: 100%; width: 100%; background: linear-gradient(180deg, #cc3333 0%, #882222 100%);
                transition: width 0.2s cubic-bezier(0.1, 0, 0.1, 1);
            }
            .rd-hp-fill.player, .rd-hp-fill.raid-member, .rd-hp-fill.mercenary { 
                background: linear-gradient(180deg, #44cc44 0%, #228822 100%); 
            }
        `;
        document.head.appendChild(style);
    }

    _createLabel(name, type, extraClass = '') {
        const plate = document.createElement('div');
        plate.className = `rd-nameplate ${type} ${extraClass}`;
        plate.innerHTML = `
            <div class="rd-name ${type}">${name}</div>
            <div class="rd-hp-bg">
                <div class="rd-hp-fill ${type}"></div>
            </div>
        `;
        this.uiContainer.appendChild(plate);
        return {
            plate,
            fill: plate.querySelector('.rd-hp-fill')
        };
    }

    _projectLabel(plate, worldPos, heightOffset) {
        if (!this._frustum || !this.camera) return;
        const tempVec = this._tempVec;
        tempVec.copy(worldPos);
        tempVec.y += heightOffset;

        if (this._frustum.containsPoint(tempVec)) {
            tempVec.project(this.camera);
            const x = Math.round((tempVec.x * 0.5 + 0.5) * window.innerWidth);
            const y = Math.round((tempVec.y * -0.5 + 0.5) * window.innerHeight);

            plate.style.display = 'flex';
            plate.style.opacity = '1';
            plate.style.left = `${x}px`;
            plate.style.top = `${y}px`;
            plate.style.transform = `translate(-50%, -100%)`;
        } else {
            plate.style.display = 'none';
        }
    }

    // ══════════════════════════════════════════════════
    // GROUND INDICATORS (Boss Mechanics)
    // ══════════════════════════════════════════════════

    spawnGroundIndicator(type, x, z, scale = 1, life = 3.0, color = 0x33ffee, rotation = 0) {
        let geo = this._indicatorGeo.circle;
        if (type === 'line') geo = this._indicatorGeo.line;
        if (type === 'cone') geo = this._indicatorGeo.cone;

        const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = rotation; // Rotate on the ground plane
        mesh.position.set(x, 0.05, z);
        
        if (type === 'line') {
            mesh.scale.set(0.5, scale * 2, 1); // Narrow long line
        } else {
            mesh.scale.setScalar(0.1);
        }
        
        this.root.add(mesh);
        
        const indicator = {
            mesh,
            type,
            life,
            maxLife: life,
            color,
            targetScale: scale,
            state: 'warning' // warning -> active -> vanishing
        };
        
        this._indicators.push(indicator);
        return indicator;
    }

    _updateIndicators(dt, time) {
        if (!this._indicators) return;
        for (let i = this._indicators.length - 1; i >= 0; i--) {
            const ind = this._indicators[i];
            ind.life -= dt;
            
            if (ind.life <= 0) {
                this.root.remove(ind.mesh);
                ind.mesh.geometry.dispose();
                ind.mesh.material.dispose();
                this._indicators.splice(i, 1);
                continue;
            }

            const t = 1 - (ind.life / ind.maxLife); // 0 -> 1
            const mesh = ind.mesh;
            const mat = mesh.material;

            // Warning phase (first 70% of life)
            if (t < 0.7) {
                const warningT = t / 0.7;
                mat.opacity = 0.2 + Math.sin(time * 15) * 0.1;
                const s = ind.targetScale * (0.8 + 0.2 * warningT);
                mesh.scale.set(s, s, s);
            } 
            // Active/Impact phase (70% - 85%)
            else if (t < 0.85) {
                if (ind.state !== 'active') {
                    ind.state = 'active';
                    // Trigger impact VFX
                    const gp = mesh.position;
                    for (let j = 0; j < 8; j++) {
                        _spawnRVfx(this.root, gp.x + (Math.random()-0.5) * ind.targetScale, 0.5 + Math.random(), gp.z + (Math.random()-0.5) * ind.targetScale, ind.color, 0.06, 0.8);
                    }
                }
                mat.opacity = 0.8;
                const s = ind.targetScale * 1.1; // Slight bulge on impact
                mesh.scale.set(s, s, s);
            }
            // Vanishing phase (last 15%)
            else {
                ind.state = 'vanishing';
                const vanishT = (t - 0.85) / 0.15;
                mat.opacity = 0.8 * (1 - vanishT);
                mesh.scale.setScalar(ind.targetScale * 1.1 * (1 + vanishT * 0.5));
            }
        }
    }

    _updateTethers(dt, time, prog) {
        if (!prog || !prog.activeMechanics) return;

        // 1. Synchronize tethers from prog state
        const tetherMechanics = prog.activeMechanics.filter(m => m.type === 'tether');
        
        // Remove old visual tethers that no longer have a mechanic
        for (let i = this._tethers.length - 1; i >= 0; i--) {
            const vt = this._tethers[i];
            if (!tetherMechanics.find(m => m.id === vt.id)) {
                this.root.remove(vt.line);
                vt.line.geometry.dispose();
                vt.line.material.dispose();
                this._tethers.splice(i, 1);
            }
        }

        // Add new visual tethers
        for (const m of tetherMechanics) {
            if (!this._tethers.find(vt => vt.id === m.id)) {
                const mat = new THREE.LineBasicMaterial({ color: m.color, transparent: true, opacity: 0.8 });
                const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
                const line = new THREE.Line(geo, mat);
                this.root.add(line);
                this._tethers.push({ id: m.id, line, m1: m.m1, m2: m.m2 });
            }
        }

        // 2. Update line positions
        for (const vt of this._tethers) {
            const npc1 = this._raidNpcs.find(n => n.memberRef.id === vt.m1.id);
            const npc2 = this._raidNpcs.find(n => n.memberRef.id === vt.m2.id);
            
            if (npc1 && npc2) {
                const p1 = npc1.group.position;
                const p2 = npc2.group.position;
                
                // Add some height
                const posArr = vt.line.geometry.attributes.position.array;
                posArr[0] = p1.x; posArr[1] = p1.y + 1.2; posArr[2] = p1.z;
                posArr[3] = p2.x; posArr[4] = p2.y + 1.2; posArr[5] = p2.z;
                vt.line.geometry.attributes.position.needsUpdate = true;
                
                // Pulse color/opacity
                vt.line.material.opacity = 0.5 + Math.sin(time * 10) * 0.3;
            }
        }
    }

    // ══════════════════════════════════════════════════
    // ENTER / EXIT
    // ══════════════════════════════════════════════════

    enter(raidDef) {
        if (this.active) return;
        this.active = true;
        this._def = raidDef;
        if (this.uiContainer) this.uiContainer.style.display = 'block';

        this._savedFog = this.mainScene.fog;
        this._savedBg = this.mainScene.background ? this.mainScene.background.clone() : null;

        this._savedOverworldLights = [];
        this.mainScene.traverse(child => {
            if (child === this.root) return;
            if (child.isLight && !this.root.getObjectById(child.id)) {
                if (child.visible) {
                    this._savedOverworldLights.push(child);
                    child.visible = false;
                }
            }
        });

        const c = raidDef.colors;
        this.mainScene.fog = new THREE.FogExp2(c.fogColor, c.fogDensity || 0.010);
        this.mainScene.background = new THREE.Color(c.sceneBg);

        this.root.visible = true;
        this._currentRoomIndex = -1;
        this._spawnedForEncounter = -1;
        this._endVfxDone = false;
        this._raidNpcsSpawned = false;

        this._buildEnvironment(raidDef);
    }

    exit() {
        if (!this.active) return;
        this.active = false;
        this.root.visible = false;
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
            this.uiContainer.innerHTML = ''; // Clear nameplates
        }

        this.mainScene.fog = this._savedFog;
        if (this._savedBg) this.mainScene.background = this._savedBg;

        for (const lt of this._savedOverworldLights) lt.visible = true;
        this._savedOverworldLights = [];

        this._cleanup();
    }

    _cleanup() {
        for (const o of this._objects) {
            this.root.remove(o);
            o.traverse(ch => {
                if (ch.geometry) ch.geometry.dispose();
                if (ch.material) {
                    if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose());
                    else ch.material.dispose();
                }
            });
        }
        // Destroy raid NPC entities
        this._destroyRaidNpcs();

        for (const v of _rvfxPool) { this.root.remove(v.mesh); v.mesh.geometry?.dispose(); v.mesh.material?.dispose(); }
        _rvfxPool.length = 0;

        for (const ind of this._indicators) {
            this.root.remove(ind.mesh);
            ind.mesh.geometry.dispose();
            ind.mesh.material.dispose();
        }
        this._indicators = [];

        this._objects = []; this._mobEntities = []; this._particles = []; this._lavaPlanes = [];
        this._currentRoomIndex = -1; this._spawnedForEncounter = -1;
    }

    _add(o) { this.root.add(o); this._objects.push(o); return o; }

    getRoomCenter(roomIndex) {
        return new THREE.Vector3(0, 0, -roomIndex * RAID_ROOM_SPACING);
    }

    // ══════════════════════════════════════════════════
    // BUILD ENVIRONMENT — Hivespire Sanctum
    // ══════════════════════════════════════════════════

    _buildEnvironment(def) {
        const c = def.colors;
        const ENC = def.encounters.length;
        const TOTAL_LENGTH = ENC * RAID_ROOM_SPACING + 30;

        // ── Lighting — alien bio-luminescent ──
        const amb = new THREE.AmbientLight(c.ambientLight || 0x3a1525, 1.4);
        this._add(amb);

        const dir = new THREE.DirectionalLight(c.directionalLight || 0xcc4466, 1.0);
        dir.position.set(10, 30, 10);
        this._add(dir);
        this._raidDirLight = dir;

        const hemi = new THREE.HemisphereLight(0xcc4466, 0x0a0205, 0.5);
        this._add(hemi);

        const fillLight = new THREE.PointLight(0x44ccaa, 1.0, 30);
        fillLight.position.set(0, 5, 0);
        this._add(fillLight);
        this._followLight = fillLight;

        // ── Ground — organic chitin floor ──
        const groundMat = new THREE.MeshStandardMaterial({
            color: c.groundTint || 0x1a0508, roughness: .8, metalness: .2
        });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, TOTAL_LENGTH + 40), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.01, -TOTAL_LENGTH / 2 + 15);
        ground.receiveShadow = true;
        this._add(ground);

        // ── Organic veins on ground ──
        const veinMat = new THREE.MeshStandardMaterial({
            color: 0x33ccaa, emissive: 0x22aa88, emissiveIntensity: .5, transparent: true, opacity: .3
        });
        for (let i = 0; i < 30; i++) {
            const vein = new THREE.Mesh(
                new THREE.PlaneGeometry(.05 + Math.random() * .1, 2 + Math.random() * 5), veinMat
            );
            vein.rotation.x = -Math.PI / 2;
            vein.rotation.z = Math.random() * Math.PI;
            vein.position.set((Math.random() - .5) * 35, 0.01, 15 - Math.random() * TOTAL_LENGTH);
            this._add(vein);
        }

        // ── Bioluminescent lava/ichor rivers ──
        const lavaMat = new THREE.MeshStandardMaterial({
            color: c.lavaColor || 0x33ccaa, emissive: c.lavaColor || 0x33ccaa,
            emissiveIntensity: .8, roughness: .15
        });
        [-22, 22].forEach(x => {
            const lava = new THREE.Mesh(new THREE.PlaneGeometry(7, TOTAL_LENGTH + 40), lavaMat);
            lava.rotation.x = -Math.PI / 2;
            lava.position.set(x, -0.08, -TOTAL_LENGTH / 2 + 15);
            this._add(lava);
            this._lavaPlanes.push(lava);
        });

        // ── Chitin walls — organic hive architecture ──
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x150408, roughness: .6, metalness: .3 });
        const chitinWallMat = new THREE.MeshStandardMaterial({
            color: 0x2a0810, roughness: .5, metalness: .4
        });
        [-1, 1].forEach(side => {
            for (let i = 0; i < Math.ceil(TOTAL_LENGTH / 5); i++) {
                const z = 15 - i * 5;
                const height = 4 + Math.random() * 5;
                const width = 2.5 + Math.random() * 3;
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(width, height, 4.5 + Math.random() * 2),
                    i % 3 === 0 ? chitinWallMat : wallMat
                );
                wall.position.set(side * (25 + Math.random() * 3), height / 2 - .5, z + Math.random() * 2);
                wall.rotation.y = Math.random() * .3;
                this._add(wall);
            }
        });

        // ── Path — pulsing chitin walkway ──
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x221015, roughness: .6, metalness: .3 });
        const path = new THREE.Mesh(new THREE.BoxGeometry(4.5, .08, TOTAL_LENGTH), pathMat);
        path.position.set(0, 0.01, -TOTAL_LENGTH / 2 + 15);
        this._add(path);

        // Path edge bioluminescent strips
        const edgeGlow = new THREE.MeshStandardMaterial({
            color: 0x44ccaa, emissive: 0x33aa88, emissiveIntensity: 1.0, transparent: true, opacity: .4
        });
        [-1, 1].forEach(side => {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(.12, .06, TOTAL_LENGTH), edgeGlow);
            strip.position.set(side * 2.3, 0.04, -TOTAL_LENGTH / 2 + 15);
            this._add(strip);
        });

        // ── Per-room features ──
        for (let ri = 0; ri < ENC; ri++) {
            const center = this.getRoomCenter(ri);
            const enc = def.encounters[ri];
            const isBoss = enc.type === 'boss';

            // ── Arena ground — larger circular clearing ──
            const arenaMat = new THREE.MeshStandardMaterial({
                color: isBoss ? 0x2a0510 : 0x1a0a12, roughness: .7, metalness: .15
            });
            const arena = new THREE.Mesh(new THREE.CircleGeometry(RAID_ARENA_RADIUS, 32), arenaMat);
            arena.rotation.x = -Math.PI / 2;
            arena.position.set(center.x, 0.02, center.z);
            this._add(arena);

            // ── Chitin pillars — organic architecture ──
            const pillarCount = isBoss ? 8 : 6;
            for (let pi = 0; pi < pillarCount; pi++) {
                const angle = (pi / pillarCount) * Math.PI * 2 + Math.PI / 6;
                const px = center.x + Math.cos(angle) * (RAID_ARENA_RADIUS + 1);
                const pz = center.z + Math.sin(angle) * (RAID_ARENA_RADIUS + 1);
                const pillarH = 4 + Math.random() * 3;
                const pillarMat = new THREE.MeshStandardMaterial({ color: 0x180508, roughness: .5, metalness: .4 });
                const p = new THREE.Mesh(new THREE.CylinderGeometry(.25, .5, pillarH, 6), pillarMat);
                p.position.set(px, pillarH / 2, pz);
                this._add(p);

                // Teal crystal veins on pillars
                const crystalMat = new THREE.MeshStandardMaterial({
                    color: c.particleColor || 0x44ccaa, emissive: c.particleColor || 0x44ccaa, emissiveIntensity: 1.2
                });
                for (let ci = 0; ci < 3; ci++) {
                    const cr = new THREE.Mesh(new THREE.BoxGeometry(.03, .6 + Math.random() * .4, .03), crystalMat);
                    cr.position.set(px + Math.cos(angle + ci) * .2, 1 + ci * 1.0, pz + Math.sin(angle + ci) * .2);
                    cr.rotation.set(0, angle, Math.random() * .3);
                    this._add(cr);
                }
            }

            // ── Psionic torches — teal flames ──
            const flameMat = new THREE.MeshStandardMaterial({
                color: 0x44ccaa, emissive: 0x33aa88, emissiveIntensity: 2.5,
                transparent: true, opacity: .85
            });
            const torchMat = new THREE.MeshStandardMaterial({ color: 0x1a0508 });
            const numTorches = isBoss ? 10 : 6;
            for (let ti = 0; ti < numTorches; ti++) {
                const angle = (ti / numTorches) * Math.PI * 2;
                const tx = center.x + Math.cos(angle) * (RAID_ARENA_RADIUS - 1.5);
                const tz = center.z + Math.sin(angle) * (RAID_ARENA_RADIUS - 1.5);
                this._add(_m(new THREE.CylinderGeometry(.06, .12, .9, 6), torchMat, tx, .45, tz));
                const flame = _m(new THREE.ConeGeometry(.14, .35, 6), flameMat, tx, 1.0, tz);
                this._add(flame);
                this._particles.push({ mesh: flame, type: 'flame', baseY: 1.0 });

                const tLight = new THREE.PointLight(c.particleColor || 0x44ccaa, 0.35, 7);
                tLight.position.set(tx, 1.8, tz);
                this._add(tLight);
            }

            // ── Boss room glow ring ──
            if (isBoss) {
                const ringMat = new THREE.MeshStandardMaterial({
                    color: c.emissiveAccent || 0xcc3344, emissive: c.emissiveAccent || 0xcc3344,
                    emissiveIntensity: 0.5, transparent: true, opacity: 0.25
                });
                const ring = new THREE.Mesh(new THREE.RingGeometry(RAID_ARENA_RADIUS - 1.5, RAID_ARENA_RADIUS - 0.8, 36), ringMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(center.x, 0.03, center.z);
                this._add(ring);
                this._particles.push({ mesh: ring, type: 'bossGlow', baseOpacity: 0.25 });

                // Extra teal braziers for boss rooms
                for (let bi = 0; bi < 6; bi++) {
                    const a = (bi / 6) * Math.PI * 2 + Math.PI / 12;
                    const bx = center.x + Math.cos(a) * (RAID_ARENA_RADIUS + 2.5);
                    const bz = center.z + Math.sin(a) * (RAID_ARENA_RADIUS + 2.5);
                    this._add(_m(new THREE.CylinderGeometry(.18, .3, 1.2, 6),
                        new THREE.MeshStandardMaterial({ color: 0x180508 }), bx, .6, bz));
                    const bf = _m(new THREE.ConeGeometry(.2, .45, 6), flameMat.clone(), bx, 1.35, bz);
                    this._add(bf);
                    this._particles.push({ mesh: bf, type: 'flame', baseY: 1.35 });
                    const bl = new THREE.PointLight(0x44ccaa, 0.5, 7);
                    bl.position.set(bx, 2.5, bz);
                    this._add(bl);
                }

                // Psionic rune circle on the ground
                const runeMat = new THREE.MeshStandardMaterial({
                    color: 0x44ccaa, emissive: 0x33aa88, emissiveIntensity: 1.0,
                    transparent: true, opacity: .15
                });
                for (let rr = 0; rr < 3; rr++) {
                    const rune = new THREE.Mesh(new THREE.RingGeometry((3+rr*2), (3.15+rr*2), 32), runeMat);
                    rune.rotation.x = -Math.PI / 2;
                    rune.position.set(center.x, 0.025, center.z);
                    this._add(rune);
                }
            }
        }

        // ── Floating psionic embers ──
        const emberMat = new THREE.MeshStandardMaterial({
            color: c.particleColor || 0x44ccaa, emissive: c.particleColor || 0x44ccaa, emissiveIntensity: 2.5
        });
        for (let i = 0; i < 50; i++) {
            const e = new THREE.Mesh(new THREE.SphereGeometry(.03 + Math.random() * .03, 4, 4), emberMat);
            e.position.set((Math.random() - .5) * 30, .5 + Math.random() * 6, 15 - Math.random() * TOTAL_LENGTH);
            this._add(e);
            this._particles.push({
                mesh: e, type: 'ember', baseY: e.position.y,
                speedX: (Math.random() - .5) * .2, speedY: .2 + Math.random() * .3,
                phase: Math.random() * Math.PI * 2
            });
        }

        // ── Crimson embers (secondary) ──
        const crimsonEmber = new THREE.MeshStandardMaterial({
            color: 0xcc3344, emissive: 0xcc3344, emissiveIntensity: 2.0
        });
        for (let i = 0; i < 20; i++) {
            const e = new THREE.Mesh(new THREE.SphereGeometry(.02 + Math.random() * .02, 4, 4), crimsonEmber);
            e.position.set((Math.random() - .5) * 35, 1 + Math.random() * 5, 15 - Math.random() * TOTAL_LENGTH);
            this._add(e);
            this._particles.push({
                mesh: e, type: 'ember', baseY: e.position.y,
                speedX: (Math.random() - .5) * .15, speedY: .15 + Math.random() * .2,
                phase: Math.random() * Math.PI * 2
            });
        }

        // ── Scattered chitin rocks ──
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: .7, metalness: .3 });
        for (let i = 0; i < 35; i++) {
            const rScale = .2 + Math.random() * .8;
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rScale, 0), rockMat);
            rock.position.set((Math.random() - .5) * 40, rScale * .3, 15 - Math.random() * TOTAL_LENGTH);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            this._add(rock);
        }

        // ── Hive stalactites / chitin formations overhead ──
        const stalMat = new THREE.MeshStandardMaterial({ color: 0x120406, roughness: .6, metalness: .2 });
        for (let i = 0; i < 15; i++) {
            const h = 2 + Math.random() * 4;
            const stal = new THREE.Mesh(new THREE.CylinderGeometry(.04, .2 + Math.random() * .15, h, 5), stalMat);
            stal.position.set(
                (Math.random() > .5 ? 1 : -1) * (10 + Math.random() * 12),
                8 + Math.random() * 3,
                15 - Math.random() * TOTAL_LENGTH
            );
            stal.rotation.x = Math.PI;
            this._add(stal);
        }
    }

    // ══════════════════════════════════════════════════
    // MOB SPAWNING
    // ══════════════════════════════════════════════════

    _transitionToRoom(idx) {
        if (idx === this._currentRoomIndex) return;
        this._currentRoomIndex = idx;
        this._clearMobs();
    }

    _clearMobs() {
        for (const ent of this._mobEntities) {
            this.root.remove(ent.group);
            ent.group.traverse(ch => {
                if (ch.geometry) ch.geometry.dispose();
                if (ch.material) { if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose()); else ch.material.dispose(); }
            });
            if (ent.ui && ent.ui.plate) ent.ui.plate.remove();
            const idx = this._objects.indexOf(ent.group);
            if (idx >= 0) this._objects.splice(idx, 1);
        }
        this._mobEntities = [];
        // Clear Instance HUD labels
        if (this._playerLabel) { this._playerLabel.plate.remove(); this._playerLabel = null; }
        if (this._raidMemberLabels) {
            for (const rl of this._raidMemberLabels) {
                if (rl.label && rl.label.plate) rl.label.plate.remove();
            }
            this._raidMemberLabels = [];
        }
    }

    _spawnMobs(encounter, mobStates) {
        if (!encounter || !mobStates || mobStates.length === 0) return;
        if (!mobStates.some(m => m.alive)) return;

        this._clearMobs();
        this._spawnedForEncounter = this._currentRoomIndex;

        // Init Player and Raid NPC labels for this encounter room
        this._initInstanceHUD();

        const center = this.getRoomCenter(this._currentRoomIndex);
        let mi = 0;
        for (const md of encounter.mobs) {
            const builder = RAID_MOB_BUILDERS[md.mobShape] || RAID_MOB_BUILDERS.hiveSentry;
            for (let i = 0; i < md.count; i++) {
                if (mi >= mobStates.length) break;
                const state = mobStates[mi];
                const g = builder(md.color, md.scale);
                const total = mobStates.length;
                // Spread mobs in wider semicircle for 10-man
                const angle = ((mi / total) - 0.5) * Math.PI * 0.9;
                const radius = total > 5 ? 6 : 4.5;
                const x = center.x + Math.sin(angle) * radius;
                const z = center.z - Math.cos(angle) * (radius * 0.5) - 2;
                g.position.set(x, 0, z);
                g.rotation.y = Math.PI;
                g.scale.setScalar(0.01);
                this._add(g);

                const mobEntity = {
                    group: g, mobRef: state, baseY: 0,
                    mobDef: md, hitFlash: 0, lastHp: state.hp,
                    spawnDelay: 0.1 + mi * 0.08, spawned: false,
                    deathTimer: 0, deathVfxDone: false,
                    worldX: x, worldZ: z,
                    castBar: null,
                };
                
                // Nameplate for mobs (DOM based)
                mobEntity.ui = this._createLabel(state.name, md.isBoss ? 'boss' : 'mob');
                
                this._mobEntities.push(mobEntity);
                mi++;
            }
        }
    }

    _initInstanceHUD() {
        if (!this.uiContainer) return;
        
        // Player Label
        this._playerLabel = this._createLabel(gameState.playerName, 'player');
        
        // Raid Member Labels (for the 9 NPCs)
        this._raidMemberLabels = [];
        const prog = raidSystem.getProgress();
        if (prog && prog.partyMembers) {
            for (const pm of prog.partyMembers) {
                const labelType = pm.isMercenary ? 'mercenary' : 'raid-member';
                this._raidMemberLabels.push({
                    id: pm.id,
                    label: this._createLabel(pm.name, labelType)
                });
            }
        }
    }

    _updateCastBars(dt, time, ent) {
        const mob = ent.mobRef;
        if (!mob.casting) {
            if (ent.castBar) {
                ent.group.remove(ent.castBar);
                ent.castBar.material.map.dispose();
                ent.castBar.material.dispose();
                ent.castBar = null;
            }
            return;
        }

        const cast = mob.casting;
        const progress = cast.timer / cast.maxTime;

        if (!ent.castBar) {
            const cv = document.createElement('canvas');
            cv.width = 128; cv.height = 16;
            const tx = new THREE.CanvasTexture(cv);
            const mat = new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false });
            const sp = new THREE.Sprite(mat);
            sp.position.y = ent.mobDef.isBoss ? 3.8 : 2.5;
            sp.scale.set(1, 0.12, 1);
            ent.group.add(sp);
            ent.castBar = sp;
        }

        const cv = ent.castBar.material.map.image;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, 128, 16);
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 128, 16);
        // Bar
        ctx.fillStyle = '#ffaa44';
        ctx.fillRect(2, 2, (124) * progress, 12);
        // Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cast.name, 64, 11);

        ent.castBar.material.map.needsUpdate = true;
    }

    _updateLootChest(dt, time, prog) {
        if (prog.state === 'looting') {
            const ri = prog.encounterIndex;
            if (!this._lootChestEntity || this._lootChestEntity.spawnedForIndex !== ri) {
                this._destroyLootChest();
                const center = this.getRoomCenter(ri);
                const g = buildLootChestModel(1.2);
                g.position.set(center.x, 0, center.z);
                g.scale.setScalar(0.01);
                this.root.add(g);
                this._lootChestEntity = { group: g, spawnedForIndex: ri, spawnTimer: 0 };
            }

            const ent = this._lootChestEntity;
            if (ent.spawnTimer < 1.0) {
                ent.spawnTimer += dt * 2;
                const s = Math.min(1.2, ent.spawnTimer * 1.2);
                ent.group.scale.setScalar(s);
            }
            
            // Lid opening animation
            if (ent.group.userData.lid) {
                if (!ent.openTimer) ent.openTimer = 0;
                // Wait for spawn to finish, then open
                if (ent.spawnTimer >= 1.0) {
                    ent.openTimer += dt * 1.2;
                    const openProgress = Math.min(1.0, ent.openTimer);
                    // Elastic ease out
                    const eased = 1 - Math.pow(1 - openProgress, 3); 
                    ent.group.userData.lid.rotation.x = -eased * Math.PI * 0.6;
                }
            }

            // Gentle bobbing & pulse
            ent.group.position.y = Math.sin(time * 3) * 0.05;
            const lt = ent.group.children.find(c => c.isPointLight);
            if (lt) lt.intensity = 1.2 + Math.sin(time * 4) * 0.4;
        } else {
            this._destroyLootChest();
        }
    }

    _destroyLootChest() {
        if (this._lootChestEntity) {
            const g = this._lootChestEntity.group;
            this.root.remove(g);
            g.traverse(ch => {
                if (ch.geometry) ch.geometry.dispose();
                if (ch.material) {
                    if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose());
                    else ch.material.dispose();
                }
            });
            this._lootChestEntity = null;
        }
    }

    _addMobNameplate(group, name, isBoss) {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 48;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = isBoss ? 'rgba(60,10,20,0.85)' : 'rgba(10,30,25,0.75)';
        ctx.fillRect(2, 2, 252, 44);
        ctx.strokeStyle = isBoss ? '#cc3344' : '#44ccaa';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 252, 44);
        ctx.fillStyle = isBoss ? '#ffaa88' : '#88eedd';
        ctx.font = isBoss ? 'bold 20px Arial' : '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name, 128, 30);
        const tx = new THREE.CanvasTexture(cv);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false }));
        const scale = group.scale.x > 0.5 ? group.scale.x : 1;
        sp.position.y = (1.8 + (isBoss ? 1.0 : 0)) * scale;
        sp.scale.set(1.5, 0.3, 1);
        group.add(sp);
    }

    // ══════════════════════════════════════════════════
    // RAID PARTY NPC MANAGEMENT
    // ══════════════════════════════════════════════════

    _spawnRaidNpcs(partyMembers) {
        if (this._raidNpcsSpawned) return;
        this._raidNpcsSpawned = true;

        // Find player position for initial NPC placement
        let playerX = 0, playerZ = 6; // Default raid entrance
        const pg = this.mainScene.children.find(c => c.userData && c.userData.isPlayer);
        if (pg) {
            playerX = pg.position.x;
            playerZ = pg.position.z;
        }

        // Build per-role slot counters
        const roleSlots = { Tank: 0, Healer: 0, DPS: 0 };

        for (const member of partyMembers) {
            const classId = member.classId || 'warrior';
            const role = member.role || 'DPS';
            const slotIdx = roleSlots[role] || 0;
            roleSlots[role] = slotIdx + 1;

            // Get formation offset for this role/slot
            const roleFormations = RAID_FORMATION[role] || RAID_FORMATION.DPS;
            const offset = roleFormations[slotIdx % roleFormations.length];

            // ── Tier Set check ──
            // NPCs over level 58 or mercenaries have their class-specific Tier Sets
            const isTierSet = member.level >= 58 || member.isMercenary;

            // Build 3D model
            const wrapper = _buildRaidNpcModel(classId, isTierSet);
            const g = wrapper.group;

            // Slight scale variance — boosted for Mercenaries
            const isMercenary = member.isMercenary;
            const sc = (isMercenary ? 1.15 : 0.85) + Math.random() * 0.15;
            g.scale.setScalar(sc);

            // Add Elite Mercenary glow
            if (isMercenary) {
                const eliteGlow = new THREE.PointLight(0xffcc44, 0.8, 3);
                eliteGlow.position.y = 1.0;
                g.add(eliteGlow);
                
                // Add a simple halo
                const haloMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
                const halo = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.45, 24), haloMat);
                halo.rotation.x = -Math.PI / 2;
                halo.position.y = 0.05;
                g.add(halo);
            }

            // Position at formation around current player pos (no pop-in)
            g.position.set(playerX + offset.x, 0, playerZ + offset.z);

            // Add to scene root (not _objects — we manage NPC lifecycle separately)
            this.root.add(g);

            this._raidNpcs.push({
                group: g,
                wrapper,
                memberRef: member,
                role,
                formationOffset: { x: offset.x, z: offset.z },
                bobPhase: Math.random() * Math.PI * 2,
                attackPhase: Math.random() * Math.PI * 2,
            });
        }
    }

    _addNpcRaidNameplate(group, name, display, role, isMercenary = false, isFromParty = false) {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 56;
        const ctx = cv.getContext('2d');
        // Role-colored background
        const roleColors = { Tank: '#4488cc', Healer: '#ffcc44', DPS: '#cc6688' };
        const baseColor = display ? display.color : (roleColors[role] || '#88bbcc');
        
        let borderColor = isMercenary ? '#ffcc44' : baseColor;
        if (isFromParty) borderColor = '#ffffff'; // Unique white border for actual party members

        ctx.fillStyle = isFromParty ? 'rgba(30,40,60,0.9)' : (isMercenary ? 'rgba(40,30,10,0.9)' : 'rgba(8,15,30,0.8)');
        ctx.fillRect(2, 2, 252, 52);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = (isMercenary || isFromParty) ? 4 : 2;
        ctx.strokeRect(2, 2, 252, 52);
        // Name
        ctx.fillStyle = borderColor;
        ctx.font = (isMercenary || isFromParty) ? 'bold 20px Arial' : 'bold 18px Arial';
        ctx.textAlign = 'center';
        const icon = display ? display.icon : '';
        const elitePrefix = isFromParty ? '👤 ' : (isMercenary ? '★ ' : '');
        ctx.fillText(`${elitePrefix}${icon} ${name}`, 128, 28);
        // Role label
        ctx.fillStyle = isFromParty ? '#ffffff' : (isMercenary ? '#ffaa44' : 'rgba(200,200,200,0.7)');
        ctx.font = (isMercenary || isFromParty) ? 'bold 13px Arial' : '12px Arial';
        const roleText = isFromParty ? `${role} (Your Party)` : (isMercenary ? `${role} (Elite Mercenary)` : role);
        ctx.fillText(roleText, 128, 46);

        const tx = new THREE.CanvasTexture(cv);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false }));
        sp.position.y = 2.0;
        sp.scale.set(1.3, 0.32, 1);
        group.add(sp);
    }

    _destroyRaidNpcs() {
        for (const npc of this._raidNpcs) {
            this.root.remove(npc.group);
            npc.group.traverse(ch => {
                if (ch.geometry) ch.geometry.dispose();
                if (ch.material) {
                    if (Array.isArray(ch.material)) ch.material.forEach(m => m.dispose());
                    else ch.material.dispose();
                }
            });
        }
        this._raidNpcs = [];
        this._raidNpcsSpawned = false;
    }

    _updateRaidNpcs(dt, time, prog) {
        if (this._raidNpcs.length === 0) return;

        // Get player position as formation anchor
        let anchorX = 0, anchorZ = 0, anchorRotY = 0;
        let foundPlayer = false;

        // Find player group via userData.isPlayer tag (set in main.js)
        for (const child of this.mainScene.children) {
            if (child.userData && child.userData.isPlayer) {
                anchorX = child.position.x;
                anchorZ = child.position.z;
                anchorRotY = child.rotation.y;
                foundPlayer = true;
                break;
            }
        }

        // Fallback: use camera-based estimation
        if (!foundPlayer) {
            anchorX = this.camera.position.x;
            anchorZ = this.camera.position.z + 5; // Camera is behind player
        }

        const inCombat = prog && prog.state === 'combat' && !prog.awaitingNext;
        const combatActive = inCombat && this._mobEntities.some(m => m.mobRef.alive && m.spawned);
        const isVictory = prog && prog.state === 'complete';
        const isDefeat = prog && prog.state === 'failed';

        for (const npc of this._raidNpcs) {
            // Handle dead NPCs
            if (npc.memberRef && !npc.memberRef.alive) {
                npc.group.visible = false;
                continue;
            }
            npc.group.visible = true;

            // Calculate formation target position relative to player
            const cos = Math.cos(anchorRotY);
            const sin = Math.sin(anchorRotY);
            const offX = npc.formationOffset.x;
            const offZ = npc.formationOffset.z;
            
            // Rotate offset by player facing
            let targetX = anchorX + offX * cos - offZ * sin;
            let targetZ = anchorZ + offX * sin + offZ * cos;

            // ── NPC Avoidance Logic ──
            // Repel NPCs from active mechanics (ground indicators/soaks)
            if (prog && prog.activeMechanics) {
                for (const mech of prog.activeMechanics) {
                    if ((mech.type === 'soak' || mech.type === 'ground') && mech.radius) {
                        const mx = mech.x - npc.group.position.x;
                        const mz = mech.z - npc.group.position.z;
                        const distSq = mx * mx + mz * mz;
                        const rad = mech.radius + 1.5; // Avoidance buffer
                        if (distSq < rad * rad) {
                            const dist = Math.sqrt(distSq) || 0.1;
                            // Push away from mechanic center
                            const force = (rad - dist) / rad;
                            targetX -= (mx / dist) * force * 5;
                            targetZ -= (mz / dist) * force * 5;
                        }
                    }
                }
            }

            // In combat: spread out more, tanks move forward toward mobs
            if (combatActive) {
                const center = this.getRoomCenter(Math.max(0, this._currentRoomIndex));
                if (npc.role === 'Tank') {
                    // Tanks position between player and mobs
                    targetX = center.x + offX * 0.8;
                    targetZ = center.z - 1.5;
                } else if (npc.role === 'Healer') {
                    // Healers stay behind, near player
                    targetX = anchorX + offX * 0.6;
                    targetZ = anchorZ + offZ * 0.7;
                } else {
                    // DPS spread around the combat area
                    targetX = center.x + offX * 1.2;
                    targetZ = center.z + offZ * 0.4 + 1.5;
                }
            }

            // Smooth movement toward target
            const dx = targetX - npc.group.position.x;
            const dz = targetZ - npc.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 20) {
                // Teleport if way too far
                npc.group.position.x = targetX;
                npc.group.position.z = targetZ;
            } else if (dist > 0.3) {
                const speed = dist > 8 ? 8.0 : dist > 3 ? 5.0 : 3.0;
                const t = Math.min(1, speed * dt / dist);
                npc.group.position.x += dx * t;
                npc.group.position.z += dz * t;

                // Face movement direction
                const targetAngle = Math.atan2(dx, dz);
                let angleDiff = targetAngle - npc.group.rotation.y;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                npc.group.rotation.y += angleDiff * Math.min(1, 6 * dt);
            }

            // In combat & near target — face the nearest alive mob
            if (combatActive && dist <= 0.3) {
                let nearDist = Infinity, nearMob = null;
                for (const me of this._mobEntities) {
                    if (!me.mobRef.alive || !me.spawned) continue;
                    const mx = me.group.position.x - npc.group.position.x;
                    const mz = me.group.position.z - npc.group.position.z;
                    const md = mx * mx + mz * mz;
                    if (md < nearDist) { nearDist = md; nearMob = me; }
                }
                if (nearMob) {
                    const faceAngle = Math.atan2(
                        nearMob.group.position.x - npc.group.position.x,
                        nearMob.group.position.z - npc.group.position.z
                    );
                    let fa = faceAngle - npc.group.rotation.y;
                    while (fa > Math.PI) fa -= Math.PI * 2;
                    while (fa < -Math.PI) fa += Math.PI * 2;
                    npc.group.rotation.y += fa * Math.min(1, 5 * dt);
                }
            }

            // Group Animations: Cheer on Victory, Kneel on Defeat
            if (isVictory) {
                // Jump / Cheer anim
                npc.group.position.y = Math.max(0, Math.sin(time * 10 + npc.bobPhase) * 0.4);
                npc.group.rotation.z = Math.sin(time * 12) * 0.1;
            } else if (isDefeat) {
                // Kneel anim
                npc.group.position.y = -0.4;
                npc.group.rotation.x = 0.5;
            } else {
                // Standard Bob animation
                npc.group.position.y = Math.sin(time * 2.5 + npc.bobPhase) * 0.03;
                npc.group.rotation.z = 0;
                npc.group.rotation.x = 0;
            }

            // Idle/combat arm animations via parts (if available)
            const parts = npc.wrapper.parts;
            if (combatActive && parts.torso) {
                // Slight torso rock for attack feel
                parts.torso.rotation.x = Math.sin(time * 4 + npc.attackPhase) * 0.08;
            } else if (parts.torso && !isDefeat) {
                parts.torso.rotation.x = Math.sin(time * 1.2 + npc.bobPhase) * 0.02;
            }

            // Combat VFX — occasional attack particles
            if (combatActive && Math.random() < 0.015) {
                const classId = npc.memberRef.classId;
                const gp = npc.group.position;
                
                // Find target for projectile classes
                let nearDist = Infinity, nearMob = null;
                for (const me of this._mobEntities) {
                    if (!me.mobRef.alive || !me.spawned) continue;
                    const mx = me.group.position.x - gp.x;
                    const mz = me.group.position.z - gp.z;
                    const md = mx * mx + mz * mz;
                    if (md < nearDist) { nearDist = md; nearMob = me; }
                }

                if (classId === 'ranger' && nearMob) {
                    // Physical Arrow Sprite
                    this._spawnProjectileVFX(gp, nearMob.group.position, 0x88cc44, 'arrow');
                } else if (classId === 'mage' && nearMob) {
                    // Arcane bolt or Frost Ring
                    if (Math.random() > 0.5) {
                        this._spawnProjectileVFX(gp, nearMob.group.position, 0xaa66ff, 'bolt');
                    } else {
                        this._spawnAreaVFX(nearMob.group.position, 0x66ccff, 'frost');
                    }
                } else if (classId === 'cleric') {
                    // Holy blast or heal beam
                    const col = 0xffdd44;
                    _spawnRVfx(this.root, gp.x + (Math.random() - 0.5), gp.y + 1.5, gp.z + (Math.random() - 0.5), col, 0.05, 0.6);
                } else {
                    // Warrior slash
                    const col = 0x88bbff;
                    _spawnRVfx(this.root, gp.x + (Math.random() - 0.5), gp.y + 1.0, gp.z + (Math.random() - 0.5), col, 0.03, 0.4);
                }
            }
        }
    }

    _spawnProjectileVFX(start, target, color, type) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1.0 });
        let geo;
        if (type === 'arrow') {
            geo = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4);
        } else {
            geo = new THREE.SphereGeometry(0.04, 4, 4);
        }
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(start);
        mesh.position.y += 1.2;
        
        // Orient arrow toward target
        if (type === 'arrow') {
            mesh.lookAt(target.x, target.y + 1, target.z);
            mesh.rotateX(Math.PI/2);
        }
        
        this.root.add(mesh);
        
        const dx = target.x - start.x;
        const dy = (target.y + 1) - (start.y + 1.2);
        const dz = target.z - start.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        const speed = 15.0;
        const life = dist / speed;
        
        const vfx = {
            mesh, life, maxLife: life,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            vz: (dz / dist) * speed,
            type: 'projectile'
        };
        _rvfxPool.push(vfx);
    }

    _spawnAreaVFX(pos, color, type) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const geo = new THREE.RingGeometry(0.1, 0.3, 16);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.position.y = 0.1;
        mesh.rotation.x = -Math.PI / 2;
        this.root.add(mesh);
        
        const vfx = {
            mesh, life: 0.8, maxLife: 0.8,
            type: 'area',
            targetScale: type === 'frost' ? 3.0 : 1.5
        };
        _rvfxPool.push(vfx);
    }

    // ══════════════════════════════════════════════════
    // MAIN UPDATE
    // ══════════════════════════════════════════════════

    update(dt, time) {
        if (!this.active) return;
        this._time = time;
        const prog = raidSystem.getProgress();
        if (!prog) return;

        // ── Spawn raid party NPCs once partyMembers data is available ──
        if (!this._raidNpcsSpawned && prog.partyMembers && prog.partyMembers.length > 0) {
            this._spawnRaidNpcs(prog.partyMembers);
        }

        // Room transitions & mob spawning
        if (prog.state === 'combat' && !prog.awaitingNext) {
            const ri = prog.encounterIndex;
            if (ri !== this._currentRoomIndex) this._transitionToRoom(ri);
            if (this._mobEntities.length === 0 && prog.currentEncounter && this._spawnedForEncounter !== ri) {
                if (prog.mobs.some(m => m.alive)) {
                    this._spawnMobs(prog.currentEncounter, prog.mobs);
                }
            }
        }

        // Follow light
        if (this._followLight) {
            this._followLight.position.x = this.camera.position.x;
            this._followLight.position.z = this.camera.position.z;
            this._followLight.position.y = 6;
        }

        if (this._raidDirLight) {
            const center = this.getRoomCenter(Math.max(0, this._currentRoomIndex));
            this._raidDirLight.position.set(center.x + 15, 35, center.z + 10);
            if (this._raidDirLight.target) {
                this._raidDirLight.target.position.set(center.x, 0, center.z);
                this._raidDirLight.target.updateMatrixWorld();
            }
        }

        // Victory / defeat VFX
        if ((prog.state === 'complete' || prog.state === 'failed') && !this._endVfxDone) {
            this._endVfxDone = true;
            const center = this.getRoomCenter(Math.max(0, this._currentRoomIndex));
            if (prog.state === 'complete') {
                for (let i = 0; i < 30; i++) {
                    const vfx = _spawnRVfx(this.root,
                        center.x + (Math.random()-.5)*5, 1+Math.random()*3, center.z + (Math.random()-.5)*5,
                        [0x44ffcc, 0xffdd44, 0xff66aa, 0xffffff][Math.floor(Math.random()*4)],
                        .03+Math.random()*.03, 1.5+Math.random());
                    vfx.vy = 3+Math.random()*4; vfx.vx = (Math.random()-.5)*5; vfx.vz = (Math.random()-.5)*5;
                }
            } else {
                for (let i = 0; i < 15; i++) {
                    const vfx = _spawnRVfx(this.root,
                        center.x+(Math.random()-.5)*8, 2+Math.random(), center.z+(Math.random()-.5)*8,
                        [0xcc3344, 0xff4400, 0x880022][Math.floor(Math.random()*3)],
                        .025+Math.random()*.02, 2.0);
                    vfx.vy = -.5+Math.random();
                }
            }
        }
        if (prog.state === 'combat') this._endVfxDone = false;

        this._updateMobs(dt, time, prog);
        this._updateLootChest(dt, time, prog);
        this._updateRaidNpcs(dt, time, prog);
        this._updateMarkers(dt, time, prog);
        this._updateTierSetVisuals(dt, time, prog);
        this._updateCombatVFX(dt, time, prog);
        this._updateIndicators(dt, time);
        this._updateTethers(dt, time, prog);
        this._updateParticles(dt, time);
        this._updateVFXPool(dt);
    }

    // ══════════════════════════════════════════════════
    // UPDATE: Mobs
    // ══════════════════════════════════════════════════

    _updateMobs(dt, time, prog) {
        // Update frustum for nameplate projection
        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

        // ── Instance HUD: Player ──
        if (this._playerLabel) {
            const playerPos = this._tempVec.set(0,0,0);
            if (this.camera.userData.target) playerPos.copy(this.camera.userData.target);
            const pg = this.mainScene.children.find(c => c.userData && c.userData.isPlayer);
            if (pg) playerPos.copy(pg.position);

            this._projectLabel(this._playerLabel.plate, playerPos, 2.2);
            const hpPct = gameState.hp / gameState.maxHp;
            this._playerLabel.fill.style.width = `${Math.max(0, hpPct * 100)}%`;
        }

        // ── Instance HUD: Raid Members (NPCs) ──
        if (this._raidMemberLabels) {
            for (const rl of this._raidMemberLabels) {
                const member = prog.partyMembers.find(m => m.id === rl.id);
                if (!member) continue;
                // Find NPC group in raidNpcs
                const npc = this._raidNpcs.find(n => n.memberRef.id === rl.id);
                if (npc && npc.group.visible) {
                    this._projectLabel(rl.label.plate, npc.group.position, 2.2);
                    const hpPct = member.hp / member.maxHp;
                    rl.label.fill.style.width = `${Math.max(0, hpPct * 100)}%`;
                } else {
                    rl.label.plate.style.display = 'none';
                }
            }
        }

        for (const ent of this._mobEntities) {
            if (!ent.spawned) {
                ent.spawnDelay -= dt;
                if (ent.spawnDelay <= 0) ent.spawned = true;
                const t = Math.max(0, 1 - Math.max(0, ent.spawnDelay) / 0.4);
                ent.group.scale.setScalar(Math.max(0.01, t * t * (3 - 2 * t)));
                continue;
            }

            if (!ent.mobRef.alive) {
                ent.deathTimer += dt;
                const dp = Math.min(1, ent.deathTimer / 1.2);
                ent.group.scale.setScalar(Math.max(0.01, 1 - dp));
                ent.group.position.y = ent.baseY - dp * 0.6;
                ent.group.rotation.x = dp * 0.4;
                if (dp >= 0.9) ent.group.visible = false;
                if (!ent.deathVfxDone) {
                    ent.deathVfxDone = true;
                    const gp = ent.group.position;
                    for (let j = 0; j < 10; j++) {
                        _spawnRVfx(this.root, gp.x+(Math.random()-.5)*.6, Math.max(0,gp.y)+.5+Math.random()*.6, gp.z+(Math.random()-.5)*.6,
                            ent.mobDef.isBoss ? 0x44ccaa : 0xcc3344, .05, 1.0);
                    }
                }
                if (ent.ui) ent.ui.plate.style.opacity = '0';
                continue;
            }

            // Idle animations — psionic, alien feel
            const shape = ent.mobDef ? ent.mobDef.mobShape : '';
            if (shape === 'wraith' || shape === 'thoughtweaver' || shape === 'conduitHorror') {
                ent.group.position.y = ent.baseY + .3 + Math.sin(time * 1.2 + ent.worldX * 2) * .18;
                ent.group.rotation.z = Math.sin(time * .8 + ent.worldZ) * .06;
            } else if (shape === 'leech' || shape === 'neuralParasite') {
                ent.group.position.y = ent.baseY + Math.sin(time * 3.5 + ent.worldX * 5) * .06;
                ent.group.rotation.z = Math.sin(time * 4 + ent.worldZ * 3) * .1;
            } else if (shape === 'sporecap' || shape === 'sporeDrifter') {
                ent.group.position.y = ent.baseY + .15 + Math.sin(time * 1.2) * .08;
                const sp = 1 + Math.sin(time * 1.6) * .04;
                if (!ent.mobDef.isBoss) ent.group.scale.set(sp, 1 + Math.sin(time * 1.8 + 1) * .05, sp);
            } else if (shape === 'crawler' || shape === 'chitinStalker') {
                ent.group.position.y = ent.baseY + Math.abs(Math.sin(time * 6)) * .03;
                if (ent._baseX === undefined) ent._baseX = ent.group.position.x;
                ent.group.position.x = ent._baseX + Math.sin(time * 3 + ent.worldZ * 2) * .1;
            } else if (shape === 'serpent' || shape === 'voidLasher') {
                ent.group.position.y = ent.baseY + Math.sin(time * 1.5) * .05;
                ent.group.rotation.z = Math.sin(time * 1.2 + ent.worldX) * .08;
            } else if (shape === 'channeler' || shape === 'hivePriest') {
                ent.group.position.y = ent.baseY + .06 + Math.sin(time * 2.0) * .04;
                ent.group.rotation.y += dt * .25;
            } else if (shape === 'hound' || shape === 'moltenDrone') {
                ent.group.position.y = ent.baseY + Math.abs(Math.sin(time * 4)) * .02;
            } else if (shape === 'demonLord' || shape === 'overmindBoss' || shape === 'broodmother' || shape === 'queenBoss') {
                ent.group.position.y = ent.baseY + .12 + Math.sin(time * .7) * .1;
                if (!ent._lastDripTime || time - ent._lastDripTime > 1.2) {
                    ent._lastDripTime = time;
                    const gp = ent.group.position;
                    _spawnRVfx(this.root, gp.x+(Math.random()-.5)*.5, gp.y+1.0, gp.z+(Math.random()-.5)*.5, 0x44ccaa, .04, .8);
                }
            } else if (shape === 'golem' || shape === 'crystalResonator' || shape === 'forgeAssembler' || shape === 'coreWarden' || shape === 'crystalwardenBoss') {
                ent.group.position.y = ent.baseY + Math.abs(Math.sin(time * 1.5)) * .03;
            } else if (shape === 'knight' || shape === 'hiveSentry' || shape === 'mindshatterElite') {
                ent.group.position.y = ent.baseY + Math.sin(time * 1.8 + ent.worldX) * .02;
            } else {
                ent.group.position.y = ent.baseY + Math.sin(time * 2 + ent.worldX * 3) * .04;
            }

            // Hit flash
            if (ent.mobRef.hp < ent.lastHp) {
                ent.hitFlash = 0.25;
                const gp = ent.group.position;
                _spawnRVfx(this.root, gp.x+(Math.random()-.5)*.3, gp.y+.5+Math.random()*.3, gp.z+(Math.random()-.5)*.3, 0x44ccaa, .04, .5);
            }
            ent.lastHp = ent.mobRef.hp;

            if (ent.hitFlash > 0) {
                ent.hitFlash -= dt;
                const bm = ent.group.userData.bodyMesh;
                if (bm && bm.material) {
                    if (bm.material._origE === undefined) {
                        bm.material._origE = bm.material.emissive ? bm.material.emissive.getHex() : 0;
                        bm.material._origEI = bm.material.emissiveIntensity || 0;
                    }
                    if (ent.hitFlash > 0) {
                        if (!bm.material.emissive) bm.material.emissive = new THREE.Color();
                        bm.material.emissive.setHex(0x44ffcc);
                        bm.material.emissiveIntensity = 3;
                    } else {
                        bm.material.emissive.setHex(bm.material._origE);
                        bm.material.emissiveIntensity = bm.material._origEI;
                    }
                }
            }

            // Boss pulse & Enrage visuals
            if (ent.mobDef && ent.mobDef.isBoss) {
                const hpPct = ent.mobRef.hp / ent.mobRef.maxHp;
                const enrageFactor = prog.enraged ? 1.5 : 1.0;
                ent.group.scale.setScalar(enrageFactor * (1 + Math.sin(time * (3 + (1-hpPct) * 4)) * (.02 + (1-hpPct) * .04)));
                
                // Enrage lighting
                if (prog.enraged) {
                    if (!ent._enrageLight) {
                        ent._enrageLight = new THREE.PointLight(0xff0000, 2.0, 10);
                        ent.group.add(ent._enrageLight);
                    }
                    const bm = ent.group.userData.bodyMesh;
                    if (bm && bm.material) {
                        if (!bm.material._origEmissive) bm.material._origEmissive = bm.material.emissive?.clone() || new THREE.Color(0x000000);
                        bm.material.emissive.lerp(new THREE.Color(0xff0000), 0.1);
                        bm.material.emissiveIntensity = 2.0 + Math.sin(time * 10) * 1.0;
                    }
                }
            }

            // UI Update (DOM Nameplate)
            if (ent.ui) {
                const distSq = ent.group.position.distanceToSquared(this.camera.position);
                if (distSq > 4900) {
                    ent.ui.plate.style.display = 'none';
                } else {
                    const headOffset = (ent.mobDef.isBoss ? 2.8 : 1.8) * ent.mobDef.scale;
                    this._projectLabel(ent.ui.plate, ent.group.position, headOffset);
                    const hpFrac = ent.mobRef.hp / ent.mobRef.maxHp;
                    ent.ui.fill.style.width = `${Math.max(0, hpFrac * 100)}%`;
                }
            }

            this._updateCastBars(dt, time, ent);
        }
    }

    _updateMarkers(dt, time, prog) {
        if (!prog.markers) return;

        const MARKER_ICONS = {
            skull: '💀',
            square: '🟦',
            cross: '❌',
            circle: '⭕'
        };

        for (const ent of this._mobEntities) {
            const markerType = prog.markers[ent.mobRef.id];
            
            if (!markerType || !ent.mobRef.alive) {
                if (ent.markerSprite) {
                    ent.group.remove(ent.markerSprite);
                    ent.markerSprite.material.map.dispose();
                    ent.markerSprite.material.dispose();
                    ent.markerSprite = null;
                }
                continue;
            }

            if (!ent.markerSprite || ent._lastMarkerType !== markerType) {
                if (ent.markerSprite) {
                    ent.group.remove(ent.markerSprite);
                    ent.markerSprite.material.map.dispose();
                    ent.markerSprite.material.dispose();
                }

                const cv = document.createElement('canvas');
                cv.width = 64; cv.height = 64;
                const ctx = cv.getContext('2d');
                ctx.font = '48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(MARKER_ICONS[markerType] || '?', 32, 32);
                
                const tx = new THREE.CanvasTexture(cv);
                const mat = new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false });
                const sp = new THREE.Sprite(mat);
                sp.scale.set(0.8, 0.8, 1);
                ent.group.add(sp);
                ent.markerSprite = sp;
                ent._lastMarkerType = markerType;
            }

            // Update position (floating above nameplate)
            const scale = ent.group.scale.x > 0.5 ? ent.group.scale.x : 1;
            ent.markerSprite.position.y = (2.8 + (ent.mobDef.isBoss ? 1.5 : 0.5)) * scale + Math.sin(time * 4) * 0.1;
        }
    }

    _updateTierSetVisuals(dt, time, prog) {
        if (!prog.buffs) return;
        const hivemindPieces = prog.buffs.hivemindPieces || 0;
        if (hivemindPieces < 2) return;

        // Apply to player
        for (const child of this.mainScene.children) {
            if (child.userData && child.userData.isPlayer) {
                this._spawnTierVFX(child, hivemindPieces, time);
            }
        }

        // Apply to NPCs
        for (const npc of this._raidNpcs) {
            if (npc.group.visible) {
                this._spawnTierVFX(npc.group, hivemindPieces, time + npc.bobPhase);
            }
        }
    }

    _spawnTierVFX(root, pieces, time) {
        // 2-piece: teal psionic wisps
        if (pieces >= 2 && Math.random() < 0.1) {
            const col = 0x44ccaa;
            _spawnRVfx(this.root, 
                root.position.x + (Math.random()-0.5), 
                root.position.y + 0.5 + Math.random(), 
                root.position.z + (Math.random()-0.5), 
                col, 0.02, 0.8
            ).vy = 1.0;
        }
        // 4-piece: crimson aura
        if (pieces >= 4 && Math.random() < 0.05) {
            const col = 0xcc3344;
            const v = _spawnRVfx(this.root, 
                root.position.x + (Math.random()-0.5) * 1.2, 
                root.position.y + 0.1, 
                root.position.z + (Math.random()-0.5) * 1.2, 
                col, 0.03, 1.2
            );
            v.vy = 0.2;
            v.vx *= 0.2; v.vz *= 0.2;
        }
    }

    _updateCombatVFX(dt, time, prog) {
        if (prog.state !== 'combat') return;
        this._attackTimer += dt;
        if (this._attackTimer < 0.7) return;
        this._attackTimer = 0;

        const alive = this._mobEntities.filter(m => m.mobRef.alive && m.spawned);
        if (alive.length === 0) return;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const tp = target.group.position;

        const cid = gameState.classId;
        const col = cid === 'mage' ? 0xaa66ff : cid === 'ranger' ? 0x88cc44 : cid === 'cleric' ? 0xffdd44 : 0x88bbff;
        for (let i = 0; i < 3; i++) {
            _spawnRVfx(this.root,
                tp.x + (Math.random()-.5)*2, .5+Math.random()*1.0, tp.z + (Math.random()-.5)*2,
                col, .04, .4+Math.random()*.3);
        }

        const mob = alive[Math.floor(Math.random() * alive.length)];
        _spawnRVfx(this.root,
            mob.group.position.x+(Math.random()-.5)*.5, .8+Math.random()*.3, mob.group.position.z+(Math.random()-.5)*.5,
            0xcc3344, .03, .3);
    }

    _updateParticles(dt, time) {
        for (const p of this._particles) {
            if (p.type === 'ember') {
                p.mesh.position.y = p.baseY + Math.sin(time * p.speedY + p.phase) * .5;
                p.mesh.position.x += p.speedX * dt;
                if (p.mesh.position.x > 15) p.mesh.position.x = -15;
                if (p.mesh.position.x < -15) p.mesh.position.x = 15;
                p.mesh.material.emissiveIntensity = 1.5 + Math.sin(time * 8 + p.phase) * .5;
            } else if (p.type === 'flame') {
                p.mesh.position.y = p.baseY + Math.sin(time * 6 + p.mesh.position.x * 10) * .06;
                p.mesh.scale.y = 1 + Math.sin(time * 8 + p.mesh.position.z) * .2;
            } else if (p.type === 'bossGlow') {
                p.mesh.material.opacity = p.baseOpacity + Math.sin(time * 2) * .08;
            }
        }
        for (const l of this._lavaPlanes) l.material.emissiveIntensity = .6 + Math.sin(time * 1.5) * .25;
    }

    _updateVFXPool(dt) {
        for (let i = _rvfxPool.length - 1; i >= 0; i--) {
            const v = _rvfxPool[i];
            v.life -= dt;
            if (v.life <= 0) {
                this.root.remove(v.mesh);
                v.mesh.geometry?.dispose(); v.mesh.material?.dispose();
                _rvfxPool.splice(i, 1);
                continue;
            }

            const t = 1 - (v.life / v.maxLife);

            if (v.type === 'projectile') {
                v.mesh.position.x += v.vx * dt;
                v.mesh.position.y += v.vy * dt;
                v.mesh.position.z += v.vz * dt;
                v.mesh.material.opacity = Math.min(1.0, v.life * 5.0);
            } else if (v.type === 'area') {
                const s = 1.0 + t * v.targetScale;
                v.mesh.scale.set(s, s, 1);
                v.mesh.material.opacity = (1 - t) * 0.6;
            } else {
                v.mesh.position.x += v.vx * dt;
                v.mesh.position.y += v.vy * dt;
                v.mesh.position.z += v.vz * dt;
                v.vy -= 3 * dt;
                v.mesh.material.opacity = 1 - t;
                v.mesh.scale.setScalar(.5 + (1 - t) * .5);
            }
        }
    }

    // ══════════════════════════════════════════════════
    // RAID NAVIGATION
    // ══════════════════════════════════════════════════

    getPlayerWalkTarget() {
        if (!this.active) return null;
        const prog = raidSystem.getProgress();
        if (!prog) return null;

        // Support combat and looting phases
        if (prog.state === 'combat' || prog.state === 'looting') {
            const ri = Math.max(0, prog.encounterIndex);
            const center = this.getRoomCenter(ri);

            if (prog.awaitingNext) {
                // Moving to the next encounter room center (prog.encounterIndex is already the next room)
                return { x: center.x, z: center.z + 4.0 };
            }

            // In active combat or looting — stand near the center of the current room
            return { x: center.x, z: center.z + 3.5 };
        }

        // Entering phase — walk to first room
        if (prog.state === 'entering') {
            const center = this.getRoomCenter(0);
            return { x: center.x, z: center.z + 4.0 };
        }

        // During queue/forming, stay at the starting area
        if (prog.state === 'queue' || prog.state === 'forming') {
            return { x: 0, z: 4.0 };
        }

        // Handle victory/defeat — stay put
        if (prog.state === 'complete' || prog.state === 'failed') {
            const ri = Math.max(0, prog.encounterIndex);
            const center = this.getRoomCenter(ri);
            return { x: center.x, z: center.z + 3.0 };
        }

        return null;
    }

    hasCombatTarget() {
        if (!this.active) return false;
        const prog = raidSystem.getProgress();
        if (!prog || prog.state !== 'combat' || prog.awaitingNext) return false;
        return this._mobEntities.some(m => m.mobRef.alive && m.spawned);
    }

    getNearestMobPos(playerX, playerZ) {
        let bestDist = Infinity;
        let bestPos = null;
        for (const ent of this._mobEntities) {
            if (!ent.mobRef.alive || !ent.spawned) continue;
            const dx = ent.group.position.x - playerX;
            const dz = ent.group.position.z - playerZ;
            const d = dx * dx + dz * dz;
            if (d < bestDist) { bestDist = d; bestPos = { x: ent.group.position.x, z: ent.group.position.z }; }
        }
        return bestPos;
    }
}