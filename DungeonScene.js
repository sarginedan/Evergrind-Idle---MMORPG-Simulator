// ══════════════════════════════════════════════════════════════════════
// DUNGEON SCENE — Zone-style Dungeon Renderer
// Dungeons feel like condensed, atmospheric zone areas.
// The real player, party, camera, and combat systems are reused.
// The dungeon just builds a themed environment + spawns dungeon mobs.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { gameState } from './GameState.js';
import { dungeonSystem } from './DungeonSystem.js';

// ── Helper: create mesh at position ──
function _m(geo, mat, x, y, z) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

// ══════════════════════════════════════════════════════════════════════
// MOB MODEL BUILDERS — 12 unique dungeon creatures
// ══════════════════════════════════════════════════════════════════════

function buildTroggothModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.7,metalness:.2});
    const d = new THREE.MeshStandardMaterial({color:new THREE.Color(c).multiplyScalar(.5),roughness:.8});
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.45*s,.5*s,.35*s),m);
    torso.position.y=.55*s; torso.rotation.x=.15; torso.castShadow=true; g.add(torso);
    g.add(_m(new THREE.SphereGeometry(.28*s,8,6),m, 0,.45*s,.1*s));
    const head = _m(new THREE.SphereGeometry(.15*s,8,6),d, 0,.85*s,.2*s); g.add(head);
    g.add(_m(new THREE.BoxGeometry(.14*s,.06*s,.1*s),d, 0,.75*s,.28*s));
    const em = new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:1.5});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.025*s,6,6),em, x*.06*s,.88*s,.3*s))});
    [-1,1].forEach(x=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(.07*s,.05*s,.5*s,6),m);a.position.set(x*.3*s,.4*s,.05*s);a.rotation.z=x*.3;g.add(a)});
    [-1,1].forEach(x=>{g.add(_m(new THREE.CylinderGeometry(.08*s,.06*s,.35*s,6),d, x*.15*s,.15*s,0))});
    for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.OctahedronGeometry(.06*s,0),m);r.position.set((Math.random()-.5)*.2*s,.7*s+i*.08*s,-.12*s);g.add(r)}
    g.userData.bodyMesh=torso; return g;
}

function buildTroggothBossModel(c, s) {
    const g = buildTroggothModel(c, s);
    const lm = new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff3300,emissiveIntensity:1.5});
    for(let i=0;i<6;i++){const cr=new THREE.Mesh(new THREE.BoxGeometry(.03*s,.25*s,.03*s),lm);const a=(i/6)*Math.PI*2;cr.position.set(Math.cos(a)*.25*s,(.4+Math.random()*.3)*s,Math.sin(a)*.25*s);cr.rotation.set(Math.random(),Math.random(),Math.random());g.add(cr)}
    const sm=new THREE.MeshStandardMaterial({color:0x111100,roughness:.3,metalness:.6});
    for(let i=0;i<5;i++){const sp=new THREE.Mesh(new THREE.ConeGeometry(.04*s,.2*s,5),sm);const a=(i/5)*Math.PI*2;sp.position.set(Math.cos(a)*.12*s,1.0*s,Math.sin(a)*.12*s);g.add(sp)}
    const lt=new THREE.PointLight(0xff4400,1.0,5*s);lt.position.y=.6*s;g.add(lt);
    return g;
}

function buildLeechModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.4,metalness:.1});
    const gm = new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xff3300,emissiveIntensity:1.0});
    for(let i=0;i<7;i++){const r=(.1-i*.008)*s;const seg=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),i%2===0?m:gm);seg.position.set(Math.sin(i*.7)*.1*s,(.12+i*.06)*s,-i*.12*s);seg.castShadow=true;g.add(seg)}
    const mm=new THREE.MeshStandardMaterial({color:0xff2200,emissive:0xff1100,emissiveIntensity:1.2});
    const mouth=new THREE.Mesh(new THREE.TorusGeometry(.06*s,.025*s,6,8),mm);mouth.position.set(0,.12*s,.08*s);mouth.rotation.x=Math.PI/2;g.add(mouth);
    g.userData.bodyMesh=mouth; return g;
}

function buildSporecapModel(c, s) {
    const g = new THREE.Group();
    const stm = new THREE.MeshStandardMaterial({color:0x334422,roughness:.7});
    const cm = new THREE.MeshStandardMaterial({color:c,emissive:new THREE.Color(c).multiplyScalar(.4),emissiveIntensity:.8,roughness:.5});
    const spm = new THREE.MeshStandardMaterial({color:0x88ff44,emissive:0x66cc22,emissiveIntensity:2.0,transparent:true,opacity:.7});
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.08*s,.12*s,.5*s,8),stm);stem.position.y=.25*s;stem.castShadow=true;g.add(stem);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.3*s,10,8,0,Math.PI*2,0,Math.PI/2),cm);cap.position.y=.5*s;g.add(cap);
    for(let i=0;i<5;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(.04*s,6,4),spm);const a=(i/5)*Math.PI*2;sp.position.set(Math.cos(a)*.2*s,.55*s+Math.random()*.1*s,Math.sin(a)*.2*s);g.add(sp)}
    for(let i=0;i<4;i++){const sp=new THREE.Mesh(new THREE.SphereGeometry(.02*s,4,4),spm);sp.position.set((Math.random()-.5)*.4*s,.6*s+Math.random()*.4*s,(Math.random()-.5)*.4*s);g.add(sp)}
    const eyem=new THREE.MeshStandardMaterial({color:0xffcc00,emissive:0xffaa00,emissiveIntensity:2.0});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.02*s,6,6),eyem, x*.05*s,.35*s,.1*s))});
    g.userData.bodyMesh=cap; return g;
}

function buildCrawlerModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.6,metalness:.2});
    const d = new THREE.MeshStandardMaterial({color:new THREE.Color(c).multiplyScalar(.5),roughness:.7});
    const body=new THREE.Mesh(new THREE.SphereGeometry(.25*s,8,6),m);body.position.y=.2*s;body.scale.y=.5;body.castShadow=true;g.add(body);
    g.add(_m(new THREE.SphereGeometry(.12*s,6,6),d, 0,.2*s,.25*s));
    const mm=new THREE.MeshStandardMaterial({color:0x331100,roughness:.4,metalness:.5});
    [-1,1].forEach(x=>{const md=new THREE.Mesh(new THREE.ConeGeometry(.025*s,.15*s,5),mm);md.position.set(x*.08*s,.15*s,.35*s);md.rotation.x=-.5;md.rotation.z=x*.4;g.add(md)});
    const eyem=new THREE.MeshStandardMaterial({color:0xff2200,emissive:0xff4400,emissiveIntensity:1.5});
    for(let i=0;i<4;i++){g.add(_m(new THREE.SphereGeometry(.015*s,4,4),eyem, (Math.random()-.5)*.08*s,.24*s,.3*s+Math.random()*.05*s))}
    for(let i=0;i<6;i++){const sd=i<3?-1:1;const idx=i%3;const lg=new THREE.Mesh(new THREE.CylinderGeometry(.015*s,.01*s,.2*s,4),d);lg.position.set(sd*.2*s,.08*s,(idx-1)*.15*s);lg.rotation.z=sd*.8;g.add(lg)}
    g.userData.bodyMesh=body; return g;
}

function buildWraithModel(c, s) {
    const g = new THREE.Group();
    const gm = new THREE.MeshStandardMaterial({color:0x331100,emissive:0x220800,emissiveIntensity:.8,transparent:true,opacity:.6});
    const fm = new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xff4400,emissiveIntensity:2.5,transparent:true,opacity:.7});
    const body=new THREE.Mesh(new THREE.ConeGeometry(.25*s,.9*s,8),gm);body.position.y=.6*s;body.rotation.x=Math.PI;g.add(body);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(.16*s,8,8),gm);hd.position.y=1.1*s;g.add(hd);
    const eyem=new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:3.0});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.035*s,6,6),eyem, x*.06*s,1.14*s,.1*s))});
    [-1,1].forEach(x=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(.03*s,.01*s,.5*s,5),gm);a.position.set(x*.2*s,.8*s,.2*s);a.rotation.z=x*.6;a.rotation.x=-.4;g.add(a)});
    for(let i=0;i<5;i++){g.add(_m(new THREE.SphereGeometry(.04*s,4,4),fm, (Math.random()-.5)*.4*s,.3+Math.random()*.6*s,(Math.random()-.5)*.4*s))}
    g.userData.bodyMesh=hd; return g;
}

function buildSerpentModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.4,metalness:.2});
    for(let i=0;i<8;i++){const r=(.1-i*.008)*s;g.add(_m(new THREE.SphereGeometry(r,8,6),m, Math.sin(i*.4)*.15*s,(.2+i*.05)*s,-i*.12*s))}
    const hm=new THREE.MeshStandardMaterial({color:new THREE.Color(c).multiplyScalar(1.2),roughness:.4});
    const hood=new THREE.Mesh(new THREE.BoxGeometry(.35*s,.2*s,.03*s),hm);hood.position.set(0,.35*s,0);g.add(hood);
    const hd=new THREE.Mesh(new THREE.BoxGeometry(.2*s,.12*s,.18*s),m);hd.position.set(0,.4*s,.08*s);g.add(hd);
    const eyem=new THREE.MeshStandardMaterial({color:0x00ff66,emissive:0x00ff44,emissiveIntensity:1.5});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.018*s,6,6),eyem, x*.06*s,.44*s,.15*s))});
    g.userData.bodyMesh=hd; return g;
}

function buildChannelerModel(c, s) {
    const g = new THREE.Group();
    const rm = new THREE.MeshStandardMaterial({color:0x220000,roughness:.6});
    const sm = new THREE.MeshStandardMaterial({color:0xff2200,roughness:.5,metalness:.3});
    const rn = new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:2.5});
    const robe=new THREE.Mesh(new THREE.CylinderGeometry(.18*s,.32*s,1.0*s,8),rm);robe.position.y=.5*s;robe.castShadow=true;g.add(robe);
    g.add(_m(new THREE.SphereGeometry(.14*s,8,8),sm, 0,1.1*s,0));
    g.add(_m(new THREE.ConeGeometry(.2*s,.25*s,8),rm, 0,1.25*s,0));
    for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry((.15+i*.05)*s,.01*s,4,12),rn);r.position.y=.7*s+i*.15*s;r.rotation.x=Math.PI/2+(Math.random()-.5)*.3;g.add(r)}
    const eyem=new THREE.MeshStandardMaterial({color:0xff8800,emissive:0xff6600,emissiveIntensity:2.0});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.02*s,6,6),eyem, x*.05*s,1.13*s,.1*s))});
    const stm=new THREE.MeshStandardMaterial({color:0x442200});
    g.add(_m(new THREE.CylinderGeometry(.015*s,.015*s,1.1*s,6),stm, .22*s,.55*s,0));
    g.add(_m(new THREE.OctahedronGeometry(.06*s,0),rn, .22*s,1.15*s,0));
    g.userData.bodyMesh=robe; return g;
}

function buildGolemModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.3,metalness:.6});
    const lm = new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff3300,emissiveIntensity:1.5});
    const bg = new THREE.DodecahedronGeometry(.4*s,1);
    const pa=bg.attributes.position;for(let i=0;i<pa.count;i++){const n=1+(Math.random()-.5)*.2;pa.setX(i,pa.getX(i)*n);pa.setY(i,pa.getY(i)*(.9+Math.random()*.2));pa.setZ(i,pa.getZ(i)*n)}bg.computeVertexNormals();
    const body=new THREE.Mesh(bg,m);body.position.y=.85*s;body.castShadow=true;g.add(body);
    for(let i=0;i<4;i++){const cr=new THREE.Mesh(new THREE.BoxGeometry(.03*s,.25*s,.03*s),lm);const a=(i/4)*Math.PI*2;cr.position.set(Math.cos(a)*.3*s,(.7+Math.random()*.3)*s,Math.sin(a)*.3*s);cr.rotation.set(Math.random(),Math.random(),Math.random());g.add(cr)}
    g.add(_m(new THREE.OctahedronGeometry(.2*s,0),m, 0,1.45*s,0));
    const eyem=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff2200,emissiveIntensity:2.5});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.04*s,6,6),eyem, x*.08*s,1.47*s,.12*s))});
    [-1,1].forEach(x=>{g.add(_m(new THREE.BoxGeometry(.15*s,.6*s,.15*s),m, x*.5*s,.65*s,0));g.add(_m(new THREE.DodecahedronGeometry(.12*s,0),m, x*.5*s,.25*s,0))});
    [-1,1].forEach(x=>{g.add(_m(new THREE.BoxGeometry(.15*s,.4*s,.15*s),m, x*.2*s,.2*s,0))});
    g.userData.bodyMesh=body; return g;
}

function buildKnightModel(c, s) {
    const g = new THREE.Group();
    const am = new THREE.MeshStandardMaterial({color:c,roughness:.3,metalness:.7});
    const dm = new THREE.MeshStandardMaterial({color:0x110000,roughness:.4,metalness:.5});
    const fm = new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff3300,emissiveIntensity:1.2});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.2*s,.25*s,.85*s,8),am);body.position.y=.6*s;body.castShadow=true;g.add(body);
    g.add(_m(new THREE.BoxGeometry(.2*s,.22*s,.2*s),dm, 0,1.15*s,0));
    g.add(_m(new THREE.BoxGeometry(.03*s,.15*s,.2*s),fm, 0,1.3*s,0));
    const vm=new THREE.MeshStandardMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:2.5});
    g.add(_m(new THREE.BoxGeometry(.14*s,.025*s,.02*s),vm, 0,1.14*s,.1*s));
    [-1,1].forEach(x=>{g.add(_m(new THREE.BoxGeometry(.15*s,.1*s,.12*s),am, x*.25*s,.95*s,0))});
    const sw=new THREE.MeshStandardMaterial({color:0x888888,roughness:.2,metalness:.9});
    g.add(_m(new THREE.BoxGeometry(.03*s,.7*s,.08*s),sw, .3*s,.8*s,.15*s));
    g.add(_m(new THREE.BoxGeometry(.03*s,.35*s,.25*s),am, -.28*s,.65*s,.1*s));
    [-1,1].forEach(x=>{g.add(_m(new THREE.CylinderGeometry(.06*s,.05*s,.4*s,6),dm, x*.1*s,.18*s,0))});
    g.userData.bodyMesh=body; return g;
}

function buildHoundModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.2});
    const fm = new THREE.MeshStandardMaterial({color:0xff4400,emissive:0xff3300,emissiveIntensity:1.0});
    const dm = new THREE.MeshStandardMaterial({color:new THREE.Color(c).multiplyScalar(.5),roughness:.7});
    const body=new THREE.Mesh(new THREE.BoxGeometry(.3*s,.25*s,.55*s),m);body.position.y=.38*s;body.castShadow=true;g.add(body);
    g.add(_m(new THREE.BoxGeometry(.2*s,.18*s,.22*s),m, 0,.45*s,.35*s));
    g.add(_m(new THREE.BoxGeometry(.12*s,.06*s,.1*s),fm, 0,.38*s,.44*s));
    const eyem=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff2200,emissiveIntensity:2.5});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.02*s,6,6),eyem, x*.07*s,.5*s,.44*s))});
    [[-0.12,.2],[.12,.2],[-.12,-.15],[.12,-.15]].forEach(([lx,lz])=>{g.add(_m(new THREE.CylinderGeometry(.03*s,.025*s,.25*s,6),dm, lx*s,.12*s,lz*s))});
    const tl=new THREE.Mesh(new THREE.ConeGeometry(.04*s,.3*s,5),fm);tl.position.set(0,.4*s,-.35*s);tl.rotation.x=.6;g.add(tl);
    for(let i=0;i<3;i++){g.add(_m(new THREE.ConeGeometry(.03*s,.1*s,4),fm, 0,.55*s,.1*s-i*.12*s))}
    g.userData.bodyMesh=body; return g;
}

function buildDemonLordModel(c, s) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({color:c,roughness:.4,metalness:.4});
    const lm = new THREE.MeshStandardMaterial({color:0xff3300,emissive:0xff2200,emissiveIntensity:2.0});
    const dm = new THREE.MeshStandardMaterial({color:0x110000,roughness:.3,metalness:.5});
    const tg = new THREE.DodecahedronGeometry(.4*s,1);
    const pa=tg.attributes.position;for(let i=0;i<pa.count;i++){pa.setY(i,pa.getY(i)*1.3);const n=1+(Math.random()-.5)*.15;pa.setX(i,pa.getX(i)*n);pa.setZ(i,pa.getZ(i)*n)}tg.computeVertexNormals();
    const torso=new THREE.Mesh(tg,m);torso.position.y=.9*s;torso.castShadow=true;g.add(torso);
    for(let i=0;i<8;i++){const cr=new THREE.Mesh(new THREE.BoxGeometry(.02*s,.2*s,.02*s),lm);const a=(i/8)*Math.PI*2;cr.position.set(Math.cos(a)*.3*s,(.7+Math.random()*.5)*s,Math.sin(a)*.3*s);cr.rotation.set(Math.random(),Math.random(),Math.random());g.add(cr)}
    g.add(_m(new THREE.BoxGeometry(.25*s,.3*s,.2*s),dm, 0,1.5*s,0));
    const hm=new THREE.MeshStandardMaterial({color:0x111111,roughness:.2,metalness:.7});
    [-1,1].forEach(x=>{const h=new THREE.Mesh(new THREE.ConeGeometry(.05*s,.4*s,6),hm);h.position.set(x*.15*s,1.7*s,-.05*s);h.rotation.z=x*-.4;h.rotation.x=-.2;g.add(h)});
    const eyem=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:4.0});
    [-1,1].forEach(x=>{g.add(_m(new THREE.SphereGeometry(.04*s,8,8),eyem, x*.08*s,1.55*s,.1*s))});
    [-1,1].forEach(x=>{g.add(_m(new THREE.BoxGeometry(.15*s,.6*s,.12*s),m, x*.5*s,.8*s,0));g.add(_m(new THREE.DodecahedronGeometry(.1*s,0),dm, x*.5*s,.4*s,.1*s))});
    for(let i=0;i<5;i++){g.add(_m(new THREE.ConeGeometry(.04*s,.2*s,5),lm, Math.cos((i/5)*Math.PI*2)*.15*s,1.75*s,Math.sin((i/5)*Math.PI*2)*.15*s))}
    g.add(_m(new THREE.CylinderGeometry(.35*s,.5*s,.3*s,8),dm, 0,.15*s,0));
    const lt=new THREE.PointLight(0xff2200,2.0,8*s);lt.position.y=1.0*s;g.add(lt);
    g.userData.bodyMesh=torso; return g;
}

const MOB_BUILDERS = {
    troggoth: buildTroggothModel, troggothBoss: buildTroggothBossModel,
    leech: buildLeechModel, sporecap: buildSporecapModel, crawler: buildCrawlerModel,
    wraith: buildWraithModel, serpent: buildSerpentModel, channeler: buildChannelerModel,
    golem: buildGolemModel, knight: buildKnightModel, hound: buildHoundModel,
    demonLord: buildDemonLordModel,
};

// ══════════════════════════════════════════════════════════════════════
// COMBAT VFX POOL
// ══════════════════════════════════════════════════════════════════════
const _vfxPool = [];
const MAX_VFX = 40;

function _spawnVfx(root, x, y, z, color, size, life) {
    if (_vfxPool.length >= MAX_VFX) {
        const old = _vfxPool.shift();
        root.remove(old.mesh);
        old.mesh.geometry.dispose(); old.mesh.material.dispose();
    }
    const mat = new THREE.MeshBasicMaterial({color,transparent:true,opacity:1.0});
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size,4,4),mat);
    mesh.position.set(x,y,z);
    root.add(mesh);
    const vfx={mesh,life,maxLife:life,vx:(Math.random()-.5)*2,vy:1.5+Math.random()*2,vz:(Math.random()-.5)*2};
    _vfxPool.push(vfx);
    return vfx;
}

// ══════════════════════════════════════════════════════════════════════
// DUNGEON SCENE — Zone-style open landscape with encounter clearings
// Player + camera are the REAL overworld ones — dungeon just builds terrain.
//
// Layout: Encounters are laid out as clearings along a path.
// The player walks from one clearing to the next, like a condensed zone.
// Much tighter spacing for a faster, more action-packed feel.
// ══════════════════════════════════════════════════════════════════════

const ROOM_SPACING = 12;  // Distance between room centers (tighter = faster pace)
const ARENA_RADIUS = 7;   // Radius of each encounter clearing

export class DungeonScene {
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

        // Saved overworld lights to toggle
        this._savedOverworldLights = [];

        // DOM UI for crisp nameplates
        this.uiContainer = null;
        this._initUI();
    }

    _initUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'dungeon-ui-container';
        this.uiContainer.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 45; display: none;
            perspective: 1000px;
        `;
        document.body.appendChild(this.uiContainer);

        const style = document.createElement('style');
        style.textContent = `
            .dg-nameplate {
                position: absolute;
                display: flex; flex-direction: column; align-items: center;
                pointer-events: none;
                font-family: 'Cinzel', serif;
                width: 140px;
                transition: opacity 0.2s ease-in-out;
                will-change: transform;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                /* No translate(-50%, -100%) here, we'll do it in JS with rounded pixels */
            }
            .dg-name {
                color: #b89868; font-size: 11px; font-weight: 700;
                text-transform: none; letter-spacing: 0.5px;
                margin-bottom: 3px;
                text-shadow: 0 1px 2px #000, 0 0 4px rgba(0,0,0,0.8);
                white-space: nowrap;
            }
            .dg-name.boss { color: #ffcc44; font-size: 14px; text-shadow: 0 0 10px rgba(255,180,40,0.5), 0 1px 3px black; }
            .dg-name.player { color: #66ccff; }
            .dg-name.party { color: #cc88ff; }
            
            .dg-hp-bg {
                width: 100%; height: 6px; background: rgba(0,0,0,0.75);
                border: 1px solid rgba(255,255,255,0.15); border-radius: 2px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.6);
                position: relative;
            }
            .dg-hp-fill {
                height: 100%; width: 100%; background: linear-gradient(180deg, #cc3333 0%, #882222 100%);
                transition: width 0.2s cubic-bezier(0.1, 0, 0.1, 1);
            }
            .dg-hp-fill.player { background: linear-gradient(180deg, #44cc44 0%, #228822 100%); }
            .dg-hp-fill.party { background: linear-gradient(180deg, #44cc44 0%, #228822 100%); }
            
            .dg-hp-text {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                font-family: 'Inter', sans-serif; font-size: 5px; font-weight: 800;
                color: white; display: flex; align-items: center; justify-content: center;
                text-shadow: 0 0 2px black; opacity: 0.8;
            }
        `;
        document.head.appendChild(style);
    }

    // ══════════════════════════════════════════════════
    // ENTER / EXIT
    // ══════════════════════════════════════════════════

    enter(dungeonDef) {
        if (this.active) return;
        this.active = true;
        this._def = dungeonDef;
        if (this.uiContainer) this.uiContainer.style.display = 'block';

        // Save & override scene state
        this._savedFog = this.mainScene.fog;
        this._savedBg = this.mainScene.background ? this.mainScene.background.clone() : null;

        // Hide overworld lights
        this._savedOverworldLights = [];
        this.mainScene.traverse(child => {
            if (child === this.root) return;
            if ((child.isLight) && !this.root.getObjectById(child.id)) {
                if (child.visible) {
                    this._savedOverworldLights.push(child);
                    child.visible = false;
                }
            }
        });

        const c = dungeonDef.colors;
        // Lighter fog — more visible, more zone-like
        this.mainScene.fog = new THREE.FogExp2(c.fogColor, 0.012);
        this.mainScene.background = new THREE.Color(c.sceneBg);

        this.root.visible = true;
        this._currentRoomIndex = -1;
        this._spawnedForEncounter = -1;
        this._endVfxDone = false;

        this._buildEnvironment(dungeonDef);
    }

    exit() {
        if (!this.active) return;
        this.active = false;
        this.root.visible = false;
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
            this.uiContainer.innerHTML = ''; // Clear nameplates
        }

        // Restore scene state
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
        for (const v of _vfxPool) { this.root.remove(v.mesh); v.mesh.geometry?.dispose(); v.mesh.material?.dispose(); }
        _vfxPool.length = 0;
        this._objects = []; this._mobEntities = []; this._particles = []; this._lavaPlanes = [];
        this._currentRoomIndex = -1; this._spawnedForEncounter = -1;
    }

    _add(o) { this.root.add(o); this._objects.push(o); return o; }

    // ══════════════════════════════════════════════════
    // GET ROOM CENTER — where encounter N is positioned in world space
    // ══════════════════════════════════════════════════

    getRoomCenter(roomIndex) {
        // Rooms are laid out along negative Z axis from origin
        return new THREE.Vector3(0, 0, -roomIndex * ROOM_SPACING);
    }

    // ══════════════════════════════════════════════════
    // BUILD ENVIRONMENT — Open volcanic landscape
    // Designed to look like a zone area — bright enough to see,
    // ground texture, scattered props, visible sky gradient
    // ══════════════════════════════════════════════════

    _buildEnvironment(def) {
        const c = def.colors;
        const ENC = def.encounters.length;
        const TOTAL_LENGTH = ENC * ROOM_SPACING + 20;

        // ── Lighting — bright and zone-like ──
        // Strong ambient so the player model is well-lit (like overworld)
        const amb = new THREE.AmbientLight(0x664433, 1.6);
        this._add(amb);

        // Main directional light — similar to overworld's dirLight
        const dir = new THREE.DirectionalLight(0xffaa66, 1.2);
        dir.position.set(10, 25, 10);
        this._add(dir);
        this._dungeonDirLight = dir;

        // Hemisphere light for nice ambient fill (sky = warm orange, ground = dark red)
        const hemi = new THREE.HemisphereLight(0xff8855, 0x331100, 0.6);
        this._add(hemi);

        // Point light that follows the player — warm fill
        const fillLight = new THREE.PointLight(0xff8844, 1.2, 25);
        fillLight.position.set(0, 5, 0);
        this._add(fillLight);
        this._followLight = fillLight;

        // ── Ground — large open volcanic plain with visible texture detail ──
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2a1208, roughness: .85, metalness: .15
        });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, TOTAL_LENGTH + 30), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.01, -TOTAL_LENGTH / 2 + 10);
        ground.receiveShadow = true;
        this._add(ground);

        // ── Ground detail — cracked obsidian patches for visual interest ──
        const crackMat = new THREE.MeshStandardMaterial({
            color: 0x1a0800, roughness: .9, metalness: .3
        });
        for (let i = 0; i < 25; i++) {
            const crack = new THREE.Mesh(
                new THREE.PlaneGeometry(1.5 + Math.random() * 3, 0.8 + Math.random() * 2),
                crackMat
            );
            crack.rotation.x = -Math.PI / 2;
            crack.rotation.z = Math.random() * Math.PI;
            crack.position.set(
                (Math.random() - .5) * 30,
                0.01,
                10 - Math.random() * TOTAL_LENGTH
            );
            this._add(crack);
        }

        // ── Lava rivers along the sides (narrower, further out) ──
        const lavaMat = new THREE.MeshStandardMaterial({
            color: c.lavaColor, emissive: c.lavaColor,
            emissiveIntensity: 1.0, roughness: .15
        });
        [-18, 18].forEach(x => {
            const lava = new THREE.Mesh(new THREE.PlaneGeometry(6, TOTAL_LENGTH + 30), lavaMat);
            lava.rotation.x = -Math.PI / 2;
            lava.position.set(x, -0.08, -TOTAL_LENGTH / 2 + 10);
            this._add(lava);
            this._lavaPlanes.push(lava);
        });

        // ── Rock walls / cliffs along sides — more natural/jagged ──
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a0a04, roughness: .7, metalness: .4 });
        [-1, 1].forEach(side => {
            for (let i = 0; i < Math.ceil(TOTAL_LENGTH / 5); i++) {
                const z = 10 - i * 5;
                const height = 3 + Math.random() * 4;
                const width = 2 + Math.random() * 3;
                const cliff = new THREE.Mesh(
                    new THREE.BoxGeometry(width, height, 4 + Math.random() * 2),
                    wallMat
                );
                cliff.position.set(
                    side * (21 + Math.random() * 3),
                    height / 2 - 0.5,
                    z + Math.random() * 2
                );
                cliff.rotation.y = Math.random() * 0.3;
                this._add(cliff);
            }
        });

        // ── Path between encounters — visible stone path ──
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x332218, roughness: .7, metalness: .2 });
        const pathLen = TOTAL_LENGTH;
        const path = new THREE.Mesh(new THREE.BoxGeometry(3.5, .08, pathLen), pathMat);
        path.position.set(0, 0.01, -pathLen / 2 + 10);
        this._add(path);

        // Path edge stones
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x221008, roughness: .8, metalness: .3 });
        [-1, 1].forEach(side => {
            for (let i = 0; i < Math.floor(pathLen / 2); i++) {
                const stone = new THREE.Mesh(
                    new THREE.BoxGeometry(.3 + Math.random() * .3, .15, .3 + Math.random() * .3),
                    edgeMat
                );
                stone.position.set(
                    side * (1.8 + Math.random() * .3),
                    0.07,
                    10 - i * 2 + Math.random() * .5
                );
                stone.rotation.y = Math.random() * Math.PI;
                this._add(stone);
            }
        });

        // ── Per-room features ──
        for (let ri = 0; ri < ENC; ri++) {
            const center = this.getRoomCenter(ri);
            const enc = def.encounters[ri];
            const isBoss = enc.type === 'boss' || enc.type === 'miniboss';

            // ── Arena ground — lighter circular area at each encounter ──
            const arenaMat = new THREE.MeshStandardMaterial({
                color: isBoss ? 0x2a0808 : 0x2a1510, roughness: .8, metalness: .1
            });
            const arena = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS, 24), arenaMat);
            arena.rotation.x = -Math.PI / 2;
            arena.position.set(center.x, 0.02, center.z);
            this._add(arena);

            // ── Pillars flanking each arena — fewer, more dramatic ──
            for (let pi = 0; pi < (isBoss ? 6 : 4); pi++) {
                const totalPillars = isBoss ? 6 : 4;
                const angle = (pi / totalPillars) * Math.PI * 2 + Math.PI / 4;
                const px = center.x + Math.cos(angle) * (ARENA_RADIUS + 0.5);
                const pz = center.z + Math.sin(angle) * (ARENA_RADIUS + 0.5);
                const pillarH = 3 + Math.random() * 2;
                const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: .5, metalness: .5 });
                const p = new THREE.Mesh(new THREE.CylinderGeometry(.3, .45, pillarH, 8), pillarMat);
                p.position.set(px, pillarH / 2, pz);
                this._add(p);

                // Crystal veins on pillars
                const crystalMat = new THREE.MeshStandardMaterial({
                    color: c.emissiveAccent, emissive: c.emissiveAccent, emissiveIntensity: 1.0
                });
                for (let ci = 0; ci < 2; ci++) {
                    const cr = new THREE.Mesh(new THREE.BoxGeometry(.04, .5 + Math.random() * .3, .04), crystalMat);
                    cr.position.set(px + Math.cos(angle + ci) * .25, 1 + ci * 1.2, pz + Math.sin(angle + ci) * .25);
                    cr.rotation.set(0, angle, Math.random() * .3);
                    this._add(cr);
                }
            }

            // ── Torches around arena edges ──
            const flameMat = new THREE.MeshStandardMaterial({
                color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.5,
                transparent: true, opacity: .85
            });
            const torchMat = new THREE.MeshStandardMaterial({ color: 0x332200 });
            const numTorches = isBoss ? 8 : 4;
            for (let ti = 0; ti < numTorches; ti++) {
                const angle = (ti / numTorches) * Math.PI * 2;
                const tx = center.x + Math.cos(angle) * (ARENA_RADIUS - 1);
                const tz = center.z + Math.sin(angle) * (ARENA_RADIUS - 1);
                this._add(_m(new THREE.CylinderGeometry(.06, .1, .8, 6), torchMat, tx, .4, tz));
                const flame = _m(new THREE.ConeGeometry(.12, .3, 6), flameMat, tx, .9, tz);
                this._add(flame);
                this._particles.push({ mesh: flame, type: 'flame', baseY: .9 });

                const tLight = new THREE.PointLight(c.particleColor, 0.4, 6);
                tLight.position.set(tx, 1.5, tz);
                this._add(tLight);
            }

            // ── Boss room glow ring ──
            if (isBoss) {
                const ringMat = new THREE.MeshStandardMaterial({
                    color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.5,
                    transparent: true, opacity: 0.25
                });
                const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA_RADIUS - 1, ARENA_RADIUS - 0.5, 32), ringMat);
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(center.x, 0.03, center.z);
                this._add(ring);
                this._particles.push({ mesh: ring, type: 'bossGlow', baseOpacity: 0.25 });

                // Extra braziers for boss rooms
                for (let bi = 0; bi < 4; bi++) {
                    const a = (bi / 4) * Math.PI * 2 + Math.PI / 8;
                    const bx = center.x + Math.cos(a) * (ARENA_RADIUS + 2);
                    const bz = center.z + Math.sin(a) * (ARENA_RADIUS + 2);
                    this._add(_m(new THREE.CylinderGeometry(.15, .25, 1.0, 6),
                        new THREE.MeshStandardMaterial({ color: 0x332211 }), bx, .5, bz));
                    const bf = _m(new THREE.ConeGeometry(.18, .4, 6), flameMat.clone(), bx, 1.1, bz);
                    this._add(bf);
                    this._particles.push({ mesh: bf, type: 'flame', baseY: 1.1 });
                    const bl = new THREE.PointLight(0xff4400, 0.6, 6);
                    bl.position.set(bx, 2, bz);
                    this._add(bl);
                }
            }

            // ── Room-specific props ──
            this._buildRoomProps(ri, center, enc, c);
        }

        // ── Floating embers throughout ──
        const emberMat = new THREE.MeshStandardMaterial({
            color: c.particleColor, emissive: c.particleColor, emissiveIntensity: 2.5
        });
        for (let i = 0; i < 40; i++) {
            const e = new THREE.Mesh(new THREE.SphereGeometry(.03 + Math.random() * .03, 4, 4), emberMat);
            e.position.set(
                (Math.random() - .5) * 25,
                .5 + Math.random() * 5,
                10 - Math.random() * TOTAL_LENGTH
            );
            this._add(e);
            this._particles.push({
                mesh: e, type: 'ember', baseY: e.position.y,
                speedX: (Math.random() - .5) * .3, speedY: .3 + Math.random() * .3,
                phase: Math.random() * Math.PI * 2
            });
        }

        // ── Scattered rocks around terrain — more variety ──
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a1208, roughness: .8, metalness: .2 });
        for (let i = 0; i < 30; i++) {
            const rScale = .2 + Math.random() * .6;
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rScale, 0), rockMat);
            rock.position.set(
                (Math.random() - .5) * 35,
                rScale * .3,
                10 - Math.random() * TOTAL_LENGTH
            );
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            this._add(rock);
        }

        // ── Dead trees / stalactites for atmosphere ──
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a03, roughness: .8, metalness: .1 });
        for (let i = 0; i < 12; i++) {
            const treeH = 1.5 + Math.random() * 3;
            const tree = new THREE.Mesh(
                new THREE.CylinderGeometry(.04, .15 + Math.random() * .1, treeH, 5),
                treeMat
            );
            const tx = (Math.random() > .5 ? 1 : -1) * (8 + Math.random() * 10);
            tree.position.set(tx, treeH / 2, 10 - Math.random() * TOTAL_LENGTH);
            tree.rotation.z = (Math.random() - .5) * .3;
            this._add(tree);

            // Dead branches
            for (let b = 0; b < 2; b++) {
                const branch = new THREE.Mesh(
                    new THREE.CylinderGeometry(.01, .04, .5 + Math.random() * .5, 4),
                    treeMat
                );
                branch.position.set(
                    tx + (Math.random() - .5) * .3,
                    treeH * .5 + b * .6,
                    tree.position.z + (Math.random() - .5) * .2
                );
                branch.rotation.z = (Math.random() - .5) * 1.2;
                this._add(branch);
            }
        }
    }

    // ══════════════════════════════════════════════════
    // ROOM PROPS — Environmental storytelling
    // ══════════════════════════════════════════════════

    _buildRoomProps(roomIndex, center, encounter, colors) {
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: .7, metalness: .1 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: .6, metalness: .3 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: .8 });
        const glowMat = new THREE.MeshStandardMaterial({
            color: colors.emissiveAccent, emissive: colors.emissiveAccent,
            emissiveIntensity: 0.6, transparent: true, opacity: .5
        });

        const cx = center.x, cz = center.z;

        switch (encounter.id) {
            case 'enc_fissure_descent': {
                for (let i = 0; i < 6; i++) {
                    const bx = cx + (Math.random() - .5) * 10, bz = cz + (Math.random() - .5) * 8;
                    const bone = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, .3 + Math.random() * .2, 5), boneMat);
                    bone.position.set(bx, .02, bz);
                    bone.rotation.set(Math.PI / 2, Math.random() * Math.PI, Math.random() * .3);
                    this._add(bone);
                    if (i < 2) {
                        const skull = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), boneMat);
                        skull.position.set(bx + .15, .06, bz + .1);
                        skull.scale.y = .8;
                        this._add(skull);
                    }
                }
                for (let i = 0; i < 4; i++) {
                    const vent = new THREE.Mesh(new THREE.PlaneGeometry(.4, .06), glowMat);
                    vent.rotation.x = -Math.PI / 2;
                    vent.position.set(cx + (Math.random() - .5) * 8, .02, cz + (Math.random() - .5) * 6);
                    vent.rotation.z = Math.random() * Math.PI;
                    this._add(vent);
                }
                break;
            }
            case 'enc_fungal_grotto': {
                const shroomMat = new THREE.MeshStandardMaterial({ color: 0x22aa44, emissive: 0x11aa33, emissiveIntensity: 1.5, roughness: .5 });
                const sporeMat = new THREE.MeshStandardMaterial({ color: 0x88ff55, emissive: 0x66ff33, emissiveIntensity: 2.0, transparent: true, opacity: .5 });
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 4 + Math.random() * 3;
                    const sx = cx + Math.cos(angle) * dist;
                    const sz = cz + Math.sin(angle) * dist;
                    const stemH = .2 + Math.random() * .3;
                    this._add(_m(new THREE.CylinderGeometry(.03, .06, stemH, 5),
                        new THREE.MeshStandardMaterial({ color: 0x334422 }), sx, stemH / 2, sz));
                    this._add(_m(new THREE.SphereGeometry(.1 + Math.random() * .08, 6, 4, 0, Math.PI * 2, 0, Math.PI * .5),
                        shroomMat, sx, stemH, sz));
                    const spore = _m(new THREE.SphereGeometry(.015, 4, 3), sporeMat,
                        sx + (Math.random() - .5) * .2, stemH + .15, sz + (Math.random() - .5) * .2);
                    this._add(spore);
                    this._particles.push({ mesh: spore, type: 'ember', baseY: spore.position.y, speedX: 0, speedY: .15, phase: Math.random() * Math.PI * 2 });
                }
                break;
            }
            case 'enc_miniboss_goremaul': {
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2;
                    const tx = cx + Math.cos(a) * 6, tz = cz + Math.sin(a) * 6;
                    const totem = new THREE.Mesh(new THREE.BoxGeometry(.4, 1.2, .4), stoneMat);
                    totem.position.set(tx, .6, tz);
                    totem.rotation.y = Math.random() * Math.PI;
                    this._add(totem);
                    const rune = new THREE.Mesh(new THREE.PlaneGeometry(.25, .25), glowMat);
                    rune.position.set(tx, 1.3, tz);
                    rune.rotation.x = -Math.PI / 2;
                    this._add(rune);
                    this._particles.push({ mesh: rune, type: 'bossGlow', baseOpacity: .5 });
                }
                break;
            }
            case 'enc_wailing_tunnels': {
                const chainMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: .4, metalness: .7 });
                for (let i = 0; i < 6; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 3 + Math.random() * 4;
                    const hx = cx + Math.cos(angle) * dist;
                    const hz = cz + Math.sin(angle) * dist;
                    const chainLen = 4 + Math.random() * 2;
                    for (let j = 0; j < Math.floor(chainLen); j++) {
                        const link = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 4, 6), chainMat);
                        link.position.set(hx, chainLen - j * .3, hz);
                        link.rotation.x = j % 2 === 0 ? 0 : Math.PI / 2;
                        this._add(link);
                    }
                }
                break;
            }
            case 'enc_sacrificial_pit': {
                const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(.8, 1.0, .4, 8), stoneMat);
                altarBase.position.set(cx, .2, cz);
                this._add(altarBase);
                const altarTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, .1, 1.0),
                    new THREE.MeshStandardMaterial({ color: 0x110000, roughness: .3, metalness: .6 }));
                altarTop.position.set(cx, .42, cz);
                this._add(altarTop);
                const blood = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5),
                    new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0x220000, emissiveIntensity: .3, transparent: true, opacity: .6 }));
                blood.rotation.x = -Math.PI / 2;
                blood.position.set(cx, .48, cz);
                this._add(blood);
                const candleFlameMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff1100, emissiveIntensity: 3.0, transparent: true, opacity: .8 });
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    const cx2 = cx + Math.cos(a) * 1.8, cz2 = cz + Math.sin(a) * 1.8;
                    this._add(_m(new THREE.CylinderGeometry(.02, .02, .2, 5), new THREE.MeshStandardMaterial({ color: 0x111111 }), cx2, .1, cz2));
                    const cf = _m(new THREE.ConeGeometry(.035, .1, 4), candleFlameMat, cx2, .25, cz2);
                    this._add(cf);
                    this._particles.push({ mesh: cf, type: 'flame', baseY: .25 });
                }
                break;
            }
            case 'enc_cathedral_nave': {
                const glassMat = new THREE.MeshStandardMaterial({
                    color: 0xff4422, emissive: 0xff2211, emissiveIntensity: .3,
                    transparent: true, opacity: .4, side: THREE.DoubleSide
                });
                for (let i = 0; i < 8; i++) {
                    const shard = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), glassMat.clone());
                    shard.material.color.setHex([0xff4422, 0xff8844, 0xffcc22, 0x4466ff][Math.floor(Math.random() * 4)]);
                    shard.position.set(cx + (Math.random() - .5) * 10, .02, cz + (Math.random() - .5) * 8);
                    shard.rotation.set(-Math.PI / 2 + Math.random() * .2, 0, Math.random() * Math.PI);
                    this._add(shard);
                }
                for (let i = 0; i < 4; i++) {
                    const side = i < 2 ? -1 : 1;
                    const pew = new THREE.Mesh(new THREE.BoxGeometry(.6, .3, 1.5), woodMat);
                    pew.position.set(cx + side * (3 + (i % 2) * 2), .15, cz + ((i % 2) - .5) * 3);
                    pew.rotation.y = side * .1;
                    pew.rotation.z = (Math.random() - .5) * .15;
                    this._add(pew);
                }
                break;
            }
            case 'enc_finalboss_thalkesh': {
                const throneMat = new THREE.MeshStandardMaterial({ color: 0x0a0400, roughness: .3, metalness: .6 });
                const throne = new THREE.Mesh(new THREE.CylinderGeometry(.4, 1.0, 5, 6), throneMat);
                throne.position.set(cx, 2.5, cz - 5);
                this._add(throne);
                const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, .2, 4), throneMat);
                back.position.set(cx, 4.5, cz - 5.3);
                back.rotation.x = .1;
                this._add(back);
                const throneLava = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.5 });
                for (let i = 0; i < 6; i++) {
                    const vein = new THREE.Mesh(new THREE.BoxGeometry(.03, 1.0 + Math.random(), .03), throneLava);
                    vein.position.set(cx + (Math.random() - .5) * .6, 2 + Math.random() * 2, cz - 5 + (Math.random() - .5) * .4);
                    vein.rotation.set(0, 0, (Math.random() - .5) * .5);
                    this._add(vein);
                }
                // Caged skeletons
                const barMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: .4, metalness: .8 });
                [-4, 4].forEach(offsetX => {
                    for (let bi = 0; bi < 6; bi++) {
                        const a = (bi / 6) * Math.PI * 2;
                        const bar = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.6, 4), barMat);
                        bar.position.set(cx + offsetX + Math.cos(a) * .25, .8, cz - 3 + Math.sin(a) * .25);
                        this._add(bar);
                    }
                    const sk = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), boneMat);
                    sk.position.set(cx + offsetX, .5, cz - 3);
                    sk.scale.y = .8;
                    this._add(sk);
                });
                break;
            }
        }
    }

    // ══════════════════════════════════════════════════
    // MOB SPAWNING — Mobs are placed in the world for
    // the dungeon system to track. They use the same
    // position system as overworld mobs.
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
            if (ent.ui && ent.ui.plate) {
                ent.ui.plate.remove();
            }
            const idx = this._objects.indexOf(ent.group);
            if (idx >= 0) this._objects.splice(idx, 1);
        }
        this._mobEntities = [];
        // Also clear any other dungeon HUD labels
        if (this._playerLabel) { this._playerLabel.plate.remove(); this._playerLabel = null; }
        if (this._partyLabels) {
            for (const pl of this._partyLabels) {
                if (pl.label && pl.label.plate) pl.label.plate.remove();
            }
            this._partyLabels = [];
        }
    }

    _spawnMobs(encounter, mobStates) {
        if (!encounter || !mobStates || mobStates.length === 0) return;
        if (!mobStates.some(m => m.alive)) return;

        this._clearMobs();
        this._spawnedForEncounter = this._currentRoomIndex;

        // Initialize Player & Party labels for the dungeon (one-time per encounter room)
        this._initInstanceHUD();

        const center = this.getRoomCenter(this._currentRoomIndex);
        let mi = 0;
        for (const md of encounter.mobs) {
            const builder = MOB_BUILDERS[md.mobShape] || MOB_BUILDERS.troggoth;
            for (let i = 0; i < md.count; i++) {
                if (mi >= mobStates.length) break;
                const state = mobStates[mi];
                const g = builder(md.color, md.scale);
                const total = mobStates.length;
                // Spread mobs in a semicircle around the room center
                const angle = ((mi / total) - 0.5) * Math.PI * 0.8;
                const radius = total > 3 ? 4 : 3;
                const x = center.x + Math.sin(angle) * radius;
                const z = center.z - Math.cos(angle) * (radius * 0.5) - 1.5;
                g.position.set(x, 0, z);
                g.rotation.y = Math.PI;
                g.scale.setScalar(0.01); // spawn anim
                this._add(g);

                const ent = {
                    group: g, mobRef: state, baseY: 0,
                    mobDef: md, hitFlash: 0, lastHp: state.hp,
                    spawnDelay: 0.15 + mi * 0.1, spawned: false,
                    deathTimer: 0, deathVfxDone: false,
                    worldX: x, worldZ: z,
                };

                // Nameplate for mobs (DOM based)
                this._addEntityNameplate(ent, state.name, md.isBoss ? 'boss' : 'mob');

                this._mobEntities.push(ent);
                mi++;
            }
        }
    }

    _initInstanceHUD() {
        if (!this.uiContainer) return;
        
        // Player Label
        this._playerLabel = this._createLabel(gameState.playerName, 'player');
        
        // Party Labels
        this._partyLabels = [];
        const prog = dungeonSystem.getProgress();
        if (prog && prog.partyMembers) {
            for (const pm of prog.partyMembers) {
                this._partyLabels.push({
                    id: pm.id,
                    label: this._createLabel(pm.name, 'party')
                });
            }
        }
    }

    _createLabel(name, type) {
        const plate = document.createElement('div');
        plate.className = `dg-nameplate ${type}`;
        plate.innerHTML = `
            <div class="dg-name ${type}">${name}</div>
            <div class="dg-hp-bg">
                <div class="dg-hp-fill ${type}"></div>
            </div>
        `;
        this.uiContainer.appendChild(plate);
        return {
            plate,
            fill: plate.querySelector('.dg-hp-fill')
        };
    }

    _addEntityNameplate(entity, name, type) {
        entity.ui = this._createLabel(name, type);
    }

    _projectLabel(plate, worldPos, heightOffset) {
        const tempVec = this._tempVec;
        tempVec.copy(worldPos);
        tempVec.y += heightOffset;

        if (this._frustum.containsPoint(tempVec)) {
            tempVec.project(this.camera);
            const x = Math.round((tempVec.x * 0.5 + 0.5) * window.innerWidth);
            const y = Math.round((tempVec.y * -0.5 + 0.5) * window.innerHeight);

            plate.style.display = 'flex';
            plate.style.opacity = '1';
            // Use left/top + translate for perfect centering and sharpness
            plate.style.left = `${x}px`;
            plate.style.top = `${y}px`;
            plate.style.transform = `translate(-50%, -100%)`;
        } else {
            plate.style.display = 'none';
        }
    }

    // ══════════════════════════════════════════════════
    // MAIN UPDATE
    // ══════════════════════════════════════════════════

    update(dt, time) {
        if (!this.active) return;
        this._time = time;
        const inst = dungeonSystem.instance;
        if (!inst) return;
        const prog = dungeonSystem.getProgress();
        if (!prog) return;

        // Projection setup for UI
        if (!this._projScreenMatrix) this._projScreenMatrix = new THREE.Matrix4();
        if (!this._frustum) this._frustum = new THREE.Frustum();
        if (!this._tempVec) this._tempVec = new THREE.Vector3();
        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

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

        // Move follow light with the scene camera target
        if (this._followLight) {
            this._followLight.position.x = this.camera.position.x;
            this._followLight.position.z = this.camera.position.z;
            this._followLight.position.y = 5;
        }

        // Update directional light to follow player (like overworld)
        if (this._dungeonDirLight) {
            const center = this.getRoomCenter(Math.max(0, this._currentRoomIndex));
            this._dungeonDirLight.position.set(center.x + 15, 30, center.z + 10);
            if (this._dungeonDirLight.target) {
                this._dungeonDirLight.target.position.set(center.x, 0, center.z);
                this._dungeonDirLight.target.updateMatrixWorld();
            }
        }

        // Victory / defeat VFX (one-shot)
        if ((prog.state === 'complete' || prog.state === 'failed') && !this._endVfxDone) {
            this._endVfxDone = true;
            const center = this.getRoomCenter(Math.max(0, this._currentRoomIndex));
            if (prog.state === 'complete') {
                for (let i = 0; i < 24; i++) {
                    const vfx = _spawnVfx(this.root,
                        center.x + (Math.random() - .5) * 4, 1 + Math.random() * 2, center.z + (Math.random() - .5) * 4,
                        [0xffdd44, 0xffaa22, 0xffcc66, 0xffffff][Math.floor(Math.random() * 4)],
                        .03 + Math.random() * .03, 1.5 + Math.random()
                    );
                    vfx.vy = 3 + Math.random() * 3;
                    vfx.vx = (Math.random() - .5) * 4;
                    vfx.vz = (Math.random() - .5) * 4;
                }
            } else {
                for (let i = 0; i < 12; i++) {
                    const vfx = _spawnVfx(this.root,
                        center.x + (Math.random() - .5) * 6, 2 + Math.random(), center.z + (Math.random() - .5) * 6,
                        [0xff2200, 0xff4400, 0x880000][Math.floor(Math.random() * 3)],
                        .025 + Math.random() * .02, 2.0
                    );
                    vfx.vy = -.5 + Math.random();
                }
            }
        }
        if (prog.state === 'combat') this._endVfxDone = false;

        this._updateMobs(dt, time, prog);
        this._updateCombatVFX(dt, time, prog);
        this._updateParticles(dt, time);
        this._updateVFXPool(dt);
    }

    // ══════════════════════════════════════════════════
    // UPDATE: Mobs — animation, hit flash, death
    // ══════════════════════════════════════════════════

    _updateMobs(dt, time, prog) {
        // ── Instance HUD: Player ──
        if (this._playerLabel) {
            const pp = window._dungeonPlayerPos || { x: 0, y: 0, z: 0 }; // We'll get this from camera target or main loop
            // In DungeonScene, we don't have direct ref to Player object, but we can use camera position + offset if needed,
            // or just rely on the fact that the player is always at the center of the camera focus.
            // Actually, Player is at camera.lookAt target.
            const playerPos = this._tempVec.set(0,0,0);
            if (this.camera.userData.target) playerPos.copy(this.camera.userData.target);
            // Fallback: search main scene for player group if needed
            const pg = this.mainScene.getObjectByProperty('userData', { isPlayer: true });
            if (pg) playerPos.copy(pg.position);

            this._projectLabel(this._playerLabel.plate, playerPos, 2.2);
            const hpPct = gameState.hp / gameState.maxHp;
            this._playerLabel.fill.style.width = `${Math.max(0, hpPct * 100)}%`;
        }

        // ── Instance HUD: Party ──
        if (this._partyLabels) {
            for (const pl of this._partyLabels) {
                const member = prog.partyMembers.find(m => m.id === pl.id);
                if (!member) continue;
                // Find member group in main scene
                const pmGroup = this.mainScene.children.find(c => c.userData && c.userData.memberId === pl.id);
                if (pmGroup) {
                    this._projectLabel(pl.label.plate, pmGroup.position, 2.2);
                    const hpPct = member.hp / member.maxHp;
                    pl.label.fill.style.width = `${Math.max(0, hpPct * 100)}%`;
                } else {
                    pl.label.plate.style.display = 'none';
                }
            }
        }

        for (const ent of this._mobEntities) {
            // Spawn animation
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
                    for (let j = 0; j < 8; j++) {
                        _spawnVfx(this.root, gp.x + (Math.random() - .5) * .5, Math.max(0, gp.y) + .5 + Math.random() * .5, gp.z + (Math.random() - .5) * .5, ent.mobDef.isBoss ? 0xff4400 : 0xff6600, .05, 1.0);
                    }
                }
                if (ent.ui) ent.ui.plate.style.opacity = '0';
                continue;
            }

            // ── Mob-specific idle animations ──
            const shape = ent.mobDef ? ent.mobDef.mobShape : '';
            if (shape === 'wraith') {
                ent.group.position.y = ent.baseY + .3 + Math.sin(time * 1.2 + ent.worldX * 2) * .15;
                ent.group.rotation.z = Math.sin(time * .8 + ent.worldZ) * .08;
            } else if (shape === 'leech') {
                ent.group.position.y = ent.baseY + Math.sin(time * 3.5 + ent.worldX * 5) * .06;
                ent.group.rotation.z = Math.sin(time * 4 + ent.worldZ * 3) * .12;
            } else if (shape === 'sporecap') {
                ent.group.position.y = ent.baseY + Math.sin(time * 1.0) * .02;
                const sp = 1 + Math.sin(time * 1.8) * .04;
                if (!ent.mobDef.isBoss) ent.group.scale.set(sp, 1 + Math.sin(time * 1.8 + 1) * .06, sp);
            } else if (shape === 'crawler') {
                ent.group.position.y = ent.baseY + Math.abs(Math.sin(time * 6)) * .03;
                if (ent._baseX === undefined) ent._baseX = ent.group.position.x;
                ent.group.position.x = ent._baseX + Math.sin(time * 3 + ent.worldZ * 2) * .12;
            } else if (shape === 'serpent') {
                ent.group.position.y = ent.baseY + Math.sin(time * 1.5) * .04;
                ent.group.rotation.z = Math.sin(time * 1.2 + ent.worldX) * .1;
            } else if (shape === 'channeler') {
                ent.group.position.y = ent.baseY + .08 + Math.sin(time * 2.0) * .05;
                ent.group.rotation.y += dt * .3;
            } else if (shape === 'hound') {
                ent.group.position.y = ent.baseY + Math.abs(Math.sin(time * 4)) * .02;
            } else if (shape === 'demonLord') {
                ent.group.position.y = ent.baseY + .1 + Math.sin(time * .7) * .08;
                if (!ent._lastDripTime || time - ent._lastDripTime > 1.5) {
                    ent._lastDripTime = time;
                    const gp = ent.group.position;
                    _spawnVfx(this.root, gp.x + (Math.random() - .5) * .4, gp.y + 1.0, gp.z + (Math.random() - .5) * .4, 0xff3300, .03, .8);
                }
            } else if (shape === 'golem') {
                ent.group.position.y = ent.baseY + Math.abs(Math.sin(time * 1.5)) * .03;
            } else if (shape === 'knight') {
                ent.group.position.y = ent.baseY + Math.sin(time * 1.8 + ent.worldX) * .02;
            } else {
                ent.group.position.y = ent.baseY + Math.sin(time * 2 + ent.worldX * 3) * .04;
            }

            // Hit flash
            if (ent.mobRef.hp < ent.lastHp) {
                ent.hitFlash = 0.25;
                const gp = ent.group.position;
                _spawnVfx(this.root, gp.x + (Math.random() - .5) * .3, gp.y + .5 + Math.random() * .3, gp.z + (Math.random() - .5) * .3, 0xff2200, .04, .5);
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
                        bm.material.emissive.setHex(0xff0000);
                        bm.material.emissiveIntensity = 3;
                    } else {
                        bm.material.emissive.setHex(bm.material._origE);
                        bm.material.emissiveIntensity = bm.material._origEI;
                    }
                }
            }

            // Boss pulse
            if (ent.mobDef && ent.mobDef.isBoss) {
                const hpPct = ent.mobRef.hp / ent.mobRef.maxHp;
                ent.group.scale.setScalar(1 + Math.sin(time * (3 + (1 - hpPct) * 4)) * (.02 + (1 - hpPct) * .03));
            }

            // UI Update (DOM Nameplate)
            if (ent.ui) {
                const distSq = ent.group.position.distanceToSquared(this.camera.position);
                if (distSq > 3600) {
                    ent.ui.plate.style.display = 'none';
                } else {
                    const headOffset = (ent.mobDef.isBoss ? 2.5 : 1.8) * ent.mobDef.scale;
                    this._projectLabel(ent.ui.plate, ent.group.position, headOffset);
                    const hpFrac = ent.mobRef.hp / ent.mobRef.maxHp;
                    ent.ui.fill.style.width = `${Math.max(0, hpFrac * 100)}%`;
                }
            }
        }
    }

    _updateCombatVFX(dt, time, prog) {
        if (prog.state !== 'combat') return;
        this._attackTimer += dt;
        if (this._attackTimer < 0.8) return;
        this._attackTimer = 0;

        const alive = this._mobEntities.filter(m => m.mobRef.alive && m.spawned);
        if (alive.length === 0) return;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const tp = target.group.position;

        // Spawn VFX near mobs to show combat is happening
        const cid = gameState.classId;
        const col = cid === 'mage' ? 0xaa66ff : cid === 'ranger' ? 0x88cc44 : cid === 'cleric' ? 0xffdd44 : 0x88bbff;
        for (let i = 0; i < 2; i++) {
            _spawnVfx(this.root,
                tp.x + (Math.random() - .5) * 1.5,
                .5 + Math.random() * 1.0,
                tp.z + (Math.random() - .5) * 1.5,
                col, .04, .4 + Math.random() * .3
            );
        }

        // Mob retaliation VFX
        const mob = alive[Math.floor(Math.random() * alive.length)];
        _spawnVfx(this.root,
            mob.group.position.x + (Math.random() - .5) * .5,
            .8 + Math.random() * .3,
            mob.group.position.z + (Math.random() - .5) * .5,
            0xff3300, .03, .3
        );
    }

    _updateParticles(dt, time) {
        for (const p of this._particles) {
            if (p.type === 'ember') {
                p.mesh.position.y = p.baseY + Math.sin(time * p.speedY + p.phase) * .5;
                p.mesh.position.x += p.speedX * dt;
                if (p.mesh.position.x > 12) p.mesh.position.x = -12;
                if (p.mesh.position.x < -12) p.mesh.position.x = 12;
                p.mesh.material.emissiveIntensity = 1.5 + Math.sin(time * 8 + p.phase) * .5;
            } else if (p.type === 'flame') {
                p.mesh.position.y = p.baseY + Math.sin(time * 6 + p.mesh.position.x * 10) * .05;
                p.mesh.scale.y = 1 + Math.sin(time * 8 + p.mesh.position.z) * .2;
            } else if (p.type === 'bossGlow') {
                p.mesh.material.opacity = p.baseOpacity + Math.sin(time * 2) * .08;
            } else if (p.type === 'banner') {
                p.mesh.rotation.z = Math.sin(time * .8 + p.phase) * .06;
            }
        }
        for (const l of this._lavaPlanes) l.material.emissiveIntensity = .8 + Math.sin(time * 1.5) * .3;
    }

    _updateVFXPool(dt) {
        for (let i = _vfxPool.length - 1; i >= 0; i--) {
            const v = _vfxPool[i];
            v.life -= dt;
            if (v.life <= 0) {
                this.root.remove(v.mesh);
                v.mesh.geometry?.dispose(); v.mesh.material?.dispose();
                _vfxPool.splice(i, 1);
                continue;
            }
            v.mesh.position.x += v.vx * dt;
            v.mesh.position.y += v.vy * dt;
            v.mesh.position.z += v.vz * dt;
            v.vy -= 3 * dt;
            const t = v.life / v.maxLife;
            v.mesh.material.opacity = t;
            v.mesh.scale.setScalar(.5 + t * .5);
        }
    }

    // ══════════════════════════════════════════════════
    // DUNGEON NAVIGATION — Tell the player where to walk
    // ══════════════════════════════════════════════════

    /**
     * Returns the world position the player should walk toward,
     * or null if no movement needed.
     */
    getPlayerWalkTarget() {
        if (!this.active) return null;
        const prog = dungeonSystem.getProgress();
        if (!prog) return null;

        // During combat — walk toward the encounter room center
        if (prog.state === 'combat' || prog.state === 'loot') {
            const ri = Math.max(0, prog.encounterIndex);
            const center = this.getRoomCenter(ri);
            
            if (prog.awaitingNext) {
                // Between encounters — walk toward the NEXT room (ri is already the next index)
                return { x: center.x, z: center.z + 3.0 };
            }
            
            // Active combat or looting — stand just south of the arena center
            return { x: center.x, z: center.z + 2.5 };
        }

        // Entering phase — walk to first room
        if (prog.state === 'entering') {
            const center = this.getRoomCenter(0);
            return { x: center.x, z: center.z + 3.0 };
        }

        // During queue/forming, stay at start
        if (prog.state === 'queue' || prog.state === 'forming') {
            return { x: 0, z: 3.0 };
        }

        // Complete/failed — stand still near last encounter
        if (prog.state === 'complete' || prog.state === 'failed') {
            const ri = Math.max(0, prog.encounterIndex);
            const center = this.getRoomCenter(ri);
            return { x: center.x, z: center.z + 2.0 };
        }

        return null;
    }

    /**
     * Returns true if we're in active combat with dungeon mobs visible.
     * Used to set the player's attack animation state.
     */
    hasCombatTarget() {
        if (!this.active) return false;
        const prog = dungeonSystem.getProgress();
        if (!prog || prog.state !== 'combat' || prog.awaitingNext) return false;
        return this._mobEntities.some(m => m.mobRef.alive && m.spawned);
    }

    /**
     * Get the position of the nearest alive dungeon mob for the player to face.
     * Returns {x, z} or null.
     */
    getNearestMobPos(playerX, playerZ) {
        let bestDist = Infinity;
        let bestPos = null;
        for (const ent of this._mobEntities) {
            if (!ent.mobRef.alive || !ent.spawned) continue;
            const dx = ent.group.position.x - playerX;
            const dz = ent.group.position.z - playerZ;
            const d = dx * dx + dz * dz;
            if (d < bestDist) {
                bestDist = d;
                bestPos = { x: ent.group.position.x, z: ent.group.position.z };
            }
        }
        return bestPos;
    }

    // ══════════════════════════════════════════════════
    // HUD DATA
    // ══════════════════════════════════════════════════

    getHudData() {
        if (!this.active) return null;
        const p = dungeonSystem.getProgress();
        if (!p) return null;
        return {
            active: true, state: p.state,
            encounterIndex: p.encounterIndex, totalEncounters: p.totalEncounters,
            currentEncounter: p.currentEncounter, mobs: p.mobs,
            partyHp: p.partyHp, partyMembers: p.partyMembers,
            totalTime: p.totalTime, loot: p.loot,
            dungeonDef: p.dungeonDef, isFirstClear: p.isFirstClear,
            chatLog: p.chatLog, lastPhaseAnnounced: p.lastPhaseAnnounced,
            awaitingNext: p.awaitingNext
        };
    }
}