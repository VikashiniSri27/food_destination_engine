import { useState } from 'react'
import axios from 'axios'
import Header from './components/Header'
import Stepper from './components/Stepper'
import Page1Upload from './components/Page1Upload'
import Page2Details from './components/Page2Details'
import Page3Result from './components/Page3Result'
import Page4Explain from './components/Page4Explain'
import Page5Impact from './components/Page5Impact'
import PageHistory from './components/PageHistory'
import styles from './App.module.css'

const API = 'http://localhost:5000/api'

const STEPS = [
  { label: 'Upload',  icon: '📷' },
  { label: 'Details', icon: '🗂️' },
  { label: 'Result',  icon: '🎯' },
  { label: 'Explain', icon: '🧠' },
  { label: 'Impact',  icon: '🌍' },
]

const DEFAULT_FORM = {
  food_type:         'cooked_rice',
  storage_condition: 'room_temperature',
  hours_since_prep:  '',
  temperature_c:     '25',
  humidity_pct:      '60',
  quantity_kg:       '1',
}

export default function App() {
  const [view,        setView]        = useState('analyzer') // 'analyzer' | 'history'
  const [page,        setPage]        = useState(0)
  const [imageFile,   setImageFile]   = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [form,        setForm]        = useState(DEFAULT_FORM)
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const next  = () => setPage(p => Math.min(p + 1, 4))
  const back  = () => setPage(p => Math.max(p - 1, 0))
  const goTo  = (p) => setPage(p)

  const reset = () => {
    setPage(0); setImageFile(null); setPreview(null)
    setForm(DEFAULT_FORM); setResult(null); setError(null)
    setView('analyzer')
  }

  const handleAnalyze = async () => {
    if (!imageFile)              { setError('Please upload a food image.'); return }
    if (!form.hours_since_prep)  { setError('Hours since preparation is required.'); return }
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('image', imageFile)
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      const { data } = await axios.post(`${API}/analyze`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
      setResult({ ...data, imagePreview: preview })
      setPage(2)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Analysis failed. Make sure backend is running.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── history view ──────────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <div className={styles.app}>
        <Header onHistoryClick={() => setView('analyzer')} />
        <main className={styles.main}>
          <PageHistory onBack={() => setView('analyzer')} />
        </main>
      </div>
    )
  }

  // ── analyzer view ─────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>
      <Header onHistoryClick={() => setView('history')} />
      <Stepper steps={STEPS} current={page} onStep={goTo} resultReady={!!result} />
      <main className={styles.main}>
        {page === 0 && (
          <Page1Upload
            imageFile={imageFile} preview={preview}
            setImageFile={setImageFile} setPreview={setPreview}
            onNext={next} error={error} setError={setError}
          />
        )}
        {page === 1 && (
          <Page2Details
            form={form} setForm={setForm}
            onBack={back} onAnalyze={handleAnalyze}
            loading={loading} error={error}
            preview={preview}
          />
        )}
        {page === 2 && result && (
          <Page3Result result={result} onNext={next} onBack={back} onReset={reset} />
        )}
        {page === 3 && result && (
          <Page4Explain result={result} onNext={next} onBack={back} />
        )}
        {page === 4 && result && (
          <Page5Impact result={result} onBack={back} onReset={reset} />
        )}
      </main>
    </div>
  )
}
