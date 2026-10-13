import { Link, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { fmtMoney } from '../lib/money'

export function PageHeader({ title, back, actions }) {
  const navigate = useNavigate()
  return (
    <div className="page-head">
      {back && (
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Geri">
          <Icon name="back" />
        </button>
      )}
      <h1>{title}</h1>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Empty({ title, text, to, action }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {text && <p className="muted">{text}</p>}
      {to && (
        <Link className="btn primary" to={to}>
          {action}
        </Link>
      )}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Segmented({ label, value, onChange, options }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'on' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, max = Infinity, label }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? Math.trunc(n) : min)))
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Azalt">
        <Icon name="minus" size={18} />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(event) => set(Number(event.target.value.replace(/\D/g, '')))}
        aria-label={label}
      />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Artır">
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

export function MoneyInput({ value, onChange, ...rest }) {
  return (
    <input
      className="input"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ''))}
      {...rest}
    />
  )
}

export function BalanceChip({ balance }) {
  if (balance > 0) return <span className="badge bad">Borc: {fmtMoney(balance)}</span>
  if (balance < 0) return <span className="badge ok">Avans: {fmtMoney(-balance)}</span>
  return <span className="badge muted-badge">Borc yoxdur</span>
}

export function StockBadge({ product }) {
  const stock = product.stock || 0
  const low = product.lowStock ?? 5
  if (stock <= 0) return <span className="badge bad">Qalmayıb</span>
  if (stock <= low) return <span className="badge warn">Azdır: {stock} {product.unit}</span>
  return <span className="badge ok">{stock} {product.unit}</span>
}

export function ProductImage({ product, className = '' }) {
  if (product.image) {
    return <img className={`pimg ${className}`} src={product.image} alt={product.name} loading="lazy" />
  }
  return (
    <div className={`pimg placeholder ${className}`} aria-hidden="true">
      {(product.name || '?').slice(0, 1).toLocaleUpperCase('az')}
    </div>
  )
}
