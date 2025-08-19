<template>
  <div class="pomodoro-timer">
    <div class="timer-header">
      <h2>Focus Timer</h2>
      <div class="timer-mode">
        <span class="mode-badge" :class="currentModeClass">
          {{ currentSession.name }}
        </span>
        <span class="session-counter">
          {{ completedPomodoros }}/{{ settings.dailyGoal }}
        </span>
      </div>
    </div>

    <div class="timer-circle">
      <svg class="progress-ring" :width="circleSize" :height="circleSize">
        <circle
          class="progress-ring-background"
          :cx="circleSize / 2"
          :cy="circleSize / 2"
          :r="radius"
          fill="transparent"
          :stroke-width="strokeWidth"
        />
        <circle
          class="progress-ring-progress"
          :cx="circleSize / 2"
          :cy="circleSize / 2"
          :r="radius"
          fill="transparent"
          :stroke-width="strokeWidth"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
          :class="progressClass"
        />
      </svg>
      <div class="timer-content">
        <div class="time-display">
          {{ displayTime }}
        </div>
        <div class="timer-controls">
          <button 
            @click="toggleTimer" 
            class="control-btn primary"
            :class="{ 'pulse': isActive && !isPaused }"
          >
            {{ isActive ? (isPaused ? 'Resume' : 'Pause') : 'Start' }}
          </button>
          <button 
            @click="resetTimer" 
            class="control-btn secondary"
            :disabled="!isActive && timeLeft === currentSession.duration"
          >
            Reset
          </button>
        </div>
      </div>
    </div>

    <div class="timer-info">
      <div class="session-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: sessionProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ Math.round(sessionProgress) }}% Complete</span>
      </div>
      
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Next Session</span>
          <span class="stat-value">{{ nextSessionName }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Time Today</span>
          <span class="stat-value">{{ formatDuration(todayTime) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Focus Score</span>
          <span class="stat-value">{{ focusScore }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Current Gesture</span>
          <span class="stat-value">{{ currentGesture }}</span>
        </div>
      </div>
    </div>

    <div class="gesture-status" v-if="gestureControlEnabled">
      <div class="gesture-indicator" :class="{ 'active': isGestureActive }">
        <span class="gesture-icon">✋</span>
        <span class="gesture-text">
          {{ isGestureActive ? 'Gesture Control Active' : 'Gesture Control Ready' }}
        </span>
      </div>
      <div class="gesture-help">
        Use <strong>{{ pauseGesture }}</strong> gesture to pause/resume timer
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="settings-overlay" @click="closeSettings">
      <div class="settings-modal" @click.stop>
        <TimerSettings 
          :settings="settings"
          @save="saveSettings"
          @close="closeSettings"
        />
      </div>
    </div>

    <div class="timer-actions">
      <button @click="showSettings = !showSettings" class="action-btn">
        <span class="action-icon">⚙️</span>
        Settings
      </button>
      <button @click="skipSession" class="action-btn" :disabled="!isActive">
        <span class="action-icon">⏭️</span>
        Skip Session
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import TimerSettings from './TimerSettings.vue'

export default {
  name: 'PomodoroTimer',
  components: {
    TimerSettings
  },
  props: {
    currentGesture: {
      type: String,
      default: 'None'
    },
    focusScore: {
      type: Number,
      default: 100
    }
  },
  emits: ['timer-started', 'timer-paused', 'timer-completed', 'session-changed', 'focus-mode-toggle'],
  setup(props, { emit }) {
    // Timer state
    const isActive = ref(false)
    const isPaused = ref(false)
    const timeLeft = ref(25 * 60) // 25 minutes in seconds
    const completedPomodoros = ref(0)
    const currentSessionIndex = ref(0)
    const todayTime = ref(0)
    const showSettings = ref(false)
    
    // Gesture control
    const isGestureActive = ref(false)
    const lastGesture = ref('None')
    
    // Timer interval
    let timerInterval = null
    
    // Session types
    const sessionTypes = [
      { name: 'Work', duration: 25 * 60, type: 'work' },
      { name: 'Short Break', duration: 5 * 60, type: 'break' },
      { name: 'Work', duration: 25 * 60, type: 'work' },
      { name: 'Short Break', duration: 5 * 60, type: 'break' },
      { name: 'Work', duration: 25 * 60, type: 'work' },
      { name: 'Short Break', duration: 5 * 60, type: 'break' },
      { name: 'Work', duration: 25 * 60, type: 'work' },
      { name: 'Long Break', duration: 15 * 60, type: 'break' }
    ]
    
    // Settings
    const settings = reactive({
      workDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      dailyGoal: 8,
      pauseGesture: 'Pointing_Up',
      autoStartBreaks: false,
      focusModeSync: true,
      gestureControlEnabled: true,
      soundEnabled: true,
      minFocusScore: 70,
      pauseOnLowFocus: false
    })
    
    // Circle dimensions
    const circleSize = 280
    const strokeWidth = 8
    const radius = (circleSize - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    
    // Computed properties
    const currentSession = computed(() => {
      const session = { ...sessionTypes[currentSessionIndex.value] }
      if (session.type === 'work') {
        session.duration = settings.workDuration * 60
      } else if (session.name === 'Short Break') {
        session.duration = settings.shortBreak * 60
      } else if (session.name === 'Long Break') {
        session.duration = settings.longBreak * 60
      }
      return session
    })
    
    const currentModeClass = computed(() => {
      return currentSession.value.type === 'work' ? 'work-mode' : 'break-mode'
    })
    
    const progressClass = computed(() => {
      return currentSession.value.type === 'work' ? 'work-progress' : 'break-progress'
    })
    
    const displayTime = computed(() => {
      const minutes = Math.floor(timeLeft.value / 60)
      const seconds = timeLeft.value % 60
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    })
    
    const sessionProgress = computed(() => {
      return ((currentSession.value.duration - timeLeft.value) / currentSession.value.duration) * 100
    })
    
    const progressOffset = computed(() => {
      const progress = sessionProgress.value / 100
      return circumference - (progress * circumference)
    })
    
    const nextSessionName = computed(() => {
      const nextIndex = (currentSessionIndex.value + 1) % sessionTypes.length
      return sessionTypes[nextIndex].name
    })
    
    const gestureControlEnabled = computed(() => settings.gestureControlEnabled)
    const pauseGesture = computed(() => settings.pauseGesture.replace('_', ' '))
    
    // Methods
    const toggleTimer = () => {
      if (!isActive.value) {
        startTimer()
      } else {
        if (isPaused.value) {
          resumeTimer()
        } else {
          pauseTimer()
        }
      }
    }
    
    const startTimer = () => {
      isActive.value = true
      isPaused.value = false
      
      if (timeLeft.value === currentSession.value.duration) {
        timeLeft.value = currentSession.value.duration
      }
      
      timerInterval = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--
          if (currentSession.value.type === 'work') {
            todayTime.value++
          }
        } else {
          completeSession()
        }
      }, 1000)
      
      emit('timer-started', {
        session: currentSession.value,
        timeLeft: timeLeft.value
      })
      
      // Sync with focus mode if enabled
      if (settings.focusModeSync && currentSession.value.type === 'work') {
        emit('focus-mode-toggle', true)
      }
    }
    
    const pauseTimer = () => {
      isPaused.value = true
      clearInterval(timerInterval)
      
      emit('timer-paused', {
        session: currentSession.value,
        timeLeft: timeLeft.value
      })
      
      // Turn off focus mode when paused (if syncing)
      if (settings.focusModeSync && currentSession.value.type === 'work') {
        emit('focus-mode-toggle', false)
      }
    }
    
    const resumeTimer = () => {
      isPaused.value = false
      
      timerInterval = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--
          if (currentSession.value.type === 'work') {
            todayTime.value++
          }
        } else {
          completeSession()
        }
      }, 1000)
      
      // Turn on focus mode when resumed (if syncing)
      if (settings.focusModeSync && currentSession.value.type === 'work') {
        emit('focus-mode-toggle', true)
      }
    }
    
    const resetTimer = () => {
      clearInterval(timerInterval)
      isActive.value = false
      isPaused.value = false
      timeLeft.value = currentSession.value.duration
      
      // Turn off focus mode when reset
      if (settings.focusModeSync) {
        emit('focus-mode-toggle', false)
      }
    }
    
    const completeSession = () => {
      clearInterval(timerInterval)
      isActive.value = false
      isPaused.value = false
      
      // Count completed pomodoros
      if (currentSession.value.type === 'work') {
        completedPomodoros.value++
      }
      
      emit('timer-completed', {
        session: currentSession.value,
        completedPomodoros: completedPomodoros.value
      })
      
      // Move to next session
      currentSessionIndex.value = (currentSessionIndex.value + 1) % sessionTypes.length
      timeLeft.value = currentSession.value.duration
      
      emit('session-changed', {
        session: currentSession.value,
        autoStart: settings.autoStartBreaks && currentSession.value.type === 'break'
      })
      
      // Auto-start breaks if enabled
      if (settings.autoStartBreaks && currentSession.value.type === 'break') {
        setTimeout(() => {
          startTimer()
        }, 1000)
      } else {
        // Turn off focus mode when session completes
        if (settings.focusModeSync) {
          emit('focus-mode-toggle', false)
        }
      }
    }
    
    const skipSession = () => {
      if (isActive.value) {
        completeSession()
      }
    }
    
    const saveSettings = (newSettings) => {
      Object.assign(settings, newSettings)
      
      // Update current session duration if it changed
      if (!isActive.value || isPaused.value) {
        timeLeft.value = currentSession.value.duration
      }
      
      showSettings.value = false
      
      // Save to localStorage
      localStorage.setItem('pomodoroSettings', JSON.stringify(settings))
    }
    
    const closeSettings = () => {
      showSettings.value = false
    }
    
    const loadSettings = () => {
      const saved = localStorage.getItem('pomodoroSettings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          Object.assign(settings, parsed)
        } catch (e) {
          console.warn('Failed to load timer settings:', e)
        }
      }
    }
    
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    }
    
    // Watch for gesture changes
    watch(() => props.currentGesture, (newGesture, oldGesture) => {
      console.log(`=== TIMER GESTURE WATCH ===`)
      console.log(`Gesture change: ${oldGesture} -> ${newGesture}`)
      console.log(`Gesture control enabled: ${gestureControlEnabled.value}`)
      console.log(`Expected gesture (raw): "${settings.pauseGesture}"`)
      console.log(`Last gesture tracked: "${lastGesture.value}"`)
      console.log(`Timer active: ${isActive.value}, paused: ${isPaused.value}`)
      
      if (!gestureControlEnabled.value) {
        console.log(`❌ Gesture control is disabled, skipping...`)
        return
      }
      
      // Detect gesture for pause/resume
      if (newGesture === settings.pauseGesture && lastGesture.value !== newGesture) {
        console.log(`✅ GESTURE MATCHED! Toggling timer...`)
        console.log(`Calling toggleTimer function...`)
        isGestureActive.value = true
        toggleTimer()
        
        // Reset gesture status after a short delay
        setTimeout(() => {
          isGestureActive.value = false
        }, 1000)
      } else {
        console.log(`❌ Gesture condition not met:`)
        console.log(`  - Gesture matches: ${newGesture === settings.pauseGesture}`)
        console.log(`  - Not duplicate: ${lastGesture.value !== newGesture}`)
        console.log(`  - newGesture: "${newGesture}"`)
        console.log(`  - expected: "${settings.pauseGesture}"`)
        console.log(`  - lastGesture: "${lastGesture.value}"`)
      }
      
      lastGesture.value = newGesture
      console.log(`=== END TIMER GESTURE WATCH ===`)
    }, { immediate: false })
    

    
    // Watch for focus score changes
    watch(() => props.focusScore, (newScore) => {
      if (!settings.pauseOnLowFocus || !isActive.value || isPaused.value) return
      if (currentSession.value.type !== 'work') return
      
      // Auto-pause if focus score drops below threshold
      if (newScore < settings.minFocusScore) {
        pauseTimer()
        console.log(`Timer auto-paused: Focus score (${newScore}%) below threshold (${settings.minFocusScore}%)`)
      }
    })
    
    // Load today's time from localStorage
    const loadTodayTime = () => {
      const today = new Date().toDateString()
      const saved = localStorage.getItem(`pomodoroTime_${today}`)
      if (saved) {
        todayTime.value = parseInt(saved) || 0
      }
      
      const savedPomodoros = localStorage.getItem(`pomodoroCount_${today}`)
      if (savedPomodoros) {
        completedPomodoros.value = parseInt(savedPomodoros) || 0
      }
    }
    
    // Save today's time to localStorage
    const saveTodayTime = () => {
      const today = new Date().toDateString()
      localStorage.setItem(`pomodoroTime_${today}`, todayTime.value.toString())
      localStorage.setItem(`pomodoroCount_${today}`, completedPomodoros.value.toString())
    }
    
    // Save every minute
    watch(todayTime, () => {
      saveTodayTime()
    })
    
    watch(completedPomodoros, () => {
      saveTodayTime()
    })
    
    onMounted(() => {
      loadSettings()
      loadTodayTime()
      timeLeft.value = currentSession.value.duration
      console.log(`PomodoroTimer mounted. Initial gesture: ${props.currentGesture}`)
      console.log(`Gesture control enabled: ${gestureControlEnabled.value}`)
      console.log(`Pause gesture setting: ${settings.pauseGesture}`)
      console.log(`Pause gesture display: ${pauseGesture.value}`)
    })
    
    onUnmounted(() => {
      clearInterval(timerInterval)
    })
    
    return {
      // State
      isActive,
      isPaused,
      timeLeft,
      completedPomodoros,
      todayTime,
      showSettings,
      isGestureActive,
      
      // Session
      currentSession,
      currentModeClass,
      progressClass,
      nextSessionName,
      
      // Display
      displayTime,
      sessionProgress,
      progressOffset,
      
      // Circle
      circleSize,
      radius,
      strokeWidth,
      circumference,
      
      // Settings
      settings,
      gestureControlEnabled,
      pauseGesture,
      
      // Methods
      toggleTimer,
      resetTimer,
      skipSession,
      saveSettings,
      closeSettings,
      formatDuration
    }
  }
}
</script>

<style scoped>
.pomodoro-timer {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  max-width: 400px;
  margin: 0 auto;
}

.timer-header {
  text-align: center;
  margin-bottom: 2rem;
}

.timer-header h2 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1.5rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.timer-mode {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.9rem;
}

.mode-badge.work-mode {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid var(--color-primary-light);
  color: var(--color-primary-light);
}

.mode-badge.break-mode {
  background: rgba(6, 182, 212, 0.2);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
}

.session-counter {
  font-size: 0.9rem;
  opacity: 0.8;
}

.timer-circle {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-background {
  stroke: var(--color-border);
}

.progress-ring-progress {
  transition: stroke-dashoffset 0.5s ease;
}

.progress-ring-progress.work-progress {
  stroke: var(--color-primary-light);
}

.progress-ring-progress.break-progress {
  stroke: var(--color-accent);
}

.timer-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.time-display {
  font-size: 3rem;
  font-weight: 300;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.timer-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.control-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.control-btn.primary {
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-accent) 100%);
  color: var(--color-text-primary);
}

.control-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.control-btn.primary.pulse {
  animation: pulse 2s infinite;
}

.control-btn.secondary {
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.control-btn.secondary:hover {
  background: var(--color-border-light);
  color: var(--color-text-primary);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timer-info {
  margin-bottom: 2rem;
}

.session-progress {
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-light) 0%, var(--color-accent) 100%);
  transition: width 0.5s ease;
}

.progress-text {
  display: block;
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  opacity: 0.7;
  margin-bottom: 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
}

.gesture-status {
  margin-bottom: 2rem;
  text-align: center;
}

.gesture-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
  border: 1px solid var(--color-border);
}

.gesture-indicator.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--color-accent);
  transform: scale(1.02);
}

.gesture-icon {
  font-size: 1.2rem;
}

.gesture-text {
  font-size: 0.9rem;
  font-weight: 500;
}

.gesture-help {
  font-size: 0.8rem;
  opacity: 0.7;
}



.timer-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--color-border-light);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 1rem;
}

.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.settings-modal {
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

@media (max-width: 480px) {
  .pomodoro-timer {
    padding: 1.5rem;
  }
  
  .time-display {
    font-size: 2.5rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .timer-actions {
    flex-direction: column;
  }
}
</style>
