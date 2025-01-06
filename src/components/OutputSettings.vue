<script setup>
import { ref } from 'vue'
import TrimVideo from './TrimVideo.vue'

const props = defineProps({
    adjustments: Object,
    trimSettings: Object,
    videoMetadata: Object,
    defaultSettings: Object
})

const emit = defineEmits(['update:adjustments', 'update:trimSettings'])

const sections = ref([
    {
        title: 'Color Adjustments',
        controls: [
            { key: 'brightness', label: 'Brightness' },
            { key: 'contrast', label: 'Contrast' },
            { key: 'redLevel', label: 'Red Level' },
            { key: 'greenLevel', label: 'Green Level' },
            { key: 'blueLevel', label: 'Blue Level' }
        ]
    },
    {
        title: 'Tone Controls',
        controls: [
            { key: 'highlights', label: 'Highlights' },
            { key: 'shadows', label: 'Shadows' },
            { key: 'midtones', label: 'Midtones' }
        ]
    },
    {
        title: 'Effects',
        controls: [
            { key: 'oneBit', label: '1-Bit', type: 'threshold' },
            { key: 'colorReduce', label: 'Color Reduction', type: 'levels' },
            { key: 'invert', label: 'Invert', type: 'strength' },
            { key: 'colorize', label: 'Colorize', type: 'color' },
            { key: 'colorSwap', label: 'Color Swap', type: 'swap' }
        ]
    }
])

const resetValue = (control) => {
    if (!props.defaultSettings?.adjustments?.[control.key]) return
    emit('update:adjustments', {
        ...props.adjustments,
        [control.key]: { ...props.defaultSettings.adjustments[control.key] }
    })
}
</script>

<template>
    <div class="bg-panel-bg rounded-lg shadow-lg overflow-hidden">
        <!-- Trim Controls -->
        <div class="p-4 border-b border-border/20">
            <TrimVideo v-if="videoMetadata" v-model:enabled="trimSettings.enabled"
                v-model:startTime="trimSettings.start" v-model:endTime="trimSettings.end"
                :duration="videoMetadata.duration" />
        </div>

        <!-- Adjustment Controls -->
        <div class="divide-y divide-border/20">
            <div v-for="section in sections" :key="section.title" class="p-4">
                <h3 class="text-sm font-medium text-text-secondary mb-4">{{ section.title }}</h3>
                <div class="space-y-4">
                    <div v-for="control in section.controls" :key="control.key" class="flex items-center gap-3">
                        <input type="checkbox" v-model="adjustments[control.key].enabled"
                            class="form-checkbox h-4 w-4 bg-control-bg border-border rounded text-accent focus:ring-accent focus:ring-offset-0 focus:ring-offset-panel-bg checked:bg-accent checked:border-accent">
                        <label class="text-sm text-text min-w-[120px]">{{ control.label }}</label>

                        <!-- Standard slider -->
                        <template v-if="!control.type">
                            <div class="flex items-center gap-2 flex-1">
                                <input type="range" v-model.number="adjustments[control.key].value"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="255"
                                    class="flex-1 accent-accent">
                                <input type="number" v-model.number="adjustments[control.key].value"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="255"
                                    class="w-12 text-right bg-control-bg border border-border rounded px-1 py-0.5 text-sm text-text-secondary">
                                <button @click="resetValue(control)"
                                    class="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text transition-colors"
                                    :disabled="!adjustments[control.key].enabled" title="Reset to default">
                                    <span class="text-lg">↺</span>
                                </button>
                            </div>
                        </template>

                        <!-- Color reduction levels -->
                        <template v-else-if="control.type === 'levels'">
                            <div class="flex items-center gap-2 flex-1">
                                <input type="range" v-model.number="adjustments[control.key].levels"
                                    :disabled="!adjustments[control.key].enabled" min="2" max="8"
                                    class="flex-1 accent-accent">
                                <input type="number" v-model.number="adjustments[control.key].levels"
                                    :disabled="!adjustments[control.key].enabled" min="2" max="8"
                                    class="w-12 text-right bg-control-bg border border-border rounded px-1 py-0.5 text-sm text-text-secondary">
                                <button @click="resetValue(control)"
                                    class="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text transition-colors"
                                    :disabled="!adjustments[control.key].enabled" title="Reset to default">
                                    <span class="text-lg">↺</span>
                                </button>
                            </div>
                        </template>

                        <!-- Invert strength -->
                        <template v-else-if="control.type === 'strength'">
                            <input type="range" v-model.number="adjustments[control.key].strength"
                                :disabled="!adjustments[control.key].enabled" min="0" max="100"
                                class="flex-1 accent-accent">
                            <div class="flex items-center gap-1">
                                <input type="number" v-model.number="adjustments[control.key].strength"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="100"
                                    class="w-12 text-right bg-control-bg border border-border rounded px-1 py-0.5 text-sm text-text-secondary">
                                <span class="text-text-secondary text-sm">%</span>
                            </div>
                        </template>

                        <!-- Colorize controls -->
                        <template v-else-if="control.type === 'color'">
                            <div class="flex items-center gap-2 flex-1">
                                <input type="color" v-model="adjustments[control.key].color"
                                    :disabled="!adjustments[control.key].enabled" class="color-picker">
                                <input type="range" v-model.number="adjustments[control.key].intensity"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="100"
                                    class="flex-1 accent-accent">

                                <input type="number" v-model.number="adjustments[control.key].intensity"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="100"
                                    class="w-12 text-right bg-control-bg border border-border rounded px-1 py-0.5 text-sm text-text-secondary">
                                <span class="text-text-secondary text-sm">%</span>

                            </div>
                        </template>

                        <!-- Color swap controls -->
                        <template v-else-if="control.type === 'swap'">
                            <div class="flex items-center gap-2 flex-1">
                                <input type="color" v-model="adjustments[control.key].sourceColor"
                                    :disabled="!adjustments[control.key].enabled" class="color-picker">
                                <span class="text-xs text-text-secondary">→</span>
                                <input type="color" v-model="adjustments[control.key].targetColor"
                                    :disabled="!adjustments[control.key].enabled" class="color-picker">
                                <input type="range" v-model.number="adjustments[control.key].tolerance"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="100"
                                    class="w-24 accent-accent">
                                <div class="flex items-center gap-1">
                                    <input type="number" v-model.number="adjustments[control.key].tolerance"
                                        :disabled="!adjustments[control.key].enabled" min="0" max="100"
                                        class="w-12 text-right bg-control-bg border border-border rounded px-1 py-0.5 text-sm text-text-secondary">
                                    <span class="text-text-secondary text-sm">%</span>
                                </div>
                                <button @click="resetValue(control)"
                                    class="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text transition-colors"
                                    :disabled="!adjustments[control.key].enabled" title="Reset to default">
                                    <span class="text-lg">↺</span>
                                </button>
                            </div>
                        </template>

                        <!-- Threshold controls -->
                        <template v-else-if="control.type === 'threshold'">
                            <div class="flex items-center gap-2 flex-1">
                                <input type="color" v-model="adjustments[control.key].darkColor"
                                    :disabled="!adjustments[control.key].enabled" class="color-picker"
                                    title="Dark color">
                                <input type="color" v-model="adjustments[control.key].lightColor"
                                    :disabled="!adjustments[control.key].enabled" class="color-picker"
                                    title="Light color">
                                <input type="range" v-model.number="adjustments[control.key].threshold"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="255"
                                    class="w-24 accent-accent">
                                <input type="number" v-model.number="adjustments[control.key].threshold"
                                    :disabled="!adjustments[control.key].enabled" min="0" max="255"
                                    class="w-12 text-right bg-control-bg border border-border rounded px-1 py-0.5 text-sm text-text-secondary">
                                <button @click="resetValue(control)"
                                    class="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text transition-colors"
                                    :disabled="!adjustments[control.key].enabled" title="Reset to default">
                                    <span class="text-lg">↺</span>
                                </button>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.color-picker {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid #444444;
    border-radius: 4px;
    background: #333333;
}

.color-picker::-webkit-color-swatch-wrapper {
    padding: 0;
}

.color-picker::-webkit-color-swatch {
    border: none;
    border-radius: 3px;
}
</style>
