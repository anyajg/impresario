import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const tabs = [
  { title: '首页', icon: '🏠', path: '/pages/index/index' },
  { title: '题库', icon: '📚', path: '/pages/practice/index' },
  { title: '错题', icon: '📋', path: '/pages/wrongBook/index' },
  { title: '考试', icon: '📝', path: '/pages/exam/index' },
];

interface TabBarProps {
  current: number;
}

function TabBar({ current }: TabBarProps) {
  const handleTap = (index: number) => {
    if (index === current) return;
    Taro.redirectTo({ url: tabs[index].path });
  };

  return (
    <View className='tab-bar'>
      {tabs.map((tab, index) => (
        <View
          key={tab.path}
          className={`tab-item ${index === current ? 'tab-active' : ''}`}
          onClick={() => handleTap(index)}
        >
          <Text className='tab-icon'>{tab.icon}</Text>
          <Text className='tab-title'>{tab.title}</Text>
        </View>
      ))}
    </View>
  );
}

export default TabBar;
