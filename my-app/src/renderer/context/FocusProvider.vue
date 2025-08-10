<template>
  <slot />
</template>

<script>
import { provide, computed } from 'vue'
import { useFaceFocus } from '../hooks/useFaceFocus.js'

export default {
  name: 'FocusProvider',
  setup(props, { slots }) {
    // Initialize the focus tracking hook
    const focusState = useFaceFocus()
    
    // Provide refs/computed directly to preserve reactivity
    const focusContext = {
      // Refs (auto-unwrapped in templates)
      score: focusState.focusScore,
      status: focusState.status,
      isActive: focusState.isActive,
      events: focusState.events,
      metrics: focusState.metrics,
      
      // Methods
      start: focusState.start,
      stop: focusState.stop,
      reset: focusState.reset,
      updateConfig: focusState.updateConfig,
      getSessionStats: focusState.getSessionStats,
      isSupported: focusState.isSupported,
      
      // Convenience getters
      isTracking: focusState.isActive,
      isFocused: computed(() => focusState.status.value === 'focused'),
      isDistracted: computed(() => ['distracted', 'unfocused'].includes(focusState.status.value)),
      hasNoFace: computed(() => focusState.status.value === 'no-face'),
      
      // Score helpers
      scorePercentage: computed(() => Math.round(focusState.focusScore.value * 100)),
      scoreColor: computed(() => getScoreColor(focusState.focusScore.value)),
      
      // Event formatters
      formattedStats: computed(() => ({
        blinkRate: `${focusState.events.blinkRate}/min`,
        lookAways: focusState.events.lookAways,
        totalBlinks: focusState.events.blinks,
        avgYaw: `${focusState.events.yawAvg}°`,
        avgPitch: `${focusState.events.pitchAvg}°`,
        gazeDirection: formatGazeDirection(focusState.events.gazeXAvg)
      }))
    }
    
    console.log('[FocusProvider] providing focus context')
    
    // Helper function to get score color
    function getScoreColor(score) {
      if (score >= 0.8) return '#4ade80' // green-400
      if (score >= 0.6) return '#fbbf24' // amber-400
      if (score >= 0.4) return '#fb923c' // orange-400
      return '#ef4444' // red-500
    }
    
    // Helper function to format gaze direction
    function formatGazeDirection(gazeX) {
      if (Math.abs(gazeX) < 0.2) return 'Center'
      if (gazeX > 0.2) return 'Right'
      return 'Left'
    }
    
    // Provide the context
    provide('focus', focusContext)
    
    return {
      focusContext
    }
  }
}
</script> 