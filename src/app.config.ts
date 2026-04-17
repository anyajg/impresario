export default defineAppConfig({
  pages: [
    // 主包只保留首页，降低主包体积（微信主包限制 2MB）
    'pages/index/index',
  ],
  subPackages: [
    {
      root: 'pages/knowledge',
      pages: ['index', 'detail'],
    },
    {
      root: 'pages/practice',
      pages: ['index'],
    },
    {
      root: 'pages/wrongBook',
      pages: ['index'],
    },
    {
      root: 'pages/exam',
      pages: ['index'],
    },
    {
      root: 'pages/examResult',
      pages: ['index'],
    },
    {
      root: 'pages/aiSettings',
      pages: ['index'],
    },
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#f8fafc',
    navigationBarTitleText: '演出经纪人练习',
    navigationBarTextStyle: 'black',
  },
});
