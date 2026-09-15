import { useRef, useState } from 'react'
import styles from './Page1Upload.module.css'

export default function Page1Upload({ preview, setImageFile, setPreview, onNext, error, setError }) {
  const fileRef  = useRef()
  const [drag, setDrag] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    const allowed = ['image/jpeg','image/png','image/webp','image/bmp']
    if (!allowed.includes(file.type)) { setError('Only JPG, PNG, WEBP or BMP images are allowed.'); return }
    setError(null)
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleNext = () => {
    if (!preview) { setError('Please upload a food image first.'); return }
    setError(null); onNext()
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.hero} animate-in`}>
        <h2 className={styles.title}>Upload Food Image</h2>
        <p className={styles.desc}>Take a clear photo of the surplus food you want to assess. The clearer the image, the better the AI analysis.</p>
      </div>

      <div
        className={`${styles.dropZone} ${drag ? styles.drag : ''} ${preview ? styles.hasImage : ''} animate-in delay-1`}
        onClick={() => fileRef.current.click()}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current.click()}
        aria-label="Upload food image"
      >
        {preview ? (
          <div className={styles.previewWrap}>
            <img src={preview} alt="Food preview" className={styles.previewImg} />
            <div className={styles.previewOverlay}>🔄 Click or drag to change image</div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.icon}>📷</span>
            <p className={styles.dropText}>Drop image here or <strong>click to browse</strong></p>
            <p className={styles.hint}>JPG, PNG, WEBP — up to 10 MB</p>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} className={styles.hidden} />

      {error && <div className={styles.error} role="alert">⚠️ {error}</div>}

      <div className={`${styles.tips} animate-in delay-2`}>
        <p className={styles.tipsTitle}>💡 Tips for best results</p>
        <ul>
          <li>Use good lighting — avoid dark or blurry images</li>
          <li>Show the entire food item clearly in the frame</li>
          <li>If there are spoil spots or mold, make sure they are visible</li>
        </ul>
      </div>

      <div className={`${styles.actions} animate-in delay-3`}>
        <button className={styles.nextBtn} onClick={handleNext} disabled={!preview}>
          Next — Fill Food Details →
        </button>
      </div>
    </div>
  )
}
