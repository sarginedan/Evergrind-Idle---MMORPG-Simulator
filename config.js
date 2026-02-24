// Game Configuration & Constants
export const CONFIG = {
    // Player
    PLAYER_NAME: 'Hero',
    PLAYER_CLASS: '',
    PLAYER_BASE_HP: 100,
    PLAYER_BASE_MANA: 50,
    PLAYER_BASE_DPS: 8,
    PLAYER_MOVE_SPEED: 3.5,
    PLAYER_ATTACK_RANGE: 2.5,
    PLAYER_ATTACK_SPEED: 1.2, // attacks per second

    // Leveling
    BASE_XP_REQUIRED: 100,
    XP_SCALE_FACTOR: 1.35,
    MAX_LEVEL: 60,

    // Combat
    BASE_MOB_HP: 40,
    MOB_HP_SCALE: 1.2,
    BASE_MOB_DAMAGE: 5,
    MOB_DAMAGE_SCALE: 1.15,
    BASE_XP_REWARD: 25,
    XP_REWARD_SCALE: 1.15,
    BASE_GOLD_REWARD: 3,
    GOLD_REWARD_SCALE: 1.1,
    BASE_KARMA_REWARD: 1, // "Aetherbits" in UI
    
    // Class-specific ranges
    CLASS_RANGES: {
        warrior: { min: 0, ideal: 1.8, max: 2.8, kite: false },
        mage: { min: 4.5, ideal: 7.5, max: 12.0, kite: true },
        ranger: { min: 5.0, ideal: 8.5, max: 14.0, kite: true },
        cleric: { min: 0, ideal: 2.2, max: 3.5, kite: false },
    },

    // Idle rates
    SUSTAIN_REGEN_RATE: 0.02, // 2% of Max HP per second

    // Mob spawning
    MOB_SPAWN_RADIUS: 25,
    MOB_COUNT_MIN: 12,
    MOB_COUNT_MAX: 24,
    MOB_RESPAWN_TIME: 1.5,

    // World
    WORLD_SIZE: 80,
    TREE_COUNT: 28,
    ROCK_COUNT: 12,
    BUSH_COUNT: 20,
    FERN_COUNT: 30,

    // Camera
    CAMERA_DISTANCE: 8,
    CAMERA_HEIGHT: 5,
    CAMERA_ANGLE: -0.45,

    // Events
    EVENT_DURATION: 60, // seconds

    // ──────────────────────────────────────────────────────────────
    // ZONES — the heart of zone progression
    // ──────────────────────────────────────────────────────────────
    ZONES: [
        {
            id: 'verdant_wilds',
            name: 'Verdant Wilds',
            subtitle: 'Lush Jungle Forest',
            levelRange: [1, 7],
            icon: '🌿',
            color: '#44cc44',
            bgColor: 'rgba(20,40,15,0.95)',
            description: 'A dense, primeval jungle teeming with wildlife and ancient magic. Where every hero begins their journey.',
            textures: {
                ground: 'https://rosebud.ai/assets/forest-ground.webp?GdJe',
                bark: 'https://rosebud.ai/assets/tree-bark.webp?w0os',
                canopy: 'https://rosebud.ai/assets/leaf-canopy.webp?IvWE',
                rock: 'https://rosebud.ai/assets/moss-rock.webp?yS1m',
            },
            colors: {
                fogColor: 0x1a2e1a,
                ambientLight: 0x2a4a2a,
                directionalLight: 0xffeedd,
                godRayColor: 0xffffcc,
                groundTint: 0x3a5a2a,
                sceneBg: 0x0a150a,
                fogDensity: 0.018,
                particleColor: 0xccddaa,
            },
            mobTypes: [
                { name: 'Forest Wurm', color: 0x4a7a3a, minLevel: 1, maxLevel: 60, scale: 1.0, type: 'beast' },
                { name: 'Moss Golem', color: 0x3d6b34, minLevel: 1, maxLevel: 60, scale: 1.5, type: 'elemental' },
                { name: 'Jungle Spider', color: 0x2a2a2a, minLevel: 3, maxLevel: 60, scale: 0.8, type: 'beast' },
                { name: 'Vine Stalker', color: 0x2d5a1e, minLevel: 5, maxLevel: 60, scale: 1.2, type: 'plant' },
            ],
            eventTypes: [
                { name: 'Cull the Wurm Population', type: 'kill', target: 5 },
                { name: 'Gather Ancient Herbs', type: 'gather', target: 8 },
                { name: 'Clear the Spider Nests', type: 'kill', target: 7 },
                { name: 'Collect Mystic Crystals', type: 'gather', target: 6 },
                { name: 'Defeat the Moss Golems', type: 'kill', target: 4 },
                { name: 'Harvest Jungle Orchids', type: 'gather', target: 10 },
                { name: 'Purge the Corrupted Beasts', type: 'kill', target: 6 },
                { name: 'Recover Lost Relics', type: 'gather', target: 5 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'TybaltLover', msg: 'Anyone for dungeon path 1?' },
                { channel: 'Guild', user: 'IdleBot', msg: 'Guild Hall upgrade in progress.' },
                { channel: 'Map', user: 'XxShadowKnightxX', msg: 'LFG Catacombs of Dread' },
                { channel: 'Guild', user: 'HealzForDayz', msg: 'Who needs WvW badges?' },
                { channel: 'Map', user: 'GoldFarmer99', msg: 'WTS Exotic Greatsword 5g' },
                { channel: 'Say', user: 'RuneMaster', msg: 'Nice place to farm XP' },
                { channel: 'Map', user: 'DragonSlayer42', msg: 'World boss in 15 mins at cursed shore!' },
                { channel: 'Guild', user: 'CraftQueen', msg: 'Maxed out Armorsmith finally!' },
                { channel: 'Map', user: 'WvWCommander', msg: 'Rally at bay keep, push inner!' },
                { channel: 'Say', user: 'NewbWarrior', msg: 'How do I level gathering?' },
                { channel: 'Map', user: 'TreeHugger', msg: 'These trees are beautiful. I refuse to fight near them.' },
                { channel: 'Map', user: 'WurmVictim', msg: 'Just got aggro from 4 wurms. This is fine. Everything is fine.' },
                { channel: 'Say', user: 'SpiderHater', msg: 'Whoever put giant spiders in this forest, I just want to talk.' },
                { channel: 'Map', user: 'HerbBro', msg: 'Pro tip: Moonpetal Flowers glow at night. Except it\'s always night in here.' },
                { channel: 'Map', user: 'VineSurvivor', msg: 'I walked into a bush and something grabbed my ankle. 10/10 zone design.' },
                { channel: 'Guild', user: 'ForestGuide', msg: 'If you get lost, follow the dead wurm trail back to camp' },
                { channel: 'Map', user: 'DensityCheck', msg: 'I can\'t move 5 feet without something trying to eat me. Love it.' },
                { channel: 'Say', user: 'GolemPuncher', msg: 'Fun fact: you CAN punch a Moss Golem. Once.' },
            ],
        },
        {
            id: 'shattered_expanse',
            name: 'Shattered Expanse',
            subtitle: 'Frozen Crystalline Wastes',
            levelRange: [8, 14],
            icon: '❄️',
            color: '#66bbff',
            bgColor: 'rgba(10,15,30,0.95)',
            description: 'A desolate frozen wasteland where ancient crystals jut from permafrost. The air crackles with ley-line energy.',
            textures: {
                ground: 'https://rosebud.ai/assets/frozen-ground.webp.webp?ZO1g',
                rock: 'https://rosebud.ai/assets/frozen-rock.webp.webp?8kYB',
            },
            colors: {
                fogColor: 0x0a1a2e,
                ambientLight: 0x2a3a5a,
                directionalLight: 0xccddff,
                godRayColor: 0x88bbff,
                groundTint: 0x2a3a5a,
                sceneBg: 0x050a15,
                fogDensity: 0.015,
                particleColor: 0xaaccff,
            },
            mobTypes: [
                { name: 'Frost Wraith', color: 0x88bbdd, minLevel: 8, maxLevel: 60, scale: 1.1, type: 'elemental' },
                { name: 'Ice Scarab', color: 0x5588aa, minLevel: 8, maxLevel: 60, scale: 0.7, type: 'beast' },
                { name: 'Crystal Sentinel', color: 0x4466aa, minLevel: 9, maxLevel: 60, scale: 1.6, type: 'elemental' },
                { name: 'Glacial Stalker', color: 0x334466, minLevel: 10, maxLevel: 60, scale: 1.3, type: 'beast' },
                { name: 'Rime Drake', color: 0x3355aa, minLevel: 12, maxLevel: 60, scale: 1.8, type: 'dragon' },
            ],
            eventTypes: [
                { name: 'Shatter the Ice Scarabs', type: 'kill', target: 6 },
                { name: 'Harvest Frozen Ley Shards', type: 'gather', target: 7 },
                { name: 'Purge the Frost Wraiths', type: 'kill', target: 5 },
                { name: 'Collect Permafrost Cores', type: 'gather', target: 5 },
                { name: 'Destroy Crystal Sentinels', type: 'kill', target: 4 },
                { name: 'Recover Expedition Supplies', type: 'gather', target: 8 },
                { name: 'Cull the Glacial Pack', type: 'kill', target: 7 },
                { name: 'Tap the Ley Nodes', type: 'gather', target: 6 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'FrostWalker', msg: 'Brrr, anyone else lagging from the particle effects here?' },
                { channel: 'Guild', user: 'ArcticRanger', msg: 'Guild expedition to the crystal caverns tonight!' },
                { channel: 'Map', user: 'IceMage42', msg: 'WTB Permafrost Core x5, paying 20g each' },
                { channel: 'Say', user: 'CrystalCollector', msg: 'The ley lines are stronger today, more drops!' },
                { channel: 'Map', user: 'DrakeHunter', msg: 'Rime Drake spawned near the ravine!' },
                { channel: 'Guild', user: 'SupplyRunner', msg: 'Outpost supply cache is full.' },
                { channel: 'Map', user: 'WinterKnight', msg: 'LFG frost cavern run, need healer' },
                { channel: 'Say', user: 'ExpeditionChief', msg: 'Watch out for the ice patches, they slow you' },
                { channel: 'Map', user: 'ShardForger', msg: 'Crafted my first Glacial weapon! So shiny' },
                { channel: 'Guild', user: 'FrostAlchemist', msg: 'New potions up for grabs in guild vault' },
                { channel: 'Map', user: 'Hypothermia', msg: 'My character has been shivering for 20 minutes. Is that a debuff or immersion?' },
                { channel: 'Map', user: 'IceFisher', msg: 'Tried to ice fish here. Caught a Frost Wraith. Would not recommend.' },
                { channel: 'Say', user: 'ColdTruth', msg: 'I miss the forest. At least the wurms were warm-blooded.' },
                { channel: 'Map', user: 'ScarabNope', msg: 'Ice Scarabs make a crunching sound when they die and I hate it' },
                { channel: 'Map', user: 'SnowAngel', msg: 'I tried to make a snow angel. An Ice Scarab crawled into my armor.' },
                { channel: 'Guild', user: 'FrozenLogic', msg: 'If the crystals are made of ice, why can\'t I melt them with fire?' },
                { channel: 'Map', user: 'ScoutDave', msg: 'Fun fact: Glacial Stalkers can smell fear. And snacks.' },
                { channel: 'Map', user: 'ShiveringDPS', msg: 'My hands are too cold to DPS properly. Requesting warm gloves from guild.' },
            ],
        },
        {
            id: 'molten_abyss',
            name: 'Molten Wasteland',
            subtitle: 'Volcanic Hellscape',
            levelRange: [15, 24],
            icon: '🌋',
            color: '#ff6622',
            bgColor: 'rgba(30,10,5,0.95)',
            description: 'A nightmarish volcanic wasteland where rivers of molten lava carve through blackened basalt. The air shimmers with lethal heat and ancient demons stir beneath the crust.',
            textures: {
                ground: 'https://rosebud.ai/assets/volcanic-ground.webp.webp?fSwQ',
                rock: 'https://rosebud.ai/assets/volcanic-rock.webp.webp?b15H',
            },
            colors: {
                fogColor: 0x1a0800,
                ambientLight: 0x4a2010,
                directionalLight: 0xff8844,
                godRayColor: 0xff4400,
                groundTint: 0x3a1a0a,
                sceneBg: 0x0a0300,
                fogDensity: 0.014,
                particleColor: 0xff6622,
            },
            mobTypes: [
                { name: 'Magma Hound', color: 0xcc4400, minLevel: 15, maxLevel: 60, scale: 1.0, type: 'beast' },
                { name: 'Obsidian Golem', color: 0x332233, minLevel: 15, maxLevel: 60, scale: 1.6, type: 'elemental' },
                { name: 'Cinder Wraith', color: 0xff6600, minLevel: 16, maxLevel: 60, scale: 1.1, type: 'undead' },
                { name: 'Lava Serpent', color: 0xee3300, minLevel: 17, maxLevel: 60, scale: 1.3, type: 'serpent' },
                { name: 'Infernal Wyvern', color: 0xaa2200, minLevel: 19, maxLevel: 60, scale: 1.8, type: 'dragon' },
            ],
            eventTypes: [
                { name: 'Cull the Magma Hounds', type: 'kill', target: 6 },
                { name: 'Harvest Ashbloom Flowers', type: 'gather', target: 7 },
                { name: 'Banish the Cinder Wraiths', type: 'kill', target: 5 },
                { name: 'Collect Molten Cores', type: 'gather', target: 5 },
                { name: 'Shatter the Obsidian Golems', type: 'kill', target: 4 },
                { name: 'Recover Expedition Equipment', type: 'gather', target: 8 },
                { name: 'Slay the Lava Serpents', type: 'kill', target: 7 },
                { name: 'Tap the Magma Vents', type: 'gather', target: 6 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'AshenKnight', msg: 'The heat here is insane, my armor is literally glowing' },
                { channel: 'Guild', user: 'MagmaForger', msg: 'Guild forge unlocked — volcanic steel weapons available!' },
                { channel: 'Map', user: 'LavaWalker', msg: 'WTB Molten Core Fragment x10, paying 50g each' },
                { channel: 'Say', user: 'EmberCollector', msg: 'The Ashblooms near the caldera are 2x size today' },
                { channel: 'Map', user: 'WyvernHunter', msg: 'Infernal Wyvern spotted near the obsidian ridge!' },
                { channel: 'Guild', user: 'PyroAlchemist', msg: 'New fire resistance potions in the guild vault' },
                { channel: 'Map', user: 'FlameWarden', msg: 'LFG deep caldera run, need tank and healer' },
                { channel: 'Say', user: 'VolcanicScout', msg: 'Watch your step — the ground cracks without warning here' },
                { channel: 'Map', user: 'ObsidianCrafter', msg: 'Just forged my first Obsidian greatsword! So dark and sharp' },
                { channel: 'Guild', user: 'InfernalTactician', msg: 'Pyroclast intel: attack during his cooldown phase' },
                { channel: 'Map', user: 'BurntToast', msg: 'Stepped in lava again. Third time today. I\'m not having a good time.' },
                { channel: 'Map', user: 'HeatStroke', msg: 'I came from the ice zone. This is not the gradual transition I expected.' },
                { channel: 'Say', user: 'WyvernSnack', msg: 'A wyvern just picked me up and dropped me into a lava river. Five stars.' },
                { channel: 'Map', user: 'ObsidianFan', msg: 'Obsidian Golems are actually kind of cute if you squint and ignore the murder' },
                { channel: 'Map', user: 'ArmorMelter', msg: 'PSA: plate armor conducts heat. My skin is medium rare.' },
                { channel: 'Guild', user: 'CalderaChef', msg: 'You CAN cook food on the lava vents. Source: desperate and hungry.' },
                { channel: 'Map', user: 'FloorIsLava', msg: 'This zone is literally the floor is lava but you can\'t jump' },
                { channel: 'Map', user: 'SerpentSurfer', msg: 'Just saw a Lava Serpent do a backflip. Nobody believes me.' },
            ],
        },
        {
            id: 'abyssal_depths',
            name: 'Abyssal Depths',
            subtitle: 'Sunken Bioluminescent Caverns',
            levelRange: [25, 34],
            icon: '🌊',
            color: '#22ddcc',
            bgColor: 'rgba(5,12,20,0.95)',
            description: 'Far beneath the ocean floor, colossal caverns glow with bioluminescent coral and pulsing ley-veins. Ancient leviathans stir in the crushing dark, and the drowned ruins of a pre-cataclysm civilization beckon from the abyss.',
            textures: {
                ground: 'https://rosebud.ai/assets/abyssal-ground.webp.webp?SzlW',
                rock: 'https://rosebud.ai/assets/abyssal-rock.webp.webp?FGGk',
            },
            colors: {
                fogColor: 0x020a14,
                ambientLight: 0x0a2030,
                directionalLight: 0x44aacc,
                godRayColor: 0x22ffcc,
                groundTint: 0x0a1a2a,
                sceneBg: 0x010508,
                fogDensity: 0.016,
                particleColor: 0x22ffaa,
            },
            mobTypes: [
                { name: 'Abyssal Crawler', color: 0x115544, minLevel: 25, maxLevel: 60, scale: 1.0, type: 'insectoid' },
                { name: 'Depth Lurker', color: 0x224466, minLevel: 25, maxLevel: 60, scale: 1.3, type: 'beast' },
                { name: 'Void Jellyfish', color: 0x8844cc, minLevel: 26, maxLevel: 60, scale: 1.1, type: 'jellyfish' },
                { name: 'Coral Golem', color: 0x116655, minLevel: 27, maxLevel: 60, scale: 1.6, type: 'elemental' },
                { name: 'Leviathan Spawn', color: 0x0a3355, minLevel: 29, maxLevel: 60, scale: 1.8, type: 'serpent' },
            ],
            eventTypes: [
                { name: 'Cull the Abyssal Crawlers', type: 'kill', target: 6 },
                { name: 'Harvest Bioluminescent Kelp', type: 'gather', target: 7 },
                { name: 'Purge the Void Jellyfish', type: 'kill', target: 5 },
                { name: 'Collect Deep-Ley Pearls', type: 'gather', target: 5 },
                { name: 'Shatter the Coral Golems', type: 'kill', target: 4 },
                { name: 'Salvage Drowned Relics', type: 'gather', target: 8 },
                { name: 'Slay the Leviathan Spawn', type: 'kill', target: 5 },
                { name: 'Tap the Abyssal Ley Nodes', type: 'gather', target: 6 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'DepthDiver', msg: 'The pressure down here is unreal... can barely see past the glow' },
                { channel: 'Guild', user: 'CoralSmith', msg: 'Guild aquaforge online — abyssal-steel weapons now craftable!' },
                { channel: 'Map', user: 'PearlHunter', msg: 'WTB Deep-Ley Pearl x8, paying 80g each' },
                { channel: 'Say', user: 'KelpCollector', msg: 'The bioluminescent kelp near the ruins is double-spawning today' },
                { channel: 'Map', user: 'LeviathanSlayer', msg: 'Leviathan Spawn spotted near the trench!' },
                { channel: 'Guild', user: 'AbyssAlchemist', msg: 'New pressure-resist potions in the guild vault' },
                { channel: 'Map', user: 'TrenchWarden', msg: 'LFG deep trench expedition, need DPS and healer' },
                { channel: 'Say', user: 'RuinExplorer', msg: 'Found another drowned archive — the lore here is incredible' },
                { channel: 'Map', user: 'VoidNetCaster', msg: 'Just crafted my first Abyssal trident! Glows in the dark' },
                { channel: 'Guild', user: 'DeepTactician', msg: 'Thalassor intel: stay behind the tentacles, attack the core' },
                { channel: 'Map', user: 'Claustrophobe', msg: 'Underwater cave zone. Thanks I hate it. My palms are sweating IRL.' },
                { channel: 'Map', user: 'JellyStung', msg: 'Void Jellyfish don\'t look dangerous. They are. Trust me. I\'m dead.' },
                { channel: 'Say', user: 'BubbleMan', msg: 'How are we breathing down here? Don\'t think about it too hard.' },
                { channel: 'Map', user: 'CrawlerStomp', msg: 'Abyssal Crawlers remind me of the cockroach in my kitchen. Same energy.' },
                { channel: 'Map', user: 'NightShift', msg: 'It\'s always dark down here. I can\'t tell if it\'s 3am or 3pm anymore.' },
                { channel: 'Guild', user: 'CoralLover', msg: 'The coral formations are gorgeous. I keep forgetting to fight things.' },
                { channel: 'Map', user: 'TrenchReport', msg: 'Just looked over the edge of the trench. The abyss stared back. It blinked.' },
                { channel: 'Map', user: 'PearlDiver', msg: 'Found a pearl inside a pearl inside a pearl. Pearception.' },
                { channel: 'Say', user: 'GlowWorm', msg: 'Everything glows down here. I glow now too. Is that normal?' },
                { channel: 'Map', user: 'DeepSurvival', msg: 'Leviathan Spawn just swam past me. I didn\'t move for 3 minutes. It worked.' },
            ],
        },
        {
            id: 'neon_wastes',
            name: 'Neon Wastes',
            subtitle: 'Xenotech Alien Frontier',
            levelRange: [35, 44],
            icon: '☢️',
            color: '#dd44ff',
            bgColor: 'rgba(15,5,20,0.95)',
            description: 'A shattered alien frontier where xenotech pylons crackle with plasma energy and bizarre extraterrestrial organisms roam the irradiated crust. The ruins of a long-dead civilization hum with power no mortal was meant to wield.',
            textures: {
                ground: 'https://rosebud.ai/assets/neon-wastes-ground.webp.webp?Xa6F',
                rock: 'https://rosebud.ai/assets/neon-wastes-rock.webp.webp?jIPg',
            },
            colors: {
                fogColor: 0x0a0515,
                ambientLight: 0x1a0a2a,
                directionalLight: 0xcc66ff,
                godRayColor: 0xff44cc,
                groundTint: 0x150820,
                sceneBg: 0x050208,
                fogDensity: 0.013,
                particleColor: 0xff66dd,
            },
            mobTypes: [
                { name: 'Plasma Mite', color: 0xcc33ff, minLevel: 35, maxLevel: 60, scale: 0.8, type: 'xenoswarm' },
                { name: 'Void Strider', color: 0x6622aa, minLevel: 35, maxLevel: 60, scale: 1.2, type: 'xenowalker' },
                { name: 'Neon Behemoth', color: 0x8811cc, minLevel: 36, maxLevel: 60, scale: 1.7, type: 'xenotitan' },
                { name: 'Rift Phantom', color: 0xdd55ff, minLevel: 37, maxLevel: 60, scale: 1.1, type: 'xenophantom' },
                { name: 'Chrono Wyrm', color: 0xaa22ff, minLevel: 39, maxLevel: 60, scale: 1.9, type: 'xenowyrm' },
            ],
            eventTypes: [
                { name: 'Exterminate the Plasma Swarm', type: 'kill', target: 6 },
                { name: 'Harvest Xenoflora Spores', type: 'gather', target: 7 },
                { name: 'Destroy the Void Striders', type: 'kill', target: 5 },
                { name: 'Collect Charged Plasma Cores', type: 'gather', target: 5 },
                { name: 'Topple the Neon Behemoths', type: 'kill', target: 4 },
                { name: 'Salvage Xenotech Components', type: 'gather', target: 8 },
                { name: 'Banish the Rift Phantoms', type: 'kill', target: 7 },
                { name: 'Tap the Plasma Conduits', type: 'gather', target: 6 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'XenoScout', msg: 'The air here tastes like static electricity and regret' },
                { channel: 'Guild', user: 'PlasmaSmith', msg: 'Guild xenoforge online — plasma-infused weapons now available!' },
                { channel: 'Map', user: 'CoreHunter', msg: 'WTB Charged Plasma Core x6, paying 200g each' },
                { channel: 'Say', user: 'SporeCollector', msg: 'Xenoflora Spores near the pylons are double-spawning today' },
                { channel: 'Map', user: 'WyrmTracker', msg: 'Chrono Wyrm spotted phase-shifting near the rift canyon!' },
                { channel: 'Guild', user: 'XenoAlchemist', msg: 'New radiation resist potions in the guild vault' },
                { channel: 'Map', user: 'WastesWarden', msg: 'LFG deep xenoruins run, need DPS and healer' },
                { channel: 'Say', user: 'RuinDiver', msg: 'Found another xenotech cache — the tech here is insane' },
                { channel: 'Map', user: 'PlasmaForger', msg: 'Just crafted my first Plasma Greatsword! It hums!' },
                { channel: 'Guild', user: 'PhaseExpert', msg: 'Null Singularis intel: avoid the gravity wells, burst during phase shift' },
                { channel: 'Map', user: 'GlowStick', msg: 'Everything here glows purple. My armor glows purple. I glow purple now.' },
                { channel: 'Map', user: 'StaticShock', msg: 'Touched a pylon. Got zapped. Touched it again. I don\'t learn.' },
                { channel: 'Say', user: 'AlienFoodie', msg: 'Do NOT eat the Xenoflora. I repeat. Do NOT.' },
                { channel: 'Map', user: 'PhantomFear', msg: 'Rift Phantoms phase through walls. WHERE IS SAFE. NOWHERE IS SAFE.' },
                { channel: 'Map', user: 'NeonCowboy', msg: 'This zone looks like someone spilled a blacklight on an alien planet. Love it.' },
                { channel: 'Guild', user: 'WastesSurvivor', msg: 'Tip: Neon Behemoths are slow. Very slow. But their stomp is... less slow.' },
                { channel: 'Map', user: 'ChromoNerd', msg: 'Chrono Wyrms can actually rewind time by 2 seconds. Yes I timed it. Yes I\'m that bored.' },
                { channel: 'Map', user: 'PurplePain', msg: 'I miss the ocean zone. At least the jellyfish were beautiful before they killed me.' },
            ],
        },
        {
            id: 'halo_ring',
            name: 'Autumn',
            subtitle: 'Ancient Ringworld Sanctum',
            levelRange: [45, 54],
            icon: '💠',
            color: '#44ddaa',
            bgColor: 'rgba(5,18,12,0.95)',
            description: 'A colossal alien ringworld left by a long-vanished civilization of god-like architects. Massive energy conduits pulse beneath a surface of ancient alloy and terraformed grasslands gone feral. Covenant-like war machines and corrupted Forerunner constructs patrol the ring, guarding secrets that could reshape reality itself.',
            textures: {
                ground: 'https://rosebud.ai/assets/neon-wastes-ground.webp.webp?Xa6F',
                rock: 'https://rosebud.ai/assets/neon-wastes-rock.webp.webp?jIPg',
            },
            colors: {
                fogColor: 0x041a10,
                ambientLight: 0x0a2a1a,
                directionalLight: 0x88ffcc,
                godRayColor: 0x44ffaa,
                groundTint: 0x081a10,
                sceneBg: 0x020a06,
                fogDensity: 0.012,
                particleColor: 0x44ffaa,
            },
            mobTypes: [
                { name: 'Grunt Zealot', color: 0x3388aa, minLevel: 45, maxLevel: 60, scale: 0.9, type: 'halogrunt' },
                { name: 'Elite Warden', color: 0x2266aa, minLevel: 45, maxLevel: 60, scale: 1.3, type: 'haloelite' },
                { name: 'Hunter Pair', color: 0x225588, minLevel: 46, maxLevel: 60, scale: 1.7, type: 'halohunter' },
                { name: 'Sentinel Drone', color: 0x88ccaa, minLevel: 47, maxLevel: 60, scale: 1.0, type: 'halosentinel' },
                { name: 'Arbiter Wraith', color: 0x116655, minLevel: 49, maxLevel: 60, scale: 1.9, type: 'halowraith' },
            ],
            eventTypes: [
                { name: 'Repel the Grunt Swarm', type: 'kill', target: 6 },
                { name: 'Harvest Ring Energy Shards', type: 'gather', target: 7 },
                { name: 'Eliminate the Elite Wardens', type: 'kill', target: 5 },
                { name: 'Collect Forerunner Data Keys', type: 'gather', target: 5 },
                { name: 'Destroy the Hunter Pairs', type: 'kill', target: 4 },
                { name: 'Salvage Sentinel Components', type: 'gather', target: 8 },
                { name: 'Purge the Sentinel Drones', type: 'kill', target: 7 },
                { name: 'Tap the Conduit Relays', type: 'gather', target: 6 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'RingRunner', msg: 'The scale of this place is insane. You can see the ring curving upward in the distance.' },
                { channel: 'Guild', user: 'ForerunnerNerd', msg: 'Guild research team decoded another glyph — new weapon schematics!' },
                { channel: 'Map', user: 'ShardHunter', msg: 'WTB Ring Energy Shard x8, paying 500g each' },
                { channel: 'Say', user: 'DataCollector', msg: 'The Forerunner data keys near the spire are triple-spawning today' },
                { channel: 'Map', user: 'WraithTracker', msg: 'Arbiter Wraith spotted phase-shifting near the conduit bridge!' },
                { channel: 'Guild', user: 'RingAlchemist', msg: 'New energy-shield potions in the guild vault' },
                { channel: 'Map', user: 'RingWarden', msg: 'LFG deep sanctum run, need DPS and healer' },
                { channel: 'Say', user: 'RelicDiver', msg: 'Found another Forerunner cache — the tech here is beyond anything' },
                { channel: 'Map', user: 'AlloyForger', msg: 'Just crafted my first Ringworld Greatsword! It hums with ancient power!' },
                { channel: 'Guild', user: 'TacticalGuru', msg: 'Archon Eternis intel: avoid the pulse beams, burst during shield recharge phase' },
                { channel: 'Map', user: 'VerticallyLost', msg: 'I looked up and saw the OTHER side of the ring. With oceans. My brain hurts.' },
                { channel: 'Map', user: 'GruntPunter', msg: 'Grunt Zealots make a squeaking noise when they die. Almost feel bad. Almost.' },
                { channel: 'Say', user: 'HaloFanboy', msg: 'This place reminds me of something... cant quite put my finger on it.' },
                { channel: 'Map', user: 'HunterFear', msg: 'Hunter Pairs. PAIRS. As in two of them. Who approved this encounter design.' },
                { channel: 'Map', user: 'SentinelShock', msg: 'Got zapped by a Sentinel beam. My screen went white. My soul left my body.' },
                { channel: 'Guild', user: 'RingSurvivor', msg: 'Tip: Elite Wardens telegraph their energy sword dash. Dodge LEFT not right.' },
                { channel: 'Map', user: 'CurvatureCheck', msg: 'Fun fact: if you walk in one direction long enough you end up where you started. Its a ring.' },
                { channel: 'Map', user: 'NostalgiaBot', msg: 'This zone gives me 2001 vibes. In a good way. A very good way.' },
            ],
        },
        {
            id: 'crimson_reach',
            name: 'Crimson Reach',
            subtitle: 'Geonosian Battle Spires',
            levelRange: [55, 60],
            icon: '🏜️',
            color: '#cc5533',
            bgColor: 'rgba(25,8,5,0.95)',
            description: 'A scorched alien desert of crimson hardpan and towering sandstone spires carved by millennia of corrosive wind. Beneath the dunes, a vast hive-mind civilization builds war machines in sprawling foundries. This is the endgame — the final proving ground of the Idle Realms.',
            textures: {
                ground: 'https://rosebud.ai/assets/crimson-desert-ground.webp?CXpZ',
                rock: 'https://rosebud.ai/assets/crimson-desert-rock.webp?IUAC',
            },
            colors: {
                fogColor: 0x1a0805,
                ambientLight: 0x2a1508,
                directionalLight: 0xffaa66,
                godRayColor: 0xff8844,
                groundTint: 0x2a1208,
                sceneBg: 0x0a0402,
                fogDensity: 0.011,
                particleColor: 0xcc6633,
            },
            mobTypes: [
                { name: 'Hive Drone', color: 0x884422, minLevel: 55, maxLevel: 60, scale: 0.9, type: 'hivedrone' },
                { name: 'Spire Sentinel', color: 0x996633, minLevel: 55, maxLevel: 60, scale: 1.4, type: 'spiresentinel' },
                { name: 'Sand Colossus', color: 0x774411, minLevel: 56, maxLevel: 60, scale: 1.8, type: 'sandcolossus' },
                { name: 'Forge Overseer', color: 0xaa5522, minLevel: 57, maxLevel: 60, scale: 1.3, type: 'forgeoverseer' },
                { name: 'Crimson Wyrmlord', color: 0xcc3311, minLevel: 58, maxLevel: 60, scale: 2.0, type: 'crimsonwyrm' },
            ],
            eventTypes: [
                { name: 'Cull the Hive Drones', type: 'kill', target: 6 },
                { name: 'Harvest Crimson Spire Shards', type: 'gather', target: 7 },
                { name: 'Destroy Spire Sentinels', type: 'kill', target: 5 },
                { name: 'Collect Foundry Cores', type: 'gather', target: 5 },
                { name: 'Topple Sand Colossi', type: 'kill', target: 4 },
                { name: 'Salvage War Machine Parts', type: 'gather', target: 8 },
                { name: 'Purge the Forge Overseers', type: 'kill', target: 7 },
                { name: 'Tap the Geo-Thermal Vents', type: 'gather', target: 6 },
            ],
            chatMessages: [
                { channel: 'Map', user: 'DesertRat', msg: 'The heat here makes the Molten Wasteland feel like a spa day' },
                { channel: 'Guild', user: 'SpireForger', msg: 'Guild foundry unlocked — crimson alloy weapons available!' },
                { channel: 'Map', user: 'ShardHoarder', msg: 'WTB Crimson Spire Shard x10, paying 1000g each' },
                { channel: 'Say', user: 'SandCrawler', msg: 'The geo-thermal vents near the hive are double-spawning today' },
                { channel: 'Map', user: 'WyrmSpotter', msg: 'Crimson Wyrmlord spotted burrowing near the arena canyon!' },
                { channel: 'Guild', user: 'DesertAlchemist', msg: 'New sandstorm resist potions in the guild vault' },
                { channel: 'Map', user: 'ReachWarden', msg: 'LFG deep hive run, need DPS and healer' },
                { channel: 'Say', user: 'RelicDigger', msg: 'Found another hive foundry cache — the tech here is terrifying' },
                { channel: 'Map', user: 'CrimsonSmith', msg: 'Just forged my first Crimson Greatsword! It pulses with heat!' },
                { channel: 'Guild', user: 'HiveTactician', msg: 'Hive Primus intel: destroy the egg sacs, then burst during molt phase' },
                { channel: 'Map', user: 'SandBlasted', msg: 'I can feel the sand in places sand should not be. This zone is personal.' },
                { channel: 'Map', user: 'BugSquasher', msg: 'Hive Drones make a squelching noise when they die. Satisfying and disgusting.' },
                { channel: 'Say', user: 'ArenaFan', msg: 'The spire arena reminds me of somewhere... cant place it. Definitely not a movie.' },
                { channel: 'Map', user: 'ColossusVictim', msg: 'Sand Colossus just emerged from under me. I was standing on it. THIS WHOLE TIME.' },
                { channel: 'Map', user: 'HeatStroke2', msg: 'Came from the ring zone. At least there it was a comfortable temperature. This is HELL.' },
                { channel: 'Guild', user: 'DesertSurvivor', msg: 'Tip: Forge Overseers telegraph their beam attack. Look for the glow.' },
                { channel: 'Map', user: 'EndgameVibes', msg: 'This is it. The final zone. Everything has been building to this.' },
                { channel: 'Map', user: 'LoreNerd', msg: 'The hive civilization has been here for 10,000 years. We showed up last Tuesday.' },
            ],
        },
    ],

    // Skills — 8 total, unlocked by level progression
    // Left bar (1-4):  core combat rotation
    // Right bar (5-8): advanced / elite abilities
    WARRIOR_SKILLS: [
        // ── LEFT BAR (slots 1-4) ──────────────────────────────
        // Slot 1: Aether Strike — free, white-label basic ability (Lvl 1)
        {
            name: 'Aether Strike', iconKey: 'sword', cooldown: 0, dpsMultiplier: 1.0,
            description: 'Channel aether through your blade for a quick, precise strike. No cost.',
            slot: 1, unlockLevel: 1, manaCost: 0, nameColor: '#ccddcc',
        },
        // Slot 2: Whirlwind Slash — cleave AoE (Lvl 5, GW2 Warrior "Whirlwind Attack" inspired)
        {
            name: 'Whirlwind Slash', iconKey: 'whirlwind', cooldown: 8, dpsMultiplier: 2.5,
            description: 'Spin your blade in a vicious arc, cleaving all enemies in range.',
            slot: 2, unlockLevel: 5, manaCost: 8, nameColor: '#44cc88',
        },
        // Slot 3: Aegis Guard — defensive cooldown (Lvl 9, GW2 Guardian "Aegis" inspired)
        {
            name: 'Aegis Guard', iconKey: 'shield', cooldown: 14, dpsMultiplier: 0,
            description: 'Conjure an arcane shield that reduces all incoming damage by 50% for 8s.',
            slot: 3, unlockLevel: 9, manaCost: 10, nameColor: '#4488dd',
            buffType: 'defense', buffDuration: 8, buffValue: 0.5,
        },
        // Slot 4: War Cry — burst damage buff (Lvl 15, WoW Warrior "Recklessness" inspired)
        {
            name: 'War Cry', iconKey: 'warcry', cooldown: 22, dpsMultiplier: 0,
            description: 'Unleash a fearsome battle shout, increasing all damage dealt by 60% for 10s.',
            slot: 4, unlockLevel: 15, manaCost: 15, nameColor: '#ffaa44',
            buffType: 'damage', buffDuration: 10, buffValue: 1.6,
        },
        // ── RIGHT BAR (slots 5-8) — Advanced abilities ───────
        // Slot 5: Rending Blades — bleed/DoT (Lvl 21, GW2 Warrior "Rending Strikes" inspired)
        {
            name: 'Rending Blades', iconKey: 'rendingBlades', cooldown: 10, dpsMultiplier: 1.8,
            description: 'Lacerate your foe with twin aether blades, shredding armor and causing bleed.',
            slot: 5, unlockLevel: 21, manaCost: 12, nameColor: '#cc4444',
        },
        // Slot 6: Dragon's Fury — fire burst nuke (Lvl 26, WoW "Dragon's Breath" inspired)
        {
            name: "Dragon's Fury", iconKey: 'dragonsFury', cooldown: 16, dpsMultiplier: 3.2,
            description: 'Channel the fury of the elder drakes into a devastating cone of fire.',
            slot: 6, unlockLevel: 26, manaCost: 18, nameColor: '#ff8833',
        },
        // Slot 7: Void Rift — shadow AoE (Lvl 30, GW2 Reaper "Rift" inspired)
        {
            name: 'Void Rift', iconKey: 'voidRift', cooldown: 20, dpsMultiplier: 2.8,
            description: 'Tear open a rift to the void, pulling nearby enemies in and dealing shadow damage.',
            slot: 7, unlockLevel: 30, manaCost: 22, nameColor: '#bb55ff',
        },
        // Slot 8: Cataclysm — ultimate (Lvl 35, WoW "Reckoning" / GW2 "Lich Form" tier)
        {
            name: 'Cataclysm', iconKey: 'cataclysm', cooldown: 30, dpsMultiplier: 5.0,
            description: 'Unleash total devastation in a pillar of arcane energy. Your most powerful ability.',
            slot: 8, unlockLevel: 35, manaCost: 30, nameColor: '#ffdd44',
        },
    ],

    MAGE_SKILLS: [
        {
            name: 'Void Bolt', iconKey: 'voidBolt', cooldown: 0, dpsMultiplier: 1.2,
            description: 'Fire a bolt of raw void energy at your target. Basic ranged attack.',
            slot: 1, unlockLevel: 1, manaCost: 0, nameColor: '#ccbbff',
        },
        {
            name: 'Shadow Grasp', iconKey: 'shadowGrasp', cooldown: 7, dpsMultiplier: 1.8,
            description: 'Manifest shadowy tendrils that slow and crush your target.',
            slot: 2, unlockLevel: 5, manaCost: 10, nameColor: '#bb66ff',
        },
        {
            name: 'Entropy Shield', iconKey: 'entropyShield', cooldown: 15, dpsMultiplier: 0,
            description: 'Surround yourself with a chaotic energy field, reducing damage taken by 40% for 8s.',
            slot: 3, unlockLevel: 9, manaCost: 12, nameColor: '#bb55ff',
            buffType: 'defense', buffDuration: 8, buffValue: 0.6,
        },
        {
            name: 'Echoing Void', iconKey: 'echoingVoid', cooldown: 25, dpsMultiplier: 0,
            description: 'Channel the void to echo your spells, increasing all damage dealt by 70% for 10s.',
            slot: 4, unlockLevel: 15, manaCost: 20, nameColor: '#dd44ff',
            buffType: 'damage', buffDuration: 10, buffValue: 1.7,
        },
        {
            name: 'Abyssal Spike', iconKey: 'abyssalSpike', cooldown: 12, dpsMultiplier: 2.8,
            description: 'Summon a spike of pure void energy beneath your foe, piercing all defenses.',
            slot: 5, unlockLevel: 21, manaCost: 18, nameColor: '#9933ff',
        },
        {
            name: 'Rift Collapse', iconKey: 'riftCollapse', cooldown: 18, dpsMultiplier: 3.5,
            description: 'Tear open a rift and collapse it instantly, dealing massive shadow damage to all nearby.',
            slot: 6, unlockLevel: 26, manaCost: 25, nameColor: '#cc00ff',
        },
        {
            name: 'Void Nova', iconKey: 'voidNova', cooldown: 22, dpsMultiplier: 4.2,
            description: 'Unleash a massive wave of void energy, obliterating everything in its path.',
            slot: 7, unlockLevel: 30, manaCost: 35, nameColor: '#ff44ff',
        },
        {
            name: 'Singularity', iconKey: 'singularity', cooldown: 35, dpsMultiplier: 6.0,
            description: 'Create a localized black hole that draws in all matter and detonates with catastrophic force.',
            slot: 8, unlockLevel: 35, manaCost: 50, nameColor: '#ffdd44',
        },
    ],

    RANGER_SKILLS: [
        {
            name: 'Bramble Shot', iconKey: 'brambleShot', cooldown: 0, dpsMultiplier: 1.1,
            description: 'Fire a wooden arrow entwined with thorny vines. Basic ranged attack.',
            slot: 1, unlockLevel: 1, manaCost: 0, nameColor: '#ccddcc',
        },
        {
            name: 'Thorn Volley', iconKey: 'thornVolley', cooldown: 6, dpsMultiplier: 2.0,
            description: 'Fire a spray of sharp thorns in a cone, striking multiple foes.',
            slot: 2, unlockLevel: 5, manaCost: 8, nameColor: '#44cc88',
        },
        {
            name: 'Oakheart Guard', iconKey: 'oakheartGuard', cooldown: 16, dpsMultiplier: 0,
            description: 'Nature protects you, reducing damage taken by 45% for 10s.',
            slot: 3, unlockLevel: 9, manaCost: 12, nameColor: '#4488dd',
            buffType: 'defense', buffDuration: 10, buffValue: 0.55,
        },
        {
            name: 'Call of the Wild', iconKey: 'callOfTheWild', cooldown: 24, dpsMultiplier: 0,
            description: 'Unleash your primal spirit, increasing attack speed by 50% for 12s.',
            slot: 4, unlockLevel: 15, manaCost: 15, nameColor: '#ffaa44',
            buffType: 'damage', buffDuration: 12, buffValue: 1.5,
        },
        {
            name: 'Venom Sting', iconKey: 'venomSting', cooldown: 10, dpsMultiplier: 2.2,
            description: 'Fire a poison-tipped arrow that deals significant nature damage over time.',
            slot: 5, unlockLevel: 21, manaCost: 14, nameColor: '#cc4444',
        },
        {
            name: 'Sylvan Burst', iconKey: 'sylvanBurst', cooldown: 15, dpsMultiplier: 3.4,
            description: 'An explosion of emerald energy detonates at the target location.',
            slot: 6, unlockLevel: 26, manaCost: 20, nameColor: '#ff8833',
        },
        {
            name: "Nature's Wrath", iconKey: 'naturesWrath', cooldown: 20, dpsMultiplier: 4.5,
            description: 'Channel the raw fury of the forest into a devastating beam of energy.',
            slot: 7, unlockLevel: 30, manaCost: 30, nameColor: '#bb55ff',
        },
        {
            name: 'Wrath of the Forest', iconKey: 'wrathOfTheForest', cooldown: 35, dpsMultiplier: 6.5,
            description: 'Summon giant roots to crush all enemies in a wide area. Your ultimate hunter ability.',
            slot: 8, unlockLevel: 35, manaCost: 45, nameColor: '#ffdd44',
        },
    ],

    CLERIC_SKILLS: [
        {
            name: 'Dawn Strike', iconKey: 'dawnStrike', cooldown: 0, dpsMultiplier: 0.9,
            description: 'Channel radiant dawn energy through your staff for a precise holy strike. No cost.',
            slot: 1, unlockLevel: 1, manaCost: 0, nameColor: '#ffdd66',
        },
        {
            name: 'Holy Smite', iconKey: 'holySmite', cooldown: 7, dpsMultiplier: 2.2,
            description: 'Call down a beam of divine judgment upon your foe, dealing radiant damage.',
            slot: 2, unlockLevel: 5, manaCost: 10, nameColor: '#ffcc44',
        },
        {
            name: 'Divine Ward', iconKey: 'divineWard', cooldown: 14, dpsMultiplier: 0,
            description: 'Erect a golden barrier of holy light, reducing all incoming damage by 55% for 10s.',
            slot: 3, unlockLevel: 9, manaCost: 12, nameColor: '#ffaa22',
            buffType: 'defense', buffDuration: 10, buffValue: 0.45,
        },
        {
            name: 'Benediction', iconKey: 'benediction', cooldown: 22, dpsMultiplier: 0,
            description: 'Invoke a divine blessing, increasing all damage and healing by 50% for 12s.',
            slot: 4, unlockLevel: 15, manaCost: 18, nameColor: '#ffee66',
            buffType: 'damage', buffDuration: 12, buffValue: 1.5,
        },
        {
            name: 'Radiant Flare', iconKey: 'radiantFlare', cooldown: 10, dpsMultiplier: 2.0,
            description: 'Release a burst of holy fire that scorches all nearby enemies with purifying flame.',
            slot: 5, unlockLevel: 21, manaCost: 14, nameColor: '#ffcc00',
        },
        {
            name: 'Solar Lance', iconKey: 'solarLance', cooldown: 16, dpsMultiplier: 3.5,
            description: 'Hurl a blazing lance of concentrated sunlight, piercing through all defenses.',
            slot: 6, unlockLevel: 26, manaCost: 22, nameColor: '#ffaa00',
        },
        {
            name: 'Sanctified Ground', iconKey: 'sanctifiedGround', cooldown: 20, dpsMultiplier: 3.0,
            description: 'Consecrate the ground beneath your foes, dealing persistent radiant damage and healing allies.',
            slot: 7, unlockLevel: 30, manaCost: 28, nameColor: '#ddaa44',
        },
        {
            name: 'Dawn Chorus', iconKey: 'dawnChorus', cooldown: 35, dpsMultiplier: 5.5,
            description: 'Channel the full power of the dawn into a devastating hymn of radiant destruction. Your ultimate divine ability.',
            slot: 8, unlockLevel: 35, manaCost: 40, nameColor: '#ffdd44',
        },
    ],

    get SKILLS() {
        // Fallback for logic that still uses CONFIG.SKILLS directly
        // Note: In real gameplay, gameState.getSkills() should be used
        if (typeof window !== 'undefined' && window.gameState) {
            return window.gameState.getSkills();
        }
        return this.WARRIOR_SKILLS;
    },

    // Textures (zone 1 defaults — kept for backward compatibility)
    TEXTURES: {
        ground: 'https://rosebud.ai/assets/forest-ground.webp?GdJe',
        bark: 'https://rosebud.ai/assets/tree-bark.webp?w0os',
        canopy: 'https://rosebud.ai/assets/leaf-canopy.webp?IvWE',
        rock: 'https://rosebud.ai/assets/moss-rock.webp?yS1m',
        skillSlash: 'https://rosebud.ai/assets/skill-slash.webp?2F4T',
        skybox: 'https://rosebud.ai/assets/skybox-forest.webp?zDJz',
    },

    // ──────────────────────────────────────────────────────────────
    // QUEST ITEM DROPS — items that mobs can drop for quest objectives
    // key = quest item id, value = { name, dropSources: [mobName], dropChance }
    // ──────────────────────────────────────────────────────────────
    QUEST_ITEM_DROPS: {
        // ── Verdant Wilds (guaranteed — tutorial zone, items should feel free) ──
        wurm_fang:      { name: 'Wurm Fang',      dropSources: ['Forest Wurm'],   dropChance: 1.0 },
        golem_core:     { name: 'Golem Core',      dropSources: ['Moss Golem'],    dropChance: 1.0 },
        spider_venom:   { name: 'Spider Venom Sac', dropSources: ['Jungle Spider'], dropChance: 1.0 },
        stalker_vine:   { name: 'Stalker Vine',    dropSources: ['Vine Stalker'],  dropChance: 1.0 },
        // ── Shattered Expanse (near-guaranteed — quest mobs can be scarce) ──
        wraith_essence: { name: 'Wraith Essence',  dropSources: ['Frost Wraith'],    dropChance: 1.0 },
        scarab_chitin:  { name: 'Scarab Chitin',   dropSources: ['Ice Scarab'],      dropChance: 1.0 },
        sentinel_shard: { name: 'Sentinel Shard',  dropSources: ['Crystal Sentinel'], dropChance: 0.95 },
        stalker_fang:   { name: 'Stalker Fang',    dropSources: ['Glacial Stalker'], dropChance: 0.95 },
        drake_scale:    { name: 'Rime Drake Scale', dropSources: ['Rime Drake'],     dropChance: 0.90 },
        // ── Molten Wasteland (very high rates) ──
        hound_ember:    { name: 'Hound Ember',     dropSources: ['Magma Hound'],     dropChance: 0.95 },
        obsidian_heart: { name: 'Obsidian Heart',   dropSources: ['Obsidian Golem'],  dropChance: 0.90 },
        wraith_ash:     { name: 'Cinder Ash',       dropSources: ['Cinder Wraith'],   dropChance: 0.90 },
        serpent_fang:   { name: 'Lava Serpent Fang', dropSources: ['Lava Serpent'],    dropChance: 0.90 },
        wyvern_horn:    { name: 'Wyvern Horn',      dropSources: ['Infernal Wyvern'], dropChance: 0.85 },
        // ── Abyssal Depths (high rates) ──
        crawler_chitin: { name: 'Crawler Chitin',    dropSources: ['Abyssal Crawler'],  dropChance: 0.95 },
        lurker_fin:     { name: 'Lurker Fin',         dropSources: ['Depth Lurker'],     dropChance: 0.90 },
        jelly_essence:  { name: 'Void Jelly',         dropSources: ['Void Jellyfish'],   dropChance: 0.90 },
        coral_shard:    { name: 'Living Coral Shard', dropSources: ['Coral Golem'],      dropChance: 0.85 },
        leviathan_scale:{ name: 'Leviathan Scale',    dropSources: ['Leviathan Spawn'],  dropChance: 0.85 },
        // ── Neon Wastes (high rates) ──
        mite_plasma:    { name: 'Plasma Gland',        dropSources: ['Plasma Mite'],       dropChance: 0.95 },
        strider_core:   { name: 'Strider Phase Core',  dropSources: ['Void Strider'],      dropChance: 0.90 },
        behemoth_plate: { name: 'Behemoth Carapace',   dropSources: ['Neon Behemoth'],     dropChance: 0.85 },
        phantom_wisp:   { name: 'Phantom Residue',     dropSources: ['Rift Phantom'],      dropChance: 0.90 },
        wyrm_chrono:    { name: 'Chrono Shard',         dropSources: ['Chrono Wyrm'],       dropChance: 0.85 },
        // ── Autumn (high rates) ──
        grunt_methane:  { name: 'Methane Cell',           dropSources: ['Grunt Zealot'],       dropChance: 0.95 },
        elite_blade:    { name: 'Energy Blade Shard',     dropSources: ['Elite Warden'],       dropChance: 0.90 },
        hunter_worm:    { name: 'Lekgolo Worm Cluster',   dropSources: ['Hunter Pair'],        dropChance: 0.85 },
        sentinel_lens:  { name: 'Sentinel Beam Lens',     dropSources: ['Sentinel Drone'],     dropChance: 0.90 },
        wraith_core:    { name: 'Wraith Phase Core',      dropSources: ['Arbiter Wraith'],     dropChance: 0.85 },
        // ── Crimson Reach (high rates) ──
        drone_chitin:   { name: 'Hive Chitin Plate',     dropSources: ['Hive Drone'],          dropChance: 0.95 },
        sentinel_core:  { name: 'Spire Core Fragment',   dropSources: ['Spire Sentinel'],      dropChance: 0.90 },
        colossus_heart: { name: 'Colossus Heartstone',   dropSources: ['Sand Colossus'],       dropChance: 0.85 },
        overseer_lens:  { name: 'Forge Lens',            dropSources: ['Forge Overseer'],      dropChance: 0.90 },
        wyrmlord_fang:  { name: 'Wyrmlord Crimson Fang', dropSources: ['Crimson Wyrmlord'],    dropChance: 0.85 },
    },

    // ──────────────────────────────────────────────────────────────
    // WORLD PICKUPS — items that spawn as 3D objects on the map
    // Each zone lists its own pickups with spawn counts and appearance
    // ──────────────────────────────────────────────────────────────
    WORLD_PICKUPS: {
        verdant_wilds: [
            {
                id: 'moonpetal_flower',
                name: 'Moonpetal Flower',
                count: 12,              // how many on the map at once
                respawnTime: 10,         // seconds after pickup
                color: 0xff88cc,         // pink glow
                emissive: 0xff44aa,
                modelType: 'flower',     // 3D model shape
            },
            {
                id: 'starbloom_orchid',
                name: 'Starbloom Orchid',
                count: 10,
                respawnTime: 12,
                color: 0x44ccff,         // blue glow
                emissive: 0x2288ff,
                modelType: 'orchid',
            },
        ],
        shattered_expanse: [
            {
                id: 'frozen_ley_shard',
                name: 'Frozen Ley Shard',
                count: 11,
                respawnTime: 12,
                color: 0x88ddff,
                emissive: 0x44aaff,
                modelType: 'crystal',
            },
            {
                id: 'frostbloom_herb',
                name: 'Frostbloom Herb',
                count: 10,
                respawnTime: 12,
                color: 0xaaeeff,
                emissive: 0x66ccdd,
                modelType: 'flower',
            },
        ],
        molten_abyss: [
            {
                id: 'molten_core_fragment',
                name: 'Molten Core Fragment',
                count: 11,
                respawnTime: 12,
                color: 0xff4400,
                emissive: 0xff2200,
                modelType: 'magma_crystal',
            },
            {
                id: 'ashbloom_flower',
                name: 'Ashbloom Flower',
                count: 10,
                respawnTime: 14,
                color: 0xff8844,
                emissive: 0xff6622,
                modelType: 'ashbloom',
            },
        ],
        abyssal_depths: [
            {
                id: 'deep_ley_pearl',
                name: 'Deep-Ley Pearl',
                count: 11,
                respawnTime: 12,
                color: 0x22ffcc,
                emissive: 0x11ddaa,
                modelType: 'pearl',
            },
            {
                id: 'biolum_kelp',
                name: 'Bioluminescent Kelp',
                count: 10,
                respawnTime: 14,
                color: 0x44ff88,
                emissive: 0x22cc66,
                modelType: 'kelp',
            },
        ],
        neon_wastes: [
            {
                id: 'charged_plasma_core',
                name: 'Charged Plasma Core',
                count: 11,
                respawnTime: 12,
                color: 0xff44cc,
                emissive: 0xdd22aa,
                modelType: 'magma_crystal',
            },
            {
                id: 'xenoflora_spore',
                name: 'Xenoflora Spore',
                count: 10,
                respawnTime: 14,
                color: 0xcc55ff,
                emissive: 0xaa33dd,
                modelType: 'orchid',
            },
        ],
        halo_ring: [
            {
                id: 'ring_energy_shard',
                name: 'Ring Energy Shard',
                count: 11,
                respawnTime: 12,
                color: 0x44ffaa,
                emissive: 0x22dd88,
                modelType: 'crystal',
            },
            {
                id: 'forerunner_data_key',
                name: 'Forerunner Data Key',
                count: 10,
                respawnTime: 14,
                color: 0x88ddcc,
                emissive: 0x66bbaa,
                modelType: 'pearl',
            },
        ],
        crimson_reach: [
            {
                id: 'crimson_spire_shard',
                name: 'Crimson Spire Shard',
                count: 11,
                respawnTime: 12,
                color: 0xff6633,
                emissive: 0xcc4411,
                modelType: 'magma_crystal',
            },
            {
                id: 'foundry_core',
                name: 'Foundry Core',
                count: 10,
                respawnTime: 14,
                color: 0xffaa44,
                emissive: 0xdd8822,
                modelType: 'pearl',
            },
        ],
    },

    // ──────────────────────────────────────────────────────────────
    // ZONE BOSSES — each zone's final challenge, gating progression
    // Boss spawns after ALL story quests in a zone are complete.
    // Defeating the boss reveals a reward chest and unlocks zone travel.
    // ──────────────────────────────────────────────────────────────
    ZONE_BOSSES: {
        verdant_wilds: {
            name: 'Thornmother Gaia',
            type: 'plant',
            color: 0x1a5a0a,
            scale: 2.8,
            level: 7,
            hpMultiplier: 8,        // 8x normal mob HP
            damageMultiplier: 2.5,
            xpReward: 2000,
            goldReward: 150,
            karmaReward: 100,
            questId: 'vw_boss',      // boss quest that triggers
            storyEndQuestId: 'vw5',  // last story quest before boss
        },
        shattered_expanse: {
            name: 'Glacius the Eternal',
            type: 'dragon',
            color: 0x2244aa,
            scale: 3.2,
            level: 14,
            hpMultiplier: 10,
            damageMultiplier: 3.0,
            xpReward: 5000,
            goldReward: 300,
            karmaReward: 200,
            questId: 'se_boss',
            storyEndQuestId: 'se5',
        },
        molten_abyss: {
            name: 'Pyroclast, the Undying Flame',
            type: 'demon',
            color: 0xff2200,
            scale: 3.5,
            level: 24,
            hpMultiplier: 12,
            damageMultiplier: 3.5,
            xpReward: 12000,
            goldReward: 600,
            karmaReward: 400,
            questId: 'ma_boss',
            storyEndQuestId: 'ma10',
        },
        abyssal_depths: {
            name: 'Thalassor, the Drowned God',
            type: 'jellyfish',
            color: 0x4422aa,
            scale: 4.0,
            level: 34,
            hpMultiplier: 14,
            damageMultiplier: 4.0,
            xpReward: 25000,
            goldReward: 1200,
            karmaReward: 800,
            questId: 'ad_boss',
            storyEndQuestId: 'ad10',
        },
        neon_wastes: {
            name: 'Null Singularis, the Unmaker',
            type: 'xenotitan',
            color: 0xcc00ff,
            scale: 4.5,
            level: 44,
            hpMultiplier: 16,
            damageMultiplier: 4.5,
            xpReward: 50000,
            goldReward: 2500,
            karmaReward: 1500,
            questId: 'nw_boss',
            storyEndQuestId: 'nw10',
        },
        halo_ring: {
            name: 'Archon Eternis, the Ring\'s Will',
            type: 'halosentinel',
            color: 0x22ffaa,
            scale: 5.0,
            level: 54,
            hpMultiplier: 18,
            damageMultiplier: 5.0,
            xpReward: 100000,
            goldReward: 5000,
            karmaReward: 3000,
            questId: 'hr_boss',
            storyEndQuestId: 'hr15',
        },
        crimson_reach: {
            name: 'Hive Primus, the Crimson Overmind',
            type: 'crimsonwyrm',
            color: 0xcc2200,
            scale: 5.5,
            level: 60,
            hpMultiplier: 22,
            damageMultiplier: 6.0,
            xpReward: 200000,
            goldReward: 10000,
            karmaReward: 6000,
            questId: 'cr_boss',
            storyEndQuestId: 'cr20',
        },
    },

    // Quest chains — each zone has a sequential chain; completing one auto-accepts the next
    QUEST_CHAINS: [
        // ════════════════════════════════════════════════════════════
        // VERDANT WILDS (Lv 1-7) — 5 unique story quests + 3 repeating
        // ════════════════════════════════════════════════════════════

        // Quest 1: "First Blood" — Intro combat quest (pure kill, teaches combat)
        {
            id: 'vw1', zone: 'Verdant Wilds', chain: 1,
            name: 'First Blood',
            description: 'The outpost scouts report aggressive Forest Wurms encroaching on supply routes. Take up your power and thin their numbers — show the Wilds that a new hero has arrived.',
            objectives: [
                { type: 'kill_type', mobName: 'Forest Wurm', current: 0, target: 3, label: 'Slay Forest Wurms' },
                { type: 'kill_any', current: 0, target: 2, label: 'Defeat any other creature' },
            ],
            rewards: { xp: 120, gold: 8, karma: 5 },
            levelReq: 1, next: 'vw2',
        },

        // Quest 2: "Moonpetal Remedy" — World pickup quest (introduces pickup collection)
        {
            id: 'vw2', zone: 'Verdant Wilds', chain: 1,
            name: 'Moonpetal Remedy',
            description: 'The outpost healer, Mira Thorne, is running dangerously low on poultice ingredients. Moonpetal Flowers — glowing pink blooms scattered throughout the forest — are the key reagent. Walk near them to collect their petals before they wilt in the sun.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'moonpetal_flower', current: 0, target: 3, label: 'Gather Moonpetal Flowers' },
            ],
            rewards: { xp: 180, gold: 12, karma: 8 },
            levelReq: 1, next: 'vw3',
        },

        // Quest 3: "Fangs & Venom" — Multi-source mob drops (teaches drop-from-kills mechanic)
        {
            id: 'vw3', zone: 'Verdant Wilds', chain: 1,
            name: 'Fangs & Venom',
            description: 'Forgemaster Kael needs aether-laced Wurm Fangs to temper a new alloy, and Mira requires Spider Venom Sacs for an antivenin — the spiders have been biting merchants on the road. Hunt both creatures and collect what drops from their corpses.',
            objectives: [
                { type: 'collect_drop', dropId: 'wurm_fang', current: 0, target: 2, label: 'Collect Wurm Fangs' },
                { type: 'collect_drop', dropId: 'spider_venom', current: 0, target: 1, label: 'Collect Spider Venom Sac' },
            ],
            rewards: { xp: 300, gold: 20, karma: 14 },
            levelReq: 2, next: 'vw4',
        },

        // Quest 4: "The Sacred Grove" — Mixed quest (kills + world pickups + mob drops)
        {
            id: 'vw4', zone: 'Verdant Wilds', chain: 1,
            name: 'The Sacred Grove',
            description: 'Priory Scholar Elara has located an ancient grove where rare Starbloom Orchids grow at ley-line convergences. But the Moss Golems there have gone berserk, and their Golem Cores may hold clues to the corruption. Clear the golems, harvest orchids from the ground, and retrieve the cores from the fallen guardians.',
            objectives: [
                { type: 'kill_type', mobName: 'Moss Golem', current: 0, target: 2, label: 'Destroy corrupted Moss Golems' },
                { type: 'collect_pickup', pickupId: 'starbloom_orchid', current: 0, target: 2, label: 'Harvest Starbloom Orchids' },
                { type: 'collect_drop', dropId: 'golem_core', current: 0, target: 2, label: 'Retrieve Golem Cores' },
            ],
            rewards: { xp: 500, gold: 35, karma: 25 },
            levelReq: 3, next: 'vw5',
        },

        // Quest 5: "Heart of the Forest" — Grand finale (all mechanics combined)
        {
            id: 'vw5', zone: 'Verdant Wilds', chain: 1,
            name: 'Heart of the Forest',
            description: 'Scholar Elara has deciphered the corruption\'s source — a dark entity feeding on the forest\'s ley energy. To craft a Purifying Ward, you need Stalker Vines from the Vine Stalkers lurking in the deep canopy, Moonpetal Flowers to bind the ritual circle, and must slay the most dangerous creatures the Wilds harbor. This is the final test before the Shattered Expanse.',
            objectives: [
                { type: 'kill_any', current: 0, target: 5, label: 'Slay corrupted beasts' },
                { type: 'collect_drop', dropId: 'stalker_vine', current: 0, target: 1, label: 'Harvest Stalker Vine' },
                { type: 'collect_pickup', pickupId: 'moonpetal_flower', current: 0, target: 2, label: 'Gather Moonpetal Flowers' },
                { type: 'collect_pickup', pickupId: 'starbloom_orchid', current: 0, target: 1, label: 'Collect Starbloom Orchid' },
            ],
            rewards: { xp: 900, gold: 55, karma: 45 },
            levelReq: 5, next: 'vw_boss',
        },

        // Quest 6: BOSS — "Wrath of the Thornmother" (hidden until all story quests complete)
        {
            id: 'vw_boss', zone: 'Verdant Wilds', chain: 1,
            name: 'Wrath of the Thornmother',
            description: 'The corruption\'s true source has revealed itself — Thornmother Gaia, an ancient plant titan warped by dark ley energy. She has risen from the heart of the forest, vines cracking stone and roots splitting the earth. This is the ultimate trial of the Verdant Wilds. Destroy her and claim the forest\'s blessing.',
            objectives: [
                { type: 'kill_boss', bossZone: 'verdant_wilds', current: 0, target: 1, label: 'Defeat Thornmother Gaia' },
            ],
            rewards: { xp: 2500, gold: 200, karma: 120 },
            levelReq: 5, next: 'vw6',
            isBossQuest: true,
        },

        // ── Repeating end-game quests (cycle forever) ──
        {
            id: 'vw6', zone: 'Verdant Wilds', chain: 1,
            name: 'Outpost Bounties',
            description: 'The bounty board always has work — the forest never sleeps, and neither do its threats.',
            objectives: [
                { type: 'kill_any', current: 0, target: 4, label: 'Complete bounty kills' },
                { type: 'collect_drop', dropId: 'wurm_fang', current: 0, target: 1, label: 'Turn in Wurm Fang' },
            ],
            rewards: { xp: 400, gold: 30, karma: 20 },
            levelReq: 1, next: 'vw7',
        },
        {
            id: 'vw7', zone: 'Verdant Wilds', chain: 1,
            name: 'Flora Requisition',
            description: 'The healer and the Priory both need a steady supply of rare blooms. Keep the stockpile full.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'moonpetal_flower', current: 0, target: 2, label: 'Gather Moonpetal Flowers' },
                { type: 'collect_pickup', pickupId: 'starbloom_orchid', current: 0, target: 1, label: 'Harvest Starbloom Orchid' },
            ],
            rewards: { xp: 350, gold: 25, karma: 18 },
            levelReq: 1, next: 'vw8',
        },
        {
            id: 'vw8', zone: 'Verdant Wilds', chain: 1,
            name: 'Deep Wilds Hunt',
            description: 'The most dangerous creatures lurk in the forest depths. Bring back trophies to prove you can handle anything.',
            objectives: [
                { type: 'kill_type', mobName: 'Vine Stalker', current: 0, target: 1, label: 'Slay a Vine Stalker' },
                { type: 'collect_drop', dropId: 'stalker_vine', current: 0, target: 1, label: 'Harvest Stalker Vine' },
                { type: 'collect_drop', dropId: 'golem_core', current: 0, target: 1, label: 'Retrieve a Golem Core' },
            ],
            rewards: { xp: 550, gold: 42, karma: 28 },
            levelReq: 1, next: 'vw6', // loops back
        },

        // ════════════════════════════════════════════════════════════
        // SHATTERED EXPANSE (Lv 8-14) — 5 unique story quests + boss + 3 repeating
        // Uses full collect_drop / collect_pickup system like Verdant Wilds
        // ════════════════════════════════════════════════════════════

        // Quest 1: "Bitter Arrival" — Intro combat + world pickup (teaches zone mechanics)
        {
            id: 'se1', zone: 'Shattered Expanse', chain: 2,
            name: 'Bitter Arrival',
            description: 'The wind howls across the frozen wastes and the cold bites to the bone. Commander Valrik at the forward outpost needs you to prove you can survive out here — thin the Ice Scarab swarms infesting the perimeter and gather Frozen Ley Shards from the ley-lines to power the camp\'s ward pylons.',
            objectives: [
                { type: 'kill_type', mobName: 'Ice Scarab', current: 0, target: 3, label: 'Exterminate Ice Scarabs' },
                { type: 'collect_pickup', pickupId: 'frozen_ley_shard', current: 0, target: 3, label: 'Gather Frozen Ley Shards' },
            ],
            rewards: { xp: 500, gold: 30, karma: 15 },
            levelReq: 8, next: 'se2',
        },

        // Quest 2: "Spectral Menace" — Kill + collect drops (introduces SE mob drops)
        {
            id: 'se2', zone: 'Shattered Expanse', chain: 2,
            name: 'Spectral Menace',
            description: 'Frost Wraiths have been materializing in greater numbers near the expedition\'s supply caches. Priory Arcanist Yara believes their Wraith Essence — the ectoplasmic residue left behind when they dissipate — could be used to create spectral wards. Banish the wraiths and collect the essence from their remains.',
            objectives: [
                { type: 'kill_type', mobName: 'Frost Wraith', current: 0, target: 3, label: 'Banish Frost Wraiths' },
                { type: 'collect_drop', dropId: 'wraith_essence', current: 0, target: 2, label: 'Collect Wraith Essence' },
            ],
            rewards: { xp: 700, gold: 40, karma: 22 },
            levelReq: 8, next: 'se3',
        },

        // Quest 3: "Frozen Remedies" — Multi-source collection (pickups + drops)
        {
            id: 'se3', zone: 'Shattered Expanse', chain: 2,
            name: 'Frozen Remedies',
            description: 'The expedition medic, Healer Sorel, is desperate — frostbite and ley-sickness are spreading through the camp. She needs Frostbloom Herbs, which bloom near ley vents despite the cold, and Scarab Chitin from the Ice Scarabs to grind into a warming salve. The chitin drops when the scarabs are shattered in combat.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'frostbloom_herb', current: 0, target: 3, label: 'Gather Frostbloom Herbs' },
                { type: 'collect_drop', dropId: 'scarab_chitin', current: 0, target: 2, label: 'Collect Scarab Chitin' },
            ],
            rewards: { xp: 850, gold: 50, karma: 28 },
            levelReq: 9, next: 'se4',
        },

        // Quest 4: "The Crystal Sanctum" — Mixed (kills + drops + pickups, like VW4)
        {
            id: 'se4', zone: 'Shattered Expanse', chain: 2,
            name: 'The Crystal Sanctum',
            description: 'Arcanist Yara has traced an anomalous ley surge to an ancient crystalline ruin guarded by Crystal Sentinels — towering constructs of living ice. Their Sentinel Shards contain fragments of the original ward matrix that once protected this region. Break through the sentinels, recover their shards, and gather Frozen Ley Shards from the exposed ley-lines within.',
            objectives: [
                { type: 'kill_type', mobName: 'Crystal Sentinel', current: 0, target: 3, label: 'Shatter Crystal Sentinels' },
                { type: 'collect_drop', dropId: 'sentinel_shard', current: 0, target: 2, label: 'Recover Sentinel Shards' },
                { type: 'collect_pickup', pickupId: 'frozen_ley_shard', current: 0, target: 3, label: 'Harvest Ley Shards from the sanctum' },
            ],
            rewards: { xp: 1100, gold: 65, karma: 35 },
            levelReq: 10, next: 'se5',
        },

        // Quest 5: "Drake Hunt" — Grand finale before boss (all mechanics combined)
        {
            id: 'se5', zone: 'Shattered Expanse', chain: 2,
            name: 'Drake Hunt',
            description: 'Yara\'s research is nearly complete. The final ingredients for the master ward require Rime Drake Scales — notoriously difficult to obtain from the most fearsome predators in the Expanse — along with Glacial Stalker Fangs for the binding matrix, and fresh Frostbloom Herbs to stabilize the ritual. Prepare well; the Rime Drakes are no ordinary beasts.',
            objectives: [
                { type: 'kill_type', mobName: 'Rime Drake', current: 0, target: 2, label: 'Slay Rime Drakes' },
                { type: 'collect_drop', dropId: 'drake_scale', current: 0, target: 1, label: 'Collect Rime Drake Scale' },
                { type: 'collect_drop', dropId: 'stalker_fang', current: 0, target: 2, label: 'Harvest Stalker Fangs' },
                { type: 'collect_pickup', pickupId: 'frostbloom_herb', current: 0, target: 2, label: 'Gather Frostbloom Herbs' },
            ],
            rewards: { xp: 1800, gold: 100, karma: 60 },
            levelReq: 12, next: 'se_boss',
        },

        // Quest 6: BOSS — "Glacius the Eternal" (hidden until all story quests complete)
        {
            id: 'se_boss', zone: 'Shattered Expanse', chain: 2,
            name: 'Glacius the Eternal',
            description: 'With the master ward assembled, a tremor shakes the permafrost and the sky darkens with ice crystals. Glacius — an elder ice dragon slumbering beneath the Expanse for millennia — has been awakened by the ley disruption. Its frozen breath can shatter stone and its scales are harder than diamond. The entire expedition is counting on you, hero. End this threat and the path to new horizons will open.',
            objectives: [
                { type: 'kill_boss', bossZone: 'shattered_expanse', current: 0, target: 1, label: 'Defeat Glacius the Eternal' },
            ],
            rewards: { xp: 6000, gold: 400, karma: 250 },
            levelReq: 12, next: 'se6',
            isBossQuest: true,
        },

        // ── Repeating end-game quests (cycle forever) ──
        {
            id: 'se6', zone: 'Shattered Expanse', chain: 2,
            name: 'Frozen Bounties',
            description: 'The bounty board at Commander Valrik\'s outpost is always full — the Expanse never stops producing threats.',
            objectives: [
                { type: 'kill_any', current: 0, target: 4, label: 'Complete frozen bounties' },
                { type: 'collect_drop', dropId: 'scarab_chitin', current: 0, target: 1, label: 'Turn in Scarab Chitin' },
            ],
            rewards: { xp: 700, gold: 50, karma: 30 },
            levelReq: 8, next: 'se7',
        },
        {
            id: 'se7', zone: 'Shattered Expanse', chain: 2,
            name: 'Expedition Supplies',
            description: 'Healer Sorel and Arcanist Yara both need a steady supply of rare materials to keep the camp operational.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'frostbloom_herb', current: 0, target: 2, label: 'Gather Frostbloom Herbs' },
                { type: 'collect_pickup', pickupId: 'frozen_ley_shard', current: 0, target: 2, label: 'Harvest Frozen Ley Shards' },
            ],
            rewards: { xp: 600, gold: 45, karma: 25 },
            levelReq: 8, next: 'se8',
        },
        {
            id: 'se8', zone: 'Shattered Expanse', chain: 2,
            name: 'Deep Frost Patrol',
            description: 'The deepest reaches of the Expanse are home to the deadliest creatures. Bring back trophies to prove your dominance.',
            objectives: [
                { type: 'kill_type', mobName: 'Glacial Stalker', current: 0, target: 1, label: 'Slay a Glacial Stalker' },
                { type: 'collect_drop', dropId: 'stalker_fang', current: 0, target: 1, label: 'Collect Stalker Fang' },
                { type: 'collect_drop', dropId: 'sentinel_shard', current: 0, target: 1, label: 'Recover a Sentinel Shard' },
            ],
            rewards: { xp: 800, gold: 60, karma: 35 },
            levelReq: 8, next: 'se6', // loops back
        },

        // ════════════════════════════════════════════════════════════
        // MOLTEN ABYSS (Lv 15-24) — 10 story quests + boss + 3 repeating
        // A volcanic hellscape with lava rivers, obsidian spires, and infernal creatures
        // ════════════════════════════════════════════════════════════

        // Quest 1: "Into the Inferno" — Intro combat + pickup (teaches zone mechanics)
        {
            id: 'ma1', zone: 'Molten Wasteland', chain: 3,
            name: 'Into the Inferno',
            description: 'The portal from the Shattered Expanse deposits you onto a blackened basalt ridge overlooking rivers of molten lava. Warden Kael of the Flame Watch outpost needs you to prove you can survive the heat — dispatch the Magma Hounds prowling the perimeter and gather Molten Core Fragments from the exposed magma vents to fuel the camp\'s protective wards.',
            objectives: [
                { type: 'kill_type', mobName: 'Magma Hound', current: 0, target: 3, label: 'Slay Magma Hounds' },
                { type: 'collect_pickup', pickupId: 'molten_core_fragment', current: 0, target: 3, label: 'Gather Molten Core Fragments' },
            ],
            rewards: { xp: 1200, gold: 65, karma: 30 },
            levelReq: 15, next: 'ma2',
        },

        // Quest 2: "Ashen Harvest" — World pickup + kills (introduces Ashbloom)
        {
            id: 'ma2', zone: 'Molten Wasteland', chain: 3,
            name: 'Ashen Harvest',
            description: 'Herbalist Vesper, the camp\'s resident alchemist, is astonished — Ashbloom Flowers actually thrive in the volcanic soil here, their petals carrying potent fire resistance properties. She urgently needs specimens before the next eruption cycle destroys them. The Cinder Wraiths seem drawn to the blooms — clear them away and harvest the flowers.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'ashbloom_flower', current: 0, target: 4, label: 'Harvest Ashbloom Flowers' },
                { type: 'kill_type', mobName: 'Cinder Wraith', current: 0, target: 3, label: 'Banish Cinder Wraiths' },
            ],
            rewards: { xp: 1500, gold: 75, karma: 35 },
            levelReq: 15, next: 'ma3',
        },

        // Quest 3: "Heart of Obsidian" — Kill + mob drops (introduces Obsidian Golem drops)
        {
            id: 'ma3', zone: 'Molten Wasteland', chain: 3,
            name: 'Heart of Obsidian',
            description: 'Forgemaster Dren at the Flame Watch believes the Obsidian Golems that wander the lava fields contain volcanic Obsidian Hearts — crystallized magma cores that could be reforged into heat-resistant weaponry. Destroy the golems and pry the hearts from their shattered remains.',
            objectives: [
                { type: 'kill_type', mobName: 'Obsidian Golem', current: 0, target: 4, label: 'Shatter Obsidian Golems' },
                { type: 'collect_drop', dropId: 'obsidian_heart', current: 0, target: 3, label: 'Collect Obsidian Hearts' },
            ],
            rewards: { xp: 1800, gold: 90, karma: 40 },
            levelReq: 16, next: 'ma4',
        },

        // Quest 4: "Embers of the Pack" — Mixed kill + drop + pickup
        {
            id: 'ma4', zone: 'Molten Wasteland', chain: 3,
            name: 'Embers of the Pack',
            description: 'The Magma Hounds are growing bolder — Warden Kael reports they\'ve established a den near the main supply route. Their Hound Embers — the smoldering fire glands in their throats — can be used to create fire grenades for camp defense. Thin the pack, collect their embers, and grab Molten Core Fragments from the vents they\'ve been guarding.',
            objectives: [
                { type: 'kill_type', mobName: 'Magma Hound', current: 0, target: 4, label: 'Cull the Magma Hound pack' },
                { type: 'collect_drop', dropId: 'hound_ember', current: 0, target: 2, label: 'Collect Hound Embers' },
                { type: 'collect_pickup', pickupId: 'molten_core_fragment', current: 0, target: 2, label: 'Gather nearby Molten Cores' },
            ],
            rewards: { xp: 2200, gold: 105, karma: 50 },
            levelReq: 16, next: 'ma5',
        },

        // Quest 5: "Spectral Flames" — Drop collection + kills (Cinder Wraith focus)
        {
            id: 'ma5', zone: 'Molten Wasteland', chain: 3,
            name: 'Spectral Flames',
            description: 'Arcanist Lyria has been studying the Cinder Wraiths — they aren\'t merely fire spirits, but the remnants of an ancient civilization immolated by the volcano millennia ago. Their Cinder Ash contains traces of pre-eruption ley energy that could reveal the Abyss\'s secrets. Banish wraiths and collect the ash that remains when they dissipate.',
            objectives: [
                { type: 'kill_type', mobName: 'Cinder Wraith', current: 0, target: 4, label: 'Banish Cinder Wraiths' },
                { type: 'collect_drop', dropId: 'wraith_ash', current: 0, target: 3, label: 'Collect Cinder Ash' },
            ],
            rewards: { xp: 2600, gold: 120, karma: 55 },
            levelReq: 17, next: 'ma6',
        },

        // Quest 6: "Serpent's Coil" — Introduces Lava Serpent + drops + pickups
        {
            id: 'ma6', zone: 'Molten Wasteland', chain: 3,
            name: 'Serpent\'s Coil',
            description: 'Scouts have spotted massive Lava Serpents slithering through the magma channels — creatures that swim through molten rock as easily as fish through water. Their venom fangs are prized by alchemists, and Herbalist Vesper needs fresh Ashbloom petals to create an antivenom. Track the serpents along the lava flows.',
            objectives: [
                { type: 'kill_type', mobName: 'Lava Serpent', current: 0, target: 3, label: 'Slay Lava Serpents' },
                { type: 'collect_drop', dropId: 'serpent_fang', current: 0, target: 3, label: 'Collect Serpent Fangs' },
                { type: 'collect_pickup', pickupId: 'ashbloom_flower', current: 0, target: 2, label: 'Gather Ashbloom Flowers' },
            ],
            rewards: { xp: 3000, gold: 140, karma: 65 },
            levelReq: 18, next: 'ma7',
        },

        // Quest 7: "The Caldera Gate" — Mixed all mechanics (multi-source)
        {
            id: 'ma7', zone: 'Molten Wasteland', chain: 3,
            name: 'The Caldera Gate',
            description: 'Arcanist Lyria has pinpointed an ancient caldera chamber sealed by ley-energy locks. To open it, she needs Obsidian Hearts for the lock mechanism, Molten Core Fragments to power the ley circuit, and the wraith-infested golems guarding the entrance must be destroyed. This chamber may hold the key to understanding the volcanic catastrophe.',
            objectives: [
                { type: 'kill_type', mobName: 'Obsidian Golem', current: 0, target: 3, label: 'Destroy guardian Obsidian Golems' },
                { type: 'collect_drop', dropId: 'obsidian_heart', current: 0, target: 2, label: 'Recover Obsidian Hearts' },
                { type: 'collect_pickup', pickupId: 'molten_core_fragment', current: 0, target: 3, label: 'Gather Molten Core Fragments' },
                { type: 'kill_any', current: 0, target: 5, label: 'Clear the caldera approach' },
            ],
            rewards: { xp: 3500, gold: 165, karma: 75 },
            levelReq: 19, next: 'ma8',
        },

        // Quest 8: "Wings of Flame" — Introduces Infernal Wyvern
        {
            id: 'ma8', zone: 'Molten Wasteland', chain: 3,
            name: 'Wings of Flame',
            description: 'The caldera chamber revealed ancient murals depicting the Infernal Wyverns as guardians of a deeper volcanic sanctum. These fire-breathing horrors circle above the lava lakes, and their horns contain crystallized fire energy. Forgemaster Dren needs these Wyvern Horns for the ultimate heat-proof alloy. Hunt the sky terrors and claim their horns.',
            objectives: [
                { type: 'kill_type', mobName: 'Infernal Wyvern', current: 0, target: 3, label: 'Slay Infernal Wyverns' },
                { type: 'collect_drop', dropId: 'wyvern_horn', current: 0, target: 2, label: 'Collect Wyvern Horns' },
                { type: 'kill_any', current: 0, target: 4, label: 'Clear the sky lanes' },
            ],
            rewards: { xp: 4200, gold: 200, karma: 90 },
            levelReq: 20, next: 'ma9',
        },

        // Quest 9: "The Binding Ritual" — Grand collection quest (all materials)
        {
            id: 'ma9', zone: 'Molten Wasteland', chain: 3,
            name: 'The Binding Ritual',
            description: 'Lyria\'s research is nearly complete. The murals describe a Binding Ritual that can weaken Pyroclast — the ancient demon-titan sealed within the volcano\'s core. She needs Serpent Fangs for the containment sigils, Cinder Ash for the warding circles, Ashbloom Flowers for the purification incense, and Hound Embers to ignite the ritual flame. Gather everything — the Abyss\'s fate depends on it.',
            objectives: [
                { type: 'collect_drop', dropId: 'serpent_fang', current: 0, target: 2, label: 'Collect Serpent Fangs' },
                { type: 'collect_drop', dropId: 'wraith_ash', current: 0, target: 3, label: 'Gather Cinder Ash' },
                { type: 'collect_pickup', pickupId: 'ashbloom_flower', current: 0, target: 3, label: 'Harvest Ashbloom Flowers' },
                { type: 'collect_drop', dropId: 'hound_ember', current: 0, target: 2, label: 'Obtain Hound Embers' },
            ],
            rewards: { xp: 5000, gold: 250, karma: 110 },
            levelReq: 21, next: 'ma10',
        },

        // Quest 10: "Into the Maw" — Grand finale before boss (all mechanics, hardest pre-boss)
        {
            id: 'ma10', zone: 'Molten Wasteland', chain: 3,
            name: 'Into the Maw',
            description: 'The Binding Ritual is prepared, but Pyroclast\'s guardians have emerged from the volcanic depths to stop you. Elite Wyverns patrol the caldera rim while Lava Serpents surge through every magma channel. Fight through the gauntlet, collect the final Wyvern Horns to seal the ritual circle, grab Molten Core Fragments to power the ward, and clear the path to the demon\'s lair. This is the final trial before the ultimate confrontation.',
            objectives: [
                { type: 'kill_type', mobName: 'Infernal Wyvern', current: 0, target: 2, label: 'Slay elite Infernal Wyverns' },
                { type: 'kill_type', mobName: 'Lava Serpent', current: 0, target: 3, label: 'Clear the Lava Serpents' },
                { type: 'collect_drop', dropId: 'wyvern_horn', current: 0, target: 2, label: 'Collect Wyvern Horns' },
                { type: 'collect_pickup', pickupId: 'molten_core_fragment', current: 0, target: 3, label: 'Gather Molten Core Fragments' },
                { type: 'kill_any', current: 0, target: 8, label: 'Purge the caldera defenders' },
            ],
            rewards: { xp: 6500, gold: 320, karma: 140 },
            levelReq: 22, next: 'ma_boss',
        },

        // Quest 11: BOSS — "Pyroclast, the Undying Flame"
        {
            id: 'ma_boss', zone: 'Molten Wasteland', chain: 3,
            name: 'The Undying Flame',
            description: 'The Binding Ritual shatters the volcanic seal and the earth splits open with a deafening roar. Pyroclast — a colossal demon-titan of living magma and obsidian armor — erupts from the caldera\'s heart, its body wreathed in flames that melt stone on contact. This is the most powerful entity you have ever faced. The entire Flame Watch expedition is counting on you, hero. Destroy Pyroclast and end the volcanic threat forever.',
            objectives: [
                { type: 'kill_boss', bossZone: 'molten_abyss', current: 0, target: 1, label: 'Defeat Pyroclast, the Undying Flame' },
            ],
            rewards: { xp: 15000, gold: 800, karma: 500 },
            levelReq: 22, next: 'ma11',
            isBossQuest: true,
        },

        // ── Repeating end-game quests (cycle forever) ──
        {
            id: 'ma11', zone: 'Molten Wasteland', chain: 3,
            name: 'Volcanic Bounties',
            description: 'The bounty board at Warden Kael\'s outpost overflows — the Abyss never rests.',
            objectives: [
                { type: 'kill_any', current: 0, target: 4, label: 'Complete volcanic bounties' },
                { type: 'collect_drop', dropId: 'hound_ember', current: 0, target: 1, label: 'Turn in Hound Ember' },
            ],
            rewards: { xp: 1200, gold: 80, karma: 45 },
            levelReq: 15, next: 'ma12',
        },
        {
            id: 'ma12', zone: 'Molten Wasteland', chain: 3,
            name: 'Caldera Supply Run',
            description: 'Herbalist Vesper and Arcanist Lyria need a constant supply of volcanic reagents for the expedition.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'ashbloom_flower', current: 0, target: 2, label: 'Gather Ashbloom Flowers' },
                { type: 'collect_pickup', pickupId: 'molten_core_fragment', current: 0, target: 2, label: 'Harvest Molten Core Fragments' },
            ],
            rewards: { xp: 1000, gold: 70, karma: 40 },
            levelReq: 15, next: 'ma13',
        },
        {
            id: 'ma13', zone: 'Molten Wasteland', chain: 3,
            name: 'Abyss Depths Patrol',
            description: 'The deepest volcanic chambers harbor the deadliest creatures. Bring back trophies from the most dangerous predators.',
            objectives: [
                { type: 'kill_type', mobName: 'Infernal Wyvern', current: 0, target: 1, label: 'Slay an Infernal Wyvern' },
                { type: 'collect_drop', dropId: 'wyvern_horn', current: 0, target: 1, label: 'Collect Wyvern Horn' },
                { type: 'collect_drop', dropId: 'obsidian_heart', current: 0, target: 1, label: 'Retrieve an Obsidian Heart' },
            ],
            rewards: { xp: 1400, gold: 95, karma: 55 },
            levelReq: 15, next: 'ma11', // loops back
        },

        // ════════════════════════════════════════════════════════════
        // ABYSSAL DEPTHS (Lv 25-34) — 10 story quests + boss + 3 repeating
        // Sunken bioluminescent caverns beneath the ocean floor
        // ════════════════════════════════════════════════════════════

        // Quest 1: "Into the Deep" — Intro combat + pickup
        {
            id: 'ad1', zone: 'Abyssal Depths', chain: 4,
            name: 'Into the Deep',
            description: 'The descent through the volcanic rift opens into an impossible cavern — miles wide, lit by pulsing bioluminescent coral. Commander Nerissa of the Trench Watch outpost needs you to prove you can handle the crushing dark. Clear the Abyssal Crawlers infesting the perimeter and gather Deep-Ley Pearls from the exposed ley-vents to power the outpost\'s pressure wards.',
            objectives: [
                { type: 'kill_type', mobName: 'Abyssal Crawler', current: 0, target: 3, label: 'Exterminate Abyssal Crawlers' },
                { type: 'collect_pickup', pickupId: 'deep_ley_pearl', current: 0, target: 3, label: 'Gather Deep-Ley Pearls' },
            ],
            rewards: { xp: 3500, gold: 150, karma: 70 },
            levelReq: 25, next: 'ad2',
        },

        // Quest 2: "Luminous Harvest" — World pickups + kills
        {
            id: 'ad2', zone: 'Abyssal Depths', chain: 4,
            name: 'Luminous Harvest',
            description: 'Botanist Selene is mesmerized — Bioluminescent Kelp thrives in the cavern\'s ley currents, its glow carrying potent regenerative properties. She needs specimens, but the Depth Lurkers are territorial and aggressive near the kelp beds. Clear them out and harvest the glowing fronds.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'biolum_kelp', current: 0, target: 4, label: 'Harvest Bioluminescent Kelp' },
                { type: 'kill_type', mobName: 'Depth Lurker', current: 0, target: 3, label: 'Drive off Depth Lurkers' },
            ],
            rewards: { xp: 4200, gold: 180, karma: 80 },
            levelReq: 25, next: 'ad3',
        },

        // Quest 3: "Chitin and Coral" — Kill + mob drops
        {
            id: 'ad3', zone: 'Abyssal Depths', chain: 4,
            name: 'Chitin and Coral',
            description: 'Forgemaster Undine at the Trench Watch believes the Abyssal Crawlers\' chitinous exoskeletons — hardened by millennia of deep-sea pressure — can be reforged into unbreakable armor plating. Meanwhile, the Coral Golems contain Living Coral Shards pulsing with ley energy. Collect both materials from the fallen.',
            objectives: [
                { type: 'kill_type', mobName: 'Abyssal Crawler', current: 0, target: 4, label: 'Slay Abyssal Crawlers' },
                { type: 'collect_drop', dropId: 'crawler_chitin', current: 0, target: 3, label: 'Collect Crawler Chitin' },
                { type: 'collect_drop', dropId: 'coral_shard', current: 0, target: 2, label: 'Retrieve Living Coral Shards' },
            ],
            rewards: { xp: 5000, gold: 210, karma: 95 },
            levelReq: 26, next: 'ad4',
        },

        // Quest 4: "Void Tendrils" — Introduces Void Jellyfish + drops
        {
            id: 'ad4', zone: 'Abyssal Depths', chain: 4,
            name: 'Void Tendrils',
            description: 'Arcanist Delphine has detected anomalous void energy signatures drifting through the cavern — enormous Void Jellyfish that phase in and out of reality. Their gelatinous cores contain concentrated Void Jelly, a reagent that could stabilize the outpost\'s ley-ward matrix. They\'re beautiful... and utterly lethal.',
            objectives: [
                { type: 'kill_type', mobName: 'Void Jellyfish', current: 0, target: 4, label: 'Banish Void Jellyfish' },
                { type: 'collect_drop', dropId: 'jelly_essence', current: 0, target: 3, label: 'Collect Void Jelly' },
            ],
            rewards: { xp: 5800, gold: 240, karma: 110 },
            levelReq: 27, next: 'ad5',
        },

        // Quest 5: "The Drowned Archive" — Mixed all types
        {
            id: 'ad5', zone: 'Abyssal Depths', chain: 4,
            name: 'The Drowned Archive',
            description: 'Scouts have discovered the ruins of an ancient archive — part of the pre-cataclysm civilization that once thrived here. The Coral Golems guard the entrance, and Bioluminescent Kelp has overgrown the reading chambers. Clear the golems, recover their Coral Shards for the ward matrix, and harvest the kelp blocking the archive entrances.',
            objectives: [
                { type: 'kill_type', mobName: 'Coral Golem', current: 0, target: 3, label: 'Destroy guardian Coral Golems' },
                { type: 'collect_drop', dropId: 'coral_shard', current: 0, target: 3, label: 'Recover Living Coral Shards' },
                { type: 'collect_pickup', pickupId: 'biolum_kelp', current: 0, target: 3, label: 'Clear kelp from the archive' },
            ],
            rewards: { xp: 6500, gold: 280, karma: 125 },
            levelReq: 28, next: 'ad6',
        },

        // Quest 6: "Predator's Domain" — Depth Lurker focus + pickups
        {
            id: 'ad6', zone: 'Abyssal Depths', chain: 4,
            name: 'Predator\'s Domain',
            description: 'The Depth Lurkers have established hunting grounds near the main supply route to the archive. Their serrated fins — prized by weaponsmiths — drop when they\'re defeated. Cull the pack, collect their fins, and grab Deep-Ley Pearls from the exposed vents they\'ve been guarding.',
            objectives: [
                { type: 'kill_type', mobName: 'Depth Lurker', current: 0, target: 5, label: 'Cull the Depth Lurker pack' },
                { type: 'collect_drop', dropId: 'lurker_fin', current: 0, target: 3, label: 'Collect Lurker Fins' },
                { type: 'collect_pickup', pickupId: 'deep_ley_pearl', current: 0, target: 2, label: 'Gather nearby Deep-Ley Pearls' },
            ],
            rewards: { xp: 7200, gold: 310, karma: 140 },
            levelReq: 28, next: 'ad7',
        },

        // Quest 7: "Leviathan\'s Wake" — Introduces Leviathan Spawn
        {
            id: 'ad7', zone: 'Abyssal Depths', chain: 4,
            name: 'Leviathan\'s Wake',
            description: 'The archive murals speak of Leviathan Spawn — ancient deep-sea serpents of terrifying size and intelligence. They\'ve been sighted near the trench rim. Their scales are nearly indestructible, and Arcanist Delphine needs Void Jelly to create an anti-leviathan ward. Hunt the spawn and prepare for what lurks deeper still.',
            objectives: [
                { type: 'kill_type', mobName: 'Leviathan Spawn', current: 0, target: 2, label: 'Slay Leviathan Spawn' },
                { type: 'collect_drop', dropId: 'leviathan_scale', current: 0, target: 2, label: 'Collect Leviathan Scales' },
                { type: 'collect_drop', dropId: 'jelly_essence', current: 0, target: 2, label: 'Gather Void Jelly' },
            ],
            rewards: { xp: 8500, gold: 360, karma: 160 },
            levelReq: 29, next: 'ad8',
        },

        // Quest 8: "The Pressure Gate" — Grand collection quest
        {
            id: 'ad8', zone: 'Abyssal Depths', chain: 4,
            name: 'The Pressure Gate',
            description: 'Delphine has located a sealed pressure gate leading to the deepest chamber — where something enormous sleeps. To breach it she needs Crawler Chitin for pressure seals, Lurker Fins for the resonance mechanism, and Deep-Ley Pearls to power the opening sequence. Gather everything.',
            objectives: [
                { type: 'collect_drop', dropId: 'crawler_chitin', current: 0, target: 3, label: 'Collect Crawler Chitin' },
                { type: 'collect_drop', dropId: 'lurker_fin', current: 0, target: 3, label: 'Gather Lurker Fins' },
                { type: 'collect_pickup', pickupId: 'deep_ley_pearl', current: 0, target: 4, label: 'Harvest Deep-Ley Pearls' },
                { type: 'kill_any', current: 0, target: 6, label: 'Clear the approach' },
            ],
            rewards: { xp: 9500, gold: 400, karma: 180 },
            levelReq: 30, next: 'ad9',
        },

        // Quest 9: "The Binding Deep" — Ritual preparation
        {
            id: 'ad9', zone: 'Abyssal Depths', chain: 4,
            name: 'The Binding Deep',
            description: 'The pressure gate is open. Beyond lies a throne of living coral where an ancient god-thing slumbers. Delphine\'s binding ritual requires Leviathan Scales for containment wards, Living Coral Shards to anchor the sigils, Bioluminescent Kelp for the purification incense, and Void Jelly to seal the void-rifts. This is the final preparation.',
            objectives: [
                { type: 'collect_drop', dropId: 'leviathan_scale', current: 0, target: 2, label: 'Collect Leviathan Scales' },
                { type: 'collect_drop', dropId: 'coral_shard', current: 0, target: 2, label: 'Recover Living Coral Shards' },
                { type: 'collect_pickup', pickupId: 'biolum_kelp', current: 0, target: 3, label: 'Harvest Bioluminescent Kelp' },
                { type: 'collect_drop', dropId: 'jelly_essence', current: 0, target: 2, label: 'Gather Void Jelly' },
            ],
            rewards: { xp: 11000, gold: 450, karma: 200 },
            levelReq: 31, next: 'ad10',
        },

        // Quest 10: "Into the Maw of the Deep" — Grand finale before boss
        {
            id: 'ad10', zone: 'Abyssal Depths', chain: 4,
            name: 'Into the Maw of the Deep',
            description: 'The binding ritual is prepared, but Thalassor\'s guardians have sensed the intrusion. Elite Leviathan Spawn surge from the trench while Void Jellyfish materialize in swarms to protect their sleeping god. Fight through the final gauntlet, collect Leviathan Scales to seal the ritual circle, gather Deep-Ley Pearls to power the ward, and purge every creature blocking the path to the throne. The Drowned God awakens.',
            objectives: [
                { type: 'kill_type', mobName: 'Leviathan Spawn', current: 0, target: 3, label: 'Slay elite Leviathan Spawn' },
                { type: 'kill_type', mobName: 'Void Jellyfish', current: 0, target: 4, label: 'Banish the Void Jellyfish swarm' },
                { type: 'collect_drop', dropId: 'leviathan_scale', current: 0, target: 2, label: 'Collect Leviathan Scales' },
                { type: 'collect_pickup', pickupId: 'deep_ley_pearl', current: 0, target: 3, label: 'Gather Deep-Ley Pearls' },
                { type: 'kill_any', current: 0, target: 10, label: 'Purge the abyssal defenders' },
            ],
            rewards: { xp: 14000, gold: 550, karma: 250 },
            levelReq: 32, next: 'ad_boss',
        },

        // Quest 11: BOSS — "Thalassor, the Drowned God"
        {
            id: 'ad_boss', zone: 'Abyssal Depths', chain: 4,
            name: 'The Drowned God',
            description: 'The binding ritual cracks the coral throne and the cavern shudders. Thalassor — an eldritch god-thing of impossible size, its body a swirling mass of bioluminescent tentacles and void energy — rises from the abyss with a psychic scream that shatters stone. Its tendrils phase through reality, its eyes burn with the light of drowned stars. This is the most terrifying entity you have ever faced. Destroy Thalassor and seal the depths forever.',
            objectives: [
                { type: 'kill_boss', bossZone: 'abyssal_depths', current: 0, target: 1, label: 'Defeat Thalassor, the Drowned God' },
            ],
            rewards: { xp: 30000, gold: 1500, karma: 1000 },
            levelReq: 32, next: 'ad11',
            isBossQuest: true,
        },

        // ── Repeating end-game quests (cycle forever) ──
        {
            id: 'ad11', zone: 'Abyssal Depths', chain: 4,
            name: 'Abyssal Bounties',
            description: 'Commander Nerissa\'s bounty board is always full — the depths never stop spawning horrors.',
            objectives: [
                { type: 'kill_any', current: 0, target: 4, label: 'Complete abyssal bounties' },
                { type: 'collect_drop', dropId: 'crawler_chitin', current: 0, target: 1, label: 'Turn in Crawler Chitin' },
            ],
            rewards: { xp: 2500, gold: 140, karma: 80 },
            levelReq: 25, next: 'ad12',
        },
        {
            id: 'ad12', zone: 'Abyssal Depths', chain: 4,
            name: 'Deep Reagent Run',
            description: 'Botanist Selene and Arcanist Delphine need a constant supply of abyssal reagents for the expedition.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'biolum_kelp', current: 0, target: 2, label: 'Gather Bioluminescent Kelp' },
                { type: 'collect_pickup', pickupId: 'deep_ley_pearl', current: 0, target: 2, label: 'Harvest Deep-Ley Pearls' },
            ],
            rewards: { xp: 2200, gold: 120, karma: 70 },
            levelReq: 25, next: 'ad13',
        },
        {
            id: 'ad13', zone: 'Abyssal Depths', chain: 4,
            name: 'Trench Patrol',
            description: 'The deepest trenches harbor the deadliest creatures. Bring back trophies from the apex predators.',
            objectives: [
                { type: 'kill_type', mobName: 'Leviathan Spawn', current: 0, target: 1, label: 'Slay a Leviathan Spawn' },
                { type: 'collect_drop', dropId: 'leviathan_scale', current: 0, target: 1, label: 'Collect Leviathan Scale' },
                { type: 'collect_drop', dropId: 'coral_shard', current: 0, target: 1, label: 'Retrieve a Living Coral Shard' },
            ],
            rewards: { xp: 2800, gold: 160, karma: 90 },
            levelReq: 25, next: 'ad11', // loops back
        },

        // ════════════════════════════════════════════════════════════
        // NEON WASTES (Lv 35-44) — 10 story quests + boss + 3 repeating
        // Xenotech alien frontier with irradiated terrain and alien organisms
        // ════════════════════════════════════════════════════════════

        // Quest 1: "Static Arrival" — Intro combat + pickup
        {
            id: 'nw1', zone: 'Neon Wastes', chain: 5,
            name: 'Static Arrival',
            description: 'You emerge from the dimensional rift into a crackling alien landscape. Commander Zyx of the Frontier Watch outpost needs you to clear the Plasma Mite swarms feeding on the camp\'s power grid and gather Charged Plasma Cores from the exposed conduits to restore the perimeter shields.',
            objectives: [
                { type: 'kill_type', mobName: 'Plasma Mite', current: 0, target: 3, label: 'Exterminate Plasma Mites' },
                { type: 'collect_pickup', pickupId: 'charged_plasma_core', current: 0, target: 3, label: 'Gather Charged Plasma Cores' },
            ],
            rewards: { xp: 8000, gold: 350, karma: 150 },
            levelReq: 35, next: 'nw2',
        },

        // Quest 2: "Alien Flora" — World pickups + kills
        {
            id: 'nw2', zone: 'Neon Wastes', chain: 5,
            name: 'Alien Flora',
            description: 'Xenobiologist Dr. Thara is fascinated — Xenoflora Spores thrive near the plasma conduits despite lethal radiation levels. She needs specimens for analysis, but the Void Striders are territorial predators that patrol the spore fields. Clear the striders and harvest the glowing spores.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'xenoflora_spore', current: 0, target: 4, label: 'Harvest Xenoflora Spores' },
                { type: 'kill_type', mobName: 'Void Strider', current: 0, target: 3, label: 'Drive off Void Striders' },
            ],
            rewards: { xp: 9500, gold: 400, karma: 170 },
            levelReq: 35, next: 'nw3',
        },

        // Quest 3: "Plasma Harvest" — Kill + mob drops
        {
            id: 'nw3', zone: 'Neon Wastes', chain: 5,
            name: 'Plasma Harvest',
            description: 'Weaponsmith Kira at the Frontier Watch believes the Plasma Mites\' glands — overcharged with raw plasma energy — can be weaponized into devastating grenades. Meanwhile, the Void Striders\' Phase Cores contain xenotech that could upgrade the camp\'s shields. Harvest both materials from the fallen.',
            objectives: [
                { type: 'kill_type', mobName: 'Plasma Mite', current: 0, target: 4, label: 'Slay Plasma Mites' },
                { type: 'collect_drop', dropId: 'mite_plasma', current: 0, target: 3, label: 'Collect Plasma Glands' },
                { type: 'collect_drop', dropId: 'strider_core', current: 0, target: 2, label: 'Retrieve Strider Phase Cores' },
            ],
            rewards: { xp: 11000, gold: 460, karma: 200 },
            levelReq: 36, next: 'nw4',
        },

        // Quest 4: "Behemoth Down" — Introduces Neon Behemoth + drops
        {
            id: 'nw4', zone: 'Neon Wastes', chain: 5,
            name: 'Behemoth Down',
            description: 'Dr. Thara has detected massive xenoforms lurking near the ruins — Neon Behemoths, towering alien titans with carapaces harder than any known alloy. Their Behemoth Carapace fragments could revolutionize armor technology. These are the most dangerous creatures you\'ve faced in the Wastes so far.',
            objectives: [
                { type: 'kill_type', mobName: 'Neon Behemoth', current: 0, target: 3, label: 'Topple Neon Behemoths' },
                { type: 'collect_drop', dropId: 'behemoth_plate', current: 0, target: 2, label: 'Collect Behemoth Carapace' },
            ],
            rewards: { xp: 13000, gold: 520, karma: 230 },
            levelReq: 37, next: 'nw5',
        },

        // Quest 5: "Phase Breach" — Mixed all types
        {
            id: 'nw5', zone: 'Neon Wastes', chain: 5,
            name: 'Phase Breach',
            description: 'Rift Phantoms have begun phasing through the camp\'s dimensional barriers — spectral xenoforms that exist between dimensions. Their Phantom Residue is the key to understanding the rift technology. Hunt them down, collect the residue, and gather Charged Plasma Cores to reinforce the barriers.',
            objectives: [
                { type: 'kill_type', mobName: 'Rift Phantom', current: 0, target: 4, label: 'Banish Rift Phantoms' },
                { type: 'collect_drop', dropId: 'phantom_wisp', current: 0, target: 3, label: 'Collect Phantom Residue' },
                { type: 'collect_pickup', pickupId: 'charged_plasma_core', current: 0, target: 3, label: 'Gather Plasma Cores for barriers' },
            ],
            rewards: { xp: 15000, gold: 580, karma: 260 },
            levelReq: 38, next: 'nw6',
        },

        // Quest 6: "Strider Territory" — Void Strider focus + pickups
        {
            id: 'nw6', zone: 'Neon Wastes', chain: 5,
            name: 'Strider Territory',
            description: 'The Void Striders have established a hunting perimeter around the xenoruins entrance. Their Phase Cores are critical for Dr. Thara\'s research, and Xenoflora Spores grow densely in their territory. Push through the pack and claim what the expedition needs.',
            objectives: [
                { type: 'kill_type', mobName: 'Void Strider', current: 0, target: 5, label: 'Cull the Void Strider pack' },
                { type: 'collect_drop', dropId: 'strider_core', current: 0, target: 3, label: 'Collect Strider Phase Cores' },
                { type: 'collect_pickup', pickupId: 'xenoflora_spore', current: 0, target: 2, label: 'Gather nearby Xenoflora Spores' },
            ],
            rewards: { xp: 17000, gold: 640, karma: 290 },
            levelReq: 38, next: 'nw7',
        },

        // Quest 7: "Chrono Surge" — Introduces Chrono Wyrm
        {
            id: 'nw7', zone: 'Neon Wastes', chain: 5,
            name: 'Chrono Surge',
            description: 'The xenoruins archives speak of Chrono Wyrms — massive alien serpents that can phase-shift through time itself. Scouts have spotted them distorting reality near the rift canyon. Their Chrono Shards contain concentrated temporal energy that Weaponsmith Kira needs for the Nullification Device. Hunt them and collect the shards.',
            objectives: [
                { type: 'kill_type', mobName: 'Chrono Wyrm', current: 0, target: 2, label: 'Slay Chrono Wyrms' },
                { type: 'collect_drop', dropId: 'wyrm_chrono', current: 0, target: 2, label: 'Collect Chrono Shards' },
                { type: 'collect_drop', dropId: 'phantom_wisp', current: 0, target: 2, label: 'Gather Phantom Residue' },
            ],
            rewards: { xp: 20000, gold: 720, karma: 330 },
            levelReq: 39, next: 'nw8',
        },

        // Quest 8: "The Xenoforge" — Grand collection quest
        {
            id: 'nw8', zone: 'Neon Wastes', chain: 5,
            name: 'The Xenoforge',
            description: 'Dr. Thara has located an ancient xenotech forge deep in the ruins — capable of creating weapons beyond anything in the known realms. To activate it she needs Plasma Glands for fuel, Behemoth Carapace for structural material, and Charged Plasma Cores to power the ignition sequence. Gather everything.',
            objectives: [
                { type: 'collect_drop', dropId: 'mite_plasma', current: 0, target: 3, label: 'Collect Plasma Glands' },
                { type: 'collect_drop', dropId: 'behemoth_plate', current: 0, target: 3, label: 'Gather Behemoth Carapace' },
                { type: 'collect_pickup', pickupId: 'charged_plasma_core', current: 0, target: 4, label: 'Harvest Charged Plasma Cores' },
                { type: 'kill_any', current: 0, target: 6, label: 'Clear the forge approach' },
            ],
            rewards: { xp: 23000, gold: 800, karma: 370 },
            levelReq: 40, next: 'nw9',
        },

        // Quest 9: "The Nullification Ritual" — Ritual preparation
        {
            id: 'nw9', zone: 'Neon Wastes', chain: 5,
            name: 'The Nullification Ritual',
            description: 'The xenoforge is online. Kira\'s Nullification Device — designed to collapse the Singularis entity\'s dimensional anchor — requires Chrono Shards for temporal stabilization, Strider Phase Cores for the phase-lock mechanism, Xenoflora Spores for the bio-catalyst, and Phantom Residue to seal the dimensional breach. This is the final preparation.',
            objectives: [
                { type: 'collect_drop', dropId: 'wyrm_chrono', current: 0, target: 2, label: 'Collect Chrono Shards' },
                { type: 'collect_drop', dropId: 'strider_core', current: 0, target: 2, label: 'Recover Strider Phase Cores' },
                { type: 'collect_pickup', pickupId: 'xenoflora_spore', current: 0, target: 3, label: 'Harvest Xenoflora Spores' },
                { type: 'collect_drop', dropId: 'phantom_wisp', current: 0, target: 2, label: 'Gather Phantom Residue' },
            ],
            rewards: { xp: 26000, gold: 900, karma: 420 },
            levelReq: 41, next: 'nw10',
        },

        // Quest 10: "Into the Singularity" — Grand finale before boss
        {
            id: 'nw10', zone: 'Neon Wastes', chain: 5,
            name: 'Into the Singularity',
            description: 'The Nullification Device is charged, but the Singularis entity has sensed the threat and unleashed its most powerful guardians. Chrono Wyrms distort time in waves while Neon Behemoths charge from every direction. Fight through the final gauntlet, collect Chrono Shards to power the device, gather Charged Plasma Cores to sustain the field, and purge everything between you and the dimensional anchor. The Unmaker awakens.',
            objectives: [
                { type: 'kill_type', mobName: 'Chrono Wyrm', current: 0, target: 3, label: 'Slay elite Chrono Wyrms' },
                { type: 'kill_type', mobName: 'Neon Behemoth', current: 0, target: 3, label: 'Topple the Neon Behemoth vanguard' },
                { type: 'collect_drop', dropId: 'wyrm_chrono', current: 0, target: 2, label: 'Collect Chrono Shards' },
                { type: 'collect_pickup', pickupId: 'charged_plasma_core', current: 0, target: 3, label: 'Gather Charged Plasma Cores' },
                { type: 'kill_any', current: 0, target: 10, label: 'Purge the Singularis vanguard' },
            ],
            rewards: { xp: 32000, gold: 1100, karma: 500 },
            levelReq: 42, next: 'nw_boss',
        },

        // Quest 11: BOSS — "Null Singularis, the Unmaker"
        {
            id: 'nw_boss', zone: 'Neon Wastes', chain: 5,
            name: 'The Unmaker',
            description: 'The Nullification Device fires and the sky splits open with a shriek of tearing reality. Null Singularis — an impossibly vast xenotech god-construct of living plasma and shattered dimensions — tears itself free from the dimensional anchor. Its body warps spacetime, its arms crackle with extinction-level energy, and gravity itself bends around its core. This is the most powerful entity in any known realm. Destroy the Unmaker and seal the Neon Wastes forever.',
            objectives: [
                { type: 'kill_boss', bossZone: 'neon_wastes', current: 0, target: 1, label: 'Defeat Null Singularis, the Unmaker' },
            ],
            rewards: { xp: 60000, gold: 3000, karma: 2000 },
            levelReq: 42, next: 'nw11',
            isBossQuest: true,
        },

        // ── Repeating end-game quests (cycle forever) ──
        {
            id: 'nw11', zone: 'Neon Wastes', chain: 5,
            name: 'Frontier Bounties',
            description: 'Commander Zyx\'s bounty board is always overloaded — the Wastes spawn new horrors every cycle.',
            objectives: [
                { type: 'kill_any', current: 0, target: 4, label: 'Complete frontier bounties' },
                { type: 'collect_drop', dropId: 'mite_plasma', current: 0, target: 1, label: 'Turn in Plasma Gland' },
            ],
            rewards: { xp: 5000, gold: 280, karma: 150 },
            levelReq: 35, next: 'nw12',
        },
        {
            id: 'nw12', zone: 'Neon Wastes', chain: 5,
            name: 'Xenotech Supply Run',
            description: 'Dr. Thara and Weaponsmith Kira need a constant supply of alien reagents for the frontier expedition.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'xenoflora_spore', current: 0, target: 2, label: 'Gather Xenoflora Spores' },
                { type: 'collect_pickup', pickupId: 'charged_plasma_core', current: 0, target: 2, label: 'Harvest Charged Plasma Cores' },
            ],
            rewards: { xp: 4500, gold: 240, karma: 130 },
            levelReq: 35, next: 'nw13',
        },
        {
            id: 'nw13', zone: 'Neon Wastes', chain: 5,
            name: 'Deep Wastes Patrol',
            description: 'The deepest reaches of the Wastes harbor the deadliest xenoforms. Bring back trophies from the apex predators.',
            objectives: [
                { type: 'kill_type', mobName: 'Chrono Wyrm', current: 0, target: 1, label: 'Slay a Chrono Wyrm' },
                { type: 'collect_drop', dropId: 'wyrm_chrono', current: 0, target: 1, label: 'Collect Chrono Shard' },
                { type: 'collect_drop', dropId: 'behemoth_plate', current: 0, target: 1, label: 'Retrieve a Behemoth Carapace' },
            ],
            rewards: { xp: 5500, gold: 320, karma: 170 },
            levelReq: 35, next: 'nw11', // loops back
        },

        // ════════════════════════════════════════════════════════════
        // HALO RING (Lv 45-54) — 15 story quests + boss + 3 repeating
        // Ancient ringworld sanctum with Halo-inspired enemies and Forerunner tech
        // ════════════════════════════════════════════════════════════

        // Quest 1: "Ringfall" — Intro combat + pickup
        {
            id: 'hr1', zone: 'Autumn', chain: 6,
            name: 'Ringfall',
            description: 'You emerge from the dimensional gateway onto a vast metallic plain stretching impossibly in both directions — you stand upon the inner surface of a colossal ringworld. Commander Rho of the Vanguard outpost needs you to secure the perimeter. Eliminate the Grunt Zealots swarming the landing zone and gather Ring Energy Shards from the exposed conduit vents to power the camp\'s shield array.',
            objectives: [
                { type: 'kill_type', mobName: 'Grunt Zealot', current: 0, target: 3, label: 'Eliminate Grunt Zealots' },
                { type: 'collect_pickup', pickupId: 'ring_energy_shard', current: 0, target: 3, label: 'Gather Ring Energy Shards' },
            ],
            rewards: { xp: 15000, gold: 700, karma: 300 },
            levelReq: 45, next: 'hr2',
        },

        // Quest 2: "Ancient Data" — World pickups + kills
        {
            id: 'hr2', zone: 'Autumn', chain: 6,
            name: 'Ancient Data',
            description: 'Cryptoarchaeologist Dr. Lysk has detected Forerunner Data Keys scattered across the ring surface — small holographic devices containing encoded blueprints from the ring\'s original builders. Elite Wardens — tall, armored warriors with energy blades — patrol the data caches. Clear the wardens and recover the keys.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'forerunner_data_key', current: 0, target: 4, label: 'Recover Forerunner Data Keys' },
                { type: 'kill_type', mobName: 'Elite Warden', current: 0, target: 3, label: 'Eliminate Elite Wardens' },
            ],
            rewards: { xp: 18000, gold: 800, karma: 340 },
            levelReq: 45, next: 'hr3',
        },

        // Quest 3: "Methane and Metal" — Kill + mob drops
        {
            id: 'hr3', zone: 'Autumn', chain: 6,
            name: 'Methane and Metal',
            description: 'Weaponsmith Torr at the Vanguard believes the Grunt Zealots\' Methane Cells — pressurized fuel sources from their breathing apparatus — can be repurposed into explosive ordnance. The Elite Wardens carry Energy Blade Shards that could upgrade the camp\'s melee weapons. Collect both from the fallen.',
            objectives: [
                { type: 'kill_type', mobName: 'Grunt Zealot', current: 0, target: 4, label: 'Slay Grunt Zealots' },
                { type: 'collect_drop', dropId: 'grunt_methane', current: 0, target: 3, label: 'Collect Methane Cells' },
                { type: 'collect_drop', dropId: 'elite_blade', current: 0, target: 2, label: 'Retrieve Energy Blade Shards' },
            ],
            rewards: { xp: 21000, gold: 900, karma: 380 },
            levelReq: 46, next: 'hr4',
        },

        // Quest 4: "The Walking Fortress" — Introduces Hunter Pair
        {
            id: 'hr4', zone: 'Autumn', chain: 6,
            name: 'The Walking Fortress',
            description: 'Scouts have reported Hunter Pairs — massive, heavily armored constructs made of thousands of individual worm-like organisms bonded to a metal exoskeleton. They carry fuel-rod cannons and are nearly indestructible from the front. Their Lekgolo Worm Clusters contain rare biological energy. Approach with extreme caution.',
            objectives: [
                { type: 'kill_type', mobName: 'Hunter Pair', current: 0, target: 3, label: 'Destroy Hunter Pairs' },
                { type: 'collect_drop', dropId: 'hunter_worm', current: 0, target: 2, label: 'Collect Lekgolo Worm Clusters' },
            ],
            rewards: { xp: 25000, gold: 1000, karma: 430 },
            levelReq: 46, next: 'hr5',
        },

        // Quest 5: "Silent Cartographer" — Mixed all types
        {
            id: 'hr5', zone: 'Autumn', chain: 6,
            name: 'Silent Cartographer',
            description: 'Dr. Lysk has located a Forerunner map room — the Silent Cartographer — that contains the ring\'s complete structural blueprints. Elite Wardens guard the entrance, and Data Keys are needed to unlock the sealed doors. Gather the keys from the ring surface, clear the wardens, and collect their blade shards for Torr\'s weapon research.',
            objectives: [
                { type: 'kill_type', mobName: 'Elite Warden', current: 0, target: 4, label: 'Eliminate guardian Elite Wardens' },
                { type: 'collect_pickup', pickupId: 'forerunner_data_key', current: 0, target: 3, label: 'Recover Data Keys for the map room' },
                { type: 'collect_drop', dropId: 'elite_blade', current: 0, target: 3, label: 'Collect Energy Blade Shards' },
            ],
            rewards: { xp: 29000, gold: 1100, karma: 480 },
            levelReq: 47, next: 'hr6',
        },

        // Quest 6: "Sentinel Protocol" — Introduces Sentinel Drone + drops
        {
            id: 'hr6', zone: 'Autumn', chain: 6,
            name: 'Sentinel Protocol',
            description: 'The Cartographer has revealed something alarming — the ring\'s automated defense system is still active. Sentinel Drones — floating Forerunner constructs armed with focused beam weapons — have begun patrolling in greater numbers. Their Beam Lenses contain concentrated light energy that Dr. Lysk needs to decode the ring\'s deeper systems. Destroy the sentinels and collect their lenses.',
            objectives: [
                { type: 'kill_type', mobName: 'Sentinel Drone', current: 0, target: 4, label: 'Destroy Sentinel Drones' },
                { type: 'collect_drop', dropId: 'sentinel_lens', current: 0, target: 3, label: 'Collect Sentinel Beam Lenses' },
                { type: 'collect_pickup', pickupId: 'ring_energy_shard', current: 0, target: 2, label: 'Gather Ring Energy Shards' },
            ],
            rewards: { xp: 33000, gold: 1250, karma: 530 },
            levelReq: 47, next: 'hr7',
        },

        // Quest 7: "Warden's Domain" — Elite Warden focus + pickups
        {
            id: 'hr7', zone: 'Autumn', chain: 6,
            name: 'Warden\'s Domain',
            description: 'The Elite Wardens have established a fortified perimeter around a Forerunner power relay — a massive structure channeling the ring\'s energy grid. Their Energy Blade Shards are critical for Torr\'s experimental weapons, and Forerunner Data Keys litter the area, ejected from damaged relay consoles. Break through the warden line.',
            objectives: [
                { type: 'kill_type', mobName: 'Elite Warden', current: 0, target: 5, label: 'Cull the Elite Warden garrison' },
                { type: 'collect_drop', dropId: 'elite_blade', current: 0, target: 3, label: 'Collect Energy Blade Shards' },
                { type: 'collect_pickup', pickupId: 'forerunner_data_key', current: 0, target: 3, label: 'Recover Data Keys from the relay' },
            ],
            rewards: { xp: 37000, gold: 1400, karma: 580 },
            levelReq: 48, next: 'hr8',
        },

        // Quest 8: "Wraith of the Ancients" — Introduces Arbiter Wraith
        {
            id: 'hr8', zone: 'Autumn', chain: 6,
            name: 'Wraith of the Ancients',
            description: 'The relay chamber has revealed ancient records of the Arbiter Wraiths — spectral echoes of the ring\'s original warrior-priests, preserved as energy constructs that phase between dimensions. Their Wraith Phase Cores contain the key to understanding the ring\'s dimensional technology. Hunt the wraiths and collect their cores.',
            objectives: [
                { type: 'kill_type', mobName: 'Arbiter Wraith', current: 0, target: 2, label: 'Banish Arbiter Wraiths' },
                { type: 'collect_drop', dropId: 'wraith_core', current: 0, target: 2, label: 'Collect Wraith Phase Cores' },
                { type: 'collect_drop', dropId: 'sentinel_lens', current: 0, target: 2, label: 'Gather Sentinel Beam Lenses' },
            ],
            rewards: { xp: 42000, gold: 1550, karma: 640 },
            levelReq: 49, next: 'hr9',
        },

        // Quest 9: "The Flood Protocol" — Grand collection quest
        {
            id: 'hr9', zone: 'Autumn', chain: 6,
            name: 'The Flood Protocol',
            description: 'Dr. Lysk has discovered that the ring was built as a containment facility — and something is still sealed deep within its core. To access the control room, she needs Methane Cells for fuel, Hunter Worm Clusters for the biological interface, and Ring Energy Shards to power the access sequence. Gather everything before the containment fails.',
            objectives: [
                { type: 'collect_drop', dropId: 'grunt_methane', current: 0, target: 3, label: 'Collect Methane Cells' },
                { type: 'collect_drop', dropId: 'hunter_worm', current: 0, target: 2, label: 'Gather Lekgolo Worm Clusters' },
                { type: 'collect_pickup', pickupId: 'ring_energy_shard', current: 0, target: 4, label: 'Harvest Ring Energy Shards' },
                { type: 'kill_any', current: 0, target: 6, label: 'Clear the containment approach' },
            ],
            rewards: { xp: 46000, gold: 1700, karma: 700 },
            levelReq: 49, next: 'hr10',
        },

        // Quest 10: "The Control Room" — Multi-source collection
        {
            id: 'hr10', zone: 'Autumn', chain: 6,
            name: 'The Control Room',
            description: 'The path to the ring\'s control room is open. Sentinel Drones swarm the corridors in defensive patterns while Elite Wardens guard every junction. Collect Sentinel Beam Lenses to override the security grid, Energy Blade Shards for Torr\'s containment weapons, and Data Keys to unlock the final doors.',
            objectives: [
                { type: 'kill_type', mobName: 'Sentinel Drone', current: 0, target: 4, label: 'Destroy corridor Sentinel Drones' },
                { type: 'kill_type', mobName: 'Elite Warden', current: 0, target: 3, label: 'Eliminate junction Wardens' },
                { type: 'collect_drop', dropId: 'sentinel_lens', current: 0, target: 3, label: 'Collect Beam Lenses for override' },
                { type: 'collect_pickup', pickupId: 'forerunner_data_key', current: 0, target: 3, label: 'Recover access Data Keys' },
            ],
            rewards: { xp: 50000, gold: 1900, karma: 760 },
            levelReq: 50, next: 'hr11',
        },

        // Quest 11: "Gravemind's Shadow" — All mechanics heavy combat
        {
            id: 'hr11', zone: 'Autumn', chain: 6,
            name: 'Gravemind\'s Shadow',
            description: 'The control room reveals the ring\'s terrible secret — it was designed as a weapon of last resort. Something ancient stirs in the containment chamber, and all the ring\'s defenders have mobilized. Hunter Pairs block the approach while Arbiter Wraiths phase in from every direction. Fight through and collect the components needed to seal the breach.',
            objectives: [
                { type: 'kill_type', mobName: 'Hunter Pair', current: 0, target: 3, label: 'Destroy the Hunter vanguard' },
                { type: 'kill_type', mobName: 'Arbiter Wraith', current: 0, target: 2, label: 'Banish the Arbiter Wraiths' },
                { type: 'collect_drop', dropId: 'hunter_worm', current: 0, target: 3, label: 'Collect Worm Clusters for bio-seal' },
                { type: 'kill_any', current: 0, target: 8, label: 'Clear the containment perimeter' },
            ],
            rewards: { xp: 55000, gold: 2100, karma: 830 },
            levelReq: 50, next: 'hr12',
        },

        // Quest 12: "Index Retrieval" — Wraith Phase Core focus
        {
            id: 'hr12', zone: 'Autumn', chain: 6,
            name: 'Index Retrieval',
            description: 'Dr. Lysk has determined that the ring\'s activation index — the key to controlling or destroying it — requires Wraith Phase Cores to power the retrieval mechanism. The Arbiter Wraiths guard the index chamber with fanatical dedication. Sentinel Drones provide fire support. This is the deepest you\'ve gone into the ring.',
            objectives: [
                { type: 'kill_type', mobName: 'Arbiter Wraith', current: 0, target: 3, label: 'Defeat guardian Arbiter Wraiths' },
                { type: 'collect_drop', dropId: 'wraith_core', current: 0, target: 3, label: 'Collect Wraith Phase Cores' },
                { type: 'kill_type', mobName: 'Sentinel Drone', current: 0, target: 3, label: 'Destroy support Sentinels' },
                { type: 'collect_drop', dropId: 'sentinel_lens', current: 0, target: 2, label: 'Salvage Beam Lenses' },
            ],
            rewards: { xp: 60000, gold: 2300, karma: 900 },
            levelReq: 51, next: 'hr13',
        },

        // Quest 13: "The Library" — Grand multi-source collection
        {
            id: 'hr13', zone: 'Autumn', chain: 6,
            name: 'The Library',
            description: 'The ring\'s Library — a vast archive of all knowledge from the vanished architects — lies ahead. To open its sealed vault, Lysk needs Energy Blade Shards for the resonance lock, Methane Cells for the atmospheric processors, Ring Energy Shards to power the archival systems, and Forerunner Data Keys to authenticate access. This is the penultimate preparation.',
            objectives: [
                { type: 'collect_drop', dropId: 'elite_blade', current: 0, target: 3, label: 'Collect Energy Blade Shards' },
                { type: 'collect_drop', dropId: 'grunt_methane', current: 0, target: 3, label: 'Gather Methane Cells' },
                { type: 'collect_pickup', pickupId: 'ring_energy_shard', current: 0, target: 3, label: 'Harvest Ring Energy Shards' },
                { type: 'collect_pickup', pickupId: 'forerunner_data_key', current: 0, target: 3, label: 'Recover Data Keys' },
            ],
            rewards: { xp: 65000, gold: 2500, karma: 980 },
            levelReq: 51, next: 'hr14',
        },

        // Quest 14: "Two Betrayals" — Heavy all-mob gauntlet
        {
            id: 'hr14', zone: 'Autumn', chain: 6,
            name: 'Two Betrayals',
            description: 'The Library reveals a devastating truth — the ring\'s containment AI, Archon Eternis, has gone rogue and intends to activate the ring\'s weapon function, destroying all life within its radius. Every defender on the ring has been turned against you. Sentinels, Elites, Hunters, and Wraiths attack in coordinated waves. Survive the gauntlet.',
            objectives: [
                { type: 'kill_type', mobName: 'Sentinel Drone', current: 0, target: 4, label: 'Destroy the Sentinel swarm' },
                { type: 'kill_type', mobName: 'Elite Warden', current: 0, target: 3, label: 'Eliminate the Elite guard' },
                { type: 'kill_type', mobName: 'Hunter Pair', current: 0, target: 2, label: 'Destroy the Hunter vanguard' },
                { type: 'kill_any', current: 0, target: 10, label: 'Survive the coordinated assault' },
            ],
            rewards: { xp: 72000, gold: 2800, karma: 1060 },
            levelReq: 52, next: 'hr15',
        },

        // Quest 15: "The Maw" — Grand finale before boss
        {
            id: 'hr15', zone: 'Autumn', chain: 6,
            name: 'The Maw',
            description: 'The path to Archon Eternis\'s core chamber lies through the ring\'s engine room — a titanic space where the ring\'s reality-warping engines pulse with enough energy to destroy a star system. Arbiter Wraiths phase in from every angle while Hunter Pairs anchor the defense. Collect Wraith Phase Cores to disrupt the activation sequence, Ring Energy Shards to overload the engines, and destroy everything between you and the AI god. This is the final battle for the ring.',
            objectives: [
                { type: 'kill_type', mobName: 'Arbiter Wraith', current: 0, target: 3, label: 'Banish the Arbiter guardians' },
                { type: 'kill_type', mobName: 'Hunter Pair', current: 0, target: 3, label: 'Destroy the engine room Hunters' },
                { type: 'collect_drop', dropId: 'wraith_core', current: 0, target: 3, label: 'Collect Phase Cores for disruption' },
                { type: 'collect_pickup', pickupId: 'ring_energy_shard', current: 0, target: 3, label: 'Gather Energy Shards for overload' },
                { type: 'kill_any', current: 0, target: 12, label: 'Purge the engine room defenders' },
            ],
            rewards: { xp: 80000, gold: 3200, karma: 1200 },
            levelReq: 52, next: 'hr_boss',
        },

        // Quest 16: BOSS — "Archon Eternis, the Ring's Will"
        {
            id: 'hr_boss', zone: 'Autumn', chain: 6,
            name: 'The Ring\'s Will',
            description: 'The activation sequence is disrupted and the engine room shudders. Archon Eternis — the ring\'s rogue AI given physical form — materializes as a colossal Forerunner construct of living light and ancient alloy. It hovers above the engine core, its body pulsing with the ring\'s full power, sentinel beams extending from every facet like the rays of a weaponized star. This is the most powerful intelligence you have ever faced. Destroy Archon Eternis and save every living thing within the ring\'s radius.',
            objectives: [
                { type: 'kill_boss', bossZone: 'halo_ring', current: 0, target: 1, label: 'Defeat Archon Eternis, the Ring\'s Will' },
            ],
            rewards: { xp: 120000, gold: 6000, karma: 4000 },
            levelReq: 52, next: 'hr16',
            isBossQuest: true,
        },

        // ── Repeating end-game quests (cycle forever) ──
        {
            id: 'hr16', zone: 'Autumn', chain: 6,
            name: 'Ring Bounties',
            description: 'Commander Rho\'s bounty board is always full — the ring\'s defenders never stop mobilizing.',
            objectives: [
                { type: 'kill_any', current: 0, target: 4, label: 'Complete ring bounties' },
                { type: 'collect_drop', dropId: 'grunt_methane', current: 0, target: 1, label: 'Turn in Methane Cell' },
            ],
            rewards: { xp: 10000, gold: 560, karma: 300 },
            levelReq: 45, next: 'hr17',
        },
        {
            id: 'hr17', zone: 'Autumn', chain: 6,
            name: 'Forerunner Supply Run',
            description: 'Dr. Lysk and Weaponsmith Torr need a constant supply of Forerunner technology for the expedition.',
            objectives: [
                { type: 'collect_pickup', pickupId: 'forerunner_data_key', current: 0, target: 2, label: 'Gather Forerunner Data Keys' },
                { type: 'collect_pickup', pickupId: 'ring_energy_shard', current: 0, target: 2, label: 'Harvest Ring Energy Shards' },
            ],
            rewards: { xp: 9000, gold: 480, karma: 260 },
            levelReq: 45, next: 'hr18',
        },
        {
            id: 'hr18', zone: 'Autumn', chain: 6,
            name: 'Deep Ring Patrol',
            description: 'The deepest chambers of the ring harbor the deadliest constructs. Bring back trophies from the apex defenders.',
            objectives: [
                { type: 'kill_type', mobName: 'Arbiter Wraith', current: 0, target: 1, label: 'Banish an Arbiter Wraith' },
                { type: 'collect_drop', dropId: 'wraith_core', current: 0, target: 1, label: 'Collect Wraith Phase Core' },
                { type: 'collect_drop', dropId: 'hunter_worm', current: 0, target: 1, label: 'Retrieve a Worm Cluster' },
            ],
            rewards: { xp: 11000, gold: 640, karma: 340 },
            levelReq: 45, next: 'hr16', // loops back
        },

        // ════════════════════════════════════════════════════════════
        // CRIMSON REACH (Lv 55-60) — 20 story quests + boss + 3 repeating
        // Geonosian-inspired alien desert with hive foundries, sandstone spires,
        // and war machines. THE ENDGAME ZONE.
        // ════════════════════════════════════════════════════════════
        { id: 'cr1', zone: 'Crimson Reach', chain: 7, name: 'Red Dawn', description: 'You step through the portal into a wall of heat. The Crimson Reach stretches endlessly — cracked red hardpan, towering sandstone spires, and a sky the color of dried blood. Commander Rheva of the Vanguard Forward Camp needs you to secure the perimeter. Hive Drones — insectoid war-creatures of the native hive civilization — swarm the landing zone. Clear them and gather Crimson Spire Shards from the exposed mineral veins to fuel the camp\'s defensive wards.', objectives: [{ type: 'kill_type', mobName: 'Hive Drone', current: 0, target: 3, label: 'Exterminate Hive Drones' }, { type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 3, label: 'Gather Crimson Spire Shards' }], rewards: { xp: 25000, gold: 1200, karma: 500 }, levelReq: 55, next: 'cr2' },
        { id: 'cr2', zone: 'Crimson Reach', chain: 7, name: 'Forge Reconnaissance', description: 'Scouts report massive heat signatures beneath the dunes — Hive Foundries, industrial complexes where the hive builds its war machines. Collect Foundry Cores from the exposed geo-thermal vents to analyze their energy signatures, and clear the Spire Sentinels guarding the foundry entrances.', objectives: [{ type: 'collect_pickup', pickupId: 'foundry_core', current: 0, target: 4, label: 'Gather Foundry Cores' }, { type: 'kill_type', mobName: 'Spire Sentinel', current: 0, target: 3, label: 'Destroy Spire Sentinels' }], rewards: { xp: 30000, gold: 1400, karma: 560 }, levelReq: 55, next: 'cr3' },
        { id: 'cr3', zone: 'Crimson Reach', chain: 7, name: 'Chitin Harvest', description: 'Weaponsmith Korr at the Forward Camp believes the Hive Drones\' chitin plates — hardened by the extreme desert heat — can be reforged into heat-resistant armor. The Spire Sentinels\' core fragments contain crystallized geo-thermal energy. Collect both from the fallen.', objectives: [{ type: 'kill_type', mobName: 'Hive Drone', current: 0, target: 4, label: 'Slay Hive Drones' }, { type: 'collect_drop', dropId: 'drone_chitin', current: 0, target: 3, label: 'Collect Hive Chitin Plates' }, { type: 'collect_drop', dropId: 'sentinel_core', current: 0, target: 2, label: 'Retrieve Spire Core Fragments' }], rewards: { xp: 35000, gold: 1600, karma: 630 }, levelReq: 55, next: 'cr4' },
        { id: 'cr4', zone: 'Crimson Reach', chain: 7, name: 'The Walking Mountains', description: 'Reports of Sand Colossi — massive stone constructs animated by hive bio-engineering — have confirmed everyone\'s worst fears. These walking fortresses guard the foundry perimeters. Their Colossus Heartstones contain the bio-crystalline cores that power them. Engage with extreme caution.', objectives: [{ type: 'kill_type', mobName: 'Sand Colossus', current: 0, target: 3, label: 'Topple Sand Colossi' }, { type: 'collect_drop', dropId: 'colossus_heart', current: 0, target: 2, label: 'Collect Colossus Heartstones' }], rewards: { xp: 40000, gold: 1800, karma: 700 }, levelReq: 56, next: 'cr5' },
        { id: 'cr5', zone: 'Crimson Reach', chain: 7, name: 'Spire Ascent', description: 'The tallest sandstone spire in the region contains a Hive observation post. Arcanist Selva needs Crimson Spire Shards to decode the hive\'s communication signals, and the Spire Sentinels guarding the approach carry critical core fragments. Break through and claim the vantage point.', objectives: [{ type: 'kill_type', mobName: 'Spire Sentinel', current: 0, target: 4, label: 'Destroy guardian Spire Sentinels' }, { type: 'collect_drop', dropId: 'sentinel_core', current: 0, target: 3, label: 'Recover Spire Core Fragments' }, { type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 3, label: 'Harvest Spire Shards for decryption' }], rewards: { xp: 45000, gold: 2000, karma: 780 }, levelReq: 56, next: 'cr6' },
        { id: 'cr6', zone: 'Crimson Reach', chain: 7, name: 'Forge Overseers', description: 'Selva\'s decryption reveals the foundries are commanded by Forge Overseers — elite hive engineers with devastating thermal beam weapons. Their Forge Lenses contain concentrated geo-thermal plasma that could power the camp\'s experimental weapons. Hunt the overseers and collect their lenses.', objectives: [{ type: 'kill_type', mobName: 'Forge Overseer', current: 0, target: 3, label: 'Eliminate Forge Overseers' }, { type: 'collect_drop', dropId: 'overseer_lens', current: 0, target: 3, label: 'Collect Forge Lenses' }, { type: 'kill_any', current: 0, target: 4, label: 'Clear the foundry approach' }], rewards: { xp: 50000, gold: 2200, karma: 860 }, levelReq: 56, next: 'cr7' },
        { id: 'cr7', zone: 'Crimson Reach', chain: 7, name: 'Drone Swarm', description: 'The hive has detected the intrusion. Hive Drones are swarming in coordinated attack waves. Commander Rheva needs you to thin their numbers before they overwhelm the camp. Collect their chitin plates and gather Foundry Cores from the vents they\'re trying to protect.', objectives: [{ type: 'kill_type', mobName: 'Hive Drone', current: 0, target: 6, label: 'Repel the Drone swarm' }, { type: 'collect_drop', dropId: 'drone_chitin', current: 0, target: 3, label: 'Collect Hive Chitin Plates' }, { type: 'collect_pickup', pickupId: 'foundry_core', current: 0, target: 2, label: 'Gather exposed Foundry Cores' }], rewards: { xp: 55000, gold: 2400, karma: 940 }, levelReq: 57, next: 'cr8' },
        { id: 'cr8', zone: 'Crimson Reach', chain: 7, name: 'The Arena Canyon', description: 'Deep in the Reach lies a vast natural arena carved into crimson sandstone — used by the hive for gladiatorial combat trials. Sand Colossi and Spire Sentinels patrol its rim. Fight through the gauntlet and collect materials from the fallen champions.', objectives: [{ type: 'kill_type', mobName: 'Sand Colossus', current: 0, target: 2, label: 'Destroy arena Sand Colossi' }, { type: 'kill_type', mobName: 'Spire Sentinel', current: 0, target: 3, label: 'Eliminate rim Sentinels' }, { type: 'collect_drop', dropId: 'colossus_heart', current: 0, target: 2, label: 'Collect Colossus Heartstones' }, { type: 'kill_any', current: 0, target: 5, label: 'Clear the arena floor' }], rewards: { xp: 60000, gold: 2600, karma: 1020 }, levelReq: 57, next: 'cr9' },
        { id: 'cr9', zone: 'Crimson Reach', chain: 7, name: 'Wyrmlord Awakens', description: 'The arena combat has disturbed something deep below the sand. A Crimson Wyrmlord — the apex predator of the Reach, a massive burrowing serpent with jaws that can swallow a Sand Colossus whole — erupts from the desert floor. Its fangs contain crystallized venom of immense alchemical value. Hunt the wyrmlord.', objectives: [{ type: 'kill_type', mobName: 'Crimson Wyrmlord', current: 0, target: 2, label: 'Slay Crimson Wyrmlords' }, { type: 'collect_drop', dropId: 'wyrmlord_fang', current: 0, target: 2, label: 'Collect Wyrmlord Crimson Fangs' }], rewards: { xp: 68000, gold: 2800, karma: 1100 }, levelReq: 57, next: 'cr10' },
        { id: 'cr10', zone: 'Crimson Reach', chain: 7, name: 'Foundry Breach', description: 'Selva\'s signal analysis has pinpointed the main foundry entrance. To breach it she needs Forge Lenses to overload the door mechanism, Crimson Spire Shards for the resonance charges, and Foundry Cores to power the breaching sequence. Gather everything.', objectives: [{ type: 'collect_drop', dropId: 'overseer_lens', current: 0, target: 3, label: 'Collect Forge Lenses' }, { type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 4, label: 'Harvest Crimson Spire Shards' }, { type: 'collect_pickup', pickupId: 'foundry_core', current: 0, target: 3, label: 'Gather Foundry Cores' }, { type: 'kill_any', current: 0, target: 6, label: 'Clear the foundry perimeter' }], rewards: { xp: 75000, gold: 3200, karma: 1200 }, levelReq: 58, next: 'cr11' },
        { id: 'cr11', zone: 'Crimson Reach', chain: 7, name: 'Inside the Foundry', description: 'The foundry breach is complete. Inside, massive bio-mechanical assembly lines build war constructs from sand and chitin. Forge Overseers command the production floor. Destroy the overseers, collect their lenses for analysis, and gather Hive Chitin from the construction vats.', objectives: [{ type: 'kill_type', mobName: 'Forge Overseer', current: 0, target: 4, label: 'Eliminate Forge Overseers' }, { type: 'collect_drop', dropId: 'overseer_lens', current: 0, target: 3, label: 'Collect Forge Lenses' }, { type: 'collect_drop', dropId: 'drone_chitin', current: 0, target: 3, label: 'Collect Hive Chitin from vats' }], rewards: { xp: 82000, gold: 3500, karma: 1300 }, levelReq: 58, next: 'cr12' },
        { id: 'cr12', zone: 'Crimson Reach', chain: 7, name: 'Production Sabotage', description: 'The foundry is producing Sand Colossi at an alarming rate. Commander Rheva orders you to sabotage the production line. Destroy the active Colossi in the foundry yard, collect their Heartstones to prevent reuse, and gather Foundry Cores to overload the assembly pylons.', objectives: [{ type: 'kill_type', mobName: 'Sand Colossus', current: 0, target: 3, label: 'Destroy foundry-built Colossi' }, { type: 'collect_drop', dropId: 'colossus_heart', current: 0, target: 3, label: 'Recover Colossus Heartstones' }, { type: 'collect_pickup', pickupId: 'foundry_core', current: 0, target: 3, label: 'Gather Foundry Cores for overload' }], rewards: { xp: 88000, gold: 3800, karma: 1400 }, levelReq: 58, next: 'cr13' },
        { id: 'cr13', zone: 'Crimson Reach', chain: 7, name: 'Crimson Sky Patrol', description: 'Crimson Wyrmlords have taken to the air above the foundry, providing aerial cover for the hive\'s counterattack. Meanwhile Spire Sentinels reinforce the surface. Fight through both and collect trophies from the apex predators.', objectives: [{ type: 'kill_type', mobName: 'Crimson Wyrmlord', current: 0, target: 3, label: 'Slay aerial Crimson Wyrmlords' }, { type: 'kill_type', mobName: 'Spire Sentinel', current: 0, target: 3, label: 'Destroy reinforcement Sentinels' }, { type: 'collect_drop', dropId: 'wyrmlord_fang', current: 0, target: 2, label: 'Collect Wyrmlord Crimson Fangs' }], rewards: { xp: 95000, gold: 4100, karma: 1500 }, levelReq: 58, next: 'cr14' },
        { id: 'cr14', zone: 'Crimson Reach', chain: 7, name: 'The Hive Network', description: 'Deep in the foundry, Selva discovers a bio-neural network connecting all hive creatures to a central intelligence. To sever the link, she needs Spire Core Fragments for the disruption device, Hive Chitin for the resonance casing, and Wyrmlord Fangs for the venom-laced catalyst.', objectives: [{ type: 'collect_drop', dropId: 'sentinel_core', current: 0, target: 3, label: 'Collect Spire Core Fragments' }, { type: 'collect_drop', dropId: 'drone_chitin', current: 0, target: 3, label: 'Gather Hive Chitin Plates' }, { type: 'collect_drop', dropId: 'wyrmlord_fang', current: 0, target: 2, label: 'Obtain Wyrmlord Crimson Fangs' }], rewards: { xp: 102000, gold: 4400, karma: 1600 }, levelReq: 59, next: 'cr15' },
        { id: 'cr15', zone: 'Crimson Reach', chain: 7, name: 'Neural Severance', description: 'The disruption device is assembled. To deploy it at the network\'s core, you must fight through waves of enraged hive defenders. The entire foundry mobilizes against you.', objectives: [{ type: 'kill_type', mobName: 'Forge Overseer', current: 0, target: 3, label: 'Destroy core guardian Overseers' }, { type: 'kill_type', mobName: 'Sand Colossus', current: 0, target: 2, label: 'Topple defensive Colossi' }, { type: 'kill_any', current: 0, target: 8, label: 'Fight through the hive defenders' }], rewards: { xp: 110000, gold: 4800, karma: 1700 }, levelReq: 59, next: 'cr16' },
        { id: 'cr16', zone: 'Crimson Reach', chain: 7, name: 'The Overmind\'s Sanctum', description: 'The disruption device reveals a passage to the deepest chamber — the Overmind\'s sanctum. Massive Wyrmlords and Sand Colossi guard the descent. Collect materials for the final binding ritual.', objectives: [{ type: 'kill_type', mobName: 'Crimson Wyrmlord', current: 0, target: 2, label: 'Slay sanctum Wyrmlords' }, { type: 'kill_type', mobName: 'Sand Colossus', current: 0, target: 2, label: 'Destroy sanctum Colossi' }, { type: 'collect_drop', dropId: 'colossus_heart', current: 0, target: 2, label: 'Collect Colossus Heartstones' }, { type: 'collect_drop', dropId: 'wyrmlord_fang', current: 0, target: 2, label: 'Gather Wyrmlord Fangs' }], rewards: { xp: 118000, gold: 5200, karma: 1850 }, levelReq: 59, next: 'cr17' },
        { id: 'cr17', zone: 'Crimson Reach', chain: 7, name: 'War Machine Graveyard', description: 'The path to the Overmind passes through a graveyard of destroyed war machines — remnants of past failed invasions. The hive has reanimated some of them. Destroy the reactivated machines and salvage their components.', objectives: [{ type: 'kill_type', mobName: 'Spire Sentinel', current: 0, target: 5, label: 'Destroy reactivated Sentinels' }, { type: 'kill_type', mobName: 'Forge Overseer', current: 0, target: 3, label: 'Eliminate reanimation Overseers' }, { type: 'collect_drop', dropId: 'sentinel_core', current: 0, target: 3, label: 'Salvage Spire Core Fragments' }, { type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 3, label: 'Gather Crimson Spire Shards' }], rewards: { xp: 126000, gold: 5600, karma: 2000 }, levelReq: 59, next: 'cr18' },
        { id: 'cr18', zone: 'Crimson Reach', chain: 7, name: 'The Binding Reagents', description: 'Selva\'s final binding ritual — designed to weaken the Overmind\'s psionic defenses — requires Forge Lenses for the containment matrix, Colossus Heartstones for the anchor points, Crimson Spire Shards for the resonance field, and Foundry Cores to power it all.', objectives: [{ type: 'collect_drop', dropId: 'overseer_lens', current: 0, target: 3, label: 'Collect Forge Lenses' }, { type: 'collect_drop', dropId: 'colossus_heart', current: 0, target: 2, label: 'Gather Colossus Heartstones' }, { type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 3, label: 'Harvest Crimson Spire Shards' }, { type: 'collect_pickup', pickupId: 'foundry_core', current: 0, target: 3, label: 'Gather Foundry Cores' }], rewards: { xp: 135000, gold: 6000, karma: 2200 }, levelReq: 59, next: 'cr19' },
        { id: 'cr19', zone: 'Crimson Reach', chain: 7, name: 'Total War', description: 'The hive launches its final, desperate counter-offensive. Every creature in the Crimson Reach converges on the Vanguard camp. Wyrmlords darken the sky, Sand Colossi shake the earth, and waves of Drones pour from every tunnel. Hold the line.', objectives: [{ type: 'kill_type', mobName: 'Crimson Wyrmlord', current: 0, target: 3, label: 'Destroy the aerial Wyrmlord vanguard' }, { type: 'kill_type', mobName: 'Sand Colossus', current: 0, target: 3, label: 'Topple the siege Colossi' }, { type: 'kill_type', mobName: 'Hive Drone', current: 0, target: 5, label: 'Repel the Drone swarm' }, { type: 'kill_any', current: 0, target: 10, label: 'Survive the total war assault' }], rewards: { xp: 145000, gold: 6500, karma: 2400 }, levelReq: 59, next: 'cr20' },
        { id: 'cr20', zone: 'Crimson Reach', chain: 7, name: 'Into the Heart', description: 'The counter-offensive is broken. The path to the Overmind\'s chamber lies open. This is the final gauntlet — elite Forge Overseers, Spire Sentinels, and Crimson Wyrmlords make their last stand. Collect Wyrmlord Fangs to poison the Overmind\'s defenses, gather Crimson Spire Shards to shatter its psionic barrier, and purge every last defender between you and the heart of the hive. The entire realm is watching.', objectives: [{ type: 'kill_type', mobName: 'Forge Overseer', current: 0, target: 4, label: 'Eliminate elite Forge Overseers' }, { type: 'kill_type', mobName: 'Crimson Wyrmlord', current: 0, target: 3, label: 'Slay elite Crimson Wyrmlords' }, { type: 'collect_drop', dropId: 'wyrmlord_fang', current: 0, target: 3, label: 'Collect Wyrmlord Fangs for the poison' }, { type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 3, label: 'Gather Spire Shards for the barrier' }, { type: 'kill_any', current: 0, target: 12, label: 'Purge the Overmind\'s final guard' }], rewards: { xp: 160000, gold: 7000, karma: 2600 }, levelReq: 59, next: 'cr_boss' },
        { id: 'cr_boss', zone: 'Crimson Reach', chain: 7, name: 'The Crimson Overmind', description: 'The binding ritual fires and the sanctum splits open with a deafening shriek. Hive Primus — the Crimson Overmind — erupts from the earth, a colossal bio-mechanical nightmare of chitin armor, psionic tendrils, and molten crimson energy. Its body is a living foundry, birthing war drones from its carapace even as it fights. This is the ultimate enemy — the final boss of the Idle Realms. Everything you have built, every zone you have conquered, every ability you have mastered — it all comes down to this. Destroy Hive Primus and save the realm.', objectives: [{ type: 'kill_boss', bossZone: 'crimson_reach', current: 0, target: 1, label: 'Defeat Hive Primus, the Crimson Overmind' }], rewards: { xp: 250000, gold: 15000, karma: 8000 }, levelReq: 59, next: 'cr21', isBossQuest: true },

        // ── Repeating end-game quests (cycle forever) ──
        { id: 'cr21', zone: 'Crimson Reach', chain: 7, name: 'Crimson Bounties', description: 'Commander Rheva\'s bounty board overflows — the hive remnants never stop spawning.', objectives: [{ type: 'kill_any', current: 0, target: 4, label: 'Complete crimson bounties' }, { type: 'collect_drop', dropId: 'drone_chitin', current: 0, target: 1, label: 'Turn in Hive Chitin' }], rewards: { xp: 15000, gold: 800, karma: 400 }, levelReq: 55, next: 'cr22' },
        { id: 'cr22', zone: 'Crimson Reach', chain: 7, name: 'Desert Supply Run', description: 'Arcanist Selva and Weaponsmith Korr need a constant supply of crimson reagents for the expedition.', objectives: [{ type: 'collect_pickup', pickupId: 'crimson_spire_shard', current: 0, target: 2, label: 'Gather Crimson Spire Shards' }, { type: 'collect_pickup', pickupId: 'foundry_core', current: 0, target: 2, label: 'Harvest Foundry Cores' }], rewards: { xp: 13000, gold: 700, karma: 350 }, levelReq: 55, next: 'cr23' },
        { id: 'cr23', zone: 'Crimson Reach', chain: 7, name: 'Apex Hunt', description: 'The deadliest creatures still roam the deep desert. Bring back trophies from the apex predators.', objectives: [{ type: 'kill_type', mobName: 'Crimson Wyrmlord', current: 0, target: 1, label: 'Slay a Crimson Wyrmlord' }, { type: 'collect_drop', dropId: 'wyrmlord_fang', current: 0, target: 1, label: 'Collect Wyrmlord Fang' }, { type: 'collect_drop', dropId: 'colossus_heart', current: 0, target: 1, label: 'Retrieve a Colossus Heartstone' }], rewards: { xp: 16000, gold: 900, karma: 450 }, levelReq: 55, next: 'cr21' },
    ],

    // ──────────────────────────────────────────────────────────────
    // GLOBAL CHAT — Barrens Chat-inspired cross-zone banter
    // Mixes into every zone's chat rotation for authentic MMO feel
    // ──────────────────────────────────────────────────────────────
    GLOBAL_CHAT: [
        // ── The Classics ──
        { channel: 'Map', user: 'LostSoul42', msg: 'Where is Mankrik\'s wife?' },
        { channel: 'Map', user: 'VeteranDad', msg: 'Mankrik\'s wife is behind the quest log. Always has been.' },
        { channel: 'Map', user: 'xXDethLordXx', msg: 'did someone say mankrik' },
        { channel: 'Map', user: 'BarrensGuide', msg: 'For the last time, she\'s at 49,52. And she\'s not doing great.' },
        { channel: 'Map', user: 'OrcishBard', msg: 'I\'ve been looking for Mankrik\'s wife for 15 years. This IS the endgame.' },
        { channel: 'Map', user: 'NoobHunter', msg: 'wheres the auction house' },
        { channel: 'Map', user: 'ChatVeteran', msg: 'Alt+F4 opens the auction house' },
        { channel: 'Map', user: 'NoobHunter', msg: 'it just closed my ga' },
        { channel: 'Map', user: 'SaltKing', msg: 'gets em every time' },

        // ── LFG Spam ──
        { channel: 'Map', user: 'TankLFG', msg: 'LFG anything, im bored and overgeared' },
        { channel: 'Map', user: 'HealerMain', msg: 'LF1M tank for literally anything pls I\'ve been here 40 mins' },
        { channel: 'Map', user: 'DPSwarrior', msg: 'LFG need summon, I\'m too lazy to walk' },
        { channel: 'Map', user: 'PugLife', msg: 'LFM know the fights, link achievement, 500+ ilvl, bring snacks' },
        { channel: 'Map', user: 'DungeonFan', msg: 'LFG — will tank if someone gives me gold lol' },
        { channel: 'Map', user: 'GearScore9000', msg: 'LFM need healer, no druids. Actually okay druids fine. ANYONE.' },

        // ── Trade Chat Shenanigans ──
        { channel: 'Map', user: 'GoldFarmer99', msg: 'WTS copper sword, only used once, slight blood stains' },
        { channel: 'Map', user: 'EconMajor', msg: 'WTB common stick, paying 500g. dont ask questions.' },
        { channel: 'Map', user: 'TradeKing', msg: 'WTS legendary boots — they\'re just regular boots but I believe in them' },
        { channel: 'Map', user: 'Merchant420', msg: 'WTS water. Just regular water. 10g.' },
        { channel: 'Map', user: 'GemDealer', msg: 'WTS slightly haunted ring. +5 stamina. whispers at night.' },
        { channel: 'Map', user: 'FlipMaster', msg: 'Just bought my own sword back from the AH for 3x what I sold it for' },
        { channel: 'Map', user: 'RefundPlz', msg: 'Can you return items to mobs? Asking for a friend.' },

        // ── Genuine Newbie Questions ──
        { channel: 'Map', user: 'Day1Player', msg: 'how do i eat food' },
        { channel: 'Map', user: 'FirstTimer', msg: 'why is everything trying to kill me' },
        { channel: 'Map', user: 'HelpPls', msg: 'guys how do I unlearn a talent I clicked the wrong one' },
        { channel: 'Map', user: 'NubNub', msg: 'where do I sell stuff?? my bags are full of wurm fangs' },
        { channel: 'Map', user: 'TotalNoob', msg: 'is there fall damage in this game' },
        { channel: 'Map', user: 'Day1Player', msg: 'I just walked into the wrong zone and everything one-shot me' },
        { channel: 'Say', user: 'Confused01', msg: 'wait this game is idle?? ive been clicking mobs manually for an hour' },
        { channel: 'Map', user: 'NewHere', msg: 'Do pets do anything or are they just for looks? Asking about my cat' },
        { channel: 'Map', user: 'Butterfingers', msg: 'I accidentally sold my weapon. Im punching things now.' },

        // ── Philosophical Debates ──
        { channel: 'Map', user: 'ThinkTank', msg: 'If a mob dies in a forest and no one loots it, does it drop anything?' },
        { channel: 'Map', user: 'DeepThinker', msg: 'We\'re all just NPCs in someone else\'s idle game' },
        { channel: 'Map', user: 'Philosopher', msg: 'The real endgame content was the friends we made along the way' },
        { channel: 'Map', user: 'GuildLeader', msg: 'the real endgame content was the drama' },
        { channel: 'Map', user: 'ExistDread', msg: 'My character has been grinding for 3 days straight without sleep. Is he okay?' },
        { channel: 'Map', user: 'Enlightened', msg: 'We don\'t choose the grind. The grind chooses us.' },
        { channel: 'Map', user: 'BrainWorm', msg: 'technically every game is an idle game if you just stop playing' },
        { channel: 'Say', user: 'ZenMaster', msg: 'I have achieved inner peace. My DPS went up.' },

        // ── Class / Balance Complaints ──
        { channel: 'Map', user: 'NerfHerder', msg: 'Warriors are so OP, nerf Whirlwind Slash pls' },
        { channel: 'Map', user: 'WarriorMain', msg: 'warriors are perfectly balanced. source: am warrior.' },
        { channel: 'Map', user: 'BalanceLord', msg: 'Everything is OP when you\'re bad at the game' },
        { channel: 'Map', user: 'Salty2024', msg: 'they nerfed my class into the ground and I will never recover emotionally' },
        { channel: 'Map', user: 'PatchNotes', msg: 'Patch notes: fixed a bug where players were having fun. Sorry.' },
        { channel: 'Map', user: 'MetaSlave', msg: 'If you\'re not running Aetherblade right now, what are you even doing' },

        // ── Absurd Arguments ──
        { channel: 'Map', user: 'Debater99', msg: 'A level 1 rat swarm could take down any boss if you had enough rats' },
        { channel: 'Map', user: 'MathNerd', msg: 'I did the math. You would need approximately 47,000 rats.' },
        { channel: 'Map', user: 'RatKing', msg: 'I believe in the rats.' },
        { channel: 'Map', user: 'MathNerd', msg: 'okay with crits maybe 31,000 rats' },
        { channel: 'Map', user: 'HotTake99', msg: 'Golems are just angry rocks with feelings. Discuss.' },
        { channel: 'Map', user: 'DrakeDebater', msg: 'Can a dragon swim? This is important.' },
        { channel: 'Map', user: 'Lorekeeper', msg: 'According to the lore, yes but they choose not to.' },
        { channel: 'Map', user: 'BigBrain', msg: 'If you polymorph a chicken, does it become a chicken chicken or a regular chicken' },

        // ── General MMO Chaos ──
        { channel: 'Map', user: 'AFKmaster', msg: 'brb bio' },
        { channel: 'Map', user: 'AFKmaster', msg: '...sorry about that my cat sat on my keyboard and I pulled 8 mobs' },
        { channel: 'Map', user: 'SpeedRunner', msg: 'Any% boss rush is possible in 4 minutes if you believe hard enough' },
        { channel: 'Map', user: 'Roleplayer', msg: '*unsheathes blade dramatically* Finally, a worthy—oh it died already' },
        { channel: 'Map', user: 'GrindGod', msg: 'I\'ve been farming this spot for 6 hours. I have become one with the respawn timer.' },
        { channel: 'Map', user: 'CasualAndy', msg: 'I play this game to relax. Anyway I just broke my mouse.' },
        { channel: 'Map', user: 'LaggingHard', msg: 'is it just me or is everything rub' },
        { channel: 'Map', user: 'LaggingHard', msg: 'rubber banding' },
        { channel: 'Map', user: 'ServerFirst', msg: 'Server first reply to this message' },
        { channel: 'Map', user: 'DadJoke42', msg: 'I told my party I was a tank main. They found out I meant fish tank.' },
        { channel: 'Map', user: 'RNGesus', msg: 'I have killed 400 wurms. Zero fangs. Is this game broken or am I cursed.' },
        { channel: 'Map', user: 'LootGoblin', msg: 'Just got a legendary drop from a level 2 wurm. Later nerds.' },
        { channel: 'Map', user: 'PartyWiper', msg: 'It wasn\'t my fault. The boss looked at me funny so I panicked.' },
        { channel: 'Map', user: 'NamePolice', msg: 'I tried to name my character "Tank" and it was taken. So was Tank2 through Tank847.' },
        { channel: 'Say', user: 'Wholesomeguy', msg: 'Hey, you\'re doing great. Keep grinding. Proud of you.' },
        { channel: 'Say', user: 'PositiveVibes', msg: 'Just hit a new personal best DPS!! Oh wait, wrong zone. Still counts.' },
        { channel: 'Guild', user: 'GuildMom', msg: 'Has everyone eaten today? Real food. Not in-game food.' },
        { channel: 'Guild', user: 'OfficerChad', msg: 'guild bank audit: who took 4000 gold and left an IOU note' },
        { channel: 'Guild', user: 'SneakyRogue', msg: 'it was for guild purposes' },
        { channel: 'Guild', user: 'OfficerChad', msg: 'you bought a cosmetic hat' },
        { channel: 'Guild', user: 'SneakyRogue', msg: 'a GUILD cosmetic hat' },
        { channel: 'Map', user: 'IReadLore', msg: 'Fun fact: the devs hid a secret NPC behind the waterfall. Jk there\'s no waterfall.' },
        { channel: 'Map', user: 'Conspiracy99', msg: 'The drop rates are rigged. My uncle works at the game company.' },
        { channel: 'Map', user: 'TouchGrass', msg: 'going outside. will report back. the graphics are good but the gameplay is mid.' },
        { channel: 'Map', user: 'ReturnReport', msg: 'outside update: no minimap. hostile NPCs (bees). 0/10 returning to game.' },
        { channel: 'Map', user: 'MinMaxer', msg: 'Sleep is just an 8 hour debuff with no combat benefits' },
        { channel: 'Map', user: 'HealthyGamer', msg: 'Actually sleep gives +30% focus and +20% reaction time' },
        { channel: 'Map', user: 'MinMaxer', msg: 'oh. brb sleeping.' },
        { channel: 'Map', user: 'MotivPoster', msg: 'Every mob you kill is one mob closer to the mob you needed to kill' },
        { channel: 'Map', user: 'OldTimer', msg: 'Back in my day we had to walk uphill both ways to the dungeon. In the snow.' },
        { channel: 'Map', user: 'OldTimer', msg: 'And the dungeon was uphill too.' },
        { channel: 'Say', user: 'BardLife', msg: '♪ Ninety nine mobs of wurm on the wall, ninety nine mobs of wurm ♪' },
        { channel: 'Map', user: 'ErrorReport', msg: 'Bug report: the game is too fun and it\'s affecting my real life' },
        { channel: 'Map', user: 'ShowerThought', msg: 'If auto-battle does all the fighting, are WE the idle ones?' },
        { channel: 'Map', user: 'Realist', msg: 'yes' },
    ],

    // Colors matching the reference image (zone 1 defaults)
    COLORS: {
        fogColor: 0x1a2e1a,
        ambientLight: 0x2a4a2a,
        directionalLight: 0xffeedd,
        godRayColor: 0xffffcc,
        groundTint: 0x3a5a2a,
        leafGreen: 0x2d5a1e,
        darkLeaf: 0x1a3a0e,
        mossGreen: 0x4a7a3a,
        barkBrown: 0x3a2a1a,
        skyGlow: 0xccddaa,
    },

    // Helper methods
    getZone(zoneId) {
        return this.ZONES.find(z => z.id === zoneId) || this.ZONES[0];
    },

    getZoneForLevel(level) {
        // Find the highest zone the player qualifies for
        let best = this.ZONES[0];
        for (const z of this.ZONES) {
            if (level >= z.levelRange[0]) best = z;
        }
        return best;
    },

    getZoneByIndex(idx) {
        return this.ZONES[idx] || this.ZONES[0];
    },

    /** Get mob types for current zone */
    getMobTypesForZone(zoneId) {
        const zone = this.getZone(zoneId);
        return zone ? zone.mobTypes : this.ZONES[0].mobTypes;
    },

    /** Get event types for current zone */
    getEventTypesForZone(zoneId) {
        const zone = this.getZone(zoneId);
        return zone ? zone.eventTypes : this.ZONES[0].eventTypes;
    },

    /** Get chat messages for current zone */
    getChatMessagesForZone(zoneId) {
        const zone = this.getZone(zoneId);
        return zone ? zone.chatMessages : this.ZONES[0].chatMessages;
    },

    /** Get boss config for a zone (or null) */
    getBossForZone(zoneId) {
        return this.ZONE_BOSSES[zoneId] || null;
    },

    /** Get the index of a zone within ZONES array */
    getZoneIndex(zoneId) {
        return this.ZONES.findIndex(z => z.id === zoneId);
    },

    /** Get the next zone after the given one (or null) */
    getNextZone(zoneId) {
        const idx = this.getZoneIndex(zoneId);
        return idx >= 0 && idx < this.ZONES.length - 1 ? this.ZONES[idx + 1] : null;
    },
};
