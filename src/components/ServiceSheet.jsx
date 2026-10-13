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
  const [step, setStep] = useState('')
  const [message, setMessage] = useState('')

  function close() {
    setCode('')
    setUnlocked(false)
    setMessage('')
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
    setMessage('')
    try {
      await resetData(action.scope, setStep)
      notify('Sıfırlama tamamlandı', 'success')
      close()
    } catch (error) {
      const tag = error.message || ''
      let text = 'Sıfırlama alınmadı. Yenidən yoxla.'
      if (tag === 'offline') text = 'İnternet yoxdur. Sıfırlama üçün internet lazımdır.'
      else if (tag.startsWith('read:')) text = `Server cavab vermədi (${tag.slice(5)}). İnterneti yoxla, tətbiqin digər pəncərələrini bağla və yenidən yoxla.`
      else if (tag === 'write') text = 'Silmə sorğusu göndərildi, amma təsdiq gəlmədi. Bir az gözlə, sonra Əsas səhifədə rəqəmlərə bax.'
      else if (error.code === 'permission-denied') text = 'İcazə yoxdur. Yenidən daxil ol.'
      setMessage(text)
    } finally {
      setBusy(false)
      setStep('')
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
                {busy ? step || 'Gözlə…' : action.title}
              </button>
            </div>
          ))}
          {message && (
            <p role="alert" className="amount-neg">
              {message}
            </p>
          )}
          <p className="muted small">İnternet lazımdır. Silinən məlumat bərpa olunmur.</p>
        </div>
      )}
    </Sheet>
  )
}
