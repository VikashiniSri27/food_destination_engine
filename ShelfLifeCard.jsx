import styles from './ShelfLifeCard.module.css'

const TIER_META = {
  Safe:       { color: '#22c55e', bg: '#dcfce7', text: '#166534', icon: '✅' },
  Acceptable: { color: '#3b82f6', bg: '#dbeafe', text: '#1e40af', icon: '🔵' },
  Borderline: { color: '#f59e0b', bg: '#fef3c7', text: '#92400e', icon: '⚠️' },
  Unsafe:     { color: '#ef4444', bg: '#fee2e2', text: '#991b1b', icon: '🚫' },
}

function fmt(hours) {
  if (hours <= 0) return 'Expired'
  if (hours < 1)  return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} hrs`
  const days = (hours / 24).toFixed(1)
  return `${days} days`
}

export default function ShelfLifeCard({ shelf }) {
  const meta = TIER_META[shelf.safety_tier] || TIER_META.Borderline
  const usePct = Math.min(100, Math.max(0, shelf.usability_pct ?? 0))

  return (
    <div className={styles.card}>
      <p className={styles.label}>Shelf-Life Prediction</p>

      <div className={styles.badge} style={{ background: meta.bg, color: meta.text }}>
        {meta.icon} {shelf.safety_tier}
      </div>

      <div className={styles.main}>
        <div className={styles.bigNum}>{fmt(shelf.remaining_safe_hours)}</div>
        <div className={styles.bigSub}>remaining safe time</div>
      </div>

      {/* radial-ish gauge via conic-gradient */}
      <div className={styles.gaugeWrap}>
        <div
          className={styles.gauge}
          style={{ background: `conic-gradient(${meta.color} ${usePct}%, #e5e7eb ${usePct}%)` }}
          role="img"
          aria-label={`Usability: ${usePct}%`}
        >
          <div className={styles.gaugeInner}>
            <span className={styles.gaugePct}>{usePct}%</span>
            <span className={styles.gaugeText}>usable</span>
          </div>
        </div>
      </div>

      <div className={styles.meta}>
        <Row label="Max adjusted shelf-life" value={fmt(shelf.adjusted_max_hours)} />
        {shelf.factors?.temperature_penalty !== undefined && (
          <Row label="Temperature factor" value={`×${shelf.factors.temperature_penalty}`} />
        )}
        {shelf.factors?.humidity_penalty !== undefined && (
          <Row label="Humidity factor" value={`×${shelf.factors.humidity_penalty}`} />
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--gray-600)' }}>
      <span>{label}</span>
      <strong style={{ color: 'var(--gray-800)' }}>{value}</strong>
    </div>
  )
}
