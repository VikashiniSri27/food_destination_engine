import styles from './ExplainCard.module.css'

// Render **bold** markdown in explanation strings
function parseBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((p, i) =>
    p.startsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  )
}

export default function ExplainCard({ explanation, inferenceMode }) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>🧠 AI Explainability</p>
      <p className={styles.sub}>Why this recommendation was made:</p>

      <ol className={styles.list}>
        {explanation.map((point, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.num}>{i + 1}</span>
            <span className={styles.text}>{parseBold(point)}</span>
          </li>
        ))}
      </ol>

      <div className={styles.footer}>
        <span className={styles.modelTag}>🔬 {inferenceMode}</span>
        <span className={styles.disclaimer}>
          AI recommendations should be verified by a qualified food safety officer before distribution.
        </span>
      </div>
    </div>
  )
}
