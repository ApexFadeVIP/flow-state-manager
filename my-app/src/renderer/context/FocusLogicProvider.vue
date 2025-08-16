<template>
  <slot />
</template>

<script>
import { ref, reactive, provide, onUnmounted } from 'vue'
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'

export default {
  name: 'FocusLogicProvider',
  setup(props, { slots }) {
    // --- Reactive state for the UI ---
    const isTracking = ref(false);
    const status = ref('inactive');
    const stats = reactive({
      yaw: 0,
      pitch: 0,
      gazeX: 0,
      gazeY: 0,
    });

    let camera = null;
    let faceMesh = null;

    // --- Logic from focusCalc.js ---
    const LEFT_EYE = [33, 133];
    const RIGHT_EYE = [362, 263];
    const LEFT_IRIS = [468, 469, 470, 471];
    const RIGHT_IRIS = [473, 474, 475, 476];

    function getIrisRatio(eyePoints, irisPoint) {
      const ratioX = (irisPoint.x - eyePoints[0].x) / (eyePoints[1].x - eyePoints[0].x);
      const ratioY = (irisPoint.y - eyePoints[0].y) / (eyePoints[1].y - eyePoints[0].y);
      return { x: ratioX, y: ratioY };
    }

    function getHeadPose(landmarks) {
      const noseTip = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];
      const chin = landmarks[152];
      const yaw = Math.atan2(rightEar.x - leftEar.x, rightEar.z - leftEar.z) * (180 / Math.PI);
      const pitch = Math.atan2(chin.y - noseTip.y, chin.z - noseTip.z) * (180 / Math.PI);
      return { yaw, pitch };
    }

    function onResults(results) {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        status.value = 'tracking';
        const landmarks = results.multiFaceLandmarks[0];
        
        const leftRatio = getIrisRatio([landmarks[LEFT_EYE[0]], landmarks[LEFT_EYE[1]]], landmarks[LEFT_IRIS[0]]);
        const rightRatio = getIrisRatio([landmarks[RIGHT_EYE[0]], landmarks[RIGHT_EYE[1]]], landmarks[RIGHT_IRIS[0]]);
        
        // Update reactive stats
        stats.gazeX = (leftRatio.x + rightRatio.x) / 2;
        stats.gazeY = (leftRatio.y + rightRatio.y) / 2;
        
        const { yaw, pitch } = getHeadPose(landmarks);
        stats.yaw = yaw;
        stats.pitch = pitch;
      } else {
        status.value = 'no-face';
      }
    }

    // --- Control Methods ---
    const start = (videoElement) => {
      if (isTracking.value) return;
      console.log('Starting simple tracking...');
      status.value = 'initializing';

      faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMesh.onResults(onResults);

      camera = new Camera(videoElement, {
        onFrame: async () => {
          await faceMesh.send({ image: videoElement });
        },
        width: 640,
        height: 480
      });
      camera.start();
      isTracking.value = true;
    };

    const stop = () => {
      if (!isTracking.value) return;
      console.log('Stopping simple tracking...');
      camera.stop();
      faceMesh.close();
      isTracking.value = false;
      status.value = 'inactive';
    };

    onUnmounted(stop);

    // Provide the simplified context
    provide('focus', {
      isTracking,
      status,
      stats,
      start,
      stop
    });

    return () => slots.default(); // Render the children
  }
}
</script>