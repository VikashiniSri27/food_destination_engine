import RecommendationCard from './RecommendationCard'
import QualityCard from './QualityCard'
import ShelfLifeCard from './ShelfLifeCard'
import ExplainCard from './ExplainCard'
import EnvImpactCard from './EnvImpactCard'
import styles from './ResultsDashboard.module.css'

export default function ResultsDashboard({ result, onReset }) {
  const { image_quality, shelf_life, recommendation, inputs, imagePreview } = result

  return (
    <div className={styles.dashboard}>
      {/* ── top bar ── */}
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.pageTitle}>Analysis Results</h2>
          <p className={styles.pageDesc}>
            Food type: <strong>{inputs.food_type.replace(/_/g, ' ')}</strong> ·
            Storage: <strong>{inputs.storage_condition.replace(/_/g, ' ')}</strong> ·
            Prepared <strong>{inputs.hours_since_prep}h ago</strong> ·
            Quantity: <strong>{inputs.quantity_kg} kg</strong>
          </p>
        </div>
        <button className={styles.resetBtn} onClick={onReset}>
          ← Analyze Another
        </button>
      </div>

      {/* ── main recommendation ── */}
      <RecommendationCard recommendation={recommendation} />

      {/* ── image + quality + shelf-life row ── */}
      <div className={styles.row3}>
        {imagePreview && (
          <div className={styles.imageCard}>
            <p className={styles.cardLabel}>Uploaded Image</p>
            <img src={imagePreview} alt="Analyzed food" className={styles.foodImg} />
          </div>
        )}
        <QualityCard quality={image_quality} />
        <ShelfLifeCard shelf={shelf_life} />
      </div>

      {/* ── explainability + environmental impact ── */}
      <div className={styles.row2}>
        <ExplainCard explanation={recommendation.explanation} inferenceMode={image_quality.inference_mode} />
        <EnvImpactCard impact={recommendation.environmental_impact} pathway={recommendation.recommendation} />
      </div>
    </div>
  )
}
