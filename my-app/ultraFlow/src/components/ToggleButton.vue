<script setup>
import { ref } from 'vue'

const isFocusOn = ref(false)

function toggleFocusMode() {
  isFocusOn.value = !isFocusOn.value
}

</script>

<template>
 <div class="toggle-container">
    <button></button>
 </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
