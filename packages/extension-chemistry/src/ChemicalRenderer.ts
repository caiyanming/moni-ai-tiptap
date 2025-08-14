import type { KatexOptions } from 'katex'

import type { ChemistryRenderResult } from './types.js'
import { defaultChemistryKatexOptions,renderChemistry } from './utils.js'

/**
 * Chemical Formula Renderer with KaTeX + mhchem integration
 * Provides three-layer error handling: mhchem → regular KaTeX → plain text
 */
export class ChemicalRenderer {
  private options: KatexOptions

  constructor(options: KatexOptions = {}) {
    this.options = {
      ...defaultChemistryKatexOptions,
      ...options,
    }
  }

  /**
   * Renders chemistry formula with three-layer fallback
   * @param chemical The chemistry formula to render
   * @param element The DOM element to render into
   * @param customOptions Optional custom KaTeX options
   * @returns Render result
   */
  public render(chemical: string, element: HTMLElement, customOptions: KatexOptions = {}): ChemistryRenderResult {
    const options = { ...this.options, ...customOptions }
    const result = renderChemistry(chemical, options)

    // Clear previous content
    element.innerHTML = ''
    element.className = element.className.replace(/\b(chemistry-render-success|chemistry-render-error)\b/g, '')

    if (result.success && result.html) {
      // Successful render
      element.innerHTML = result.html
      element.classList.add('chemistry-render-success')
      element.setAttribute('data-chemistry-original', chemical)
    } else {
      // Fallback to plain text
      element.textContent = result.fallback
      element.classList.add('chemistry-render-error')
      element.setAttribute('data-chemistry-original', chemical)
      element.setAttribute('data-chemistry-error', result.error || 'Unknown error')
    }

    return result
  }

  /**
   * Updates KaTeX options
   * @param newOptions New options to merge
   */
  public updateOptions(newOptions: KatexOptions): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Gets current options
   * @returns Current KaTeX options
   */
  public getOptions(): KatexOptions {
    return { ...this.options }
  }

  /**
   * Creates a new renderer with different options
   * @param options New options
   * @returns New ChemicalRenderer instance
   */
  public static create(options: KatexOptions = {}): ChemicalRenderer {
    return new ChemicalRenderer(options)
  }

  /**
   * Renders chemistry formula to string (for SSR)
   * @param chemical The chemistry formula to render
   * @param customOptions Optional custom KaTeX options
   * @returns Render result
   */
  public renderToString(chemical: string, customOptions: KatexOptions = {}): ChemistryRenderResult {
    const options = { ...this.options, ...customOptions }
    return renderChemistry(chemical, options)
  }

  /**
   * Creates a preview element for chemistry formula
   * @param chemical The chemistry formula
   * @param className Optional CSS class
   * @returns DOM element with rendered chemistry
   */
  public createPreview(chemical: string, className: string = ''): HTMLElement {
    const element = document.createElement('span')
    if (className) {
      element.className = className
    }

    this.render(chemical, element)
    return element
  }

  /**
   * Validates if a chemistry formula can be rendered
   * @param chemical The chemistry formula to validate
   * @returns True if the formula can be rendered successfully
   */
  public canRender(chemical: string): boolean {
    const result = this.renderToString(chemical)
    return result.success
  }
}
