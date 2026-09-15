import styles from './Page3Result.module.css'

const TIER = {
  Fresh:             { bg:'#dcfce7', text:'#166534', bar:'#22c55e' },
  'Slightly Spoiled':{ bg:'#fef3c7', text:'#92400e', bar:'#f59e0b' },
  Spoiled:           { bg:'#fee2e2', text:'#991b1b', bar:'#ef4444' },
  Unknown:           { bg:'#f1f5f9', text:'#475569', bar:'#94a3b8' },
}
const SHELF_COL = { Safe:'#22c55e', Acceptable:'#3b82f6', Borderline:'#f59e0b', Unsafe:'#ef4444' }

function fmt(h) {
  if (h <= 0) return 'Expired'
  if (h < 1)  return `${Math.round(h*60)} min`
  if (h < 24) return `${h.toFixed(1)} hrs`
  return `${(h/24).toFixed(1)} days`
}

export default function Page3Result({ result, onNext, onBack, onReset }) {
  const { image_quality: q, shelf_life: s, recommendation: r, imagePreview, inputs } = result
  const tier  = TIER[q.quality_label] || TIER.Unknown
  const sCol  = SHELF_COL[s.safety_tier] || '#94a3b8'
  const qPct  = Math.round((q.quality_score || 0) * 100)
  const sPct  = Math.min(100, Math.max(0, s.usability_pct || 0))

  return (
    <div className={styles.page}>
      <div className={`${styles.hero} animate-in`}>
        <h2 className={styles.title}>Analysis Result</h2>
        <p className={styles.desc}>
          {inputs.food_type.replace(/_/g,' ')} · {inputs.storage_condition.replace(/_/g,' ')} · {inputs.hours_since_prep}h since preparation
        </p>
      </div>

      {/* Recommendation */}
      <div className={`${styles.recCard} animate-in delay-1`} style={{ borderLeftColor: r.color }}>
        <div className={styles.recTop}>
          <span className={styles.recIcon}>{r.icon}</span>
          <div className={styles.recText}>
            <p className={styles.recLabel}>Recommended Pathway</p>
            <h3 className={styles.recTitle} style={{ color: r.color }}>{r.recommendation}</h3>
            <p className={styles.recDesc}>{r.description}</p>
          </div>
          <ConfRing pct={Math.round(r.confidence*100)} color={r.color} />
        </div>
      </div>

      {/* Quality + Shelf */}
      <div className={styles.row2}>
        <div className={`${styles.card} animate-in delay-2`}>
          <p className={styles.cardLabel}>Image Quality Assessment</p>
          {imagePreview && <img src={imagePreview} alt="food" className={styles.thumb} />}
          <span className={styles.badge} style={{ background: tier.bg, color: tier.text }}>{q.quality_label}</span>
          <div className={styles.bigNum}>{qPct}%</div>
          <div className={styles.barTrack}><div className={styles.barFill} style={{ width:`${qPct}%`, background: tier.bar }} /></div>
          {q.probabilities && Object.keys(q.probabilities).length > 0 && (
            <div className={styles.probs}>
              {Object.entries(q.probabilities).map(([cls, p]) => (
                <div key={cls} className={styles.probRow}>
                  <span className={styles.probLbl}>{cls}</span>
                  <div className={styles.probTrack}><div className={styles.probFill} style={{ width:`${Math.round(p*100)}%`, background: tier.bar }} /></div>
                  <span className={styles.probPct}>{Math.round(p*100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${styles.card} animate-in delay-3`}>
          <p className={styles.cardLabel}>Shelf-Life Prediction</p>
          <span className={styles.badge} style={{ background: sCol+'22', color: sCol }}>{s.safety_tier}</span>
          <div className={styles.bigNum}>{fmt(s.remaining_safe_hours)}</div>
          <p className={styles.bigSub}>remaining safe time</p>
          <div className={styles.gauge} style={{ background:`conic-gradient(${sCol} ${sPct}%, #e2e8f0 ${sPct}%)` }}>
            <div className={styles.gaugeInner}>
              <span className={styles.gaugePct}>{sPct}%</span>
              <span className={styles.gaugeText}>usable</span>
            </div>
          </div>
          <div className={styles.metaRows}>
            <MetaRow label="Max shelf-life" value={fmt(s.adjusted_max_hours)} />
            {s.factors?.temperature_penalty !== undefined && <MetaRow label="Temp factor" value={`×${s.factors.temperature_penalty}`} />}
            {s.factors?.humidity_penalty    !== undefined && <MetaRow label="Humidity factor" value={`×${s.factors.humidity_penalty}`} />}
          </div>
        </div>
      </div>

      <div className={`${styles.actions} animate-in delay-4`}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <button className={styles.resetBtn} onClick={onReset}>↺ New Analysis</button>
        <button className={styles.nextBtn} onClick={onNext}>View Explanation →</button>
      </div>
    </div>
  )
}

function MetaRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', color:'var(--gray-600)', padding:'.15rem 0' }}>
      <span>{label}</span><strong style={{ color:'var(--gray-800)' }}>{value}</strong>
    </div>
  )
}

function ConfRing({ pct, color }) {
  const r = 28, circ = 2*Math.PI*r
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-label={`Confidence ${pct}%`} style={{ flexShrink:0 }}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ}
        strokeLinecap="round" transform="rotate(-90 38 38)"
        style={{ transition:'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }} />
      <text x="38" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{pct}%</text>
      <text x="38" y="48" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">confidence</text>
    </svg>
  )
}
