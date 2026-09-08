import { useCallback, useMemo, useState } from 'react'
import { FreePracticeView } from './components/FreePracticeView'
import { FreeResultView } from './components/FreeResultView'
import { Home } from './components/Home'
import { KeybindSettings } from './components/KeybindSettings'
import { PracticeView } from './components/PracticeView'
import { ResultView } from './components/ResultView'
import { RotationEditor } from './components/RotationEditor'
import { SettingsView } from './components/SettingsView'
import { DEFAULT_JOB_ID, jobNameJa } from './data/jobs'
import {
  clearSkillKeysConflictingWithMovement,
  createEmptyRotation,
  loadConfig,
  loadHotbarForJob,
  loadKeybindsByJob,
  loadKeybindsForJob,
  loadMovementKeys,
  loadRotations,
  loadSelectedJob,
  saveConfig,
  saveHotbarForJob,
  saveKeybindsByJob,
  saveKeybindsForJob,
  saveMovementKeys,
  saveRotations,
  saveSelectedJob,
} from './storage'
import type {
  EngineConfig,
  FreePracticeSummary,
  HotbarLayout,
  JobId,
  Keybinds,
  KeybindsByJob,
  MovementKeys,
  PracticeSummary,
  Rotation,
} from './types'
import './App.css'

type Screen =
  | { name: 'home' }
  | { name: 'edit'; rotationId: string }
  | { name: 'settings' }
  | { name: 'keybinds' }
  | { name: 'practice'; rotationId: string }
  | {
      name: 'result'
      rotationId: string
      summary: PracticeSummary
    }
  | { name: 'free-practice' }
  | { name: 'free-result'; summary: FreePracticeSummary }

function App() {
  const [rotations, setRotations] = useState<Rotation[]>(() => loadRotations())
  const [selectedJob, setSelectedJob] = useState<JobId>(() => loadSelectedJob())
  const [movementKeys, setMovementKeys] = useState<MovementKeys>(() =>
    loadMovementKeys(),
  )
  const [keybindsByJob, setKeybindsByJob] = useState<KeybindsByJob>(() => {
    const move = loadMovementKeys()
    const byJob = loadKeybindsByJob()
    const mch = clearSkillKeysConflictingWithMovement(
      byJob[DEFAULT_JOB_ID] ?? loadKeybindsForJob(DEFAULT_JOB_ID),
      move,
    )
    const next = { ...byJob, [DEFAULT_JOB_ID]: mch }
    saveKeybindsByJob(next)
    return next
  })
  const [config, setConfig] = useState<EngineConfig>(() => loadConfig())
  const [hotbarByJob, setHotbarByJob] = useState<
    Partial<Record<JobId, HotbarLayout>>
  >(() => {
    const binds = loadKeybindsForJob(DEFAULT_JOB_ID)
    return { [DEFAULT_JOB_ID]: loadHotbarForJob(DEFAULT_JOB_ID, binds) }
  })
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  const keybindsForSelected = useMemo((): Keybinds => {
    return (
      keybindsByJob[selectedJob] ??
      loadKeybindsForJob(selectedJob)
    )
  }, [keybindsByJob, selectedJob])

  const hotbarForSelected = useMemo((): HotbarLayout => {
    if (hotbarByJob[selectedJob]) return hotbarByJob[selectedJob]!
    return loadHotbarForJob(selectedJob, keybindsForSelected)
  }, [hotbarByJob, selectedJob, keybindsForSelected])

  const persistRotations = useCallback((next: Rotation[]) => {
    setRotations(next)
    saveRotations(next)
  }, [])

  const changeSelectedJob = useCallback((jobId: JobId) => {
    setSelectedJob(jobId)
    saveSelectedJob(jobId)
    setKeybindsByJob((prev) => {
      if (prev[jobId]) return prev
      const binds = clearSkillKeysConflictingWithMovement(
        loadKeybindsForJob(jobId),
        loadMovementKeys(),
      )
      const next = { ...prev, [jobId]: binds }
      saveKeybindsByJob(next)
      return next
    })
    setHotbarByJob((prev) => {
      if (prev[jobId]) return prev
      const binds = loadKeybindsForJob(jobId)
      const layout = loadHotbarForJob(jobId, binds)
      saveHotbarForJob(jobId, layout)
      return { ...prev, [jobId]: layout }
    })
  }, [])

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  function findRotation(id: string): Rotation | undefined {
    return rotations.find((r) => r.id === id)
  }

  function keybindsForRotation(rot: Rotation): Keybinds {
    return keybindsByJob[rot.jobId] ?? loadKeybindsForJob(rot.jobId)
  }

  function hotbarForRotation(rot: Rotation): HotbarLayout {
    return (
      hotbarByJob[rot.jobId] ??
      loadHotbarForJob(rot.jobId, keybindsForRotation(rot))
    )
  }

  if (screen.name === 'edit') {
    const rot = findRotation(screen.rotationId)
    if (!rot) return <Missing onHome={goHome} />
    return (
      <RotationEditor
        rotation={rot}
        keybinds={keybindsForRotation(rot)}
        onCancel={goHome}
        onSave={(updated) => {
          persistRotations(
            rotations.map((r) => (r.id === updated.id ? updated : r)),
          )
          if (updated.jobId !== selectedJob) {
            changeSelectedJob(updated.jobId)
          }
          setScreen({ name: 'home' })
        }}
      />
    )
  }

  if (screen.name === 'settings') {
    return (
      <SettingsView
        config={config}
        movementKeys={movementKeys}
        onCancel={goHome}
        onSave={(cfg, move) => {
          setConfig(cfg)
          setMovementKeys(move)
          saveConfig(cfg)
          saveMovementKeys(move)
          // 全ジョブのキーバインドから移動キー衝突を除去
          setKeybindsByJob((prev) => {
            const next: KeybindsByJob = { ...prev }
            for (const jobId of Object.keys(next) as JobId[]) {
              const cleaned = clearSkillKeysConflictingWithMovement(
                next[jobId] ?? loadKeybindsForJob(jobId),
                move,
              )
              next[jobId] = cleaned
              saveKeybindsForJob(jobId, cleaned)
            }
            return next
          })
          setScreen({ name: 'home' })
        }}
      />
    )
  }

  if (screen.name === 'keybinds') {
    return (
      <KeybindSettings
        key={selectedJob}
        jobId={selectedJob}
        keybinds={keybindsForSelected}
        movementKeys={movementKeys}
        hotbarLayout={hotbarForSelected}
        onJobChange={changeSelectedJob}
        onCancel={goHome}
        onSave={(binds, hotbar) => {
          const cleaned = clearSkillKeysConflictingWithMovement(
            binds,
            movementKeys,
          )
          setKeybindsByJob((prev) => {
            const next = { ...prev, [selectedJob]: cleaned }
            saveKeybindsByJob(next)
            return next
          })
          setHotbarByJob((prev) => {
            const next = { ...prev, [selectedJob]: hotbar }
            saveHotbarForJob(selectedJob, hotbar)
            return next
          })
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
        keybinds={keybindsForRotation(rot)}
        movementKeys={movementKeys}
        hotbarLayout={hotbarForRotation(rot)}
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

  if (screen.name === 'free-practice') {
    const gcdMs =
      rotations.find((r) => r.jobId === selectedJob)?.gcdMs ?? 2500
    return (
      <FreePracticeView
        jobId={selectedJob}
        jobNameJa={jobNameJa(selectedJob)}
        gcdMs={gcdMs}
        keybinds={keybindsForSelected}
        movementKeys={movementKeys}
        hotbarLayout={hotbarForSelected}
        config={config}
        onAbort={goHome}
        onFinish={(summary) =>
          setScreen({ name: 'free-result', summary })
        }
      />
    )
  }

  if (screen.name === 'free-result') {
    return (
      <FreeResultView
        summary={screen.summary}
        jobId={selectedJob}
        jobNameJa={jobNameJa(selectedJob)}
        onHome={goHome}
        onRetry={() => setScreen({ name: 'free-practice' })}
      />
    )
  }

  return (
    <Home
      rotations={rotations}
      selectedJob={selectedJob}
      onSelectedJobChange={changeSelectedJob}
      onPractice={(id) => setScreen({ name: 'practice', rotationId: id })}
      onFreePractice={() => setScreen({ name: 'free-practice' })}
      onEdit={(id) => setScreen({ name: 'edit', rotationId: id })}
      onOpenSettings={() => setScreen({ name: 'settings' })}
      onOpenKeybinds={() => setScreen({ name: 'keybinds' })}
      onCreate={(jobId) => {
        const created = createEmptyRotation(jobId)
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
