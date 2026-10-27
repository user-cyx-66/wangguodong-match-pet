# 游戏小窝

两个独立游戏，放在同一个仓库里。下载或克隆完整仓库后，双击根目录的 **开始游戏.html**，选择想玩的游戏即可。网页版可以离线游玩，无需安装依赖。

| 游戏 | 玩什么 | 直接打开 |
| --- | --- | --- |
| **王果冻的消消小窝** | 三消、点点连消、摸猫喂鱼与小窝养成 | [进入消消小窝](games/match-pet/dist/index.html) |
| **王果冻骑士：荒原誓约** | 十二章闯关、寻宝、升级装备，与公主并肩迎战恶龙；可切换王果冻和 ikun 骑士 | [进入骑士冒险](games/knight-adventure/dist/index.html) |

两个游戏分别保存各自的浏览器进度。请保留完整目录；更换浏览器、访问地址或清除站点数据前，先查看对应游戏的存档说明。

## 从哪里开始

```powershell
git clone https://github.com/user-cyx-66/wangguodong-match-pet.git games
cd games
```

双击 `开始游戏.html` 或 `index.html` 打开游戏选择页。也可以分别打开表格中的两个入口。

若要用本地网页地址访问，在仓库根目录启动静态服务器：

```powershell
python -m http.server 4188
```

然后打开 `http://localhost:4188`。手机需要打开它能访问的网页地址，不能直接使用电脑上的本地文件路径。

## 项目结构

```text
index.html                    游戏选择页
开始游戏.html                 离线打开入口
games/
  match-pet/                  王果冻的消消小窝
    dist/                     网页游戏与猫咪素材
    desktop/                  Windows 桌宠源码与打包脚本
    iphone/                   iPhone 工程、构建与安装说明
    tests/                    消除规则测试
    docs/                     设计、验证与上传说明
  knight-adventure/           王果冻 / ikun 骑士冒险
    dist/                     完整网页游戏与角色素材
    tests/                    战斗、角色、存档与十二关模拟检查
```

**Windows 桌宠和 iPhone 版本属于《王果冻的消消小窝》**，骑士冒险目前使用网页入口。构建桌宠或 iPhone 版时，先进入 `games/match-pet`，再按其说明操作。

## 各游戏说明

- [消消小窝：玩法、操作与 Windows 桌宠](games/match-pet/README.md)
- [消消小窝：iPhone 版本](games/match-pet/iphone/README.md)
- [骑士冒险：操作、探索、装备与存档](games/knight-adventure/README.md)
- [骑士冒险：ikun 角色试用说明](games/knight-adventure/ikun-trial-notes.md)

## 开发与检查

网页源码直接放在各游戏的 `dist/` 中，没有统一构建步骤，也不需要安装 npm 依赖。安装 Node.js 后，可以在仓库根目录检查两个游戏：

```powershell
npm run check
npm test
```

这两个命令依次调用各游戏自己的检查与测试。也可以单独运行：

```powershell
npm --prefix games/match-pet test
npm --prefix games/knight-adventure test
```

角色素材、动画提示词和动作帧定位参数与对应游戏一同保存。桌宠运行环境、打包缓存、浏览器资料和个人存档不作为游戏源码提交。
