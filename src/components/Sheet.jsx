import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

export default function Sheet({ open, title, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet-body">
          <header className="sheet-head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Bağla">
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
