import type { DocumentStylePreset } from '@tiptap/core'

/**
 * MoniAI 默认样式预设 - 现代奢华教育风格
 *
 * 设计理念：
 * - 融合 2025 年顶级设计趋势：现代 Sans-Serif、优雅配色、精致排版
 * - 使用 Inter Variable Font 实现完美的屏幕渲染效果
 * - 深色主调配合温暖橙色，营造高端专业氛围
 * - 精心调校的字体缩放比例和间距，确保阅读舒适度
 * - 适用于专业文档、学术论文、商业报告等高端场景
 */
export const MoniDefaultStylePreset: DocumentStylePreset = {
  name: 'moni-default',
  displayName: 'MoniAI 默认',
  description: '融合现代奢华设计理念的专业级文档风格',

  typography: {
    fontFamily:
      '"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable", "Segoe UI", Roboto, system-ui, sans-serif',
    fontSize: 17, // 17px 是现代设备的最佳阅读大小
    lineHeight: 1.65, // 黄金比例行高，确保最佳阅读体验
    letterSpacing: '-0.011em', // 微调字符间距，提升现代感
    scale: {
      ratio: 1.333, // 完美四度音阶，更加优雅的层次感
      base: 17,
    },
  },

  colors: {
    text: '#0f172a', // 现代深色，比纯黑更温和
    textSecondary: '#475569', // 精心调校的次要文本色
    background: '#ffffff', // 纯净白色背景
    accent: '#f97316', // MoniAI 标志性橙色
    highlight: 'rgba(249, 115, 22, 0.08)', // 极其精致的高亮效果
    success: '#059669', // 现代绿色调
    warning: '#d97706', // 温暖的警告橙
    error: '#dc2626', // 精准的错误红
  },

  spacing: {
    blockSpacing: 32, // 更加宽松的块间距，营造高端感
    paragraphSpacing: 20, // 优化的段落间距
    listIndent: 28, // 精确的列表缩进
  },

  semantic: {
    // 文档标题 - 最高级别的标题，体现现代奢华感
    title: {
      fontSize: 36, // 1.333^3 ≈ 2.37 * 17 ≈ 40 → 36 精心调校
      fontWeight: 800, // 超粗体，现代感十足
      lineHeight: 1.15, // 极致紧凑，营造冲击力
      color: '#020617', // 最深邃的现代黑
      marginTop: 0,
      marginBottom: 48, // 奢华的留白空间
      letterSpacing: '-0.025em', // 现代紧凑字符间距
    },

    // 一级标题 - 章节级别，优雅层次感
    heading1: {
      fontSize: 30, // 1.333^2 ≈ 1.78 * 17 ≈ 30
      fontWeight: 700, // 专业粗体
      lineHeight: 1.2,
      color: '#0f172a', // 深邃现代色
      marginTop: 56, // 精心计算的上边距
      marginBottom: 32, // 优雅的下边距
      letterSpacing: '-0.015em', // 精细字符间距调整
    },

    // 二级标题 - 现代简约美学
    heading2: {
      fontSize: 24, // 1.333^1 ≈ 1.33 * 17 ≈ 23 → 24
      fontWeight: 650, // 介于 semibold 和 bold 之间的精确重量
      lineHeight: 1.25,
      color: '#0f172a',
      marginTop: 40,
      marginBottom: 20,
      letterSpacing: '-0.01em',
    },

    // 三级标题 - 精致平衡
    heading3: {
      fontSize: 20, // 略大于基础，保持层次
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1e293b',
      marginTop: 32,
      marginBottom: 16,
      letterSpacing: '-0.005em',
    },

    // 四级标题 - 微妙区分
    heading4: {
      fontSize: 18, // 略大于基础字体
      fontWeight: 600,
      lineHeight: 1.35,
      color: '#334155',
      marginTop: 28,
      marginBottom: 12,
      letterSpacing: '0em',
    },

    // 五级标题 - 精细层次
    heading5: {
      fontSize: 17, // 与基础字体同大，但加粗区分
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#475569',
      marginTop: 24,
      marginBottom: 8,
      letterSpacing: '0em',
    },

    // 六级标题 - 最小层次
    heading6: {
      fontSize: 16, // 略小于基础
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#64748b',
      marginTop: 20,
      marginBottom: 6,
      letterSpacing: '0em',
    },

    // 正文段落 - 完美阅读体验
    paragraph: {
      fontSize: 17, // 现代设备最佳阅读尺寸
      fontWeight: 400, // 标准重量
      lineHeight: 1.65, // 黄金比例行高
      color: '#0f172a',
      marginTop: 0,
      marginBottom: 20, // 优雅的段落间距
      letterSpacing: '-0.011em', // 微调字符间距提升现代感
    },

    // 引用块 - 现代优雅的引用样式
    blockquote: {
      fontSize: 18, // 略大于正文，突出引用重要性
      fontWeight: 450, // 介于 normal 和 medium 之间的精细重量
      lineHeight: 1.6,
      color: '#334155', // 优雅的中性灰
      marginTop: 32,
      marginBottom: 32,
      marginLeft: 0, // 取消左缩进，现代设计风格
      padding: 24, // 更宽松的内边距
      backgroundColor: 'rgba(249, 115, 22, 0.02)', // 极其精致的橙色背景
      borderLeft: '3px solid #f97316', // MoniAI 橙色强调线
      borderRadius: 8, // 现代圆角
      fontStyle: 'italic', // 优雅的斜体
    },

    // 代码块 - 现代开发者美学
    codeBlock: {
      fontSize: 15, // 略大的代码字体，提升可读性
      fontWeight: 400,
      lineHeight: 1.55, // 优化的代码行高
      color: '#0f172a',
      marginTop: 24,
      marginBottom: 24,
      padding: 20, // 更宽松的代码块内边距
      backgroundColor: '#f8fafc', // 极其精致的浅色背景
      borderRadius: 8,
      border: '1px solid #e2e8f0', // 精细的边框
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
    },

    // 行内代码 - 精致的行内样式
    inlineCode: {
      fontSize: 15, // 与代码块保持一致
      fontWeight: 500,
      color: '#be123c', // 现代的红色调
      backgroundColor: '#fef2f2', // 极其精致的红色背景
      padding: 3, // 稍大的内边距
      borderRadius: 4,
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
    },

    // 有序列表 - 现代列表美学
    orderedList: {
      fontSize: 17, // 与段落字体一致
      fontWeight: 400,
      lineHeight: 1.65,
      color: '#0f172a',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 28, // 精确的缩进距离
    },

    // 无序列表 - 优雅的项目符号
    bulletList: {
      fontSize: 17, // 与段落字体一致
      fontWeight: 400,
      lineHeight: 1.65,
      color: '#0f172a',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 28, // 精确的缩进距离
    },

    // 列表项 - 精心调校的间距
    listItem: {
      marginBottom: 10, // 略大的列表项间距，营造高端感
      lineHeight: 1.65, // 与段落行高保持一致
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
    // 文档标题 - 学术论文标题
    title: {
      fontSize: 18,
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#000000',
      marginTop: 0,
      marginBottom: 24,
      textAlign: 'center',
    },

    // 一级标题
    heading1: {
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 24,
      marginBottom: 12,
    },

    // 二级标题
    heading2: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 20,
      marginBottom: 10,
    },

    // 三级标题
    heading3: {
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 16,
      marginBottom: 8,
    },

    // 四级标题
    heading4: {
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 14,
      marginBottom: 6,
    },

    // 五级标题
    heading5: {
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 12,
      marginBottom: 4,
    },

    // 六级标题
    heading6: {
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#000000',
      marginTop: 10,
      marginBottom: 2,
    },

    // 正文段落
    paragraph: {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#000000',
      marginTop: 0,
      marginBottom: 12,
      textAlign: 'justify', // 两端对齐
    },

    // 引用块
    blockquote: {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#333333',
      marginTop: 12,
      marginBottom: 12,
      marginLeft: 36,
      padding: 12,
      backgroundColor: '#f9f9f9',
      borderLeft: '3px solid #0066cc',
      borderRadius: 2,
    },

    // 代码块
    codeBlock: {
      fontSize: 10,
      fontWeight: 400,
      lineHeight: 1.4,
      color: '#000000',
      marginTop: 12,
      marginBottom: 12,
      padding: 12,
      backgroundColor: '#f5f5f5',
      borderRadius: 3,
      border: '1px solid #cccccc',
      fontFamily: '"Courier New", "Consolas", monospace',
    },

    // 行内代码
    inlineCode: {
      fontSize: 11,
      fontWeight: 500,
      color: '#000000',
      backgroundColor: '#f0f0f0',
      padding: 1,
      borderRadius: 2,
      fontFamily: '"Courier New", "Consolas", monospace',
    },

    // 有序列表
    orderedList: {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#000000',
      marginTop: 12,
      marginBottom: 12,
      marginLeft: 36,
    },

    // 无序列表
    bulletList: {
      fontSize: 12,
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#000000',
      marginTop: 12,
      marginBottom: 12,
      marginLeft: 36,
    },

    // 列表项
    listItem: {
      marginBottom: 6,
      lineHeight: 1.5,
    },
  },
}

/**
 * 预设样式列表
 */
export const DEFAULT_STYLE_PRESETS: DocumentStylePreset[] = [MoniDefaultStylePreset, AcademicStylePreset]
