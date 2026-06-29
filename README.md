# TRPGLOG

面向桌面与网页的 **跑团日志（TRPG Log）编辑与排版工具**：在浏览器中编辑结构化对话、实时预览样式，并可导出为 Microsoft Word（`.docx`）。当前主路线是 **纯前端静态站点**，优先部署到 **GitHub Pages**。

---

## 功能概览

- **实时预览**：编辑区与预览联动，便于核对分段与样式。
- **解析规则**：支持 `<角色名>:` 行首标记、骰子与续行等常见 Log 写法。
- **导入**：支持 `.txt`、`.docx`，全部在浏览器端解析（`.docx` 经 `mammoth`）。旧版 `.doc` 请先在 Word 中另存为 `.docx`。
- **导出 Word**：由浏览器端 `docx` 库生成 `.docx`，不需要后端服务。
- **可配置项**：分段标题、角色显示、字体、背景块、页边距、行距等可在界面中调整。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、TypeScript、Vite 8 |
| Word 导出 | 浏览器端 `docx` |
| 可选后端 | Python 3、FastAPI、`python-docx`（保留给后续扩展） |

---

## 目录结构

```
frontend/           前端（Vite + React + TS），GitHub Pages 构建入口
api/                可选 Python API（暂保留，当前静态部署不依赖）
requirements.txt    可选 Python 后端依赖
vercel.json         可选 Vercel 部署配置
.github/workflows/  GitHub Pages 自动部署工作流
```

| 关注点 | 路径 |
|--------|------|
| 页面布局、导入/导出与主流程 | `frontend/src/App.tsx` |
| 右侧预览与分段展示 | `frontend/src/Preview.tsx`、`frontend/src/App.css` |
| 前端解析逻辑 | `frontend/src/parser.ts` |
| 浏览器端 Word 导出 | `frontend/src/docxExport.ts` |
| GitHub Pages base / dev server | `frontend/vite.config.ts` |
| GitHub Pages 工作流 | `.github/workflows/pages.yml` |

---

## 本地开发

```powershell
cd frontend
npm install
npm run dev
```

浏览器打开终端提示的本地地址，通常是 [http://localhost:5173](http://localhost:5173) 或 [http://127.0.0.1:5173](http://127.0.0.1:5173)。

生产构建：

```powershell
cd frontend
npm run build
```

构建产物在 `frontend/dist/`。`vite.config.ts` 会在 `npm run build` 时自动使用 GitHub Pages 子路径 `/TRPGLOG/`，本地开发仍使用 `/`。

---

## 部署到 GitHub Pages

仓库已包含 GitHub Actions 工作流：`.github/workflows/pages.yml`。

首次启用：

1. 推送代码到 `main` 分支。
2. 打开 GitHub 仓库 `Settings -> Pages`。
3. `Build and deployment` 的 `Source` 选择 **GitHub Actions**。
4. 等待 `Deploy frontend to GitHub Pages` workflow 运行完成。

部署成功后访问：

```text
https://annncatto.github.io/TRPGLOG/
```

---

## 可选后端说明

`api/`、`requirements.txt`、`vercel.json` 暂时保留，不参与 GitHub Pages 静态部署。后续如果要做云端保存、多设备同步、服务端模板导出、隐藏 API key 的 AI 功能，仍可以在这条后端路线之上继续扩展。

当前前端已经不依赖 `/api/export` 生成 Word；本地开发时即使不启动 Python 后端，也可以导入 `.txt`/`.docx` 并导出 `.docx`。

---

## 使用说明

1. 点击 **「载入示例」** 载入示例 Log，右侧显示预览。
2. 修改左侧文本，预览会随内容更新。
3. 按需展开 **分段标题**、**字体与颜色**、**背景块**、**导出** 等设置。
4. 点击 **「导出 Word」**，成功后下载 `.docx`。

---

## 常见问题

| 现象 | 处理建议 |
|------|----------|
| GitHub Pages 打开后空白 | 确认 Pages Source 是 GitHub Actions，并确认构建产物路径来自 `frontend/dist`。 |
| 图标或资源 404 | 确认生产构建使用了 `/TRPGLOG/` base；本仓库已在 `frontend/vite.config.ts` 配置。 |
| 左侧编辑后版式或颜色异常 | 检查是否仍以 `<角色名>:` 逐行书写；无尖括号的行会作为上一条的续行。 |
| 旧版 `.doc` 无法导入 | 请先在 Word 中另存为 `.docx` 后再导入。 |

---

## 子项目说明

前端子目录说明见 [`frontend/README.md`](frontend/README.md)。
