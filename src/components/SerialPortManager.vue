<script setup>
import { ref, onUnmounted } from 'vue'

const emit = defineEmits(['port-connected', 'port-disconnected'])
const port = ref(null)
const isConnected = ref(false)

const connectPort = async () => {
    try {
        port.value = await navigator.serial.requestPort()
        await port.value.open({ baudRate: 2000000 })
        isConnected.value = true
        emit('port-connected', port.value)
    } catch (error) {
        console.error('Connection failed:', error)
        isConnected.value = false
        port.value = null
    }
}

const disconnectPort = async () => {
    if (port.value) {
        try {
            // Close the writer if it's open
            if (port.value.writable) {
                const writer = port.value.writable.getWriter()
                await writer.close()
                writer.releaseLock()
            }
            // Close the reader if it's open
            if (port.value.readable) {
                const reader = port.value.readable.getReader()
                await reader.cancel()
                reader.releaseLock()
            }
            await port.value.close()
        } catch (error) {
            console.error('Disconnect error:', error)
        }
        isConnected.value = false
        port.value = null
        emit('port-disconnected')
    }
}

// Cleanup on component unmount
onUnmounted(async () => {
    if (port.value) {
        await disconnectPort()
    }
})
</script>

<template>
    <div class="flex items-center gap-2">
        <button v-if="!isConnected" @click="connectPort"
            class="btn hover:bg-control-bg/80 text-sm flex items-center gap-2" title="Connect to Teensy">
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            Connect Port
        </button>
        <button v-else @click="disconnectPort" class="btn hover:bg-control-bg/80 text-sm flex items-center gap-2"
            title="Disconnect from Teensy">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            Connected
        </button>
    </div>
</template>
