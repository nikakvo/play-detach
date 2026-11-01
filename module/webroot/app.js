// Play Detach WebUI
// Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

const MODDIR = "/data/adb/modules/play-detach";
const CLI = `${MODDIR}/play-detach`;
const PKG_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Root manager bridge (KernelSU / SukiSU / APatch WebUI API)
// ---------------------------------------------------------------------------

const ksu = window.ksu;
let callSeq = 0;

// A command whose answer never comes resolves with errno -2 after timeoutMs,
// so the page never waits forever.
function exec(cmd, timeoutMs = 60000) {
  return new Promise((resolve) => {
    if (!ksu) {
      resolve({ errno: -1, stdout: "", stderr: "WebUI bridge not available" });
      return;
    }
    const cb = `pd_exec_${Date.now()}_${callSeq++}`;
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      window[cb] = () => delete window[cb];
      resolve({ errno: -2, stdout: "", stderr: "no answer from the root shell" });
    }, timeoutMs);
    window[cb] = (errno, stdout, stderr) => {
      delete window[cb];
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ errno, stdout: stdout || "", stderr: stderr || "" });
    };
    try {
      ksu.exec(cmd, "{}", cb);
    } catch (e) {
      done = true;
      clearTimeout(timer);
      delete window[cb];
      resolve({ errno: -1, stdout: "", stderr: String(e) });
    }
  });
}

// On a quick reopen the root manager can run the page's first command before
// it has registered the new page, and that answer never comes. So before the
// first real call a harmless echo is sent a few times, a moment apart, and the
// first answer means the page is registered. Only this echo is repeated,
// never a real command.
function ready() {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    const ask = () => {
      if (done) return;
      exec("echo pd_ok", 15000).then((r) => {
        if (r.errno === -1 || r.stdout.includes("pd_ok")) finish();
      });
    };
    [0, 400, 1000, 2000, 3500, 6000].forEach((t) => setTimeout(ask, t));
    setTimeout(finish, 16000);
  });
}

const hasPkgApi = !!ksu && typeof ksu.listPackages === "function" && typeof ksu.getPackagesInfo === "function";

function listPackages(type) {
  try {
    return JSON.parse(ksu.listPackages(type)) || [];
  } catch {
    return [];
  }
}

function getPackagesInfo(pkgs) {
  try {
    return JSON.parse(ksu.getPackagesInfo(JSON.stringify(pkgs))) || [];
  } catch {
    return [];
  }
}

const lines = (s) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {Map<string, {pkg: string, label: string, system: boolean, installed: boolean, detached: boolean}>} */
const apps = new Map();
let tab = "user";
let query = "";

function addApp(pkg, system) {
  if (!PKG_RE.test(pkg) || apps.has(pkg)) return;
  apps.set(pkg, { pkg, label: pkg, system, installed: true, detached: false });
}

async function loadPackages() {
  if (hasPkgApi) {
    listPackages("user").forEach((p) => addApp(p, false));
    listPackages("system").forEach((p) => addApp(p, true));

    // Labels in chunks so the UI stays responsive.
    const all = [...apps.keys()];
    for (let i = 0; i < all.length; i += 60) {
      for (const info of getPackagesInfo(all.slice(i, i + 60))) {
        const app = apps.get(info.packageName);
        if (!app) continue;
        if (info.appLabel) app.label = info.appLabel;
        if (typeof info.isSystem === "boolean") app.system = info.isSystem;
      }
      await nextFrame();
    }
  } else {
    const [user, system] = await Promise.all([exec("pm list packages -3"), exec("pm list packages -s")]);
    lines(user.stdout).forEach((l) => addApp(l.replace(/^package:/, ""), false));
    lines(system.stdout).forEach((l) => addApp(l.replace(/^package:/, ""), true));
  }
}

async function loadDetached() {
  const res = await exec(`${CLI} list`);
  if (res.errno !== 0) throw new Error(res.stderr.trim() || "could not read the detach list");
  for (const pkg of lines(res.stdout)) {
    if (!PKG_RE.test(pkg)) continue;
    const app = apps.get(pkg);
    if (app) app.detached = true;
    else apps.set(pkg, { pkg, label: pkg, system: false, installed: false, detached: true });
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const listEl = $("list");

function tileColor(pkg) {
  let h = 0;
  for (let i = 0; i < pkg.length; i++) h = (h * 31 + pkg.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 45% 42%)`;
}

function makeTile(app) {
  const t = document.createElement("div");
  t.className = "tile";
  t.style.background = tileColor(app.pkg);
  t.textContent = (app.label.match(/[\p{L}\p{N}]/u) || ["?"])[0];
  return t;
}

function makeIcon(app) {
  if (!hasPkgApi || !app.installed) return makeTile(app);
  const img = document.createElement("img");
  img.className = "ico";
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = `ksu://icon/${app.pkg}`;
  img.addEventListener("error", () => img.replaceWith(makeTile(app)), { once: true });
  return img;
}

function makeRow(app) {
  const row = document.createElement("label");
  row.className = "row" + (app.detached ? " on" : "");
  row.dataset.pkg = app.pkg;

  const meta = document.createElement("div");
  meta.className = "meta";
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = app.label;
  const pkg = document.createElement("div");
  pkg.className = "pkg";
  pkg.textContent = app.pkg;
  if (!app.installed) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = "Not installed";
    name.append(b);
  }
  meta.append(name, pkg);

  const sw = document.createElement("span");
  sw.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("role", "switch");
  input.setAttribute("aria-label", `Detach ${app.label}`);
  input.checked = app.detached;
  input.addEventListener("change", () => toggle(app, input, row));
  const track = document.createElement("span");
  track.className = "track";
  sw.append(input, track);

  row.append(makeIcon(app), meta, sw);
  return row;
}

function visibleApps() {
  const q = query.toLowerCase();
  return [...apps.values()]
    .filter((a) => {
      if (tab === "detached" && !a.detached) return false;
      if (tab === "user" && a.system) return false;
      if (tab === "system" && !a.system) return false;
      if (q && !a.label.toLowerCase().includes(q) && !a.pkg.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => (b.detached - a.detached) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

function emptyState() {
  const div = document.createElement("div");
  div.className = "empty";
  if (query) {
    div.innerHTML = "<strong>No matches</strong><span>Try another name or package.</span>";
  } else if (tab === "detached") {
    div.innerHTML = `
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="8" y="22" width="26" height="20" rx="6" fill="#c77dff"/>
        <rect x="34" y="26" width="8" height="4" rx="2" fill="#c77dff"/>
        <rect x="34" y="34" width="8" height="4" rx="2" fill="#c77dff"/>
        <polygon points="17,27 17,37 25,32" fill="#22062f"/>
        <rect x="48" y="18" width="10" height="28" rx="4" stroke="#c77dff" stroke-width="3"/>
      </svg>
      <strong>No detached apps yet</strong>
      <span>Turn on the switch next to an app to stop Play Store updates for it.</span>`;
  } else {
    div.innerHTML = "<strong>No apps here</strong>";
  }
  return div;
}

function render() {
  const items = visibleApps();
  const frag = document.createDocumentFragment();
  if (items.length === 0) frag.append(emptyState());
  else items.forEach((a) => frag.append(makeRow(a)));
  listEl.replaceChildren(frag);
  $("foot").hidden = !(tab === "detached" && !query);
  $("reattach-all").hidden = items.length === 0;
  updateCounts();
}

function updateCounts() {
  let user = 0, system = 0, detached = 0;
  for (const a of apps.values()) {
    if (a.detached) detached++;
    if (!a.installed) continue;
    if (a.system) system++;
    else user++;
  }
  $("n-user").textContent = user;
  $("n-system").textContent = system;
  $("n-detached").textContent = detached;
  // Never let an empty list overwrite a good backup.
  $("backup").disabled = detached === 0;
  return detached;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

let toastTimer;
function toast(msg, error = false) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("error", error);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), error ? 4500 : 2200);
}

async function toggle(app, input, row) {
  const on = input.checked;
  // Show the new state right away; revert only if the command fails.
  row.classList.toggle("on", on);
  input.disabled = true;

  const res = await exec(`${CLI} ${on ? "add" : "remove"} ${app.pkg}`);
  input.disabled = false;

  if (res.errno === 0) {
    app.detached = on;
    toast(on ? `${app.label} detached` : `${app.label} re-attached`);
    if (!on && !app.installed) {
      apps.delete(app.pkg);
      row.remove();
    }
    updateCounts();
    refreshStatus();
  } else {
    input.checked = !on;
    row.classList.toggle("on", !on);
    toast(res.stderr.trim() || "Could not change the list", true);
  }
}

async function reattachAll() {
  const res = await exec(`${CLI} clear`);
  if (res.errno !== 0) {
    toast(res.stderr.trim() || "Could not clear the list", true);
    return;
  }
  for (const [pkg, a] of apps) {
    if (!a.installed) apps.delete(pkg);
    else a.detached = false;
  }
  render();
  refreshStatus();
  toast("All apps re-attached");
}

// ---------------------------------------------------------------------------
// Backup / restore with a built-in folder browser
// ---------------------------------------------------------------------------

const STORAGE = "/data/media/0"; // internal storage as seen by root
const sq = (str) => `'${str.replace(/'/g, `'\\''`)}'`;
const niceDir = (dir) => "Internal storage" + dir.slice(STORAGE.length);

const FOLDER_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.6l2 2h7.4A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>';
const FILE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>';
const UP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

function lastDir() {
  try {
    const d = localStorage.getItem("pd-backup-dir");
    if (d && d.startsWith(STORAGE)) return d;
  } catch {}
  return `${STORAGE}/Download`;
}
function rememberDir(dir) {
  try {
    localStorage.setItem("pd-backup-dir", dir);
  } catch {}
}

const picker = { mode: "save", dir: STORAGE, files: new Set() };

async function listDir(dir) {
  const res = await exec(
    `cd ${sq(dir)} && for f in *; do [ -e "$f" ] || continue; if [ -d "$f" ]; then echo "d $f"; else echo "f $f"; fi; done`
  );
  if (res.errno !== 0) return null;
  const dirs = [], files = [];
  for (const line of res.stdout.split("\n")) {
    if (line.length < 3) continue;
    const name = line.slice(2);
    if (line[0] === "d") dirs.push(name);
    else files.push(name);
  }
  const cmp = (x, y) => x.localeCompare(y, undefined, { sensitivity: "base" });
  return { dirs: dirs.sort(cmp), files: files.sort(cmp) };
}

function entryButton(icon, label, cls, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `entry ${cls}`;
  btn.innerHTML = icon;
  const span = document.createElement("span");
  span.textContent = label;
  btn.append(span);
  btn.addEventListener("click", onClick);
  return btn;
}

async function openDir(dir) {
  const data = await listDir(dir);
  if (!data) {
    toast("Could not open this folder", true);
    return;
  }
  picker.dir = dir;
  picker.files = new Set(data.files);

  // Breadcrumbs
  const crumbs = $("picker-path");
  crumbs.replaceChildren();
  const parts = dir.slice(STORAGE.length).split("/").filter(Boolean);
  let path = STORAGE;
  const addCrumb = (label, target) => {
    if (crumbs.childElementCount) crumbs.append("\u203a");
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => openDir(target));
    crumbs.append(b);
  };
  addCrumb("Internal storage", STORAGE);
  for (const part of parts) {
    path += "/" + part;
    addCrumb(part, path);
  }

  // Entries
  const list = $("picker-list");
  const frag = document.createDocumentFragment();
  if (dir !== STORAGE) {
    frag.append(entryButton(UP_ICON, "Up one folder", "up", () => openDir(dir.slice(0, dir.lastIndexOf("/")))));
  }
  for (const d of data.dirs) {
    if (d.startsWith(".")) continue;
    frag.append(entryButton(FOLDER_ICON, d, "folder", () => openDir(`${dir}/${d}`)));
  }
  if (picker.mode === "restore") {
    for (const f of data.files) {
      if (f.startsWith(".") || !f.toLowerCase().endsWith(".txt")) continue;
      frag.append(entryButton(FILE_ICON, f, "file", () => askRestore(`${dir}/${f}`)));
    }
  }
  if (!frag.childElementCount || (frag.childElementCount === 1 && dir !== STORAGE)) {
    const empty = document.createElement("div");
    empty.className = "picker-empty";
    empty.textContent = picker.mode === "restore" ? "No folders or .txt files here." : "No folders here.";
    frag.append(empty);
  }
  list.replaceChildren(frag);
  list.scrollTop = 0;
  checkName();
}

function cleanName() {
  let name = $("picker-name").value.trim().replace(/[\/\\]/g, "");
  if (name && !name.toLowerCase().endsWith(".txt")) name += ".txt";
  return name;
}

function checkName() {
  if (picker.mode !== "save") return;
  const name = cleanName();
  $("picker-warn").hidden = !picker.files.has(name);
  $("picker-ok").disabled = !name;
}

function openPicker(mode) {
  picker.mode = mode;
  const save = mode === "save";
  $("picker-title").textContent = save ? "Save backup" : "Choose a backup";
  $("picker-save").hidden = !save;
  $("picker-ok").hidden = !save;
  if (save) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    $("picker-name").value = `play-detach-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.txt`;
  }
  $("picker").hidden = false;
  openDir(lastDir());
}

async function saveBackup() {
  const name = cleanName();
  if (!name) return;
  const file = `${picker.dir}/${name}`;
  $("picker").hidden = true;
  const res = await exec(`${CLI} backup ${sq(file)}`);
  if (res.errno !== 0) {
    toast(res.stderr.trim() || "Could not save the backup", true);
    return;
  }
  rememberDir(picker.dir);
  const n = updateCounts();
  toast(`Saved ${n} ${n === 1 ? "app" : "apps"} to ${niceDir(file)}`);
}

let confirmAsk = null; // set in setupUi

function askRestore(file) {
  confirmAsk(
    "Restore this backup?",
    `Your current list is replaced with the apps saved in ${niceDir(file)}.`,
    "Restore",
    () => restore(file)
  );
}

async function restore(file) {
  $("picker").hidden = true;
  const res = await exec(`${CLI} restore ${sq(file)}`);
  if (res.errno !== 0) {
    toast(res.stderr.trim().replace(STORAGE, "Internal storage") || "Could not restore the backup", true);
    return;
  }
  rememberDir(file.slice(0, file.lastIndexOf("/")));
  for (const [pkg, a] of apps) {
    if (!a.installed) apps.delete(pkg);
    else a.detached = false;
  }
  try {
    await loadDetached();
  } catch (e) {
    toast(String(e.message || e), true);
  }
  render();
  refreshStatus();
  const n = updateCounts();
  toast(`Restored ${n} ${n === 1 ? "app" : "apps"} from backup`);
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------

function setStatus(state, text) {
  $("status").dataset.state = state;
  $("status-text").textContent = text;
}

async function refreshStatus() {
  const count = updateCounts();
  if (count === 0) {
    setStatus("idle", "No apps detached yet");
    return;
  }
  const noun = count === 1 ? "app" : "apps";
  const [st, log] = await Promise.all([exec(`${CLI} status`), exec("logcat -d -s PlayDetach | tail -n 1")]);

  const kv = {};
  for (const l of lines(st.stdout)) {
    const m = l.match(/^(\w+)=(\d+)$/);
    if (m) kv[m[1]] = Number(m[2]);
  }
  const last = log.stdout.trim();

  if (/\sE PlayDetach\b/.test(last)) {
    setStatus("error", `Problem: ${last.replace(/^.*PlayDetach:\s*/, "")}`);
  } else if (kv.loaded > 0 && kv.loaded >= kv.list_changed) {
    setStatus("ok", `Active in Play Store - ${count} ${noun} detached`);
  } else if (!kv.loaded && /active in Play Store/.test(last)) {
    setStatus("ok", `Active in Play Store - ${count} ${noun} detached`);
  } else {
    setStatus("warn", `${count} ${noun} detached - applies when the Play Store opens`);
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setupUi() {
  const search = $("search");
  const clear = $("clear");
  let t;
  search.addEventListener("input", () => {
    clear.hidden = !search.value;
    clearTimeout(t);
    t = setTimeout(() => {
      query = search.value.trim();
      render();
    }, 120);
  });
  clear.addEventListener("click", (e) => {
    e.preventDefault();
    search.value = "";
    clear.hidden = true;
    query = "";
    render();
    search.focus();
  });

  document.querySelectorAll(".tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      render();
      window.scrollTo({ top: 0 });
    })
  );

  const confirm = $("confirm");
  let pending = null;
  const ask = (title, text, yes, action) => {
    $("confirm-title").textContent = title;
    $("confirm-text").textContent = text;
    $("confirm-yes").textContent = yes;
    pending = action;
    confirm.hidden = false;
  };
  $("reattach-all").addEventListener("click", () =>
    ask("Re-attach all apps?", "The Play Store will see every detached app again and offer updates for them.", "Re-attach all", reattachAll)
  );
  confirmAsk = ask;
  $("backup").addEventListener("click", () => openPicker("save"));
  $("restore").addEventListener("click", () => openPicker("restore"));
  const pickerEl = $("picker");
  $("picker-cancel").addEventListener("click", () => (pickerEl.hidden = true));
  pickerEl.addEventListener("click", (e) => {
    if (e.target === pickerEl) pickerEl.hidden = true;
  });
  $("picker-ok").addEventListener("click", saveBackup);
  $("picker-name").addEventListener("input", checkName);
  $("confirm-no").addEventListener("click", () => (confirm.hidden = true));
  confirm.addEventListener("click", (e) => {
    if (e.target === confirm) confirm.hidden = true;
  });
  $("confirm-yes").addEventListener("click", () => {
    confirm.hidden = true;
    if (pending) pending();
  });
}

async function main() {
  setupUi();

  if (!ksu) {
    setStatus("error", "Open this page from your root manager");
    listEl.replaceChildren();
    return;
  }

  await ready();

  exec(`sed -n 's/^version=//p' ${MODDIR}/module.prop`).then((r) => {
    const v = r.stdout.trim();
    if (v) $("version").textContent = `Zygisk module - ${v}`;
  });

  try {
    await loadPackages();
    await loadDetached();
  } catch (e) {
    setStatus("error", String(e.message || e));
  }
  render();
  refreshStatus();
}

main();
