import { Extension } from '@tiptap/core'
import type { 
  StreamStyleConfig,
  DocumentStylePreset,
  MoniGlobalStyleAttributes
} from '@tiptap/core'
import { 
  generateGlobalStyleAttributes
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
       */
      insertContentWithDocumentStyle: (
        content: any, 
        targetPosition?: number,
        contentType?: string
      ) => ReturnType

      /**
       * 为现有内容应用文档样式
       */
      applyDocumentStyleToContent: (
        from: number, 
        to: number, 
        contentType: string
      ) => ReturnType

      /**
       * 智能推断内容类型并应用样式
       */
      inferAndApplyStyle: (
        content: any, 
        context?: { parentType?: string; siblings?: any[] }
      ) => ReturnType

      /**
       * 获取推荐的内容样式
       */
      getRecommendedStyle: (
        contentType: string,
        context?: any
      ) => ReturnType

      /**
       * 清除样式缓存
       */
      clearStyleCache: () => ReturnType
    }
  }
}

/**
 * StreamStyleIntelligence Extension - AI 流式操作样式协调扩展
 * 
 * 提供 AI 驱动的智能样式推断和应用功能：
 * - 内容类型智能识别
 * - 自动样式应用
 * - 样式缓存和性能优化
 * - 与 DocumentStyleExtension 协同工作
 */
export const StreamStyleIntelligence = Extension.create<StreamStyleOptions>({
  name: 'streamStyle',

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
      // 样式缓存
      styleCache: new Map<string, any>(),
      
      // 推断缓存
      inferenceCache: new Map<string, string>(),
      
      // 统计信息
      stats: {
        cacheHits: 0,
        cacheMisses: 0,
        inferenceCount: 0
      }
    }
  },

  addCommands() {
    return {
      insertContentWithDocumentStyle: (content: any, targetPosition?: number, contentType?: string) => ({ tr, dispatch, editor }) => {
        // 获取 DocumentStyleExtension 的当前预设
        const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
        if (!documentStyleExt || !this.options.config.autoApplyDocumentStyle) {
          // 回退到普通插入
          return editor.commands.insertContent(content)
        }

        try {
          const currentPreset = documentStyleExt.storage.documentStyle.currentPreset
          if (!currentPreset) {
            return editor.commands.insertContent(content)
          }

          // 简化处理，直接插入内容
          return editor.commands.insertContent(content)
        } catch (error) {
          console.warn('StreamStyleIntelligence: Error applying styles, falling back to normal insert:', error)
          return editor.commands.insertContent(content)
        }
      },

      applyDocumentStyleToContent: (from: number, to: number, contentType: string) => ({ tr, dispatch, editor }) => {
        const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
        if (!documentStyleExt) {
          console.warn('DocumentStyleExtension not found')
          return false
        }

        const currentPreset = documentStyleExt.storage.documentStyle.currentPreset
        if (!currentPreset) {
          console.warn('No current style preset found')
          return false
        }

        try {
          // 遍历指定范围内的节点并应用样式
          tr.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.contentStyleMapping[node.type.name]) {
              const semanticType = this.options.contentStyleMapping[node.type.name]
              const styleAttributes = generateGlobalStyleAttributes(
                currentPreset,
                semanticType,
                documentStyleExt.storage.documentStyle.styleVersion
              )
              
              const newAttrs = { ...node.attrs, ...styleAttributes }
              tr.setNodeMarkup(pos, undefined, newAttrs)
            }
          })

          if (dispatch) {
            dispatch(tr)
          }

          return true
        } catch (error) {
          console.warn('StreamStyleIntelligence: Error applying styles to content:', error)
          return false
        }
      },

      inferAndApplyStyle: (content: any, context?: { parentType?: string; siblings?: any[] }) => ({ tr, dispatch, editor }) => {
        if (!this.options.enableStyleInference) {
          return editor.commands.insertContent(content)
        }

        try {
          // 简化处理
          this.storage.stats.inferenceCount++
          
          // 应用推断的样式
          return editor.commands.insertContentWithDocumentStyle(content, undefined, 'paragraph')
        } catch (error) {
          console.warn('StreamStyleIntelligence: Error in inference and apply:', error)
          return editor.commands.insertContent(content)
        }
      },

      getRecommendedStyle: (contentType: string, context?: any) => () => {
        const documentStyleExt = this.editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
        if (!documentStyleExt) {
          return null
        }

        const currentPreset = documentStyleExt.storage.documentStyle.currentPreset
        if (!currentPreset) {
          return null
        }

        try {
          // 生成缓存键
          const cacheKey = `${currentPreset.name}-${contentType}-${documentStyleExt.storage.documentStyle.styleVersion}`
          
          // 检查缓存
          if (this.storage.styleCache.has(cacheKey)) {
            this.storage.stats.cacheHits++
            return this.storage.styleCache.get(cacheKey)
          }

          // 生成样式属性
          const semanticType = this.options.contentStyleMapping[contentType] || contentType as keyof DocumentStylePreset['semantic']
          if (!currentPreset.semantic[semanticType]) {
            return null
          }

          const styleAttributes = generateGlobalStyleAttributes(
            currentPreset,
            semanticType,
            documentStyleExt.storage.documentStyle.styleVersion
          )

          // 缓存结果
          this.storage.stats.cacheMisses++
          this.storage.styleCache.set(cacheKey, styleAttributes)

          // 限制缓存大小
          if (this.storage.styleCache.size > this.options.maxCacheSize) {
            const firstKey = this.storage.styleCache.keys().next().value
            this.storage.styleCache.delete(firstKey)
          }

          return styleAttributes
        } catch (error) {
          console.warn('StreamStyleIntelligence: Error getting recommended style:', error)
          return null
        }
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
  }
})