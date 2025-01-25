<script setup>
import { ref } from 'vue'
import SerialPortManager from './SerialPortManager.vue'

const FRAME_SIZE = 40 * 96 * 3  // width * height * RGB
const CHUNK_SIZE = 1024         // Send in 1KB chunks

const serialPort = ref(null)
const isStreaming = ref(false)
const streamStatus = ref('Ready to connect...')
const selectedFile = ref(null)
let frameCount = 0
let lastFpsTime = 0
let streamInterval = null

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
        selectedFile.value = file
        streamStatus.value = 'File selected: ' + file.name
    }
}

const startStreaming = async () => {
    if (!serialPort.value || !selectedFile.value) return

    isStreaming.value = true
    const reader = new FileReader()

    reader.onload = async (e) => {
        const fileData = new Uint8Array(e.target.result)
        const totalFrames = Math.floor(fileData.length / FRAME_SIZE)
        let position = 0

        streamStatus.value = `Streaming: ${totalFrames} frames`

        streamInterval = setInterval(async () => {
            if (!isStreaming.value) {
                clearInterval(streamInterval)
                return
            }

            const now = performance.now()

            if (position >= fileData.length) {
                position = 0 // Loop back to start
            }

            const frameData = fileData.slice(position, position + FRAME_SIZE)
            position += FRAME_SIZE

            // Send frame in chunks
            for (let i = 0; i < frameData.length; i += CHUNK_SIZE) {
                const chunk = frameData.slice(i, i + CHUNK_SIZE)
                const writer = serialPort.value.writable.getWriter()
                await writer.write(chunk)
                writer.releaseLock()
                await new Promise(resolve => setTimeout(resolve, 1)) // Small delay
            }

            frameCount++
            if (now - lastFpsTime >= 1000) {
                const fps = frameCount
                streamStatus.value = `Streaming: ${totalFrames} frames (${fps} FPS)`
                frameCount = 0
                lastFpsTime = now
            }
        }, 1000 / 30) // 30 FPS target
    }

    reader.readAsArrayBuffer(selectedFile.value)
}

const stopStreaming = () => {
    isStreaming.value = false
    if (streamInterval) {
        clearInterval(streamInterval)
        streamInterval = null
    }
    streamStatus.value = 'Streaming stopped'
}
</script>

<template>
    <div class="bg-panel-bg rounded-lg shadow-lg p-6 space-y-4">
        <h2 class="text-lg font-medium text-text">Stream Binary File</h2>

        <div class="flex items-center gap-4">
            <SerialPortManager @port-connected="handlePortConnected" @port-disconnected="handlePortDisconnected" />

            <div class="relative">
                <button class="btn hover:bg-control-bg/80 text-sm">
                    Select .bin file
                </button>
                <input type="file" accept=".bin" @change="handleFileSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
            </div>
            <span v-if="selectedFile" class="text-sm text-text-secondary">
                Selected: {{ selectedFile.name }}
            </span>
        </div>

        <div class="flex items-center gap-4">
            <button v-if="serialPort && selectedFile && !isStreaming" @click="startStreaming"
                class="btn bg-accent hover:bg-accent/80 text-text">
                Start Streaming
            </button>
            <button v-if="isStreaming" @click="stopStreaming" class="btn bg-red-500 hover:bg-red-500/80 text-text">
                Stop Streaming
            </button>
            <span class="text-sm text-text-secondary">{{ streamStatus }}</span>
        </div>
    </div>
</template>
