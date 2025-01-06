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

    const newAdjustments = {
        ...props.adjustments,
        contrast: randomInt(0, 255),
        highlights: randomInt(0, 255),
        midtones: randomInt(0, 255),
        shadows: randomInt(0, 255),
        brightness: randomInt(0, 255),
        hue: randomInt(0, 255),
        saturation: randomInt(0, 255),
        colorize: {
            ...props.adjustments.colorize,
            enabled: Math.random() > 0.5,
            color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            intensity: randomInt(0, 100)
        },
        colorReduce: {
            ...props.adjustments.colorReduce,
            enabled: Math.random() > 0.5,
            levels: randomInt(1, 6)
        },
        invert: {
            ...props.adjustments.invert,
            enabled: Math.random() > 0.5,
            strength: randomInt(0, 100)
        }
    }

    emit('update:adjustments', newAdjustments)
}
</script>

<template>
    <div class="settings-panel">
        <div class="settings-header">
            <h3>Output Settings</h3>
            <div class="settings-header-actions">
                <button class="randomize-btn" @click="randomizeSettings" title="Randomize adjustment settings">
                    Randomize
                </button>
                <button class="reset-settings-btn" @click="resetSettings" title="Reset all settings to default values">
                    Reset Settings
                </button>
            </div>
        </div>

        <PresetManager :current-settings="getCurrentSettings()" @load-preset="handleLoadPreset" />

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
                    <div class="input-group trim-toggle">
                        <label for="trim-enabled">Trim:</label>
                        <input id="trim-enabled" type="checkbox" v-model="trimSettings.enabled"
                            @input="emit('update:trimSettings', { ...trimSettings })">
                    </div>
                </div>

                <TrimVideo v-if="videoMetadata && trimSettings.enabled" v-model:enabled="trimSettings.enabled"
                    v-model:startTime="trimSettings.start" v-model:endTime="trimSettings.end"
                    :duration="videoMetadata?.duration || 0" :onReset="handleTrimReset" />
            </div>

            <div class="adjustment-controls">
                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label class="adjustment-label">Brightness:</label>
                        <div class="adjustment-inputs">
                            <input type="range" v-model="adjustments.brightness" min="0" max="255"
                                @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.brightness" min="0" max="255"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, brightness: defaultSettings.adjustments.brightness })"
                            title="Reset brightness">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label class="adjustment-label">Contrast:</label>
                        <div class="adjustment-inputs">
                            <input id="contrast-slider" type="range" v-model="adjustments.contrast" min="0" max="255"
                                step="1" @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.contrast" min="0" max="255"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, contrast: defaultSettings.adjustments.contrast })"
                            title="Reset to default value">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label for="highlights" class="adjustment-label">Highlights:</label>
                        <div class="adjustment-inputs">
                            <input id="highlights-slider" type="range" v-model="adjustments.highlights" min="0"
                                max="255" step="1" @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.highlights" min="0" max="255"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, highlights: defaultSettings.adjustments.highlights })"
                            title="Reset to default value">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label for="midtones" class="adjustment-label">Midtones:</label>
                        <div class="adjustment-inputs">
                            <input id="midtones-slider" type="range" v-model="adjustments.midtones" min="0" max="255"
                                step="1" @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.midtones" min="0" max="255"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, midtones: defaultSettings.adjustments.midtones })"
                            title="Reset to default value">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label for="shadows" class="adjustment-label">Shadows:</label>
                        <div class="adjustment-inputs">
                            <input id="shadows-slider" type="range" v-model="adjustments.shadows" min="0" max="255"
                                step="1" @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.shadows" min="0" max="255"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, shadows: defaultSettings.adjustments.shadows })"
                            title="Reset to default value">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label for="hue" class="adjustment-label">Hue:</label>
                        <div class="adjustment-inputs">
                            <input id="hue-slider" type="range" v-model="adjustments.hue" min="0" max="255" step="1"
                                @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.hue" min="0" max="255" class="adjustment-number"
                                @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, hue: defaultSettings.adjustments.hue })"
                            title="Reset to default value">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <label for="saturation" class="adjustment-label">Saturation:</label>
                        <div class="adjustment-inputs">
                            <input id="saturation-slider" type="range" v-model="adjustments.saturation" min="0"
                                max="255" step="1" @input="emit('update:adjustments', { ...adjustments })">
                            <input type="number" v-model="adjustments.saturation" min="0" max="255"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, saturation: defaultSettings.adjustments.saturation })"
                            title="Reset to default value">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <input type="checkbox" v-model="adjustments.colorize.enabled"
                            @input="emit('update:adjustments', { ...adjustments })" class="enable-checkbox">
                        <label class="adjustment-label">Colorize:</label>
                        <div class="adjustment-inputs" :class="{ disabled: !adjustments.colorize.enabled }">
                            <input type="color" v-model="adjustments.colorize.color" class="small-color-picker"
                                @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.colorize.enabled">
                            <input type="range" v-model="adjustments.colorize.intensity" min="0" max="100" step="1"
                                @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.colorize.enabled">
                            <input type="number" v-model="adjustments.colorize.intensity" min="0" max="100"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.colorize.enabled">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, colorize: { ...defaultSettings.adjustments.colorize } })"
                            title="Reset colorize settings">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <input type="checkbox" v-model="adjustments.colorReduce.enabled"
                            @input="emit('update:adjustments', { ...adjustments })" class="enable-checkbox">
                        <label class="adjustment-label">Color Reduction:</label>
                        <div class="adjustment-inputs" :class="{ disabled: !adjustments.colorReduce.enabled }">
                            <input type="range" v-model="adjustments.colorReduce.levels" min="1" max="6" step="1"
                                @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.colorReduce.enabled">
                            <input type="number" v-model="adjustments.colorReduce.levels" min="1" max="6"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.colorReduce.enabled">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, colorReduce: { ...defaultSettings.adjustments.colorReduce } })"
                            title="Reset color reduction">
                            ↺
                        </button>
                    </div>
                </div>

                <div class="adjustment-control">
                    <div class="adjustment-row">
                        <input type="checkbox" v-model="adjustments.invert.enabled"
                            @input="emit('update:adjustments', { ...adjustments })" class="enable-checkbox">
                        <label class="adjustment-label">Invert:</label>
                        <div class="adjustment-inputs" :class="{ disabled: !adjustments.invert.enabled }">
                            <input type="range" v-model="adjustments.invert.strength" min="0" max="100" step="1"
                                @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.invert.enabled">
                            <input type="number" v-model="adjustments.invert.strength" min="0" max="100"
                                class="adjustment-number" @input="emit('update:adjustments', { ...adjustments })"
                                :disabled="!adjustments.invert.enabled">
                        </div>
                        <button class="reset-icon-btn"
                            @click="emit('update:adjustments', { ...adjustments, invert: { ...defaultSettings.adjustments.invert } })"
                            title="Reset invert">
                            ↺
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.settings-header-actions {
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

.randomize-btn:hover {
    background: #6a3899;
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
</style>
