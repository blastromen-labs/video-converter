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
    <div class="trim-controls">
        <div class="trim-row">
            <label>Start Time:</label>
            <div class="time-inputs">
                <input type="text" :value="formatTime(startTime)" @change="updateStartTime" class="time-input">
                <div class="time-buttons">
                    <button @click="incrementTime('start', -1)">-1s</button>
                    <button @click="incrementTime('start', 1)">+1s</button>
                </div>
            </div>
        </div>

        <div class="trim-row">
            <label>End Time:</label>
            <div class="time-inputs">
                <input type="text" :value="formatTime(endTime)" @change="updateEndTime" class="time-input">
                <div class="time-buttons">
                    <button @click="incrementTime('end', -1)">-1s</button>
                    <button @click="incrementTime('end', 1)">+1s</button>
                </div>
            </div>
        </div>

        <button class="reset-icon-btn" @click="onReset" title="Reset trim times">
            ↺
        </button>
    </div>
</template>

<style>
/* Update styles */
.trim-controls {
    background: #2a2a2a;
    padding: 8px;
    border-radius: 4px;
    display: flex;
    gap: 8px;
    align-items: center;
}

.trim-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.time-inputs {
    display: flex;
    align-items: center;
    gap: 4px;
}

.time-input {
    width: 80px;
    padding: 2px 4px;
    background: #1a1a1a;
    border: 1px solid #333;
    color: white;
    border-radius: 4px;
}

.time-buttons {
    display: flex;
    gap: 2px;
}

.time-buttons button {
    padding: 2px 4px;
    background: #333;
    border: none;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
}

.time-buttons button:hover {
    background: #444;
}

.reset-icon-btn {
    background: none;
    border: none;
    color: #666;
    font-size: 1.2em;
    padding: 2px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    margin-left: auto;
}

.reset-icon-btn:hover {
    background: #333;
    color: #fff;
}
</style>
