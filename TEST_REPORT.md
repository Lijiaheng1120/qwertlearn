# QwertLearn 自动测试报告

> 验证日期：2026-09-04
> 产品基线：`PRODUCT_FRAMEWORK.md` 0.4
> 测试框架：Vitest 4.1.11、Testing Library、jsdom、fake-indexeddb 6.2.5、V8 Coverage

## 1. 结论

QwertLearn 当前自动化质量门槛全部通过：

| 检查 | 结果 |
|---|---|
| TypeScript 严格类型检查 | 通过 |
| Vitest 全量测试 | 20 个文件，100 项通过，0 项失败 |
| V8 覆盖率门槛 | 通过 |
| Vite 生产构建 | 通过 |
| PWA Service Worker | 生成成功，预缓存 18 项（1557.87 KiB） |
| npm 高危依赖审计 | 0 个漏洞 |
| 本地真实 Chrome 验证 | 首页、青蛙、城市、奖励柜、家长中心桌面与关键 390px 窄屏通过；无页面错误 |

测试代码长期保存在 `src/test/`，可用于后续功能回归。

## 2. 覆盖率

| 范围 | 语句 | 分支 | 函数 | 行 |
|---|---:|---:|---:|---:|
| 全部生产代码 | 88.09% | 80.63% | 86.85% | 91.10% |
| `src/core` | 86.95% | 76.42% | 91.02% | 90.25% |
| `src/pages` | 88.06% | 82.82% | 82.22% | 91.04% |
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
| `src/test/architecture-contract.test.ts` | 11 | 唯一键盘监听边界、共享输入、随机选词、错题本与奖励数据边界、存储、音频和规则版本 |
| `src/test/audio-service.test.ts` | 6 | 设置持久化、静音同步、输出注销、页面隐藏和语音 ducking |
| `src/test/challenge-progression.test.ts` | 5 | 每 8 词阶段计算、1～4 排荷叶、长词公平时间、无尽单调难度与六街区参数 |
| `src/test/game-pages-routing.test.tsx` | 1 | training、frog、chase 页面分派 |
| `src/test/game-pages.test.tsx` | 13 | 三个游戏的计时、公平暂停、无打断阶段升级、无尽检查点、连续街区、成功/失败、重开、保存和降级 |
| `src/test/game-shell.test.tsx` | 5 | 输入提示、难度提示、共享外壳、结果弹窗和 Escape |
| `src/test/home-page.test.tsx` | 2 | 空/有数据首页、目标进度、最佳成绩和全部已实现入口 |
| `src/test/icon.test.tsx` | 1 | 全部 16 个项目自有 SVG 图标 |
| `src/test/models.test.ts` | 6 | 自适应难度中间区间及上下界 |
| `src/test/parent-dashboard.test.tsx` | 3 | 聚合数据、声音面板、全部已实现入口与家庭奖励批准扣分 |
| `src/test/progress-store.test.ts` | 9 | IndexedDB v2、旧库迁移、防重复积分、奖励兑换、内存降级、排行榜、摘要和清理 |
| `src/test/pwa-assets.test.ts` | 6 | PNG 尺寸、manifest、maskable、Apple Touch、预缓存和授权登记 |
| `src/test/reward-cabinet-page.test.tsx` | 2 | 虚拟外观兑换装备、积分不足状态与家庭愿望待家长确认流程 |
| `src/test/reward-system.test.ts` | 6 | 积分拆分、阶段倍率、单局封顶、唯一结算、皮肤兑换与家庭奖励确认 |
| `src/test/run-clock.test.ts` | 4 | 首键开始、暂停时间、幂等与冻结结果 |
| `src/test/typing-engine.test.ts` | 6 | 正确/错误输入、忽略键、完成边界、Backspace 和重置 |
| `src/test/use-typing-session.test.tsx` | 5 | 唯一全局监听、表单排除、修饰键、目标变化和重新启用 |
| `src/test/word-book-page.test.tsx` | 3 | 儿童三词路线、家长明细展开、空状态、复习启动与页面导航 |
| `src/test/word-session.test.ts` | 4 | 单局去重、最近词避让、错词优先和两次无错退出复习 |
| **合计** | **100** | **20 个测试文件** |

## 4. 产品规范映射

### 输入边界

- 游戏统一消费 `useTypingSession`；
- 生产代码中唯一原始 `keydown` 监听者是 `src/core/use-typing-session.ts`；
- 游戏页不得直接监听键盘、访问 IndexedDB 或创建 AudioContext；
- 表单控件、修饰键和不支持按键不会污染输入状态。

### 随机选词与错词记忆

- Frog 和 Chase 通过共享 `createWordSession` 从完整词库生成随机队列；
- 每局队列内单词不重复，最近已掌握词不会继续固定开局；
- 待复习词最多优先占常规队列约 40%，同时保留新词探索；
- 完成词、错误按键和超时均按稳定词条 ID 写入 `RunResult`，再由 `ProgressStore` 聚合；
- 错词连续两次无错完成后自动退出待复习，历史错误次数保留；
- Frog 与 Chase 新结果使用规则版本 `1.3.0`，挑战模式与起始阶段进入排行榜隔离键；Training 继续使用 `1.2.0`；

### 双层错题本

- 正式 `#/wordbook` 页面采用已确认的原型 C“双层混合”；
- 儿童层最多展示三个鼓励式复习候选，不显示每词错误次数；
- 家长明细按需展开，展示待复习状态、错误、连续无错、完成次数和最近练习；
- 空状态提供积极提示并可直接开始新词冒险；
- 复习入口进入 Frog 的共享随机选词流程，错词仍按既有配额优先且不会形成固定队列；
- 页面只消费 App 提供的 `DashboardSummary`，不直接访问 IndexedDB、词库或选词服务。

### 双轨成长与家庭奖励柜

- 原型 C“双轨成长与家庭奖励柜”已正式实现并接入 `#/rewards`；
- `RunResult` 支持学习/无尽模式、起始阶段、最高阶段、追回徽章数与奖励规则版本；
- Frog 每 8 词进入下一阶段但不自动结算，阶段 1～4 增加至四排移动荷叶，之后继续增加速度与时间压力；
- 首次进入阶段 2 即解锁无尽挑战，下一局可从已解锁最高检查点开始，无尽局内难度只升不降；
- Chase 目标按真实经过时间持续移动，正确词缩短距离、错误代价有上限，追回徽章后切换街区继续整局；
- `score` 与可消费 `adventurePoints` 分离，积分由 `ProgressStore` 根据唯一 run ID 结算；
- IndexedDB 升级到版本 2，旧版 runs store 与历史成绩无损保留；
- 同一 run ID 重复保存不会重复发放积分，每局积分设有效时长门槛和 500 分上限；
- 星光青蛙、翡翠荷叶、落日城市兑换后即时入库并装备，不改变时间、生命或榜单公平性；
- 本子和彩色笔家庭愿望先保留可用积分，家长中心批准后才扣除，拒绝不扣分；
- IndexedDB 不可用时，积分与奖励保持在当前 ProgressStore 实例的内存降级状态。

### 公平计时

- 首个有效按键之前的等待不计入成绩；
- 页面隐藏时间记录到 `pausedMs`，不计入活跃用时；
- Frog 阶段 1 的初级时间保持 18～30 秒，高阶段按词长缩短并保留绝对下限；
- Frog 每 8 词升级但不弹结算层，生命耗尽、主动结束或页面退出才保存；
- Chase 90 秒、目标移动和双方追踪均在首键后启动，并以实际经过时间计算而非帧率；
- Chase 错误代价有上限，追回徽章后重置可追距离并进入下一街区；
- 计时器重复开始、暂停和结算保持幂等。

### 游戏流程

- Frog：StrictMode Phaser 生命周期、每 8 词升级不结算、无尽检查点、1～4 排阶段规则、三次超时失败、主动/中途结算、重开和内存降级；
- Chase：真实时间移动目标、错误停顿代价、连续追回徽章、街区提升、90 秒/最大距离结束、主动结算、重开和内存降级；
- Reward：虚拟奖励即时兑换装备、家庭愿望积分保留、家长批准扣分、拒绝不扣分和错误反馈；
- Training：错误计数、隐藏暂停、完成保存、结果主按钮、重开和内存降级。

### 数据与排行榜

- 成绩通过 `ProgressStore` 保存；
- 使用 fake IndexedDB 覆盖真实 IndexedDB 路径；
- 旧记录补齐 `pausedMs` 和 `usedFullHints`；
- 排行榜按完整规则键隔离并支持 limit；
- Chase 成功成绩按活跃时间、失败成绩按剩余距离排序；
- 今日分钟与历史总时长分别聚合。

### 音频

- 游戏音频统一通过 `AudioService`；
- 设置持久化到本地存储；
- 覆盖 MusicOutput 注册、注销、静音、页面隐藏暂停和语音 ducking；
- 必要信息均有视觉反馈。

### PWA 与素材

- 192×192、512×512、maskable 512×512 和 Apple Touch 180×180 PNG 尺寸通过 IHDR 验证；
- manifest、Apple Touch link、离线 PNG precache 和素材授权登记均有合约测试；
- 生产构建成功生成 `manifest.webmanifest`、`registerSW.js` 和 `sw.js`。

## 5. 测试发现并修复的问题

本轮测试建设发现并修复了以下真实问题：

1. Frog 超时切换下一单词时，旧的零倒计时可能再次触发，导致一次超时扣两条生命；
2. Frog 重新挑战未重置 `remainingMs`，新局可能立即损失一条生命；
3. 结果弹窗直接在 `document` 上监听 Escape，违反唯一原始键盘监听边界；现已改为弹窗内部 React 键盘事件；
4. Frog 第 8 词曾直接进入胜利结算，现由页面级测试固定为进入阶段 2 并继续输入；
5. Chase 追回首枚徽章曾立即结束，现由页面级测试固定为进入下一街区，只有计时、最大距离或主动结束才结算；
6. 家庭愿望若与虚拟兑换并发使用余额可能超支，现以待确认积分保留和家长批准时扣分双重约束。

## 6. 构建与运行验证

生产构建结果：

- Vite 8.2.2 构建成功；
- PWA `generateSW` 成功；
- 预缓存 18 项，约 1557.87 KiB；
- `#/`、`#/frog`、`#/chase`、`#/rewards`、`#/parent` 均通过真实系统 Chrome 桌面渲染；
- 首页与奖励柜额外通过 390×844 窄屏全页检查；导航、卡片、路线切换、奖励目录和家庭确认面板无横向截断；
- 浏览器页面错误为空；截图保存于 `/tmp/qwertlearn-final-*.png` 与 `/tmp/qwertlearn-final-mobile-*.png`。

非阻断警告：Phaser 分块约 1196.90 KiB（gzip 318.74 KiB），超过 Vite 默认 500 KiB 提示线。Phaser 已独立分块，不影响当前构建和功能；后续可评估游戏页面动态导入。

## 7. 回归命令

```bash
npm run typecheck
npm test
npm run test:coverage
npm run build
npm audit --audit-level=high
```

覆盖率 HTML 报告生成到被 Git 忽略的 `coverage/index.html`，生产输出生成到被 Git 忽略的 `dist/`。
