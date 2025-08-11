import React from 'react'

import { useReactNodeView } from './useReactNodeView.js'

export interface NodeViewWrapperProps {
  [key: string]: any
  as?: React.ElementType
}

export const NodeViewWrapper: React.FC<NodeViewWrapperProps> = React.forwardRef((props, ref) => {
  const { onDragStart } = useReactNodeView()
  const { children, as = 'div', ...rest } = props
  const Tag = as

  // 过滤并转换 DOM 属性，确保符合 React DOM 规范
  const domProps: Record<string, any> = {}

  // 允许的 DOM 属性列表
  const allowedProps = [
    'id',
    'className',
    'style',
    'title',
    'role',
    'tabIndex',
    'onClick',
    'onMouseDown',
    'onMouseUp',
    'onKeyDown',
    'onKeyUp',
    'onFocus',
    'onBlur',
    'aria-',
    'data-',
  ]

  Object.keys(rest).forEach(key => {
    // 特殊处理 data-moniBlockId: 转换为小写版本
    if (key === 'data-moniBlockId') {
      domProps['data-moniblockid'] = rest[key]
      // 不添加原始的 data-moniBlockId
      return
    }

    // 允许以 data- 或 aria- 开头的属性
    if (key.startsWith('data-') || key.startsWith('aria-')) {
      domProps[key] = rest[key]
    }
    // 允许明确列出的属性
    else if (allowedProps.includes(key)) {
      domProps[key] = rest[key]
    }
    // 其他属性被过滤掉（如 customProp）
  })

  return (
    // @ts-ignore
    <Tag
      {...domProps}
      ref={ref}
      data-node-view-wrapper=""
      onDragStart={onDragStart}
      style={{
        whiteSpace: 'normal',
        ...props.style,
      }}
    >
      {children}
    </Tag>
  )
})
