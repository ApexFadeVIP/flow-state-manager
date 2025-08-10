<template>
  <div id="app">

    <h1>UltraFlow</h1>
     <p>Advanced AI-Powered Focus and Gesture Recognition</p>
    <SimpleToggle v-model="checked" @change="onToggle" />
    <p>Focus mode is: {{ checked ? 'on' : 'off' }}</p>
  
    <main>
      <!-- Navigation Tabs -->
      <div class="tab-navigation">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'gesture' }"
          @click="activeTab = 'gesture'"
        >
          🤲 Gesture Recognition
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'focus' }"
          @click="activeTab = 'focus'"
        >
          👁️ Focus Tracking
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Gesture Recognition Tab -->
        <div v-if="activeTab === 'gesture'" class="tab-panel">
          <div class="panel-header">
            <h2>Hand Gesture Recognition</h2>
            <p>Real-time hand gesture detection using MediaPipe</p>
          </div>
          <GestureRecognition />
        </div>
        
        <!-- Focus Tracking Tab -->
        <div v-if="activeTab === 'focus'" class="tab-panel">
          <div class="panel-header">
            <h2>Face Focus Tracking</h2>
            <p>Monitor attention and focus levels through facial analysis</p>
          </div>
          <FocusTrackingDemo />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SimpleToggle from "../main/components/ToggleSwitch.vue"
import { ref } from 'vue'
import GestureRecognition from './components/GestureRecognition.vue'
import FocusTrackingDemo from './components/Focus/FocusTrackingDemo.vue'

export default {
  name: 'App',
  components: { SimpleToggle,
    GestureRecognition,
    FocusTrackingDemo },
  data() {
    return {
      checked: false
    }
  },setup() {
    const activeTab = ref('focus') // Default to focus tracking
    
    return {
      activeTab
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

.tab-navigation {
  display: flex;
  gap: 4px;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
}

.tab-button {
  padding: 12px 24px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s ease;
  position: relative;
}

.tab-button:hover {
  background-color: #f1f5f9;
  color: #475569;
}

.tab-button.active {
  background-color: white;
  color: #1e293b;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tab-content {
  background: white;
  border-radius: 0 8px 8px 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-panel {
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
  
  .tab-navigation {
    flex-direction: column;
    gap: 2px;
  }
  
  .tab-button {
    border-radius: 8px;
    text-align: left;
  }
  
  .tab-button.active::after {
    display: none;
  }
  
  .tab-content {
    border-radius: 8px;
  }
  
  .tab-panel {
    padding: 1rem;
  }
  
  .panel-header h2 {
    font-size: 1.5rem;
  }
}
</style>

