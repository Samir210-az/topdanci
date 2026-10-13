import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader, Stepper } from '../components/ui'
import { useData } from '../store/DataContext'
import { returnToSupplier } from '../lib/actions'
import { reportError } from '../lib/events'
import { lotsOf, qtyFromSupplier, takeFromSupplier, totalCost } from '../lib/lots'
import { fmtMoney } from '../lib/money'

function Editor({ supplier }) {
  const navigate = useNavigate()
  const { productMap } = useData()
  const [qty, setQty] = useState({})

  const rows = Object.keys(supplier.goods || {})
    .map((productId) => ({ productId, product: productMap[productId] }))
    .filter((r) => r.product)
    .map((r) => ({ ...r, available: qtyFromSupplier(r.product, supplier.id) }))
    .filter((r) => r.available > 0)

  const chosen = rows.filter((r) => qty[r.productId] > 0)
  const total = chosen.reduce(
    (sum, r) => sum + totalCost(takeFromSupplier(lotsOf(r.product), supplier.id, qty[r.productId]).taken),
    0,
  )

  function submit() {
    try {
      returnToSupplier({
        supplier,
        lines: chosen.map((r) => ({ productId: r.productId, qty: qty[r.productId] })),
        productMap,
      })
      navigate(`/suppliers/${supplier.id}`, { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader title="Malı qaytar" back />
      <p className="muted">
        {supplier.name} şirkətinə yalnız ondan alınıb hələ satılmayan mal qaytarıla bilər. Məbləğ alış qiyməti ilə hesablanır və borcundan çıxılır.
      </p>

      {rows.length === 0 && <p className="muted">Bu təchizatçıdan qaytarıla bilən mal yoxdur.</p>}
      <div className="list">
        {rows.map((r) => (
          <div key={r.productId} className="line">
            <strong>{r.product.name}</strong>
            <span className="muted small">
              Ondan qalıb: {r.available} {r.product.unit}
            </span>
            <Stepper
              value={qty[r.productId] || 0}
              max={r.available}
              onChange={(value) => setQty((q) => ({ ...q, [r.productId]: value }))}
              label="Qaytarılan say"
            />
          </div>
        ))}
      </div>

      {chosen.length > 0 && (
        <>
          <div className="summary">
            <div className="total">
              <span>Borcdan çıxılır</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>
          <div className="sticky-action">
            <button type="button" className="btn primary block" onClick={submit}>
              Qaytarmanı təsdiqlə
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default function ReturnToSupplier() {
  const { id } = useParams()
  const { supplierMap } = useData()
  const supplier = supplierMap[id]
  if (!supplier) return <PageHeader title="Təchizatçı tapılmadı" back />
  return <Editor key={id} supplier={supplier} />
}
