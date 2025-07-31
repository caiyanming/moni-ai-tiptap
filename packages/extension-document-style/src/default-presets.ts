import type { DocumentStylePreset } from '@tiptap/core'

/**
 * MoniAI 默认样式预设 - 现代教育风格
 *
 * 设计理念：
 * - 基于 MoniAI 橙色主题 (#f97316)
 * - 平衡专业性与易读性
 * - 适用于论文、课件、作业、笔记等 80% 教育场景
 * - 使用 Inter 字体族和四度音阶 (1.25) 字体缩放
 */
export const MoniDefaultStylePreset: DocumentStylePreset = {
  name: 'moni-default',
  displayName: 'MoniAI 默认',
  description: '平衡专业性与易读性的现代教育风格',

  typography: {
    fontFamily: '"Inter", "Source Han Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 16,
    lineHeight: 1.6,
    letterSpacing: '0.01em',
    scale: {
      ratio: 1.25, // 四度音阶，提供和谐的视觉层次
      base: 16,
    },
  },

  colors: {
    text: '#1f2937', // 深灰色，易读性好
    textSecondary: '#6b7280', // 中等灰色，用于次要信息
    background: '#ffffff', // 纯白背景
    accent: '#f97316', // MoniAI 橙色主调
    highlight: 'rgba(249, 115, 22, 0.1)', // 橙色高亮背景
    success: '#10b981', // 绿色，成功状态
    warning: '#f59e0b', // 黄色，警告状态
    error: '#ef4444', // 红色，错误状态
  },

  spacing: {
    blockSpacing: 24, // 块级元素间距，提供良好的视觉分隔
    paragraphSpacing: 16, // 段落间距，保持阅读流畅性
    listIndent: 32, // 列表缩进，符合认知习惯
  },

  semantic: {
    // 文档标题 - 最高级别的标题
    title: {
      fontSize: 28, // 1.25^3 ≈ 1.95 * 16 ≈ 31.2 → 28
      fontWeight: 800, // 超粗体，突出重要性
      lineHeight: 1.2, // 紧凑行高，增强标题感
      color: '#111827', // 最深色，最强对比度
      marginTop: 0,
      marginBottom: 32, // 大间距，与内容分离
      letterSpacing: '-0.01em', // 稍微收紧字符间距
    },

    // 一级标题
    heading1: {
      fontSize: 24, // 1.25^2 = 1.5625 * 16 = 25 → 24
      fontWeight: 700, // 粗体
      lineHeight: 1.25,
      color: '#111827',
      marginTop: 48, // 大上边距，区分章节
      marginBottom: 24,
      letterSpacing: '-0.005em',
    },

    // 二级标题
    heading2: {
      fontSize: 20, // 1.25^1 = 1.25 * 16 = 20
      fontWeight: 600, // 半粗体
      lineHeight: 1.3,
      color: '#1f2937',
      marginTop: 32,
      marginBottom: 16,
    },

    // 三级标题
    heading3: {
      fontSize: 18, // 1.25^0.5 ≈ 1.118 * 16 ≈ 17.9 → 18
      fontWeight: 600,
      lineHeight: 1.35,
      color: '#1f2937',
      marginTop: 24,
      marginBottom: 12,
    },

    // 四级标题
    heading4: {
      fontSize: 16, // 基础字体大小
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#374151',
      marginTop: 20,
      marginBottom: 8,
    },

    // 五级标题
    heading5: {
      fontSize: 14, // 1.25^-0.5 ≈ 0.894 * 16 ≈ 14.3 → 14
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#374151',
      marginTop: 16,
      marginBottom: 6,
    },

    // 六级标题
    heading6: {
      fontSize: 13, // 1.25^-1 = 0.8 * 16 = 12.8 → 13
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#4b5563',
      marginTop: 12,
      marginBottom: 4,
    },

    // 正文段落
    paragraph: {
      fontSize: 16, // 基础字体大小
      fontWeight: 400, // 正常粗细
      lineHeight: 1.6, // 舒适的阅读行高
      color: '#1f2937',
      marginTop: 0,
      marginBottom: 16, // 段落间距
    },

    // 引用块
    blockquote: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      color: '#4b5563', // 稍浅的颜色，区分引用
      marginTop: 24,
      marginBottom: 24,
      marginLeft: 24, // 左缩进
      padding: 16,
      backgroundColor: '#f9fafb', // 浅灰背景
      borderLeft: '4px solid #f97316', // MoniAI 橙色边框
      borderRadius: 4,
    },

    // 代码块
    codeBlock: {
      fontSize: 14, // 稍小字体，适合代码
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#1f2937',
      marginTop: 16,
      marginBottom: 16,
      padding: 16,
      backgroundColor: '#f3f4f6', // 浅灰背景
      borderRadius: 6,
      border: '1px solid #e5e7eb',
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace', // 等宽字体
    },

    // 行内代码
    inlineCode: {
      fontSize: 14,
      fontWeight: 500, // 稍粗，突出显示
      color: '#dc2626', // 红色，突出代码
      backgroundColor: '#f3f4f6',
      padding: 2,
      borderRadius: 3,
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
    },

    // 有序列表
    orderedList: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      color: '#1f2937',
      marginTop: 16,
      marginBottom: 16,
      marginLeft: 32, // 缩进
    },

    // 无序列表
    bulletList: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      color: '#1f2937',
      marginTop: 16,
      marginBottom: 16,
      marginLeft: 32, // 缩进
    },

    // 列表项
    listItem: {
      marginBottom: 8, // 列表项间距
      lineHeight: 1.6,
    },
  },
}

/**
 * 学术论文样式预设 - 专业学术风格
 */
export const AcademicStylePreset: DocumentStylePreset = {
  name: 'academic',
  displayName: '学术论文',
  description: '符合学术规范的正式论文样式',

  typography: {
    fontFamily: '"Times New Roman", "Source Han Serif SC", serif',
    fontSize: 12, // 学术论文常用 12pt
    lineHeight: 1.5, // 1.5 倍行距
    letterSpacing: '0em',
    scale: {
      ratio: 1.2, // 更保守的缩放比例
      base: 12,
    },
  },

  colors: {
    text: '#000000', // 纯黑色，符合学术规范
    textSecondary: '#333333',
    background: '#ffffff',
    accent: '#0066cc', // 蓝色，更正式
    highlight: 'rgba(0, 102, 204, 0.1)',
    success: '#006600',
    warning: '#cc6600',
    error: '#cc0000',
  },

  spacing: {
    blockSpacing: 12, // 紧凑间距
    paragraphSpacing: 12,
    listIndent: 36, // 标准缩进
  },

  semantic: {
    title: {
      fontSize: 18,
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#000000',
      marginTop: 0,
      marginBottom: 24,
      textAlign: 'center',
    },
    heading1: {
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 24,
      marginBottom: 12,
    },
    // ... 其他样式配置
    paragraph: {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#000000',
      marginTop: 0,
      marginBottom: 12,
      textAlign: 'justify', // 两端对齐
    },
    // 省略其他配置，实际使用时需要完整定义
  } as any,
}

/**
 * 预设样式列表
 */
export const DEFAULT_STYLE_PRESETS: DocumentStylePreset[] = [MoniDefaultStylePreset, AcademicStylePreset]
