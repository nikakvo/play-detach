#!/system/bin/sh
# Play Detach - installer
# Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

DATA_DIR=/data/adb/play-detach
TERMUX_BIN=/data/data/com.termux/files/usr/bin

# Language of the messages: the one chosen in the WebUI (EN / RU / ZH switch),
# otherwise the phone's language. Russian translation based on the work of
# LegacyFreeman.
LANG_UI=$(cat "$DATA_DIR/lang" 2>/dev/null)
case "$LANG_UI" in
    en | ru | zh) ;;
    *)
        loc=$(settings get system system_locales 2>/dev/null)
        [ -n "$loc" ] && [ "$loc" != null ] || loc=$(getprop persist.sys.locale)
        [ -n "$loc" ] || loc=$(getprop ro.product.locale)
        case "$loc" in
            ru*) LANG_UI=ru ;;
            zh*) LANG_UI=zh ;;
            *) LANG_UI=en ;;
        esac
        ;;
esac

# m "English" "Russian" "Chinese" prints the text for the chosen language.
# The Chinese text is optional, but every message below has one.
m() {
    case "$LANG_UI" in
        ru) echo "$2" ;;
        zh) echo "${3:-$1}" ;;
        *) echo "$1" ;;
    esac
}

ui_print " "
ui_print "  Play Detach"
ui_print "  $(m "Stops Play Store updates for the apps you choose" "Не даёт Play Маркету обновлять выбранные приложения" "阻止 Play 商店更新你选择的应用")"
ui_print " "

[ "$ARCH" = "arm64" ] || abort "$(m "! Only arm64 devices are supported (this device: $ARCH)" "! Поддерживаются только устройства arm64 (это устройство: $ARCH)" "! 仅支持 arm64 设备（当前设备：$ARCH）")"
[ "$API" -ge 29 ] || abort "$(m "! Android 10 or newer is required" "! Требуется Android 10 или новее" "! 需要 Android 10 或更高版本")"

# Module description shown in the root manager. Kept identical to
# module_description in webroot/i18n.js for the same language.
case "$LANG_UI" in
    ru)
        sed -i 's|^description=.*|description=Не даёт Play Маркету обновлять выбранные вами приложения. Автооткрепление сторонних приложений, бэкапы и самопроверка.|' "$MODPATH/module.prop"
        ;;
    zh)
        sed -i 's|^description=.*|description=阻止 Play 商店更新你选择的应用。自动分离侧载应用、备份与自检。|' "$MODPATH/module.prop"
        ;;
esac

set_perm "$MODPATH/play-detach" 0 0 0755
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm_recursive "$MODPATH/zygisk" 0 0 0755 0644

mkdir -p "$DATA_DIR"
chmod 700 "$DATA_DIR"
[ -f "$DATA_DIR/detach.list" ] || touch "$DATA_DIR/detach.list"
chmod 600 "$DATA_DIR/detach.list"

# Waits for a volume key. Returns 0 for Vol+, 1 for Vol-, 2 if nothing was
# pressed within $1 seconds.
wait_volume_key() {
    key=$(timeout "$1" getevent -lq 2>/dev/null | grep -m1 -E 'KEY_VOLUME(UP|DOWN) +DOWN')
    case "$key" in
        *KEY_VOLUMEUP*) return 0 ;;
        *KEY_VOLUMEDOWN*) return 1 ;;
        *) return 2 ;;
    esac
}

# zygisk-detach (j-hc) hooks the same Play Store calls, so the two modules
# must not run together. Its detached apps are carried over first.
OLD="/data/adb/modules/zygisk-detach"
if [ -d "$OLD" ]; then
    ui_print " "
    ui_print "$(m "! zygisk-detach is installed" "! Установлен zygisk-detach" "! 检测到已安装 zygisk-detach")"

    if [ -x "$OLD/detach" ]; then
        old_list="${TMPDIR:-/dev/tmp}/zygisk-detach.txt"
        "$OLD/detach" list >"$old_list" 2>/dev/null
        if [ -s "$old_list" ]; then
            ui_print "$(m "- Copying its detached apps to Play Detach" "- Копирование его откреплённых приложений в Play Detach" "- 正在把它的已分离应用复制到 Play Detach")"
            "$MODPATH/play-detach" import "$old_list" 2>&1 | while read -r l; do ui_print "  $l"; done
        fi
        rm -f "$old_list"
    fi

    if [ -f "$OLD/remove" ]; then
        ui_print "$(m "- zygisk-detach is already set to be removed" "- zygisk-detach уже помечен для удаления" "- zygisk-detach 已标记为待删除")"
    elif [ -f "$OLD/disable" ]; then
        ui_print "$(m "- zygisk-detach is disabled, no conflict" "- zygisk-detach отключён, конфликта нет" "- zygisk-detach 已禁用，不会冲突")"
    else
        ui_print "  $(m "Both modules hook the Play Store and must not" "Оба модуля изменяют вызовы Play Маркета" "两个模块都会 Hook Play 商店，")"
        ui_print "  $(m "run together." "и не должны работать одновременно." "不能同时运行。")"
        ui_print " "
        ui_print "  $(m "Vol+  Remove zygisk-detach (detached apps are kept)" "Vol+  Удалить zygisk-detach (откреплённые приложения сохранятся)" "音量+  删除 zygisk-detach（保留已分离的应用）")"
        ui_print "  $(m "Vol-  Keep it (not recommended)" "Vol-  Оставить его (не рекомендуется)" "音量-  保留它（不推荐）")"
        ui_print "  $(m "No key in 15 seconds: zygisk-detach is disabled" "Нет нажатия 15 секунд: zygisk-detach будет отключён" "15 秒内不按任何键：将禁用 zygisk-detach")"
        ui_print " "
        wait_volume_key 15
        case $? in
            0)
                touch "$OLD/remove"
                # zygisk-detach has no uninstall script, so clean up what it
                # leaves behind. Its list was already copied above.
                rm -rf /data/adb/zygisk-detach
                old_cmd=/data/data/com.termux/files/usr/bin/detach
                grep -q 'zygisk-detach/detach' "$old_cmd" 2>/dev/null && rm -f "$old_cmd"
                ui_print "$(m "- zygisk-detach will be removed on reboot" "- zygisk-detach будет удалён после перезагрузки" "- zygisk-detach 将在重启后删除")"
                ;;
            1)
                ui_print "$(m "- zygisk-detach kept. Disable or remove it in" "- zygisk-detach оставлен. Отключите или удалите его" "- 已保留 zygisk-detach。请在 root 管理器中")"
                ui_print "  $(m "your root manager to avoid conflicts." "в root-менеджере, чтобы избежать конфликта." "禁用它或删除它，以避免冲突。")"
                ;;
            *)
                touch "$OLD/disable"
                ui_print "$(m "- zygisk-detach disabled. Enable it again in your" "- zygisk-detach отключён. При необходимости включите" "- zygisk-detach 已禁用。若仍需使用，")"
                ui_print "  $(m "root manager if you need it." "его снова в root-менеджере." "请在 root 管理器中重新启用。")"
                ;;
        esac
    fi
    ui_print " "
fi

# Optional: packages to detach on install, one per line in detach.txt
if [ -f "$MODPATH/detach.txt" ]; then
    ui_print "$(m "- Importing detach.txt" "- Импорт detach.txt" "- 正在导入 detach.txt")"
    "$MODPATH/play-detach" import "$MODPATH/detach.txt" 2>&1 | while read -r l; do ui_print "  $l"; done
    rm -f "$MODPATH/detach.txt"
fi

# Own folder for backups in internal storage (/sdcard/Play-Detach), with the
# same owner, mode and SELinux label as Download so file managers can open it.
# If the user deletes it later, backups go to Download instead.
STORAGE=/data/media/0
if [ -d "$STORAGE/Download" ]; then
    BDIR="$STORAGE/Play-Detach"
    if [ ! -d "$BDIR" ] && mkdir "$BDIR" 2>/dev/null; then
        chown "$(stat -c %u:%g "$STORAGE/Download")" "$BDIR" 2>/dev/null
        chmod "$(stat -c %a "$STORAGE/Download")" "$BDIR" 2>/dev/null
        ctx=$(stat -c %C "$STORAGE/Download" 2>/dev/null) && [ -n "$ctx" ] && chcon "$ctx" "$BDIR" 2>/dev/null
        ui_print "$(m "- Backup folder created: Play-Detach" "- Создана папка для бэкапов: Play-Detach" "- 已创建备份文件夹：Play-Detach")"
    fi
    # First automatic backup of an existing list
    if [ -d "$BDIR" ] && [ -s "$DATA_DIR/detach.list" ] && [ ! -f "$DATA_DIR/no-auto-backup" ]; then
        "$MODPATH/play-detach" backup "$BDIR/play-detach-auto.txt" >/dev/null 2>&1 &&
            ui_print "$(m "- Detached apps saved to Play-Detach/play-detach-auto.txt" "- Откреплённые приложения сохранены в Play-Detach/play-detach-auto.txt" "- 已分离的应用已保存到 Play-Detach/play-detach-auto.txt")"
    fi
fi

if [ -n "$KSU" ] || [ -n "$APATCH" ]; then
    ui_print "$(m "- A Zygisk implementation (e.g. ReZygisk) is required" "- Нужна реализация Zygisk (например, ReZygisk)" "- 需要已安装 Zygisk 实现（例如 ReZygisk）")"
else
    ui_print "$(m "- Make sure Zygisk is enabled in Magisk" "- Убедитесь, что Zygisk включён в Magisk" "- 请确认已在 Magisk 中启用 Zygisk")"
fi

if [ -d "$TERMUX_BIN" ]; then
    owner=$(stat -c %u:%g "$TERMUX_BIN")
    cat >"$TERMUX_BIN/play-detach" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec su -c /data/adb/modules/play-detach/play-detach "$@"
EOF
    chown "$owner" "$TERMUX_BIN/play-detach"
    chmod 755 "$TERMUX_BIN/play-detach"
    ui_print "$(m "- Termux command installed: play-detach" "- В Termux установлена команда play-detach" "- 已在 Termux 中安装命令：play-detach")"
fi

ui_print "$(m "- Manage apps from the module WebUI or the play-detach command" "- Управляйте приложениями через WebUI модуля или команду play-detach" "- 可通过模块 WebUI 或 play-detach 命令管理应用")"
ui_print " "
