"use strict";

const STORAGE_KEY = "plant-care.plants.v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const form = document.getElementById("plant-form");
const nameInput = document.getElementById("plant-name");
const speciesInput = document.getElementById("plant-species");
const intervalInput = document.getElementById("plant-interval");
const lastWateredInput = document.getElementById("plant-last-watered");
const plantList = document.getElementById("plant-list");
const emptyState = document.getElementById("empty-state");
const summary = document.getElementById("summary");

let plants = loadPlants();

function loadPlants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

// Days elapsed since the plant was last watered, using local calendar days.
function daysSinceWatered(plant) {
  const last = new Date(plant.lastWatered + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today - last) / MS_PER_DAY);
}

function statusFor(plant) {
  const elapsed = daysSinceWatered(plant);
  const daysLeft = plant.intervalDays - elapsed;
  if (daysLeft < 0) return { kind: "overdue", daysLeft };
  if (daysLeft === 0) return { kind: "due", daysLeft };
  return { kind: "ok", daysLeft };
}

function statusText(status) {
  if (status.kind === "overdue") {
    const n = -status.daysLeft;
    return `Overdue — needed water ${n} day${n === 1 ? "" : "s"} ago!`;
  }
  if (status.kind === "due") return "Water today!";
  return `Water in ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"}`;
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function render() {
  plantList.innerHTML = "";

  const sorted = [...plants].sort(
    (a, b) => statusFor(a).daysLeft - statusFor(b).daysLeft
  );

  for (const plant of sorted) {
    const status = statusFor(plant);

    const li = document.createElement("li");
    li.className = "plant-card" + (status.kind === "ok" ? "" : " " + status.kind);

    const info = document.createElement("div");
    info.className = "plant-info";

    const name = document.createElement("div");
    name.className = "plant-name";
    name.textContent = plant.name;
    info.appendChild(name);

    if (plant.species) {
      const species = document.createElement("div");
      species.className = "plant-species";
      species.textContent = plant.species;
      info.appendChild(species);
    }

    const statusLine = document.createElement("div");
    statusLine.className = "plant-status " + status.kind;
    statusLine.textContent =
      statusText(status) +
      ` · every ${plant.intervalDays} day${plant.intervalDays === 1 ? "" : "s"}` +
      ` · last watered ${plant.lastWatered}`;
    info.appendChild(statusLine);

    const actions = document.createElement("div");
    actions.className = "plant-actions";

    const waterBtn = document.createElement("button");
    waterBtn.className = "btn btn-water";
    waterBtn.textContent = "💧 Water";
    waterBtn.addEventListener("click", () => {
      plant.lastWatered = todayISO();
      savePlants();
      render();
    });
    actions.appendChild(waterBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-delete";
    deleteBtn.setAttribute("aria-label", `Remove ${plant.name}`);
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Remove "${plant.name}" from your plants?`)) {
        plants = plants.filter((p) => p.id !== plant.id);
        savePlants();
        render();
      }
    });
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);
    plantList.appendChild(li);
  }

  emptyState.classList.toggle("hidden", plants.length > 0);
  renderSummary();
}

function renderSummary() {
  if (plants.length === 0) {
    summary.textContent = "";
    summary.className = "summary";
    return;
  }
  const thirsty = plants.filter((p) => statusFor(p).kind !== "ok").length;
  if (thirsty === 0) {
    summary.textContent = "✅ All plants are watered. Nice work!";
    summary.className = "summary all-good";
  } else {
    summary.textContent = `💧 ${thirsty} plant${thirsty === 1 ? "" : "s"} need${
      thirsty === 1 ? "s" : ""
    } water`;
    summary.className = "summary needs-water";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const intervalDays = parseInt(intervalInput.value, 10);
  if (!Number.isFinite(intervalDays) || intervalDays < 1) return;

  plants.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: nameInput.value.trim(),
    species: speciesInput.value.trim(),
    intervalDays,
    lastWatered: lastWateredInput.value || todayISO(),
  });

  savePlants();
  form.reset();
  intervalInput.value = "7";
  nameInput.focus();
  render();
});

// Cap the "last watered" date picker at today.
lastWateredInput.max = todayISO();

render();
