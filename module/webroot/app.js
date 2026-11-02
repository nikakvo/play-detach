// Play Detach WebUI
// Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

const MODDIR = "/data/adb/modules/play-detach";
const CLI = `${MODDIR}/play-detach`;
const PKG_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

const $ = (id) => document.getElementById(id);
const I18N = window.PD_I18N;
const t = I18N.t;

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

// Commands that change the list. The live status refresh waits while one runs,
// so it never redraws a switch the user just flipped.
let busy = 0;
async function change(cmd) {
  busy++;
  try {
    return await exec(cmd);
  } finally {
    busy--;
  }
}

const lines = (s) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {Map<string, {pkg: string, label: string, system: boolean, installed: boolean, detached: boolean, sideloaded: boolean, installer?: string}>} */
const apps = new Map();
let tab = "user";
let query = "";
let sideKnown = false; // installer info loaded
let sideOnly = false; // User apps: show only sideloaded apps
let selecting = false;
const selected = new Set();

function addApp(pkg, system) {
  if (!PKG_RE.test(pkg) || apps.has(pkg)) return;
  apps.set(pkg, { pkg, label: pkg, system, installed: true, detached: false, sideloaded: false });
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

// Apps not installed by the Play Store (APK files, other stores, patched apps).
// The Play Store can still replace them with its own version.
// pm is also the live list of user apps: the manager's package list can be
// cached, so apps installed or removed since then are added or marked here.
async function loadInstallers(pending) {
  const res = await (pending || exec("pm list packages -3 -i"));
  if (res.errno !== 0) return false;
  const found = new Map();
  for (const l of lines(res.stdout)) {
    const m = l.match(/^package:(\S+)\s+installer=(\S*)/);
    if (m && PKG_RE.test(m[1])) found.set(m[1], m[2]);
  }
  if (!found.size) return false;

  const added = [];
  for (const [pkg, installer] of found) {
    let app = apps.get(pkg);
    if (!app || !app.installed) {
      app = { pkg, label: app ? app.label : pkg, system: false, installed: true, detached: !!(app && app.detached), sideloaded: false };
      apps.set(pkg, app);
      added.push(pkg);
    }
    app.installer = installer;
    if (!app.system) app.sideloaded = installer !== "com.android.vending";
  }
  for (const [pkg, a] of apps) {
    if (!a.installed || a.system || found.has(pkg)) continue;
    selected.delete(pkg);
    if (a.detached) Object.assign(a, { installed: false, sideloaded: false, installer: undefined });
    else apps.delete(pkg);
  }
  if (added.length && hasPkgApi) {
    for (const info of getPackagesInfo(added)) {
      const app = apps.get(info.packageName);
      if (app && info.appLabel) app.label = info.appLabel;
    }
  }
  return true;
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
  const el = document.createElement("div");
  el.className = "tile";
  el.style.background = tileColor(app.pkg);
  el.textContent = (app.label.match(/[\p{L}\p{N}]/u) || ["?"])[0];
  return el;
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
  // The name is shortened, the badge after it always stays visible
  const text = document.createElement("span");
  text.className = "label";
  text.textContent = app.label;
  name.append(text);
  const pkg = document.createElement("div");
  pkg.className = "pkg";
  pkg.textContent = app.pkg;
  if (!app.installed) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = t("not_installed");
    name.append(b);
  } else if (app.sideloaded) {
    const b = document.createElement("span");
    b.className = "badge side";
    b.textContent = t("sideloaded");
    name.append(b);
  }
  meta.append(name, pkg);

  const sw = document.createElement("span");
  sw.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("role", "switch");
  input.setAttribute("aria-label", t("detach_app_aria", app.label));
  input.checked = app.detached;
  input.addEventListener("change", () => toggle(app, input, row));
  const track = document.createElement("span");
  track.className = "track";
  sw.append(input, track);

  const check = document.createElement("span");
  check.className = "check";
  check.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 12.5l3.5 3.5 7.5-8"/></svg>';
  const ctl = document.createElement("span");
  ctl.className = "ctl";
  ctl.append(sw, check);

  if (selected.has(app.pkg)) row.classList.add("sel");
  row.append(makeIcon(app), meta, ctl);
  addPress(row, app);
  return row;
}

// Long press opens the app menu (or selects while selecting). In selection
// mode a tap selects instead of switching.
function addPress(row, app) {
  let timer = null, sx = 0, sy = 0, fired = false;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  row.addEventListener("pointerdown", (e) => {
    fired = false;
    sx = e.clientX;
    sy = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      if (navigator.vibrate) navigator.vibrate(12);
      if (selecting) toggleSelect(app, row);
      else openAppSheet(app);
    }, 480);
  });
  row.addEventListener("pointermove", (e) => {
    if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) cancel();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => row.addEventListener(ev, cancel));
  row.addEventListener("contextmenu", (e) => e.preventDefault());
  row.addEventListener("click", (e) => {
    if (fired) {
      e.preventDefault();
      fired = false;
      return;
    }
    if (selecting) {
      e.preventDefault();
      toggleSelect(app, row);
    }
  });
}

function visibleApps() {
  const q = query.toLowerCase();
  return [...apps.values()]
    .filter((a) => {
      if (tab === "detached" && !a.detached) return false;
      if (tab === "user" && a.system) return false;
      if (tab === "system" && !a.system) return false;
      if (tab === "user" && sideOnly && !a.sideloaded) return false;
      if (q && !a.label.toLowerCase().includes(q) && !a.pkg.toLowerCase().includes(q)) return false;
      return true;
    })
    // Not installed first (easy to find and remove), then detached, then by name
    .sort((a, b) => (a.installed - b.installed) || (b.detached - a.detached) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

function emptyHtml(title, hint) {
  const esc = (x) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  return `<strong>${esc(t(title))}</strong>` + (hint ? `<span>${esc(t(hint))}</span>` : "");
}

function emptyState() {
  const div = document.createElement("div");
  div.className = "empty";
  if (query) {
    div.innerHTML = emptyHtml("empty_matches", "empty_matches_hint");
  } else if (tab === "detached") {
    div.innerHTML = `
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="8" y="22" width="26" height="20" rx="6" fill="#c77dff"/>
        <rect x="34" y="26" width="8" height="4" rx="2" fill="#c77dff"/>
        <rect x="34" y="34" width="8" height="4" rx="2" fill="#c77dff"/>
        <polygon points="17,27 17,37 25,32" fill="#22062f"/>
        <rect x="48" y="18" width="10" height="28" rx="4" stroke="#c77dff" stroke-width="3"/>
      </svg>
      ${emptyHtml("empty_detached", "empty_detached_hint")}`;
  } else if (tab === "user" && sideOnly) {
    div.innerHTML = emptyHtml("empty_side", "empty_side_hint");
  } else {
    div.innerHTML = emptyHtml("empty_none");
  }
  return div;
}

function render() {
  const items = visibleApps();
  const frag = document.createDocumentFragment();
  if (items.length === 0) frag.append(emptyState());
  else items.forEach((a) => frag.append(makeRow(a)));
  listEl.replaceChildren(frag);
  $("actions").hidden = tab !== "detached";
  $("user-actions").hidden = tab !== "user";
  document.body.dataset.tab = tab;
  updateCounts();
  updateSelbar();
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
  $("reattach-all").disabled = detached === 0;

  let side = 0, ghosts = 0;
  for (const a of apps.values()) {
    if (a.installed && a.sideloaded) side++;
    if (!a.installed && a.detached) ghosts++;
  }
  $("n-side").textContent = side;
  $("side").hidden = !sideKnown;
  $("side").setAttribute("aria-pressed", String(sideOnly));
  $("user-actions").classList.toggle("two", !sideKnown);
  $("ghost-note").hidden = !(tab === "detached" && ghosts > 0 && !selecting);
  $("ghost-text").textContent = t("ghost_note", ghosts);
  return detached;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

let toastTimer;
function toast(msg, error = false) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.toggle("error", error);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), error ? 4500 : 2200);
}

async function toggle(app, input, row) {
  const on = input.checked;
  // Show the new state right away; revert only if the command fails.
  row.classList.toggle("on", on);
  input.disabled = true;

  const res = await change(`${CLI} ${on ? "add" : "remove"} ${app.pkg}`);
  input.disabled = false;

  if (res.errno === 0) {
    app.detached = on;
    toast(on ? t("t_detached", app.label) : t("t_reattached", app.label));
    if (!on && !app.installed) {
      apps.delete(app.pkg);
      row.remove();
    }
    updateCounts();
    refreshStatus();
  } else {
    input.checked = !on;
    row.classList.toggle("on", !on);
    toast(res.stderr.trim() || t("e_change_list"), true);
  }
}

async function reattachAll() {
  const res = await change(`${CLI} clear`);
  if (res.errno !== 0) {
    toast(res.stderr.trim() || t("e_clear_list"), true);
    return;
  }
  for (const [pkg, a] of apps) {
    if (!a.installed) apps.delete(pkg);
    else a.detached = false;
  }
  render();
  refreshStatus();
  toast(t("t_all_reattached"));
}

// ---------------------------------------------------------------------------
// Several apps at once
// ---------------------------------------------------------------------------

const plural = (n) => t("apps", n);

// Adds or removes many packages with one command and one Play Store restart.
async function bulk(pkgs, on) {
  if (pkgs.length === 0) return true;
  const res = await change(`${CLI} ${on ? "add" : "remove"} ${pkgs.join(" ")}`);
  if (res.errno !== 0) {
    toast(res.stderr.trim() || t("e_change_list"), true);
    return false;
  }
  for (const pkg of pkgs) {
    const a = apps.get(pkg);
    if (!a) continue;
    if (!on && !a.installed) apps.delete(pkg);
    else a.detached = on;
  }
  return true;
}

function startSelect(app) {
  selecting = true;
  selected.clear();
  if (app) selected.add(app.pkg);
  document.body.classList.add("selecting");
  render();
}

function stopSelect() {
  selecting = false;
  selected.clear();
  document.body.classList.remove("selecting");
  render();
}

function toggleSelect(app, row) {
  if (selected.has(app.pkg)) selected.delete(app.pkg);
  else selected.add(app.pkg);
  row.classList.toggle("sel", selected.has(app.pkg));
  updateSelbar();
}

function updateSelbar() {
  $("selbar").hidden = !selecting;
  if (!selecting) return;
  const shown = visibleApps();
  const all = shown.length > 0 && shown.every((a) => selected.has(a.pkg));
  $("sel-count").textContent = t("n_selected", selected.size);
  $("sel-all").textContent = all ? t("select_none") : t("select_all");
  let canOn = 0, canOff = 0;
  for (const pkg of selected) {
    const a = apps.get(pkg);
    if (!a) continue;
    if (a.detached) canOff++;
    else canOn++;
  }
  $("sel-detach").disabled = canOn === 0;
  $("sel-attach").disabled = canOff === 0;
}

async function applySelected(on) {
  const pkgs = [...selected].filter((p) => apps.has(p) && apps.get(p).detached !== on);
  if (!(await bulk(pkgs, on))) return;
  stopSelect();
  refreshStatus();
  toast(on ? t("t_n_detached", pkgs.length) : t("t_n_reattached", pkgs.length));
}

async function detachShown() {
  const pkgs = visibleApps().filter((a) => !a.detached).map((a) => a.pkg);
  if (!(await bulk(pkgs, true))) return;
  render();
  refreshStatus();
  toast(t("t_n_detached", pkgs.length));
}

async function removeGhosts() {
  const pkgs = [...apps.values()].filter((a) => !a.installed && a.detached).map((a) => a.pkg);
  if (!(await bulk(pkgs, false))) return;
  render();
  refreshStatus();
  toast(t("t_n_removed", pkgs.length));
}

// ---------------------------------------------------------------------------
// App menu (long press)
// ---------------------------------------------------------------------------

// Readable name for the app that installed a package.
// Values starting with "@" are text keys, the rest are product names.
const INSTALLERS = {
  "com.android.vending": "@inst_store",
  "com.miui.packageinstaller": "@inst_apk",
  "com.google.android.packageinstaller": "@inst_apk",
  "com.android.packageinstaller": "@inst_apk",
  "com.miui.backup": "@inst_xiaomi_backup",
  "com.aurora.store": "Aurora Store",
  "org.fdroid.fdroid": "F-Droid",
  "org.fdroid.basic": "F-Droid",
  "com.looker.droidify": "Droid-ify",
  "dev.imranr.obtainium": "Obtainium",
  "com.machiav3lli.backup": "@inst_neo_backup",
  "org.swiftapps.swiftbackup": "@inst_swift_backup",
};
function installerName(i) {
  if (!i || i === "null") return t("inst_unknown");
  const v = INSTALLERS[i];
  if (v) return v[0] === "@" ? t(v.slice(1)) : v;
  if (/\.sai(\.|$)/.test(i)) return t("inst_sai");
  return i;
}

let sheetApp = null;

function openAppSheet(app) {
  sheetApp = app;
  $("app-title").textContent = app.label;
  $("app-pkg").textContent = app.pkg;
  const known = app.installed && app.installer !== undefined;
  $("app-src").hidden = !known;
  if (known) $("app-src").textContent = t("installed_by", installerName(app.installer));
  $("app-ico").replaceChildren(makeIcon(app));
  $("appsheet").hidden = false;
}

async function openInStore(app) {
  $("appsheet").hidden = true;
  const res = await exec(
    `am start -a android.intent.action.VIEW -d ${sq("market://details?id=" + app.pkg)} -p com.android.vending`
  );
  if (res.errno !== 0 || /Error/.test(res.stdout + res.stderr)) toast(t("e_open_store"), true);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    return ok;
  }
}

// ---------------------------------------------------------------------------
// Backup / restore with a built-in folder browser
// ---------------------------------------------------------------------------

const STORAGE = "/data/media/0"; // internal storage as seen by root
const sq = (str) => `'${str.replace(/'/g, `'\\''`)}'`;
const niceDir = (dir) => t("internal_storage") + dir.slice(STORAGE.length);

const FOLDER_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.6l2 2h7.4A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>';
const FILE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>';
const UP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

const BACKUP_DIR = `${STORAGE}/Play-Detach`;
const AUTO_NAME = "play-detach-auto.txt";

// The Play-Detach folder the installer creates; Download if it was deleted.
async function startDir() {
  const res = await exec(
    `for d in ${sq(BACKUP_DIR)} ${sq(STORAGE + "/Download")}; do [ -d "$d" ] && { echo "$d"; break; }; done`
  );
  const d = res.stdout.trim();
  return d.startsWith(STORAGE) ? d : STORAGE;
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
    toast(t("e_open_folder"), true);
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
  addCrumb(t("internal_storage"), STORAGE);
  for (const part of parts) {
    path += "/" + part;
    addCrumb(part, path);
  }

  // Entries
  const list = $("picker-list");
  const frag = document.createDocumentFragment();
  if (dir !== STORAGE) {
    frag.append(entryButton(UP_ICON, t("up_one_folder"), "up", () => openDir(dir.slice(0, dir.lastIndexOf("/")))));
  }
  for (const d of data.dirs) {
    if (d.startsWith(".")) continue;
    frag.append(entryButton(FOLDER_ICON, d, "folder", () => openDir(`${dir}/${d}`)));
  }
  if (picker.mode === "restore") {
    // The automatic backup first, marked as such
    const files = data.files.filter((f) => !f.startsWith(".") && f.toLowerCase().endsWith(".txt"));
    files.sort((x, y) => (y === AUTO_NAME) - (x === AUTO_NAME));
    for (const f of files) {
      const auto = f === AUTO_NAME;
      const b = entryButton(FILE_ICON, auto ? t("auto_backup") : f, auto ? "file auto" : "file", () =>
        askRestore(`${dir}/${f}`)
      );
      if (auto) {
        const small = document.createElement("small");
        small.textContent = t("auto_backup_entry_hint");
        b.querySelector("span").append(small);
      }
      frag.append(b);
    }
  }
  if (!frag.childElementCount || (frag.childElementCount === 1 && dir !== STORAGE)) {
    const empty = document.createElement("div");
    empty.className = "picker-empty";
    empty.textContent = picker.mode === "restore" ? t("no_folders_files") : t("no_folders");
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
  $("picker-title").textContent = save ? t("save_backup") : t("choose_backup");
  $("picker-save").hidden = !save;
  $("picker-ok").hidden = !save;
  if (save) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    $("picker-name").value = `play-detach-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.txt`;
  }
  $("picker").hidden = false;
  loadAutoBackup();
  startDir().then(openDir);
}

async function saveBackup() {
  const name = cleanName();
  if (!name) return;
  const file = `${picker.dir}/${name}`;
  $("picker").hidden = true;
  const res = await exec(`${CLI} backup ${sq(file)}`);
  if (res.errno !== 0) {
    toast(res.stderr.trim() || t("e_save_backup"), true);
    return;
  }
  const n = updateCounts();
  toast(t("t_saved", n, niceDir(file)));
}

// Automatic backup switch, in the backup sheet and in Status and settings
// (play-detach autobackup)
async function loadAutoBackup() {
  const res = await exec(`${CLI} autobackup`);
  const m = res.stdout.match(/Automatic backup: (on|off)/);
  $("auto-row").hidden = !m;
  $("set-backup-row").hidden = !m;
  if (m) {
    $("auto-switch").checked = m[1] === "on";
    $("set-backup").checked = m[1] === "on";
  }
}

async function setAutoBackup(on, sw) {
  sw.disabled = true;
  const res = await exec(`${CLI} autobackup ${on ? "on" : "off"}`);
  sw.disabled = false;
  if (res.errno !== 0) {
    sw.checked = !on;
    toast(res.stderr.trim() || t("e_auto_backup"), true);
    return;
  }
  $("auto-switch").checked = on;
  $("set-backup").checked = on;
  toast(on ? t("t_auto_on") : t("t_auto_off"));
}

let confirmAsk = null; // set in setupUi

function askRestore(file) {
  confirmAsk(
    t("c_restore_title"),
    t("c_restore_text", niceDir(file)),
    t("restore"),
    () => restore(file)
  );
}

async function restore(file) {
  $("picker").hidden = true;
  const res = await change(`${CLI} restore ${sq(file)}`);
  if (res.errno !== 0) {
    toast(res.stderr.trim().replace(STORAGE, t("internal_storage")) || t("e_restore_backup"), true);
    return;
  }
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
  toast(t("t_restored", n));
}

// ---------------------------------------------------------------------------
// Language (EN / RU)
// ---------------------------------------------------------------------------

const LANG_FILE = "/data/adb/play-detach/lang";
let moduleVersion = "";
let loaded = false; // the app list is on screen

function showVersion() {
  $("version").textContent = moduleVersion ? `${t("zygisk_module")} - ${moduleVersion}` : t("zygisk_module");
}

// Redraws every text on the page in the current language.
function relabel() {
  I18N.apply();
  showVersion();
  if (!loaded) return;
  render();
  refreshStatus();
  if (!$("auto-note").hidden) showAutoNote();
}

// Saves the choice for the installer, the notifications and the module
// description shown in the root manager.
function saveLang(l) {
  const desc = I18N.description(l);
  return exec(
    `mkdir -p /data/adb/play-detach && echo ${l} > ${LANG_FILE} && ` +
      `sed -i ${sq("s|^description=.*|description=" + desc + "|")} ${MODDIR}/module.prop`
  );
}

async function chooseLang(l) {
  if (l === I18N.lang) return;
  I18N.set(l);
  relabel();
  await saveLang(l);
}

// The page remembers the language itself; the file is the fallback when the
// browser storage was cleared (and is what the installer reads). Each time the
// WebUI opens, the file and the module description are made to match the
// language on the page, so they can never stay different.
async function syncLangFromFile() {
  const r = await exec(`cat ${LANG_FILE} 2>/dev/null; echo; sed -n 's/^description=//p' ${MODDIR}/module.prop`);
  const [file = "", desc = ""] = r.stdout.split("\n").map((x) => x.trim());
  if (!I18N.hasSaved() && (file === "en" || file === "ru") && file !== I18N.lang) {
    I18N.set(file);
    relabel();
  }
  const l = I18N.lang;
  if (file !== l || desc !== I18N.description(l)) await saveLang(l);
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------

function setStatus(state, text) {
  $("status").dataset.state = state;
  $("status-text").textContent = text;
}

// Steps the module reports when it cannot start in the Play Store
const FAIL_STEPS = ["field", "binder", "plt", "api", "list"];

// Last result of play-detach status, for the Status and settings sheet
let st = null;

// One status check: the status file written by the module, the self-check
// result saved right after the Play Store started, the Play Store version
// saved by the background watcher, and the last module log line as a fallback.
async function readState() {
  const [res, log] = await Promise.all([exec(`${CLI} status`), exec("logcat -d -s PlayDetach | tail -n 1")]);
  const kv = {};
  for (const l of lines(res.stdout)) {
    const m = l.match(/^(\w+)=(\S*)$/);
    if (m) kv[m[1]] = m[2];
  }
  const num = (k) => Number(kv[k]) || 0;
  const last = log.stdout.trim();
  const s = {
    ok: res.errno === 0 && "loaded" in kv,
    loaded: num("loaded"),
    listChanged: num("list_changed"),
    storeChanged: num("store_changed"),
    storeVersion: kv.store_version && kv.store_version !== "unknown" ? kv.store_version : "",
    hook: kv.hook || "unknown",
    api: num("api"),
    autodetach: kv.autodetach === "on",
    appsChanged: num("apps_changed"),
    detached: "detached" in kv ? num("detached") : -1,
    logError: /\sE PlayDetach\b/.test(last) ? last.replace(/^.*PlayDetach:\s*/, "") : "",
    logActive: /active in Play Store/.test(last),
  };

  // state: idle | ok | warn | error, phase: none | fail | log | store | ok | pending
  const count = updateCounts();
  if (count === 0) Object.assign(s, { state: "idle", phase: "none" });
  else if (FAIL_STEPS.includes(s.hook)) Object.assign(s, { state: "error", phase: "fail" });
  else if (s.hook === "unknown" && s.logError) Object.assign(s, { state: "error", phase: "log" });
  else if (s.storeChanged > s.loaded) Object.assign(s, { state: "warn", phase: "store" });
  else if (s.loaded > 0 && s.loaded >= s.listChanged) Object.assign(s, { state: "ok", phase: "ok" });
  else if (!s.loaded && s.logActive) Object.assign(s, { state: "ok", phase: "ok" });
  else Object.assign(s, { state: "warn", phase: "pending" });
  return s;
}

async function refreshStatus() {
  st = await readState();
  const n = updateCounts();
  const why = (step) => t("why_" + step);
  const text = {
    none: () => t("s_none"),
    fail: () => t("s_fail", why(st.hook)),
    log: () => t("s_problem", st.logError),
    store: () => t("s_store_updated", n),
    ok: () => t("s_active", n),
    pending: () => t("s_pending", n),
  }[st.phase];
  setStatus(st.state, text());
  $("status-auto").hidden = !st.autodetach;
  if (!$("settings").hidden) renderSettings();
}

// ---------------------------------------------------------------------------
// Status and settings sheet, automatic detach of new sideloaded apps
// ---------------------------------------------------------------------------

const AUTO_LOG = "/data/adb/play-detach/auto.log";
const AUTO_SEEN_KEY = "pd-auto-seen";
let autoLog = []; // [{time, pkg}] or [{time, skip}]

const when = (sec) =>
  new Date(sec * 1000).toLocaleString(I18N.lang === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const labelOf = (pkg) => (apps.get(pkg) && apps.get(pkg).label) || pkg;

function renderSettings() {
  if (!st) return;
  const check = $("check");
  check.dataset.state = st.state;
  const title = { none: "chk_none", fail: "chk_fail", log: "chk_fail", store: "chk_wait", ok: "chk_ok", pending: "chk_wait" };
  $("check-title").textContent = t(title[st.phase]);

  const rows = [];
  const add = (text, bad) => rows.push({ text, bad });
  if (st.phase === "none") add(t("chk_none_line"));
  if (st.storeVersion) add(t("chk_store", st.storeVersion));
  if (st.storeChanged > 0) add(t("chk_store_updated", when(st.storeChanged)));
  if (st.phase !== "none") {
    add(st.loaded > 0 ? t("chk_last_start", when(st.loaded)) : t("chk_never"));
    if (FAIL_STEPS.includes(st.hook)) add(t("chk_hook_fail", t("why_" + st.hook)), true);
    else if (st.hook === "ok") add(t("chk_hook_ok", st.api));
    else if (st.loaded > 0 || st.logError) add(t("chk_hook_unknown"));
    if (st.phase === "log") add(st.logError, true);
    if (st.phase === "store") add(t("chk_after_update"));
    if (st.phase === "pending") add(t("chk_pending"));
  }
  const ul = $("check-lines");
  ul.replaceChildren(
    ...rows.map((r) => {
      const li = document.createElement("li");
      li.textContent = r.text;
      if (r.bad) li.className = "bad";
      return li;
    })
  );

  $("ad-switch").checked = st.autodetach;

  const recent = autoApps(autoLog).slice(0, 5);
  $("recent").hidden = recent.length === 0;
  $("recent-list").replaceChildren(
    ...recent.map((e) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = labelOf(e.pkg);
      const time = document.createElement("time");
      time.textContent = when(e.time);
      li.append(name, time);
      return li;
    })
  );
}

// Apps detached automatically, newest first, each app once (the newest time),
// and only apps that are still installed: an app that was removed and
// installed again is listed once.
function autoApps(entries) {
  const seen = new Set();
  const out = [];
  for (const e of [...entries].reverse()) {
    if (!e.pkg || seen.has(e.pkg)) continue;
    seen.add(e.pkg);
    const a = apps.get(e.pkg);
    if (a && a.installed) out.push(e);
  }
  return out;
}

async function loadAutoLog() {
  const r = await exec(`cat ${AUTO_LOG} 2>/dev/null`);
  autoLog = [];
  for (const l of lines(r.stdout)) {
    const m = l.match(/^(\d+) (?:skip (\d+)|([A-Za-z0-9_.]+))$/);
    if (!m) continue;
    if (m[2]) autoLog.push({ time: Number(m[1]), skip: Number(m[2]) });
    else if (PKG_RE.test(m[3])) autoLog.push({ time: Number(m[1]), pkg: m[3] });
  }
}

function autoSeen() {
  try {
    return Number(localStorage.getItem(AUTO_SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Note at the top of the list: apps detached automatically since the page
// was last opened (only the last 7 days, in case the storage was cleared).
function showAutoNote() {
  const since = Math.max(autoSeen(), Date.now() / 1000 - 7 * 86400);
  const fresh = autoLog.filter((e) => e.time > since);
  const pkgs = autoApps(fresh).map((e) => labelOf(e.pkg));
  const skipped = fresh.filter((e) => e.skip).reduce((a, e) => a + e.skip, 0);
  const parts = [];
  if (pkgs.length) parts.push(t("auto_note", pkgs.join(", ")));
  if (skipped) parts.push(t("auto_note_skip", skipped));
  $("auto-text").textContent = parts.join(" ");
  $("auto-note").hidden = parts.length === 0;
}

function dismissAutoNote() {
  const newest = autoLog.reduce((a, e) => Math.max(a, e.time), 0);
  try {
    localStorage.setItem(AUTO_SEEN_KEY, String(Math.max(newest, Math.floor(Date.now() / 1000))));
  } catch {}
  $("auto-note").hidden = true;
}

async function openSettings() {
  if (!ksu || !st) return;
  renderSettings();
  $("settings").hidden = false;
  loadAutoBackup();
  await Promise.all([loadAutoLog(), refreshStatus()]);
  renderSettings();
}

async function setAutoDetach(on) {
  const sw = $("ad-switch");
  sw.disabled = true;
  const res = await change(`${CLI} autodetach ${on ? "on" : "off"}`);
  sw.disabled = false;
  if (res.errno !== 0 || !/Auto-detach: (on|off)/.test(res.stdout)) {
    sw.checked = !on;
    toast(res.stderr.trim() || t("e_ad"), true);
    return;
  }
  if (st) st.autodetach = on;
  $("status-auto").hidden = !on;
  toast(on ? t("t_ad_on") : t("t_ad_off"));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setupUi() {
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => chooseLang(b.dataset.lang)));

  const search = $("search");
  const clear = $("clear");
  let searchTimer;
  search.addEventListener("input", () => {
    clear.hidden = !search.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
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
      if (selecting) {
        selecting = false;
        selected.clear();
        document.body.classList.remove("selecting");
      }
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
    ask(t("c_reattach_title"), t("c_reattach_text"), t("reattach_all"), reattachAll)
  );
  confirmAsk = ask;
  $("backup").addEventListener("click", () => openPicker("save"));

  $("side").addEventListener("click", () => {
    sideOnly = !sideOnly;
    render();
    window.scrollTo({ top: 0 });
  });
  $("select").addEventListener("click", () => (selecting ? stopSelect() : startSelect(null)));
  $("detach-shown").addEventListener("click", () => {
    const n = visibleApps().filter((a) => !a.detached).length;
    if (n === 0) {
      toast(t("t_all_detached_already"));
      return;
    }
    const what = query ? t("what_search") : sideOnly ? t("what_side") : t("what_user");
    ask(
      t("c_detach_title", n),
      t("c_detach_text", what, n),
      t("detach"),
      detachShown
    );
  });
  $("ghost-remove").addEventListener("click", () => {
    const n = [...apps.values()].filter((a) => !a.installed && a.detached).length;
    ask(
      t("c_ghost_title"),
      t("c_ghost_text", n),
      t("remove"),
      removeGhosts
    );
  });

  $("sel-close").addEventListener("click", stopSelect);
  $("sel-all").addEventListener("click", () => {
    const shown = visibleApps();
    const all = shown.length > 0 && shown.every((a) => selected.has(a.pkg));
    shown.forEach((a) => (all ? selected.delete(a.pkg) : selected.add(a.pkg)));
    render();
  });
  $("sel-detach").addEventListener("click", () => applySelected(true));
  $("sel-attach").addEventListener("click", () => applySelected(false));

  const sheet = $("appsheet");
  $("app-close").addEventListener("click", () => (sheet.hidden = true));
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) sheet.hidden = true;
  });
  $("app-store").addEventListener("click", () => openInStore(sheetApp));
  $("app-select").addEventListener("click", () => {
    sheet.hidden = true;
    startSelect(sheetApp);
  });
  $("app-copy").addEventListener("click", async () => {
    sheet.hidden = true;
    toast((await copyText(sheetApp.pkg)) ? t("t_copied") : t("t_copy_failed"), false);
  });
  $("restore").addEventListener("click", () => openPicker("restore"));
  const pickerEl = $("picker");
  $("picker-cancel").addEventListener("click", () => (pickerEl.hidden = true));
  pickerEl.addEventListener("click", (e) => {
    if (e.target === pickerEl) pickerEl.hidden = true;
  });
  $("picker-ok").addEventListener("click", saveBackup);
  $("picker-name").addEventListener("input", checkName);
  $("auto-switch").addEventListener("change", (e) => setAutoBackup(e.target.checked, e.target));
  $("set-backup").addEventListener("change", (e) => setAutoBackup(e.target.checked, e.target));
  $("ad-switch").addEventListener("change", (e) => setAutoDetach(e.target.checked));

  const settings = $("settings");
  $("status").addEventListener("click", openSettings);
  $("settings-close").addEventListener("click", () => (settings.hidden = true));
  settings.addEventListener("click", (e) => {
    if (e.target === settings) settings.hidden = true;
  });
  $("auto-ok").addEventListener("click", dismissAutoNote);
  $("confirm-no").addEventListener("click", () => (confirm.hidden = true));
  confirm.addEventListener("click", (e) => {
    if (e.target === confirm) confirm.hidden = true;
  });
  $("confirm-yes").addEventListener("click", () => {
    confirm.hidden = true;
    if (pending) pending();
  });
}

// ---------------------------------------------------------------------------
// Live refresh: the status every 3 seconds while the page is on screen, and
// right away when it comes back. If the list changed outside the page (an app
// detached automatically, or the command line), the list is read again.
// ---------------------------------------------------------------------------

let polling = false;
let appsStamp = -1; // apps_changed from status when the app list was last read

async function reloadList() {
  for (const [pkg, a] of apps) {
    if (!a.installed) apps.delete(pkg);
    else a.detached = false;
  }
  try {
    await loadDetached();
  } catch {}
  render();
  await loadAutoLog();
  showAutoNote();
}

async function poll() {
  if (polling || busy || document.hidden || !loaded) return;
  polling = true;
  try {
    await refreshStatus();
    if (!busy && st && appsStamp >= 0 && st.appsChanged !== appsStamp) {
      // An app was installed or removed
      appsStamp = st.appsChanged;
      if (await loadInstallers()) sideKnown = true;
      await reloadList();
      await refreshStatus();
    } else if (!busy && st && st.detached >= 0) {
      let local = 0;
      for (const a of apps.values()) if (a.detached) local++;
      if (local !== st.detached) await reloadList();
    }
  } finally {
    polling = false;
  }
}

function startLive() {
  setInterval(poll, 3000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) poll();
  });
  window.addEventListener("pageshow", poll);
  window.addEventListener("focus", poll);
}

async function main() {
  I18N.apply();
  setupUi();

  if (!ksu) {
    setStatus("error", t("e_no_bridge"));
    listEl.replaceChildren();
    return;
  }

  await ready();
  syncLangFromFile();

  exec(`sed -n 's/^version=//p' ${MODDIR}/module.prop`).then((r) => {
    const v = r.stdout.trim();
    if (v) {
      moduleVersion = v;
      showVersion();
    }
  });

  // The app list from the root manager can be out of date, so the live list
  // from pm is read at the same time and applied before the first drawing
  // (otherwise newly installed apps flash as "not installed").
  const stamp = exec(`${CLI} status`).then((r) => {
    const m = r.stdout.match(/^apps_changed=(\d+)$/m);
    return m ? Number(m[1]) : 0;
  });
  const pm = stamp.then(() => exec("pm list packages -3 -i"));
  try {
    await loadPackages();
    await loadDetached();
  } catch (e) {
    setStatus("error", String(e.message || e));
  }
  if (await loadInstallers(pm)) sideKnown = true;
  appsStamp = await stamp;
  loaded = true;
  render();
  refreshStatus();
  loadAutoLog().then(showAutoNote);
  startLive();
}

main();
