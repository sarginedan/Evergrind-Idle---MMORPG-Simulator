// Quest Log Manager — automated quest tracking, progression and reward system
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';

class QuestLogManager {
    constructor() {
        // Active quests (can have multiple from different chains in the future)
        this.activeQuests = [];     // { ...questDef, objectives: [{ ...obj, current }] }
        this.completedIds = new Set();
        this.totalQuestsCompleted = 0;

        // Stats tracked across session for the log panel
        this.killsByMobName = {};   // { 'Forest Wurm': 14, ... }
        this.totalHerbsGathered = 0;
        this.totalOreGathered = 0;

        // Notification queue (UI reads and drains)
        this.notifications = [];    // { text, type, time }

        // Defer initial quest acceptance — SaveManager will call initDefaultQuest()
        // if no save exists, or restore quests from save data.
        this._initialized = false;
    }

    reset() {
        this.activeQuests = [];
        this.completedIds = new Set();
        this.totalQuestsCompleted = 0;
        this.killsByMobName = {};
        this.totalHerbsGathered = 0;
        this.totalOreGathered = 0;
        this.notifications = [];
        this._initialized = false;
        this._pendingNext = null;
    }

    /** Called by main.js if no save was loaded, to start the first quest chain. */
    initDefaultQuest() {
        if (this._initialized) return;
        this._initialized = true;
        this.acceptQuestById('vw1');
    }

    // ─── Quest lifecycle ────────────────────────────────────────

    getQuestDef(id) {
        return CONFIG.QUEST_CHAINS.find(q => q.id === id);
    }

    /**
     * Returns true if a quest's zone has been outleveled by the player.
     * Conditions:
     *   - Player level is ABOVE the zone's max level range
     *   - The zone boss has been defeated
     *   - Endgame is NOT active (endgame scales all zones to 60)
     * When true, no new quests should be given for that zone.
     */
    _isQuestZoneOutleveled(questDef) {
        if (!questDef) return false;
        if (gameState.endgameComplete) return false; // endgame = all zones relevant
        // Resolve zone name to zone config
        const zone = CONFIG.ZONES.find(z => z.name === questDef.zone);
        if (!zone) return false;
        if (gameState.level <= zone.levelRange[1]) return false; // still within range
        // Boss must be defeated for the zone to count as "done"
        const boss = CONFIG.getBossForZone(zone.id);
        if (boss && !gameState.defeatedBosses.has(zone.id)) return false;
        return true;
    }

    acceptQuestById(id) {
        const def = this.getQuestDef(id);
        if (!def) return;

        // ── Duplicate guard: never accept a quest that's already active or completed ──
        if (this.completedIds.has(id)) return;
        if (this.activeQuests.some(q => q.id === id)) return;

        // ── Outleveled zone guard: don't accept NEW quests in zones the player has outgrown ──
        // (Boss quests are exempt — they're the zone capstone and may still be needed)
        if (!def.isBossQuest && this._isQuestZoneOutleveled(def)) return;

        // ── Boss quest guard: only accept if the zone's story chain is actually done ──
        if (def.isBossQuest) {
            // Find the boss config that references this quest
            for (const [zoneId, bossConfig] of Object.entries(CONFIG.ZONE_BOSSES)) {
                if (bossConfig.questId === id) {
                    // Verify the last story quest before the boss is completed
                    if (bossConfig.storyEndQuestId && !this.completedIds.has(bossConfig.storyEndQuestId)) {
                        console.warn(`⚠ Boss quest ${id} blocked — story quest ${bossConfig.storyEndQuestId} not completed yet.`);
                        return;
                    }
                    break;
                }
            }
        }

        // Deep-clone objectives so we can mutate current
        const quest = {
            ...def,
            objectives: def.objectives.map(o => ({ ...o, current: 0 })),
            accepted: Date.now(),
            completed: false,
        };
        this.activeQuests.push(quest);
        this.notify(`Quest Accepted: ${quest.name}`, 'accept');
        gameState.addGameLog(`Quest accepted — "${quest.name}"`);
        gameState.addChatMessage('Game', 'System', `New quest: ${quest.name}`);
    }

    completeQuest(quest) {
        quest.completed = true;
        this.completedIds.add(quest.id);
        this.totalQuestsCompleted++;

        // Pay rewards (scale with level for repeating quests)
        const scale = 1 + (gameState.level - 1) * 0.05;
        const xp  = Math.floor(quest.rewards.xp * scale);
        const gold = Math.floor(quest.rewards.gold * scale);
        const karma = Math.floor(quest.rewards.karma * scale);

        gameState.addXp(xp);
        gameState.addGold(gold);
        gameState.addKarma(karma);

        this.notify(`Quest Complete: ${quest.name}  (+${xp} XP, +${gold}g, +${karma} Aetherbits)`, 'complete');
        gameState.addGameLog(`Quest complete — "${quest.name}" +${xp} XP, +${gold}g, +${karma} Aetherbits`);
        gameState.addChatMessage('Game', 'System', `Quest "${quest.name}" completed! 🎉`);

        // Remove from active list
        this.activeQuests = this.activeQuests.filter(q => q !== quest);

        // Auto-accept next quest in chain (if level requirement met, otherwise queue it)
        if (quest.next) {
            const nextDef = this.getQuestDef(quest.next);
            if (nextDef) {
                // ── Outleveled zone check: don't start new quests in outgrown zones ──
                if (!nextDef.isBossQuest && this._isQuestZoneOutleveled(nextDef)) {
                    gameState.addGameLog(`No new quests available — you've outleveled this zone. Travel to a higher-level zone!`);
                    gameState.addChatMessage('Game', 'System', '⚠ Zone outleveled — move on to a new zone for quests & XP!');
                } else if (gameState.level >= nextDef.levelReq) {
                    this.acceptQuestById(quest.next);
                } else {
                    // Store pending so we can check on level-up
                    this._pendingNext = quest.next;
                }
            }
        }
    }

    // ─── Event dispatch (called by game systems) ─────────────────

    onMobKilled(mobTypeName) {
        this.killsByMobName[mobTypeName] = (this.killsByMobName[mobTypeName] || 0) + 1;

        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type === 'kill_any') {
                    obj.current = Math.min(obj.target, obj.current + 1);
                } else if (obj.type === 'kill_type' && obj.mobName === mobTypeName) {
                    obj.current = Math.min(obj.target, obj.current + 1);
                }
            }
            this.checkQuestComplete(quest);
        }
    }

    onGathered(gatherType) { // 'herb' | 'ore'
        if (gatherType === 'herb') this.totalHerbsGathered++;
        else this.totalOreGathered++;

        const objType = gatherType === 'herb' ? 'gather_herb' : 'gather_ore';

        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type === objType) {
                    obj.current = Math.min(obj.target, obj.current + 1);
                }
            }
            this.checkQuestComplete(quest);
        }
    }

    /** Called when a mob dies — check if it drops quest items for active quests */
    onMobKilledForDrops(mobTypeName) {
        for (const [dropId, dropDef] of Object.entries(CONFIG.QUEST_ITEM_DROPS)) {
            // Check if this mob is a valid source for this drop
            if (!dropDef.dropSources.includes(mobTypeName)) continue;

            // Check if any active quest needs this drop
            let needed = false;
            for (const quest of this.activeQuests) {
                if (quest.completed) continue;
                for (const obj of quest.objectives) {
                    if (obj.type === 'collect_drop' && obj.dropId === dropId && obj.current < obj.target) {
                        needed = true;
                        break;
                    }
                }
                if (needed) break;
            }
            if (!needed) continue;

            // Roll for drop
            if (Math.random() > dropDef.dropChance) continue;

            // Award the drop to matching objectives
            for (const quest of this.activeQuests) {
                if (quest.completed) continue;
                for (const obj of quest.objectives) {
                    if (obj.current >= obj.target) continue;
                    if (obj.type === 'collect_drop' && obj.dropId === dropId) {
                        obj.current = Math.min(obj.target, obj.current + 1);
                        gameState.addGameLog(`Obtained ${dropDef.name}! (${obj.current}/${obj.target})`);
                    }
                }
                this.checkQuestComplete(quest);
            }
        }
    }

    /** Called when a world pickup is collected (flower, orchid, shard, etc.) */
    onPickupCollected(pickupId) {
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type === 'collect_pickup' && obj.pickupId === pickupId) {
                    obj.current = Math.min(obj.target, obj.current + 1);
                }
            }
            this.checkQuestComplete(quest);
        }
    }

    /** Called when a zone boss is killed */
    onBossKilled(zoneId) {
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type === 'kill_boss' && obj.bossZone === zoneId) {
                    obj.current = Math.min(obj.target, obj.current + 1);
                }
            }
            this.checkQuestComplete(quest);
        }
    }

    onLevelUp() {
        // Check if a pending quest can now be accepted
        if (this._pendingNext) {
            const def = this.getQuestDef(this._pendingNext);
            if (def && gameState.level >= def.levelReq) {
                // Don't accept pending quests for zones the player has now outgrown
                if (!def.isBossQuest && this._isQuestZoneOutleveled(def)) {
                    this._pendingNext = null; // clear — zone is outleveled
                } else {
                    this.acceptQuestById(this._pendingNext);
                    // Clear pending regardless — if it was blocked (duplicate/boss guard),
                    // the normal chain progression will re-queue it when appropriate
                    this._pendingNext = null;
                }
            }
        }
    }

    /** Called when the player enters a new zone — starts zone quest chain if needed */
    onZoneEnter(zoneId) {
        // ── Outleveled zone check: don't start quest chains in outgrown zones ──
        const zone = CONFIG.ZONES.find(z => z.id === zoneId);
        if (zone && !gameState.endgameComplete && gameState.level > zone.levelRange[1]) {
            const boss = CONFIG.getBossForZone(zoneId);
            if (!boss || gameState.defeatedBosses.has(zoneId)) {
                // Zone is outleveled — don't offer new quests
                return;
            }
        }

        // Find the first quest for this zone
        const zoneQuests = CONFIG.QUEST_CHAINS.filter(q => {
            const z = CONFIG.ZONES.find(z => z.name === q.zone);
            return z && z.id === zoneId;
        });
        if (zoneQuests.length === 0) return;

        // Check if we already have an active quest for this zone
        const hasActiveZoneQuest = this.activeQuests.some(aq => {
            return zoneQuests.some(zq => zq.id === aq.id);
        });
        if (hasActiveZoneQuest) return;

        // Check if we've completed any quests in this zone
        const completedZoneQuests = zoneQuests.filter(q => this.completedIds.has(q.id));
        
        if (completedZoneQuests.length === 0) {
            // Never started this zone — begin at quest 1
            const firstQuest = zoneQuests[0];
            if (firstQuest && gameState.level >= firstQuest.levelReq) {
                this.acceptQuestById(firstQuest.id);
            }
        } else {
            // Find the next quest in the chain that hasn't been completed
            for (const q of completedZoneQuests) {
                if (q.next && !this.completedIds.has(q.next)) {
                    const nextDef = this.getQuestDef(q.next);
                    if (nextDef && gameState.level >= nextDef.levelReq) {
                        this.acceptQuestById(q.next);
                        return;
                    }
                }
            }
        }
    }

    checkQuestComplete(quest) {
        const allDone = quest.objectives.every(o => o.current >= o.target);
        if (allDone && !quest.completed) {
            this.completeQuest(quest);
        }
    }

    // ─── Notification helpers ────────────────────────────────────

    notify(text, type = 'info') {
        this.notifications.push({ text, type, time: Date.now() });
        if (this.notifications.length > 10) this.notifications.shift();
    }

    /** Drain notifications older than `ms`. Returns removed items. */
    drainNotifications(ms = 5000) {
        const cutoff = Date.now() - ms;
        const expired = this.notifications.filter(n => n.time < cutoff);
        this.notifications = this.notifications.filter(n => n.time >= cutoff);
        return expired;
    }

    // ─── Helpers for AI targeting ────────────────────────────────

    /** Returns a Set of mob names that the player should prioritize killing for active quest objectives */
    getNeededMobNames() {
        const needed = new Set();
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                // Direct kill objectives
                if (obj.type === 'kill_type' && obj.mobName) {
                    needed.add(obj.mobName);
                }
                // kill_any — any mob counts, no specific name needed (handled differently)
                // Collect drop objectives — find which mobs drop the needed item
                if (obj.type === 'collect_drop' && obj.dropId) {
                    const dropDef = CONFIG.QUEST_ITEM_DROPS[obj.dropId];
                    if (dropDef) {
                        for (const src of dropDef.dropSources) needed.add(src);
                    }
                }
            }
        }
        return needed;
    }

    /** Returns a Set of pickup IDs needed by active quest objectives */
    getNeededPickupIds() {
        const needed = new Set();
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type === 'collect_pickup' && obj.pickupId) {
                    needed.add(obj.pickupId);
                }
            }
        }
        return needed;
    }

    /** Returns true if the active quest only has kill_any objectives remaining */
    hasOnlyKillAnyRemaining() {
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type !== 'kill_any') return false;
            }
        }
        return true;
    }

    /** Returns true if any active quest has collect_drop objectives not yet met.
     *  Used by IdleEngine to strongly prioritize mob-killing for item drops. */
    hasDropObjectivesRemaining() {
        for (const quest of this.activeQuests) {
            if (quest.completed) continue;
            for (const obj of quest.objectives) {
                if (obj.current >= obj.target) continue;
                if (obj.type === 'collect_drop') return true;
            }
        }
        return false;
    }

    // ─── Helpers for UI ──────────────────────────────────────────

    getActiveQuests() {
        return this.activeQuests;
    }

    /** Overall % across all active objectives */
    getOverallProgress() {
        let cur = 0, total = 0;
        for (const q of this.activeQuests) {
            for (const o of q.objectives) {
                cur += o.current;
                total += o.target;
            }
        }
        return total === 0 ? 100 : Math.floor((cur / total) * 100);
    }

    getKillStats() {
        return { ...this.killsByMobName };
    }
}

export const questLog = new QuestLogManager();
