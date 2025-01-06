<script setup>
import { ref } from 'vue'

const props = defineProps({
    enabled: Boolean,
    startTime: Number,
    endTime: Number,
    duration: Number,
    onReset: Function,
    onTimeChange: Function
})

const emit = defineEmits(['update:enabled', 'update:startTime', 'update:endTime'])

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

const parseTime = (timeString) => {
    const [mins, rest] = timeString.split(':')
    const [secs, ms] = rest.split('.')
    return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000
}

const incrementTime = (type, seconds) => {
    const currentValue = type === 'start' ? props.startTime : props.endTime
    const newValue = Math.max(0, currentValue + seconds)

    if (type === 'start') {
        emit('update:startTime', Math.min(newValue, props.endTime))
    } else {
        emit('update:endTime', Math.min(newValue, props.duration))
    }
}
</script>

<template>
    <div class="trim-controls">
        <div class="trim-header">
            <h4>Trim Video</h4>
            <div class="trim-header-controls">
                <button class="reset-value-btn" @click="onReset" title="Reset trim times">
                    Reset
                </button>
                <label class="trim-toggle">
                    <input type="checkbox" :checked="enabled" @input="emit('update:enabled', $event.target.checked)">
                    Enable trim
                </label>
            </div>
        </div>

        <div class="trim-inputs" :class="{ disabled: !enabled }">
            <div class="trim-input">
                <label for="trim-start">Start Time:</label>
                <div class="time-input-group">
                    <input id="trim-start" type="text" :value="formatTime(startTime)"
                        @change="e => emit('update:startTime', parseTime(e.target.value))" :disabled="!enabled"
                        pattern="[0-9]+:[0-5][0-9].[0-9]{3}" placeholder="0:00.000">
                    <div class="time-controls">
                        <button @click="incrementTime('start', 1)" :disabled="!enabled" title="Add 1 second">
                            ▲
                        </button>
                        <button @click="incrementTime('start', -1)" :disabled="!enabled" title="Subtract 1 second">
                            ▼
                        </button>
                    </div>
                </div>
            </div>

            <div class="trim-input">
                <label for="trim-end">End Time:</label>
                <div class="time-input-group">
                    <input id="trim-end" type="text" :value="formatTime(endTime)"
                        @change="e => emit('update:endTime', parseTime(e.target.value))" :disabled="!enabled"
                        pattern="[0-9]+:[0-5][0-9].[0-9]{3}" placeholder="0:00.000">
                    <div class="time-controls">
                        <button @click="incrementTime('end', 1)" :disabled="!enabled" title="Add 1 second">
                            ▲
                        </button>
                        <button @click="incrementTime('end', -1)" :disabled="!enabled" title="Subtract 1 second">
                            ▼
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
