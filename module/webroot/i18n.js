// Play Detach WebUI - texts in English, Russian and Simplified Chinese
// Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.
// Russian translation based on the work of LegacyFreeman.
//
// Plain script (not a module) so both pages can use it: it defines window.PD_I18N.
// Strings are plain text unless the key ends in _html.

(function () {
  // English: 1 app, 2 apps. Russian: 1 приложение, 2 приложения, 5 приложений.
  // Chinese has no plural forms, so zh uses 个 before the noun instead.
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
    chk_zygisk_none: "Zygisk: none found (ReZygisk, Zygisk Next, NeoZygisk, SukiSU built-in Zygisk or Magisk Zygisk is needed)",
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
    language: "Language",
    ext_bad: "Not opened: not an https address",
    ext_fail: (m) => `Could not open the browser: ${m}`,
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
    chk_zygisk_none: "Zygisk: не найден (нужен ReZygisk, Zygisk Next, NeoZygisk, встроенный Zygisk SukiSU или Zygisk в Magisk)",
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
    language: "Язык",
    ext_bad: "Не открыто: это не адрес https",
    ext_fail: (m) => `Не удалось открыть браузер: ${m}`,
  };

  const zh = {
    lang_name: "中文",
    help: "帮助",
    zygisk_module: "Zygisk 模块",
    search_placeholder: "搜索应用或包名",
    clear_search: "清除搜索",
    tab_user: "用户应用",
    tab_detached: "已分离",
    tab_system: "系统应用",
    sideloaded: "侧载",
    select: "选择",
    detach_all: "全部分离",
    back_up: "备份",
    restore: "恢复",
    reattach_all: "全部重新关联",
    loading: "加载中…",
    remove: "移除",
    cancel: "取消",
    close: "关闭",
    detach: "分离",
    reattach: "重新关联",
    stop_selecting: "退出选择",
    select_all: "全选",
    select_none: "取消全选",
    n_selected: (n) => `已选 ${n} 项`,

    not_installed: "未安装",
    detach_app_aria: (name) => `分离 ${name}`,

    menu_store: "在 Play 商店中打开",
    menu_store_hint: "已分离的应用在那里不会显示更新按钮",
    menu_select: "选择多个应用",
    menu_select_hint: "一次分离或重新关联多个应用",
    menu_copy: "复制包名",
    installed_by: (who) => `安装来源：${who}`,
    inst_store: "Play 商店",
    inst_apk: "软件包安装程序（APK 文件）",
    inst_xiaomi_backup: "小米备份（恢复）",
    inst_neo_backup: "Neo Backup（恢复）",
    inst_swift_backup: "Swift Backup（恢复）",
    inst_sai: "SAI（Split APKs Installer）",
    inst_unknown: "未知（adb、root 终端或系统自带）",

    save_backup: "保存备份",
    choose_backup: "选择备份",
    file_name: "文件名",
    file_exists: "已有同名文件，将被覆盖。",
    save_here: "保存到此处",
    auto_backup: "自动备份",
    auto_backup_hint: "每次更改后把 play-detach-auto.txt 保存到 Play-Detach 文件夹",
    auto_backup_entry_hint: "每次更改后自动保存",
    internal_storage: "内部存储",
    up_one_folder: "上一级",
    no_folders: "此处没有文件夹。",
    no_folders_files: "此处没有文件夹或 .txt 文件。",

    apps: (n) => `${n} 个应用`,
    t_detached: (name) => `${name} 已分离`,
    t_reattached: (name) => `${name} 已重新关联`,
    t_n_detached: (n) => `已分离 ${n} 个应用`,
    t_n_reattached: (n) => `已重新关联 ${n} 个应用`,
    t_n_removed: (n) => `已从列表中移除 ${n} 个应用`,
    t_all_reattached: "所有应用已重新关联",
    t_saved: (n, where) => `已将 ${n} 个应用保存到 ${where}`,
    t_restored: (n) => `已从备份恢复 ${n} 个应用`,
    t_auto_on: "自动备份已开启",
    t_auto_off: "自动备份已关闭",
    t_copied: "包名已复制",
    t_copy_failed: "复制失败",
    t_all_detached_already: "此列表中的应用都已分离",
    e_change_list: "无法修改列表",
    e_clear_list: "无法清空列表",
    e_open_store: "无法打开 Play 商店",
    e_open_folder: "无法打开此文件夹",
    e_save_backup: "无法保存备份",
    e_restore_backup: "无法恢复备份",
    e_auto_backup: "无法修改自动备份设置",
    e_no_bridge: "请从 root 管理器中打开此页面",

    ghost_note: (n) => `列表中有 ${n} 个应用未安装。`,

    c_reattach_title: "重新关联所有应用？",
    c_reattach_text: "Play 商店会重新识别所有已分离的应用，并为其提供更新。",
    c_restore_title: "恢复此备份？",
    c_restore_text: (where) => `当前列表将被 ${where} 中保存的应用替换。`,
    c_detach_title: (n) => `分离 ${n} 个应用？`,
    c_detach_text: (what, n) =>
      `${what}（${n} 个）将不再收到 Play 商店更新。你可以逐个重新关联，或使用“全部重新关联”。`,
    what_search: "搜索结果中尚未分离的应用",
    what_side: "尚未分离的侧载应用",
    what_user: "尚未分离的用户应用",
    c_ghost_title: "移除此列表中未安装的应用？",
    c_ghost_text: (n) =>
      `${n} 个应用将从列表中移除。如果你之后会重新安装它们（例如正在重装的已打补丁的应用），就保留它们：这样它们会一直保持分离状态。`,

    empty_matches: "没有匹配结果",
    empty_matches_hint: "试试其他名称或包名。",
    empty_detached: "还没有已分离的应用",
    empty_detached_hint: "打开某个应用旁边的开关，即可让 Play 商店不再更新它。",
    empty_side: "没有侧载应用",
    empty_side_hint: "这里的每个用户应用都是由 Play 商店安装的。",
    empty_none: "此处没有应用",

    s_none: "还没有分离任何应用",
    s_active: (n) => `已在 Play 商店中生效 - 已分离 ${n} 个应用`,
    s_pending: (n) => `已分离 ${n} 个应用 - 在 Play 商店打开时生效`,
    s_problem: (msg) => `出现问题：${msg}`,
    s_fail: (why) => `未生效：${why}`,
    s_store_updated: (n) => `Play 商店已更新 - 已分离 ${n} 个应用，将在其打开时检查`,

    // Status and settings
    auto_pill: "自动",
    ok: "确定",
    settings_title: "状态与设置",
    chk_none: "尚未分离任何应用",
    chk_none_line: "列表为空时，模块不会介入 Play 商店。",
    chk_ok: "在 Play 商店中正常工作",
    chk_wait: "等待 Play 商店启动",
    chk_fail: "在 Play 商店中未生效",
    chk_store: (v) => `Play 商店版本：${v}`,
    chk_store_updated: (d) => `Play 商店更新于：${d}`,
    chk_last_start: (d) => `Play 商店上次启动：${d}`,
    chk_never: "自模块安装以来，Play 商店尚未启动。",
    chk_hook_ok: (api) => `自检：模块已 Hook 到 Play 商店（Android API ${api}）。`,
    chk_hook_unknown: "自检：尚无上次 Play 商店启动的检查结果。",
    chk_hook_fail: (why) => `自检未通过：${why}`,
    chk_after_update: "Play 商店在上次启动之后被更新。它再次打开时会重新检查模块。",
    chk_pending: "列表在 Play 商店上次启动之后有变化。将在 Play 商店打开时生效。",
    why_field: "Play 商店或 Android 更改了模块使用的调用",
    why_binder: "Android 已更改（未找到 libbinder.so）",
    why_plt: "Android 已更改（无法插入 Hook）",
    why_api: "不支持此 Android 版本",
    why_list: "Zygisk 无法把列表传递给 Play 商店",
    ad_title: "自动分离新的侧载应用",
    ad_hint: "从 APK 文件、其他应用商店或已打补丁的应用安装的应用会立即被分离，并发送通知",
    t_ad_on: "新的侧载应用将被自动分离",
    t_ad_off: "自动分离已关闭",
    e_ad: "无法修改自动分离设置",
    recent_title: "自动分离",
    s_notloaded: "未生效：Zygisk 没有在 Play 商店中加载本模块",
    chk_notloaded: "当前运行的 Play 商店是在没有本模块的情况下启动的。请确认 Zygisk（例如 ReZygisk）已启用，然后重启设备。",
    chk_zygisk: (n) => `Zygisk：${n}`,
    chk_zygisk_none: "Zygisk：未找到（需要 ReZygisk、Zygisk Next、NeoZygisk、SukiSU 内置 Zygisk 或 Magisk 自带的 Zygisk）",
    skip_title: "不自动分离由以下来源安装的应用",
    skip_hint: "对于自己更新应用的应用商店，请打开对应开关",
    skip_none: "此设备上暂时没有其他安装来源",
    t_skip_on: (n) => `来自 ${n} 的应用不会被自动分离`,
    t_skip_off: (n) => `来自 ${n} 的应用将再次被自动分离`,
    e_skip: "无法修改设置",
    hist_title: "最近更改",
    hist_detach: "已分离",
    hist_reattach: "已重新关联",
    src_user: "由你操作",
    src_auto: "自动",
    src_restore: "从备份恢复",
    src_import: "导入",
    app_hist: (what, at, src) => `${what}，${at}，${src}`,
    share_hint: "也可以把列表以文本形式发送，例如发到另一台手机",
    copy_list: "复制列表",
    share_list: "分享",
    t_list_copied: (n) => `已复制 ${n} 个包名`,
    e_share: "无法打开分享菜单",
    auto_note: (names) => `已自动分离：${names}。`,
    auto_note_skip: (n) =>
      `一次性安装了 ${n} 个新应用，很可能是从备份恢复的。它们没有被自动分离。`,

    module_description: "阻止 Play 商店更新你选择的应用。自动分离侧载应用、备份与自检。",

    // Help page
    help_title: "帮助",
    back_to_apps: "返回应用列表",
    copy_command: "复制命令",
    copied: "命令已复制",
    copy_not_supported: "此处不支持复制",
    contents: "目录",
    to_top: "返回顶部",
    language: "语言",
    ext_bad: "未打开：不是 https 地址",
    ext_fail: (m) => `无法打开浏览器：${m}`,
  };

  const STR = { en, ru, zh };
  // Every language the switcher offers, in the order it shows them.
  const LANGS = ["en", "ru", "zh"];
  // Locale used to format dates and times (Status and settings, recent changes).
  const LOCALE = { en: "en-GB", ru: "ru-RU", zh: "zh-CN" };
  // Short name shown in the language box in the header.
  const SHORT = { en: "EN", ru: "RU", zh: "中文" };
  const KEY = "pd-lang";

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (LANGS.includes(saved)) return saved;
    } catch {}
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    if (/^ru\b/i.test(nav)) return "ru";
    if (/^zh\b/i.test(nav)) return "zh";
    return "en";
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
    root.querySelectorAll(".lang-cur").forEach((el) => (el.textContent = SHORT[lang] || lang));
  }

  // Language box in the header: a tap opens a small menu with every language,
  // a tap on one chooses it. While the menu is open a clear layer covers the
  // page, so a tap next to the menu only closes it and never reaches what is
  // under it. Opening adds a history entry: the phone's Back closes the menu
  // instead of leaving the WebUI. Escape and scrolling close it too.
  function menu(onChoose) {
    const btn = document.getElementById("lang-btn");
    const list = document.getElementById("lang-menu");
    if (!btn || !list) return;
    const shade = document.createElement("div");
    shade.className = "lang-shade";
    shade.hidden = true;
    list.before(shade);
    try {
      history.scrollRestoration = "manual";
    } catch {}
    let entry = false; // our history entry is the current one
    const show = (open, byBack) => {
      list.hidden = !open;
      shade.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open && !entry) {
        try {
          history.pushState({ pdLangMenu: 1 }, "");
          entry = true;
        } catch {}
      } else if (!open && entry) {
        entry = false;
        if (!byBack) history.back();
      }
    };
    window.addEventListener("popstate", () => {
      if (entry) show(false, true);
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      show(list.hidden);
    });
    const shut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      show(false);
    };
    shade.addEventListener("click", shut);
    shade.addEventListener("contextmenu", shut);
    list.querySelectorAll("[data-lang]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        show(false);
        onChoose(b.dataset.lang);
      })
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !list.hidden) show(false);
    });
    window.addEventListener("scroll", () => list.hidden || show(false), { passive: true });
  }

  function set(l, remember) {
    if (!LANGS.includes(l)) return;
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
    langs: LANGS,
    isLang: (l) => LANGS.includes(l),
    menu,
    locale: (l) => LOCALE[l || lang] || LOCALE.en,
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
