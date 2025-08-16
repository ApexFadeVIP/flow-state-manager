<template>
  <FocusProvider>
    <div class="focus-tracking-demo">
      <div class="layout">
        <div class="left">
          <CameraFeed :width="640" :height="480" :autoStart="true" />
        </div>
        <div class="right">
          <FocusStats />
        </div>
      </div>
    </div>
  </FocusProvider>
</template>

<script>
import FocusProvider from '../../context/FocusProvider.vue'
import CameraFeed from './CameraFeed.vue'
import FocusStats from './FocusStats.vue'

export default {
  name: 'FocusTrackingDemo',
  components: { FocusProvider, CameraFeed, FocusStats }
}
</script>

<style scoped>
.focus-tracking-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
}
</style> 