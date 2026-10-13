export function toQepik(value) {
  const n = Number(String(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export function fromQepik(qepik) {
  return (qepik / 100).toFixed(2)
}

const formatter = new Intl.NumberFormat('az-AZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function fmtMoney(qepik) {
  return `${formatter.format(qepik / 100)} ₼`
}
