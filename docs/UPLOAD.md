# 上传到 GitHub

这份目录已经整理为源码版，含网页、猫咪素材、桌宠源码、打包脚本、测试和预览图。本地存档、Windows 运行环境及发行 ZIP 不在其中。

## 方法一：直接在 GitHub 网页上传

1. 登录 GitHub，打开 <https://github.com/new>。
2. 建议仓库名 `wangguodong-match-pet`，选择 Private 或 Public。
3. 不预先添加 README、.gitignore 和 License，创建空仓库。
4. 在空仓库页面点击 **uploading an existing file**；已有仓库则点击 **Add file → Upload files**。
5. 如果拿到源码 ZIP，先完整解压。将源码根目录中的文件、`dist`、`desktop`、`tests`、`docs` 文件夹一起拖入上传区。不要直接上传 ZIP，也不要额外套一层同名文件夹。
6. 提交说明填写 `Initial source release v2`，点击 **Commit changes**。

所有源码文件均小于网页上传的 25 MiB 单文件限制。保留 `dist/assets`，运行游戏需要这些猫咪素材。

## 方法二：使用已安装的 Git

在源码根目录打开 PowerShell。先在 GitHub 创建空仓库，然后执行以下命令，将 URL 替换成你刚创建的仓库地址：

```powershell
git init -b main
git add .
git commit -m "Initial source release v2"
git remote add origin https://github.com/你的用户名/wangguodong-match-pet.git
git push -u origin main
```

首次推送若需要登录，按 Git Credential Manager 打开的登录页面完成 GitHub 授权。不要将访问令牌粘贴到仓库、命令 URL 或源码里。

如果 Git 提示缺少作者姓名与邮箱，先按你的 GitHub 账户设置配置本仓库的 `user.name` 和 `user.email`，再重新提交。如果目标仓库已有提交，先克隆该仓库，再将这份源码复制进去提交，不要强制覆盖历史。

后续更新通常只需：

```powershell
git add .
git commit -m "Describe your changes"
git push
```

## 发布可以直接玩的成品

源码上传完成后，进入仓库的 **Releases → Draft a new release**：

1. 新建标签 `v2.0.0`。
2. 标题填写 `王果冻的消消小窝 v2.0.0`。
3. 附件上传现有的 Windows 桌宠版 v2 ZIP（约 220 MB）和离线网页版 v2 ZIP（约 4.6 MB）。
4. 填写版本说明，点击 **Publish release**。

约 220 MB 的 Windows ZIP 与 `_internal` 中的大型 DLL 不放进普通 Git 提交。`.gitignore` 已配置好忽略这些文件及个人存档。

## 官方资料

- [将本地代码添加到 GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
- [新建仓库](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [文件大小限制与发行文件](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
