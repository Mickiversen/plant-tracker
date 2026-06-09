import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlant } from '../hooks/usePlants'
import { useCareLogForPlant } from '../hooks/useCareLog'
import { useDeletePlant } from '../hooks/usePlantMutations'
import { CareLogButton } from '../components/CareLogButton'
import styles from './PlantDetail.module.css'

const LIGHT_LABELS = {
  low: '🌑 Low',
  medium: '⛅ Medium',
  high: '☀️ High',
  direct: '🌞 Direct',
}

const ACTION_LABELS = {
  watered: '💧 Watered',
  fertilized: '🌱 Fertilized',
  repotted: '🔄 Repotted',
  other: '✏️ Other',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function daysUntil(lastAt, everyDays) {
  if (!everyDays) return null
  if (!lastAt) return 0
  const next = new Date(lastAt).getTime() + everyDays * 86400000
  return Math.ceil((next - Date.now()) / 86400000)
}

export function PlantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: plant, isLoading, error } = usePlant(id)
  const { data: log } = useCareLogForPlant(id)
  const deletePlant = useDeletePlant()

  if (isLoading) return <p className={styles.state}>Loading…</p>
  if (error) return <p className={styles.state}>Error: {error.message}</p>
  if (!plant) return <p className={styles.state}>Plant not found.</p>

  const days = daysUntil(plant.last_watered_at, plant.water_every_days)
  const repotDays = daysUntil(plant.last_repotted_at, plant.repot_every_days)
  const overdue = (days !== null && days <= 0) || (repotDays !== null && repotDays <= 0)

  async function handleDelete() {
    if (!confirm(`Delete "${plant.name}"? This cannot be undone.`)) return
    await deletePlant.mutateAsync(id)
    navigate('/')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← All plants</Link>
        <div className={styles.headerActions}>
          <Link to={`/plants/${id}/edit`} className={styles.editBtn}>Edit</Link>
          <button className={styles.deleteBtn} onClick={handleDelete} disabled={deletePlant.isPending}>
            Delete
          </button>
        </div>
      </header>

      <div className={styles.hero}>
        {plant.photo_url
          ? <img src={plant.photo_url} alt={plant.name} className={styles.photo} />
          : <div className={styles.photoPlaceholder}>🌿</div>
        }
        <div className={styles.heroInfo}>
          <h1 className={styles.name}>{plant.name}</h1>
          {plant.species && <p className={styles.species}>{plant.species}</p>}

          <div className={styles.tags}>
            {plant.location && <span className={styles.tag}>📍 {plant.location}</span>}
            {plant.light_level && <span className={styles.tag}>{LIGHT_LABELS[plant.light_level]}</span>}
            {days !== null && (
              <span className={`${styles.tag} ${days <= 0 ? styles.overdueTag : ''}`}>
                {days <= 0
                  ? `💧 Overdue by ${Math.abs(days)}d`
                  : days === 0 ? '💧 Water today' : `💧 In ${days}d`}
              </span>
            )}
            {repotDays !== null && (
              <span className={`${styles.tag} ${repotDays <= 0 ? styles.overdueTag : ''}`}>
                {repotDays <= 0
                  ? `🔄 Repot overdue by ${Math.abs(repotDays)}d`
                  : repotDays === 0 ? '🔄 Repot today' : `🔄 Repot in ${repotDays}d`}
              </span>
            )}
          </div>

          <CareLogButton plantId={id} />
        </div>
      </div>

      <div className={styles.details}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Care needs</h2>
          <dl className={styles.dl}>
            {plant.water_every_days && <><dt>Water every</dt><dd>{plant.water_every_days} days</dd></>}
            {plant.fertilize_every_days && <><dt>Fertilize every</dt><dd>{plant.fertilize_every_days} days</dd></>}
            {plant.repot_every_days && <><dt>Repot every</dt><dd>{Math.round(plant.repot_every_days / 30)} months ({plant.repot_every_days} days)</dd></>}
            {(plant.humidity_min != null && plant.humidity_max != null) && <><dt>Humidity</dt><dd>{plant.humidity_min}–{plant.humidity_max}%</dd></>}
            {(plant.temp_min != null && plant.temp_max != null) && <><dt>Temperature</dt><dd>{plant.temp_min}–{plant.temp_max}°C</dd></>}
            {plant.light_level && <><dt>Light level</dt><dd>{plant.light_level}</dd></>}
            {plant.light_ppfd && <><dt>Light (PPFD)</dt><dd>{plant.light_ppfd}</dd></>}
            {plant.light_dli && <><dt>Light (DLI)</dt><dd>{plant.light_dli}</dd></>}
            {plant.soil_type && <><dt>Soil</dt><dd>{plant.soil_type}</dd></>}
            <><dt>Last watered</dt><dd>{formatDate(plant.last_watered_at)}</dd></>
            {plant.fertilize_every_days && <><dt>Last fertilized</dt><dd>{formatDate(plant.last_fertilized_at)}</dd></>}
            {plant.repot_every_days && <><dt>Last repotted</dt><dd>{formatDate(plant.last_repotted_at)}</dd></>}
          </dl>
        </section>

        {plant.notes && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Notes</h2>
            <p className={styles.notes}>{plant.notes}</p>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Care log</h2>
          {!log || log.length === 0
            ? <p className={styles.emptyLog}>No care actions logged yet.</p>
            : (
              <ul className={styles.log}>
                {log.map((entry) => (
                  <li key={entry.id} className={styles.logEntry}>
                    <span className={styles.logAction}>{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    <span className={styles.logDate}>{formatDate(entry.logged_at)}</span>
                    {entry.notes && <span className={styles.logNotes}>{entry.notes}</span>}
                  </li>
                ))}
              </ul>
            )
          }
        </section>
      </div>
    </div>
  )
}
