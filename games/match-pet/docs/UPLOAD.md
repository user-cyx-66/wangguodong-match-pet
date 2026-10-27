# 更新游戏仓库

本仓库集中维护两款游戏：《王果冻的消消小窝》位于 `games/match-pet/`，骑士冒险位于 `games/knight-adventure/`。每款游戏保留各自的源码、素材、说明与测试。

## 克隆与维护

```powershell
git clone https://github.com/user-cyx-66/wangguodong-match-pet.git games
cd games
```

修改消消小窝时，进入 `games/match-pet/`；修改骑士冒险时，进入 `games/knight-adventure/`。在仓库根运行检查和提交：

```powershell
npm run check
npm test
git add .
git commit -m "Describe the game changes"
git push
```

不要在游戏子目录重新初始化 Git 仓库。更新前先拉取远程变化，保留已有提交历史。

## 发行文件

Windows 桌宠版、iPhone 包和离线游戏压缩包可通过同一仓库的 Releases 发行，并在标题和附件名称中注明所属游戏。完整源码与素材保留在对应游戏目录，运行环境、构建缓存和个人存档不加入 Git 提交。

消消小窝的桌宠构建方法见上一级 README；iPhone 工程说明见 `../iphone/README.md`。云端 iPhone 工作流保留在仓库根的 `.github/workflows/build-iphone.yml`，只构建消消小窝。
