<script setup>
import CameraFeed from './components/CameraFeed.vue'
</script>

<template>
  <main id="app-container">
    <h1>Facial Expression Detection</h1>
    <CameraFeed />
  </main>
</template>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2em;
}

h1 {
  margin-bottom: 1.5em;
}
</style>