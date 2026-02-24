// ══════════════════════════════════════════════════════════════════════
// SOUL FORGE — Class Specialization System
// Unlocked when Autumn zone becomes accessible.
// Each class has 3 specializations with unique passive upgrade trees.
// Currency: Soul Essence — earned from combat, quests, and boss kills.
// ══════════════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { gameState, AETHERBIT_NAME } from './GameState.js';

// ── SPECIALIZATION DEFINITIONS ──────────────────────────────────────
// Each spec has: id, name, icon, description, color, passive tree (5 tiers × 3 nodes each)
// Tier costs escalate. Only 1 node per tier can be chosen (branching path).
// Each node can be upgraded up to Level 10 for increasing costs.

export const SPEC_DEFS = {
    warrior: [
        {
            id: 'berserker',
            name: 'Berserker',
            icon: '🔥',
            color: '#ff4422',
            tagline: 'Unbridled Fury',
            description: 'Sacrifice defense for devastating offense. Your rage fuels ever-increasing damage the longer you fight.',
            specPower: { name: 'Blood Frenzy', icon: '🩸', description: 'Enter a blood frenzy for 15s: +80% DPS, +25% attack speed, but take 20% more damage.', cooldown: 45 },
            tiers: [
                { name: 'Tier I — Initiate', nodes: [
                    { id: 'b_t1a', name: 'Bloodthirst', desc: '+1% DPS per level', stat: 'dps', value: 0.01, icon: '⚔️' },
                    { id: 'b_t1b', name: 'Reckless Swing', desc: '+1.5% Crit Chance per level', stat: 'crit', value: 0.015, icon: '💥' },
                    { id: 'b_t1c', name: 'Thick Skin', desc: '+2% Max HP per level', stat: 'hp', value: 0.02, icon: '🛡️' },
                ]},
                { name: 'Tier II — Adept', nodes: [
                    { id: 'b_t2a', name: 'Rampage', desc: '+2.5% DPS in combat per level', stat: 'combatDps', value: 0.025, icon: '🗡️' },
                    { id: 'b_t2b', name: 'Savage Blows', desc: '+4% Crit Damage per level', stat: 'critDmg', value: 0.04, icon: '💀' },
                    { id: 'b_t2c', name: 'Life Leech', desc: 'Heal 0.5% damage per level', stat: 'lifesteal', value: 0.005, icon: '❤️‍🩹' },
                ]},
                { name: 'Tier III — Expert', nodes: [
                    { id: 'b_t3a', name: 'Fury Cascade', desc: '+2% DPS stack per kill (per level)', stat: 'killStack', value: 0.02, icon: '🔥' },
                    { id: 'b_t3b', name: 'Tendon Rip', desc: 'Attacks slow mob DPS by 3% per level', stat: 'mobSlow', value: 0.03, icon: '🩸' },
                    { id: 'b_t3c', name: 'Adrenaline Surge', desc: '-3% Skill Cooldowns per level', stat: 'cdr', value: 0.03, icon: '⚡' },
                ]},
                { name: 'Tier IV — Master', nodes: [
                    { id: 'b_t4a', name: 'Death Wish', desc: '+5% DPS <50% HP per level', stat: 'lowHpDps', value: 0.05, icon: '☠️' },
                    { id: 'b_t4b', name: 'Bloodbath', desc: '+4% overkill AoE per level', stat: 'overkill', value: 0.04, icon: '💣' },
                    { id: 'b_t4c', name: 'Iron Will', desc: '+4% HP Regen per level', stat: 'combatRegen', value: 0.04, icon: '💪' },
                ]},
                { name: 'Tier V — Grandmaster', nodes: [
                    { id: 'b_t5a', name: 'Eternal Rage', desc: '+7% DPS per level', stat: 'flatDps', value: 0.07, icon: '🌋' },
                    { id: 'b_t5b', name: 'Massacre', desc: '+15% Crit Dmg, +1.5% Crit per level', stat: 'megaCrit', value: 0.15, icon: '⭐' },
                    { id: 'b_t5c', name: 'Unkillable', desc: 'Lethal hit survival chance +10%/lvl', stat: 'cheatDeath', value: 0.1, icon: '🔱' },
                ]},
            ],
        },
        {
            id: 'vanguard',
            name: 'Vanguard',
            icon: '🛡️',
            color: '#4488ff',
            tagline: 'Immovable Fortress',
            description: 'An indomitable wall of steel and determination. Your presence alone inspires allies and crushes enemy morale.',
            specPower: { name: 'Last Stand', icon: '🏰', description: 'Become invulnerable for 8s and taunt all enemies. +50% party DPS during duration.', cooldown: 60 },
            tiers: [
                { name: 'Tier I — Initiate', nodes: [
                    { id: 'v_t1a', name: 'Stalwart Defense', desc: '+2.5% Max HP per level', stat: 'hp', value: 0.025, icon: '🛡️' },
                    { id: 'v_t1b', name: 'Retribution', desc: 'Reflect 1.5% damage per level', stat: 'reflect', value: 0.015, icon: '🪞' },
                    { id: 'v_t1c', name: 'Steadfast', desc: '+1.5% DPS/HP per level', stat: 'balanced', value: 0.015, icon: '⚖️' },
                ]},
                { name: 'Tier II — Adept', nodes: [
                    { id: 'v_t2a', name: 'Fortress Aura', desc: '+2% party HP per level', stat: 'partyHp', value: 0.02, icon: '🏛️' },
                    { id: 'v_t2b', name: 'Shield Bash', desc: '+3% DPS after defense per level', stat: 'postDefDps', value: 0.03, icon: '🔨' },
                    { id: 'v_t2c', name: 'Regeneration', desc: '+5% HP Regen per level', stat: 'regen', value: 0.05, icon: '💚' },
                ]},
                { name: 'Tier III — Expert', nodes: [
                    { id: 'v_t3a', name: 'Bulwark', desc: '-3% damage taken per level', stat: 'dmgReduction', value: 0.03, icon: '🛡️' },
                    { id: 'v_t3b', name: 'Rallying Cry', desc: '+2% party DPS per level', stat: 'partyDps', value: 0.02, icon: '📯' },
                    { id: 'v_t3c', name: 'Enduring Strikes', desc: '+3% DPS, +2% HP per level', stat: 'dpsAndHp', value: 0.03, icon: '🗡️' },
                ]},
                { name: 'Tier IV — Master', nodes: [
                    { id: 'v_t4a', name: 'Impenetrable', desc: '-5% damage taken >80% HP per lvl', stat: 'highHpDef', value: 0.05, icon: '🏔️' },
                    { id: 'v_t4b', name: 'Inspiring Presence', desc: '+3% party DPS/HP per level', stat: 'partyBoth', value: 0.03, icon: '👑' },
                    { id: 'v_t4c', name: 'Counterattack', desc: 'Bonus attack chance +4% per level', stat: 'counter', value: 0.04, icon: '⚡' },
                ]},
                { name: 'Tier V — Grandmaster', nodes: [
                    { id: 'v_t5a', name: 'Immortal Bastion', desc: '+8% HP, -4% damage per level', stat: 'megaTank', value: 0.08, icon: '🏰' },
                    { id: 'v_t5b', name: 'Warlord', desc: '+5% DPS/party DPS per level', stat: 'warlord', value: 0.05, icon: '⚔️' },
                    { id: 'v_t5c', name: 'Aegis of Light', desc: 'Auto-heal 0.7% max HP/s per level', stat: 'autoHeal', value: 0.007, icon: '✨' },
                ]},
            ],
        },
        {
            id: 'weaponmaster',
            name: 'Weaponmaster',
            icon: '⚔️',
            color: '#ffaa22',
            tagline: 'Blade Virtuoso',
            description: 'A peerless swordsman who has mastered every fighting style. Consistent, reliable damage with burst windows.',
            specPower: { name: 'Perfect Strike', icon: '🎯', description: 'Your next 5 attacks within 10s are guaranteed crits dealing 3x damage.', cooldown: 40 },
            tiers: [
                { name: 'Tier I — Initiate', nodes: [
                    { id: 'w_t1a', name: 'Precision', desc: '+1.5% DPS, +1% Crit per level', stat: 'dpsAndCrit', value: 0.015, icon: '🎯' },
                    { id: 'w_t1b', name: 'Swift Blade', desc: '+2% Attack Speed per level', stat: 'atkSpd', value: 0.02, icon: '💨' },
                    { id: 'w_t1c', name: 'Combat Focus', desc: '+3% Mana Regen per level', stat: 'manaRegen', value: 0.03, icon: '🧠' },
                ]},
                { name: 'Tier II — Adept', nodes: [
                    { id: 'w_t2a', name: 'Combo Master', desc: '+3% max combo DPS per level', stat: 'comboStack', value: 0.03, icon: '🔗' },
                    { id: 'w_t2b', name: 'Exploit Weakness', desc: '+4% Crit Damage per level', stat: 'critDmg', value: 0.04, icon: '🗡️' },
                    { id: 'w_t2c', name: 'Evasion', desc: '2% dodge chance per level', stat: 'dodge', value: 0.02, icon: '💫' },
                ]},
                { name: 'Tier III — Expert', nodes: [
                    { id: 'w_t3a', name: 'Dual Wield', desc: '+4% DPS per level', stat: 'dps', value: 0.04, icon: '⚔️' },
                    { id: 'w_t3b', name: 'Blade Storm', desc: '-3.5% Skill Cooldowns per level', stat: 'cdr', value: 0.035, icon: '🌪️' },
                    { id: 'w_t3c', name: 'Riposte', desc: '+3% DPS, +1.5% dodge per level', stat: 'dpsAndDodge', value: 0.03, icon: '🤺' },
                ]},
                { name: 'Tier IV — Master', nodes: [
                    { id: 'w_t4a', name: 'Killing Spree', desc: '+3% DPS per kill stack per level', stat: 'killSpree', value: 0.03, icon: '💀' },
                    { id: 'w_t4b', name: 'Perfect Timing', desc: 'Skill damage +7% per level', stat: 'skillDmg', value: 0.07, icon: '⏱️' },
                    { id: 'w_t4c', name: 'Unbreakable Focus', desc: '+5% DPS full HP per level', stat: 'fullHpDps', value: 0.05, icon: '💎' },
                ]},
                { name: 'Tier V — Grandmaster', nodes: [
                    { id: 'w_t5a', name: 'Grand Master at Arms', desc: '+8% DPS, +2% Crit per level', stat: 'grandDps', value: 0.08, icon: '👑' },
                    { id: 'w_t5b', name: 'Dance of Death', desc: '+7% Crit Dmg, +3% Atk Spd/lvl', stat: 'critSpeed', value: 0.07, icon: '💃' },
                    { id: 'w_t5c', name: 'One with the Blade', desc: 'All stats +4% per level', stat: 'allStats', value: 0.04, icon: '🌟' },
                ]},
            ],
        },
    ],
    mage: [
        {
            id: 'arcanist',
            name: 'Arcanist',
            icon: '🔮',
            color: '#cc44ff',
            tagline: 'Master of the Arcane',
            description: 'Pure arcane mastery — your spells hit harder, chain further, and your mana pool is bottomless.',
            specPower: { name: 'Arcane Overload', icon: '💜', description: 'Double all spell damage for 12s and reduce all cooldowns by 50%.', cooldown: 50 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'arc_t1a', name: 'Spell Amplification', desc: '+2% DPS per level', stat: 'dps', value: 0.02, icon: '🔮' },
                    { id: 'arc_t1b', name: 'Mana Well', desc: '+4% Max Mana per level', stat: 'mana', value: 0.04, icon: '💧' },
                    { id: 'arc_t1c', name: 'Arcane Shield', desc: '+2% Max HP per level', stat: 'hp', value: 0.02, icon: '🛡️' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'arc_t2a', name: 'Spell Echo', desc: '3% cast twice chance per level', stat: 'spellEcho', value: 0.03, icon: '🔁' },
                    { id: 'arc_t2b', name: 'Mana Surge', desc: '+5% Mana Regen per level', stat: 'manaRegen', value: 0.05, icon: '⚡' },
                    { id: 'arc_t2c', name: 'Crit Mastery', desc: '+2% Crit, +3% Crit Dmg per level', stat: 'critAll', value: 0.02, icon: '💥' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'arc_t3a', name: 'Arcane Barrage', desc: '+5% DPS per level', stat: 'dps', value: 0.05, icon: '✨' },
                    { id: 'arc_t3b', name: 'Spell Penetration', desc: 'Ignore 4% mob defense per level', stat: 'armorPen', value: 0.04, icon: '🗡️' },
                    { id: 'arc_t3c', name: 'Temporal Shift', desc: '-3.5% Skill Cooldowns per level', stat: 'cdr', value: 0.035, icon: '⏳' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'arc_t4a', name: 'Arcane Brilliance', desc: '+3% party DPS per level', stat: 'partyDps', value: 0.03, icon: '👑' },
                    { id: 'arc_t4b', name: 'Mana to Power', desc: '+0.1% DPS per mana % per level', stat: 'manaDps', value: 0.001, icon: '💪' },
                    { id: 'arc_t4c', name: 'Spell Shield', desc: 'Absorb 3% max mana per level', stat: 'manaShield', value: 0.03, icon: '🔰' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'arc_t5a', name: 'Archmage Ascension', desc: '+9% DPS, +7% Mana per level', stat: 'archDps', value: 0.09, icon: '🌟' },
                    { id: 'arc_t5b', name: 'Infinite Arcana', desc: '-7% mana cost, +4% CDR per level', stat: 'efficiency', value: 0.07, icon: '♾️' },
                    { id: 'arc_t5c', name: 'Reality Warp', desc: 'All stats +4%, +3% party DPS per lvl', stat: 'warp', value: 0.04, icon: '🌀' },
                ]},
            ],
        },
        {
            id: 'shadowcaller',
            name: 'Shadowcaller',
            icon: '🌑',
            color: '#8833aa',
            tagline: 'Void\'s Embrace',
            description: 'Embrace the darkness. Drain life from your enemies and wield shadow magic that grows stronger over time.',
            specPower: { name: 'Void Eruption', icon: '🕳️', description: 'Unleash a void explosion dealing 500% DPS to all enemies. Heals 30% max HP.', cooldown: 45 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'sh_t1a', name: 'Shadow Bolt', desc: '+2% DPS per level', stat: 'dps', value: 0.02, icon: '🌑' },
                    { id: 'sh_t1b', name: 'Soul Drain', desc: 'Heal 0.6% damage per level', stat: 'lifesteal', value: 0.006, icon: '❤️‍🩹' },
                    { id: 'sh_t1c', name: 'Dark Pact', desc: '+3% DPS, -1.5% HP per level', stat: 'glassCannon', value: 0.03, icon: '💀' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'sh_t2a', name: 'Corruption', desc: '+3.5% DoT DPS per level', stat: 'dot', value: 0.035, icon: '☠️' },
                    { id: 'sh_t2b', name: 'Shadow Cloak', desc: '2% avoid chance per level', stat: 'dodge', value: 0.02, icon: '🖤' },
                    { id: 'sh_t2c', name: 'Void Touch', desc: '+2.5% Crit/Crit Dmg per level', stat: 'critAll', value: 0.025, icon: '👁️' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'sh_t3a', name: 'Drain Life', desc: 'Heal 0.8% damage per level', stat: 'lifesteal', value: 0.008, icon: '🩸' },
                    { id: 'sh_t3b', name: 'Shadow Mastery', desc: '+5% DPS per level', stat: 'dps', value: 0.05, icon: '🌑' },
                    { id: 'sh_t3c', name: 'Unstable Void', desc: '+7% DPS, +2% dmg taken per level', stat: 'riskyDps', value: 0.07, icon: '💣' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'sh_t4a', name: 'Siphon Soul', desc: 'Kills heal 1.5% max HP per level', stat: 'killHeal', value: 0.015, icon: '💜' },
                    { id: 'sh_t4b', name: 'Void Corruption', desc: 'Reduce mob DPS by 3.5% per level', stat: 'mobSlow', value: 0.035, icon: '😈' },
                    { id: 'sh_t4c', name: 'Dark Empowerment', desc: '+7% DPS above 80% HP per level', stat: 'highHpDps', value: 0.07, icon: '🔮' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'sh_t5a', name: 'Lord of Shadow', desc: '+9% DPS, heal 1.2% damage per level', stat: 'shadowLord', value: 0.09, icon: '👑' },
                    { id: 'sh_t5b', name: 'Void Avatar', desc: '+11% Damage, lethal survival chance +10%/lvl', stat: 'voidAvatar', value: 0.11, icon: '🕳️' },
                    { id: 'sh_t5c', name: 'Eternal Darkness', desc: 'All stats +4% per level', stat: 'allStats', value: 0.04, icon: '🌟' },
                ]},
            ],
        },
        {
            id: 'chronomancer',
            name: 'Chronomancer',
            icon: '⏳',
            color: '#44ddff',
            tagline: 'Lord of Time',
            description: 'Bend time to your will. Cooldowns mean nothing, your spells cascade endlessly, and reality bows before you.',
            specPower: { name: 'Time Warp', icon: '⌛', description: 'Freeze time for 10s: +100% attack speed, all cooldowns reduced by 80%.', cooldown: 55 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'ch_t1a', name: 'Haste', desc: '+2% Attack Speed per level', stat: 'atkSpd', value: 0.02, icon: '⏩' },
                    { id: 'ch_t1b', name: 'Temporal Shield', desc: '+2.5% HP, +1.5% Regen per level', stat: 'hpRegen', value: 0.025, icon: '🛡️' },
                    { id: 'ch_t1c', name: 'Accelerate', desc: '-2% Skill Cooldowns per level', stat: 'cdr', value: 0.02, icon: '⏳' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'ch_t2a', name: 'Time Slip', desc: '-3.5% Skill Cooldowns per level', stat: 'cdr', value: 0.035, icon: '⏰' },
                    { id: 'ch_t2b', name: 'Echo Strike', desc: '3% repeat attack chance per level', stat: 'echo', value: 0.03, icon: '🔁' },
                    { id: 'ch_t2c', name: 'Foresight', desc: '+2% Crit, +2% Dodge per level', stat: 'critDodge', value: 0.02, icon: '👁️' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'ch_t3a', name: 'Time Dilation', desc: '+4% DPS, +3% Atk Speed per level', stat: 'dpsSpeed', value: 0.04, icon: '🌀' },
                    { id: 'ch_t3b', name: 'Rewind', desc: 'Auto-heal threshold +7% per level', stat: 'rewind', value: 0.07, icon: '⏪' },
                    { id: 'ch_t3c', name: 'Temporal Cascade', desc: 'Skills +4.5% DPS bonus per level', stat: 'skillBonus', value: 0.045, icon: '✨' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'ch_t4a', name: 'Infinite Loop', desc: '-6% Skill Cooldowns per level', stat: 'megaCdr', value: 0.06, icon: '♾️' },
                    { id: 'ch_t4b', name: 'Chronostasis', desc: '+5% DPS, +4% party DPS per level', stat: 'dpsParty', value: 0.05, icon: '👑' },
                    { id: 'ch_t4c', name: 'Temporal Armor', desc: '+6% HP, -3% damage per level', stat: 'tempArmor', value: 0.06, icon: '🔰' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'ch_t5a', name: 'Time Lord', desc: '-7% CDR, +7% DPS, +4% party DPS per lvl', stat: 'timeLord', value: 0.07, icon: '🌟' },
                    { id: 'ch_t5b', name: 'Paradox Engine', desc: 'Damage multiplier +14% per level', stat: 'doubleDmg', value: 0.14, icon: '⚡' },
                    { id: 'ch_t5c', name: 'Eternity', desc: 'All stats +4%, auto-revive +10% chance/lvl', stat: 'eternity', value: 0.04, icon: '💫' },
                ]},
            ],
        },
    ],
    ranger: [
        {
            id: 'beastlord',
            name: 'Beastlord',
            icon: '🐾',
            color: '#44cc44',
            tagline: 'Pack Alpha',
            description: 'Command the wild itself. Your summoned beasts fight alongside you, and nature bends to your call.',
            specPower: { name: 'Unleash the Pack', icon: '🐺', description: 'Summon 3 spectral wolves for 15s that each deal 30% of your DPS.', cooldown: 45 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'bl_t1a', name: 'Pack Tactics', desc: '+2% DPS per level', stat: 'dps', value: 0.02, icon: '🐾' },
                    { id: 'bl_t1b', name: 'Thick Hide', desc: '+3% Max HP per level', stat: 'hp', value: 0.03, icon: '🛡️' },
                    { id: 'bl_t1c', name: 'Predator Instinct', desc: '+1.5% Crit per level', stat: 'crit', value: 0.015, icon: '👁️' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'bl_t2a', name: 'Alpha Howl', desc: '+2% party DPS per level', stat: 'partyDps', value: 0.02, icon: '🐺' },
                    { id: 'bl_t2b', name: 'Feral Strikes', desc: '+3.5% Crit Damage per level', stat: 'critDmg', value: 0.035, icon: '🗡️' },
                    { id: 'bl_t2c', name: 'Regenerative Bond', desc: '+5% HP Regen per level', stat: 'regen', value: 0.05, icon: '💚' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'bl_t3a', name: 'Stampede', desc: '+5% DPS per level', stat: 'dps', value: 0.05, icon: '🐗' },
                    { id: 'bl_t3b', name: 'Nature\'s Armor', desc: '-3.5% damage taken per level', stat: 'dmgReduction', value: 0.035, icon: '🌿' },
                    { id: 'bl_t3c', name: 'Swift Paws', desc: '+3% Atk Speed, -2% CDR per level', stat: 'spdCdr', value: 0.03, icon: '💨' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'bl_t4a', name: 'Apex Predator', desc: '+3.5% party-scale DPS per level', stat: 'partyScaleDps', value: 0.035, icon: '👑' },
                    { id: 'bl_t4b', name: 'Primal Fury', desc: '+7% combat DPS per level', stat: 'longCombatDps', value: 0.07, icon: '🔥' },
                    { id: 'bl_t4c', name: 'Pack Heal', desc: 'Kills heal 1.2% max HP per level', stat: 'killHeal', value: 0.012, icon: '❤️‍🩹' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'bl_t5a', name: 'Lord of Beasts', desc: '+8% DPS, +3% party DPS per level', stat: 'beastLord', value: 0.08, icon: '🌟' },
                    { id: 'bl_t5b', name: 'Primal Avatar', desc: 'All stats +4% per level', stat: 'allStats', value: 0.04, icon: '🐉' },
                    { id: 'bl_t5c', name: 'Nature\'s Wrath', desc: '+11% Crit Dmg, +3% Crit per level', stat: 'megaCrit', value: 0.11, icon: '⚡' },
                ]},
            ],
        },
        {
            id: 'sharpshooter',
            name: 'Sharpshooter',
            icon: '🎯',
            color: '#ffcc22',
            tagline: 'One Shot, One Kill',
            description: 'Every arrow finds its mark. Massive single-target damage and devastating precision make you the ultimate boss killer.',
            specPower: { name: 'Kill Shot', icon: '💀', description: 'Fire a devastating shot dealing 800% DPS to a single target. Guaranteed crit.', cooldown: 40 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'ss_t1a', name: 'Precision Aim', desc: '+1.5% DPS/Crit per level', stat: 'dpsAndCrit', value: 0.015, icon: '🎯' },
                    { id: 'ss_t1b', name: 'Steady Hand', desc: '+3% Crit Damage per level', stat: 'critDmg', value: 0.03, icon: '🤚' },
                    { id: 'ss_t1c', name: 'Quick Draw', desc: '+2% Attack Speed per level', stat: 'atkSpd', value: 0.02, icon: '💨' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'ss_t2a', name: 'Headshot', desc: '+4.5% Crit Damage per level', stat: 'critDmg', value: 0.045, icon: '💀' },
                    { id: 'ss_t2b', name: 'Marked for Death', desc: '+3.5% DPS to target per level', stat: 'focusDps', value: 0.035, icon: '🔴' },
                    { id: 'ss_t2c', name: 'Evasion', desc: '2% dodge, +1.5% Crit per level', stat: 'critDodge', value: 0.02, icon: '💫' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'ss_t3a', name: 'Sniper', desc: '+6% DPS per level', stat: 'dps', value: 0.06, icon: '🔭' },
                    { id: 'ss_t3b', name: 'Armor Piercing', desc: 'Ignore 4.5% defense per level', stat: 'armorPen', value: 0.045, icon: '🗡️' },
                    { id: 'ss_t3c', name: 'Rapid Fire', desc: '+4% Attack Speed per level', stat: 'atkSpd', value: 0.04, icon: '⚡' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'ss_t4a', name: 'Execute', desc: '+9% execute DPS per level', stat: 'executeDps', value: 0.09, icon: '☠️' },
                    { id: 'ss_t4b', name: 'Trick Shot', desc: '+7.5% Crit Damage per level', stat: 'critDmg', value: 0.075, icon: '🏹' },
                    { id: 'ss_t4c', name: 'Windwalk', desc: '3.5% dodge, +3% DPS per level', stat: 'dodgeDps', value: 0.035, icon: '🌪️' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'ss_t5a', name: 'Deadeye', desc: '+10% DPS, +3.5% Crit per level', stat: 'deadeye', value: 0.1, icon: '🌟' },
                    { id: 'ss_t5b', name: 'One in a Million', desc: '+17% Crit Damage per level', stat: 'megaCritDmg', value: 0.17, icon: '⭐' },
                    { id: 'ss_t5c', name: 'Phantom Arrow', desc: 'All stats +4%, -7% cost per level', stat: 'phantom', value: 0.04, icon: '👻' },
                ]},
            ],
        },
        {
            id: 'warden',
            name: 'Warden',
            icon: '🌳',
            color: '#22aa66',
            tagline: 'Nature\'s Guardian',
            description: 'The forest itself fights for you. Incredible survivability, constant regeneration, and nature-amplified damage.',
            specPower: { name: 'Nature\'s Embrace', icon: '🌿', description: 'Heal 60% max HP over 10s and gain +40% DPS. All party members heal 30%.', cooldown: 50 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'wd_t1a', name: 'Living Wood', desc: '+3% Max HP per level', stat: 'hp', value: 0.03, icon: '🌳' },
                    { id: 'wd_t1b', name: 'Thorns', desc: 'Reflect 2.5% damage per level', stat: 'reflect', value: 0.025, icon: '🌵' },
                    { id: 'wd_t1c', name: 'Growth', desc: '+1.8% DPS/HP per level', stat: 'balanced', value: 0.018, icon: '🌱' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'wd_t2a', name: 'Regrowth', desc: '+6% HP Regen per level', stat: 'regen', value: 0.06, icon: '💚' },
                    { id: 'wd_t2b', name: 'Bark Armor', desc: '-3% damage taken per level', stat: 'dmgReduction', value: 0.03, icon: '🪵' },
                    { id: 'wd_t2c', name: 'Entangle', desc: 'Reduce mob DPS by 3% per level', stat: 'mobSlow', value: 0.03, icon: '🌿' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'wd_t3a', name: 'Nature\'s Fury', desc: '+4.5% DPS per level', stat: 'dps', value: 0.045, icon: '🍃' },
                    { id: 'wd_t3b', name: 'Deep Roots', desc: '+4.5% HP, +4% Regen per level', stat: 'hpRegen', value: 0.045, icon: '🌲' },
                    { id: 'wd_t3c', name: 'Sylvan Blessing', desc: '+2% party HP/Regen per level', stat: 'partyHp', value: 0.02, icon: '✨' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'wd_t4a', name: 'Ancient Guardian', desc: '+6% HP, -4% damage per level', stat: 'megaTank', value: 0.06, icon: '🏔️' },
                    { id: 'wd_t4b', name: 'Verdant Rage', desc: '+6.5% DPS, +3% HP per level', stat: 'dpsHp', value: 0.065, icon: '🔥' },
                    { id: 'wd_t4c', name: 'Life Bloom', desc: 'Auto-heal 0.5% max HP/s per level', stat: 'autoHeal', value: 0.005, icon: '🌸' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'wd_t5a', name: 'Avatar of Nature', desc: '+7.5% DPS/HP/Regen per level', stat: 'avatar', value: 0.075, icon: '🌟' },
                    { id: 'wd_t5b', name: 'World Tree', desc: '+4% party stats per level', stat: 'partyAll', value: 0.04, icon: '🌳' },
                    { id: 'wd_t5c', name: 'Eternal Spring', desc: 'Mana guard survival chance +15%/lvl', stat: 'manaGuard', value: 0.15, icon: '♾️' },
                ]},
            ],
        },
    ],
    cleric: [
        {
            id: 'zealot',
            name: 'Zealot',
            icon: '☀️',
            color: '#ffcc00',
            tagline: 'Wrath of the Dawn',
            description: 'Channel divine fury into devastating holy attacks. A battle cleric who smites first and heals... eventually.',
            specPower: { name: 'Divine Judgment', icon: '⚡', description: 'Call down holy fire dealing 600% DPS to all enemies and healing party for 40% max HP.', cooldown: 50 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'zl_t1a', name: 'Holy Fire', desc: '+2% DPS per level', stat: 'dps', value: 0.02, icon: '🔥' },
                    { id: 'zl_t1b', name: 'Radiant Aura', desc: '+1.5% party DPS per level', stat: 'partyDps', value: 0.015, icon: '☀️' },
                    { id: 'zl_t1c', name: 'Faith Shield', desc: '+2% HP/Regen per level', stat: 'hpRegen', value: 0.02, icon: '🛡️' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'zl_t2a', name: 'Smite', desc: '+3.5% DPS, +2% Crit per level', stat: 'dpsCrit', value: 0.035, icon: '⚡' },
                    { id: 'zl_t2b', name: 'Consecration', desc: '+3% DPS, heal 0.3% hit per level', stat: 'dpsHeal', value: 0.03, icon: '✨' },
                    { id: 'zl_t2c', name: 'Divine Protection', desc: '-3% damage taken per level', stat: 'dmgReduction', value: 0.03, icon: '🛡️' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'zl_t3a', name: 'Holy Wrath', desc: '+6% DPS per level', stat: 'dps', value: 0.06, icon: '💥' },
                    { id: 'zl_t3b', name: 'Exorcism', desc: '+7.5% Crit Damage per level', stat: 'critDmg', value: 0.075, icon: '☠️' },
                    { id: 'zl_t3c', name: 'Martyrdom', desc: '+4.5% DPS, +1% ally heal per lvl', stat: 'martyr', value: 0.045, icon: '❤️‍🔥' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'zl_t4a', name: 'Inquisition', desc: '+8% type-specific DPS per level', stat: 'typeDps', value: 0.08, icon: '🔱' },
                    { id: 'zl_t4b', name: 'Divine Storm', desc: '+6.5% DPS, -3% CDR per level', stat: 'dpsCdr', value: 0.065, icon: '🌪️' },
                    { id: 'zl_t4c', name: 'Beacon of Light', desc: '+3.5% party DPS/HP per level', stat: 'partyBoth', value: 0.035, icon: '💡' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'zl_t5a', name: 'Hand of God', desc: '+11% DPS, +4.5% Crit per level', stat: 'godHand', value: 0.11, icon: '🌟' },
                    { id: 'zl_t5b', name: 'Archangel Form', desc: 'All stats +5.5% per level', stat: 'allStats', value: 0.055, icon: '😇' },
                    { id: 'zl_t5c', name: 'Rapture', desc: 'Party immortal chance +10% per level', stat: 'rapture', value: 0.1, icon: '✝️' },
                ]},
            ],
        },
        {
            id: 'oracle',
            name: 'Oracle',
            icon: '🔮',
            color: '#88ddff',
            tagline: 'Seer of Fates',
            description: 'See the threads of destiny. Enhance party effectiveness, predict enemy weaknesses, and manipulate probability.',
            specPower: { name: 'Fated Strike', icon: '🌠', description: 'Next 10s: all attacks auto-crit, +50% party DPS, heal 3% max HP per hit.', cooldown: 55 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'or_t1a', name: 'Foresight', desc: '+1.5% Crit/DPS per level', stat: 'dpsAndCrit', value: 0.015, icon: '👁️' },
                    { id: 'or_t1b', name: 'Prophecy', desc: '+2% party DPS per level', stat: 'partyDps', value: 0.02, icon: '📖' },
                    { id: 'or_t1c', name: 'Fortune', desc: '+3% Gold/XP per level', stat: 'fortune', value: 0.03, icon: '🍀' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'or_t2a', name: 'Prescience', desc: '3% dodge, +1.5% Crit per level', stat: 'dodgeCrit', value: 0.03, icon: '💫' },
                    { id: 'or_t2b', name: 'Guided Hand', desc: '+4.5% Crit Damage per level', stat: 'critDmg', value: 0.045, icon: '🤚' },
                    { id: 'or_t2c', name: 'Fate Weaving', desc: '+3% party HP/Regen per level', stat: 'partyHpRegen', value: 0.03, icon: '🕸️' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'or_t3a', name: 'Destiny Bond', desc: '+4% DPS, +3% party DPS per level', stat: 'dpsParty', value: 0.04, icon: '🔗' },
                    { id: 'or_t3b', name: 'All-Seeing Eye', desc: '+3.5% Crit/Crit Dmg per level', stat: 'megaCrit', value: 0.035, icon: '👁️‍🗨️' },
                    { id: 'or_t3c', name: 'Serenity', desc: '-3.5% CDR, +4.5% Mana per level', stat: 'cdrMana', value: 0.035, icon: '🧘' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'or_t4a', name: 'Omniscience', desc: '+4.5% party stats per level', stat: 'partyAll', value: 0.045, icon: '🌐' },
                    { id: 'or_t4b', name: 'Twist Fate', desc: '+7.5% DPS, crits heal 0.5%/lvl', stat: 'dpsCritHeal', value: 0.075, icon: '🎲' },
                    { id: 'or_t4c', name: 'Temporal Insight', desc: '-5.5% CDR, +3% DPS per level', stat: 'cdrDps', value: 0.055, icon: '⏳' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'or_t5a', name: 'Fate\'s Champion', desc: '+9% DPS, +4.5% party DPS per level', stat: 'fateChamp', value: 0.09, icon: '🌟' },
                    { id: 'or_t5b', name: 'Thread of Destiny', desc: 'All stats +4.5%, +4.5% Fortune/lvl', stat: 'destinyThread', value: 0.045, icon: '🧵' },
                    { id: 'or_t5c', name: 'Ascendant Vision', desc: 'Auto-revive +15% chance/lvl', stat: 'ascendant', value: 0.15, icon: '⭐' },
                ]},
            ],
        },
        {
            id: 'templar',
            name: 'Templar',
            icon: '⚔️',
            color: '#ff8844',
            tagline: 'Holy Warrior',
            description: 'A perfect hybrid of healer and fighter. Unmatched survivability with respectable damage output.',
            specPower: { name: 'Divine Crusade', icon: '🗡️', description: 'For 12s: +60% DPS, heal 5% max HP per attack, -30% damage taken.', cooldown: 50 },
            tiers: [
                { name: 'Tier I', nodes: [
                    { id: 'tp_t1a', name: 'Righteous Strike', desc: '+1.8% DPS, heal 0.3% damage/lvl', stat: 'dpsHeal', value: 0.018, icon: '⚔️' },
                    { id: 'tp_t1b', name: 'Holy Shield', desc: '+3% Max HP per level', stat: 'hp', value: 0.03, icon: '🛡️' },
                    { id: 'tp_t1c', name: 'Blessed Weapon', desc: '+2.2% DPS per level', stat: 'dps', value: 0.022, icon: '✨' },
                ]},
                { name: 'Tier II', nodes: [
                    { id: 'tp_t2a', name: 'Lay on Hands', desc: '+6% HP Regen per level', stat: 'regen', value: 0.06, icon: '🤲' },
                    { id: 'tp_t2b', name: 'Judgment', desc: '+3.5% DPS, +2% Crit per level', stat: 'dpsCrit', value: 0.035, icon: '⚖️' },
                    { id: 'tp_t2c', name: 'Devotion Aura', desc: '-3% party damage taken per level', stat: 'partyDef', value: 0.03, icon: '💛' },
                ]},
                { name: 'Tier III', nodes: [
                    { id: 'tp_t3a', name: 'Crusader\'s Might', desc: '+5% DPS, +3% HP per level', stat: 'dpsHp', value: 0.05, icon: '💪' },
                    { id: 'tp_t3b', name: 'Sacred Shield', desc: '-4.5% damage, +3% Regen per level', stat: 'defRegen', value: 0.045, icon: '🔰' },
                    { id: 'tp_t3c', name: 'Blessing of Kings', desc: '+2.2% all stats per level', stat: 'allStats', value: 0.022, icon: '👑' },
                ]},
                { name: 'Tier IV', nodes: [
                    { id: 'tp_t4a', name: 'Avenger\'s Shield', desc: '+6.5% DPS, reflect 2.2% per lvl', stat: 'dpsReflect', value: 0.065, icon: '🛡️' },
                    { id: 'tp_t4b', name: 'Holy Radiance', desc: 'Auto-heal 0.5% HP/s, +3% party DPS/lvl', stat: 'healParty', value: 0.005, icon: '☀️' },
                    { id: 'tp_t4c', name: 'Righteous Fury', desc: '+7.5% DPS above 60% HP per level', stat: 'highHpDps', value: 0.075, icon: '🔥' },
                ]},
                { name: 'Tier V', nodes: [
                    { id: 'tp_t5a', name: 'Paladin Ascendant', desc: '+9% DPS, +6% HP, +4.5% Regen per lvl', stat: 'paladin', value: 0.09, icon: '🌟' },
                    { id: 'tp_t5b', name: 'Divine Mandate', desc: '+3.5% party stats per level', stat: 'partyAll', value: 0.035, icon: '✝️' },
                    { id: 'tp_t5c', name: 'Eternal Crusader', desc: '+12% DPS for 10s after survival/lvl', stat: 'crusader', value: 0.12, icon: '⚡' },
                ]},
            ],
        },
    ],
};

// ── TIER COSTS ──────────────────────────────────────────────────────
// Escalating Soul Essence cost per level within a tier
// Formula: BaseTierCost * (level ^ LevelScalingFactor)
const BASE_TIER_COSTS = [50, 200, 500, 1200, 3000];
const LEVEL_SCALING_FACTOR = 1.45; 
const MAX_NODE_LEVEL = 10;
const RESPEC_COST_BASE = 500; // Doubles each respec

// ══════════════════════════════════════════════════════════════════════
// SOUL FORGE MANAGER
// ══════════════════════════════════════════════════════════════════════

// ── SPEC ABILITIES — 3 per spec, unlocked at tier 1/3/5 ──────────────
// These are auto-cast combat abilities that appear in the Soul Forge action bar.
export const SPEC_ABILITIES = {
    // Warrior
    berserker: [
        { id: 'sf_blood_frenzy', name: 'Blood Frenzy', iconKey: 'sfBloodFrenzy', description: 'Enter a blood frenzy, boosting DPS by 80% for 6s.', cooldown: 25, dpsMultiplier: 1.8, duration: 6, unlockTier: 0, nameColor: '#ff4422' },
        { id: 'sf_savage_leap', name: 'Savage Leap', iconKey: 'sfSavageLeap', description: 'Leap at the enemy for a devastating strike dealing 250% DPS.', cooldown: 18, dpsMultiplier: 2.5, duration: 3, unlockTier: 2, nameColor: '#ff6633' },
        { id: 'sf_blood_nova', name: 'Blood Nova', iconKey: 'sfBloodNova', description: 'Explode in crimson energy dealing 400% DPS to all enemies.', cooldown: 35, dpsMultiplier: 4.0, duration: 2, unlockTier: 4, nameColor: '#cc2200' },
    ],
    vanguard: [
        { id: 'sf_shield_fortress', name: 'Shield Fortress', iconKey: 'sfShieldFortress', description: 'Raise an impenetrable shield, reducing damage taken by 50% for 8s.', cooldown: 30, dpsMultiplier: 0.5, duration: 8, unlockTier: 0, nameColor: '#4488ff' },
        { id: 'sf_last_stand', name: 'Last Stand', iconKey: 'sfLastStand', description: 'Become invulnerable for 4s and boost party DPS by 30%.', cooldown: 40, dpsMultiplier: 1.3, duration: 4, unlockTier: 2, nameColor: '#6699ff' },
        { id: 'sf_rallying_banner', name: 'Rallying Banner', iconKey: 'sfRallyingBanner', description: 'Plant a banner boosting all damage by 60% for 8s.', cooldown: 35, dpsMultiplier: 1.6, duration: 8, unlockTier: 4, nameColor: '#3366cc' },
    ],
    weaponmaster: [
        { id: 'sf_perfect_strike', name: 'Perfect Strike', iconKey: 'sfPerfectStrike', description: 'A precision strike guaranteed to crit for 300% DPS.', cooldown: 20, dpsMultiplier: 3.0, duration: 2, unlockTier: 0, nameColor: '#ffaa22' },
        { id: 'sf_blade_dance', name: 'Blade Dance', iconKey: 'sfBladeDance', description: 'Spin with twin blades dealing 200% DPS over 5s.', cooldown: 22, dpsMultiplier: 2.0, duration: 5, unlockTier: 2, nameColor: '#ffcc44' },
        { id: 'sf_grand_execution', name: 'Grand Execution', iconKey: 'sfGrandExecution', description: 'A devastating finisher dealing 500% DPS to low-health targets.', cooldown: 30, dpsMultiplier: 5.0, duration: 2, unlockTier: 4, nameColor: '#dd8800' },
    ],
    // Mage
    arcanist: [
        { id: 'sf_arcane_barrage', name: 'Arcane Barrage', iconKey: 'sfArcaneBarrage', description: 'Launch a volley of arcane missiles dealing 200% DPS.', cooldown: 18, dpsMultiplier: 2.0, duration: 4, unlockTier: 0, nameColor: '#cc44ff' },
        { id: 'sf_mana_storm', name: 'Mana Storm', iconKey: 'sfManaStorm', description: 'Unleash a devastating mana storm dealing 300% DPS over 6s.', cooldown: 28, dpsMultiplier: 3.0, duration: 6, unlockTier: 2, nameColor: '#aa33ee' },
        { id: 'sf_arcane_nova', name: 'Arcane Nova', iconKey: 'sfArcaneNova', description: 'Detonate arcane power for a massive 450% DPS explosion.', cooldown: 35, dpsMultiplier: 4.5, duration: 2, unlockTier: 4, nameColor: '#9922dd' },
    ],
    shadowcaller: [
        { id: 'sf_shadow_bolt', name: 'Shadow Bolt', iconKey: 'sfShadowBolt', description: 'Fire a bolt of shadow energy dealing 180% DPS.', cooldown: 15, dpsMultiplier: 1.8, duration: 3, unlockTier: 0, nameColor: '#8833aa' },
        { id: 'sf_soul_drain', name: 'Soul Drain', iconKey: 'sfSoulDrain', description: 'Drain the target\'s life force dealing 250% DPS and healing 10%.', cooldown: 25, dpsMultiplier: 2.5, duration: 5, unlockTier: 2, nameColor: '#aa44cc' },
        { id: 'sf_void_eruption', name: 'Void Eruption', iconKey: 'sfVoidEruption', description: 'Erupt with void energy dealing 500% DPS to all enemies.', cooldown: 40, dpsMultiplier: 5.0, duration: 2, unlockTier: 4, nameColor: '#6622aa' },
    ],
    chronomancer: [
        { id: 'sf_time_warp', name: 'Time Warp', iconKey: 'sfTimeWarp', description: 'Accelerate time, boosting attack speed by 100% for 8s.', cooldown: 30, dpsMultiplier: 2.0, duration: 8, unlockTier: 0, nameColor: '#44ddff' },
        { id: 'sf_temporal_rift', name: 'Temporal Rift', iconKey: 'sfTemporalRift', description: 'Tear open a rift dealing 300% DPS and slowing enemies.', cooldown: 25, dpsMultiplier: 3.0, duration: 4, unlockTier: 2, nameColor: '#33bbdd' },
        { id: 'sf_chronostrike', name: 'Chronostrike', iconKey: 'sfChronostrike', description: 'Strike across multiple timelines dealing 400% DPS.', cooldown: 35, dpsMultiplier: 4.0, duration: 3, unlockTier: 4, nameColor: '#22aacc' },
    ],
    // Ranger
    beastlord: [
        { id: 'sf_pack_assault', name: 'Pack Assault', iconKey: 'sfPackAssault', description: 'Command your pack to attack, dealing 200% DPS for 6s.', cooldown: 22, dpsMultiplier: 2.0, duration: 6, unlockTier: 0, nameColor: '#44cc44' },
        { id: 'sf_feral_roar', name: 'Feral Roar', iconKey: 'sfFeralRoar', description: 'Let out a primal roar boosting DPS by 80% for 8s.', cooldown: 28, dpsMultiplier: 1.8, duration: 8, unlockTier: 2, nameColor: '#33aa33' },
        { id: 'sf_natures_wrath_sf', name: 'Nature\'s Wrath', iconKey: 'sfNaturesWrath', description: 'Summon thorny vines dealing 400% DPS and rooting enemies.', cooldown: 35, dpsMultiplier: 4.0, duration: 3, unlockTier: 4, nameColor: '#228822' },
    ],
    sharpshooter: [
        { id: 'sf_sniper_shot', name: 'Sniper Shot', iconKey: 'sfSniperShot', description: 'Fire a precision shot dealing 250% DPS. Always crits.', cooldown: 18, dpsMultiplier: 2.5, duration: 2, unlockTier: 0, nameColor: '#ffcc22' },
        { id: 'sf_rain_of_arrows', name: 'Rain of Arrows', iconKey: 'sfRainOfArrows', description: 'Rain arrows on enemies dealing 200% DPS over 6s.', cooldown: 25, dpsMultiplier: 2.0, duration: 6, unlockTier: 2, nameColor: '#ddaa11' },
        { id: 'sf_kill_shot', name: 'Kill Shot', iconKey: 'sfKillShot', description: 'A lethal finisher dealing 600% DPS to targets below 30% HP.', cooldown: 35, dpsMultiplier: 6.0, duration: 2, unlockTier: 4, nameColor: '#cc8800' },
    ],
    warden: [
        { id: 'sf_living_roots', name: 'Living Roots', iconKey: 'sfLivingRoots', description: 'Summon ancient roots that shield allies and deal 150% DPS.', cooldown: 25, dpsMultiplier: 1.5, duration: 8, unlockTier: 0, nameColor: '#22aa66' },
        { id: 'sf_natures_embrace', name: 'Nature\'s Embrace', iconKey: 'sfNaturesEmbrace', description: 'Heal 20% HP and boost DPS by 60% for 8s.', cooldown: 30, dpsMultiplier: 1.6, duration: 8, unlockTier: 2, nameColor: '#44cc88' },
        { id: 'sf_thorn_barrier', name: 'Thorn Barrier', iconKey: 'sfThornBarrier', description: 'Raise a thorn wall dealing 350% DPS to attackers.', cooldown: 35, dpsMultiplier: 3.5, duration: 5, unlockTier: 4, nameColor: '#118855' },
    ],
    // Cleric
    zealot: [
        { id: 'sf_holy_nova', name: 'Holy Nova', iconKey: 'sfHolyNova', description: 'Explode with holy light dealing 220% DPS and healing allies.', cooldown: 20, dpsMultiplier: 2.2, duration: 3, unlockTier: 0, nameColor: '#ffcc00' },
        { id: 'sf_divine_hammer', name: 'Divine Hammer', iconKey: 'sfDivineHammer', description: 'Summon a divine hammer that smites for 350% DPS.', cooldown: 28, dpsMultiplier: 3.5, duration: 3, unlockTier: 2, nameColor: '#ffaa00' },
        { id: 'sf_judgment_fire', name: 'Judgment Fire', iconKey: 'sfJudgmentFire', description: 'Rain divine fire dealing 500% DPS to all enemies.', cooldown: 38, dpsMultiplier: 5.0, duration: 2, unlockTier: 4, nameColor: '#dd8800' },
    ],
    oracle: [
        { id: 'sf_fated_strike', name: 'Fated Strike', iconKey: 'sfFatedStrike', description: 'Foresee the perfect moment to strike for 200% DPS.', cooldown: 18, dpsMultiplier: 2.0, duration: 4, unlockTier: 0, nameColor: '#88ddff' },
        { id: 'sf_fate_weave', name: 'Fate Weave', iconKey: 'sfFateWeave', description: 'Weave destiny threads boosting party DPS by 50% for 8s.', cooldown: 30, dpsMultiplier: 1.5, duration: 8, unlockTier: 2, nameColor: '#66bbdd' },
        { id: 'sf_star_alignment', name: 'Star Alignment', iconKey: 'sfStarAlignment', description: 'Align the stars for a cosmic blast dealing 450% DPS.', cooldown: 35, dpsMultiplier: 4.5, duration: 2, unlockTier: 4, nameColor: '#44aacc' },
    ],
    templar: [
        { id: 'sf_divine_crusade', name: 'Divine Crusade', iconKey: 'sfDivineCrusade', description: 'Enter a holy crusade boosting DPS by 60% and healing for 8s.', cooldown: 28, dpsMultiplier: 1.6, duration: 8, unlockTier: 0, nameColor: '#ff8844' },
        { id: 'sf_holy_charge', name: 'Holy Charge', iconKey: 'sfHolyCharge', description: 'Charge forward with divine fire dealing 300% DPS.', cooldown: 22, dpsMultiplier: 3.0, duration: 3, unlockTier: 2, nameColor: '#ff6622' },
        { id: 'sf_sacred_flame', name: 'Sacred Flame', iconKey: 'sfSacredFlame', description: 'Ignite enemies with sacred fire dealing 400% DPS over 6s.', cooldown: 32, dpsMultiplier: 4.0, duration: 6, unlockTier: 4, nameColor: '#dd5500' },
    ],
};

class SoulForgeManager {
    constructor() {
        this.unlocked = false;
        this.soulEssence = 0;
        this.totalSoulEssence = 0;
        this.activeSpec = null;          // spec id string (e.g. 'berserker')
        this.chosenNodes = {};           // { tier0: { id: nodeId, level: N }, ... }
        this.respecCount = 0;
        this.specPowerCooldown = 0;      // remaining seconds on spec power CD
        this.sfAbilityCooldowns = [0, 0, 0]; // cooldowns for 3 Soul Forge abilities
        this._essencePerSecond = 0;      // computed rate for display
        this._essenceAccumulator = 0;    // fractional accumulator
    }

    /** Check if Soul Forge should be unlocked */
    isUnlocked() {
        if (this.unlocked) return true;
        // Unlock when Autumn (halo_ring) zone is accessible
        if (gameState.canAccessZone('halo_ring')) {
            this.unlocked = true;
            return true;
        }
        return false;
    }

    /** Get specializations available for the current class */
    getSpecsForClass() {
        return SPEC_DEFS[gameState.classId] || SPEC_DEFS.warrior;
    }

    /** Get the active spec definition (or null) */
    getActiveSpec() {
        if (!this.activeSpec) return null;
        const specs = this.getSpecsForClass();
        return specs.find(s => s.id === this.activeSpec) || null;
    }

    /** Choose a specialization (costs nothing, but can only have one) */
    chooseSpec(specId) {
        const specs = this.getSpecsForClass();
        const spec = specs.find(s => s.id === specId);
        if (!spec) return false;
        
        // If changing spec, reset nodes
        if (this.activeSpec && this.activeSpec !== specId) {
            this.chosenNodes = {};
        }
        
        this.activeSpec = specId;
        gameState.addGameLog(`⚒️ Soul Forge: Specialized as ${spec.name}!`);
        gameState.addChatMessage('Game', 'System', `⚒️ ${gameState.playerName} has chosen the path of the ${spec.name}!`);
        return true;
    }

    /** Get the cost to upgrade a node in a tier */
    getUpgradeCost(tierIndex, level) {
        const baseCost = BASE_TIER_COSTS[tierIndex] || 99999;
        return Math.floor(baseCost * Math.pow(level, LEVEL_SCALING_FACTOR));
    }

    /** Check if a tier is unlocked (i.e. a node has been chosen for it) */
    isTierUnlocked(tierIndex) {
        return this.chosenNodes[`tier${tierIndex}`] !== undefined;
    }

    /** Check if ANY node in this tier can be unlocked or upgraded */
    canUnlockTier(tierIndex) {
        if (!this.activeSpec) return false;
        const spec = this.getActiveSpec();
        if (!spec || !spec.tiers[tierIndex]) return false;
        
        // Check if any node in this tier is upgradeable
        // (If a node is already picked, only that node will be checked)
        return spec.tiers[tierIndex].nodes.some(node => this.canUpgradeTier(tierIndex, node.id));
    }

    /** Can the player afford ANY upgrade in the Soul Forge? */
    canAffordAnyUpgrade() {
        if (!this.isUnlocked() || !this.activeSpec) return false;
        for (let i = 0; i < 5; i++) {
            if (this.canUnlockTier(i)) return true;
        }
        return false;
    }

    /** Get level of a node in a tier */
    getNodeLevel(tierIndex) {
        return this.chosenNodes[`tier${tierIndex}`]?.level || 0;
    }

    /** Can the player unlock or upgrade a node at this tier? */
    canUpgradeTier(tierIndex, nodeId) {
        if (!this.activeSpec) return false;
        
        // Must have previous tier unlocked (or be tier 0)
        if (tierIndex > 0 && !this.isTierUnlocked(tierIndex - 1)) return false;
        
        const currentTier = this.chosenNodes[`tier${tierIndex}`];
        
        // If already unlocked a DIFFERENT node in this tier, can't pick this one
        if (currentTier && currentTier.id !== nodeId) return false;
        
        const nextLevel = (currentTier?.level || 0) + 1;
        if (nextLevel > MAX_NODE_LEVEL) return false;
        
        // Must have enough soul essence
        return this.soulEssence >= this.getUpgradeCost(tierIndex, nextLevel);
    }

    /** Unlock or upgrade a specific node at a tier */
    upgradeNode(tierIndex, nodeId) {
        if (!this.canUpgradeTier(tierIndex, nodeId)) return false;
        
        const spec = this.getActiveSpec();
        if (!spec) return false;
        
        // Validate node exists in this tier
        const tier = spec.tiers[tierIndex];
        if (!tier) return false;
        const node = tier.nodes.find(n => n.id === nodeId);
        if (!node) return false;
        
        const currentTier = this.chosenNodes[`tier${tierIndex}`];
        const nextLevel = (currentTier?.level || 0) + 1;
        const cost = this.getUpgradeCost(tierIndex, nextLevel);
        
        this.soulEssence -= cost;
        this.chosenNodes[`tier${tierIndex}`] = { id: nodeId, level: nextLevel };
        
        if (nextLevel === 1) {
            gameState.addGameLog(`⚒️ Soul Forge: Unlocked ${node.name}!`);
        } else {
            gameState.addGameLog(`⚒️ Soul Forge: Upgraded ${node.name} to Rank ${nextLevel}!`);
        }
        return true;
    }

    /** Get all unlocked node data (with computed values) */
    getUnlockedNodes() {
        const spec = this.getActiveSpec();
        if (!spec) return [];
        
        const nodes = [];
        for (let i = 0; i < 5; i++) {
            const data = this.chosenNodes[`tier${i}`];
            if (!data) continue;
            const tier = spec.tiers[i];
            const nodeDef = tier?.nodes.find(n => n.id === data.id);
            if (nodeDef) {
                nodes.push({
                    ...nodeDef,
                    level: data.level,
                    computedValue: nodeDef.value * data.level
                });
            }
        }
        return nodes;
    }

    /** Calculate total DPS multiplier from spec bonuses */
    getDPSMultiplier() {
        if (!this.activeSpec) return 1.0;
        let mult = 1.0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            const val = node.computedValue;
            // All DPS-related stats contribute
            if (['dps', 'combatDps', 'flatDps', 'dpsAndCrit', 'balanced', 'dpsAndHp',
                 'grandDps', 'archDps', 'glassCannon', 'dot', 'riskyDps', 'dpsSpeed',
                 'beastLord', 'deadeye', 'godHand', 'shadowLord', 'voidAvatar',
                 'dpsCrit', 'dpsHeal', 'dpsCdr', 'dpsHp', 'fateChamp', 'dpsParty',
                 'paladin', 'dpsCritHeal', 'cdrDps', 'dpsReflect', 'martyr',
                 'warlord', 'highHpDps', 'lowHpDps', 'fullHpDps', 'killSpree',
                 'longCombatDps', 'dodgeDps', 'timeLord', 'comboStack',
                 'postDefDps', 'enduring', 'partyScaleDps', 'focusDps', 'crusader',
                 'doubleDmg', 'typeDps'
                ].includes(node.stat)) {
                mult += val;
            }
            if (node.stat === 'allStats') mult += val;
            if (node.stat === 'megaCrit') mult += val * 0.3; // partial DPS from crit stats
            if (node.stat === 'critAll') mult += val * 0.2;
            if (node.stat === 'avatar') mult += val;
            if (node.stat === 'destinyThread') mult += val;
            if (node.stat === 'warp') mult += val;
            if (node.stat === 'eternity') mult += val;
        }
        return mult;
    }

    /** Calculate total HP multiplier from spec bonuses */
    getHPMultiplier() {
        if (!this.activeSpec) return 1.0;
        let mult = 1.0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            const val = node.computedValue;
            if (['hp', 'balanced', 'dpsAndHp', 'megaTank', 'hpRegen',
                 'tempArmor', 'dpsHp', 'paladin'
                ].includes(node.stat)) {
                mult += val;
            }
            if (node.stat === 'allStats') mult += val;
            if (node.stat === 'avatar') mult += val;
            if (node.stat === 'destinyThread') mult += val;
            if (node.stat === 'warp') mult += val;
            if (node.stat === 'eternity') mult += val;
            if (node.stat === 'glassCannon') mult -= (node.level * 0.015); // scaled penalty
        }
        return Math.max(0.5, mult);
    }

    /** Get CDR bonus from spec */
    getCDRBonus() {
        if (!this.activeSpec) return 0;
        let cdr = 0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            if (['cdr', 'megaCdr', 'spdCdr', 'cdrMana', 'cdrDps', 'dpsCdr', 'timeLord', 'efficiency'].includes(node.stat)) {
                cdr += node.computedValue;
            }
        }
        return Math.min(0.6, cdr); // cap at 60%
    }

    /** Get crit chance bonus from spec */
    getCritBonus() {
        if (!this.activeSpec) return 0;
        let crit = 0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            const val = node.computedValue;
            const lvl = node.level;
            if (node.stat === 'crit') crit += val;
            if (node.stat === 'dpsAndCrit') crit += (lvl * 0.01);
            if (node.stat === 'critAll') crit += (lvl * 0.02);
            if (node.stat === 'dpsCrit') crit += (lvl * 0.02);
            if (node.stat === 'critDodge') crit += (lvl * 0.015);
            if (node.stat === 'dodgeCrit') crit += (lvl * 0.015);
            if (node.stat === 'megaCrit') crit += (lvl * 0.03);
            if (node.stat === 'deadeye') crit += (lvl * 0.035);
            if (node.stat === 'godHand') crit += (lvl * 0.045);
            if (node.stat === 'grandDps') crit += (lvl * 0.02);
        }
        return crit;
    }

    /** Get crit damage bonus from spec */
    getCritDamageBonus() {
        if (!this.activeSpec) return 0;
        let critDmg = 0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            const val = node.computedValue;
            if (['critDmg', 'megaCrit', 'megaCritDmg', 'critSpeed', 'ascendant'].includes(node.stat)) {
                critDmg += val;
            }
        }
        return critDmg;
    }

    /** Get regen multiplier bonus from spec */
    getRegenMultiplier() {
        if (!this.activeSpec) return 1.0;
        let mult = 1.0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            const val = node.computedValue;
            if (['regen', 'combatRegen', 'hpRegen'].includes(node.stat)) mult += val;
            if (node.stat === 'avatar') mult += val;
            if (node.stat === 'paladin') mult += (node.level * 0.045);
            if (node.stat === 'defRegen') mult += (node.level * 0.03);
        }
        return mult;
    }

    /** Get party DPS multiplier from spec */
    getPartyDPSMultiplier() {
        if (!this.activeSpec) return 1.0;
        let mult = 1.0;
        const nodes = this.getUnlockedNodes();
        for (const node of nodes) {
            if (['partyDps', 'partyBoth', 'partyAll', 'warlord', 'dpsParty',
                 'fateChamp', 'timeLord', 'chronostasis', 'healParty'
                ].includes(node.stat)) {
                mult += node.computedValue * 0.5; // party bonuses are half their stated value for balance
            }
        }
        return mult;
    }

    /** Respec — reset all chosen nodes, refund 50% soul essence spent */
    respec() {
        const cost = RESPEC_COST_BASE * Math.pow(2, this.respecCount);
        if (this.soulEssence < cost) return false;
        
        // Calculate refund (50% of spent)
        let spent = 0;
        for (let i = 0; i < 5; i++) {
            const data = this.chosenNodes[`tier${i}`];
            if (data) {
                for (let lvl = 1; lvl <= data.level; lvl++) {
                    spent += this.getUpgradeCost(i, lvl);
                }
            }
        }
        const refund = Math.floor(spent * 0.5);
        
        this.soulEssence -= cost;
        this.soulEssence += refund;
        this.chosenNodes = {};
        this.respecCount++;
        
        gameState.addGameLog(`⚒️ Soul Forge: Respecialized! Refunded ${refund} Soul Essence.`);
        return true;
    }

    /** Get respec cost */
    getRespecCost() {
        return RESPEC_COST_BASE * Math.pow(2, this.respecCount);
    }

    /** Add soul essence from combat/quests/bosses */
    addSoulEssence(amount) {
        if (!this.unlocked) return;
        this.soulEssence += amount;
        this.totalSoulEssence += amount;
    }

    /** Mass-disenchant all items in inventory below a certain rarity */
    massDisenchant(inventory, maxRarityIndex = 1) {
        if (!this.unlocked) return { count: 0, essence: 0 };
        
        let totalEssence = 0;
        let count = 0;
        
        // Find all items that match criteria
        const toRemove = [];
        for (let i = 0; i < inventory.items.length; i++) {
            const item = inventory.items[i];
            if (!item || item.rarityIndex === undefined) continue;
            
            if (item.rarityIndex <= maxRarityIndex && !item.equipped) {
                // Base essence based on rarity
                const base = [1, 5, 25, 100, 500][item.rarityIndex] || 2; // Reduced across the board
                const essence = Math.floor(base * (1 + (item.level || 1) * 0.05));
                totalEssence += essence;
                count++;
                toRemove.push(i);
            }
        }
        
        // Remove items from inventory (in reverse to avoid index shifts)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            inventory.items.splice(toRemove[i], 1);
        }
        
        if (count > 0) {
            this.addSoulEssence(totalEssence);
            gameState.addGameLog(`⚒️ Mass-Disenchanted ${count} items for ${totalEssence} Soul Essence!`);
        }
        
        return { count, essence: totalEssence };
    }

    /** Update — Soul Essence is ONLY earned from Dungeons & Raids (no passive gen) */
    update(dt) {
        if (!this.unlocked) return;
        this._essencePerSecond = 0; // No passive generation — dungeon/raid exclusive
        
        // Spec power cooldown
        if (this.specPowerCooldown > 0) {
            this.specPowerCooldown = Math.max(0, this.specPowerCooldown - dt);
        }

        // Soul Forge ability cooldowns
        for (let i = 0; i < 3; i++) {
            if (this.sfAbilityCooldowns[i] > 0) {
                this.sfAbilityCooldowns[i] = Math.max(0, this.sfAbilityCooldowns[i] - dt);
            }
        }

        // Auto-cast Soul Forge abilities in combat
        if (gameState.inCombat && this.activeSpec) {
            const abilities = this.getSpecAbilities();
            for (let i = 0; i < abilities.length; i++) {
                const abil = abilities[i];
                if (abil && abil.unlocked && this.sfAbilityCooldowns[i] <= 0) {
                    this.sfAbilityCooldowns[i] = abil.cooldown;
                    // Apply DPS boost via the existing damageBuff system
                    if (abil.dpsMultiplier > 0) {
                        gameState.damageBuff = abil.dpsMultiplier;
                        gameState.damageBuffTimer = abil.duration || 5;
                        gameState.addGameLog(`⚒️ ${abil.name}! +${Math.round((abil.dpsMultiplier - 1) * 100)}% damage for ${Math.round(abil.duration || 5)}s`);
                    }
                }
            }
        }
    }

    /** Get the 3 spec abilities for the active spec, with unlock status based on tier progress */
    getSpecAbilities() {
        if (!this.activeSpec) return [];
        const abilities = SPEC_ABILITIES[this.activeSpec];
        if (!abilities) return [];
        const tierCount = this.getUnlockedTierCount();
        return abilities.map(abil => ({
            ...abil,
            unlocked: tierCount > abil.unlockTier,
        }));
    }

    /** Use the spec power ability */
    useSpecPower() {
        if (!this.activeSpec || this.specPowerCooldown > 0) return false;
        const spec = this.getActiveSpec();
        if (!spec) return false;
        
        this.specPowerCooldown = spec.specPower.cooldown;
        gameState.addGameLog(`⚒️ ${spec.specPower.name} activated!`);
        return true;
    }

    /** Serialize for save */
    serialize() {
        return {
            unlocked: this.unlocked,
            soulEssence: this.soulEssence,
            totalSoulEssence: this.totalSoulEssence,
            activeSpec: this.activeSpec,
            chosenNodes: { ...this.chosenNodes },
            respecCount: this.respecCount,
        };
    }

    /** Deserialize from save */
    deserialize(data) {
        if (!data) return;
        this.unlocked = data.unlocked || false;
        this.soulEssence = data.soulEssence || 0;
        this.totalSoulEssence = data.totalSoulEssence || 0;
        this.activeSpec = data.activeSpec || null;
        this.chosenNodes = data.chosenNodes || {};
        this.respecCount = data.respecCount || 0;
    }

    /** Get total number of unlocked tiers */
    getUnlockedTierCount() {
        let count = 0;
        for (let i = 0; i < 5; i++) {
            if (this.chosenNodes[`tier${i}`]) count++;
        }
        return count;
    }
}

export const soulForge = new SoulForgeManager();