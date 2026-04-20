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
npm run build:h5    # 产物目录：dist/（给 H5 / GitHub Pages / Vercel）
npm run build:weapp # 产物目录：dist-weapp/（给微信小程序，避免覆盖 dist）
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

## 微信小程序上线（需微信侧操作）

微信不提供「替你托管代码」的按钮式部署：你需要**注册小程序 + 本机构建 + 开发者工具上传**。以下为个人/非商用常见流程。

### 1. 注册与 AppID

1. 打开 [微信公众平台](https://mp.weixin.qq.com/) → 注册 **小程序**（个人或企业按实际情况）。  
2. 在 **开发 → 开发管理 → 开发设置** 里复制 **AppID**。  
3. 编辑仓库根目录 **`project.config.json`**，把 `"appid": "touristappid"` 改成你的 **正式 AppID**（`touristappid` 仅用于游客体验，不能用于正式发布）。

### 2. 构建

```bash
npm install
npm run build:weapp
```

完成后小程序代码在 **`dist-weapp/`**（已在 `project.config.json` 里通过 `miniprogramRoot` 指向该目录）。

### 3. 用微信开发者工具打开项目

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。  
2. **导入项目** 时，**项目目录请选择本仓库根目录**（包含 `project.config.json` 的那一层，例如 `impresario`），**不要**只选 `dist-weapp`。工具会按 `miniprogramRoot` 读取编译结果。  
3. 若提示「云开发」等与本项目无关的能力，可跳过。

### 4. 合法域名（若使用网络请求）

若小程序里请求了 **AI 接口或其它 HTTPS 域名**，必须在公众平台 **开发 → 开发管理 → 服务器域名** 里配置 **request 合法域名**（仅支持 https，且需按微信校验文件要求）。纯本地题库、无外链时可暂不配。

### 5. 上传与审核

1. 在开发者工具中点击 **上传**，填写版本号与备注。  
2. 登录 [微信公众平台](https://mp.weixin.qq.com/) → **版本管理** → 将开发版 **提交审核**。  
3. 审核通过后 **发布**。个人主体类目与能力以微信规则为准。

### 与 H5 同时维护时

先改代码 → 需要发网页时执行 `npm run build:h5`；需要发小程序时执行 `npm run build:weapp`。两者输出目录已分开，互不影响。

## 邀请码收费（人工发码）后端

当前前端支持「体验版 88 题 + 邀请码解锁完整版」，并支持 H5 / 小程序共用同一用户标识。  
为保证“一码一人”，必须使用服务端校验（推荐 Supabase 免费档）。

### 1) 建库与建表

在 Supabase SQL Editor 执行：

- `supabase/schema.sql`

执行后会创建：
- `access_users`（用户标识）
- `invite_codes`（邀请码）
- `invite_redeems`（兑换记录）
- `redeem_invite` / `access_status` 两个数据库函数

### 2) 部署 Edge Functions

本仓库已提供：
- `supabase/functions/redeem-invite/index.ts`
- `supabase/functions/access-status/index.ts`
- `supabase/functions/questions-page/index.ts`

部署后需在函数环境变量中设置：
- `PROJECT_URL`
- `SERVICE_ROLE_KEY`

### 3) 导入完整题库到服务端（避免公开静态 JSON）

执行一次建表 SQL（`supabase/schema.sql`）后，运行：

```bash
PROJECT_URL=https://<project-ref>.supabase.co \
SERVICE_ROLE_KEY=<service-role-key> \
node scripts/push-question-bank.mjs
```

该脚本会把 `src/data/questions.auto.json` 批量写入 `public.question_bank`，客户端后续通过 `questions-page` 分页获取，不再依赖公开 `raw.githubusercontent.com` 题库地址。

### 4) 配置前端调用地址

编辑 `src/config/accessConfig.ts`：

```ts
export const accessConfig = {
  apiBaseUrl: 'https://<project-ref>.supabase.co/functions/v1',
  anonKey: '<your-anon-key>',
};
```

### 5) 微信小程序合法域名

在公众平台添加 request 合法域名：

- `https://<project-ref>.supabase.co`

### 6) 人工发码流程建议

1. 用户线下赞助后，你在 `invite_codes` 新增一个 `max_uses = 1` 的码。  
2. 用户在首页输入：
   - 用户标识（建议手机号/邮箱，H5 与小程序输入同一个）
   - 邀请码  
3. 服务端校验成功后，记录兑换关系；同一用户跨端自动已解锁。
