<script setup>
import { ref, onUnmounted } from 'vue'
import SerialPortManager from './SerialPortManager.vue'

const serialPort = ref(null)
const isStreaming = ref(false)
const streamStatus = ref('Ready to connect...')
const selectedFile = ref(null)
const FRAME_SIZE = 40 * 96 * 3
const CHUNK_SIZE = 1024

let frameCount = 0
let lastFpsTime = 0
let streamInterval = null
let writer = null

// Create an event bus for streaming status
const streamingStarted = new CustomEvent('streaming-started')
const streamingStopped = new CustomEvent('streaming-stopped')

const handlePortConnected = (port) => {
    serialPort.value = port
    streamStatus.value = 'Connected to Teensy'
}

const handlePortDisconnected = () => {
    serialPort.value = null
    if (isStreaming.value) {
        stopStreaming()
    }
    streamStatus.value = 'Ready to connect...'
}

const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
        if (isStreaming.value) {
            stopStreaming()
        }
        selectedFile.value = file
        streamStatus.value = 'File selected: ' + file.name
    }
}

const startStreaming = async () => {
    if (!serialPort.value || !selectedFile.value) return

    isStreaming.value = true
    // Notify other components that streaming has started
    window.dispatchEvent(streamingStarted)

    const reader = new FileReader()

    reader.onload = async (e) => {
        const fileData = new Uint8Array(e.target.result)
        const totalFrames = Math.floor(fileData.length / FRAME_SIZE)
        let position = 0

        streamStatus.value = `Streaming: ${totalFrames} frames`
        try {
            writer = serialPort.value.writable.getWriter()
        } catch (error) {
            console.error('Failed to get writer:', error)
            stopStreaming()
            return
        }

        streamInterval = setInterval(async () => {
            if (!isStreaming.value || !writer) {
                clearInterval(streamInterval)
                return
            }

            const now = performance.now()

            if (position >= fileData.length) {
                position = 0
            }

            const frameData = fileData.slice(position, position + FRAME_SIZE)
            position += FRAME_SIZE

            for (let i = 0; i < frameData.length; i += CHUNK_SIZE) {
                const chunk = frameData.slice(i, i + CHUNK_SIZE)
                try {
                    if (!writer) {
                        stopStreaming()
                        return
                    }
                    await writer.write(chunk)
                    await new Promise(resolve => setTimeout(resolve, 1))
                } catch (error) {
                    console.error('Write error:', error)
                    stopStreaming()
                    return
                }
            }

            frameCount++
            if (now - lastFpsTime >= 1000) {
                const fps = frameCount
                streamStatus.value = `Streaming: ${totalFrames} frames (${fps} FPS)`
                frameCount = 0
                lastFpsTime = now
            }
        }, 1000 / 30)
    }

    reader.readAsArrayBuffer(selectedFile.value)
}

const stopStreaming = () => {
    isStreaming.value = false
    if (streamInterval) {
        clearInterval(streamInterval)
        streamInterval = null
    }
    if (writer) {
        try {
            writer.releaseLock()
        } catch (error) {
            console.error('Error releasing writer:', error)
        }
        writer = null
    }
    streamStatus.value = 'Streaming stopped'
    // Notify other components that streaming has stopped
    window.dispatchEvent(streamingStopped)
}

onUnmounted(() => {
    if (isStreaming.value) {
        stopStreaming()
    }
})
</script>

<template>
    <div class="flex items-center gap-4">
        <SerialPortManager @port-connected="handlePortConnected" @port-disconnected="handlePortDisconnected" />
        <div class="relative">
            <button class="btn hover:bg-control-bg/80 text-sm cursor-pointer flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                Select .bin file
            </button>
            <input type="file" accept=".bin" @change="handleFileSelect"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
        </div>
        <span v-if="selectedFile" class="text-sm text-text-secondary truncate max-w-[200px]">
            {{ selectedFile.name }}
        </span>

        <button v-if="serialPort && selectedFile && !isStreaming" @click="startStreaming"
            class="btn bg-accent hover:bg-accent/80 text-text text-sm">
            Start Streaming
        </button>
        <button v-if="isStreaming" @click="stopStreaming" class="btn bg-red-500 hover:bg-red-500/80 text-text text-sm">
            Stop Streaming
        </button>

        <span class="text-sm text-text-secondary">{{ streamStatus }}</span>
    </div>
</template>
