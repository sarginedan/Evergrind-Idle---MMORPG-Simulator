// Talent Tree System — WoW-inspired three-spec deep talent trees
// Aetherblade class with Stormcleave (Fury), Ironward (Protection), Voidedge (Arcane)
//
// Design (v2 — proper WoW-depth economy):
//   59 points total (level 2→60). Each tree costs 51 points to max.
//   Player can max 1 tree + ~8 points into a second tree's tier 1.
//   Player CANNOT meaningfully invest in all three trees.
//   5 tiers per tree gated by cumulative point thresholds (0, 8, 20, 35, 45).
//   Each tree grants 2 talent abilities at milestone points spent in that tree.
//
// Talent abilities use the 4-slot bar to the right of the main action bar

// Late-bound to avoid circular dependency with GameState
let _gameState = null;
export function bindGameState(gs) { _gameState = gs; }

// ══════════════════════════════════════════════════════════════════════
// TALENT ABILITY DEFINITIONS — Unlocked via talent tree milestones
// ══════════════════════════════════════════════════════════════════════

export const TALENT_ABILITIES = {
    // ── Stormcleave Abilities ──
    flash_strike: {
        id: 'flash_strike',
        name: 'Flash Strike',
        iconKey: 'flashStrike',
        description: 'A lightning-fast lunge dealing 150% weapon damage with a very short cooldown.',
        cooldown: 6, dpsMultiplier: 1.5, manaCost: 8,
        nameColor: '#44aaff', tree: 'stormcleave',
        unlockReq: 5,
    },
    storm_bolt: {
        id: 'storm_bolt',
        name: 'Storm Bolt',
        iconKey: 'stormBolt',
        description: 'Hurl a crackling bolt of lightning at your foe, dealing 220% weapon damage.',
        cooldown: 12, dpsMultiplier: 2.2, manaCost: 14,
        nameColor: '#44aaff', tree: 'stormcleave',
        unlockReq: 15, // points spent in tree
    },
    tempest_strike: {
        id: 'tempest_strike',
        name: 'Tempest Strike',
        iconKey: 'tempestStrike',
        description: 'Channel a devastating tempest through your blade, dealing 400% weapon damage and stunning the target.',
        cooldown: 25, dpsMultiplier: 4.0, manaCost: 24,
        nameColor: '#44aaff', tree: 'stormcleave',
        unlockReq: 35,
    },
    stormlords_wrath: {
        id: 'stormlords_wrath',
        name: "Stormlord's Wrath",
        iconKey: 'stormlordsWrath',
        description: 'Summon the ultimate power of the storm, dealing 750% weapon damage to all nearby enemies.',
        cooldown: 50, dpsMultiplier: 7.5, manaCost: 45,
        nameColor: '#44aaff', tree: 'stormcleave',
        unlockReq: 51,
        isAoE: true, aoeRange: 12,
    },
    // ── Ironward Abilities ──
    iron_skin: {
        id: 'iron_skin',
        name: 'Iron Skin',
        iconKey: 'ironSkin',
        description: 'Instantly restores 12% max HP and increases armor by 25% for 6s.',
        cooldown: 10, dpsMultiplier: 0, manaCost: 10,
        buffType: 'defense', buffDuration: 6, buffValue: 0.75, // 25% reduction
        nameColor: '#ddaa44', tree: 'ironward',
        unlockReq: 5,
        isDefensive: true, hpThreshold: 0.85,
    },
    shield_wall: {
        id: 'shield_wall',
        name: 'Shield Wall',
        iconKey: 'shieldWall',
        description: 'Raise an impenetrable shield wall, reducing all damage taken by 65% for 8s.',
        cooldown: 18, dpsMultiplier: 0, manaCost: 16,
        buffType: 'defense', buffDuration: 8, buffValue: 0.35,
        nameColor: '#ddaa44', tree: 'ironward',
        unlockReq: 15,
        isDefensive: true, hpThreshold: 0.6,
    },
    rallying_cry: {
        id: 'rallying_cry',
        name: 'Rallying Cry',
        iconKey: 'rallyingCry',
        description: 'Let out a thunderous war cry that instantly restores 35% of max HP and increases regen by 200% for 12s.',
        cooldown: 30, dpsMultiplier: 0, manaCost: 20,
        buffType: 'heal_regen', buffDuration: 12,
        nameColor: '#ddaa44', tree: 'ironward',
        unlockReq: 35,
        isDefensive: true, hpThreshold: 0.4,
    },
    sentinels_resolve: {
        id: 'sentinels_resolve',
        name: "Sentinel's Resolve",
        iconKey: 'sentinelsResolve',
        description: 'Enter a state of total resolve. Immortality for 4s and reflects 50% of damage taken.',
        cooldown: 60, dpsMultiplier: 0, manaCost: 40,
        buffType: 'defense', buffDuration: 4, buffValue: 0, // 100% reduction
        nameColor: '#ddaa44', tree: 'ironward',
        unlockReq: 51,
        isDefensive: true, hpThreshold: 0.25,
    },
    // ── Voidedge Abilities ──
    ether_siphon: {
        id: 'ether_siphon',
        name: 'Ether Siphon',
        iconKey: 'etherSiphon',
        description: 'Drain energy from the void, dealing 180% spell damage and restoring 15% max mana.',
        cooldown: 8, dpsMultiplier: 1.8, manaCost: 0,
        nameColor: '#bb66ff', tree: 'voidedge',
        unlockReq: 5,
        isUtility: true, manaThreshold: 0.7,
    },
    void_lance: {
        id: 'void_lance',
        name: 'Void Lance',
        iconKey: 'voidLance',
        description: 'Pierce your enemy with a lance of concentrated void energy, dealing 280% spell damage.',
        cooldown: 10, dpsMultiplier: 2.8, manaCost: 18,
        nameColor: '#bb66ff', tree: 'voidedge',
        unlockReq: 15,
    },
    oblivion_nova: {
        id: 'oblivion_nova',
        name: 'Oblivion Nova',
        iconKey: 'oblivionNova',
        description: 'Detonate a sphere of void energy at your location, dealing 450% spell damage to all enemies.',
        cooldown: 28, dpsMultiplier: 4.5, manaCost: 28,
        nameColor: '#bb66ff', tree: 'voidedge',
        unlockReq: 35,
        isAoE: true, aoeRange: 10,
    },
    singularity: {
        id: 'singularity',
        name: 'Singularity',
        iconKey: 'singularity',
        description: 'Collapse the void into a single point, dealing 850% spell damage and resetting all other talent cooldowns.',
        cooldown: 60, dpsMultiplier: 8.5, manaCost: 50,
        nameColor: '#bb66ff', tree: 'voidedge',
        unlockReq: 51,
        isAoE: true, aoeRange: 15,
    },
    // ── Abyssal Abilities ──
    shadow_fiend: {
        id: 'shadow_fiend',
        name: 'Shadow Fiend',
        iconKey: 'shadowFiend',
        description: 'Summon a shadow fiend that deals 180% weapon damage every 2 seconds for 10s.',
        cooldown: 20, dpsMultiplier: 1.8, manaCost: 15,
        nameColor: '#8844cc', tree: 'abyssal',
        unlockReq: 5,
    },
    void_shackle: {
        id: 'void_shackle',
        name: 'Void Shackle',
        iconKey: 'voidShackle',
        description: 'Bind your enemy in void chains, stunning them and dealing 250% spell damage over 4s.',
        cooldown: 15, dpsMultiplier: 2.5, manaCost: 20,
        nameColor: '#8844cc', tree: 'abyssal',
        unlockReq: 15,
    },
    leeching_touch: {
        id: 'leeching_touch',
        name: 'Leeching Touch',
        iconKey: 'leechingTouch',
        description: 'Cursed touch that deals 350% spell damage and heals you for 50% of the damage dealt.',
        cooldown: 12, dpsMultiplier: 3.5, manaCost: 25,
        nameColor: '#8844cc', tree: 'abyssal',
        unlockReq: 35,
    },
    dark_ascension: {
        id: 'dark_ascension',
        name: 'Dark Ascension',
        iconKey: 'darkAscension',
        description: 'Transform into a void avatar, increasing all shadow damage by 50% and restoring 5% HP/sec for 15s.',
        cooldown: 75, dpsMultiplier: 0, manaCost: 40,
        buffType: 'damage', buffDuration: 15, buffValue: 1.5,
        nameColor: '#8844cc', tree: 'abyssal',
        unlockReq: 51,
    },
    // ── Sharpshot Abilities ──
    trueshot: {
        id: 'trueshot',
        name: 'Trueshot',
        iconKey: 'trueshot',
        description: 'Passive: Increases critical strike chance by 10%. Active: Next 3 shots are guaranteed crits.',
        cooldown: 20, dpsMultiplier: 0, manaCost: 15,
        buffType: 'damage', buffDuration: 8, buffValue: 1.4,
        nameColor: '#44dd66', tree: 'sharpshot',
        unlockReq: 5,
    },
    piercing_arrow: {
        id: 'piercing_arrow',
        name: 'Piercing Arrow',
        iconKey: 'piercingArrow',
        description: 'Fire a massive arrow that pierces through all enemies, dealing 300% damage.',
        cooldown: 12, dpsMultiplier: 3.0, manaCost: 20,
        nameColor: '#44dd66', tree: 'sharpshot',
        unlockReq: 15,
        isAoE: true, aoeRange: 15,
    },
    cluster_trap: {
        id: 'cluster_trap',
        name: 'Cluster Trap',
        iconKey: 'clusterTrap',
        description: 'Deploy a cluster of traps that detonate on impact, dealing 450% damage to nearby enemies.',
        cooldown: 25, dpsMultiplier: 4.5, manaCost: 30,
        nameColor: '#44dd66', tree: 'sharpshot',
        unlockReq: 35,
        isAoE: true, aoeRange: 8,
    },
    barrage: {
        id: 'barrage',
        name: 'Barrage',
        iconKey: 'barrage',
        description: 'Unleash a continuous stream of arrows for 4s, dealing 900% weapon damage total.',
        cooldown: 50, dpsMultiplier: 9.0, manaCost: 50,
        nameColor: '#44dd66', tree: 'sharpshot',
        unlockReq: 51,
        isAoE: true, aoeRange: 12,
    },
    // ── Radiance Abilities (Dawnkeeper — Holy DPS) ──
    divine_lance: {
        id: 'divine_lance',
        name: 'Divine Lance',
        iconKey: 'divineLance',
        description: 'Hurl a lance of concentrated sunlight, dealing 160% holy damage and reducing enemy defense.',
        cooldown: 8, dpsMultiplier: 1.6, manaCost: 10,
        nameColor: '#ffcc44', tree: 'radiance',
        unlockReq: 5,
    },
    sunfire_burst: {
        id: 'sunfire_burst',
        name: 'Sunfire Burst',
        iconKey: 'sunfireBurst',
        description: 'Detonate a sphere of radiant sunfire, dealing 260% holy damage to all nearby enemies.',
        cooldown: 14, dpsMultiplier: 2.6, manaCost: 18,
        nameColor: '#ffcc44', tree: 'radiance',
        unlockReq: 15,
        isAoE: true, aoeRange: 10,
    },
    judgment_hammer: {
        id: 'judgment_hammer',
        name: 'Judgment Hammer',
        iconKey: 'judgmentHammer',
        description: 'Call down a massive hammer of divine judgment, dealing 420% holy damage and stunning the target.',
        cooldown: 26, dpsMultiplier: 4.2, manaCost: 28,
        nameColor: '#ffcc44', tree: 'radiance',
        unlockReq: 35,
    },
    dawn_avatar: {
        id: 'dawn_avatar',
        name: 'Avatar of Dawn',
        iconKey: 'dawnAvatar',
        description: 'Ascend to become an avatar of pure sunlight, increasing all damage by 65% and all healing by 100% for 15s.',
        cooldown: 65, dpsMultiplier: 0, manaCost: 45,
        buffType: 'damage', buffDuration: 15, buffValue: 1.65,
        nameColor: '#ffcc44', tree: 'radiance',
        unlockReq: 51,
    },
    // ── Bastion Abilities (Dawnkeeper — Divine Protection) ──
    blessed_shield: {
        id: 'blessed_shield',
        name: 'Blessed Shield',
        iconKey: 'blessedShield',
        description: 'Conjure a holy shield that absorbs damage and restores 10% max HP.',
        cooldown: 12, dpsMultiplier: 0, manaCost: 12,
        buffType: 'defense', buffDuration: 6, buffValue: 0.7,
        nameColor: '#ffaa22', tree: 'bastion',
        unlockReq: 5,
        isDefensive: true, hpThreshold: 0.8,
    },
    holy_bulwark: {
        id: 'holy_bulwark',
        name: 'Holy Bulwark',
        iconKey: 'holyBulwark',
        description: 'Erect a massive divine barrier, reducing all damage taken by 70% for 8s.',
        cooldown: 20, dpsMultiplier: 0, manaCost: 18,
        buffType: 'defense', buffDuration: 8, buffValue: 0.3,
        nameColor: '#ffaa22', tree: 'bastion',
        unlockReq: 15,
        isDefensive: true, hpThreshold: 0.55,
    },
    prayer_of_healing: {
        id: 'prayer_of_healing',
        name: 'Prayer of Healing',
        iconKey: 'prayerOfHealing',
        description: 'Channel a divine prayer that instantly restores 40% of max HP and increases regen by 250% for 12s.',
        cooldown: 32, dpsMultiplier: 0, manaCost: 22,
        buffType: 'heal_regen', buffDuration: 12,
        nameColor: '#ffaa22', tree: 'bastion',
        unlockReq: 35,
        isDefensive: true, hpThreshold: 0.35,
    },
    divine_aegis: {
        id: 'divine_aegis',
        name: 'Divine Aegis',
        iconKey: 'divineAegis',
        description: 'Invoke the ultimate divine protection. Complete immunity for 5s and reflects 40% of damage taken.',
        cooldown: 70, dpsMultiplier: 0, manaCost: 45,
        buffType: 'defense', buffDuration: 5, buffValue: 0,
        nameColor: '#ffaa22', tree: 'bastion',
        unlockReq: 51,
        isDefensive: true, hpThreshold: 0.2,
    },
    // ── Wildheart Abilities ──
    wolf_pack: {
        id: 'wolf_pack',
        name: 'Wolf Pack',
        iconKey: 'wolfPack',
        description: 'Summon a pack of spectral wolves to ravage the target, dealing 200% damage and bleeding them.',
        cooldown: 18, dpsMultiplier: 2.0, manaCost: 15,
        nameColor: '#88dd44', tree: 'wildheart',
        unlockReq: 5,
    },
    mending_vines: {
        id: 'mending_vines',
        name: 'Mending Vines',
        iconKey: 'mendingVines',
        description: 'Nature wraps around you, restoring 25% max HP and increasing movement speed.',
        cooldown: 25, dpsMultiplier: 0, manaCost: 20,
        buffType: 'heal_regen', buffDuration: 10,
        nameColor: '#88dd44', tree: 'wildheart',
        unlockReq: 15,
        isDefensive: true, hpThreshold: 0.5,
    },
    poison_cloud: {
        id: 'poison_cloud',
        name: 'Poison Cloud',
        iconKey: 'poisonCloud',
        description: 'Create a toxic cloud that deals 100% spell damage every second for 6 seconds.',
        cooldown: 30, dpsMultiplier: 6.0, manaCost: 35,
        nameColor: '#88dd44', tree: 'wildheart',
        unlockReq: 35,
        isAoE: true, aoeRange: 10,
    },
    avatar_of_nature: {
        id: 'avatar_of_nature',
        name: 'Avatar of Nature',
        iconKey: 'avatarOfNature',
        description: 'Become one with the forest, increasing damage by 60% and restoring 8% HP per second for 15s.',
        cooldown: 80, dpsMultiplier: 0, manaCost: 60,
        buffType: 'damage', buffDuration: 15, buffValue: 1.6,
        nameColor: '#88dd44', tree: 'wildheart',
        unlockReq: 51,
    },
};

// ══════════════════════════════════════════════════════════════════════
// BRANCH DEFINITIONS — 5 tiers per tree, deep WoW-style investment
// Total per tree: 51 points (Tier1: 15, Tier2: 15, Tier3: 15, Tier4: 5, Capstone: 1)
// ══════════════════════════════════════════════════════════════════════

export const TALENT_BRANCHES = [
    // ── STORMCLEAVE — Fury / Crit / Burst DPS ──
    {
        id: 'stormcleave',
        name: 'Stormcleave',
        class: 'warrior',
        subtitle: 'Fury & Precision',
        description: 'Channel the tempest through your blade. Every strike crackles with lethal potential.',
        iconKey: 'stormcleave',
        color: '#44aaff',
        colorDark: '#1a4488',
        colorGlow: 'rgba(68,170,255,0.4)',
        abilities: ['flash_strike', 'storm_bolt', 'tempest_strike', 'stormlords_wrath'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'sc_t1_1', name: 'Keen Edge', description: '+2% Critical Strike chance per rank.', maxRank: 5, stat: 'critChance', valuePerRank: 0.02 },
                { id: 'sc_t1_2', name: 'Sharpened Steel', description: '+3% physical DPS per rank.', maxRank: 5, stat: 'dpsPercent', valuePerRank: 0.03 },
                { id: 'sc_t1_3', name: 'Swift Strikes', description: '+2% Attack Speed per rank.', maxRank: 5, stat: 'attackSpeed', valuePerRank: 0.02 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity — ABILITY 1 unlocks at 15
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'sc_t2_1', name: 'Storm Surge', description: '+6% Critical Damage per rank.', maxRank: 5, stat: 'critDamage', valuePerRank: 0.06 },
                { id: 'sc_t2_2', name: 'Blade Tempest', description: '+2% Attack Speed per rank.', maxRank: 5, stat: 'attackSpeed', valuePerRank: 0.02 },
                { id: 'sc_t2_3', name: 'Killing Surge', description: 'Kills restore 1.5% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.015 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'sc_t3_1', name: 'Thunder Clap', description: '+3% DPS and +1% Crit per rank.', maxRank: 5, stat: 'capstone_stormA', valuePerRank: 1 },
                { id: 'sc_t3_2', name: 'Relentless Fury', description: '+4% Critical Damage per rank.', maxRank: 5, stat: 'critDamage', valuePerRank: 0.04 },
                { id: 'sc_t3_3', name: 'Blood Frenzy', description: '+2% DPS per rank. Kills restore 1% HP per rank.', maxRank: 5, stat: 'capstone_stormB', valuePerRank: 1 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity — ABILITY 2 unlocks at 35
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'sc_t4_1', name: 'Tempest Mastery', description: '+4% DPS and +3% Crit per rank.', maxRank: 3, stat: 'capstone_stormC', valuePerRank: 1 },
                { id: 'sc_t4_2', name: 'Lethal Precision', description: '+10% Critical Damage per rank.', maxRank: 2, stat: 'critDamage', valuePerRank: 0.10 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'sc_t5_1', name: 'Eye of the Storm', description: 'Capstone: +12% DPS, +8% Crit, +30% Crit Damage.', maxRank: 1, stat: 'capstone_storm', valuePerRank: 1 },
            ]},
        ],
    },

    // ── IRONWARD — Protection / Sustain / Tank ──
    {
        id: 'ironward',
        name: 'Ironward',
        class: 'warrior',
        subtitle: 'Resilience & Fortitude',
        description: 'Stand unbreakable against any foe. Your armor is your fortress, your will is your shield.',
        iconKey: 'ironward',
        color: '#ddaa44',
        colorDark: '#886622',
        colorGlow: 'rgba(220,170,68,0.4)',
        abilities: ['iron_skin', 'shield_wall', 'rallying_cry', 'sentinels_resolve'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'iw_t1_1', name: 'Iron Skin', description: '+4% Armor effectiveness per rank.', maxRank: 5, stat: 'armorPercent', valuePerRank: 0.04 },
                { id: 'iw_t1_2', name: 'Vitality Surge', description: '+4% Maximum HP per rank.', maxRank: 5, stat: 'hpPercent', valuePerRank: 0.04 },
                { id: 'iw_t1_3', name: 'Thick Skin', description: '+12% HP regeneration rate per rank.', maxRank: 5, stat: 'regenPercent', valuePerRank: 0.12 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity — ABILITY 1 unlocks at 15
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'iw_t2_1', name: 'Regeneration', description: '+15% HP regeneration rate per rank.', maxRank: 5, stat: 'regenPercent', valuePerRank: 0.15 },
                { id: 'iw_t2_2', name: 'Unyielding Will', description: '+2% Armor per rank.', maxRank: 5, stat: 'armorPercent', valuePerRank: 0.02 },
                { id: 'iw_t2_3', name: 'Fortified Defense', description: 'Buffs last 8% longer per rank.', maxRank: 5, stat: 'buffDurationPercent', valuePerRank: 0.08 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'iw_t3_1', name: 'Stone Bulwark', description: '+4% HP and +3% Armor per rank.', maxRank: 5, stat: 'capstone_ironA', valuePerRank: 1 },
                { id: 'iw_t3_2', name: 'Indomitable', description: '+10% HP regen and +3% HP per rank.', maxRank: 5, stat: 'capstone_ironB', valuePerRank: 1 },
                { id: 'iw_t3_3', name: 'Second Wind', description: 'Kills restore 2% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.02 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity — ABILITY 2 unlocks at 35
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'iw_t4_1', name: 'Juggernaut', description: '+5% HP and +4% Armor per rank.', maxRank: 3, stat: 'capstone_ironC', valuePerRank: 1 },
                { id: 'iw_t4_2', name: 'Last Stand', description: 'Buffs last 15% longer per rank. +15% regen per rank.', maxRank: 2, stat: 'capstone_ironD', valuePerRank: 1 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'iw_t5_1', name: 'Unbreakable', description: 'Capstone: +15% HP, +15% Armor, +50% HP regen.', maxRank: 1, stat: 'capstone_iron', valuePerRank: 1 },
            ]},
        ],
    },

    // ── VOIDEDGE — Arcane / Ability Power / Cooldowns ──
    {
        id: 'voidedge',
        name: 'Voidedge',
        class: 'mage',
        subtitle: 'Arcane Mastery',
        description: 'Tap into the void between worlds. Your abilities become weapons of devastating power.',
        iconKey: 'voidedge',
        color: '#bb66ff',
        colorDark: '#5522aa',
        colorGlow: 'rgba(187,102,255,0.4)',
        abilities: ['ether_siphon', 'void_lance', 'oblivion_nova', 'singularity'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 've_t1_1', name: 'Mana Well', description: '+4% Maximum Mana per rank.', maxRank: 5, stat: 'manaPercent', valuePerRank: 0.04 },
                { id: 've_t1_2', name: 'Arcane Flow', description: '+10% Mana regeneration per rank.', maxRank: 5, stat: 'manaRegenPercent', valuePerRank: 0.10 },
                { id: 've_t1_3', name: 'Spell Haste', description: '-2% Cooldown reduction per rank.', maxRank: 5, stat: 'cooldownReduction', valuePerRank: 0.02 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity — ABILITY 1 unlocks at 15
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 've_t2_1', name: 'Void Infusion', description: '+4% Skill damage per rank.', maxRank: 5, stat: 'skillDamagePercent', valuePerRank: 0.04 },
                { id: 've_t2_2', name: 'Quickening', description: '-3% Cooldown reduction per rank.', maxRank: 5, stat: 'cooldownReduction', valuePerRank: 0.03 },
                { id: 've_t2_3', name: 'Mana Siphon', description: 'Kills restore 2% max Mana per rank.', maxRank: 5, stat: 'killManaPercent', valuePerRank: 0.02 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 've_t3_1', name: 'Arcane Supremacy', description: '+3% Skill Damage and -2% CDs per rank.', maxRank: 5, stat: 'capstone_voidA', valuePerRank: 1 },
                { id: 've_t3_2', name: 'Void Torrent', description: '+5% Skill Damage per rank.', maxRank: 5, stat: 'skillDamagePercent', valuePerRank: 0.05 },
                { id: 've_t3_3', name: 'Ether Tap', description: '+5% Mana and +8% Mana regen per rank.', maxRank: 5, stat: 'capstone_voidB', valuePerRank: 1 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity — ABILITY 2 unlocks at 35
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 've_t4_1', name: 'Void Mastery', description: '+5% Skill Damage and -3% CDs per rank.', maxRank: 3, stat: 'capstone_voidC', valuePerRank: 1 },
                { id: 've_t4_2', name: 'Nether Surge', description: '+6% Mana and +12% Mana regen per rank.', maxRank: 2, stat: 'capstone_voidD', valuePerRank: 1 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 've_t5_1', name: 'Void Ascension', description: 'Capstone: +15% Skill Damage, -12% CDs, +20% Mana.', maxRank: 1, stat: 'capstone_void', valuePerRank: 1 },
            ]},
        ],
    },
    // ── ABYSSAL — Shadow / DoT / Lifesteal ──
    {
        id: 'abyssal',
        name: 'Abyssal',
        class: 'mage',
        subtitle: 'Shadow & Corruption',
        description: 'Embrace the darkness. Weave shadows that drain the life from your enemies to sustain your own.',
        iconKey: 'abyssal',
        color: '#8844cc',
        colorDark: '#331166',
        colorGlow: 'rgba(136,68,204,0.4)',
        abilities: ['shadow_fiend', 'void_shackle', 'leeching_touch', 'dark_ascension'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'ab_t1_1', name: 'Shadow Weaving', description: '+3% Shadow damage per rank.', maxRank: 5, stat: 'skillDamagePercent', valuePerRank: 0.03 },
                { id: 'ab_t1_2', name: 'Vampiric Touch', description: 'Attacks heal for 0.5% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.005 },
                { id: 'ab_t1_3', name: 'Dark Vitality', description: '+4% Maximum HP per rank.', maxRank: 5, stat: 'hpPercent', valuePerRank: 0.04 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'ab_t2_1', name: 'Corrupting Shadows', description: '+5% Skill damage per rank.', maxRank: 5, stat: 'skillDamagePercent', valuePerRank: 0.05 },
                { id: 'ab_t2_2', name: 'Shadow Cloak', description: '+4% Armor effectiveness per rank.', maxRank: 5, stat: 'armorPercent', valuePerRank: 0.04 },
                { id: 'ab_t2_3', name: 'Soul Siphon', description: 'Kills restore 2% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.02 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'ab_t3_1', name: 'Abyssal Reach', description: '+3% Skill Damage and +2% Crit per rank.', maxRank: 5, stat: 'capstone_voidA', valuePerRank: 1 },
                { id: 'ab_t3_2', name: 'Shadow Form', description: '+6% HP and +5% Armor per rank.', maxRank: 5, stat: 'capstone_ironA', valuePerRank: 1 },
                { id: 'ab_t3_3', name: 'Blood Magic', description: 'Spells heal for 2% of damage dealt per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.02 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'ab_t4_1', name: 'Void Master', description: '+6% Skill Damage and -4% CDs per rank.', maxRank: 3, stat: 'capstone_voidC', valuePerRank: 1 },
                { id: 'ab_t4_2', name: 'Eternal Night', description: '+10% HP and +20% HP regen per rank.', maxRank: 2, stat: 'capstone_ironB', valuePerRank: 1 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'ab_t5_1', name: 'Avatar of the Abyss', description: 'Capstone: +20% Skill Damage, +15% HP, +15% Armor.', maxRank: 1, stat: 'capstone_void', valuePerRank: 1 },
            ]},
        ],
    },

    // ── SHARPSHOT — Ranger / Precision / Ranged DPS ──
    {
        id: 'sharpshot',
        name: 'Sharpshot',
        class: 'ranger',
        subtitle: 'Precision & Range',
        description: 'Master the art of the bow. Every arrow is a death sentence from the shadows.',
        iconKey: 'sharpshot',
        color: '#44dd66',
        colorDark: '#1a6622',
        colorGlow: 'rgba(68,221,102,0.4)',
        abilities: ['trueshot', 'piercing_arrow', 'cluster_trap', 'barrage'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'ss_t1_1', name: 'Point Blank', description: '+2% Critical Strike chance per rank.', maxRank: 5, stat: 'critChance', valuePerRank: 0.02 },
                { id: 'ss_t1_2', name: 'Serrated Tips', description: '+3% physical DPS per rank.', maxRank: 5, stat: 'dpsPercent', valuePerRank: 0.03 },
                { id: 'ss_t1_3', name: 'Fast Draw', description: '+2% Attack Speed per rank.', maxRank: 5, stat: 'attackSpeed', valuePerRank: 0.02 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'ss_t2_1', name: 'Deadly Aim', description: '+6% Critical Damage per rank.', maxRank: 5, stat: 'critDamage', valuePerRank: 0.06 },
                { id: 'ss_t2_2', name: 'Rapid Fire', description: '+2% Attack Speed per rank.', maxRank: 5, stat: 'attackSpeed', valuePerRank: 0.02 },
                { id: 'ss_t2_3', name: 'Thrill of the Hunt', description: 'Kills restore 1.5% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.015 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'ss_t3_1', name: 'Piercing Arrows', description: '+3% DPS and +1% Crit per rank.', maxRank: 5, stat: 'capstone_stormA', valuePerRank: 1 },
                { id: 'ss_t3_2', name: 'Sniper Training', description: '+4% Critical Damage per rank.', maxRank: 5, stat: 'critDamage', valuePerRank: 0.04 },
                { id: 'ss_t3_3', name: 'Hunter Insight', description: '+2% DPS per rank. Kills restore 1% HP per rank.', maxRank: 5, stat: 'capstone_stormB', valuePerRank: 1 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'ss_t4_1', name: 'Master Archer', description: '+4% DPS and +3% Crit per rank.', maxRank: 3, stat: 'capstone_stormC', valuePerRank: 1 },
                { id: 'ss_t4_2', name: 'True Strike', description: '+10% Critical Damage per rank.', maxRank: 2, stat: 'critDamage', valuePerRank: 0.10 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'ss_t5_1', name: 'Legacy of the Wind', description: 'Capstone: +12% DPS, +8% Crit, +30% Crit Damage.', maxRank: 1, stat: 'capstone_storm', valuePerRank: 1 },
            ]},
        ],
    },

    // ── WILDHEART — Ranger / Nature / Survival ──
    {
        id: 'wildheart',
        name: 'Wildheart',
        class: 'ranger',
        subtitle: 'Primal Bond',
        description: 'Bond with the primal spirits of the forest. Your speed and resilience are unmatched.',
        iconKey: 'wildheart',
        color: '#88dd44',
        colorDark: '#336611',
        colorGlow: 'rgba(136,221,68,0.4)',
        abilities: ['wolf_pack', 'mending_vines', 'poison_cloud', 'avatar_of_nature'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'wh_t1_1', name: 'Fleet Footed', description: '+3% Attack Speed per rank.', maxRank: 5, stat: 'attackSpeed', valuePerRank: 0.03 },
                { id: 'wh_t1_2', name: 'Wild Vigor', description: '+15% HP regeneration per rank.', maxRank: 5, stat: 'regenPercent', valuePerRank: 0.15 },
                { id: 'wh_t1_3', name: 'Nature Grace', description: '+4% Maximum HP per rank.', maxRank: 5, stat: 'hpPercent', valuePerRank: 0.04 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'wh_t2_1', name: 'Feral Reflexes', description: '+2% Attack Speed and +2% Crit per rank.', maxRank: 5, stat: 'capstone_stormA', valuePerRank: 1 },
                { id: 'wh_t2_2', name: 'Spirit Bond', description: '+10% HP regen and +2% HP per rank.', maxRank: 5, stat: 'capstone_ironB', valuePerRank: 1 },
                { id: 'wh_t2_3', name: 'Primal Rage', description: '+4% DPS per rank.', maxRank: 5, stat: 'dpsPercent', valuePerRank: 0.04 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'wh_t3_1', name: 'Apex Predator', description: '+3% DPS and +3% Crit per rank.', maxRank: 5, stat: 'capstone_stormC', valuePerRank: 1 },
                { id: 'wh_t3_2', name: 'Forest Shield', description: '+5% Armor and +5% HP per rank.', maxRank: 5, stat: 'capstone_ironA', valuePerRank: 1 },
                { id: 'wh_t3_3', name: 'Nature Infusion', description: 'Kills restore 2% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.02 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'wh_t4_1', name: 'Guardian of the Wild', description: '+10% HP and +8% Armor per rank.', maxRank: 3, stat: 'capstone_ironC', valuePerRank: 1 },
                { id: 'wh_t4_2', name: 'Untamed Speed', description: '+5% Attack Speed per rank.', maxRank: 2, stat: 'attackSpeed', valuePerRank: 0.05 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'wh_t5_1', name: 'Aspect of the Wild', description: 'Capstone: +15% DPS, +10% Crit, +50% HP regen.', maxRank: 1, stat: 'capstone_iron', valuePerRank: 1 },
            ]},
        ],
    },

    // ── RADIANCE — Dawnkeeper Holy DPS / Smite ──
    {
        id: 'radiance',
        name: 'Radiance',
        class: 'cleric',
        subtitle: 'Holy Wrath',
        description: 'Channel the power of the dawn itself. Your strikes burn with righteous fire and purge all darkness.',
        iconKey: 'radiance',
        color: '#ffcc44',
        colorDark: '#886611',
        colorGlow: 'rgba(255,204,68,0.4)',
        abilities: ['divine_lance', 'sunfire_burst', 'judgment_hammer', 'dawn_avatar'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'ra_t1_1', name: 'Searing Light', description: '+3% Holy damage per rank.', maxRank: 5, stat: 'skillDamagePercent', valuePerRank: 0.03 },
                { id: 'ra_t1_2', name: 'Dawn\'s Precision', description: '+2% Critical Strike chance per rank.', maxRank: 5, stat: 'critChance', valuePerRank: 0.02 },
                { id: 'ra_t1_3', name: 'Solar Focus', description: '+10% Mana regeneration per rank.', maxRank: 5, stat: 'manaRegenPercent', valuePerRank: 0.10 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'ra_t2_1', name: 'Radiant Fury', description: '+5% Holy damage per rank.', maxRank: 5, stat: 'skillDamagePercent', valuePerRank: 0.05 },
                { id: 'ra_t2_2', name: 'Sunlit Strikes', description: '+5% Critical Damage per rank.', maxRank: 5, stat: 'critDamage', valuePerRank: 0.05 },
                { id: 'ra_t2_3', name: 'Radiant Blessing', description: 'Kills restore 1.5% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.015 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'ra_t3_1', name: 'Blazing Judgment', description: '+3% Skill Damage and -2% CDs per rank.', maxRank: 5, stat: 'capstone_voidA', valuePerRank: 1 },
                { id: 'ra_t3_2', name: 'Solar Wrath', description: '+4% DPS and +2% Crit per rank.', maxRank: 5, stat: 'capstone_stormA', valuePerRank: 1 },
                { id: 'ra_t3_3', name: 'Holy Fire', description: '+6% Critical Damage per rank.', maxRank: 5, stat: 'critDamage', valuePerRank: 0.06 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'ra_t4_1', name: 'Dawn\'s Wrath', description: '+5% Skill Damage and +4% Crit per rank.', maxRank: 3, stat: 'capstone_stormC', valuePerRank: 1 },
                { id: 'ra_t4_2', name: 'Purging Light', description: '+12% Critical Damage per rank.', maxRank: 2, stat: 'critDamage', valuePerRank: 0.12 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'ra_t5_1', name: 'Daybreak', description: 'Capstone: +15% Skill Damage, +10% Crit, +30% Crit Damage.', maxRank: 1, stat: 'capstone_storm', valuePerRank: 1 },
            ]},
        ],
    },

    // ── BASTION — Dawnkeeper Divine Protection / Sustain ──
    {
        id: 'bastion',
        name: 'Bastion',
        class: 'cleric',
        subtitle: 'Divine Fortitude',
        description: 'Become the unbreakable pillar of light. Your faith shields you from all harm and heals all wounds.',
        iconKey: 'bastion',
        color: '#ffaa22',
        colorDark: '#885511',
        colorGlow: 'rgba(255,170,34,0.4)',
        abilities: ['blessed_shield', 'holy_bulwark', 'prayer_of_healing', 'divine_aegis'],
        tiers: [
            // ── Tier 1 (0 pts required) ── 15 pts capacity
            { name: 'Initiate', pointsRequired: 0, nodes: [
                { id: 'ba_t1_1', name: 'Sacred Armor', description: '+4% Armor effectiveness per rank.', maxRank: 5, stat: 'armorPercent', valuePerRank: 0.04 },
                { id: 'ba_t1_2', name: 'Blessed Vitality', description: '+4% Maximum HP per rank.', maxRank: 5, stat: 'hpPercent', valuePerRank: 0.04 },
                { id: 'ba_t1_3', name: 'Divine Recovery', description: '+12% HP regeneration rate per rank.', maxRank: 5, stat: 'regenPercent', valuePerRank: 0.12 },
            ]},
            // ── Tier 2 (8 pts in tree) ── 15 pts capacity
            { name: 'Adept', pointsRequired: 8, nodes: [
                { id: 'ba_t2_1', name: 'Holy Resilience', description: '+15% HP regeneration rate per rank.', maxRank: 5, stat: 'regenPercent', valuePerRank: 0.15 },
                { id: 'ba_t2_2', name: 'Enduring Faith', description: '+2% Armor per rank.', maxRank: 5, stat: 'armorPercent', valuePerRank: 0.02 },
                { id: 'ba_t2_3', name: 'Blessed Duration', description: 'Buffs last 8% longer per rank.', maxRank: 5, stat: 'buffDurationPercent', valuePerRank: 0.08 },
            ]},
            // ── Tier 3 (20 pts in tree) ── 15 pts capacity
            { name: 'Expert', pointsRequired: 20, nodes: [
                { id: 'ba_t3_1', name: 'Divine Bulwark', description: '+4% HP and +3% Armor per rank.', maxRank: 5, stat: 'capstone_ironA', valuePerRank: 1 },
                { id: 'ba_t3_2', name: 'Undying Light', description: '+10% HP regen and +3% HP per rank.', maxRank: 5, stat: 'capstone_ironB', valuePerRank: 1 },
                { id: 'ba_t3_3', name: 'Martyr\'s Gift', description: 'Kills restore 2% max HP per rank.', maxRank: 5, stat: 'killHealPercent', valuePerRank: 0.02 },
            ]},
            // ── Tier 4 (35 pts in tree) ── 5 pts capacity
            { name: 'Master', pointsRequired: 35, nodes: [
                { id: 'ba_t4_1', name: 'Sanctum', description: '+5% HP and +4% Armor per rank.', maxRank: 3, stat: 'capstone_ironC', valuePerRank: 1 },
                { id: 'ba_t4_2', name: 'Eternal Vigil', description: 'Buffs last 15% longer per rank. +15% regen per rank.', maxRank: 2, stat: 'capstone_ironD', valuePerRank: 1 },
            ]},
            // ── Capstone (45 pts in tree) ── 1 pt
            { name: 'Grandmaster', pointsRequired: 45, nodes: [
                { id: 'ba_t5_1', name: 'Immortal Dawn', description: 'Capstone: +15% HP, +15% Armor, +50% HP regen.', maxRank: 1, stat: 'capstone_iron', valuePerRank: 1 },
            ]},
        ],
    },
];

// Flatten all nodes for easy iteration
function _flatNodes() {
    const all = [];
    for (const branch of TALENT_BRANCHES) {
        for (const tier of branch.tiers) {
            for (const node of tier.nodes) {
                all.push({ node, tier, branch });
            }
        }
    }
    return all;
}
const ALL_NODES = _flatNodes();

// Max points per tree
function _maxPointsInBranch(branch) {
    let total = 0;
    for (const tier of branch.tiers) {
        for (const node of tier.nodes) total += node.maxRank;
    }
    return total;
}

// ══════════════════════════════════════════════════════════════════════
// TALENT TREE MANAGER
// ══════════════════════════════════════════════════════════════════════

class TalentTreeManager {
    constructor() {
        this.allocated = {}; // { nodeId: rank }
        this.bonuses = {};
        // Talent ability cooldowns (4 talent ability slots)
        this.talentAbilityCooldowns = [0, 0, 0, 0];
        this._anyTalentCDActive = false;
        this.recalcBonuses();
    }

    /** Gets branches available to the current class */
    getAvailableBranches() {
        const classId = _gameState ? _gameState.classId : 'warrior';
        // Classes can see their specific branches OR generic branches (none yet)
        return TALENT_BRANCHES.filter(b => b.class === classId || !b.class);
    }

    /** Total talent points available = level - 1 (first point at level 2) */
    getTotalPoints() {
        return Math.max(0, (_gameState ? _gameState.level : 1) - 1);
    }

    /** Total points spent across all branches */
    getSpentPoints() {
        let total = 0;
        for (const nodeId in this.allocated) total += this.allocated[nodeId];
        return total;
    }

    /** Unspent points */
    getAvailablePoints() {
        return this.getTotalPoints() - this.getSpentPoints();
    }

    /** Points spent in a specific branch */
    getSpentInBranch(branchId) {
        const branch = TALENT_BRANCHES.find(b => b.id === branchId);
        if (!branch) return 0;
        let total = 0;
        for (const tier of branch.tiers) {
            for (const node of tier.nodes) {
                total += (this.allocated[node.id] || 0);
            }
        }
        return total;
    }

    /** Max points in a branch */
    getMaxInBranch(branchId) {
        const branch = TALENT_BRANCHES.find(b => b.id === branchId);
        return branch ? _maxPointsInBranch(branch) : 0;
    }

    /** Get current rank of a node */
    getNodeRank(nodeId) {
        return this.allocated[nodeId] || 0;
    }

    /** Find the node definition by id */
    getNodeDef(nodeId) {
        for (const entry of ALL_NODES) {
            if (entry.node.id === nodeId) return entry;
        }
        return null;
    }

    /** Check if a node can be ranked up */
    canAllocate(nodeId) {
        if (this.getAvailablePoints() <= 0) return false;
        const entry = this.getNodeDef(nodeId);
        if (!entry) return false;
        const { node, tier, branch } = entry;

        // Check if this branch belongs to the player's class
        if (branch.class && branch.class !== (_gameState ? _gameState.classId : 'warrior')) return false;

        const currentRank = this.getNodeRank(nodeId);
        if (currentRank >= node.maxRank) return false;

        // Check tier prerequisite: need enough points in this branch
        const spentInBranch = this.getSpentInBranch(branch.id);
        if (spentInBranch < tier.pointsRequired) return false;

        return true;
    }

    /** Allocate one rank into a node */
    allocate(nodeId) {
        if (!this.canAllocate(nodeId)) return false;
        this.allocated[nodeId] = (this.allocated[nodeId] || 0) + 1;
        this.recalcBonuses();

        const entry = this.getNodeDef(nodeId);
        if (_gameState) _gameState.addGameLog(`Talent point spent: ${entry.node.name}`);

        // Check if we just unlocked a talent ability
        this._checkAbilityUnlocks(entry.branch);
        return true;
    }

    /** Remove one rank from a node (respec) */
    deallocate(nodeId) {
        const rank = this.allocated[nodeId] || 0;
        if (rank <= 0) return false;

        const entry = this.getNodeDef(nodeId);
        if (!entry) return false;
        const { branch } = entry;

        // Simulate removing this point and verify all other allocated nodes still meet prereqs
        const testAllocated = { ...this.allocated };
        testAllocated[nodeId] = rank - 1;
        if (testAllocated[nodeId] === 0) delete testAllocated[nodeId];

        // Calculate what the branch total would be
        let testBranchTotal = 0;
        for (const tier of branch.tiers) {
            for (const n of tier.nodes) {
                testBranchTotal += (testAllocated[n.id] || 0);
            }
        }

        // Check all nodes in higher tiers still meet their prerequisites
        for (const tier of branch.tiers) {
            if (tier.pointsRequired <= 0) continue;
            for (const n of tier.nodes) {
                const nRank = testAllocated[n.id] || 0;
                if (nRank > 0) {
                    // The total branch spent must be >= tier.pointsRequired
                    // Count points spent in tiers BELOW this one
                    let spentBelowTier = 0;
                    for (const t2 of branch.tiers) {
                        if (t2 === tier) break;
                        for (const n2 of t2.nodes) spentBelowTier += (testAllocated[n2.id] || 0);
                    }
                    if (spentBelowTier < tier.pointsRequired) return false;
                }
            }
        }

        this.allocated[nodeId] = rank - 1;
        if (this.allocated[nodeId] === 0) delete this.allocated[nodeId];
        this.recalcBonuses();
        return true;
    }

    reset() {
        this.allocated = {};
        this.bonuses = {};
        this.talentAbilityCooldowns = [0, 0, 0, 0];
        this._anyTalentCDActive = false;
        this.recalcBonuses();
    }

    /** Reset all talents */
    resetAll() {
        this.reset();
        if (_gameState) _gameState.addGameLog('All talent points have been reset!');
    }

    // ── Talent Ability Management ──

    /** Check if a talent ability is unlocked */
    _checkAbilityUnlocks(branch) {
        const spent = this.getSpentInBranch(branch.id);
        for (const abilId of branch.abilities) {
            const abil = TALENT_ABILITIES[abilId];
            if (abil && spent >= abil.unlockReq) {
                // Check if already unlocked message shown (basic prevent duplicate log)
                // This is a bit rough but works for immediate feedback
                if (_gameState) {
                    _gameState.addGameLog(`Talent Ability Unlocked: ${abil.name}!`);
                    _gameState.addChatMessage('Game', 'System', `✨ ${abil.name} learned from ${branch.name} talent tree!`);
                }
            }
        }
    }

    /** Get all currently unlocked talent abilities (max 4, ordered by tree then threshold) */
    getUnlockedTalentAbilities() {
        const unlocked = [];
        const branches = this.getAvailableBranches();
        for (const branch of branches) {
            const spent = this.getSpentInBranch(branch.id);
            for (const abilId of branch.abilities) {
                const abil = TALENT_ABILITIES[abilId];
                if (abil && spent >= abil.unlockReq) {
                    unlocked.push(abil);
                }
            }
        }
        // Sort by unlock requirement for consistent ordering
        unlocked.sort((a, b) => a.unlockReq - b.unlockReq);
        // Cap at 4 slots
        return unlocked.slice(0, 4);
    }

    /** Check if a specific talent ability is unlocked */
    isTalentAbilityUnlocked(abilId) {
        const abil = TALENT_ABILITIES[abilId];
        if (!abil) return false;
        const branch = TALENT_BRANCHES.find(b => b.abilities.includes(abilId));
        if (!branch) return false;
        // Check if player's class matches the branch
        if (branch.class && branch.class !== (_gameState ? _gameState.classId : 'warrior')) return false;
        return this.getSpentInBranch(branch.id) >= abil.unlockReq;
    }

    /** Use a talent ability (returns true if used, handles CD + mana) */
    useTalentAbility(slotIndex) {
        const unlocked = this.getUnlockedTalentAbilities();
        const abil = unlocked[slotIndex];
        if (!abil) return false;
        if (this.talentAbilityCooldowns[slotIndex] > 0) return false;
        if (!_gameState) return false;
        if (abil.manaCost > 0 && _gameState.mana < abil.manaCost) return false;

        // Spend mana
        if (abil.manaCost > 0) _gameState.mana -= abil.manaCost;

        // Apply cooldown (with talent CDR + aetherbit CDR)
        const cdr = this.getCooldownReduction();
        this.talentAbilityCooldowns[slotIndex] = abil.cooldown * Math.max(0.2, 1 - cdr);
        this._anyTalentCDActive = true;

        // Apply buff effects
        const buffDurBonus = 1 + this.getBuffDurationBonus();
        if (abil.buffType === 'defense') {
            _gameState.defenseBuff = abil.buffValue; 
            _gameState.defenseBuffTimer = (abil.buffDuration || 8) * buffDurBonus;
            const reduction = Math.round((1 - _gameState.defenseBuff) * 100);
            _gameState.addGameLog(`${abil.name}! -${reduction}% damage taken for ${Math.round(_gameState.defenseBuffTimer)}s`);
        } else if (abil.buffType === 'heal_regen') {
            const healAmount = Math.floor(_gameState.getEffectiveMaxHp() * 0.35);
            _gameState.healPlayer(healAmount);
            _gameState.addGameLog(`${abil.name}! Restored ${healAmount} HP and boosted regen.`);
        } else if (abil.buffType === 'damage') {
            _gameState.damageBuff = abil.buffValue || 1.6;
            _gameState.damageBuffTimer = (abil.buffDuration || 10) * buffDurBonus;
            _gameState.addGameLog(`${abil.name}! +${Math.round((_gameState.damageBuff - 1) * 100)}% damage for ${Math.round(_gameState.damageBuffTimer)}s`);
        }

        // ── Special Logic for Talent Abilities ──
        if (abil.id === 'ether_siphon') {
            const manaGain = Math.floor(_gameState.getEffectiveMaxMana() * 0.15);
            _gameState.mana = Math.min(_gameState.getEffectiveMaxMana(), _gameState.mana + manaGain);
            _gameState.addGameLog(`${abil.name}! Restored ${manaGain} mana.`);
        } else if (abil.id === 'leeching_touch') {
            const healAmount = Math.floor(_gameState.getEffectiveMaxHp() * 0.1);
            _gameState.healPlayer(healAmount);
            _gameState.addGameLog(`${abil.name}! Leeching life force.`);
        } else if (abil.id === 'dark_ascension') {
            // Apply a strong passive regen for the duration
            _gameState.regenBuff = 3.0; // 300% regen
            _gameState.regenBuffTimer = 15;
            _gameState.addGameLog(`${abil.name}! Transformed into Void Avatar!`);
        } else if (abil.id === 'singularity') {
            // Reset all OTHER talent ability cooldowns
            for (let i = 0; i < 4; i++) {
                if (i !== slotIndex) this.talentAbilityCooldowns[i] = 0;
            }
            _gameState.addGameLog(`${abil.name}! All other talent cooldowns reset!`);
        } else if (abil.id === 'iron_skin') {
            const healAmount = Math.floor(_gameState.getEffectiveMaxHp() * 0.12);
            _gameState.healPlayer(healAmount);
            _gameState.addGameLog(`${abil.name}! Restored ${healAmount} HP and hardened skin.`);
        } else if (abil.id === 'mending_vines') {
            const healAmount = Math.floor(_gameState.getEffectiveMaxHp() * 0.25);
            _gameState.healPlayer(healAmount);
            _gameState.addGameLog(`${abil.name}! Ancient vines mend your wounds.`);
        } else if (abil.id === 'avatar_of_nature') {
            _gameState.regenBuff = 4.0; // 400% regen
            _gameState.regenBuffTimer = 15;
            _gameState.addGameLog(`${abil.name}! You are the forest's wrath incarnate!`);
        }

        return true;
    }

    /** Update talent ability cooldowns */
    updateTalentCooldowns(dt) {
        if (!this._anyTalentCDActive) return;
        let anyActive = false;
        for (let i = 0; i < 4; i++) {
            if (this.talentAbilityCooldowns[i] > 0) {
                this.talentAbilityCooldowns[i] = Math.max(0, this.talentAbilityCooldowns[i] - dt);
                if (this.talentAbilityCooldowns[i] > 0) anyActive = true;
            }
        }
        this._anyTalentCDActive = anyActive;
    }

    // ── Bonus Calculation ──

    recalcBonuses() {
        const b = {
            critChance: 0,
            critDamage: 0,
            dpsPercent: 0,
            attackSpeed: 0,
            killHealPercent: 0,
            armorPercent: 0,
            hpPercent: 0,
            regenPercent: 0,
            buffDurationPercent: 0,
            manaPercent: 0,
            manaRegenPercent: 0,
            skillDamagePercent: 0,
            cooldownReduction: 0,
            killManaPercent: 0,
        };

        for (const { node } of ALL_NODES) {
            const rank = this.allocated[node.id] || 0;
            if (rank <= 0) continue;

            switch (node.stat) {
                // ── Stormcleave composite nodes ──
                case 'capstone_stormA':
                    // Thunder Clap: +3% DPS and +1% Crit per rank
                    b.dpsPercent += 0.03 * rank;
                    b.critChance += 0.01 * rank;
                    break;
                case 'capstone_stormB':
                    // Blood Frenzy: +2% DPS per rank, +1% kill heal per rank
                    b.dpsPercent += 0.02 * rank;
                    b.killHealPercent += 0.01 * rank;
                    break;
                case 'capstone_stormC':
                    // Tempest Mastery: +4% DPS and +3% Crit per rank
                    b.dpsPercent += 0.04 * rank;
                    b.critChance += 0.03 * rank;
                    break;
                case 'capstone_storm':
                    // Eye of the Storm capstone: +12% DPS, +8% Crit, +30% Crit Damage
                    b.dpsPercent += 0.12;
                    b.critChance += 0.08;
                    b.critDamage += 0.30;
                    break;

                // ── Ironward composite nodes ──
                case 'capstone_ironA':
                    // Stone Bulwark: +4% HP and +3% Armor per rank
                    b.hpPercent += 0.04 * rank;
                    b.armorPercent += 0.03 * rank;
                    break;
                case 'capstone_ironB':
                    // Indomitable: +10% HP regen and +3% HP per rank
                    b.regenPercent += 0.10 * rank;
                    b.hpPercent += 0.03 * rank;
                    break;
                case 'capstone_ironC':
                    // Juggernaut: +5% HP and +4% Armor per rank
                    b.hpPercent += 0.05 * rank;
                    b.armorPercent += 0.04 * rank;
                    break;
                case 'capstone_ironD':
                    // Last Stand: +15% buff duration and +15% regen per rank
                    b.buffDurationPercent += 0.15 * rank;
                    b.regenPercent += 0.15 * rank;
                    break;
                case 'capstone_iron':
                    // Unbreakable capstone: +15% HP, +15% Armor, +50% HP regen
                    b.hpPercent += 0.15;
                    b.armorPercent += 0.15;
                    b.regenPercent += 0.50;
                    break;

                // ── Voidedge composite nodes ──
                case 'capstone_voidA':
                    // Arcane Supremacy: +3% Skill Damage and -2% CDs per rank
                    b.skillDamagePercent += 0.03 * rank;
                    b.cooldownReduction += 0.02 * rank;
                    break;
                case 'capstone_voidB':
                    // Ether Tap: +5% Mana and +8% Mana regen per rank
                    b.manaPercent += 0.05 * rank;
                    b.manaRegenPercent += 0.08 * rank;
                    break;
                case 'capstone_voidC':
                    // Void Mastery: +5% Skill Damage and -3% CDs per rank
                    b.skillDamagePercent += 0.05 * rank;
                    b.cooldownReduction += 0.03 * rank;
                    break;
                case 'capstone_voidD':
                    // Nether Surge: +6% Mana and +12% Mana regen per rank
                    b.manaPercent += 0.06 * rank;
                    b.manaRegenPercent += 0.12 * rank;
                    break;
                case 'capstone_void':
                    // Void Ascension capstone: +15% Skill Damage, -12% CDs, +20% Mana
                    b.skillDamagePercent += 0.15;
                    b.cooldownReduction += 0.12;
                    b.manaPercent += 0.20;
                    break;

                // ── Simple stat nodes (all trees) ──
                default:
                    b[node.stat] = (b[node.stat] || 0) + node.valuePerRank * rank;
                    break;
            }
        }

        this.bonuses = b;
    }

    // ── Stat Query Helpers ──

    getDPSMultiplier() { return 1 + (this.bonuses.dpsPercent || 0); }
    getCritChance() { return this.bonuses.critChance || 0; }
    getCritDamageBonus() { return this.bonuses.critDamage || 0; }
    getAttackSpeedBonus() { return this.bonuses.attackSpeed || 0; }
    getKillHealPercent() { return this.bonuses.killHealPercent || 0; }
    getArmorMultiplier() { return 1 + (this.bonuses.armorPercent || 0); }
    getHPMultiplier() { return 1 + (this.bonuses.hpPercent || 0); }
    getRegenMultiplier() { return 1 + (this.bonuses.regenPercent || 0); }
    getBuffDurationBonus() { return this.bonuses.buffDurationPercent || 0; }
    getManaMultiplier() { return 1 + (this.bonuses.manaPercent || 0); }
    getManaRegenMultiplier() { return 1 + (this.bonuses.manaRegenPercent || 0); }
    getSkillDamageMultiplier() { return 1 + (this.bonuses.skillDamagePercent || 0); }
    getCooldownReduction() { return this.bonuses.cooldownReduction || 0; }
    getKillManaPercent() { return this.bonuses.killManaPercent || 0; }

    // ── Serialization ──

    serialize() {
        return {
            allocated: { ...this.allocated },
            talentCDs: [...this.talentAbilityCooldowns],
        };
    }

    deserialize(data) {
        if (!data) return;
        this.allocated = {};
        // Only restore node IDs that still exist in the current tree definitions
        if (data.allocated) {
            for (const nodeId in data.allocated) {
                if (this.getNodeDef(nodeId)) {
                    this.allocated[nodeId] = data.allocated[nodeId];
                }
            }
        }
        if (data.talentCDs) {
            for (let i = 0; i < 4; i++) {
                this.talentAbilityCooldowns[i] = data.talentCDs[i] || 0;
            }
            this._anyTalentCDActive = this.talentAbilityCooldowns.some(cd => cd > 0);
        }
        this.recalcBonuses();
    }
}

export const talentTree = new TalentTreeManager();