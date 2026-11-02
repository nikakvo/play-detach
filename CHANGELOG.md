# Changelog

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
