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

1. 打开本仓库 **Settings** → 左侧 **Pages**。  
2. **Build and deployment** 里 **Source** 选 **GitHub Actions**（不要选 branch / Deploy from a branch）。  
3. 保存后，到 **Actions** 打开 **Deploy H5 to GitHub Pages**，若未自动跑，点 **Run workflow** 手动跑一次。  
4. 等两个 job（build / deploy）都绿了以后，访问：  
   `https://<你的 GitHub 用户名>.github.io/impresario/`  
   若首次提示需批准 **github-pages** 环境，到 **Settings → Environments** 里按提示放行即可。  
5. 若仓库改名，请同步修改 `.github/workflows/deploy-h5.yml` 里的 `TARO_APP_PUBLIC_PATH`（须以 `/` 开头和结尾，例如 `/新仓库名/`）。

### 子路径本地自测

```bash
TARO_APP_PUBLIC_PATH=/impresario/ npm run build:h5
# 再用 npx serve dist 等方式本地预览（注意从子路径访问）
```
