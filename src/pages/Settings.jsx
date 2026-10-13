import { Icon } from '../components/Icon'
import { PageHeader } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { useData } from '../store/DataContext'

export default function Settings() {
  const { logout } = useAuth()
  const { online, pending } = useData()

  return (
    <>
      <PageHeader title="Hesab" back />

      <section className="card stack">
        <h2>Bağlantı</h2>
        <p>{online ? 'İnternet var.' : 'İnternet yoxdur. Satışlar telefonda saxlanır.'}</p>
        <p className="muted">
          {pending
            ? 'Göndərilməmiş yazılar var. İnternet olan yerdə tətbiqi açıq saxla.'
            : 'Bütün yazılar serverə göndərilib.'}
        </p>
      </section>

      <section className="card stack">
        <h2>Giriş</h2>
        <p className="muted">PIN dəyişmək üçün Firebase konsolunda Authentication bölməsindən istifadə et.</p>
        <button type="button" className="btn" onClick={logout}>
          <Icon name="logout" size={18} /> Çıxış
        </button>
      </section>

      <p className="muted center small">
        <a href="https://instagram.com/securtiy_group" target="_blank" rel="noopener noreferrer">
          By securtiy_group
        </a>
      </p>
    </>
  )
}
