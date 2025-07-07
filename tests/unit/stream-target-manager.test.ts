import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Editor } from '../../packages/core/src/Editor'
import { StreamTargetManager } from '../../packages/core/src/StreamTargetManager.js'
import { cleanupDOM, createMockEditor } from './test-utils.js'

describe('StreamTargetManager', () => {
  let editor: Editor
  let manager: StreamTargetManager

  beforeEach(() => {
    editor = createMockEditor()
    manager = new StreamTargetManager(editor)
  })

  afterEach(() => {
    if (manager && typeof manager.destroy === 'function') {
      manager.destroy()
    }
    cleanupDOM()
  })

  describe('初始化', () => {
    it('应该正确初始化管理器', () => {
      expect(manager).toBeDefined()
      expect(manager.getCurrentTarget()).toBeNull()
    })

    it('应该创建视觉指示器', () => {
      const managerWithIndicator = new StreamTargetManager(editor, {
        enableVisualIndicator: true,
      })
      expect(managerWithIndicator).toBeDefined()

      // 清理资源
      managerWithIndicator.destroy()
    })

    it('应该支持禁用视觉指示器', () => {
      const managerWithoutIndicator = new StreamTargetManager(editor, {
        enableVisualIndicator: false,
      })
      expect(managerWithoutIndicator).toBeDefined()

      // 清理资源
      managerWithoutIndicator.destroy()
    })
  })

  describe('目标设置', () => {
    it('应该能设置流式目标', () => {
      const result = manager.setStreamTarget('block-1', 'session-1')
      expect(result).toBe(true)

      const target = manager.getCurrentTarget()
      expect(target).toBeDefined()
      expect(target?.blockId).toBe('block-1')
      expect(target?.sessionId).toBe('session-1')
    })

    it('应该拒绝不存在的块ID', () => {
      const result = manager.setStreamTarget('nonexistent-block', 'session-1')
      expect(result).toBe(false)
      expect(manager.getCurrentTarget()).toBeNull()
    })

    it('应该能检查当前目标', () => {
      manager.setStreamTarget('block-1', 'session-1')

      expect(manager.isCurrentTarget('block-1')).toBe(true)
      expect(manager.isCurrentTarget('block-2')).toBe(false)
    })

    it('应该能获取目标配置', () => {
      manager.setStreamTarget('block-1', 'session-1')

      const config = manager.getTargetConfig()
      expect(config).toBeDefined()
      expect(config?.streamType).toBe('text')
      expect(config?.streamMode).toBe('replace')
    })

    it('应该在没有目标时返回null配置', () => {
      const config = manager.getTargetConfig()
      expect(config).toBeNull()
    })
  })

  describe('目标清除', () => {
    it('应该能清除流式目标', () => {
      manager.setStreamTarget('block-1', 'session-1')
      expect(manager.getCurrentTarget()).toBeDefined()

      manager.clearStreamTarget()
      expect(manager.getCurrentTarget()).toBeNull()
    })

    it('应该能安全地清除空目标', () => {
      expect(() => {
        manager.clearStreamTarget()
      }).not.toThrow()
    })

    it('应该在设置新目标时自动清除旧目标', () => {
      manager.setStreamTarget('block-1', 'session-1')
      expect(manager.getCurrentTarget()?.blockId).toBe('block-1')

      manager.setStreamTarget('block-2', 'session-2')
      expect(manager.getCurrentTarget()?.blockId).toBe('block-2')
    })
  })

  describe('智能切换', () => {
    it('应该支持防抖切换', async () => {
      const spy = vi.spyOn(manager, 'setStreamTarget')

      manager.switchTarget('block-1', 'session-1')
      expect(spy).not.toHaveBeenCalled()

      // 等待防抖时间
      await new Promise(resolve => {
        setTimeout(resolve, 150)
      })

      expect(spy).toHaveBeenCalledWith('block-1', 'session-1')
    })

    it('应该能取消之前的防抖切换', async () => {
      const spy = vi.spyOn(manager, 'setStreamTarget')

      manager.switchTarget('block-1', 'session-1')
      manager.switchTarget('block-2', 'session-2')

      await new Promise(resolve => {
        setTimeout(resolve, 150)
      })

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('block-2', 'session-2')
    })
  })

  describe('调试模式', () => {
    it('应该在调试模式下输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const debugManager = new StreamTargetManager(editor, {
        debug: true,
      })

      debugManager.setStreamTarget('block-1', 'session-1')

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[StreamTargetManager]'))

      consoleSpy.mockRestore()
      debugManager.destroy()
    })

    it('应该在非调试模式下不输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const normalManager = new StreamTargetManager(editor, {
        debug: false,
      })

      normalManager.setStreamTarget('block-1', 'session-1')

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('[StreamTargetManager]'))

      consoleSpy.mockRestore()
      normalManager.destroy()
    })
  })

  describe('视觉指示器', () => {
    it('应该在设置目标时显示指示器', () => {
      const managerWithIndicator = new StreamTargetManager(editor, {
        enableVisualIndicator: true,
      })

      managerWithIndicator.setStreamTarget('block-1', 'session-1')

      // 检查是否有指示器元素被创建
      const indicator = document.querySelector('.moni-stream-target-indicator')
      expect(indicator).toBeDefined()

      // 清理资源
      managerWithIndicator.destroy()
    })

    it('应该在清除目标时隐藏指示器', () => {
      const managerWithIndicator = new StreamTargetManager(editor, {
        enableVisualIndicator: true,
      })

      managerWithIndicator.setStreamTarget('block-1', 'session-1')
      managerWithIndicator.clearStreamTarget()

      const indicator = document.querySelector('.moni-stream-target-indicator')
      if (indicator) {
        expect((indicator as HTMLElement).style.opacity).toBe('0')
      }

      // 清理资源
      managerWithIndicator.destroy()
    })
  })

  describe('节点属性更新', () => {
    it('应该更新目标节点的流式属性', () => {
      const dispatchSpy = vi.spyOn(editor.view, 'dispatch')

      manager.setStreamTarget('block-1', 'session-1')

      expect(dispatchSpy).toHaveBeenCalled()

      const transaction = dispatchSpy.mock.calls[0][0]
      expect(transaction.steps).toHaveLength(1)
    })

    it('应该在清除目标时重置节点属性', () => {
      const dispatchSpy = vi.spyOn(editor.view, 'dispatch')

      manager.setStreamTarget('block-1', 'session-1')
      dispatchSpy.mockClear()

      manager.clearStreamTarget()

      expect(dispatchSpy).toHaveBeenCalled()
    })
  })

  describe('配置选项', () => {
    it('应该支持自定义防抖延迟', async () => {
      const fastManager = new StreamTargetManager(editor, {
        debounceDelay: 50,
      })

      const spy = vi.spyOn(fastManager, 'setStreamTarget')

      fastManager.switchTarget('block-1', 'session-1')

      await new Promise(resolve => {
        setTimeout(resolve, 60)
      })

      expect(spy).toHaveBeenCalledWith('block-1', 'session-1')

      // 清理资源
      fastManager.destroy()
    })

    it('应该支持自定义样式配置', () => {
      const customManager = new StreamTargetManager(editor, {
        enableVisualIndicator: true,
        progressBarStyle: {
          height: '4px',
          backgroundColor: '#f0f0f0',
          progressColor: '#ff0000',
          borderRadius: '2px',
        },
      })

      expect(customManager).toBeDefined()

      // 清理资源
      customManager.destroy()
    })
  })

  describe('生命周期', () => {
    it('应该能正确销毁管理器', () => {
      manager.setStreamTarget('block-1', 'session-1')

      expect(() => {
        manager.destroy()
      }).not.toThrow()

      expect(manager.getCurrentTarget()).toBeNull()
    })

    it('应该在销毁时清理所有资源', () => {
      // 记录创建前的指示器数量
      const initialIndicatorCount = document.querySelectorAll('.moni-stream-target-indicator').length

      const managerWithIndicator = new StreamTargetManager(editor, {
        enableVisualIndicator: true,
      })

      // 确保新的指示器已经被创建
      let indicators = document.querySelectorAll('.moni-stream-target-indicator')
      expect(indicators.length).toBe(initialIndicatorCount + 1)

      managerWithIndicator.setStreamTarget('block-1', 'session-1')
      managerWithIndicator.destroy()

      // 检查指示器是否被移除，应该回到初始数量
      indicators = document.querySelectorAll('.moni-stream-target-indicator')
      expect(indicators.length).toBe(initialIndicatorCount)
    })
  })
})
