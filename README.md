# impresario

演出经纪人考试练习平台，支持：

- 手机网页（H5）
- 微信小程序（WeApp）

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
# H5
npm run dev:h5

# 微信小程序
npm run dev:weapp
```

## 生产构建

```bash
npm run build:h5
npm run build:weapp
```

## 网页（H5）免费上线

### 方式 A：Vercel（推荐，根路径 `/`，无需改环境变量）

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录。  
2. **Add New Project** → 导入仓库 `anyajg/impresario`。  
3. 保持默认即可：本仓库已含 `vercel.json`（`npm run build:h5`，输出目录 `dist`），导入本 GitHub 仓库即可。  
4. Deploy 完成后访问分配的 `*.vercel.app` 域名；也可在 Vercel 里绑定自己的域名。

### 方式 B：Netlify

1. [netlify.com](https://www.netlify.com) → Add new site → Import from Git。  
2. Build command：`npm run build:h5`，Publish directory：`dist`（与 `netlify.toml` 一致）。

### 方式 C：GitHub Pages（子路径 `/impresario/`）

1. 仓库 **Settings → Pages**：**Source** 选 **GitHub Actions**。  
2. 推送 `main` 后会运行 `.github/workflows/deploy-h5.yml`，站点一般为：  
   `https://<你的用户名>.github.io/impresario/`  
3. 若仓库改名，请改 workflow 里的 `TARO_APP_PUBLIC_PATH`（须以 `/` 开头和结尾，例如 `/新仓库名/`）。

### 子路径本地自测

```bash
TARO_APP_PUBLIC_PATH=/impresario/ npm run build:h5
# 再用 npx serve dist 等方式本地预览（注意从子路径访问）
```
