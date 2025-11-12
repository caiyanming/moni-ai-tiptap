// PostCSS配置 - 继承设计系统配置
import designSystemConfig from '@moni-ai/design-system/postcss-config'

export default {
  ...designSystemConfig,
  plugins: {
    ...designSystemConfig.plugins,
    // 项目特定的插件可以在这里添加
    tailwindcss: {}, // 保留现有的Tailwind配置
    autoprefixer: {},
  },
}
