<script setup>
import { ref, watch, computed } from 'vue'
import VideoPreview from './VideoPreview.vue'
import TrimVideo from './TrimVideo.vue'
import OutputSettings from './OutputSettings.vue'

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
  midtones: 128,
  brightness: 128,
  hue: 128,
  saturation: 128,
  colorize: {
    enabled: false,
    color: '#42b883', // Default color (the Vue green)
    intensity: 50     // 0-100 scale
  },
  colorReduce: {
    enabled: false,
    levels: 2, // 2 for black/white, can go up to 256 for full color
  },
  invert: {
    enabled: false,
    strength: 100
  }
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
      const simplifiedRatio = `${width / divisor}:${height / divisor}`

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
        duration: Number(video.duration),
        fps
      }
      URL.revokeObjectURL(video.src)

      // Set initial end time when video is loaded
      trimSettings.value.end = metadata.duration

      resolve(metadata)
    }
    video.src = URL.createObjectURL(file)
  })
}

const cropToAspectRatio = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight

  // If aspect ratios are nearly identical (accounting for floating point precision)
  if (Math.abs(sourceRatio - targetRatio) < 0.01) {
    return {
      sx: 0,
      sy: 0,
      sWidth: sourceWidth,
      sHeight: sourceHeight
    }
  }

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
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

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
        const frameData = new Uint8Array(canvas.width * canvas.height * 3)
        let frameIndex = 0

        for (let i = 0; i < data.length; i += 4) {
          // Use processPixel instead of inline processing
          const [r, g, b] = processPixel(data[i], data[i + 1], data[i + 2])
          frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(r)))
          frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(g)))
          frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(b)))
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
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [r * 255, g * 255, b * 255]
}

const updatePreview = async () => {
  if (!videoPreview.value || !previewCanvas.value) return

  const ctx = previewCanvas.value.getContext('2d', { willReadFrequently: true })

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
    // Use processPixel instead of inline processing
    const [r, g, b] = processPixel(data[i], data[i + 1], data[i + 2])
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
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
    midtones: 128,
    brightness: 128,
    hue: 128,
    saturation: 128,
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

// Add a new handler for the file input click
const handleNewFile = () => {
  fileInput.value?.click()
}

// Helper function to blend colors
const blendColors = (rgb1, rgb2, intensity) => {
  const blend = intensity / 100
  return [
    rgb1[0] * (1 - blend) + rgb2[0] * blend,
    rgb1[1] * (1 - blend) + rgb2[1] * blend,
    rgb1[2] * (1 - blend) + rgb2[2] * blend
  ]
}

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0]
}

// Update the image processing in updatePreview and resizeVideo
const processPixel = (r, g, b) => {
  // Initialize variables
  let rr = r, gg = g, bb = b

  // Apply color reduction first if enabled and level is 1
  if (adjustments.value.colorReduce.enabled && adjustments.value.colorReduce.levels === 1) {
    // Calculate luminance from original RGB values
    const luminance = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
    return [luminance >= 128 ? 255 : 0, luminance >= 128 ? 255 : 0, luminance >= 128 ? 255 : 0]
  }

  // Convert RGB to HSL and apply adjustments
  const [h, s, l] = rgbToHsl(rr, gg, bb)

  // Apply hue adjustment
  let newH = h + (adjustments.value.hue - 128) * 1.4
  newH = (newH + 360) % 360

  // Apply saturation adjustment
  let newS = s * (adjustments.value.saturation / 128)
  newS = Math.max(0, Math.min(100, newS))

  // Convert back to RGB
  const [r1, g1, b1] = hslToRgb(newH, newS, l)
  rr = r1
  gg = g1
  bb = b1

  // Apply other adjustments
  for (let j = 0; j < 3; j++) {
    let value = j === 0 ? rr : j === 1 ? gg : bb

    value += (adjustments.value.brightness - 128)
    value = ((value - 128) * (adjustments.value.contrast / 128)) + 128

    // Add midtones adjustment between highlights and shadows
    if (value > 128) {
      value += (adjustments.value.highlights - 128) * ((value - 128) / 128)
    } else if (value < 128) {
      value += (adjustments.value.shadows - 128) * ((128 - value) / 128)
    }
    // Apply midtones adjustment with less effect near extremes
    const midtoneFactor = 1 - Math.abs(value - 128) / 128
    value += (adjustments.value.midtones - 128) * midtoneFactor

    if (j === 0) rr = value
    else if (j === 1) gg = value
    else bb = value
  }

  // Apply color reduction for levels > 1
  if (adjustments.value.colorReduce.enabled && adjustments.value.colorReduce.levels > 1) {
    const step = 256 / (adjustments.value.colorReduce.levels - 1)
    rr = Math.round(Math.round(rr / step) * step)
    gg = Math.round(Math.round(gg / step) * step)
    bb = Math.round(Math.round(bb / step) * step)
  }

  // Add invert effect (before colorize)
  if (adjustments.value.invert.enabled) {
    const strength = adjustments.value.invert.strength / 100
    rr = rr * (1 - strength) + (255 - rr) * strength
    gg = gg * (1 - strength) + (255 - gg) * strength
    bb = bb * (1 - strength) + (255 - bb) * strength
  }

  // Apply colorize last
  if (adjustments.value.colorize.enabled) {
    const tintColor = hexToRgb(adjustments.value.colorize.color)
    const luminance = (rr * 0.299 + gg * 0.587 + bb * 0.114) / 255
    const colorizeStrength = luminance < 0.02 ? 0 : 1
    const intensity = (adjustments.value.colorize.intensity / 100) * colorizeStrength
    const [r2, g2, b2] = blendColors([rr, gg, bb], tintColor, intensity * 100)
    rr = r2
    gg = g2
    bb = b2
  }

  return [rr, gg, bb]
}

const processVideoFrame = (imageData) => {
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = processPixel(data[i], data[i + 1], data[i + 2])
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = 255
  }
}

const handleVideoLoaded = (video) => {
  // Handle any initialization needed when video loads
}

const handleTrimReset = () => {
  trimSettings.value.start = 0
  trimSettings.value.end = videoMetadata.value?.duration || 0
}
</script>
<template>
  <div class="converter-container">
    <div class="main-content">
      <OutputSettings v-model:target-resolution="targetResolution" v-model:adjustments="adjustments"
        v-model:trim-settings="trimSettings" :default-settings="DEFAULT_SETTINGS" :video-metadata="videoMetadata" />

      <div v-if="videoMetadata" class="metadata">
        <h3>Video Information:</h3>
        <p>Resolution: {{ videoMetadata.width }}x{{ videoMetadata.height }}</p>
        <p>Aspect Ratio: {{ videoMetadata.aspectRatio }}</p>
        <p>Duration: {{ videoMetadata.duration }}s</p>
        <p>Original FPS: {{ videoMetadata.fps }}</p>
      </div>
    </div>

    <div class="preview-section" @drop="handleDrop" @dragover="preventDefault" @dragenter="preventDefault">
      <div class="preview-header">
        <h4>Video Preview</h4>
        <div class="preview-actions">
          <span v-if="isConverting" class="converting-status">Converting...</span>
          <div v-if="convertedFile && !isConverting" class="button-group">
            <a :href="convertedFile" :download="fileName" class="download-btn">
              Download .bin
            </a>
            <button v-if="settingsChanged" class="reconvert-btn" @click="reconvert" :disabled="isConverting">
              Reconvert
            </button>
            <button class="reset-btn" @click="handleNewFile">
              New file
            </button>
          </div>
          <div v-if="!previewUrl && !isConverting" class="button-group">
            <button class="reset-btn" @click="handleNewFile">
              Select video file
            </button>
          </div>
        </div>
      </div>

      <input ref="fileInput" type="file" accept="video/mp4,video/quicktime" class="hidden" @change="handleFileSelect">

      <VideoPreview v-if="previewUrl" :video-url="previewUrl" :metadata="videoMetadata"
        :preview-width="targetResolution.width" :preview-height="targetResolution.height"
        :process-frame="processVideoFrame" @video-loaded="handleVideoLoaded" />

      <div v-else class="preview-placeholder">
        <p>Drag & drop video file here or use the button above</p>
      </div>
    </div>
  </div>
</template>
