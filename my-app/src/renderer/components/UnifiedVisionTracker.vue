<template>
  <div class="unified-vision-tracker">
    <div class="video-container">
      <video 
        ref="videoEl" 
        id="webcam" 
        autoplay 
        muted 
        playsinline
        :width="640"
        :height="480"
      ></video>
      <canvas 
        ref="canvasEl" 
        :width="640" 
        :height="480"
        class="overlay-canvas"
      ></canvas>
    </div>
    
    <div class="controls">
      <button @click="startCamera" :disabled="isCameraActive">Start Camera</button>
      <button @click="stopCamera" :disabled="!isCameraActive">Stop Camera</button>
      <button @click="resetFocusTracking" :disabled="!isCameraActive">Reset Focus</button>
    </div>
    

  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { FocusScoreCalculator } from '../lib/face/focusScore.js'

export default {
  name: 'UnifiedVisionTracker',
  emits: ['gesture', 'focus-update', 'cognitive-update'],
  setup(props, { emit }) {
    // Video and canvas refs
    const videoEl = ref(null)
    const canvasEl = ref(null)
    
    // System state
    const isCameraActive = ref(false)
    const cameraStatus = ref('Not started')
    const modelStatus = ref('Not loaded')
    const fps = ref(0)
    
    // Gesture tracking state
    const currentGesture = ref('None')
    const gestureConfidence = ref(0)
    const gestureHistory = ref([])
    
    // Focus tracking state
    const focusScore = ref(1.0)
    const focusStatus = ref('focused')
    const lookAwayCount = ref(0)
    const blinkCount = ref(0)
    const blinkRate = ref(0)
    const headPose = reactive({
      yaw: 0,
      pitch: 0,
      gazeX: 0,
      ear: 1.0,
      isLookingAway: false
    })
    
    // Internal state
    let stream = null
    let gestureRecognizer = null
    let faceLandmarker = null
    let focusCalculator = null
    let animationId = null
    let lastFrameTime = 0
    
    // Gesture stability filtering
    let stableGestureName = 'None'
    let pendingGestureName = 'None'
    let gestureChangeStartedAt = 0
    const gestureStableMs = 500 // require gesture to be steady before emitting
    const noneStableMs = 250 // require brief stability before emitting None
    const minConfidence = 0.7
    let lastGestureEmitAt = 0
    
    const startCamera = async () => {
      try {
        // Check if models are loaded
        if (!gestureRecognizer || !faceLandmarker) {
          cameraStatus.value = 'Models not loaded'
          return
        }
        
        cameraStatus.value = 'Starting...'
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        })
        
        videoEl.value.srcObject = stream
        await videoEl.value.play()
        
        // Wait a bit for video to stabilize
        await new Promise(resolve => setTimeout(resolve, 500))
        
        isCameraActive.value = true
        cameraStatus.value = 'Active'
        
        // Start the unified processing loop
        processFrame()
      } catch (error) {
        console.error('Error starting camera:', error)
        cameraStatus.value = 'Error: ' + error.message
      }
    }
    
    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
      }
      
      if (videoEl.value) {
        videoEl.value.srcObject = null
      }
      
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      
      isCameraActive.value = false
      cameraStatus.value = 'Stopped'
    }
    
    const resetFocusTracking = () => {
      if (focusCalculator) {
        focusCalculator.reset()
        focusScore.value = 1.0
        lookAwayCount.value = 0
        blinkCount.value = 0
        blinkRate.value = 0
        focusStatus.value = 'focused'
        
        // Reset head pose
        Object.assign(headPose, {
          yaw: 0,
          pitch: 0,
          gazeX: 0,
          ear: 1.0,
          isLookingAway: false
        })
      }
    }
    
    const testWasmFiles = async () => {
      const wasmFiles = [
        './wasm/vision_wasm_internal.wasm',
        './wasm/vision_wasm_internal.js',
        './wasm/vision_wasm_nosimd_internal.wasm',
        './wasm/vision_wasm_nosimd_internal.js'
      ]
      
      console.log('Testing WASM file accessibility...')
      for (const file of wasmFiles) {
        try {
          const response = await fetch(file)
          if (response.ok) {
            console.log(`✅ ${file} - OK (${response.headers.get('content-length')} bytes)`)
          } else {
            console.error(`❌ ${file} - HTTP ${response.status}`)
            throw new Error(`WASM file not accessible: ${file}`)
          }
        } catch (error) {
          console.error(`❌ ${file} - Error:`, error)
          throw new Error(`WASM file error: ${file} - ${error.message}`)
        }
      }
      console.log('All WASM files are accessible')
    }
    
    const loadModels = async () => {
      try {
        modelStatus.value = 'Loading...'
        console.log('Starting unified model loading...')
        
        // Test WASM files first
        await testWasmFiles()
        
        // Dynamically import MediaPipe Tasks Vision
        console.log('Importing MediaPipe Tasks Vision...')
        const { FilesetResolver, GestureRecognizer, FaceLandmarker } = await import('@mediapipe/tasks-vision')
        console.log('MediaPipe imported successfully')
        
        // Initialize the FilesetResolver (shared for both models)
        console.log('Initializing FilesetResolver...')
        const visionMedia = await FilesetResolver.forVisionTasks('./wasm')
        console.log('FilesetResolver initialized successfully')
        
        // Load the gesture recognition model
        console.log('Loading gesture model...')
        const gestureModelUrl = './models/gesture_recognizer.task'
        
        try {
          const response = await fetch(gestureModelUrl)
          if (!response.ok) {
            throw new Error(`Gesture model not accessible: HTTP ${response.status}`)
          }
          console.log('Gesture model file is accessible, size:', response.headers.get('content-length'), 'bytes')
        } catch (fetchError) {
          console.error('Gesture model fetch error:', fetchError)
          throw new Error(`Cannot access gesture model: ${fetchError.message}`)
        }
        
        gestureRecognizer = await GestureRecognizer.createFromOptions(visionMedia, {
          baseOptions: {
            modelAssetPath: gestureModelUrl
          },
          runningMode: 'VIDEO',
          numHands: 2
        })
        console.log('Gesture recognizer created successfully')
        
        // Load the face landmarker model
        console.log('Loading face landmarker model...')
        const faceModelUrl = './models/face_landmarker.task'
        
        try {
          const response = await fetch(faceModelUrl)
          if (!response.ok) {
            throw new Error(`Face model not accessible: HTTP ${response.status}`)
          }
          console.log('Face model file is accessible, size:', response.headers.get('content-length'), 'bytes')
        } catch (fetchError) {
          console.error('Face model fetch error:', fetchError)
          throw new Error(`Cannot access face model: ${fetchError.message}`)
        }
        
        faceLandmarker = await FaceLandmarker.createFromOptions(visionMedia, {
          baseOptions: {
            modelAssetPath: faceModelUrl
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          refineLandmarks: true,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        })
        console.log('Face landmarker created successfully')
        
        // Initialize focus calculator
        focusCalculator = new FocusScoreCalculator()
        console.log('Focus calculator initialized')
        
        modelStatus.value = 'Both models loaded'
        console.log('All models loaded successfully')
      } catch (error) {
        console.error('Error loading models:', error)
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        modelStatus.value = 'Error: ' + (error.message || 'Unknown error')
      }
    }
    
    const processFrame = () => {
      if (!gestureRecognizer || !faceLandmarker || !videoEl.value || !isCameraActive.value) {
        animationId = requestAnimationFrame(processFrame)
        return
      }
      
      // Check if video is ready
      if (!videoEl.value.videoWidth || !videoEl.value.videoHeight) {
        animationId = requestAnimationFrame(processFrame)
        return
      }
      
      const now = performance.now()
      const deltaTime = now - lastFrameTime
      
      if (deltaTime >= 33) { // ~30 FPS to reduce load
        try {
          const timestamp = Math.floor(performance.now())
          
          // Process gestures with error handling
          let gestureResults = null
          try {
            gestureResults = gestureRecognizer.recognizeForVideo(videoEl.value, timestamp)
          } catch (gestureError) {
            console.warn('Gesture recognition error:', gestureError)
          }
          
          // Process face landmarks with error handling
          let faceResults = null
          try {
            faceResults = faceLandmarker.detectForVideo(videoEl.value, timestamp)
          } catch (faceError) {
            console.warn('Face detection error:', faceError)
          }
          
          // Update FPS
          fps.value = Math.round(1000 / deltaTime)
          
          // Handle gesture results with stability filtering
          let detectedName = 'None'
          let detectedScore = 0
          if (gestureResults && gestureResults.gestures && gestureResults.gestures.length > 0) {
            const gesture = gestureResults.gestures[0][0]
            detectedName = gesture.categoryName
            detectedScore = gesture.score || 0
            gestureConfidence.value = Math.round(detectedScore * 100)
            
            // Add to history (only significant gestures with confidence > 70%)
            if (detectedScore > minConfidence) {
              gestureHistory.value.unshift({
                name: detectedName,
                confidence: detectedScore,
                timestamp: new Date().toLocaleTimeString()
              })
              if (gestureHistory.value.length > 10) {
                gestureHistory.value = gestureHistory.value.slice(0, 10)
              }
            }
          } else {
            gestureConfidence.value = 0
          }
          
          // Apply confidence threshold
          if (detectedScore < minConfidence) {
            detectedName = 'None'
          }
          
          // Update pending/stable gesture state
          if (detectedName !== pendingGestureName) {
            pendingGestureName = detectedName
            gestureChangeStartedAt = now
          } else {
            const elapsed = now - gestureChangeStartedAt
            const threshold = detectedName === 'None' ? noneStableMs : gestureStableMs
            if (elapsed >= threshold && stableGestureName !== detectedName) {
              // Debounce emits so we don't spam rapid flips
              stableGestureName = detectedName
              currentGesture.value = stableGestureName
              if (now - lastGestureEmitAt >= 200) {
                emit('gesture', stableGestureName)
                lastGestureEmitAt = now
              }
            }
          }
          
          // Always reflect the last stable gesture in UI
          currentGesture.value = stableGestureName
          
          // Handle face results
          if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
            const landmarks = faceResults.faceLandmarks[0]
            
            // Calculate focus score using our existing calculator
            const focusResult = focusCalculator.calculateFocusScore(landmarks)
            
            // Update reactive state
            focusScore.value = focusResult.score
            focusStatus.value = focusCalculator.getFocusStatus()
            lookAwayCount.value = focusResult.metrics.lookAwayCount
            blinkCount.value = focusResult.metrics.blinkCount
            blinkRate.value = Math.round(focusResult.metrics.blinkRate)
            
            // Update head pose metrics
            Object.assign(headPose, {
              yaw: focusResult.metrics.yaw,
              pitch: focusResult.metrics.pitch,
              gazeX: focusResult.metrics.gazeX,
              ear: focusResult.metrics.ear,
              isLookingAway: focusResult.metrics.isLookingAway
            })

            // Emit focus update to parent (App.vue)
            emit('focus-update', { score: focusScore.value, status: focusStatus.value })
            
            // Emit cognitive load data
            if (focusResult.cognitiveLoad) {
              emit('cognitive-update', focusResult.cognitiveLoad)
            }
          }
          
          // Draw overlays on canvas
          drawOverlays(gestureResults, faceResults)
          
          lastFrameTime = now
        } catch (error) {
          console.error('Error processing frame:', error)
        }
      }
      
      animationId = requestAnimationFrame(processFrame)
    }
    
    const drawOverlays = (gestureResults, faceResults) => {
      if (!canvasEl.value) return
      
      const canvas = canvasEl.value
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw hand landmarks if available
      if (gestureResults && gestureResults.landmarks && gestureResults.landmarks.length > 0) {
        const handLandmarks = gestureResults.landmarks[0]
        
        ctx.strokeStyle = '#00FF00'
        ctx.lineWidth = 2
        ctx.fillStyle = '#FF0000'
        
        // Draw hand landmarks
        handLandmarks.forEach(landmark => {
          ctx.beginPath()
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI)
          ctx.fill()
        })
        
        // Draw hand connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // index finger
          [0, 9], [9, 10], [10, 11], [11, 12], // middle finger
          [0, 13], [13, 14], [14, 15], [15, 16], // ring finger
          [0, 17], [17, 18], [18, 19], [19, 20], // pinky
          [5, 9], [9, 13], [13, 17] // palm connections
        ]
        
        connections.forEach(([start, end]) => {
          if (handLandmarks[start] && handLandmarks[end]) {
            ctx.beginPath()
            ctx.moveTo(handLandmarks[start].x * canvas.width, handLandmarks[start].y * canvas.height)
            ctx.lineTo(handLandmarks[end].x * canvas.width, handLandmarks[end].y * canvas.height)
            ctx.stroke()
          }
        })
      }
      
      // Draw key face landmarks if available
      if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
        const faceLandmarks = faceResults.faceLandmarks[0]
        
        ctx.strokeStyle = '#0080FF'
        ctx.lineWidth = 1
        ctx.fillStyle = '#0080FF'
        
        // Draw key points: eyes, nose, mouth
        const keyPoints = [1, 33, 133, 362, 263, 13, 14, 78, 308] // nose tip, eye corners, mouth corners
        
        keyPoints.forEach(index => {
          if (faceLandmarks[index]) {
            const landmark = faceLandmarks[index]
            ctx.beginPath()
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 2, 0, 2 * Math.PI)
            ctx.fill()
          }
        })
      }
      
      // Draw status text
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.font = '16px Arial'
      
      const statusText = `Focus: ${(focusScore.value * 100).toFixed(2)}% | ${currentGesture.value} (${gestureConfidence.value}%)`
      
      // Draw text with outline
      ctx.strokeText(statusText, 10, 30)
      ctx.fillText(statusText, 10, 30)
    }
    
    onMounted(async () => {
      await loadModels()
    })
    
    onUnmounted(() => {
      stopCamera()
      if (gestureRecognizer) {
        gestureRecognizer.close()
      }
      if (faceLandmarker) {
        faceLandmarker.close()
      }
    })
    
    return {
      // Refs
      videoEl,
      canvasEl,
      
      // System state
      isCameraActive,
      cameraStatus,
      modelStatus,
      fps,
      
      // Gesture state
      currentGesture,
      gestureConfidence,
      gestureHistory,
      
      // Focus state
      focusScore,
      focusStatus,
      lookAwayCount,
      blinkCount,
      blinkRate,
      headPose,
      
      // Methods
      startCamera,
      stopCamera,
      resetFocusTracking
    }
  }
}
</script>

<style scoped>
.unified-vision-tracker {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.video-container {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

video {
  display: block;
  border: 2px solid #333;
  border-radius: 8px;
}

.overlay-canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.controls {
  margin-bottom: 20px;
}

.controls button {
  margin-right: 10px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.controls button:hover:not(:disabled) {
  background-color: #0056b3;
}



@media (max-width: 768px) {
  /* Responsive styles can be added here if needed */
}
</style>
