<template>
  <div class="timer-settings">
    <div class="settings-header">
      <h3>Focus Timer Settings</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>
    
    <div class="settings-content">
      <div class="settings-section">
        <h4>Timer Durations</h4>
        
        <div class="setting-row">
          <label>Work Session</label>
          <div class="time-input">
            <input 
              type="number" 
              v-model.number="localSettings.workDuration" 
              min="1" 
              max="120"
              class="time-field"
            />
            <span class="time-unit">minutes</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label>Short Break</label>
          <div class="time-input">
            <input 
              type="number" 
              v-model.number="localSettings.shortBreak" 
              min="1" 
              max="30"
              class="time-field"
            />
            <span class="time-unit">minutes</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label>Long Break</label>
          <div class="time-input">
            <input 
              type="number" 
              v-model.number="localSettings.longBreak" 
              min="1" 
              max="60"
              class="time-field"
            />
            <span class="time-unit">minutes</span>
          </div>
        </div>
        
        <div class="setting-row">
          <label>Daily Goal</label>
          <div class="time-input">
            <input 
              type="number" 
              v-model.number="localSettings.dailyGoal" 
              min="1" 
              max="20"
              class="time-field"
            />
            <span class="time-unit">sessions</span>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>Gesture Control</h4>
        
        <div class="setting-row">
          <label>Pause/Resume Gesture</label>
          <select v-model="localSettings.pauseGesture" class="gesture-select">
            <option value="Pointing_Up">👆 Pointing Up (Focus Mode)</option>
            <option value="Closed_Fist">✊ Closed Fist</option>
            <option value="Open_Palm">✋ Open Palm</option>
            <option value="Thumb_Up">👍 Thumb Up</option>
            <option value="Victory">✌️ Peace Sign</option>
          </select>
        </div>
        
        <div class="gesture-demo">
          <div class="demo-card">
            <div class="demo-icon">{{ getGestureEmoji(localSettings.pauseGesture) }}</div>
            <div class="demo-text">Show this gesture to pause/resume timer</div>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>Automation</h4>
        
        <div class="setting-row checkbox-row">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="localSettings.autoStartBreaks"
              class="checkbox-input"
            />
            <span class="checkbox-custom"></span>
            Auto-start break sessions
          </label>
        </div>
        
        <div class="setting-row checkbox-row">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="localSettings.focusModeSync"
              class="checkbox-input"
            />
            <span class="checkbox-custom"></span>
            Sync with system Focus Mode
          </label>
        </div>
        
        <div class="setting-row checkbox-row">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="localSettings.gestureControlEnabled"
              class="checkbox-input"
            />
            <span class="checkbox-custom"></span>
            Enable gesture control
          </label>
        </div>
        
        <div class="setting-row checkbox-row">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="localSettings.soundEnabled"
              class="checkbox-input"
            />
            <span class="checkbox-custom"></span>
            Play notification sounds
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>Focus Integration</h4>
        
        <div class="setting-row">
          <label>Minimum Focus Score</label>
          <div class="slider-input">
            <input 
              type="range" 
              v-model.number="localSettings.minFocusScore" 
              min="0" 
              max="100"
              class="slider"
            />
            <span class="slider-value">{{ localSettings.minFocusScore }}%</span>
          </div>
        </div>
        
        <div class="setting-row checkbox-row">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="localSettings.pauseOnLowFocus"
              class="checkbox-input"
            />
            <span class="checkbox-custom"></span>
            Auto-pause when focus drops too low
          </label>
        </div>

        <div class="setting-row">
          <label>Distracted notification delay</label>
          <div class="time-input">
            <input 
              type="number" 
              v-model.number="localSettings.distractedDelaySeconds" 
              min="1" 
              max="120"
              class="time-field"
            />
            <span class="time-unit">seconds</span>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <h4>Presets</h4>
        
        <div class="preset-buttons">
          <button @click="applyPreset('classic')" class="preset-btn">
            Classic Pomodoro
            <span class="preset-desc">25min work, 5min break</span>
          </button>
          <button @click="applyPreset('extended')" class="preset-btn">
            Extended Focus
            <span class="preset-desc">45min work, 15min break</span>
          </button>
          <button @click="applyPreset('short')" class="preset-btn">
            Quick Bursts
            <span class="preset-desc">15min work, 3min break</span>
          </button>
          <button @click="applyPreset('custom')" class="preset-btn">
            Custom Flow
            <span class="preset-desc">50min work, 10min break</span>
          </button>
        </div>
      </div>
    </div>
    
    <div class="settings-footer">
      <button @click="resetToDefaults" class="secondary-btn">Reset to Defaults</button>
      <div class="action-buttons">
        <button @click="$emit('close')" class="secondary-btn">Cancel</button>
        <button @click="saveSettings" class="primary-btn">Save Changes</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch } from 'vue'

export default {
  name: 'TimerSettings',
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['save', 'close'],
  setup(props, { emit }) {
    const localSettings = reactive({
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
      pauseOnLowFocus: false,
      distractedDelaySeconds: 5,
      ...props.settings
    })
    
    const presets = {
      classic: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        dailyGoal: 8
      },
      extended: {
        workDuration: 45,
        shortBreak: 15,
        longBreak: 30,
        dailyGoal: 6
      },
      short: {
        workDuration: 15,
        shortBreak: 3,
        longBreak: 10,
        dailyGoal: 12
      },
      custom: {
        workDuration: 50,
        shortBreak: 10,
        longBreak: 20,
        dailyGoal: 6
      }
    }
    
    const getGestureEmoji = (gesture) => {
      const emojis = {
        'Pointing_Up': '👆',
        'Closed_Fist': '✊',
        'Open_Palm': '✋',
        'Thumb_Up': '👍',
        'Victory': '✌️'
      }
      return emojis[gesture] || '👆'
    }
    
    const applyPreset = (presetName) => {
      if (presets[presetName]) {
        Object.assign(localSettings, presets[presetName])
      }
    }
    
    const resetToDefaults = () => {
      Object.assign(localSettings, {
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
        pauseOnLowFocus: false,
        distractedDelaySeconds: 5
      })
    }
    
    const saveSettings = () => {
      emit('save', { ...localSettings })
    }
    
    return {
      localSettings,
      getGestureEmoji,
      applyPreset,
      resetToDefaults,
      saveSettings
    }
  }
}
</script>

<style scoped>
.timer-settings {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-text-primary);
}

.settings-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-primary);
  opacity: 0.8;
  transition: opacity 0.2s;
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
}

.close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.settings-section {
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-row label {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  flex: 1;
}

.time-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-field {
  width: 80px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  text-align: center;
  background: var(--color-surface-light);
  color: var(--color-text-primary);
}

.time-unit {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.gesture-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.gesture-demo {
  margin-top: 1rem;
}

.demo-card {
  background: linear-gradient(135deg, #667eea20, #764ba220);
  border: 1px solid #667eea30;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.demo-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.demo-text {
  font-size: 0.9rem;
  color: #475569;
}

.checkbox-row {
  align-items: flex-start;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  margin-bottom: 0;
  width: 100%;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  position: relative;
  transition: all 0.2s;
  flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
  background: #667eea;
  border-color: #667eea;
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
}

.slider-input {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  max-width: 200px;
}

.slider {
  flex: 1;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #667eea;
  border-radius: 50%;
  cursor: pointer;
}

.slider-value {
  font-weight: 500;
  color: #667eea;
  min-width: 40px;
  text-align: right;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.preset-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.preset-btn:hover {
  background: #f1f5f9;
  border-color: #667eea;
  transform: translateY(-1px);
}

.preset-btn .preset-desc {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.settings-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.secondary-btn {
  background: white;
  color: #475569;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover {
  background: #f8fafc;
  border-color: #9ca3af;
}

/* Scrollbar styling */
.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.settings-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

@media (max-width: 640px) {
  .timer-settings {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .settings-header,
  .settings-section,
  .settings-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .preset-buttons {
    grid-template-columns: 1fr;
  }
  
  .settings-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style>
