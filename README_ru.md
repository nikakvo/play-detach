<p align="center">
  <a href="README.md">English</a> | 
  <b>Русский</b>
</p>
<hr>

<p align="center"><img src="module/banner.png" alt="Play Detach" width="640"></p>

# Play Detach

Zygisk-модуль, который останавливает обновление выбранных вами приложений через Play Маркет.

Play Маркет обновляет приложения самостоятельно, даже если для них отключено автообновление. Play Detach скрывает выбранные приложения от Play Маркета, поэтому он никогда не предлагает и не устанавливает для них обновления. Сами приложения при этом не изменяются: они продолжают работать, и вы всё так же можете обновлять их вручную.

## Возможности

- Веб-интерфейс (WebUI) с иконками и названиями приложений, поиском и вкладками для пользовательских, системных и отсоединенных приложений
- Один переключатель на приложение, изменения применяются сразу же без перезагрузки
- Строка состояния, показывающая, активен ли модуль в Play Маркете
- Сообщения установщика и описание модуля настраиваются по языку системы (английский или русский)
- Инструмент командной строки для терминалов, а также короткая команда `play-detach` в Termux
- Создание резервных копий и восстановление списка со встроенным файловым браузером для выбора места сохранения
- Необязательный файл `detach.txt` в архиве модуля для отключения обновлений приложений во время установки
- Работает только внутри процесса Play Маркета, больше ничего не затрагивается

## Требования

- Устройство с архитектурой arm64 под управлением Android 10 или новее
- Работающий Zygisk: ReZygisk, Zygisk Next или NeoZygisk на KernelSU, SukiSU-Ultra или APatch, либо включенный Zygisk в Magisk
- Модуль `zygisk-detach` не должен работать одновременно, так как оба модуля изменяют одни и те же вызовы Play Маркета. Если он установлен, Play Detach копирует его отсоединенные приложения во время установки и предлагает удалить его (Громкость +), оставить (Громкость -) или отключает его, если кнопка не нажата

## Установка

1. Скачайте zip-архив из раздела [Releases](https://github.com/nikakvo/play-detach/releases).
2. Установите его в своем root-менеджере и перезагрузите устройство.
3. Откройте веб-интерфейс модуля и включите переключатель рядом с приложениями, которые хотите отключить от обновлений.

## Командная строка
```
su -c '/data/adb/modules/play-detach/play-detach list'
su -c '/data/adb/modules/play-detach/play-detach add com.example.app'
su -c '/data/adb/modules/play-detach/play-detach remove com.example.app'
su -c '/data/adb/modules/play-detach/play-detach clear'
su -c '/data/adb/modules/play-detach/play-detach status'
su -c '/data/adb/modules/play-detach/play-detach backup'
su -c '/data/adb/modules/play-detach/play-detach restore /sdcard/Download/play-detach-backup.txt'
su -c '/data/adb/modules/play-detach/play-detach help'
```
Список хранится в файле `/data/adb/play-detach/detach.list`, по одному пакету на строку. Каждый раз при запуске Play Маркета модуль перезаписывает однострочный файл `status` в той же папке, который используется командой `play-detach status` и веб-интерфейсом для отображения активности текущего списка.

Чтобы проверить, работает ли модуль:
```
su -c 'logcat -d -s PlayDetach'
```

Строка с текстом `active in Play Store` означает, что модуль запущен.

## Как это работает

Модуль загружается только в процесс Play Маркета. Перехват (хук) функции `IPCThreadState::transact` в библиотеке `libbinder.so` отслеживает binder-вызовы Play Маркета. Когда Play Маркет запрашивает у PackageManager (`getApplicationEnabledSetting`) информацию об отключенном приложении, имя пакета в запросе очищается, поэтому система отвечает, что приложение не существует, и Play Маркет никогда не предлагает обновление для него.

Каждое чтение данных binder проверяется на выход за границы. Если данные выглядят не так, как ожидалось, например после изменений в новой версии Android, вызов пропускается без изменений, а причина записывается в logcat.

## Сборка из исходников

Требования: Linux или WSL, [Android NDK](https://developer.android.com/ndk/downloads) (проверено на r29) и утилита `zip`.
```
git clone https://github.com/nikakvo/play-detach
cd play-detach
ANDROID_NDK_HOME=/path/to/android-ndk-r29 ./build.sh
```

Zip-архив модуля записывается в папку `out/`. Если переменная `ANDROID_NDK_HOME` не задана, скрипт `build.sh` ищет NDK в директории `~/android-ndk-r29`.

| Часть | Исходный код | Собрано с помощью |
|---|---|---|
| Библиотека Zygisk | `src/zygisk/` | C++20, NDK r29, arm64-v8a, Zygisk API v4, без сторонних библиотек |
| Инструмент командной строки | `module/play-detach` | POSIX shell |
| Веб-интерфейс (WebUI) | `module/webroot/` | Чистый HTML, CSS и JavaScript, без этапа сборки, встроенные шрифты |
| Баннер | `module/banner.png` | Сгенерирован из `src/banner.svg` |

## Авторы и благодарности

Play Detach является переписанной версией проекта [zygisk-detach](https://github.com/j-hc/zygisk-detach) от j-hc. Техника отключения заимствована из этого проекта. См. файлы `NOTICE` и `THIRD_PARTY_NOTICES.md`.

## Лицензия

Лицензия Apache License 2.0, см. файл `LICENSE`.
