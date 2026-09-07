# QwertLearn 自动测试报告

> 验证日期：2026-09-07
> 产品基线：`PRODUCT_FRAMEWORK.md` 1.0
> 测试框架：Vitest 4.1.11、Testing Library、jsdom、fake-indexeddb 6.2.5、V8 Coverage

## 1. 结论

QwertLearn 当前自动化质量门槛全部通过：

| 检查 | 结果 |
|---|---|
| TypeScript 严格类型检查 | 通过 |
| Vitest 全量测试 | 26 个文件，148 项通过，0 项失败 |
| V8 覆盖率门槛 | 通过 |
| Vite 生产构建 | 通过 |
| PWA Service Worker | 生成成功，预缓存 18 项（1653.89 KiB） |
| npm 高危依赖审计 | 0 个漏洞 |
| 本地真实 Chrome 验证 | 首页字母小火车入口、字母小火车桌面与真实 390px 全页、词语花园和青蛙既有页面均通过视觉审阅；390px 无横向溢出 |

测试代码长期保存在 `src/test/`，可用于后续功能回归。

## 2. 覆盖率

| 范围 | 语句 | 分支 | 函数 | 行 |
|---|---:|---:|---:|---:|
| 全部生产代码 | 87.96% | 82.88% | 86.97% | 90.78% |
| `src/core` | 89.56% | 79.91% | 92.67% | 92.45% |
| `src/pages` | 86.60% | 83.92% | 82.02% | 89.53% |
| `src/ui` | 100% | 100% | 100% | 100% |

项目在 `vite.config.ts` 中设置了保守的全局回归门槛：

- 语句：85%；
- 分支：80%；
- 函数：85%；
- 行：90%。

覆盖率没有被描述为 100%。未覆盖代码主要是浏览器 Web Audio / Speech Synthesis 的部分回退分支，以及少量异常防御路径。

## 3. 测试文件清单

| 测试文件 | 数量 | 主要范围 |
|---|---:|---|
| `src/test/app-routing.test.tsx` | 2 | Hash 路由、页面切换、共享音频和摘要刷新 |
| `src/test/architecture-contract.test.ts` | 19 | Typing/Match 输入边界、青蛙移动助手接入、随机选词、存储、音频和规则版本 |
| `src/test/audio-service.test.ts` | 6 | 设置持久化、静音同步、输出注销、页面隐藏和语音 ducking |
| `src/test/challenge-progression.test.ts` | 9 | 青蛙失败/阶段规则及连连看 900ms 自动进关、版本与计时 |
| `src/test/game-pages-routing.test.tsx` | 1 | training、frog、chase、match、spell 页面分派 |
| `src/test/game-pages.test.tsx` | 14 | 键盘游戏计时、暂停、阶段、无尽三次失败、街区、保存和降级 |
| `src/test/frog-pad-motion.test.ts` | 4 | 荷叶跟随、实时跳跃、回岸插值及单向向上路线循环 |
| `src/test/game-shell.test.tsx` | 5 | 输入提示、难度提示、共享外壳、结果弹窗和 Escape |
| `src/test/grade-4-word-bank.test.ts` | 4 | 400 词四档规模、全局唯一性、旧 ID/顺序兼容及难度覆盖 |
| `src/test/home-page.test.tsx` | 2 | 空/有数据首页、目标进度、最佳成绩和全部已实现入口 |
| `src/test/icon.test.tsx` | 1 | 全部项目自有 SVG 图标 |
| `src/test/match-engine.test.ts` | 5 | 选择、取消、正确配对、错配、忽略和单调事件序号 |
| `src/test/match-game-page.test.tsx` | 9 | 错配不回退、三关自动推进、分级词包、计时耗尽、暂停、重开和退出保存 |
| `src/test/models.test.ts` | 6 | 自适应难度中间区间及上下界 |
| `src/test/parent-dashboard.test.tsx` | 3 | 聚合数据、声音面板、入口与家庭奖励审批 |
| `src/test/progress-store.test.ts` | 12 | IndexedDB v2、迁移、防重复积分、奖励、降级、排行榜、400 词记忆和摘要 |
| `src/test/pwa-assets.test.ts` | 6 | PNG 尺寸、manifest、maskable、Apple Touch、预缓存和授权登记 |
| `src/test/reward-cabinet-page.test.tsx` | 2 | 虚拟外观兑换装备、积分状态与家庭愿望确认流程 |
| `src/test/reward-system.test.ts` | 6 | 积分拆分、阶段倍率、封顶、唯一结算、兑换与确认 |
| `src/test/spell-engine.test.ts` | 6 | 稳定乱序、重复字母、渐隐提示、两错救援与 Typing Engine 组合 |
| `src/test/spell-game-page.test.tsx` | 4 | 四站自动进阶、正确前缀、救援、暂停、长词、结算与词包隔离 |
| `src/test/run-clock.test.ts` | 4 | 首次输入开始、暂停时间、幂等与冻结结果 |
| `src/test/typing-engine.test.ts` | 6 | 正确/错误输入、忽略键、完成边界、Backspace 和重置 |
| `src/test/use-typing-session.test.tsx` | 5 | 唯一全局监听、表单排除、修饰键、目标变化和重新启用 |
| `src/test/word-book-page.test.tsx` | 3 | 儿童三词路线、家长明细、空状态、复习启动与导航 |
| `src/test/word-session.test.ts` | 4 | 单局去重、最近词避让、错词优先和两次无错退出复习 |
| **合计** | **148** | **26 个测试文件** |

## 4. 产品规范映射

### 输入边界

- 逐字输入游戏统一消费 `useTypingSession`，词语花园统一消费 `useMatchSession`；
- 生产代码中唯一原始 `keydown` 监听者是 `src/core/use-typing-session.ts`；
- 游戏页不得直接访问 IndexedDB、localStorage 或创建 AudioContext；
- 连连看使用原生按钮焦点，鼠标、触控、Enter 和 Space 均走同一 Match Engine 事件边界。

### 400 词分级词库、随机选词与错词记忆

- 四档词包合计 400 个不重复英文词：四年级 160、五年级 80、六年级 80、小升初衔接 80；
- 词包 ID 为 `fltrp-grade4-v1`、`fltrp-grade5-v1`、`fltrp-grade6-v1`、`fltrp-junior-v1`，排行榜互相隔离；
- 词库是“外研版主题对齐扩展词库”，尚未冒充或宣称为出版社官方逐单元逐字清单；
- 原有 12 个 `exp-*` 稳定 ID 和开头顺序保持不变，已有词级记忆可继续关联；
- 全局英文拼写和稳定 ID 唯一，每个词包内部中文释义唯一，全部英文只含小写字母；
- Frog、Chase、Match 和 Spell 都通过共享 `createWordSession` 选词，保留单局去重、错词优先和熟练词降权；
- `ProgressStore` 从全部 400 词构建共享词级记忆，错词连续两次无错后退出待复习。

### 词语花园连连看

- 正式 `#/match` 页面采用已确认的原型 A 清晰双列布局，并加入首页冒险地图入口；
- 开局可选四年级、五年级、六年级或小升初，首次有效选择后锁定词包以保证榜单公平；
- 三关依次为 4 对不限时、6 对 120 秒、8 对 90 秒；第一、二关完成后显示 900 毫秒开花反馈并自动进入下一关，无需额外点击；
- 错配只清空选择和连击，不扣除已经完成的配对；正确配对消除卡片、朗读英文并推进花园；
- 首次有效选择启动 `ActiveRunClock`，页面隐藏和阶段过渡暂停；计时耗尽会把全部未完成词写入复习记忆；
- 完整第三关才保存 `completed: true`；主动结束、计时耗尽和页面退出均只保存一次标准化 `RunResult`；
- 各等级用独立 `wordPackId` 隔离排行榜，并复用积分、音频、本地持久化和内存降级。

### 字母小火车

- 正式 `#/spell` 页面采用已确认的原型 B：中文目的地在上，乱序字母货物和逐字车厢在下；
- 标准局共 16 词，每 4 词自动从 100% 提示切换到 70%、35% 和 0%，整词完成后等待 700 毫秒自动发车；
- 页面只消费共享 `useTypingSession` 事件；错误键不进入答案、不清空正确前缀，连续两错仅为当前词增加 1 个稳定字母；
- 开局可选四年级、五年级、六年级或小升初，首次有效输入后锁定词包；四档共享错词记忆并通过 `wordPackId` 隔离排行榜；
- `ActiveRunClock` 排除暂停和发车过渡，主动结束、页面退出与完整通关均保存标准 `RunResult`；`rescueHints`、最高车站和规则版本进入持久化；
- 正确、错误、发车、升级、朗读和结算全部走 AudioService，且都有可见等价反馈；移动端长词使用紧凑车厢，reduced-motion 下取消发车与摇动动画。

### 双层错题本与家庭奖励

- 正式 `#/wordbook` 页面采用已确认的原型 C“双层混合”；
- 儿童层最多展示三个鼓励式复习候选，家长明细按需展示错误和练习信息；
- Frog 每 8 词进入下一阶段但不自动结算；落地后跟随移动荷叶，只按底部到顶部顺序跳，到最高层后自动回到底部重新向上；普通与无尽模式均在第 3 次失败时结束；
- Chase 目标按真实经过时间持续移动，追回徽章后切换街区继续整局；
- `score` 与可消费 `adventurePoints` 分离，同一 run ID 不会重复发放积分；
- 虚拟外观即时兑换装备，家庭愿望先保留可用积分，家长批准后才扣除。

### 数据、排行榜、音频与 PWA

- 成绩统一通过 `ProgressStore` 保存，IndexedDB 不可用时保留当前实例内存降级；
- 榜单键为 `gameId + mode + wordPackId + difficulty + speedTier + rulesVersion`；
- 游戏音频统一通过 `AudioService`，Match 使用 `match.correct`、`match.wrong`、`match.clear`，Spell 使用 `typing.correct`、`typing.wrong`、`spell.depart`、`level.up` 等共享合成事件；
- 必要信息均有视觉等价反馈，声音可关闭；
- manifest、PWA 图标、离线 PNG precache 和素材授权登记均有合约测试。

## 5. 测试发现并修复的问题

本轮及当前纵向切片测试发现并固定了以下真实问题：

1. Frog 超时切换下一单词时旧零倒计时可能再次触发，导致一次超时扣两条生命；
2. Frog 重新挑战未重置 `remainingMs`，新局可能立即损失一条生命；
3. 结果弹窗曾直接在 `document` 上监听 Escape，现改为弹窗内部 React 键盘事件；
4. Frog 第 8 词曾直接进入胜利结算，现固定为进入阶段 2 并继续输入；
5. Chase 追回首枚徽章曾立即结束，现固定为进入下一街区；
6. 家庭愿望若与虚拟兑换并发使用余额可能超支，现增加积分保留和批准时双重校验；
7. 词语花园未完成局可能漏记当前已选词，计时耗尽又可能重复写入同一选词；现统一记录且去重，并以页面测试固定；
8. 新增页面使全局行覆盖率一度降至 89.43%，已通过计时、暂停、主动结算和重开测试提升到 92.43%，未降低门槛。
9. 青蛙落地后曾停留在旧坐标且每轮结束会瞬移回岸边；现改为跳跃中追踪荷叶实时位置、落地后持续同步，并将普通/无尽模式统一为显式三次失败封顶。
10. 连连看过关曾要求额外点击，青蛙又可能循环为顶部到下层；现分别改为固定延迟自动进关，以及“逐层向上、到顶回岸”的单向循环。
11. 字母小火车窄屏棋盘最初受桌面 intrinsic minimum 影响，页面本身无滚动但内部站牌被裁切；现将响应式轨道改为 `minmax(0, 1fr)`，真实 390px 下站牌和按钮均完整可见。
12. 7～13 字母长词在窄屏可能超出列车场景；现通过移动端紧凑机车和按词长计算的车厢宽度展示全部拼写位置。

## 6. 构建与运行验证

生产构建结果：

- Vite 8.2.2 构建成功，46 个模块完成转换；
- PWA `generateSW` 成功，预缓存 18 项（1653.89 KiB）；
- 最大分块为独立 Phaser chunk：1196.90 kB（gzip 318.74 kB）；
- `npm audit --audit-level=high` 返回 0 个漏洞；
- 正式首页与字母小火车在真实 macOS Chrome 中完成桌面渲染检查；字母小火车额外通过 DevTools 设备指标完成真实 390×844 首屏和 390×1346 全页检查；
- 人工视觉审阅确认首页字母小火车入口可发现、桌面车站/列车结构清晰；移动端 `innerWidth` 与 `scrollWidth` 均为 390，站牌、发音按钮、车厢和提示区无横向截断；
- 青蛙页通过真实 macOS Chrome 桌面截图审阅，确认“失败 0/3”与“三次失败后结束”提示清晰、无截断；移动跟随由 100% 覆盖的纯运动测试与场景接入契约固定；
- 浏览器错误为空；正式截图保存于：
  - `/tmp/qwertlearn-fltrp-home.png`；
  - `/tmp/qwertlearn-match-final.png`；
  - `/tmp/qwertlearn-match-final-mobile.png`；
  - `/tmp/qwertlearn-frog-follow-final.png`；
  - `/tmp/qwertlearn-home-with-spell.png`；
  - `/tmp/qwertlearn-spell-final-desktop.png`；
  - `/tmp/qwertlearn-spell-final-mobile-full.png`。

非阻断警告：Phaser 分块超过 Vite 默认 500 kB 提示线。Phaser 已独立分块，不影响当前构建和功能；后续可评估游戏页面动态导入。

## 7. 回归命令

```bash
npm run typecheck
npm test
npm run test:coverage
npm run build
npm audit --audit-level=high
```

覆盖率 HTML 报告生成到被 Git 忽略的 `coverage/index.html`，生产输出生成到被 Git 忽略的 `dist/`。
