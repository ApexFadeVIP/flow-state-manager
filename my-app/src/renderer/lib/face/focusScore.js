import { FACE_LANDMARKS, calculateDistance } from './faceMesh.js'

/**
 * Configuration constants for focus score calculation
 */
export const FOCUS_CONFIG = {

  // Smoothing factors for exponential moving averages
  EMA_ALPHA_POSE: 0.1,      // For yaw/pitch/gaze
  EMA_ALPHA_SCORE: 0.05,     // For final score
  
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

  
  // Score Weights + Penalties
  GAZE_WEIGHT: 0.25, // How much gaze direction affects the focus score
  YAW_WEIGHT: 0.4, // How much head yaw affects the focus score
  PITCH_WEIGHT: 0.15, // How much head pitch affects the focus score
  LOOK_AWAY_PENALTY: 0.05,
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

    // 5. Calculate the raw score before smoothing
    let currentScore = 1.0 - (
      
      this.config.GAZE_WEIGHT * penGaze + 
      this.config.YAW_WEIGHT * penYaw +
      this.config.PITCH_WEIGHT * penPitch +
      penBlink 
    )
    
    // 6. Apply final smoothing and recovery logic to the score
    if (!isLookingAway) {
      // If focused, allow gradual recovery
      currentScore = Math.max(currentScore, this.scoreEMA + this.config.RECOVERY_RATE)
    }
    
    this.scoreEMA = this.config.EMA_ALPHA_SCORE * this.clamp01(currentScore) + 
                    (1 - this.config.EMA_ALPHA_SCORE) * this.scoreEMA
    this.scoreEMA = this.clamp01(this.scoreEMA)

    // 7. Return the complete, structured result object
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
      }
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