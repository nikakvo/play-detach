#!/system/bin/sh
# Play Detach - background watcher
# Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.
#
# Checks every 3 seconds, with one stat call each, whether:
#   - apps were installed, updated or removed (/data/app changed): then
#     "play-detach scan" saves the Play Store version and, with auto-detach
#     on, detaches new sideloaded apps
#   - the Play Store started (status file changed): then "play-detach check"
#     notifies if the module could not start in it
# Each change is scanned again 10 seconds later, and a full scan runs every
# 10 minutes in case a change was missed.

MODDIR=${0%/*}
CLI="$MODDIR/play-detach"
STATUS=/data/adb/play-detach/status

(
    until [ "$(getprop sys.boot_completed)" = 1 ]; do sleep 5; done
    sleep 30

    last_app=
    last_status=
    last_scan=0
    recheck=0
    while [ -d "$MODDIR" ]; do
        if [ ! -f "$MODDIR/disable" ] && [ ! -f "$MODDIR/remove" ]; then
            now=$(date +%s)
            app=$(stat -c %y /data/app 2>/dev/null)
            if [ "$app" != "$last_app" ]; then
                # The app folder can change a moment before the package
                # manager finishes, so the scan is repeated 10 s later.
                last_app=$app
                last_scan=$now
                recheck=$((now + 10))
                "$CLI" scan >/dev/null 2>&1
            elif { [ "$recheck" -gt 0 ] && [ "$now" -ge "$recheck" ]; } || [ $((now - last_scan)) -ge 600 ]; then
                last_scan=$now
                recheck=0
                "$CLI" scan >/dev/null 2>&1
            fi
            st=$(stat -c %y "$STATUS" 2>/dev/null)
            if [ "$st" != "$last_status" ]; then
                last_status=$st
                "$CLI" check >/dev/null 2>&1
            fi
        fi
        sleep 3
    done
) &
