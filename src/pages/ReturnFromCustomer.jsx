import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import ProductPickerSheet from '../components/ProductPickerSheet'
import { MoneyInput, PageHeader, ProductImage, Stepper } from '../components/ui'
import { useData } from '../store/DataContext'
import { returnFromCustomer } from '../lib/actions'
import { reportError } from '../lib/events'
import { fmtMoney, fromQepik, toQepik } from '../lib/money'

function Editor({ customer }) {
  const navigate = useNavigate()
  const { productMap, sales } = useData()
  const [lines, setLines] = useState([])
  const [picking, setPicking] = useState(false)

  const boughtBefore = new Set(
    sales
      .filter((s) => s.customerId === customer.id && !s.canceled && s.type !== 'return')
      .flatMap((s) => s.items.map((l) => l.productId)),
  )

  function lastPrice(product) {
    const line = sales
      .filter((s) => s.customerId === customer.id && !s.canceled && s.type !== 'return')
      .flatMap((s) => s.items)
      .find((l) => l.productId === product.id)
    return fromQepik(line ? line.price : product.price)
  }

  const patch = (productId) => (change) =>
    setLines((current) => current.map((l) => (l.productId === productId ? { ...l, ...change } : l)))
  const total = lines.reduce((sum, l) => sum + l.qty * toQepik(l.price), 0)

  function submit() {
    try {
      returnFromCustomer({
        customer,
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, price: toQepik(l.price) })),
        productMap,
        sales,
      })
      navigate(`/customers/${customer.id}`, { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader title="Mal qaytarma" back />
      <p className="muted">{customer.name} aldığı malı sənə qaytarır. Qiymət müştəriyə satdığın qiymətdir, borcdan çıxılır.</p>

      <div className="list">
        {lines.map((line) => {
          const product = productMap[line.productId]
          return (
            <div key={line.productId} className="line">
              <div className="line-top">
                <ProductImage product={product} />
                <div className="grow">
                  <strong>{product.name}</strong>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Sil"
                  onClick={() => setLines((current) => current.filter((l) => l.productId !== line.productId))}
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="line-bottom">
                <Stepper value={line.qty} min={1} onChange={(qty) => patch(line.productId)({ qty })} label="Say" />
                <MoneyInput
                  value={line.price}
                  aria-label="Qiymət"
                  onChange={(price) => patch(line.productId)({ price })}
                />
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" className="btn block" onClick={() => setPicking(true)}>
        <Icon name="plus" size={18} /> Mal əlavə et
      </button>

      {lines.length > 0 && (
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

      <ProductPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        filter={(p) => boughtBefore.has(p.id)}
        empty="Bu müştəriyə son 90 gündə satılmış mal yoxdur."
        onPick={(p) =>
          setLines((current) =>
            current.some((l) => l.productId === p.id) ? current : [...current, { productId: p.id, qty: 1, price: lastPrice(p) }],
          )
        }
      />
    </>
  )
}

export default function ReturnFromCustomer() {
  const { id } = useParams()
  const { customerMap } = useData()
  const customer = customerMap[id]
  if (!customer) return <PageHeader title="Müştəri tapılmadı" back />
  return <Editor key={id} customer={customer} />
}
