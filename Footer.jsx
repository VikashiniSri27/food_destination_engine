import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.text}>
          🍱 <strong>AI Food Destination Engine</strong> — Batch 05 |
          Supervisor: Dr. V. Vijayaganth
        </p>
        <p className={styles.members}>
          23AD067 Vikashinisri M · 23AD053 Sandhya S · 23AD018 Gayathri L
        </p>
      </div>
    </footer>
  )
}
