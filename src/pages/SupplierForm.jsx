import { useNavigate, useParams } from 'react-router-dom'
import SupplierEditor from '../components/SupplierEditor'
import { PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'

export default function SupplierForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { supplierMap } = useData()
  const supplier = id ? supplierMap[id] : null

  if (id && !supplier) return <PageHeader title="Təchizatçı tapılmadı" back />
  return (
    <>
      <PageHeader title={supplier ? 'Təchizatçını redaktə et' : 'Yeni təchizatçı'} back />
      <SupplierEditor key={id || 'new'} supplier={supplier} onSaved={({ id: savedId }) => navigate(`/suppliers/${savedId}`, { replace: true })} />
    </>
  )
}
