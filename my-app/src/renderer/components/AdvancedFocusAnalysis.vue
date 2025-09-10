<template>
  <div class="advanced-focus-analysis">
    <div class="viz-header">
      <h2>Advanced Focus Analysis</h2>
      <p class="viz-subtitle">Real-time attention tracking with stability, saccade, and distraction analysis</p>
    </div>



    <!-- Focus Analysis Dashboard -->
    <div class="metrics-dashboard">
      <div class="metric-card stability">
        <div class="metric-header">
          <h4>🎯 Stability Index</h4>
          <span class="metric-value">{{ Math.round(analysisData.stabilityIndex * 100) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill stability" 
            :style="{ width: `${analysisData.stabilityIndex * 100}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getStabilityStatus() }}</p>
      </div>

      <div class="metric-card drowsiness">
        <div class="metric-header">
          <h4>😴 Drowsiness</h4>
          <span class="metric-value">{{ Math.round(analysisData.drowsiness * 100) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill drowsiness" 
            :style="{ width: `${analysisData.drowsiness * 100}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getDrowsinessStatus() }}</p>
      </div>

      <div class="metric-card saccades">
        <div class="metric-header">
          <h4>👀 Saccades/min</h4>
          <span class="metric-value">{{ analysisData.saccadesPerMin }}</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill saccades" 
            :style="{ width: `${Math.min(100, analysisData.saccadesPerMin * 2)}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getSaccadeStatus() }}</p>
      </div>

      <div class="metric-card flow-streak">
        <div class="metric-header">
          <h4>⚡ Flow Streak</h4>
          <span class="metric-value">{{ Math.round(analysisData.flowStreakSec / 60) }}m</span>
        </div>
        <div class="metric-info">
          <p>Current focused attention period</p>
          <p class="distraction-type">{{ getDistractionLabel(analysisData.distractionType) }}</p>
        </div>
      </div>

      <div class="metric-card movement-energy">
        <div class="metric-header">
          <h4>🔥 Movement Energy</h4>
          <span class="metric-value">{{ Math.round(analysisData.movementEnergy * 100) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill movement" 
            :style="{ width: `${analysisData.movementEnergy * 100}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getMovementStatus() }}</p>
      </div>

      <div class="metric-card fixation">
        <div class="metric-header">
          <h4>📍 Fixation Ratio</h4>
          <span class="metric-value">{{ Math.round(analysisData.fixationRatio * 100) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill fixation" 
            :style="{ width: `${analysisData.fixationRatio * 100}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getFixationStatus() }}</p>
      </div>
    </div>

    <!-- Real-time Charts -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>Stability Index Trend</h3>
        <div class="chart-wrapper">
          <canvas ref="stabilityChart" class="stability-chart"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <h3>Drowsiness & Movement</h3>
        <div class="chart-wrapper">
          <canvas ref="drowsinessChart" class="drowsiness-chart"></canvas>
        </div>
      </div>
    </div>



    <!-- Smart Break Suggestions -->
    <div class="suggestions-section" v-if="breakSuggestions.length > 0">
      <h3>💡 Smart Break Suggestions</h3>
      <div class="suggestions-grid">
        <div 
          v-for="suggestion in breakSuggestions" 
          :key="suggestion.type"
          class="suggestion-card"
          :class="`priority-${suggestion.priority}`"
        >
          <div class="suggestion-header">
            <h4>{{ suggestion.title }}</h4>
            <span class="suggestion-duration">{{ suggestion.duration }}</span>
          </div>
          <p class="suggestion-description">{{ suggestion.description }}</p>
          <button @click="takeSuggestion(suggestion)" class="suggestion-btn">
            Take Break
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'

export default {
  name: 'AdvancedFocusAnalysis',
  props: {
    analysisData: {
      type: Object,
      default: () => ({
        stabilityIndex: 0,
        fixationRatio: 0,
        saccadesPerMin: 0,
        perclos: 0,
        drowsiness: 0,
        speakingRatio: 0,
        movementEnergy: 0,
        flowStreakSec: 0,
        distractionType: 'none'
      })
    },
    focusHistory: {
      type: Array,
      default: () => []
    },
    breakSuggestions: {
      type: Array,
      default: () => []
    }
  },
  emits: ['break-taken'],
  setup(props, { emit }) {
    const stabilityChart = ref(null)
    const drowsinessChart = ref(null)
    
    let animationFrame = null
    let stabilityChartCtx = null
    let drowsinessChartCtx = null



    // Stability visualization methods
    const getStabilityColor = () => {
      const stability = props.analysisData.stabilityIndex
      if (stability > 0.7) return '#22c55e' // Green for high stability
      if (stability > 0.4) return '#f59e0b' // Orange for medium stability
      return '#ef4444' // Red for low stability
    }
    
    const getDistractionLabel = (type) => {
      const labels = {
        'none': 'Focused',
        'eye': 'Eye Movement',
        'head': 'Head Movement', 
        'speech': 'Speaking',
        'combined': 'Multi-distraction'
      }
      return labels[type] || 'Unknown'
    }

    // Status methods for the new metrics
    const getStabilityStatus = () => {
      const stability = props.analysisData.stabilityIndex
      if (stability > 0.8) return 'Excellent - Very stable'
      if (stability > 0.6) return 'Good - Stable focus'
      if (stability > 0.4) return 'Fair - Some variation'
      return 'Poor - Unstable attention'
    }

    const getDrowsinessStatus = () => {
      const drowsiness = props.analysisData.drowsiness
      if (drowsiness > 0.7) return 'High - Take break'
      if (drowsiness > 0.4) return 'Moderate - Monitor'
      return 'Low - Alert'
    }

    const getSaccadeStatus = () => {
      const saccades = props.analysisData.saccadesPerMin
      if (saccades > 40) return 'High - Many eye movements'
      if (saccades > 20) return 'Normal - Regular scanning'
      return 'Low - Steady gaze'
    }

    const getMovementStatus = () => {
      const energy = props.analysisData.movementEnergy
      if (energy > 0.8) return 'High - Restless'
      if (energy > 0.4) return 'Moderate - Some movement'
      return 'Low - Very still'
    }

    const getFixationStatus = () => {
      const fixation = props.analysisData.fixationRatio
      if (fixation > 0.7) return 'Good - Strong fixations'
      if (fixation > 0.4) return 'Fair - Moderate fixations'
      return 'Poor - Weak fixations'
    }



    // Chart drawing
    const drawStabilityChart = () => {
      if (!stabilityChartCtx || !props.focusHistory) return
      
      const canvas = stabilityChart.value
      const ctx = stabilityChartCtx
      const width = canvas.width
      const height = canvas.height
      
      ctx.clearRect(0, 0, width, height)
      
      const history = props.focusHistory.slice(-20) // Last 20 samples
      if (history.length < 2) return
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      // Draw stability line
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      history.forEach((sample, index) => {
        const x = (width / (history.length - 1)) * index
        const y = height - ((sample.stabilityIndex || 0.5) * height)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }

    const drawDrowsinessChart = () => {
      if (!drowsinessChartCtx || !props.focusHistory) return
      
      const canvas = drowsinessChart.value
      const ctx = drowsinessChartCtx
      const width = canvas.width
      const height = canvas.height
      
      ctx.clearRect(0, 0, width, height)
      
      const history = props.focusHistory.slice(-20)
      if (history.length < 2) return
      
      // Draw drowsiness line
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      history.forEach((sample, index) => {
        const x = (width / (history.length - 1)) * index
        const y = height - ((sample.drowsiness || 0) * height)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      
      // Draw movement energy line
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      history.forEach((sample, index) => {
        const x = (width / (history.length - 1)) * index
        const y = height - ((sample.movementEnergy || 0) * height)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }



    const formatTime = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000)
      const minutes = Math.floor(seconds / 60)
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
    }

    // Break suggestion handling
    const takeSuggestion = (suggestion) => {
      emit('break-taken', suggestion)
    }

    // Animation loop
    const animate = () => {
      drawStabilityChart()
      drawDrowsinessChart()
      
      animationFrame = requestAnimationFrame(animate)
    }

    onMounted(async () => {
      await nextTick()
      
      if (stabilityChart.value) {
        stabilityChart.value.width = 400
        stabilityChart.value.height = 200
        stabilityChartCtx = stabilityChart.value.getContext('2d')
      }
      
      if (drowsinessChart.value) {
        drowsinessChart.value.width = 400
        drowsinessChart.value.height = 200
        drowsinessChartCtx = drowsinessChart.value.getContext('2d')
      }
      
      animate()
    })

    onUnmounted(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    })

    return {
      stabilityChart,
      drowsinessChart,
      getStabilityColor,
      getDistractionLabel,
      getStabilityStatus,
      getDrowsinessStatus,
      getSaccadeStatus,
      getMovementStatus,
      getFixationStatus,
      formatTime,
      takeSuggestion
    }
  }
}
</script>

<style scoped>
.advanced-focus-analysis {
  padding: var(--spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
  background: var(--color-background);
  color: var(--color-text-primary);
}

.viz-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.viz-header h2 {
  font-size: 2.5rem;
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, #ffd700, #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.viz-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}



.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
}

/* Metrics Dashboard */
.metrics-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.metric-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.metric-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
}

.metric-bar {
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.metric-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.metric-fill.stability {
  background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e);
}

.metric-fill.drowsiness {
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
}

.metric-fill.saccades {
  background: linear-gradient(90deg, #22c55e, #3b82f6, #ef4444);
}

.metric-fill.movement {
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
}

.metric-fill.fixation {
  background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e);
}

.distraction-type {
  font-size: 0.8rem;
  color: var(--color-accent);
  font-weight: var(--font-weight-medium);
}

.metric-status {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.metric-info {
  text-align: center;
}

.metric-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.chart-container {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
}

.chart-container h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1.2rem;
  text-align: center;
}

.chart-wrapper {
  display: flex;
  justify-content: center;
}

.stability-chart,
.drowsiness-chart {
  max-width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
}



/* Suggestions Section */
.suggestions-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
}

.suggestions-section h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.suggestion-card {
  background: var(--color-surface-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  transition: transform 0.2s ease;
}

.suggestion-card:hover {
  transform: translateY(-2px);
}

.suggestion-card.priority-high {
  border-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.suggestion-card.priority-medium {
  border-color: #ffaa44;
  background: rgba(255, 170, 68, 0.1);
}

.suggestion-card.priority-low {
  border-color: #44ff44;
  background: rgba(68, 255, 68, 0.1);
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.suggestion-header h4 {
  margin: 0;
  font-size: 1rem;
}

.suggestion-duration {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-border);
  padding: 2px 8px;
  border-radius: 12px;
}

.suggestion-description {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.suggestion-btn {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-accent));
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  

}

@media (max-width: 768px) {
  .advanced-focus-analysis {
    padding: var(--spacing-md);
  }
  
  .viz-header h2 {
    font-size: 2rem;
  }
  
  .metrics-dashboard {
    grid-template-columns: 1fr;
  }
  

}
</style>
