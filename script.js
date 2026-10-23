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
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
} catch {
  saved = {};
}

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

let customSpaces = [];
try {
  const parsed = JSON.parse(localStorage.getItem(customSpacesStorageKey) || "[]");
  if (Array.isArray(parsed)) customSpaces = parsed
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
    }));
} catch {
  customSpaces = [];
}

let spaceGoals = {};
try {
  const parsedGoals = JSON.parse(localStorage.getItem(spaceGoalsStorageKey) || "{}");
  if (parsedGoals && typeof parsedGoals === "object" && !Array.isArray(parsedGoals)) {
    const validSpaceIds = new Set([...rooms, ...customSpaces].map(space => space.id));
    for (const [spaceId, goal] of Object.entries(parsedGoals)) {
      if (validSpaceIds.has(spaceId) && typeof goal === "string" && goal.trim()) {
        spaceGoals[spaceId] = goal.trim().slice(0, 160);
      }
    }
  }
} catch {
  spaceGoals = {};
}

let currentCategory = "home";
let currentRoom = "kitchen";
let goalEditorSpaceId = null;
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

function isDone(room, taskIndex) {
  return room.isCustom ? Boolean(room.tasks[taskIndex]?.done) : Boolean(saved[`${room.id}-${taskIndex}`]);
}

function completedCount(room) {
  return room.tasks.reduce((total, _, index) => total + Number(isDone(room, index)), 0);
}

function saveCustomSpaces() {
  try {
    localStorage.setItem(customSpacesStorageKey, JSON.stringify(customSpaces));
  } catch {
    // Keep the checklist usable if this browser blocks local storage.
  }
}

function saveProgress() {
  try {
    // Keep old and unknown keys intact; only the task the customer changed is updated.
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    // Keep the checklist usable if this browser blocks local storage.
  }
}

function saveSpaceGoals() {
  try {
    localStorage.setItem(spaceGoalsStorageKey, JSON.stringify(spaceGoals));
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
  const room = getSpace(currentRoom) || rooms[0];
  if (goalEditorSpaceId && goalEditorSpaceId !== room.id) goalEditorSpaceId = null;
  currentRoom = room.id;
  currentCategory = room.category;
  renderCategoryTabs();
  renderSpaceCards();

  $("#roomTitle").textContent = `${room.emoji} ${room.name}`;
  $("#roomDescription").textContent = room.description;
  renderGoal(room);
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
      if (room.isCustom) {
        const customSpace = customSpaces.find(item => item.id === room.id);
        if (customSpace?.tasks[index]) customSpace.tasks[index].done = checkbox.checked;
        saveCustomSpaces();
      } else {
        saved[`${room.id}-${index}`] = checkbox.checked;
        saveProgress();
      }
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
    form.append(label, textarea, actions);
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
      spaceGoals[space.id] = value;
      saveSpaceGoals();
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
    delete spaceGoals[space.id];
    saveSpaceGoals();
    renderGoal(space);
  });
  actions.append(edit, remove);
  savedGoal.append(label, text, actions);
  goalArea.append(savedGoal);
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
  if (existingSpace) {
    existingSpace.name = name;
    existingSpace.category = category;
    existingSpace.tasks = tasks;
    currentRoom = existingSpace.id;
  } else {
    const newSpace = {
      id: createId("space"), name, category,
      description: "A space you created, with a checklist made for you.",
      emoji: "✳", tasks
    };
    customSpaces.push(newSpace);
    currentRoom = newSpace.id;
  }
  currentCategory = category;
  saveCustomSpaces();
  spaceDialog.close();
  renderDashboard();
  renderRoom();
});

$("#deleteCustomSpace").addEventListener("click", () => {
  const space = customSpaces.find(item => item.id === currentRoom);
  if (!space || !window.confirm(`Delete “${space.name}” and its checklist? This cannot be undone.`)) return;
  customSpaces = customSpaces.filter(item => item.id !== space.id);
  saveCustomSpaces();
  delete spaceGoals[space.id];
  saveSpaceGoals();
  currentRoom = categoryRooms(currentCategory)[0]?.id || rooms[0].id;
  renderDashboard();
  renderRoom();
});

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
  button.addEventListener("click", () => {
    const category = categories.find(item => item.id === button.dataset.category);
    if (!category) return;
    $("#space").value = category.name;
    showView("request");
  });
});

$("#clearRoom").addEventListener("click", () => {
  const room = getSpace(currentRoom);
  if (!room || !window.confirm(`Clear completed tasks for ${room.name}?`)) return;

  if (room.isCustom) {
    room.tasks.forEach(task => { task.done = false; });
    saveCustomSpaces();
  } else {
    room.tasks.forEach((_, index) => delete saved[`${room.id}-${index}`]);
    saveProgress();
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
  if (!detailsField.value.trim()) {
    showFormStatus("Please tell us a little about your space.", "error");
    detailsField.focus();
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
    showFormStatus("Thank you. Your enquiry has been sent successfully, and we’ll be in touch soon.", "success");
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

renderDashboard();
renderRoom();
