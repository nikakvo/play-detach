<p align="center">
  <a href="README.md">English</a> | 
  <a href="README_ru.md">Русский</a> | 
  <b>中文</b>
</p>
<hr>

<p align="center"><img src="module/banner.png" alt="Play Detach" width="640"></p>

# Play Detach

一个 Zygisk 模块，用于阻止 Play 商店更新你选择的应用。

Play 商店会自行更新应用，即使你已经为它们关闭了自动更新。Play Detach 会把你选择的应用从 Play 商店中隐藏起来，因此它永远不会为这些应用推送或安装更新。应用本身不会被修改：它们照常运行，你仍然可以手动更新它们。

## 功能

- WebUI 带应用图标和名称，支持搜索，并有用户应用、系统应用和已分离三个标签页
- 每个应用一个开关，更改立即生效，无需重启设备
- 侧载应用（APK 文件、其他应用商店、已打补丁的应用）会被标记，并可一键全部分离
- 可选：安装后立即自动分离新的侧载应用，并发送通知；可以把你信任的安装来源（例如 Aurora Store）排除在外
- 可多选应用，批量分离或重新关联；长按应用可在 Play 商店中打开它
- 状态栏显示模块是否已在 Play 商店中生效，每次 Play 商店启动都会自检，一旦失效（例如 Play 商店更新之后）就发送通知；如果 Zygisk 完全没有加载模块，它也会告诉你
- 列表更改历史（应用何时被分离或重新关联，以及由谁操作）
- 用于终端的命令行工具，以及在 Termux 中提供的简短 `play-detach` 命令
- 列表的备份与恢复，保存在内部存储中专用的 Play-Detach 文件夹里；每次更改后自动备份；列表还可以复制或作为文本分享
- 可选：在模块 zip 中放置 `detach.txt`，在安装时分离应用
- 支持中文、英文和俄文，可在 WebUI 中通过帮助按钮旁边的语言菜单选择；安装脚本和模块描述会跟随同一选择
- 只在 Play 商店进程中工作，不影响其他任何东西

## 系统要求

- Android 10 或更高版本的 arm64 设备
- 可正常工作的 Zygisk：KernelSU、SukiSU-Ultra 或 APatch 上的 ReZygisk、Zygisk Next 或 NeoZygisk，SukiSU-Ultra 内置的 Zygisk，或在 Magisk 中启用的 Zygisk
- 不能与 zygisk-detach 同时运行，两个模块会改写同一批 Play 商店调用。如果它已经安装，Play Detach 会在安装时复制它已分离的应用，并询问是否移除它（音量+）、保留它（音量-），若未按任何键则禁用它

## 安装

1. 从 [Releases](https://github.com/nikakvo/play-detach/releases) 下载 zip 包。
2. 在你的 root 管理器中安装它，然后重启设备。
3. 打开模块的 WebUI，打开你想分离的应用旁边的开关。

## 命令行

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
su -c '/data/adb/modules/play-detach/play-detach autoskip add com.aurora.store'
su -c '/data/adb/modules/play-detach/play-detach history'
su -c '/data/adb/modules/play-detach/play-detach help'
```

列表保存在 `/data/adb/play-detach/detach.list`，每行一个包名。每次 Play 商店启动时，模块都会用时间覆盖同一文件夹下的单行 `status` 文件（自检结果保存在它旁边的 `hook` 文件中），`play-detach status` 和 WebUI 便据此显示当前列表是否已经生效。

一个很小的后台脚本（`service.sh`）会休眠等待 Linux inotify 事件（busybox 或 toybox 的 `inotifyd`，没有时退化为每 3 秒检查一次），用来感知新应用和 Play 商店更新，因此在没有任何变化时它完全不工作。开启 `autodetach on` 后，从 Play 商店之外安装的新应用会立即被分离；由备份应用恢复的应用则不受影响。

备份保存在 `/sdcard/Play-Detach`，该文件夹由安装脚本创建（如果它被删除了，则改为 `Download`）。每次更改后，列表还会以 `play-detach-auto.txt` 的形式保存到那里。

检查模块是否正常工作：

```
su -c 'logcat -d -s PlayDetach'
```

出现 `active in Play Store` 这一行，说明它正在运行。

## 工作原理

模块只加载到 Play 商店的进程中。它通过在 `libbinder.so` 中对 `IPCThreadState::transact` 挂钩，监视 Play 商店的 binder 调用。当 Play 商店向 PackageManager（`getApplicationEnabledSetting`）查询某个已分离的应用时，请求中的包名会被抹掉，于是系统回答该应用不存在，Play 商店也就永远不会为它提供更新。

每次读取 binder 数据都会做边界检查。如果数据与预期不完全一致，例如在新版 Android 中发生了变化，该调用会被原样放行，原因则写入 logcat。

## 从源码构建

要求：Linux 或 WSL、[Android NDK](https://developer.android.com/ndk/downloads)（已在 r29 上测试）以及 `zip`。

```
git clone https://github.com/nikakvo/play-detach
cd play-detach
ANDROID_NDK_HOME=/path/to/android-ndk-r29 ./build.sh
```

模块 zip 会输出到 `out/` 目录。如果没有设置 `ANDROID_NDK_HOME`，`build.sh` 会在 `~/android-ndk-r29` 中查找 NDK。

| 部分 | 源码 | 构建方式 |
|---|---|---|
| Zygisk 库 | `src/zygisk/` | C++20，NDK r29，arm64-v8a，Zygisk API v4，无第三方库 |
| 命令行工具 | `module/play-detach` | POSIX shell |
| WebUI | `module/webroot/` | 纯 HTML、CSS 和 JavaScript，无构建步骤，内置字体；文本位于 `i18n.js`（中文、英文和俄文） |
| 横幅图片 | `module/banner.png` | 由 `src/banner.svg` 绘制 |

## 已测试设备

- Poco F6 Pro，Xiaomi.eu ROM（Android 16），SukiSU-Ultra 和 ReZygisk
- Xiaomi Redmi Note 8T，InfinityX ROM（Android 17），BakaSU 和 Zygisk Next（由 [LegacyFreeman](https://github.com/LegacyFreeman) 测试）

## 致谢

Play Detach 由 [Tears Burn](https://github.com/nikakvo) 开发。它是 [j-hc](https://github.com/j-hc) 的 [zygisk-detach](https://github.com/j-hc/zygisk-detach) 的重写版本，分离技术来自该项目。详见 `NOTICE` 和 `THIRD_PARTY_NOTICES.md`。

俄语翻译基于 [LegacyFreeman](https://github.com/LegacyFreeman) 的工作。简体中文翻译由 [gander2388](https://github.com/gander2388) 完成。

## 许可证

Apache License 2.0，详见 `LICENSE`。
