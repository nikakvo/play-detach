// Play Detach WebUI - texts in English and Russian
// Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.
// Russian translation based on the work of LegacyFreeman.
//
// Plain script (not a module) so both pages can use it: it defines window.PD_I18N.
// Strings are plain text unless the key ends in _html.

(function () {
  // English: 1 app, 2 apps. Russian: 1 приложение, 2 приложения, 5 приложений.
  function pluralEn(n, one, many) {
    return n === 1 ? one : many;
  }
  function pluralRu(n, one, few, many) {
    const d = n % 10, h = n % 100;
    if (d === 1 && h !== 11) return one;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  }

  const en = {
    lang_name: "EN",
    help: "Help",
    zygisk_module: "Zygisk module",
    search_placeholder: "Search apps or packages",
    clear_search: "Clear search",
    tab_user: "User apps",
    tab_detached: "Detached",
    tab_system: "System apps",
    sideloaded: "Sideloaded",
    select: "Select",
    detach_all: "Detach all",
    back_up: "Back up",
    restore: "Restore",
    reattach_all: "Re-attach all",
    loading: "Loading...",
    remove: "Remove",
    cancel: "Cancel",
    close: "Close",
    detach: "Detach",
    reattach: "Re-attach",
    stop_selecting: "Stop selecting",
    select_all: "Select all",
    select_none: "Select none",
    n_selected: (n) => `${n} selected`,

    not_installed: "Not installed",
    detach_app_aria: (name) => `Detach ${name}`,

    menu_store: "Open in Play Store",
    menu_store_hint: "A detached app shows no Update button there",
    menu_select: "Select several apps",
    menu_select_hint: "Detach or re-attach many at once",
    menu_copy: "Copy package name",
    installed_by: (who) => `Installed by: ${who}`,
    inst_store: "Play Store",
    inst_apk: "Package installer (APK file)",
    inst_xiaomi_backup: "Xiaomi Backup (restored)",
    inst_neo_backup: "Neo Backup (restored)",
    inst_swift_backup: "Swift Backup (restored)",
    inst_sai: "SAI (Split APKs Installer)",
    inst_unknown: "Unknown (adb, a root shell or the ROM)",

    save_backup: "Save backup",
    choose_backup: "Choose a backup",
    file_name: "File name",
    file_exists: "A file with this name is already here and will be replaced.",
    save_here: "Save here",
    auto_backup: "Automatic backup",
    auto_backup_hint: "Saves play-detach-auto.txt to Play-Detach after every change",
    auto_backup_entry_hint: "saved after every change",
    internal_storage: "Internal storage",
    up_one_folder: "Up one folder",
    no_folders: "No folders here.",
    no_folders_files: "No folders or .txt files here.",

    apps: (n) => `${n} ${pluralEn(n, "app", "apps")}`,
    t_detached: (name) => `${name} detached`,
    t_reattached: (name) => `${name} re-attached`,
    t_n_detached: (n) => `${n} ${pluralEn(n, "app", "apps")} detached`,
    t_n_reattached: (n) => `${n} ${pluralEn(n, "app", "apps")} re-attached`,
    t_n_removed: (n) => `${n} ${pluralEn(n, "app", "apps")} removed from the list`,
    t_all_reattached: "All apps re-attached",
    t_saved: (n, where) => `Saved ${n} ${pluralEn(n, "app", "apps")} to ${where}`,
    t_restored: (n) => `Restored ${n} ${pluralEn(n, "app", "apps")} from backup`,
    t_auto_on: "Automatic backup on",
    t_auto_off: "Automatic backup off",
    t_copied: "Package name copied",
    t_copy_failed: "Could not copy",
    t_all_detached_already: "Every app in this list is already detached",
    e_change_list: "Could not change the list",
    e_clear_list: "Could not clear the list",
    e_open_store: "Could not open the Play Store",
    e_open_folder: "Could not open this folder",
    e_save_backup: "Could not save the backup",
    e_restore_backup: "Could not restore the backup",
    e_auto_backup: "Could not change the automatic backup",
    e_no_bridge: "Open this page from your root manager",

    ghost_note: (n) => `${n} ${pluralEn(n, "app on the list is", "apps on the list are")} not installed.`,

    c_reattach_title: "Re-attach all apps?",
    c_reattach_text: "The Play Store will see every detached app again and offer updates for them.",
    c_restore_title: "Restore this backup?",
    c_restore_text: (where) => `Your current list is replaced with the apps saved in ${where}.`,
    c_detach_title: (n) => `Detach ${n} ${pluralEn(n, "app", "apps")}?`,
    c_detach_text: (what, n) =>
      `All ${what} that are not detached yet (${n}) stop getting Play Store updates. You can re-attach them one by one or with Re-attach all.`,
    what_search: "apps that match your search",
    what_side: "sideloaded apps",
    what_user: "user apps",
    c_ghost_title: "Remove apps that are not installed?",
    c_ghost_text: (n) =>
      `${n} ${pluralEn(n, "app goes", "apps go")} off the list. Keep them if you will install them again, for example a patched app you are reinstalling: they stay detached then.`,

    empty_matches: "No matches",
    empty_matches_hint: "Try another name or package.",
    empty_detached: "No detached apps yet",
    empty_detached_hint: "Turn on the switch next to an app to stop Play Store updates for it.",
    empty_side: "No sideloaded apps",
    empty_side_hint: "Every user app here was installed by the Play Store.",
    empty_none: "No apps here",

    s_none: "No apps detached yet",
    s_active: (n) => `Active in Play Store - ${n} ${pluralEn(n, "app", "apps")} detached`,
    s_pending: (n) => `${n} ${pluralEn(n, "app", "apps")} detached - applies when the Play Store opens`,
    s_problem: (msg) => `Problem: ${msg}`,
    s_fail: (why) => `Not working: ${why}`,
    s_store_updated: (n) =>
      `Play Store updated - ${n} ${pluralEn(n, "app", "apps")} detached, checked when it opens`,

    // Status and settings
    auto_pill: "Auto",
    ok: "OK",
    settings_title: "Status and settings",
    chk_none: "Nothing detached yet",
    chk_none_line: "With an empty list the module stays out of the Play Store.",
    chk_ok: "Works in the Play Store",
    chk_wait: "Waiting for the Play Store",
    chk_fail: "Not working in the Play Store",
    chk_store: (v) => `Play Store version: ${v}`,
    chk_store_updated: (d) => `Play Store updated: ${d}`,
    chk_last_start: (d) => `Play Store last started: ${d}`,
    chk_never: "The Play Store has not started since the module was installed.",
    chk_hook_ok: (api) => `Self-check: the module is hooked into the Play Store (Android API ${api}).`,
    chk_hook_unknown: "Self-check: no result yet for the last Play Store start.",
    chk_hook_fail: (why) => `Self-check failed: ${why}`,
    chk_after_update: "The Play Store was updated after its last start. The module is checked again when it opens.",
    chk_pending: "The list changed after the last Play Store start. It applies when the Play Store opens.",
    why_field: "the Play Store or Android changed the call the module uses",
    why_binder: "Android changed (libbinder.so not found)",
    why_plt: "Android changed (the hook could not be placed)",
    why_api: "this Android version is not supported",
    why_list: "Zygisk could not pass the list to the Play Store",
    ad_title: "Detach new sideloaded apps",
    ad_hint: "Apps you install from an APK file, another store or as a patched app are detached right away, with a notification",
    t_ad_on: "New sideloaded apps will be detached automatically",
    t_ad_off: "Automatic detach off",
    e_ad: "Could not change the automatic detach",
    recent_title: "Detached automatically",
    s_notloaded: "Not working: Zygisk did not load the module in the Play Store",
    chk_notloaded: "The Play Store that runs now started without the module. Check that Zygisk (for example ReZygisk) is on, then reboot.",
    chk_zygisk: (n) => `Zygisk: ${n}`,
    chk_zygisk_none: "Zygisk: none found (ReZygisk, Zygisk Next, NeoZygisk or Magisk Zygisk is needed)",
    skip_title: "Never auto-detach apps installed by",
    skip_hint: "Turn on for stores that update their apps themselves",
    skip_none: "No other installers on this phone yet",
    t_skip_on: (n) => `Apps from ${n} are not detached automatically`,
    t_skip_off: (n) => `Apps from ${n} are detached automatically again`,
    e_skip: "Could not change the setting",
    hist_title: "Recent changes",
    hist_detach: "Detached",
    hist_reattach: "Re-attached",
    src_user: "by you",
    src_auto: "automatically",
    src_restore: "from a backup",
    src_import: "imported",
    app_hist: (what, at, src) => `${what} ${at}, ${src}`,
    share_hint: "Or send the list as text, for example to another phone",
    copy_list: "Copy list",
    share_list: "Share",
    t_list_copied: (n) => `${n} package ${pluralEn(n, "name", "names")} copied`,
    e_share: "Could not open the share menu",
    auto_note: (names) => `Detached automatically: ${names}.`,
    auto_note_skip: (n) =>
      `${n} new apps were installed at once, probably restored from a backup. They were not detached automatically.`,

    module_description: "Stops the Play Store from updating the apps you choose. Auto-detach of sideloaded apps, backups and a self-check.",

    // Help page
    help_title: "Help",
    back_to_apps: "Back to apps",
    copy_command: "Copy command",
    copied: "Command copied",
    copy_not_supported: "Copying is not supported here",
    contents: "Contents",
    to_top: "Back to top",
  };

  const ru = {
    lang_name: "RU",
    help: "Справка",
    zygisk_module: "Модуль Zygisk",
    search_placeholder: "Поиск приложений или пакетов",
    clear_search: "Очистить поиск",
    tab_user: "Сторонние",
    tab_detached: "Откреплённые",
    tab_system: "Системные",
    sideloaded: "Вне Маркета",
    select: "Выбрать",
    detach_all: "Открепить все",
    back_up: "Бэкап",
    restore: "Восстановить",
    reattach_all: "Прикрепить все",
    loading: "Загрузка...",
    remove: "Убрать",
    cancel: "Отмена",
    close: "Закрыть",
    detach: "Открепить",
    reattach: "Прикрепить",
    stop_selecting: "Отменить выбор",
    select_all: "Выбрать все",
    select_none: "Снять выбор",
    n_selected: (n) => `Выбрано: ${n}`,

    not_installed: "Не установлено",
    detach_app_aria: (name) => `Открепить ${name}`,

    menu_store: "Открыть в Play Маркете",
    menu_store_hint: "У откреплённого приложения там нет кнопки «Обновить»",
    menu_select: "Выбрать несколько приложений",
    menu_select_hint: "Открепить или прикрепить сразу много",
    menu_copy: "Копировать имя пакета",
    installed_by: (who) => `Установлено через: ${who}`,
    inst_store: "Play Маркет",
    inst_apk: "Установщик пакетов (APK-файл)",
    inst_xiaomi_backup: "Xiaomi Backup (восстановлено)",
    inst_neo_backup: "Neo Backup (восстановлено)",
    inst_swift_backup: "Swift Backup (восстановлено)",
    inst_sai: "SAI (Split APKs Installer)",
    inst_unknown: "Неизвестно (adb, root-терминал или прошивка)",

    save_backup: "Сохранить бэкап",
    choose_backup: "Выберите бэкап",
    file_name: "Имя файла",
    file_exists: "Файл с таким именем уже есть и будет заменён.",
    save_here: "Сохранить сюда",
    auto_backup: "Автоматический бэкап",
    auto_backup_hint: "Сохраняет play-detach-auto.txt в Play-Detach после каждого изменения",
    auto_backup_entry_hint: "сохраняется после каждого изменения",
    internal_storage: "Внутренняя память",
    up_one_folder: "На уровень выше",
    no_folders: "Здесь нет папок.",
    no_folders_files: "Здесь нет папок или файлов .txt.",

    apps: (n) => `${n} ${pluralRu(n, "приложение", "приложения", "приложений")}`,
    t_detached: (name) => `${name}: откреплено`,
    t_reattached: (name) => `${name}: прикреплено`,
    t_n_detached: (n) => `Откреплено: ${n}`,
    t_n_reattached: (n) => `Прикреплено: ${n}`,
    t_n_removed: (n) => `Убрано из списка: ${n}`,
    t_all_reattached: "Все приложения снова прикреплены",
    t_saved: (n, where) => `Сохранено ${n} ${pluralRu(n, "приложение", "приложения", "приложений")} в ${where}`,
    t_restored: (n) => `Восстановлено из бэкапа: ${n}`,
    t_auto_on: "Автоматический бэкап включён",
    t_auto_off: "Автоматический бэкап выключен",
    t_copied: "Имя пакета скопировано",
    t_copy_failed: "Не удалось скопировать",
    t_all_detached_already: "Все приложения в этом списке уже откреплены",
    e_change_list: "Не удалось изменить список",
    e_clear_list: "Не удалось очистить список",
    e_open_store: "Не удалось открыть Play Маркет",
    e_open_folder: "Не удалось открыть эту папку",
    e_save_backup: "Не удалось сохранить бэкап",
    e_restore_backup: "Не удалось восстановить бэкап",
    e_auto_backup: "Не удалось изменить автоматический бэкап",
    e_no_bridge: "Откройте эту страницу через root-менеджер",

    ghost_note: (n) =>
      `${pluralRu(n, "Не установлено", "Не установлены", "Не установлено")} ${n} ${pluralRu(n, "приложение", "приложения", "приложений")} из списка.`,

    c_reattach_title: "Прикрепить все приложения?",
    c_reattach_text: "Play Маркет снова увидит все откреплённые приложения и будет предлагать для них обновления.",
    c_restore_title: "Восстановить этот бэкап?",
    c_restore_text: (where) => `Текущий список будет заменён приложениями из ${where}.`,
    c_detach_title: (n) => `Открепить ${n} ${pluralRu(n, "приложение", "приложения", "приложений")}?`,
    c_detach_text: (what, n) =>
      `Все ${what}, которые ещё не откреплены (${n}), перестанут получать обновления из Play Маркета. Их можно прикрепить по одному или кнопкой «Прикрепить все».`,
    what_search: "приложения, найденные поиском",
    what_side: "приложения вне Маркета",
    what_user: "сторонние приложения",
    c_ghost_title: "Убрать неустановленные приложения?",
    c_ghost_text: (n) =>
      `Из списка ${pluralRu(n, "уйдёт", "уйдут", "уйдут")} ${n} ${pluralRu(n, "приложение", "приложения", "приложений")}. Оставьте их, если установите их снова, например пропатченное приложение, которое вы переустанавливаете: тогда оно сразу останется откреплённым.`,

    empty_matches: "Ничего не найдено",
    empty_matches_hint: "Попробуйте другое название или пакет.",
    empty_detached: "Пока нет откреплённых приложений",
    empty_detached_hint: "Включите переключатель рядом с приложением, чтобы Play Маркет перестал его обновлять.",
    empty_side: "Нет приложений вне Маркета",
    empty_side_hint: "Все сторонние приложения здесь установлены через Play Маркет.",
    empty_none: "Здесь нет приложений",

    s_none: "Пока нет откреплённых приложений",
    s_active: (n) => `Работает в Play Маркете - откреплено ${n}`,
    s_pending: (n) => `Откреплено ${n} - применится при запуске Play Маркета`,
    s_problem: (msg) => `Проблема: ${msg}`,
    s_fail: (why) => `Не работает: ${why}`,
    s_store_updated: (n) => `Play Маркет обновлён - откреплено ${n}, проверка при его запуске`,

    auto_pill: "Авто",
    ok: "OK",
    settings_title: "Статус и настройки",
    chk_none: "Пока ничего не откреплено",
    chk_none_line: "С пустым списком модуль не вмешивается в Play Маркет.",
    chk_ok: "Работает в Play Маркете",
    chk_wait: "Ожидает запуска Play Маркета",
    chk_fail: "Не работает в Play Маркете",
    chk_store: (v) => `Версия Play Маркета: ${v}`,
    chk_store_updated: (d) => `Play Маркет обновлён: ${d}`,
    chk_last_start: (d) => `Последний запуск Play Маркета: ${d}`,
    chk_never: "Play Маркет ещё не запускался после установки модуля.",
    chk_hook_ok: (api) => `Самопроверка: модуль подключился к Play Маркету (Android API ${api}).`,
    chk_hook_unknown: "Самопроверка: для последнего запуска Play Маркета результата пока нет.",
    chk_hook_fail: (why) => `Самопроверка не пройдена: ${why}`,
    chk_after_update: "Play Маркет обновился после последнего запуска. Модуль проверится снова, когда он откроется.",
    chk_pending: "Список изменился после последнего запуска Play Маркета. Он применится, когда Play Маркет откроется.",
    why_field: "Play Маркет или Android изменили вызов, который использует модуль",
    why_binder: "Android изменился (libbinder.so не найден)",
    why_plt: "Android изменился (не удалось установить хук)",
    why_api: "эта версия Android не поддерживается",
    why_list: "Zygisk не смог передать список в Play Маркет",
    ad_title: "Откреплять новые приложения вне Маркета",
    ad_hint: "Приложения, установленные из APK-файла, другого магазина или пропатченные, сразу открепляются, с уведомлением",
    t_ad_on: "Новые приложения вне Маркета будут открепляться автоматически",
    t_ad_off: "Автоматическое открепление выключено",
    e_ad: "Не удалось изменить автоматическое открепление",
    recent_title: "Откреплено автоматически",
    s_notloaded: "Не работает: Zygisk не загрузил модуль в Play Маркет",
    chk_notloaded: "Работающий сейчас Play Маркет запущен без модуля. Проверьте, что Zygisk (например, ReZygisk) включён, и перезагрузите телефон.",
    chk_zygisk: (n) => `Zygisk: ${n}`,
    chk_zygisk_none: "Zygisk: не найден (нужен ReZygisk, Zygisk Next, NeoZygisk или Zygisk в Magisk)",
    skip_title: "Не откреплять автоматически приложения, установленные через",
    skip_hint: "Включите для магазинов, которые сами обновляют свои приложения",
    skip_none: "Других установщиков на телефоне пока нет",
    t_skip_on: (n) => `Приложения, установленные через ${n}, не будут откреплены автоматически`,
    t_skip_off: (n) => `Приложения, установленные через ${n}, снова открепляются автоматически`,
    e_skip: "Не удалось изменить настройку",
    hist_title: "Последние изменения",
    hist_detach: "Откреплено",
    hist_reattach: "Прикреплено",
    src_user: "вами",
    src_auto: "автоматически",
    src_restore: "из бэкапа",
    src_import: "импортом",
    app_hist: (what, at, src) => `${what} ${at}, ${src}`,
    share_hint: "Или отправьте список текстом, например на другой телефон",
    copy_list: "Копировать список",
    share_list: "Поделиться",
    t_list_copied: (n) => `Скопировано ${n} ${pluralRu(n, "имя пакета", "имени пакетов", "имён пакетов")}`,
    e_share: "Не удалось открыть меню «Поделиться»",
    auto_note: (names) => `Откреплено автоматически: ${names}.`,
    auto_note_skip: (n) =>
      `Сразу установлено ${n} ${pluralRu(n, "новое приложение", "новых приложения", "новых приложений")}, вероятно восстановление из бэкапа. Они не откреплены автоматически.`,

    module_description: "Не даёт Play Маркету обновлять выбранные вами приложения. Автооткрепление сторонних приложений, бэкапы и самопроверка.",

    help_title: "Справка",
    back_to_apps: "Назад к приложениям",
    copy_command: "Копировать команду",
    copied: "Команда скопирована",
    copy_not_supported: "Копирование здесь не поддерживается",
    contents: "Содержание",
    to_top: "Наверх",
  };

  const STR = { en, ru };
  const KEY = "pd-lang";

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "ru") return saved;
    } catch {}
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return /^ru\b/i.test(nav) ? "ru" : "en";
  }

  let lang = detect();

  function t(key, ...args) {
    const v = (STR[lang] && STR[lang][key]) !== undefined ? STR[lang][key] : en[key];
    if (v === undefined) return key;
    return typeof v === "function" ? v(...args) : v;
  }

  // Fills elements marked with data-i18n (text), data-i18n-html, data-i18n-ph
  // (placeholder) and data-i18n-aria (aria-label).
  function apply(root) {
    root = root || document;
    document.documentElement.lang = lang;
    root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    root.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }

  function set(l, remember) {
    if (l !== "en" && l !== "ru") return;
    lang = l;
    if (remember !== false) {
      try {
        localStorage.setItem(KEY, l);
      } catch {}
    }
  }

  window.PD_I18N = {
    t,
    apply,
    set,
    get lang() {
      return lang;
    },
    hasSaved() {
      try {
        return !!localStorage.getItem(KEY);
      } catch {
        return false;
      }
    },
    description: (l) => STR[l].module_description,
  };
})();
