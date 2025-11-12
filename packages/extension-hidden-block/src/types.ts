/**
 * NULL_UUID constant - The permanent anchor point identifier
 * This UUID is reserved for the hidden block that serves as the AI insertion anchor
 */
export const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080'

/**
 * Attributes for the hidden block node
 *
 * 🔥 DESIGN PHILOSOPHY: HiddenBlock vs Paragraph
 * ============================================
 *
 * HiddenBlock 是一个特殊的**固定锚点**，不是普通内容块：
 *
 * 1. **固定身份**：所有属性都是常量（NULL_UUID），不需要动态生成 ID
 * 2. **不参与层级**：永远在文档开头（position 0），不需要 moniParentId/moniLevel
 * 3. **纯粹锚点**：仅用于 AI Stream 操作的插入点定位
 *
 * 对比 Paragraph（普通块）：
 * - ✅ moniBlockId: 动态生成，每个块唯一
 * - ✅ moniParentId: 记录父级关系
 * - ✅ moniLevel: 记录层级深度
 *
 * 对比 HiddenBlock（固定锚点）：
 * - ❌ 不需要 moniParentId/moniLevel（不参与层级结构）
 * - ✅ 只需要固定的 NULL_UUID 作为永久锚点
 *
 * 🔥 运行时属性分离
 * ==================
 * 拖拽、Stream 等运行时状态已移除，现在通过 RuntimeState 访问：
 * - editor.storage.runtimeState.dragEnabled
 * - editor.storage.runtimeState.streamMode
 * 参见：packages/core/src/extensions/runtime-state.ts
 */
export interface HiddenBlockAttributes {
  /**
   * Block ID - Always set to NULL_UUID
   */
  id: string

  /**
   * Moni block ID - Always set to NULL_UUID for the anchor point
   */
  moniBlockId: string

  /**
   * Hidden flag - Always true to prevent rendering
   */
  hidden: boolean

  /**
   * Initial block flag - Marks this as the document's anchor point
   */
  isInitialBlock: boolean
}

/**
 * Default attributes for the hidden block
 * These values are enforced by the guardian plugin
 */
export const DEFAULT_HIDDEN_BLOCK_ATTRS: HiddenBlockAttributes = {
  id: NULL_UUID,
  moniBlockId: NULL_UUID,
  hidden: true,
  isInitialBlock: true,
}
