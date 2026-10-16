import { createWorker, type Worker } from 'tesseract.js'

export interface OcrProgress {
  status: string
  progress: number
}

export interface OcrResult {
  text: string
  confidence: number | null
}

let workerPromise: Promise<Worker> | null = null
let progressListener: ((p: OcrProgress) => void) | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => progressListener?.({ status: m.status, progress: m.progress }),
    }).catch((err) => {
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('This image format could not be opened. Try a JPG, PNG or WebP photo.'))
    img.src = src
  })
}

/** Scale to a size Tesseract handles well, convert to greyscale and stretch contrast. */
export function preprocess(img: HTMLImageElement): HTMLCanvasElement {
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longest > 2400 ? 2400 / longest : longest < 1200 ? 1200 / longest : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = data.data
  let min = 255
  let max = 0
  const grey = new Uint8ClampedArray(px.length / 4)
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    grey[j] = g
    if (g < min) min = g
    if (g > max) max = g
  }
  const range = Math.max(1, max - min)
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = ((grey[j] - min) * 255) / range
    px[i] = px[i + 1] = px[i + 2] = v
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}

export async function recognise(imageUrl: string, onProgress: (p: OcrProgress) => void): Promise<OcrResult> {
  const img = await loadImage(imageUrl)
  const canvas = preprocess(img)
  progressListener = onProgress
  try {
    onProgress({ status: 'loading OCR engine', progress: 0 })
    const worker = await getWorker()
    const { data } = await worker.recognize(canvas)
    return { text: data.text ?? '', confidence: typeof data.confidence === 'number' ? data.confidence : null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      /fetch|network|load/i.test(msg)
        ? 'The OCR engine could not be downloaded. Check your connection, or type/paste the ingredients instead.'
        : `Text recognition failed: ${msg}`,
    )
  } finally {
    progressListener = null
  }
}

/** Small JPEG thumbnail for saved products. */
export async function makeThumbnail(imageUrl: string, size = 220): Promise<string | undefined> {
  try {
    const img = await loadImage(imageUrl)
    const scale = size / Math.max(img.naturalWidth, img.naturalHeight)
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return undefined
  }
}
