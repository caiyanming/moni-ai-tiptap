import { Extension } from '@tiptap/core'
import type { 
  StreamStyleConfig,
  DocumentStylePreset,
  MoniGlobalStyleAttributes,
  SemanticStyle
} from '@tiptap/core'
import { 
  generateGlobalStyleAttributes,
  parseGlobalStyleAttributes,
  computeFinalStyle,
  generateStyleCacheKey
} from '@tiptap/extension-document-style'

export interface StreamStyleOptions {
  /**
   * AI 流式操作样式配置
   */
  config: StreamStyleConfig

  /**
   * 内容样式映射 - 根据内容类型自动判断语义样式
   */
  contentStyleMapping: Record<string, keyof DocumentStylePreset['semantic']>

  /**
   * 是否启用智能样式推断
   * @default true
   */
  enableStyleInference: boolean

  /**
   * 样式缓存大小限制
   * @default 1000
   */
  maxCacheSize: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    streamStyle: {
      /**
       * 为 AI 生成的内容应用文档样式
       * @param content 要插入的内容
       * @param targetPosition 插入位置
       * @param contentType 内容类型 (paragraph, heading, etc.)
       * @example editor.commands.insertContentWithDocumentStyle(content, pos, 'paragraph')
       */
      insertContentWithDocumentStyle: (
        content: any, 
        targetPosition?: number,
        contentType?: string
      ) => ReturnType

      /**
       * 为现有内容应用文档样式
       * @param from 起始位置
       * @param to 结束位置
       * @param contentType 内容类型
       * @example editor.commands.applyDocumentStyleToContent(from, to, 'heading1')
       */
      applyDocumentStyleToContent: (
        from: number, 
        to: number, 
        contentType: string
      ) => ReturnType

      /**
       * 智能推断内容类型并应用样式
       * @param content 内容对象
       * @param context 上下文信息
       * @example editor.commands.inferAndApplyStyle(content, { parentType: 'doc' })
       */
      inferAndApplyStyle: (
        content: any, 
        context?: { parentType?: string; siblings?: any[] }
      ) => ReturnType

      /**
       * 获取推荐的内容样式
       * @param contentType 内容类型
       * @param context 上下文
       * @returns 推荐的样式属性
       */
      getRecommendedStyle: (
        contentType: string,
        context?: any
      ) => MoniGlobalStyleAttributes | null

      /**
       * 清除样式缓存
       * @example editor.commands.clearStyleCache()
       */
      clearStyleCache: () => ReturnType
    }
  }
}

/**
 * StreamStyleIntelligence Extension - AI 流式操作样式协调扩展
 * 
 * 核心功能：
 * - 自动为 AI 生成的内容应用当前文档样式
 * - 智能推断内容类型并选择合适的语义样式
 * - 与 Block Stream 操作系统无缝集成
 * - 提供样式缓存机制优化性能
 * - 支持父级样式继承和优先级控制
 */
export const StreamStyleIntelligence = Extension.create<StreamStyleOptions>({
  name: 'streamStyle',

  priority: 40, // 在 DocumentStyleExtension 之后，在内容扩展之前

  addOptions() {
    return {
      config: {
        autoApplyDocumentStyle: true,
        inheritParentStyle: true,
        stylePriority: 'document',
        enableStyleCache: true
      },
      contentStyleMapping: {
        'paragraph': 'paragraph',
        'heading': 'heading1',
        'blockquote': 'blockquote',
        'codeBlock': 'codeBlock',
        'bulletList': 'bulletList',
        'orderedList': 'orderedList',
        'listItem': 'listItem'
      },
      enableStyleInference: true,
      maxCacheSize: 1000
    }
  },

  addStorage() {
    return {
      // 样式缓存 - 键: 缓存键, 值: 样式属性
      styleCache: new Map<string, MoniGlobalStyleAttributes>(),
      
      // 内容类型推断缓存
      inferenceCache: new Map<string, string>(),
      
      // 性能统计
      stats: {
        cacheHits: 0,
        cacheMisses: 0,
        inferenceCount: 0
      }
    }
  },

  addCommands() {
    return {
      insertContentWithDocumentStyle: (content, targetPosition, contentType) => ({ tr, dispatch, editor }) => {
        if (!this.options.config.autoApplyDocumentStyle) {
          // 如果未启用自动样式应用，直接插入内容
          return editor.commands.insertContent(content, targetPosition ? { from: targetPosition, to: targetPosition } : undefined)
        }

        // 获取文档样式扩展
        const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
        if (!documentStyleExt) {
          console.warn('DocumentStyleExtension not found, inserting content without styling')
          return editor.commands.insertContent(content)
        }

        const currentPreset = documentStyleExt.storage?.documentStyle?.currentPreset
        if (!currentPreset) {
          return editor.commands.insertContent(content)
        }

        // 确定内容类型
        const finalContentType = contentType || this.inferContentType(content)
        
        // 应用样式到内容
        const styledContent = this.applyStyleToContent(content, currentPreset, finalContentType)
        
        // 插入带样式的内容
        if (dispatch) {
          const insertPos = targetPosition ?? tr.selection.from
          tr.insert(insertPos, styledContent)
          dispatch(tr)
        }

        return true
      },

      applyDocumentStyleToContent: (from, to, contentType) => ({ tr, dispatch, editor }) => {
        const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
        if (!documentStyleExt) {
          return false
        }

        const currentPreset = documentStyleExt.storage?.documentStyle?.currentPreset
        const styleVersion = documentStyleExt.storage?.documentStyle?.styleVersion || 1
        
        if (!currentPreset) {
          return false
        }

        // 获取语义样式类型
        const semanticType = this.options.contentStyleMapping[contentType] || 'paragraph'
        
        // 生成样式属性
        const styleAttributes = generateGlobalStyleAttributes(
          currentPreset,
          semanticType,
          styleVersion
        )

        // 应用到指定范围的节点
        if (dispatch) {
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) return true
            
            const newAttrs = {
              ...node.attrs,
              ...styleAttributes
            }
            
            tr.setNodeMarkup(pos, undefined, newAttrs)
            return false
          })
          
          dispatch(tr)
        }

        return true
      },

      inferAndApplyStyle: (content, context) => ({ editor }) => {
        if (!this.options.enableStyleInference) {
          return editor.commands.insertContent(content)
        }

        // 智能推断内容类型
        const inferredType = this.inferContentType(content, context)
        
        // 应用推断的样式
        return editor.commands.insertContentWithDocumentStyle(content, undefined, inferredType)
      },

      getRecommendedStyle: (contentType, context) => () => {
        const editor = this.editor
        const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
        
        if (!documentStyleExt) return null
        
        const currentPreset = documentStyleExt.storage?.documentStyle?.currentPreset
        const styleVersion = documentStyleExt.storage?.documentStyle?.styleVersion || 1
        
        if (!currentPreset) return null

        // 生成缓存键
        const cacheKey = generateStyleCacheKey(currentPreset, contentType, styleVersion)
        
        // 检查缓存
        if (this.options.config.enableStyleCache && this.storage.styleCache.has(cacheKey)) {
          this.storage.stats.cacheHits++
          return this.storage.styleCache.get(cacheKey)!
        }

        // 获取语义样式类型
        const semanticType = this.options.contentStyleMapping[contentType] || 'paragraph'
        
        // 生成样式属性
        const styleAttributes = generateGlobalStyleAttributes(
          currentPreset,
          semanticType,
          styleVersion
        )

        // 缓存结果
        if (this.options.config.enableStyleCache) {
          this.cacheStyleAttributes(cacheKey, styleAttributes)
          this.storage.stats.cacheMisses++
        }

        return styleAttributes
      },

      clearStyleCache: () => () => {
        this.storage.styleCache.clear()
        this.storage.inferenceCache.clear()
        this.storage.stats = {
          cacheHits: 0,
          cacheMisses: 0,
          inferenceCount: 0
        }
        return true
      }
    }
  },

  onCreate() {
    // 初始化存储
    this.storage.styleCache = new Map()
    this.storage.inferenceCache = new Map()
    this.storage.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      inferenceCount: 0
    }
  },

  onDestroy() {
    // 清理缓存
    this.storage.styleCache.clear()
    this.storage.inferenceCache.clear()
  },

  /**
   * 为内容应用样式
   */
  applyStyleToContent(
    content: any, 
    preset: DocumentStylePreset, 
    contentType: string
  ): any {
    if (!content || typeof content !== 'object') {
      return content
    }

    // 处理数组内容
    if (Array.isArray(content)) {
      return content.map(item => this.applyStyleToContent(item, preset, contentType))
    }

    // 处理节点对象
    if (content.type) {
      const nodeType = typeof content.type === 'string' ? content.type : content.type.name
      const semanticType = this.options.contentStyleMapping[nodeType] || contentType
      const styleVersion = this.editor.extensionManager.extensions
        .find(ext => ext.name === 'documentStyle')?.storage?.documentStyle?.styleVersion || 1

      // 生成样式属性
      const styleAttributes = generateGlobalStyleAttributes(
        preset,
        semanticType as keyof DocumentStylePreset['semantic'],
        styleVersion
      )

      // 应用样式属性
      const styledContent = {
        ...content,
        attrs: {
          ...content.attrs,
          ...styleAttributes
        }
      }

      // 递归处理子内容
      if (content.content) {
        styledContent.content = this.applyStyleToContent(content.content, preset, contentType)
      }

      return styledContent
    }

    return content
  },

  /**
   * 智能推断内容类型
   */
  inferContentType(content: any, context?: any): string {
    this.storage.stats.inferenceCount++

    // 生成推断缓存键
    const inferenceKey = this.generateInferenceKey(content, context)
    
    // 检查推断缓存
    if (this.storage.inferenceCache.has(inferenceKey)) {
      return this.storage.inferenceCache.get(inferenceKey)!
    }

    let inferredType = 'paragraph' // 默认类型

    // 基于内容结构推断
    if (content && typeof content === 'object') {
      if (content.type) {
        const nodeType = typeof content.type === 'string' ? content.type : content.type.name
        inferredType = nodeType
      } else if (Array.isArray(content) && content.length > 0) {
        // 数组内容，取第一个元素的类型
        inferredType = this.inferContentType(content[0], context)
      }
    }

    // 基于上下文推断
    if (context) {
      if (context.parentType === 'bulletList' || context.parentType === 'orderedList') {
        inferredType = 'listItem'
      }
    }

    // 基于内容特征推断
    if (typeof content === 'string') {
      // 简单的启发式推断
      if (content.startsWith('#')) {
        inferredType = 'heading'
      } else if (content.startsWith('>')) {
        inferredType = 'blockquote'
      } else if (content.includes('```')) {
        inferredType = 'codeBlock'
      }
    }

    // 缓存推断结果
    this.storage.inferenceCache.set(inferenceKey, inferredType)
    
    // 限制缓存大小
    if (this.storage.inferenceCache.size > this.options.maxCacheSize) {
      const firstKey = this.storage.inferenceCache.keys().next().value
      this.storage.inferenceCache.delete(firstKey)
    }

    return inferredType
  },

  /**
   * 缓存样式属性
   */
  cacheStyleAttributes(key: string, attributes: MoniGlobalStyleAttributes) {
    this.storage.styleCache.set(key, attributes)
    
    // 限制缓存大小
    if (this.storage.styleCache.size > this.options.maxCacheSize) {
      const firstKey = this.storage.styleCache.keys().next().value
      this.storage.styleCache.delete(firstKey)
    }
  },

  /**
   * 生成推断缓存键
   */
  generateInferenceKey(content: any, context?: any): string {
    const contentHash = this.hashContent(content)
    const contextHash = context ? this.hashContent(context) : 'no-context'
    return `${contentHash}-${contextHash}`
  },

  /**
   * 简单的内容哈希函数
   */
  hashContent(obj: any): string {
    const str = JSON.stringify(obj)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }
})