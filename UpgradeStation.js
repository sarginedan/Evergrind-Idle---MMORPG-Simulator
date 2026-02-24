// Upgrade Station — Gear Enhancement System
// Inspired by GW2 Mystic Forge & WoW Enchanting
// Spend Gold + Aetherbits to upgrade equipped gear through enhancement tiers
// Each tier adds a stat multiplier and a visual "★" rank indicator

import { gameState } from './GameState.js';
import { inventory } from './Inventory.js';

// ══════════════════════════════════════════════════════════════════════
// UPGRADE TIERS — escalating costs, multiplicative stat bonuses
// ══════════════════════════════════════════════════════════════════════

export const UPGRADE_TIERS = [
    // tier 0 = base (no upgrade)
    { tier: 1, label: '★',       statMult: 1.10, goldCost: 15,   aetherbitCost: 5,   successRate: 1.0,  color: '#aabbaa' },
    { tier: 2, label: '★★',      statMult: 1.22, goldCost: 35,   aetherbitCost: 12,  successRate: 1.0,  color: '#44cc44' },
    { tier: 3, label: '★★★',     statMult: 1.38, goldCost: 80,   aetherbitCost: 25,  successRate: 0.95, color: '#44cc44' },
    { tier: 4, label: '★★★★',    statMult: 1.58, goldCost: 160,  aetherbitCost: 50,  successRate: 0.90, color: '#4488ff' },
    { tier: 5, label: '★★★★★',   statMult: 1.82, goldCost: 300,  aetherbitCost: 100, successRate: 0.85, color: '#4488ff' },
    { tier: 6, label: '★★★★★★',  statMult: 2.10, goldCost: 500,  aetherbitCost: 180, successRate: 0.75, color: '#ffaa00' },
    { tier: 7, label: '★★★★★★★', statMult: 2.50, goldCost: 850,  aetherbitCost: 300, successRate: 0.65, color: '#ffaa00' },
    { tier: 8, label: '✦✦✦✦✦✦✦✦', statMult: 3.00, goldCost: 1500, aetherbitCost: 500, successRate: 0.50, color: '#cc44ff' },
];

export const MAX_UPGRADE_TIER = UPGRADE_TIERS.length;

// ══════════════════════════════════════════════════════════════════════
// UPGRADE STATION MANAGER
// ══════════════════════════════════════════════════════════════════════

class UpgradeStationManager {
    constructor() {
        // Track total stats
        this.totalUpgradesAttempted = 0;
        this.totalUpgradesSucceeded = 0;
        this.totalGoldSpent = 0;
        this.totalAetherbitsSpent = 0;
    }

    reset() {
        this.totalUpgradesAttempted = 0;
        this.totalUpgradesSucceeded = 0;
        this.totalGoldSpent = 0;
        this.totalAetherbitsSpent = 0;
    }

    /** Get the upgrade tier definition for the NEXT level of an item */
    getNextTier(item) {
        const currentTier = item.upgradeTier || 0;
        if (currentTier >= MAX_UPGRADE_TIER) return null;
        return UPGRADE_TIERS[currentTier]; // index 0 = tier 1 upgrade
    }

    /** Get the current tier definition of an item (null if unupgraded) */
    getCurrentTier(item) {
        const currentTier = item.upgradeTier || 0;
        if (currentTier <= 0) return null;
        return UPGRADE_TIERS[currentTier - 1]; // tier 1 = index 0
    }

    /** Can the player afford the next upgrade for this item? */
    canAfford(item) {
        const next = this.getNextTier(item);
        if (!next) return false;
        return gameState.gold >= next.goldCost && gameState.karma >= next.aetherbitCost;
    }

    /** Can this item be upgraded at all? (is equip, not junk, not max tier) */
    canUpgrade(item) {
        if (!item || item.type === 'junk') return false;
        if (!item.slot) return false;
        const currentTier = item.upgradeTier || 0;
        return currentTier < MAX_UPGRADE_TIER;
    }

    /** Attempt to upgrade an equipped item. Returns result object. */
    attemptUpgrade(slotKey) {
        const item = inventory.equipped[slotKey];
        if (!item) return { success: false, reason: 'No item equipped in that slot.' };
        if (!this.canUpgrade(item)) return { success: false, reason: 'Item is already at maximum enhancement.' };
        
        const next = this.getNextTier(item);
        if (!next) return { success: false, reason: 'Item is already at maximum enhancement.' };
        
        if (gameState.gold < next.goldCost) return { success: false, reason: `Need ${next.goldCost} Gold (have ${gameState.gold}).` };
        if (gameState.karma < next.aetherbitCost) return { success: false, reason: `Need ${next.aetherbitCost} Aetherbits (have ${gameState.karma}).` };

        // Spend currencies
        gameState.gold -= next.goldCost;
        gameState.karma -= next.aetherbitCost;
        gameState.totalGoldSpent = (gameState.totalGoldSpent || 0) + next.goldCost;
        this.totalGoldSpent += next.goldCost;
        this.totalAetherbitsSpent += next.aetherbitCost;
        this.totalUpgradesAttempted++;

        // Roll for success
        const roll = Math.random();
        if (roll <= next.successRate) {
            // Success!
            item.upgradeTier = next.tier;
            this.totalUpgradesSucceeded++;
            gameState.totalItemsEnhanced = (gameState.totalItemsEnhanced || 0) + 1;

            // Recalc base stats with the new multiplier
            this._applyUpgradeStats(item);

            // Recalc equipment bonuses
            inventory.recalcStats();

            gameState.addGameLog(`Enhancement success! ${item.name} → ${next.label} (+${Math.round((next.statMult - 1) * 100)}% stats)`);
            gameState.addChatMessage('Game', 'System', `${item.name} enhanced to ${next.label}!`);

            return { success: true, tier: next.tier, label: next.label, item };
        } else {
            // Failure — item stays at current tier, gold & aetherbits still consumed
            gameState.addGameLog(`Enhancement failed! ${item.name} remains unchanged. Materials consumed.`);
            return { success: false, reason: 'Enhancement failed! Materials were consumed.', failed: true };
        }
    }

    /** Recalculate item stats based on upgrade tier (called after upgrade or on load) */
    _applyUpgradeStats(item) {
        // Upgrade stats are applied on top of the base — we store originals
        // If no base stored yet, store the current values as base
        if (item._baseDps == null && item.dps != null) item._baseDps = item.dps;
        if (item._baseArmor == null && item.armor != null) item._baseArmor = item.armor;
        if (item._baseBonus == null && item.bonus != null) item._baseBonus = item.bonus;
        if (item._baseBonusStatValue == null && item.bonusStatValue != null) item._baseBonusStatValue = item.bonusStatValue;

        const tier = this.getCurrentTier(item);
        const mult = tier ? tier.statMult : 1.0;

        if (item._baseDps != null) item.dps = Math.max(1, Math.round(item._baseDps * mult));
        if (item._baseArmor != null) item.armor = Math.max(1, Math.round(item._baseArmor * mult));
        if (item._baseBonus != null) item.bonus = Math.max(1, Math.round(item._baseBonus * mult));
        if (item._baseBonusStatValue != null) item.bonusStatValue = Math.round(item._baseBonusStatValue * mult);
    }

    /** Reapply upgrade stats to all equipped items (called after save load) */
    reapplyAll() {
        for (const slot of Object.keys(inventory.equipped)) {
            const item = inventory.equipped[slot];
            if (item && (item.upgradeTier || 0) > 0) {
                this._applyUpgradeStats(item);
            }
        }
        inventory.recalcStats();
    }

    /** Get a display label for an item's upgrade tier */
    getTierLabel(item) {
        const tier = this.getCurrentTier(item);
        return tier ? tier.label : '';
    }

    /** Get the color for an item's upgrade tier */
    getTierColor(item) {
        const tier = this.getCurrentTier(item);
        return tier ? tier.color : null;
    }

    // ── Serialization ────────────────────────────────────────────

    serialize() {
        return {
            totalUpgradesAttempted: this.totalUpgradesAttempted,
            totalUpgradesSucceeded: this.totalUpgradesSucceeded,
            totalGoldSpent: this.totalGoldSpent,
            totalAetherbitsSpent: this.totalAetherbitsSpent,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.totalUpgradesAttempted = data.totalUpgradesAttempted || 0;
        this.totalUpgradesSucceeded = data.totalUpgradesSucceeded || 0;
        this.totalGoldSpent = data.totalGoldSpent || 0;
        this.totalAetherbitsSpent = data.totalAetherbitsSpent || 0;
    }
}

export const upgradeStation = new UpgradeStationManager();
