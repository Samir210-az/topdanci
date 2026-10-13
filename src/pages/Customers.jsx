import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { BalanceChip, Empty, PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'

export default function Customers() {
  const { customers } = useData()
  const [q, setQ] = useState('')
  const [onlyDebt, setOnlyDebt] = useState(false)

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('az')
    return customers.filter(
      (c) =>
        (!onlyDebt || c.balance > 0) &&
        (!term || `${c.name} ${c.phone || ''} ${c.address || ''}`.toLocaleLowerCase('az').includes(term)),
    )
  }, [customers, q, onlyDebt])

  return (
    <>
      <PageHeader
        title="Müştərilər"
        actions={
          <Link to="/customers/new" className="btn sm primary">
            <Icon name="plus" size={18} /> Yeni
          </Link>
        }
      />

      <div className="search">
        <Icon name="search" size={20} />
        <input
          className="input"
          type="search"
          placeholder="Ad, telefon və ya ünvan"
          aria-label="Müştəri axtar"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

      <div className="chips">
        <button type="button" className={onlyDebt ? '' : 'on'} onClick={() => setOnlyDebt(false)}>
          Hamısı
        </button>
        <button type="button" className={onlyDebt ? 'on' : ''} onClick={() => setOnlyDebt(true)}>
          Borcu olanlar
        </button>
      </div>

      {customers.length === 0 ? (
        <Empty title="Müştəri bazası boşdur" to="/customers/new" action="Müştəri əlavə et" />
      ) : shown.length === 0 ? (
        <Empty title="Heç nə tapılmadı" />
      ) : (
        <div className="list">
          {shown.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="row">
              <div className="grow">
                <strong>{customer.name}</strong>
                <span className="muted small">{customer.address || customer.phone || ' '}</span>
              </div>
              <BalanceChip balance={customer.balance || 0} />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
