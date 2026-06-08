import { Link } from 'react-router-dom'
import { CareLogButton } from './CareLogButton'
import styles from './PlantCard.module.css'

const LIGHT_LABELS = {
  low: '🌑 Low',
  medium: '⛅ Medium',
  high: '☀️ High',
  direct: '🌞 Direct',
}

function daysUntilWater(lastWateredAt, waterEveryDays) {
  if (!waterEveryDays) return null
  if (!lastWateredAt) return 0
  const last = new Date(lastWateredAt)
  const next = new Date(last.getTime() + waterEveryDays * 86400000)
  return Math.ceil((next - Date.now()) / 86400000)
}

export function PlantCard({ plant }) {
  const days = daysUntilWater(plant.last_watered_at, plant.water_every_days)
  const overdue = days !== null && days <= 0

  return (
    <Link to={`/plants/${plant.id}`} className={`${styles.card} ${overdue ? styles.overdue : ''}`}>
      {plant.photo_url && (
        <img src={plant.photo_url} alt={plant.name} className={styles.photo} />
      )}
      {!plant.photo_url && <div className={styles.photoPlaceholder}>🪴</div>}

      <div className={styles.body}>
        <div className={styles.header}>
          <h2 className={styles.name}>{plant.name}</h2>
          {plant.species && <p className={styles.species}>{plant.species}</p>}
        </div>

        <div className={styles.tags}>
          {plant.location && (
            <span className={styles.tag}>📍 {plant.location}</span>
          )}
          {plant.light_level && (
            <span className={styles.tag}>{LIGHT_LABELS[plant.light_level]}</span>
          )}
          {days !== null && (
            <span className={`${styles.tag} ${overdue ? styles.overdueTag : ''}`}>
              {overdue
                ? `💧 Overdue by ${Math.abs(days)}d`
                : days === 0
                ? '💧 Water today'
                : `💧 In ${days}d`}
            </span>
          )}
          {days === null && !plant.last_watered_at && plant.water_every_days && (
            <span className={`${styles.tag} ${styles.overdueTag}`}>💧 Never watered</span>
          )}
        </div>

        <div className={styles.footer} onClick={(e) => e.preventDefault()}>
          <CareLogButton plantId={plant.id} />
        </div>
      </div>
    </Link>
  )
}
