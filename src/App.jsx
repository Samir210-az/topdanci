import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import LoginScreen from './auth/LoginScreen'
import { DataProvider } from './store/DataContext'
import { CartProvider } from './store/CartContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import CustomerDetail from './pages/CustomerDetail'
import Settle from './pages/Settle'
import NewSale from './pages/NewSale'
import Settings from './pages/Settings'
import Suppliers from './pages/Suppliers'
import PurchaseForm from './pages/PurchaseForm'
import SupplierDetail from './pages/SupplierDetail'
import SupplierForm from './pages/SupplierForm'
import ReturnFromCustomer from './pages/ReturnFromCustomer'
import ReturnToSupplier from './pages/ReturnToSupplier'

const Present = lazy(() => import('./pages/Present'))
const Reports = lazy(() => import('./pages/Reports'))

function Splash() {
  return (
    <div className="splash" role="status">
      <img src="/icons/icon-192.png" width="72" height="72" alt="" />
      <p className="muted">Yüklənir…</p>
    </div>
  )
}

export default function App() {
  const { user, ready } = useAuth()

  if (!ready) return <Splash />
  if (!user) return <LoginScreen />

  return (
    <DataProvider>
      <CartProvider>
        <Suspense fallback={<Splash />}>
          <Routes>
            <Route path="/present" element={<Present />} />
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="sale" element={<NewSale />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/new" element={<CustomerForm />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="customers/:id/edit" element={<CustomerForm />} />
              <Route path="customers/:id/settle" element={<Settle />} />
              <Route path="customers/:id/return" element={<ReturnFromCustomer />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="purchases" element={<Navigate to="/suppliers" replace />} />
              <Route path="purchases/new" element={<PurchaseForm />} />
              <Route path="suppliers/new" element={<SupplierForm />} />
              <Route path="suppliers/:id" element={<SupplierDetail />} />
              <Route path="suppliers/:id/edit" element={<SupplierForm />} />
              <Route path="suppliers/:id/return" element={<ReturnToSupplier />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </CartProvider>
    </DataProvider>
  )
}
