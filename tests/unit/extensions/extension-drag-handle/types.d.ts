/// <reference types="vitest" />
/// <reference types="vitest/globals" />

declare global {
  interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R
    toHaveClass(className: string): R
  }

  namespace NodeJS {
    interface Global {
      DragEvent: typeof DragEvent
      DataTransfer: typeof DataTransfer
      IntersectionObserver: typeof IntersectionObserver
      ResizeObserver: typeof ResizeObserver
    }
  }
}

export {}
