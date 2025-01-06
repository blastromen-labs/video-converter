<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
    videoUrl: String,
    metadata: Object,
    previewWidth: Number,
    previewHeight: Number,
    processFrame: Function,
    onVideoLoaded: Function,
    trimSettings: Object
})

const videoRef = ref(null)
const canvasRef = ref(null)
let frameRequestId = null

const updatePreview = async () => {
    if (!videoRef.value || !canvasRef.value) return

    const ctx = canvasRef.value.getContext('2d', { willReadFrequently: true })
    const video = videoRef.value

    // Calculate source and target ratios for cropping
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

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

const computedDuration = computed(() => {
    if (!props.trimSettings?.enabled) return props.metadata?.duration
    return props.trimSettings.end - props.trimSettings.start
})

// Add computed properties for display size
const displaySize = computed(() => {
    if (!videoRef.value) return { width: 0, height: 0 }
    return {
        width: videoRef.value.clientWidth,
        height: videoRef.value.clientHeight
    }
})

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
            <div class="preview-container">
                <video ref="videoRef" :src="videoUrl" controls @timeupdate="updatePreview"></video>
            </div>
            <div v-if="metadata" class="video-info">
                <div class="info-row">
                    <span>Resolution:</span>
                    <span>{{ metadata.width }}x{{ metadata.height }}</span>
                </div>
                <div class="info-row">
                    <span>Aspect Ratio:</span>
                    <span>{{ metadata.sourceAspectRatio }}</span>
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
            <div class="preview-container">
                <canvas ref="canvasRef" :width="previewWidth" :height="previewHeight" class="preview-canvas" :style="{
                    width: displaySize.width + 'px',
                    height: displaySize.height + 'px'
                }">
                </canvas>
            </div>
            <div v-if="metadata" class="video-info">
                <div class="info-row">
                    <span>Resolution:</span>
                    <span>{{ previewWidth }}x{{ previewHeight }}</span>
                </div>
                <div class="info-row">
                    <span>Aspect Ratio:</span>
                    <span>{{ metadata.targetAspectRatio }}</span>
                </div>
                <div class="info-row">
                    <span>Duration:</span>
                    <span>{{ formatDuration(computedDuration) }}s{{ trimSettings?.enabled ? ' (trimmed)' : '' }}</span>
                </div>
                <div class="info-row">
                    <span>FPS:</span>
                    <span>{{ metadata.fps }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.preview-row {
    display: flex;
    gap: 20px;
    justify-content: center;
}

.preview-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.preview-box h5 {
    margin: 0 0 10px 0;
    color: #888;
}

.preview-container {
    border-radius: 4px;
    overflow: hidden;
}

.preview-container video,
.preview-container canvas {
    display: block;
}

.video-info {
    background: #151515;
    padding: 6px;
    border-radius: 4px;
    margin-top: 8px;
    font-size: 0.8em;
    width: 200px;
    margin-left: auto;
    margin-right: auto;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
}

.info-row:not(:last-child) {
    border-bottom: 1px solid #222;
}

.info-row span:first-child {
    color: #666;
}

.info-row span:last-child {
    color: #999;
}

.preview-canvas {
    image-rendering: pixelated;
    /* Makes scaled-up pixels sharp */
}
</style>
