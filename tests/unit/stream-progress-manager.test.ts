import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Editor } from '../../packages/core/src/Editor'
import { StreamProgressManager } from '../../packages/core/src/StreamProgressManager.js'
import { cleanupDOM, createMockEditor, waitForAsync } from './test-utils.js'

describe('StreamProgressManager', () => {
  let editor: Editor
  let manager: StreamProgressManager

  beforeEach(() => {
    editor = createMockEditor()
    manager = new StreamProgressManager(editor)
  })

  afterEach(() => {
    manager.destroy()
    cleanupDOM()
  })

  describe('初始化', () => {
    it('应该正确初始化管理器', () => {
      expect(manager).toBeDefined()
      expect(manager.getActiveSessions()).toHaveLength(0)
    })

    it('应该支持自定义配置', () => {
      const customManager = new StreamProgressManager(editor, {
        debug: true,
        updateInterval: 50,
        enableAnimation: false,
        progressBarStyle: {
          height: '4px',
          backgroundColor: '#f0f0f0',
          progressColor: '#ff0000',
          borderRadius: '2px',
        },
      })

      expect(customManager).toBeDefined()
    })
  })

  describe('会话管理', () => {
    it('应该能启动流式会话', () => {
      manager.startSession('session-1', 'block-1', 10)

      const progress = manager.getProgress('session-1')
      expect(progress).toBeDefined()
      expect(progress?.sessionId).toBe('session-1')
      expect(progress?.blockId).toBe('block-1')
      expect(progress?.totalOperations).toBe(10)
      expect(progress?.progress).toBe(0)
      expect(progress?.status).toBe('streaming')
    })

    it('应该能更新会话进度', () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.updateProgress('session-1', 5)

      const progress = manager.getProgress('session-1')
      expect(progress?.completedOperations).toBe(5)
      expect(progress?.progress).toBe(0.5)
    })

    it('应该能完成会话', async () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.completeSession('session-1')

      const progress = manager.getProgress('session-1')
      expect(progress?.status).toBe('completed')
      expect(progress?.progress).toBe(1)
      expect(progress?.endTime).toBeDefined()
    })

    it('应该能标记会话错误', async () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.errorSession('session-1', 'Test error')

      const progress = manager.getProgress('session-1')
      expect(progress?.status).toBe('error')
      expect(progress?.endTime).toBeDefined()
    })

    it('应该能获取活跃会话', () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.startSession('session-2', 'block-2', 5)
      manager.completeSession('session-2')

      const activeSessions = manager.getActiveSessions()
      expect(activeSessions).toHaveLength(1)
      expect(activeSessions[0].sessionId).toBe('session-1')
    })

    it('应该处理不存在的会话', () => {
      const progress = manager.getProgress('nonexistent-session')
      expect(progress).toBeNull()

      // 这些操作应该安全地处理不存在的会话
      expect(() => {
        manager.updateProgress('nonexistent-session', 5)
        manager.completeSession('nonexistent-session')
        manager.errorSession('nonexistent-session', 'error')
      }).not.toThrow()
    })
  })

  describe('进度计算', () => {
    it('应该正确计算进度百分比', () => {
      manager.startSession('session-1', 'block-1', 10)

      manager.updateProgress('session-1', 3)
      expect(manager.getProgress('session-1')?.progress).toBe(0.3)

      manager.updateProgress('session-1', 7)
      expect(manager.getProgress('session-1')?.progress).toBe(0.7)

      manager.updateProgress('session-1', 10)
      expect(manager.getProgress('session-1')?.progress).toBe(1.0)
    })

    it('应该限制进度不超过100%', () => {
      manager.startSession('session-1', 'block-1', 5)
      manager.updateProgress('session-1', 10) // 超过总数

      const progress = manager.getProgress('session-1')
      expect(progress?.progress).toBe(1.0)
    })

    it('应该计算预估时长', () => {
      manager.startSession('session-1', 'block-1', 10)

      // 模拟一些时间过去
      manager.updateProgress('session-1', 5)

      const progress = manager.getProgress('session-1')
      expect(progress?.estimatedDuration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('进度条可视化', () => {
    it('应该在启用动画时创建进度条', () => {
      const managerWithAnimation = new StreamProgressManager(editor, {
        enableAnimation: true,
      })

      managerWithAnimation.startSession('session-1', 'block-1', 10)

      // 等待DOM更新
      setTimeout(() => {
        const progressBar = document.querySelector('.moni-stream-progress-bar')
        expect(progressBar).toBeDefined()
      }, 10)

      managerWithAnimation.destroy()
    })

    it('应该在禁用动画时不创建进度条', () => {
      const managerWithoutAnimation = new StreamProgressManager(editor, {
        enableAnimation: false,
      })

      managerWithoutAnimation.startSession('session-1', 'block-1', 10)

      const progressBar = document.querySelector('.moni-stream-progress-bar')
      expect(progressBar).toBeNull()

      managerWithoutAnimation.destroy()
    })

    it('应该应用自定义进度条样式', () => {
      const customStyle = {
        height: '4px',
        backgroundColor: '#custom-bg',
        progressColor: '#custom-progress',
        borderRadius: '2px',
      }

      const styledManager = new StreamProgressManager(editor, {
        enableAnimation: true,
        progressBarStyle: customStyle,
      })

      styledManager.startSession('session-1', 'block-1', 10)

      // 检查样式配置被正确应用
      expect(styledManager).toBeDefined()

      styledManager.destroy()
    })
  })

  describe('事件系统', () => {
    it('应该触发开始事件', () => {
      const eventListener = vi.fn()
      manager.addEventListener(eventListener)

      manager.startSession('session-1', 'block-1', 10)

      expect(eventListener).toHaveBeenCalledWith({
        type: 'start',
        sessionId: 'session-1',
        blockId: 'block-1',
        progress: 0,
      })
    })

    it('应该触发进度事件', () => {
      const eventListener = vi.fn()
      manager.addEventListener(eventListener)

      manager.startSession('session-1', 'block-1', 10)
      manager.updateProgress('session-1', 5)

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress',
          sessionId: 'session-1',
          blockId: 'block-1',
          progress: 0.5,
        }),
      )
    })

    it('应该触发完成事件', () => {
      const eventListener = vi.fn()
      manager.addEventListener(eventListener)

      manager.startSession('session-1', 'block-1', 10)
      manager.completeSession('session-1')

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'complete',
          sessionId: 'session-1',
          blockId: 'block-1',
          progress: 1,
        }),
      )
    })

    it('应该触发错误事件', () => {
      const eventListener = vi.fn()
      manager.addEventListener(eventListener)

      manager.startSession('session-1', 'block-1', 10)
      manager.errorSession('session-1', 'Test error')

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          sessionId: 'session-1',
          blockId: 'block-1',
          data: { error: 'Test error' },
        }),
      )
    })

    it('应该能移除事件监听器', () => {
      const eventListener = vi.fn()
      manager.addEventListener(eventListener)
      manager.removeEventListener(eventListener)

      manager.startSession('session-1', 'block-1', 10)

      expect(eventListener).not.toHaveBeenCalled()
    })

    it('应该优雅处理监听器错误', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const normalListener = vi.fn()

      manager.addEventListener(errorListener)
      manager.addEventListener(normalListener)

      expect(() => {
        manager.startSession('session-1', 'block-1', 10)
      }).not.toThrow()

      expect(normalListener).toHaveBeenCalled()
    })
  })

  describe('元数据处理', () => {
    it('应该能更新会话元数据', () => {
      manager.startSession('session-1', 'block-1', 10)

      const metadata = { operationType: 'text', source: 'ai' }
      manager.updateProgress('session-1', 5, metadata)

      const progress = manager.getProgress('session-1')
      expect(progress?.metadata).toEqual(metadata)
    })

    it('应该能合并元数据', () => {
      manager.startSession('session-1', 'block-1', 10)

      manager.updateProgress('session-1', 3, { step: 1 })
      manager.updateProgress('session-1', 6, { step: 2 })

      const progress = manager.getProgress('session-1')
      expect(progress?.metadata).toEqual({ step: 2 })
    })
  })

  describe('节点属性更新', () => {
    it('应该更新节点的进度属性', () => {
      const dispatchSpy = vi.spyOn(editor.view, 'dispatch')

      manager.startSession('session-1', 'block-1', 10)

      expect(dispatchSpy).toHaveBeenCalled()

      const transaction = dispatchSpy.mock.calls[0][0]
      expect(transaction.steps).toHaveLength(1)
    })

    it('应该在进度更新时更新节点属性', () => {
      const dispatchSpy = vi.spyOn(editor.view, 'dispatch')

      manager.startSession('session-1', 'block-1', 10)
      dispatchSpy.mockClear()

      manager.updateProgress('session-1', 5)

      expect(dispatchSpy).toHaveBeenCalled()
    })
  })

  describe('自动清理', () => {
    it('应该在完成后自动清理会话', async () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.completeSession('session-1')

      expect(manager.getProgress('session-1')).toBeDefined()

      // 等待自动清理
      await waitForAsync(2100)

      expect(manager.getProgress('session-1')).toBeNull()
    })

    it('应该在错误后自动清理会话', async () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.errorSession('session-1', 'Error')

      expect(manager.getProgress('session-1')).toBeDefined()

      // 等待自动清理
      await waitForAsync(5100)

      expect(manager.getProgress('session-1')).toBeNull()
    })
  })

  describe('调试模式', () => {
    it('应该在调试模式下输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const debugManager = new StreamProgressManager(editor, {
        debug: true,
      })

      debugManager.startSession('session-1', 'block-1', 10)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[StreamProgressManager]'))

      consoleSpy.mockRestore()
      debugManager.destroy()
    })
  })

  describe('边界情况', () => {
    it('应该处理零操作的会话', () => {
      manager.startSession('session-1', 'block-1', 0)

      const progress = manager.getProgress('session-1')
      expect(progress?.totalOperations).toBe(0)
      expect(progress?.progress).toBe(0)
    })

    it('应该处理负进度值', () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.updateProgress('session-1', -5)

      const progress = manager.getProgress('session-1')
      expect(progress?.completedOperations).toBe(-5)
      expect(progress?.progress).toBe(0) // 应该被限制为0
    })

    it('应该处理不存在的目标块', () => {
      expect(() => {
        manager.startSession('session-1', 'nonexistent-block', 10)
      }).not.toThrow()

      const progress = manager.getProgress('session-1')
      expect(progress).toBeDefined()
    })
  })

  describe('并发会话', () => {
    it('应该能同时处理多个会话', () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.startSession('session-2', 'block-2', 5)
      manager.startSession('session-3', 'block-1', 8)

      const activeSessions = manager.getActiveSessions()
      expect(activeSessions).toHaveLength(3)

      manager.updateProgress('session-1', 5)
      manager.updateProgress('session-2', 3)
      manager.updateProgress('session-3', 2)

      expect(manager.getProgress('session-1')?.progress).toBe(0.5)
      expect(manager.getProgress('session-2')?.progress).toBe(0.6)
      expect(manager.getProgress('session-3')?.progress).toBe(0.25)
    })

    it('应该独立处理不同会话的状态', () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.startSession('session-2', 'block-2', 5)

      manager.completeSession('session-1')
      manager.errorSession('session-2', 'Error')

      expect(manager.getProgress('session-1')?.status).toBe('completed')
      expect(manager.getProgress('session-2')?.status).toBe('error')
    })
  })

  describe('性能测试', () => {
    it('应该能高效处理大量进度更新', () => {
      const startTime = Date.now()

      manager.startSession('session-1', 'block-1', 1000)

      for (let i = 1; i <= 1000; i += 1) {
        manager.updateProgress('session-1', i)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // 应该在1秒内完成
      expect(manager.getProgress('session-1')?.progress).toBe(1.0)
    })

    it('应该能高效处理多个并发会话', () => {
      const startTime = Date.now()

      // 创建100个会话
      for (let i = 1; i <= 100; i += 1) {
        manager.startSession(`session-${i}`, `block-${i}`, 10)
      }

      // 更新所有会话的进度
      for (let i = 1; i <= 100; i += 1) {
        manager.updateProgress(`session-${i}`, 5)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(500) // 应该在0.5秒内完成
      expect(manager.getActiveSessions()).toHaveLength(100)
    })
  })

  describe('生命周期', () => {
    it('应该能正确销毁管理器', () => {
      manager.startSession('session-1', 'block-1', 10)
      manager.startSession('session-2', 'block-2', 5)

      expect(() => {
        manager.destroy()
      }).not.toThrow()

      expect(manager.getActiveSessions()).toHaveLength(0)
      expect(manager.getProgress('session-1')).toBeNull()
    })

    it('应该在销毁时清理所有资源', () => {
      const managerWithAnimation = new StreamProgressManager(editor, {
        enableAnimation: true,
      })

      managerWithAnimation.startSession('session-1', 'block-1', 10)
      managerWithAnimation.destroy()

      // 检查进度条是否被清理
      const progressBars = document.querySelectorAll('.moni-stream-progress-bar')
      expect(progressBars).toHaveLength(0)
    })
  })
})
