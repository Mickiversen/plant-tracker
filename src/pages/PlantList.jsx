import { Link } from 'react-router-dom'
import { usePlants } from '../hooks/usePlants'
import { PlantCard } from '../components/PlantCard'
import { daysUntil } from '../lib/care'
import styles from './PlantList.module.css'

function LeafMotif({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M100 190 C 100 130, 100 80, 100 30" />
        <path d="M100 150 C 70 140, 40 120, 30 80 C 70 85, 95 110, 100 150 Z" />
        <path d="M100 150 C 130 140, 160 120, 170 80 C 130 85, 105 110, 100 150 Z" />
        <path d="M100 100 C 75 90, 55 70, 50 40 C 80 48, 96 70, 100 100 Z" />
        <path d="M100 100 C 125 90, 145 70, 150 40 C 120 48, 104 70, 100 100 Z" />
        <path d="M100 55 C 88 45, 80 32, 78 15 C 92 22, 99 38, 100 55 Z" />
        <path d="M100 55 C 112 45, 120 32, 122 15 C 108 22, 101 38, 100 55 Z" />
      </g>
    </svg>
  )
}

function isOverdue(plant) {
  const water = daysUntil(plant.last_watered_at, plant.water_every_days)
  const repot = daysUntil(plant.last_repotted_at, plant.repot_every_days)
  return (water !== null && water <= 0) || (repot !== null && repot <= 0)
}

export function PlantList() {
  const { data: plants, isLoading, error } = usePlants()

  const needAttention = plants ? plants.filter(isOverdue).length : 0

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <LeafMotif className={styles.heroLeaf} />
        <div className={styles.heroContent}>
          <h1 className={styles.title}>My Plants</h1>
          {plants && plants.length > 0 && (
            <p className={styles.subtitle}>
              🌿 {plants.length} {plants.length === 1 ? 'plant' : 'plants'}
              {needAttention > 0
                ? ` · 💧 ${needAttention} need${needAttention === 1 ? 's' : ''} attention`
                : ' · all happy and cared for'}
            </p>
          )}
        </div>
        <Link to="/plants/new" className={styles.addButton}>+ Add plant</Link>
      </header>

      <div className={styles.divider} />

      {isLoading && <p className={styles.state}>Loading plants…</p>}
      {error && <p className={styles.state}>Error: {error.message}</p>}

      {plants && plants.length === 0 && (
        <div className={styles.empty}>
          <LeafMotif className={styles.emptyLeaf} />
          <p className={styles.emptyTitle}>Your jungle starts here</p>
          <p className={styles.emptyText}>Add your first plant and never forget a watering again.</p>
          <Link to="/plants/new" className={styles.addButton}>Add your first plant</Link>
        </div>
      )}

      {plants && plants.length > 0 && (
        <ul className={styles.grid}>
          {plants.map((plant) => (
            <li key={plant.id}>
              <PlantCard plant={plant} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
