# QwertLearn 英语打字冒险岛

面向小学阶段儿童的本地优先 Web 英语打字游戏集合。通过键位热身、青蛙跳荷叶和城市追踪，将键位学习、单词抄写、词义回忆与后续听写复习连接成一条学习路径。

产品与扩展规则以 [`PRODUCT_FRAMEWORK.md`](./PRODUCT_FRAMEWORK.md) 为准。

## 当前状态

首个正式纵向切片已包含：

- 原型 A“绘本冒险岛”儿童首页；
- 原型 C“现代学习仪表盘”家长中心；
- 共用 Typing Engine；
- Phaser 青蛙跳荷叶游戏：每 8 词无打断升级、1～4 排移动荷叶、普通学习与已解锁检查点的无尽挑战；
- 多街区城市追踪：目标按真实时间持续移动，追回徽章后进入下一街区并继续整局；
- 可累计冒险积分、虚拟外观即时兑换与装备，以及本子/彩色笔家庭愿望的家长确认流程；
- IndexedDB 本地成绩、活跃用时、暂停时间与按完整规则键隔离的个人最佳；
- 共享随机选词队列、单局去重、最近词避让，以及按稳定词条 ID 聚合的错词记忆；
- 原型 C“双层混合”正式单词本：儿童三词复习路线、家长按需展开的词级明细，以及进入共享随机游戏的复习入口；
- Music、SFX、Voice、UI 四通道 Audio Service，以及背景音乐暂停和语音 ducking 接口；
- 浏览器语音和项目生成的原型提示音；
- PWA 清单、Service Worker、离线预缓存，以及 SVG、PNG、maskable 和 Apple Touch 图标；
- 输入、难度、排行榜隔离、真实 IndexedDB、暂停计时、游戏生命周期和首页入口测试。

## 开发环境

- Node.js 22.13 或更高版本；
- npm 10 或更高版本；
- 桌面或笔记本真实键盘。

```bash
npm install
npm run dev
```

开发服务器只绑定 `127.0.0.1`。默认访问 Vite 输出的本地地址。

## 质量检查

```bash
npm run typecheck
npm test
npm run test:coverage
npm run build
npm audit --audit-level=high
```

覆盖率报告输出到 `coverage/`，生产构建输出到 `dist/`。完整测试范围和最新验证结果见 [`TEST_REPORT.md`](./TEST_REPORT.md)。

## 页面路由

- `#/`：儿童冒险地图；
- `#/training`：键盘训练营；
- `#/frog`：青蛙跳荷叶；
- `#/chase`：城市追踪战；
- `#/wordbook`：我的单词本与记忆花园；
- `#/rewards`：成长岛奖励柜与家庭愿望；
- `#/parent`：家长中心。

## 目录

```text
src/
├── core/       # 输入、词库、难度、存储与音频共享服务
├── games/      # Phaser 等具体游戏场景
├── pages/      # 首页、家长中心和游戏页面
├── test/       # Vitest 测试
└── ui/         # 项目自有 UI 组件与图标
prototypes/     # 已确认前的三套静态视觉原型
public/         # PWA 图标和后续授权素材
```

## 数据与隐私

当前版本不要求账号，不采集真实姓名、学校、电话或位置。练习成绩保存在浏览器 IndexedDB；音量设置保存在浏览器本地存储。

## 音频与素材

当前没有第三方背景音乐文件。提示音由 Web Audio 在运行时合成，单词读音使用浏览器 Speech Synthesis。后续加入音乐和音效前必须登记作者、来源、许可、获取日期与校验值，详见 [`ASSET_CREDITS.md`](./ASSET_CREDITS.md)。
