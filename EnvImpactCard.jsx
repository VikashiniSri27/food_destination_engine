import styles from './EnvImpactCard.module.css'

const PATHWAY_CONTEXT = {
  'Human Donation':   { color: '#22c55e', intro: 'By donating this food, you help avoid:' },
  'Animal Feed':      { color: '#f59e0b', intro: 'Redirecting to animal feed avoids:' },
  'Compost / Biogas': { color: '#6366f1', intro: 'Composting or biogas recovers:' },
}

export default function EnvImpactCard({ impact, pathway }) {
  const ctx = PATHWAY_CONTEXT[pathway] || PATHWAY_CONTEXT['Human Donation']

  const stats = [
    {
      icon: '🌿',
      value: impact.co2_saved_kg,
      unit: 'kg CO₂',
      label: 'greenhouse gas saved',
      color: '#22c55e',
    },
    {
      icon: '💧',
      value: impact.water_saved_l,
      unit: 'litres',
      label: 'water footprint saved',
      color: '#3b82f6',
    },
    ...(impact.meals_equivalent > 0 ? [{
      icon: '🍽️',
      value: impact.meals_equivalent,
      unit: 'meals',
      label: 'equivalent meals provided',
      color: '#f59e0b',
    }] : []),
  ]

  return (
    <div className={styles.card}>
      <p className={styles.label}>🌍 Environmental Impact</p>
      <p className={styles.intro}>{ctx.intro}</p>

      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statIcon}>{s.icon}</span>
            <div>
              <p className={styles.statValue} style={{ color: s.color }}>
                {typeof s.value === 'number' && s.value % 1 !== 0
                  ? s.value.toFixed(2)
                  : s.value}
                <span className={styles.statUnit}> {s.unit}</span>
              </p>
              <p className={styles.statLabel}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sdgTag}>
        <span>🎯</span>
        <span>Contributes to UN SDG 12.3 — Halve per-capita global food waste by 2030</span>
      </div>
    </div>
  )
}
