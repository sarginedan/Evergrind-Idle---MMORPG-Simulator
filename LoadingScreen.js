// LoadingScreen.js — Themed MMORPG Loading Overlay
export class LoadingScreen {
    constructor() {
        this.container = null;
        this.progressBar = null;
        this.statusText = null;
        this.flavorText = null;
        this._visible = false;
        this._initDOM();
    }

    _initDOM() {
        // Inject styles into <head> for reliable specificity
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            @keyframes ls-glowPulse {
                0%, 100% { transform: scale(1); text-shadow: 0 0 10px rgba(184, 152, 104, 0.2); }
                50% { transform: scale(1.02); text-shadow: 0 0 25px rgba(184, 152, 104, 0.6); }
            }
            @keyframes ls-barGlow {
                0% { background-position: 200% 0; }
                100% { background-position: 0 0; }
            }
            #loading-screen .loading-logo { animation: ls-glowPulse 3s infinite ease-in-out; }
        `;
        document.head.appendChild(styleEl);

        this.container = document.createElement('div');
        this.container.id = 'loading-screen';
        this.container.style.cssText = `
            position: fixed; inset: 0; z-index: 20000;
            background: #050505; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            font-family: 'Cinzel', serif; color: #e8dcc8;
            background-size: cover; background-position: center;
            opacity: 0; pointer-events: none;
            transition: opacity 0.5s ease;
        `;

        this.container.innerHTML = `
            <div id="loading-bg-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: -1;"></div>
            <div class="loading-content" style="width: 400px; max-width: 90vw; text-align: center; position: relative; z-index: 1;">
                <div class="loading-logo" style="font-size: 28px; letter-spacing: 6px; margin-bottom: 40px; color: #b89868; text-shadow: 0 0 15px rgba(184, 152, 104, 0.4);">
                    EVERGRIND IDLE
                </div>
                
                <div class="loading-bar-container" style="width: 100%; height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; margin-bottom: 15px; overflow: hidden; border: 1px solid rgba(184,152,104,0.3); box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                    <div id="loading-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #8a6d3b, #d4af37, #8a6d3b); background-size: 200% 100%; animation: ls-barGlow 2s infinite linear; transition: width 0.4s cubic-bezier(0.1, 0.7, 1.0, 0.1);"></div>
                </div>

                <div id="loading-status" style="font-size: 12px; text-transform: uppercase; letter-spacing: 3px; color: rgba(232, 220, 200, 0.8); margin-bottom: 20px;">
                    Forging Reality...
                </div>

                <div id="loading-flavor" style="font-size: 14px; font-style: italic; color: rgba(184, 152, 104, 0.6); font-family: 'Inter', sans-serif; line-height: 1.6; min-height: 3em;">
                    "Waiting for the stars to align..."
                </div>
            </div>
        `;

        this.progressBar = this.container.querySelector('#loading-bar-fill');
        this.statusText = this.container.querySelector('#loading-status');
        this.flavorText = this.container.querySelector('#loading-flavor');
        document.body.appendChild(this.container);
    }

    setTheme(zoneId) {
        const THEMES = {
            verdant_wilds: {
                bg: 'https://rosebud.ai/assets/loading-verdant-wilds.webp.webp?AVSc',
                overlay: 'rgba(10, 30, 10, 0.7)',
                accent: '#44cc44'
            },
            shattered_expanse: {
                bg: 'https://rosebud.ai/assets/loading-shattered-expanse.webp.webp?tJJi',
                overlay: 'rgba(5, 10, 30, 0.7)',
                accent: '#66bbff'
            },
            molten_abyss: {
                bg: 'https://rosebud.ai/assets/loading-molten-abyss.webp.webp?XuSV',
                overlay: 'rgba(30, 5, 5, 0.7)',
                accent: '#ff6622'
            },
            abyssal_depths: {
                bg: 'https://rosebud.ai/assets/loading-abyssal-depths.webp.webp?rLCX',
                overlay: 'rgba(5, 20, 30, 0.7)',
                accent: '#22ddcc'
            },
            neon_wastes: {
                bg: 'https://rosebud.ai/assets/loading-neon-wastes.webp.webp?C0Fs',
                overlay: 'rgba(20, 5, 30, 0.7)',
                accent: '#dd44ff'
            },
            halo_ring: {
                bg: 'https://rosebud.ai/assets/loading-autumn.webp.webp?oV1b',
                overlay: 'rgba(5, 20, 15, 0.7)',
                accent: '#44ddaa'
            },
            crimson_reach: {
                bg: 'https://rosebud.ai/assets/loading-crimson-reach.webp.webp?FtCk',
                overlay: 'rgba(30, 10, 5, 0.7)',
                accent: '#cc5533'
            }
        };

        const theme = THEMES[zoneId] || THEMES.verdant_wilds;
        this.container.style.backgroundImage = `url('${theme.bg}')`;
        const overlay = this.container.querySelector('#loading-bg-overlay');
        if (overlay) overlay.style.background = theme.overlay;

        // Tint the progress bar accent color to match zone
        if (this.progressBar && theme.accent) {
            this.progressBar.style.background = `linear-gradient(90deg, ${theme.accent}88, ${theme.accent}, ${theme.accent}88)`;
            this.progressBar.style.backgroundSize = '200% 100%';
        }
    }

    show(zoneId = 'verdant_wilds') {
        this.setTheme(zoneId);
        const FLAVOR_TEXTS = [
            "Tuning the ley-lines...",
            "Polishing aether crystals...",
            "Briefing the quest givers...",
            "Sharpening spectral blades...",
            "Consulting the ancient scrolls...",
            "Feeding the void hounds...",
            "Expanding the horizon...",
            "Stoking the forge fires...",
            "Summoning distant lands...",
            "Calibrating the idle engine...",
            "Aligning the constellations...",
            "Waking the ancient guardians...",
            "Charging the portal runes...",
            "Synchronizing aether currents...",
        ];
        if (this.flavorText) {
            this.flavorText.textContent = `"${FLAVOR_TEXTS[Math.floor(Math.random() * FLAVOR_TEXTS.length)]}"`;
        }
        // Use direct style for guaranteed visibility (inline > any selector specificity)
        this.container.style.opacity = '1';
        this.container.style.pointerEvents = 'auto';
        this._visible = true;
        this.setProgress(0);
    }

    hide() {
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
        this._visible = false;
    }

    setProgress(percent, status = null) {
        if (this.progressBar) this.progressBar.style.width = `${percent}%`;
        if (status && this.statusText) this.statusText.textContent = status;
    }
}

export const loadingScreen = new LoadingScreen();
