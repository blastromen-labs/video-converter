<script setup>
import { ref, watch, computed } from 'vue'
import VideoPreview from './VideoPreview.vue'
import TrimVideo from './TrimVideo.vue'
import OutputSettings from './OutputSettings.vue'
import ColorAnalyzer from './ColorAnalyzer.vue'
import Navbar from './Navbar.vue'

// Add default values as constants
const DEFAULT_SETTINGS = {
  resolution: {
    width: 40,
    height: 96,
    fps: 30
  },
  adjustments: {
    oneBit: {
      enabled: false,
      threshold: 128,
      darkColor: '#000000',
      lightColor: '#ffffff'
    },
    brightness: {
      enabled: false,
      value: 128
    },
    contrast: {
      enabled: false,
      value: 128
    },
    redLevel: {
      enabled: false,
      value: 128
    },
    greenLevel: {
      enabled: false,
      value: 128
    },
    blueLevel: {
      enabled: false,
      value: 128
    },
    highlights: {
      enabled: false,
      value: 128
    },
    shadows: {
      enabled: false,
      value: 128
    },
    midtones: {
      enabled: false,
      value: 128
    },
    hue: {
      enabled: false,
      value: 128
    },
    saturation: {
      enabled: false,
      value: 128
    },
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
    },
    colorSwap: {
      enabled: false,
      sourceColor: '#0000ff',
      targetColor: '#000000',
      tolerance: 50
    }
  }
}

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
const targetResolution = ref({ ...DEFAULT_SETTINGS.resolution })

// Add contrast threshold setting
const contrastThreshold = ref(128)

// Initialize adjustments with default values
const adjustments = ref({ ...DEFAULT_SETTINGS.adjustments })

// Add trim settings
const trimSettings = ref({
  enabled: false,
  start: 0,
  end: 0
})

// Remove static FPS constant s and use the ref value
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

      // Calculate original video aspect ratio
      const gcd = (a, b) => b ? gcd(b, a % b) : a
      const sourceDiv = gcd(width, height)
      const sourceRatio = `${width / sourceDiv}:${height / sourceDiv}`

      // Calculate target aspect ratio
      const targetWidth = targetResolution.value.width
      const targetHeight = targetResolution.value.height
      const targetDiv = gcd(targetWidth, targetHeight)
      const targetRatio = `${targetWidth / targetDiv}:${targetHeight / targetDiv}`

      const metadata = {
        width,
        height,
        sourceAspectRatio: sourceRatio,
        targetAspectRatio: targetRatio,
        duration: Number(video.duration),
        fps: video.webkitDecodedFrameCount ?
          Math.round(video.webkitDecodedFrameCount / video.duration) : 30
      }
      URL.revokeObjectURL(video.src)

      trimSettings.value.end = metadata.duration
      resolve(metadata)
    }
    video.src = URL.createObjectURL(file)
  })
}

const cropToAspectRatio = (sourceWidth, sourceHeight, targetWidth, targetHeight) => {
  // Calculate target aspect ratio from output dimensions
  const targetRatio = targetWidth / targetHeight

  // Calculate dimensions that will fill the target area
  let sWidth, sHeight, sx, sy

  // Calculate scale to fit source into target aspect ratio
  if (sourceWidth / sourceHeight > targetRatio) {
    // Source is wider than target - fit to height
    sHeight = sourceHeight
    sWidth = sourceHeight * targetRatio
    sx = (sourceWidth - sWidth) / 2
    sy = 0
  } else {
    // Source is taller than target - fit to width
    sWidth = sourceWidth
    sHeight = sourceWidth / targetRatio
    sx = 0
    sy = (sourceHeight - sHeight) / 2
  }

  // Round values to avoid sub-pixel rendering
  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sWidth: Math.round(sWidth),
    sHeight: Math.round(sHeight)
  }
}

const resizeVideo = (file, startTime, endTime, onProgress) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'

    const frames = []
    let currentFrame = 0
    const canvas = document.createElement('canvas')
    canvas.width = targetResolution.value.width
    canvas.height = targetResolution.value.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const cleanup = () => {
      URL.revokeObjectURL(video.src)
      video.onloadedmetadata = null
      video.onseeked = null
      video.onerror = null
    }

    const finishConversion = () => {
      const totalSize = frames.reduce((sum, frame) => sum + frame.length, 0)
      const finalData = new Uint8Array(totalSize)
      let offset = 0
      frames.forEach(frame => {
        finalData.set(frame, offset)
        offset += frame.length
      })
      cleanup()
      resolve(finalData)
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Video loading failed'))
    }

    const processFrame = () => {
      try {
        if (abortController.value?.signal.aborted) {
          cleanup()
          reject(new Error('Conversion cancelled'))
          return
        }

        const totalFrames = Math.ceil((endTime - startTime) * targetResolution.value.fps)

        if (currentFrame < totalFrames) {
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
            crop.sx, crop.sy, crop.sWidth, crop.sHeight,
            0, 0, canvas.width, canvas.height
          )

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          const frameData = new Uint8Array(canvas.width * canvas.height * 3)
          let frameIndex = 0

          for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = processPixel(data[i], data[i + 1], data[i + 2])
            frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(r)))
            frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(g)))
            frameData[frameIndex++] = Math.max(0, Math.min(255, Math.round(b)))
          }

          frames.push(frameData)
          currentFrame++
          onProgress?.(currentFrame)

          const nextTime = startTime + (currentFrame / targetResolution.value.fps)
          if (nextTime <= endTime) {
            video.currentTime = nextTime
          } else {
            finishConversion()
          }
        } else {
          finishConversion()
        }
      } catch (error) {
        cleanup()
        reject(error)
      }
    }

    video.onloadedmetadata = () => {
      // Validate time values after we have video duration
      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) ||
        startTime < 0 || endTime > video.duration || startTime >= endTime) {
        cleanup()
        reject(new Error(`Invalid time range: ${startTime} - ${endTime} (duration: ${video.duration})`))
        return
      }
      video.currentTime = startTime
    }

    video.onseeked = processFrame
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
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      if (!videoPreview.value || !previewCanvas.value) {
        resolve()
        return
      }

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
      resolve()
    })
  })
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

// Add selectedFile ref
const selectedFile = ref(null)

// Update handleFileSelect
const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  selectedFile.value = file
  fileName.value = file.name.replace(/\.[^/.]+$/, '') + '.bin'

  try {
    videoMetadata.value = await getVideoMetadata(file)
    previewUrl.value = URL.createObjectURL(file)

    // Set initial trim end time
    trimSettings.value.end = videoMetadata.value.duration

    // Don't automatically convert
    settingsChanged.value = true
  } catch (error) {
    console.error('Failed to load video:', error)
  }
}

// Update handleDrop
const handleDrop = async (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (!file) return

  selectedFile.value = file
  fileName.value = file.name.replace(/\.[^/.]+$/, '') + '.bin'

  try {
    videoMetadata.value = await getVideoMetadata(file)
    previewUrl.value = URL.createObjectURL(file)

    // Set initial trim end time
    trimSettings.value.end = videoMetadata.value.duration

    // Don't automatically convert
    settingsChanged.value = true
  } catch (error) {
    console.error('Failed to load video:', error)
  }
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

// Add debounce utility
const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Debounce the preview update
const debouncedUpdate = debounce(() => {
  if (!videoPreview.value || !previewCanvas.value) return
  updatePreview()
}, 32) // ~30fps for better performance

// Watch adjustments with debounced update
watch(adjustments, () => {
  debouncedUpdate()
}, { deep: true })

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
  let rr = r, gg = g, bb = b
  const adj = adjustments.value

  // 1-Bit conversion (should be applied before other effects)
  if (adj.oneBit.enabled) {
    // Calculate luminance
    const luminance = (rr * 0.299 + gg * 0.587 + bb * 0.114)
    // Apply threshold
    const isWhite = luminance > adj.oneBit.threshold
    const targetColor = isWhite ? adj.oneBit.lightColor : adj.oneBit.darkColor
    const [tr, tg, tb] = hexToRgb(targetColor)
    rr = tr
    gg = tg
    bb = tb
    // Return early since we don't need other color adjustments
    return [rr, gg, bb]
  }

  // 1. RGB level adjustments
  if (adj.redLevel.enabled) {
    const factor = adj.redLevel.value / 128
    rr = Math.min(255, rr * factor)
  }
  if (adj.greenLevel.enabled) {
    const factor = adj.greenLevel.value / 128
    gg = Math.min(255, gg * factor)
  }
  if (adj.blueLevel.enabled) {
    const factor = adj.blueLevel.value / 128
    bb = Math.min(255, bb * factor)
  }

  // 2. Brightness
  if (adj.brightness.enabled) {
    rr += (adj.brightness.value - 128)
    gg += (adj.brightness.value - 128)
    bb += (adj.brightness.value - 128)
  }

  // 3. Contrast
  if (adj.contrast.enabled) {
    rr = ((rr - 128) * (adj.contrast.value / 128)) + 128
    gg = ((gg - 128) * (adj.contrast.value / 128)) + 128
    bb = ((bb - 128) * (adj.contrast.value / 128)) + 128
  }

  // 4. Highlights
  if (adj.highlights.enabled && rr > 128) {
    rr += (adj.highlights.value - 128) * ((rr - 128) / 128)
  }
  if (adj.highlights.enabled && gg > 128) {
    gg += (adj.highlights.value - 128) * ((gg - 128) / 128)
  }
  if (adj.highlights.enabled && bb > 128) {
    bb += (adj.highlights.value - 128) * ((bb - 128) / 128)
  }

  // 5. Shadows
  if (adj.shadows.enabled && rr < 128) {
    rr += (adj.shadows.value - 128) * ((128 - rr) / 128)
  }
  if (adj.shadows.enabled && gg < 128) {
    gg += (adj.shadows.value - 128) * ((128 - gg) / 128)
  }
  if (adj.shadows.enabled && bb < 128) {
    bb += (adj.shadows.value - 128) * ((128 - bb) / 128)
  }

  // 6. Midtones
  if (adj.midtones.enabled) {
    const midtoneFactor = 1 - Math.abs(rr - 128) / 128
    rr += (adj.midtones.value - 128) * midtoneFactor
    const midtoneFactorG = 1 - Math.abs(gg - 128) / 128
    gg += (adj.midtones.value - 128) * midtoneFactorG
    const midtoneFactorB = 1 - Math.abs(bb - 128) / 128
    bb += (adj.midtones.value - 128) * midtoneFactorB
  }

  // 7. Color reduction
  if (adj.colorReduce.enabled) {
    const step = 256 / (adj.colorReduce.levels - 1)
    rr = Math.round(Math.round(rr / step) * step)
    gg = Math.round(Math.round(gg / step) * step)
    bb = Math.round(Math.round(bb / step) * step)
  }

  // 8. Invert
  if (adj.invert.enabled) {
    const strength = adj.invert.strength / 100
    rr = rr * (1 - strength) + (255 - rr) * strength
    gg = gg * (1 - strength) + (255 - gg) * strength
    bb = bb * (1 - strength) + (255 - bb) * strength
  }

  // 9. Colorize
  if (adj.colorize.enabled) {
    const tintColor = hexToRgb(adj.colorize.color)
    const luminance = (rr * 0.299 + gg * 0.587 + bb * 0.114) / 255
    const colorizeStrength = luminance < 0.02 ? 0 : 1
    const intensity = (adj.colorize.intensity / 100) * colorizeStrength
    const [r2, g2, b2] = blendColors([rr, gg, bb], tintColor, intensity * 100)
    rr = r2
    gg = g2
    bb = b2
  }

  // 10. Color swap
  if (adj.colorSwap.enabled) {
    const sourceRGB = hexToRgb(adj.colorSwap.sourceColor)
    const targetRGB = hexToRgb(adj.colorSwap.targetColor)

    // Calculate color distance (simple Euclidean distance)
    const distance = Math.sqrt(
      Math.pow(rr - sourceRGB[0], 2) +
      Math.pow(gg - sourceRGB[1], 2) +
      Math.pow(bb - sourceRGB[2], 2)
    )

    // If color is within tolerance, swap it
    const maxDistance = (adj.colorSwap.tolerance / 100) * 441.67 // sqrt(255^2 * 3)
    if (distance <= maxDistance) {
      const blendFactor = 1 - (distance / maxDistance)
      rr = rr * (1 - blendFactor) + targetRGB[0] * blendFactor
      gg = gg * (1 - blendFactor) + targetRGB[1] * blendFactor
      bb = bb * (1 - blendFactor) + targetRGB[2] * blendFactor
    }
  }

  return [rr, gg, bb]
}

const processVideoFrame = (imageData) => {
  const data = imageData.data
  const len = data.length

  // Create local references to avoid property lookups
  const adjustmentsEnabled = Object.values(adjustments.value).some(adj => adj.enabled)
  if (!adjustmentsEnabled) return

  for (let i = 0; i < len; i += 4) {
    const [r, g, b] = processPixel(data[i], data[i + 1], data[i + 2])
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = 255
  }
}

const handleVideoLoaded = (video) => {
  if (!videoMetadata.value) return

  // Update aspect ratios
  const gcd = (a, b) => b ? gcd(b, a % b) : a

  // Source ratio
  const sourceDiv = gcd(video.videoWidth, video.videoHeight)
  videoMetadata.value.sourceAspectRatio = `${video.videoWidth / sourceDiv}:${video.videoHeight / sourceDiv}`

  // Target ratio
  const targetDiv = gcd(targetResolution.value.width, targetResolution.value.height)
  videoMetadata.value.targetAspectRatio = `${targetResolution.value.width / targetDiv}:${targetResolution.value.height / targetDiv}`
}

const handleTrimReset = () => {
  trimSettings.value.start = 0
  trimSettings.value.end = videoMetadata.value?.duration || 0
}

// Add progress state
const conversionProgress = ref(0)

// Add abort controller ref
const abortController = ref(null)

// Modify the conversion function to support cancellation
const convertVideo = async (file) => {
  if (isConverting.value) return // Prevent multiple conversions

  isConverting.value = true
  conversionProgress.value = 0
  abortController.value = new AbortController()

  try {
    const startTime = trimSettings.value.enabled ? trimSettings.value.start : 0
    const endTime = trimSettings.value.enabled ? trimSettings.value.end : videoMetadata.value.duration
    const totalFrames = Math.ceil((endTime - startTime) * targetResolution.value.fps)

    const data = await resizeVideo(file, startTime, endTime, (currentFrame) => {
      if (abortController.value?.signal.aborted) {
        throw new Error('Conversion cancelled')
      }
      conversionProgress.value = (currentFrame / totalFrames) * 100
    })

    const blob = new Blob([data], { type: 'application/octet-stream' })
    convertedFile.value = URL.createObjectURL(blob)
    settingsChanged.value = false
    conversionProgress.value = 100
  } catch (error) {
    if (error.message !== 'Conversion cancelled') {
      console.error('Conversion failed:', error)
    }
    // Clear the converted file if conversion was cancelled or failed
    convertedFile.value = null
    settingsChanged.value = true
  } finally {
    isConverting.value = false
    abortController.value = null
    conversionProgress.value = 0
  }
}

// Add cancel function
const cancelConversion = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
}
</script>
<template>
  <div class="min-h-screen bg-app-bg">
    <Navbar v-model:target-resolution="targetResolution" v-model:adjustments="adjustments"
      v-model:trim-settings="trimSettings" :default-settings="DEFAULT_SETTINGS" :video-metadata="videoMetadata" />
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-[450px,1fr] gap-6">
        <OutputSettings v-model:adjustments="adjustments" v-model:trim-settings="trimSettings"
          :video-metadata="videoMetadata" :default-settings="DEFAULT_SETTINGS" />

        <div class="flex flex-col gap-6">
          <!-- Preview Section -->
          <div class="bg-panel-bg rounded-lg shadow-lg overflow-hidden" @drop="handleDrop" @dragover="preventDefault"
            @dragenter="preventDefault">
            <div class="p-4 border-b border-border/20">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <ColorAnalyzer />
                </div>
                <div class="flex items-center gap-3">
                  <div v-if="isConverting" class="flex items-center gap-3">
                    <span class="text-text-secondary">Converting...</span>
                    <div class="w-32 h-2 bg-control-bg rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all duration-200"
                        :style="{ width: conversionProgress + '%' }"></div>
                    </div>
                    <button class="btn" @click="cancelConversion">Cancel</button>
                  </div>
                  <div v-else-if="previewUrl" class="flex items-center gap-3">
                    <button v-if="!convertedFile || settingsChanged" class="btn" @click="convertVideo(selectedFile)">
                      {{ convertedFile ? 'Reconvert' : 'Convert' }}
                    </button>
                    <a v-if="convertedFile && !settingsChanged" :href="convertedFile" :download="fileName"
                      class="btn bg-accent hover:bg-accent/80 text-text">
                      Download .bin
                    </a>
                    <button class="btn" @click="handleNewFile">New file</button>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <button class="btn" @click="handleNewFile">
                      Select video file
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <input ref="fileInput" type="file" accept="video/mp4,video/quicktime" class="hidden"
              @change="handleFileSelect">

            <div class="relative aspect-video bg-black/20">
              <VideoPreview v-if="previewUrl" :video-url="previewUrl" :metadata="videoMetadata"
                :preview-width="targetResolution.width" :preview-height="targetResolution.height"
                :process-frame="processVideoFrame" :trim-settings="trimSettings" @video-loaded="handleVideoLoaded"
                class="w-full h-full" />
              <div v-else class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <p class="text-text-secondary mb-4">Drag & drop video file here</p>
                  <p class="text-text-secondary text-sm">or</p>
                  <button class="btn mt-4" @click="handleNewFile">Select video file</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.preview-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
