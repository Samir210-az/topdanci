import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Link, useParams } from 'react-router-dom'
import Sheet from '../components/Sheet'
import { Field, MoneyInput, PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'
import { cancelPurchase, cancelSupplierPayment, createSupplierPayment } from '../lib/actions'
import { notify, reportError } from '../lib/events'
import { fmtMoney, toQepik } from '../lib/money'
import { addDays, dateKey, fmtDateTime, startOfDay, toDate } from '../lib/dates'
import { telLink, waLink } from '../lib/share'

const METHODS = ['Nağd', 'Kart', 'Köçürmə']

function PaySheet({ open, supplier, onClose }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const debt = Math.max(supplier.balance || 0, 0)

  function submit(event) {
    event.preventDefault()
    try {
      createSupplierPayment({ supplier, amount: toQepik(amount), method })
      notify('Ödəniş qeyd edildi', 'success')
      setAmount('')
      onClose()
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Sheet open={open} title="Təchizatçıya ödəniş" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {debt > 0 && <p className="muted">Cari borc: {fmtMoney(debt)}</p>}
        <Field label="Məbləğ, ₼">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        {debt > 0 && (
          <button type="button" className="btn sm" onClick={() => setAmount(String(debt / 100))}>
            Bütün borcu yaz
          </button>
        )}
        <div className="chips" role="radiogroup" aria-label="Ödəniş üsulu">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              className={method === m ? 'on' : ''}
              onClick={() => setMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <button className="btn primary block">Yaz</button>
      </form>
    </Sheet>
  )
}

export default function SupplierDetail() {
  const { id } = useParams()
  const { supplierMap, productMap, purchases, supplierPayments } = useData()
  const [paying, setPaying] = useState(false)
  const [days, setDays] = useState(30)
  const supplier = supplierMap[id]

  const history = useMemo(
    () =>
      [
        ...purchases.filter((p) => p.supplierId === id).map((p) => ({ kind: 'purchase', at: toDate(p.createdAt), doc: p })),
        ...supplierPayments
          .filter((p) => p.supplierId === id)
          .map((p) => ({ kind: 'payment', at: toDate(p.createdAt), doc: p })),
      ].sort((a, b) => b.at - a.at),
    [purchases, supplierPayments, id],
  )

  const period = useMemo(() => {
    const from = dateKey(addDays(startOfDay(), -(days - 1)))
    const bought = purchases.filter((p) => p.supplierId === id && !p.canceled && p.dateKey >= from)
    const paid = supplierPayments.filter((p) => p.supplierId === id && !p.canceled && p.dateKey >= from)
    const qty = {}
    for (const purchase of bought) {
      for (const line of purchase.items) qty[line.productId] = (qty[line.productId] || 0) + line.qty
    }
    return {
      qty,
      total: bought.reduce((sum, p) => sum + p.total, 0),
      paid: bought.reduce((sum, p) => sum + p.paid, 0) + paid.reduce((sum, p) => sum + p.amount, 0),
      count: bought.length,
    }
  }, [purchases, supplierPayments, id, days])

  if (!supplier) return <PageHeader title="Təchizatçı tapılmadı" back />

  const goods = Object.entries(supplier.goods || {})
    .map(([goodId, g]) => ({ id: goodId, ...g }))
    .filter((g) => g.qty > 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'az'))

  function undo(fn) {
    if (!window.confirm('Bu əməliyyat ləğv edilsin?')) return
    try {
      fn()
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        back
        actions={
          <Link to={`/suppliers/${id}/edit`} className="icon-btn" aria-label="Redaktə et">
            <Icon name="edit" />
          </Link>
        }
      />

      <section className="card stack">
        <div>
          <span className="muted small">Mənim borcum</span>
          <div>
            {supplier.balance > 0 ? (
              <span className="badge bad">{fmtMoney(supplier.balance)}</span>
            ) : (
              <span className="badge muted-badge">Borc yoxdur</span>
            )}
          </div>
        </div>
        {(supplier.phone || supplier.address || supplier.note) && (
          <div className="stack">
            {supplier.phone && (
              <div className="row" style={{ padding: '4px 0', border: 0 }}>
                <span className="grow">{supplier.phone}</span>
                <a className="icon-btn" href={telLink(supplier.phone)} aria-label="Zəng et">
                  <Icon name="phone" />
                </a>
                <a className="icon-btn" href={waLink(supplier.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <Icon name="send" />
                </a>
              </div>
            )}
            {supplier.address && <p className="muted small">{supplier.address}</p>}
            {supplier.note && <p className="muted small">{supplier.note}</p>}
          </div>
        )}
        <div className="form-grid">
          <Link className="btn primary" to="/purchases/new">
            Yeni alış
          </Link>
          <button type="button" className="btn accent" onClick={() => setPaying(true)}>
            Ödəniş et
          </button>
        </div>
      </section>

      <section className="stack">
        <div className="chips">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" className={days === n ? 'on' : ''} onClick={() => setDays(n)}>
              {n} gün
            </button>
          ))}
        </div>
        <div className="stats">
          <div className="stat">
            <span>Alınıb ({period.count} alış)</span>
            <strong>{fmtMoney(period.total)}</strong>
          </div>
          <div className="stat">
            <span>Ödənilib</span>
            <strong>{fmtMoney(period.paid)}</strong>
          </div>
        </div>
      </section>

      {goods.length > 0 && (
        <section className="stack">
          <h2>Bu təchizatçıdan alınan mallar</h2>
          <div className="list">
            {goods.map((g) => {
              const product = productMap[g.id]
              return (
                <div key={g.id} className="row">
                  <div className="grow">
                    <strong>{g.name}</strong>
                    <span className="muted small">
                      Son alış: {fmtMoney(g.lastCost)} · {days} gündə alınıb: {period.qty[g.id] || 0} {g.unit}
                    </span>
                  </div>
                  <span className="badge muted-badge">
                    Anbarda: {product ? product.stock || 0 : 0} {g.unit}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="muted small">Anbar qalığı malın ümumi qalığıdır, başqa təchizatçıdan alınan da buna daxildir.</p>
        </section>
      )}

      <section className="stack">
        <h2>Tarixçə</h2>
        {history.length === 0 && <p className="muted">Hələ əməliyyat yoxdur.</p>}
        {history.map(({ kind, at, doc }) => (
          <div key={`${kind}-${doc.id}`} className="card stack" style={{ opacity: doc.canceled ? 0.55 : 1 }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <div className="grow">
                <strong>{kind === 'purchase' ? 'Alış' : `Ödəniş · ${doc.method}`}</strong>
                <span className="muted small">{fmtDateTime(at)}</span>
              </div>
              {doc.canceled ? (
                <span className="badge muted-badge">Ləğv edilib</span>
              ) : (
                <b>{fmtMoney(kind === 'purchase' ? doc.total : doc.amount)}</b>
              )}
            </div>
            {kind === 'purchase' && (
              <p className="muted small">
                {doc.items.map((l) => `${l.name} ×${l.qty} (${fmtMoney(l.cost)})`).join(', ')}
                {!doc.canceled && ` · ödənilib ${fmtMoney(doc.paid)}`}
              </p>
            )}
            {!doc.canceled && (
              <button
                type="button"
                className="btn sm danger"
                onClick={() =>
                  undo(() => (kind === 'purchase' ? cancelPurchase({ purchase: doc, productMap }) : cancelSupplierPayment({ payment: doc })))
                }
              >
                Ləğv et
              </button>
            )}
          </div>
        ))}
        <p className="muted small">Son 90 günün əməliyyatları göstərilir. Borc bütün tarixi əhatə edir.</p>
      </section>

      <PaySheet open={paying} supplier={supplier} onClose={() => setPaying(false)} />
    </>
  )
}
