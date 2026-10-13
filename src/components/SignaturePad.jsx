import { useEffect, useRef } from 'react'

export default function SignaturePad({ onChange }) {
  const canvas = useRef(null)
  const drawing = useRef(false)
  const dirty = useRef(false)

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111'
  }, [])

  function point(event) {
    const rect = canvas.current.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.current.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.current.height,
    }
  }

  function down(event) {
    event.preventDefault()
    canvas.current.setPointerCapture(event.pointerId)
    drawing.current = true
    const ctx = canvas.current.getContext('2d')
    const { x, y } = point(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
  }

  function move(event) {
    if (!drawing.current) return
    const ctx = canvas.current.getContext('2d')
    const { x, y } = point(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    dirty.current = true
  }

  function up() {
    if (!drawing.current) return
    drawing.current = false
    if (dirty.current) onChange(canvas.current.toDataURL('image/png'))
  }

  function clear() {
    canvas.current.getContext('2d').clearRect(0, 0, canvas.current.width, canvas.current.height)
    dirty.current = false
    onChange(null)
  }

  return (
    <div className="stack">
      <canvas
        ref={canvas}
        width={640}
        height={240}
        className="sign-pad"
        aria-label="İmza sahəsi"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <button type="button" className="btn sm" onClick={clear}>
        Təmizlə
      </button>
    </div>
  )
}
