import { useEffect, useState } from 'react'
import { Check, X, ClipboardList, Clock3 } from 'lucide-react'

const labels = { tattoo: 'Тату', nails: 'Ногти', brows: 'Брови и ресницы', piercing: 'Пирсинг', makeup: 'Макияж' }
const money = n => new Intl.NumberFormat('ru-RU').format(n || 0) + ' ₽'

export default function AdminPanel({ supabase }) {
  const [realRows, setRealRows] = useState([])
  const [testRows, setTestRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')

  const load = async () => {
    setLoading(true)
    setError('')
    const [real, demo] = await Promise.all([
      supabase.from('masters').select('id,public_name,category,bio,city,studio_name,experience_years,starting_price,contact_telegram,status,created_at').order('created_at', { ascending: false }),
      supabase.from('master_test_applications').select('*').order('created_at', { ascending: false })
    ])
    if (real.error || demo.error) setError(real.error?.message || demo.error?.message || 'Не удалось загрузить заявки')
    setRealRows(real.data || [])
    setTestRows(demo.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const moderate = async (row, status) => {
    const { error } = await supabase.from('masters').update({ status }).eq('id', row.id)
    if (error) setError(error.message)
    else load()
  }
  const moderateTest = async (row, status) => {
    const { error } = await supabase.from('master_test_applications').update({ status }).eq('id', row.id)
    if (error) setError(error.message)
    else load()
  }

  const rows = [
    ...realRows.map(row => ({ ...row, isTest: false })),
    ...testRows.map(row => ({ ...row, isTest: true }))
  ].filter(row => filter === 'all' || row.status === filter)
  const statusLabel = status => status === 'pending' ? 'На проверке' : status === 'approved' ? 'Одобрено' : 'Отклонено'

  return <>
    <header className="topbar"><div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div><div className="topbar-title"><strong>Модерация</strong><small>ЗАЯВКИ МАСТЕРОВ</small></div><button className="icon-button" onClick={load}><Clock3 size={18}/></button></header>
    <main className="page-content admin-page">
      <div className="admin-stats">
        <div><b>{realRows.filter(row => row.status === 'pending').length + testRows.filter(row => row.status === 'pending').length}</b><small>На проверке</small></div>
        <div><b>{realRows.filter(row => row.status === 'approved').length}</b><small>Опубликовано</small></div>
        <div><b>{testRows.length}</b><small>Тестовых</small></div>
      </div>
      <div className="admin-toolbar"><div className="admin-filters">{[['pending','Новые'],['approved','Одобрены'],['rejected','Отклонены'],['all','Все']].map(([value,label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
      {error && <p className="auth-error">{error}</p>}
      {loading ? <div className="empty-state">Загружаем заявки…</div> : rows.length === 0 ? <div className="empty-state"><ClipboardList size={30}/><b>Заявок пока нет</b><span>Новые анкеты появятся здесь автоматически.</span></div> :
        <div className="admin-application-list">{rows.map(row => <article className="admin-application" key={(row.isTest ? 'demo-' : 'real-') + row.id}>
          <div className="admin-app-top"><div><span className="eyebrow">{row.isTest ? 'ТЕСТОВАЯ АНКЕТА' : 'ЗАЯВКА МАСТЕРА'}</span><h3>{row.public_name}</h3></div><span className={'status-pill ' + row.status}>{statusLabel(row.status)}</span></div>
          <div className="admin-app-meta"><span>{labels[row.category] || row.category}</span><span>{row.city}</span><span>{row.experience_years || 0} лет опыта</span><b>от {money(row.starting_price)}</b></div>
          {row.studio_name && <p className="admin-app-studio">{row.studio_name}</p>}
          <p className="admin-app-bio">{row.bio}</p>
          {row.contact_telegram && <p className="admin-app-contact">{row.contact_telegram}</p>}
          <div className="admin-app-actions">
            {row.status !== 'approved' && <button className="approve-button" onClick={() => row.isTest ? moderateTest(row, 'approved') : moderate(row, 'approved')}><Check size={15}/> Одобрить</button>}
            {row.status !== 'rejected' && <button className="reject-button" onClick={() => row.isTest ? moderateTest(row, 'rejected') : moderate(row, 'rejected')}><X size={15}/> Отклонить</button>}
          </div>
        </article>)}</div>}
      <p className="muted-note">Тестовые анкеты помечены отдельно и не попадают в публичный каталог.</p>
    </main>
  </>
}
