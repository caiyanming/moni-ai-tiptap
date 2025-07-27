import type { Editor } from '@tiptap/core'
import { useCallback } from 'react'

import { useCurrentEditor } from './Context.js'

/**
 * useFormattingCommands Hook
 *
 * 提供基础的格式化命令，封装 TipTap 的原生命令
 * 这些命令应该与具体的扩展配置无关，提供统一的格式化接口
 *
 * 设计理念：
 * - 底层提供原子化的格式化操作
 * - 上层可以基于这些原子操作构建复杂的业务逻辑
 * - 类型安全且支持扩展配置的动态检测
 */

// Define command argument types
type CommandArgs = {
  setHeading: [{ level: 1 | 2 | 3 | 4 | 5 | 6 }]
  // Add other commands that require arguments here
  // Most commands don't need arguments, so we provide empty array as default
}

type CommandArgsFor<T extends keyof FormattingCommands> = T extends keyof CommandArgs ? CommandArgs[T] : []

export interface FormattingCommands {
  // 基础文本格式
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
  toggleCode: () => void

  // 块级格式
  setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void
  setParagraph: () => void
  setBlockquote: () => void
  setCodeBlock: () => void

  // 列表格式
  toggleBulletList: () => void
  toggleOrderedList: () => void
  toggleTaskList: () => void

  // 实用工具
  canExecuteCommand: (command: keyof FormattingCommands) => boolean
  executeCommand: <T extends keyof FormattingCommands>(command: T, ...args: CommandArgsFor<T>) => void
}

/**
 * 检查编辑器是否支持特定命令
 */
function hasCommand(editor: Editor, command: string): boolean {
  return editor.can().chain().focus()[command as keyof typeof editor.commands] !== undefined
}

/**
 * 安全执行编辑器命令
 */
function safeExecuteCommand(editor: Editor, command: string, args: unknown[] = []): boolean {
  try {
    const chain = editor.chain().focus()
    const commandFn = (chain as any)[command]

    if (typeof commandFn === 'function') {
      if (args.length > 0) {
        commandFn(...args).run()
      } else {
        commandFn().run()
      }
      return true
    }

    console.warn(`useFormattingCommands: 命令 "${command}" 不存在`)
    return false
  } catch (error) {
    console.error(`useFormattingCommands: 执行命令 "${command}" 时出错:`, error)
    return false
  }
}

export function useFormattingCommands(): FormattingCommands {
  const { editor } = useCurrentEditor()

  // ===========================================
  // 基础文本格式命令
  // ===========================================

  const toggleBold = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleBold')
  }, [editor])

  const toggleItalic = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleItalic')
  }, [editor])

  const toggleUnderline = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleUnderline')
  }, [editor])

  const toggleStrike = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleStrike')
  }, [editor])

  const toggleCode = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleCode')
  }, [editor])

  // ===========================================
  // 块级格式命令
  // ===========================================

  const setHeading = useCallback(
    (level: 1 | 2 | 3 | 4 | 5 | 6) => {
      if (!editor) {
        return
      }
      safeExecuteCommand(editor, 'setHeading', [{ level }])
    },
    [editor],
  )

  const setParagraph = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'setParagraph')
  }, [editor])

  const setBlockquote = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'setBlockquote')
  }, [editor])

  const setCodeBlock = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'setCodeBlock')
  }, [editor])

  // ===========================================
  // 列表格式命令
  // ===========================================

  const toggleBulletList = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleBulletList')
  }, [editor])

  const toggleOrderedList = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleOrderedList')
  }, [editor])

  const toggleTaskList = useCallback(() => {
    if (!editor) {
      return
    }
    safeExecuteCommand(editor, 'toggleTaskList')
  }, [editor])

  // ===========================================
  // 实用工具
  // ===========================================

  const canExecuteCommand = useCallback(
    (command: keyof FormattingCommands): boolean => {
      if (!editor) {
        return false
      }

      // 映射到实际的编辑器命令名称
      const commandMap: Record<string, string> = {
        toggleBold: 'toggleBold',
        toggleItalic: 'toggleItalic',
        toggleUnderline: 'toggleUnderline',
        toggleStrike: 'toggleStrike',
        toggleCode: 'toggleCode',
        setHeading: 'setHeading',
        setParagraph: 'setParagraph',
        setBlockquote: 'setBlockquote',
        setCodeBlock: 'setCodeBlock',
        toggleBulletList: 'toggleBulletList',
        toggleOrderedList: 'toggleOrderedList',
        toggleTaskList: 'toggleTaskList',
      }

      const actualCommand = commandMap[command]
      return actualCommand ? hasCommand(editor, actualCommand) : false
    },
    [editor],
  )

  const executeCommand = useCallback(
    <T extends keyof FormattingCommands>(command: T, ...args: CommandArgsFor<T>) => {
      if (!editor) {
        return
      }

      // 动态执行命令
      const commands: Record<string, (...args: any[]) => void> = {
        toggleBold,
        toggleItalic,
        toggleUnderline,
        toggleStrike,
        toggleCode,
        setHeading,
        setParagraph,
        setBlockquote,
        setCodeBlock,
        toggleBulletList,
        toggleOrderedList,
        toggleTaskList,
      }

      const commandFn = commands[command]
      if (commandFn) {
        commandFn(...args)
      } else {
        console.warn(`useFormattingCommands: 未知命令 "${command}"`)
      }
    },
    [
      editor,
      toggleBold,
      toggleItalic,
      toggleUnderline,
      toggleStrike,
      toggleCode,
      setHeading,
      setParagraph,
      setBlockquote,
      setCodeBlock,
      toggleBulletList,
      toggleOrderedList,
      toggleTaskList,
    ],
  )

  return {
    // 基础文本格式
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    toggleCode,

    // 块级格式
    setHeading,
    setParagraph,
    setBlockquote,
    setCodeBlock,

    // 列表格式
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,

    // 实用工具
    canExecuteCommand,
    executeCommand,
  }
}
