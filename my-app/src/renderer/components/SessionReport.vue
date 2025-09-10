<template>
  <div class="session-report-overlay" @click="closeReport">
    <div class="session-report-modal" @click.stop>
      <div class="report-header">
        <h2>📊 Session Complete!</h2>
        <p class="session-duration">{{ formatDuration(reportData.duration) }} Focus Session</p>
        <button @click="closeReport" class="close-btn">×</button>
      </div>

      <div class="report-content">
        <!-- Overall Performance -->
        <div class="performance-summary">
          <h3>🎯 Overall Performance</h3>
          <div class="performance-grid">
            <div class="performance-metric excellent" v-if="reportData.averages.focusScore > 0.7">
              <div class="metric-icon">🌟</div>
              <div class="metric-info">
                <h4>Excellent Focus</h4>
                <p>{{ Math.round(reportData.averages.focusScore * 100) }}% average focus score</p>
              </div>
            </div>
            <div class="performance-metric good" v-else-if="reportData.averages.focusScore > 0.5">
              <div class="metric-icon">👍</div>
              <div class="metric-info">
                <h4>Good Focus</h4>
                <p>{{ Math.round(reportData.averages.focusScore * 100) }}% average focus score</p>
              </div>
            </div>
            <div class="performance-metric needs-improvement" v-else>
              <div class="metric-icon">📈</div>
              <div class="metric-info">
                <h4>Room for Improvement</h4>
                <p>{{ Math.round(reportData.averages.focusScore * 100) }}% average focus score</p>
              </div>
            </div>

            <div class="performance-metric" :class="getCognitiveLoadClass()">
              <div class="metric-icon">🧠</div>
              <div class="metric-info">
                <h4>Cognitive Load</h4>
                <p>{{ Math.round(reportData.averages.cognitiveLoad * 100) }}% average load</p>
              </div>
            </div>

            <div class="performance-metric" :class="getEyeStrainClass()">
              <div class="metric-icon">👁️</div>
              <div class="metric-info">
                <h4>Eye Health</h4>
                <p>{{ Math.round(reportData.averages.eyeStrain) }}% strain level</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Metrics -->
        <div class="detailed-metrics">
          <div class="metrics-row">
            <div class="metric-card">
              <h4>📈 Peak Performance</h4>
              <div class="metric-chart">
                <div class="chart-bar">
                  <span class="bar-label">Max Cognitive Load</span>
                  <div class="bar-container">
                    <div 
                      class="bar-fill cognitive-peak" 
                      :style="{ width: `${reportData.peaks.maxCognitiveLoad * 100}%` }"
                    ></div>
                  </div>
                  <span class="bar-value">{{ Math.round(reportData.peaks.maxCognitiveLoad * 100) }}%</span>
                </div>
                <div class="chart-bar">
                  <span class="bar-label">Min Focus Score</span>
                  <div class="bar-container">
                    <div 
                      class="bar-fill focus-low" 
                      :style="{ width: `${reportData.peaks.minFocusScore * 100}%` }"
                    ></div>
                  </div>
                  <span class="bar-value">{{ Math.round(reportData.peaks.minFocusScore * 100) }}%</span>
                </div>
              </div>
            </div>

            <div class="metric-card">
              <h4>📊 Session Events</h4>
              <div class="events-grid">
                <div class="event-item">
                  <span class="event-icon">⚡</span>
                  <span class="event-label">Stress Peaks</span>
                  <span class="event-value">{{ reportData.events.stressPeaks }}</span>
                </div>
                <div class="event-item">
                  <span class="event-icon">😴</span>
                  <span class="event-label">Low Focus Periods</span>
                  <span class="event-value">{{ reportData.events.lowFocusPeriods }}</span>
                </div>
                <div class="event-item">
                  <span class="event-icon">👀</span>
                  <span class="event-label">Total Blinks</span>
                  <span class="event-value">{{ reportData.events.totalBlinks }}</span>
                </div>
                <div class="event-item">
                  <span class="event-icon">👁️</span>
                  <span class="event-label">Look Aways</span>
                  <span class="event-value">{{ reportData.events.totalLookAways }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Heat Map Visualization -->
        <div class="session-heatmap">
          <h3>🔥 Session Intensity Heat Map</h3>
          <div class="heatmap-container">
            <div class="heatmap-timeline">
              <div 
                v-for="(point, index) in reportData.heatMapData" 
                :key="index"
                class="heatmap-point"
                :style="{ 
                  backgroundColor: getHeatMapColor(point.value),
                  width: `${100 / reportData.heatMapData.length}%`
                }"
                :title="`${formatTime(point.time)}: ${Math.round(point.value * 100)}% load`"
              ></div>
            </div>
            <div class="heatmap-legend">
              <span>Session Start</span>
              <div class="legend-gradient">
                <span class="legend-label">Low</span>
                <div class="gradient-bar"></div>
                <span class="legend-label">High</span>
              </div>
              <span>Session End</span>
            </div>
          </div>
        </div>

        <!-- Key Insights -->
        <div class="insights-section">
          <h3>💡 Key Insights</h3>
          <div class="insights-grid">
            <div 
              v-for="insight in reportData.insights" 
              :key="insight"
              class="insight-card"
            >
              <div class="insight-icon">💭</div>
              <p>{{ insight }}</p>
            </div>
            <div class="insight-card recommendation" v-if="getPersonalizedRecommendation()">
              <div class="insight-icon">🎯</div>
              <p><strong>Recommendation:</strong> {{ getPersonalizedRecommendation() }}</p>
            </div>
          </div>
        </div>

        <!-- Break Suggestions -->
        <div class="break-suggestions" v-if="reportData.breakSuggestions.length > 0">
          <h3>🌱 Recommended Break Activities</h3>
          <div class="suggestions-grid">
            <div 
              v-for="suggestion in reportData.breakSuggestions" 
              :key="suggestion.type"
              class="suggestion-card"
              :class="`priority-${suggestion.priority}`"
            >
              <h4>{{ suggestion.title }}</h4>
              <p class="suggestion-description">{{ suggestion.description }}</p>
              <div class="suggestion-meta">
                <span class="duration">{{ suggestion.duration }}</span>
                <span class="priority-badge">{{ suggestion.priority }} priority</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Session Comparison -->
        <div class="session-comparison" v-if="previousSessions.length > 0">
          <h3>📈 Progress Tracking</h3>
          <div class="comparison-chart">
            <div class="chart-title">Focus Score Trend (Last 5 Sessions)</div>
            <div class="trend-line">
              <div 
                v-for="(session, index) in previousSessions.slice(-5)" 
                :key="index"
                class="trend-point"
                :style="{ 
                  left: `${(index / 4) * 100}%`,
                  bottom: `${session.focusScore * 100}%`
                }"
                :title="`Session ${index + 1}: ${Math.round(session.focusScore * 100)}%`"
              ></div>
              <svg class="trend-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline 
                  :points="getTrendLinePoints()" 
                  fill="none" 
                  stroke="#ffd700" 
                  stroke-width="2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="report-actions">
        <button @click="shareReport" class="action-btn secondary">
          📤 Share Report
        </button>
        <button @click="saveReport" class="action-btn secondary">
          💾 Save Report
        </button>
        <button @click="startNewSession" class="action-btn primary">
          🚀 Start New Session
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'SessionReport',
  props: {
    reportData: {
      type: Object,
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    },
    previousSessions: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'start-new-session', 'save-report'],
  setup(props, { emit }) {
    
    const formatDuration = (milliseconds) => {
      const minutes = Math.floor(milliseconds / 60000)
      const seconds = Math.floor((milliseconds % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }

    const formatTime = (milliseconds) => {
      const minutes = Math.floor(milliseconds / 60000)
      const seconds = Math.floor((milliseconds % 60000) / 1000)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const getCognitiveLoadClass = () => {
      const load = props.reportData.averages.cognitiveLoad
      if (load > 0.7) return 'high'
      if (load > 0.5) return 'moderate'
      return 'low'
    }

    const getEyeStrainClass = () => {
      const strain = props.reportData.averages.eyeStrain
      if (strain > 60) return 'high'
      if (strain > 30) return 'moderate'
      return 'low'
    }

    const getHeatMapColor = (value) => {
      const intensity = Math.min(1, Math.max(0, value))
      if (intensity > 0.8) return '#ff0000'
      if (intensity > 0.6) return '#ff4400'
      if (intensity > 0.4) return '#ffaa00'
      if (intensity > 0.2) return '#aaff00'
      return '#00ff00'
    }

    const getPersonalizedRecommendation = () => {
      const { averages, events } = props.reportData
      
      if (averages.eyeStrain > 60) {
        return 'Take more frequent eye breaks to reduce strain'
      }
      if (averages.cognitiveLoad > 0.8) {
        return 'Consider breaking work into smaller chunks'
      }
      if (events.stressPeaks > 3) {
        return 'Practice stress management techniques during work'
      }
      if (averages.focusScore < 0.5) {
        return 'Try eliminating distractions in your environment'
      }
      if (events.lowFocusPeriods > 5) {
        return 'Consider adjusting your work schedule for peak performance'
      }
      
      return 'Great session! Keep up the excellent focus habits'
    }

    const getTrendLinePoints = () => {
      if (props.previousSessions.length < 2) return ''
      
      const sessions = props.previousSessions.slice(-5)
      return sessions.map((session, index) => {
        const x = (index / (sessions.length - 1)) * 100
        const y = 100 - (session.focusScore * 100)
        return `${x},${y}`
      }).join(' ')
    }

    const closeReport = () => {
      emit('close')
    }

    const startNewSession = () => {
      emit('start-new-session')
    }

    const saveReport = () => {
      emit('save-report', props.reportData)
    }

    const shareReport = () => {
      // Create a shareable summary
      const summary = `Focus Session Report:
📊 Duration: ${formatDuration(props.reportData.duration)}
🎯 Average Focus: ${Math.round(props.reportData.averages.focusScore * 100)}%
🧠 Cognitive Load: ${Math.round(props.reportData.averages.cognitiveLoad * 100)}%
👁️ Eye Strain: ${Math.round(props.reportData.averages.eyeStrain)}%

Generated by UltraFlow AI Focus Assistant`

      if (navigator.share) {
        navigator.share({
          title: 'Focus Session Report',
          text: summary
        })
      } else {
        navigator.clipboard.writeText(summary)
        // Could show a toast notification here
      }
    }

    return {
      formatDuration,
      formatTime,
      getCognitiveLoadClass,
      getEyeStrainClass,
      getHeatMapColor,
      getPersonalizedRecommendation,
      getTrendLinePoints,
      closeReport,
      startNewSession,
      saveReport,
      shareReport
    }
  }
}
</script>

<style scoped>
.session-report-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
  padding: var(--spacing-md);
}

.session-report-modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  max-width: 900px;
  max-height: 90vh;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xl);
  animation: slideInScale 0.3s ease-out;
}

@keyframes slideInScale {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.report-header {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-primary);
  padding: var(--spacing-xl);
  text-align: center;
  position: relative;
}

.report-header h2 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
}

.session-duration {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}

.close-btn {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: var(--color-text-primary);
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.report-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0;
}

.report-content > div {
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
}

.report-content > div:last-child {
  border-bottom: none;
}

/* Performance Summary */
.performance-summary h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
  color: var(--color-text-primary);
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.performance-metric {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background: var(--color-surface-light);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 2px solid transparent;
}

.performance-metric.excellent {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.performance-metric.good {
  border-color: #eab308;
  background: rgba(234, 179, 8, 0.1);
}

.performance-metric.needs-improvement {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.performance-metric.high {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.performance-metric.moderate {
  border-color: #eab308;
  background: rgba(234, 179, 8, 0.1);
}

.performance-metric.low {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.metric-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.metric-info h4 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
}

.metric-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

/* Detailed Metrics */
.detailed-metrics h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.metrics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.metric-card {
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
}

.metric-card h4 {
  margin: 0 0 var(--spacing-md) 0;
  text-align: center;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.bar-label {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.bar-container {
  flex: 2;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
}

.bar-fill.cognitive-peak {
  background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
}

.bar-fill.focus-low {
  background: linear-gradient(90deg, #ef4444, #eab308, #22c55e);
}

.bar-value {
  font-size: 0.9rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  min-width: 40px;
  text-align: right;
}

.events-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}

.event-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.event-icon {
  font-size: 1.2rem;
}

.event-label {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.event-value {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

/* Session Heat Map */
.session-heatmap h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.heatmap-timeline {
  display: flex;
  height: 40px;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.heatmap-point {
  transition: transform 0.2s ease;
  cursor: pointer;
}

.heatmap-point:hover {
  transform: scaleY(1.2);
  z-index: 10;
}

.heatmap-legend {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.legend-gradient {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.gradient-bar {
  width: 100px;
  height: 8px;
  background: linear-gradient(90deg, #00ff00, #ffaa00, #ff0000);
  border-radius: 4px;
}

.legend-label {
  font-size: 0.8rem;
}

/* Insights */
.insights-section h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.insight-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  background: var(--color-surface-light);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.insight-card.recommendation {
  border-color: var(--color-accent);
  background: rgba(6, 182, 212, 0.1);
}

.insight-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.insight-card p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

/* Break Suggestions */
.break-suggestions h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.suggestion-card {
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.suggestion-card.priority-high {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.suggestion-card.priority-medium {
  border-color: #eab308;
  background: rgba(234, 179, 8, 0.1);
}

.suggestion-card.priority-low {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.suggestion-card h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 1rem;
}

.suggestion-description {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.suggestion-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duration {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.priority-badge {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--color-border);
  color: var(--color-text-secondary);
}

/* Session Comparison */
.session-comparison h3 {
  margin: 0 0 var(--spacing-lg) 0;
  text-align: center;
}

.comparison-chart {
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
}

.chart-title {
  text-align: center;
  margin-bottom: var(--spacing-md);
  font-weight: var(--font-weight-medium);
}

.trend-line {
  position: relative;
  height: 100px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-md);
}

.trend-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ffd700;
  border-radius: 50%;
  border: 2px solid var(--color-surface);
  transform: translate(-50%, 50%);
  cursor: pointer;
}

.trend-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Report Actions */
.report-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  background: var(--color-surface-light);
  border-top: 1px solid var(--color-border);
}

.action-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-accent));
  color: var(--color-text-primary);
}

.action-btn.secondary {
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Responsive Design */
@media (max-width: 768px) {
  .session-report-modal {
    margin: var(--spacing-sm);
    max-height: 95vh;
  }
  
  .performance-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-row {
    grid-template-columns: 1fr;
  }
  
  .events-grid {
    grid-template-columns: 1fr;
  }
  
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
  
  .report-actions {
    flex-direction: column;
  }
}

/* Scrollbar Styling */
.report-content::-webkit-scrollbar {
  width: 6px;
}

.report-content::-webkit-scrollbar-track {
  background: var(--color-surface-light);
}

.report-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.report-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-light);
}
</style>
