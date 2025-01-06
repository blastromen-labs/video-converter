<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
    currentSettings: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['load-preset'])

const presets = ref([])
const newPresetName = ref('')
const showPresetInput = ref(false)
const showDropdown = ref(false)
const selectedPreset = ref(null)

const DEFAULT_PRESETS = {}

// Load presets from cookies on mount
onMounted(() => {
    const savedPresets = getCookie('video-converter-presets')
    if (savedPresets) {
        presets.value = JSON.parse(savedPresets)
    } else {
        // Start with empty presets
        presets.value = []
        saveToCookie()
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.preset-manager')) {
            showDropdown.value = false
        }
    })
})

const saveNewPreset = () => {
    if (!newPresetName.value.trim()) {
        alert('Please enter a preset name')
        return
    }

    const newPreset = {
        name: newPresetName.value.trim(),
        settings: { ...props.currentSettings }
    }

    presets.value.push(newPreset)
    selectedPreset.value = newPreset
    saveToCookie()
    newPresetName.value = ''
    showPresetInput.value = false
}

const saveCurrentPreset = () => {
    if (!selectedPreset.value) {
        alert('Please select a preset first')
        return
    }

    const index = presets.value.findIndex(p => p.name === selectedPreset.value.name)
    if (index !== -1) {
        presets.value[index] = {
            ...selectedPreset.value,
            settings: { ...props.currentSettings }
        }
        saveToCookie()
        showDropdown.value = false
    }
}

const deletePreset = (preset, event) => {
    event.stopPropagation() // Prevent dropdown from closing
    presets.value = presets.value.filter(p => p.name !== preset.name)
    if (selectedPreset.value?.name === preset.name) {
        selectedPreset.value = null
    }
    saveToCookie()
}

const loadPreset = (preset) => {
    selectedPreset.value = preset
    emit('load-preset', preset.settings)
    showDropdown.value = false
}

const selectPreset = (preset) => {
    selectedPreset.value = preset
}

const saveToCookie = () => {
    document.cookie = `video-converter-presets=${JSON.stringify(presets.value)}; max-age=31536000; path=/`
}

const getCookie = (name) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
}

const toggleDropdown = (event) => {
    event.stopPropagation()
    showDropdown.value = !showDropdown.value
}
</script>

<template>
    <div class="relative preset-manager">
        <button class="btn flex items-center gap-2" @click.stop="showDropdown = !showDropdown">
            <span>{{ selectedPreset ? selectedPreset.name : 'Presets' }}</span>
            <span class="text-xs">▼</span>
        </button>

        <div v-if="showDropdown"
            class="absolute top-full mt-1 right-0 w-64 bg-panel-bg border border-border/20 rounded-lg shadow-lg overflow-hidden">
            <div v-if="selectedPreset" class="p-3 border-b border-border/20 flex items-center justify-between">
                <span class="text-sm text-text-secondary">Selected: {{ selectedPreset.name }}</span>
                <button class="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80"
                    @click.stop="saveCurrentPreset" title="Save current settings to selected preset">
                    Update
                </button>
            </div>

            <div v-if="showPresetInput" class="p-3 border-b border-border/20">
                <div class="flex gap-2">
                    <input type="text" v-model="newPresetName" placeholder="Preset name"
                        class="flex-1 bg-control-bg border border-border rounded px-2 py-1 text-sm text-text"
                        @keyup.enter="saveNewPreset" @keyup.esc="showPresetInput = false">
                    <button
                        class="w-6 h-6 flex items-center justify-center text-accent hover:text-accent/80 transition-colors"
                        @click.stop="saveNewPreset" title="Save preset">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </button>
                    <button
                        class="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text transition-colors"
                        @click.stop="showPresetInput = false" title="Cancel">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="max-h-64 overflow-y-auto">
                <div v-if="presets.length === 0" class="p-4 text-text-secondary text-sm text-center italic">
                    No presets saved
                </div>
                <div v-else v-for="preset in presets" :key="preset.name"
                    class="flex items-center justify-between p-3 hover:bg-control-bg/50 transition-colors"
                    :class="{ 'bg-accent/20 hover:bg-accent/30': preset === selectedPreset }"
                    @click="selectPreset(preset)">
                    <span>{{ preset.name }}</span>
                    <div class="flex items-center gap-2">
                        <button class="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/80"
                            @click.stop="loadPreset(preset)">Load</button>
                        <button class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-500/80"
                            @click.stop="deletePreset(preset, $event)">Delete</button>
                    </div>
                </div>
            </div>

            <div class="p-3 border-t border-border/20">
                <button v-if="!showPresetInput"
                    class="w-full px-3 py-1.5 bg-accent text-white rounded hover:bg-accent/80"
                    @click.stop="showPresetInput = true">Save New Preset</button>
            </div>
        </div>
    </div>
</template>

<style>
/* Remove all custom styles */
</style>
