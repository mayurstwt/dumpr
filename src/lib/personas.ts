/**
 * Persona logic for Dumpr.
 * Generates a weekly-seeded anonymous handle based on userId.
 */

const ADJECTIVES = [
  "Chaotic", "Spreadsheet", "Friday", "Caffeine", "Zoom", "Office",
  "Meeting", "Watercooler", "Deadline", "Inbox", "Burnout", "Pivot",
  "Status", "Remote", "WiFi", "Keyboard", "Standup", "Merge", "Buffer", "Async",
  "Dynamic", "Innovative", "Digital", "Collaborative", "Virtual", "Fast-paced",
  "Efficient", "Proactive", "Creative", "Focused", "Productive", "Resourceful",
  "Inspiring", "Evolving", "Agile", "Tech-savvy", "Strategic", "Synchronized",
  "Interactive", "Supportive", "Motivating", "Impactful", "Nimble", "Cutting-edge",
  "Flexible", "Analytical", "Detail-oriented", "Open-minded", "Results-driven",
  "Forward-thinking", "Visionary", "Data-driven", "Ambitious", "User-friendly",
  "Task-oriented", "Time-sensitive", "Reliable", "Eager", "Unwavering", "Bold",
  "Resilient", "Driven", "Connected", "Professional", "Ethical", "Transparent",
  "Empowered", "Enthusiastic", "Holistic", "Holistic", "Passionate", "Diligent",
  "Skillful", "Knowledgeable", "Intuitive", "Assertive", "Cooperative", "Loyal",
  "Caring", "Friendly", "Visionary", "Harmonious", "Supportive", "Empathetic",
  "Adventurous", "Fearless", "Balanced", "Insightful", "Pragmatic", "Sustainable",
  "Decorative", "Minimalist", "Sophisticated", "Refreshing", "Informal",
  "Celebratory", "Enlightened", "Lighthearted", "Futuristic", "Comprehensive",
  "Spontaneous", "Elegant", "Artistic", "Comfortable"
];

const NOUNS = [
  "Prophet", "Goblin", "Ninja", "Overlord", "Survivor", "Legend", "CFO", "Intern",
  "Ghost", "Viking", "Hacker", "Zenith", "Wizard", "Titan", "Rogue", "Maven",
  "Samurai", "Wrangler", "Slayer", "Warrior", "Oracle", "Sage", "Hero",
  "Guardian", "Nomad", "Pioneer", "Champion", "Scholar", "Inventor",
  "Artisan", "Visionary", "Rebel", "Explorer", "Warlock", "Conqueror",
  "Alchemist", "Mystic", "Bard", "Jester", "Tactician", "Diplomat",
  "Marauder", "Cyborg", "Sentinel", "Maverick", "Druid", "Sorcerer",
  "Paladin", "Baron", "Ranger", "Sellsword", "Banshee", "Assassin",
  "Vanguard", "Voyager", "Holder", "Tamer", "Phantom", "Pets",
  "Guardian", "Wanderer", "Revenant", "Avenger", "Fallen", "Witch",
  "Daredevil", "Vexer", "Brawler", "Shadow", "Scribe", "Illusionist",
  "Overseer", "Spy", "Huntress", "Scholar", "Firestarter", "Tamer",
  "Keeper", "Trigger", "Craftsman", "Derringer", "Maestro", "Conjuror",
  "Fate", "Lorekeeper", "Mender", "Sanguine", "Enchanter", "Sorcerer",
  "Chief", "Doomsayer", "Manipulator", "Taskmaster", "Horde", "Visionary",
  "Pathfinder", "Corruptor", "Pathbreaker"
];


/**
 * Returns a number representing the current week of the year.
 */
function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek);
}

/**
 * Returns a number representing the current season (quarter) of the year.
 */
function getCurrentSeason() {
  const now = new Date();
  return Math.floor(now.getMonth() / 3) + 1; // 1 to 4
}

/**
 * Generates a stable persona for a given userId and current week/season.
 */
export function getWeeklyPersona(userId: string, type: 'weekly' | 'seasonal' = 'weekly'): { name: string; handle: string; badge?: string } {
  const week = getCurrentWeek();
  const season = getCurrentSeason();
  const year = new Date().getFullYear();

  // Seasonal seed is broader, Weekly is more transient
  const seed = type === 'weekly'
    ? `${userId}-${week}-${year}`
    : `${userId}-season-${season}-${year}`;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const adjIndex = Math.abs(hash) % ADJECTIVES.length;
  const nounIndex = Math.abs(hash >> 5) % NOUNS.length;

  const personaName = `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
  const discriminator = userId.slice(-4).toUpperCase();

  return {
    name: personaName,
    handle: `@${personaName.replace(/\s+/g, '')}_${discriminator}`,
    badge: type === 'seasonal' ? "🌟 Season Legend" : undefined
  };
}
