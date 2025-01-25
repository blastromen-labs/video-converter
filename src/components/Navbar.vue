<script setup>
import { computed } from 'vue'
import PresetManager from './PresetManager.vue'
import StreamControls from './StreamControls.vue'

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
}

const currentSettings = computed(() => ({
    targetResolution: props.targetResolution,
    adjustments: props.adjustments,
    trimSettings: props.trimSettings
}))

const randomizeSettings = () => {
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
    const randomBool = () => Math.random() > 0.5
    const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')

    const newAdjustments = {
        ...props.adjustments,
        oneBit: {
            enabled: randomBool(),
            threshold: randomInt(0, 255),
            darkColor: randomHex(),
            lightColor: randomHex()
        },
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
            <div class="flex items-center justify-between h-16 gap-4">
                <StreamControls />
                <PresetManager :current-settings="currentSettings" @load-preset="handleLoadPreset" />
            </div>
        </div>
    </nav>
</template>
