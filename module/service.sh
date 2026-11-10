#!/system/bin/sh
# Play Detach - background watcher
# Copyright 2026 Tears Burn (nikakvo). Licensed under the Apache License 2.0.
#
# Sleeps until the kernel reports a change (inotify), so it costs nothing
# while nothing happens:
#   - apps were installed, updated or removed (/data/app changed): then
#     "play-detach scan" saves the Play Store version and, with auto-detach
#     on, detaches new sideloaded apps (again 10 s later, because the package
#     manager can finish a moment after the folder changed)
#   - the Play Store started (the module rewrote its status file): then
#     "play-detach check" notifies if the module could not start in it
# A full scan also runs once an hour in case a change was missed. Without
# inotifyd (busybox or toybox) it falls back to a check every 3 seconds.

MODDIR=${0%/*}
CLI="$MODDIR/play-detach"
DATA=/data/adb/play-detach
STATUS="$DATA/status"
FIFO="$DATA/events.fifo"
SAFETY=3600 # seconds between full scans

# Seconds since boot, without starting a process
uptime_s() {
    read -r up _ </proc/uptime
    now=${up%.*}
}

paused() {
    [ -f "$MODDIR/disable" ] || [ -f "$MODDIR/remove" ]
}

# True when the self-check result for the newest Play Store start is saved
checked() {
    sline=
    hline=
    read -r sline 2>/dev/null <"$STATUS"
    read -r hline 2>/dev/null <"$DATA/hook"
    l=${sline#loaded=}
    l=${l%% *}
    [ -z "$sline" ] || [ "${hline##*at=}" = "$l" ]
}

find_inotifyd() {
    for bb in busybox /data/adb/ksu/bin/busybox /data/adb/magisk/busybox /data/adb/ap/bin/busybox; do
        if "$bb" --list 2>/dev/null | grep -qx inotifyd; then
            echo "$bb inotifyd"
            return 0
        fi
    done
    if toybox 2>/dev/null | grep -qw inotifyd; then
        echo "toybox inotifyd"
        return 0
    fi
    return 1
}

# Returns 0 when inotifyd ended (start it again), 1 when the module is gone,
# 2 when no event pipe can be made (use poll_loop).
watch_events() {
    if [ ! -p "$FIFO" ]; then
        rm -f "$FIFO"
        mkfifo -m 600 "$FIFO" 2>/dev/null || return 2
    fi
    # Read-write open: never blocks and never sees end of file
    exec 3<>"$FIFO" || return 2
    # shellcheck disable=SC2086 # $INOTIFYD is "<binary> inotifyd"
    $INOTIFYD - /data/app:nmdy "$DATA:y" >&3 2>/dev/null &
    ipid=$!

    uptime_s
    scan_at=$((now + first_delay)) # first scan and check shortly after boot
    check_at=$((now + first_delay))
    first_delay=2
    recheck_at=0
    tries=0
    safety_at=$((now + SAFETY))
    alive=1
    while [ -d "$MODDIR" ]; do
        # Sleep until the next event or the nearest timer
        next=$safety_at
        for t in $scan_at $recheck_at $check_at; do
            [ "$t" -gt 0 ] && [ "$t" -lt "$next" ] && next=$t
        done
        wait=$((next - now))
        [ "$wait" -ge 1 ] || wait=1
        if read -t "$wait" -r ev dir name <&3; then
            uptime_s
            case "$dir" in
                /data/app) scan_at=$((now + 2)) ;; # wait until the burst ends
                "$DATA") [ "$name" = status ] && check_at=$((now + 3)) && tries=0 ;;
            esac
        else
            uptime_s
            # Nothing came: inotifyd must still be alive, else start it again
            kill -0 "$ipid" 2>/dev/null || {
                alive=0
                break
            }
        fi
        if paused; then
            scan_at=0
            recheck_at=0
            check_at=0
            safety_at=$((now + SAFETY))
            continue
        fi
        if [ "$scan_at" -gt 0 ] && [ "$now" -ge "$scan_at" ]; then
            scan_at=0
            recheck_at=$((now + 10))
            safety_at=$((now + SAFETY))
            "$CLI" scan >/dev/null 2>&1
        elif [ "$recheck_at" -gt 0 ] && [ "$now" -ge "$recheck_at" ]; then
            recheck_at=0
            "$CLI" scan >/dev/null 2>&1
        elif [ "$now" -ge "$safety_at" ]; then
            safety_at=$((now + SAFETY))
            "$CLI" scan >/dev/null 2>&1
        fi
        if [ "$check_at" -gt 0 ] && [ "$now" -ge "$check_at" ]; then
            "$CLI" check >/dev/null 2>&1
            # The log line can come a moment after the status file: retry a
            # few times until the result for this start is saved.
            tries=$((tries + 1))
            if checked || [ "$tries" -ge 4 ]; then check_at=0; else check_at=$((now + 5 * tries)); fi
        fi
    done
    [ "$alive" = 1 ] && kill "$ipid" 2>/dev/null
    exec 3<&-
    [ -d "$MODDIR" ] && return 0
    return 1
}

# Old way, only when no inotifyd exists
poll_loop() {
    last_app=
    last_status=
    last_scan=0
    recheck=0
    while [ -d "$MODDIR" ]; do
        if ! paused; then
            uptime_s
            app=$(stat -c %y /data/app 2>/dev/null)
            if [ "$app" != "$last_app" ]; then
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
}

(
    until [ "$(getprop sys.boot_completed)" = 1 ]; do sleep 5; done
    mkdir -p "$DATA"
    first_delay=30
    if INOTIFYD=$(find_inotifyd); then
        while :; do
            watch_events
            case $? in
                0) sleep 5 ;; # inotifyd ended: start it again
                2) poll_loop; break ;;
                *) break ;;   # module removed
            esac
        done
    else
        sleep 30
        poll_loop
    fi
) &
