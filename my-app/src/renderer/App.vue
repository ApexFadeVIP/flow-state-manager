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
          <div class="control-group">
            <SimpleToggle v-model="checked" @change="onToggle" />
            <span class="control-label">Focus Mode</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="workspace">
        <!-- Vision Tracking Section -->
        <section class="tracking-section">
          <div class="section-header">
            <h2 class="section-title">Vision Tracking</h2>
            <p class="section-subtitle">Real-time gesture recognition and focus monitoring</p>
          </div>
          
          <div class="tracking-content">
            <GestureRecognition @gesture="handleGesture"/>
          </div>
        </section>

        <!-- Timer Section -->
        <section class="timer-section">
          <PomodoroTimer 
            :current-gesture="currentGesture"
            :focus-score="focusScore"
            @timer-started="onTimerStarted"
            @timer-paused="onTimerPaused"
            @timer-completed="onTimerCompleted"
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
    </main>
  </div>
</template>

<script>
import SimpleToggle from "../main/components/ToggleSwitch.vue"
import GestureRecognition from "./components/GestureRecognition.vue"
import UnifiedVisionTracker from './components/UnifiedVisionTracker.vue'
import PomodoroTimer from './components/PomodoroTimer.vue'
import { ref } from 'vue'

export default {
  name: 'App',
  components: { SimpleToggle, UnifiedVisionTracker, GestureRecognition, PomodoroTimer },
  data() {
    return {    
    // When gesture detected:
      checked: false,
      nowPlaying: null,
      spotifyPollInterval: null, // Add this
      lastGesture: null,
      currentGesture: 'None',
      focusScore: 100,
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
      
      // Only toggle when gesture changes from not-palm to palm
      if (gesture === 'Pointing_Up' && this.lastGesture !== 'Pointing_Up') {
        this.checked = !this.checked;
        await this.onToggle();
        console.log(`Focus mode is now ${this.checked ? 'ON' : 'OFF'}`);
      }else if(gesture == 'Thumb_Up' && this.lastGesture !== 'Thumb_Up'){
        this.nowPlaying = !this.nowPlaying;
        await this.playPauseSpotify();
        console.log(`Music is ${this.nowPlaying ? 'PLAYING' : 'STOPPED'} now`);
      }else if(gesture == 'Victory' && this.lastGesture !== 'Victory'){
        this.nowPlaying = !this.nowPlaying;
        await this.openSpotify();
        console.log(`Song has CHANGED now`);
      }
      this.lastGesture = gesture;
    },

    // Timer event handlers
    onTimerStarted(data) {
      console.log('Timer started:', data);
    },

    onTimerPaused(data) {
      console.log('Timer paused:', data);
    },

    onTimerCompleted(data) {
      console.log('Timer completed:', data);
      // Show notification or celebratory message
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

