#!/system/bin/sh
# Play Detach - installer
# Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.

DATA_DIR=/data/adb/play-detach
TERMUX_BIN=/data/data/com.termux/files/usr/bin

lang=""

resolve_locale() {
    candidate="$1"
    [ -n "$candidate" ] || return 1

    clean_locale=$(echo "$candidate" | tr '_' '-')
    if [ -d "$MODPATH/translations/$clean_locale" ]; then
        lang="$clean_locale"
        return 0
    elif [ "$clean_locale" = "zh-CN" ] || [ "$clean_locale" = "zh-Hans-CN" ] || [ "$clean_locale" = "zh-Hans" ]; then
        lang="zh-rCN"
        return 0
    elif [ "$clean_locale" = "zh-TW" ] || [ "$clean_locale" = "zh-Hant-TW" ] || [ "$clean_locale" = "zh-Hant" ]; then
        lang="zh-rTW"
        return 0
    else
        short_lang=$(echo "$clean_locale" | cut -d'-' -f1 | tr '[:upper:]' '[:lower:]')
        if [ -d "$MODPATH/translations/$short_lang" ]; then
            lang="$short_lang"
            return 0
        fi
    fi
    return 1
}

raw_lang=$(settings get system system_locales 2>/dev/null | cut -d',' -f1)
resolve_locale "$raw_lang" || :

if [ -z "$lang" ]; then
    resolve_locale "$(getprop persist.sys.locale 2>/dev/null)" || :
fi

if [ -z "$lang" ]; then
    resolve_locale "$(getprop ro.product.locale 2>/dev/null)" || :
fi

if [ -z "$lang" ]; then
    cfg=$(cmd activity get-config 2>/dev/null | grep -m1 '^config:' | sed 's/^config:[[:space:]]*//' | cut -d',' -f1)
    l=$(echo "$cfg" | tr '-' '\n' | grep -m1 -E '^[a-z]{2,3}$' || :)
    r=$(echo "$cfg" | tr '-' '\n' | grep -m1 -E '^r[A-Z]{2}$' | cut -c2- || :)
    resolve_locale "${l:+$l${r:+-$r}}" || :
fi

lang=${lang:-en}
if [ -f "$MODPATH/translations/$lang/strings.sh" ]; then
    . "$MODPATH/translations/$lang/strings.sh"
else
    . "$MODPATH/strings.sh"
fi

description=$(printf '%s' "$MODULE_DESCRIPTION" | sed 's/[\\&|]/\\&/g')
sed -i "s|^description=.*|description=$description|" "$MODPATH/module.prop" || abort "$DESC_UPDATE_ERROR"

import_list() {
    import_file="$1"
    if import_output=$("$MODPATH/play-detach" import "$import_file" 2>&1); then
        import_count=$(printf '%s\n' "$import_output" | sed -n 's/^Imported \(.*\) package(s)$/\1/p')
        if [ -n "$import_count" ]; then
            ui_print "  $(printf "$MSG_IMPORTED" "$import_count")"
        else
            printf '%s\n' "$import_output" | while read -r l; do ui_print "  $l"; done
        fi
    else
        printf '%s\n' "$import_output" | while read -r l; do ui_print "  $l"; done
    fi
}

ui_print " "
ui_print "  Play Detach"
ui_print "  $TAGLINE"
ui_print " "

[ "$ARCH" = "arm64" ] || abort "$(printf "$ERR_ARCH" "$ARCH")"
[ "$API" -ge 29 ] || abort "$ERR_ANDROID"

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
    ui_print "$OLD_INSTALLED"

    if [ -x "$OLD/detach" ]; then
        old_list="${TMPDIR:-/dev/tmp}/zygisk-detach.txt"
        "$OLD/detach" list >"$old_list" 2>/dev/null
        if [ -s "$old_list" ]; then
            ui_print "$IMPORT_OLD"
            import_list "$old_list"
        fi
        rm -f "$old_list"
    fi

    if [ -f "$OLD/remove" ]; then
        ui_print "$OLD_REMOVAL_PENDING"
    elif [ -f "$OLD/disable" ]; then
        ui_print "$OLD_DISABLED_NO_CONFLICT"
    else
        ui_print "  $OLD_CONFLICT_1"
        ui_print "  $OLD_CONFLICT_2"
        ui_print " "
        ui_print "  $OLD_REMOVE_OPTION"
        ui_print "  $OLD_KEEP_OPTION"
        ui_print "  $OLD_TIMEOUT_OPTION"
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
                ui_print "$OLD_REMOVED"
                ;;
            1)
                ui_print "$OLD_KEPT_1"
                ui_print "  $OLD_KEPT_2"
                ;;
            *)
                touch "$OLD/disable"
                ui_print "$OLD_DISABLED_1"
                ui_print "  $OLD_DISABLED_2"
                ;;
        esac
    fi
    ui_print " "
fi

# Optional: packages to detach on install, one per line in detach.txt
if [ -f "$MODPATH/detach.txt" ]; then
    ui_print "$IMPORT_DETACH"
    import_list "$MODPATH/detach.txt"
    rm -f "$MODPATH/detach.txt"
fi

if [ -n "$KSU" ] || [ -n "$APATCH" ]; then
    ui_print "$ZYGISK_REQUIRED"
else
    ui_print "$ZYGISK_ENABLED"
fi

if [ -d "$TERMUX_BIN" ]; then
    owner=$(stat -c %u:%g "$TERMUX_BIN")
    cat >"$TERMUX_BIN/play-detach" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec su -c /data/adb/modules/play-detach/play-detach "$@"
EOF
    chown "$owner" "$TERMUX_BIN/play-detach"
    chmod 755 "$TERMUX_BIN/play-detach"
    ui_print "$TERMUX_INSTALLED"
fi

ui_print "$MANAGE_APPS"
ui_print " "
