import { ref, reactive, onUnmounted } from 'vue'
import { initFaceMesh, attachCamera, setupCamera, stopCamera } from '../lib/face/faceMesh.js'
import { FocusScoreCalculator } from '../lib/face/focusScore.js'

/**
 * Face focus tracking hook
 * Provides reactive focus tracking using MediaPipe face mesh
 */
export function useFaceFocus() {
  // Reactive state
  const focusScore = ref(1.0)
  const status = ref('inactive') // 'inactive' | 'no-face' | 'focused' | 'distracted' | 'unfocused'
  const isActive = ref(false)
  
  // Events and metrics
  const events = reactive({
    lookAways: 0,
    blinks: 0,
    blinkRate: 0,
    yawAvg: 0,
    pitchAvg: 0,
    gazeXAvg: 0
  })
  
  // Detailed metrics for debugging
  const metrics = reactive({
    yaw: 0,
    pitch: 0,
    gazeX: 0,
    ear: 1.0,
    mar: 0,
    isLookingAway: false,
    rawScore: 1.0,
    penalties: {
      penYaw: 0,
      penPitch: 0,
      penGaze: 0,
      penBlink: 0,
      penMouth: 0
    }
  })

  // Advanced focus analysis metrics
  const analysis = reactive({
    stabilityIndex: 0,
    fixationRatio: 0,
    saccadesPerMin: 0,
    perclos: 0,
    drowsiness: 0,
    speakingRatio: 0,
    movementEnergy: 0,
    flowStreakSec: 0,
    distractionType: 'none'
  })
  
  // Internal state
  let faceMesh = null
  let camera = null
  let stream = null
  let calculator = null
  let frameProcessingInterval = null
  let lastFrameTime = 0
  let noFaceFrames = 0
  let firstLandmarksReceived = false // Add this new flag
  let usingCameraUtil = false
  
  const TARGET_FPS = 15
  const FRAME_INTERVAL = 1000 / TARGET_FPS // ~66ms
  const NO_FACE_THRESHOLD = 2000 // 2 seconds

  const startManualLoop = () => {
    if (frameProcessingInterval) return
    console.warn('[FaceFocus] Starting manual processing loop as fallback')
    frameProcessingInterval = setInterval(async () => {
      try {
        if (faceMesh && videoElRef && videoElRef.current) {
          await faceMesh.send({ image: videoElRef.current })
        }
      } catch (err) {
        console.error('[FaceFocus] Manual loop error:', err)
      }
    }, FRAME_INTERVAL)
  }

  // We keep a weak ref to the last video element for fallback loop
  let videoElRef = null
  
  /**
   * Process face mesh results
   */
  const onResults = (results) => {
    const now = performance.now()
    
    // Throttle processing to target FPS
    if (now - lastFrameTime < FRAME_INTERVAL) {
      return
    }
    lastFrameTime = now
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0]
      if (!firstLandmarksReceived) { // Use the new flag for the check
        console.log('[FaceFocus] First face landmarks received')
        firstLandmarksReceived = true // Set the flag so it doesn't run again
      }
      noFaceFrames = 0
      
      // Calculate focus score
      const result = calculator.calculateFocusScore(landmarks)
      
      // Update reactive state
      focusScore.value = result.score
      
      // Update events
      events.lookAways = result.metrics.lookAwayCount
      events.blinks = result.metrics.blinkCount
      events.blinkRate = Math.round(result.metrics.blinkRate)
      events.yawAvg = Math.round(result.metrics.yaw * 100) / 100
      events.pitchAvg = Math.round(result.metrics.pitch * 100) / 100
      events.gazeXAvg = Math.round(result.metrics.gazeX * 100) / 100
      
      // Update detailed metrics
      Object.assign(metrics, result.metrics)
      
      // Update analysis metrics
      if (result.analysis) {
        Object.assign(analysis, result.analysis)
      }
      
      // Update status
      status.value = calculator.getFocusStatus()
      
    } else {
      // No face detected
      if (noFaceFrames === 0) {
        console.log('[FaceFocus] No face detected yet')
      }
      noFaceFrames += FRAME_INTERVAL
      
      if (noFaceFrames >= NO_FACE_THRESHOLD) {
        status.value = 'no-face'
        // Freeze score decay when no face is detected
      }
    }
  }
  
  /**
   * Start face focus tracking
   * @param {HTMLVideoElement} videoEl - Video element for camera feed
   * @param {Object} options - Configuration options
   */
  const start = async (videoEl, options = {}) => {
    try {
      if (isActive.value) {
        console.warn('Face focus tracking is already active')
        return
      }
      
      console.log('[FaceFocus] Start requested')
      videoElRef = { current: videoEl }
      
      // Initialize calculator
      calculator = new FocusScoreCalculator()
      console.log('[FaceFocus] Calculator initialized')
      
      // Do not pre-bind a stream; let MediaPipe Camera manage getUserMedia
      console.log('[FaceFocus] Skipping manual getUserMedia; Camera util will manage stream')
      
      // Initialize face mesh
      console.log('[FaceFocus] Initializing FaceMesh...')
      faceMesh = await initFaceMesh(onResults)
      console.log('[FaceFocus] FaceMesh initialized')
      
      // Attach camera to face mesh
      console.log('[FaceFocus] Attaching camera...')
      camera = attachCamera(videoEl, faceMesh, {
        width: options.width || 640,
        height: options.height || 480
      })
      usingCameraUtil = true
      console.log('[FaceFocus] Camera attached')
      
      // Start camera
      console.log('[FaceFocus] Starting camera...')
      await camera.start()
      console.log('[FaceFocus] Camera started')
      
      // After a short delay, ensure stream is bound; if not, fallback
      setTimeout(async () => {
        if (!videoEl.srcObject) {
          console.warn('[FaceFocus] Camera util did not bind stream; falling back to manual getUserMedia')
          try {
            if (camera) {
              camera.stop()
              camera = null
              usingCameraUtil = false
            }
            stream = await setupCamera(videoEl, options.cameraConstraints)
            startManualLoop()
          } catch (err) {
            console.error('[FaceFocus] Fallback getUserMedia failed:', err)
          }
        }
      }, 1000)
      
      // Fetch underlying stream for stop()
      stream = videoEl.srcObject || null
      
      isActive.value = true
      status.value = 'focused'
      focusScore.value = 1.0
      
      console.log('[FaceFocus] Tracking active')
      
    } catch (error) {
      console.error('[FaceFocus] Error starting face focus tracking:', error)
      status.value = 'error'
      throw error
    }
  }
  
  /**
   * Stop face focus tracking
   */
  const stop = () => {
    try {
      console.log('[FaceFocus] Stopping...')
      
      // Stop camera
      if (camera) {
        camera.stop()
        camera = null
      }
      
      // Stop manual loop
      if (frameProcessingInterval) {
        clearInterval(frameProcessingInterval)
        frameProcessingInterval = null
      }
      
      // Stop stream if present
      if (stream) {
        stopCamera(stream)
        stream = null
      }
      
      // Close face mesh
      if (faceMesh) {
        faceMesh.close()
        faceMesh = null
      }
      
      // Reset state
      isActive.value = false
      status.value = 'inactive'
      calculator = null
      noFaceFrames = 0
      lastFrameTime = 0
      firstLandmarksReceived = false // Reset the flag when stopping
      usingCameraUtil = false
      videoElRef = null
      
      console.log('[FaceFocus] Stopped')
      
    } catch (error) {
      console.error('[FaceFocus] Error stopping face focus tracking:', error)
    }
  }
  
  /**
   * Reset focus tracking metrics
   */
  const reset = () => {
    if (calculator) {
      calculator.reset()
      focusScore.value = 1.0
      firstLandmarksReceived = false // Also reset the flag here
      
      // Reset events
      events.lookAways = 0
      events.blinks = 0
      events.blinkRate = 0
      events.yawAvg = 0
      events.pitchAvg = 0
      events.gazeXAvg = 0
      
      // Reset metrics
      Object.assign(metrics, {
        yaw: 0,
        pitch: 0,
        gazeX: 0,
        ear: 1.0,
        mar: 0,
        isLookingAway: false,
        rawScore: 1.0,
        penalties: {
          penYaw: 0,
          penPitch: 0,
          penGaze: 0,
          penBlink: 0,
          penMouth: 0
        }
      })

      // Reset analysis metrics
      Object.assign(analysis, {
        stabilityIndex: 0,
        fixationRatio: 0,
        saccadesPerMin: 0,
        perclos: 0,
        drowsiness: 0,
        speakingRatio: 0,
        movementEnergy: 0,
        flowStreakSec: 0,
        distractionType: 'none'
      })
    }
  }
  
  /**
   * Update focus tracking configuration
   */
  const updateConfig = (newConfig) => {
    if (calculator) {
      calculator.config = { ...calculator.config, ...newConfig }
    }
  }
  
  /**
   * Get current session statistics
   */
  const getSessionStats = () => {
    if (!calculator) {
      return {
        duration: 0,
        avgScore: 1.0,
        lookAwayRate: 0,
        blinkRate: 0,
        totalBlinks: 0,
        totalLookAways: 0
      }
    }
    
    const duration = (Date.now() - calculator.startTime) / 1000 // seconds
    const avgScore = calculator.scoreEMA
    const lookAwayRate = duration > 0 ? (events.lookAways / duration) * 60 : 0 // per minute
    
    return {
      duration: Math.round(duration),
      avgScore: Math.round(avgScore * 100) / 100,
      lookAwayRate: Math.round(lookAwayRate * 100) / 100,
      blinkRate: events.blinkRate,
      totalBlinks: events.blinks,
      totalLookAways: events.lookAways
    }
  }
  
  /**
   * Check if face tracking is supported
   */
  const isSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
  
  /**
   * Handle visibility changes to pause/resume tracking
   */
  const handleVisibilityChange = () => {
    if (document.hidden && isActive.value) {
      // Pause processing when tab is hidden
      if (camera) {
        camera.stop()
      }
    } else if (!document.hidden && isActive.value) {
      // Resume processing when tab becomes visible
      if (camera) {
        camera.start()
      }
    }
  }
  
  // Setup visibility change listener
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    stop()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })
  
  return {
    // State
    focusScore,
    status,
    isActive,
    events,
    metrics,
    analysis,
    
    // Methods
    start,
    stop,
    reset,
    updateConfig,
    getSessionStats,
    isSupported
  }
}