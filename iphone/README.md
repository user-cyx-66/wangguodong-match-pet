# 王果冻的消消小窝 · iPhone 工程

UIKit + WKWebView 原生 iPhone/iPad App，最低 iOS 15。离线包含全部游戏和猫咪素材，支持游戏内猫咪陪伴、本地存档、通过 iOS 分享面板导出 JSON 备份，以及通过系统文件选择器导入备份。原有三消、点点连消、无限放松、特效和程序音乐保持。

资源使用 App 内的 `matchpet://localhost/` 加载，不依赖线上网站。手机安全区由原生界面处理；进入后台保存进度并暂停声音。没有跟踪、联网服务、Apple 账号登录或应用内付费。

## 构建

需要带 iOS SDK 的 macOS/Xcode。源码不包含证书、私钥或 Apple 账号。

```bash
python3 scripts/create-project.py
bash scripts/build-ios.sh
bash scripts/smoke-ios.sh
```

设备构建和模拟器构建分开，不能把模拟器的 App 冒充可供 iPhone 安装的 IPA。`verify-ipa.py` 会检查设备平台、最低系统版本、可执行文件、所有离线素材和 SHA-256。

`ci/build-iphone.yml` 对应 GitHub 仓库 `.github/workflows/build-iphone.yml`，工程位于仓库 `iphone/`。云端构建不需要 Apple 密码；它产出供用户本地个人签名的包，再用 iPhone 模拟器检查原生界面、64 格棋盘和本地存档。最终系统安装仍需用户自己的 Apple 账号完成签名。

## 安装

请阅读 [Windows 个人安装步骤](INSTALL-WINDOWS.md)。当前流程面向免费 Apple 账号，通常每 7 天需要刷新一次。这个说明不表示已有签名包或真机安装结果，交付时以实际构建记录为准。
