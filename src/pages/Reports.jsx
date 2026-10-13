import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Empty, PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'
import { addDays, dateKey, startOfDay } from '../lib/dates'
import { downloadCsv } from '../lib/csv'
import { lotsOf } from '../lib/lots'
import { fmtMoney, fromQepik } from '../lib/money'

const PERIODS = [
  { id: 1, label: 'Bu gün' },
  { id: 7, label: '7 gün' },
  { id: 30, label: '30 gün' },
  { id: 90, label: '90 gün' },
]

const TABS = [
  ['sales', 'Satışlar'],
  ['debts', 'Borclar'],
  ['stock', 'Qalıq'],
]

function CsvButton({ onClick }) {
  return (
    <button type="button" className="btn block" onClick={onClick}>
      <Icon name="download" size={18} /> CSV yüklə
    </button>
  )
}

function Sales({ days }) {
  const { sales, payments } = useData()

  const report = useMemo(() => {
    const from = dateKey(addDays(startOfDay(), -(days - 1)))
    const rows = sales.filter((s) => s.dateKey >= from && !s.canceled)
    const real = rows.filter((s) => s.type === 'sale' || s.type === 'settle')
    const back = rows.filter((s) => s.type === 'return')
    const margin = (s) => s.items.reduce((p, l) => p + l.qty * l.price - (l.costTotal ?? l.qty * (l.cost || 0)), 0)
    const revenue = real.reduce((sum, s) => sum + s.total, 0) - back.reduce((sum, s) => sum + s.total, 0)
    const profit = real.reduce((sum, s) => sum + margin(s), 0) - back.reduce((sum, s) => sum + margin(s), 0)
    const newDebt = rows.reduce((sum, s) => sum + Math.max(s.fx?.balance ?? s.total - s.paid, 0), 0)
    const collected =
      rows.reduce((sum, s) => sum + (s.paid || 0), 0) +
      payments.filter((p) => p.dateKey >= from && !p.canceled).reduce((sum, p) => sum + p.amount, 0)

    const byProduct = {}
    for (const sale of [...real, ...back]) {
      const sign = sale.type === 'return' ? -1 : 1
      for (const line of sale.items) {
        const entry = (byProduct[line.productId] ||= { name: line.name, unit: line.unit, qty: 0, sum: 0 })
        entry.qty += sign * line.qty
        entry.sum += sign * line.qty * line.price
      }
    }
    const top = Object.entries(byProduct)
      .map(([id, entry]) => ({ id, ...entry }))
      .filter((p) => p.qty > 0)
      .sort((a, b) => b.sum - a.sum)
    return { revenue, profit, newDebt, collected, top, rows }
  }, [sales, payments, days])

  function exportCsv() {
    downloadCsv('satislar.csv', [
      ['Tarix', 'Müştəri', 'Növ', 'Cəmi', 'Ödənilib'],
      ...report.rows.map((s) => [s.dateKey, s.customerName, s.type, fromQepik(s.total), fromQepik(s.paid || 0)]),
    ])
  }

  return (
    <>
      <div className="stats">
        <div className="stat hero">
          <span>Satış</span>
          <strong>{fmtMoney(report.revenue)}</strong>
        </div>
        <div className="stat">
          <span>Yığılan pul</span>
          <strong>{fmtMoney(report.collected)}</strong>
        </div>
        <div className="stat">
          <span>Yeni borc</span>
          <strong>{fmtMoney(report.newDebt)}</strong>
        </div>
        <div className="stat">
          <span>Mənfəət</span>
          <strong>{fmtMoney(report.profit)}</strong>
        </div>
      </div>
      <p className="muted small">Mənfəət satış anındakı alış qiymətinə görə hesablanır. Satışa verilən mal satılanda satış sayılır, qaytarılan mal çıxılır.</p>

      <h2>Ən çox satılanlar</h2>
      {report.top.length === 0 ? (
        <Empty title="Bu dövrdə satış yoxdur" />
      ) : (
        <div className="list">
          {report.top.slice(0, 10).map((p) => (
            <div key={p.id} className="row">
              <div className="grow">
                <strong>{p.name}</strong>
                <span className="muted small">
                  {p.qty} {p.unit}
                </span>
              </div>
              <b>{fmtMoney(p.sum)}</b>
            </div>
          ))}
        </div>
      )}
      {report.rows.length > 0 && <CsvButton onClick={exportCsv} />}
    </>
  )
}

function Debts() {
  const { customers, suppliers } = useData()
  const owed = suppliers.reduce((sum, x) => sum + Math.max(x.balance || 0, 0), 0)
  const debtors = customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance)
  const total = debtors.reduce((sum, c) => sum + c.balance, 0)

  function exportCsv() {
    downloadCsv('borclar.csv', [
      ['Müştəri', 'Telefon', 'Borc'],
      ...debtors.map((c) => [c.name, c.phone || '', fromQepik(c.balance)]),
    ])
  }

  return (
    <>
      <div className="summary">
        <div>
          <span>Mənim təchizatçılara borcum</span>
          <span>{fmtMoney(owed)}</span>
        </div>
        <div className="total">
          <span>Ümumi borc</span>
          <span>{fmtMoney(total)}</span>
        </div>
        <div>
          <span>Müştəri sayı</span>
          <span>{debtors.length}</span>
        </div>
      </div>
      {!debtors.length && <Empty title="Borcu olan müştəri yoxdur" />}
      <div className="list">
        {debtors.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}`} className="row">
            <div className="grow">
              <strong>{c.name}</strong>
              <span className="muted small">{c.phone || ' '}</span>
            </div>
            <b className="amount-neg">{fmtMoney(c.balance)}</b>
          </Link>
        ))}
      </div>
      {debtors.length > 0 && <CsvButton onClick={exportCsv} />}
    </>
  )
}

function Stock() {
  const { products, customers, productMap } = useData()

  const rows = useMemo(() => {
    const held = {}
    for (const c of customers) {
      for (const [id, qty] of Object.entries(c.holdings || {})) held[id] = (held[id] || 0) + Math.max(qty, 0)
    }
    return products.map((p) => ({ ...p, held: held[p.id] || 0 }))
  }, [products, customers])

  const warehouseValue = rows.reduce((sum, p) => sum + lotsOf(p).reduce((t, l) => t + l.qty * l.cost, 0), 0)
  const heldValue = customers.reduce(
    (sum, c) =>
      sum +
      Object.entries(c.holdings || {}).reduce((t, [id, qty]) => {
        if (qty <= 0) return t
        return t + (c.holdCost?.[id] ?? qty * (productMap[id]?.cost || 0))
      }, 0),
    0,
  )

  function exportCsv() {
    downloadCsv('qaliq.csv', [
      ['Mal', 'Vahid', 'Anbarda', 'Müştərilərdə', 'Satış qiyməti'],
      ...rows.map((p) => [p.name, p.unit, p.stock || 0, p.held, fromQepik(p.price)]),
    ])
  }

  if (!rows.length) return <Empty title="Mal yoxdur" />
  return (
    <>
      <div className="stats">
        <div className="stat">
          <span>Anbar (alış qiyməti ilə)</span>
          <strong>{fmtMoney(warehouseValue)}</strong>
        </div>
        <div className="stat">
          <span>Müştərilərdə (alış qiyməti ilə)</span>
          <strong>{fmtMoney(heldValue)}</strong>
        </div>
      </div>
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Mal</th>
              <th className="num">Anbarda</th>
              <th className="num">Müştəridə</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="num">
                  {p.stock || 0} {p.unit}
                </td>
                <td className="num">{p.held}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CsvButton onClick={exportCsv} />
    </>
  )
}

export default function Reports() {
  const [tab, setTab] = useState('sales')
  const [days, setDays] = useState(7)

  return (
    <>
      <PageHeader title="Hesabatlar" />
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'on' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <>
          <div className="chips">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" className={days === p.id ? 'on' : ''} onClick={() => setDays(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <Sales days={days} />
        </>
      )}
      {tab === 'debts' && <Debts />}
      {tab === 'stock' && <Stock />}
    </>
  )
}
