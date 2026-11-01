# Changelog

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
