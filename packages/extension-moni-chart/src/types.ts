export type ChartComponent = 'BarChart' | 'LineChart' | 'PieChart' | 'AreaChart' | 'RadarChart' | 'ScatterChart'

export interface ChartDataPoint {
  label?: string
  name?: string
  value: number
  x?: number
  y?: number
  // 预留扩展字段，例如 seriesName/id 等
  [key: string]: unknown
}

export interface AxisConfig {
  label?: string
  min?: number
  max?: number
  tickFormat?: string
}

export interface MoniChartConfig {
  title?:
    | string
    | {
        text: string
        subtext?: string
        align?: 'left' | 'center' | 'right'
      }

  axis?: {
    x?: AxisConfig
    y?: AxisConfig
  }

  legend?: {
    show?: boolean
    position?: 'top' | 'bottom' | 'left' | 'right'
  }

  tooltip?: {
    valueFormat?: string
    labelFormat?: string
  }

  colors?: Record<string, string> | string[]

  // 多系列基准线 & 分段带（主要由 ChartKit 使用）
  baselines?: {
    label: string
    value: number
    styleId?: string
  }[]

  bands?: {
    from: number
    to: number
    label?: string
    styleId?: string
  }[]

  // 高亮 / 填充 / 系列名称
  highlight?: 'max' | 'min'
  fill?: boolean
  name?: string

  // 排名/用时类指标的“越小越好”语义
  invert?: boolean

  // 预留扩展
  [key: string]: unknown
}

export interface MoniChartPayload {
  component: ChartComponent
  data: ChartDataPoint[]
  config?: MoniChartConfig
}
