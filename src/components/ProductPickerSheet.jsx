import { useState } from 'react'
import Sheet from './Sheet'
import { ProductImage } from './ui'
import { useData } from '../store/DataContext'

export default function ProductPickerSheet({ open, onClose, onPick, filter = () => true, empty = 'Mal tapılmadı.' }) {
  const { products } = useData()
  const [q, setQ] = useState('')
  const term = q.trim().toLocaleLowerCase('az')
  const shown = products.filter((p) => filter(p) && (!term || p.name.toLocaleLowerCase('az').includes(term)))

  return (
    <Sheet open={open} title="Mal seç" onClose={onClose}>
      <input
        className="input"
        type="search"
        placeholder="Mal axtar"
        aria-label="Mal axtar"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      <div className="sheet-list">
        {shown.length === 0 && <p className="muted">{empty}</p>}
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className="row"
            onClick={() => {
              onPick(p)
              onClose()
            }}
          >
            <ProductImage product={p} />
            <div className="grow" style={{ textAlign: 'left' }}>
              <strong>{p.name}</strong>
              <span className="muted small">
                Anbarda: {p.stock || 0} {p.unit}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
