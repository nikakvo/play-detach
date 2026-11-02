// Play Detach help page
// Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

const I18N = window.PD_I18N;
const t = I18N.t;

// Shows the help text in the current language.
function showLang() {
  I18N.apply();
  document.title = `Play Detach - ${t("help_title")}`;
  document.querySelectorAll("[data-body]").forEach((m) => (m.hidden = m.dataset.body !== I18N.lang));
  document.querySelectorAll(".help .copy").forEach((b) => b.setAttribute("aria-label", t("copy_command")));
}

// Same as the main page: remember the choice and update the module
// description in the root manager.
function chooseLang(l) {
  if (l === I18N.lang) return;
  I18N.set(l);
  showLang();
  window.scrollTo({ top: 0 });
  const ksu = window.ksu;
  if (!ksu || typeof ksu.exec !== "function") return;
  const desc = I18N.description(l).replace(/'/g, "'\\''");
  const cb = `pd_help_${Date.now()}`;
  window[cb] = () => delete window[cb];
  try {
    ksu.exec(
      `mkdir -p /data/adb/play-detach && echo ${l} > /data/adb/play-detach/lang && ` +
        `sed -i 's|^description=.*|description=${desc}|' /data/adb/modules/play-detach/module.prop`,
      "{}",
      cb
    );
  } catch {}
}

document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => chooseLang(b.dataset.lang)));

// Back arrow: return to the previous page instead of opening index.html again,
// so the phone's back button leaves the module afterwards.
document.getElementById("back").addEventListener("click", (e) => {
  if (history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.append(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return fallbackCopy(text);
  }
}

const COPY_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
const DONE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

document.querySelectorAll(".help pre").forEach((pre) => {
  const wrap = document.createElement("div");
  wrap.className = "code";
  pre.replaceWith(wrap);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy";
  btn.setAttribute("aria-label", t("copy_command"));
  btn.innerHTML = COPY_ICON;
  btn.addEventListener("click", async () => {
    if (await copy(pre.textContent)) {
      btn.innerHTML = DONE_ICON;
      btn.classList.add("done");
      toast(t("copied"));
      setTimeout(() => {
        btn.innerHTML = COPY_ICON;
        btn.classList.remove("done");
      }, 1500);
    } else {
      toast(t("copy_not_supported"));
    }
  });
  wrap.append(pre, btn);
});


// Contents: every section title gets a number and a link at the top of the
// page. Links scroll with JavaScript instead of changing the address, so the
// back arrow and the phone's back button still leave the help page.
function buildContents(main) {
  const sections = [...main.querySelectorAll(":scope > section")];
  const nav = document.createElement("nav");
  nav.className = "toc";
  const head = document.createElement("div");
  head.className = "toc-title";
  head.dataset.i18n = "contents";
  head.textContent = t("contents");
  nav.append(head);
  sections.forEach((sec, i) => {
    const h2 = sec.querySelector("h2");
    if (!h2) return;
    const n = i + 1;
    const title = h2.textContent;
    sec.id = `${main.dataset.body}-${n}`;
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(n);
    h2.prepend(num);
    const a = document.createElement("a");
    a.href = `#${sec.id}`;
    const an = document.createElement("span");
    an.className = "num";
    an.textContent = String(n);
    a.append(an, document.createTextNode(title));
    a.addEventListener("click", (e) => {
      e.preventDefault();
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nav.append(a);
  });
  main.prepend(nav);
}
document.querySelectorAll("main.help").forEach(buildContents);

// Arrow at the bottom right that goes back to the top
const topBtn = document.createElement("button");
topBtn.type = "button";
topBtn.className = "to-top";
topBtn.dataset.i18nAria = "to_top";
topBtn.setAttribute("aria-label", t("to_top"));
topBtn.innerHTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';
topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.body.append(topBtn);
const showTop = () => topBtn.classList.toggle("show", window.scrollY > 400);
window.addEventListener("scroll", showTop, { passive: true });
showTop();

showLang();
