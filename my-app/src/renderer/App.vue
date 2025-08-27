<template>
  <div id="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="brand">
          <h1 class="brand-title">UltraFlow</h1>
          <p class="brand-subtitle">AI-Powered Focus & Productivity</p>
        </div>
        
        <div class="header-controls">
          <nav class="app-navigation">
            <button 
              @click="activeTab = 'focus'" 
              class="nav-btn"
              :class="{ active: activeTab === 'focus' }"
            >
              Focus
            </button>
            <button 
              @click="activeTab = 'analysis'" 
              class="nav-btn"
              :class="{ active: activeTab === 'analysis' }"
            >
                Focus Analysis
            </button>
          </nav>
          <div class="control-group">
            <SimpleToggle v-model="checked" @change="onToggle" />
            <span class="control-label">Focus Mode</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Focus Tab -->
      <div v-if="activeTab === 'focus'" class="workspace">
        <!-- Vision Tracking Section -->
        <section class="tracking-section">
          <div class="section-header">
            <h2 class="section-title">Vision Tracking</h2>
            <p class="section-subtitle">Real-time gesture recognition and focus monitoring</p>
          </div>
          
          <div class="tracking-content">
            <!-- Focus Status Banner -->
            <div v-if="checked" class="focus-status-banner" :class="`status-${focusStatus}`">
              <div class="focus-status-label">Focus Status</div>
              <div class="focus-status-value">{{ focusStatusLabel }}</div>
              <div class="focus-status-score">{{ Math.round(focusScore * 100) }}%</div>
            </div>

            <!-- Unified tracker with gesture and focus tracking -->
            <UnifiedVisionTracker 
              ref="tracker"
              @gesture="handleGesture" 
              @focus-update="handleFocusUpdate"
              @analysis-update="handleAnalysisUpdate"
            />
          </div>
        </section>

        <!-- Timer Section -->
        <section class="timer-section">
          <PomodoroTimer 
            :current-gesture="currentGesture"
            :focus-score="Math.round(focusScore * 100)"
            @timer-started="onTimerStarted"
            @timer-paused="onTimerPaused"
            @timer-completed="onTimerCompleted"
            @pomodoro-cycle-completed="onPomodoroCycleCompleted"
            @session-changed="onSessionChanged"
            @focus-mode-toggle="onFocusModeToggle"
          />
        </section>

        <!-- Media Controls Section -->
        <section class="media-section">
          <div class="section-header">
            <h2 class="section-title">Media Controls</h2>
            <p class="section-subtitle">Gesture-controlled music playback</p>
          </div>
          
          <div class="media-controls">
            <button class="media-btn primary" @click="playPauseSpotify">
              <svg class="media-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span class="media-label">{{ nowPlaying ? 'Pause' : 'Play' }}</span>
            </button>
            
            <button class="media-btn secondary" @click="openSpotify">
              <svg class="media-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
              <span class="media-label">Next Track</span>
            </button>
          </div>
          
          <div v-if="nowPlaying" class="now-playing">
            <div class="track-info">
              <div class="track-title">{{ nowPlaying.track }}</div>
              <div class="track-artist">{{ nowPlaying.artist }}</div>
            </div>
            <div class="playing-indicator">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
          </div>
        </section>
      </div>

      <!-- Advanced Focus Analysis Tab -->
      <div v-if="activeTab === 'analysis'" class="analysis-tab">
        <AdvancedFocusAnalysis 
          :analysis-data="analysisData"
          :focus-history="focusHistory"
          :break-suggestions="breakSuggestions"
          @break-taken="handleBreakTaken"
        />
      </div>
    </main>
    <!-- Toast Notification -->
    <div v-if="showToast" class="toast" role="status" aria-live="polite">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>
      <span class="toast-text">{{ toastMessage }}</span>
    </div>

    <!-- Session Report Modal -->
    <SessionReport 
      v-if="showSessionReport"
      :report-data="sessionReportData"
      :previous-sessions="previousSessions"
      @close="closeSessionReport"
      @start-new-session="startNewSession"
      @save-report="saveSessionReport"
    />
  </div>
</template>

<script>
import SimpleToggle from "../main/components/ToggleSwitch.vue"
import GestureRecognition from "./components/GestureRecognition.vue"
import UnifiedVisionTracker from './components/UnifiedVisionTracker.vue'
import PomodoroTimer from './components/PomodoroTimer.vue'
import AdvancedFocusAnalysis from './components/AdvancedFocusAnalysis.vue'
import SessionReport from './components/SessionReport.vue'
import { ref } from 'vue'

export default {
  name: 'App',
  components: { 
    SimpleToggle, 
    UnifiedVisionTracker, 
    GestureRecognition, 
    PomodoroTimer,
    AdvancedFocusAnalysis,
    SessionReport
  },
  computed: {
    focusStatusLabel() {
      if (!this.focusStatus) return 'Focused'
      const label = this.focusStatus.charAt(0).toUpperCase() + this.focusStatus.slice(1)
      return label
    }
  },
  data() {
    return {    
    // When gesture detected:
      checked: false,
      nowPlaying: null,
      spotifyPollInterval: null, // Add this
      lastGesture: null,
      currentGesture: 'None',
      focusScore: 1.0,
      focusStatus: 'focused',
      distractedStartAt: 0,
      distractedNotifyDelayMs: 5000,
      showToast: false,
      toastMessage: '',
      toastTimer: null,
      // Cooldown to prevent repeated toggles from brief gesture flickers
      lastFocusToggleAt: 0,
      focusToggleCooldownMs: 1200,
      
      // Advanced focus analysis data
      analysisData: {
        stabilityIndex: 0,
        fixationRatio: 0,
        saccadesPerMin: 0,
        perclos: 0,
        drowsiness: 0,
        speakingRatio: 0,
        movementEnergy: 0,
        flowStreakSec: 0,
        distractionType: 'none'
      },
      focusHistory: [],
      breakSuggestions: [],
      
      // Session reporting (in-memory for current run)
      showSessionReport: false,
      sessionReportData: null,
      previousSessions: [],
      
    }
  },
  setup() {
    const activeTab = ref('focus')
    return { activeTab }
  },
  mounted() {
    this.startSpotifyPolling();
  },
  beforeUnmount() {
    if (this.spotifyPollInterval) {
      clearInterval(this.spotifyPollInterval);
    }
  },
  methods: {
    async onToggle() {
      if (window.electronAPI) {
        try {
          await window.electronAPI.toggleFocus(this.checked);
        } catch (e) {
          console.error('AppleScript error:', e);
        }
      }
    },
    async playPauseSpotify() {
      if (window.electronAPI) {
        try {
          await window.electronAPI.spotifyPlayPause();
          const info = await window.electronAPI.getSpotifyTrack();
          if (info && info.includes('||')) {
            const [track, artist] = info.split('||');
            this.nowPlaying = { track, artist };
          } else {
            this.nowPlaying = null;
          }
        } catch (e) {
          console.error('Spotify AppleScript error:', e);
        }
      }
    },
    async openSpotify() {
      if (window.electronAPI) {
        await window.electronAPI.openSpotify();
        // You can keep your polling logic here if you want, but the global polling will handle updates
      }
    },
    startSpotifyPolling() {
      this.spotifyPollInterval = setInterval(async () => {
        if (window.electronAPI) {
          const info = await window.electronAPI.getSpotifyTrack();
          if (info && info.includes('||')) {
            const [track, artist] = info.split('||');
            if (
              !this.nowPlaying ||
              this.nowPlaying.track !== track ||
              this.nowPlaying.artist !== artist
            ) {
              this.nowPlaying = { track, artist };
            }
          } else {
            this.nowPlaying = null;
          }
        }
      }, 1000); // Poll every 3 seconds
    },

    async handleGesture(gesture) {
      // Update current gesture for timer component
      this.currentGesture = gesture;
      console.log(`App received gesture: ${gesture}, passing to timer component`);

      // Only toggle on rising edge with cooldown
      if (gesture === 'Pointing_Up' && this.lastGesture !== 'Pointing_Up') {
        const now = Date.now();
        if (now - this.lastFocusToggleAt >= this.focusToggleCooldownMs) {
          this.lastFocusToggleAt = now;
          this.checked = !this.checked;
          await this.onToggle();
          console.log(`Focus mode toggled (cooldown applied)`);
        } else {
          console.log('Focus toggle suppressed due to cooldown');
        }
      }else if(gesture == 'Thumb_Up' && this.lastGesture !== 'Thumb_Up'){
        this.nowPlaying = !this.nowPlaying;
        await this.playPauseSpotify();
      console.log(`Music is ${this.nowPlaying ? PLAYING : STOPPED} now`);
      }else if(gesture == 'Victory' && this.lastGesture !== 'Victory'){
        this.nowPlaying = !this.nowPlaying;
        await this.openSpotify();
        console.log('Song has CHANGED now');
      }
      this.lastGesture = gesture;
    },

    handleFocusUpdate({ score, status }) {
      this.focusScore = score
      this.focusStatus = status

      const scorePercent = Math.round(score * 100)
      const isDistracted = status === 'distracted' || scorePercent <= 60

      // Track time in distracted state for notification
      const now = Date.now()
      if (isDistracted && this.checked) {
        if (!this.distractedStartAt) {
          this.distractedStartAt = now
        } else if (now - this.distractedStartAt >= this.distractedNotifyDelayMs) {
          this.maybeShowToast('You seem distracted. Take a breath or refocus?')
          // Prevent repeated notifications; require re-focus before next
          this.distractedStartAt = now + 60_000 // next eligible after 60s unless refocused
        }
      } else {
        this.distractedStartAt = 0
      }
    },

    maybeShowToast(message) {
      if (this.showToast) return
      this.toastMessage = message
      this.showToast = true
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => {
        this.showToast = false
        this.toastMessage = ''
      }, 8000)
    },

    handleAnalysisUpdate(analysisData) {
      this.analysisData = { ...analysisData }
      
      // Add to focus history for charts
      this.focusHistory.push({
        timestamp: Date.now(),
        ...analysisData
      })
      
      // Keep only last 100 samples
      if (this.focusHistory.length > 100) {
        this.focusHistory.shift()
      }
      
      // Update break suggestions if drowsiness is high or stability is low
      if (analysisData.drowsiness > 0.7 || (analysisData.stabilityIndex > 0 && analysisData.stabilityIndex < 0.3)) {
        this.updateBreakSuggestions()
      }
    },

    updateBreakSuggestions() {
      // This would normally come from the focus calculator
      // For now, we'll generate basic suggestions based on current state
      const suggestions = []
      
      if (this.analysisData.drowsiness > 0.7) {
        suggestions.push({
          type: 'drowsiness_break',
          priority: 'high',
          title: '😴 Drowsiness Alert',
          description: 'High drowsiness detected. Take a 5-minute break and look at distant objects',
          duration: '5 minutes'
        })
      }
      
      if (this.analysisData.stabilityIndex > 0 && this.analysisData.stabilityIndex < 0.3) {
        suggestions.push({
          type: 'stability_reset',
          priority: 'medium', 
          title: '🎯 Focus Reset',
          description: 'Low stability detected. Take deep breaths and refocus on your task',
          duration: '2-3 minutes'
        })
      }

      if (this.analysisData.movementEnergy > 0.8) {
        suggestions.push({
          type: 'movement_break',
          priority: 'medium',
          title: '🚶 Movement Break',
          description: 'High restlessness detected. Take a short walk or do stretches',
          duration: '3-5 minutes'
        })
      }
      
      this.breakSuggestions = suggestions
    },

    handleBreakTaken(suggestion) {
      this.maybeShowToast(`Taking ${suggestion.title.replace(/[^\w\s]/gi, '')} - Great choice!`)
      // Could track break history here
    },

    // Session report methods
    onTimerCompleted(data) {
      console.log('Timer completed:', data)
    },

    onPomodoroCycleCompleted(data) {
      console.log('Pomodoro cycle completed:', data)
      this.generateSessionReport()
    },

    generateSessionReport() {
      const tracker = this.$refs.tracker
      if (tracker && tracker.getSessionReport) {
        const reportData = tracker.getSessionReport()
        if (reportData) {
          this.sessionReportData = reportData
          this.showSessionReport = true
          this.previousSessions.push({
            timestamp: Date.now(),
            focusScore: reportData.averages.focusScore,
            stabilityIndex: reportData.averages.stabilityIndex,
            duration: reportData.duration
          })
          if (this.previousSessions.length > 10) {
            this.previousSessions = this.previousSessions.slice(-10)
          }
        }
      }
    },

    closeSessionReport() {
      this.showSessionReport = false
      this.sessionReportData = null
    },

    startNewSession() {
      this.closeSessionReport()
      // Reset analysis data for new session
      this.analysisData = {
        stabilityIndex: 0,
        fixationRatio: 0,
        saccadesPerMin: 0,
        perclos: 0,
        drowsiness: 0,
        speakingRatio: 0,
        movementEnergy: 0,
        flowStreakSec: 0,
        distractionType: 'none'
      }
      this.focusHistory = []
      this.breakSuggestions = []
      // Also reset tracker session metrics so next session starts fresh
      const tracker = this.$refs.tracker
      if (tracker && tracker.resetSession) {
        tracker.resetSession()
      }
    },

    saveSessionReport(reportData) {
      // Demo: in-memory only for this run
      this.maybeShowToast('Session report saved for this run (not persisted).')
    },

    // Timer event handlers
    onTimerStarted(data) {
      console.log('Timer started:', data);
    },

    onTimerPaused(data) {
      console.log('Timer paused:', data);
    },

    onSessionChanged(data) {
      console.log('Session changed:', data);
    },

    async onFocusModeToggle(shouldEnable) {
      // Sync timer's focus mode with app's focus mode
      if (shouldEnable !== this.checked) {
        this.checked = shouldEnable;
        await this.onToggle();
        console.log(`Focus mode synced with timer: ${this.checked ? 'ON' : 'OFF'}`);
      }
    }

    }
}
</script>

<style>
/* CSS Custom Properties for Design System */
:root {
  /* Colors */
  --color-primary: #1e3a8a;        /* Deep Blue */
  --color-primary-light: #3b82f6;  /* Bright Blue */
  --color-primary-dark: #1e2a7a;   /* Darker Blue */
  --color-secondary: #1f2937;      /* Dark Gray */
  --color-accent: #06b6d4;         /* Cyan Accent */
  --color-background: #0f172a;     /* Very Dark Blue */
  --color-surface: #1e293b;        /* Dark Blue Surface */
  --color-surface-light: #334155;  /* Lighter Surface */
  --color-text-primary: #ffffff;   /* White Text */
  --color-text-secondary: #cbd5e1; /* Light Gray Text */
  --color-text-muted: #94a3b8;     /* Muted Text */
  --color-border: #334155;         /* Border Color */
  --color-border-light: #475569;   /* Lighter Border */
  
  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}

/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background: linear-gradient(135deg, var(--color-background) 0%, var(--color-secondary) 100%);
  color: var(--color-text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.app-header {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.brand-title {
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.025em;
}

.brand-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

/* Navigation */
.app-navigation {
  display: flex;
  gap: var(--spacing-sm);
  margin-right: var(--spacing-lg);
}

.nav-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-btn.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: var(--shadow-sm);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-label {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

/* Main Content */
.main-content {
  flex: 1;
  padding: var(--spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.workspace {
  display: grid;
  grid-template-columns: 1fr 400px;
  grid-template-rows: auto auto;
  gap: var(--spacing-xl);
  grid-template-areas: 
    "tracking timer"
    "media timer";
}

/* Section Styles */
.tracking-section {
  grid-area: tracking;
}

.timer-section {
  grid-area: timer;
  position: sticky;
  top: calc(80px + var(--spacing-xl));
  align-self: start;
}

.media-section {
  grid-area: media;
}

.section-header {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: 1.5rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.section-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
}

/* Tracking Content */
.tracking-content {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
}

/* Analysis Tab */
.analysis-tab {
  min-height: calc(100vh - 140px);
}

/* Focus Status Banner */
.focus-status-banner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  border: 1px solid var(--color-border-light);
}

.focus-status-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.focus-status-value {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
}

.focus-status-score {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
}

.status-focused {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.35);
}

.status-distracted {
  background: rgba(234, 179, 8, 0.15);
  border-color: rgba(234, 179, 8, 0.35);
}

.status-unfocused {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
}

/* Toast Notification */
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 20px 24px;
  box-shadow: var(--shadow-xl);
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 2000;
  min-width: 320px;
  max-width: 450px;
}
.toast-text {
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
}

.toast-icon {
  width: 24px;
  height: 24px;
  color: #f59e0b;
  flex-shrink: 0;
}

/* Media Controls */
.media-controls {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.media-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: none;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.media-btn.primary {
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-accent) 100%);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-md);
}

.media-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.media-btn.secondary {
  background: var(--color-surface-light);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
}

.media-btn.secondary:hover {
  background: var(--color-border-light);
  color: var(--color-text-primary);
}

.media-icon {
  width: 18px;
  height: 18px;
}

.media-label {
  font-size: 0.875rem;
}

/* Now Playing */
.now-playing {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-info {
  flex: 1;
}

.track-title {
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.track-artist {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.playing-indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: var(--spacing-md);
}

.wave-bar {
  width: 3px;
  height: 20px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-accent) 100%);
  border-radius: 2px;
  animation: wave 1.5s ease-in-out infinite;
}

.wave-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.wave-bar:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .workspace {
    grid-template-columns: 1fr 350px;
  }
}

@media (max-width: 1024px) {
  .workspace {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "timer"
      "tracking"
      "media";
  }
  
  .timer-section {
    position: static;
    top: auto;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
  }
  
  .brand-title {
    font-size: 1.75rem;
    text-align: center;
  }
  
  .main-content {
    padding: var(--spacing-md);
  }
  
  .workspace {
    gap: var(--spacing-lg);
  }
  
  .tracking-content,
  .media-controls,
  .now-playing {
    padding: var(--spacing-lg);
  }
  
  .media-controls {
    flex-direction: column;
  }
  
  .media-btn {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .brand-title {
    font-size: 1.5rem;
  }
  
  .section-title {
    font-size: 1.25rem;
  }
  
  .main-content {
    padding: var(--spacing-sm);
  }
  
  .workspace {
    gap: var(--spacing-md);
  }
  
  .tracking-content,
  .media-controls,
  .now-playing {
    padding: var(--spacing-md);
  }
}
</style>

