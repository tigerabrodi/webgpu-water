import { useEffect, useRef } from 'react'
import { WaterRenderer } from '@/water/renderer'

export function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<WaterRenderer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new WaterRenderer(container)
    rendererRef.current = renderer
    void renderer.init()

    return () => {
      renderer.dispose()
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
