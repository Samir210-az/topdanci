import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'topdanci.cart'
const EMPTY = { customerId: null, type: 'sale', lines: [] }

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const qty = action.qty || 1
      const exists = state.lines.some((l) => l.productId === action.product.id)
      const lines = exists
        ? state.lines.map((l) => (l.productId === action.product.id ? { ...l, qty: l.qty + qty } : l))
        : [...state.lines, { productId: action.product.id, qty, price: action.product.price }]
      return { ...state, lines }
    }
    case 'qty': {
      const lines =
        action.qty <= 0
          ? state.lines.filter((l) => l.productId !== action.productId)
          : state.lines.map((l) => (l.productId === action.productId ? { ...l, qty: action.qty } : l))
      return { ...state, lines }
    }
    case 'price':
      return {
        ...state,
        lines: state.lines.map((l) => (l.productId === action.productId ? { ...l, price: action.price } : l)),
      }
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.productId !== action.productId) }
    case 'customer':
      return { ...state, customerId: action.customerId }
    case 'kind':
      return { ...state, type: action.kind }
    case 'clear':
      return EMPTY
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // yaddaş əlçatan deyilsə, səbət yalnız açıq səhifədə qalır
    }
  }, [state])

  const value = useMemo(
    () => ({
      ...state,
      count: state.lines.length,
      add: (product, qty = 1) => dispatch({ type: 'add', product, qty }),
      setQty: (productId, qty) => dispatch({ type: 'qty', productId, qty }),
      setPrice: (productId, price) => dispatch({ type: 'price', productId, price }),
      remove: (productId) => dispatch({ type: 'remove', productId }),
      setCustomer: (customerId) => dispatch({ type: 'customer', customerId }),
      setType: (kind) => dispatch({ type: 'kind', kind }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [state],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
