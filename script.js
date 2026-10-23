const rooms = [
  {
    id: "kitchen",
    name: "Kitchen",
    emoji: "🍃",
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
    id: "bedroom",
    name: "Bedroom",
    emoji: "☀️",
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
    id: "living",
    name: "Living room",
    emoji: "🪴",
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
    id: "workspace",
    name: "Workspace",
    emoji: "✏️",
    description: "Less clutter, more focus.",
    tasks: [
      "Clear your desk",
      "Sort loose papers",
      "Remove unused supplies",
      "Organise charging cables",
      "Create a clear working surface"
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

function renderDashboard() {
  const complete = rooms.reduce((total, room) => total + completedCount(room), 0);
  const possible = rooms.reduce((total, room) => total + room.tasks.length, 0);
  const percent = Math.round((complete / possible) * 100);

  $("#overall").textContent = `${percent}%`;
  updateProgressbar($("#overallbar"), percent);
  $("#activeRooms").textContent = rooms.filter(room => {
    const count = completedCount(room);
    return count > 0 && count < room.tasks.length;
  }).length;

  $("#roomCards").replaceChildren(...rooms.map(room => {
    const count = completedCount(room);
    const roomPercent = Math.round((count / room.tasks.length) * 100);
    const card = document.createElement("article");
    card.className = "room-card";

    const top = document.createElement("div");
    top.className = "room-card-top";
    const emoji = document.createElement("span");
    emoji.className = "room-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = room.emoji;
    const countText = document.createElement("span");
    countText.className = "room-card-count";
    countText.textContent = `${count} of ${room.tasks.length} steps`;
    top.append(emoji, countText);

    const title = document.createElement("h3");
    title.textContent = room.name;
    const description = document.createElement("p");
    description.textContent = room.description;
    const progress = document.createElement("div");
    progress.className = "progress-track";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", `${room.name} checklist progress`);
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(roomPercent));
    const bar = document.createElement("div");
    bar.style.width = `${roomPercent}%`;
    progress.append(bar);

    const openButton = document.createElement("button");
    openButton.className = "room-card-action";
    openButton.type = "button";
    openButton.innerHTML = "Open checklist <span aria-hidden=\"true\">→</span>";
    openButton.addEventListener("click", () => {
      currentRoom = room.id;
      showView("rooms");
    });

    card.append(top, title, description, progress, openButton);
    return card;
  }));
}

function renderRoom() {
  const room = rooms.find(item => item.id === currentRoom) || rooms[0];
  currentRoom = room.id;

  $("#roomTabs").replaceChildren(...rooms.map(item => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(item.id === currentRoom));
    tab.classList.toggle("active", item.id === currentRoom);
    tab.textContent = item.name;
    tab.addEventListener("click", () => {
      currentRoom = item.id;
      renderRoom();
    });
    return tab;
  }));

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
