import * as echarts from 'echarts'

import type { ChartComponent, MoniChartPayload } from './types.js'

interface DataItem {
  label?: string
  name?: string
  value: number
  x?: number
  y?: number
  [key: string]: unknown
}

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
   * @param payload Chart payload from backend ChartTool
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
    config?: Record<string, unknown>,
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
  private generateBarChartOption(data: unknown, config?: Record<string, unknown>): echarts.EChartsOption {
    const dataArray = this.normalizeDataArray(data)
    const labels = dataArray.map(item => item.label || item.name || '')
    const values = dataArray.map(item => item.value)

    const maxIndex = values.indexOf(Math.max(...values))
    const minIndex = values.indexOf(Math.min(...values))

    let itemStyle: any
    if (config?.highlight === 'max') {
      itemStyle = {
        color: (params: { dataIndex: number }) => (params.dataIndex === maxIndex ? '#ef4444' : '#3b82f6'),
      }
    } else if (config?.highlight === 'min') {
      itemStyle = {
        color: (params: { dataIndex: number }) => (params.dataIndex === minIndex ? '#ef4444' : '#3b82f6'),
      }
    } else {
      itemStyle = { color: '#3b82f6' }
    }

    const yAxis = this.buildValueAxis(values, config)

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
        data: labels,
        axisTick: { alignWithLabel: true },
      },
      yAxis,
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }

    this.applyCommonTitle(option, config)
    return option
  }

  /**
   * Line Chart Generator
   */
  private generateLineChartOption(data: unknown, config?: Record<string, unknown>): echarts.EChartsOption {
    const dataArray = this.normalizeDataArray(data)
    const labels = dataArray.map(item => item.label || item.name || '')
    const values = dataArray.map(item => item.value)

    const yAxis = this.buildValueAxis(values, config)

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
        data: labels,
      },
      yAxis,
      series: [
        {
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            color: '#3b82f6',
            width: 2,
          },
          itemStyle: {
            color: '#3b82f6',
          },
          areaStyle: config?.fill
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
                ]),
              }
            : undefined,
        },
      ],
    }

    this.applyCommonTitle(option, config)
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
  private generateAreaChartOption(data: unknown, config?: Record<string, unknown>): echarts.EChartsOption {
    return this.generateLineChartOption(data, { ...config, fill: true })
  }

  /**
   * Radar Chart Generator
   */
  private generateRadarChartOption(data: unknown, config?: Record<string, unknown>): echarts.EChartsOption {
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
  private applyCommonTitle(option: echarts.EChartsOption, config?: Record<string, unknown>): void {
    if (!config || !('title' in config) || config.title == null) {
      return
    }
    const rawTitle = (config as any).title
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
  private buildValueAxis(values: number[], config?: Record<string, unknown>): echarts.EChartsOption['yAxis'] {
    if (!values || values.length === 0) {
      return { type: 'value' }
    }

    const axisConfig = (config?.axis as any)?.y as any
    const hasMinOverride = typeof axisConfig?.min === 'number'
    const hasMaxOverride = typeof axisConfig?.max === 'number'

    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)

    let min = minVal
    let max = maxVal

    if (minVal === maxVal) {
      // 所有点一样：给一个小范围，避免一条“平线贴在轴上”
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
      const range = maxVal - minVal
      if (minVal >= 0) {
        // 常见的“成绩 / 计数”场景：从略低于最小值开始，但不低于 0
        min = Math.max(0, minVal - range * 0.2)
      } else {
        // 允许负值时，给上下各留一点空间
        min = minVal - range * 0.1
      }
      max = maxVal + range * 0.2
    }

    const yAxis: any = { type: 'value' }

    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      if (!hasMinOverride) {
        yAxis.min = min
      }
      if (!hasMaxOverride) {
        yAxis.max = max
      }
    }

    if (hasMinOverride) {
      yAxis.min = axisConfig.min
    }
    if (hasMaxOverride) {
      yAxis.max = axisConfig.max
    }
    if (axisConfig?.label) {
      yAxis.name = String(axisConfig.label)
    }

    return yAxis
  }

  /**
   * Normalize data array to consistent format
   */
  private normalizeDataArray(data: unknown): DataItem[] {
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
          ...obj,
          label: String(obj.label || obj.name || index),
          name: String(obj.name || obj.label || index),
          value: Number(obj.value || 0),
        }
      }
      throw new Error(`Invalid data item at index ${index}`)
    })
  }
}
