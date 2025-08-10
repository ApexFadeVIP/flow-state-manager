<template>
  <div class="gesture-recognition">
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
    </div>
    
    <div class="status">
      <p>Camera Status: {{ cameraStatus }}</p>
      <p>Model Status: {{ modelStatus }}</p>
      <p>Current Gesture: {{ currentGesture }}</p>
      <p>FPS: {{ fps }}</p>
    </div>
    
    <div class="gesture-history">
      <h3>Recent Gestures:</h3>
      <ul>
        <li v-for="(gesture, index) in gestureHistory" :key="index">
          {{ gesture.name }} ({{ gesture.confidence.toFixed(2) }}) - {{ gesture.timestamp }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'GestureRecognition',
  setup() {
    const videoEl = ref(null)
    const canvasEl = ref(null)
    const isCameraActive = ref(false)
    const cameraStatus = ref('Not started')
    const modelStatus = ref('Not loaded')
    const currentGesture = ref('None')
    const fps = ref(0)
    const gestureHistory = ref([])
    
    let stream = null
    let recognizer = null
    let animationId = null
    let lastFrameTime = 0
    
    const startCamera = async () => {
      try {
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
        
        isCameraActive.value = true
        cameraStatus.value = 'Active'
        
        // Start the inference loop
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
    
    const testWasmFiles = async () => {
      const wasmFiles = [
        '/wasm/vision_wasm_internal.wasm',
        '/wasm/vision_wasm_internal.js',
        '/wasm/vision_wasm_nosimd_internal.wasm',
        '/wasm/vision_wasm_nosimd_internal.js'
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
    
    const loadModel = async () => {
      try {
        modelStatus.value = 'Loading...'
        console.log('Starting model loading...')
        
        // Test WASM files first
        await testWasmFiles()
        
        // Dynamically import MediaPipe to avoid issues
        console.log('Importing MediaPipe...')
        const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision')
        console.log('MediaPipe imported successfully')
        
        // Initialize the FilesetResolver
        console.log('Initializing FilesetResolver...')
        const visionMedia = await FilesetResolver.forVisionTasks('/wasm')
        console.log('FilesetResolver initialized successfully')
        
        // Load the gesture model
        console.log('Loading gesture model...')
        const gestureModelUrl = '/models/gesture_recognizer.task'
        console.log('Model URL:', gestureModelUrl)
        
        // Test if the model file is accessible
        try {
          const response = await fetch(gestureModelUrl)
          if (!response.ok) {
            throw new Error(`Model file not accessible: HTTP ${response.status}`)
          }
          console.log('Model file is accessible, size:', response.headers.get('content-length'), 'bytes')
        } catch (fetchError) {
          console.error('Model file fetch error:', fetchError)
          throw new Error(`Cannot access model file: ${fetchError.message}`)
        }
        
        recognizer = await GestureRecognizer.createFromModelPath(visionMedia, gestureModelUrl)
        console.log('Gesture recognizer created successfully')
        
        modelStatus.value = 'Loaded'
        console.log('Gesture recognizer loaded successfully')
      } catch (error) {
        console.error('Error loading model:', error)
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
        modelStatus.value = 'Error: ' + (error.message || 'Unknown error')
      }
    }
    
    const processFrame = () => {
      if (!recognizer || !videoEl.value || !isCameraActive.value) {
        return
      }
      
      const now = performance.now()
      const deltaTime = now - lastFrameTime
      
      if (deltaTime >= 16) { // ~60 FPS
        try {
          const results = recognizer.recognize(videoEl.value)
          
          // Update FPS
          fps.value = Math.round(1000 / deltaTime)
          
          // Handle gesture results
          if (results.gestures && results.gestures.length > 0) {
            const gesture = results.gestures[0][0]
            currentGesture.value = `${gesture.categoryName} (${(gesture.score * 100).toFixed(1)}%)`
            
            // Add to history
            gestureHistory.value.unshift({
              name: gesture.categoryName,
              confidence: gesture.score,
              timestamp: new Date().toLocaleTimeString()
            })
            
            // Keep only last 10 gestures
            if (gestureHistory.value.length > 10) {
              gestureHistory.value = gestureHistory.value.slice(0, 10)
            }
            
            // Emit gesture event for parent components
            // this.$emit('gesture-detected', gesture)
          } else {
            currentGesture.value = 'None'
          }
          
          // Draw landmarks if available
          if (results.landmarks && canvasEl.value) {
            drawLandmarks(results.landmarks, canvasEl.value)
          }
          
          lastFrameTime = now
        } catch (error) {
          console.error('Error processing frame:', error)
        }
      }
      
      animationId = requestAnimationFrame(processFrame)
    }
    
    const drawLandmarks = (landmarks, canvas) => {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      if (landmarks && landmarks.length > 0) {
        const handLandmarks = landmarks[0]
        
        ctx.strokeStyle = '#00FF00'
        ctx.lineWidth = 2
        ctx.fillStyle = '#FF0000'
        
        // Draw landmarks
        handLandmarks.forEach(landmark => {
          ctx.beginPath()
          ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI)
          ctx.fill()
        })
        
        // Draw connections (simplified hand skeleton)
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
    }
    
    onMounted(async () => {
      await loadModel()
    })
    
    onUnmounted(() => {
      stopCamera()
      if (recognizer) {
        recognizer.close()
      }
    })
    
    return {
      videoEl,
      canvasEl,
      isCameraActive,
      cameraStatus,
      modelStatus,
      currentGesture,
      fps,
      gestureHistory,
      startCamera,
      stopCamera
    }
  }
}
</script>

<style scoped>
.gesture-recognition {
  max-width: 800px;
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

.status {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.status p {
  margin: 5px 0;
  font-family: monospace;
}

.gesture-history {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
}

.gesture-history h3 {
  margin-top: 0;
}

.gesture-history ul {
  list-style: none;
  padding: 0;
}

.gesture-history li {
  padding: 5px 0;
  border-bottom: 1px solid #dee2e6;
}

.gesture-history li:last-child {
  border-bottom: none;
}
</style> 