<template>
  <div id="app">
    <div class="header-row">
      <div class="header-left">
        <SimpleToggle v-model="checked" @change="onToggle" />
        <span class="focus-label">{{ checked ? 'Deactivate' : 'Activate' }} Focus Mode</span>
      </div>
      <h1 class="header-title">UltraFlow</h1>
      <div class="spotify-container">
        <button class="spotify-btn" @click="playPauseSpotify">
          <span class="spotify-icon">🎵</span>
          <span class="spotify-label">Play/Pause Spotify</span>
        </button>
        <div v-if="nowPlaying" class="now-playing-label">
          <span class="music-animate">🎶</span>
          Playing <strong>{{ nowPlaying.track }}</strong> by <strong>{{ nowPlaying.artist }}</strong>
        </div>
        <button class="spotify-btn change-music-btn" @click="openSpotify">
            <span class="spotify-icon">🔀</span>
            <span class="spotify-label">Change Music</span>
          </button>
      </div>
    </div>
    <p class="description">Advanced AI-Powered Focus and Gesture Recognition</p>
    <!-- ...rest of your code... -->
    <header>
      <h1>Flow State Manager</h1>
      <p>Unified AI-Powered Focus and Gesture Recognition</p>
    </header>
    
    <main>
      <div class="unified-content">
        <div class="panel-header">
          <h2>Unified Vision Tracking</h2>
          <p>Real-time gesture recognition and focus tracking on a single camera feed</p>
        </div>
        <UnifiedVisionTracker />
      </div>
    </main>
  </div>
</template>

<script>
import SimpleToggle from "../main/components/ToggleSwitch.vue"
import UnifiedVisionTracker from './components/UnifiedVisionTracker.vue'

export default {
  name: 'App',
  components: { SimpleToggle, GestureRecognition, FocusTrackingDemo, UnifiedVisionTracker },
  data() {
    return {
      checked: false,
      nowPlaying: null,
      spotifyPollInterval: null // Add this
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
      if (gesture === 'Open palm' && !this.checked) {
        this.checked = true;
        await this.onToggle();
      }
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 300;
}

header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

main {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.unified-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  padding: 2rem;
}

.panel-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.panel-header p {
  font-size: 1rem;
  color: #64748b;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2rem;
  margin-bottom: 0;
  padding: 0 2rem;
}

.spotify-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 180px;
}

.now-playing-label {
  margin-top: 0.5rem;
  text-align: right;
  font-size: 1rem;
  color: #1db954;
  font-weight: 500;
  width: 100%;
  word-break: break-word;
  white-space: normal;
}

.change-music-btn {
  margin-top: 0.5rem;
  background: linear-gradient(90deg, #191414 0%, #1db954 100%);
  color: #fff;
  border: none;
  border-radius: 18px;
  padding: 6px 18px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 1px 4px rgba(30,185,84,0.10);
  transition: background 0.2s, transform 0.2s;
}

.change-music-btn:hover {
  background: linear-gradient(90deg, #1db954 0%, #191414 100%);
  transform: translateY(-1px) scale(1.03);
}

.change-music-icon {
  font-size: 1.2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0;

}

.description {
  text-align: center;
  font-size: 1.2rem;
  color: #4b5563;
  margin-top: 0.5rem;
}

.spotify-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(90deg, #1db954 0%, #191414 100%);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 10px 22px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(30,185,84,0.15);
  transition: background 0.2s, transform 0.2s;
}

.spotify-btn:hover {
  background: linear-gradient(90deg, #1ed760 0%, #191414 100%);
  transform: translateY(-2px) scale(1.04);
}

.spotify-icon {
  font-size: 1.3rem;
}

.spotify-label {
  font-size: 1rem;
  letter-spacing: 0.5px;
}

.focus-label {
  font-size: 1rem;
  font-weight: 500;
}

.music-animate {
  display: inline-block;
  margin-right: 0.5rem;
  font-size: 1.3rem;
  animation: music-move 1s infinite linear;
}

@keyframes music-move {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  20%  { transform: translateY(-3px) scale(1.1); opacity: 0.8; }
  40%  { transform: translateY(-6px) scale(1.2); opacity: 0.7; }
  60%  { transform: translateY(-3px) scale(1.1); opacity: 0.8; }
  80%  { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* Responsive design */
@media (max-width: 768px) {
  header {
    padding: 1.5rem;
  }
  
  header h1 {
    font-size: 2rem;
  }
  
  main {
    padding: 1rem;
  }
  
  .unified-content {
    padding: 1rem;
  }
  
  .panel-header h2 {
    font-size: 1.5rem;
  }
}
</style>

