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

const updateStartTime = (e) => {
    emit('update:startTime', Math.min(parseTime(e.target.value), props.endTime))
}

const updateEndTime = (e) => {
    emit('update:endTime', Math.min(parseTime(e.target.value), props.duration))
}
</script>

<template>
    <div class="adjustment-control">
        <div class="adjustment-row">
            <input type="checkbox" :checked="enabled" @input="$emit('update:enabled', $event.target.checked)"
                class="enable-checkbox">
            <label class="adjustment-label">Start:</label>
            <div class="adjustment-inputs" :class="{ disabled: !enabled }">
                <input type="text" :value="formatTime(startTime)" @input="updateStartTime" :disabled="!enabled">
                <button class="time-btn" @click="() => incrementTime('start', -1)" :disabled="!enabled">-1s</button>
                <button class="time-btn" @click="() => incrementTime('start', 1)" :disabled="!enabled">+1s</button>
            </div>
            <button class="reset-icon-btn" @click="onReset" title="Reset trim">↺</button>
        </div>

        <div class="adjustment-row">
            <div class="enable-checkbox-spacer"></div>
            <label class="adjustment-label">End:</label>
            <div class="adjustment-inputs" :class="{ disabled: !enabled }">
                <input type="text" :value="formatTime(endTime)" @input="updateEndTime" :disabled="!enabled">
                <button class="time-btn" @click="() => incrementTime('end', -1)" :disabled="!enabled">-1s</button>
                <button class="time-btn" @click="() => incrementTime('end', 1)" :disabled="!enabled">+1s</button>
            </div>
        </div>
    </div>
</template>

<style>
.enable-checkbox-spacer {
    width: 16px;
    margin-right: 8px;
}

.time-btn {
    padding: 2px 6px;
    background: #333;
    border: none;
    color: #fff;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8em;
}

.time-btn:hover:not(:disabled) {
    background: #444;
}

.time-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
