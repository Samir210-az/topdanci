export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDate(value) {
  if (!value) return new Date(0)
  return typeof value.toDate === 'function' ? value.toDate() : new Date(value)
}

const dayFormat = new Intl.DateTimeFormat('az', { day: 'numeric', month: 'long' })
const timeFormat = new Intl.DateTimeFormat('az', { hour: '2-digit', minute: '2-digit' })

export const fmtDay = (date) => dayFormat.format(date)
export const fmtTime = (date) => timeFormat.format(date)
export const fmtDateTime = (date) => `${fmtDay(date)}, ${fmtTime(date)}`
