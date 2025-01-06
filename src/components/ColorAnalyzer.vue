<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const pickedColor = ref({ r: 0, g: 0, b: 0 })
const isPickerActive = ref(false)

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
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Only pick if within canvas bounds
        if (x >= 0 && x < rect.width && y >= 0 && y < rect.height) {
            const ctx = previewCanvas.getContext('2d')
            // Calculate pixel position in actual canvas coordinates
            const pixelX = Math.floor((x * previewCanvas.width) / rect.width)
            const pixelY = Math.floor((y * previewCanvas.height) / rect.height)

            const pixel = ctx.getImageData(
                pixelX,
                pixelY,
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
    stopPicking()
}

onUnmounted(() => {
    if (isPickerActive.value) {
        stopPicking()
    }
})

// Add computed hex value
const hexColor = computed(() => {
    const toHex = (n) => n.toString(16).padStart(2, '0')
    return `#${toHex(pickedColor.value.r)}${toHex(pickedColor.value.g)}${toHex(pickedColor.value.b)}`
})
</script>

<template>
    <div class="color-analyzer">
        <button class="picker-btn" :class="{ active: isPickerActive }" @click.prevent="startPicking"
            title="Pick color from video preview">
            <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor"
                    d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 18.25V21h2.75l11.92-11.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" />
            </svg>
        </button>
        <div class="color-values" :style="{ color: isPickerActive ? '#42b883' : '#888' }">
            <div class="color-preview" :style="{ backgroundColor: hexColor }"></div>
            <span>RGB({{ pickedColor.r }}, {{ pickedColor.g }}, {{ pickedColor.b }})</span>
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
