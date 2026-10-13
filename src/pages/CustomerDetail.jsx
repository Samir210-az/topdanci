import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import Sheet from '../components/Sheet'
import { BalanceChip, Field, MoneyInput, PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'
import { cancelPayment, cancelSale, createPayment } from '../lib/actions'
import { notify, reportError } from '../lib/events'
import { fmtMoney, toQepik } from '../lib/money'
import { fmtDateTime, toDate } from '../lib/dates'
import { buildReceipt, sendText, telLink, waLink } from '../lib/share'

const METHODS = ['Nağd', 'Kart', 'Köçürmə']
const TYPE_LABEL = { sale: 'Satış', consign: 'Konsiqnasiya', settle: 'Hesablaşma' }

function PaymentSheet({ open, customer, onClose }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState(METHODS[0])
  const [note, setNote] = useState('')
  const debt = Math.max(customer.balance || 0, 0)

  function submit(event) {
    event.preventDefault()
    try {
      createPayment({ customer, amount: toQepik(amount), method, note: note.trim() })
      notify('Ödəniş qeyd edildi', 'success')
      setAmount('')
      setNote('')
      onClose()
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Sheet open={open} title="Ödəniş qəbulu" onClose={onClose}>
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
        <Field label="Qeyd">
          <input className="input" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} />
        </Field>
        <button className="btn primary block">Qəbul et</button>
      </form>
    </Sheet>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const { customerMap, productMap, sales, payments } = useData()
  const [paying, setPaying] = useState(false)
  const customer = customerMap[id]

  const history = useMemo(() => {
    const mine = [
      ...sales.filter((s) => s.customerId === id).map((s) => ({ kind: 'sale', at: toDate(s.createdAt), doc: s })),
      ...payments.filter((p) => p.customerId === id).map((p) => ({ kind: 'payment', at: toDate(p.createdAt), doc: p })),
    ]
    return mine.sort((a, b) => b.at - a.at)
  }, [sales, payments, id])

  if (!customer) return <PageHeader title="Müştəri tapılmadı" back />

  const holdings = Object.entries(customer.holdings || {})
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId, qty, product: productMap[productId] }))
  const holdingsValue = holdings.reduce((sum, h) => sum + h.qty * (h.product?.price || 0), 0)

  function run(fn) {
    if (!window.confirm('Bu əməliyyat ləğv edilsin? Mal və borc əvvəlki vəziyyətə qayıdacaq.')) return
    try {
      fn()
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader
        title={customer.name}
        back
        actions={
          <Link to={`/customers/${id}/edit`} className="icon-btn" aria-label="Redaktə et">
            <Icon name="edit" />
          </Link>
        }
      />

      <section className="card stack">
        <div className="row" style={{ border: 0, padding: 0 }}>
          <div className="grow">
            <span className="muted small">Hesab</span>
            <div>
              <BalanceChip balance={customer.balance || 0} />
            </div>
          </div>
          {customer.phone && (
            <>
              <a className="icon-btn" href={telLink(customer.phone)} aria-label="Zəng et">
                <Icon name="phone" />
              </a>
              <a
                className="icon-btn"
                href={waLink(customer.phone)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <Icon name="send" />
              </a>
            </>
          )}
        </div>
        {(customer.address || customer.note) && (
          <p className="muted small">{[customer.address, customer.note].filter(Boolean).join(' · ')}</p>
        )}
        <div className="form-grid">
          <Link className="btn primary" to={`/sale?customer=${id}`}>
            Satış
          </Link>
          <button type="button" className="btn accent" onClick={() => setPaying(true)}>
            Ödəniş al
          </button>
        </div>
      </section>

      {holdings.length > 0 && (
        <section className="card stack">
          <div className="section-title">
            <h2>Müştəridə olan mal</h2>
            <span className="muted small">{fmtMoney(holdingsValue)}</span>
          </div>
          <div className="list">
            {holdings.map((h) => (
              <div key={h.productId} className="row">
                <div className="grow">
                  <strong>{h.product?.name || 'Silinmiş mal'}</strong>
                </div>
                <span className="badge warn">
                  {h.qty} {h.product?.unit}
                </span>
              </div>
            ))}
          </div>
          <Link className="btn block" to={`/customers/${id}/settle`}>
            Hesablaşma / qaytarma
          </Link>
        </section>
      )}

      <section className="stack">
        <h2>Tarixçə</h2>
        {history.length === 0 && <p className="muted">Hələ əməliyyat yoxdur.</p>}
        {history.map(({ kind, at, doc }) => (
          <div key={`${kind}-${doc.id}`} className="card stack" style={{ opacity: doc.canceled ? 0.55 : 1 }}>
            <div className="row" style={{ border: 0, padding: 0 }}>
              <div className="grow">
                <strong>{kind === 'sale' ? TYPE_LABEL[doc.type] : `Ödəniş · ${doc.method}`}</strong>
                <span className="muted small">{fmtDateTime(at)}</span>
              </div>
              {doc.canceled ? (
                <span className="badge muted-badge">Ləğv edilib</span>
              ) : (
                <b className={kind === 'payment' ? 'amount-pos' : ''}>
                  {kind === 'payment' ? '+' : ''}
                  {fmtMoney(kind === 'payment' ? doc.amount : doc.total)}
                </b>
              )}
            </div>
            {kind === 'sale' && (
              <>
                <p className="muted small">
                  {doc.items.map((l) => `${l.name} ×${l.qty}`).join(', ')}
                  {doc.returned?.length ? ` · qaytarılıb: ${doc.returned.map((l) => `${l.name} ×${l.qty}`).join(', ')}` : ''}
                </p>
                {doc.type !== 'consign' && !doc.canceled && (
                  <p className="small">
                    Ödənilib {fmtMoney(doc.paid)}
                    {doc.total > doc.paid && <span className="amount-neg"> · qalıq {fmtMoney(doc.total - doc.paid)}</span>}
                  </p>
                )}
              </>
            )}
            {doc.note && <p className="muted small">{doc.note}</p>}
            {!doc.canceled && (
              <div className="page-actions" style={{ marginLeft: 0 }}>
                {kind === 'sale' && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => sendText(buildReceipt(doc, customer.balance), customer.phone)}
                  >
                    <Icon name="send" size={16} /> Qaimə göndər
                  </button>
                )}
                <button
                  type="button"
                  className="btn sm danger"
                  onClick={() =>
                    run(() =>
                      kind === 'sale'
                        ? cancelSale({ sale: doc, customer, productMap })
                        : cancelPayment({ payment: doc }),
                    )
                  }
                >
                  Ləğv et
                </button>
              </div>
            )}
          </div>
        ))}
        <p className="muted small">Son 90 günün əməliyyatları göstərilir. Balans bütün tarixi əhatə edir.</p>
      </section>

      <PaymentSheet open={paying} customer={customer} onClose={() => setPaying(false)} />
    </>
  )
}
