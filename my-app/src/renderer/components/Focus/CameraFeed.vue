<template>
  <div class="camera-feed" :class="{ 'hidden': hideVideo }">
    <video 
      ref="videoRef"
      autoplay 
      muted 
      playsinline
      :width="width"
      :height="height"
      class="camera-video"
    ></video>
    
    <div v-if="showStatus" class="camera-status">
      <div class="status-indicator" :class="statusClass">
        <div class="status-dot"></div>
        <span>{{ statusText }}</span>
      </div>
    </div>
    
    <div v-if="showError && error" class="error-message">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script>
import { ref, inject, onMounted, onUnmounted, computed, watch } from 'vue'

export default {
  name: 'CameraFeed',
  props: {
    width: {
      type: Number,
      default: 640
    },
    height: {
      type: Number,
      default: 480
    },
    hideVideo: {
      type: Boolean,
      default: false
    },
    showStatus: {
      type: Boolean,
      default: true
    },
    showError: {
      type: Boolean,
      default: true
    },
    autoStart: {
      type: Boolean,
      default: true
    }
  },
  emits: ['started', 'stopped', 'error'],
  setup(props, { emit }) {
    const videoRef = ref(null)
    const error = ref(null)
    
    // Inject the simplified focus context
    const focus = inject('focus')
    
    if (!focus) {
      // This error is a safeguard for development
      error.value = 'CameraFeed must be used within a SimpleFocusProvider'
      console.error(error.value)
    }
    
    // Computed properties to drive the UI from the provider's state
    const statusClass = computed(() => {
      if (error.value) return 'status-error'
      if (focus?.status.value === 'initializing') return 'status-initializing'
      if (focus?.isTracking.value) return 'status-active'
      return 'status-inactive'
    })
    
    const statusText = computed(() => {
      if (error.value) return 'Camera Error'
      if (focus?.status.value === 'initializing') return 'Initializing...'
      if (focus?.status.value === 'no-face') return 'No Face Detected'
      if (focus?.isTracking.value) return 'Tracking Active'
      return 'Inactive'
    })
    
    /**
     * Start camera and face tracking using the provider's method
     */
    const startCamera = async () => {
      if (!focus || !videoRef.value) return
      if (focus.isTracking.value) return

      try {
        error.value = null
        await focus.start(videoRef.value)
        emit('started')
      } catch (err) {
        console.error('Error starting camera:', err)
        error.value = err.message || 'Failed to start camera'
        emit('error', err)
      }
    }
    
    /**
     * Stop camera and face tracking using the provider's method
     */
    const stopCamera = () => {
      if (!focus || !focus.isTracking.value) return
      
      try {
        focus.stop()
        emit('stopped')
      } catch (err) {
        console.error('Error stopping camera:', err)
        error.value = err.message || 'Failed to stop camera'
        emit('error', err)
      }
    }
    
    // Watch for changes in autoStart prop to dynamically start/stop
    watch(() => props.autoStart, (newValue) => {
      if (newValue && !focus?.isTracking.value) {
        startCamera()
      } else if (!newValue && focus?.isTracking.value) {
        stopCamera()
      }
    })
    
    onMounted(() => {
      if (props.autoStart && videoRef.value) {
        startCamera()
      }
    })
    
    onUnmounted(() => {
      // Ensure camera is stopped when component is removed
      stopCamera()
    })
    
    return {
      videoRef,
      error,
      statusClass,
      statusText,
      // Expose methods for parent components if needed
      startCamera,
      stopCamera
    }
  }
}
</script>

<style scoped>
.camera-feed {
  position: relative;
  display: inline-block;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
}

.camera-feed.hidden .camera-video {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.camera-video {
  display: block;
  max-width: 100%;
  height: auto;
}

.camera-status {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-active .status-dot {
  background-color: #4ade80; /* green-400 */
}

.status-initializing .status-dot {
  background-color: #fbbf24; /* amber-400 */
}

.status-inactive .status-dot {
  background-color: #6b7280; /* gray-500 */
}

.status-error .status-dot {
  background-color: #ef4444; /* red-500 */
}

.error-message {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: rgba(239, 68, 68, 0.9); /* red-500 */
  color: white;
  font-size: 12px;
  font-weight: 500;
  z-index: 10;
}

.error-icon {
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>