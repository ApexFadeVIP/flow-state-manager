<template>
  <div id="app">
    <header>
      <h1>Flow State Manager</h1>
      <p>Gesture Recognition System</p>
    </header>
    
    <main>
      <MediaPipeTest />
      <hr style="margin: 40px 0;">
      <GestureRecognition />
    </main>
  </div>
</template>

<script>
import GestureRecognition from './components/GestureRecognition.vue'

export default {
  name: 'App',
  components: {
    GestureRecognition,
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 300;
}

header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

main {
  padding: 2rem;
}
</style>