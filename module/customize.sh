#!/system/bin/sh
# Play Detach - installer
# Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

DATA_DIR=/data/adb/play-detach
TERMUX_BIN=/data/data/com.termux/files/usr/bin

ui_print " "
ui_print "  Play Detach"
ui_print "  Stops Play Store updates for the apps you choose"
ui_print " "

[ "$ARCH" = "arm64" ] || abort "! Only arm64 devices are supported (this device: $ARCH)"
[ "$API" -ge 29 ] || abort "! Android 10 or newer is required"

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
    ui_print "! zygisk-detach is installed"

    if [ -x "$OLD/detach" ]; then
        old_list="${TMPDIR:-/dev/tmp}/zygisk-detach.txt"
        "$OLD/detach" list >"$old_list" 2>/dev/null
        if [ -s "$old_list" ]; then
            ui_print "- Copying its detached apps to Play Detach"
            "$MODPATH/play-detach" import "$old_list" 2>&1 | while read -r l; do ui_print "  $l"; done
        fi
        rm -f "$old_list"
    fi

    if [ -f "$OLD/remove" ]; then
        ui_print "- zygisk-detach is already set to be removed"
    elif [ -f "$OLD/disable" ]; then
        ui_print "- zygisk-detach is disabled, no conflict"
    else
        ui_print "  Both modules hook the Play Store and must not"
        ui_print "  run together."
        ui_print " "
        ui_print "  Vol+  Remove zygisk-detach (detached apps are kept)"
        ui_print "  Vol-  Keep it (not recommended)"
        ui_print "  No key in 15 seconds: zygisk-detach is disabled"
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
                ui_print "- zygisk-detach will be removed on reboot"
                ;;
            1)
                ui_print "- zygisk-detach kept. Disable or remove it in"
                ui_print "  your root manager to avoid conflicts."
                ;;
            *)
                touch "$OLD/disable"
                ui_print "- zygisk-detach disabled. Enable it again in your"
                ui_print "  root manager if you need it."
                ;;
        esac
    fi
    ui_print " "
fi

# Optional: packages to detach on install, one per line in detach.txt
if [ -f "$MODPATH/detach.txt" ]; then
    ui_print "- Importing detach.txt"
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
        ui_print "- Backup folder created: Play-Detach"
    fi
    # First automatic backup of an existing list
    if [ -d "$BDIR" ] && [ -s "$DATA_DIR/detach.list" ] && [ ! -f "$DATA_DIR/no-auto-backup" ]; then
        "$MODPATH/play-detach" backup "$BDIR/play-detach-auto.txt" >/dev/null 2>&1 &&
            ui_print "- Detached apps saved to Play-Detach/play-detach-auto.txt"
    fi
fi

if [ -n "$KSU" ] || [ -n "$APATCH" ]; then
    ui_print "- A Zygisk implementation (e.g. ReZygisk) is required"
else
    ui_print "- Make sure Zygisk is enabled in Magisk"
fi

if [ -d "$TERMUX_BIN" ]; then
    owner=$(stat -c %u:%g "$TERMUX_BIN")
    cat >"$TERMUX_BIN/play-detach" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec su -c /data/adb/modules/play-detach/play-detach "$@"
EOF
    chown "$owner" "$TERMUX_BIN/play-detach"
    chmod 755 "$TERMUX_BIN/play-detach"
    ui_print "- Termux command installed: play-detach"
fi

ui_print "- Manage apps from the module WebUI or the play-detach command"
ui_print " "
