import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'

/**
 * Try to resolve a working base URL for FaceMesh assets
 */
async function resolveFaceMeshBaseUrl() {
  const candidates = [
    './mediapipe/face_mesh/',
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/'
  ]
  for (const base of candidates) {
    try {
      const testUrl = base + 'face_mesh_solution_wasm_bin.wasm'
      const res = await fetch(testUrl, { method: 'HEAD' })
      if (res.ok) {
        console.log(`[FaceMesh] Using assets from: ${base}`)
        return base
      } else {
        console.warn(`[FaceMesh] Probe failed (${res.status}) for: ${testUrl}`)
      }
    } catch (err) {
      console.warn('[FaceMesh] Probe error for base', base, err)
    }
  }
  // Fallback to CDN even if HEAD failed
  console.warn('[FaceMesh] Falling back to CDN base path')
  return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/'
}

/**
 * Initialize FaceMesh with optimal settings for focus tracking
 * @param {Function} onResults - Callback function to handle face mesh results
 * @returns {Promise<FaceMesh>} - Configured FaceMesh instance
 */
export async function initFaceMesh(onResults) {
  console.log('[FaceMesh] Initializing...')

  const baseUrl = await resolveFaceMeshBaseUrl()

  const faceMesh = new FaceMesh({
    locateFile: (file) => baseUrl + file
  })

  await faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true, // Required for iris tracking
    selfieMode: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
    modelComplexity: 1
  })

  let firstResultLogged = false
  faceMesh.onResults((results) => {
    if (!firstResultLogged) {
      console.log('[FaceMesh] onResults hooked, first callback fired')
      firstResultLogged = true
    }
    onResults(results)
  })

  console.log('[FaceMesh] Initialized')
  return faceMesh
}

/**
 * Attach camera to face mesh for real-time processing
 * @param {HTMLVideoElement} videoEl - Video element for camera feed
 * @param {FaceMesh} faceMesh - Configured FaceMesh instance
 * @param {Object} options - Camera configuration options
 * @returns {Camera} - Camera instance
 */
export function attachCamera(videoEl, faceMesh, options = {}) {
  const defaultOptions = {
    width: 640,
    height: 480,
    onFrame: async () => {
      if (videoEl.readyState >= 2) {
        await faceMesh.send({ image: videoEl })
      }
    }
  }

  const cameraOptions = { ...defaultOptions, ...options }
  
  const camera = new Camera(videoEl, cameraOptions)
  
  return camera
}

/**
 * Get camera stream and setup video element
 * @param {HTMLVideoElement} videoEl - Video element to setup
 * @param {Object} constraints - Media constraints
 * @returns {Promise<MediaStream>} - Camera stream
 */
export async function setupCamera(videoEl, constraints = {}) {
  const defaultConstraints = {
    video: {
      width: 640,
      height: 480,
      facingMode: 'user'
    }
  }

  const mediaConstraints = { ...defaultConstraints, ...constraints }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    videoEl.srcObject = stream
    
    return new Promise((resolve) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play()
        resolve(stream)
      }
    })
  } catch (error) {
    console.error('Error accessing camera:', error)
    throw error
  }
}

/**
 * Stop camera stream
 * @param {MediaStream} stream - Camera stream to stop
 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
}

/**
 * Face mesh landmark indices for different facial features
 */
export const FACE_LANDMARKS = {
  // Head pose estimation points
  NOSE_TIP: 1,
  LEFT_EAR_TRAGION: 234,
  RIGHT_EAR_TRAGION: 454,
  CHIN: 152,
  FOREHEAD: 10,
  
  // Eye landmarks for blink detection (left eye)
  LEFT_EYE: {
    OUTER_CORNER: 33,
    INNER_CORNER: 133,
    TOP_LID: 159,
    BOTTOM_LID: 145,
    CENTER_TOP: 153,
    CENTER_BOTTOM: 144
  },
  
  // Eye landmarks for blink detection (right eye)
  RIGHT_EYE: {
    OUTER_CORNER: 362,
    INNER_CORNER: 263,
    TOP_LID: 386,
    BOTTOM_LID: 374,
    CENTER_TOP: 380,
    CENTER_BOTTOM: 373
  },
  
  // Iris landmarks (requires refineLandmarks: true)
  LEFT_IRIS_CENTER: 468,
  RIGHT_IRIS_CENTER: 473,
  
  // Mouth landmarks for talking detection
  MOUTH: {
    UPPER_INNER: 13,
    LOWER_INNER: 14,
    LEFT_CORNER: 78,
    RIGHT_CORNER: 308
  }
}

/**
 * Utility function to calculate distance between two 3D points
 * @param {Object} point1 - First point with x, y, z coordinates
 * @param {Object} point2 - Second point with x, y, z coordinates
 * @returns {number} - Euclidean distance
 */
export function calculateDistance(point1, point2) {
  const dx = point1.x - point2.x
  const dy = point1.y - point2.y
  const dz = (point1.z || 0) - (point2.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Utility function to normalize coordinates
 * @param {Object} point - Point with x, y coordinates
 * @param {number} width - Frame width
 * @param {number} height - Frame height
 * @returns {Object} - Normalized point with x, y in [0, 1]
 */
export function normalizePoint(point, width, height) {
  return {
    x: point.x / width,
    y: point.y / height,
    z: point.z || 0
  }
} 