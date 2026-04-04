# TRPGLOG

面向桌面与网页的 **跑团日志（TRPG Log）编辑与排版工具**：在浏览器中编辑结构化对话、实时预览样式，并可导出为 Microsoft Word（`.docx`）。前后端分离，开发时通过 Vite 代理调用后端 API。

---

## 功能概览

- **实时预览**：编辑区与预览联动，便于核对分段与样式。
- **解析规则**：支持 `<角色名>:` 行首标记、骰子与续行等常见 Log 写法（前端 `parser.ts` 与后端 `parser.py` 规则一致）。
- **导入**：支持 `.txt`、`.docx`；在 Windows 且已安装 Microsoft Word 时，可经后端处理 **`.doc`**（需额外依赖，见下文）。
- **导出 Word**：由 FastAPI 服务生成 `.docx`，含段落、表格与色块等排版逻辑。
- **可配置项**：分段标题、背景块等可在界面中调整。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、TypeScript、Vite 8 |
| 后端 | Python 3、FastAPI、Uvicorn、`python-docx` |

---

## 环境要求

- **Node.js**（建议 LTS）：用于前端依赖安装与开发/构建。
- **Python 3**：建议通过 Conda 或 venv 管理独立环境。
- **可选（`.doc` 导入，Windows）**：本机安装 **Microsoft Word**，并在 Python 环境中安装 `pywin32`。

---

## 安装依赖

以下命令中的路径请按本机仓库位置与虚拟环境名称自行替换。

**后端**（在已激活的 Python 环境中执行）：

```powershell
pip install -r backend/requirements.txt
```

**前端**（在仓库根目录下）：

```powershell
cd frontend
npm install
```

---

## 运行方式

开发与测试需 **同时** 启动后端与前端（两个终端）。

### 后端（Word 导出与文本提取）

```powershell
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动成功后，访问 [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) 应返回 `{"status":"ok"}`。

### 前端（Web 界面）

```powershell
cd frontend
npm run dev
```

按终端提示在浏览器中打开本地地址（通常为 [http://localhost:5173](http://localhost:5173)）。开发环境下，前端通过 `vite.config.ts` 将 `/api` 代理至后端 `8000` 端口。

---

## 使用说明

1. 在界面中点击 **「载入示例」**，左侧载入示例 Log，右侧显示预览。
2. 修改左侧文本，预览会随内容更新。
3. 按需展开 **分段标题**、**背景块** 等选项；使用 **导入文件** 载入 `.txt` 或 `.docx`。
4. 点击 **「导出 Word」** 前请确认后端服务已运行；成功后将下载 `.docx`，可用 Word 打开检查版式。

**关于 `.doc` 文件**：依赖后端 `/extract-text` 接口。在 Windows 上需安装 Word，并在 Python 环境中执行 `pip install pywin32`。若无法满足条件，请将文件另存为 `.docx` 后再导入。

---

## 目录结构与开发入口

| 关注点 | 路径（相对仓库根目录） |
|--------|------------------------|
| 页面布局、导入/导出与主流程 | `frontend/src/App.tsx` |
| 右侧预览与分段展示 | `frontend/src/Preview.tsx`、`frontend/src/App.css` |
| 前端解析逻辑 | `frontend/src/parser.ts` |
| 后端同源解析（可独立使用） | `backend/parser.py` |
| Word 导出（段落、表格、色块） | `backend/export_docx.py` |
| `.doc` / 服务端 Word 纯文本提取 | `backend/extract_text.py` |
| API 与 CORS | `backend/main.py` |
| 开发代理 | `frontend/vite.config.ts` |

修改前端后一般由 Vite 热更新；后端使用 `--reload` 时在多数改动下会自动重启。若未生效，可在对应终端中止进程后重新执行启动命令。

---

## 生产构建（前端）

```powershell
cd frontend
npm run build
```

产物位于 `frontend/dist/`，需配合静态资源托管或反向代理部署；日常开发使用 `npm run dev` 即可。

---

## 常见问题

| 现象 | 处理建议 |
|------|----------|
| 导出 Word 失败或无响应 | 确认 Uvicorn 在运行，且 `/health` 可访问。 |
| 左侧编辑后版式或颜色异常 | 检查是否仍以 `<角色名>:` 逐行书写；无尖括号的行会作为上一条的续行。 |
| 编辑器提示无法解析 Python `import` | 在 IDE 中选择当前项目使用的 Python 解释器（如 Conda/venv 中的 `python.exe`）。 |
| 端口冲突 | 可更换 Uvicorn 端口（如 `--port 8001`），并同步修改 `frontend/vite.config.ts` 中代理的 `target` 端口，使前后端一致。 |

---

## 子项目说明

前端子目录说明见 [`frontend/README.md`](frontend/README.md)。
