// SITIOO Windows support. GPL-2.0-or-later.
// No service registration. A private Job Object owns only the child created here.
#define UNICODE
#define _UNICODE
#include <windows.h>
#include <tlhelp32.h>
#include <aclapi.h>
#include <sddl.h>
#include <wincrypt.h>
#include <io.h>
#include <fcntl.h>
#include <cstdio>
#include <string>
#include <vector>

static int fail(const char* operation) {
    fprintf(stderr, "SITIOO Windows: %s (%lu).\n", operation, GetLastError());
    return 10;
}
static std::wstring quote(const std::wstring& value) {
    std::wstring result = L"\""; size_t slashes = 0;
    for (wchar_t c : value) {
        if (c == L'\\') { ++slashes; continue; }
        if (c == L'\"') result.append(slashes * 2 + 1, L'\\');
        else result.append(slashes, L'\\');
        slashes = 0; result += c;
    }
    result.append(slashes * 2, L'\\'); result += L'\"'; return result;
}
static DWORD parentPid() {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) return 0;
    PROCESSENTRY32W entry{}; entry.dwSize = sizeof(entry); DWORD found = 0;
    if (Process32FirstW(snapshot, &entry)) do {
        if (entry.th32ProcessID == GetCurrentProcessId()) { found = entry.th32ParentProcessID; break; }
    } while (Process32NextW(snapshot, &entry));
    CloseHandle(snapshot); return found;
}
static int launch(int argc, wchar_t** argv) {
    if (argc < 3) return 2;
    HANDLE parent = OpenProcess(SYNCHRONIZE, FALSE, parentPid());
    if (!parent) return fail("parent");
    HANDLE job = CreateJobObjectW(nullptr, nullptr);
    if (!job) { CloseHandle(parent); return fail("job"); }
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, &limits, sizeof(limits))) return fail("job limits");
    std::wstring cmd;
    for (int i = 2; i < argc; ++i) { if (i > 2) cmd += L' '; cmd += quote(argv[i]); }
    STARTUPINFOW start{}; start.cb = sizeof(start); start.dwFlags = STARTF_USESTDHANDLES;
    start.hStdInput = GetStdHandle(STD_INPUT_HANDLE); start.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE); start.hStdError = GetStdHandle(STD_ERROR_HANDLE);
    for (HANDLE h : {start.hStdInput, start.hStdOutput, start.hStdError})
        if (h && h != INVALID_HANDLE_VALUE) SetHandleInformation(h, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT);
    PROCESS_INFORMATION child{};
    if (!CreateProcessW(argv[2], cmd.data(), nullptr, nullptr, TRUE, CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT, nullptr, nullptr, &start, &child)) {
        CloseHandle(job); CloseHandle(parent); return fail("create process");
    }
    if (!AssignProcessToJobObject(job, child.hProcess)) {
        DWORD error = GetLastError(); TerminateProcess(child.hProcess, 11);
        CloseHandle(child.hThread); CloseHandle(child.hProcess); CloseHandle(job); CloseHandle(parent); SetLastError(error); return fail("assign process");
    }
    ResumeThread(child.hThread); CloseHandle(child.hThread);
    HANDLE waiters[] = {child.hProcess, parent};
    DWORD wait = WaitForMultipleObjects(2, waiters, FALSE, INFINITE), code = 12;
    if (wait == WAIT_OBJECT_0) GetExitCodeProcess(child.hProcess, &code);
    // Closing the job terminates only the owned process tree, including after parent death.
    CloseHandle(job); WaitForSingleObject(child.hProcess, 5000);
    CloseHandle(child.hProcess); CloseHandle(parent); return static_cast<int>(code);
}
static std::vector<BYTE> currentUser() {
    HANDLE token = nullptr; DWORD size = 0;
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) return {};
    GetTokenInformation(token, TokenUser, nullptr, 0, &size);
    std::vector<BYTE> value(size);
    if (!GetTokenInformation(token, TokenUser, value.data(), size, &size)) value.clear();
    CloseHandle(token); return value;
}
static bool noReparse(const std::wstring& input) {
    wchar_t full[32768]; DWORD size = GetFullPathNameW(input.c_str(), 32768, full, nullptr);
    if (!size || size >= 32768) return false;
    std::wstring path(full);
    for (size_t i = 3; i <= path.size(); ++i) {
        if (i != path.size() && path[i] != L'\\' && path[i] != L'/') continue;
        DWORD a = GetFileAttributesW(path.substr(0, i).c_str());
        if (a == INVALID_FILE_ATTRIBUTES || (a & FILE_ATTRIBUTE_REPARSE_POINT)) return false;
    }
    return true;
}
static int directory(const wchar_t* path, bool secure) {
    if (!noReparse(path)) return fail("private path");
    DWORD attrs = GetFileAttributesW(path);
    if (attrs == INVALID_FILE_ATTRIBUTES || !(attrs & FILE_ATTRIBUTE_DIRECTORY)) return fail("private directory");
    auto token = currentUser(); if (token.empty()) return fail("account");
    PSID user = reinterpret_cast<TOKEN_USER*>(token.data())->User.Sid;
    BYTE systemBytes[SECURITY_MAX_SID_SIZE]; DWORD systemSize = sizeof(systemBytes);
    if (!CreateWellKnownSid(WinLocalSystemSid, nullptr, systemBytes, &systemSize)) return fail("system SID");
    if (secure) {
        LPWSTR userText = nullptr;
        if (!ConvertSidToStringSidW(user, &userText)) return fail("SID");
        std::wstring sddl = L"D:P(A;OICI;FA;;;" + std::wstring(userText) + L")(A;OICI;FA;;;SY)";
        LocalFree(userText);
        PSECURITY_DESCRIPTOR descriptor = nullptr;
        if (!ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl.c_str(), SDDL_REVISION_1, &descriptor, nullptr)) return fail("ACL");
        PACL acl = nullptr; BOOL present, defaulted;
        GetSecurityDescriptorDacl(descriptor, &present, &acl, &defaulted);
        DWORD code = SetNamedSecurityInfoW(const_cast<LPWSTR>(path), SE_FILE_OBJECT, DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION, nullptr, nullptr, acl, nullptr);
        LocalFree(descriptor);
        if (code != ERROR_SUCCESS) { SetLastError(code); return fail("protect directory"); }
    }
    PSECURITY_DESCRIPTOR descriptor = nullptr; PACL acl = nullptr;
    DWORD code = GetNamedSecurityInfoW(const_cast<LPWSTR>(path), SE_FILE_OBJECT, DACL_SECURITY_INFORMATION, nullptr, nullptr, &acl, nullptr, &descriptor);
    if (code || !acl || !acl->AceCount) { if (descriptor) LocalFree(descriptor); return fail("read private ACL"); }
    bool valid = true, ownerGrant = false;
    for (DWORD i = 0; i < acl->AceCount; ++i) {
        void* data = nullptr; if (!GetAce(acl, i, &data)) { valid = false; break; }
        auto header = static_cast<ACE_HEADER*>(data);
        if (header->AceType == ACCESS_DENIED_ACE_TYPE) continue;
        if (header->AceType != ACCESS_ALLOWED_ACE_TYPE) { valid = false; break; }
        auto ace = static_cast<ACCESS_ALLOWED_ACE*>(data); PSID sid = &ace->SidStart;
        if (!EqualSid(sid, user) && !EqualSid(sid, systemBytes)) { valid = false; break; }
        if (EqualSid(sid, user) && !(header->AceFlags & INHERIT_ONLY_ACE)) ownerGrant = true;
    }
    LocalFree(descriptor);
    if (!valid || !ownerGrant) { SetLastError(ERROR_ACCESS_DENIED); return fail("private ACL permissions"); }
    fputs("SITIOO_PRIVATE_OK\n", stdout); return 0;
}
static int crypt(bool encrypt) {
    _setmode(_fileno(stdin), _O_BINARY); _setmode(_fileno(stdout), _O_BINARY);
    std::vector<BYTE> bytes; BYTE buffer[4096]; size_t count;
    while ((count = fread(buffer, 1, sizeof(buffer), stdin)) != 0) {
        bytes.insert(bytes.end(), buffer, buffer + count);
        if (bytes.size() > 8 * 1024 * 1024) return 2;
    }
    DATA_BLOB input{static_cast<DWORD>(bytes.size()), bytes.data()}, output{};
    BYTE entropyBytes[] = "SITIOO Windows private engine v1";
    DATA_BLOB entropy{sizeof(entropyBytes), entropyBytes};
    BOOL ok = encrypt ? CryptProtectData(&input, L"SITIOO", &entropy, nullptr, nullptr, CRYPTPROTECT_UI_FORBIDDEN, &output)
                      : CryptUnprotectData(&input, nullptr, &entropy, nullptr, nullptr, CRYPTPROTECT_UI_FORBIDDEN, &output);
    SecureZeroMemory(bytes.data(), bytes.size());
    if (!ok) return fail("secure storage");
    bool written = fwrite(output.pbData, 1, output.cbData, stdout) == output.cbData;
    SecureZeroMemory(output.pbData, output.cbData); LocalFree(output.pbData); return written ? 0 : 3;
}
int wmain(int argc, wchar_t** argv) {
    SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX);
    if (argc < 2) return 2;
    std::wstring op(argv[1]);
    if (op == L"launch") return launch(argc, argv);
    if (op == L"protect") return crypt(true);
    if (op == L"unprotect") return crypt(false);
    if (argc == 3 && op == L"secure-directory") return directory(argv[2], true);
    if (argc == 3 && op == L"check-directory") return directory(argv[2], false);
    return 2;
}
