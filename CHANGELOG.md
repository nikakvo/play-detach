# Changelog

## Unreleased

- Added system-language detection to the installer. It checks the preferred system locale first, then Android locale properties and the activity configuration as a fallback.
- Added Russian translations for installer messages, including architecture and Android version requirements, Zygisk instructions, Termux setup, and zygisk-detach migration prompts. English remains the fallback for unsupported languages.
- Localized the module description during installation so root managers can display it in the detected language.
- Translated package import confirmations shown when importing apps from zygisk-detach or detach.txt.
- Documented installer and module-description localization in the English and Russian READMEs.

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
