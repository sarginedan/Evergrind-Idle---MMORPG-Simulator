import * as THREE from 'three';
import { FakePlayer } from './FakePlayer.js';

export class FakePlayerManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.fakePlayers = [];
        this._visible = true;

        // Reusable projection objects
        this._projScreenMatrix = new THREE.Matrix4();
        this._frustum = new THREE.Frustum();
        this._tempVec = new THREE.Vector3();
        
        this._initUI();
    }

    _initUI() {
        // Style for fake player name labels and chat bubbles is shared with party member manager
        // No specific container needed, they are appended to document.body
    }

    setVisible(visible) {
        this._visible = visible;
        for (const fp of this.fakePlayers) {
            if (fp.group) fp.group.visible = visible;
            if (fp.ui) {
                fp.ui.nameLabel.style.display = visible ? 'block' : 'none';
                if (fp.showBubble) fp.ui.bubble.style.display = visible ? 'block' : 'none';
            }
        }
    }

    async spawnFakePlayers(zoneId, world) {
        this.despawnAll();
        
        // Spawn 12-20 fake players for social feel
        const count = 12 + Math.floor(Math.random() * 8);
        const classes = ['warrior', 'mage', 'ranger', 'cleric'];

        for (let i = 0; i < count; i++) {
            const classId = classes[Math.floor(Math.random() * classes.length)];
            const fp = new FakePlayer(this.scene, classId);
            
            // Initial position
            const pos = world.getRandomOpenPosition ? world.getRandomOpenPosition(10, 80) : { x: (Math.random()-0.5)*100, z: (Math.random()-0.5)*100 };
            fp.setPosition(pos.x, pos.z);
            
            // Create UI for this fake player
            fp.ui = this._createUI(fp);
            this.fakePlayers.push(fp);
        }
    }

    _createUI(fp) {
        const nameLabel = document.createElement('div');
        nameLabel.className = 'fake-player-name';
        nameLabel.style.cssText = `
            position: fixed; pointer-events: none; z-index: 10;
            color: #ffffff; font-family: 'Cinzel', serif; font-size: 11px;
            font-weight: 500; text-shadow: 1px 1px 3px black;
            display: none; white-space: nowrap;
        `;
        nameLabel.textContent = fp.name;
        document.body.appendChild(nameLabel);

        const bubble = document.createElement('div');
        bubble.className = 'fake-player-bubble';
        bubble.style.cssText = `
            position: fixed; padding: 6px 12px; background: linear-gradient(180deg, rgba(15,20,30,0.85) 0%, rgba(5,10,15,0.9) 100%);
            color: #eee; border-radius: 10px; font-size: 11px; font-family: 'Inter', sans-serif;
            display: none; pointer-events: none; z-index: 11; transform: translate(-50%, -150%);
            max-width: 150px; text-align: center; border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        `;
        document.body.appendChild(bubble);

        return { nameLabel, bubble };
    }

    despawnAll() {
        for (const fp of this.fakePlayers) {
            fp.destroy();
            if (fp.ui) {
                fp.ui.nameLabel.remove();
                fp.ui.bubble.remove();
            }
        }
        this.fakePlayers = [];
    }

    update(dt, time, world, mobManager) {
        if (!this._visible) return;

        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

        const tempVec = this._tempVec;
        const frameCount = Math.floor(time * 60);

        for (const fp of this.fakePlayers) {
            fp.update(dt, time, world, mobManager);

            // UI Throttling: Only update DOM every 3 frames and only if close
            if (fp.ui && (frameCount % 3 === 0)) { 
                tempVec.copy(fp.group.position);
                
                const distSq = tempVec.distanceToSquared(this.camera.position);
                if (distSq > 2500) { // 50 units away
                    fp.ui.nameLabel.style.display = 'none';
                    fp.ui.bubble.style.display = 'none';
                    continue;
                }

                tempVec.y += 2.2; 
                if (this._frustum.containsPoint(tempVec)) {
                    tempVec.project(this.camera);
                    const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
                    const y = (tempVec.y * -0.5 + 0.5) * window.innerHeight;

                    fp.ui.nameLabel.style.display = 'block';
                    fp.ui.nameLabel.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;

                    if (fp.showBubble && fp.lastMessage) {
                        fp.ui.bubble.textContent = fp.lastMessage;
                        fp.ui.bubble.style.display = 'block';
                        fp.ui.bubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 25}px)`;
                    } else {
                        fp.ui.bubble.style.display = 'none';
                    }
                } else {
                    fp.ui.nameLabel.style.display = 'none';
                    fp.ui.bubble.style.display = 'none';
                }
            }
        }
    }

    updateAI(world, mobManager) {
        for (const fp of this.fakePlayers) {
            fp.updateAI(world, mobManager);
        }
    }
}
