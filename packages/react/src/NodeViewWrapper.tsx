import React from 'react'

import { useReactNodeView } from './useReactNodeView.js'
import { normalizeDOMAttributes } from './utils/domAttributeNormalizer.js'

export interface NodeViewWrapperProps {
  [key: string]: any
  as?: React.ElementType
}

export const NodeViewWrapper: React.FC<NodeViewWrapperProps> = React.forwardRef((props, ref) => {
  const { onDragStart } = useReactNodeView()
  const { children, as = 'div', ...rest } = props
  const Tag = as

  // 使用统一的属性规范化器，确保DOM属性符合React规范
  const domProps = normalizeDOMAttributes(rest)

  return React.createElement(
    Tag,
    {
      ...domProps,
      ref,
      'data-node-view-wrapper': '',
      onDragStart,
      style: {
        whiteSpace: 'normal',
        ...props.style,
      },
    },
    children,
  )
})
