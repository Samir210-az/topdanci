function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Şəkil oxunmadı'))
    }
    img.src = url
  })
}

export async function fileToDataUrl(file, { maxSide = 800, maxBytes = 220_000 } = {}) {
  const img = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  let quality = 0.78
  let url = canvas.toDataURL('image/jpeg', quality)
  while (url.length > maxBytes * 1.37 && quality > 0.4) {
    quality -= 0.1
    url = canvas.toDataURL('image/jpeg', quality)
  }
  return url
}
