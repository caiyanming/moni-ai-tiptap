import React from 'react'

import { useReactNodeView } from './useReactNodeView.js'

export interface NodeViewWrapperProps {
  [key: string]: any
  as?: React.ElementType
}

export const NodeViewWrapper: React.FC<NodeViewWrapperProps> = React.forwardRef((props, ref) => {
  const { onDragStart } = useReactNodeView()
  const Tag = props.as || 'div'

  // 过滤并转换 DOM 属性，确保符合 React DOM 规范
  const domProps = { ...props }

  // 修复 data-moniBlockId -> data-moniblockid (React DOM 要求小写)
  if (domProps['data-moniBlockId']) {
    domProps['data-moniblockid'] = domProps['data-moniBlockId']
    delete domProps['data-moniBlockId']
  }

  // 移除不应传递给 DOM 的属性
  delete domProps.as

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
    />
  )
})
