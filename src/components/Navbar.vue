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
