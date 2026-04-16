import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { getAIConfig, saveAIConfig, type AIConfig } from '../../utils/ai';
import './index.scss';

function AISettingsPage() {
  const [config, setConfig] = useState<AIConfig>(getAIConfig);

  const update = (key: keyof AIConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!config.apiKey.trim()) {
      Taro.showToast({ title: '请填写 API Key', icon: 'none' });
      return;
    }
    saveAIConfig(config);
    Taro.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 800);
  };

  const handleTest = async () => {
    if (!config.apiKey.trim()) {
      Taro.showToast({ title: '请先填写 API Key', icon: 'none' });
      return;
    }
    saveAIConfig(config);
    Taro.showLoading({ title: '测试连接...' });

    try {
      await new Promise<void>((resolve, reject) => {
        Taro.request({
          url: config.apiUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          data: {
            model: config.model,
            messages: [{ role: 'user', content: '你好' }],
            max_tokens: 16,
          },
          success(res) {
            if (res.statusCode === 200) resolve();
            else reject(new Error(res.data?.error?.message || `HTTP ${res.statusCode}`));
          },
          fail(err) {
            reject(new Error(err.errMsg || '网络错误'));
          },
        });
      });
      Taro.hideLoading();
      Taro.showToast({ title: '连接成功 ✓', icon: 'success' });
    } catch (e: any) {
      Taro.hideLoading();
      Taro.showModal({
        title: '连接失败',
        content: e.message || '请检查配置',
        showCancel: false,
      });
    }
  };

  return (
    <View className='page'>
      <View className='hero'>
        <Text className='hero-icon'>🤖</Text>
        <Text className='hero-title'>AI 解析设置</Text>
        <Text className='hero-desc'>
          配置 AI 接口后，可在错题本和练习中获取智能解析
        </Text>
      </View>

      <View className='form'>
        <View className='field'>
          <Text className='field-label'>API 地址</Text>
          <Input
            className='field-input'
            value={config.apiUrl}
            onInput={(e) => update('apiUrl', e.detail.value)}
            placeholder='https://api.deepseek.com/v1/chat/completions'
          />
          <Text className='field-hint'>
            支持 DeepSeek / OpenAI 等兼容接口
          </Text>
        </View>

        <View className='field'>
          <Text className='field-label'>API Key</Text>
          <Input
            className='field-input'
            value={config.apiKey}
            onInput={(e) => update('apiKey', e.detail.value)}
            placeholder='sk-...'
            password
          />
        </View>

        <View className='field'>
          <Text className='field-label'>模型名称</Text>
          <Input
            className='field-input'
            value={config.model}
            onInput={(e) => update('model', e.detail.value)}
            placeholder='deepseek-chat'
          />
        </View>
      </View>

      <View className='actions'>
        <View className='btn btn-primary' onClick={handleSave}>
          <Text className='btn-text'>保存配置</Text>
        </View>
        <View className='btn btn-outline' onClick={handleTest}>
          <Text className='btn-outline-text'>测试连接</Text>
        </View>
      </View>

      <View className='tips'>
        <Text className='tips-title'>使用说明</Text>
        <Text className='tips-text'>
          1. 推荐使用 DeepSeek，注册后可获得免费额度{'\n'}
          2. 访问 platform.deepseek.com 获取 API Key{'\n'}
          3. 也可使用 OpenAI 或其他兼容接口{'\n'}
          4. API Key 仅存储在本地，不会上传到任何服务器
        </Text>
      </View>
    </View>
  );
}

export default AISettingsPage;
