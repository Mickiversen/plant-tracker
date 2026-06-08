import { useState } from 'react'
import { useLogCareAction } from '../hooks/useCareLog'
import styles from './CareLogButton.module.css'

const ACTIONS = [
  { value: 'watered', label: '💧 Watered' },
  { value: 'fertilized', label: '🌱 Fertilized' },
  { value: 'repotted', label: '🪴 Repotted' },
  { value: 'other', label: '✏️ Other' },
]

export function CareLogButton({ plantId }) {
  const [open, setOpen] = useState(false)
  const { mutate, isPending } = useLogCareAction()

  function log(action) {
    mutate({ plantId, action })
    setOpen(false)
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.trigger}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        disabled={isPending}
        aria-label="Log care action"
      >
        {isPending ? '…' : '+ Log care'}
      </button>
      {open && (
        <div className={styles.menu}>
          {ACTIONS.map((a) => (
            <button key={a.value} className={styles.item} onClick={() => log(a.value)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
