import { defineConfig } from '@tarojs/cli';

/** H5 部署子路径时设置，例如 GitHub Pages 仓库站点：`/impresario/`。Vercel 根域名留空即可。 */
const h5PublicPath = process.env.TARO_APP_PUBLIC_PATH || '/';
const h5Basename =
  h5PublicPath === '/' ? undefined : h5PublicPath.replace(/\/$/, '');

/** 与 H5 分离，避免 `build:weapp` 覆盖 `dist`（影响 Pages / Vercel） */
const outputRoot = process.env.TARO_ENV === 'weapp' ? 'dist-weapp' : 'dist';

export default defineConfig<'vite'>({
  projectName: 'impresario',
  date: '2026-04-16',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot,
  plugins: [
    '@tarojs/plugin-platform-weapp',
    '@tarojs/plugin-platform-h5',
    '@tarojs/plugin-framework-react',
  ],
  defineConstants: {},
  copy: {
    patterns: [{ from: 'src/sitemap.json', to: 'sitemap.json' }],
    options: {}
  },
  framework: 'react',
  compiler: 'vite',
  cache: {
    enable: false
  },
  mini: {
    optimizeMainPackage: {
      enable: true,
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false
      }
    }
  },
  h5: {
    publicPath: h5PublicPath,
    staticDirectory: 'static',
    ...(h5Basename ? { router: { basename: h5Basename } } : {})
  }
});
