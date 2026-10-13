import { useState } from 'react'
import Sheet from './Sheet'
import { Field } from './ui'
import { SERVICE_CODE } from '../config'
import { resetData } from '../lib/service'
import { notify } from '../lib/events'

const ACTIONS = [
  {
    scope: 'ops',
    title: 'Əməliyyatları sıfırla',
    text: 'Satış, ödəniş, alış və mal hərəkətləri silinir. Müştəri və təchizatçı borcları, müştərilərdəki mal və anbar qalığı 0 olur. Mallar, müştərilər və təchizatçılar qalır.',
    confirm: 'Bütün əməliyyatlar silinsin və qalıqlar 0 olsun?',
  },
  {
    scope: 'all',
    title: 'Bütün məlumatı sil',
    text: 'Mallar, müştərilər, təchizatçılar və bütün əməliyyatlar silinir. Proqram ilk gündəki kimi boş qalır.',
    confirm: 'Bütün məlumat silinəcək. Bu geri qaytarılmır. Davam edilsin?',
  },
]

export default function ServiceSheet({ open, onClose }) {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)

  function close() {
    setCode('')
    setUnlocked(false)
    onClose()
  }

  function unlock(event) {
    event.preventDefault()
    if (code.trim().toUpperCase() === SERVICE_CODE) setUnlocked(true)
    else notify('Kod səhvdir', 'error')
  }

  async function run(action) {
    if (!window.confirm(action.confirm)) return
    setBusy(true)
    try {
      await resetData(action.scope)
      notify('Sıfırlama tamamlandı', 'success')
      close()
    } catch (error) {
      notify(
        error.message === 'offline' ? 'İnternet yoxdur. Sıfırlama üçün internet lazımdır.' : 'Sıfırlama alınmadı. Yenidən yoxla.',
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title="Servis paneli" onClose={close}>
      {!unlocked ? (
        <form className="stack" onSubmit={unlock}>
          <Field label="Servis kodu">
            <input
              className="input"
              value={code}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          <button className="btn primary block">Daxil ol</button>
        </form>
      ) : (
        <div className="stack">
          {ACTIONS.map((action) => (
            <div key={action.scope} className="card stack">
              <h2>{action.title}</h2>
              <p className="muted small">{action.text}</p>
              <button type="button" className="btn danger block" disabled={busy} onClick={() => run(action)}>
                {busy ? 'Gözlə…' : action.title}
              </button>
            </div>
          ))}
          <p className="muted small">İnternet lazımdır. Silinən məlumat bərpa olunmur.</p>
        </div>
      )}
    </Sheet>
  )
}
