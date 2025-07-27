import { useMemo } from 'react'

import { useCurrentEditor } from './Context.js'

/**
 * useStreamOperationManager Hook
 *
 * 零映射架构设计：
 * 1. 直接返回 editor.streamOperationManager 实例
 * 2. 不做任何参数转换或API包装
 * 3. 完全暴露原生 StreamOperationManager API
 * 4. 依赖 useCurrentEditor 获取编辑器实例
 *
 * 使用示例：
 * ```typescript
 * function MyComponent() {
 *   const streamManager = useStreamOperationManager();
 *
 *   // 直接使用原生API
 *   const pendingOps = streamManager?.getPendingOperations() || [];
 *
 *   const handleApprove = (operationId: string) => {
 *     streamManager?.approveOperation(operationId);
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * @returns StreamOperationManager实例或null（如果editor不存在）
 */
export function useStreamOperationManager() {
  const { editor } = useCurrentEditor()

  return useMemo(() => {
    return editor?.streamOperationManager || null
  }, [editor])
}
