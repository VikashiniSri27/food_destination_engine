import styles from './Page5Impact.module.css'

export default function Page5Impact({ result, onBack, onReset }) {
  const { recommendation: r, inputs } = result
  const imp = r.environmental_impact

  const stats = [
    { icon:'🌿', value:imp.co2_saved_kg,    unit:'kg CO₂',  label:'Greenhouse gas saved',         color:'#16a34a', bg:'#dcfce7', border:'#86efac' },
    { icon:'💧', value:imp.water_saved_l,   unit:'litres',  label:'Water footprint saved',         color:'#2563eb', bg:'#dbeafe', border:'#93c5fd' },
    ...(imp.meals_equivalent > 0 ? [
      { icon:'🍽️', value:imp.meals_equivalent, unit:'meals', label:'Equivalent meals provided',   color:'#d97706', bg:'#fef3c7', border:'#fcd34d' }
    ] : []),
  ]

  return (
    <div className={styles.page}>
      <div className={`${styles.hero} animate-in`}>
        <h2 className={styles.title}>Environmental Impact</h2>
        <p className={styles.desc}>
          By choosing <strong>{r.recommendation}</strong> for <strong>{inputs.quantity_kg} kg</strong> of food, you make a real difference.
        </p>
      </div>

      <div className={`${styles.banner} animate-in delay-1`} style={{ borderColor: r.color, background: r.color+'10' }}>
        <span style={{ fontSize:'2.2rem' }}>{r.icon}</span>
        <div>
          <p className={styles.bannerLabel}>Selected Pathway</p>
          <p className={styles.bannerName} style={{ color: r.color }}>{r.recommendation}</p>
        </div>
        <div className={styles.qtyTag}>{inputs.quantity_kg} kg of food</div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map(s => (
          <div key={s.label} className={styles.statCard} style={{ borderColor: s.border, background: s.bg }}>
            <span className={styles.statIcon}>{s.icon}</span>
            <div className={styles.statValue} style={{ color: s.color }}>
              {typeof s.value === 'number' && s.value % 1 !== 0 ? s.value.toFixed(2) : s.value}
              <span className={styles.statUnit}> {s.unit}</span>
            </div>
            <p className={styles.statLabel}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className={`${styles.card} animate-in delay-2`}>
        <p className={styles.sectionTitle}>📈 Real-World Equivalents</p>
        <div className={styles.compGrid}>
          <CompItem icon="🚗" label="Equivalent to not driving" value={`${(imp.co2_saved_kg * 4).toFixed(1)} km`} color="#16a34a" />
          <CompItem icon="🌳" label="CO₂ absorbed by trees" value={`${(imp.co2_saved_kg / 21).toFixed(2)} trees/year`} color="#15803d" />
          <CompItem icon="🚿" label="Showers equivalent" value={`${Math.round(imp.water_saved_l / 60)} showers`} color="#2563eb" />
          <CompItem icon="🧴" label="Plastic bottles saved" value={`${Math.round(imp.water_saved_l / 0.5)} bottles`} color="#0284c7" />
        </div>
      </div>

      <div className={`${styles.sdgCard} animate-in delay-3`}>
        <div className={styles.sdgBadge}>SDG 12.3</div>
        <div>
          <p className={styles.sdgTitle}>UN Sustainable Development Goal</p>
          <p className={styles.sdgText}>
            Halve per-capita global food waste at retail and consumer levels by 2030, and reduce food losses along production and supply chains.
          </p>
        </div>
      </div>

      <div className={`${styles.actions} animate-in delay-4`}>
        <button className={styles.backBtn} onClick={onBack}>← Back to Explanation</button>
        <button className={styles.resetBtn} onClick={onReset}>↺ Analyze Another Food</button>
      </div>
    </div>
  )
}

function CompItem({ icon, label, value, color }) {
  return (
    <div className={styles.compItem}>
      <span className={styles.compIcon}>{icon}</span>
      <div>
        <p className={styles.compLabel}>{label}</p>
        <p className={styles.compValue} style={{ color }}>{value}</p>
      </div>
    </div>
  )
}
