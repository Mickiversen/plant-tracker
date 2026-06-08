import { Link } from 'react-router-dom'
import { usePlants } from '../hooks/usePlants'
import { PlantCard } from '../components/PlantCard'
import styles from './PlantList.module.css'

export function PlantList() {
  const { data: plants, isLoading, error } = usePlants()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Plants</h1>
        <Link to="/plants/new" className={styles.addButton}>+ Add plant</Link>
      </header>

      {isLoading && <p className={styles.state}>Loading plants…</p>}
      {error && <p className={styles.state}>Error: {error.message}</p>}

      {plants && plants.length === 0 && (
        <div className={styles.empty}>
          <p>No plants yet.</p>
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
