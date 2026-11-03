/*
 * Play Detach - Zygisk library
 *
 * Copyright 2026 Tears Burn (nikakvo)
 * Based on zygisk-detach by j-hc (https://github.com/j-hc/zygisk-detach).
 * Rewritten from scratch; the detach technique (rewriting the package name in
 * IPackageManager.getApplicationEnabledSetting binder calls made by the Play
 * Store) comes from the original project.
 *
 * Licensed under the Apache License, Version 2.0. See LICENSE.
 *
 * How it works:
 *   1. In the Play Store process only, the companion (running as root) sends
 *      the list of detached packages from /data/adb/play-detach/detach.list.
 *   2. A PLT hook on IPCThreadState::transact inside libbinder.so, placed in
 *      preAppSpecialize, watches outgoing binder calls.
 *   3. When the Play Store asks the PackageManager whether a detached package
 *      is enabled, the package name in the request is blanked, so the Play
 *      Store thinks the app is not installed and never offers updates for it.
 *
 * Safety rules: every read from a binder parcel is bounds-checked, and if
 * anything does not look exactly as expected the call is passed through
 * untouched. On failure the library logs the reason (logcat tag PlayDetach)
 * and does nothing.
 */

#include <android/api-level.h>
#include <android/log.h>
#include <errno.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#include "zygisk.hpp"

#define TAG "PlayDetach"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

namespace {

constexpr char kStorePkg[] = "com.android.vending";
constexpr char kListPath[] = "/data/adb/play-detach/detach.list";
constexpr char kStatusPath[] = "/data/adb/play-detach/status";
constexpr char kBinderLib[] = "/libbinder.so";
constexpr char kTransactSym[] = "_ZN7android14IPCThreadState8transactEijRKNS_6ParcelEPS1_j";

constexpr char16_t kPmDescriptor[] = u"android.content.pm.IPackageManager";
constexpr uint32_t kPmDescriptorLen = sizeof(kPmDescriptor) / sizeof(char16_t) - 1;

// Interface token marker written by Parcel::writeInterfaceToken on Android 11+
// (B_PACK_CHARS('S', 'Y', 'S', 'T')).
constexpr uint32_t kSystHeader = ('S' << 24) | ('Y' << 16) | ('S' << 8) | 'T';

constexpr size_t kMaxListBytes = 64 * 1024;
constexpr size_t kMaxPackages = 2048;
constexpr size_t kMaxPkgLen = 255;
constexpr size_t kMaxParcelSize = 1024 * 1024;

// ---------------------------------------------------------------------------
// Detached package list (filled once in preAppSpecialize, read-only after).
// ---------------------------------------------------------------------------

struct Pkg {
    const char* name;
    uint32_t len;
};

char* g_listBuf = nullptr;
Pkg* g_pkgs = nullptr;
size_t g_pkgCount = 0;

bool isPkgChar(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '.' ||
           c == '_';
}

// Parses the newline separated list in place. Blank lines and lines starting
// with '#' are ignored, invalid names are skipped.
void parseList(char* buf, size_t size) {
    g_pkgs = static_cast<Pkg*>(calloc(kMaxPackages, sizeof(Pkg)));
    if (!g_pkgs) return;

    size_t pos = 0;
    while (pos < size && g_pkgCount < kMaxPackages) {
        size_t start = pos;
        while (pos < size && buf[pos] != '\n') pos++;
        size_t end = pos;
        if (pos < size) pos++;  // skip '\n'

        while (start < end && (buf[start] == ' ' || buf[start] == '\t')) start++;
        while (end > start && (buf[end - 1] == ' ' || buf[end - 1] == '\t' || buf[end - 1] == '\r')) end--;

        size_t len = end - start;
        if (len == 0 || buf[start] == '#' || len > kMaxPkgLen) continue;

        bool ok = true;
        for (size_t i = start; i < end; i++) {
            if (!isPkgChar(buf[i])) {
                ok = false;
                break;
            }
        }
        if (!ok) continue;

        g_pkgs[g_pkgCount].name = buf + start;
        g_pkgs[g_pkgCount].len = static_cast<uint32_t>(len);
        g_pkgCount++;
    }
}

bool isDetached(const char16_t* pkg, uint32_t len) {
    for (size_t i = 0; i < g_pkgCount; i++) {
        const Pkg& p = g_pkgs[i];
        if (p.len != len) continue;
        uint32_t j = 0;
        while (j < len && static_cast<char16_t>(p.name[j]) == pkg[j]) j++;
        if (j == len) return true;
    }
    return false;
}

void freeList() {
    free(g_pkgs);
    free(g_listBuf);
    g_pkgs = nullptr;
    g_listBuf = nullptr;
    g_pkgCount = 0;
}

// ---------------------------------------------------------------------------
// Socket helpers (companion <-> app process).
// ---------------------------------------------------------------------------

bool readAll(int fd, void* buf, size_t size) {
    auto* p = static_cast<uint8_t*>(buf);
    while (size > 0) {
        ssize_t n = read(fd, p, size);
        if (n < 0 && errno == EINTR) continue;
        if (n <= 0) return false;  // error or peer closed early
        p += n;
        size -= static_cast<size_t>(n);
    }
    return true;
}

bool writeAll(int fd, const void* buf, size_t size) {
    auto* p = static_cast<const uint8_t*>(buf);
    while (size > 0) {
        ssize_t n = write(fd, p, size);
        if (n < 0 && errno == EINTR) continue;
        if (n <= 0) return false;
        p += n;
        size -= static_cast<size_t>(n);
    }
    return true;
}

// Counts the package lines in a list buffer (same rules as parseList, without
// validating characters, which is enough for the status file).
size_t countEntries(const char* buf, size_t size) {
    size_t count = 0, pos = 0;
    while (pos < size) {
        while (pos < size && (buf[pos] == ' ' || buf[pos] == '\t' || buf[pos] == '\r')) pos++;
        if (pos < size && buf[pos] != '\n' && buf[pos] != '#') count++;
        while (pos < size && buf[pos] != '\n') pos++;
        pos++;
    }
    return count;
}

// Overwrites a tiny status file (one line, never grows) so the WebUI can tell
// that the Play Store loaded the current list. Written atomically; the
// companion can run on several threads at once, so each one uses its own
// temporary file. The result of the hook is read from the log right after
// this file changes (play-detach check / status), see the CLI.
void writeStatus(size_t count) {
    char line[64];
    int len = snprintf(line, sizeof(line), "loaded=%lld packages=%zu\n", static_cast<long long>(time(nullptr)), count);
    if (len <= 0) return;
    char tmp[96];
    snprintf(tmp, sizeof(tmp), "%s.tmp.%d", kStatusPath, static_cast<int>(gettid()));
    int fd = open(tmp, O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC, 0600);
    if (fd < 0) return;
    bool ok = writeAll(fd, line, static_cast<size_t>(len));
    close(fd);
    if (ok) rename(tmp, kStatusPath);
    else unlink(tmp);
}

// Runs as root in the Zygisk companion daemon. Protocol: uint32 size, then
// size bytes of detach.list. A size of 0 means "nothing to do".
void companionHandler(int client) {
    uint32_t size = 0;
    char* data = nullptr;

    int fd = open(kListPath, O_RDONLY | O_CLOEXEC);
    if (fd >= 0) {
        struct stat st;
        if (fstat(fd, &st) == 0 && st.st_size > 0 && static_cast<size_t>(st.st_size) <= kMaxListBytes) {
            data = static_cast<char*>(malloc(static_cast<size_t>(st.st_size)));
            if (data && readAll(fd, data, static_cast<size_t>(st.st_size))) {
                size = static_cast<uint32_t>(st.st_size);
            }
        }
        close(fd);
    }

    if (writeAll(client, &size, sizeof(size)) && size > 0) {
        if (writeAll(client, data, size)) writeStatus(countEntries(data, size));
    }
    free(data);
}

bool loadListFromCompanion(zygisk::Api* api) {
    int fd = api->connectCompanion();
    if (fd < 0) {
        LOGE("connectCompanion failed");
        return false;
    }

    uint32_t size = 0;
    bool ok = readAll(fd, &size, sizeof(size));
    if (ok && size > 0 && size <= kMaxListBytes) {
        g_listBuf = static_cast<char*>(malloc(size));
        ok = g_listBuf && readAll(fd, g_listBuf, size);
        if (ok) parseList(g_listBuf, size);
    }
    close(fd);

    if (!ok) {
        LOGE("could not read the detach list from the companion");
        return false;
    }
    return g_pkgCount > 0;
}

// ---------------------------------------------------------------------------
// Binder hook.
// ---------------------------------------------------------------------------

// Leading members of android::Parcel (unchanged since Android 4).
struct RawParcel {
    int32_t error;
    uint8_t* data;
    size_t dataSize;
};

class ParcelReader {
   public:
    ParcelReader(uint8_t* data, size_t size) : data_(data), size_(size) {}

    bool readU32(uint32_t* out) {
        if (size_ - pos_ < sizeof(uint32_t)) return false;
        memcpy(out, data_ + pos_, sizeof(uint32_t));
        pos_ += sizeof(uint32_t);
        return true;
    }

    // Reads a String16 (int32 length, UTF-16 chars, null terminator, 4-byte padding).
    bool readString16(char16_t** str, uint32_t* len) {
        uint32_t l;
        if (!readU32(&l)) return false;
        if (l > 4096) return false;  // also rejects -1 (null string)
        size_t bytes = (static_cast<size_t>(l) + 1) * sizeof(char16_t);
        size_t padded = (bytes + 3) & ~static_cast<size_t>(3);
        if (size_ - pos_ < padded) return false;
        *str = reinterpret_cast<char16_t*>(data_ + pos_);
        *len = l;
        pos_ += padded;
        return true;
    }

    bool skip(size_t n) {
        if (size_ - pos_ < n) return false;
        pos_ += n;
        return true;
    }

   private:
    uint8_t* data_;
    size_t size_;
    size_t pos_ = 0;
};

using TransactFn = int (*)(void*, int32_t, uint32_t, void*, void*, uint32_t);

TransactFn g_transactOrig = nullptr;
uint32_t g_enabledSettingCode = 0;  // IPackageManager.Stub.TRANSACTION_getApplicationEnabledSetting
uint32_t g_headerWords = 0;         // int32 words before the interface descriptor
bool g_checkSyst = false;

void maybeDetach(void* parcelPtr) {
    auto* parcel = static_cast<RawParcel*>(parcelPtr);
    if (!parcel || !parcel->data || parcel->dataSize == 0 || parcel->dataSize > kMaxParcelSize) return;

    ParcelReader r(parcel->data, parcel->dataSize);

    // Interface token header.
    uint32_t word = 0;
    for (uint32_t i = 0; i < g_headerWords; i++) {
        if (!r.readU32(&word)) return;
    }
    if (g_checkSyst && word != kSystHeader) return;

    char16_t* desc;
    uint32_t descLen;
    if (!r.readString16(&desc, &descLen)) return;
    if (descLen != kPmDescriptorLen || memcmp(desc, kPmDescriptor, descLen * sizeof(char16_t)) != 0) return;

    // getApplicationEnabledSetting(String packageName, int userId)
    char16_t* pkg;
    uint32_t pkgLen;
    if (!r.readString16(&pkg, &pkgLen) || pkgLen == 0) return;

    if (isDetached(pkg, pkgLen)) pkg[0] = 0;
}

int transactHook(void* self, int32_t handle, uint32_t code, void* data, void* reply, uint32_t flags) {
    if (code == g_enabledSettingCode) maybeDetach(data);
    return g_transactOrig(self, handle, code, data, reply, flags);
}

uint32_t readEnabledSettingCode(JNIEnv* env) {
    jclass cls = env->FindClass("android/content/pm/IPackageManager$Stub");
    if (!cls) {
        env->ExceptionClear();
        LOGE("class IPackageManager$Stub not found");
        return 0;
    }
    jfieldID field = env->GetStaticFieldID(cls, "TRANSACTION_getApplicationEnabledSetting", "I");
    if (!field) {
        env->ExceptionClear();
        env->DeleteLocalRef(cls);
        LOGE("field TRANSACTION_getApplicationEnabledSetting not found");
        return 0;
    }
    jint value = env->GetStaticIntField(cls, field);
    env->DeleteLocalRef(cls);
    return value > 0 ? static_cast<uint32_t>(value) : 0;
}

// Finds dev/inode of the mapped libbinder.so in /proc/self/maps.
bool findBinderMapping(dev_t* dev, ino_t* inode) {
    FILE* fp = fopen("/proc/self/maps", "re");
    if (!fp) return false;

    char* line = nullptr;
    size_t cap = 0;
    bool found = false;
    const size_t libLen = strlen(kBinderLib);

    while (getline(&line, &cap, fp) > 0) {
        size_t len = strlen(line);
        while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == ' ')) line[--len] = 0;
        if (len < libLen || strcmp(line + len - libLen, kBinderLib) != 0) continue;

        unsigned int major = 0, minor = 0;
        unsigned long ino = 0;
        char perms[8] = {0};
        if (sscanf(line, "%*s %7s %*s %x:%x %lu", perms, &major, &minor, &ino) != 4) continue;
        if (ino == 0) continue;

        *dev = makedev(major, minor);
        *inode = static_cast<ino_t>(ino);
        found = true;
        break;
    }

    free(line);
    fclose(fp);
    return found;
}

bool installHook(zygisk::Api* api, JNIEnv* env) {
    int sdk = android_get_device_api_level();
    if (sdk < 29) {
        LOGE("unsupported Android API level %d", sdk);
        return false;
    }
    // Android 11+: strict mode policy, work source uid, 'SYST' marker.
    // Android 10: strict mode policy, work source uid.
    g_headerWords = sdk >= 30 ? 3 : 2;
    g_checkSyst = sdk >= 30;

    g_enabledSettingCode = readEnabledSettingCode(env);
    if (g_enabledSettingCode == 0) return false;

    dev_t dev;
    ino_t inode;
    if (!findBinderMapping(&dev, &inode)) {
        LOGE("libbinder.so is not mapped");
        return false;
    }

    api->pltHookRegister(dev, inode, kTransactSym, reinterpret_cast<void*>(transactHook),
                         reinterpret_cast<void**>(&g_transactOrig));
    if (!api->pltHookCommit() || !g_transactOrig) {
        LOGE("PLT hook on IPCThreadState::transact failed");
        return false;
    }

    LOGI("active in Play Store, %zu package(s) detached, API %d", g_pkgCount, sdk);
    return true;
}

bool isStoreProcess(const char* name) {
    size_t n = sizeof(kStorePkg) - 1;
    return strncmp(name, kStorePkg, n) == 0 && (name[n] == '\0' || name[n] == ':');
}

class PlayDetach : public zygisk::ModuleBase {
   public:
    void onLoad(zygisk::Api* api, JNIEnv* env) override {
        api_ = api;
        env_ = env;
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs* args) override {
        bool store = false;
        if (args->nice_name) {
            const char* name = env_->GetStringUTFChars(args->nice_name, nullptr);
            if (name) {
                store = isStoreProcess(name);
                env_->ReleaseStringUTFChars(args->nice_name, name);
            }
        }

        // The hook is placed here, before specialization, while the process
        // still has the rights of zygote. libbinder.so is already loaded, and
        // some Zygisk implementations cannot find libraries for pltHookRegister
        // once the process runs as the app (ReZygisk 2c1d0df stats files under
        // /data/adb, which the app cannot reach). If nothing was hooked, the
        // library is unloaded.
        if (!store || !loadListFromCompanion(api_) || !installHook(api_, env_)) unload();
    }

    void preServerSpecialize(zygisk::ServerSpecializeArgs*) override { unload(); }

   private:
    void unload() {
        freeList();
        api_->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

    zygisk::Api* api_ = nullptr;
    JNIEnv* env_ = nullptr;
};

}  // namespace

REGISTER_ZYGISK_MODULE(PlayDetach)
REGISTER_ZYGISK_COMPANION(companionHandler)
