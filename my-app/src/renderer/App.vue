<template>
  <div id="app">
    <header>
      <h1>Flow State Manager</h1>
      <p>Unified AI-Powered Focus and Gesture Recognition</p>
    </header>
    
    <main>
      <div class="unified-content">
        <div class="panel-header">
          <h2>Unified Vision Tracking</h2>
          <p>Real-time gesture recognition and focus tracking on a single camera feed</p>
        </div>
        <UnifiedVisionTracker />
      </div>
    </main>
  </div>
</template>

<script>
import UnifiedVisionTracker from './components/UnifiedVisionTracker.vue'

export default {
  name: 'App',
  components: {
    UnifiedVisionTracker
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
  max-width: 1400px;
  margin: 0 auto;
}

.unified-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  padding: 2rem;
}

.panel-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.panel-header p {
  font-size: 1rem;
  color: #64748b;
}

/* Responsive design */
@media (max-width: 768px) {
  header {
    padding: 1.5rem;
  }
  
  header h1 {
    font-size: 2rem;
  }
  
  main {
    padding: 1rem;
  }
  
  .unified-content {
    padding: 1rem;
  }
  
  .panel-header h2 {
    font-size: 1.5rem;
  }
}
</style>