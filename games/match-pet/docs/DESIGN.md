# 玩法参考与设计

保留奶油色、薄荷绿画面与王果冻猫咪，把消除和轻养成结合起来。

| 参考 | 资料 | 本游戏采用的思路 |
| --- | --- | --- |
| Candy Crush Saga | [官方特殊糖果说明](https://candycrush.zendesk.com/hc/en-us/articles/211939685-Creating-and-combining-Special-Candies) | 相邻交换、长连生成特效、特效组合与连锁 |
| PopStar | [开发者商店介绍](https://apps.apple.com/us/app/popstar-stars-crush/id307751675?platform=ipad) | 点同色连片、二次方计分、清场奖励、累计积分闯关 |
| Weyrdlets | [官方介绍](https://weyrdworks.com/weyrdlets) | 抚摸、喂养、布置小窝，游戏和桌面陪伴 |
| Desktop Mate | [官方商店介绍](https://store.steampowered.com/app/3301060/Desktop%20Mate?l=schinese) | 桌面角色、摸头反馈与陪伴 |

以上用于研究玩法。具体关卡、界面、图形、程序和反馈由本项目实现，没有使用这些参考游戏的美术或代码。

循环：消除赚小鱼干 → 喂猫和增加亲密度 → 永久兑换房间主题 → 充能猫爪帮助消除。

点点连消不会补充新点心，空列向左靠拢。没有可消连片时结算剩余奖励 `max(0, 2000 - 剩余颗数² × 20)`，达标后累计积分带入下一关。

交换三消保留积分、收鱼与融冰目标。特效可以直接点爆，滑动两颗特效可产生组合效果。音乐与音效在浏览器中生成，不需要在线资源或音频下载。

猫咪素材已自包含于 `dist/assets`；棋子、图标、房间和粒子效果使用 SVG、CSS 与 Canvas。没有账号、多人联机或云端存档。
