import styles from './Stepper.module.css'

export default function Stepper({ steps, current, onStep, resultReady }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        {steps.map((step, i) => {
          const done    = resultReady && i < current
          const active  = i === current
          const locked  = !resultReady && i > 1
          return (
            <button
              key={i}
              className={`${styles.step} ${active ? styles.active : ''} ${done ? styles.done : ''} ${locked ? styles.locked : ''}`}
              onClick={() => !locked && onStep(i)}
              disabled={locked}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.circle}>
                {done ? '✓' : step.icon}
              </span>
              <span className={styles.label}>{step.label}</span>
            </button>
          )
        })}
        <div className={styles.line} />
      </div>
    </div>
  )
}
