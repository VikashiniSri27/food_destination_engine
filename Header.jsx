import styles from './Header.module.css'

export default function Header({ onHistoryClick }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logoWrap} aria-hidden="true">🍱</div>
          <div>
            <h1 className={styles.title}>AI Food Destination Engine</h1>
            <p className={styles.sub}>Intelligent surplus food recovery powered by AI</p>
          </div>
        </div>
        <nav className={styles.right}>
          <div className={styles.badges}>
            <span className={styles.badge} style={{ background:'rgba(34,197,94,.15)', color:'#86efac' }}>🤝 Human Donation</span>
            <span className={styles.badge} style={{ background:'rgba(245,158,11,.15)', color:'#fcd34d' }}>🐄 Animal Feed</span>
            <span className={styles.badge} style={{ background:'rgba(99,102,241,.15)', color:'#a5b4fc' }}>♻️ Compost/Biogas</span>
          </div>
          <button className={styles.historyBtn} onClick={onHistoryClick} aria-label="View history">
            📋 History
          </button>
        </nav>
      </div>
    </header>
  )
}
