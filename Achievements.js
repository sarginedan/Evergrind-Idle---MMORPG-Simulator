// Achievements System — Overzealous progression rewards
import { iconImg } from './icons.js';
import { gameState } from './GameState.js';
import { questLog } from './QuestLog.js';
import { companionSystem } from './CompanionSystem.js';
import { raidSystem } from './RaidSystem.js';
import { dungeonSystem } from './DungeonSystem.js';
import { battlegroundSystem } from './BattlegroundSystem.js';
import { soulForge } from './SoulForge.js';

/** Achievement definition structure:
 * {
 *   id: string,
 *   title: string,
 *   desc: string,
 *   icon: string,
 *   target: number,
 *   category: 'combat' | 'wealth' | 'progression' | 'social' | 'endgame' | 'conquest',
 *   reward: { xp: number, gold: number }
 * }
 */

export const ACHIEVEMENT_DEFS = [
    // ── Combat ──
    { id: 'kills_1', title: 'First Blood', desc: 'Defeat your first enemy', target: 1, category: 'combat', tier: 'common', reward: { xp: 50, gold: 5 }, icon: 'sword' },
    { id: 'kills_2', title: 'Slayer', desc: 'Defeat 100 enemies', target: 100, category: 'combat', tier: 'rare', reward: { xp: 500, gold: 50 }, icon: 'sword' },
    { id: 'kills_3', title: 'Butcher of the Realm', desc: 'Defeat 1,000 enemies', target: 1000, category: 'combat', tier: 'epic', reward: { xp: 5000, gold: 500 }, icon: 'whirlwind' },
    { id: 'kills_4', title: 'Genocide Engine', desc: 'Defeat 10,000 enemies', target: 10000, category: 'combat', tier: 'legendary', reward: { xp: 50000, gold: 5000 }, icon: 'rendingBlades' },
    
    // ── Monster Mastery (The new Companion requirement) ──
    { id: 'mastery_1', title: 'Naturalist', desc: 'Unlock your first companion through Mastery (100 kills)', target: 1, category: 'combat', tier: 'rare', reward: { xp: 1000, gold: 500 }, icon: 'backpack' },
    { id: 'mastery_2', title: 'Menagerie', desc: 'Unlock 10 unique companions via Mastery', target: 10, category: 'combat', tier: 'epic', reward: { xp: 10000, gold: 2500 }, icon: 'backpack' },
    { id: 'mastery_3', title: 'Master of the Wilds', desc: 'Unlock 30 unique companions via Mastery', target: 30, category: 'combat', tier: 'legendary', reward: { xp: 50000, gold: 10000 }, icon: 'backpack' },

    { id: 'mobs_zone_1', title: 'Wilds Clearance', desc: 'Defeat 500 mobs in Verdant Wilds', target: 500, category: 'combat', tier: 'rare', reward: { xp: 1000, gold: 100 }, icon: 'sword' },
    { id: 'mobs_zone_2', title: 'Shattered Peace', desc: 'Defeat 1,000 mobs in Shattered Expanse', target: 1000, category: 'combat', tier: 'rare', reward: { xp: 5000, gold: 500 }, icon: 'sword' },
    { id: 'mobs_zone_3', title: 'Dune Sweeper', desc: 'Defeat 1,500 mobs in Blistering Sands', target: 1500, category: 'combat', tier: 'rare', reward: { xp: 15000, gold: 1500 }, icon: 'sword' },
    { id: 'mobs_zone_4', title: 'Abyssal Purge', desc: 'Defeat 2,000 mobs in Whispering Void', target: 2000, category: 'combat', tier: 'rare', reward: { xp: 25000, gold: 2500 }, icon: 'sword' },

    { id: 'crits_1', title: 'Lucky Strike', desc: 'Land a critical hit', target: 1, category: 'combat', tier: 'common', reward: { xp: 30, gold: 2 }, icon: 'crit' },
    { id: 'crits_2', title: 'Precision', desc: 'Land 500 critical hits', target: 500, category: 'combat', tier: 'rare', reward: { xp: 2000, gold: 200 }, icon: 'crit' },
    { id: 'crits_3', title: 'Lethal Intent', desc: 'Land 5,000 critical hits', target: 5000, category: 'combat', tier: 'epic', reward: { xp: 15000, gold: 1500 }, icon: 'crit' },
    { id: 'crits_4', title: 'God of Destruction', desc: 'Land 25,000 critical hits', target: 25000, category: 'combat', tier: 'legendary', reward: { xp: 50000, gold: 5000 }, icon: 'crit' },

    { id: 'bosses_1', title: 'Giant Slayer', desc: 'Defeat a zone boss', target: 1, category: 'combat', tier: 'rare', reward: { xp: 1000, gold: 100 }, icon: 'crown' },
    { id: 'bosses_2', title: 'Regicide', desc: 'Defeat 5 unique zone bosses', target: 5, category: 'combat', tier: 'epic', reward: { xp: 10000, gold: 2000 }, icon: 'crown' },
    { id: 'bosses_3', title: 'Overlord', desc: 'Defeat 7 unique zone bosses', target: 7, category: 'combat', tier: 'legendary', reward: { xp: 50000, gold: 10000 }, icon: 'crown' },

    // ── Endgame (Dungeons & Raids) ──
    { id: 'dungeons_1', title: 'Dungeon Delver', desc: 'Complete your first dungeon', target: 1, category: 'endgame', tier: 'rare', reward: { xp: 2000, gold: 500 }, icon: 'skull' },
    { id: 'dungeons_2', title: 'Crypt Keeper', desc: 'Complete 25 total dungeons', target: 25, category: 'endgame', tier: 'epic', reward: { xp: 15000, gold: 5000 }, icon: 'skull' },
    { id: 'raids_1', title: 'Sanctum Savior', desc: 'Clear the Hivespire Sanctum raid', target: 1, category: 'endgame', tier: 'epic', reward: { xp: 25000, gold: 10000 }, icon: 'crown' },
    { id: 'raids_2', title: 'Overmind Executioner', desc: 'Clear the Hivespire Sanctum 10 times', target: 10, category: 'endgame', tier: 'legendary', reward: { xp: 100000, gold: 50000 }, icon: 'crown' },
    { id: 'raid_pts_1', title: 'Elite Raider', desc: 'Earn 5,000 total Raid Points', target: 5000, category: 'endgame', tier: 'rare', reward: { xp: 10000, gold: 2000 }, icon: 'goldBag' },

    // ── Conquest (PvP) ──
    { id: 'pvp_wins_1', title: 'Scrapper', desc: 'Win your first Battleground', target: 1, category: 'conquest', tier: 'rare', reward: { xp: 2000, gold: 500 }, icon: 'sword' },
    { id: 'pvp_wins_2', title: 'Voidstrike Veteran', desc: 'Win 25 Battlegrounds', target: 25, category: 'conquest', tier: 'epic', reward: { xp: 20000, gold: 5000 }, icon: 'rendingBlades' },
    { id: 'pvp_kills_1', title: 'Bounty Hunter', desc: 'Defeat 100 players in Battlegrounds', target: 100, category: 'conquest', tier: 'epic', reward: { xp: 15000, gold: 2500 }, icon: 'whirlwind' },
    { id: 'pvp_pts_1', title: 'Gladiator', desc: 'Earn 10,000 total Victory Points', target: 10000, category: 'conquest', tier: 'legendary', reward: { xp: 50000, gold: 10000 }, icon: 'crown' },

    // ── Wealth ──
    { id: 'gold_1', title: 'Pocket Change', desc: 'Earn 100 total gold', target: 100, category: 'wealth', tier: 'common', reward: { xp: 100, gold: 20 }, icon: 'goldCoin' },
    { id: 'gold_2', title: 'Merchant in Training', desc: 'Earn 5,000 total gold', target: 5000, category: 'wealth', tier: 'rare', reward: { xp: 2000, gold: 500 }, icon: 'goldCoin' },
    { id: 'gold_3', title: 'Golden Touch', desc: 'Earn 100,000 total gold', target: 100000, category: 'wealth', tier: 'epic', reward: { xp: 10000, gold: 5000 }, icon: 'goldBag' },
    { id: 'gold_4', title: 'The 1%', desc: 'Earn 1,000,000 total gold', target: 1000000, category: 'wealth', tier: 'legendary', reward: { xp: 100000, gold: 50000 }, icon: 'goldStack' },

    { id: 'spending_1', title: 'Customer of the Month', desc: 'Spend 1,000 gold in shops', target: 1000, category: 'wealth', tier: 'rare', reward: { xp: 500, gold: 100 }, icon: 'goldCoin' },
    { id: 'spending_2', title: 'Big Spender', desc: 'Spend 50,000 gold in shops', target: 50000, category: 'wealth', tier: 'epic', reward: { xp: 10000, gold: 2000 }, icon: 'goldBag' },
    { id: 'spending_3', title: 'Economic Engine', desc: 'Spend 500,000 gold in shops', target: 500000, category: 'wealth', tier: 'legendary', reward: { xp: 50000, gold: 5000 }, icon: 'goldStack' },

    { id: 'selling_1', title: 'Cleaning the Attic', desc: 'Sell 50 items to a vendor', target: 50, category: 'wealth', tier: 'common', reward: { xp: 300, gold: 50 }, icon: 'backpack' },
    { id: 'selling_2', title: 'Liquidator', desc: 'Sell 500 items to a vendor', target: 500, category: 'wealth', tier: 'rare', reward: { xp: 5000, gold: 1000 }, icon: 'backpack' },
    { id: 'selling_3', title: 'Pawn Star', desc: 'Sell 2,500 items to a vendor', target: 2500, category: 'wealth', tier: 'epic', reward: { xp: 15000, gold: 3000 }, icon: 'backpack' },

    { id: 'looted_1', title: 'Magpie', desc: 'Loot 100 total items', target: 100, category: 'wealth', tier: 'common', reward: { xp: 500, gold: 100 }, icon: 'backpack' },
    { id: 'looted_2', title: 'Hoarder', desc: 'Loot 1,000 total items', target: 1000, category: 'wealth', tier: 'rare', reward: { xp: 5000, gold: 1000 }, icon: 'backpack' },
    { id: 'looted_3', title: 'Treasure Hunter', desc: 'Loot 5,000 total items', target: 5000, category: 'wealth', tier: 'epic', reward: { xp: 25000, gold: 5000 }, icon: 'backpack' },

    // ── Progression ──
    { id: 'levels_1', title: 'Initiate', desc: 'Reach Level 10', target: 10, category: 'progression', tier: 'common', reward: { xp: 1000, gold: 100 }, icon: 'xpStar' },
    { id: 'levels_2', title: 'Veteran', desc: 'Reach Level 30', target: 30, category: 'progression', tier: 'rare', reward: { xp: 5000, gold: 1000 }, icon: 'xpStar' },
    { id: 'levels_3', title: 'Master of the Craft', desc: 'Reach Level 50', target: 50, category: 'progression', tier: 'epic', reward: { xp: 20000, gold: 5000 }, icon: 'xpStar' },
    { id: 'levels_4', title: 'Ascended', desc: 'Reach Level 60', target: 60, category: 'progression', tier: 'legendary', reward: { xp: 50000, gold: 10000 }, icon: 'xpStar' },

    { id: 'paragon_1', title: 'Beyond the Limit', desc: 'Reach Paragon Level 1', target: 1, category: 'progression', tier: 'rare', reward: { xp: 5000, gold: 1000 }, icon: 'upgradeStar' },
    { id: 'paragon_2', title: 'True Mastery', desc: 'Reach Paragon Level 25', target: 25, category: 'progression', tier: 'epic', reward: { xp: 50000, gold: 10000 }, icon: 'upgradeStar' },
    { id: 'paragon_3', title: 'Ascendant Paragon', desc: 'Reach Paragon Level 50 (MAX)', target: 50, category: 'progression', tier: 'legendary', reward: { xp: 250000, gold: 50000 }, icon: 'upgradeStar' },
    { id: 'soulforge_1', title: 'Soul Binder', desc: 'Unlock 5 unique Soul Forge abilities', target: 5, category: 'progression', tier: 'rare', reward: { xp: 5000, gold: 1000 }, icon: 'crit' },
    { id: 'soulforge_2', title: 'Essence Master', desc: 'Earn 10,000 total Soul Essence', target: 10000, category: 'progression', tier: 'epic', reward: { xp: 20000, gold: 5000 }, icon: 'crit' },

    { id: 'quests_1', title: 'Errand Runner', desc: 'Complete 10 quests', target: 10, category: 'progression', tier: 'common', reward: { xp: 1000, gold: 200 }, icon: 'questScroll' },
    { id: 'quests_2', title: 'Hero of Legend', desc: 'Complete 100 quests', target: 100, category: 'progression', tier: 'rare', reward: { xp: 20000, gold: 5000 }, icon: 'questScroll' },
    { id: 'quests_3', title: 'World Reformer', desc: 'Complete 250 quests', target: 250, category: 'progression', tier: 'epic', reward: { xp: 50000, gold: 10000 }, icon: 'questScroll' },
    { id: 'quests_4', title: 'Lorekeeper', desc: 'Complete 500 quests', target: 500, category: 'progression', tier: 'legendary', reward: { xp: 100000, gold: 20000 }, icon: 'questScroll' },

    { id: 'distance_1', title: 'Traveler', desc: 'Travel 5,000 meters', target: 5000, category: 'progression', tier: 'common', reward: { xp: 1000, gold: 200 }, icon: 'mapPin' },
    { id: 'distance_2', title: 'World Walker', desc: 'Travel 50,000 meters', target: 50000, category: 'progression', tier: 'rare', reward: { xp: 10000, gold: 2000 }, icon: 'mapPin' },
    { id: 'distance_3', title: 'Globetrotter', desc: 'Travel 250,000 meters', target: 250000, category: 'progression', tier: 'epic', reward: { xp: 50000, gold: 10000 }, icon: 'mapPin' },

    // ── Mastery ──
    { id: 'enhance_1', title: 'First Polish', desc: 'Successfully enhance an item', target: 1, category: 'progression', tier: 'common', reward: { xp: 200, gold: 50 }, icon: 'upgradeAnvil' },
    { id: 'enhance_2', title: 'Master Smith', desc: 'Successfully enhance items 100 times', target: 100, category: 'progression', tier: 'rare', reward: { xp: 10000, gold: 2000 }, icon: 'upgradeAnvil' },
    { id: 'enhance_3', title: 'God Smith', desc: 'Successfully enhance items 500 times', target: 500, category: 'progression', tier: 'epic', reward: { xp: 50000, gold: 10000 }, icon: 'upgradeAnvil' },

    { id: 'events_1', title: 'Civic Duty', desc: 'Complete 25 world events', target: 25, category: 'progression', tier: 'rare', reward: { xp: 3000, gold: 500 }, icon: 'eventStar' },
    { id: 'events_2', title: 'Pillar of the Community', desc: 'Complete 250 world events', target: 250, category: 'progression', tier: 'epic', reward: { xp: 25000, gold: 5000 }, icon: 'eventStar' },

    { id: 'skills_1', title: 'Skill Initiate', desc: 'Use skills 100 times', target: 100, category: 'progression', tier: 'common', reward: { xp: 500, gold: 50 }, icon: 'lightning' },
    { id: 'skills_2', title: 'Grandmaster', desc: 'Use skills 5,000 times', target: 5000, category: 'progression', tier: 'rare', reward: { xp: 10000, gold: 1000 }, icon: 'lightning' },
    { id: 'skills_3', title: 'Absolute Unit', desc: 'Use skills 25,000 times', target: 25000, category: 'progression', tier: 'epic', reward: { xp: 50000, gold: 5000 }, icon: 'lightning' },
    
    // ── Social & Interaction ──
    { id: 'clicks_1', title: 'Click Happy', desc: 'Interact with the world 100 times', target: 100, category: 'social', tier: 'common', reward: { xp: 100, gold: 50 }, icon: 'hand' },
    { id: 'clicks_2', title: 'Aggressive Cursor', desc: 'Interact with the world 1,000 times', target: 1000, category: 'social', tier: 'rare', reward: { xp: 1000, gold: 500 }, icon: 'hand' },
    { id: 'clicks_3', title: 'Obsessive Clicker', desc: 'Interact with the world 10,000 times', target: 10000, category: 'social', tier: 'epic', reward: { xp: 5000, gold: 2500 }, icon: 'hand' },
    { id: 'menus_1', title: 'Inspector', desc: 'Open menus 25 times', target: 25, category: 'social', tier: 'common', reward: { xp: 250, gold: 100 }, icon: 'settingsGear' },
    { id: 'menus_2', title: 'Menu Crawler', desc: 'Open menus 250 times', target: 250, category: 'social', tier: 'rare', reward: { xp: 2500, gold: 1000 }, icon: 'settingsGear' },
    { id: 'menus_3', title: 'UI Architect', desc: 'Open menus 1,000 times', target: 1000, category: 'social', tier: 'epic', reward: { xp: 10000, gold: 5000 }, icon: 'settingsGear' },

    // ── Secret ──
    { id: 'death_1', title: 'Learning the Hard Way', desc: 'Experience your first defeat', target: 1, category: 'combat', tier: 'rare', reward: { xp: 100, gold: 0 }, icon: 'skull', secret: true },
    { id: 'death_2', title: 'Persistent Failure', desc: 'Die 25 times', target: 25, category: 'combat', tier: 'epic', reward: { xp: 2500, gold: 0 }, icon: 'skull', secret: true },
    { id: 'death_3', title: 'Immortal Rejection', desc: 'Die 100 times', target: 100, category: 'combat', tier: 'legendary', reward: { xp: 10000, gold: 0 }, icon: 'skull', secret: true },
    { id: 'patient_1', title: 'The Patient One', desc: 'Stay in the starter zone for 30 minutes', target: 1800000, category: 'progression', tier: 'epic', reward: { xp: 5000, gold: 1000 }, icon: 'mapPin', secret: true },
    { id: 'unstuck_1', title: 'Lost & Found', desc: 'Use the Unstuck button', target: 1, category: 'social', tier: 'rare', reward: { xp: 50, gold: 10 }, icon: 'mapPin', secret: true },
    { id: 'lucky_charm_1', title: 'Fortuitous Finding', desc: 'Earn an Aetherbit from a regular mob (rare)', target: 1, category: 'wealth', tier: 'epic', reward: { xp: 1000, gold: 100 }, icon: 'aetherbit', secret: true },

];

class AchievementManager {
    constructor() {
        this.completedIds = new Set();
        this.notifications = []; // { achievement, time }
    }

    reset() {
        this.completedIds = new Set();
        this.notifications = [];
    }

    /** Returns the current value of the stat associated with an achievement */
    getStatValue(id) {
        if (id.startsWith('kills_')) return gameState.totalMobsKilled;
        if (id.startsWith('mastery_')) return (companionSystem.getDiscoveredList().filter(c => c.isUnlocked).length);
        if (id.startsWith('mobs_zone_1')) return (gameState.mobsKilledByZone ? gameState.mobsKilledByZone['verdant_wilds'] : 0);
        if (id.startsWith('mobs_zone_2')) return (gameState.mobsKilledByZone ? gameState.mobsKilledByZone['shattered_expanse'] : 0);
        if (id.startsWith('mobs_zone_3')) return (gameState.mobsKilledByZone ? gameState.mobsKilledByZone['blistering_sands'] : 0);
        if (id.startsWith('mobs_zone_4')) return (gameState.mobsKilledByZone ? gameState.mobsKilledByZone['whispering_void'] : 0);
        if (id.startsWith('gold_')) return gameState.totalGoldGained;
        if (id.startsWith('crits_')) return gameState.totalCrits || 0;
        if (id.startsWith('bosses_')) return gameState.defeatedBosses.size;
        
        // Endgame Stats
        if (id.startsWith('dungeons_')) {
            let total = 0;
            for (const key in dungeonSystem.clearsByDungeonId) total += dungeonSystem.clearsByDungeonId[key];
            return total;
        }
        if (id.startsWith('raids_')) {
            let total = 0;
            for (const key in raidSystem.clearsByRaidId) total += raidSystem.clearsByRaidId[key];
            return total;
        }
        if (id.startsWith('raid_pts_')) return raidSystem.totalRaidPointsEarned || 0;

        // Conquest Stats
        if (id.startsWith('pvp_wins_')) return battlegroundSystem.stats.wins || 0;
        if (id.startsWith('pvp_kills_')) return battlegroundSystem.stats.kills || 0;
        if (id.startsWith('pvp_pts_')) return battlegroundSystem.stats.totalVictoryPointsEarned || 0;

        if (id.startsWith('spending_')) return gameState.totalGoldSpent || 0;
        if (id.startsWith('selling_')) return gameState.totalItemsSold || 0;
        if (id.startsWith('looted_')) return gameState.totalItemsLooted || 0;
        if (id.startsWith('levels_')) return gameState.level;
        if (id.startsWith('paragon_')) return gameState.paragonLevel;
        if (id.startsWith('quests_')) return questLog.totalQuestsCompleted;
        if (id.startsWith('distance_')) return Math.floor(gameState.totalDistanceTraveled || 0);
        if (id.startsWith('enhance_')) return gameState.totalItemsEnhanced || 0;
        if (id.startsWith('events_')) return gameState.totalEventsCompleted;
        if (id.startsWith('skills_')) return gameState.totalSkillsUsed || 0;
        
        // Soul Forge Stats
        if (id.startsWith('soulforge_1')) return soulForge.getSpecAbilities().filter(a => a.unlocked).length;
        if (id.startsWith('soulforge_2')) return soulForge.totalSoulEssenceEarned || 0;

        if (id.startsWith('clicks_')) return gameState.totalClicks || 0;
        if (id.startsWith('menus_')) return gameState.totalMenuOpens || 0;
        if (id.startsWith('death_')) return gameState.totalDeaths || 0;
        if (id.startsWith('patient_')) return gameState.totalTimeByZone['verdant_wilds'] || 0;
        if (id.startsWith('unstuck_')) return gameState.totalUnstuckUsed || 0;
        if (id.startsWith('lucky_charm_')) return gameState.totalRareAetherbitsFound || 0;
        return 0;
    }

    /** Check all achievements for completion */
    checkAll() {
        for (const def of ACHIEVEMENT_DEFS) {
            if (this.completedIds.has(def.id)) continue;
            
            const current = this.getStatValue(def.id);
            if (current >= def.target) {
                this.complete(def);
            }
        }
    }

    complete(def) {
        if (this.completedIds.has(def.id)) return;
        
        this.completedIds.add(def.id);
        
        // Grant rewards
        if (def.reward.xp) gameState.addXp(def.reward.xp);
        if (def.reward.gold) gameState.addGold(def.reward.gold);
        
        // Add to notification queue
        this.notifications.push({
            achievement: def,
            time: Date.now()
        });

        // Trigger UI toast if available
        if (window._showAchievementToast) {
            window._showAchievementToast(def);
        }

        gameState.addGameLog(`ACHIEVEMENT UNLOCKED: ${def.title}! (+${def.reward.xp} XP, +${def.reward.gold}g)`);
    }

    /** Serialize for saving */
    serialize() {
        return {
            completedIds: Array.from(this.completedIds)
        };
    }

    /** Restore from save */
    deserialize(data) {
        if (data && data.completedIds) {
            this.completedIds = new Set(data.completedIds);
        }
    }
}

export const achievementManager = new AchievementManager();
