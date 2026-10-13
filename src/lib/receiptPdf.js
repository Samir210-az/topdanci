import { fmtMoney } from './money'
import { toDate } from './dates'

const W = 1240
const MIN_H = 1754
const M = 70
const FONT = '"Roboto","Segoe UI",Arial,sans-serif'
const INK = '#14201c'
const GREY = '#5b6661'
const LINE = '#cfd6d2'

const TITLES = { sale: 'QAIMƏ', consign: 'SATIŞA VERİLƏN MAL', settle: 'HESABLAŞMA' }

const pad = (n) => String(n).padStart(2, '0')

export function fmtStamp(value) {
  const d = toDate(value)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    let last = kept[maxLines - 1]
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    kept[maxLines - 1] = `${last}…`
    return kept
  }
  return lines
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function paint(ctx, d, signature) {
  let y = M
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = `800 104px ${FONT}`
  y += 90
  ctx.fillText('TOPDANÇI', W / 2, y)

  ctx.font = `600 34px ${FONT}`
  ctx.fillStyle = GREY
  y += 52
  ctx.fillText(d.title, W / 2, y)

  ctx.font = `600 40px ${FONT}`
  ctx.fillStyle = INK
  y += 58
  ctx.fillText(d.soldAt, W / 2, y)

  y += 56
  ctx.font = `500 34px ${FONT}`
  ctx.fillText(`Müştəri: ${d.customer}`, W / 2, y)

  y += 50
  const cols = { n: M, name: M + 70, qty: W - M - 560, price: W - M - 270, sum: W - M }
  ctx.fillStyle = '#e3efe9'
  ctx.fillRect(M, y, W - 2 * M, 66)
  ctx.fillStyle = '#17463a'
  ctx.font = `700 29px ${FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('№', cols.n + 12, y + 44)
  ctx.fillText('Mal', cols.name, y + 44)
  ctx.textAlign = 'right'
  ctx.fillText('Say', cols.qty + 110, y + 44)
  ctx.fillText('Qiymət', cols.price + 40, y + 44)
  ctx.fillText('Məbləğ', cols.sum - 12, y + 44)
  y += 66

  ctx.font = `500 31px ${FONT}`
  d.items.forEach((item, i) => {
    const lines = wrap(ctx, item.name, cols.qty - cols.name - 10, 2)
    const h = 30 + lines.length * 40
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.fillText(String(i + 1), cols.n + 12, y + 46)
    lines.forEach((line, k) => ctx.fillText(line, cols.name, y + 46 + k * 38))
    ctx.textAlign = 'right'
    ctx.fillText(`${item.qty} ${item.unit}`, cols.qty + 110, y + 46)
    ctx.fillText(fmtMoney(item.price), cols.price + 40, y + 46)
    ctx.fillText(fmtMoney(item.qty * item.price), cols.sum - 12, y + 46)
    y += h
    ctx.fillStyle = LINE
    ctx.fillRect(M, y, W - 2 * M, 2)
  })

  const total = (label, value, bold) => {
    ctx.fillStyle = INK
    ctx.font = `${bold ? 800 : 500} ${bold ? 40 : 33}px ${FONT}`
    ctx.textAlign = 'left'
    ctx.fillText(label, M + 12, y)
    ctx.textAlign = 'right'
    ctx.fillText(value, W - M - 12, y)
  }

  y += 64
  total('Cəmi', fmtMoney(d.total), true)
  if (d.paid > 0) {
    y += 52
    total('Ödənilib', fmtMoney(d.paid))
  }

  y += 110
  ctx.textAlign = 'left'
  ctx.fillStyle = GREY
  ctx.font = `600 30px ${FONT}`
  ctx.fillText('Qəbul etdi', M, y)
  const boxTop = y + 20
  const boxH = 230
  if (!signature) {
    ctx.strokeStyle = LINE
    ctx.lineWidth = 3
    ctx.strokeRect(M, boxTop, 640, boxH)
  } else {
    const ratio = Math.min(600 / signature.width, (boxH - 30) / signature.height)
    const w = signature.width * ratio
    const h = signature.height * ratio
    ctx.drawImage(signature, M, boxTop + (boxH - h) / 2, w, h)
  }
  ctx.fillStyle = INK
  ctx.font = `500 30px ${FONT}`
  const signedLine = [d.signedBy, d.signature ? fmtStamp(d.signedAt) : ''].filter(Boolean).join(' · ')
  if (signedLine) ctx.fillText(signedLine, M, boxTop + boxH + 44)
  y = boxTop + boxH + 44

  y += 50
  ctx.fillStyle = INK
  ctx.fillRect(M, y, W - 2 * M, 3)
  y += 70
  total('Müştərinin bizə ümumi borcu', fmtMoney(d.debt), true)

  if (d.sentAt) {
    y += 70
    ctx.fillStyle = GREY
    ctx.font = `500 29px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(`Göndərilib: ${fmtStamp(d.sentAt)}`, W / 2, y)
  }
  return y + M
}

export async function renderReceipt(sale, extra) {
  const data = {
    title: TITLES[sale.type] || 'QAIMƏ',
    soldAt: fmtStamp(sale.createdAt),
    customer: sale.customerName,
    items: sale.items,
    total: sale.total,
    paid: sale.paid || 0,
    debt: extra.debt,
    signedBy: extra.signedBy || '',
    signature: Boolean(extra.signature),
    signedAt: extra.signedAt,
    sentAt: extra.sentAt,
  }
  const signature = extra.signature ? await loadImage(extra.signature) : null

  const probe = document.createElement('canvas')
  probe.width = W
  probe.height = 10
  const height = Math.max(MIN_H, paint(probe.getContext('2d'), data, signature))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, height)
  paint(ctx, data, signature)

  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  return { jpeg, pdf: await toPdf(jpeg, W, height) }
}

async function toPdf(jpeg, width, height) {
  const image = new Uint8Array(await jpeg.arrayBuffer())
  const pw = 419.53
  const ph = Number(((pw * height) / width).toFixed(2))
  const enc = new TextEncoder()
  const parts = []
  const offsets = []
  let size = 0
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk
    parts.push(bytes)
    size += bytes.length
  }
  const begin = (n) => {
    offsets[n] = size
    push(`${n} 0 obj\n`)
  }

  push('%PDF-1.4\n')
  begin(1)
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  begin(2)
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  begin(3)
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  )
  begin(4)
  push(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
  )
  push(image)
  push('\nendstream\nendobj\n')
  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`
  begin(5)
  push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)

  const xref = size
  let table = 'xref\n0 6\n0000000000 65535 f \n'
  for (let n = 1; n <= 5; n += 1) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  push(`${table}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)

  return new Blob(parts, { type: 'application/pdf' })
}

export async function shareReceipt(pdf, name) {
  const file = new File([pdf], `${name}.pdf`, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Qaimə' })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'canceled'
    }
  }
  const url = URL.createObjectURL(pdf)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}
