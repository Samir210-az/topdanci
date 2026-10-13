import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Field, PageHeader } from '../components/ui'
import { useData } from '../store/DataContext'
import { saveCustomer } from '../lib/actions'
import { notify, reportError } from '../lib/events'

function Editor({ customer }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    note: customer?.note || '',
  })
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return notify('Müştərinin adını yaz', 'error')
    try {
      const id = saveCustomer({
        id: customer?.id,
        data: { name, phone: form.phone.trim(), address: form.address.trim(), note: form.note.trim() },
      })
      navigate(`/customers/${id}`, { replace: true })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <>
      <PageHeader title={customer ? 'Müştərini redaktə et' : 'Yeni müştəri'} back />
      <form className="stack" onSubmit={submit}>
        <Field label="Ad (mağaza və ya şəxs)">
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
        <Field label="Qeyd">
          <textarea className="input" value={form.note} onChange={set('note')} maxLength={400} />
        </Field>
        <button className="btn primary block">Yadda saxla</button>
      </form>
    </>
  )
}

export default function CustomerForm() {
  const { id } = useParams()
  const { customerMap } = useData()
  const customer = id ? customerMap[id] : null
  if (id && !customer) return <PageHeader title="Müştəri tapılmadı" back />
  return <Editor key={id || 'new'} customer={customer} />
}
