import type { ReactNodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import React, { useEffect, useRef } from 'react'

import { ChemicalRenderer } from './ChemicalRenderer.js'
import type { ChemistryOptions } from './types.js'

/**
 * Props for the ChemicalFormulaComponent
 */
interface ChemicalFormulaComponentProps extends ReactNodeViewProps {
  /**
   * Chemistry options for KaTeX rendering
   */
  options?: ChemistryOptions

  /**
   * Whether this is a block-level chemistry formula
   */
  isBlock?: boolean

  /**
   * Custom CSS class name
   */
  className?: string
}

/**
 * React component for rendering chemistry formulas with KaTeX + mhchem
 * Supports both inline and block chemistry formulas
 * Provides click handling and error fallback rendering
 */
export const ChemicalFormulaComponent: React.FC<ChemicalFormulaComponentProps> = ({
  node,
  getPos,
  updateAttributes,
  options = {},
  isBlock = false,
  className = '',
  ...props
}) => {
  const renderRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<ChemicalRenderer | null>(null)

  // Initialize renderer
  useEffect(() => {
    if (options.katexOptions) {
      const katexOptions = isBlock ? { ...options.katexOptions, displayMode: true } : options.katexOptions

      rendererRef.current = new ChemicalRenderer(katexOptions)
    } else {
      rendererRef.current = new ChemicalRenderer(isBlock ? { displayMode: true } : {})
    }
  }, [options.katexOptions, isBlock])

  // Render chemistry formula
  useEffect(() => {
    if (renderRef.current && rendererRef.current && node.attrs.chemical) {
      rendererRef.current.render(node.attrs.chemical, renderRef.current)
    }
  }, [node.attrs.chemical])

  // Handle click events
  const handleClick = (event: React.MouseEvent) => {
    if (options.onClick && typeof getPos === 'function') {
      event.preventDefault()
      event.stopPropagation()
      const pos = getPos()
      if (pos !== undefined) {
        options.onClick(node, pos)
      }
    }
  }

  const wrapperElement = isBlock ? 'div' : 'span'
  const baseClassName = isBlock ? 'tiptap-chemistry-render block-chemistry' : 'tiptap-chemistry-render inline-chemistry'
  const fullClassName = `${baseClassName} ${className}`.trim()

  // 🔥 拖拽/Stream 等运行时属性已移除
  // 现在通过 editor.storage.runtimeState 访问
  // 参见：packages/core/src/extensions/runtime-state.ts
  return React.createElement(
    NodeViewWrapper,
    {
      as: wrapperElement,
      className: fullClassName,
      onClick: options.onClick ? handleClick : undefined,
      'data-type': isBlock ? 'block-chemical' : 'inline-chemical',
      'data-chemical': node.attrs.chemical,
      // 🔥 仅保留 3 个持久化属性
      'data-moni-block-id': node.attrs.moniBlockId || undefined,
      'data-moni-parent-id': node.attrs.moniParentId || undefined,
      'data-moni-level': node.attrs.moniLevel !== 0 ? node.attrs.moniLevel : undefined,
      ...props,
    },
    isBlock ? <div className="block-chemical-inner" ref={renderRef} /> : <span ref={renderRef} />,
  )
}

/**
 * Inline Chemistry Formula Component
 */
export const InlineChemicalFormulaComponent: React.FC<ChemicalFormulaComponentProps> = props => {
  return <ChemicalFormulaComponent {...props} isBlock={false} />
}

/**
 * Block Chemistry Formula Component
 */
export const BlockChemicalFormulaComponent: React.FC<ChemicalFormulaComponentProps> = props => {
  return <ChemicalFormulaComponent {...props} isBlock={true} />
}

export default ChemicalFormulaComponent
