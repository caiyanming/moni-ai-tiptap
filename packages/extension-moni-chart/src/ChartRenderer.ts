import * as echarts from 'echarts'

import type { ChartComponent, ChartDataPoint, MoniChartConfig, MoniChartPayload } from './types.js'

/**
 * HTMLElement extended with chart cleanup capability
 */
export interface ChartContainerElement extends HTMLElement {
  chartCleanup?: () => void
}

/**
 * Chart Renderer using ECharts
 * Provides rendering for 6 chart types: BarChart, LineChart, PieChart, AreaChart, RadarChart, ScatterChart
 */
export class ChartRenderer {
  private chartInstance: echarts.ECharts | null = null

  /**
   * Renders chart into DOM element
   * @param payload MoniChartPayload from backend / ChartKit builder
   * @param element DOM element to render into
   */
  public render(payload: MoniChartPayload, element: ChartContainerElement): void {
    // Clear previous content
    element.innerHTML = ''

    try {
      // Initialize or get ECharts instance
      if (!this.chartInstance) {
        this.chartInstance = echarts.init(element)
      }

      // Generate ECharts option based on component type
      const option = this.generateOption(payload.component as ChartComponent, payload.data, payload.config)
      this.chartInstance.setOption(option, true)

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        this.chartInstance?.resize()
      })
      resizeObserver.observe(element)

      // Store cleanup function
      element.chartCleanup = () => {
        resizeObserver.disconnect()
        this.dispose()
      }
    } catch (error) {
      console.error('[ChartRenderer] Failed to render chart:', error)
      // Fallback to error message
      element.textContent = `Error rendering chart: ${error instanceof Error ? error.message : 'Unknown error'}`
      element.classList.add('chart-render-error')
    }
  }

  /**
   * Dispose chart instance
   */
  public dispose(): void {
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
  }

  /**
   * Generate ECharts option based on component type
   */
  private generateOption(
    component: ChartComponent,
    data: unknown,
    config?: MoniChartConfig,
  ): echarts.EChartsOption {
    switch (component) {
      case 'BarChart':
        return this.generateBarChartOption(data, config)
      case 'LineChart':
        return this.generateLineChartOption(data, config)
      case 'PieChart':
        return this.generatePieChartOption(data)
      case 'AreaChart':
        return this.generateAreaChartOption(data, config)
      case 'RadarChart':
        return this.generateRadarChartOption(data, config)
      case 'ScatterChart':
        return this.generateScatterChartOption(data)
      default:
        throw new Error(`Unsupported chart component: ${component}`)
    }
  }

  /**
   * Bar Chart Generator
   */
  private generateBarChartOption(data: unknown, config?: MoniChartConfig): echarts.EChartsOption {
    const { categories, series, allValues } = this.buildCategoricalSeries(data as ChartDataPoint[], 'bar', config)
    const yAxis = this.buildValueAxis(allValues, config)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisTick: { alignWithLabel: true },
      },
      yAxis,
      series,
    }

    this.applyCommonTitle(option, config)
    return option
  }

  /**
   * Line Chart Generator
   */
  private generateLineChartOption(data: unknown, config?: MoniChartConfig): echarts.EChartsOption {
    const { categories, series, allValues } = this.buildCategoricalSeries(data as ChartDataPoint[], 'line', config)
    const yAxis = this.buildValueAxis(allValues, config)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
      },
      yAxis,
      series,
    }

    this.applyCommonTitle(option, config)

    // 基准线：使用 markLine 表达（仅作用于第一条 series）
    if (config?.baselines && series.length) {
      const baseLines = config.baselines.map(b => ({
        yAxis: b.value,
        name: b.label,
        label: { formatter: b.label },
      }))
      ;(series[0] as any).markLine = {
        silent: true,
        data: baseLines,
      }
    }

    // 区间带：使用 markArea 表达（仅作用于第一条 series）
    if (config?.bands && series.length) {
      const areas = config.bands.map(band => [
        { yAxis: band.from },
        { yAxis: band.to, name: band.label },
      ])
      ;(series[0] as any).markArea = {
        silent: true,
        itemStyle: {
          color: 'rgba(52, 211, 153, 0.08)',
        },
        data: areas,
      }
    }

    return option
  }

  /**
   * Pie Chart Generator
   */
  private generatePieChartOption(data: unknown): echarts.EChartsOption {
    const dataArray = this.normalizeDataArray(data)
    const pieData = dataArray.map(item => ({
      name: item.label || item.name || '',
      value: item.value,
    }))

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          type: 'pie',
          radius: '50%',
          data: pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            formatter: '{b}: {d}%',
          },
        },
      ],
    }

    return option
  }

  /**
   * Area Chart Generator (Line chart with filled area)
   */
  private generateAreaChartOption(data: unknown, config?: MoniChartConfig): echarts.EChartsOption {
    return this.generateLineChartOption(data, { ...config, fill: true })
  }

  /**
   * Radar Chart Generator
   */
  private generateRadarChartOption(data: unknown, config?: MoniChartConfig): echarts.EChartsOption {
    const dataArray = this.normalizeDataArray(data)
    let values = dataArray.map(item => item.value)

    // Optional invert semantics (e.g. smaller ranking is better → larger area)
    if (config?.invert) {
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const sum = minVal + maxVal
      values = values.map(v => sum - v)
    }

    const maxValue = Math.max(...values)
    const indicators = dataArray.map(item => ({
      name: item.label || item.name || '',
      max: maxValue * 1.2,
    }))

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
      },
      radar: {
        indicator: indicators,
        shape: 'circle',
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: (config?.name as string) || '数据',
              areaStyle: {
                color: 'rgba(59, 130, 246, 0.3)',
              },
              lineStyle: {
                color: '#3b82f6',
              },
              itemStyle: {
                color: '#3b82f6',
              },
            },
          ],
        },
      ],
    }

    this.applyCommonTitle(option, config)
    return option
  }

  /**
   * Scatter Chart Generator
   */
  private generateScatterChartOption(data: unknown): echarts.EChartsOption {
    const dataArray = this.normalizeDataArray(data)

    const scatterData: [number, number][] = dataArray.map((item, index) => [
      Number(item.x !== undefined ? item.x : index),
      Number(item.y !== undefined ? item.y : item.value),
    ])

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const pointData = params.data as [number, number]
          return `X: ${pointData[0]}<br/>Y: ${pointData[1]}`
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: 10,
          itemStyle: {
            color: '#3b82f6',
          },
        },
      ],
    }

    return option
  }

  /**
   * Apply common title configuration for charts that support it.
   */
  private applyCommonTitle(option: echarts.EChartsOption, config?: MoniChartConfig): void {
    if (!config || config.title == null) {
      return
    }
    const rawTitle = config.title as any
    option.title =
      typeof rawTitle === 'string'
        ? { text: rawTitle, left: 'center' }
        : { left: (rawTitle as any).left ?? 'center', ...(rawTitle as echarts.EChartsOption['title']) }
  }

  /**
   * Build a value axis (typically y-axis) with sensible defaults and optional overrides
   * from MoniChartConfig.axis.y.
   *
   * - If config.axis.y.min/max 提供，则优先使用
   * - 否则根据数据自动生成一个「略高于数据范围」的区间，让相近的数据有可见差异
   */
  private buildValueAxis(values: number[], config?: MoniChartConfig): echarts.EChartsOption['yAxis'] {
    if (!values || values.length === 0) {
      return { type: 'value' }
    }

    const axisConfig = config?.axis?.y
    const hasMinOverride = typeof axisConfig?.min === 'number'
    const hasMaxOverride = typeof axisConfig?.max === 'number'

    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)

    let min = minVal
    let max = maxVal
    let range = maxVal - minVal

    if (minVal === maxVal) {
      if (minVal === 0) {
        min = 0
        max = 1
      } else {
        const delta = Math.abs(minVal) * 0.1 || 1
        min = minVal - delta
        max = minVal + delta
        if (min < 0 && minVal >= 0) {
          min = 0
        }
      }
    } else {
      range = maxVal - minVal
      if (minVal >= 0) {
        min = Math.max(0, minVal - range * 0.2)
      } else {
        min = minVal - range * 0.1
      }
      max = maxVal + range * 0.2
    }

    const yAxis: any = { type: 'value' }

    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      const roundTo = (value: number, decimals: number) =>
        Number.isFinite(value) ? Number(value.toFixed(decimals)) : value

      min = roundTo(min, 2)
      max = roundTo(max, 2)

      if (!hasMinOverride) {
        yAxis.min = min
      }
      if (!hasMaxOverride) {
        yAxis.max = max
      }
    }

    if (hasMinOverride && axisConfig) {
      yAxis.min = axisConfig.min
    }
    if (hasMaxOverride && axisConfig) {
      yAxis.max = axisConfig.max
    }
    if (axisConfig?.label) {
      yAxis.name = String(axisConfig.label)
    }

    // 根据数值范围选择合理的小数位，统一控制标签精度
    const numericRange = max - min
    let decimals = 0
    if (numericRange < 1) {
      decimals = 2
    } else if (numericRange < 10) {
      decimals = 1
    } else {
      decimals = 0
    }

    yAxis.axisLabel = {
      formatter: (val: number) => {
        if (typeof val !== 'number' || !Number.isFinite(val)) {
          return val
        }
        const rounded = Number(val.toFixed(decimals))
        return decimals === 0 ? String(rounded) : rounded.toFixed(decimals)
      },
    }

    if (config?.invert) {
      yAxis.inverse = true
    }

    return yAxis
  }

  /**
   * 规范化数据数组，允许附带 seriesName / id 等额外字段
   */
  private normalizeDataArray(data: unknown): ChartDataPoint[] {
    if (!Array.isArray(data)) {
      throw new Error('Chart data must be an array')
    }

    return data.map((item, index) => {
      if (typeof item === 'number') {
        return { label: String(index), value: item }
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        return {
          ...(obj as any),
          label: String(obj.label ?? obj.name ?? index),
          name: String(obj.name ?? obj.label ?? index),
          value: Number(obj.value ?? 0),
        }
      }
      throw new Error(`Invalid data item at index ${index}`)
    })
  }

  /**
   * 将 ChartDataPoint 分组为多 series，并生成统一的 x 轴类别
   */
  private buildCategoricalSeries(
    data: ChartDataPoint[],
    type: 'bar' | 'line',
    config?: MoniChartConfig,
  ): { categories: string[]; series: echarts.SeriesOption[]; allValues: number[] } {
    const dataArray = this.normalizeDataArray(data)

    // 所有分类标签（顺序按第一次出现）
    const categories = Array.from(new Set(dataArray.map(d => d.label || '')))

    // 分组：seriesName 不存在时，归为单一系列
    const groups = dataArray.reduce<Map<string, ChartDataPoint[]>>((acc, dp) => {
      const key = (dp as any).seriesName || config?.name || '数据'
      const list = acc.get(key) ?? []
      list.push(dp)
      acc.set(key, list)
      return acc
    }, new Map<string, ChartDataPoint[]>())

    const series: echarts.SeriesOption[] = []
    const allValues: number[] = []

    const highlightMode = config?.highlight

    groups.forEach((points, name) => {
      const map = points.reduce<Map<string, number>>((acc, p) => {
        acc.set(p.label || '', p.value)
        return acc
      }, new Map<string, number>())

      const values = categories.map(cat => {
        const v = map.get(cat)
        if (typeof v === 'number') {
          allValues.push(v)
          return v
        }
        return null
      })

      let itemStyle: echarts.SeriesOption['itemStyle'] | undefined
      if (highlightMode && values.length) {
        const numericValues = values.filter((v): v is number => typeof v === 'number')
        const max = Math.max(...numericValues)
        const min = Math.min(...numericValues)
        const maxIndex = values.findIndex(v => v === max)
        const minIndex = values.findIndex(v => v === min)

        itemStyle =
          highlightMode === 'max'
            ? {
                color: (params: { dataIndex: number }) =>
                  params.dataIndex === maxIndex ? '#ef4444' : undefined,
              }
            : {
                color: (params: { dataIndex: number }) =>
                  params.dataIndex === minIndex ? '#ef4444' : undefined,
              }
      }

      if (type === 'bar') {
        series.push({
          type: 'bar',
          name,
          data: values,
          itemStyle,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        })
      } else {
        series.push({
          type: 'line',
          name,
          data: values,
          smooth: true,
          lineStyle: {
            width: 2,
          },
          itemStyle: {},
          areaStyle: config?.fill
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
                ]),
              }
            : undefined,
        })
      }
    }

    return { categories, series, allValues }
  }
}
