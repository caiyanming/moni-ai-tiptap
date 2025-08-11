// PostCSS配置 - ES模块版本
// 策略：从已安装的设计系统包导入配置

// 使用已安装的包名，而不是相对路径
import designSystemConfig from 'moni-ai-design-system/postcss-config'

// 合并设计系统配置和项目特定配置
// 这种方式保持了配置的同步，同时允许项目覆盖
export default {
  plugins: {
    // 1. 继承设计系统的所有插件
    ...designSystemConfig.plugins,
    
    // 2. 项目特定插件（会覆盖设计系统中的同名插件）
    tailwindcss: {}, // TipTap使用Tailwind
    autoprefixer: {}, // 确保浏览器兼容性
  },
}

// 注意：设计系统通过 package.json 的 file: 协议安装
// 确保先运行 scripts/install-design-system.sh