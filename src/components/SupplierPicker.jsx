import { Field } from './ui'
import { saveSupplier } from '../lib/actions'

export function resolveSupplier(suppliers, supplierId, newName) {
  const existing = suppliers.find((s) => s.id === supplierId)
  if (existing) return existing
  const name = newName.trim()
  if (!name) return null
  return { id: saveSupplier({ data: { name } }), name }
}

export default function SupplierPicker({ suppliers, value, onChange, newName, onNewName, optional = false }) {
  return (
    <>
      <Field label={optional ? 'Təchizatçı (alış üçün)' : 'Təchizatçı'}>
        <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{optional ? 'Seçilməyib' : 'Yeni təchizatçı…'}</option>
          {optional && <option value="__new">Yeni təchizatçı…</option>}
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      {(optional ? value === '__new' : !value) && (
        <Field label="Yeni təchizatçının adı">
          <input className="input" value={newName} maxLength={80} onChange={(event) => onNewName(event.target.value)} />
        </Field>
      )}
    </>
  )
}
