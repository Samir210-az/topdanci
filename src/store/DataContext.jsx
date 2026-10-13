import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import { SALES_WINDOW_DAYS } from '../config'
import { addDays, startOfDay } from '../lib/dates'
import { reportError } from '../lib/events'

const DataContext = createContext(null)

const SOURCES = ['products', 'customers', 'sales', 'payments']
const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'az')

export function DataProvider({ children }) {
  const [data, setData] = useState({ products: [], customers: [], sales: [], payments: [] })
  const [loaded, setLoaded] = useState({})
  const [pendingBy, setPendingBy] = useState({})
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const since = Timestamp.fromDate(addDays(startOfDay(), -SALES_WINDOW_DAYS))
    const recent = (name) =>
      query(collection(db, name), where('createdAt', '>=', since), orderBy('createdAt', 'desc'))
    const sources = {
      products: collection(db, 'products'),
      customers: collection(db, 'customers'),
      sales: recent('sales'),
      payments: recent('payments'),
    }

    const seen = {}
    const unsubscribe = SOURCES.map((key) =>
      onSnapshot(
        sources[key],
        { includeMetadataChanges: true },
        (snap) => {
          if (!seen[key] || snap.docChanges().length > 0) {
            seen[key] = true
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            setData((prev) => ({ ...prev, [key]: docs }))
            setLoaded((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
          }
          const pending = snap.metadata.hasPendingWrites
          setPendingBy((prev) => (prev[key] === pending ? prev : { ...prev, [key]: pending }))
        },
        reportError,
      ),
    )
    return () => unsubscribe.forEach((stop) => stop())
  }, [])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const value = useMemo(() => {
    const products = data.products.filter((p) => !p.archived).sort(byName)
    const customers = [...data.customers].sort(byName)
    return {
      ready: SOURCES.every((key) => loaded[key]),
      products,
      productMap: Object.fromEntries(data.products.map((p) => [p.id, p])),
      customers,
      customerMap: Object.fromEntries(customers.map((c) => [c.id, c])),
      sales: data.sales,
      payments: data.payments,
      pending: Object.values(pendingBy).some(Boolean),
      online,
    }
  }, [data, loaded, pendingBy, online])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
