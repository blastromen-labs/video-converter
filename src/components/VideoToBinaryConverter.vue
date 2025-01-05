<script setup>
import { ref, watch, computed } from 'vue'

const dropZone = ref(null)
const fileInput = ref(null)
const isConverting = ref(false)
const convertedFile = ref(null)
const fileName = ref('')
const videoMetadata = ref(null)
const videoPreview = ref(null)
const previewCanvas = ref(null)
const previewUrl = ref(null)

// Add resolution settings
const targetResolution = ref({
  width: 40,
  height: 96,
  fps: 30
})

// Add contrast threshold setting
const contrastThreshold = ref(128)

// Add new adjustment settings
const adjustments = ref({
  contrast: 128,
  highlights: 128,
  shadows: 128,
  brightness: 128,
  hue: 128,
  saturation: 128
})

// Add trim settings
const trimSettings = ref({
  start: 0,
  end: 0,
  enabled: false
})

// Remove static FPS constants and use the ref value
const frameDelay = computed(() => 1000 / targetResolution.value.fps)

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

const parseTime = (timeString) => {
  const [mins, rest] = timeString.split(':')
  const [secs, ms] = rest.split('.')
  return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000
}

const getVideoMetadata = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const width = video.videoWidth
      const height = video.videoHeight

      // Calculate simplified ratio
      const gcd = (a, b) => b ? gcd(b, a % b) : a
      const divisor = gcd(width, height)
      const simplifiedRatio = `${width/divisor}:${height/divisor}`

      // Get framerate if available
      let fps = 30; // default fallback
      if (video.webkitDecodedFrameCount) {
        fps = Math.round(video.webkitDecodedFrameCount / video.duration)
      } else if (video.mozDecodedFrames) {
        fps = Math.round(video.mozDecodedFrames / video.duration)
      }

      const metadata = {
        width,
        height,
        aspectRatio: simplifiedRatio,
        duration: video.duration.toFixed(2),
        fps
      }
      URL.revokeObjectURL(video.src)

      // Set initial end time when video is loaded
      trimSettings.value.end = video.duration

      resolve(metadata)
    }
    video.src = URL.createObjectURL(file)
  })
}

const cropToAspectRatio = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight

  let sx, sy, sWidth, sHeight

  if (sourceRatio > targetRatio) {
    // Source is wider - crop the width
    sHeight = sourceHeight
    sWidth = sourceHeight * targetRatio
    sy = 0
    sx = (sourceWidth - sWidth) / 2
  } else {
    // Source is taller - crop the height
    sWidth = sourceWidth
    sHeight = sourceWidth / targetRatio
    sx = 0
    sy = (sourceHeight - sHeight) / 2
  }

  return { sx, sy, sWidth, sHeight }
}

const resizeVideo = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    let frames = []

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetResolution.value.width
      canvas.height = targetResolution.value.height
      const ctx = canvas.getContext('2d')

      const startTime = trimSettings.value.enabled ? trimSettings.value.start : 0
      const endTime = trimSettings.value.enabled ? trimSettings.value.end : video.duration
      const duration = endTime - startTime

      const totalFrames = Math.floor(duration * targetResolution.value.fps)
      let currentFrame = 0

      const processFrame = () => {
        // Calculate crop dimensions
        const crop = cropToAspectRatio(
          video.videoWidth,
          video.videoHeight,
          targetResolution.value.width,
          targetResolution.value.height
        )

        // Draw with crop
        ctx.drawImage(
          video,
          crop.sx, crop.sy, crop.sWidth, crop.sHeight,  // Source (cropped) rectangle
          0, 0, canvas.width, canvas.height              // Destination rectangle
        )

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Create Uint8Array for the frame
        const frameData = new Uint8Array(canvas.width * canvas.height * 3)
        let frameIndex = 0

        for (let i = 0; i < data.length; i += 4) {
          // Convert RGB to HSL and apply color adjustments
          let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])

          // Apply hue adjustment (-180 to +180 degrees)
          h += (adjustments.value.hue - 128) * 1.4
          h = (h + 360) % 360

          // Apply saturation adjustment
          s *= adjustments.value.saturation / 128
          s = Math.max(0, Math.min(100, s))

          // Convert back to RGB
          let [r, g, b] = hslToRgb(h, s, l)

          // Apply other adjustments to each channel
          for (let j = 0; j < 3; j++) {
            let value = j === 0 ? r : j === 1 ? g : b

            // Apply brightness
            value += (adjustments.value.brightness - 128)

            // Apply contrast
            value = ((value - 128) * (adjustments.value.contrast / 128)) + 128

            // Apply highlights to bright areas
            if (value > 128) {
              value += (adjustments.value.highlights - 128) * ((value - 128) / 128)
            }

            // Apply shadows to dark areas
            if (value < 128) {
              value += (adjustments.value.shadows - 128) * ((128 - value) / 128)
            }

            // Store directly in Uint8Array
            frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(value)))
          }
        }

        frames.push(frameData)
        currentFrame++

        if (currentFrame < totalFrames) {
          video.currentTime = startTime + (currentFrame / targetResolution.value.fps)
        } else {
          URL.revokeObjectURL(video.src)
          const totalSize = frames.reduce((sum, frame) => sum + frame.length, 0)
          const finalData = new Uint8Array(totalSize)
          let offset = 0
          frames.forEach(frame => {
            finalData.set(frame, offset)
            offset += frame.length
          })
          resolve(finalData)
        }
      }

      video.onseeked = processFrame
      video.currentTime = startTime
    }

    video.src = URL.createObjectURL(file)
  })
}

// Add RGB to HSL conversion helper
const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return [h * 360, s * 100, l * 100]
}

// Add HSL to RGB conversion helper
const hslToRgb = (h, s, l) => {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return [r * 255, g * 255, b * 255]
}

const updatePreview = async () => {
  if (!videoPreview.value || !previewCanvas.value) return

  const ctx = previewCanvas.value.getContext('2d')

  // Fix parameter order
  const crop = cropToAspectRatio(
    videoPreview.value.videoWidth,
    videoPreview.value.videoHeight,
    targetResolution.value.width,
    targetResolution.value.height
  )

  ctx.drawImage(
    videoPreview.value,
    crop.sx, crop.sy, crop.sWidth, crop.sHeight,
    0, 0, previewCanvas.value.width, previewCanvas.value.height
  )

  const imageData = ctx.getImageData(0, 0, previewCanvas.value.width, previewCanvas.value.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    // Convert RGB to HSL
    let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])

    // Apply hue adjustment (-180 to +180 degrees)
    h += (adjustments.value.hue - 128) * 1.4
    h = (h + 360) % 360

    // Apply saturation adjustment
    s *= adjustments.value.saturation / 128
    s = Math.max(0, Math.min(100, s))

    // Convert back to RGB
    let [r, g, b] = hslToRgb(h, s, l)

    // Apply other adjustments to each channel
    for (let j = 0; j < 3; j++) {
      let value = j === 0 ? r : j === 1 ? g : b

      // Apply brightness
      value += (adjustments.value.brightness - 128)

      // Apply contrast
      value = ((value - 128) * (adjustments.value.contrast / 128)) + 128

      // Apply highlights to bright areas
      if (value > 128) {
        value += (adjustments.value.highlights - 128) * ((value - 128) / 128)
      }

      // Apply shadows to dark areas
      if (value < 128) {
        value += (adjustments.value.shadows - 128) * ((128 - value) / 128)
      }

      data[i + j] = Math.max(0, Math.min(255, value))
    }
    data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
}

const handleFile = async (file) => {
  if (!file || !['video/mp4', 'video/quicktime'].includes(file.type)) {
    alert('Please select a valid .mp4 or .mov file')
    return
  }

  isConverting.value = true
  fileName.value = file.name.replace(/\.(mp4|mov)$/i, '.bin')

  try {
    // Set up video preview
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = URL.createObjectURL(file)

    // Get video metadata first
    videoMetadata.value = await getVideoMetadata(file)

    // Process video with target resolution
    const binary = await resizeVideo(file)

    // Create and download .bin file
    const blob = new Blob([binary.buffer], { type: 'application/octet-stream' })
    convertedFile.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('Conversion failed:', error)
    alert('Failed to convert file')
  } finally {
    isConverting.value = false
  }
}

const handleDrop = async (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  await handleFile(file)
}

const handleFileSelect = async (e) => {
  const file = e.target.files[0]
  await handleFile(file)
}

const preventDefault = (e) => {
  e.preventDefault()
}

// Add a flag to track if settings have changed since last conversion
const settingsChanged = ref(false)

// Watch all settings for changes after conversion
watch([adjustments, targetResolution, trimSettings], () => {
  if (convertedFile.value) {
    settingsChanged.value = true
  }
}, { deep: true })

// Add reconvert function
const reconvert = async () => {
  if (!previewUrl.value) return

  isConverting.value = true
  try {
    const file = await fetch(previewUrl.value).then(r => r.blob())
    const binary = await resizeVideo(file)

    // Clean up old blob URL
    URL.revokeObjectURL(convertedFile.value)

    // Create new blob and URL
    const blob = new Blob([binary.buffer], { type: 'application/octet-stream' })
    convertedFile.value = URL.createObjectURL(blob)
    settingsChanged.value = false
  } catch (error) {
    console.error('Reconversion failed:', error)
    alert('Failed to reconvert file')
  } finally {
    isConverting.value = false
  }
}

// Update resetConverter to also reset settingsChanged
const resetConverter = () => {
  convertedFile.value = null
  videoMetadata.value = null
  settingsChanged.value = false
  // Clear video preview
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Watch for changes in contrast threshold to update preview
watch(contrastThreshold, () => {
  updatePreview()
})

// Update watcher to watch all adjustments
watch(adjustments, () => {
  updatePreview()
}, { deep: true })

// Add default values as constants
const DEFAULT_SETTINGS = {
  resolution: {
    width: 40,
    height: 96,
    fps: 30
  },
  adjustments: {
    contrast: 128,
    highlights: 128,
    shadows: 128,
    brightness: 128,
    hue: 128,
    saturation: 128
  },
  trim: {
    start: 0,
    end: 0,
    enabled: false
  }
}

// Add reset settings function
const resetSettings = () => {
  targetResolution.value = { ...DEFAULT_SETTINGS.resolution }
  adjustments.value = { ...DEFAULT_SETTINGS.adjustments }
  trimSettings.value = {
    ...DEFAULT_SETTINGS.trim,
    end: videoMetadata.value?.duration || 0
  }
  settingsChanged.value = true
}

const incrementTime = (type, seconds) => {
  const value = trimSettings.value[type]
  const newValue = Math.max(0, value + seconds)
  if (type === 'start') {
    trimSettings.value.start = Math.min(newValue, trimSettings.value.end)
  } else {
    trimSettings.value.end = Math.min(newValue, videoMetadata.value?.duration || 0)
  }
}

const resetTrimTimes = () => {
  trimSettings.value.start = 0
  trimSettings.value.end = videoMetadata.value?.duration || 0
}
</script>

<template>
  <div class="converter-container">
    <div class="main-content">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>Output Settings</h3>
          <button
            class="reset-settings-btn"
            @click="resetSettings"
            title="Reset all settings to default values"
          >
            Reset Settings
          </button>
        </div>
        <div class="settings-group">
          <div class="resolution-inputs">
            <div class="input-group">
              <label for="width">Width:</label>
              <input
                id="width"
                type="number"
                v-model="targetResolution.width"
                min="1"
              >
            </div>
            <div class="input-group">
              <label for="height">Height:</label>
              <input
                id="height"
                type="number"
                v-model="targetResolution.height"
                min="1"
              >
            </div>
            <div class="input-group">
              <label for="fps">FPS:</label>
              <input
                id="fps"
                type="number"
                v-model="targetResolution.fps"
                min="1"
                max="60"
              >
            </div>
          </div>

          <div class="adjustment-controls">
            <div class="adjustment-control">
              <div class="adjustment-header">
                <label for="contrast">Contrast:</label>
                <button
                  class="reset-value-btn"
                  @click="adjustments.contrast = DEFAULT_SETTINGS.adjustments.contrast"
                  title="Reset to default value"
                >
                  Reset
                </button>
              </div>
              <div class="adjustment-inputs">
                <input
                  id="contrast-slider"
                  type="range"
                  v-model="adjustments.contrast"
                  min="0"
                  max="255"
                  step="1"
                >
                <input
                  type="number"
                  v-model="adjustments.contrast"
                  min="0"
                  max="255"
                  class="adjustment-number"
                >
              </div>
            </div>

            <div class="adjustment-control">
              <div class="adjustment-header">
                <label for="highlights">Highlights:</label>
                <button
                  class="reset-value-btn"
                  @click="adjustments.highlights = DEFAULT_SETTINGS.adjustments.highlights"
                  title="Reset to default value"
                >
                  Reset
                </button>
              </div>
              <div class="adjustment-inputs">
                <input
                  id="highlights-slider"
                  type="range"
                  v-model="adjustments.highlights"
                  min="0"
                  max="255"
                  step="1"
                >
                <input
                  type="number"
                  v-model="adjustments.highlights"
                  min="0"
                  max="255"
                  class="adjustment-number"
                >
              </div>
            </div>

            <div class="adjustment-control">
              <div class="adjustment-header">
                <label for="shadows">Shadows:</label>
                <button
                  class="reset-value-btn"
                  @click="adjustments.shadows = DEFAULT_SETTINGS.adjustments.shadows"
                  title="Reset to default value"
                >
                  Reset
                </button>
              </div>
              <div class="adjustment-inputs">
                <input
                  id="shadows-slider"
                  type="range"
                  v-model="adjustments.shadows"
                  min="0"
                  max="255"
                  step="1"
                >
                <input
                  type="number"
                  v-model="adjustments.shadows"
                  min="0"
                  max="255"
                  class="adjustment-number"
                >
              </div>
            </div>

            <div class="adjustment-control">
              <div class="adjustment-header">
                <label for="brightness">Brightness:</label>
                <button
                  class="reset-value-btn"
                  @click="adjustments.brightness = DEFAULT_SETTINGS.adjustments.brightness"
                  title="Reset to default value"
                >
                  Reset
                </button>
              </div>
              <div class="adjustment-inputs">
                <input
                  id="brightness-slider"
                  type="range"
                  v-model="adjustments.brightness"
                  min="0"
                  max="255"
                  step="1"
                >
                <input
                  type="number"
                  v-model="adjustments.brightness"
                  min="0"
                  max="255"
                  class="adjustment-number"
                >
              </div>
            </div>

            <div class="adjustment-control">
              <div class="adjustment-header">
                <label for="hue">Hue:</label>
                <button
                  class="reset-value-btn"
                  @click="adjustments.hue = DEFAULT_SETTINGS.adjustments.hue"
                  title="Reset to default value"
                >
                  Reset
                </button>
              </div>
              <div class="adjustment-inputs">
                <input
                  id="hue-slider"
                  type="range"
                  v-model="adjustments.hue"
                  min="0"
                  max="255"
                  step="1"
                >
                <input
                  type="number"
                  v-model="adjustments.hue"
                  min="0"
                  max="255"
                  class="adjustment-number"
                >
              </div>
            </div>

            <div class="adjustment-control">
              <div class="adjustment-header">
                <label for="saturation">Saturation:</label>
                <button
                  class="reset-value-btn"
                  @click="adjustments.saturation = DEFAULT_SETTINGS.adjustments.saturation"
                  title="Reset to default value"
                >
                  Reset
                </button>
              </div>
              <div class="adjustment-inputs">
                <input
                  id="saturation-slider"
                  type="range"
                  v-model="adjustments.saturation"
                  min="0"
                  max="255"
                  step="1"
                >
                <input
                  type="number"
                  v-model="adjustments.saturation"
                  min="0"
                  max="255"
                  class="adjustment-number"
                >
              </div>
            </div>
          </div>

          <div class="trim-controls">
            <div class="trim-header">
              <h4>Trim Video</h4>
              <div class="trim-header-controls">
                <button
                  class="reset-value-btn"
                  @click="resetTrimTimes"
                  title="Reset trim times"
                >
                  Reset
                </button>
                <label class="trim-toggle">
                  <input
                    type="checkbox"
                    v-model="trimSettings.enabled"
                  >
                  Enable trim
                </label>
              </div>
            </div>

            <div class="trim-inputs" :class="{ disabled: !trimSettings.enabled }">
              <div class="trim-input">
                <label for="trim-start">Start Time:</label>
                <div class="time-input-group">
                  <input
                    id="trim-start"
                    type="text"
                    :value="formatTime(trimSettings.start)"
                    @change="e => trimSettings.start = parseTime(e.target.value)"
                    :disabled="!trimSettings.enabled"
                    pattern="[0-9]+:[0-5][0-9].[0-9]{3}"
                    placeholder="0:00.000"
                  >
                  <div class="time-controls">
                    <button
                      @click="incrementTime('start', 1)"
                      :disabled="!trimSettings.enabled"
                      title="Add 1 second"
                    >
                      ▲
                    </button>
                    <button
                      @click="incrementTime('start', -1)"
                      :disabled="!trimSettings.enabled"
                      title="Subtract 1 second"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              <div class="trim-input">
                <label for="trim-end">End Time:</label>
                <div class="time-input-group">
                  <input
                    id="trim-end"
                    type="text"
                    :value="formatTime(trimSettings.end)"
                    @change="e => trimSettings.end = parseTime(e.target.value)"
                    :disabled="!trimSettings.enabled"
                    pattern="[0-9]+:[0-5][0-9].[0-9]{3}"
                    placeholder="0:00.000"
                  >
                  <div class="time-controls">
                    <button
                      @click="incrementTime('end', 1)"
                      :disabled="!trimSettings.enabled"
                      title="Add 1 second"
                    >
                      ▲
                    </button>
                    <button
                      @click="incrementTime('end', -1)"
                      :disabled="!trimSettings.enabled"
                      title="Subtract 1 second"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref="dropZone"
        class="drop-zone"
        @drop="handleDrop"
        @dragover="preventDefault"
        @dragenter="preventDefault"
      >
        <div v-if="!isConverting && !convertedFile" class="drop-message">
          <p>Drop your .mp4 or .mov file here</p>
          <p>or</p>
          <button class="select-btn" @click="fileInput.click()">
            Select file from computer
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="video/mp4,video/quicktime"
            class="hidden"
            @change="handleFileSelect"
          >
        </div>

        <div v-if="videoMetadata" class="metadata">
          <h3>Video Information:</h3>
          <p>Resolution: {{ videoMetadata.width }}x{{ videoMetadata.height }}</p>
          <p>Aspect Ratio: {{ videoMetadata.aspectRatio }}</p>
          <p>Duration: {{ videoMetadata.duration }}s</p>
          <p>Original FPS: {{ videoMetadata.fps }}</p>
        </div>

        <div v-if="isConverting" class="converting">
          Converting...
        </div>

        <div v-if="convertedFile" class="success">
          <p>Conversion complete!</p>
          <div class="button-group">
            <a :href="convertedFile" :download="fileName" class="download-btn">
              Download .bin file
            </a>
            <button
              v-if="settingsChanged"
              class="reconvert-btn"
              @click="reconvert"
              :disabled="isConverting"
            >
              Reconvert with new settings
            </button>
            <button
              class="reset-btn"
              @click="resetConverter"
            >
              Convert another file
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-section" v-if="previewUrl">
      <h4>Video Preview</h4>
      <div class="preview-row">
        <div class="preview-box">
          <h5>Original</h5>
          <video
            ref="videoPreview"
            :src="previewUrl"
            controls
            @loadeddata="updatePreview"
            @timeupdate="updatePreview"
          ></video>
        </div>

        <div class="preview-box">
          <h5>Conversion</h5>
          <canvas
            ref="previewCanvas"
            :width="targetResolution.width"
            :height="targetResolution.height"
            class="preview-canvas"
          ></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed #888;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin: 20px 0;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.drop-message {
  color: #888;
  font-size: 1.2em;
}

.converting {
  color: #666;
}

.success {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.download-btn, .reset-btn {
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.download-btn {
  background-color: #42b883;
  color: white;
  text-decoration: none;
}

.reset-btn {
  background-color: #666;
  color: white;
  border: none;
}

.download-btn:hover, .reset-btn:hover {
  opacity: 0.9;
}

.hidden {
  display: none;
}

.select-btn {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 10px;
}

.select-btn:hover {
  opacity: 0.9;
}

.drop-message p {
  margin: 5px 0;
}

.metadata {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  text-align: left;
}

.metadata h3 {
  margin: 0 0 10px 0;
  color: #42b883;
}

.metadata p {
  margin: 5px 0;
  color: #666;
}

.converter-container {
  display: grid;
  grid-template-columns: 1fr 600px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-section {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: fit-content;
  background: #1a1a1a;
  padding: 20px;
  border-radius: 8px;
}

.preview-section h4 {
  margin: 0 0 10px 0;
  color: #42b883;
}

.preview-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.preview-box {
  background: #2a2a2a;
  padding: 15px;
  border-radius: 8px;
}

.preview-box h5 {
  margin: 0 0 10px 0;
  color: #888;
  font-size: 0.9em;
}

.preview-box video,
.preview-box canvas {
  width: 100%;
  border-radius: 4px;
  max-height: 400px;
  object-fit: contain;
  background: #000;
}

.preview-canvas {
  image-rendering: pixelated;
  border: 1px solid #333;
  height: 400px;
}

.settings-panel {
  background-color: #1a1a1a;
  padding: 20px;
  border-radius: 8px;
}

.settings-panel h3 {
  margin: 0 0 15px 0;
  color: #42b883;
}

.resolution-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group label {
  color: #888;
}

.input-group input {
  background-color: #2a2a2a;
  border: 1px solid #333;
  color: #fff;
  width: 70px;
  padding: 5px;
  border-radius: 4px;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.adjustment-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.adjustment-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.adjustment-control label {
  color: #888;
}

.adjustment-inputs {
  display: flex;
  align-items: center;
  gap: 15px;
}

.adjustment-inputs input[type="range"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #333;
  outline: none;
  -webkit-appearance: none;
}

.adjustment-inputs input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #42b883;
  cursor: pointer;
}

.adjustment-inputs input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #42b883;
  cursor: pointer;
  border: none;
}

.adjustment-number {
  width: 60px;
  padding: 5px;
  border: 1px solid #333;
  border-radius: 4px;
  text-align: center;
  background-color: #2a2a2a;
  color: #fff;
}

/* Responsive design for smaller screens */
@media (max-width: 1200px) {
  .converter-container {
    grid-template-columns: 1fr;
  }

  .preview-section {
    position: static;
  }

  .preview-row {
    grid-template-columns: 1fr;
  }
}

.trim-controls {
  background: #2a2a2a;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #333;
}

.trim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.trim-header h4 {
  margin: 0;
  color: #42b883;
}

.trim-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  cursor: pointer;
}

.trim-inputs {
  display: flex;
  gap: 20px;
}

.trim-inputs.disabled {
  opacity: 0.5;
}

.trim-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.trim-input label {
  color: #888;
  font-size: 0.9em;
}

.trim-input input {
  padding: 8px;
  border: 1px solid #333;
  border-radius: 4px;
  font-family: monospace;
  background-color: #2a2a2a;
  color: #fff;
}

.trim-input input:disabled {
  background-color: #222;
  color: #666;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reconvert-btn {
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.reconvert-btn:hover {
  opacity: 0.9;
}

.reconvert-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.settings-header h3 {
  margin: 0;
}

.reset-settings-btn {
  background-color: #333;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.reset-settings-btn:hover {
  background-color: #444;
}

.adjustment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reset-value-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 0.8em;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.2s;
}

.reset-value-btn:hover {
  background-color: #333;
  color: #fff;
}

.trim-header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.time-input-group {
  display: flex;
  align-items: stretch;
  gap: 5px;
}

.time-input-group input {
  flex: 1;
  font-family: monospace;
  font-size: 1.1em;
  text-align: center;
}

.time-controls {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-controls button {
  background: #333;
  border: none;
  color: #888;
  width: 24px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 3px;
  font-size: 0.8em;
  transition: all 0.2s;
}

.time-controls button:hover {
  background: #444;
  color: #fff;
}

.time-controls button:disabled {
  background: #222;
  color: #444;
  cursor: not-allowed;
}
</style>
