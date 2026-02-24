// Audio Manager — Procedural SFX using Tone.js
// Unique sounds for each of the 8 skills + combat + UI events
import * as Tone from 'tone';

class AudioManagerClass {
    constructor() {
        this.initialized = false;
        this.muted = false;
        this.masterVolume = -20; // dB
        this.volumePercent = 40; // 0-100 UI slider value
    }

    async init() {
        if (this.initialized) return;
        try {
            await Tone.start();
            this.initialized = true;
            Tone.getDestination().volume.value = this.masterVolume;
            this.setupSounds();
            this.setupAmbientMusic();
            this.startAmbientSchedule();
            console.log('🔊 Audio initialized');
        } catch (e) {
            console.warn('Audio init failed:', e);
        }
    }

    setupSounds() {
        // ── Shared effects ──
        this.reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();
        this.shortReverb = new Tone.Reverb({ decay: 1.2, wet: 0.2 }).toDestination();
        this.delay = new Tone.FeedbackDelay({ delayTime: 0.12, feedback: 0.2, wet: 0.15 }).toDestination();
        this.lowPass = new Tone.Filter(1200, "lowpass").toDestination();

        // ── Bird chirps (ambient) ──
        this.birdSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.06 },
        }).connect(this.reverb);
        this.birdSynth.volume.value = -24;

        // ── Basic hit — metallic tap ──
        this.hitSynth = new Tone.MembraneSynth({
            pitchDecay: 0.01, octaves: 3,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.03 },
        }).toDestination();
        this.hitSynth.volume.value = -22;

        // ── Crit hit — sharper impact ──
        this.critSynth = new Tone.MetalSynth({
            frequency: 300, envelope: { attack: 0.001, decay: 0.12, release: 0.05 },
            harmonicity: 5.1, modulationIndex: 16, resonance: 2000, octaves: 1,
        }).toDestination();
        this.critSynth.volume.value = -20;

        // ── Level up fanfare ──
        this.fanfareSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.25, sustain: 0.1, release: 0.3 },
        }).connect(this.reverb);
        this.fanfareSynth.volume.value = -18;

        // ── Loot pickup ──
        this.lootSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.08 },
        }).toDestination();
        this.lootSynth.volume.value = -20;

        // ── Gathering pluck ──
        this.gatherSynth = new Tone.PluckSynth({
            attackNoise: 1.5, dampening: 3500, resonance: 0.8,
        }).connect(this.reverb);
        this.gatherSynth.volume.value = -20;

        // ── Achievement Unlock ──
        this.achieveSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
        }).connect(this.delay);
        this.achieveSynth.volume.value = -18;

        // ═══════════════════════════════════════════════════════════
        // SKILL-SPECIFIC SYNTHS
        // ═══════════════════════════════════════════════════════════

        // ── Skill 0: Aether Strike — clean sharp whoosh + chime ──
        this.aetherWhoosh = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.04 },
        }).connect(this.shortReverb);
        this.aetherWhoosh.volume.value = -26;

        this.aetherChime = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
        }).connect(this.shortReverb);
        this.aetherChime.volume.value = -24;

        // ── Skill 1: Whirlwind — sweeping wind noise + tonal woosh ──
        this.whirlwindNoise = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.05, decay: 0.4, sustain: 0.1, release: 0.2 },
        }).toDestination();
        this.whirlwindNoise.volume.value = -22;

        this.whirlwindTone = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.05, release: 0.15 },
        }).toDestination();
        this.whirlwindTone.volume.value = -28;

        // ── Skill 2: Aegis Guard — crystalline shield chime + low hum ──
        this.aegisSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.15, release: 0.4 },
        }).connect(this.delay);
        this.aegisSynth.volume.value = -22;

        this.aegisHum = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.3 },
        }).connect(this.reverb);
        this.aegisHum.volume.value = -28;

        // ── Skill 3: War Cry — deep bass boom + aggressive noise burst ──
        this.warCryBoom = new Tone.MembraneSynth({
            pitchDecay: 0.03, octaves: 6,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.15 },
        }).toDestination();
        this.warCryBoom.volume.value = -16;

        this.warCryNoise = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
        }).toDestination();
        this.warCryNoise.volume.value = -22;

        // ── Skill 4: Rending Blades — double metallic slash ──
        this.rendMetal = new Tone.MetalSynth({
            frequency: 400, envelope: { attack: 0.001, decay: 0.08, release: 0.03 },
            harmonicity: 3.1, modulationIndex: 12, resonance: 3000, octaves: 0.5,
        }).toDestination();
        this.rendMetal.volume.value = -22;

        this.rendTear = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
        }).toDestination();
        this.rendTear.volume.value = -26;

        // ── Skill 5: Dragon's Fury — fire roar (noise burst + rising tone) ──
        this.fireRoar = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.2 },
        }).toDestination();
        this.fireRoar.volume.value = -18;

        this.fireWhoosh = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.02, decay: 0.25, sustain: 0.05, release: 0.15 },
        }).toDestination();
        this.fireWhoosh.volume.value = -26;

        this.fireCrackle = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
        }).toDestination();
        this.fireCrackle.volume.value = -28;

        // ── Skill 6: Void Rift — eerie descending tone + dark pulse ──
        this.voidTone = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.08, decay: 0.6, sustain: 0.15, release: 0.4 },
        }).connect(this.delay);
        this.voidTone.volume.value = -22;

        this.voidPulse = new Tone.MembraneSynth({
            pitchDecay: 0.08, octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 },
        }).connect(this.reverb);
        this.voidPulse.volume.value = -20;

        this.voidHiss = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.1, decay: 0.4, sustain: 0.05, release: 0.3 },
        }).connect(this.reverb);
        this.voidHiss.volume.value = -28;

        // ── Skill 7: Cataclysm — massive layered impact (ultimate) ──
        this.cataBoom = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 8,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 },
        }).toDestination();
        this.cataBoom.volume.value = -14;

        this.cataSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.5 },
        }).connect(this.reverb);
        this.cataSynth.volume.value = -18;

        this.cataNoise = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.01, decay: 0.6, sustain: 0.1, release: 0.3 },
        }).connect(this.reverb);
        this.cataNoise.volume.value = -20;

        this.cataRise = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.4 },
        }).connect(this.delay);
        this.cataRise.volume.value = -24;

        // ═══════════════════════════════════════════════════════════
        // DAWNKEEPER (CLERIC) SKILL SYNTHS — Holy chimes & radiance
        // ═══════════════════════════════════════════════════════════

        // Shared holy reverb — long, cathedral-like
        this.holyReverb = new Tone.Reverb({ decay: 4, wet: 0.35 }).toDestination();
        this.holyDelay = new Tone.FeedbackDelay({ delayTime: 0.18, feedback: 0.25, wet: 0.2 }).toDestination();

        // ── Cleric Skill 0: Dawn Strike — warm holy chime + staff whoosh ──
        this.dawnChime = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.15 },
        }).connect(this.holyReverb);
        this.dawnChime.volume.value = -22;

        this.dawnWhoosh = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.03 },
        }).connect(this.shortReverb);
        this.dawnWhoosh.volume.value = -26;

        // ── Cleric Skill 1: Holy Smite — descending divine bell + impact ──
        this.smiteBell = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.35, sustain: 0.05, release: 0.3 },
        }).connect(this.holyReverb);
        this.smiteBell.volume.value = -18;

        this.smiteImpact = new Tone.MembraneSynth({
            pitchDecay: 0.02, octaves: 4,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
        }).toDestination();
        this.smiteImpact.volume.value = -20;

        // ── Cleric Skill 2: Divine Ward — crystalline shield activation + sustain hum ──
        this.wardChime = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.4, sustain: 0.2, release: 0.5 },
        }).connect(this.holyDelay);
        this.wardChime.volume.value = -20;

        this.wardHum = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.15, decay: 0.6, sustain: 0.3, release: 0.4 },
        }).connect(this.holyReverb);
        this.wardHum.volume.value = -26;

        // ── Cleric Skill 3: Benediction — ascending angelic chord cascade ──
        this.beneSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.15, release: 0.5 },
        }).connect(this.holyDelay);
        this.beneSynth.volume.value = -18;

        this.beneShimmer = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
        }).connect(this.holyReverb);
        this.beneShimmer.volume.value = -24;

        // ── Cleric Skill 4: Radiant Flare — bright burst + crackle ──
        this.flareBurst = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.01, decay: 0.25, sustain: 0.05, release: 0.15 },
        }).toDestination();
        this.flareBurst.volume.value = -20;

        this.flareTone = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.1 },
        }).connect(this.holyReverb);
        this.flareTone.volume.value = -24;

        // ── Cleric Skill 5: Solar Lance — piercing beam + resonant strike ──
        this.lanceTone = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 0.3 },
        }).connect(this.holyDelay);
        this.lanceTone.volume.value = -20;

        this.lanceWhoosh = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.003, decay: 0.15, sustain: 0, release: 0.05 },
        }).toDestination();
        this.lanceWhoosh.volume.value = -24;

        this.lanceImpact = new Tone.MetalSynth({
            frequency: 600, envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
            harmonicity: 8, modulationIndex: 20, resonance: 4000, octaves: 0.5,
        }).toDestination();
        this.lanceImpact.volume.value = -24;

        // ── Cleric Skill 6: Sanctified Ground — deep consecration hum + chime scatter ──
        this.consecHum = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.8, sustain: 0.2, release: 0.5 },
        }).connect(this.holyReverb);
        this.consecHum.volume.value = -20;

        this.consecChime = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.06 },
        }).connect(this.holyDelay);
        this.consecChime.volume.value = -24;

        this.consecBoom = new Tone.MembraneSynth({
            pitchDecay: 0.04, octaves: 5,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.2 },
        }).toDestination();
        this.consecBoom.volume.value = -18;

        // ── Cleric Skill 7: Dawn Chorus — massive layered angelic ultimate ──
        this.chorusSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.02, decay: 0.5, sustain: 0.2, release: 0.6 },
        }).connect(this.holyReverb);
        this.chorusSynth.volume.value = -16;

        this.chorusBoom = new Tone.MembraneSynth({
            pitchDecay: 0.06, octaves: 7,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.25 },
        }).toDestination();
        this.chorusBoom.volume.value = -14;

        this.chorusShimmer = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.05, decay: 0.5, sustain: 0.1, release: 0.3 },
        }).connect(this.holyReverb);
        this.chorusShimmer.volume.value = -22;

        this.chorusRise = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.15, decay: 0.4, sustain: 0.2, release: 0.5 },
        }).connect(this.holyDelay);
        this.chorusRise.volume.value = -22;

        // ── NEW: War Horn / Queue Pop ──
        this.hornSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.05, decay: 0.8, sustain: 0.5, release: 1.0 }
        }).connect(this.reverb);
        this.hornSynth.volume.value = -12;

        // ── NEW: Bloodlust ──
        this.bloodlustSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 8,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.5 }
        }).toDestination();
        this.bloodlustSynth.volume.value = -10;

        // ── NEW: Boss Enrage ──
        this.enrageSynth = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.1, decay: 2.0, sustain: 0.5, release: 1.0 }
        }).connect(this.reverb);
        this.enrageSynth.volume.value = -15;
    }

    // ── Ambient bird schedule ──
    startAmbientSchedule() {
        this.ambientInterval = setInterval(() => {
            if (!this.initialized || this.muted) return;
            if (Math.random() < 0.3) {
                try {
                    const notes = ['C6', 'E6', 'G6', 'A5', 'D6'];
                    const note = notes[Math.floor(Math.random() * notes.length)];
                    this.birdSynth.triggerAttackRelease(note, 0.06);
                    if (Math.random() < 0.3) {
                        setTimeout(() => {
                            if (this.muted) return;
                            try {
                                const n2 = ['E6', 'G6', 'B5'][Math.floor(Math.random() * 3)];
                                this.birdSynth.triggerAttackRelease(n2, 0.06);
                            } catch(e) {}
                        }, 120 + Math.random() * 80);
                    }
                } catch(e) {}
            }
        }, 2500 + Math.random() * 2000);
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER METHODS
    // ═══════════════════════════════════════════════════════════════

    playHit() {
        if (!this.initialized || this.muted) return;
        try { this.hitSynth.triggerAttackRelease('C2', 0.06); } catch(e) {}
    }

    playCrit() {
        if (!this.initialized || this.muted) return;
        try {
            this.critSynth.triggerAttackRelease('C4', 0.08);
        } catch(e) {}
    }

    /** Play skill sound by index (0-7), optionally class-aware */
    playSkill(skillIndex = -1, classId = 'warrior') {
        if (!this.initialized || this.muted) return;
        try {
            if (classId === 'cleric') {
                switch (skillIndex) {
                    case 0: this._playDawnStrike(); break;
                    case 1: this._playHolySmite(); break;
                    case 2: this._playDivineWard(); break;
                    case 3: this._playBenediction(); break;
                    case 4: this._playRadiantFlare(); break;
                    case 5: this._playSolarLance(); break;
                    case 6: this._playSanctifiedGround(); break;
                    case 7: this._playDawnChorus(); break;
                    default: this.dawnWhoosh.triggerAttackRelease(0.1); break;
                }
                return;
            }
            switch (skillIndex) {
                case 0: this._playAetherStrike(); break;
                case 1: this._playWhirlwind(); break;
                case 2: this._playAegisGuard(); break;
                case 3: this._playWarCry(); break;
                case 4: this._playRendingBlades(); break;
                case 5: this._playDragonsFury(); break;
                case 6: this._playVoidRift(); break;
                case 7: this._playCataclysm(); break;
                default:
                    // Fallback generic whoosh
                    this.aetherWhoosh.triggerAttackRelease(0.1);
                    break;
            }
        } catch(e) {}
    }

    // ── Skill 0: Aether Strike — swift blade whoosh + aether chime ──
    _playAetherStrike() {
        this.aetherWhoosh.triggerAttackRelease(0.08);
        setTimeout(() => {
            try { this.aetherChime.triggerAttackRelease('E5', 0.08); } catch(e) {}
        }, 30);
    }

    // ── Skill 1: Whirlwind Slash — sweeping wind + low whoosh ──
    _playWhirlwind() {
        this.whirlwindNoise.triggerAttackRelease(0.5);
        this.whirlwindTone.triggerAttackRelease('G2', 0.2);
        setTimeout(() => {
            try { this.whirlwindTone.triggerAttackRelease('D2', 0.15); } catch(e) {}
        }, 150);
    }

    // ── Skill 2: Aegis Guard — crystalline shield activation ──
    _playAegisGuard() {
        const now = Tone.now();
        this.aegisSynth.triggerAttackRelease(['E5', 'G5', 'B5'], 0.15, now);
        this.aegisSynth.triggerAttackRelease(['G5', 'B5', 'D6'], 0.12, now + 0.1);
        this.aegisHum.triggerAttackRelease('C3', 0.4, now);
    }

    // ── Skill 3: War Cry — bass boom + aggressive roar ──
    _playWarCry() {
        this.warCryBoom.triggerAttackRelease('C1', 0.15);
        this.warCryNoise.triggerAttackRelease(0.18);
        setTimeout(() => {
            try { this.warCryBoom.triggerAttackRelease('G1', 0.08); } catch(e) {}
        }, 100);
    }

    // ── Skill 4: Rending Blades — double metallic rip ──
    _playRendingBlades() {
        this.rendMetal.triggerAttackRelease('C4', 0.06);
        this.rendTear.triggerAttackRelease(0.05);
        setTimeout(() => {
            try {
                this.rendMetal.triggerAttackRelease('E4', 0.05);
                this.rendTear.triggerAttackRelease(0.04);
            } catch(e) {}
        }, 80);
    }

    // ── Skill 5: Dragon's Fury — fire roar + crackle burst ──
    _playDragonsFury() {
        this.fireRoar.triggerAttackRelease(0.5);
        this.fireWhoosh.triggerAttackRelease('C3', 0.2);
        // Crackle bursts
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                try { this.fireCrackle.triggerAttackRelease(0.025); } catch(e) {}
            }, 100 + i * 80);
        }
    }

    // ── Skill 6: Void Rift — eerie descending tone + dark pulse ──
    _playVoidRift() {
        const now = Tone.now();
        this.voidTone.triggerAttackRelease('B3', 0.4, now);
        this.voidPulse.triggerAttackRelease('E1', 0.2, now + 0.1);
        this.voidHiss.triggerAttackRelease(0.5, now);
        // Descending echo
        setTimeout(() => {
            try { this.voidTone.triggerAttackRelease('F3', 0.3); } catch(e) {}
        }, 200);
        setTimeout(() => {
            try { this.voidTone.triggerAttackRelease('C3', 0.25); } catch(e) {}
        }, 400);
    }

    // ── Skill 7: Cataclysm — massive layered arcane explosion ──
    _playCataclysm() {
        const now = Tone.now();
        // Bass impact
        this.cataBoom.triggerAttackRelease('C1', 0.2, now);
        // Arcane chord burst
        this.cataSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], 0.15, now);
        // Noise rumble
        this.cataNoise.triggerAttackRelease(0.6, now);
        // Rising tone
        this.cataRise.triggerAttackRelease('G3', 0.3, now + 0.05);

        // Second impact wave
        setTimeout(() => {
            try {
                this.cataBoom.triggerAttackRelease('G1', 0.15);
                this.cataSynth.triggerAttackRelease(['E4', 'G4', 'B4', 'E5'], 0.2);
            } catch(e) {}
        }, 200);
        // Final shimmer
        setTimeout(() => {
            try {
                this.cataSynth.triggerAttackRelease(['G5', 'B5', 'D6'], 0.25);
            } catch(e) {}
        }, 450);
    }

    // ═══════════════════════════════════════════════════════════════
    // DAWNKEEPER (CLERIC) SKILL TRIGGERS
    // ═══════════════════════════════════════════════════════════════

    // ── Cleric Skill 0: Dawn Strike — warm holy chime + staff whoosh ──
    _playDawnStrike() {
        this.dawnWhoosh.triggerAttackRelease(0.06);
        setTimeout(() => {
            try { this.dawnChime.triggerAttackRelease('G5', 0.1); } catch(e) {}
        }, 25);
    }

    // ── Cleric Skill 1: Holy Smite — descending divine bell + impact ──
    _playHolySmite() {
        const now = Tone.now();
        this.smiteBell.triggerAttackRelease(['E5', 'G5', 'B5'], 0.2, now);
        this.smiteImpact.triggerAttackRelease('G1', 0.15, now + 0.08);
        setTimeout(() => {
            try { this.smiteBell.triggerAttackRelease(['C5', 'E5'], 0.15); } catch(e) {}
        }, 180);
    }

    // ── Cleric Skill 2: Divine Ward — crystalline shield chimes + low hum ──
    _playDivineWard() {
        const now = Tone.now();
        this.wardChime.triggerAttackRelease(['D5', 'F#5', 'A5'], 0.2, now);
        this.wardChime.triggerAttackRelease(['F#5', 'A5', 'D6'], 0.15, now + 0.12);
        this.wardHum.triggerAttackRelease('D3', 0.5, now);
    }

    // ── Cleric Skill 3: Benediction — ascending angelic chord cascade ──
    _playBenediction() {
        const now = Tone.now();
        this.beneSynth.triggerAttackRelease(['C4', 'E4', 'G4'], 0.2, now);
        this.beneSynth.triggerAttackRelease(['E4', 'G4', 'C5'], 0.2, now + 0.15);
        this.beneSynth.triggerAttackRelease(['G4', 'C5', 'E5'], 0.25, now + 0.3);
        setTimeout(() => {
            try { this.beneShimmer.triggerAttackRelease('C6', 0.08); } catch(e) {}
        }, 450);
        setTimeout(() => {
            try { this.beneShimmer.triggerAttackRelease('E6', 0.06); } catch(e) {}
        }, 550);
    }

    // ── Cleric Skill 4: Radiant Flare — bright burst + rising tone ──
    _playRadiantFlare() {
        this.flareBurst.triggerAttackRelease(0.3);
        this.flareTone.triggerAttackRelease('A4', 0.15);
        setTimeout(() => {
            try { this.flareTone.triggerAttackRelease('E5', 0.12); } catch(e) {}
        }, 80);
        setTimeout(() => {
            try { this.dawnChime.triggerAttackRelease('A5', 0.06); } catch(e) {}
        }, 160);
    }

    // ── Cleric Skill 5: Solar Lance — piercing beam + resonant strike ──
    _playSolarLance() {
        const now = Tone.now();
        this.lanceWhoosh.triggerAttackRelease(0.12, now);
        this.lanceTone.triggerAttackRelease('E5', 0.4, now);
        setTimeout(() => {
            try { this.lanceImpact.triggerAttackRelease('C4', 0.06); } catch(e) {}
        }, 100);
        setTimeout(() => {
            try { this.lanceTone.triggerAttackRelease('B5', 0.25); } catch(e) {}
        }, 150);
    }

    // ── Cleric Skill 6: Sanctified Ground — deep consecration hum + chime scatter ──
    _playSanctifiedGround() {
        const now = Tone.now();
        this.consecBoom.triggerAttackRelease('D1', 0.2, now);
        this.consecHum.triggerAttackRelease('D3', 0.6, now);
        // Scatter of holy chimes
        const notes = ['G5', 'B5', 'D6', 'F#5', 'A5'];
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                try { this.consecChime.triggerAttackRelease(notes[i % notes.length], 0.06); } catch(e) {}
            }, 100 + i * 90);
        }
    }

    // ── Cleric Skill 7: Dawn Chorus — massive layered angelic ultimate ──
    _playDawnChorus() {
        const now = Tone.now();
        // Bass impact
        this.chorusBoom.triggerAttackRelease('C1', 0.2, now);
        // Angelic chord burst — 3 waves
        this.chorusSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], 0.2, now);
        this.chorusShimmer.triggerAttackRelease(0.6, now);
        this.chorusRise.triggerAttackRelease('G3', 0.3, now + 0.05);

        // Second wave — ascending
        setTimeout(() => {
            try {
                this.chorusBoom.triggerAttackRelease('G1', 0.15);
                this.chorusSynth.triggerAttackRelease(['E4', 'G4', 'B4', 'E5'], 0.25);
            } catch(e) {}
        }, 200);
        // Third wave — divine shimmer
        setTimeout(() => {
            try {
                this.chorusSynth.triggerAttackRelease(['G4', 'B4', 'D5', 'G5'], 0.3);
                this.chorusRise.triggerAttackRelease('D5', 0.25);
            } catch(e) {}
        }, 400);
        // Final heavenly chime
        setTimeout(() => {
            try {
                this.chorusSynth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], 0.4);
            } catch(e) {}
        }, 600);
    }

    // ═══════════════════════════════════════════════════════════════
    // OTHER TRIGGERS
    // ═══════════════════════════════════════════════════════════════

    playLevelUp() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            this.fanfareSynth.triggerAttackRelease(['C4', 'E4', 'G4'], 0.2, now);
            this.fanfareSynth.triggerAttackRelease(['E4', 'G4', 'C5'], 0.2, now + 0.25);
            this.fanfareSynth.triggerAttackRelease(['G4', 'C5', 'E5'], 0.35, now + 0.5);
        } catch(e) {}
    }

    playLoot(isRare = false, isLegendary = false) {
        if (!this.initialized || this.muted) return;
        try {
            if (isLegendary) {
                this.playAchievement('legendary');
                return;
            }
            const note = isRare ? 'A5' : 'E5';
            this.lootSynth.triggerAttackRelease(note, 0.1);
            if (isRare) {
                setTimeout(() => {
                    try { this.lootSynth.triggerAttackRelease('C6', 0.1); } catch(e) {}
                }, 120);
            }
        } catch(e) {}
    }

    playGather() {
        if (!this.initialized || this.muted) return;
        try {
            const notes = ['G4', 'C5', 'E5', 'A4'];
            this.gatherSynth.triggerAttack(notes[Math.floor(Math.random() * notes.length)]);
        } catch(e) {}
    }

    playAchievement(tier = 'common') {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            switch(tier) {
                case 'legendary':
                    this.achieveSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], 0.2, now);
                    this.achieveSynth.triggerAttackRelease(['E4', 'G4', 'C5', 'E5'], 0.2, now + 0.2);
                    this.achieveSynth.triggerAttackRelease(['G4', 'C5', 'E5', 'G5'], 0.5, now + 0.4);
                    // Add a bass boom for legendary
                    this.cataBoom.triggerAttackRelease('C1', 0.5, now);
                    break;
                case 'epic':
                    this.achieveSynth.triggerAttackRelease(['G4', 'B4', 'D5'], 0.15, now);
                    this.achieveSynth.triggerAttackRelease(['B4', 'D5', 'G5'], 0.4, now + 0.2);
                    break;
                case 'rare':
                    this.achieveSynth.triggerAttackRelease(['E5', 'A5'], 0.1, now);
                    this.achieveSynth.triggerAttackRelease(['A5', 'C6'], 0.3, now + 0.15);
                    break;
                default:
                    this.achieveSynth.triggerAttackRelease(['C5', 'E5', 'G5'], 0.1, now);
                    this.achieveSynth.triggerAttackRelease(['G5', 'C6'], 0.2, now + 0.2);
                    break;
            }
        } catch(e) {}
    }

    // ═══════════════════════════════════════════════════════════════
    // UI SOUNDS — panel open/close, success, failure
    // ═══════════════════════════════════════════════════════════════

    playZoneUnlock() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            // Triumphant ascending fanfare — warmer and grander than level-up
            this.fanfareSynth.triggerAttackRelease(['G3', 'B3', 'D4'], 0.2, now);
            this.fanfareSynth.triggerAttackRelease(['B3', 'D4', 'G4'], 0.2, now + 0.2);
            this.fanfareSynth.triggerAttackRelease(['D4', 'G4', 'B4'], 0.25, now + 0.4);
            this.fanfareSynth.triggerAttackRelease(['G4', 'B4', 'D5', 'G5'], 0.4, now + 0.6);
            // Deep boom for gravitas
            this.cataBoom?.triggerAttackRelease('G1', 0.3, now);
        } catch(e) {}
    }

    playUiOpen() {
        if (!this.initialized || this.muted) return;
        try {
            this.lootSynth.triggerAttackRelease('A5', 0.06);
        } catch(e) {}
    }

    playUiSuccess() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            this.lootSynth.triggerAttackRelease('E5', 0.08, now);
            this.lootSynth.triggerAttackRelease('A5', 0.08, now + 0.1);
        } catch(e) {}
    }

    playUiFail() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            this.lootSynth.triggerAttackRelease('D4', 0.1, now);
            this.lootSynth.triggerAttackRelease('Bb3', 0.15, now + 0.12);
        } catch(e) {}
    }

    playRaidVictory() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            // Orchestral swell: major chords + deep impact
            this.fanfareSynth.triggerAttackRelease(['C3', 'G3', 'C4', 'E4'], 0.5, now);
            this.fanfareSynth.triggerAttackRelease(['E3', 'B3', 'E4', 'G#4'], 0.5, now + 0.6);
            this.fanfareSynth.triggerAttackRelease(['G3', 'D4', 'G4', 'B4'], 0.8, now + 1.2);
            this.cataBoom?.triggerAttackRelease('C1', 0.6, now);
            this.chorusRise?.triggerAttackRelease('C5', 1.5, now + 0.5);
        } catch(e) {}
    }

    playQueuePop() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            // A powerful, resonant war horn (C3 -> G3 -> C4)
            this.hornSynth.triggerAttackRelease('C3', 1.5, now);
            this.hornSynth.triggerAttackRelease('G3', 1.2, now + 0.2);
            this.hornSynth.triggerAttackRelease('C4', 1.0, now + 0.5);
            this.cataBoom?.triggerAttackRelease('C1', 0.8, now);
        } catch(e) {}
    }

    playBloodlust() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            // Rapid heartbeats + aggressive roar
            for (let i = 0; i < 4; i++) {
                this.bloodlustSynth.triggerAttackRelease('C1', 0.1, now + i * 0.2);
            }
            this.warCryNoise?.triggerAttackRelease(1.0, now);
        } catch(e) {}
    }

    playBossEnrage() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            this.enrageSynth.triggerAttackRelease(2.5, now);
            this.voidTone?.triggerAttackRelease('C2', 2.0, now + 0.2);
            this.cataBoom?.triggerAttackRelease('C1', 1.0, now);
        } catch(e) {}
    }

    // ═══════════════════════════════════════════════════════════════
    // PROCEDURAL AMBIENT MUSIC BEDS
    // ═══════════════════════════════════════════════════════════════

    setupAmbientMusic() {
        // Main ambient synths
        this.ambientPad = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 2, decay: 2, sustain: 0.8, release: 3 }
        }).connect(this.reverb);
        this.ambientPad.volume.value = -30;

        this.ambientLead = new Tone.MonoSynth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 },
            filterEnvelope: { attack: 0.1, decay: 0.5, sustain: 0.5, release: 1, baseFrequency: 200, octaves: 3 }
        }).connect(this.lowPass);
        this.ambientLead.volume.value = -32;

        this.glitchSynth = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
        }).connect(this.delay);
        this.glitchSynth.volume.value = -35;

        this.currentZone = 'verdant_wilds';
        this.musicTick = 0;
        
        // Music Scales for zones
        this.zoneScales = {
            verdant_wilds: ['C4', 'E4', 'G4', 'A4', 'B4'], // Major/Pentatonic - Peaceful
            shattered_expanse: ['C4', 'D4', 'Eb4', 'G4', 'Ab4'], // Minor - Cold
            molten_abyss: ['C3', 'Db3', 'E3', 'G3', 'Ab3'], // Phrygian Dominant - Intense
            abyssal_depths: ['C4', 'F4', 'G4', 'Bb4', 'C5'], // Sus/Open - Deep
            neon_wastes: ['C4', 'E4', 'F#4', 'G#4', 'Bb4'], // Whole Tone/Lydian - Alien
            halo_ring: ['D4', 'E4', 'F#4', 'A4', 'B4'], // Lydian - Grand
            crimson_reach: ['E3', 'F3', 'G#3', 'A3', 'B3'] // Spanish/Phrygian - Scorched
        };

        // Start the music loop
        Tone.Transport.bpm.value = 80;
        this.musicLoop = new Tone.Loop(time => {
            this._tickMusic(time);
        }, "4n").start(0);
        
        Tone.Transport.start();
    }

    _tickMusic(time) {
        if (!this.initialized || this.muted) return;
        
        const scale = this.zoneScales[this.currentZone] || this.zoneScales['verdant_wilds'];
        
        // 1. Pads (every 16 beats)
        if (this.musicTick % 16 === 0) {
            const root = scale[0];
            const third = scale[2];
            const fifth = scale[Math.min(4, scale.length - 1)];
            this.ambientPad.triggerAttackRelease([root, third, fifth], "4n", time);
        }

        // 2. Leads/Melody (probabilistic)
        if (Math.random() < 0.3) {
            const note = scale[Math.floor(Math.random() * scale.length)];
            const duration = Math.random() < 0.5 ? "8n" : "4n";
            this.ambientLead.triggerAttackRelease(note, duration, time);
        }

        // 3. Glitch/Texture (Zone dependent)
        if (this.currentZone === 'neon_wastes' || this.currentZone === 'crimson_reach') {
            if (Math.random() < 0.15) {
                this.glitchSynth.triggerAttackRelease("16n", time);
                // Trigger visual pulse callback if registered
                if (window._onMusicGlitch) window._onMusicGlitch();
            }
        }

        this.musicTick++;
    }

    updateZone(zoneId) {
        if (this.currentZone === zoneId) return;
        this.currentZone = zoneId;
        console.log(`🎵 Music switching to: ${zoneId}`);
        
        // Reset tick or adjust BPM if needed
        if (zoneId === 'molten_abyss' || zoneId === 'crimson_reach') {
            Tone.Transport.bpm.rampTo(95, 4);
        } else {
            Tone.Transport.bpm.rampTo(80, 4);
        }
    }

    playRaidDefeat() {
        if (!this.initialized || this.muted) return;
        try {
            const now = Tone.now();
            // Low bassy drone + minor dissonant swell
            this.warCryBoom.triggerAttackRelease('C1', 1.0, now);
            this.voidHiss.triggerAttackRelease(2.0, now);
            this.voidTone.triggerAttackRelease('Ab2', 1.5, now + 0.2);
            setTimeout(() => {
                if (this.muted) return;
                this.voidTone.triggerAttackRelease('G2', 1.0);
            }, 800);
        } catch(e) {}
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.initialized) {
            Tone.getDestination().volume.value = this.muted ? -Infinity : this.masterVolume;
        }
        return this.muted;
    }

    setVolume(percent) {
        this.volumePercent = Math.max(0, Math.min(100, percent));
        if (this.volumePercent <= 0) {
            this.masterVolume = -Infinity;
        } else {
            this.masterVolume = -45 + (this.volumePercent / 100) * 37;
        }
        if (this.initialized && !this.muted) {
            Tone.getDestination().volume.value = this.masterVolume;
        }
    }
}

export const audioManager = new AudioManagerClass();
