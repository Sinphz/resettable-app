const categories = [
  { id: "home", name: "Home", description: "Everyday spaces for a calmer home." },
  { id: "outdoor", name: "Outdoor", description: "Make more of the spaces just outside." },
  { id: "workspaces", name: "Workspaces & Organisations", description: "Clear, practical spaces to work and share." }
];

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
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
} catch {
  saved = {};
}

let currentCategory = "home";
let currentRoom = "kitchen";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function isDone(roomId, taskIndex) {
  return Boolean(saved[`${roomId}-${taskIndex}`]);
}

function completedCount(room) {
  return room.tasks.reduce((total, _, index) => total + Number(isDone(room.id, index)), 0);
}

function saveProgress() {
  try {
    // Keep old and unknown keys intact; only the task the customer changed is updated.
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    // Keep the checklist usable if this browser blocks local storage.
  }
}

function updateProgressbar(element, percent) {
  if (!element) return;
  element.style.width = `${percent}%`;
  element.parentElement?.setAttribute("aria-valuenow", String(percent));
}

function categoryRooms(categoryId) {
  return rooms.filter(room => room.category === categoryId);
}

function categoryProgress(categoryId) {
  const group = categoryRooms(categoryId);
  const complete = group.reduce((total, room) => total + completedCount(room), 0);
  const possible = group.reduce((total, room) => total + room.tasks.length, 0);
  return { complete, possible, percent: possible ? Math.round((complete / possible) * 100) : 0 };
}

function renderDashboard() {
  const complete = rooms.reduce((total, room) => total + completedCount(room), 0);
  const possible = rooms.reduce((total, room) => total + room.tasks.length, 0);
  const percent = Math.round((complete / possible) * 100);

  $("#overall").textContent = `${percent}%`;
  updateProgressbar($("#overallbar"), percent);
  $("#activeSpaces").textContent = rooms.filter(room => {
    const count = completedCount(room);
    return count > 0 && count < room.tasks.length;
  }).length;

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
    marker.textContent = category.id === "home" ? "⌂" : category.id === "outdoor" ? "🌿" : "✏️";
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
    explore.innerHTML = "Explore Spaces <span aria-hidden=\"true\">→</span>";
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
    const percent = Math.round((count / room.tasks.length) * 100);
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
  const room = rooms.find(item => item.id === currentRoom) || rooms[0];
  currentRoom = room.id;
  currentCategory = room.category;
  renderCategoryTabs();
  renderSpaceCards();

  $("#roomTitle").textContent = `${room.emoji} ${room.name}`;
  $("#roomDescription").textContent = room.description;
  $("#tasks").replaceChildren(...room.tasks.map((task, index) => {
    const row = document.createElement("div");
    row.className = "task";
    const id = `task-${room.id}-${index}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = isDone(room.id, index);
    checkbox.addEventListener("change", () => {
      saved[`${room.id}-${index}`] = checkbox.checked;
      saveProgress();
      refreshProgress();
    });
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = task;
    row.append(checkbox, label);
    return row;
  }));
  refreshRoomProgress();
}

function refreshRoomProgress() {
  const room = rooms.find(item => item.id === currentRoom) || rooms[0];
  const count = completedCount(room);
  const percent = Math.round((count / room.tasks.length) * 100);
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

function showView(viewId) {
  const view = document.getElementById(viewId);
  if (!view || !view.classList.contains("view")) return;

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

  if (viewId === "rooms") renderRoom();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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
  button.addEventListener("click", () => openCategory(button.dataset.category));
});

$("#clearRoom").addEventListener("click", () => {
  const room = rooms.find(item => item.id === currentRoom);
  if (!room || !window.confirm(`Clear completed tasks for ${room.name}?`)) return;

  room.tasks.forEach((_, index) => delete saved[`${room.id}-${index}`]);
  saveProgress();
  renderDashboard();
  renderRoom();
});

$("#requestForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const body = `Name: ${data.get("name")}\nEmail: ${data.get("email")}\nSpace: ${data.get("space")}\nService: ${data.get("service")}\n\nDetails:\n${data.get("details")}`;
  const subject = "Resettable app - Reset enquiry";
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $("#formStatus").textContent = "Your email app will open with a prepared message. Add Resettable’s contact email address before sending, or use the website form below.";
  window.location.href = mailto;
});

renderDashboard();
renderRoom();
