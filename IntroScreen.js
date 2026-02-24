// IntroScreen.js — Cinematic MMO Title Screen & Character Select
// Renders a full-screen intro with animated title, character select/create flow,
// and a cinematic "enter world" transition before handing off to main game loop.

import { saveManager } from './SaveManager.js';
import { audioManager } from './AudioManager.js';

const TITLE_BG_URL = 'https://rosebud.ai/assets/title-bg.webp?tv9V';
const WARRIOR_URL = 'https://rosebud.ai/assets/class-warrior.webp?cSHP';
const MAGE_URL = 'https://rosebud.ai/assets/class-voidweaver.webp.webp?ETjr';
const RANGER_URL = 'https://rosebud.ai/assets/class-thornwarden.webp.webp?PwsB';
const SAVE_KEY = 'idleRealms_save_v1';

// ── Class definitions (foundation for multi-class) ──────────────────
const CLASSES = [
    {
        id: 'warrior',
        name: 'Aetherblade',
        role: 'Warrior',
        description: 'Masters of martial combat who channel raw aether through their weapons. Aetherblades combine devastating melee strikes with arcane battle cries to dominate the battlefield.',
        stats: { hp: 'High', dps: 'High', defense: 'Medium', magic: 'Low' },
        color: '#44ccff',
        accentColor: '#2288cc',
        portrait: WARRIOR_URL,
        available: true,
    },
    {
        id: 'mage',
        name: 'Voidweaver',
        role: 'Mage',
        description: 'Wielders of forbidden void magic who tear reality apart to annihilate their enemies. Fragile but devastating at range.',
        stats: { hp: 'Low', dps: 'Very High', defense: 'Low', magic: 'Very High' },
        color: '#bb55ff',
        accentColor: '#8833cc',
        portrait: MAGE_URL,
        available: true,
    },
    {
        id: 'ranger',
        name: 'Thornwarden',
        role: 'Ranger',
        description: 'Nature-bonded sentinels who strike from the shadows with poisoned blades and summon thorned beasts to fight alongside them.',
        stats: { hp: 'Medium', dps: 'Medium', defense: 'Medium', magic: 'Medium' },
        color: '#44dd66',
        accentColor: '#22aa44',
        portrait: RANGER_URL,
        available: true,
    },
    {
        id: 'cleric',
        name: 'Dawnkeeper',
        role: 'Cleric',
        description: 'Holy warriors who channel radiant dawn energy to heal, shield, and smite. The backbone of any expedition.',
        stats: { hp: 'Medium', dps: 'Low', defense: 'High', magic: 'High' },
        color: '#ffcc44',
        accentColor: '#cc9922',
        portrait: 'https://rosebud.ai/assets/class-dawnkeeper.webp?iqTp',
        available: true,
    },
];

export class IntroScreen {
    constructor() {
        this._root = null;
        this._onComplete = null;
        this._selectedClassIdx = 0;
        this._slots = this._loadSlots();
        this._selectedSlotId = this._findLastUsedSlot();
        
        // Ensure class index matches the last used slot on startup
        if (this._selectedSlotId !== null && this._slots[this._selectedSlotId]) {
            const slot = this._slots[this._selectedSlotId];
            const clsIdx = CLASSES.findIndex(c => c.id === slot.classId);
            if (clsIdx !== -1) this._selectedClassIdx = clsIdx;
        }

        this._isContinue = false; // Tracks if we are continuing or starting new
        this._phase = 'title'; // 'title' | 'select' | 'create' | 'cinematic'
        this._animFrame = null;
        this._startTime = performance.now();
        this._particles = [];
        this._cinematicStart = 0;
        this._playerName = 'Hero';
        
        // 3D references
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._player = null;
    }

    _loadSlots() {
        return saveManager.getSlots();
    }

    _findLastUsedSlot() {
        let lastTime = -1;
        let lastId = null;
        for (const [id, slot] of Object.entries(this._slots)) {
            if (slot.timestamp > lastTime) {
                lastTime = slot.timestamp;
                lastId = parseInt(id);
            }
        }
        return lastId;
    }

    _loadSaveData() {
        // Obsolete but kept for method signature compatibility if needed
        return null;
    }

    /** Show the intro screen. Returns a Promise that resolves when the player enters the game. */
    show(scene, camera, renderer, player) {
        this._scene = scene;
        this._camera = camera;
        this._renderer = renderer;
        this._player = player;

        return new Promise(resolve => {
            this._onComplete = resolve;
            this._buildDOM();
            this._initParticles();
            this._animateLoop();
            
            // Initial camera set
            this._updateCameraForPhase('title');
        });
    }

    // ── DOM Construction ─────────────────────────────────────────────

    _buildDOM() {
        this._root = document.createElement('div');
        this._root.id = 'intro-screen';
        this._root.innerHTML = this._getHTML();
        document.body.appendChild(this._root);

        // Inject styles
        const style = document.createElement('style');
        style.id = 'intro-styles';
        style.textContent = this._getCSS();
        document.head.appendChild(style);

        // Bind events after DOM insertion
        requestAnimationFrame(() => this._bindEvents());

        // Trigger entrance animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._root.classList.add('visible');
            });
        });
    }

    _getHTML() {
        const slotsHtml = [];
        const maxSlots = 5;

        // Render ALL existing character slots first (never skip any)
        for (let i = 0; i < maxSlots; i++) {
            const slot = this._slots[i];
            if (slot) {
                const cls = CLASSES.find(c => c.id === slot.classId) || CLASSES[0];
                const active = this._selectedSlotId === i ? 'active' : '';
                slotsHtml.push(`
                    <div class="char-slot ${active}" data-slot-id="${i}">
                        <div class="char-slot-portrait" style="border-color: ${cls.color}">
                            <img src="${cls.portrait || WARRIOR_URL}" alt="Portrait">
                        </div>
                        <div class="char-slot-info">
                            <div class="char-name">${slot.playerName}</div>
                            <div class="char-meta">Lv. ${slot.level} ${cls.name}</div>
                        </div>
                    </div>
                `);
            }
        }

        // Add ONE "Create New" button if there's room (fewer than maxSlots characters)
        const usedCount = Object.keys(this._slots).filter(k => this._slots[k]).length;
        if (usedCount < maxSlots) {
            // Find the first available empty slot ID for the new character
            let newSlotId = 0;
            for (let i = 0; i < maxSlots; i++) {
                if (!this._slots[i]) { newSlotId = i; break; }
            }
            slotsHtml.push(`
                <div class="char-slot empty" id="slot-create-new" data-slot-id="${newSlotId}">
                    <div class="char-slot-portrait">+</div>
                    <div class="char-slot-info">
                        <div class="char-name">Create New</div>
                        <div class="char-meta">Start a new journey</div>
                    </div>
                </div>
            `);
        }

        const hasSelectedSave = this._selectedSlotId !== null && this._slots[this._selectedSlotId];

        return `
        <canvas id="intro-particles" class="intro-particles"></canvas>
        <div class="intro-bg-image" style="background-image: url(${TITLE_BG_URL})"></div>
        <div class="intro-bg-overlay"></div>
        <div class="intro-vignette"></div>

        <!-- Title Phase -->
        <div class="intro-phase title-phase active" id="phase-title">
            <div class="title-content">
                <div class="title-logo">
                    <div class="title-pre">— An Idle Adventure —</div>
                    <h1 class="title-main">EVERGRIND IDLE</h1>
                    <div class="title-sub">MMORPG Simulator</div>
                    <div class="title-divider"></div>
                </div>
                <div class="title-action">
                    <button class="start-prompt-btn" id="btn-start-game">
                        <span class="pulse-text">CLICK TO START</span>
                    </button>
                </div>
                <div class="title-footer">
                    <span class="footer-version">v1.2 — Multiple Heroes</span>
                </div>
            </div>
        </div>

        <!-- Character Select Phase -->
        <div class="intro-phase select-phase" id="phase-select">
            <div class="select-container">
                <div class="sidebar left-sidebar">
                    <div class="sidebar-header">
                        <h2 class="sidebar-title">Character Select</h2>
                    </div>
                    <div class="character-list">
                        ${slotsHtml.join('')}
                    </div>
                </div>

                <div class="bottom-bar">
                    <button class="intro-btn secondary btn-delete-action" id="btn-delete-char" ${!hasSelectedSave ? 'disabled' : ''}>
                        <span class="btn-text">Delete Character</span>
                    </button>
                    <div class="flex-spacer"></div>
                    <button class="intro-btn primary big-btn" id="btn-enter-world-select" ${!hasSelectedSave ? 'disabled' : ''}>
                        <span class="btn-text">Enter World</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Character Creation Phase -->
        <div class="intro-phase create-phase" id="phase-create">
            <div class="select-header">
                <button class="back-btn" id="btn-back-to-select">← Back</button>
                <h2 class="select-title">Create Your Hero</h2>
            </div>
            
            <div class="select-body">
                <div class="class-carousel" id="class-carousel">
                    ${CLASSES.map((c, i) => this._renderClassCard(c, i)).join('')}
                </div>
                
                <div class="creation-panel">
                    <div class="input-group">
                        <label for="char-name">Hero Name</label>
                        <input type="text" id="char-name" maxlength="16" placeholder="Enter name..." value="">
                    </div>
                    
                    <div class="class-detail" id="class-detail">
                        ${this._renderClassDetail(CLASSES[this._selectedClassIdx])}
                    </div>
                </div>
            </div>
            
            <div class="select-footer">
                <button class="intro-btn primary big-btn" id="btn-create-finish" disabled>
                    <span class="btn-text">
                        <span class="btn-label">Begin Adventure</span>
                        <span class="btn-sublabel">as <span id="btn-sublabel-name">${CLASSES[this._selectedClassIdx].name}</span></span>
                    </span>
                </button>
            </div>
        </div>

        <!-- Cinematic Transition Phase -->
        <div class="intro-phase cinematic-phase" id="phase-cinematic">
            <div class="cinematic-flash"></div>
            <div class="cinematic-text">
                <div class="cinematic-line line-1">The ley-lines call to you...</div>
                <div class="cinematic-line line-2" id="cine-name-line">Your legend begins.</div>
                <div class="cinematic-line line-3">The Verdant Wilds await.</div>
            </div>
        </div>

        <!-- Custom Confirmation Modal -->
        <div class="intro-modal-overlay" id="delete-modal">
            <div class="intro-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Delete Character</h3>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete <span id="delete-char-name" style="color: #f44; font-weight: bold;"></span>?</p>
                    <p class="modal-warning">All progress, items, and levels will be permanently lost.</p>
                </div>
                <div class="modal-footer">
                    <button class="intro-btn secondary" id="btn-modal-cancel">Cancel</button>
                    <button class="intro-btn primary danger-btn" id="btn-modal-confirm">Delete Forever</button>
                </div>
            </div>
        </div>
        `;
    }

    _renderClassCard(cls, idx) {
        const selected = idx === this._selectedClassIdx ? 'selected' : '';
        const locked = !cls.available ? 'locked' : '';
        return `
        <div class="class-card ${selected} ${locked}" data-class-idx="${idx}" style="--class-color: ${cls.color}; --class-accent: ${cls.accentColor}">
            <div class="class-card-portrait">
                ${cls.portrait
                    ? `<img src="${cls.portrait}" alt="${cls.name}" class="class-portrait-img" />`
                    : `<div class="class-portrait-placeholder">
                        <span class="placeholder-icon">${cls.id === 'mage' ? '🔮' : cls.id === 'ranger' ? '🏹' : '✝️'}</span>
                    </div>`
                }
                ${!cls.available ? '<div class="class-card-lock"><span>🔒</span></div>' : ''}
            </div>
            <div class="class-card-info">
                <div class="class-card-name" style="color: ${cls.color}">${cls.name}</div>
                <div class="class-card-role">${cls.role}</div>
            </div>
        </div>
        `;
    }

    _renderClassDetail(cls) {
        const statBars = Object.entries(cls.stats).map(([stat, val]) => {
            const levels = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };
            const lvl = levels[val] || 2;
            const labels = { hp: 'Vitality', dps: 'Damage', defense: 'Defense', magic: 'Magic' };
            return `
            <div class="stat-row">
                <span class="stat-label">${labels[stat] || stat}</span>
                <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${lvl * 25}%; background: ${cls.color}"></div>
                </div>
                <span class="stat-value" style="color: ${cls.color}">${val}</span>
            </div>
            `;
        }).join('');

        return `
        <div class="detail-info">
            <h3 class="detail-name" style="color: ${cls.color}">${cls.name}</h3>
            <p class="detail-desc">${cls.description}</p>
            <div class="detail-stats">${statBars}</div>
            ${!cls.available ? '<div class="detail-locked">🔒 Not Available in Beta</div>' : ''}
        </div>
        `;
    }

    // ── Events ───────────────────────────────────────────────────────

    _bindEvents() {
        // We use event delegation on this._root for most events to handle dynamic HTML updates
        this._root.addEventListener('click', (e) => {
            const target = e.target;
            
            // Title Screen Click
            if (target.closest('#btn-start-game')) {
                if (!audioManager.initialized) audioManager.init();
                this._switchPhase('select');
                return;
            }

            // Character Select Slots
            const slot = target.closest('.char-slot');
            if (slot) {
                const slotId = parseInt(slot.dataset.slotId);
                
                if (slot.classList.contains('empty')) {
                    this._selectedSlotId = slotId;
                    this._selectClass(0); // Always start new characters with the first class (Aetherblade)
                    this._switchPhase('create');
                } else {
                    this._selectedSlotId = slotId;
                    // Refresh highlighting
                    this._root.querySelectorAll('.char-slot').forEach(s => s.classList.remove('active'));
                    slot.classList.add('active');
                    
                    // Show/Enable buttons
                    const btnEnter = this._root.querySelector('#btn-enter-world-select');
                    const btnDelete = this._root.querySelector('#btn-delete-char');
                    if (btnEnter) btnEnter.disabled = false;
                    if (btnDelete) btnDelete.disabled = false;

                    // Update player model
                    const slotData = this._slots[slotId];
                    if (slotData && this._player) {
                        this._player.setClass(slotData.classId);
                        this._player.group.visible = true;

                        // Sync class index to ensure correct data is passed on world entry
                        const clsIdx = CLASSES.findIndex(c => c.id === slotData.classId);
                        if (clsIdx !== -1) this._selectedClassIdx = clsIdx;
                    }
                }
                return;
            }

            // Delete Character
            const deleteBtn = target.closest('#btn-delete-char');
            if (deleteBtn && !deleteBtn.disabled) {
                const activeSlot = this._root.querySelector('.char-slot.active');
                const activeSlotId = activeSlot ? parseInt(activeSlot.dataset.slotId) : this._selectedSlotId;

                if (activeSlotId !== null) {
                    const slotData = this._slots[activeSlotId];
                    const charName = slotData ? slotData.playerName : 'this character';
                    
                    // Show custom modal
                    const modal = this._root.querySelector('#delete-modal');
                    const nameSpan = this._root.querySelector('#delete-char-name');
                    if (modal && nameSpan) {
                        nameSpan.textContent = charName;
                        modal.classList.add('active');
                    }
                }
                return;
            }

            // Modal Controls
            if (target.closest('#btn-modal-cancel')) {
                const modal = this._root.querySelector('#delete-modal');
                if (modal) modal.classList.remove('active');
                return;
            }

            if (target.closest('#btn-modal-confirm')) {
                const activeSlot = this._root.querySelector('.char-slot.active');
                const activeSlotId = activeSlot ? parseInt(activeSlot.dataset.slotId) : this._selectedSlotId;

                if (activeSlotId !== null) {
                    // 1. Perform Deletion
                    saveManager.setCurrentSlot(activeSlotId);
                    saveManager.clearSave();
                    
                    // 2. Refresh internal data
                    this._slots = saveManager.getSlots();
                    this._selectedSlotId = this._findLastUsedSlot();
                    
                    // 3. Re-render UI
                    this._root.innerHTML = this._getHTML();
                    this._initParticles();
                    
                    // 4. Reset Phase
                    this._switchPhase('select');
                    
                    // 5. Update 3D model
                    if (this._selectedSlotId !== null && this._slots[this._selectedSlotId] && this._player) {
                        this._player.setClass(this._slots[this._selectedSlotId].classId);
                        this._player.group.visible = true;
                    } else if (this._player) {
                        this._player.group.visible = false;
                    }
                }
                return;
            }

            // Enter World from Selection
            if (target.closest('#btn-enter-world-select')) {
                const slot = this._slots[this._selectedSlotId];
                if (slot) {
                    this._playerName = slot.playerName;
                    this._startCinematic(true);
                }
                return;
            }

            // Back to Selection
            if (target.closest('#btn-back-to-select')) {
                this._switchPhase('select');
                return;
            }

            // Class cards
            const card = target.closest('.class-card');
            if (card) {
                const idx = parseInt(card.dataset.classIdx);
                this._selectClass(idx);
                return;
            }

            // Finish Creation
            if (target.closest('#btn-create-finish')) {
                const cls = CLASSES[this._selectedClassIdx];
                if (cls && cls.available) {
                    this._startCinematic(false);
                }
                return;
            }
        });

        // Name input validation needs 'input' event, can't use 'click' delegation
        this._root.addEventListener('input', (e) => {
            if (e.target.id === 'char-name') {
                const val = e.target.value.trim();
                this._playerName = val || 'Hero';
                const btnCreateFinish = this._root.querySelector('#btn-create-finish');
                if (btnCreateFinish) {
                    btnCreateFinish.disabled = val.length < 2 || !CLASSES[this._selectedClassIdx].available;
                }
            }
        });
    }

    _selectClass(idx) {
        this._selectedClassIdx = idx;
        const cls = CLASSES[idx];

        // Update card selection
        this._root.querySelectorAll('.class-card').forEach((card, i) => {
            card.classList.toggle('selected', i === idx);
        });

        // Update detail panel
        const detail = this._root.querySelector('#class-detail');
        if (detail) {
            detail.innerHTML = this._renderClassDetail(cls);
            detail.style.animation = 'none';
            detail.offsetHeight; // trigger reflow
            detail.style.animation = 'detailFadeIn 0.4s ease forwards';
        }

        // Update create button
        const btnCreateFinish = this._root.querySelector('#btn-create-finish');
        const nameInput = this._root.querySelector('#char-name');
        if (btnCreateFinish && nameInput) {
            btnCreateFinish.disabled = !cls.available || nameInput.value.trim().length < 2;
            const sublabel = this._root.querySelector('#btn-sublabel-name');
            if (sublabel) sublabel.textContent = cls.name;
        }
    }

    _switchPhase(phaseName) {
        this._phase = phaseName;
        document.querySelectorAll('.intro-phase').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`phase-${phaseName}`);
        if (target) {
            setTimeout(() => target.classList.add('active'), 50);
        }

        this._updateCameraForPhase(phaseName);
    }

    _updateCameraForPhase(phaseName) {
        if (!this._camera) return;

        switch(phaseName) {
            case 'title':
                this._camera.position.set(0, 1.8, 6);
                this._camera.lookAt(0, 1.2, 0);
                break;
            case 'select':
                this._camera.position.set(1.5, 1.4, 4);
                this._camera.lookAt(0, 1.2, 0);
                break;
            case 'create':
                this._camera.position.set(2.2, 1.4, 3.5);
                this._camera.lookAt(0, 1.2, 0);
                break;
        }
    }

    // ── Cinematic Transition ─────────────────────────────────────────

    _startCinematic(isContinue) {
        this._phase = 'cinematic';
        this._cinematicStart = performance.now();
        this._isContinue = isContinue;

        document.querySelectorAll('.intro-phase').forEach(el => el.classList.remove('active'));
        const cine = document.getElementById('phase-cinematic');
        const line1 = cine.querySelector('.line-1');
        const line2 = cine.querySelector('.line-2');
        const line3 = cine.querySelector('.line-3');

        if (isContinue) {
            if (line1) line1.textContent = "Resuming your legend...";
            if (line2) line2.textContent = `Welcome back, ${this._playerName}.`;
            
            cine.classList.add('active', 'fast-transition');
            setTimeout(() => this._completeIntro(), 1000);
        } else {
            if (line1) line1.textContent = "The ley-lines call to you...";
            if (line2) line2.textContent = `${this._playerName}, your legend begins.`;
            if (line3) line3.textContent = "The Verdant Wilds await.";
            
            cine.classList.add('active');
            cine.classList.remove('fast-transition');
            setTimeout(() => this._completeIntro(), 5500);
        }
    }

    _completeIntro() {
        this._root.classList.add('exiting');
        
        // Fade out background image too
        const bg = this._root.querySelector('.intro-bg-image');
        if (bg) bg.style.transition = 'opacity 0.8s ease';
        if (bg) bg.style.opacity = '0';

        setTimeout(() => {
            cancelAnimationFrame(this._animFrame);
            this._root.remove();
            const style = document.getElementById('intro-styles');
            if (style) style.remove();
            
            if (this._onComplete) {
                this._onComplete({ 
                    isNewGame: !this._isContinue, 
                    playerName: this._playerName,
                    classId: CLASSES[this._selectedClassIdx].id,
                    slotId: this._selectedSlotId
                });
            }
        }, 800);
    }

    // ── Particle System (canvas overlay) ─────────────────────────────

    _initParticles() {
        const canvas = document.getElementById('intro-particles');
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this._particles = [];
        const count = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 15000));
        for (let i = 0; i < count; i++) {
            this._particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.2 - Math.random() * 0.5,
                size: 1 + Math.random() * 2.5,
                alpha: 0.1 + Math.random() * 0.5,
                pulse: Math.random() * Math.PI * 2,
                hue: 200 + Math.random() * 60, 
            });
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    _animateLoop() {
        const time = performance.now() / 1000;
        const dt = 0.016;

        // Update 3D
        if (this._player) {
            this._player.update(dt, time);
            
            // Hide player model on the initial title phase
            this._player.group.visible = (this._phase !== 'title');
            
            // Slow rotation for selection screen
            if (this._phase === 'select' || this._phase === 'create') {
                this._player.group.rotation.y += 0.005;
            } else {
                this._player.group.rotation.y = Math.PI; // Face forward on title
            }
        }
        
        if (this._renderer && this._scene && this._camera) {
            this._renderer.render(this._scene, this._camera);
        }

        const canvas = document.getElementById('intro-particles');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            for (const p of this._particles) {
                p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
                if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
                if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
                const a = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${a})`;
                ctx.fill();
            }
        }

        this._animFrame = requestAnimationFrame(() => this._animateLoop());
    }

    _getCSS() {
        return `
        #intro-screen {
            position: fixed; inset: 0; z-index: 10000;
            opacity: 0; transition: opacity 0.8s ease;
            font-family: 'Inter', sans-serif; overflow: hidden; user-select: none;
            background: transparent; color: #fff;
        }
        #intro-screen.visible { opacity: 1; }
        #intro-screen.exiting { opacity: 0; transition: opacity 0.8s ease; }

        .intro-bg-image {
            position: absolute; inset: 0;
            background-size: cover;
            background-position: center;
            opacity: 0.6;
            z-index: 0;
        }

        .intro-bg-overlay {
            position: absolute; inset: 0;
            background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.85) 100%);
            pointer-events: none;
            z-index: 1;
        }

        .intro-particles { position: absolute; inset: 0; pointer-events: none; z-index: 2; }

        .intro-phase {
            position: absolute; inset: 0;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 2; opacity: 0; pointer-events: none; transition: opacity 0.5s ease, transform 0.5s ease;
            transform: scale(1.05);
        }
        .intro-phase.active { opacity: 1; pointer-events: auto; transform: scale(1); }

        /* Title Phase */
        .title-content { display: flex; flex-direction: column; align-items: center; gap: 60px; text-align: center; }
        .title-logo { margin-top: -100px; }
        .title-pre { font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 6px; color: rgba(200,180,140,0.8); margin-bottom: 10px; }
        .title-main {
            font-family: 'Cinzel', serif; font-size: clamp(48px, 10vw, 90px); font-weight: 700; color: #e8dcc8;
            text-shadow: 0 0 40px rgba(200,170,100,0.3), 0 4px 20px rgba(0,0,0,0.8);
            letter-spacing: 12px; margin: 0; line-height: 1;
        }
        .title-sub { font-family: 'Cinzel', serif; font-size: 18px; color: rgba(220, 230, 245, 0.6); letter-spacing: 10px; margin-top: 15px; text-transform: uppercase; }
        .title-divider { width: 100px; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,180,140,0.5), transparent); margin: 30px auto; }
        
        .start-prompt-btn {
            background: none; border: none; cursor: pointer; padding: 20px;
        }
        .pulse-text {
            font-family: 'Cinzel', serif; font-size: 20px; letter-spacing: 4px; color: #e8dcc8;
            animation: textPulse 2s infinite ease-in-out;
        }
        @keyframes textPulse { 0%, 100% { opacity: 0.4; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1.02); } }

        /* Selection / Creation Shared */
        .intro-btn {
            display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 24px; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px; background: rgba(20,18,15,0.8); backdrop-filter: blur(10px); cursor: pointer; transition: all 0.2s ease;
            color: #fff; font-family: 'Cinzel', serif;
        }
        .intro-btn:hover:not(:disabled) { background: rgba(40,35,30,0.9); border-color: rgba(200,180,140,0.4); transform: translateY(-1px); }
        .intro-btn.secondary:hover:not(:disabled) { border-color: rgba(255,100,100,0.5); background: rgba(50,20,20,0.8); }
        .intro-btn.primary { background: linear-gradient(135deg, #b89868, #8a6d3b); color: #1a1510; border: none; font-weight: 700; }
        .intro-btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
        .intro-btn.big-btn { padding: 18px 60px; font-size: 20px; }
        .intro-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Character Select Phase */
        .select-container { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 60px; box-sizing: border-box; }
        .sidebar { width: 320px; display: flex; flex-direction: column; gap: 20px; background: rgba(0,0,0,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; }
        .sidebar-header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; margin-bottom: 10px; }
        .sidebar-title { font-family: 'Cinzel', serif; font-size: 18px; margin: 0; color: #b89868; letter-spacing: 1px; }

        .character-list { display: flex; flex-direction: column; gap: 12px; }
        .char-slot {
            display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
        }
        .char-slot:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
        .char-slot.active { border-color: #b89868; background: rgba(184, 152, 104, 0.1); }
        .char-slot-portrait { width: 50px; height: 50px; border: 2px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 24px; color: #666; background: #111; }
        .char-slot-portrait img { width: 100%; height: 100%; object-fit: cover; }
        .char-name { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; color: #fff; }
        .char-meta { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .char-slot.empty .char-slot-portrait { border-style: dashed; }

        .bottom-bar { margin-top: auto; display: flex; align-items: center; width: 100%; padding-top: 40px; position: relative; z-index: 10; pointer-events: auto; }
        .flex-spacer { flex: 1; }

        /* Character Creation Phase */
        .select-header { width: 100%; padding: 40px 60px; box-sizing: border-box; }
        .select-title { font-family: 'Cinzel', serif; font-size: 32px; color: #e8dcc8; margin: 10px 0 0; letter-spacing: 2px; }
        .back-btn { background: none; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .back-btn:hover { background: rgba(255,255,255,0.1); }

        .select-body { display: flex; gap: 40px; align-items: flex-start; justify-content: flex-start; width: 90%; max-width: 1200px; margin-left: 60px; }
        .class-carousel { display: flex; flex-direction: column; gap: 10px; width: 280px; }
        .class-card { display: flex; align-items: center; gap: 15px; padding: 12px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(0,0,0,0.4); cursor: pointer; transition: all 0.2s ease; }
        .class-card:hover:not(.locked) { background: rgba(255,255,255,0.05); }
        .class-card.selected { border-color: var(--class-color); background: rgba(255,255,255,0.08); box-shadow: 0 0 15px rgba(0,0,0,0.3); }
        .class-card.locked { opacity: 0.5; cursor: default; }
        .class-card-portrait { width: 60px; height: 60px; border-radius: 4px; overflow: hidden; background: #111; position: relative; border: 1px solid rgba(255,255,255,0.1); }
        .class-portrait-img { width: 100%; height: 100%; object-fit: cover; }
        .class-card-lock { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); font-size: 20px; }
        .class-card-name { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 700; }
        .class-card-role { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

        .creation-panel { flex: 1; display: flex; flex-direction: column; gap: 25px; max-width: 450px; background: rgba(0,0,0,0.6); padding: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(20px); }
        .input-group label { display: block; font-family: 'Cinzel', serif; font-size: 12px; color: #b89868; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
        .input-group input { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 14px; color: #fff; font-size: 18px; outline: none; transition: border-color 0.2s; }
        .input-group input:focus { border-color: #b89868; }

        .detail-name { font-family: 'Cinzel', serif; font-size: 28px; margin: 0 0 10px; letter-spacing: 1px; }
        .detail-desc { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 25px; }
        .stat-row { display: flex; align-items: center; gap: 15px; margin-bottom: 12px; }
        .stat-label { font-size: 11px; width: 80px; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 1px; }
        .stat-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .stat-bar-fill { height: 100%; border-radius: 3px; }
        .stat-value { font-size: 12px; width: 60px; font-weight: 600; text-align: right; }

        .select-footer { width: 100%; display: flex; justify-content: center; padding: 40px; box-sizing: border-box; margin-top: auto; }
        .btn-label { display: block; line-height: 1.2; }
        .btn-sublabel { display: block; font-size: 12px; font-weight: 400; opacity: 0.8; margin-top: 4px; }

        /* Cinematic Phase */
        .cinematic-phase { background: #000; z-index: 100; }
        .cinematic-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
        .cinematic-text { display: flex; flex-direction: column; gap: 20px; align-items: center; }
        .cinematic-line { font-family: 'Cinzel', serif; font-size: 28px; color: #e8dcc8; opacity: 0; text-shadow: 0 0 20px rgba(184, 152, 104, 0.4); }

        .cinematic-phase.active .cinematic-line.line-1 { animation: lineReveal 1.5s 0.5s forwards; }
        .cinematic-phase.active .cinematic-line.line-2 { animation: lineReveal 1.5s 2.5s forwards; }
        .cinematic-phase.active .cinematic-line.line-3 { animation: lineReveal 1.5s 4.5s forwards; }
        @keyframes lineReveal { 0% { opacity: 0; transform: translateY(15px); filter: blur(10px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }

        .cinematic-phase.active .cinematic-flash { animation: flashEffect 1.5s 5.5s forwards; }
        @keyframes flashEffect { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 1; } }

        .fast-transition .cinematic-line.line-1 { animation: lineReveal 0.6s 0.1s forwards; }
        .fast-transition .cinematic-line.line-2 { display: block; animation: lineReveal 0.6s 0.4s forwards; }
        .fast-transition .cinematic-line.line-3 { display: none; }
        .fast-transition .cinematic-flash { animation: flashEffect 0.6s 1.0s forwards; }

        /* Custom Modal Styles */
        .intro-modal-overlay {
            position: absolute; 
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 20000;
            background: rgba(0,0,0,0.85); 
            backdrop-filter: blur(10px);
            display: flex; 
            align-items: center; 
            justify-content: center;
            opacity: 0; 
            pointer-events: none; 
            transition: opacity 0.3s ease;
        }
        .intro-modal-overlay.active { 
            opacity: 1; 
            pointer-events: auto; 
        }

        .intro-modal {
            width: 90%;
            max-width: 450px; 
            background: #1a1815; 
            border: 1px solid #b89868; 
            border-radius: 8px;
            padding: 40px; 
            box-shadow: 0 20px 50px rgba(0,0,0,0.9);
            transform: scale(0.95); 
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .intro-modal-overlay.active .intro-modal { 
            transform: scale(1); 
        }

        .modal-header { 
            border-bottom: 1px solid rgba(184,152,104,0.3); 
            padding-bottom: 20px; 
        }
        .modal-title { 
            font-family: 'Cinzel', serif; 
            font-size: 24px; 
            color: #b89868; 
            margin: 0; 
            letter-spacing: 2px;
            text-align: center;
        }
        .modal-body { 
            color: rgba(220,230,245,0.9); 
            font-size: 16px; 
            line-height: 1.6; 
            text-align: center;
        }
        .modal-warning { 
            color: #ff4444; 
            font-size: 13px; 
            margin-top: 15px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 1.5px; 
        }
        .modal-footer { 
            display: flex; 
            justify-content: center; 
            gap: 20px; 
            padding-top: 10px;
        }
        
        .danger-btn { 
            background: linear-gradient(135deg, #cc3333, #880000) !important; 
            color: #fff !important; 
            border: 1px solid #ff4444 !important;
        }
        .danger-btn:hover { 
            filter: brightness(1.2); 
            transform: translateY(-2px);
        }
        `;
    }
}
