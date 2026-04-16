import {
  type ChangeEvent,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'
import { defaultWaterSettings, type WaterSettings } from '@/water/settings'
import { type WaterCameraView, WaterRenderer } from '@/water/renderer'

interface ControlDefinition {
  key: keyof WaterSettings
  label: string
  max: number
  min: number
  step: number
}

const CONTROL_GROUPS: Array<{
  controls: Array<ControlDefinition>
  title: string
}> = [
  {
    title: 'Surface motion',
    controls: [
      {
        key: 'waveAmplitude',
        label: 'Wave amplitude',
        min: 0.005,
        max: 0.14,
        step: 0.001,
      },
      {
        key: 'waveFrequency',
        label: 'Wave frequency',
        min: 0.5,
        max: 3.8,
        step: 0.01,
      },
      {
        key: 'wavePersistence',
        label: 'Wave persistence',
        min: 0.2,
        max: 0.8,
        step: 0.01,
      },
      {
        key: 'waveLacunarity',
        label: 'Wave lacunarity',
        min: 1.4,
        max: 3.0,
        step: 0.01,
      },
      {
        key: 'waveSpeed',
        label: 'Wave speed',
        min: 0.02,
        max: 0.7,
        step: 0.01,
      },
      {
        key: 'waveChoppiness',
        label: 'Wave choppiness',
        min: 0,
        max: 0.22,
        step: 0.001,
      },
    ],
  },
  {
    title: 'Water tone',
    controls: [
      {
        key: 'troughThreshold',
        label: 'Trough threshold',
        min: -0.12,
        max: 0.04,
        step: 0.001,
      },
      {
        key: 'troughTransition',
        label: 'Trough transition',
        min: 0.02,
        max: 0.32,
        step: 0.001,
      },
      {
        key: 'peakThreshold',
        label: 'Peak threshold',
        min: 0,
        max: 0.16,
        step: 0.001,
      },
      {
        key: 'peakTransition',
        label: 'Peak transition',
        min: 0.02,
        max: 0.28,
        step: 0.001,
      },
    ],
  },
  {
    title: 'Ground caustics',
    controls: [
      {
        key: 'causticsIntensity',
        label: 'Caustics intensity',
        min: 0,
        max: 1.6,
        step: 0.01,
      },
      {
        key: 'causticsScale',
        label: 'Caustics scale',
        min: 2,
        max: 24,
        step: 0.1,
      },
      {
        key: 'causticsSpeed',
        label: 'Caustics speed',
        min: 0,
        max: 2,
        step: 0.01,
      },
      {
        key: 'causticsOffset',
        label: 'Caustics offset',
        min: 0.35,
        max: 1.1,
        step: 0.01,
      },
      {
        key: 'causticsThickness',
        label: 'Caustics thickness',
        min: 0.04,
        max: 0.34,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Foam and light',
    controls: [
      {
        key: 'foamThreshold',
        label: 'Foam threshold',
        min: 0.35,
        max: 1.05,
        step: 0.01,
      },
      {
        key: 'foamSoftness',
        label: 'Foam softness',
        min: 0.04,
        max: 0.45,
        step: 0.01,
      },
      {
        key: 'foamIntensity',
        label: 'Foam intensity',
        min: 0,
        max: 1.5,
        step: 0.01,
      },
      {
        key: 'fresnelScale',
        label: 'Fresnel scale',
        min: 0.1,
        max: 1.4,
        step: 0.01,
      },
      {
        key: 'fresnelPower',
        label: 'Fresnel power',
        min: 1,
        max: 8,
        step: 0.1,
      },
      {
        key: 'reflectionStrength',
        label: 'Reflection strength',
        min: 0.1,
        max: 1.25,
        step: 0.01,
      },
      {
        key: 'waterClarity',
        label: 'Shallow visibility',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'sssIntensity',
        label: 'Crest glow',
        min: 0,
        max: 1.4,
        step: 0.01,
      },
      {
        key: 'waterDepth',
        label: 'Depth fog',
        min: 0.08,
        max: 0.45,
        step: 0.01,
      },
      {
        key: 'waterOpacity',
        label: 'Surface density',
        min: 0.35,
        max: 1,
        step: 0.01,
      },
      { key: 'sunAzimuth', label: 'Sun turn', min: -1.3, max: 1.3, step: 0.01 },
      {
        key: 'sunElevation',
        label: 'Sun height',
        min: 0.05,
        max: 0.65,
        step: 0.01,
      },
    ],
  },
]

const PRESETS: Array<{
  name: string
  settings: WaterSettings
  view?: WaterCameraView
}> = [
  {
    name: 'Copper dusk',
    settings: defaultWaterSettings,
    view: 'horizon',
  },
  {
    name: 'Tiger tuned',
    settings: {
      ...defaultWaterSettings,
      foamIntensity: 0.32,
      foamSoftness: 0.12,
      foamThreshold: 0.86,
      fresnelPower: 4.4,
      fresnelScale: 0.76,
      peakThreshold: 0.08,
      peakTransition: 0.173,
      reflectionStrength: 0.99,
      sssIntensity: 1.15,
      sunAzimuth: -0.16,
      sunElevation: 0.28,
      troughThreshold: -0.09,
      troughTransition: 0.182,
      waterClarity: 0.23,
      waterDepth: 0.24,
      waterOpacity: 0.71,
      waveAmplitude: 0.021,
      waveChoppiness: 0.072,
      waveFrequency: 2.11,
      waveLacunarity: 2.72,
      wavePersistence: 0.28,
      waveSpeed: 0.25,
    },
    view: 'horizon',
  },
  {
    name: 'Mirror glass',
    settings: {
      ...defaultWaterSettings,
      foamIntensity: 0.2,
      fresnelScale: 1.18,
      reflectionStrength: 1.08,
      waterClarity: 0.34,
      waterOpacity: 0.94,
      sunElevation: 0.18,
      waveAmplitude: 0.012,
      waveChoppiness: 0.015,
      waveFrequency: 0.72,
      waveSpeed: 0.05,
    },
    view: 'glide',
  },
  {
    name: 'Caustic shelf',
    settings: {
      ...defaultWaterSettings,
      causticsIntensity: 0.76,
      causticsScale: 9.8,
      causticsSpeed: 1.04,
      causticsThickness: 0.14,
      foamIntensity: 0.3,
      fresnelScale: 0.88,
      reflectionStrength: 0.82,
      sunElevation: 0.24,
      waterClarity: 0.66,
      waterDepth: 0.18,
      waterOpacity: 0.74,
      waveAmplitude: 0.041,
      waveChoppiness: 0.062,
      waveFrequency: 1.32,
      waveSpeed: 0.11,
    },
    view: 'shelf',
  },
  {
    name: 'Breaking chop',
    settings: {
      ...defaultWaterSettings,
      foamIntensity: 1.06,
      foamSoftness: 0.12,
      foamThreshold: 0.72,
      fresnelScale: 1.08,
      reflectionStrength: 0.94,
      waterClarity: 0.08,
      waterDepth: 0.34,
      waterOpacity: 0.94,
      sunElevation: 0.12,
      waveAmplitude: 0.058,
      waveChoppiness: 0.122,
      waveFrequency: 3.15,
      waveSpeed: 0.28,
    },
    view: 'storm',
  },
]

const CAMERA_VIEWS: Array<{
  id: WaterCameraView
  label: string
}> = [
  { id: 'horizon', label: 'Horizon view' },
  { id: 'shelf', label: 'Shelf view' },
  { id: 'glide', label: 'Low glide' },
  { id: 'storm', label: 'Storm view' },
]

function formatValue(value: number): string {
  return value.toFixed(3).replace(/\.?0+$/, '')
}

export function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<WaterRenderer | null>(null)
  const [settings, setSettings] = useState<WaterSettings>(defaultWaterSettings)
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | 'idle'>(
    'idle'
  )
  const [isGroundVisible, setIsGroundVisible] = useState(true)
  const [isPanelVisible, setIsPanelVisible] = useState(true)
  const [isWaterVisible, setIsWaterVisible] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let shouldDispose = false
    const renderer = new WaterRenderer(container, defaultWaterSettings)
    rendererRef.current = renderer
    void renderer.init().then(() => {
      if (shouldDispose) {
        renderer.dispose()
      }
    })

    return () => {
      shouldDispose = true
      rendererRef.current = null
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    rendererRef.current?.setSettings(settings)
  }, [settings])

  const handleSliderChange =
    (key: keyof WaterSettings) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value)

      startTransition(() => {
        setSettings((current) => ({
          ...current,
          [key]: value,
        }))
      })
    }

  const handleCopySettings = () => {
    const state = rendererRef.current?.getState()
    const payload = JSON.stringify(
      {
        settings,
        view: state?.view ?? 'horizon',
      },
      null,
      2
    )

    void navigator.clipboard
      .writeText(payload)
      .then(() => {
        setCopyStatus('copied')
        window.setTimeout(() => setCopyStatus('idle'), 1800)
      })
      .catch(() => {
        setCopyStatus('failed')
        window.setTimeout(() => setCopyStatus('idle'), 1800)
      })
  }

  let copyButtonLabel = 'Copy tweak JSON'

  if (copyStatus === 'copied') {
    copyButtonLabel = 'Copied tweak JSON'
  } else if (copyStatus === 'failed') {
    copyButtonLabel = 'Copy failed'
  }

  return (
    <div className="app-shell">
      <div ref={containerRef} className="scene-view" />

      {!isPanelVisible ? (
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setIsPanelVisible(true)}
        >
          Show controls
        </button>
      ) : (
        <aside className="control-panel">
          <div className="control-panel__intro">
            <div className="control-panel__intro-top">
              <p className="control-panel__eyebrow">WebGPU fjord water</p>
              <button
                type="button"
                className="control-chip control-chip--compact"
                onClick={() => setIsPanelVisible(false)}
              >
                Hide controls
              </button>
            </div>
            <h1>Shape the water until it feels right.</h1>
            <p className="control-panel__copy">
              The scene updates live. Push the motion. Pull the light. Find the
              mood you want.
            </p>
          </div>

          <div className="control-panel__actions">
            <button
              type="button"
              className="control-button"
              onClick={() => {
                setSettings({ ...defaultWaterSettings })
                setIsGroundVisible(true)
                setIsWaterVisible(true)
                rendererRef.current?.setGroundVisible(true)
                rendererRef.current?.setWaterVisible(true)
              }}
            >
              Reset water
            </button>
            <button
              type="button"
              className="control-button control-button--ghost"
              onClick={() => rendererRef.current?.resetCamera()}
            >
              Center camera
            </button>
          </div>

          <div className="control-panel__actions">
            <button
              type="button"
              className="control-button control-button--ghost"
              onClick={handleCopySettings}
            >
              {copyButtonLabel}
            </button>
          </div>

          <div className="control-presets">
            <button
              type="button"
              className="control-chip"
              onClick={() => {
                const isNextVisible = !isWaterVisible
                setIsWaterVisible(isNextVisible)
                rendererRef.current?.setWaterVisible(isNextVisible)
              }}
            >
              {isWaterVisible ? 'Hide water' : 'Show water'}
            </button>
            <button
              type="button"
              className="control-chip"
              onClick={() => {
                const isNextVisible = !isGroundVisible
                setIsGroundVisible(isNextVisible)
                rendererRef.current?.setGroundVisible(isNextVisible)
              }}
            >
              {isGroundVisible ? 'Hide ground' : 'Show ground'}
            </button>
          </div>

          <div className="control-presets">
            {CAMERA_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                className="control-chip"
                onClick={() => rendererRef.current?.setView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="control-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="control-chip"
                onClick={() => {
                  setSettings({ ...preset.settings })
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {CONTROL_GROUPS.map((group) => (
            <section key={group.title} className="control-group">
              <h2>{group.title}</h2>

              {group.controls.map((control) => (
                <label key={control.key} className="control-row">
                  <span className="control-row__top">
                    <span>{control.label}</span>
                    <span>{formatValue(settings[control.key])}</span>
                  </span>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={settings[control.key]}
                    onChange={handleSliderChange(control.key)}
                  />
                </label>
              ))}
            </section>
          ))}
        </aside>
      )}
    </div>
  )
}
