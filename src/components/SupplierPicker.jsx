import { useState } from 'react'
import Sheet from './Sheet'
import SupplierEditor from './SupplierEditor'
import { Field } from './ui'

const CREATE = '__create'

export default function SupplierPicker({ suppliers, value, onChange, optional = false }) {
  const [creating, setCreating] = useState(false)
  const known = value && !suppliers.some((s) => s.id === value.id) ? [value, ...suppliers] : suppliers

  return (
    <>
      <Field label={optional ? 'Təchizatçı (alış üçün)' : 'Təchizatçı'}>
        <select
          className="input"
          value={value?.id || ''}
          onChange={(event) => {
            if (event.target.value === CREATE) return setCreating(true)
            onChange(known.find((s) => s.id === event.target.value) || null)
          }}
        >
          <option value="">{optional ? 'Seçilməyib' : 'Təchizatçı seç…'}</option>
          {known.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={CREATE}>+ Yeni təchizatçı yarat</option>
        </select>
      </Field>

      <Sheet open={creating} title="Yeni təchizatçı" onClose={() => setCreating(false)}>
        <SupplierEditor
          onSaved={(supplier) => {
            onChange(supplier)
            setCreating(false)
          }}
        />
      </Sheet>
    </>
  )
}
