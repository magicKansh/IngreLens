/** Example labels (fictional products) so the full OCR flow can be tried without a photo. */
export const SAMPLES = [
  {
    name: 'Berry Crunch Granola Bar',
    text:
      'INGREDIENTS: Whole grain oats, sugar, brown rice syrup, canola oil, almonds, dried cranberries (sugar, cranberries, sunflower oil), honey, soy lecithin, natural flavors, salt, Red 40, citric acid (for freshness), mixed tocopherols. CONTAINS: ALMONDS, SOY.',
  },
  {
    name: 'Citrus Blast Soda',
    text:
      'INGREDIENTS: Carbonated water, high fructose corn syrup, citric acid, natural flavors, sodium benzoate (to protect taste), caffeine, gum arabic, acesulfame potassium, Yellow 5.',
  },
  {
    name: 'Classic Wheat Crackers',
    text:
      'INGREDIENTS: Enriched flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), soybean oil, sugar, salt, malt syrup, baking soda, monocalcium phosphate, soy lecithin, natural flavor. CONTAINS: WHEAT, SOY.',
  },
]

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** Renders a label-like PNG so the sample runs through the real OCR pipeline. */
export function renderSampleLabel(text: string): Promise<Blob> {
  const W = 1400
  const pad = 70
  const font = '600 40px Arial, Helvetica, sans-serif'
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')!
  ctx.font = font
  const lines = wrap(ctx, text, W - pad * 2)
  c.width = W
  c.height = pad * 2 + lines.length * 58
  ctx.fillStyle = '#fbf8f1'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 6
  ctx.strokeRect(20, 20, c.width - 40, c.height - 40)
  ctx.fillStyle = '#111'
  ctx.font = font
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + i * 58))
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/png'))
}
