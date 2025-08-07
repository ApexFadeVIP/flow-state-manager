<template>
  <div class="camera-feed">
    <video ref="video" autoplay playsinline></video>
    <button @click="startCamera">Start Camera</button>
    <button @click="stopCamera">Stop Camera</button>
  </div>
</template>

<script>
export default {
  name: 'CameraFeed',
  methods: {
    async startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.$refs.video.srcObject = stream;
      } catch (error) {
        console.error('Error accessing the camera: ', error);
      }
    },
    stopCamera() {
      const videoStream = this.$refs.video.srcObject;
      if (videoStream) {
        const tracks = videoStream.getTracks();
        tracks.forEach(track => track.stop());
        this.$refs.video.srcObject = null;
      }
    }
  }
}
</script>

<style scoped>
.camera-feed {
  display: flex;
  flex-direction: column;
  align-items: center;
}
video {
  width: 100%;
  max-width: 600px;
  border: 1px solid #ccc;
}
button {
  margin-top: 10px;
}
</style>