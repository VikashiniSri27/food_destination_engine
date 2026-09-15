import { useState, useRef } from 'react'
import axios from 'axios'
import styles from './AnalyzeForm.module.css'

const API = 'http://localhost:5000/api'

const FOOD_TYPE_LABELS = {
  cooked_rice: 'Cooked Rice', cooked_meat: 'Cooked Meat',
  cooked_vegetables: 'Cooked Vegetables', raw_vegetables: 'Raw Vegetables',
  fruits: 'Fruits', dairy: 'Dairy', bread: 'Bread',
  soup_stew: 'Soup / Stew', fried_food: 'Fried Food', other: 'Other',
}

const STORAGE_LABELS = {
  room_temperature: 'Room Temperature', refrigerated: 'Refrigerated',
  frozen: 'Frozen', hot_holding: 'Hot Holding (≥60°C)',
}

const DEFAULT_FORM = {
  food_type: 'cooked_rice',
  storage_condition: 'room_temperature',
  hours_since_prep: '',
  temperature_c: '25',
  humidity_pct: '60',
  quantity_kg: '1',
}

export default function AnalyzeForm({ onResult, onError, loading, setLoading, error }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  const handleField = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleImageFile = (file) => {
    if (!file) return
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleFileInput = (e) => handleImageFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleImageFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageFile) { onError('Please upload a food image.'); return }
    if (form.hours_since_prep === '') { onError('Hours since preparation is required.'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', imageFile)
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))

      const { data } = await axios.post(`${API}/analyze`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
      onResult({ ...data, imagePreview: preview })
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.join(' ')
        || err.message
        || 'Analysis failed. Make sure the backend is running on port 5000.'
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* ── hero ── */}
      <div className={styles.hero}>
        <h2 className={styles.heroTitle}>Analyze Your Surplus Food</h2>
        <p className={styles.heroDesc}>
          Upload a photo and provide context. Our AI will assess quality,
          estimate shelf-life, and recommend the best recovery pathway.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {/* ── image drop zone ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📸 Food Image</h3>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragActive : ''}`}
            onClick={() => fileInputRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current.click()}
            aria-label="Upload food image"
          >
            {preview ? (
              <div className={styles.previewWrap}>
                <img src={preview} alt="Food preview" className={styles.previewImg} />
                <div className={styles.previewOverlay}>
                  <span>Click or drag to change image</span>
                </div>
              </div>
            ) : (
              <div className={styles.dropPlaceholder}>
                <span className={styles.dropIcon}>📷</span>
                <p className={styles.dropText}>Drop image here or <strong>click to browse</strong></p>
                <p className={styles.dropHint}>PNG, JPG, WEBP up to 10 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className={styles.hiddenInput}
            aria-hidden="true"
          />
        </section>

        {/* ── contextual info ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🗂️ Food Details</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="food_type">Food Type</label>
              <select
                id="food_type" name="food_type"
                value={form.food_type} onChange={handleField}
                className={styles.select}
              >
                {Object.entries(FOOD_TYPE_LABELS).map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="storage_condition">Storage Condition</label>
              <select
                id="storage_condition" name="storage_condition"
                value={form.storage_condition} onChange={handleField}
                className={styles.select}
              >
                {Object.entries(STORAGE_LABELS).map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="hours_since_prep">
                Hours Since Preparation <span className={styles.required}>*</span>
              </label>
              <input
                id="hours_since_prep" name="hours_since_prep" type="number"
                min="0" max="8760" step="0.5"
                value={form.hours_since_prep} onChange={handleField}
                placeholder="e.g. 6"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="quantity_kg">Quantity (kg)</label>
              <input
                id="quantity_kg" name="quantity_kg" type="number"
                min="0.01" max="10000" step="0.1"
                value={form.quantity_kg} onChange={handleField}
                className={styles.input}
              />
            </div>
          </div>
        </section>

        {/* ── environment ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🌡️ Environmental Conditions <span className={styles.optional}>(optional)</span></h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="temperature_c">
                Temperature (°C)
                <span className={styles.hint}> — ambient or storage temp</span>
              </label>
              <input
                id="temperature_c" name="temperature_c" type="number"
                min="-30" max="120" step="0.5"
                value={form.temperature_c} onChange={handleField}
                className={styles.input}
              />
              <RangeSlider name="temperature_c" min={-30} max={80} value={form.temperature_c} onChange={handleField} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="humidity_pct">
                Humidity (%)
              </label>
              <input
                id="humidity_pct" name="humidity_pct" type="number"
                min="0" max="100" step="1"
                value={form.humidity_pct} onChange={handleField}
                className={styles.input}
              />
              <RangeSlider name="humidity_pct" min={0} max={100} value={form.humidity_pct} onChange={handleField} />
            </div>
          </div>
        </section>

        {/* ── error ── */}
        {error && (
          <div className={styles.errorBox} role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* ── submit ── */}
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? (
            <><span className={styles.spinner} aria-hidden="true" /> Analyzing…</>
          ) : (
            '🔍 Analyze Food'
          )}
        </button>
      </form>
    </div>
  )
}

function RangeSlider({ name, min, max, value, onChange }) {
  return (
    <input
      type="range" name={name} min={min} max={max} step="1"
      value={value || min}
      onChange={onChange}
      className={styles.slider}
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}
