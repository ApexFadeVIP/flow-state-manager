<template>
  <div class="cognitive-load-visualization">
    <div class="viz-header">
      <h2>🧠 Cognitive Load Analysis</h2>
      <p class="viz-subtitle">Real-time brain activity and mental effort monitoring</p>
    </div>

    <!-- Main Brain Map -->
    <div class="brain-map-section">
      <h3>Brain Activity Map</h3>
      <div class="brain-container">
        <div class="brain-svg-wrapper">
          <svg class="brain-map" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <!-- Brain outline -->
            <path 
              d="M80 150 C80 100, 120 60, 170 60 C200 50, 240 50, 270 60 C320 60, 360 100, 360 150 C360 180, 340 200, 320 210 C300 220, 280 230, 260 240 C240 250, 220 250, 200 250 C180 250, 160 250, 140 240 C120 230, 100 220, 80 210 C60 200, 40 180, 40 150 C40 120, 60 100, 80 150 Z"
              class="brain-outline"
              :style="{ fill: brainFillColor, stroke: '#4a5568', strokeWidth: 2 }"
            />
            
            <!-- Cognitive load regions -->
            <circle 
              cx="150" cy="120" r="20" 
              class="brain-region frontal"
              :style="{ fill: getRegionColor('frontal'), opacity: getRegionOpacity('frontal') }"
            />
            <circle 
              cx="250" cy="120" r="20" 
              class="brain-region parietal"
              :style="{ fill: getRegionColor('parietal'), opacity: getRegionOpacity('parietal') }"
            />
            <circle 
              cx="120" cy="180" r="15" 
              class="brain-region temporal-left"
              :style="{ fill: getRegionColor('temporal'), opacity: getRegionOpacity('temporal') }"
            />
            <circle 
              cx="280" cy="180" r="15" 
              class="brain-region temporal-right"
              :style="{ fill: getRegionColor('temporal'), opacity: getRegionOpacity('temporal') }"
            />
            <circle 
              cx="200" cy="200" r="18" 
              class="brain-region occipital"
              :style="{ fill: getRegionColor('occipital'), opacity: getRegionOpacity('occipital') }"
            />
            
            <!-- Activity indicators -->
            <g v-for="pulse in activePulses" :key="pulse.id" class="activity-pulse">
              <circle 
                :cx="pulse.x" 
                :cy="pulse.y" 
                :r="pulse.radius"
                fill="none"
                stroke="#ffd700"
                :stroke-width="pulse.strokeWidth"
                :opacity="pulse.opacity"
              />
            </g>
          </svg>
        </div>
        
        <div class="brain-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: #ff4444;"></div>
            <span>High Load</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #ffaa44;"></div>
            <span>Medium Load</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #44ff44;"></div>
            <span>Low Load</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Metrics Dashboard -->
    <div class="metrics-dashboard">
      <div class="metric-card cognitive-load">
        <div class="metric-header">
          <h4>🧠 Cognitive Load</h4>
          <span class="metric-value">{{ Math.round(cognitiveData.cognitiveLoad * 100) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill cognitive" 
            :style="{ width: `${cognitiveData.cognitiveLoad * 100}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getCognitiveStatus() }}</p>
      </div>

      <div class="metric-card eye-strain">
        <div class="metric-header">
          <h4>👁️ Eye Strain</h4>
          <span class="metric-value">{{ Math.round(cognitiveData.eyeStrain) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill eye-strain" 
            :style="{ width: `${cognitiveData.eyeStrain}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getEyeStrainStatus() }}</p>
      </div>

      <div class="metric-card mental-fatigue">
        <div class="metric-header">
          <h4>🎯 Mental Fatigue</h4>
          <span class="metric-value">{{ Math.round(cognitiveData.mentalFatigue) }}%</span>
        </div>
        <div class="metric-bar">
          <div 
            class="metric-fill fatigue" 
            :style="{ width: `${cognitiveData.mentalFatigue}%` }"
          ></div>
        </div>
        <p class="metric-status">{{ getFatigueStatus() }}</p>
      </div>

      <div class="metric-card micro-expressions">
        <div class="metric-header">
          <h4>😊 Micro-expressions</h4>
          <span class="metric-value">{{ cognitiveData.microExpressions }}</span>
        </div>
        <div class="metric-info">
          <p>Facial micro-movements detected</p>
        </div>
      </div>
    </div>

    <!-- Real-time Charts -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>Cognitive Load History</h3>
        <div class="chart-wrapper">
          <canvas ref="loadChart" class="load-chart"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <h3>Focus vs Fatigue</h3>
        <div class="chart-wrapper">
          <canvas ref="focusFatigueChart" class="focus-fatigue-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Heat Map -->
    <div class="heatmap-section">
      <h3>Session Heat Map</h3>
      <div class="heatmap-container">
        <div class="heatmap-grid">
          <div 
            v-for="(cell, index) in heatMapCells" 
            :key="index"
            class="heatmap-cell"
            :style="{ backgroundColor: getHeatMapColor(cell.value) }"
            :title="`Time: ${formatTime(cell.time)}, Load: ${Math.round(cell.value * 100)}%`"
          ></div>
        </div>
        <div class="heatmap-labels">
          <span class="time-label">Session Timeline</span>
          <div class="intensity-scale">
            <span>Low</span>
            <div class="gradient-bar"></div>
            <span>High</span>
          </div>
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
  name: 'CognitiveLoadVisualization',
  props: {
    cognitiveData: {
      type: Object,
      default: () => ({
        cognitiveLoad: 0.5,
        eyeStrain: 30,
        mentalFatigue: 40,
        microExpressions: 0,
        history: []
      })
    },
    breakSuggestions: {
      type: Array,
      default: () => []
    }
  },
  emits: ['break-taken'],
  setup(props, { emit }) {
    const loadChart = ref(null)
    const focusFatigueChart = ref(null)
    const activePulses = ref([])
    const heatMapCells = ref([])
    
    let pulseId = 0
    let animationFrame = null
    let loadChartCtx = null
    let focusFatigueChartCtx = null

    // Initialize heat map with 50 cells (represents about 4 minutes of data)
    const initializeHeatMap = () => {
      heatMapCells.value = Array.from({ length: 50 }, (_, i) => ({
        time: i * 5000, // 5 second intervals
        value: 0.3 + Math.random() * 0.4 // Initial random values
      }))
    }

    // Update heat map with new data
    const updateHeatMap = () => {
      if (props.cognitiveData.history && props.cognitiveData.history.length > 0) {
        const history = props.cognitiveData.history
        heatMapCells.value = history.map((sample, index) => ({
          time: index * 5000,
          value: sample.cognitiveLoad
        }))
        
        // Pad to 50 cells if needed
        while (heatMapCells.value.length < 50) {
          heatMapCells.value.push({
            time: heatMapCells.value.length * 5000,
            value: 0.3
          })
        }
      }
    }

    // Brain visualization methods
    const brainFillColor = ref('#e6f3ff')
    
    const getRegionColor = (region) => {
      const load = props.cognitiveData.cognitiveLoad
      if (load > 0.7) return '#ff4444'
      if (load > 0.4) return '#ffaa44'
      return '#44ff44'
    }
    
    const getRegionOpacity = (region) => {
      const load = props.cognitiveData.cognitiveLoad
      return Math.min(0.8, 0.3 + load * 0.5)
    }

    // Activity pulses
    const createActivityPulse = () => {
      if (props.cognitiveData.cognitiveLoad > 0.6) {
        const regions = [
          { x: 150, y: 120 }, // frontal
          { x: 250, y: 120 }, // parietal
          { x: 200, y: 200 }  // occipital
        ]
        
        const region = regions[Math.floor(Math.random() * regions.length)]
        activePulses.value.push({
          id: pulseId++,
          x: region.x,
          y: region.y,
          radius: 5,
          strokeWidth: 3,
          opacity: 1,
          startTime: Date.now()
        })
      }
    }

    const updatePulses = () => {
      const now = Date.now()
      activePulses.value = activePulses.value.filter(pulse => {
        const age = now - pulse.startTime
        if (age > 2000) return false
        
        pulse.radius = 5 + (age / 2000) * 20
        pulse.strokeWidth = 3 - (age / 2000) * 2
        pulse.opacity = 1 - (age / 2000)
        return true
      })
    }

    // Chart drawing
    const drawLoadChart = () => {
      if (!loadChartCtx || !props.cognitiveData.history) return
      
      const canvas = loadChart.value
      const ctx = loadChartCtx
      const width = canvas.width
      const height = canvas.height
      
      ctx.clearRect(0, 0, width, height)
      
      const history = props.cognitiveData.history.slice(-20) // Last 20 samples
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
      
      // Draw line
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      history.forEach((sample, index) => {
        const x = (width / (history.length - 1)) * index
        const y = height - (sample.cognitiveLoad * height)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }

    const drawFocusFatigueChart = () => {
      if (!focusFatigueChartCtx || !props.cognitiveData.history) return
      
      const canvas = focusFatigueChart.value
      const ctx = focusFatigueChartCtx
      const width = canvas.width
      const height = canvas.height
      
      ctx.clearRect(0, 0, width, height)
      
      const history = props.cognitiveData.history.slice(-20)
      if (history.length < 2) return
      
      // Draw focus line
      ctx.strokeStyle = '#44ff44'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      history.forEach((sample, index) => {
        const x = (width / (history.length - 1)) * index
        const y = height - (sample.focusScore * height)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      
      // Draw fatigue line
      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      history.forEach((sample, index) => {
        const x = (width / (history.length - 1)) * index
        const y = height - ((sample.mentalFatigue / 100) * height)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }

    // Status methods
    const getCognitiveStatus = () => {
      const load = props.cognitiveData.cognitiveLoad
      if (load > 0.8) return 'Very High - Consider break'
      if (load > 0.6) return 'High - Monitor closely'
      if (load > 0.4) return 'Moderate - Good pace'
      return 'Low - Could increase intensity'
    }

    const getEyeStrainStatus = () => {
      const strain = props.cognitiveData.eyeStrain
      if (strain > 70) return 'High strain - Rest eyes'
      if (strain > 40) return 'Moderate strain'
      return 'Low strain - Good'
    }

    const getFatigueStatus = () => {
      const fatigue = props.cognitiveData.mentalFatigue
      if (fatigue > 70) return 'High fatigue - Take break'
      if (fatigue > 40) return 'Moderate fatigue'
      return 'Low fatigue - Fresh'
    }

    // Heat map methods
    const getHeatMapColor = (value) => {
      const intensity = Math.min(1, Math.max(0, value))
      if (intensity > 0.8) return '#ff0000'
      if (intensity > 0.6) return '#ff4400'
      if (intensity > 0.4) return '#ffaa00'
      if (intensity > 0.2) return '#aaff00'
      return '#00ff00'
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
      updatePulses()
      createActivityPulse()
      drawLoadChart()
      drawFocusFatigueChart()
      updateHeatMap()
      
      animationFrame = requestAnimationFrame(animate)
    }

    onMounted(async () => {
      await nextTick()
      
      if (loadChart.value) {
        loadChart.value.width = 400
        loadChart.value.height = 200
        loadChartCtx = loadChart.value.getContext('2d')
      }
      
      if (focusFatigueChart.value) {
        focusFatigueChart.value.width = 400
        focusFatigueChart.value.height = 200
        focusFatigueChartCtx = focusFatigueChart.value.getContext('2d')
      }
      
      initializeHeatMap()
      animate()
    })

    onUnmounted(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    })

    return {
      loadChart,
      focusFatigueChart,
      activePulses,
      heatMapCells,
      brainFillColor,
      getRegionColor,
      getRegionOpacity,
      getCognitiveStatus,
      getEyeStrainStatus,
      getFatigueStatus,
      getHeatMapColor,
      formatTime,
      takeSuggestion
    }
  }
}
</script>

<style scoped>
.cognitive-load-visualization {
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

/* Brain Map Section */
.brain-map-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  border: 1px solid var(--color-border);
}

.brain-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.brain-svg-wrapper {
  flex: 1;
  max-width: 400px;
}

.brain-map {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.brain-region {
  transition: all 0.3s ease;
  cursor: pointer;
}

.brain-region:hover {
  stroke: #ffd700;
  stroke-width: 2;
}

.activity-pulse {
  animation: pulse-fade 2s linear infinite;
}

@keyframes pulse-fade {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.brain-legend {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
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

.metric-fill.cognitive {
  background: linear-gradient(90deg, #44ff44, #ffaa44, #ff4444);
}

.metric-fill.eye-strain {
  background: linear-gradient(90deg, #44ff44, #ff4444);
}

.metric-fill.fatigue {
  background: linear-gradient(90deg, #44ff44, #ff6b6b);
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

.load-chart,
.focus-fatigue-chart {
  max-width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-md);
}

/* Heat Map */
.heatmap-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  border: 1px solid var(--color-border);
}

.heatmap-section h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(25, 1fr);
  gap: 2px;
  margin-bottom: var(--spacing-md);
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  transition: transform 0.2s ease;
  cursor: pointer;
}

.heatmap-cell:hover {
  transform: scale(1.2);
  z-index: 10;
  position: relative;
}

.heatmap-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-label {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.intensity-scale {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.gradient-bar {
  width: 100px;
  height: 8px;
  background: linear-gradient(90deg, #00ff00, #ffaa00, #ff0000);
  border-radius: 4px;
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
  
  .brain-container {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .cognitive-load-visualization {
    padding: var(--spacing-md);
  }
  
  .viz-header h2 {
    font-size: 2rem;
  }
  
  .metrics-dashboard {
    grid-template-columns: 1fr;
  }
  
  .heatmap-grid {
    grid-template-columns: repeat(15, 1fr);
  }
}
</style>
