# Changelog

## v1.4.0

- Much lighter in the background: the check for new apps and Play Store starts no longer wakes up every 3 seconds. It sleeps until Android reports a change (an app installed or removed, the Play Store started). Measured on a Poco F6 Pro over 10 idle minutes: 0 s of CPU and no wake-ups, before: 3.2 s and about 600 small helper programs
- The WebUI no longer reads the whole system log every 3 seconds while it is open (that took up to 2 seconds each time on a full log)
- Detach and re-attach are about 3 times faster (about 50 ms instead of 150 ms)
- Fixed: two changes at almost the same moment (an automatic detach while you flip a switch, or two switches tapped very quickly) could lose one of them
- Fixed: when the list could not be saved, the command still reported success
- Fixed: a line with `*` in a backup or import file was accepted as an app
- A list longer than the module can read in the Play Store (2048 apps) is refused with a clear message, and the self-check now reports a list that is too big instead of doing nothing
- The self-check could miss a Play Store start when the module's log line came a moment late; it now tries again
- New: the status line says when Zygisk did not load the module in the Play Store at all, and Status and settings shows which Zygisk was found
- New: Recent changes in Status and settings, and the app menu shows when a detached app was detached and how (by you, automatically, from a backup or imported). `play-detach history` shows the same
- New: choose installers whose apps are never detached automatically, for example Aurora Store or F-Droid, with a switch for each installer in Status and settings (or `play-detach autoskip add <installer>`)
- New: Copy list and Share in the Back up window send the list as text, for example to another phone
- The module's files in /data/adb are now readable by root only
- The module description in the root manager lists the main features

## v1.3.1

- Fixed: with the newest ReZygisk (from commit 2c1d0df, November 2026) the module stopped working. The status line showed "Not working: Android changed (the hook could not be placed)" and the Play Store could offer updates for detached apps again. The module now sets up its hook a moment earlier, while the Play Store process is still starting, so this ReZygisk change no longer affects it

## v1.3.0

- Detach new sideloaded apps automatically: an optional switch in the new Status and settings window. Every app you install from then on from an APK file, another store or as a patched app is detached right away, with a notification and a note in the app. Apps from the Play Store and apps restored by Xiaomi Backup, Swift Backup or Neo Backup are left alone, and when many apps appear at once (a backup being restored) nothing is detached. `play-detach autodetach on` / `off` does the same
- Self-check: right after each Play Store start the result of the module is read and saved, so the status line stays right even hours later, when the system log no longer has it
- After a Play Store update the status line says so until the Play Store has started again and the module was checked. If the module stops working, the status line turns red with the reason and you get a notification once
- Tap the status line for Status and settings: Play Store version and last update, last Play Store start, self-check result, both automatic switches and the apps detached automatically
- Apps that are no longer installed are listed at the top. When you install one of them again it stays detached and you get a notification
- Long app names no longer hide the Sideloaded / Not installed badge
- New `play-detach scan` command to look for new apps right away
- The status line and the app list update by themselves while the WebUI is open, no need to close and reopen it
- The help page starts with numbered contents: tap a topic to jump straight to it, and the arrow at the bottom right takes you back to the top

## v1.2.0

- Russian language: an EN / RU switch next to Help changes the whole module - the app, every window and message, the help page and the module description in the root manager. The choice is remembered; the first time the language follows the phone. Russian translation based on the work of LegacyFreeman
- The installer shows its messages in the chosen language (or the phone's language)
- Tested on Android 17 too: Xiaomi Redmi Note 8T with the InfinityX ROM, BakaSU and Zygisk Next (thanks to LegacyFreeman)
- Clearer text in the Detach all confirmation when the search box is used

## v1.1.1

- Automatic backup switch in the Back up and Restore windows, so it can be turned off without the command line
- Long-press an app to see which app installed it (Play Store, package installer for APK files, Xiaomi Backup, SAI, another store, or unknown), so it is clear why an app is marked Sideloaded
- The help page explains how Sideloaded is detected

## v1.1.0

- New look for the WebUI: the User apps, Detached and System apps tabs are coloured cards that always fit the screen, and the status line no longer overlaps the list when you scroll
- Back up, Restore and Re-attach all now sit right under the tabs in the Detached tab, no more scrolling to the bottom
- Own backup folder: the installer creates Play-Detach in internal storage and Back up / Restore open it directly. If you delete it, Download is used instead
- Automatic backup: after every change the list is saved to Play-Detach/play-detach-auto.txt and shown first in Restore. An empty list never replaces it. `play-detach autobackup off` turns it off
- Sideloaded apps (APK files, other stores, patched apps) are marked, and a Sideloaded filter in User apps shows only them
- Detach all detaches every app in the list you see, for example all sideloaded apps or all search results, after you confirm
- Select several apps and detach or re-attach them at once: tap Select, or long-press an app
- Long-press an app for its menu: open it in the Play Store, start selecting, or copy the package name
- A note in the Detached tab tells you when apps on the list are no longer installed, with a button to remove them
- The help button now says Help

## v1.0.3

- The WebUI opens reliably on a quick reopen: the app list, the status line and the version no longer stay stuck on "Loading..." until the page is opened again

## v1.0.2

- Backup and restore: save your detached apps to any folder in internal storage and restore them later, from the Detached tab in the WebUI or with `play-detach backup` / `play-detach restore`
- When zygisk-detach is installed, Play Detach now copies its detached apps and asks what to do with it: Vol+ removes it together with the files it leaves behind, Vol- keeps it, and with no key press in 15 seconds it is disabled so the two modules do not conflict
- `import` and `detach.txt` now reject a line that holds more than one package name instead of splitting it

## v1.0.1

- The status line now stays green after the phone sleeps. It used to turn orange when Android dropped old log lines, even though the module was working
- The status line turns orange right after you change the list, until the Play Store opens again and loads the new list
- New `play-detach status` command shows whether the Play Store uses the current list

## v1.0.0

First release.

- Stops the Play Store from offering or installing updates for the apps you choose
- WebUI with app icons and names, search, and tabs for user, system and detached apps
- One switch per app, changes apply right away without a reboot
- Status line that shows whether the module is active in the Play Store
- Command line tool for terminals, with a short `play-detach` command in Termux
- Optional `detach.txt` in the module zip to detach apps at install time
- Help page inside the WebUI
