import { useCallback, useState } from 'react'
import { Home } from './components/Home'
import { KeybindSettings } from './components/KeybindSettings'
import { PracticeView } from './components/PracticeView'
import { ResultView } from './components/ResultView'
import { RotationEditor } from './components/RotationEditor'
import {
  createEmptyRotation,
  loadConfig,
  loadKeybinds,
  loadMovementKeys,
  loadRotations,
  saveConfig,
  saveKeybinds,
  saveMovementKeys,
  saveRotations,
} from './storage'
import type {
  EngineConfig,
  Keybinds,
  MovementKeys,
  PracticeSummary,
  Rotation,
} from './types'
import './App.css'

type Screen =
  | { name: 'home' }
  | { name: 'edit'; rotationId: string }
  | { name: 'keybinds' }
  | { name: 'practice'; rotationId: string }
  | {
      name: 'result'
      rotationId: string
      summary: PracticeSummary
    }

function App() {
  const [rotations, setRotations] = useState<Rotation[]>(() => loadRotations())
  const [keybinds, setKeybinds] = useState<Keybinds>(() => loadKeybinds())
  const [config, setConfig] = useState<EngineConfig>(() => loadConfig())
  const [movementKeys, setMovementKeys] = useState<MovementKeys>(() =>
    loadMovementKeys(),
  )
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  const persistRotations = useCallback((next: Rotation[]) => {
    setRotations(next)
    saveRotations(next)
  }, [])

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  function findRotation(id: string): Rotation | undefined {
    return rotations.find((r) => r.id === id)
  }

  if (screen.name === 'edit') {
    const rot = findRotation(screen.rotationId)
    if (!rot) return <Missing onHome={goHome} />
    return (
      <RotationEditor
        rotation={rot}
        keybinds={keybinds}
        onCancel={goHome}
        onSave={(updated) => {
          persistRotations(
            rotations.map((r) => (r.id === updated.id ? updated : r)),
          )
          setScreen({ name: 'home' })
        }}
      />
    )
  }

  if (screen.name === 'keybinds') {
    return (
      <KeybindSettings
        keybinds={keybinds}
        config={config}
        movementKeys={movementKeys}
        onCancel={goHome}
        onSave={(binds, cfg, move) => {
          setKeybinds(binds)
          setConfig(cfg)
          setMovementKeys(move)
          saveKeybinds(binds)
          saveConfig(cfg)
          saveMovementKeys(move)
          setScreen({ name: 'home' })
        }}
      />
    )
  }

  if (screen.name === 'practice') {
    const rot = findRotation(screen.rotationId)
    if (!rot) return <Missing onHome={goHome} />
    return (
      <PracticeView
        rotation={rot}
        keybinds={keybinds}
        movementKeys={movementKeys}
        config={config}
        onAbort={goHome}
        onFinish={(summary) =>
          setScreen({
            name: 'result',
            rotationId: rot.id,
            summary,
          })
        }
      />
    )
  }

  if (screen.name === 'result') {
    const rot = findRotation(screen.rotationId)
    return (
      <ResultView
        summary={screen.summary}
        rotationName={rot?.name ?? '回し'}
        onHome={goHome}
        onRetry={() =>
          setScreen({ name: 'practice', rotationId: screen.rotationId })
        }
      />
    )
  }

  return (
    <Home
      rotations={rotations}
      onPractice={(id) => setScreen({ name: 'practice', rotationId: id })}
      onEdit={(id) => setScreen({ name: 'edit', rotationId: id })}
      onOpenKeybinds={() => setScreen({ name: 'keybinds' })}
      onCreate={() => {
        const created = createEmptyRotation()
        persistRotations([...rotations, created])
        setScreen({ name: 'edit', rotationId: created.id })
      }}
      onDelete={(id) => {
        persistRotations(rotations.filter((r) => r.id !== id))
      }}
    />
  )
}

function Missing({ onHome }: { onHome: () => void }) {
  return (
    <div className="page">
      <p>回しが見つかりません。</p>
      <button type="button" className="btn" onClick={onHome}>
        ホームへ
      </button>
    </div>
  )
}

export default App
