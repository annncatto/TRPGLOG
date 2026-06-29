# 前端（Vite + React）

本目录为 TRPGLOG 的 Web 前端：跑团日志编辑、实时预览与导出交互。

当前前端可独立完成 `.txt` / `.docx` 导入与 `.docx` 导出，GitHub Pages 部署不依赖后端。完整说明请参阅仓库根目录 [`README.md`](../README.md)。

## 常用命令

```bash
npm install    # 安装依赖（首次）
npm run dev    # 本地开发（地址见终端输出，多为 http://localhost:5173）
npm run build  # TypeScript 检查与生产构建
npm run preview # 本地预览构建产物
```

生产构建会自动使用 GitHub Pages 子路径 `/TRPGLOG/`；本地开发仍使用根路径 `/`。
