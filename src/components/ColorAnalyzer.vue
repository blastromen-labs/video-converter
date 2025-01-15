<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

const pickedColor = ref({ r: 0, g: 0, b: 0 })
const isPickerActive = ref(false)
const selectedPosition = ref(null)
const isAnalyzing = ref(false)
const lastValidCoords = ref(null)

const startPicking = () => {
    isPickerActive.value = true
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick, { capture: true })
    document.body.style.cursor = 'crosshair'
}

const stopPicking = () => {
    isPickerActive.value = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('click', handleClick, { capture: true })
    document.body.style.cursor = 'default'
}

const handleMouseMove = (e) => {
    if (!isPickerActive.value) return

    try {
        // Get the processed preview canvas
        const previewCanvas = document.querySelector('.processed-preview')
        if (!previewCanvas) return

        // Get canvas-relative coordinates
        const rect = previewCanvas.getBoundingClientRect()

        // Calculate the actual rendered dimensions of the canvas
        const canvasAspect = previewCanvas.width / previewCanvas.height
        const containerAspect = rect.width / rect.height

        let renderWidth, renderHeight, offsetX = 0, offsetY = 0

        if (canvasAspect > containerAspect) {
            // Canvas is wider than container - fit to width
            renderWidth = rect.width
            renderHeight = rect.width / canvasAspect
            offsetY = (rect.height - renderHeight) / 2
        } else {
            // Canvas is taller than container - fit to height
            renderHeight = rect.height
            renderWidth = rect.height * canvasAspect
            offsetX = (rect.width - renderWidth) / 2
        }

        // Get mouse position relative to the rendered canvas area
        const mouseX = e.clientX - rect.left - offsetX
        const mouseY = e.clientY - rect.top - offsetY

        // Convert to canvas coordinates
        const canvasX = Math.floor((mouseX / renderWidth) * previewCanvas.width)
        const canvasY = Math.floor((mouseY / renderHeight) * previewCanvas.height)

        // Only pick if within canvas bounds
        if (canvasX >= 0 && canvasX < previewCanvas.width &&
            canvasY >= 0 && canvasY < previewCanvas.height) {
            // Store last valid coordinates
            lastValidCoords.value = { x: canvasX, y: canvasY }

            const ctx = previewCanvas.getContext('2d')
            const pixel = ctx.getImageData(
                canvasX,
                canvasY,
                1, 1
            )
            pickedColor.value = {
                r: pixel.data[0],
                g: pixel.data[1],
                b: pixel.data[2]
            }
        }
    } catch (error) {
        console.error('Error picking color:', error)
    }
}

const handleClick = (e) => {
    if (!isPickerActive.value) return
    e.preventDefault()
    e.stopPropagation()
    if (lastValidCoords.value) {
        selectedPosition.value = { ...lastValidCoords.value }
        startAnalysis()
    }
    stopPicking()
}

const analyzeSelectedPosition = () => {
    if (!selectedPosition.value) return

    try {
        const previewCanvas = document.querySelector('.processed-preview')
        if (!previewCanvas) return

        const ctx = previewCanvas.getContext('2d')
        const pixel = ctx.getImageData(
            selectedPosition.value.x,
            selectedPosition.value.y,
            1, 1
        )
        pickedColor.value = {
            r: pixel.data[0],
            g: pixel.data[1],
            b: pixel.data[2]
        }
    } catch (error) {
        console.error('Error analyzing color:', error)
    }
}

const startAnalysis = () => {
    isAnalyzing.value = true
    requestAnimationFrame(function analyze() {
        if (isAnalyzing.value) {
            analyzeSelectedPosition()
            requestAnimationFrame(analyze)
        }
    })
}

const stopAnalysis = () => {
    isAnalyzing.value = false
    selectedPosition.value = null
}

onUnmounted(() => {
    if (isPickerActive.value) {
        stopPicking()
    }
    stopAnalysis()
})

// Add computed hex value
const hexColor = computed(() => {
    const toHex = (n) => n.toString(16).padStart(2, '0')
    return `#${toHex(pickedColor.value.r)}${toHex(pickedColor.value.g)}${toHex(pickedColor.value.b)}`
})
</script>

<template>
    <div class="color-analyzer">
        <button class="picker-btn" :class="{ active: isPickerActive || isAnalyzing }"
            @click.prevent="isAnalyzing ? stopAnalysis() : startPicking()" title="Pick color from video preview">
            <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor"
                    d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 18.25V21h2.75l11.92-11.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" />
            </svg>
        </button>
        <div class="color-values" :style="{ color: isPickerActive || isAnalyzing ? '#42b883' : '#888' }">
            <div class="color-preview" :style="{ backgroundColor: hexColor }"></div>
            <span>RGB({{ pickedColor.r }}, {{ pickedColor.g }}, {{ pickedColor.b }})</span>
            <button v-if="isAnalyzing" class="ml-2 text-xs px-1.5 py-0.5 bg-red-500/20 hover:bg-red-500/30 rounded"
                @click="stopAnalysis">Stop</button>
        </div>
    </div>
</template>

<style>
.color-analyzer {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9em;
    color: #888;
}

.picker-btn {
    background: none;
    border: none;
    color: #666;
    width: 24px;
    height: 24px;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.picker-btn:hover {
    background: #333;
    color: #fff;
}

.picker-btn.active {
    background: #42b883;
    color: white;
}

.color-values {
    font-family: monospace;
    display: flex;
    align-items: center;
    gap: 8px;
}

.color-preview {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid #444;
}
</style>
