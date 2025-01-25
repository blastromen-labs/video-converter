<script setup>
import { ref, watch, onMounted, onUnmounted, computed, watchEffect, shallowRef } from 'vue'

const cropToAspectRatio = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
    // Calculate target aspect ratio from output dimensions
    const targetRatio = targetWidth / targetHeight

    // Calculate dimensions that will fill the target area
    let sWidth, sHeight, sx, sy

    // Calculate scale to fit source into target aspect ratio
    if (sourceWidth / sourceHeight > targetRatio) {
        // Source is wider than target - fit to height
        sHeight = sourceHeight
        sWidth = sourceHeight * targetRatio
        sx = (sourceWidth - sWidth) / 2
        sy = 0
    } else {
        // Source is taller than target - fit to width
        sWidth = sourceWidth
        sHeight = sourceWidth / targetRatio
        sx = 0
        sy = (sourceHeight - sHeight) / 2
    }

    // Round values to avoid sub-pixel rendering
    return {
        sx: Math.round(sx),
        sy: Math.round(sy),
        sWidth: Math.round(sWidth),
        sHeight: Math.round(sHeight)
    }
}

const props = defineProps({
    videoUrl: String,
    metadata: Object,
    previewWidth: Number,
    previewHeight: Number,
    processFrame: Function,
    onVideoLoaded: Function,
    trimSettings: Object,
    isPlaying: Boolean
})

const videoRef = ref(null)
const canvasRef = ref(null)
let frameRequestId = null

const computedDimensions = computed(() => {
    if (!videoRef.value) return null
    const video = videoRef.value
    return cropToAspectRatio(
        video.videoWidth,
        video.videoHeight,
        props.previewWidth,
        props.previewHeight
    )
})

const updatePreview = async () => {
    // Stop all preview updates if streaming is active
    if (streamingActive.value) {
        if (frameRequestId) {
            cancelAnimationFrame(frameRequestId)
            frameRequestId = null
        }
        return
    }

    if (!videoRef.value || !canvasRef.value || !videoRef.value.readyState >= 2) return

    const ctx = canvasRef.value.getContext('2d', { willReadFrequently: true })
    const video = videoRef.value
    const dimensions = computedDimensions.value
    if (!dimensions) return

    ctx.drawImage(
        video,
        dimensions.sx, dimensions.sy, dimensions.sWidth, dimensions.sHeight,
        0, 0, canvasRef.value.width, canvasRef.value.height
    )

    if (props.processFrame) {
        const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
        props.processFrame(imageData)
        ctx.putImageData(imageData, 0, 0)
    }
}

const startPreviewLoop = () => {
    // Don't start preview loop if streaming is active
    if (streamingActive.value) return

    if (frameRequestId) cancelAnimationFrame(frameRequestId)
    frameRequestId = requestAnimationFrame(() => {
        updatePreview()
        startPreviewLoop()
    })
}

const handleVideoLoaded = () => {
    if (props.onVideoLoaded) {
        props.onVideoLoaded(videoRef.value)
    }
    startPreviewLoop()
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

// Handle video trimming
const updateVideoTrimming = () => {
    if (!videoRef.value) return

    const video = videoRef.value
    if (props.trimSettings?.enabled) {
        // Set the playback range
        video.currentTime = props.trimSettings.start

        // Add timeupdate listener if not already added
        if (!video.hasTimeUpdateListener) {
            video.addEventListener('timeupdate', () => {
                if (video.currentTime >= props.trimSettings.end) {
                    video.currentTime = props.trimSettings.start
                    if (!video.paused) video.play()
                }
            })
            video.hasTimeUpdateListener = true
        }
    }
}

const emit = defineEmits([
    'update:isPlaying',
    'video-loaded'
])

const togglePlay = () => {
    if (!videoRef.value) return

    if (videoRef.value.paused) {
        videoRef.value.play()
        emit('update:isPlaying', true)
    } else {
        videoRef.value.pause()
        emit('update:isPlaying', false)
    }
}

// Expose togglePlay method to parent after it's defined
defineExpose({
    togglePlay
})

// Watch for isPlaying prop changes
watch(() => props.isPlaying, (newValue) => {
    if (!videoRef.value) return

    if (newValue && videoRef.value.paused) {
        videoRef.value.play()
    } else if (!newValue && !videoRef.value.paused) {
        videoRef.value.pause()
    }
}, { immediate: true })

const streamingActive = ref(false)

onMounted(() => {
    if (videoRef.value) {
        videoRef.value.addEventListener('loadeddata', handleVideoLoaded)
        if (videoRef.value.readyState >= 2) {
            handleVideoLoaded()
        }
        updateVideoTrimming()
        // Use function references for consistent event handling
        const handlePlay = () => emit('update:isPlaying', true)
        const handlePause = () => emit('update:isPlaying', false)
        const handleEnded = () => emit('update:isPlaying', false)

        videoRef.value.addEventListener('play', handlePlay)
        videoRef.value.addEventListener('pause', handlePause)
        videoRef.value.addEventListener('ended', handleEnded)

        // Clean up event listeners on unmount
        onUnmounted(() => {
            if (videoRef.value) {
                videoRef.value.removeEventListener('play', handlePlay)
                videoRef.value.removeEventListener('pause', handlePause)
                videoRef.value.removeEventListener('ended', handleEnded)
            }
        })
    }
    window.addEventListener('streaming-started', handleStreamingStarted)
    window.addEventListener('streaming-stopped', handleStreamingEnded)
})

// Watch for changes in trim settings
watchEffect(() => {
    if (props.trimSettings?.enabled) {
        updateVideoTrimming()
    }
})

// Update video element attributes based on trim settings
const videoAttrs = computed(() => ({
    src: props.videoUrl,
    controls: true,
    preload: 'auto',
    crossorigin: 'anonymous',
    playsinline: true,
    ...(props.trimSettings?.enabled ? {
        min: props.trimSettings.start,
        max: props.trimSettings.end
    } : {})
}))

onUnmounted(() => {
    if (frameRequestId) {
        cancelAnimationFrame(frameRequestId)
        frameRequestId = null
    }
    if (videoRef.value) {
        videoRef.value.removeEventListener('loadeddata', handleVideoLoaded)
    }
    window.removeEventListener('streaming-started', handleStreamingStarted)
    window.removeEventListener('streaming-stopped', handleStreamingEnded)
})

watch(() => props.videoUrl, () => {
    if (frameRequestId) {
        cancelAnimationFrame(frameRequestId)
        frameRequestId = null
    }
    if (videoRef.value && videoRef.value.readyState >= 2) {
        startPreviewLoop()
    }
})

const handleStreamingStarted = () => {
    streamingActive.value = true
    // Cancel any existing animation frame
    if (frameRequestId) {
        cancelAnimationFrame(frameRequestId)
        frameRequestId = null
    }
    // Clear the canvas
    if (canvasRef.value) {
        const ctx = canvasRef.value.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }
    if (props.isPlaying) {
        videoRef.value.pause()
        emit('update:isPlaying', false)
    }
}

const handleStreamingEnded = () => {
    streamingActive.value = false
    // Restart preview loop if video is loaded
    if (videoRef.value && videoRef.value.readyState >= 2) {
        startPreviewLoop()
    }
}
</script>

<template>
    <div class="flex flex-col lg:flex-row gap-8 lg:gap-10">
        <div class="preview-box">
            <h5>Conversion</h5>
            <div class="preview-container w-full lg:w-[400px] h-[250px] lg:h-[400px]">
                <div class="relative w-full h-full">
                    <canvas ref="canvasRef" :width="previewWidth" :height="previewHeight"
                        class="preview-canvas processed-preview" :style="{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }">
                    </canvas>
                </div>
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

        <div class="preview-box">
            <h5>Original</h5>
            <div class="preview-container w-full lg:w-[400px] h-[250px] lg:h-[400px]">
                <div class="w-full h-full flex items-center justify-center">
                    <video ref="videoRef" v-bind="videoAttrs" class="max-w-full max-h-full object-contain"></video>
                </div>
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
    </div>
</template>

<style>
.preview-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.preview-box h5 {
    margin: 0 0 10px 0;
    color: #888;
}

.preview-container {
    border-radius: 4px;
    overflow: hidden;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
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
    width: 100%;
    height: 100%;
}

.preview-container:hover .bg-black\/40 {
    opacity: 1;
}

.preview-container .bg-black\/40 {
    opacity: 0;
    transition: opacity 0.2s;
}

/* Show overlay when paused */
.preview-container .bg-black\/40:has(svg[d="M8 5v14l11-7z"]) {
    opacity: 1;
}
</style>
