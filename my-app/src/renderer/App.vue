<template>
  <div id="app">
    <h1>UltraFlow</h1>
    <p>Welcome to the Flow State Manager application!</p>
    <SimpleToggle v-model="checked" @change="onToggle" />
    <p>Focus mode is: {{ checked ? 'on' : 'off' }}</p>
  </div>
</template>

<script>
import SimpleToggle from "../main/components/ToggleSwitch.vue"

export default {
  name: 'App',
  components: { SimpleToggle },
  data() {
    return {
      checked: false
    }
  },
  methods: {
    async onToggle() {
      if (window.electronAPI) {
        try {
          await window.electronAPI.toggleFocus(this.checked);
        } catch (e) {
          console.error('AppleScript error:', e);
        }
      }
    }
  }
}
</script>