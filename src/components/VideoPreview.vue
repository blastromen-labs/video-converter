<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
    videoUrl: String,
    metadata: Object,
    previewWidth: Number,
    previewHeight: Number,
    processFrame: Function,
    onVideoLoaded: Function
})

const videoRef = ref(null)
const canvasRef = ref(null)
let frameRequestId = null

const updatePreview = async () => {
    if (!videoRef.value || !canvasRef.value) return

    const ctx = canvasRef.value.getContext('2d', { willReadFrequently: true })
    const video = videoRef.value

    // Calculate crop dimensions to maintain aspect ratio
    const sourceRatio = video.videoWidth / video.videoHeight
    const targetRatio = props.previewWidth / props.previewHeight

    let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight

    if (sourceRatio > targetRatio) {
        sWidth = video.videoHeight * targetRatio
        sx = (video.videoWidth - sWidth) / 2
    } else {
        sHeight = video.videoWidth / targetRatio
        sy = (video.videoHeight - sHeight) / 2
    }

    ctx.drawImage(
        video,
        sx, sy, sWidth, sHeight,
        0, 0, canvasRef.value.width, canvasRef.value.height
    )

    if (props.processFrame) {
        const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
        props.processFrame(imageData)
        ctx.putImageData(imageData, 0, 0)
    }

    frameRequestId = requestAnimationFrame(updatePreview)
}

const handleVideoLoaded = () => {
    if (props.onVideoLoaded) {
        props.onVideoLoaded(videoRef.value)
    }
    updatePreview()
}

onMounted(() => {
    if (videoRef.value) {
        videoRef.value.addEventListener('loadeddata', handleVideoLoaded)
    }
})

onUnmounted(() => {
    if (frameRequestId) {
        cancelAnimationFrame(frameRequestId)
    }
    if (videoRef.value) {
        videoRef.value.removeEventListener('loadeddata', handleVideoLoaded)
    }
})
</script>

<template>
    <div class="preview-row">
        <div class="preview-box">
            <h5>Original</h5>
            <video ref="videoRef" :src="videoUrl" controls @timeupdate="updatePreview"></video>
            <div v-if="metadata" class="video-info">
                <div class="info-row">
                    <span>Resolution:</span>
                    <span>{{ metadata.width }}x{{ metadata.height }}</span>
                </div>
                <div class="info-row">
                    <span>Aspect Ratio:</span>
                    <span>{{ metadata.aspectRatio }}</span>
                </div>
                <div class="info-row">
                    <span>Duration:</span>
                    <span>{{ metadata.duration }}s</span>
                </div>
                <div class="info-row">
                    <span>Original FPS:</span>
                    <span>{{ metadata.fps }}</span>
                </div>
            </div>
        </div>

        <div class="preview-box">
            <h5>Conversion</h5>
            <canvas ref="canvasRef" :width="previewWidth" :height="previewHeight" class="preview-canvas"></canvas>
        </div>
    </div>
</template>
