import { useState, type DragEvent } from 'react'
import {
  canonicalHotbarSkillId,
  clearHotbarSlot,
  createDefaultHotbarLayout,
  placeOnHotbar,
  resizeHotbarCols,
  resizeHotbarRows,
} from '../data/hotbarLayout'
import { getSkill } from '../data/skills'
import { effectiveKey, getSwapPartner } from '../data/skillSlots'
import { formatKeyLabel } from '../input/keys'
import type { HotbarLayout, Keybinds, Skill } from '../types'

type Props = {
  layout: HotbarLayout
  keybinds: Keybinds
  skills: Skill[]
  onChange: (layout: HotbarLayout) => void
}

const DRAG_SKILL = 'application/x-mch-skill'
const DRAG_FROM = 'application/x-mch-from'

export function HotbarLayoutEditor({
  layout,
  keybinds,
  skills,
  onChange,
}: Props) {
  const [dragOver, setDragOver] = useState<number | null>(null)

  const placed = new Set(
    layout.slots.filter((id): id is string => Boolean(id)),
  )

  const palette = skills.filter((s) => {
    if (keybinds[s.id]?.unused) return false
    const canon = canonicalHotbarSkillId(s.id, keybinds)
    // 置き換え相手は代表のみパレットに出す
    if (canon !== s.id) return false
    return !placed.has(canon)
  })

  function onDragStartSkill(
    e: DragEvent,
    skillId: string,
    fromIndex: number | null,
  ) {
    e.dataTransfer.setData(DRAG_SKILL, skillId)
    e.dataTransfer.setData(DRAG_FROM, fromIndex == null ? '' : String(fromIndex))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDropCell(e: DragEvent, toIndex: number) {
    e.preventDefault()
    setDragOver(null)
    const skillId = e.dataTransfer.getData(DRAG_SKILL)
    if (!skillId) return
    const fromRaw = e.dataTransfer.getData(DRAG_FROM)
    const fromIndex = fromRaw === '' ? null : Number(fromRaw)
    onChange(placeOnHotbar(layout, toIndex, skillId, fromIndex, keybinds))
  }

  function labelFor(skillId: string): string {
    const skill = getSkill(skillId)
    const partner = getSwapPartner(keybinds, skillId)
    if (!skill) return skillId
    if (!partner) return skill.nameJa
    const p = getSkill(partner)
    return `${skill.nameJa} ↔ ${p?.nameJa ?? partner}`
  }

  return (
    <section className="hotbar-editor">
      <div className="hotbar-editor-header">
        <h2>ホットバー配置</h2>
        <div className="header-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => onChange(resizeHotbarCols(layout, layout.cols - 1))}
            disabled={layout.cols <= 4}
          >
            列を減らす
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onChange(resizeHotbarCols(layout, layout.cols + 1))}
            disabled={layout.cols >= 16}
          >
            列を増やす
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onChange(resizeHotbarRows(layout, layout.rows - 1))}
            disabled={layout.rows <= 1}
          >
            行を減らす
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onChange(resizeHotbarRows(layout, layout.rows + 1))}
            disabled={layout.rows >= 6}
          >
            行を増やす
          </button>
          <span className="muted hotbar-size-label">
            {layout.cols}列 × {layout.rows}行
          </span>
          <button
            type="button"
            className="btn ghost"
            onClick={() => onChange(createDefaultHotbarLayout())}
          >
            初期配置に戻す
          </button>
        </div>
      </div>
      <p className="muted">
        下の一覧からグリッドへドラッグ＆ドロップで配置します。セル同士の入れ替えや、枠外へドラッグで削除もできます。置き換えペアは1枠です。
      </p>

      <div
        className="hotbar-grid editor"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
      >
        {layout.slots.map((skillId, index) => (
          <div
            key={index}
            className={`hotbar-cell ${dragOver === index ? 'drag-over' : ''} ${skillId ? 'filled' : 'empty'}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(index)
            }}
            onDragLeave={() => setDragOver((v) => (v === index ? null : v))}
            onDrop={(e) => onDropCell(e, index)}
          >
            {skillId ? (
              <div
                className="hotbar-chip"
                draggable
                onDragStart={(e) => onDragStartSkill(e, skillId, index)}
                title={labelFor(skillId)}
              >
                <span className="hotbar-chip-name">{labelFor(skillId)}</span>
                <span className="hotbar-chip-key">
                  {formatKeyLabel(effectiveKey(keybinds, skillId))}
                </span>
                <button
                  type="button"
                  className="chip-remove"
                  aria-label="削除"
                  onClick={() => onChange(clearHotbarSlot(layout, index))}
                >
                  ×
                </button>
              </div>
            ) : (
              <span className="cell-placeholder">{index + 1}</span>
            )}
          </div>
        ))}
      </div>

      <div
        className="hotbar-trash"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const fromRaw = e.dataTransfer.getData(DRAG_FROM)
          if (fromRaw === '') return
          const fromIndex = Number(fromRaw)
          onChange(clearHotbarSlot(layout, fromIndex))
        }}
      >
        ここにドロップでホットバーから外す
      </div>

      <h3>未配置スキル</h3>
      <ul className="hotbar-palette">
        {palette.length === 0 ? (
          <li className="muted">すべて配置済み、または不要です</li>
        ) : (
          palette.map((s) => (
            <li key={s.id}>
              <div
                className="hotbar-chip palette"
                draggable
                onDragStart={(e) => onDragStartSkill(e, s.id, null)}
              >
                <span className="hotbar-chip-name">{labelFor(s.id)}</span>
                <span className="hotbar-chip-key">
                  {formatKeyLabel(effectiveKey(keybinds, s.id))}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
