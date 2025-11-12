export interface MoniChartPayload {
  component: string
  data: any[]
  config?: Record<string, any>
}

export type ChartComponent = 'BarChart' | 'LineChart' | 'PieChart' | 'AreaChart' | 'RadarChart' | 'ScatterChart'
