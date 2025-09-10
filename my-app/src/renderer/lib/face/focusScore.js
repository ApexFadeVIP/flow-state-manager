import { FACE_LANDMARKS, calculateDistance } from './faceMesh.js'

/**
 * Configuration constants for focus score calculation
 */
export const FOCUS_CONFIG = {

  // --- NEW: Score Weights & Penalties ---
  GAZE_EFFECT: 0.5,         // How much gaze direction affects the focus score
  YAW_EFFECT: 0.3,          // How much head yaw affects the focus score
  PITCH_EFFECT: 0.2,        // How much head pitch affects the focus score

  // Smoothing factors for exponential moving averages
  EMA_ALPHA_POSE: 0.1,      // For yaw/pitch/gaze
  EMA_ALPHA_SCORE: 0.05,     // For final score

  // --- NEW: Score Smoothing & Recovery ---
  EMA_SMOOTHING_SCORE: 0.05,    // How quickly the score updates (lower is smoother)
  RECOVERY_SMOOTHING_RATE: 0.005,     // How quickly the score recovers when focused (per frame)
  
  // Threshold tuning constants
  K_YAW: 2.5,               // Yaw sensitivity multiplier
  K_PITCH: 2.0,             // Pitch sensitivity multiplier
  
  // Detection thresholds
  BLINK_EAR_THRESHOLD: 0.20,
  BLINK_CONSECUTIVE_FRAMES: 1,
  MOUTH_MAR_THRESHOLD: 0.6,
  MOUTH_CONSECUTIVE_FRAMES: 10,
  LOOK_AWAY_FRAMES: 15,
  
  // Look-away thresholds
  YAW_THRESHOLD: 0.1,
  PITCH_THRESHOLD: 0.1,
  GAZE_THRESHOLD: 0.1,

  
  // Score penalties
  GAZE_WEIGHT: 0.45,
  YAW_WEIGHT: 0.35,
  PITCH_WEIGHT: 0.15,
  BLINK_PENALTY: 0.05,
  MOUTH_PENALTY: 0.1,
  LOOK_AWAY_PENALTY: 0.1,
  RECOVERY_RATE: 0.01
}

/**
 * Focus score calculator class
 */
export class FocusScoreCalculator {
  constructor(config = FOCUS_CONFIG) {
    this.config = config
    this.reset()
  }

  reset() {
    // Exponential moving averages
    this.yawEMA = 0
    this.pitchEMA = 0
    this.gazeXEMA = 0
    this.scoreEMA = 1.0
    
    // Event counters
    this.blinkCount = 0
    this.lookAwayCount = 0
    this.blinkRate = 0
    
    // State tracking
    this.consecutiveBlinkFrames = 0
    this.consecutiveMouthFrames = 0
    this.consecutiveLookAwayFrames = 0
    this.isInLookAwayState = false
    this.recentBlink = false
    this.recentMouthOpen = false
    
    // Timestamp tracking
    this.lastBlinkTime = 0
    this.frameCount = 0
    this.startTime = Date.now()
    
    // Advanced focus analysis tracking
    this.analysisHistory = [] // {ts, yaw, pitch, gazeX, ear, mar, score}
    this.blinkTimestamps = []
    this.lookAwayTimeline = [] // {start, end, maxDev, area}
    this.sessionStartTime = Date.now()
    this.lastAnalysisUpdate = 0
    this.distractionEvents = [] // {type, start, end, severity}
    this.flowStreakStart = null
    this.baselineMetrics = null // first 5 minutes baseline
    
    // Session data for reporting
    this.sessionData = {
      startTime: Date.now(),
      cognitiveLoadSamples: [],
      peakStressPoints: [],
      lowFocusPeriods: [],
      breakSuggestions: [],
      overallMetrics: {}
    }
  }

  /**
   * Calculate head pose (yaw and pitch) from face landmarks
   */
  calculateHeadPose(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return { yaw: 0, pitch: 0 }
    }

    const noseTip = landmarks[FACE_LANDMARKS.NOSE_TIP]
    const leftEar = landmarks[FACE_LANDMARKS.LEFT_EAR_TRAGION]
    const rightEar = landmarks[FACE_LANDMARKS.RIGHT_EAR_TRAGION]
    const chin = landmarks[FACE_LANDMARKS.CHIN]
    const forehead = landmarks[FACE_LANDMARKS.FOREHEAD]

    if (!noseTip || !leftEar || !rightEar || !chin || !forehead) {
      return { yaw: 0, pitch: 0 }
    }

    // Yaw: horizontal offset of nose vs mid-ears
    const midEarsX = (leftEar.x + rightEar.x) / 2
    const yaw = (noseTip.x - midEarsX) * this.config.K_YAW

    // Pitch: vertical offset of nose vs mid of chin/forehead
    const midVerticalY = (chin.y + forehead.y) / 2
    const pitch = (noseTip.y - midVerticalY) * this.config.K_PITCH

    return { yaw: Math.max(-1, Math.min(1, yaw)), pitch: Math.max(-1, Math.min(1, pitch)) }
  }

  /**
   * Calculate gaze direction using iris tracking
   */
  calculateGaze(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return { gazeX: 0 }
    }

    const leftIris = landmarks[FACE_LANDMARKS.LEFT_IRIS_CENTER]
    const rightIris = landmarks[FACE_LANDMARKS.RIGHT_IRIS_CENTER]
    const leftInner = landmarks[FACE_LANDMARKS.LEFT_EYE.INNER_CORNER]
    const leftOuter = landmarks[FACE_LANDMARKS.LEFT_EYE.OUTER_CORNER]
    const rightInner = landmarks[FACE_LANDMARKS.RIGHT_EYE.INNER_CORNER]
    const rightOuter = landmarks[FACE_LANDMARKS.RIGHT_EYE.OUTER_CORNER]

    if (!leftIris || !rightIris || !leftInner || !leftOuter || !rightInner || !rightOuter) {
      return { gazeX: 0 }
    }

    // Calculate gaze for left eye
    const leftEyeWidth = Math.abs(leftOuter.x - leftInner.x)
    const leftGazeX = leftEyeWidth > 0 ? 
      2 * (leftIris.x - leftInner.x) / leftEyeWidth - 1 : 0

    // Calculate gaze for right eye (mirror for selfie mode)
    const rightEyeWidth = Math.abs(rightOuter.x - rightInner.x)
    const rightGazeX = rightEyeWidth > 0 ? 
      2 * (rightIris.x - rightInner.x) / rightEyeWidth - 1 : 0

    // Average both eyes
    const gazeX = (leftGazeX + rightGazeX) / 2

    return { gazeX: Math.max(-1, Math.min(1, -gazeX)) } // Mirror for selfie mode
  }

  /**
   * Calculate Eye Aspect Ratio (EAR) for blink detection
   */
  calculateEAR(landmarks, eyeLandmarks) {
    if (!landmarks || landmarks.length === 0) {
      return 1.0
    }

    const p1 = landmarks[eyeLandmarks.OUTER_CORNER]
    const p2 = landmarks[eyeLandmarks.CENTER_TOP]
    const p3 = landmarks[eyeLandmarks.CENTER_BOTTOM]
    const p4 = landmarks[eyeLandmarks.INNER_CORNER]
    const p5 = landmarks[eyeLandmarks.TOP_LID]
    const p6 = landmarks[eyeLandmarks.BOTTOM_LID]

    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
      return 1.0
    }

    // EAR = (||p2-p6|| + ||p3-p5||) / (2||p1-p4||)
    const vertical1 = calculateDistance(p2, p6)
    const vertical2 = calculateDistance(p3, p5)
    const horizontal = calculateDistance(p1, p4)

    if (horizontal === 0) return 1.0

    return (vertical1 + vertical2) / (2 * horizontal)
  }

  /**
   * Calculate Mouth Aspect Ratio (MAR) for speaking detection
   */
  calculateMAR(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return 0
    }

    const upperLip = landmarks[FACE_LANDMARKS.MOUTH.UPPER_INNER]
    const lowerLip = landmarks[FACE_LANDMARKS.MOUTH.LOWER_INNER]
    const leftCorner = landmarks[FACE_LANDMARKS.MOUTH.LEFT_CORNER]
    const rightCorner = landmarks[FACE_LANDMARKS.MOUTH.RIGHT_CORNER]

    if (!upperLip || !lowerLip || !leftCorner || !rightCorner) {
      return 0
    }

    const mouthHeight = calculateDistance(upperLip, lowerLip)
    const mouthWidth = calculateDistance(leftCorner, rightCorner)

    if (mouthWidth === 0) return 0

    return mouthHeight / mouthWidth
  }

  /**
   * Update exponential moving averages
   */
  updateEMAs(yaw, pitch, gazeX) {
    this.yawEMA = this.config.EMA_ALPHA_POSE * yaw + (1 - this.config.EMA_ALPHA_POSE) * this.yawEMA
    this.pitchEMA = this.config.EMA_ALPHA_POSE * pitch + (1 - this.config.EMA_ALPHA_POSE) * this.pitchEMA
    this.gazeXEMA = this.config.EMA_ALPHA_POSE * gazeX + (1 - this.config.EMA_ALPHA_POSE) * this.gazeXEMA
  }

  /**
   * Detect and count blinks
   */
  detectBlinks(landmarks) {
    const leftEAR = this.calculateEAR(landmarks, FACE_LANDMARKS.LEFT_EYE)
    const rightEAR = this.calculateEAR(landmarks, FACE_LANDMARKS.RIGHT_EYE)
    const avgEAR = (leftEAR + rightEAR) / 2

    // Update blink rate (blinks per minute) on every frame instead of only when a blink is detected
        const elapsedMinutes = (Date.now() - this.startTime) / 60000
        this.blinkRate = elapsedMinutes > 0 ? this.blinkCount / elapsedMinutes : 0

    if (avgEAR < this.config.BLINK_EAR_THRESHOLD) {
      this.consecutiveBlinkFrames++
      if (this.consecutiveBlinkFrames >= this.config.BLINK_CONSECUTIVE_FRAMES && !this.recentBlink) {
        this.blinkCount++
        this.recentBlink = true
        this.lastBlinkTime = Date.now()
      }
    } else {
      this.consecutiveBlinkFrames = 0
      this.recentBlink = false
    }

    return avgEAR
  }

  /**
   * Detect mouth opening (speaking)
   */
  detectMouthOpening(landmarks) {
    const mar = this.calculateMAR(landmarks)

    if (mar > this.config.MOUTH_MAR_THRESHOLD) {
      this.consecutiveMouthFrames++
      if (this.consecutiveMouthFrames >= this.config.MOUTH_CONSECUTIVE_FRAMES) {
        this.recentMouthOpen = true
      }
    } else {
      this.consecutiveMouthFrames = 0
      this.recentMouthOpen = false
    }

    return mar
  }

  /**
   * Detect look-away events
   */
    detectLookAway() {
    const isLookingAway = (
      Math.abs(this.yawEMA) > this.config.YAW_THRESHOLD ||
      Math.abs(this.pitchEMA) > this.config.PITCH_THRESHOLD
    
    )
    console.log('isLookingAway', isLookingAway, 'yaw:', this.yawEMA, 'gazeX:', this.gazeXEMA, 'pitch:', this.pitchEMA)
    console.log('isLookingAway', isLookingAway)

    if (isLookingAway) {
      this.consecutiveLookAwayFrames++
      if ((this.consecutiveLookAwayFrames >= this.config.LOOK_AWAY_FRAMES) && !this.isInLookAwayState) {
        this.lookAwayCount++
        this.isInLookAwayState = true
        console.log('Look away detected! Count:', this.lookAwayCount)
        // Apply immediate penalty to score
        this.scoreEMA = Math.max(0, this.scoreEMA - this.config.LOOK_AWAY_PENALTY)
      }
    } else {
      // Use hysteresis for recovery
      const isRecovered = (
        Math.abs(this.yawEMA) < this.config.YAW_THRESHOLD &&
        Math.abs(this.pitchEMA) < this.config.PITCH_THRESHOLD
      )

      console.log('Recovery check:', { 
      isRecovered, 
      yaw: Math.abs(this.yawEMA), 
      gaze: Math.abs(this.gazeXEMA), 
      pitch: Math.abs(this.pitchEMA),
      isInLookAwayState: this.isInLookAwayState
    })

      if (isRecovered && this.isInLookAwayState) {
        this.consecutiveLookAwayFrames = 0
        this.isInLookAwayState = false // Move this line here
      }
    }

    return this.isInLookAwayState
  }


  /**
   * Utility function to clamp values between 0 and 1
   */
  clamp01(value) {
    return Math.max(0, Math.min(1, value))
  }

  /**
   * Calculate the main focus score
   */
  calculateFocusScore(landmarks) {
    this.frameCount++

    // 1. Calculate all raw metrics from landmarks
    const { yaw, pitch } = this.calculateHeadPose(landmarks)
    const { gazeX } = this.calculateGaze(landmarks)
    const ear = this.detectBlinks(landmarks)
    const mar = this.detectMouthOpening(landmarks)

    // 2. Update smoothed Exponential Moving Averages (EMAs)
    this.updateEMAs(yaw, pitch, gazeX)

    // 3. Detect look-away state based on smoothed values
    const isLookingAway = this.detectLookAway()

    // 4. Calculate penalties based on smoothed values and events
    const penYaw = Math.abs(this.yawEMA)
    const penPitch = Math.abs(this.pitchEMA)
    const penGaze = Math.abs(this.gazeXEMA)
    const penBlink = this.recentBlink ? this.config.BLINK_PENALTY : 0
    const penMouth = this.recentMouthOpen ? this.config.MOUTH_PENALTY : 0
    console.log('penalties', { penYaw, penPitch, penGaze, penBlink, penMouth })

    // 5. Calculate the raw score before smoothing
    let currentScore = 1.0 - (
      this.config.GAZE_WEIGHT * penGaze + 
      this.config.YAW_WEIGHT * penYaw +
      this.config.PITCH_WEIGHT * penPitch +
      penBlink +
      penMouth
    )
    
    // 6. Apply final smoothing and recovery logic to the score
    if (!isLookingAway) {
      // If focused, allow gradual recovery
      currentScore = Math.max(currentScore, this.scoreEMA + this.config.RECOVERY_RATE)
    }
    
    this.scoreEMA = this.config.EMA_ALPHA_SCORE * this.clamp01(currentScore) + 
                    (1 - this.config.EMA_ALPHA_SCORE) * this.scoreEMA
    this.scoreEMA = this.clamp01(this.scoreEMA)

    // 7. Calculate advanced focus analysis metrics
    const analysisMetrics = this.calculateAdvancedAnalysis(landmarks)

    // 8. Return the complete, structured result object
    return {
      score: this.scoreEMA,
      metrics: {
        yaw: this.yawEMA,
        pitch: this.pitchEMA,
        gazeX: this.gazeXEMA,
        ear,
        mar,
        blinkCount: this.blinkCount,
        lookAwayCount: this.lookAwayCount,
        blinkRate: this.blinkRate,
        isLookingAway,
        penalties: { penYaw, penPitch, penGaze, penBlink, penMouth }
      },
      analysis: analysisMetrics
    }
  
    }
  

  /**
   * Update analysis history with current frame data
   */
  updateAnalysisHistory(yaw, pitch, gazeX, ear, mar) {
    const now = Date.now()
    this.analysisHistory.push({
      ts: now,
      yaw: this.yawEMA,
      pitch: this.pitchEMA,
      gazeX: this.gazeXEMA,
      ear,
      mar,
      score: this.scoreEMA
    })
    
    // Keep 60 seconds of history
    while (this.analysisHistory.length > 0 && now - this.analysisHistory[0].ts > 60000) {
      this.analysisHistory.shift()
    }
    
    // Track blink timestamps
    if (this.recentBlink) {
      this.blinkTimestamps.push(now)
      // Keep only last 60 seconds of blinks
      this.blinkTimestamps = this.blinkTimestamps.filter(ts => now - ts <= 60000)
    }
  }

  /**
   * Calculate windowed analysis metrics
   */
  calculateWindowAnalysis(windowMs = 30000) {
    const now = Date.now()
    const window = this.analysisHistory.filter(h => now - h.ts <= windowMs)
    
    if (window.length < 5) {
      return {
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
    }

    // Utility functions
    const vals = key => window.map(h => h[key])
    const variance = arr => {
      const mean = arr.reduce((a,b) => a+b, 0) / arr.length
      return arr.reduce((sum, x) => sum + (x - mean) * (x - mean), 0) / arr.length
    }
    const diffs = arr => arr.slice(1).map((x, i) => x - arr[i])
    const clamp01 = v => Math.max(0, Math.min(1, v))
    const rms = arr => Math.sqrt(arr.reduce((sum, x) => sum + x*x, 0) / Math.max(1, arr.length))

    // Get variance and velocity data
    const yawVar = variance(vals('yaw'))
    const pitchVar = variance(vals('pitch'))
    const gazeVar = variance(vals('gazeX'))
    const yawVel = diffs(vals('yaw'))
    const pitchVel = diffs(vals('pitch'))
    const gazeVel = diffs(vals('gazeX'))

    // Focus Stability Index (FSI)
    const normVar = (v, scale = 0.04) => Math.min(1, v / scale)
    const stabilityIndex = clamp01(1 - (0.4 * normVar(gazeVar) + 0.3 * normVar(yawVar) + 0.3 * normVar(pitchVar)))

    // Saccade detection
    const saccadeThresh = 0.08
    const saccades = gazeVel.filter(v => Math.abs(v) > saccadeThresh).length
    const saccadesPerMin = saccades * (60000 / windowMs)

    // Fixation ratio
    const fixationStd = Math.sqrt(gazeVar)
    const fixationRatio = clamp01(1 - fixationStd / 0.1)

    // PERCLOS (percentage of eye closure)
    const perclos = window.filter(h => h.ear < this.config.BLINK_EAR_THRESHOLD).length / window.length

    // Drowsiness index
    const blinkRate = this.blinkRate // already per minute
    const drowsiness = clamp01(0.6 * perclos + 0.4 * Math.min(1, blinkRate / 30))

    // Speaking ratio
    const speakingRatio = window.filter(h => h.mar > this.config.MOUTH_MAR_THRESHOLD).length / window.length

    // Movement energy (RMS of velocities)
    const movementEnergy = Math.min(1, (rms(yawVel) + rms(pitchVel) + rms(gazeVel)) / 0.3)

    // Flow streak calculation
    let flowStreakSec = 0
    for (let i = window.length - 1; i >= 0; i--) {
      if (window[i].score > 0.7 && movementEnergy < 0.7) {
        flowStreakSec += (i === window.length - 1 ? 0 : (window[i + 1].ts - window[i].ts) / 1000)
      } else {
        break
      }
    }

    // Distraction classification
    const distractionType = this.classifyDistraction(window)

    return {
      stabilityIndex: Math.round(stabilityIndex * 100) / 100,
      fixationRatio: Math.round(fixationRatio * 100) / 100,
      saccadesPerMin: Math.round(saccadesPerMin),
      perclos: Math.round(perclos * 100) / 100,
      drowsiness: Math.round(drowsiness * 100) / 100,
      speakingRatio: Math.round(speakingRatio * 100) / 100,
      movementEnergy: Math.round(movementEnergy * 100) / 100,
      flowStreakSec: Math.round(flowStreakSec),
      distractionType
    }
  }

  /**
   * Classify type of distraction based on movement patterns
   */
  classifyDistraction(window) {
    if (window.length < 5) return 'none'
    
    const recent = window.slice(-10) // Last 10 samples
    const avgYaw = Math.abs(recent.reduce((sum, h) => sum + h.yaw, 0) / recent.length)
    const avgPitch = Math.abs(recent.reduce((sum, h) => sum + h.pitch, 0) / recent.length)
    const avgGaze = Math.abs(recent.reduce((sum, h) => sum + h.gazeX, 0) / recent.length)
    const avgMar = recent.reduce((sum, h) => sum + h.mar, 0) / recent.length

    const yawHigh = avgYaw > this.config.YAW_THRESHOLD
    const pitchHigh = avgPitch > this.config.PITCH_THRESHOLD
    const gazeHigh = avgGaze > this.config.GAZE_THRESHOLD
    const speaking = avgMar > this.config.MOUTH_MAR_THRESHOLD

    if (speaking) return 'speech'
    if ((yawHigh || pitchHigh) && gazeHigh) return 'combined'
    if (yawHigh || pitchHigh) return 'head'
    if (gazeHigh) return 'eye'
    return 'none'
  }

  /**
   * Calculate advanced focus analysis metrics
   */
  calculateAdvancedAnalysis(landmarks) {
    const now = Date.now()
    
    // Calculate basic metrics
    const leftEAR = this.calculateEAR(landmarks, FACE_LANDMARKS.LEFT_EYE)
    const rightEAR = this.calculateEAR(landmarks, FACE_LANDMARKS.RIGHT_EYE)
    const avgEAR = (leftEAR + rightEAR) / 2
    const mar = this.calculateMAR(landmarks)
    
    // Update history
    this.updateAnalysisHistory(this.yawEMA, this.pitchEMA, this.gazeXEMA, avgEAR, mar)
    
    // Calculate windowed metrics every second
    if (now - this.lastAnalysisUpdate >= 1000) {
      const analysis = this.calculateWindowAnalysis(30000)
      
      // Update baseline if within first 5 minutes
      if (!this.baselineMetrics && now - this.sessionStartTime <= 300000) {
        this.updateBaseline()
      }
      
      this.lastAnalysisUpdate = now
      return analysis
    }
    
    // Return previous analysis or defaults
    return this.calculateWindowAnalysis(30000)
  }

  /**
   * Update baseline metrics for first 5 minutes
   */
  updateBaseline() {
    if (this.analysisHistory.length < 50) return // Need sufficient data
    
    const baselineWindow = this.analysisHistory.slice(-50) // Last 50 samples
    this.baselineMetrics = {
      avgBlinkRate: this.blinkRate,
      avgYaw: baselineWindow.reduce((sum, h) => sum + Math.abs(h.yaw), 0) / baselineWindow.length,
      avgPitch: baselineWindow.reduce((sum, h) => sum + Math.abs(h.pitch), 0) / baselineWindow.length,
      avgGaze: baselineWindow.reduce((sum, h) => sum + Math.abs(h.gazeX), 0) / baselineWindow.length,
      avgScore: baselineWindow.reduce((sum, h) => sum + h.score, 0) / baselineWindow.length
    }
  }
  
  /**
   * Generate smart break suggestions based on focus analysis patterns
   */
  generateBreakSuggestions() {
    const suggestions = []
    const currentAnalysis = this.calculateWindowAnalysis(30000)
    
    if (currentAnalysis.drowsiness > 0.7) {
      suggestions.push({
        type: 'eye_rest',
        priority: 'high',
        title: '👁️ Drowsiness Alert',
        description: 'High drowsiness detected. Take a 5-minute break and look at distant objects',
        duration: '5 minutes'
      })
    }
    
    if (currentAnalysis.stabilityIndex < 0.3) {
      suggestions.push({
        type: 'focus_reset',
        priority: 'medium',
        title: '🎯 Focus Reset',
        description: 'Low stability detected. Take deep breaths and refocus on your task',
        duration: '2-3 minutes'
      })
    }
    
    if (currentAnalysis.movementEnergy > 0.8) {
      suggestions.push({
        type: 'active_break',
        priority: 'medium',
        title: '🚶 Movement Break',
        description: 'High restlessness detected. Take a short walk or do stretches',
        duration: '3-5 minutes'
      })
    }
    
    if (this.blinkRate < 10) {
      suggestions.push({
        type: 'blink_exercise',
        priority: 'low',
        title: '👀 Blink Exercise',
        description: 'Low blink rate. Consciously blink 20 times slowly to lubricate eyes',
        duration: '30 seconds'
      })
    }
    
    if (currentAnalysis.flowStreakSec > 1800) { // 30 minutes
      suggestions.push({
        type: 'maintenance_break',
        priority: 'low',
        title: '⏰ Maintenance Break',
        description: 'Great focus streak! Take a short break to maintain performance',
        duration: '2-3 minutes'
      })
    }
    
    return suggestions
  }
  
  /**
   * Get session report data with advanced focus analysis
   */
  getSessionReport() {
    const duration = Date.now() - this.sessionStartTime
    
    if (this.analysisHistory.length === 0) {
      return null
    }
    
    // Get recent samples for analysis
    const recentSamples = this.analysisHistory.slice(-50) // Last 50 samples
    
    // Calculate averages
    const avgStability = recentSamples.reduce((sum, s) => sum + s.score, 0) / recentSamples.length
    const avgScore = recentSamples.reduce((sum, s) => sum + s.score, 0) / recentSamples.length
    
    // Get current analysis
    const currentAnalysis = this.calculateWindowAnalysis(30000)
    
    // Find best and worst periods
    const maxScore = Math.max(...recentSamples.map(s => s.score))
    const minScore = Math.min(...recentSamples.map(s => s.score))
    
    // Generate insights
    const insights = []
    if (currentAnalysis.stabilityIndex > 0.7) {
      insights.push('Excellent focus stability maintained')
    }
    if (currentAnalysis.drowsiness > 0.6) {
      insights.push('High drowsiness detected - consider breaks')
    }
    if (currentAnalysis.flowStreakSec > 600) { // 10 minutes
      insights.push(`Great focus streak: ${Math.round(currentAnalysis.flowStreakSec/60)} minutes`)
    }
    if (avgScore > 0.7) {
      insights.push('Strong overall focus performance')
    }
    if (currentAnalysis.saccadesPerMin > 40) {
      insights.push('High eye movement - possible visual distraction')
    }
    
    // Calculate baseline z-scores if available
    let baselineComparison = null
    if (this.baselineMetrics) {
      const currentBlinkRateZ = (this.blinkRate - this.baselineMetrics.avgBlinkRate) / Math.max(1, this.baselineMetrics.avgBlinkRate * 0.3)
      const currentScoreZ = (avgScore - this.baselineMetrics.avgScore) / Math.max(0.1, this.baselineMetrics.avgScore * 0.2)
      
      baselineComparison = {
        blinkRateZ: Math.round(currentBlinkRateZ * 100) / 100,
        scoreZ: Math.round(currentScoreZ * 100) / 100
      }
    }
    
    return {
      duration,
      averages: {
        stabilityIndex: currentAnalysis.stabilityIndex,
        focusScore: Math.round(avgScore * 100) / 100,
        drowsiness: currentAnalysis.drowsiness,
        movementEnergy: currentAnalysis.movementEnergy
      },
      peaks: {
        maxScore,
        minScore,
        bestFlowStreak: currentAnalysis.flowStreakSec
      },
      events: {
        totalBlinks: this.blinkCount,
        totalLookAways: this.lookAwayCount,
        saccadesPerMin: currentAnalysis.saccadesPerMin,
        distractionType: currentAnalysis.distractionType
      },
      insights,
      baselineComparison,
      breakSuggestions: this.generateBreakSuggestions(),
      heatMapData: recentSamples.map((s, i) => ({
        time: i * 1000, // Approximate time
        value: s.score
      }))
    }
  }

  /**
   * Get current focus status
   */
  getFocusStatus() {
    if (this.scoreEMA < 0.3) return 'unfocused'
    if (this.scoreEMA < 0.6) return 'distracted'
    return 'focused'
  }
}