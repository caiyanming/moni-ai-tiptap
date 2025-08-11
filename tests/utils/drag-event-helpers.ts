/**
 * JSDOM 兼容的拖拽事件创建工具
 * 
 * 解决 JSDOM v25.0.1 中 dispatchEvent 类型检查问题
 */

interface DragEventOptions {
  dataTransfer?: DataTransfer | null
  clientX?: number
  clientY?: number
  screenX?: number
  screenY?: number
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  button?: number
  buttons?: number
  relatedTarget?: EventTarget | null
  bubbles?: boolean
  cancelable?: boolean
}

/**
 * 创建 JSDOM 兼容的拖拽事件
 * 使用 CustomEvent + Object.assign 方式避免 JSDOM 类型检查问题
 */
export function createCompatibleDragEvent(
  type: string, 
  options: DragEventOptions = {}
): DragEvent {
  // 创建基础的 CustomEvent，JSDOM 会正确识别
  const event = new CustomEvent(type, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? true,
  }) as any
  
  // 设置 MouseEvent 属性
  Object.assign(event, {
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    screenX: options.screenX ?? 0,
    screenY: options.screenY ?? 0,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    altKey: options.altKey ?? false,
    metaKey: options.metaKey ?? false,
    button: options.button ?? 0,
    buttons: options.buttons ?? 0,
    relatedTarget: options.relatedTarget ?? null,
  })
  
  // 设置 DragEvent 特有属性
  Object.assign(event, {
    dataTransfer: options.dataTransfer ?? new DataTransfer(),
  })
  
  return event as DragEvent
}

/**
 * 创建拖拽开始事件
 */
export function createDragStartEvent(options: DragEventOptions = {}): DragEvent {
  return createCompatibleDragEvent('dragstart', {
    dataTransfer: new DataTransfer(),
    ...options,
  })
}

/**
 * 创建拖拽结束事件
 */
export function createDragEndEvent(options: DragEventOptions = {}): DragEvent {
  return createCompatibleDragEvent('dragend', {
    dataTransfer: new DataTransfer(),
    ...options,
  })
}

/**
 * 创建完整的拖拽事件序列
 */
export function createDragEventSequence(options: DragEventOptions = {}) {
  const dataTransfer = options.dataTransfer || new DataTransfer()
  
  return {
    dragStart: createCompatibleDragEvent('dragstart', {
      dataTransfer,
      ...options,
    }),
    dragOver: createCompatibleDragEvent('dragover', {
      dataTransfer,
      ...options,
    }),
    drop: createCompatibleDragEvent('drop', {
      dataTransfer,
      ...options,
    }),
    dragEnd: createCompatibleDragEvent('dragend', {
      dataTransfer,
      ...options,
    }),
  }
}