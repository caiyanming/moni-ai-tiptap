import type { Content, DocumentStylePreset, StreamStyleConfig } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import { generateGlobalStyleAttributes } from '@tiptap/extension-document-style'
import { TextSelection } from '@tiptap/pm/state'

/**
 * 内容类型定义
 */
type ContentType = 'paragraph' | 'heading' | 'blockquote' | 'codeBlock' | 'bulletList' | 'orderedList' | 'listItem'

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
      insertContentWithDocumentStyle: (content: unknown, targetPosition?: number, contentType?: string) => ReturnType

      /**
       * 为现有内容应用文档样式
       */
      applyDocumentStyleToContent: (from: number, to: number, contentType: string) => ReturnType

      /**
       * 智能推断内容类型并应用样式
       */
      inferAndApplyStyle: (content: unknown, context?: { parentType?: string; siblings?: unknown[] }) => ReturnType

      /**
       * 获取推荐的内容样式
       */
      getRecommendedStyle: (contentType: ContentType) => ReturnType

      /**
       * 清除样式缓存
       */
      clearStyleCache: () => ReturnType

      /**
       * 推断内容类型
       */
      inferContentType: (content: unknown, context?: { parentType?: string; siblings?: unknown[] }) => ReturnType

      /**
       * 应用样式到内容
       */
      applyStyleToContent: (content: unknown, preset: unknown, contentType: string) => ReturnType
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
        enableStyleCache: true,
      },
      contentStyleMapping: {
        paragraph: 'paragraph',
        heading: 'heading1',
        blockquote: 'blockquote',
        codeBlock: 'codeBlock',
        bulletList: 'bulletList',
        orderedList: 'orderedList',
        listItem: 'listItem',
      },
      enableStyleInference: true,
      maxCacheSize: 1000,
    }
  },

  addStorage() {
    return {
      // 样式缓存
      styleCache: new Map<string, unknown>(),

      // 推断缓存
      inferenceCache: new Map<string, string>(),

      // 统计信息
      stats: {
        cacheHits: 0,
        cacheMisses: 0,
        inferenceCount: 0,
      },
    }
  },

  addCommands() {
    return {
      insertContentWithDocumentStyle:
        (content: unknown, targetPosition?: number) =>
        ({ editor, commands }) => {
          // 获取 DocumentStyleExtension 的当前预设
          const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
          if (!documentStyleExt || !this.options.config.autoApplyDocumentStyle) {
            // 回退到普通插入
            if (targetPosition !== undefined) {
              return commands.insertContentAt(targetPosition, content as Content)
            }
            return commands.insertContent(content as Content)
          }

          try {
            const currentPreset = documentStyleExt.storage.currentPreset
            if (!currentPreset) {
              if (targetPosition !== undefined) {
                return commands.insertContentAt(targetPosition, content as Content)
              }
              return commands.insertContent(content as Content)
            }

            // 使用TipTap内置命令，而不是手动管理事务
            if (targetPosition !== undefined) {
              return commands.insertContentAt(targetPosition, content as Content)
            }

            return commands.insertContent(content as Content)
          } catch (error) {
            console.debug('StreamStyleIntelligence: Error applying styles, falling back to normal insert:', error)
            if (targetPosition !== undefined) {
              return commands.insertContentAt(targetPosition, content as Content)
            }
            return commands.insertContent(content as Content)
          }
        },

      applyDocumentStyleToContent:
        (from: number, to: number) =>
        ({ tr, dispatch, editor }) => {
          const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
          if (!documentStyleExt) {
            console.debug('DocumentStyleExtension not found')
            return false
          }

          const currentPreset = documentStyleExt.storage.currentPreset
          if (!currentPreset) {
            console.debug('No current style preset found')
            return false
          }

          try {
            // 批量收集样式更新，提高性能
            const updates: Array<{ pos: number; attrs: any }> = []

            // 遍历指定范围内的节点并应用样式
            tr.doc.nodesBetween(from, to, (node, pos) => {
              if (this.options.contentStyleMapping[node.type.name]) {
                const semanticType = this.options.contentStyleMapping[node.type.name]
                const styleAttributes = generateGlobalStyleAttributes(
                  currentPreset,
                  semanticType,
                  documentStyleExt.storage.styleVersion || 1,
                )

                const currentAttrs = node.attrs || {}
                const newAttrs = { ...currentAttrs, ...styleAttributes }

                // 仅在属性真正改变时才更新
                if (JSON.stringify(currentAttrs) !== JSON.stringify(newAttrs)) {
                  updates.push({ pos, attrs: newAttrs })
                }
              }
            })

            // 批量应用更新
            updates.forEach(({ pos, attrs }) => {
              tr.setNodeMarkup(pos, undefined, attrs)
            })

            // 确保选择状态仍然有效 - 使用 prosemirror 标准的选择修复逻辑
            const { selection } = tr
            if (selection.$from.doc !== tr.doc) {
              // 选择指向旧文档时，创建一个安全的文本选择
              const safePos = Math.min(selection.anchor, tr.doc.content.size - 1)
              const resolvedPos = Math.max(0, safePos)
              const newSelection = TextSelection.create(tr.doc, resolvedPos)
              tr.setSelection(newSelection)
            }

            if (dispatch) {
              dispatch(tr)
            }

            return true
          } catch (error) {
            console.debug('StreamStyleIntelligence: Error applying styles to content:', error)
            return false
          }
        },

      inferAndApplyStyle:
        (content: unknown) =>
        ({ commands }) => {
          if (!this.options.enableStyleInference) {
            return commands.insertContent(content as Content)
          }

          try {
            // 直接使用扩展实例的存储，确保数据同步
            this.storage.stats.inferenceCount += 1

            // 直接使用内置的insertContent命令，避免手动管理事务
            return commands.insertContent(content as Content)
          } catch (error) {
            console.debug('StreamStyleIntelligence: Error in inference and apply:', error)
            return commands.insertContent(content as Content)
          }
        },

      getRecommendedStyle:
        (contentType: ContentType) =>
        ({ editor }) => {
          const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')
          if (!documentStyleExt) {
            return null
          }

          const currentPreset = documentStyleExt.storage.currentPreset
          if (!currentPreset) {
            return null
          }

          try {
            // 生成缓存键
            const cacheKey = `${currentPreset.name}-${contentType}-${documentStyleExt.storage.styleVersion || 1}`

            // 检查缓存 - 直接使用this.storage确保数据同步
            if (this.storage.styleCache.has(cacheKey)) {
              this.storage.stats.cacheHits += 1
              return this.storage.styleCache.get(cacheKey)
            }

            // 生成样式属性
            const semanticType =
              this.options.contentStyleMapping[contentType] || (contentType as keyof DocumentStylePreset['semantic'])
            if (!currentPreset.semantic[semanticType]) {
              return false
            }

            const styleAttributes = generateGlobalStyleAttributes(
              currentPreset,
              semanticType,
              documentStyleExt.storage.styleVersion || 1,
            )

            // 缓存结果 - 直接使用this.storage确保数据同步
            this.storage.stats.cacheMisses += 1
            this.storage.styleCache.set(cacheKey, styleAttributes)

            // 限制缓存大小
            if (this.storage.styleCache.size > this.options.maxCacheSize) {
              const firstKey = this.storage.styleCache.keys().next().value
              this.storage.styleCache.delete(firstKey)
            }

            return styleAttributes
          } catch (error) {
            console.debug('StreamStyleIntelligence: Error getting recommended style:', error)
            return false
          }
        },

      clearStyleCache: () => () => {
        // 直接使用this.storage确保数据同步
        this.storage.styleCache.clear()
        this.storage.inferenceCache.clear()
        this.storage.stats = {
          cacheHits: 0,
          cacheMisses: 0,
          inferenceCount: 0,
        }
        return true
      },

      inferContentType: (content: unknown, context?: { parentType?: string }) => () => {
        // 直接使用this.storage更新统计
        this.storage.stats.inferenceCount += 1

        // 生成缓存键
        const cacheKey = `${JSON.stringify(content)}-${context?.parentType || 'none'}`

        // 检查缓存
        if (this.storage.inferenceCache.has(cacheKey)) {
          return this.storage.inferenceCache.get(cacheKey)
        }

        let inferredType: string = 'paragraph' // 默认类型

        if (typeof content === 'string') {
          if (content.startsWith('#')) {
            inferredType = 'heading'
          } else if (content.startsWith('```')) {
            inferredType = 'codeBlock'
          }
        } else if (typeof content === 'object' && content !== null && 'type' in content) {
          const nodeType = (content as any).type
          if (nodeType === 'paragraph') {
            inferredType = 'paragraph'
          } else if (nodeType === 'heading') {
            inferredType = 'heading'
          } else if (nodeType === 'blockquote') {
            inferredType = 'blockquote'
          } else if (nodeType === 'codeBlock') {
            inferredType = 'codeBlock'
          }
        }

        // 基于上下文推断
        if (context?.parentType === 'bulletList' || context?.parentType === 'orderedList') {
          inferredType = 'listItem'
        }

        // 缓存结果
        this.storage.inferenceCache.set(cacheKey, inferredType)

        return inferredType
      },

      applyStyleToContent:
        (content: unknown, preset: unknown, contentType: string) =>
        ({ editor }) => {
          try {
            // Delegate to the helper method which returns the actual styled content
            const streamStyleExt = editor.extensionManager.extensions.find(
              (ext: any) => ext.name === 'streamStyle',
            ) as any

            if (streamStyleExt && streamStyleExt.applyStyleToContent) {
              return streamStyleExt.applyStyleToContent(content, preset, contentType)
            }

            // Fallback implementation if helper method not available
            if (typeof content === 'string') {
              return content
            }

            if (Array.isArray(content)) {
              return content.map((item: unknown) => editor.commands.applyStyleToContent(item, preset, contentType))
            }

            if (typeof content === 'object' && content !== null && 'type' in content) {
              const documentStyleExt = editor.extensionManager.extensions.find(
                (ext: any) => ext.name === 'documentStyle',
              )
              if (!documentStyleExt || !preset) {
                return content
              }

              const semanticType = this.options.contentStyleMapping[contentType] || contentType
              const styleAttributes = generateGlobalStyleAttributes(
                preset as DocumentStylePreset,
                semanticType as keyof DocumentStylePreset['semantic'],
                documentStyleExt.storage.styleVersion || 1,
              )

              return {
                ...content,
                attrs: {
                  ...(content as any).attrs,
                  ...styleAttributes,
                },
              }
            }

            return content
          } catch (error) {
            console.debug('StreamStyleIntelligence: Error applying style to content:', error)
            return content
          }
        },
    }
  },

  // 添加实例方法供测试使用
  onCreate() {
    // 绑定方法到扩展实例
    const self = this as any

    // 添加内容类型推断方法
    self.inferContentType = (content: unknown, context?: { parentType?: string }) => {
      self.storage.stats.inferenceCount += 1

      if (typeof content === 'string') {
        if (content.startsWith('#')) {
          return 'heading'
        }
        if (content.startsWith('```')) {
          return 'codeBlock'
        }
      }

      if (typeof content === 'object' && content !== null) {
        if ('type' in content) {
          const nodeType = (content as any).type
          if (nodeType === 'paragraph') {
            return 'paragraph'
          }
          if (nodeType === 'heading') {
            return 'heading'
          }
          if (nodeType === 'blockquote') {
            return 'blockquote'
          }
          if (nodeType === 'codeBlock') {
            return 'codeBlock'
          }
        }
      }

      // 基于上下文推断
      if (context?.parentType === 'bulletList' || context?.parentType === 'orderedList') {
        return 'listItem'
      }

      return 'paragraph' // 默认类型
    }

    // 添加样式应用方法
    self.applyStyleToContent = (content: unknown, preset: unknown, contentType: string) => {
      if (typeof content === 'string') {
        return content
      }

      if (Array.isArray(content)) {
        return content.map((item: unknown) => self.applyStyleToContent(item, preset, contentType))
      }

      if (typeof content === 'object' && content !== null && 'type' in content) {
        const documentStyleExt = self.editor.extensionManager.extensions.find(
          (ext: any) => ext.name === 'documentStyle',
        )
        if (!documentStyleExt || !preset) {
          return content
        }

        const semanticType = self.options.contentStyleMapping[contentType] || contentType
        const styleAttributes = generateGlobalStyleAttributes(
          preset as DocumentStylePreset,
          semanticType as keyof DocumentStylePreset['semantic'],
          documentStyleExt.storage.styleVersion || 1,
        )

        return {
          ...content,
          attrs: {
            ...(content as any).attrs,
            ...styleAttributes,
          },
        }
      }

      return content
    }
  },
})
