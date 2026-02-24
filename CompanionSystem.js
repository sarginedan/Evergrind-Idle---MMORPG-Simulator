// CompanionSystem.js — Companion Pet System
// Unlocked when Abyssal Depths zone is accessible.
// Players can summon any creature they've killed as a miniature companion
// that fights alongside them (Legend of Mana-style pet behavior).

import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { questLog } from './QuestLog.js';

// ══════════════════════════════════════════════════════════════════
// COMPANION STATS — scaled by mob type, always companion-sized
// ══════════════════════════════════════════════════════════════════

// Companion DPS as a percentage of player base DPS (before gear)
const COMPANION_DPS_RATIO = 0.18;        // 18% of player DPS
const COMPANION_DPS_PER_LEVEL = 0.004;   // +0.4% per player level

// Companion HP as a percentage of player max HP
const COMPANION_HP_RATIO = 0.30;         // 30% of player max HP
const COMPANION_HP_PER_LEVEL = 0.005;    // +0.5% per player level

// Respawn delay after companion dies
const COMPANION_RESPAWN_TIME = 8.0;      // seconds

// Kill count required to unlock a monster as a companion
export const COMPANION_UNLOCK_THRESHOLD = 100;

// Visual scale cap — large mobs are shrunk to companion size
const COMPANION_SCALE_MIN = 0.70;
const COMPANION_SCALE_MAX = 1.10;

// Build a flat lookup of all mob types across all zones
function _buildMobLookup() {
    const lookup = {};
    for (const zone of CONFIG.ZONES) {
        if (!zone.mobTypes) continue;
        for (const mt of zone.mobTypes) {
            if (!lookup[mt.name]) {
                lookup[mt.name] = { ...mt, zoneId: zone.id, zoneName: zone.name, zoneIcon: zone.icon, zoneColor: zone.color };
            }
        }
    }
    return lookup;
}

let _mobLookup = null;
function getMobLookup() {
    if (!_mobLookup) _mobLookup = _buildMobLookup();
    return _mobLookup;
}

// ══════════════════════════════════════════════════════════════════
// COMPANION SYSTEM SINGLETON
// ══════════════════════════════════════════════════════════════════

class CompanionSystem {
    constructor() {
        this.unlocked = false;

        // Bestiary: Set of mob type names the player has killed at least once
        this.discoveredCreatures = new Set();

        // Active companion (null = none summoned)
        // Stored as mob type name string (e.g. 'Forest Wurm')
        this.activeCompanionName = null;

        // Cached companion data (derived from activeCompanionName)
        this._cachedCompanion = null;

        // ── Health system ──
        this.hp = 0;
        this.maxHp = 0;
        this.alive = true;
        this.respawnTimer = 0;
        this._version = 0;  // bumped on summon/dismiss/death/respawn for UI reactivity
    }

    // ── Unlock check ──
    isUnlocked() {
        if (this.unlocked) return true;
        if (gameState.canAccessZone('abyssal_depths')) {
            this.unlocked = true;
            return true;
        }
        return false;
    }

    // ── Bestiary tracking ──
    /** Called when any mob dies — records it in the bestiary */
    onMobKilled(mobTypeName) {
        if (!this.isUnlocked()) return;
        this.discoveredCreatures.add(mobTypeName);
    }

    /** Pre-populate bestiary from questLog.killsByMobName (for existing saves) */
    syncFromKillLog() {
        if (!questLog.killsByMobName) return;
        for (const name in questLog.killsByMobName) {
            if (questLog.killsByMobName[name] > 0) {
                this.discoveredCreatures.add(name);
            }
        }
    }

    /** Get list of all discoverable companions with metadata */
    getDiscoveredList() {
        const lookup = getMobLookup();
        const list = [];
        for (const name of this.discoveredCreatures) {
            const mt = lookup[name];
            if (mt) {
                const kills = questLog.killsByMobName[name] || 0;
                list.push({
                    name: mt.name,
                    type: mt.type,
                    color: mt.color,
                    originalScale: mt.scale,
                    companionScale: this._getCompanionScale(mt.scale),
                    zoneId: mt.zoneId,
                    zoneName: mt.zoneName,
                    zoneIcon: mt.zoneIcon,
                    zoneColor: mt.zoneColor,
                    isActive: this.activeCompanionName === mt.name,
                    dps: this.getCompanionDps(),
                    killCount: kills,
                    isUnlocked: kills >= COMPANION_UNLOCK_THRESHOLD,
                    unlockThreshold: COMPANION_UNLOCK_THRESHOLD,
                });
            }
        }
        // Sort by zone order, then alphabetical
        const zoneOrder = {};
        CONFIG.ZONES.forEach((z, i) => zoneOrder[z.id] = i);
        list.sort((a, b) => (zoneOrder[a.zoneId] || 0) - (zoneOrder[b.zoneId] || 0) || a.name.localeCompare(b.name));
        return list;
    }

    /** Summon a companion by mob type name */
    summon(mobTypeName) {
        const lookup = getMobLookup();
        if (!lookup[mobTypeName]) return false;
        if (!this.discoveredCreatures.has(mobTypeName)) return false;
        
        // Check unlock threshold
        const kills = questLog.killsByMobName[mobTypeName] || 0;
        if (kills < COMPANION_UNLOCK_THRESHOLD) return false;

        this.activeCompanionName = mobTypeName;
        this._cachedCompanion = null;
        // Reset HP to full on summon
        this.maxHp = this.getCompanionMaxHp();
        this.hp = this.maxHp;
        this.alive = true;
        this.respawnTimer = 0;
        this._version++;
        return true;
    }

    /** Dismiss the active companion */
    dismiss() {
        this.activeCompanionName = null;
        this._cachedCompanion = null;
        this.hp = 0;
        this.maxHp = 0;
        this.alive = true;
        this.respawnTimer = 0;
        this._version++;
    }

    // ── Health system ──

    /** Max HP scales with player level */
    getCompanionMaxHp() {
        const baseHp = gameState.getEffectiveMaxHp();
        const ratio = COMPANION_HP_RATIO + (gameState.level * COMPANION_HP_PER_LEVEL);
        return Math.max(10, Math.floor(baseHp * ratio));
    }

    /** Companion takes damage — returns true if it died */
    takeDamage(amount) {
        if (!this.activeCompanionName || !this.alive) return false;
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0) {
            this.alive = false;
            this.respawnTimer = COMPANION_RESPAWN_TIME;
            this._version++;
            return true; // died
        }
        return false;
    }

    /** Regen a small amount of HP while alive and out of combat */
    regenHp(dt) {
        if (!this.activeCompanionName || !this.alive) return;
        this.maxHp = this.getCompanionMaxHp(); // Track level-ups
        const regenRate = this.maxHp * 0.03; // 3% per second
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + regenRate * dt);
        }
    }

    /** Update respawn timer */
    updateRespawn(dt) {
        if (!this.activeCompanionName || this.alive) return;
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
            this.alive = true;
            this.maxHp = this.getCompanionMaxHp();
            this.hp = this.maxHp;
            this.respawnTimer = 0;
            this._version++;
        }
    }

    /** Get HP fraction (0-1) */
    getHpFraction() {
        if (this.maxHp <= 0) return 1;
        return this.hp / this.maxHp;
    }

    /** Get active companion data (or null) */
    getActiveCompanion() {
        if (!this.activeCompanionName) return null;
        if (this._cachedCompanion && this._cachedCompanion.name === this.activeCompanionName) {
            return this._cachedCompanion;
        }
        const lookup = getMobLookup();
        const mt = lookup[this.activeCompanionName];
        if (!mt) { this.activeCompanionName = null; return null; }

        this._cachedCompanion = {
            name: mt.name,
            type: mt.type,
            color: mt.color,
            originalScale: mt.scale,
            companionScale: this._getCompanionScale(mt.scale),
            zoneId: mt.zoneId,
            dps: this.getCompanionDps(),
        };
        return this._cachedCompanion;
    }

    /** Companion DPS scales with player level + paragon bonus */
    getCompanionDps() {
        const base = gameState.getDPS();
        const ratio = COMPANION_DPS_RATIO + (gameState.level * COMPANION_DPS_PER_LEVEL);
        const paragonBonus = 1 + gameState.getParagonCompanionDps();
        return Math.max(1, Math.floor(base * ratio * paragonBonus));
    }

    /** Map original mob scale → companion scale (large mobs shrink more) + paragon size bonus */
    _getCompanionScale(originalScale) {
        // Inverse relationship: larger mobs shrink more to fit companion size
        // Scale 0.7 → 0.55, Scale 2.0 → 0.35
        const t = Math.max(0, Math.min(1, (originalScale - 0.7) / (2.0 - 0.7)));
        const baseScale = COMPANION_SCALE_MAX - t * (COMPANION_SCALE_MAX - COMPANION_SCALE_MIN);
        // Paragon companion scale bonus (e.g., 0.50 = +50% size per milestone)
        const paragonScale = 1 + gameState.getParagonCompanionScale();
        return baseScale * paragonScale;
    }

    // ── Serialization ──
    serialize() {
        return {
            unlocked: this.unlocked,
            discovered: Array.from(this.discoveredCreatures),
            active: this.activeCompanionName,
            hp: this.hp,
            maxHp: this.maxHp,
            alive: this.alive,
            respawnTimer: this.respawnTimer,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.unlocked = !!data.unlocked;
        this.discoveredCreatures = new Set(data.discovered || []);
        this.activeCompanionName = data.active || null;
        this._cachedCompanion = null;
        // Restore HP state (graceful migration for old saves)
        if (this.activeCompanionName) {
            this.maxHp = data.maxHp || this.getCompanionMaxHp();
            this.hp = data.hp != null ? data.hp : this.maxHp;
            this.alive = data.alive != null ? data.alive : true;
            this.respawnTimer = data.respawnTimer || 0;
        }
    }
}

export const companionSystem = new CompanionSystem();
