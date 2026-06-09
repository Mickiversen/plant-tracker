import { Link } from 'react-router-dom'
import { CareLogButton } from './CareLogButton'
import styles from './PlantCard.module.css'

const LIGHT_LABELS = {
  low: '🌑 Low',
  medium: '⛅ Medium',
  high: '☀️ High',
  direct: '🌞 Direct',
}

function daysUntil(lastAt, everyDays) {
  if (!everyDays) return null
  if (!lastAt) return 0
  const next = new Date(lastAt).getTime() + everyDays * 86400000
  return Math.ceil((next - Date.now()) / 86400000)
}

export function PlantCard({ plant }) {
  const waterDays = daysUntil(plant.last_watered_at, plant.water_every_days)
  const repotDays = daysUntil(plant.last_repotted_at, plant.repot_every_days)
  const waterOverdue = waterDays !== null && waterDays <= 0
  const repotOverdue = repotDays !== null && repotDays <= 0
  const overdue = waterOverdue || repotOverdue

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
          {waterDays !== null && (
            <span className={`${styles.tag} ${waterOverdue ? styles.overdueTag : ''}`}>
              {waterOverdue
                ? `💧 Overdue by ${Math.abs(waterDays)}d`
                : waterDays === 0 ? '💧 Water today' : `💧 In ${waterDays}d`}
            </span>
          )}
          {waterDays === null && plant.water_every_days && (
            <span className={`${styles.tag} ${styles.overdueTag}`}>💧 Never watered</span>
          )}
          {repotDays !== null && (
            <span className={`${styles.tag} ${repotOverdue ? styles.overdueTag : ''}`}>
              {repotOverdue
                ? `🪴 Repot overdue by ${Math.abs(repotDays)}d`
                : repotDays === 0 ? '🪴 Repot today' : `🪴 Repot in ${repotDays}d`}
            </span>
          )}
          {repotDays === null && plant.repot_every_days && (
            <span className={`${styles.tag} ${styles.overdueTag}`}>🪴 Never repotted</span>
          )}
        </div>

        <div className={styles.footer} onClick={(e) => e.preventDefault()}>
          <CareLogButton plantId={plant.id} />
        </div>
      </div>
    </Link>
  )
}
