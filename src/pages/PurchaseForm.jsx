import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import Sheet from '../components/Sheet'
import { Field, MoneyInput, PageHeader, ProductImage, Segmented, Stepper } from '../components/ui'
import { useData } from '../store/DataContext'
import { createPurchase, saveSupplier } from '../lib/actions'
import { notify, reportError } from '../lib/events'
import { fmtMoney, fromQepik, toQepik } from '../lib/money'

function Line({ line, product, onChange, onRemove }) {
  return (
    <div className="line">
      <div className="line-top">
        <ProductImage product={product} />
        <div className="grow">
          <strong>{product.name}</strong>
          <span className="muted small">
            Anbarda: {product.stock || 0} {product.unit}
          </span>
        </div>
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="Sil">
          <Icon name="close" />
        </button>
      </div>
      <div className="line-bottom">
        <Stepper value={line.qty} min={1} onChange={(qty) => onChange({ qty })} label="Say" />
        <MoneyInput
          value={line.cost}
          aria-label="Alış qiyməti"
          placeholder="Alış ₼"
          onChange={(cost) => onChange({ cost })}
        />
      </div>
    </div>
  )
}

export default function PurchaseForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { products, productMap, suppliers } = useData()
  const [supplierId, setSupplierId] = useState('')
  const [newName, setNewName] = useState('')
  const [lines, setLines] = useState(() => {
    const preset = productMap[params.get('product')]
    return preset ? [{ productId: preset.id, qty: 1, cost: preset.cost ? fromQepik(preset.cost) : '' }] : []
  })
  const [mode, setMode] = useState('full')
  const [partial, setPartial] = useState('')
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.qty * toQepik(l.cost), 0), [lines])
  const paid = mode === 'full' ? total : mode === 'credit' ? 0 : toQepik(partial)
  const term = q.trim().toLocaleLowerCase('az')
  const shown = products.filter((p) => !term || p.name.toLocaleLowerCase('az').includes(term))

  const patch = (productId) => (change) =>
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, ...change } : l)))

  function submit() {
    try {
      let supplier = suppliers.find((s) => s.id === supplierId)
      if (!supplier) {
        const name = newName.trim()
        if (!name) return notify('Təchizatçını seç və ya adını yaz', 'error')
        supplier = { id: saveSupplier({ data: { name } }), name }
      }
      createPurchase({
        supplier,
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, cost: toQepik(l.cost) })),
        paid,
        productMap,
      })
      notify('Alış qeyd edildi', 'success')
      navigate('/purchases', { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader title="Yeni alış" back />

      <Field label="Təchizatçı">
        <select
          className="input"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        >
          <option value="">{suppliers.length ? 'Yeni təchizatçı…' : 'Təchizatçı yoxdur'}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      {!supplierId && (
        <Field label="Yeni təchizatçının adı">
          <input className="input" value={newName} maxLength={80} onChange={(event) => setNewName(event.target.value)} />
        </Field>
      )}

      <div className="list">
        {lines.map((line) => (
          <Line
            key={line.productId}
            line={line}
            product={productMap[line.productId]}
            onChange={patch(line.productId)}
            onRemove={() => setLines((current) => current.filter((l) => l.productId !== line.productId))}
          />
        ))}
      </div>

      <button type="button" className="btn block" onClick={() => setPicking(true)}>
        <Icon name="plus" size={18} /> Mal əlavə et
      </button>

      {lines.length > 0 && (
        <>
          <Segmented
            label="Ödəniş"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'full', label: 'Tam ödədim' },
              { value: 'partial', label: 'Qismən' },
              { value: 'credit', label: 'Borca' },
            ]}
          />
          {mode === 'partial' && (
            <Field label="Ödənilən məbləğ, ₼">
              <MoneyInput value={partial} onChange={setPartial} />
            </Field>
          )}

          <div className="summary">
            <div className="total">
              <span>Cəmi</span>
              <span>{fmtMoney(total)}</span>
            </div>
            <div>
              <span>Borc qalır</span>
              <span>{fmtMoney(Math.max(total - paid, 0))}</span>
            </div>
          </div>

          <div className="sticky-action">
            <button type="button" className="btn primary block" onClick={submit}>
              Alışı təsdiqlə
            </button>
          </div>
        </>
      )}

      <Sheet open={picking} title="Mal seç" onClose={() => setPicking(false)}>
        <input
          className="input"
          type="search"
          placeholder="Mal axtar"
          aria-label="Mal axtar"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="sheet-list">
          {shown.length === 0 && <p className="muted">Mal tapılmadı. Əvvəlcə “Mallar” bölməsində mal yarat.</p>}
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              className="row"
              onClick={() => {
                setLines((current) =>
                  current.some((l) => l.productId === p.id)
                    ? current
                    : [...current, { productId: p.id, qty: 1, cost: p.cost ? fromQepik(p.cost) : '' }],
                )
                setPicking(false)
              }}
            >
              <ProductImage product={p} />
              <div className="grow" style={{ textAlign: 'left' }}>
                <strong>{p.name}</strong>
                <span className="muted small">
                  {p.stock || 0} {p.unit}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
