export function normalizePhone(raw = '') {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('994')) return digits
  if (digits.startsWith('0')) return `994${digits.slice(1)}`
  return digits
}

export function telLink(raw) {
  const digits = normalizePhone(raw)
  return digits ? `tel:+${digits}` : ''
}

export function waLink(raw, text = '') {
  const digits = normalizePhone(raw)
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${query}`
}
