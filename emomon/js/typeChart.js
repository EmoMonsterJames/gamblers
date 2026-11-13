// =====================================================================
// Attribute (type) chart. A monster can have up to 3 attributes.
// The multiplier against a multi-type monster is the product of the
// multiplier against each of its types, e.g. Electric -> [Water, Air]
// = 2 x 1.5 = 3.0, Electric -> [Water, Earth] = 2 x 0 = 0.
// =====================================================================
const ALL_TYPES = [
    "Normal", "Abnormal", "Magic", "Power", "Water", "Fire", "Grass", "Electric",
    "Ice", "Angel", "Evil", "Air", "Fly", "Earth", "Bug", "Ghost", "Steel",
    "Fairy", "Space", "Robot", "Light", "Mind"
];

const TYPE_COLORS = {
    Normal: "#a8a77a", Abnormal: "#b56cf0", Magic: "#d65bd6", Power: "#c22e28",
    Water: "#4a90e2", Fire: "#ee8130", Grass: "#7ac74c", Electric: "#f7d02c",
    Ice: "#96d9d6", Angel: "#ffd6e7", Evil: "#5a4a6a", Air: "#a7c7e7", Fly: "#a98ff3",
    Earth: "#c8a35a", Bug: "#a6b91a", Ghost: "#735797", Steel: "#b7b7ce",
    Fairy: "#d685ad", Space: "#2b2d6e", Robot: "#7f8c9a", Light: "#f5d76e", Mind: "#f0609a",
    Pure: "#e8e8f0"   // only the default attack (no monster has it): x1 against everything
};

const TYPE_CHART = {
    Normal:   { Abnormal: 2, Magic: 0.5, Ghost: 0, Steel: 0.5 },
    Abnormal: { Normal: 2, Space: 2, Fairy: 0.5, Angel: 0.5, Mind: 0 },
    Magic:    { Space: 2, Abnormal: 2, Angel: 1.5, Evil: 0.5 },
    Power:    { Earth: 2, Ice: 2, Steel: 1.5, Abnormal: 0.5, Ghost: 0.5, Space: 0.5, Mind: 0.5 },
    Air:      { Fire: 1.5, Water: 1.5, Ice: 1.5, Electric: 1.5, Bug: 1.5, Space: 0 },
    Fly:      { Grass: 2, Bug: 2, Electric: 0.5, Steel: 0.5, Space: 0 },
    Ice:      { Water: 2, Grass: 2, Fly: 2, Fire: 0.5, Steel: 0.5 },
    Ghost:    { Space: 2, Magic: 0.5, Abnormal: 0.5, Angel: 0.5, Light: 0.5, Normal: 0 },
    Fairy:    { Ghost: 2, Evil: 1.5, Angel: 0.5, Steel: 0.5 },
    Fire:     { Ice: 2, Grass: 2, Bug: 2, Steel: 2, Water: 0.5, Air: 0.5 },
    Water:    { Fire: 2, Ice: 1.5, Earth: 1.5, Grass: 0.5, Air: 0.5 },
    Grass:    { Water: 2, Earth: 1.5, Fire: 0.5, Ice: 0.5, Bug: 0.5, Fly: 0.5 },
    Electric: { Water: 2, Fly: 2, Robot: 2, Light: 2, Earth: 0, Air: 1.5, Space: 0.5 },
    Angel:    { Evil: 2, Light: 2, Ghost: 1.5, Fairy: 0.5 },
    Space:    { Power: 2, Water: 1.5, Fire: 1.5, Air: 1.5, Earth: 0, Ghost: 0.5, Space: 0.5, Light: 0.5 },
    Earth:    { Electric: 2, Fire: 1.5, Steel: 1.5, Power: 0.5, Space: 0.5, Fly: 0 },
    Evil:     { Angel: 2, Magic: 0.5, Abnormal: 0.5, Fairy: 0.5 },
    Bug:      { Grass: 2, Evil: 1.5, Fire: 0.5, Fly: 0.5 },
    Steel:    { Ice: 2, Fairy: 2, Robot: 2, Fire: 0.5, Water: 0.5, Electric: 0.5 },
    Robot:    { Abnormal: 2, Ghost: 2, Fairy: 2, Angel: 2, Air: 2, Ice: 0.5, Fire: 0.5, Steel: 0.5, Electric: 0.5, Water: 0 },
    Light:    { Fly: 2, Space: 2, Ghost: 2, Angel: 0.5, Electric: 0.5 },
    Mind:     { Power: 2, Robot: 2, Ghost: 0.5, Magic: 0.5 },
};

function normalizeType(type) {
    if (!type) return null;
    const t = String(type).trim().toLowerCase();
    return ALL_TYPES.find(x => x.toLowerCase() === t) || String(type).trim();
}

// Types of a monster object. Accepts monsters rows (type1..3 / type) and
// owned monsters (adds player_monsters.added_types, drops removed_types - LAB attribute add / change).
function getMonsterTypes(monster, addedTypes, removedTypes) {
    if (!monster) return [];
    if (Array.isArray(monster)) return monster.slice(0, GameConfig.MAX_TYPES);
    if (Array.isArray(monster.types) && monster.types.length) {
        return monster.types.slice(0, GameConfig.MAX_TYPES);
    }
    const removed = (removedTypes || monster.removed_types || []).map(t => String(t).toLowerCase());
    const list = [monster.type1 || monster.type, monster.type2, monster.type3].filter(t => t && !removed.includes(String(t).toLowerCase()))
        .concat(addedTypes || monster.added_types || []);
    const out = [];
    for (const raw of list) {
        const t = normalizeType(raw);
        if (t && !out.some(x => x.toLowerCase() === t.toLowerCase())) out.push(t);
    }
    return out.slice(0, typeof GameConfig !== "undefined" ? GameConfig.MAX_TYPES : 3);
}

function getSingleTypeModifier(attackType, defenseType) {
    const a = normalizeType(attackType), d = normalizeType(defenseType);
    return TYPE_CHART?.[a]?.[d] ?? 1;
}

// defender: monster object or an array of types
function getTypeModifier(attackType, defender) {
    let total = 1;
    for (const t of getMonsterTypes(defender)) {
        total *= getSingleTypeModifier(attackType, t);
    }
    return total;
}

function getTypeMessageFromModifier(modifier) {
    if (modifier === 0) return "It has no effect...";
    if (modifier >= 2) return "It's super effective!";
    if (modifier > 1) return "It's effective!";
    if (modifier < 1) return "It's not very effective...";
    return "";
}

function getTypeMessage(attackType, defender) {
    return getTypeMessageFromModifier(getTypeModifier(attackType, defender));
}

function typeChipHtml(type) {
    const color = TYPE_COLORS[normalizeType(type)] || "#666";
    return `<span class="type-chip" style="--type-color:${color}">${String(type).toUpperCase()}</span>`;
}
