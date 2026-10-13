import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import Sheet from '../components/Sheet'
import { ProductImage } from '../components/ui'
import { useCart } from '../store/CartContext'
import { useData } from '../store/DataContext'
import { fmtMoney } from '../lib/money'

const WIDE = '(min-width: 900px)'

function useWide() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE)
      query.addEventListener('change', notify)
      return () => query.removeEventListener('change', notify)
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}

function chunk(list, size) {
  const pages = []
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size))
  return pages
}

export default function Present() {
  const navigate = useNavigate()
  const wide = useWide()
  const { products, ready } = useData()
  const { add, lines, count } = useCart()
  const [flash, setFlash] = useState(null)
  const [page, setPage] = useState(0)
  const [zoom, setZoom] = useState(null)

  const inCart = useMemo(() => Object.fromEntries(lines.map((l) => [l.productId, l.qty])), [lines])
  const available = products.filter((p) => (p.stock || 0) > 0)
  const pages = chunk(available, wide ? 10 : 4)

  function onScroll(event) {
    const { scrollTop, clientHeight } = event.currentTarget
    setPage(Math.round(scrollTop / clientHeight))
  }

  function addToCart(product) {
    add(product)
    setFlash(product.id)
    setTimeout(() => setFlash((current) => (current === product.id ? null : current)), 1000)
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

      {pages.length > 1 && (
        <span className="present-progress" aria-hidden="true">
          {Math.min(page + 1, pages.length)}/{pages.length}
        </span>
      )}

      {!ready || pages.length === 0 ? (
        <section className="slide-page">
          <p className="slide-empty">{ready ? 'Göstəriləcək mal yoxdur' : 'Yüklənir…'}</p>
        </section>
      ) : (
        pages.map((items, index) => (
          <section key={index} className="slide-page" aria-label={`Səhifə ${index + 1}`}>
            <div className="tiles">
              {items.map((product) => (
                <article key={product.id} className="tile">
                  <button type="button" className="tile-photo" onClick={() => setZoom(product)} aria-label={`${product.name}: böyüt`}>
                    <ProductImage product={product} />
                  </button>
                  <div className="tile-info">
                    <strong>{product.name}</strong>
                    <span className="price">{fmtMoney(product.price)}</span>
                    <button type="button" className="btn accent sm" onClick={() => addToCart(product)}>
                      {flash === product.id ? (
                        <Icon name="check" size={18} />
                      ) : (
                        <>
                          <Icon name="plus" size={18} /> {inCart[product.id] ? inCart[product.id] : 'Səbət'}
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <Sheet open={!!zoom} title={zoom?.name || ''} onClose={() => setZoom(null)}>
        {zoom && (
          <>
            <ProductImage product={zoom} className="zoom-img" />
            <p className="price">
              {fmtMoney(zoom.price)} / {zoom.unit}
            </p>
            <button
              type="button"
              className="btn accent block"
              onClick={() => {
                addToCart(zoom)
                setZoom(null)
              }}
            >
              <Icon name="plus" size={18} /> Səbətə at
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
