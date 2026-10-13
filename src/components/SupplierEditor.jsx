import { useState } from 'react'
import { Field } from './ui'
import { saveSupplier } from '../lib/actions'
import { notify, reportError } from '../lib/events'

export default function SupplierEditor({ supplier, onSaved }) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    note: supplier?.note || '',
  })
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return notify('Təchizatçının adını yaz', 'error')
    try {
      const id = saveSupplier({
        id: supplier?.id,
        data: { name, phone: form.phone.trim(), address: form.address.trim(), note: form.note.trim() },
      })
      onSaved({ id, name })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <Field label="Ad (şirkət və ya şəxs)">
        <input className="input" value={form.name} onChange={set('name')} maxLength={80} required />
      </Field>
      <Field label="Telefon">
        <input
          className="input"
          type="tel"
          inputMode="tel"
          placeholder="050 123 45 67"
          value={form.phone}
          onChange={set('phone')}
        />
      </Field>
      <Field label="Ünvan">
        <input className="input" value={form.address} onChange={set('address')} maxLength={160} />
      </Field>
      <Field label="Qısa qeyd">
        <textarea className="input" value={form.note} onChange={set('note')} maxLength={300} />
      </Field>
      <button className="btn primary block">Yadda saxla</button>
    </form>
  )
}
