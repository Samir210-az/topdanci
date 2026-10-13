import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Empty, PageHeader, ProductImage, StockBadge } from '../components/ui'
import { useData } from '../store/DataContext'
import { fmtMoney } from '../lib/money'

export default function Products() {
  const { products } = useData()
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('az')
    return term ? products.filter((p) => p.name.toLocaleLowerCase('az').includes(term)) : products
  }, [products, q])

  return (
    <>
      <PageHeader
        title="Mallar"
        actions={
          <>
            <Link to="/present" className="btn sm">
              <Icon name="present" size={18} /> Təqdimat
            </Link>
            <Link to="/products/new" className="btn sm primary">
              <Icon name="plus" size={18} /> Yeni
            </Link>
          </>
        }
      />

      <div className="search">
        <Icon name="search" size={20} />
        <input
          className="input"
          type="search"
          placeholder="Mal axtar"
          aria-label="Mal axtar"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

      {products.length === 0 ? (
        <Empty title="Hələ mal yoxdur" text="İlk malı şəkli ilə əlavə et." to="/products/new" action="Mal əlavə et" />
      ) : shown.length === 0 ? (
        <Empty title="Heç nə tapılmadı" />
      ) : (
        <div className="product-grid">
          {shown.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`} className="pcard">
              <ProductImage product={product} />
              <div className="pcard-body">
                <strong>{product.name}</strong>
                <span className="price">{fmtMoney(product.price)}</span>
                <StockBadge product={product} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
