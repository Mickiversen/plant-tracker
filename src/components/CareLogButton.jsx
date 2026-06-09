import { useState } from 'react'
import { useLogCareAction } from '../hooks/useCareLog'
import styles from './CareLogButton.module.css'

const ACTIONS = [
  { value: 'watered', label: '💧 Watered' },
  { value: 'fertilized', label: '🌱 Fertilized' },
  { value: 'repotted', label: '🔄 Repotted' },
  { value: 'other', label: '✏️ Other' },
]

export function CareLogButton({ plantId }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null) // { action, label }
  const [note, setNote] = useState('')
  const { mutate, isPending } = useLogCareAction()

  function selectAction(a) {
    setPending(a)
    setNote('')
  }

  function submit(e) {
    e.preventDefault()
    if (pending.value === 'other' && !note.trim()) return
    mutate({ plantId, action: pending.value, notes: note.trim() || undefined })
    setOpen(false)
    setPending(null)
    setNote('')
  }

  function close() {
    setOpen(false)
    setPending(null)
    setNote('')
  }

  return (
    <div className={styles.wrapper} onClick={(e) => e.stopPropagation()}>
      <button
        className={styles.trigger}
        onClick={(e) => { e.preventDefault(); open ? close() : setOpen(true) }}
        disabled={isPending}
        aria-label="Log care action"
      >
        {isPending ? '…' : '+ Log care'}
      </button>

      {open && (
        <div className={styles.menu}>
          {!pending ? (
            ACTIONS.map((a) => (
              <button key={a.value} className={styles.item} onClick={() => selectAction(a)}>
                {a.label}
              </button>
            ))
          ) : (
            <form className={styles.noteForm} onSubmit={submit}>
              <div className={styles.noteHeader}>
                <span className={styles.noteAction}>{pending.label}</span>
                <button type="button" className={styles.back} onClick={() => setPending(null)}>← Back</button>
              </div>
              <textarea
                className={styles.noteInput}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={pending.value === 'other' ? 'What did you do? (required)' : 'Add a note… (optional)'}
                rows={3}
                autoFocus
              />
              <button
                type="submit"
                className={styles.logBtn}
                disabled={pending.value === 'other' && !note.trim()}
              >
                Log
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
