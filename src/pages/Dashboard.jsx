import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'
import { dateKey, toDate, fmtTime } from '../lib/dates'
import { fmtMoney } from '../lib/money'

const TYPE_LABEL = { sale: 'satış', consign: 'konsiqnasiya', settle: 'hesablaşma' }

export default function Dashboard() {
  const { sales, payments, customers, suppliers, products, productMap } = useData()

  const view = useMemo(() => {
    const today = dateKey(new Date())
    const todaySales = sales.filter((s) => s.dateKey === today && !s.canceled)
    const revenue = todaySales.filter((s) => s.type !== 'consign').reduce((sum, s) => sum + s.total, 0)
    const consigned = todaySales.filter((s) => s.type === 'consign').reduce((sum, s) => sum + s.total, 0)
    const collected =
      todaySales.reduce((sum, s) => sum + (s.paid || 0), 0) +
      payments.filter((p) => p.dateKey === today && !p.canceled).reduce((sum, p) => sum + p.amount, 0)
    const debt = customers.reduce((sum, c) => sum + Math.max(c.balance || 0, 0), 0)
    const atCustomers = customers.reduce(
      (sum, c) =>
        sum +
        Object.entries(c.holdings || {}).reduce((s, [id, qty]) => s + Math.max(qty, 0) * (productMap[id]?.price || 0), 0),
      0,
    )
    const owed = suppliers.reduce((sum, s) => sum + Math.max(s.balance || 0, 0), 0)
    const low = products.filter((p) => (p.stock || 0) <= (p.lowStock ?? 5))
    return { todaySales, revenue, consigned, collected, debt, atCustomers, owed, low }
  }, [sales, payments, customers, suppliers, products, productMap])

  return (
    <>
      <PageHeader title="Bu gün" />

      <div className="stats">
        <div className="stat hero">
          <span>Satış</span>
          <strong>{fmtMoney(view.revenue)}</strong>
        </div>
        <div className="stat">
          <span>Yığılan pul</span>
          <strong>{fmtMoney(view.collected)}</strong>
        </div>
        <Link to="/customers" className="stat">
          <span>Ümumi borc</span>
          <strong>{fmtMoney(view.debt)}</strong>
        </Link>
        <Link to="/reports" className="stat">
          <span>Müştərilərdə mal</span>
          <strong>{fmtMoney(view.atCustomers)}</strong>
        </Link>
        <Link to="/purchases" className="stat">
          <span>Təchizatçılara borcum</span>
          <strong>{fmtMoney(view.owed)}</strong>
        </Link>
        <div className="stat">
          <span>Bu gün konsiqnasiyaya verilən</span>
          <strong>{fmtMoney(view.consigned)}</strong>
        </div>
      </div>

      <div className="quick">
        <Link to="/sale" className="btn primary">
          <Icon name="cart" /> Satış
        </Link>
        <Link to="/present" className="btn">
          <Icon name="present" /> Təqdimat
        </Link>
        <Link to="/customers" className="btn">
          <Icon name="users" /> Ödəniş al
        </Link>
        <Link to="/purchases/new" className="btn">
          <Icon name="box" /> Mal alışı
        </Link>
        <Link to="/purchases" className="btn">
          <Icon name="download" /> Təchizatçılar
        </Link>
        <Link to="/reports" className="btn">
          <Icon name="chart" /> Hesabat
        </Link>
      </div>

      {view.low.length > 0 && (
        <section className="stack">
          <h2>Azalan mallar</h2>
          <div className="list">
            {view.low.slice(0, 5).map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="row">
                <div className="grow">
                  <strong>{p.name}</strong>
                </div>
                <span className={`badge ${p.stock > 0 ? 'warn' : 'bad'}`}>
                  {p.stock > 0 ? `${p.stock} ${p.unit}` : 'Qalmayıb'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>Bu günün əməliyyatları</h2>
        {view.todaySales.length === 0 && <p className="muted">Bu gün hələ satış yoxdur.</p>}
        <div className="list">
          {view.todaySales.slice(0, 8).map((s) => (
            <Link key={s.id} to={`/customers/${s.customerId}`} className="row">
              <div className="grow">
                <strong>{s.customerName}</strong>
                <span className="muted small">
                  {fmtTime(toDate(s.createdAt))} · {TYPE_LABEL[s.type]}
                </span>
              </div>
              <b>{fmtMoney(s.total)}</b>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
