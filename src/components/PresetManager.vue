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

const DEFAULT_PRESETS = [{
    id: 'blastro-default',
    name: 'Blastro',
    settings: {
        targetResolution: {
            width: 40,
            height: 96,
            fps: 30
        },
        adjustments: {
            contrast: 255,
            highlights: 140,
            midtones: 25,
            shadows: 0,
            brightness: 120,
            hue: 40,
            saturation: 160,
            colorize: {
                enabled: false,
                color: '#42b883',
                intensity: 50
            },
            colorReduce: {
                enabled: false,
                levels: 2
            },
            invert: {
                enabled: false,
                strength: 100
            }
        },
        trimSettings: {
            enabled: false,
            start: 0,
            end: 0
        }
    }
}]

// Load presets from cookies on mount
onMounted(() => {
    const savedPresets = getCookie('video-converter-presets')
    if (savedPresets) {
        presets.value = JSON.parse(savedPresets)
        // Add default preset if it doesn't exist
        if (!presets.value.find(p => p.id === 'blastro-default')) {
            presets.value.unshift(...DEFAULT_PRESETS)
            saveToCookie()
        }
    } else {
        // If no presets exist, add the default ones
        presets.value = [...DEFAULT_PRESETS]
        saveToCookie()
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.preset-dropdown')) {
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
        id: Date.now(),
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

    const index = presets.value.findIndex(p => p.id === selectedPreset.value.id)
    if (index !== -1) {
        presets.value[index] = {
            ...selectedPreset.value,
            settings: { ...props.currentSettings }
        }
        saveToCookie()
    }
}

const deletePreset = (presetId, event) => {
    event.stopPropagation() // Prevent dropdown from closing
    presets.value = presets.value.filter(p => p.id !== presetId)
    if (selectedPreset.value?.id === presetId) {
        selectedPreset.value = null
    }
    saveToCookie()
}

const loadPreset = (preset) => {
    selectedPreset.value = preset
    emit('load-preset', preset.settings)
    showDropdown.value = false
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
    <div class="preset-manager">
        <div class="preset-header">
            <h4>Presets</h4>
            <div class="preset-actions">
                <div class="preset-dropdown" @click.stop>
                    <button class="dropdown-toggle" @click="toggleDropdown">
                        {{ selectedPreset?.name || 'Select Preset' }}
                        <span class="dropdown-arrow" :class="{ 'arrow-up': showDropdown }">▼</span>
                    </button>
                    <div v-if="showDropdown" class="dropdown-menu">
                        <div v-if="presets.length === 0" class="no-presets">
                            No saved presets
                        </div>
                        <div v-else v-for="preset in presets" :key="preset.id" class="preset-item"
                            @click="loadPreset(preset)" :class="{ 'selected': selectedPreset?.id === preset.id }">
                            <span class="preset-name">{{ preset.name }}</span>
                            <button class="delete-btn" @click="deletePreset(preset.id, $event)">
                                ×
                            </button>
                        </div>
                    </div>
                </div>
                <button class="save-btn" :disabled="!selectedPreset"
                    :title="!selectedPreset ? 'Select a preset first' : 'Save current settings to selected preset'"
                    @click="saveCurrentPreset">
                    Save
                </button>
                <button class="save-new-btn" @click="showPresetInput = true">
                    Save New
                </button>
            </div>
        </div>

        <div v-if="showPresetInput" class="preset-input">
            <input type="text" v-model="newPresetName" placeholder="Enter preset name" @keyup.enter="saveNewPreset">
            <div class="preset-input-actions">
                <button class="save-btn" @click="saveNewPreset">Save</button>
                <button class="cancel-btn" @click="showPresetInput = false">Cancel</button>
            </div>
        </div>
    </div>
</template>

<style>
.preset-manager {
    background: #1a1a1a;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
}

.preset-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.preset-header h4 {
    margin: 0;
    color: #42b883;
}

.preset-actions {
    display: flex;
    gap: 8px;
}

.preset-dropdown {
    position: relative;
}

.dropdown-toggle {
    background: #2a2a2a;
    color: white;
    border: 1px solid #333;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    min-width: 150px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dropdown-arrow {
    font-size: 0.8em;
    transition: transform 0.2s;
}

.arrow-up {
    transform: rotate(180deg);
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
}

.dropdown-menu .preset-item {
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
}

.dropdown-menu .preset-item:hover {
    background: #333;
}

.dropdown-menu .preset-name {
    color: white;
    flex-grow: 1;
}

.dropdown-menu .delete-btn {
    background: none;
    border: none;
    color: #ff4444;
    font-size: 1.2em;
    padding: 0 4px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
}

.dropdown-menu .preset-item:hover .delete-btn {
    opacity: 1;
}

.save-preset-btn {
    background: #42b883;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}

.preset-input {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
}

.preset-input input {
    padding: 8px;
    border: 1px solid #333;
    border-radius: 4px;
    background: #2a2a2a;
    color: white;
}

.preset-input-actions {
    display: flex;
    gap: 8px;
}

.save-btn {
    background: #666;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}

.save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.save-btn:not(:disabled):hover {
    background: #777;
}

.save-new-btn {
    background: #42b883;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
}

.save-new-btn:hover {
    background: #3aa876;
}

.cancel-btn {
    background: #666;
    color: white;
}

.presets-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.preset-item {
    background: #2a2a2a;
    padding: 10px;
    border-radius: 4px;
}

.preset-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.preset-name {
    color: #fff;
}

.preset-actions {
    display: flex;
    gap: 8px;
}

.load-btn {
    background: #42b883;
    color: white;
    padding: 4px 8px;
    font-size: 0.8em;
}

.delete-btn {
    background: #ff4444;
    color: white;
    padding: 4px 8px;
    font-size: 0.8em;
}

.no-presets {
    color: #666;
    text-align: center;
    font-style: italic;
    padding: 20px;
}

.dropdown-menu .preset-item.selected {
    background: #42b88333;
}

.dropdown-menu .preset-item.selected:hover {
    background: #42b88355;
}
</style>
