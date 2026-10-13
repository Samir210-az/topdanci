import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import Sheet from '../components/Sheet'
import SupplierPicker from '../components/SupplierPicker'
import { Field, MoneyInput, PageHeader, Segmented, Stepper, StockBadge } from '../components/ui'
import { UNITS } from '../config'
import { useData } from '../store/DataContext'
import { adjustStock, createPurchase, saveProduct, setProductArchived } from '../lib/actions'
import { notify, reportError } from '../lib/events'
import { fileToDataUrl } from '../lib/image'
import { fromQepik, toQepik } from '../lib/money'

function ProductEditor({ product }) {
  const navigate = useNavigate()
  const { suppliers, productMap } = useData()
  const [supplier, setSupplier] = useState(null)
  const [mode, setMode] = useState('full')
  const [partial, setPartial] = useState('')
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product ? fromQepik(product.price) : '',
    cost: product?.cost ? fromQepik(product.cost) : '',
    unit: product?.unit || UNITS[0],
    lowStock: product?.lowStock ?? 5,
    image: product?.image || '',
  })
  const [initialStock, setInitialStock] = useState(0)
  const [sheet, setSheet] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  async function pickImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      set('image')(await fileToDataUrl(file))
    } catch {
      notify('Şəkil oxunmadı. Başqa şəkil seç', 'error')
    } finally {
      setBusy(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const price = toQepik(form.price)
    if (!name) return notify('Malın adını yaz', 'error')
    if (price <= 0) return notify('Satış qiymətini yaz', 'error')

    try {
      const data = {
        name,
        price,
        ...(product ? {} : { cost: toQepik(form.cost) }),
        unit: form.unit,
        lowStock: form.lowStock,
        image: form.image,
      }

      const buying = !product && initialStock > 0 && supplier
      if (buying && data.cost <= 0) return notify('Təchizatçıdan alışı yazmaq üçün alış qiymətini yaz', 'error')

      const id = saveProduct({ id: product?.id, data, initialStock: buying ? 0 : initialStock })
      if (buying) {
        const total = initialStock * data.cost
        const draft = { id, name, unit: data.unit, stock: 0, lots: [], cost: data.cost }
        createPurchase({
          supplier,
          lines: [{ productId: id, qty: initialStock, cost: data.cost }],
          paid: mode === 'full' ? total : mode === 'credit' ? 0 : toQepik(partial),
          productMap: { ...productMap, [id]: draft },
        })
      }
      navigate('/products', { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader title={product ? 'Malı redaktə et' : 'Yeni mal'} back />

      <form className="stack" onSubmit={submit}>
        <label className="photo-pick">
          {form.image ? (
            <img src={form.image} alt="Seçilmiş şəkil" />
          ) : (
            <>
              <Icon name="camera" size={32} />
              <span>{busy ? 'Hazırlanır…' : 'Şəkil çək və ya seç'}</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={pickImage} />
        </label>

        <Field label="Ad">
          <input
            className="input"
            value={form.name}
            onChange={(event) => set('name')(event.target.value)}
            maxLength={80}
            required
          />
        </Field>

        <div className="form-grid">
          <Field label="Satış qiyməti, ₼">
            <MoneyInput value={form.price} onChange={set('price')} />
          </Field>
          {!product && (
            <Field label="Alış qiyməti, ₼" hint="Başlanğıc qalıq üçün. Sonra alış səhifəsindən avtomatik gəlir">
              <MoneyInput value={form.cost} onChange={set('cost')} />
            </Field>
          )}
          <Field label="Ölçü vahidi">
            <select className="input" value={form.unit} onChange={(event) => set('unit')(event.target.value)}>
              {UNITS.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </Field>
          <Field label="Az qalıb həddi">
            <Stepper value={form.lowStock} onChange={set('lowStock')} label="Az qalıb həddi" />
          </Field>
          {!product && (
            <div className="wide">
              <Field label="Başlanğıc qalıq">
                <Stepper value={initialStock} onChange={setInitialStock} label="Başlanğıc qalıq" />
              </Field>
            </div>
          )}
        </div>

        {!product && (
          <SupplierPicker optional suppliers={suppliers} value={supplier} onChange={setSupplier} />
        )}
        {!product && supplier && initialStock > 0 && (
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
          </>
        )}

        <button className="btn primary block" disabled={busy}>
          Yadda saxla
        </button>
      </form>

      {product && (
        <section className="card stack">
          <div className="row" style={{ border: 0, padding: 0 }}>
            <div className="grow">
              <strong>Anbarda qalıq</strong>
            </div>
            <StockBadge product={product} />
          </div>
          <div className="form-grid">
            <Link className="btn" to={`/purchases/new?product=${product.id}`}>
              Mal alışı
            </Link>
            <button type="button" className="btn" onClick={() => setSheet('adjust')}>
              Sayı düzəlt
            </button>
          </div>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setProductArchived(product.id, true)
              navigate('/products', { replace: true })
            }}
          >
            Arxivə at
          </button>
          <p className="field-hint">Arxivə atılmış mal siyahıda görünmür, köhnə satışlar dəyişmir.</p>
        </section>
      )}

      {product && (
        <>
          <AdjustSheet open={sheet === 'adjust'} product={product} onClose={() => setSheet(null)} />
        </>
      )}
    </>
  )
}

function AdjustSheet({ open, product, onClose }) {
  const [actual, setActual] = useState(product.stock || 0)

  function submit(event) {
    event.preventDefault()
    try {
      adjustStock({ product, actual })
      onClose()
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Sheet open={open} title="Faktiki qalıq" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">Sistemdə: {product.stock || 0} {product.unit}. Saydığın real sayı yaz.</p>
        <Stepper value={actual} onChange={setActual} label="Faktiki say" />
        <button className="btn primary block">Düzəlt</button>
      </form>
    </Sheet>
  )
}

export default function ProductForm() {
  const { id } = useParams()
  const { productMap } = useData()
  const product = id ? productMap[id] : null

  if (id && !product) return <PageHeader title="Mal tapılmadı" back />
  return <ProductEditor key={id || 'new'} product={product} />
}
