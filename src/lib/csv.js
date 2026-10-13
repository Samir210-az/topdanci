const BOM = String.fromCharCode(0xfeff)
const NUMERIC = /^-?[\d\s.,]+$/

function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text) && !NUMERIC.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadCsv(filename, rows) {
  const body = rows.map((row) => row.map(cell).join(';')).join('\r\n')
  const blob = new Blob([BOM + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
