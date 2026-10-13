import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Field, MoneyInput, PageHeader, Stepper } from '../components/ui'
import { useData } from '../store/DataContext'
import { settleConsignment } from '../lib/actions'
import { notify, reportError } from '../lib/events'
import { fmtMoney, toQepik } from '../lib/money'
import { holdUnit } from '../lib/ledger'

function Editor({ customer }) {
  const navigate = useNavigate()
  const { productMap } = useData()
  const held = Object.entries(customer.holdings || {})
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, held: qty, product: productMap[productId] }))

  const [sold, setSold] = useState({})
  const [returned, setReturned] = useState({})
  const [prices, setPrices] = useState({})
  const [paid, setPaid] = useState('')

  const givenOf = (h) => holdUnit(customer, h.productId)
  const defaultPrice = (h) => givenOf(h) ?? h.product?.price ?? 0
  const priceOf = (h) => (prices[h.productId] !== undefined ? toQepik(prices[h.productId]) : defaultPrice(h))
  const total = held.reduce((sum, h) => sum + (sold[h.productId] || 0) * priceOf(h), 0)
  const debtChange = held.reduce((sum, h) => {
    const given = givenOf(h)
    const soldQty = sold[h.productId] || 0
    const backQty = returned[h.productId] || 0
    if (given == null) return sum + soldQty * priceOf(h)
    return sum + soldQty * (priceOf(h) - given) - backQty * given
  }, 0) - toQepik(paid)

  function submit() {
    const soldLines = held
      .filter((h) => sold[h.productId] > 0)
      .map((h) => ({ productId: h.productId, qty: sold[h.productId], price: priceOf(h) }))
    const returnedLines = held
      .filter((h) => returned[h.productId] > 0)
      .map((h) => ({ productId: h.productId, qty: returned[h.productId] }))
    try {
      settleConsignment({
        customer,
        sold: soldLines,
        returned: returnedLines,
        paid: toQepik(paid),
        productMap,
      })
      notify('Hesablaşma qeyd edildi', 'success')
      navigate(`/customers/${customer.id}`, { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader title="Hesablaşma" back />
      <p className="muted">{customer.name}: nə qədəri satılıb, nə qədəri qaytarılır?</p>

      <div className="list">
        {held.map((h) => {
          const left = h.held - (sold[h.productId] || 0) - (returned[h.productId] || 0)
          return (
            <div key={h.productId} className="line">
              <strong>{h.product?.name || 'Silinmiş mal'}</strong>
              <span className="muted small">
                Müştəridə: {h.held} {h.product?.unit}
              </span>
              <div className="line-bottom">
                <span>Satılıb</span>
                <Stepper
                  value={sold[h.productId] || 0}
                  max={h.held - (returned[h.productId] || 0)}
                  onChange={(qty) => setSold((s) => ({ ...s, [h.productId]: qty }))}
                  label="Satılan say"
                />
              </div>
              <div className="line-bottom">
                <span>Qaytarılır</span>
                <Stepper
                  value={returned[h.productId] || 0}
                  max={h.held - (sold[h.productId] || 0)}
                  onChange={(qty) => setReturned((r) => ({ ...r, [h.productId]: qty }))}
                  label="Qaytarılan say"
                />
              </div>
              {(sold[h.productId] || 0) > 0 && (
                <div className="line-bottom">
                  <span>Vahid qiyməti, ₼</span>
                  <MoneyInput
                    value={prices[h.productId] ?? String(defaultPrice(h) / 100)}
                    onChange={(value) => setPrices((p) => ({ ...p, [h.productId]: value }))}
                  />
                </div>
              )}
              <span className="muted small">Müştəridə qalır: {left}</span>
            </div>
          )
        })}
      </div>

      <Field label="Müştəri indi nə qədər ödəyir, ₼" hint="Mal artıq borca yazılıb. Bu məbləğ borcdan çıxılır">
        <MoneyInput value={paid} onChange={setPaid} />
      </Field>

      <div className="summary">
        <div className="total">
          <span>Satılan malın məbləği</span>
          <span>{fmtMoney(total)}</span>
        </div>
        <div>
          <span>{debtChange < 0 ? 'Borc azalır' : 'Borca əlavə olunur'}</span>
          <span>{fmtMoney(Math.abs(debtChange))}</span>
        </div>
      </div>

      <button type="button" className="btn primary block" onClick={submit}>
        Təsdiqlə
      </button>
    </>
  )
}

export default function Settle() {
  const { id } = useParams()
  const { customerMap } = useData()
  const customer = customerMap[id]
  if (!customer) return <PageHeader title="Müştəri tapılmadı" back />
  return <Editor key={id} customer={customer} />
}
