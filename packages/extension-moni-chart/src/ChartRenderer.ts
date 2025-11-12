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
  public render(payload: MoniChartPayload, element: HTMLElement): void {
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

      // Store cleanup function on a properly named property
      Object.defineProperty(element, 'chartCleanup', {
        value: () => {
          resizeObserver.disconnect()
          this.dispose()
        },
        configurable: true,
      })
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

    return {
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
      yAxis: {
        type: 'value',
      },
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
  }

  /**
   * Line Chart Generator
   */
  private generateLineChartOption(data: unknown, config?: Record<string, unknown>): echarts.EChartsOption {
    const dataArray = this.normalizeDataArray(data)
    const labels = dataArray.map(item => item.label || item.name || '')
    const values = dataArray.map(item => item.value)

    return {
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
      yAxis: {
        type: 'value',
      },
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

    return {
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
    const indicators = dataArray.map(item => ({
      name: item.label || item.name || '',
      max: Math.max(...dataArray.map(d => d.value)) * 1.2,
    }))
    const values = dataArray.map(item => item.value)

    return {
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

    return {
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
