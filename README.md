<p align="center"><img src="module/banner.png" alt="Play Detach" width="640"></p>

# Play Detach

A Zygisk module that stops the Play Store from updating the apps you choose.

The Play Store updates apps on its own, even when auto-update is turned off for them. Play Detach hides the chosen apps from the Play Store, so it never offers or installs updates for them. The apps themselves are not changed: they keep working, and you can still update them by hand.

## Features

- WebUI with app icons and names, search, and tabs for user, system and detached apps
- One switch per app, changes apply right away without a reboot
- Sideloaded apps (APK files, other stores, patched apps) are marked and can be detached all at once
- Select several apps to detach or re-attach them together; long-press an app to open it in the Play Store
- Status line that shows whether the module is active in the Play Store
- Command line tool for terminals, plus a short `play-detach` command in Termux
- Backup and restore of the list in its own Play-Detach folder in internal storage, plus an automatic backup after every change
- Optional `detach.txt` in the module zip to detach apps at install time
- Works only inside the Play Store process, nothing else is touched

## Requirements

- arm64 device with Android 10 or newer
- A working Zygisk: ReZygisk, Zygisk Next or NeoZygisk on KernelSU, SukiSU-Ultra or APatch, or Zygisk enabled in Magisk
- zygisk-detach must not run at the same time, both modules change the same Play Store calls. If it is installed, Play Detach copies its detached apps during install and offers to remove it (Vol+), keep it (Vol-), or disables it if no key is pressed

## Install

1. Download the zip from [Releases](https://github.com/nikakvo/play-detach/releases).
2. Install it in your root manager and reboot.
3. Open the module WebUI and turn on the switch next to the apps you want to detach.

## Command line

```
su -c '/data/adb/modules/play-detach/play-detach list'
su -c '/data/adb/modules/play-detach/play-detach add com.example.app'
su -c '/data/adb/modules/play-detach/play-detach remove com.example.app'
su -c '/data/adb/modules/play-detach/play-detach clear'
su -c '/data/adb/modules/play-detach/play-detach status'
su -c '/data/adb/modules/play-detach/play-detach backup'
su -c '/data/adb/modules/play-detach/play-detach restore /sdcard/Play-Detach/play-detach-backup.txt'
su -c '/data/adb/modules/play-detach/play-detach autobackup off'
su -c '/data/adb/modules/play-detach/play-detach help'
```

The list is stored in `/data/adb/play-detach/detach.list`, one package per line. Each time the Play Store starts, the module overwrites a one-line `status` file in the same folder, which `play-detach status` and the WebUI use to show whether the current list is active.

Backups go to `/sdcard/Play-Detach`, which the installer creates (or to `Download` if that folder was deleted). After every change the list is also saved there as `play-detach-auto.txt`.

To check that the module works:

```
su -c 'logcat -d -s PlayDetach'
```

A line with `active in Play Store` means it is running.

## How it works

The module loads only into the Play Store process. A hook on `IPCThreadState::transact` in `libbinder.so` watches the Play Store's binder calls. When the Play Store asks the PackageManager (`getApplicationEnabledSetting`) about a detached app, the package name in the request is blanked, so the system answers that the app does not exist and the Play Store never offers an update for it.

Every read from the binder data is bounds-checked. If the data does not look exactly as expected, for example after a change in a new Android version, the call is passed through untouched and the reason is written to logcat.

## Building from source

Requirements: Linux or WSL, [Android NDK](https://developer.android.com/ndk/downloads) (r29 tested) and `zip`.

```
git clone https://github.com/nikakvo/play-detach
cd play-detach
ANDROID_NDK_HOME=/path/to/android-ndk-r29 ./build.sh
```

The module zip is written to `out/`. Without `ANDROID_NDK_HOME`, `build.sh` looks for the NDK in `~/android-ndk-r29`.

| Part | Source | Built with |
|---|---|---|
| Zygisk library | `src/zygisk/` | C++20, NDK r29, arm64-v8a, Zygisk API v4, no third-party libraries |
| Command line tool | `module/play-detach` | POSIX shell |
| WebUI | `module/webroot/` | Plain HTML, CSS and JavaScript, no build step, bundled fonts |
| Banner | `module/banner.png` | Drawn from `src/banner.svg` |

## Credits

Play Detach is a rewrite of [zygisk-detach](https://github.com/j-hc/zygisk-detach) by j-hc. The detach technique comes from that project. See `NOTICE` and `THIRD_PARTY_NOTICES.md`.

## License

Apache License 2.0, see `LICENSE`.
