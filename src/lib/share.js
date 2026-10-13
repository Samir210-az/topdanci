import { fmtMoney } from './money'
import { fmtDateTime, toDate } from './dates'

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

const TITLES = { sale: 'Qaimə', consign: 'Satışa verilən mal qaiməsi', settle: 'Hesablaşma' }

export function buildReceipt(sale, balance) {
  const rows = sale.items.map(
    (l, i) => `${i + 1}. ${l.name} — ${l.qty} ${l.unit} × ${fmtMoney(l.price)} = ${fmtMoney(l.qty * l.price)}`,
  )
  const out = [
    TITLES[sale.type] || 'Qaimə',
    `Müştəri: ${sale.customerName}`,
    `Tarix: ${fmtDateTime(toDate(sale.createdAt))}`,
    '',
    ...rows,
  ]

  if (sale.returned?.length) {
    out.push('', 'Geri qaytarılan:')
    sale.returned.forEach((l) => out.push(`• ${l.name} — ${l.qty} ${l.unit}`))
  }

  out.push('', `Cəmi: ${fmtMoney(sale.total)}`)
  if (sale.type !== 'consign') {
    out.push(`Ödənilib: ${fmtMoney(sale.paid)}`)
    if (sale.total - sale.paid > 0) out.push(`Bu qaimə üzrə qalıq: ${fmtMoney(sale.total - sale.paid)}`)
  }
  if (typeof balance === 'number' && balance > 0) out.push(`Ümumi borc: ${fmtMoney(balance)}`)
  return out.join('\n')
}

export function sendText(text, phone) {
  if (phone) {
    window.open(waLink(phone, text), '_blank', 'noopener')
  } else if (navigator.share) {
    navigator.share({ text }).catch(() => {})
  } else {
    window.open(waLink('', text), '_blank', 'noopener')
  }
}
