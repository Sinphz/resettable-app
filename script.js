// Add each weekly tip here with a higher number and its matching local image.
// Copy verified wording only; omit description/closing when unavailable.
// Add new image paths to service-worker.js CORE_FILES and bump the cache version.
const resettableTips = [
  {
    "number": 1,
    "title": "Keep the things you use most within reach",
    "description": "Everyday essentials are easier to use and put away when they’re close at hand.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-01.png",
      "alt": "Keep the things you use most within reach. Everyday essentials are easier to use and put away when they’re close at hand."
    }
  },
  {
    "number": 2,
    "title": "Give everything a home",
    "description": "A dedicated place for each item makes it easier to find, use and put away.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-02.png",
      "alt": "Give everything a home. A dedicated place for each item makes it easier to find, use and put away."
    }
  },
  {
    "number": 3,
    "title": "Keep similar items together",
    "description": "Grouping like items saves time and makes your space feel calmer and more organised.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-03.png",
      "alt": "Keep similar items together. Grouping like items saves time and makes your space feel calmer and more organised."
    }
  },
  {
    "number": 4,
    "title": "Use clear storage where possible",
    "description": "Seeing what you have helps reduce waste and makes it easier to stay organised.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-04.png",
      "alt": "Use clear storage where possible. Seeing what you have helps reduce waste and makes it easier to stay organised."
    }
  },
  {
    "number": 5,
    "title": "Create a drop zone",
    "description": "A designated spot for everyday items like keys, bags and coats helps keep your home tidy and stress-free.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-05.png",
      "alt": "Create a drop zone. A designated spot for everyday items like keys, bags and coats helps keep your home tidy and stress-free."
    }
  },
  {
    "number": 6,
    "title": "Make the most of your space",
    "description": "Use under-bed storage, shelves and vertical space to keep more organised without creating clutter.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-06.png",
      "alt": "Make the most of your space. Use under-bed storage, shelves and vertical space to keep more organised without creating clutter."
    }
  },
  {
    "number": 7,
    "title": "Use labels to stay organised",
    "description": "Labels make it easier to find things, keep spaces tidy and help everyone know where items belong.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-07.png",
      "alt": "Use labels to stay organised. Labels make it easier to find things, keep spaces tidy and help everyone know where items belong."
    }
  },
  {
    "number": 8,
    "title": "Use organisers to create order",
    "description": "Drawer dividers, boxes and trays help keep similar items together, making it easier to find what you need.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-08.png",
      "alt": "Use organisers to create order. Drawer dividers, boxes and trays help keep similar items together, making it easier to find what you need."
    }
  },
  {
    "number": 9,
    "title": "Store similar items together",
    "description": "Keeping similar items together makes them easier to find, helps you stay organised and saves time.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-09.png",
      "alt": "Store similar items together. Keeping similar items together makes them easier to find, helps you stay organised and saves time."
    }
  },
  {
    "number": 10,
    "title": "Keep high-traffic areas clutter-free",
    "description": "A tidy entrance, kitchen worktop and other busy spaces make everyday life easier and help your home feel calmer.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-10.png",
      "alt": "Keep high-traffic areas clutter-free. A tidy entrance, kitchen worktop and other busy spaces make everyday life easier and help your home feel calmer."
    }
  },
  {
    "number": 11,
    "title": "Use matching hangers",
    "description": "Matching hangers create a neater look, save space and make it easier to find and keep your clothes organised.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-11.png",
      "alt": "Use matching hangers. Matching hangers create a neater look, save space and make it easier to find and keep your clothes organised."
    }
  },
  {
    "number": 12,
    "title": "Use clear labels",
    "description": "Clear labels make it easy to see what’s inside, help everyone find things quickly and keep your space organised.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-12.png",
      "alt": "Use clear labels. Clear labels make it easy to see what’s inside, help everyone find things quickly and keep your space organised."
    }
  },
  {
    "number": 13,
    "title": "Use baskets and bins",
    "description": "Baskets and bins keep similar items together, make the most of your space and help maintain a tidy, organised home.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-13.png",
      "alt": "Use baskets and bins. Baskets and bins keep similar items together, make the most of your space and help maintain a tidy, organised home."
    }
  },
  {
    "number": 14,
    "title": "Use airtight containers",
    "description": "Airtight containers keep similar items together, keep food fresher for longer and make your cupboards look neater.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-14.png",
      "alt": "Use airtight containers. Airtight containers keep similar items together, keep food fresher for longer and make your cupboards look neater."
    }
  },
  {
    "number": 15,
    "title": "Leave a little breathing room",
    "description": "Avoid filling every shelf and drawer completely. Leaving some spare space makes things easier to find, access and put away.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-15.png",
      "alt": "Leave a little breathing room. Avoid filling every shelf and drawer completely. Leaving some spare space makes things easier to find, access and put away."
    }
  },
  {
    "number": 16,
    "title": "Declutter before you organise.",
    "description": "Before buying storage boxes or rearranging a space, take a moment to decide what you actually need and use. Less clutter means less to organise.",
    "wordingSource": "Transcribed from the supplied high-resolution PNG graphic.",
    "adviceInImage": true,
    "image": {
      "src": "assets/tips/modern-tip-16.png",
      "alt": "Declutter before you organise. Before buying storage boxes or rearranging a space, take a moment to decide what you actually need and use. Less clutter means less to organise."
    }
  }
];

function createTipArticle(tip, headingTag = "h3") {
  const article = document.createElement("article");
  article.className = "tip-entry";
  if (!tip.adviceInImage) {
    const heading = document.createElement(headingTag);
    heading.textContent = tip.title;
    article.append(heading);
  }
  const image = document.createElement("img");
  image.src = tip.image.src;
  image.alt = tip.image.alt;
  image.decoding = "async";
  article.append(image);
  if (tip.description && !tip.adviceInImage) {
    const description = document.createElement("p");
    description.textContent = tip.description;
    article.append(description);
  }
  if (tip.closing && !tip.adviceInImage) {
    const closing = document.createElement("p");
    closing.className = "tip-closing";
    closing.textContent = tip.closing;
    article.append(closing);
  }
  return article;
}

// Tip 1 starts on Monday 26 October 2026 in Europe/London.
// Compare UK calendar dates, not elapsed local hours, so DST cannot shift a week.
const TIP_WEEK_START = Date.UTC(2026, 9, 26);
const TIP_DAY_MS = 24 * 60 * 60 * 1000;
const tipUkDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

function getTipUkParts(now) {
  return Object.fromEntries(tipUkDateTime.formatToParts(now)
    .filter(part => part.type !== "literal")
    .map(part => [part.type, Number(part.value)]));
}

function getScheduledTipIndex(now = new Date()) {
  const { year, month, day } = getTipUkParts(now);
  const week = Math.floor((Date.UTC(year, month - 1, day) - TIP_WEEK_START) / (7 * TIP_DAY_MS));
  return ((week % resettableTips.length) + resettableTips.length) % resettableTips.length;
}

function getNextTipChange(now = new Date()) {
  const { year, month, day } = getTipUkParts(now);
  const ukDay = Date.UTC(year, month - 1, day);
  const daysSinceMonday = ((ukDay - TIP_WEEK_START) / TIP_DAY_MS % 7 + 7) % 7;
  const mondayUtc = ukDay + (7 - daysSinceMonday) * TIP_DAY_MS;
  // At Monday 00:00 UTC, London is either 00:00 GMT or 01:00 BST.
  // Use the offset at that Monday, rather than today's offset across a DST change.
  const monday = getTipUkParts(new Date(mondayUtc));
  const londonAsUtc = Date.UTC(monday.year, monday.month - 1, monday.day,
    monday.hour, monday.minute, monday.second);
  return mondayUtc - (londonAsUtc - mondayUtc);
}

let renderedWeeklyTipNumber = null;
let weeklyTipTimer = null;

function refreshWeeklyTip() {
  const now = new Date();
  const scheduledTip = resettableTips[getScheduledTipIndex(now)];
  if (renderedWeeklyTipNumber !== scheduledTip.number) {
    renderTips(scheduledTip);
    if (discoveredTipNumber === scheduledTip.number) shufflePreviousTip();
  }
  clearTimeout(weeklyTipTimer);
  weeklyTipTimer = setTimeout(refreshWeeklyTip, Math.max(1, getNextTipChange(now) - now.getTime()));
}

let discoveredTipNumber = null;
let tipReturnSource = "collection";
let tipReturnButton = null;

function showTipsCollection(restoreFocus = false) {
  refreshWeeklyTip();
  document.getElementById("tipsCollection").hidden = false;
  document.getElementById("tipsArchive").hidden = true;
  document.getElementById("tipDetail").hidden = true;
  if (restoreFocus) document.getElementById("viewPreviousTips").focus();
}

function showTipsArchive() {
  document.getElementById("tipsCollection").hidden = true;
  document.getElementById("tipsArchive").hidden = false;
  document.getElementById("tipDetail").hidden = true;
  document.getElementById("backFromArchive").focus();
}

function openTip(tip, source = "collection", button = null) {
  tipReturnSource = source;
  tipReturnButton = button;
  document.getElementById("tipDetailContent").replaceChildren(createTipArticle(tip, "h2"));
  document.getElementById("tipsCollection").hidden = true;
  document.getElementById("tipsArchive").hidden = true;
  document.getElementById("tipDetail").hidden = false;
  document.getElementById("backToTips").textContent = source === "archive" ? "← Back to Previous Tips" : "← Back to Tips collection";
  document.getElementById("backToTips").focus();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function returnFromTip() {
  if (tipReturnSource === "archive") showTipsArchive();
  else showTipsCollection();
  tipReturnButton?.focus();
}

function shufflePreviousTip() {
  const scheduledTip = resettableTips[getScheduledTipIndex()];
  const previous = [...resettableTips].sort((a, b) => b.number - a.number)
    .filter(tip => tip.number !== scheduledTip.number);
  const choices = previous.filter(tip => tip.number !== discoveredTipNumber);
  const pool = choices.length ? choices : previous;
  const tip = pool[Math.floor(Math.random() * pool.length)];
  const container = document.getElementById("discoveredTip");
  container.replaceChildren();
  document.getElementById("shuffleTip").disabled = previous.length < 2;
  if (!tip) return;
  discoveredTipNumber = tip.number;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tip-discovery-image";
  button.setAttribute("aria-label", `Open tip: ${tip.title}`);
  const image = document.createElement("img");
  image.src = tip.image.src;
  image.alt = tip.image.alt;
  image.decoding = "async";
  button.append(image);
  button.addEventListener("click", () => openTip(tip, "collection", button));
  container.append(button);
}

function renderTips(scheduledTip = resettableTips[getScheduledTipIndex()]) {
  const tips = [...resettableTips].sort((a, b) => b.number - a.number);
  const featured = document.getElementById("featuredTip");
  featured.replaceChildren();
  featured.append(createTipArticle(scheduledTip));
  renderedWeeklyTipNumber = scheduledTip.number;
  const list = document.getElementById("previousTips");
  list.replaceChildren();
  tips.filter(tip => tip.number !== scheduledTip.number).forEach(tip => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "tip-row";
    row.dataset.tip = tip.number;
    const image = document.createElement("img");
    image.src = tip.image.src;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    const title = document.createElement("span");
    title.textContent = tip.title;
    const chevron = document.createElement("span");
    chevron.className = "tip-row-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";
    row.append(image, title, chevron);
    row.addEventListener("click", () => openTip(tip, "archive", row));
    list.append(row);
  });
}

const categories = [
  { id: "home", name: "Home", description: "Everyday spaces for a calmer home." },
  { id: "outdoor", name: "Outdoor", description: "Make more of the spaces just outside." },
  { id: "workspaces", name: "Workspaces & Organisations", description: "Clear, practical spaces to work and share." }
];
const formspreeEndpoint = "https://formspree.io/f/mnpalzwv";

const rooms = [
  {
    id: "kitchen", category: "home", name: "Kitchen", emoji: "🍃",
    description: "A calmer kitchen, one cupboard at a time.",
    tasks: [
      "Clear one countertop",
      "Check fridge for expired items",
      "Sort one cupboard",
      "Group similar items together",
      "Wipe down your newly cleared space"
    ]
  },
  {
    id: "bedroom", category: "home", name: "Bedroom", emoji: "☀️",
    description: "Make room for a restful start and end to your day.",
    tasks: [
      "Make the bed",
      "Choose five items to donate",
      "Organise a bedside surface",
      "Sort one drawer",
      "Put away clothes left out"
    ]
  },
  {
    id: "living", category: "home", name: "Living Room", emoji: "🪴",
    description: "Create a welcoming space to relax.",
    tasks: [
      "Clear the coffee table",
      "Collect items that belong elsewhere",
      "Organise books and magazines",
      "Tidy cables and remotes",
      "Refresh cushions and throws"
    ]
  },
  {
    id: "wardrobe", category: "home", name: "Wardrobe", emoji: "👕",
    description: "Make getting dressed feel easier and more considered.",
    tasks: [
      "Take everything off one shelf or rail",
      "Set aside clothes you no longer wear",
      "Group clothes by type or season",
      "Fold or hang items neatly",
      "Return only useful items to the wardrobe"
    ]
  },
  {
    id: "garden", category: "outdoor", name: "Garden", emoji: "🌿",
    description: "Create a little more calm and space outdoors.",
    tasks: [
      "Clear one garden surface or seating area",
      "Collect tools and items left outside",
      "Sort plant pots and gardening supplies",
      "Set aside broken or unused outdoor items",
      "Sweep or tidy the area you cleared"
    ]
  },
  {
    id: "shed", category: "outdoor", name: "Shed", emoji: "🪴",
    description: "Find the things you need in your shed more easily.",
    tasks: [
      "Clear the shed entrance and walkway",
      "Group tools by how they are used",
      "Set aside items to repair, donate or recycle",
      "Return seasonal items to one designated area",
      "Label or group one shelf of essentials"
    ]
  },
  {
    id: "garage", category: "outdoor", name: "Garage", emoji: "🧰",
    description: "Make room to move, store and find what you need.",
    tasks: [
      "Clear a safe path through the garage",
      "Group sports, garden or car items together",
      "Choose one box to sort and reduce",
      "Set aside items to donate or recycle",
      "Put frequently used items within easy reach"
    ]
  },
  {
    id: "workspace", category: "workspaces", name: "Workspace", emoji: "✏️",
    description: "Less clutter, more focus.",
    tasks: [
      "Clear your desk",
      "Sort loose papers",
      "Remove unused supplies",
      "Organise charging cables",
      "Create a clear working surface"
    ]
  },
  {
    id: "office-storage", category: "workspaces", name: "Office Storage", emoji: "🗂️",
    description: "Make shared supplies and stored items easier to find.",
    tasks: [
      "Choose one shelf, drawer or cupboard to reset",
      "Group supplies by type or purpose",
      "Remove empty, expired or unused items",
      "Label the most-used storage areas",
      "Return items to their new home"
    ]
  },
  {
    id: "shared-spaces", category: "workspaces", name: "Shared Spaces", emoji: "🪑",
    description: "Help shared areas work well for everyone.",
    tasks: [
      "Clear one shared table or counter",
      "Gather items that belong to individuals",
      "Group shared supplies in one place",
      "Remove items that are broken or no longer needed",
      "Agree a simple routine to keep the area clear"
    ]
  }
];

const storageKey = "resettable-checklist-v1";
const customSpacesStorageKey = "resettable-custom-spaces-v1";
const spaceGoalsStorageKey = "resettable-space-goals-v1";
const resetSessionStorageKey = "resettable-reset-session-v1";
const resetScheduleStorageKey = "resettable-reset-schedule-v1";
// Safety state is memory-only. Never repair or replace stored data during loading.
const localDataState = new Map();
const localSaveFailures = new Set();
let localDeletionIncomplete = false;
let localRestoreIncomplete = false;

function sameLocalData(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object"
      || Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every(key =>
    Object.prototype.hasOwnProperty.call(right, key) && sameLocalData(left[key], right[key]));
}

function loadLocalData(key, fallback, normalize, validate = () => true) {
  const state = { status: "unreadable", raw: null };
  localDataState.set(key, state);
  try {
    state.raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  if (state.raw === null) {
    state.status = "missing";
    return fallback;
  }
  state.status = "invalid";
  try {
    const parsed = JSON.parse(state.raw);
    const loaded = normalize(parsed);
    // Even readable data must be protected if loading drops or changes anything.
    if (validate(parsed) && sameLocalData(parsed, loaded)) state.status = "readable";
    return loaded;
  } catch {
    return fallback;
  }
}

function canSaveLocalData(key) {
  const state = localDataState.get(key);
  const readable = state?.status === "missing" || state?.status === "readable";
  // Partial custom-space loading cannot establish that dependent data is complete.
  const dependsOnSpaces = key === spaceGoalsStorageKey || key === resetSessionStorageKey;
  return readable && (!dependsOnSpaces || canSaveLocalData(customSpacesStorageKey));
}

function checkLocalDataWrite(key) {
  const state = localDataState.get(key);
  if (!canSaveLocalData(key)) {
    throw new Error("Existing Reset data could not be loaded safely. Reload before saving changes.");
  }
  // A different tab or a newly inaccessible store must not be overwritten either.
  let current;
  try {
    current = localStorage.getItem(key);
  } catch (error) {
    state.status = "unreadable";
    throw error;
  }
  if (current !== state.raw) {
    state.status = "invalid";
    throw new Error("Saved Reset data has changed. Reload before saving changes.");
  }
  return state;
}

function writeLocalData(key, value) {
  writeLocalDataRaw(key, value === null ? null : JSON.stringify(value));
}

function writeLocalDataRaw(key, raw) {
  const state = checkLocalDataWrite(key);
  if (raw === null) localStorage.removeItem(key);
  else localStorage.setItem(key, raw);
  state.raw = raw;
  state.status = raw === null ? "missing" : "readable";
}

let resetSchedules = loadLocalData(resetScheduleStorageKey, [], parsed =>
  Array.isArray(parsed) ? parsed.filter(isValidScheduleItem) : [], parsed =>
  Array.isArray(parsed) && parsed.every(isValidScheduleItem)
    && new Set(parsed.map(item => item.id)).size === parsed.length);
let saved = loadLocalData(storageKey, {}, parsed => isPlainRecord(parsed) ? parsed : {}, parsed =>
  isPlainRecord(parsed) && Object.entries(parsed).every(([key, done]) =>
    !["__proto__", "prototype", "constructor"].includes(key) && typeof done === "boolean"));

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

let customSpaces = loadLocalData(customSpacesStorageKey, [], parsed => Array.isArray(parsed) ? parsed
  .filter(space => space && typeof space.id === "string" && typeof space.name === "string"
    && categories.some(category => category.id === space.category) && Array.isArray(space.tasks))
  .map(space => ({
    id: space.id,
    name: space.name.slice(0, 60),
    category: space.category,
    description: "A space you created, with a checklist made for you.",
    emoji: "✳",
    tasks: space.tasks.filter(task => task && typeof task.text === "string" && task.text.trim())
      .map(task => ({ id: typeof task.id === "string" ? task.id : createId("task"), text: task.text.trim().slice(0, 160), done: Boolean(task.done) }))
  })) : [], parsed => {
    if (!Array.isArray(parsed)) return false;
    const ids = new Set(rooms.map(room => room.id));
    return parsed.every(space => {
      if (!space || !space.id || ids.has(space.id) || !space.name?.trim() || !space.tasks?.length) return false;
      ids.add(space.id);
      const taskIds = space.tasks.map(task => task?.id);
      return taskIds.every(id => typeof id === "string" && id.length > 0)
        && new Set(taskIds).size === taskIds.length;
    });
  });

let spaceGoals = loadLocalData(spaceGoalsStorageKey, {}, parsed => {
  if (!isPlainRecord(parsed)) return {};
  const validSpaceIds = new Set([...rooms, ...customSpaces].map(space => space.id));
  return Object.fromEntries(Object.entries(parsed)
    .filter(([spaceId, goal]) => validSpaceIds.has(spaceId) && typeof goal === "string" && goal.trim())
    .map(([spaceId, goal]) => [spaceId, goal.trim().slice(0, 160)]));
}, isPlainRecord);

const allowedSessionDurations = [10, 15, 30];
let resetSession = loadLocalData(resetSessionStorageKey, null, parsed => {
  const validSpaceIds = new Set([...rooms, ...customSpaces].map(space => space.id));
  if (isPlainRecord(parsed) && validSpaceIds.has(parsed.spaceId)
      && allowedSessionDurations.includes(parsed.durationMinutes)) {
    if (parsed.status === "running" && Number.isFinite(parsed.endAt) && parsed.endAt > 0) {
      return { spaceId: parsed.spaceId, durationMinutes: parsed.durationMinutes, status: "running", endAt: parsed.endAt };
    }
    if (parsed.status === "paused" && Number.isFinite(parsed.remainingMs)) {
      return { spaceId: parsed.spaceId, durationMinutes: parsed.durationMinutes, status: "paused",
        remainingMs: Math.min(parsed.durationMinutes * 60 * 1000, Math.max(0, parsed.remainingMs)) };
    }
    if (parsed.status === "completed") {
      return { spaceId: parsed.spaceId, durationMinutes: parsed.durationMinutes, status: "completed" };
    }
  }
  return null;
}, parsed => parsed === null || (isPlainRecord(parsed)
  && (parsed.status !== "paused" || parsed.remainingMs > 0)));

let currentCategory = "home";
let currentRoom = "kitchen";
let goalEditorSpaceId = null;
let selectedSessionDuration = 10;
let sessionTicker = null;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function allSpaces() {
  return [...rooms.map(room => ({ ...room, isCustom: false })), ...customSpaces.map(space => ({ ...space, isCustom: true }))];
}

function getSpace(spaceId) {
  const room = rooms.find(item => item.id === spaceId);
  if (room) return { ...room, isCustom: false };
  const customSpace = customSpaces.find(item => item.id === spaceId);
  return customSpace ? { ...customSpace, isCustom: true } : null;
}

function isValidScheduleItem(item) {
  return isPlainRecord(item) && typeof item.id === "string" && item.id.length > 0 && item.id.length <= 200
    && typeof item.spaceId === "string" && item.spaceId.length > 0 && item.spaceId.length <= 200
    && typeof item.spaceName === "string" && item.spaceName.length > 0 && item.spaceName.length <= 60
    && typeof item.scheduledAt === "string" && Number.isFinite(Date.parse(item.scheduledAt))
    && new Date(item.scheduledAt).toISOString() === item.scheduledAt
    && (item.durationMinutes === null || [10, 15, 30].includes(item.durationMinutes))
    && ["scheduled", "completed"].includes(item.status);
}

function saveResetSchedules(schedules = resetSchedules) {
  try {
    writeLocalData(resetScheduleStorageKey, schedules);
    localSaveFailures.delete(resetScheduleStorageKey);
    updateLocalSaveWarning();
  } catch (error) {
    localSaveFailures.add(resetScheduleStorageKey);
    updateLocalSaveWarning();
    throw error;
  }
}

function renderSchedule() {
  const list = $("#scheduleList");
  if (!list) return;
  const ordered = [...resetSchedules].sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed")
    || Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  list.replaceChildren(...ordered.map(item => {
    const space = getSpace(item.spaceId);
    const name = space?.name || `${item.spaceName} (space deleted)`;
    const date = new Date(item.scheduledAt);
    const card = document.createElement("article");
    card.className = `schedule-item${item.status === "completed" ? " completed" : ""}`;
    const main = document.createElement("div"); main.className = "schedule-item-main";
    const title = document.createElement("h3"); title.textContent = name;
    const detail = document.createElement("p"); detail.textContent = `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })} · ${item.durationMinutes ? `${item.durationMinutes} minutes` : "Duration not set"}`;
    const status = document.createElement("span"); status.className = "schedule-status"; status.textContent = item.status === "completed" ? "Completed" : "Upcoming";
    main.append(title, detail, status);
    const manage = document.createElement("details"); manage.className = "schedule-manage";
    const manageSummary = document.createElement("summary"); manageSummary.textContent = "Manage";
    const actions = document.createElement("div"); actions.className = "schedule-item-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Edit"; edit.dataset.scheduleAction = "edit"; edit.dataset.scheduleId = item.id; actions.append(edit);
    if (item.status !== "completed") {
      const complete = document.createElement("button"); complete.type = "button"; complete.textContent = "Mark complete"; complete.dataset.scheduleAction = "complete"; complete.dataset.scheduleId = item.id; actions.append(complete);
    }
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "schedule-delete"; remove.textContent = "Delete"; remove.dataset.scheduleAction = "delete"; remove.dataset.scheduleId = item.id; actions.append(remove);
    manage.append(manageSummary, actions);
    card.append(main, manage); return card;
  }));
}

function isDone(room, taskIndex) {
  return room.isCustom ? Boolean(room.tasks[taskIndex]?.done) : Boolean(saved[`${room.id}-${taskIndex}`]);
}

function completedCount(room) {
  return room.tasks.reduce((total, _, index) => total + Number(isDone(room, index)), 0);
}

function updateLocalSaveWarning() {
  const warning = $("#localSaveWarning");
  if (!warning) return;
  const labels = new Map([
    [storageKey, "Checklist progress"], [customSpacesStorageKey, "Custom spaces"],
    [spaceGoalsStorageKey, "Goals"], [resetSessionStorageKey, "Reset Session"],
    [resetScheduleStorageKey, "Scheduled resets"]
  ]);
  warning.hidden = localSaveFailures.size === 0;
  const retryMessage = [...localSaveFailures].some(key => !canSaveLocalData(key))
    ? "Saving is paused on this page to protect existing data."
    : "Try your change again.";
  const message = localRestoreIncomplete
    ? "Restore could not be completed. Some saved data may have changed. Keep this page open and do not reload. Further changes to the affected data cannot be saved."
    : localDeletionIncomplete
    ? "The space could not be deleted completely. Some saved data may have changed. Keep this page open and do not reload; the space is still shown here. Further changes to the affected data cannot be saved."
    : localSaveFailures.size
      ? `${[...localSaveFailures].map(key => labels.get(key)).join(", ")} could not be saved on this device. ${retryMessage} Any unsaved progress shown here is only on this page and may be lost if you reload or close it. Backups include saved data only.`
      : "";
  // Avoid repeating live-region announcements every time the timer renders.
  if (warning.textContent !== message) warning.textContent = message;
}

function saveLocalData(key, value) {
  try {
    writeLocalData(key, value);
    localSaveFailures.delete(key);
    updateLocalSaveWarning();
    return true;
  } catch {
    localSaveFailures.add(key);
    updateLocalSaveWarning();
    return false;
  }
}

function saveCustomSpaces() {
  return saveLocalData(customSpacesStorageKey, customSpaces);
}

function saveProgress() {
  // Keep old and unknown keys intact; only the task the customer changed is updated.
  return saveLocalData(storageKey, saved);
}

function saveSpaceGoals() {
  return saveLocalData(spaceGoalsStorageKey, spaceGoals);
}

function saveResetSession() {
  return saveLocalData(resetSessionStorageKey, resetSession);
}

function deleteCustomSpaceData(spaceId) {
  if (!customSpaces.some(space => space.id === spaceId)) return false;
  const nextSpaces = customSpaces.filter(space => space.id !== spaceId);
  const nextGoals = { ...spaceGoals };
  delete nextGoals[spaceId];
  const endsSession = resetSession?.spaceId === spaceId;
  // Save the parent last. Do not publish the deletion in memory until every save succeeds.
  const changes = [];
  if (Object.prototype.hasOwnProperty.call(spaceGoals, spaceId)) changes.push([spaceGoalsStorageKey, nextGoals]);
  if (endsSession) changes.push([resetSessionStorageKey, null]);
  changes.push([customSpacesStorageKey, nextSpaces]);
  const deletionKeys = [customSpacesStorageKey, spaceGoalsStorageKey, resetSessionStorageKey];
  const previous = new Map();
  const written = [];
  try {
    // Check every affected key before making any changes, retaining Step 2 protections.
    for (const key of deletionKeys) {
      previous.set(key, checkLocalDataWrite(key).raw);
    }
    for (const [key, value] of changes) {
      writeLocalData(key, value);
      written.push([key, localDataState.get(key).raw]);
    }
  } catch {
    let rollbackFailed = false;
    for (const [key, writtenRaw] of written.reverse()) {
      try {
        // Never replace a different tab's intervening change during rollback.
        if (localStorage.getItem(key) !== writtenRaw) throw new Error("Reset data changed during deletion.");
        const raw = previous.get(key);
        if (raw === null) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
        const state = localDataState.get(key);
        state.raw = raw;
        state.status = raw === null ? "missing" : "readable";
      } catch {
        rollbackFailed = true;
      }
    }
    for (const key of deletionKeys) {
      if (rollbackFailed) localDataState.get(key).status = "invalid";
      if (!canSaveLocalData(key) || changes.some(([changedKey]) => changedKey === key)) localSaveFailures.add(key);
    }
    if (rollbackFailed) localDeletionIncomplete = true;
    updateLocalSaveWarning();
    return false;
  }
  customSpaces = nextSpaces;
  spaceGoals = nextGoals;
  if (endsSession) resetSession = null;
  for (const [key] of changes) localSaveFailures.delete(key);
  updateLocalSaveWarning();
  return true;
}

function updateProgressbar(element, percent) {
  if (!element) return;
  element.style.width = `${percent}%`;
  element.parentElement?.setAttribute("aria-valuenow", String(percent));
}

function categoryRooms(categoryId) {
  return allSpaces().filter(room => room.category === categoryId);
}

function categoryProgress(categoryId) {
  const group = categoryRooms(categoryId);
  const complete = group.reduce((total, room) => total + completedCount(room), 0);
  const possible = group.reduce((total, room) => total + room.tasks.length, 0);
  return { complete, possible, percent: possible ? Math.round((complete / possible) * 100) : 0 };
}

function renderDashboard() {
  const spaces = allSpaces();
  const complete = spaces.reduce((total, room) => total + completedCount(room), 0);
  const possible = spaces.reduce((total, room) => total + room.tasks.length, 0);
  const percent = possible ? Math.round((complete / possible) * 100) : 0;

  $("#overall").textContent = `${percent}%`;
  updateProgressbar($("#overallbar"), percent);
  $("#activeSpaces").textContent = spaces.filter(room => {
    const count = completedCount(room);
    return count > 0 && count < room.tasks.length;
  }).length;
  $("#spaceTotal").textContent = `Across all ${spaces.length} spaces in 3 categories.`;

  $("#categoryCards").replaceChildren(...categories.map(category => {
    const group = categoryRooms(category.id);
    const progress = categoryProgress(category.id);
    const card = document.createElement("article");
    card.className = "room-card";

    const top = document.createElement("div");
    top.className = "room-card-top";
    const marker = document.createElement("span");
    marker.className = "room-emoji";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = category.id === "home" ? "🏘️" : category.id === "outdoor" ? "🌿" : "✏️";
    const count = document.createElement("span");
    count.className = "room-card-count";
    count.textContent = `${group.length} spaces`;
    top.append(marker, count);

    const title = document.createElement("h3");
    title.textContent = category.name;
    const description = document.createElement("p");
    description.textContent = `${progress.complete} of ${progress.possible} steps completed`;
    const barTrack = document.createElement("div");
    barTrack.className = "progress-track";
    barTrack.setAttribute("role", "progressbar");
    barTrack.setAttribute("aria-label", `${category.name} progress`);
    barTrack.setAttribute("aria-valuemin", "0");
    barTrack.setAttribute("aria-valuemax", "100");
    barTrack.setAttribute("aria-valuenow", String(progress.percent));
    const bar = document.createElement("div");
    bar.style.width = `${progress.percent}%`;
    barTrack.append(bar);

    const explore = document.createElement("button");
    explore.className = "room-card-action";
    explore.type = "button";
    explore.innerHTML = "Open My Reset <span aria-hidden=\"true\">→</span>";
    explore.addEventListener("click", () => openCategory(category.id));

    card.append(top, title, description, barTrack, explore);
    return card;
  }));
}

function renderCategoryTabs() {
  $("#categoryTabs").replaceChildren(...categories.map(category => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(category.id === currentCategory));
    tab.classList.toggle("active", category.id === currentCategory);
    tab.textContent = category.name;
    tab.addEventListener("click", () => selectCategory(category.id));
    return tab;
  }));
}

function renderSpaceCards() {
  const group = categoryRooms(currentCategory);
  $("#spaceCards").replaceChildren(...group.map(room => {
    const count = completedCount(room);
    const percent = room.tasks.length ? Math.round((count / room.tasks.length) * 100) : 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "space-choice";
    card.classList.toggle("active", room.id === currentRoom);
    card.setAttribute("aria-pressed", String(room.id === currentRoom));

    const top = document.createElement("span");
    top.className = "space-choice-top";
    const emoji = document.createElement("span");
    emoji.className = "room-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = room.emoji;
    const status = document.createElement("span");
    status.className = "space-choice-count";
    status.textContent = `${count}/${room.tasks.length}`;
    top.append(emoji, status);

    const name = document.createElement("strong");
    name.textContent = room.name;
    const track = document.createElement("span");
    track.className = "progress-track";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.style.display = "block";
    bar.style.width = `${percent}%`;
    bar.style.height = "100%";
    bar.style.borderRadius = "inherit";
    bar.style.background = "var(--sage)";
    track.append(bar);

    card.append(top, name, track);
    card.addEventListener("click", () => {
      currentRoom = room.id;
      renderRoom();
    });
    return card;
  }));
}

function selectCategory(categoryId) {
  if (!categories.some(category => category.id === categoryId)) return;
  currentCategory = categoryId;
  if (!categoryRooms(categoryId).some(room => room.id === currentRoom)) {
    currentRoom = categoryRooms(categoryId)[0].id;
  }
  renderRoom();
}

function openCategory(categoryId) {
  currentCategory = categoryId;
  const group = categoryRooms(categoryId);
  if (group.length && !group.some(room => room.id === currentRoom)) currentRoom = group[0].id;
  showView("rooms");
}

function renderRoom() {
  renderSchedule();
  const room = getSpace(currentRoom) || rooms[0];
  if (goalEditorSpaceId && goalEditorSpaceId !== room.id) goalEditorSpaceId = null;
  currentRoom = room.id;
  currentCategory = room.category;
  renderCategoryTabs();
  renderSpaceCards();

  $("#roomTitle").textContent = `${room.emoji} ${room.name}`;
  $("#roomDescription").textContent = room.description;
  renderGoal(room);
  renderResetSession(room);
  $("#customSpaceControls").hidden = !room.isCustom;
  $("#tasks").replaceChildren(...room.tasks.map((task, index) => {
    const row = document.createElement("div");
    row.className = "task";
    const id = `task-${room.id}-${index}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = isDone(room, index);
    checkbox.addEventListener("change", () => {
      let persisted;
      if (room.isCustom) {
        const customSpace = customSpaces.find(item => item.id === room.id);
        if (customSpace?.tasks[index]) customSpace.tasks[index].done = checkbox.checked;
        persisted = saveCustomSpaces();
      } else {
        saved[`${room.id}-${index}`] = checkbox.checked;
        persisted = saveProgress();
      }
      if (!persisted) checkbox.setAttribute("aria-describedby", "localSaveWarning");
      else checkbox.removeAttribute("aria-describedby");
      refreshProgress();
    });
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = room.isCustom ? task.text : task;
    row.append(checkbox, label);
    return row;
  }));
  refreshRoomProgress();
}

function renderGoal(space) {
  const goalArea = $("#goalArea");
  const goal = spaceGoals[space.id] || "";
  goalArea.replaceChildren();

  if (goalEditorSpaceId === space.id) {
    const form = document.createElement("form");
    form.className = "goal-editor";
    const label = document.createElement("label");
    label.className = "goal-editor-label";
    label.htmlFor = "spaceGoalInput";
    label.textContent = "My Goal";
    const textarea = document.createElement("textarea");
    textarea.id = "spaceGoalInput";
    textarea.maxLength = 160;
    textarea.required = true;
    textarea.rows = 2;
    textarea.placeholder = "What would you like to achieve in this space?";
    textarea.value = goal;
    const actions = document.createElement("div");
    actions.className = "goal-actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "button button-dark goal-save";
    save.textContent = "Save goal";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "text-link";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => {
      goalEditorSpaceId = null;
      renderGoal(space);
    });
    actions.append(save, cancel);
    const status = document.createElement("p");
    status.className = "form-status error";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.append(label, textarea, actions, status);
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const value = textarea.value.trim();
      if (!value) {
        textarea.setCustomValidity("Please enter a short goal.");
        textarea.reportValidity();
        textarea.addEventListener("input", () => textarea.setCustomValidity(""), { once: true });
        return;
      }
      const previousGoals = spaceGoals;
      spaceGoals = { ...spaceGoals, [space.id]: value };
      if (!saveSpaceGoals()) {
        spaceGoals = previousGoals;
        status.textContent = "Your goal could not be saved. Your draft is still here; try saving again.";
        return;
      }
      goalEditorSpaceId = null;
      renderGoal(space);
    });
    goalArea.append(form);
    window.setTimeout(() => textarea.focus(), 0);
    return;
  }

  if (!goal) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "text-link goal-add-button";
    add.setAttribute("aria-label", `Add a goal for ${space.name}`);
    add.textContent = "+ Add a goal";
    add.addEventListener("click", () => {
      goalEditorSpaceId = space.id;
      renderGoal(space);
    });
    goalArea.append(add);
    return;
  }

  const savedGoal = document.createElement("div");
  savedGoal.className = "saved-goal";
  const label = document.createElement("span");
  label.className = "saved-goal-label";
  label.textContent = "MY GOAL";
  const text = document.createElement("p");
  text.className = "saved-goal-text";
  text.textContent = goal;
  const actions = document.createElement("div");
  actions.className = "goal-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "text-link";
  edit.textContent = "Edit goal";
  edit.addEventListener("click", () => {
    goalEditorSpaceId = space.id;
    renderGoal(space);
  });
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "text-link goal-remove-button";
  remove.textContent = "Remove goal";
  remove.addEventListener("click", () => {
    if (!window.confirm(`Remove your goal for ${space.name}?`)) return;
    const previousGoals = spaceGoals;
    spaceGoals = { ...spaceGoals };
    delete spaceGoals[space.id];
    if (!saveSpaceGoals()) spaceGoals = previousGoals;
    renderGoal(space);
  });
  actions.append(edit, remove);
  savedGoal.append(label, text, actions);
  goalArea.append(savedGoal);
}

function sessionRemainingMs(session = resetSession) {
  if (!session) return 0;
  if (session.status === "running") return Math.max(0, session.endAt - Date.now());
  if (session.status === "paused") return Math.max(0, session.remainingMs);
  return 0;
}

function formatSessionTime(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
}

function sessionTimeLabel(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  return `${minutesPart} minute${minutesPart === 1 ? "" : "s"} and ${secondsPart} second${secondsPart === 1 ? "" : "s"} remaining`;
}

function setSessionState(nextState) {
  const previousSession = resetSession;
  resetSession = nextState;
  const persisted = saveResetSession();
  // A failed End/Done must leave the controls available to retry the removal.
  if (!persisted && nextState === null && getSpace(previousSession?.spaceId)) resetSession = previousSession;
  // Timers remain usable in memory; renderResetSession labels unsaved state.
  syncSessionTicker();
  renderResetSession(getSpace(currentRoom) || rooms[0]);
  return persisted;
}

function makeSessionButton(text, className, action, label = text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", action);
  return button;
}

function renderResetSession(space) {
  let sessionPersisted = !localSaveFailures.has(resetSessionStorageKey);
  if (resetSession?.status === "running" && sessionRemainingMs() <= 0) {
    resetSession = { spaceId: resetSession.spaceId, durationMinutes: resetSession.durationMinutes, status: "completed" };
    sessionPersisted = saveResetSession();
    syncSessionTicker();
  } else if (resetSession?.status === "paused" && resetSession.remainingMs <= 0) {
    resetSession = { spaceId: resetSession.spaceId, durationMinutes: resetSession.durationMinutes, status: "completed" };
    sessionPersisted = saveResetSession();
  }
  const area = $("#resetSessionArea");
  if (!sessionPersisted) area.setAttribute("aria-describedby", "localSaveWarning");
  else area.removeAttribute("aria-describedby");
  area.replaceChildren();
  const section = document.createElement("section");
  section.className = "reset-session";
  section.setAttribute("aria-labelledby", "resetSessionTitle");
  const title = document.createElement("h3");
  title.id = "resetSessionTitle";
  title.className = "reset-session-title";
  title.textContent = "Reset Session";
  section.append(title);

  if (!resetSession) {
    const prompt = document.createElement("p");
    prompt.className = "session-prompt";
    prompt.textContent = "Choose a little time to focus on this space.";
    const options = document.createElement("div");
    options.className = "session-duration-options";
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", "Choose session duration");
    for (const duration of allowedSessionDurations) {
      const option = makeSessionButton(`${duration} minutes`, "session-duration", () => {
        selectedSessionDuration = duration;
        for (const choice of options.children) {
          choice.setAttribute("aria-pressed", String(Number(choice.dataset.duration) === selectedSessionDuration));
        }
      });
      option.dataset.duration = String(duration);
      option.setAttribute("aria-pressed", String(duration === selectedSessionDuration));
      options.append(option);
    }
    const start = makeSessionButton("Start Session", "button button-dark session-start", () => {
      if (resetSession) return;
      const startedAt = Date.now();
      setSessionState({
        spaceId: space.id,
        durationMinutes: selectedSessionDuration,
        status: "running",
        endAt: startedAt + selectedSessionDuration * 60 * 1000
      });
    });
    section.append(prompt, options, start);
  } else {
    const sessionSpace = getSpace(resetSession.spaceId);
    if (!sessionSpace) {
      setSessionState(null);
      return;
    }
    const details = document.createElement("p");
    details.className = "session-details";
    details.textContent = `${resetSession.durationMinutes}-minute session for ${sessionSpace.name}`;
    const countdown = document.createElement("div");
    countdown.className = "session-countdown";
    countdown.setAttribute("role", "timer");
    countdown.setAttribute("aria-live", "off");
    const actions = document.createElement("div");
    actions.className = "session-controls";

    if (resetSession.status === "running") {
      const remaining = sessionRemainingMs();
      countdown.textContent = formatSessionTime(remaining);
      countdown.setAttribute("aria-label", sessionTimeLabel(remaining));
      actions.append(
        makeSessionButton("Pause", "session-control", () => pauseResetSession()),
        makeSessionButton("End Session", "session-control session-end", () => setSessionState(null))
      );
    } else if (resetSession.status === "paused") {
      const remaining = sessionRemainingMs();
      countdown.textContent = formatSessionTime(remaining);
      countdown.setAttribute("aria-label", `Paused, ${sessionTimeLabel(remaining)}`);
      const paused = document.createElement("p");
      paused.className = "session-message";
      paused.setAttribute("role", "status");
      paused.textContent = `Paused${sessionSpace.id === space.id ? "" : ` · This session belongs to ${sessionSpace.name}`}`;
      actions.append(
        makeSessionButton("Resume", "session-control session-resume", () => resumeResetSession()),
        makeSessionButton("End Session", "session-control session-end", () => setSessionState(null))
      );
      section.append(details, countdown, paused, actions);
      area.append(section);
      return;
    } else {
      countdown.textContent = "00:00";
      countdown.setAttribute("aria-label", "Session complete");
      const completed = document.createElement("p");
      completed.className = "session-message session-completed";
      completed.setAttribute("role", "status");
      completed.textContent = `Lovely work! Every little reset counts. This session was for ${sessionSpace.name}.`;
      actions.append(makeSessionButton("Done", "session-control session-resume", () => setSessionState(null)));
      section.append(details, countdown, completed, actions);
      area.append(section);
      return;
    }

    if (sessionSpace.id !== space.id) {
      const belongs = document.createElement("p");
      belongs.className = "session-message";
      belongs.textContent = `This session belongs to ${sessionSpace.name}.`;
      section.append(details, belongs, countdown, actions);
    } else {
      section.append(details, countdown, actions);
    }
  }

  area.append(section);
}

function pauseResetSession() {
  if (!resetSession || resetSession.status !== "running") return;
  const remainingMs = sessionRemainingMs();
  if (remainingMs <= 0) {
    completeResetSession();
    return;
  }
  setSessionState({
    spaceId: resetSession.spaceId,
    durationMinutes: resetSession.durationMinutes,
    status: "paused",
    remainingMs
  });
}

function resumeResetSession() {
  if (!resetSession || resetSession.status !== "paused") return;
  const remainingMs = sessionRemainingMs();
  if (remainingMs <= 0) {
    completeResetSession();
    return;
  }
  setSessionState({
    spaceId: resetSession.spaceId,
    durationMinutes: resetSession.durationMinutes,
    status: "running",
    endAt: Date.now() + remainingMs
  });
}

function completeResetSession() {
  if (!resetSession) return;
  setSessionState({
    spaceId: resetSession.spaceId,
    durationMinutes: resetSession.durationMinutes,
    status: "completed"
  });
}

function updateSessionCountdown() {
  if (!resetSession || resetSession.status !== "running") return;
  const remainingMs = sessionRemainingMs();
  if (remainingMs <= 0) {
    completeResetSession();
    return;
  }
  const countdown = $(".session-countdown");
  if (countdown) {
    countdown.textContent = formatSessionTime(remainingMs);
    countdown.setAttribute("aria-label", sessionTimeLabel(remainingMs));
  }
}

function syncSessionTicker() {
  if (sessionTicker) window.clearInterval(sessionTicker);
  sessionTicker = null;
  if (resetSession?.status === "running") {
    sessionTicker = window.setInterval(updateSessionCountdown, 1000);
  }
}

function refreshRoomProgress() {
  const room = getSpace(currentRoom) || rooms[0];
  const count = completedCount(room);
  const percent = room.tasks.length ? Math.round((count / room.tasks.length) * 100) : 0;
  $("#roomPercent").textContent = `${percent}%`;
  $("#roomCount").textContent = `${count} of ${room.tasks.length} completed`;
  updateProgressbar($("#roombar"), percent);
  $("#roomProgressText").textContent = count === room.tasks.length
    ? "Lovely work. This space is complete!"
    : count > 0
      ? "Each task is a fresh start. Keep going at your pace."
      : "Each task is a fresh start.";
}

function refreshProgress() {
  renderDashboard();
  renderSpaceCards();
  refreshRoomProgress();
}

const spaceDialog = $("#spaceDialog");
const customSpaceForm = $("#customSpaceForm");
const customTaskFields = $("#customTaskFields");
let editingSpaceId = null;

function addCustomTaskField(task = null, taskNumber = customTaskFields.children.length + 1) {
  const row = document.createElement("div");
  row.className = "custom-task-entry";
  if (task?.id) row.dataset.taskId = task.id;
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 160;
  input.required = true;
  input.placeholder = "For example, sort one shelf";
  input.value = task?.text || "";
  input.setAttribute("aria-label", `Checklist task ${taskNumber}`);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-task-button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove checklist task ${taskNumber}`);
  remove.addEventListener("click", () => row.remove());
  row.append(input, remove);
  customTaskFields.append(row);
}

function openSpaceDialog(space = null) {
  editingSpaceId = space?.id || null;
  customSpaceForm.reset();
  customTaskFields.replaceChildren();
  $("#customSpaceStatus").textContent = "";
  $("#spaceDialogTitle").textContent = space ? "Edit Your Space" : "Add Your Own Space";
  $("#saveCustomSpace").textContent = space ? "Save changes" : "Create space";
  $("#customSpaceName").value = space?.name || "";
  const categorySelect = $("#customSpaceCategory");
  categorySelect.replaceChildren(...categories.map(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    option.selected = category.id === (space?.category || currentCategory);
    return option;
  }));
  if (space) space.tasks.forEach((task, index) => addCustomTaskField(task, index + 1));
  else addCustomTaskField();
  spaceDialog.showModal();
  window.setTimeout(() => $("#customSpaceName").focus(), 50);
}

$("#addSpaceButton").addEventListener("click", () => openSpaceDialog());
$("#editCustomSpace").addEventListener("click", () => {
  const space = customSpaces.find(item => item.id === currentRoom);
  if (space) openSpaceDialog(space);
});
$("#addCustomTask").addEventListener("click", () => addCustomTaskField());
$("#closeSpaceDialog").addEventListener("click", () => spaceDialog.close());
$("#cancelSpaceDialog").addEventListener("click", () => spaceDialog.close());

customSpaceForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!customSpaceForm.reportValidity()) return;
  const taskRows = [...customTaskFields.querySelectorAll(".custom-task-entry")];
  if (!taskRows.length) {
    $("#customSpaceStatus").textContent = "Add at least one checklist task to create your space.";
    return;
  }
  const existingSpace = customSpaces.find(space => space.id === editingSpaceId);
  const tasks = taskRows.map(row => {
    const oldTask = existingSpace?.tasks.find(task => task.id === row.dataset.taskId);
    return {
      id: oldTask?.id || createId("task"),
      text: row.querySelector("input").value.trim(),
      done: oldTask?.done || false
    };
  });
  if (tasks.some(task => !task.text)) {
    $("#customSpaceStatus").textContent = "Please fill in each task, or remove any empty task rows.";
    return;
  }
  const category = $("#customSpaceCategory").value;
  const name = $("#customSpaceName").value.trim();
  if (!name) {
    $("#customSpaceStatus").textContent = "Please enter a name for your space.";
    $("#customSpaceName").focus();
    return;
  }
  const previousSpaces = customSpaces;
  const editedSpace = existingSpace
    ? { ...existingSpace, name, category, tasks }
    : { id: createId("space"), name, category,
      description: "A space you created, with a checklist made for you.", emoji: "✳", tasks };
  customSpaces = existingSpace
    ? customSpaces.map(space => space.id === existingSpace.id ? editedSpace : space)
    : [...customSpaces, editedSpace];
  if (!saveCustomSpaces()) {
    customSpaces = previousSpaces;
    $("#customSpaceStatus").textContent = "Your space could not be saved. Your draft is still here; try saving again.";
    return;
  }
  currentRoom = editedSpace.id;
  currentCategory = category;
  spaceDialog.close();
  renderDashboard();
  renderRoom();
});

$("#deleteCustomSpace").addEventListener("click", () => {
  const space = customSpaces.find(item => item.id === currentRoom);
  if (!space || !window.confirm(`Delete “${space.name}” and its checklist? This cannot be undone.`)) return;
  if (!deleteCustomSpaceData(space.id)) return;
  syncSessionTicker();
  currentRoom = categoryRooms(currentCategory)[0]?.id || rooms[0].id;
  renderDashboard();
  renderRoom();
});

let currentViewId = "home";
let settingsReturnView = "home";
let aboutFromSettings = false;

function showView(viewId) {
  const view = document.getElementById(viewId);
  if (!view || !view.classList.contains("view")) return;

  const returningFromAccount = viewId === "settings" && currentViewId === "account";
  // Returning from a Settings entry keeps Settings' original Back destination.
  if (viewId === "settings" && currentViewId !== "settings"
      && !(currentViewId === "about" && aboutFromSettings)
      && currentViewId !== "account") settingsReturnView = currentViewId;
  if (viewId === "about") aboutFromSettings = currentViewId === "settings";
  $("#aboutSettingsReturn").hidden = !(viewId === "about" && aboutFromSettings);
  currentViewId = viewId;

  $$(".view").forEach(section => {
    section.hidden = section.id !== viewId;
  });
  $$('[data-view]').forEach(button => {
    const active = button.dataset.view === viewId;
    button.classList.toggle("active", active);
    if (button.matches(".topnav button")) {
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  });

  if (viewId === "tips") showTipsCollection();
  if (viewId === "rooms") renderRoom();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewId === "account") document.getElementById("account-title").focus();
  if (returningFromAccount) $("#openAccount").focus();
}

$("#openSettings").addEventListener("click", () => showView("settings"));
$("#settingsBack").addEventListener("click", () => showView(settingsReturnView));

$$('[data-view]').forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    showView(button.dataset.view);
  });
});

$$('[data-go]').forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.go));
});

$$('[data-category]').forEach(button => {
  button.addEventListener("click", () => {
    const category = categories.find(item => item.id === button.dataset.category);
    if (!category) return;
    $("#space").value = category.name;
    showView("request");
  });
});

$("#requestSpaceReset").addEventListener("click", () => {
  const room = getSpace(currentRoom);
  if (!room) return;

  const category = categories.find(item => item.id === room.category);
  if (!category) return;

  $("#space").value = category.name;
  const detailsField = $("#details");
  const contextLine = `Space: ${room.name}`;
  const existingLines = detailsField.value.split(/\r?\n/).map(line => line.trim());
  if (!existingLines.includes(contextLine)) {
    const existingMessage = detailsField.value.trimEnd();
    detailsField.value = existingMessage
      ? `${existingMessage}\n\n${contextLine}`
      : contextLine;
  }

  showView("request");
});

$("#clearRoom").addEventListener("click", () => {
  const room = getSpace(currentRoom);
  if (!room || !window.confirm(`Clear completed tasks for ${room.name}?`)) return;

  if (room.isCustom) {
    const previousSpaces = customSpaces;
    customSpaces = customSpaces.map(space => space.id === room.id
      ? { ...space, tasks: space.tasks.map(task => ({ ...task, done: false })) } : space);
    if (!saveCustomSpaces()) customSpaces = previousSpaces;
  } else {
    const previousProgress = saved;
    saved = { ...saved };
    room.tasks.forEach((_, index) => delete saved[`${room.id}-${index}`]);
    if (!saveProgress()) saved = previousProgress;
  }
  renderDashboard();
  renderRoom();
});

const requestForm = $("#requestForm");
const requestSubmit = requestForm.querySelector('[type="submit"]');
const formStatus = $("#formStatus");
const connectionStatus = $("#connectionStatus");
const submitButtonHTML = requestSubmit.innerHTML;
let submissionInProgress = false;

function showFormStatus(message, state = "") {
  formStatus.className = `form-status${state ? ` ${state}` : ""}`;
  formStatus.textContent = message;
}

function updateConnectionStatus() {
  const offline = !navigator.onLine;
  connectionStatus.hidden = !offline;
  connectionStatus.textContent = offline
    ? "You’re offline. Saved progress is still available, but Request a Reset enquiries need an internet connection."
    : "";
}

updateConnectionStatus();
window.addEventListener("offline", updateConnectionStatus);
window.addEventListener("online", updateConnectionStatus);

requestForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (submissionInProgress || !requestForm.reportValidity()) return;

  const nameField = $("#name");
  const emailField = $("#email");
  const detailsField = $("#details");
  if (!nameField.value.trim()) {
    showFormStatus("Please enter your name.", "error");
    nameField.focus();
    return;
  }
  if (!navigator.onLine) {
    updateConnectionStatus();
    showFormStatus("Your enquiry wasn’t sent because you’re offline. Your details are still here; reconnect and try again.", "error");
    return;
  }

  submissionInProgress = true;
  requestSubmit.disabled = true;
  requestForm.setAttribute("aria-busy", "true");
  requestSubmit.textContent = "Sending request…";
  showFormStatus("Sending your enquiry…");

  const formData = new FormData(requestForm);
  formData.set("name", nameField.value.trim());
  formData.set("email", emailField.value.trim());
  formData.set("message", detailsField.value.trim());

  try {
    const response = await fetch(formspreeEndpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Form submission failed (${response.status}).`);
    }

    requestForm.reset();
    showFormStatus("Thank you — your enquiry has been sent. We appreciate you getting in touch.", "success");
  } catch {
    if (!navigator.onLine) updateConnectionStatus();
    showFormStatus(navigator.onLine
      ? "We couldn’t send your enquiry just now. Your details are still here—please try again in a moment."
      : "Your enquiry wasn’t sent because you’re offline. Your details are still here; reconnect and try again.", "error");
  } finally {
    submissionInProgress = false;
    requestSubmit.disabled = false;
    requestForm.removeAttribute("aria-busy");
    requestSubmit.innerHTML = submitButtonHTML;
  }
});

const backupFormat = "resettable-my-reset-backup";
const backupVersion = 2;
const backupMaxBytes = 1024 * 1024;
const backupStorageKeys = [storageKey, customSpacesStorageKey, spaceGoalsStorageKey, resetSessionStorageKey, resetScheduleStorageKey];
const backupStatus = $("#backupRestoreStatus");
const restoreFileInput = $("#restoreFileInput");
let backupObjectUrl = null;

function setBackupStatus(message, isError = false, link = null) {
  backupStatus.replaceChildren();
  backupStatus.className = `backup-restore-status${isError ? " error" : ""}`;
  backupStatus.append(document.createTextNode(message));
  if (link) {
    backupStatus.append(document.createTextNode(" "));
    const fallbackLink = document.createElement("a");
    fallbackLink.href = link.href;
    fallbackLink.download = link.filename;
    fallbackLink.textContent = "Open or save the backup file";
    backupStatus.append(fallbackLink);
  }
}

function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function validateBackupData(data, version = backupVersion) {
  if (![1, backupVersion].includes(version)) throw new Error("This backup version is not supported by this app.");
  const requiredKeys = version === 1
    ? backupStorageKeys.filter(key => key !== resetScheduleStorageKey) : backupStorageKeys;
  if (!isPlainRecord(data)
      || requiredKeys.some(key => !Object.prototype.hasOwnProperty.call(data, key))
      || Object.keys(data).some(key => !backupStorageKeys.includes(key))) {
    throw new Error("This file is missing one or more Reset data sections.");
  }

  const progress = data[storageKey];
  if (!isPlainRecord(progress) || Object.keys(progress).length > 10000
      || Object.entries(progress).some(([key, done]) => !key || key.length > 200
        || ["__proto__", "prototype", "constructor"].includes(key) || typeof done !== "boolean")) {
    throw new Error("The checklist progress in this file is not valid.");
  }

  const spaces = data[customSpacesStorageKey];
  const categoryIds = new Set(categories.map(category => category.id));
  const fixedIds = new Set(rooms.map(room => room.id));
  if (!Array.isArray(spaces) || spaces.length > 100) {
    throw new Error("The custom spaces in this file are not valid.");
  }
  const spaceIds = new Set(fixedIds);
  for (const space of spaces) {
    if (!isPlainRecord(space) || Object.keys(space).some(key => !["id", "name", "category", "description", "emoji", "tasks"].includes(key))
        || typeof space.id !== "string" || !space.id || space.id.length > 200
        || spaceIds.has(space.id) || typeof space.name !== "string" || !space.name.trim() || space.name.length > 60
        || !categoryIds.has(space.category) || (space.description !== undefined
          && (typeof space.description !== "string" || space.description.length > 500))
        || (space.emoji !== undefined && (typeof space.emoji !== "string" || space.emoji.length > 40))
        || !Array.isArray(space.tasks) || space.tasks.length < 1 || space.tasks.length > 100) {
      throw new Error("A custom space in this file is incomplete or invalid.");
    }
    spaceIds.add(space.id);
    const taskIds = new Set();
    for (const task of space.tasks) {
      if (!isPlainRecord(task) || Object.keys(task).some(key => !["id", "text", "done"].includes(key))
          || (task.id !== undefined && (typeof task.id !== "string" || !task.id || task.id.length > 200 || taskIds.has(task.id)))
          || typeof task.text !== "string" || !task.text.trim() || task.text.length > 160
          || (task.done !== undefined && typeof task.done !== "boolean")) {
        throw new Error("A custom checklist task in this file is incomplete or invalid.");
      }
      if (task.id !== undefined) taskIds.add(task.id);
    }
  }

  const goals = data[spaceGoalsStorageKey];
  if (!isPlainRecord(goals) || Object.keys(goals).length > 200
      || Object.entries(goals).some(([spaceId, goal]) => !spaceIds.has(spaceId)
        || typeof goal !== "string" || !goal.trim() || goal.length > 160)) {
    throw new Error("The personal goals in this file are not valid for the included spaces.");
  }

  const session = data[resetSessionStorageKey];
  if (session !== null) {
    if (!isPlainRecord(session) || !spaceIds.has(session.spaceId)
        || ![10, 15, 30].includes(session.durationMinutes)
        || !["running", "paused", "completed"].includes(session.status)) {
      throw new Error("The Reset Session in this file is not valid.");
    }
    if (session.status === "running") {
      if (Object.keys(session).some(key => !["spaceId", "durationMinutes", "status", "endAt"].includes(key))
          || !Number.isFinite(session.endAt) || session.endAt <= 0) {
        throw new Error("The running session details in this file are not valid.");
      }
    } else if (session.status === "paused") {
      if (Object.keys(session).some(key => !["spaceId", "durationMinutes", "status", "remainingMs"].includes(key))
          || !Number.isFinite(session.remainingMs) || session.remainingMs <= 0
          || session.remainingMs > session.durationMinutes * 60 * 1000) {
        throw new Error("The paused session details in this file are not valid.");
      }
    } else if (Object.keys(session).some(key => !["spaceId", "durationMinutes", "status"].includes(key))) {
      throw new Error("The completed session details in this file are not valid.");
    }
  }
  const schedules = Object.prototype.hasOwnProperty.call(data, resetScheduleStorageKey) ? data[resetScheduleStorageKey] : [];
  if (!Array.isArray(schedules) || schedules.length > 1000) throw new Error("The scheduled resets in this file are not valid.");
  const scheduleIds = new Set();
  for (const item of schedules) {
    if (!isValidScheduleItem(item) || scheduleIds.has(item.id)) throw new Error("A scheduled reset in this file is incomplete or invalid.");
    scheduleIds.add(item.id);
  }
  return data;
}

function readSavedDataForBackup() {
  const defaults = {
    [storageKey]: {},
    [customSpacesStorageKey]: [],
    [spaceGoalsStorageKey]: {},
    [resetSessionStorageKey]: null,
    [resetScheduleStorageKey]: []
  };
  const data = {};
  for (const key of backupStorageKeys) {
    const storedValue = localStorage.getItem(key);
    try {
      data[key] = storedValue === null ? defaults[key] : JSON.parse(storedValue);
    } catch {
      throw new Error("Reset data on this device could not be read safely. Your saved data has not been changed.");
    }
  }
  return validateBackupData(data);
}

function backupTimestamp(value) {
  if (typeof value !== "string") throw new Error("This backup has an invalid creation date.");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("This backup has an invalid creation date.");
  return date;
}

function validateBackupFile(parsed) {
  if (!isPlainRecord(parsed) || parsed.format !== backupFormat) {
    throw new Error("This does not look like a Resettable My Reset backup.");
  }
  if (![1, backupVersion].includes(parsed.version)) {
    throw new Error("This backup version is not supported by this app.");
  }
  if (Object.keys(parsed).some(key => !["format", "version", "createdAt", "data"].includes(key))) {
    throw new Error("This backup contains unexpected data and can’t be restored.");
  }
  backupTimestamp(parsed.createdAt);
  return validateBackupData(parsed.data, parsed.version);
}

$("#backupDataButton").addEventListener("click", () => {
  try {
    const data = readSavedDataForBackup();
    const backup = {
      format: backupFormat,
      version: backupVersion,
      createdAt: new Date().toISOString(),
      data
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    if (blob.size > backupMaxBytes) throw new Error("This backup is larger than the supported 1 MB limit.");
    if (backupObjectUrl) URL.revokeObjectURL(backupObjectUrl);
    backupObjectUrl = URL.createObjectURL(blob);
    const filename = `resettable-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const downloadLink = document.createElement("a");
    downloadLink.href = backupObjectUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setBackupStatus("Your backup is ready. If it doesn’t download, open the link and use Share to save it to Files.", false, {
      href: backupObjectUrl,
      filename
    });
  } catch (error) {
    setBackupStatus(error instanceof Error ? error.message : "The backup could not be created.", true);
  }
});

$("#restoreDataButton").addEventListener("click", () => {
  restoreFileInput.value = "";
  restoreFileInput.click();
});

function restoreSavedData(data, version = backupVersion) {
  // Validate and serialize the complete input before checking or changing storage.
  validateBackupData(data, version);
  const restoreKeys = backupStorageKeys.filter(key => Object.prototype.hasOwnProperty.call(data, key));
  const nextValues = new Map(restoreKeys.map(key => [key, JSON.stringify(data[key])]));
  const previousValues = new Map();
  for (const key of restoreKeys) previousValues.set(key, { ...checkLocalDataWrite(key) });
  const written = [];
  try {
    for (const key of restoreKeys) {
      // Retain explicit JSON null in backups without bypassing the normal storage guards.
      writeLocalDataRaw(key, nextValues.get(key));
      written.push(key);
    }
    for (const key of restoreKeys) {
      if (localStorage.getItem(key) !== nextValues.get(key)) throw new Error("Restored data could not be verified.");
    }
  } catch {
    let rollbackFailed = false;
    for (const key of written.reverse()) {
      try {
        const previous = previousValues.get(key);
        const current = localStorage.getItem(key);
        if (current !== previous.raw) {
          // Roll back only this attempt's own writes, never an intervening change.
          if (current !== nextValues.get(key)) throw new Error("Reset data changed during restore.");
          if (previous.raw === null) localStorage.removeItem(key);
          else localStorage.setItem(key, previous.raw);
        }
        if (localStorage.getItem(key) !== previous.raw) throw new Error("Restore rollback could not be verified.");
        Object.assign(localDataState.get(key), previous);
      } catch {
        rollbackFailed = true;
      }
    }
    // Also check unwritten keys: another tab may have changed one after preflight.
    for (const key of restoreKeys) {
      try {
        if (localStorage.getItem(key) !== previousValues.get(key).raw) rollbackFailed = true;
      } catch {
        rollbackFailed = true;
      }
    }
    if (rollbackFailed) {
      // Keep the old in-memory view available, but do not let it overwrite mixed saved data.
      for (const key of restoreKeys) {
        localDataState.get(key).status = "invalid";
        localSaveFailures.add(key);
      }
      localRestoreIncomplete = true;
      updateLocalSaveWarning();
      throw new Error("Restore could not be completed. Your previous saved data could not be fully restored or verified. Some saved data may have changed. Keep this page open and do not reload. Further changes to the affected data cannot be saved.");
    }
    throw new Error(written.length
      ? "Restore could not be saved. The changes made by this restore were rolled back; your previous saved Reset data has been restored."
      : "Restore could not be saved. No data was changed by this restore.");
  }
  // The UI still shows the previous in-memory data until reload. Block stale writes in that gap.
  for (const key of restoreKeys) localDataState.get(key).status = "invalid";
  return true;
}

function restoreConfirmationMessage(data, createdAt) {
  const schedules = Object.prototype.hasOwnProperty.call(data, resetScheduleStorageKey)
    ? "Reset Schedules will also be replaced."
    : "This legacy backup has no schedule section. Existing Reset Schedules will be preserved exactly; some may refer to spaces replaced by this backup.";
  return `Restore the Reset data backed up ${createdAt}? This will replace checklist progress, custom spaces and their checklists, goals and the Reset Session on this device. ${schedules} No other browser data will be changed. Unsaved changes in replaced categories will be lost. A running session keeps its original end time and may already be complete; paused sessions stay paused.`;
}

restoreFileInput.addEventListener("change", async () => {
  const file = restoreFileInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > backupMaxBytes) throw new Error("This file is larger than the supported 1 MB limit.");
    const parsed = JSON.parse(await file.text());
    const data = validateBackupFile(parsed);
    const createdAt = backupTimestamp(parsed.createdAt).toLocaleString();
    const shouldRestore = window.confirm(restoreConfirmationMessage(data, createdAt));
    if (!shouldRestore) {
      setBackupStatus("Restore cancelled. Your current data has not been changed.");
      return;
    }
    if (restoreSavedData(data, parsed.version)) window.location.reload();
  } catch (error) {
    setBackupStatus(error instanceof Error ? error.message : "This backup could not be restored.", true);
  } finally {
    restoreFileInput.value = "";
  }
});

const scheduleDialog = $("#scheduleDialog");
const scheduleForm = $("#scheduleForm");
let editingScheduleId = null;
function localDateTimeValue(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function openScheduleEditor(item = null) {
  editingScheduleId = item?.id || null;
  const select = $("#scheduleSpace");
  const currentSelection = item?.spaceId || currentRoom;
  const spaceChoices = allSpaces();
  select.replaceChildren(...spaceChoices.map(space => {
    const option = document.createElement("option"); option.value = space.id; option.textContent = space.name; return option;
  }));
  if (item && !spaceChoices.some(space => space.id === item.spaceId)) {
    const option = document.createElement("option"); option.value = item.spaceId; option.textContent = `${item.spaceName} (space deleted)`; select.append(option);
  }
  select.value = currentSelection;
  $("#scheduleDateTime").value = item ? localDateTimeValue(item.scheduledAt) : "";
  $("#scheduleDuration").value = item?.durationMinutes ?? "";
  $("#scheduleDialogTitle").textContent = item ? "Edit scheduled reset" : "Schedule a Reset";
  $("#scheduleStatus").textContent = "";
  scheduleDialog.showModal();
}
$("#scheduleResetButton").addEventListener("click", () => openScheduleEditor());
$("#closeScheduleDialog").addEventListener("click", () => scheduleDialog.close());
$("#cancelScheduleDialog").addEventListener("click", () => scheduleDialog.close());
scheduleForm.addEventListener("submit", event => {
  event.preventDefault();
  const dateTimeValue = $("#scheduleDateTime").value;
  const chosenDate = new Date(dateTimeValue);
  const minutes = $("#scheduleDuration").value;
  if (!dateTimeValue || !Number.isFinite(chosenDate.getTime()) || chosenDate.getTime() <= Date.now()) {
    $("#scheduleStatus").textContent = "Choose a future date and time for your reset."; return;
  }
  if (minutes && !["10", "15", "30"].includes(minutes)) {
    $("#scheduleStatus").textContent = "Choose 10, 15 or 30 minutes."; return;
  }
  const space = getSpace($("#scheduleSpace").value);
  const prior = resetSchedules.find(item => item.id === editingScheduleId);
  const entry = {
    id: prior?.id || createId("schedule"),
    spaceId: $("#scheduleSpace").value,
    spaceName: space?.name || prior?.spaceName || "Deleted space",
    scheduledAt: chosenDate.toISOString(),
    durationMinutes: minutes ? Number(minutes) : null,
    status: prior?.status || "scheduled"
  };
  if (!isValidScheduleItem(entry)) { $("#scheduleStatus").textContent = "Check the reset details and try again."; return; }
  const nextSchedules = prior
    ? resetSchedules.map(item => item.id === prior.id ? entry : item)
    : [...resetSchedules, entry];
  try { saveResetSchedules(nextSchedules); } catch { $("#scheduleStatus").textContent = "Your reset could not be saved on this device. Please try again."; return; }
  resetSchedules = nextSchedules;
  scheduleDialog.close(); renderSchedule();
});
$("#scheduleList").addEventListener("click", event => {
  const button = event.target.closest("button[data-schedule-action]");
  if (!button) return;
  const item = resetSchedules.find(candidate => candidate.id === button.dataset.scheduleId);
  if (!item) return;
  if (button.dataset.scheduleAction === "edit") { openScheduleEditor(item); return; }
  const nextSchedules = button.dataset.scheduleAction === "delete"
    ? resetSchedules.filter(candidate => candidate.id !== item.id)
    : resetSchedules.map(candidate => candidate.id === item.id ? { ...candidate, status: "completed" } : candidate);
  try { saveResetSchedules(nextSchedules); resetSchedules = nextSchedules; renderSchedule(); }
  catch { window.alert("The change could not be saved on this device. Please try again."); }
});

window.addEventListener("beforeunload", () => {
  if (backupObjectUrl) URL.revokeObjectURL(backupObjectUrl);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", {
      scope: "./",
      updateViaCache: "none"
    }).catch(error => {
      console.warn("Resettable offline support could not be registered.", error);
    });
  });
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateSessionCountdown();
});
window.addEventListener("pageshow", updateSessionCountdown);
window.addEventListener("focus", updateSessionCountdown);

document.getElementById("backToTips").addEventListener("click", returnFromTip);
document.getElementById("shuffleTip").addEventListener("click", shufflePreviousTip);
document.getElementById("viewPreviousTips").addEventListener("click", showTipsArchive);
document.getElementById("backFromArchive").addEventListener("click", () => showTipsCollection(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshWeeklyTip();
});
window.addEventListener("pageshow", () => refreshWeeklyTip());
window.addEventListener("focus", () => refreshWeeklyTip());
shufflePreviousTip();
refreshWeeklyTip();
renderDashboard();
renderRoom();
syncSessionTicker();
