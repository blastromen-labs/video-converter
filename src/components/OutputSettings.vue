<script setup>
import { ref } from 'vue'
import TrimVideo from './TrimVideo.vue'
import PresetManager from './PresetManager.vue'

const props = defineProps({
    targetResolution: Object,
    adjustments: Object,
    defaultSettings: Object,
    trimSettings: Object,
    videoMetadata: Object
})

const emit = defineEmits(['update:targetResolution', 'update:adjustments', 'update:trimSettings'])

const resetSettings = () => {
    emit('update:targetResolution', { ...props.defaultSettings.resolution })
    emit('update:adjustments', { ...props.defaultSettings.adjustments })
}

const handleTrimReset = () => {
    emit('update:trimSettings', {
        start: 0,
        end: props.videoMetadata?.duration || 0,
        enabled: false
    })
}

const handleLoadPreset = (settings) => {
    emit('update:targetResolution', { ...settings.targetResolution })
    emit('update:adjustments', { ...settings.adjustments })
    if (settings.trimSettings) {
        emit('update:trimSettings', { ...settings.trimSettings })
    }
}

const getCurrentSettings = () => ({
    targetResolution: props.targetResolution,
    adjustments: props.adjustments,
    trimSettings: props.trimSettings
})

const randomizeSettings = () => {
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
    const randomBool = () => Math.random() > 0.5

    const newAdjustments = {
        ...props.adjustments,
        brightness: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        contrast: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        redLevel: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        greenLevel: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        blueLevel: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        highlights: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        shadows: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        midtones: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        hue: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        saturation: {
            enabled: randomBool(),
            value: randomInt(0, 255)
        },
        colorize: {
            ...props.adjustments.colorize,
            enabled: randomBool(),
            color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            intensity: randomInt(0, 100)
        },
        colorReduce: {
            ...props.adjustments.colorReduce,
            enabled: randomBool(),
            levels: randomInt(1, 6)
        },
        invert: {
            ...props.adjustments.invert,
            enabled: randomBool(),
            strength: randomInt(0, 100)
        }
    }

    emit('update:adjustments', newAdjustments)
}

// Add throttle utility
const throttle = (fn, delay) => {
    let lastCall = 0
    return (...args) => {
        const now = Date.now()
        if (now - lastCall >= delay) {
            fn(...args)
            lastCall = now
        }
    }
}

// Use throttle for slider updates
const throttledEmit = throttle((type, value) => {
    emit('update:adjustments', {
        ...props.adjustments,
        [type]: { ...props.adjustments[type], value: parseInt(value) }
    })
}, 32)
</script>

<template>
    <div class="settings-panel">
        <div class="controls-row">
            <div class="preset-controls">
                <PresetManager :current-settings="getCurrentSettings()" @load-preset="handleLoadPreset" />
            </div>
            <div class="action-buttons">
                <button class="randomize-btn" @click="randomizeSettings" title="Randomize adjustment settings">
                    Randomize
                </button>
                <button class="reset-settings-btn" @click="resetSettings" title="Reset all settings to default values">
                    Reset
                </button>
            </div>
        </div>

        <div class="settings-group">
            <div class="resolution-settings">
                <div class="resolution-inputs">
                    <div class="input-group">
                        <label for="width">Width:</label>
                        <input id="width" type="number" v-model="targetResolution.width" min="1"
                            @input="emit('update:targetResolution', { ...targetResolution })">
                    </div>
                    <div class="input-group">
                        <label for="height">Height:</label>
                        <input id="height" type="number" v-model="targetResolution.height" min="1"
                            @input="emit('update:targetResolution', { ...targetResolution })">
                    </div>
                    <div class="input-group">
                        <label for="fps">FPS:</label>
                        <input id="fps" type="number" v-model="targetResolution.fps" min="1" max="60"
                            @input="emit('update:targetResolution', { ...targetResolution })">
                    </div>
                </div>

                <div class="trim-section">
                    <TrimVideo v-if="videoMetadata" v-model:enabled="trimSettings.enabled"
                        v-model:startTime="trimSettings.start" v-model:endTime="trimSettings.end"
                        :duration="videoMetadata?.duration || 0" :onReset="handleTrimReset" />
                </div>
            </div>

            <div class="adjustment-controls">
                <div class="adjustment-control" v-for="(value, key) in adjustments" :key="key">
                    <div class="adjustment-row" v-if="typeof value === 'object'">
                        <template v-if="'value' in value">
                            <input type="checkbox" :checked="value.enabled" @input="emit('update:adjustments', {
                                ...adjustments,
                                [key]: { ...value, enabled: $event.target.checked }
                            })" class="enable-checkbox">
                            <label class="adjustment-label">{{ key.charAt(0).toUpperCase() + key.slice(1) }}:</label>
                            <div class="adjustment-inputs" :class="{ disabled: !value.enabled }">
                                <input type="range" :value="value.value"
                                    @input="throttledEmit(key, $event.target.value)" min="0" max="255"
                                    :disabled="!value.enabled">
                                <input type="number" :value="value.value" @input="emit('update:adjustments', {
                                    ...adjustments,
                                    [key]: { ...value, value: parseInt($event.target.value) }
                                })" min="0" max="255" class="adjustment-number" :disabled="!value.enabled">
                            </div>
                            <button class="reset-icon-btn" @click="emit('update:adjustments', {
                                ...adjustments,
                                [key]: { ...defaultSettings.adjustments[key] }
                            })" title="Reset to default value">↺</button>
                        </template>

                        <template v-else>
                            <input type="checkbox" :checked="value.enabled" @input="emit('update:adjustments', {
                                ...adjustments,
                                [key]: { ...value, enabled: $event.target.checked }
                            })" class="enable-checkbox">
                            <label class="adjustment-label">{{ key.charAt(0).toUpperCase() + key.slice(1) }}:</label>
                            <div class="adjustment-inputs" :class="{ disabled: !value.enabled }">
                                <template v-if="key === 'colorize'">
                                    <input type="color" :value="value.color" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        colorize: { ...value, color: $event.target.value }
                                    })" :disabled="!value.enabled" class="small-color-picker">
                                    <input type="range" :value="value.intensity" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        colorize: { ...value, intensity: parseInt($event.target.value) }
                                    })" min="0" max="100" :disabled="!value.enabled">
                                    <input type="number" :value="value.intensity" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        colorize: { ...value, intensity: parseInt($event.target.value) }
                                    })" min="0" max="100" class="adjustment-number" :disabled="!value.enabled">
                                </template>
                                <template v-else-if="key === 'colorReduce'">
                                    <input type="range" :value="value.levels" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        colorReduce: { ...value, levels: parseInt($event.target.value) }
                                    })" min="1" max="8" :disabled="!value.enabled">
                                    <input type="number" :value="value.levels" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        colorReduce: { ...value, levels: parseInt($event.target.value) }
                                    })" min="1" max="8" class="adjustment-number" :disabled="!value.enabled">
                                </template>
                                <template v-else-if="key === 'invert'">
                                    <input type="range" :value="value.strength" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        invert: { ...value, strength: parseInt($event.target.value) }
                                    })" min="0" max="100" :disabled="!value.enabled">
                                    <input type="number" :value="value.strength" @input="emit('update:adjustments', {
                                        ...adjustments,
                                        invert: { ...value, strength: parseInt($event.target.value) }
                                    })" min="0" max="100" class="adjustment-number" :disabled="!value.enabled">
                                </template>
                            </div>
                            <button class="reset-icon-btn" @click="emit('update:adjustments', {
                                ...adjustments,
                                [key]: { ...defaultSettings.adjustments[key] }
                            })" title="Reset to default value">↺</button>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.controls-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    background: #1a1a1a;
    padding: 15px;
    border-radius: 8px;
}

.preset-controls {
    display: flex;
    gap: 8px;
    align-items: center;
}

.action-buttons {
    display: flex;
    gap: 8px;
}

.randomize-btn {
    background: #7c42b8;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}

.reset-settings-btn {
    background: #666;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}

.randomize-btn:hover {
    background: #6a3899;
}

.reset-settings-btn:hover {
    background: #777;
}

.settings-group {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.adjustment-control {
    background: #2a2a2a;
    padding: 2px 8px;
    border-radius: 0;
    margin-bottom: 0;
}

.adjustment-control:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
}

.adjustment-control:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
}

.adjustment-control+.adjustment-control {
    border-top: 1px solid #222;
}

.adjustment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.adjustment-inputs {
    display: flex;
    gap: 6px;
    align-items: center;
    flex: 1;
}

.adjustment-inputs input[type="range"] {
    flex: 1;
    height: 24px;
}

.adjustment-number {
    width: 50px;
    padding: 2px 4px;
    text-align: center;
}

.toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
}

.colorize-controls,
.color-reduce-controls,
.invert-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.color-picker-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

input[type="color"] {
    width: 40px;
    height: 24px;
    padding: 0;
}

.resolution-inputs {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
}

.input-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.input-group input {
    width: 60px;
    padding: 2px 4px;
}

.reset-value-btn {
    padding: 2px 6px;
    font-size: 0.8em;
}

.settings-panel {
    width: 600px;
    max-width: 100%;
}

.adjustment-row {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
}

.adjustment-label {
    width: 100px;
    flex-shrink: 0;
}

.adjustment-inputs {
    display: flex;
    gap: 6px;
    align-items: center;
    flex: 1;
}

.adjustment-number {
    width: 45px;
    padding: 2px 4px;
    text-align: center;
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
}

.reset-icon-btn:hover {
    background: #333;
    color: #fff;
}

.colorize-controls,
.color-reduce-controls,
.invert-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.toggle {
    width: 100px;
    margin: 0;
}

.adjustment-control {
    padding: 6px 8px;
    margin-bottom: 2px;
}

.settings-group {
    gap: 2px;
}

.enable-checkbox {
    margin-right: 8px;
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.small-color-picker {
    width: 24px !important;
    height: 24px !important;
    padding: 0;
    border: none;
    border-radius: 4px;
}

.adjustment-inputs.disabled {
    opacity: 0.5;
    pointer-events: none;
}

.resolution-settings {
    margin-bottom: 10px;
}

.resolution-inputs {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
}

.trim-toggle {
    margin-left: auto;
}

.trim-toggle input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.trim-section {
    margin-top: 10px;
    margin-bottom: 10px;
    background: #2a2a2a;
    border-radius: 4px;
    padding: 6px 8px;
}
</style>
