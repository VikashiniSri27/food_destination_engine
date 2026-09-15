import styles from './RecommendationCard.module.css'

export default function RecommendationCard({ recommendation: r }) {
  const confPct = Math.round(r.confidence * 100)

  return (
    <div className={styles.card} style={{ borderLeftColor: r.color }}>
      <div className={styles.top}>
        <span className={styles.icon} aria-hidden="true">{r.icon}</span>
        <div className={styles.text}>
          <p className={styles.label}>Recommended Pathway</p>
          <h2 className={styles.pathway} style={{ color: r.color }}>{r.recommendation}</h2>
          <p className={styles.desc}>{r.description}</p>
        </div>
        <div className={styles.confidenceWrap}>
          <ConfidenceRing pct={confPct} color={r.color} />
          <p className={styles.confLabel}>AI Confidence</p>
        </div>
      </div>
    </div>
  )
}

function ConfidenceRing({ pct, color }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`Confidence: ${pct}%`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  )
}
