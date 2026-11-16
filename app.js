"use strict";

const paths = {
  token: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="m12 8 1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2z"/>',
  play: '<path d="m8 5 12 7-12 7z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  sliders: '<path d="M4 7h2.5m5 0H20M4 17h8.5m5 0H20"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
  reset: '<path d="M4 7v5h5m-5 0a8 8 0 1 1 2 5"/>',
  muted: '<path d="M4 9h3l5-4v14l-5-4H4zM16 10l4 4m0-4-4 4"/>',
  sound: '<path d="M4 9h3l5-4v14l-5-4H4zm12 0a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>',
  outfit: '<path d="m8 4-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  vehicle: '<path d="m4 11 2-5h12l2 5m-17 0h18v7H3zm3 4h2m8 0h2M5 18v2m14-2v2"/>',
  pickaxe: '<path d="m4 20 11-11m-1-2 2 2m-6-6c4 0 9 4 11 9L12 5z"/><path d="m3 19 2 2"/>',
  track: '<path d="M9 17V6l10-2v11M9 10l10-2"/><ellipse cx="6" cy="17.5" rx="3" ry="2.5"/><ellipse cx="16" cy="15.5" rx="3" ry="2.5"/>',
  screen: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-4 3 3 4-5 6 6"/>',
  gizmo: '<path d="M12 6V3m-2 0h4M4 12H2m20 0h-2"/><rect x="4" y="6" width="16" height="14" rx="5"/><path d="M8 12h1m6 0h1m-6 4h4"/>',
};

const byId = (id) => document.getElementById(id);
const format = new Intl.NumberFormat("en-US", {maximumFractionDigits: 2});
const number = (value) => format.format(value);
const countLabel = (count, singular, plural = singular + "s") =>
  number(count) + " " + (count === 1 ? singular : plural);
const icon = (key) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[key] + '</svg>';
const key = "treasure-hunters-v1";
const {loot} = Treasure;

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

const saved = readSave();
let stats = saved.stats?.items ? saved.stats : Treasure.fresh();
const skipped = new Set(Array.isArray(saved.skipped) ? saved.skipped : []);
let sound = saved.sound === true;
let run = null;
let audioContext;

const openOne = byId("open-one");
const openHundred = byId("open-hundred");
const auto = byId("auto");
const filters = byId("filters");
const modifiers = byId("modifiers");
const custom = byId("custom");
const result = byId("result");
const chestCover = byId("chest-cover");
const lootDialog = byId("loot-dialog");
const dropItems = byId("drop-items");
const resetDialog = byId("reset-dialog");
const radios = [...modifiers.querySelectorAll("input[name=boost]")];
let mode = radios.some((radio) => radio.value === saved.mode) ? saved.mode : "1";
radios.find((radio) => radio.value === mode).checked = true;
custom.value = saved.custom ?? 3;
let currentCustom = custom.validity.valid && custom.value ? custom.valueAsNumber : 3;

document.querySelectorAll("[data-icon]").forEach((element) => {
  element.innerHTML = icon(element.dataset.icon);
});

byId("filter-options").innerHTML = loot.map((item) =>
  '<label><input type="checkbox" value="' + item.id + '"><span>Skip ' + item.skip + '</span></label>'
).join("");
filters.querySelectorAll("input").forEach((input) => {
  input.checked = skipped.has(input.value);
});

byId("loot-rows").innerHTML = loot.map((item) =>
  '<tr><td><div class="reward" style="--item:' + item.color +
  '"><span class="reward-icon">' + icon(item.id) + '</span>' + item.name +
  '</div></td><td class="chance"></td><td class="found-count"></td><td class="first"></td></tr>'
).join("");
const rows = [...byId("loot-rows").rows];

function save() {
  try {
    localStorage.setItem(key, JSON.stringify({stats, skipped: [...skipped], mode, custom: currentCustom, sound}));
  } catch {
  }
}

function multiplier() {
  return mode === "custom" ? currentCustom : Number(mode);
}

function renderStats() {
  byId("opened").textContent = number(stats.opened);
  byId("drops").textContent = number(loot.reduce((count, {id}) => count + stats.items[id].count, 0));
  const firstToken = stats.items.token.first;
  byId("token-total").textContent = firstToken ? "Found in " + countLabel(firstToken, "chest") : "Not found yet";
  rows.forEach((row, index) => {
    const {count, first} = stats.items[loot[index].id];
    row.cells[2].textContent = number(count);
    row.cells[3].textContent = first ? "Chest #" + number(first) : "—";
    row.cells[3].classList.toggle("recorded", first !== null);
  });
}

function renderSettings() {
  byId("custom-control").hidden = mode !== "custom";
  const boost = multiplier();
  byId("boost").textContent = number(boost) + "×";
  Treasure.probabilities(boost).forEach((chance, index) => {
    rows[index].cells[1].textContent = chance === 1 ? "100%" : "1 in " + number(1 / chance);
  });
  const invalid = mode === "custom" && (!custom.value || !custom.validity.valid);
  const allSkipped = loot.every(({id}) => skipped.has(id));
  openOne.disabled = openHundred.disabled = Boolean(run) || invalid;
  auto.disabled = !run && (invalid || allSkipped);
  auto.title = allSkipped ? "Unskip a reward to start auto-open" : "";
  modifiers.disabled = filters.disabled = byId("reset").disabled = Boolean(run);
  byId("auto-label").textContent = run ? "Stop Auto-Open" : "Auto-Open";
  byId("auto-icon").innerHTML = icon(run ? "stop" : "play");
  auto.setAttribute("aria-pressed", Boolean(run));
  chestCover.classList.toggle("rolling", Boolean(run));
}

function showSound() {
  byId("sound").setAttribute("aria-pressed", sound);
  byId("sound").firstElementChild.innerHTML = icon(sound ? "sound" : "muted");
  byId("sound-label").textContent = sound ? "Sound on" : "Sound off";
}

function playSound(kind) {
  if (!sound || !window.AudioContext) return;
  audioContext ??= new AudioContext();
  audioContext.resume().catch(() => {});
  const notes = kind === "drop" ? [523.25, 659.25, 783.99, 1046.5] : [147, 196];
  notes.forEach((note, index) => {
    const time = audioContext.currentTime + index * 0.055;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind === "drop" ? "sine" : "triangle";
    oscillator.frequency.value = note;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.09, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.19);
  });
}

function showDrops(drops, match, summary) {
  const order = loot.map((_, index) => index).filter((index) => drops[index] > 0 && index !== match);
  if (match >= 0) order.unshift(match);
  byId("drop-summary").textContent = summary;
  dropItems.replaceChildren(...order.map((index) => {
    const item = loot[index];
    const entry = document.createElement("li");
    const art = document.createElement("div");
    const label = document.createElement("span");
    const quantity = document.createElement("small");

    art.className = "drop-art";
    art.style.setProperty("--item", item.color);
    art.innerHTML = icon(item.id);
    art.setAttribute("aria-hidden", "true");
    if (item.image) {
      const image = document.createElement("img");
      image.alt = "";
      image.addEventListener("load", () => art.replaceChildren(image), {once: true});
      image.src = item.image;
    }
    label.textContent = item.name;
    quantity.textContent = "×" + number(drops[index]);
    entry.append(art, label, quantity);
    return entry;
  }));
  dropItems.classList.toggle("single", order.length === 1);
  lootDialog.showModal();
}

function describe(opened, drops, match = -1, stopped = false) {
  const chestText = countLabel(opened, "chest");
  const summary = match >= 0
    ? "Auto-open found " + loot[match].name + " after " + chestText + "."
    : (stopped ? "Auto-open stopped after " : "Opened ") + chestText + ".";
  const total = drops.reduce((sum, count) => sum + count, 0);
  result.textContent = summary + (total ? " " + countLabel(total, "drop") + " recorded." : " No loot this time.");
  if (total) {
    showDrops(drops, match, summary);
    playSound("drop");
  }
}

function manualOpen(limit) {
  if (run) return;
  const {opened, drops} = Treasure.open(stats, Treasure.probabilities(multiplier()), skipped, limit, false);
  if (!drops.some(Boolean)) playSound("open");
  renderStats();
  describe(opened, drops);
  save();
}

function finishAuto(match = -1) {
  const finished = run;
  run = null;
  renderSettings();
  renderStats();
  describe(finished.opened, finished.drops, match, match === -1);
  save();
}

function step(active) {
  if (run !== active) return;
  const batch = Treasure.open(stats, active.chances, skipped, 12000, true);
  active.opened += batch.opened;
  batch.drops.forEach((count, index) => { active.drops[index] += count; });
  if (batch.match >= 0) {
    finishAuto(batch.match);
    return;
  }
  if (performance.now() - active.updated > 110) {
    active.updated = performance.now();
    renderStats();
    save();
  }
  requestAnimationFrame(() => step(active));
}

openOne.addEventListener("click", () => manualOpen(1));
openHundred.addEventListener("click", () => manualOpen(100));
auto.addEventListener("click", () => {
  if (run) {
    finishAuto();
    return;
  }
  const active = {opened: 0, drops: loot.map(() => 0), chances: Treasure.probabilities(multiplier()), updated: performance.now()};
  run = active;
  renderSettings();
  result.textContent = "Auto-opening until an unskipped reward drops…";
  playSound("open");
  setTimeout(() => step(active), 160);
});

modifiers.addEventListener("input", ({target}) => {
  if (target === custom) {
    if (custom.value && custom.validity.valid) currentCustom = custom.valueAsNumber;
  } else {
    mode = target.value;
  }
  renderSettings();
  save();
});
filters.addEventListener("change", ({target}) => {
  if (target.checked) skipped.add(target.value);
  else skipped.delete(target.value);
  result.textContent = loot.every(({id}) => skipped.has(id))
    ? "Unskip at least one reward to use Auto-Open."
    : "Auto-open filters updated.";
  renderSettings();
  save();
});
byId("sound").addEventListener("click", () => {
  sound = !sound;
  if (sound) playSound("open");
  showSound();
  save();
});
byId("reset").addEventListener("click", () => {
  resetDialog.returnValue = "cancel";
  resetDialog.showModal();
});
resetDialog.addEventListener("close", () => {
  if (resetDialog.returnValue !== "reset") return;
  stats = Treasure.fresh();
  result.textContent = "Stats reset. Ready for a new hunt.";
  renderStats();
  save();
});
window.addEventListener("pagehide", save);
renderStats();
renderSettings();
showSound();
