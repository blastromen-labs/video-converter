<script setup>
const props = defineProps({
    enabled: Boolean,
    startTime: Number,
    endTime: Number,
    duration: Number,
    resolution: {
        type: Object,
        required: true,
        default: () => ({
            width: 40,
            height: 96,
            fps: 30
        })
    }
})

const emit = defineEmits(['update:enabled', 'update:startTime', 'update:endTime', 'update:resolution'])
</script>

<template>
    <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
            <div class="flex items-center gap-2">
                <label class="text-sm text-text-secondary">Width:</label>
                <input type="number" :value="resolution.width" min="1" max="1000" class="input w-16"
                    @input="emit('update:resolution', { ...resolution, width: parseInt($event.target.value) })">
            </div>
            <div class="flex items-center gap-2">
                <label class="text-sm text-text-secondary">Height:</label>
                <input type="number" :value="resolution.height" min="1" max="1000" class="input w-16"
                    @input="emit('update:resolution', { ...resolution, height: parseInt($event.target.value) })">
            </div>
            <div class="flex items-center gap-2">
                <label class="text-sm text-text-secondary">FPS:</label>
                <input type="number" :value="resolution.fps" min="1" max="60" class="input w-16"
                    @input="emit('update:resolution', { ...resolution, fps: parseInt($event.target.value) })">
            </div>
        </div>

        <div class="trim-controls">
            <div class="flex items-center gap-2 mb-3">
                <label class="text-sm text-text-secondary">Trim Video:</label>
                <input type="checkbox" :checked="enabled" @input="emit('update:enabled', $event.target.checked)"
                    class="form-checkbox bg-control-bg border-border rounded text-accent focus:ring-accent">
            </div>

            <div v-if="enabled" class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                    <label class="text-sm text-text-secondary">Start:</label>
                    <input type="number" :value="startTime"
                        @input="emit('update:startTime', parseFloat($event.target.value))" :min="0" :max="endTime"
                        :step="0.1" class="input w-20">
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-text-secondary">End:</label>
                    <input type="number" :value="endTime"
                        @input="emit('update:endTime', parseFloat($event.target.value))" :min="startTime"
                        :max="duration" :step="0.1" class="input w-20">
                </div>
            </div>
        </div>
    </div>
</template>
