import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PageHeader, Segmented } from '../components/ui'
import { useData } from '../store/DataContext'
import { dateKey, toDate, fmtTime } from '../lib/dates'
import { fmtMoney } from '../lib/money'
import { summarize } from '../lib/summary'

const TYPE_LABEL = { sale: 'satış', consign: 'satışa verilən', settle: 'hesablaşma', return: 'qaytarma' }

export default function Dashboard() {
  const { sales, payments, customers, suppliers, products, productMap } = useData()
  const [period, setPeriod] = useState('day')

  const view = useMemo(() => {
    const today = dateKey(new Date())
    const from = period === 'day' ? today : `${today.slice(0, 7)}-01`
    const live = sales.filter((s) => !s.canceled)
    const inPeriod = live.filter((s) => s.dateKey >= from)

    const { revenue, cost, profit } = summarize(inPeriod)
    const consigned = inPeriod.filter((s) => s.type === 'consign').reduce((sum, s) => sum + s.total, 0)
    const collected =
      inPeriod.reduce((sum, s) => sum + (s.paid || 0), 0) +
      payments.filter((p) => p.dateKey >= from && !p.canceled).reduce((sum, p) => sum + p.amount, 0)

    const debt = customers.reduce((sum, c) => sum + Math.max(c.balance || 0, 0), 0)
    const owed = suppliers.reduce((sum, s) => sum + Math.max(s.balance || 0, 0), 0)
    const atCustomers = customers.reduce(
      (sum, c) =>
        sum +
        Object.entries(c.holdings || {}).reduce((s, [id, qty]) => s + Math.max(qty, 0) * (productMap[id]?.price || 0), 0),
      0,
    )
    const low = products.filter((p) => (p.stock || 0) <= (p.lowStock ?? 5))
    const todaySales = live.filter((s) => s.dateKey === today)
    return { todaySales, revenue, cost, profit, consigned, collected, debt, atCustomers, owed, low }
  }, [sales, payments, customers, suppliers, products, productMap, period])

  return (
    <>
      <PageHeader title="Əsas" />

      <div className="quick">
        <Link to="/sale" className="btn primary">
          <Icon name="cart" /> Satış
        </Link>
        <Link to="/customers" className="btn">
          <Icon name="users" /> Ödəniş al
        </Link>
        <Link to="/present" className="btn">
          <Icon name="present" /> Təqdimat
        </Link>
        <Link to="/purchases/new" className="btn">
          <Icon name="box" /> Mal alışı
        </Link>
        <Link to="/suppliers" className="btn">
          <Icon name="download" /> Təchizatçılar
        </Link>
        <Link to="/products/new" className="btn">
          <Icon name="plus" /> Yeni mal
        </Link>
      </div>

      <Link to="/guide" className="btn block guide-link">
        <Icon name="book" /> İstifadə təlimatı
      </Link>

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

      <section className="stack">
        <Segmented
          label="Hesabat dövrü"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'day', label: 'Bu gün' },
            { value: 'month', label: 'Bu ay' },
          ]}
        />
        <div className="stats">
          <div className="stat hero">
            <span>Satış</span>
            <strong>{fmtMoney(view.revenue)}</strong>
          </div>
          <Link to="/reports" className="stat profit">
            <span>Qazanc (satış − alış)</span>
            <strong>{fmtMoney(view.profit)}</strong>
            <small>Satılan malın alış dəyəri: {fmtMoney(view.cost)}</small>
          </Link>
          <div className="stat">
            <span>Yığılan pul</span>
            <strong>{fmtMoney(view.collected)}</strong>
          </div>
          <div className="stat">
            <span>Satışa verilən</span>
            <strong>{fmtMoney(view.consigned)}</strong>
          </div>
          <Link to="/customers" className="stat">
            <span>Müştərilərin borcu</span>
            <strong>{fmtMoney(view.debt)}</strong>
          </Link>
          <Link to="/suppliers" className="stat">
            <span>Təchizatçılara borcum</span>
            <strong>{fmtMoney(view.owed)}</strong>
          </Link>
          <Link to="/reports" className="stat">
            <span>Müştərilərdə mal (borca daxildir)</span>
            <strong>{fmtMoney(view.atCustomers)}</strong>
          </Link>
        </div>
      </section>
    </>
  )
}
