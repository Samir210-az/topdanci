import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ProductImage } from '../components/ui'
import { useCart } from '../store/CartContext'
import { useData } from '../store/DataContext'
import { fmtMoney } from '../lib/money'

export default function Present() {
  const navigate = useNavigate()
  const { products, ready } = useData()
  const { add, lines, count } = useCart()
  const [flash, setFlash] = useState(null)
  const [index, setIndex] = useState(0)

  const inCart = useMemo(() => Object.fromEntries(lines.map((l) => [l.productId, l.qty])), [lines])
  const available = products.filter((p) => (p.stock || 0) > 0)

  function onScroll(event) {
    const { scrollTop, clientHeight } = event.currentTarget
    setIndex(Math.round(scrollTop / clientHeight))
  }

  function addToCart(product) {
    add(product)
    setFlash(product.id)
    setTimeout(() => setFlash((current) => (current === product.id ? null : current)), 1200)
  }

  return (
    <div className="present" onScroll={onScroll}>
      <div className="present-bar">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Bağla">
          <Icon name="close" />
        </button>
        <Link to="/sale" className="cart-pill">
          <Icon name="cart" size={20} /> Səbət: {count}
        </Link>
      </div>

      {available.length > 0 && (
        <span className="present-progress" aria-hidden="true">
          {Math.min(index + 1, available.length)}/{available.length}
        </span>
      )}

      {!ready || available.length === 0 ? (
        <section className="slide">
          <div className="slide-info">
            <h2>{ready ? 'Göstəriləcək mal yoxdur' : 'Yüklənir…'}</h2>
          </div>
        </section>
      ) : (
        available.map((product) => (
          <section key={product.id} className="slide" aria-label={product.name}>
            <ProductImage product={product} />
            <div className="slide-info">
              <h2>{product.name}</h2>
              <span className="price">
                {fmtMoney(product.price)} <small>/ {product.unit}</small>
              </span>
              <button type="button" className="btn accent block" onClick={() => addToCart(product)}>
                {flash === product.id ? (
                  <>
                    <Icon name="check" size={20} /> Əlavə olundu
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={20} /> Səbətə at{inCart[product.id] ? ` (${inCart[product.id]})` : ''}
                  </>
                )}
              </button>
            </div>
          </section>
        ))
      )}
    </div>
  )
}
