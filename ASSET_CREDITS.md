# QwertLearn 素材与授权登记

> 更新日期：2026-09-03

发布包中的音乐、音效、图片、字体和图标必须在此登记。来源或许可不明确的素材不得进入项目。

## 当前素材

| 内部 ID / 路径 | 类型 | 作者 / 来源 | 许可 | 说明 |
|---|---|---|---|---|
| `public/qwertlearn-icon.svg` | SVG 图标 | QwertLearn 项目原创 | 项目自有 | 键盘与字母 Q 图标 |
| `public/qwertlearn-icon-192.png`、`public/qwertlearn-icon-512.png`、`public/qwertlearn-icon-maskable-512.png`、`public/apple-touch-icon.png` | PNG 图标 | 由项目自有 SVG 在 macOS `sips` 本地生成 | 项目自有 | PWA、maskable 与 iOS 主屏幕图标；未引入外部素材 |
| `prototypes/*.html` 内联图形 | CSS / SVG | QwertLearn 项目原创 | 项目自有 | 三套视觉原型占位图形 |
| `src/styles.css` 图形 | CSS | QwertLearn 项目原创 | 项目自有 | 青蛙、荷叶、城市、键盘和手部占位图形 |
| `typing.correct` 等原型事件 | Web Audio 合成音 | 运行时生成 | 不涉及外部素材 | 当前仅用于功能验证 |
| `word.pronounce` | 浏览器 Speech Synthesis | 用户浏览器 / 操作系统 | 依运行环境提供 | 当前单词发音回退方案 |

## 尚未加入

- 首页循环背景音乐；
- 青蛙游戏循环背景音乐；
- 城市追踪循环背景音乐；
- 正式成功、失败、升级与角色动作音效；
- 教材词库统一录制或授权的英语发音。

## 第三方素材登记模板

| 字段 | 内容 |
|---|---|
| 内部 ID | 例如 `music.frog` |
| 文件路径 | 发布包内路径 |
| 标题 | 素材原始标题 |
| 作者 | 作者或发布者 |
| 来源 URL | 素材详情页，不只填写站点首页 |
| 授权 | CC0、CC-BY 或购买许可等 |
| 授权页面 | 可验证的许可 URL |
| 获取日期 | YYYY-MM-DD |
| 是否署名 | 是 / 否；若是，填写完整文案 |
| SHA-256 | 下载文件校验值 |
| 循环点 | 起止时间或无缝循环说明 |
| 推荐音量 | 0～1 |

允许使用原创、委托制作、明确许可 Web 游戏分发的购买素材、CC0，以及完成署名登记的可商用 CC-BY 素材。禁止提取金山打字通或其他商业游戏中的音乐、音效和美术。
