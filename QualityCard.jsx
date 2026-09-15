import styles from './QualityCard.module.css'

const TIER_COLORS = {
  Fresh:            { bg: '#dcfce7', text: '#166534', bar: '#22c55e' },
  'Slightly Spoiled':{ bg: '#fef3c7', text: '#92400e', bar: '#f59e0b' },
  Spoiled:          { bg: '#fee2e2', text: '#991b1b', bar: '#ef4444' },
  Unknown:          { bg: '#f3f4f6', text: '#6b7280', bar: '#9ca3af' },
}

export default function QualityCard({ quality }) {
  const tier = TIER_COLORS[quality.quality_label] || TIER_COLORS.Unknown
  const scorePct = Math.round((quality.quality_score ?? 0.5) * 100)
  const probs = quality.probabilities || {}

  return (
    <div className={styles.card}>
      <p className={styles.label}>Image Quality Assessment</p>
      <div className={styles.badge} style={{ background: tier.bg, color: tier.text }}>
        {quality.quality_label}
      </div>

      <div className={styles.scoreRow}>
        <span className={styles.scoreNum}>{scorePct}%</span>
        <span className={styles.scoreText}>quality score</span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${scorePct}%`, background: tier.bar }} />
      </div>

      {Object.keys(probs).length > 0 && (
        <div className={styles.probs}>
          <p className={styles.probsTitle}>Class probabilities</p>
          {Object.entries(probs).map(([cls, p]) => (
            <div key={cls} className={styles.probRow}>
              <span className={styles.probLabel}>{cls}</span>
              <div className={styles.probTrack}>
                <div className={styles.probFill} style={{ width: `${Math.round(p * 100)}%`, background: tier.bar }} />
              </div>
              <span className={styles.probPct}>{Math.round(p * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <p className={styles.mode}>🔬 {quality.inference_mode}</p>
    </div>
  )
}
