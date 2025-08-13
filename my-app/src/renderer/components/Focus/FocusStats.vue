<template>
  <div class="focus-stats">
    <div class="panel">
      <h3>Status</h3>
      <p><strong>Tracking:</strong> {{ focus?.isTracking ? 'Yes' : 'No' }}</p>
      <p><strong>State:</strong> {{ focus?.status.value }}</p>
      <p><strong>Score:</strong> {{ focus?.scorePercentage }}%</p>
    </div>
    <div class="panel">
      <h3>Metrics</h3>
      <p><strong>Yaw:</strong> {{ focus?.stats.yaw.toFixed(2) }}°</p>
      <p><strong>Pitch:</strong> {{ focus?.stats.pitch.toFixed(2) }}°</p>
      <p><strong>Gaze X:</strong> {{ focus?.stats.gazeX.toFixed(2) }}</p>
      <p><strong>Gaze Y:</strong> {{ focus?.stats.gazeY.toFixed(2) }}</p>
    </div>
  </div>
</template>

<script>
import { inject, onMounted } from 'vue'

export default {
  name: 'FocusStats',
  setup() {
    const focus = inject('focus')
    onMounted(() => {
      console.log('[FocusStats] injected focus present:', !!focus)
    })
    return { focus }
  }
}
</script>

<style scoped>
.focus-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #334155;
}

.panel p {
  margin: 4px 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
</style> 