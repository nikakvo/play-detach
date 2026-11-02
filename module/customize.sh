#!/system/bin/sh
# Play Detach - installer
# Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

DATA_DIR=/data/adb/play-detach
TERMUX_BIN=/data/data/com.termux/files/usr/bin

# Language of the messages: the one chosen in the WebUI (EN / RU switch),
# otherwise the phone's language. Russian translation based on the work of
# LegacyFreeman.
LANG_UI=$(cat "$DATA_DIR/lang" 2>/dev/null)
case "$LANG_UI" in
    en | ru) ;;
    *)
        loc=$(settings get system system_locales 2>/dev/null)
        [ -n "$loc" ] && [ "$loc" != null ] || loc=$(getprop persist.sys.locale)
        [ -n "$loc" ] || loc=$(getprop ro.product.locale)
        case "$loc" in
            ru*) LANG_UI=ru ;;
            *) LANG_UI=en ;;
        esac
        ;;
esac

# m "English" "Russian" prints the text for the chosen language.
m() {
    if [ "$LANG_UI" = ru ]; then echo "$2"; else echo "$1"; fi
}

ui_print " "
ui_print "  Play Detach"
ui_print "  $(m "Stops Play Store updates for the apps you choose" "Не даёт Play Маркету обновлять выбранные приложения")"
ui_print " "

[ "$ARCH" = "arm64" ] || abort "$(m "! Only arm64 devices are supported (this device: $ARCH)" "! Поддерживаются только устройства arm64 (это устройство: $ARCH)")"
[ "$API" -ge 29 ] || abort "$(m "! Android 10 or newer is required" "! Требуется Android 10 или новее")"

# Module description shown in the root manager
if [ "$LANG_UI" = ru ]; then
    sed -i 's|^description=.*|description=Не даёт Play Маркету обновлять выбранные вами приложения.|' "$MODPATH/module.prop"
fi

set_perm "$MODPATH/play-detach" 0 0 0755
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
    ui_print "$(m "! zygisk-detach is installed" "! Установлен zygisk-detach")"

    if [ -x "$OLD/detach" ]; then
        old_list="${TMPDIR:-/dev/tmp}/zygisk-detach.txt"
        "$OLD/detach" list >"$old_list" 2>/dev/null
        if [ -s "$old_list" ]; then
            ui_print "$(m "- Copying its detached apps to Play Detach" "- Копирование его откреплённых приложений в Play Detach")"
            "$MODPATH/play-detach" import "$old_list" 2>&1 | while read -r l; do ui_print "  $l"; done
        fi
        rm -f "$old_list"
    fi

    if [ -f "$OLD/remove" ]; then
        ui_print "$(m "- zygisk-detach is already set to be removed" "- zygisk-detach уже помечен для удаления")"
    elif [ -f "$OLD/disable" ]; then
        ui_print "$(m "- zygisk-detach is disabled, no conflict" "- zygisk-detach отключён, конфликта нет")"
    else
        ui_print "  $(m "Both modules hook the Play Store and must not" "Оба модуля изменяют вызовы Play Маркета")"
        ui_print "  $(m "run together." "и не должны работать одновременно.")"
        ui_print " "
        ui_print "  $(m "Vol+  Remove zygisk-detach (detached apps are kept)" "Vol+  Удалить zygisk-detach (откреплённые приложения сохранятся)")"
        ui_print "  $(m "Vol-  Keep it (not recommended)" "Vol-  Оставить его (не рекомендуется)")"
        ui_print "  $(m "No key in 15 seconds: zygisk-detach is disabled" "Нет нажатия 15 секунд: zygisk-detach будет отключён")"
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
                ui_print "$(m "- zygisk-detach will be removed on reboot" "- zygisk-detach будет удалён после перезагрузки")"
                ;;
            1)
                ui_print "$(m "- zygisk-detach kept. Disable or remove it in" "- zygisk-detach оставлен. Отключите или удалите его")"
                ui_print "  $(m "your root manager to avoid conflicts." "в root-менеджере, чтобы избежать конфликта.")"
                ;;
            *)
                touch "$OLD/disable"
                ui_print "$(m "- zygisk-detach disabled. Enable it again in your" "- zygisk-detach отключён. При необходимости включите")"
                ui_print "  $(m "root manager if you need it." "его снова в root-менеджере.")"
                ;;
        esac
    fi
    ui_print " "
fi

# Optional: packages to detach on install, one per line in detach.txt
if [ -f "$MODPATH/detach.txt" ]; then
    ui_print "$(m "- Importing detach.txt" "- Импорт detach.txt")"
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
        ui_print "$(m "- Backup folder created: Play-Detach" "- Создана папка для бэкапов: Play-Detach")"
    fi
    # First automatic backup of an existing list
    if [ -d "$BDIR" ] && [ -s "$DATA_DIR/detach.list" ] && [ ! -f "$DATA_DIR/no-auto-backup" ]; then
        "$MODPATH/play-detach" backup "$BDIR/play-detach-auto.txt" >/dev/null 2>&1 &&
            ui_print "$(m "- Detached apps saved to Play-Detach/play-detach-auto.txt" "- Откреплённые приложения сохранены в Play-Detach/play-detach-auto.txt")"
    fi
fi

if [ -n "$KSU" ] || [ -n "$APATCH" ]; then
    ui_print "$(m "- A Zygisk implementation (e.g. ReZygisk) is required" "- Нужна реализация Zygisk (например, ReZygisk)")"
else
    ui_print "$(m "- Make sure Zygisk is enabled in Magisk" "- Убедитесь, что Zygisk включён в Magisk")"
fi

if [ -d "$TERMUX_BIN" ]; then
    owner=$(stat -c %u:%g "$TERMUX_BIN")
    cat >"$TERMUX_BIN/play-detach" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec su -c /data/adb/modules/play-detach/play-detach "$@"
EOF
    chown "$owner" "$TERMUX_BIN/play-detach"
    chmod 755 "$TERMUX_BIN/play-detach"
    ui_print "$(m "- Termux command installed: play-detach" "- В Termux установлена команда play-detach")"
fi

ui_print "$(m "- Manage apps from the module WebUI or the play-detach command" "- Управляйте приложениями через WebUI модуля или команду play-detach")"
ui_print " "
