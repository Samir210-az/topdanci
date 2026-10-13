import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import Sheet from '../components/Sheet'
import { Empty, Field, MoneyInput, PageHeader, ProductImage, Segmented, Stepper } from '../components/ui'
import { useCart } from '../store/CartContext'
import { useData } from '../store/DataContext'
import { createSale } from '../lib/actions'
import { notify, reportError } from '../lib/events'
import { lotsOf, takeOldest, unitCost } from '../lib/lots'
import { fmtMoney, fromQepik, toQepik } from '../lib/money'

function CartLine({ line, product, onQty, onPrice, onRemove }) {
  const [price, setPrice] = useState(fromQepik(line.price))
  const stock = product?.stock || 0
  const cost = product ? unitCost(takeOldest(lotsOf(product), Math.min(line.qty, stock)).taken) : 0

  return (
    <div className="line">
      <div className="line-top">
        <ProductImage product={product || { name: '?' }} />
        <div className="grow">
          <strong>{product?.name || 'Silinmiş mal'}</strong>
          <span className={`small ${line.qty > stock ? 'amount-neg' : 'muted'}`}>
            Anbarda: {stock} {product?.unit}
          </span>
        </div>
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="Sil">
          <Icon name="close" />
        </button>
      </div>
      <div className="line-bottom">
        <Stepper value={line.qty} min={1} onChange={onQty} label="Say" />
        <MoneyInput
          value={price}
          aria-label="Vahid qiyməti"
          onChange={(value) => {
            setPrice(value)
            onPrice(toQepik(value))
          }}
        />
      </div>
      <div className="muted small">
        Cəmi: {fmtMoney(line.qty * line.price)} · Alış: {fmtMoney(cost)}
        {cost > 0 && line.price < cost && <b className="amount-neg"> · alışdan ucuzdur</b>}
      </div>
    </div>
  )
}

function ProductPicker({ open, onClose, onPick }) {
  const { products } = useData()
  const [q, setQ] = useState('')
  const term = q.trim().toLocaleLowerCase('az')
  const shown = products.filter((p) => (p.stock || 0) > 0 && (!term || p.name.toLocaleLowerCase('az').includes(term)))

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
        {shown.length === 0 && <p className="muted">Anbarda uyğun mal yoxdur.</p>}
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
                {p.stock} {p.unit}
              </span>
            </div>
            <span className="price">{fmtMoney(p.price)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function CustomerPicker({ open, onClose, onPick }) {
  const { customers } = useData()
  const [q, setQ] = useState('')
  const term = q.trim().toLocaleLowerCase('az')
  const shown = customers.filter((c) => !term || c.name.toLocaleLowerCase('az').includes(term))

  return (
    <Sheet open={open} title="Müştəri seç" onClose={onClose}>
      <input
        className="input"
        type="search"
        placeholder="Müştəri axtar"
        aria-label="Müştəri axtar"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      <div className="sheet-list">
        {shown.map((c) => (
          <button
            key={c.id}
            type="button"
            className="row"
            onClick={() => {
              onPick(c.id)
              onClose()
            }}
          >
            <div className="grow" style={{ textAlign: 'left' }}>
              <strong>{c.name}</strong>
            </div>
          </button>
        ))}
        <Link className="btn" to="/customers/new">
          <Icon name="plus" size={18} /> Yeni müştəri
        </Link>
      </div>
    </Sheet>
  )
}

export default function NewSale() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { productMap, customerMap } = useData()
  const cart = useCart()
  const [picker, setPicker] = useState(null)
  const [mode, setMode] = useState('full')
  const [partial, setPartial] = useState('')
  const [note, setNote] = useState('')

  const customerParam = params.get('customer')
  const { setCustomer } = cart
  useEffect(() => {
    if (customerParam) {
      setCustomer(customerParam)
      setParams({}, { replace: true })
    }
  }, [customerParam, setCustomer, setParams])

  const customer = cart.customerId ? customerMap[cart.customerId] : null
  const total = useMemo(() => cart.lines.reduce((sum, l) => sum + l.qty * l.price, 0), [cart.lines])
  const consign = cart.type === 'consign'
  const paid = mode === 'full' ? total : mode === 'credit' ? 0 : toQepik(partial)

  function submit() {
    if (!customer) return notify('Müştəri seç', 'error')
    try {
      createSale({ customer, lines: cart.lines, type: cart.type, paid, note: note.trim(), productMap })
      cart.clear()
      notify(consign ? 'Mal müştəriyə verildi' : 'Satış qeyd edildi', 'success')
      navigate(`/customers/${customer.id}`, { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader
        title="Yeni satış"
        actions={
          <Link to="/present" className="btn sm">
            <Icon name="present" size={18} /> Təqdimat
          </Link>
        }
      />

      <button type="button" className="row" onClick={() => setPicker('customer')}>
        <div className="grow" style={{ textAlign: 'left' }}>
          <span className="muted small">Müştəri</span>
          <strong>{customer ? customer.name : 'Seçilməyib'}</strong>
        </div>
        <Icon name="users" />
      </button>

      <Segmented
        label="Əməliyyat növü"
        value={cart.type}
        onChange={cart.setType}
        options={[
          { value: 'sale', label: 'Satış' },
          { value: 'consign', label: 'Satışa verilən' },
        ]}
      />
      {consign && (
        <p className="muted small">Mal müştəridə qalır, qiyməti borca yazılır. Satılanda “Hesablaşma”, satılmayanı qaytaranda “Mal qaytarma” ilə qeyd edəcəksən.</p>
      )}

      {cart.lines.length === 0 ? (
        <Empty title="Səbət boşdur" text="Mal seç və ya təqdimat rejimində səbətə at." />
      ) : (
        <div className="list">
          {cart.lines.map((line) => (
            <CartLine
              key={line.productId}
              line={line}
              product={productMap[line.productId]}
              onQty={(qty) => cart.setQty(line.productId, qty)}
              onPrice={(price) => cart.setPrice(line.productId, price)}
              onRemove={() => cart.remove(line.productId)}
            />
          ))}
        </div>
      )}

      <button type="button" className="btn block" onClick={() => setPicker('product')}>
        <Icon name="plus" size={18} /> Mal əlavə et
      </button>

      {cart.lines.length > 0 && (
        <>
          <Segmented
            label="Ödəniş"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'full', label: 'Tam' },
              { value: 'partial', label: 'Qismən' },
              { value: 'credit', label: 'Nisyə' },
            ]}
          />
          {mode === 'partial' && (
            <Field label="Alınan məbləğ, ₼">
              <MoneyInput value={partial} onChange={setPartial} />
            </Field>
          )}

          <Field label="Qeyd">
            <input className="input" value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} />
          </Field>

          <div className="summary">
            <div className="total">
              <span>Cəmi</span>
              <span>{fmtMoney(total)}</span>
            </div>
            <div>
              <span>Ödənilir</span>
              <span>{fmtMoney(paid)}</span>
            </div>
            <div>
              <span>Borca yazılır</span>
              <span className={total - paid > 0 ? 'amount-neg' : ''}>{fmtMoney(Math.max(total - paid, 0))}</span>
            </div>
          </div>

          <div className="sticky-action">
            <button type="button" className="btn primary block" onClick={submit}>
              {consign ? 'Malı müştəriyə ver' : 'Satışı təsdiqlə'}
            </button>
          </div>
          <button type="button" className="btn danger block" onClick={cart.clear}>
            Səbəti boşalt
          </button>
        </>
      )}

      <ProductPicker open={picker === 'product'} onClose={() => setPicker(null)} onPick={(p) => cart.add(p)} />
      <CustomerPicker open={picker === 'customer'} onClose={() => setPicker(null)} onPick={cart.setCustomer} />
    </>
  )
}
