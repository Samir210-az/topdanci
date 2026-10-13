import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Empty, PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'
import { fmtMoney } from '../lib/money'

export default function Purchases() {
  const { suppliers } = useData()
  const owed = suppliers.reduce((sum, s) => sum + Math.max(s.balance || 0, 0), 0)

  return (
    <>
      <PageHeader
        title="Alış"
        back
        actions={
          <Link to="/purchases/new" className="btn sm primary">
            <Icon name="plus" size={18} /> Yeni alış
          </Link>
        }
      />

      <div className="summary">
        <div className="total">
          <span>Təchizatçılara borcum</span>
          <span>{fmtMoney(owed)}</span>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <Empty title="Hələ təchizatçı yoxdur" text="İlk alışı yazanda təchizatçı da əlavə olunur." to="/purchases/new" action="Alış yaz" />
      ) : (
        <div className="list">
          {suppliers.map((supplier) => (
            <Link key={supplier.id} to={`/suppliers/${supplier.id}`} className="row">
              <div className="grow">
                <strong>{supplier.name}</strong>
              </div>
              {supplier.balance > 0 ? (
                <span className="badge bad">Borcum: {fmtMoney(supplier.balance)}</span>
              ) : (
                <span className="badge muted-badge">Borc yoxdur</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
