<script setup>
import { computed } from 'vue'
import PresetManager from './PresetManager.vue'

const props = defineProps({
    targetResolution: Object,
    adjustments: Object,
    trimSettings: Object,
    defaultSettings: Object,
    videoMetadata: Object
})

const emit = defineEmits(['update:targetResolution', 'update:adjustments', 'update:trimSettings'])

const handleLoadPreset = (settings) => {
    emit('update:targetResolution', { ...settings.targetResolution })
    emit('update:adjustments', { ...settings.adjustments })
    if (settings.trimSettings) {
        emit('update:trimSettings', { ...settings.trimSettings })
    }
}

const currentSettings = computed(() => ({
    targetResolution: props.targetResolution,
    adjustments: props.adjustments,
    trimSettings: props.trimSettings
}))

const resetSettings = () => {
    emit('update:targetResolution', { ...props.defaultSettings.resolution })
    emit('update:adjustments', { ...props.defaultSettings.adjustments })
}

const randomizeSettings = () => {
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
    const randomBool = () => Math.random() > 0.5
    const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')

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
        colorReduce: {
            enabled: randomBool(),
            levels: randomInt(2, 8)
        },
        invert: {
            enabled: randomBool(),
            strength: randomInt(0, 100)
        },
        colorize: {
            enabled: randomBool(),
            color: randomHex(),
            intensity: randomInt(0, 100)
        },
        colorSwap: {
            enabled: randomBool(),
            sourceColor: randomHex(),
            targetColor: randomHex(),
            tolerance: randomInt(0, 100)
        }
    }

    emit('update:adjustments', newAdjustments)
}
</script>

<template>
    <nav class="sticky top-0 z-50 bg-panel-bg/95 backdrop-blur-sm border-b border-border/20 shadow-lg">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center gap-6">
                    <div class="flex items-center gap-2">
                        <label class="text-text-secondary text-sm font-medium">Width:</label>
                        <input type="number" :value="targetResolution.width" min="1" max="1000" class="input w-16"
                            @input="$emit('update:targetResolution', { ...targetResolution, width: parseInt($event.target.value) })">
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-text-secondary text-sm font-medium">Height:</label>
                        <input type="number" :value="targetResolution.height" min="1" max="1000" class="input w-16"
                            @input="$emit('update:targetResolution', { ...targetResolution, height: parseInt($event.target.value) })">
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-text-secondary text-sm font-medium">FPS:</label>
                        <input type="number" :value="targetResolution.fps" min="1" max="60" class="input w-16"
                            @input="$emit('update:targetResolution', { ...targetResolution, fps: parseInt($event.target.value) })">
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <PresetManager :current-settings="currentSettings" @load-preset="handleLoadPreset" />
                    <div class="flex items-center gap-2">
                        <button class="btn hover:bg-control-bg/80" @click="randomizeSettings"
                            title="Randomize settings">
                            <span class="text-lg">🎲</span>
                        </button>
                        <button class="btn hover:bg-control-bg/80" @click="resetSettings" title="Reset all settings">
                            <span class="text-lg">↺</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>
