import styles from './Page2Details.module.css'

const FOOD_TYPES = {
  cooked_rice: 'Cooked Rice', cooked_meat: 'Cooked Meat',
  cooked_vegetables: 'Cooked Vegetables', raw_vegetables: 'Raw Vegetables',
  fruits: 'Fruits', dairy: 'Dairy', bread: 'Bread',
  soup_stew: 'Soup / Stew', fried_food: 'Fried Food', other: 'Other',
}
const STORAGE = {
  room_temperature: 'Room Temperature', refrigerated: 'Refrigerated',
  frozen: 'Frozen', hot_holding: 'Hot Holding (≥60°C)',
}

export default function Page2Details({ form, setForm, onBack, onAnalyze, loading, error, preview }) {
  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className={styles.page}>
      <div className={`${styles.hero} animate-in`}>
        <h2 className={styles.title}>Food Details</h2>
        <p className={styles.desc}>Provide context about the food to improve shelf-life prediction accuracy.</p>
      </div>

      <div className={`${styles.layout} animate-in delay-1`}>
        {preview && (
          <div className={styles.imgBox}>
            <p className={styles.imgLabel}>Your Image</p>
            <img src={preview} alt="food" className={styles.img} />
          </div>
        )}

        <div className={styles.formBox}>
          <div className={styles.row2}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="food_type">Food Type</label>
              <select id="food_type" name="food_type" value={form.food_type} onChange={set} className={styles.select}>
                {Object.entries(FOOD_TYPES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="storage_condition">Storage Condition</label>
              <select id="storage_condition" name="storage_condition" value={form.storage_condition} onChange={set} className={styles.select}>
                {Object.entries(STORAGE).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="hours_since_prep">
                Hours Since Preparation <span className={styles.req}>*</span>
              </label>
              <input id="hours_since_prep" name="hours_since_prep" type="number"
                min="0" max="8760" step="0.5" placeholder="e.g. 6"
                value={form.hours_since_prep} onChange={set} className={styles.input} />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="quantity_kg">Quantity (kg)</label>
              <input id="quantity_kg" name="quantity_kg" type="number"
                min="0.1" step="0.1" value={form.quantity_kg} onChange={set} className={styles.input} />
            </div>
          </div>

          <div className={styles.divider} />
          <p className={styles.envTitle}>🌡️ Environmental Conditions</p>

          <div className={styles.group}>
            <label className={styles.label} htmlFor="temperature_c">
              Temperature
              <span className={styles.sliderVal}>{form.temperature_c}°C</span>
            </label>
            <input type="range" id="temperature_c" name="temperature_c"
              min="-10" max="80" step="1" value={form.temperature_c} onChange={set} className={styles.range} />
            <div className={styles.rangeLabels}><span>-10°C (Cold)</span><span>80°C (Hot)</span></div>
          </div>

          <div className={styles.group}>
            <label className={styles.label} htmlFor="humidity_pct">
              Humidity
              <span className={styles.sliderVal}>{form.humidity_pct}%</span>
            </label>
            <input type="range" id="humidity_pct" name="humidity_pct"
              min="0" max="100" step="1" value={form.humidity_pct} onChange={set} className={styles.range} />
            <div className={styles.rangeLabels}><span>0% (Dry)</span><span>100% (Humid)</span></div>
          </div>
        </div>
      </div>

      {error && <div className={styles.error} role="alert">⚠️ {error}</div>}

      <div className={`${styles.actions} animate-in delay-2`}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <button className={styles.analyzeBtn} onClick={onAnalyze} disabled={loading}>
          {loading ? <><span className={styles.spinner} /> Analyzing your food…</> : '🔍 Analyze Food'}
        </button>
      </div>
    </div>
  )
}
