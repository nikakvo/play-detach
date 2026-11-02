<p align="center">
  <a href="README.md">English</a> | 
  <b>Русский</b>
</p>
<hr>

<p align="center"><img src="module/banner.png" alt="Play Detach" width="640"></p>

# Play Detach

Zygisk-модуль, который не даёт Play Маркету обновлять выбранные вами приложения.

Play Маркет обновляет приложения самостоятельно, даже если для них отключено автообновление. Play Detach скрывает выбранные приложения от Play Маркета, поэтому он никогда не предлагает и не устанавливает для них обновления. Сами приложения при этом не изменяются: они продолжают работать, и вы всё так же можете обновлять их вручную.

## Возможности

- Веб-интерфейс (WebUI) с иконками и названиями приложений, поиском и вкладками для сторонних, системных и откреплённых приложений
- Один переключатель на приложение, изменения применяются сразу, без перезагрузки
- Приложения, установленные вне Маркета (APK-файлы, другие магазины, модифицированные приложения), отмечены и могут быть откреплены все сразу
- Автоматическое открепление новых приложений вне Маркета сразу после установки, с уведомлением (по желанию)
- Выбор нескольких приложений, чтобы открепить или прикрепить их вместе; долгое нажатие на приложение открывает его в Play Маркете
- Строка состояния, показывающая, активен ли модуль в Play Маркете, с самопроверкой при каждом запуске Play Маркета и уведомлением, если модуль перестал работать, например после обновления Play Маркета
- Инструмент командной строки для терминалов, а также короткая команда `play-detach` в Termux
- Бэкап и восстановление списка в собственной папке Play-Detach во внутренней памяти, а также автоматический бэкап после каждого изменения
- Необязательный файл `detach.txt` в архиве модуля, чтобы открепить приложения во время установки
- Английский и русский языки, переключаются в веб-интерфейсе (EN / RU); установщик и описание модуля следуют тому же выбору
- Работает только внутри процесса Play Маркета, больше ничего не затрагивается

## Требования

- Устройство arm64 с Android 10 или новее
- Работающий Zygisk: ReZygisk, Zygisk Next или NeoZygisk на KernelSU, SukiSU-Ultra или APatch, либо включённый Zygisk в Magisk
- Модуль zygisk-detach не должен работать одновременно, так как оба модуля изменяют одни и те же вызовы Play Маркета. Если он установлен, Play Detach во время установки копирует его откреплённые приложения и предлагает удалить его (Громкость +), оставить (Громкость -) или отключает его, если кнопка не нажата

## Установка

1. Скачайте zip-архив из раздела [Releases](https://github.com/nikakvo/play-detach/releases).
2. Установите его в своём root-менеджере и перезагрузите устройство.
3. Откройте веб-интерфейс модуля и включите переключатель рядом с приложениями, которые хотите открепить.

## Командная строка

```
su -c '/data/adb/modules/play-detach/play-detach list'
su -c '/data/adb/modules/play-detach/play-detach add com.example.app'
su -c '/data/adb/modules/play-detach/play-detach remove com.example.app'
su -c '/data/adb/modules/play-detach/play-detach clear'
su -c '/data/adb/modules/play-detach/play-detach status'
su -c '/data/adb/modules/play-detach/play-detach backup'
su -c '/data/adb/modules/play-detach/play-detach restore /sdcard/Play-Detach/play-detach-backup.txt'
su -c '/data/adb/modules/play-detach/play-detach autobackup off'
su -c '/data/adb/modules/play-detach/play-detach autodetach on'
su -c '/data/adb/modules/play-detach/play-detach help'
```

Список хранится в файле `/data/adb/play-detach/detach.list`, по одному пакету на строку. При каждом запуске Play Маркета модуль перезаписывает однострочный файл `status` в той же папке со временем (результат самопроверки сохраняется рядом, в файле `hook`), который используют команда `play-detach status` и веб-интерфейс, чтобы показать, активен ли текущий список.

Небольшая фоновая проверка (`service.sh`) замечает новые приложения и обновления Play Маркета. С `autodetach on` новые приложения, установленные не из Play Маркета, сразу открепляются; приложения, восстановленные программой для бэкапа, не затрагиваются.

Бэкапы сохраняются в папку `/sdcard/Play-Detach`, которую создаёт установщик (или в `Download`, если эта папка была удалена). После каждого изменения список также сохраняется туда как `play-detach-auto.txt`.

Чтобы проверить, работает ли модуль:

```
su -c 'logcat -d -s PlayDetach'
```

Строка с текстом `active in Play Store` означает, что модуль работает.

## Как это работает

Модуль загружается только в процесс Play Маркета. Хук на `IPCThreadState::transact` в `libbinder.so` отслеживает binder-вызовы Play Маркета. Когда Play Маркет спрашивает у PackageManager (`getApplicationEnabledSetting`) об откреплённом приложении, имя пакета в запросе стирается, поэтому система отвечает, что приложения не существует, и Play Маркет никогда не предлагает для него обновление.

Каждое чтение данных binder проверяется на выход за границы. Если данные выглядят не точно так, как ожидалось, например после изменений в новой версии Android, вызов пропускается без изменений, а причина записывается в logcat.

## Сборка из исходников

Требования: Linux или WSL, [Android NDK](https://developer.android.com/ndk/downloads) (проверено на r29) и утилита `zip`.

```
git clone https://github.com/nikakvo/play-detach
cd play-detach
ANDROID_NDK_HOME=/path/to/android-ndk-r29 ./build.sh
```

Zip-архив модуля записывается в папку `out/`. Если переменная `ANDROID_NDK_HOME` не задана, `build.sh` ищет NDK в `~/android-ndk-r29`.

| Часть | Исходный код | Собрано с помощью |
|---|---|---|
| Библиотека Zygisk | `src/zygisk/` | C++20, NDK r29, arm64-v8a, Zygisk API v4, без сторонних библиотек |
| Инструмент командной строки | `module/play-detach` | POSIX shell |
| Веб-интерфейс (WebUI) | `module/webroot/` | Чистый HTML, CSS и JavaScript, без этапа сборки, встроенные шрифты; тексты в `i18n.js` (английский и русский) |
| Баннер | `module/banner.png` | Нарисован по `src/banner.svg` |

## Проверено на

- Poco F6 Pro, прошивка Xiaomi.eu (Android 16), SukiSU-Ultra и ReZygisk
- Xiaomi Redmi Note 8T, прошивка InfinityX (Android 17), BakaSU и Zygisk Next (проверил [LegacyFreeman](https://github.com/LegacyFreeman))

## Авторы и благодарности

Play Detach создан [Tears Burn](https://github.com/nikakvo). Это переписанная версия проекта [zygisk-detach](https://github.com/j-hc/zygisk-detach) от [j-hc](https://github.com/j-hc). Техника открепления взята из этого проекта. См. файлы `NOTICE` и `THIRD_PARTY_NOTICES.md`.

Перевод на русский язык выполнен [LegacyFreeman](https://github.com/LegacyFreeman).

## Лицензия

Apache License 2.0, см. файл `LICENSE`.
