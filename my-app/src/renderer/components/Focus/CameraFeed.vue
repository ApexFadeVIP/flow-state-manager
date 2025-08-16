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
    },
    cameraConstraints: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['started', 'stopped', 'error'],
  setup(props, { emit }) {
    const videoRef = ref(null)
    const error = ref(null)
    const isInitializing = ref(false)
    
    // Inject focus context
    const focus = inject('focus')
    
    if (!focus) {
      console.error('CameraFeed must be used within a FocusProvider')
    }
    
    // Computed properties
    const statusClass = computed(() => {
      if (error.value) return 'status-error'
      if (isInitializing.value) return 'status-initializing'
      if (focus?.isTracking) return 'status-active'
      return 'status-inactive'
    })
    
    const statusText = computed(() => {
      if (error.value) return 'Camera Error'
      if (isInitializing.value) return 'Initializing...'
      if (focus?.isTracking) return 'Face Tracking Active'
      return 'Camera Inactive'
    })
    
    /**
     * Start camera and face tracking
     */
    const startCamera = async () => {
      if (!focus || !videoRef.value) {
        console.error('Focus context or video element not available')
        return
      }
      
      try {
        error.value = null
        isInitializing.value = true
        
        console.log('Starting camera feed...')
        
        await focus.start(videoRef.value, {
          width: props.width,
          height: props.height,
          cameraConstraints: props.cameraConstraints
        })
        
        emit('started')
        console.log('Camera feed started successfully')
        
      } catch (err) {
        console.error('Error starting camera:', err)
        error.value = err.message || 'Failed to start camera'
        emit('error', err)
      } finally {
        isInitializing.value = false
      }
    }
    
    /**
     * Stop camera and face tracking
     */
    const stopCamera = () => {
      if (!focus) return
      
      try {
        console.log('Stopping camera feed...')
        focus.stop()
        error.value = null
        emit('stopped')
        console.log('Camera feed stopped')
      } catch (err) {
        console.error('Error stopping camera:', err)
        error.value = err.message || 'Failed to stop camera'
        emit('error', err)
      }
    }
    
    /**
     * Check camera permissions
     */
    const checkCameraPermissions = async () => {
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' })
        return permissions.state === 'granted'
      } catch (err) {
        console.warn('Could not check camera permissions:', err)
        return false
      }
    }
    
    // Watch for changes in autoStart prop
    watch(() => props.autoStart, (newValue) => {
      if (newValue && !focus?.isTracking && videoRef.value) {
        startCamera()
      } else if (!newValue && focus?.isTracking) {
        stopCamera()
      }
    })
    
    onMounted(async () => {
      if (!focus) {
        error.value = 'Focus context not available'
        return
      }
      
      // Check if face tracking is supported
      if (!focus.isSupported()) {
        error.value = 'Face tracking is not supported in this browser'
        return
      }
      
      // Start automatically if enabled
      if (props.autoStart && videoRef.value) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          startCamera()
        }, 100)
      }
    })
    
    onUnmounted(() => {
      stopCamera()
    })
    
    return {
      videoRef,
      error,
      isInitializing,
      statusClass,
      statusText,
      startCamera,
      stopCamera,
      checkCameraPermissions
    }
  }
}
</script>

<style scoped>
.camera-feed {
  position: relative;
  display: inline-block;
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
  border-radius: 8px;
  background-color: #000;
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

/* Responsive styles */
@media (max-width: 768px) {
  .camera-video {
    max-width: 100%;
    height: auto;
  }
  
  .status-indicator,
  .error-message {
    font-size: 11px;
  }
}
</style> 