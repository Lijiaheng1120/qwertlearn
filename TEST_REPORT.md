# QwertLearn 自动测试报告

> 验证日期：2026-09-03
> 产品基线：`PRODUCT_FRAMEWORK.md` 0.3
> 测试框架：Vitest 4.1.11、Testing Library、jsdom、fake-indexeddb 6.2.5、V8 Coverage

## 1. 结论

QwertLearn 当前自动化质量门槛全部通过：

| 检查 | 结果 |
|---|---|
| TypeScript 严格类型检查 | 通过 |
| Vitest 全量测试 | 17 个文件，80 项通过，0 项失败 |
| V8 覆盖率门槛 | 通过 |
| Vite 生产构建 | 通过 |
| PWA Service Worker | 生成成功，预缓存 18 项 |
| npm 高危依赖审计 | 0 个漏洞 |
| 本地生产预览 | 首页、青蛙游戏、错题本、家长中心通过；无页面错误 |

测试代码长期保存在 `src/test/`，可用于后续功能回归。

## 2. 覆盖率

| 范围 | 语句 | 分支 | 函数 | 行 |
|---|---:|---:|---:|---:|
| 全部生产代码 | 88.94% | 82.19% | 87.69% | 91.25% |
| `src/core` | 87.34% | 76.56% | 90.56% | 89.97% |
| `src/pages` | 88.98% | 85.22% | 84.09% | 91.24% |
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
| `src/test/architecture-contract.test.ts` | 10 | 唯一键盘监听边界、共享输入、随机选词、错题本数据边界、存储、音频和规则版本 |
| `src/test/audio-service.test.ts` | 6 | 设置持久化、静音同步、输出注销、页面隐藏和语音 ducking |
| `src/test/game-pages-routing.test.tsx` | 1 | training、frog、chase 页面分派 |
| `src/test/game-pages.test.tsx` | 11 | 三个游戏的计时、公平暂停、成功/失败、重开、保存和降级 |
| `src/test/game-shell.test.tsx` | 5 | 输入提示、难度提示、共享外壳、结果弹窗和 Escape |
| `src/test/home-page.test.tsx` | 2 | 空/有数据首页、目标进度、最佳成绩和全部已实现入口 |
| `src/test/icon.test.tsx` | 1 | 全部 16 个项目自有 SVG 图标 |
| `src/test/models.test.ts` | 6 | 自适应难度中间区间及上下界 |
| `src/test/parent-dashboard.test.tsx` | 2 | 聚合数据、声音面板、音量和全部已实现入口 |
| `src/test/progress-store.test.ts` | 6 | IndexedDB、内存降级、旧记录、排行榜、摘要和清理 |
| `src/test/pwa-assets.test.ts` | 6 | PNG 尺寸、manifest、maskable、Apple Touch、预缓存和授权登记 |
| `src/test/run-clock.test.ts` | 4 | 首键开始、暂停时间、幂等与冻结结果 |
| `src/test/typing-engine.test.ts` | 6 | 正确/错误输入、忽略键、完成边界、Backspace 和重置 |
| `src/test/use-typing-session.test.tsx` | 5 | 唯一全局监听、表单排除、修饰键、目标变化和重新启用 |
| `src/test/word-book-page.test.tsx` | 3 | 儿童三词路线、家长明细展开、空状态、复习启动与页面导航 |
| `src/test/word-session.test.ts` | 4 | 单局去重、最近词避让、错词优先和两次无错退出复习 |
| **合计** | **80** | **17 个测试文件** |

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
- 新结果使用规则版本 `1.2.0`，不会与旧固定顺序规则混入同一排行榜。

### 双层错题本

- 正式 `#/wordbook` 页面采用已确认的原型 C“双层混合”；
- 儿童层最多展示三个鼓励式复习候选，不显示每词错误次数；
- 家长明细按需展开，展示待复习状态、错误、连续无错、完成次数和最近练习；
- 空状态提供积极提示并可直接开始新词冒险；
- 复习入口进入 Frog 的共享随机选词流程，错词仍按既有配额优先且不会形成固定队列；
- 页面只消费 App 提供的 `DashboardSummary`，不直接访问 IndexedDB、词库或选词服务。

### 公平计时

- 首个有效按键之前的等待不计入成绩；
- 页面隐藏时间记录到 `pausedMs`，不计入活跃用时；
- Frog 每词初级时间保持 18～30 秒；
- Chase 90 秒在首键后才启动；
- 计时器重复开始、暂停和结算保持幂等。

### 游戏流程

- Frog：StrictMode Phaser 生命周期、三次超时失败、仅保存一次、中途退出保存、重开和内存降级；
- Chase：成功追踪、超时失败、剩余距离、错误按键、重开和内存降级；
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
3. 结果弹窗直接在 `document` 上监听 Escape，违反唯一原始键盘监听边界；现已改为弹窗内部 React 键盘事件。

## 6. 构建与运行验证

生产构建结果：

- Vite 8.2.2 构建成功；
- PWA `generateSW` 成功；
- 预缓存 18 项，约 1518.53 KiB；
- 首页 `#/`、青蛙 `#/frog`、错题本 `#/wordbook`、家长中心 `#/parent` 在本地生产预览中正常渲染；
- 错题本桌面截图完成视觉检查，布局无截断，浏览器页面错误为空。

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
