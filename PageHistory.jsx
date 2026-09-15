import { useState, useEffect } from 'react'
import axios from 'axios'
import styles from './PageHistory.module.css'

const API = 'http://localhost:5000/api'

const PATHWAY_META = {
  'Human Donation':  { icon: '🤝', color: '#16a34a', bg: '#dcfce7' },
  'Animal Feed':     { icon: '🐄', color: '#d97706', bg: '#fef3c7' },
  'Compost / Biogas':{ icon: '♻️', color: '#4f46e5', bg: '#e0e7ff' },
}

const QUALITY_META = {
  'Fresh':            { color: '#16a34a', bg: '#dcfce7' },
  'Slightly Spoiled': { color: '#d97706', bg: '#fef3c7' },
  'Spoiled':          { color: '#dc2626', bg: '#fee2e2' },
}

export default function PageHistory({ onBack }) {
  const [stats,   setStats]   = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true); setError(null)
    try {
      const [sRes, hRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/history?limit=100`),
      ])
      setStats(sRes.data.stats)
      setRecords(hRes.data.records)
    } catch (e) {
      setError('Could not load data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return
    setDeleting(id)
    try {
      await axios.delete(`${API}/history/${id}`)
      setRecords(r => r.filter(x => x.id !== id))
      // refresh stats
      const sRes = await axios.get(`${API}/stats`)
      setStats(sRes.data.stats)
    } catch {
      alert('Could not delete record.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className={styles.page}>
      {/* header row */}
      <div className={`${styles.topBar} animate-in`}>
        <div>
          <h2 className={styles.title}>Analysis History</h2>
          <p className={styles.desc}>All food assessments saved to the database</p>
        </div>
        <div className={styles.topActions}>
          <button className={styles.refreshBtn} onClick={fetchAll}>↻ Refresh</button>
          <button className={styles.backBtn} onClick={onBack}>← Back to Analyzer</button>
        </div>
      </div>

      {loading && <LoadingState />}
      {error   && <ErrorState message={error} onRetry={fetchAll} />}

      {!loading && !error && stats && (
        <>
          {/* stats cards */}
          <div className={`${styles.statsGrid} animate-in delay-1`}>
            <StatCard icon="🔬" label="Total Analyses"     value={stats.total_analyses}        color="#16a34a" bg="#dcfce7" />
            <StatCard icon="🌿" label="CO₂ Saved (kg)"     value={stats.total_co2_saved_kg}    color="#059669" bg="#d1fae5" />
            <StatCard icon="💧" label="Water Saved (L)"    value={stats.total_water_saved_l}   color="#0284c7" bg="#dbeafe" />
            <StatCard icon="🍽️" label="Meals Provided"     value={stats.total_meals}           color="#d97706" bg="#fef3c7" />
          </div>

          {/* pathway breakdown */}
          <div className={`${styles.row2} animate-in delay-2`}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Pathway Distribution</p>
              {Object.entries(PATHWAY_META).map(([name, meta]) => {
                const count = stats.pathway_counts[name] || 0
                const pct   = stats.total_analyses > 0 ? Math.round(count / stats.total_analyses * 100) : 0
                return (
                  <div key={name} className={styles.barRow}>
                    <span className={styles.barLabel}>{meta.icon} {name}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <span className={styles.barCount}>{count}</span>
                  </div>
                )
              })}
            </div>

            <div className={styles.card}>
              <p className={styles.cardTitle}>Quality Distribution</p>
              {Object.entries(QUALITY_META).map(([name, meta]) => {
                const count = stats.quality_counts[name] || 0
                const pct   = stats.total_analyses > 0 ? Math.round(count / stats.total_analyses * 100) : 0
                return (
                  <div key={name} className={styles.barRow}>
                    <span className={styles.barLabel}>{name}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <span className={styles.barCount}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* records table */}
          <div className={`${styles.card} animate-in delay-3`}>
            <div className={styles.tableHeader}>
              <p className={styles.cardTitle}>All Records ({records.length})</p>
            </div>

            {records.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>📭</span>
                <p>No analyses yet. Go analyze some food!</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date & Time</th>
                      <th>Food Type</th>
                      <th>Quality</th>
                      <th>Safety</th>
                      <th>Recommendation</th>
                      <th>Qty (kg)</th>
                      <th>CO₂ Saved</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => {
                      const pm = PATHWAY_META[r.recommendation] || {}
                      const qm = QUALITY_META[r.quality_label]  || {}
                      return (
                        <tr key={r.id} className={styles.row} style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className={styles.idCell}>{r.id}</td>
                          <td className={styles.dateCell}>{formatDate(r.created_at)}</td>
                          <td className={styles.foodCell}>{r.food_type.replace(/_/g,' ')}</td>
                          <td>
                            <span className={styles.pill} style={{ background: qm.bg, color: qm.color }}>
                              {r.quality_label}
                            </span>
                          </td>
                          <td>
                            <span className={styles.tierPill} data-tier={r.safety_tier}>
                              {r.safety_tier}
                            </span>
                          </td>
                          <td>
                            <span className={styles.pill} style={{ background: pm.bg, color: pm.color }}>
                              {pm.icon} {r.recommendation}
                            </span>
                          </td>
                          <td className={styles.numCell}>{r.quantity_kg}</td>
                          <td className={styles.numCell}>{r.co2_saved_kg} kg</td>
                          <td>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(r.id)}
                              disabled={deleting === r.id}
                              title="Delete record"
                            >
                              {deleting === r.id ? '…' : '🗑'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className={styles.statCard} style={{ background: bg, borderColor: color + '44' }}>
      <span className={styles.statIcon}>{icon}</span>
      <div className={styles.statValue} style={{ color }}>{value ?? 0}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className={styles.loadingState}>
      <div className={styles.spinner} />
      <p>Loading database records…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <span>⚠️</span>
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
