<script setup>
const props = defineProps({
    enabled: Boolean,
    startTime: Number,
    endTime: Number,
    duration: Number
})

const emit = defineEmits(['update:enabled', 'update:startTime', 'update:endTime'])
</script>

<template>
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
                <input type="number" :value="endTime" @input="emit('update:endTime', parseFloat($event.target.value))"
                    :min="startTime" :max="duration" :step="0.1" class="input w-20">
            </div>
        </div>
    </div>
</template>
