import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAddPlant, useUpdatePlant } from '../hooks/usePlantMutations'
import { useUpsertCareNeeds } from '../hooks/useCareNeeds'
import { usePlant } from '../hooks/usePlants'
import { usePlantLookup } from '../hooks/usePlantLookup'
import styles from './AddPlant.module.css'

const LIGHT_OPTIONS = ['low', 'medium', 'high', 'direct']

const DEFAULTS = {
  water_every_days: '7',
  light_level: 'medium',
  soil_type: '',
  fertilize_every_days: '',
}

export function AddPlant() {
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const { data: existing } = usePlant(isEdit ? id : null)
  const { lookup, loading: lookupLoading, suggestion, clear } = usePlantLookup()

  const [form, setForm] = useState({
    name: '',
    species: '',
    location: '',
    photo_url: '',
    notes: '',
    ...DEFAULTS,
  })

  const [initialised, setInitialised] = useState(false)
  if (existing && !initialised) {
    setInitialised(true)
    setForm({
      name: existing.name ?? '',
      species: existing.species ?? '',
      location: existing.location ?? '',
      photo_url: existing.photo_url ?? '',
      notes: existing.notes ?? '',
      water_every_days: String(existing.water_every_days ?? '7'),
      light_level: existing.light_level ?? 'medium',
      soil_type: existing.soil_type ?? '',
      fertilize_every_days: String(existing.fertilize_every_days ?? ''),
    })
  }

  function applySuggestion() {
    if (!suggestion) return
    setForm((f) => ({
      ...f,
      species: suggestion.species ?? f.species,
      notes: suggestion.notes ?? f.notes,
      water_every_days: suggestion.water_every_days ? String(suggestion.water_every_days) : f.water_every_days,
      light_level: suggestion.light_level ?? f.light_level,
      soil_type: suggestion.soil_type ?? f.soil_type,
      fertilize_every_days: suggestion.fertilize_every_days ? String(suggestion.fertilize_every_days) : f.fertilize_every_days,
    }))
    clear()
  }

  const addPlant = useAddPlant()
  const updatePlant = useUpdatePlant()
  const upsertCareNeeds = useUpsertCareNeeds()

  const saving = addPlant.isPending || updatePlant.isPending || upsertCareNeeds.isPending
  const saveError = addPlant.error || updatePlant.error || upsertCareNeeds.error

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const plantPayload = {
      name: form.name.trim(),
      species: form.species.trim() || null,
      location: form.location.trim() || null,
      photo_url: form.photo_url.trim() || null,
      notes: form.notes.trim() || null,
    }

    let plantId = id
    if (isEdit) {
      await updatePlant.mutateAsync({ id, ...plantPayload })
    } else {
      const created = await addPlant.mutateAsync(plantPayload)
      plantId = created.id
    }

    await upsertCareNeeds.mutateAsync({
      plantId,
      waterEveryDays: parseInt(form.water_every_days, 10) || 7,
      lightLevel: form.light_level,
      soilType: form.soil_type.trim() || null,
      fertilizeEveryDays: form.fertilize_every_days ? parseInt(form.fertilize_every_days, 10) : null,
    })

    navigate(isEdit ? `/plants/${plantId}` : '/')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Back</button>
        <h1 className={styles.title}>{isEdit ? 'Edit plant' : 'Add plant'}</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Plant info</h2>

          <label className={styles.label}>
            Name <span className={styles.required}>*</span>
            <div className={styles.nameRow}>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                placeholder="e.g. Monstera"
              />
              <button
                type="button"
                className={styles.lookupBtn}
                onClick={() => lookup(form.name)}
                disabled={lookupLoading || form.name.trim().length < 2}
              >
                {lookupLoading ? '…' : '✨ Look up'}
              </button>
            </div>
          </label>

          {suggestion && (
            <div className={styles.suggestionBanner}>
              <div className={styles.suggestionText}>
                <strong>✨ {suggestion.species || form.name}</strong>
                {suggestion.water_every_days && <span> · 💧 every {suggestion.water_every_days}d</span>}
                {suggestion.light_level && <span> · {suggestion.light_level} light</span>}
                {suggestion.soil_type && <span> · {suggestion.soil_type}</span>}
              </div>
              <div className={styles.suggestionActions}>
                <button type="button" className={styles.applyBtn} onClick={applySuggestion}>Apply</button>
                <button type="button" className={styles.dismissBtn} onClick={clear}>✕</button>
              </div>
            </div>
          )}

          <label className={styles.label}>
            Species
            <input
              className={styles.input}
              value={form.species}
              onChange={(e) => set('species', e.target.value)}
              placeholder="e.g. Monstera deliciosa"
            />
          </label>

          <label className={styles.label}>
            Location
            <input
              className={styles.input}
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Living room"
            />
          </label>

          <label className={styles.label}>
            Photo URL
            <input
              className={styles.input}
              type="url"
              value={form.photo_url}
              onChange={(e) => set('photo_url', e.target.value)}
              placeholder="https://…"
            />
          </label>

          <label className={styles.label}>
            Notes
            <textarea
              className={styles.input}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Any notes about this plant…"
            />
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Care needs</h2>

          <label className={styles.label}>
            Water every (days)
            <input
              className={styles.input}
              type="number"
              min="1"
              value={form.water_every_days}
              onChange={(e) => set('water_every_days', e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Light level
            <select
              className={styles.input}
              value={form.light_level}
              onChange={(e) => set('light_level', e.target.value)}
            >
              {LIGHT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Soil type
            <input
              className={styles.input}
              value={form.soil_type}
              onChange={(e) => set('soil_type', e.target.value)}
              placeholder="e.g. Well-draining potting mix"
            />
          </label>

          <label className={styles.label}>
            Fertilize every (days)
            <input
              className={styles.input}
              type="number"
              min="1"
              value={form.fertilize_every_days}
              onChange={(e) => set('fertilize_every_days', e.target.value)}
              placeholder="Optional"
            />
          </label>
        </section>

        {saveError && <p className={styles.error}>{saveError.message}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add plant'}
          </button>
        </div>
      </form>
    </div>
  )
}
