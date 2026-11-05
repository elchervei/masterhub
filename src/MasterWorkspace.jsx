import { useEffect, useState } from 'react'
import { BriefcaseBusiness, ImagePlus, Plus, Trash2, CalendarClock, CalendarDays, Check, X } from 'lucide-react'

const money = n => new Intl.NumberFormat('ru-RU').format(n || 0) + ' ₽'
const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']

export default function MasterWorkspace({ supabase, user, isAdmin, viewMode, setViewMode, onOpenRegistration }) {
  const [master, setMaster] = useState(null)
  const [services, setServices] = useState([])
  const [works, setWorks] = useState([])
  const [bookings, setBookings] = useState([])
  const [serviceTitle, setServiceTitle] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceDuration, setServiceDuration] = useState('60')
  const [workUrl, setWorkUrl] = useState('')
  const [weekday, setWeekday] = useState('1')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('19:00')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabase || !user) return
    setLoading(true)
    const { data: current } = await supabase.from('masters').select('id,public_name,status,category').eq('user_id', user.id).maybeSingle()
    setMaster(current || null)
    if (current) {
      const [sv, pf, bk] = await Promise.all([
        supabase.from('services').select('*').eq('master_id', current.id).order('created_at', { ascending: false }),
        supabase.from('portfolio_items').select('*').eq('master_id', current.id).order('sort_order'),
        supabase.from('bookings').select('id,starts_at,ends_at,status,client_note').eq('master_id', current.id).order('starts_at')
      ])
      setServices(sv.data || [])
      setWorks(pf.data || [])
      setBookings(bk.data || [])
      setError(sv.error?.message || pf.error?.message || bk.error?.message || '')
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [user?.id])

  const addService = async event => {
    event.preventDefault()
    if (!master || !serviceTitle.trim()) return
    const { error } = await supabase.from('services').insert({ master_id: master.id, title: serviceTitle.trim(), price_from: Number(servicePrice || 0), duration_minutes: Number(serviceDuration || 60), is_active: true })
    if (error) setError(error.message)
    else { setServiceTitle(''); setServicePrice(''); load() }
  }
  const addWork = async event => {
    event.preventDefault()
    if (!master || !workUrl.trim()) return
    const { error } = await supabase.from('portfolio_items').insert({ master_id: master.id, image_path: workUrl.trim(), caption: '', sort_order: works.length })
    if (error) setError(error.message)
    else { setWorkUrl(''); load() }
  }
  const removeWork = async id => {
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id)
    if (error) setError(error.message)
    else load()
  }
  const addSchedule = async event => {
    event.preventDefault()
    if (!master) return
    const { error } = await supabase.from('availability_rules').insert({ master_id: master.id, weekday: Number(weekday), start_time: startTime, end_time: endTime, is_active: true })
    if (error) setError(error.message)
    else setNote('График добавлен.')
  }
  const updateBooking = async (id, status) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  return <>
    <header className="topbar"><div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div><div className="topbar-title"><strong>Кабинет мастера</strong><small>УПРАВЛЕНИЕ ПРОФИЛЕМ</small></div><BriefcaseBusiness size={19}/></header>
    <main className="page-content master-workspace">{isAdmin && <section className="role-preview-switch"><span className="eyebrow">РЕЖИМ ПРОСМОТРА · ТОЛЬКО ВЛАДЕЛЕЦ</span><div><button className={viewMode === "client" ? "selected" : ""} onClick={() => setViewMode("client")}>Я клиент</button><button className={viewMode === "master" ? "selected" : ""} onClick={() => setViewMode("master")}>Я мастер</button></div><small>Реальная роль администратора не меняется.</small></section>}
      {loading ? <div className="empty-state">Загружаем кабинет…</div> : !master ? <div className="workspace-empty"><BriefcaseBusiness size={30}/><h2>Профиль мастера ещё не создан</h2><p>Создай свою анкету, чтобы открыть управление портфолио, услугами, расписанием и записями.</p><button className="primary-button" onClick={onOpenRegistration}>Создать анкету мастера</button></div> : <>
        <div className="workspace-master-card"><div><span className="eyebrow">ТВОЯ АНКЕТА</span><h2>{master.public_name}</h2></div><span className={'status-pill ' + master.status}>{master.status === 'approved' ? 'Опубликована' : master.status === 'pending' ? 'На модерации' : 'Отклонена'}</span></div>
        <section className="workspace-section"><h3><ImagePlus size={17}/> Портфолио</h3><form className="inline-add-form" onSubmit={addWork}><input type="url" required value={workUrl} onChange={e => setWorkUrl(e.target.value)} placeholder="Ссылка на фотографию работы"/><button className="primary-button"><Plus size={16}/></button></form><div className="workspace-works">{works.map(work => <div key={work.id}><img src={work.image_path} alt={work.caption || 'Работа мастера'}/><button onClick={() => removeWork(work.id)}><Trash2 size={14}/></button></div>)}</div>{!works.length && <p className="muted-note">Пока нет работ. Добавь прямые ссылки на изображения.</p>}</section>
        <section className="workspace-section"><h3><BriefcaseBusiness size={17}/> Услуги и цены</h3><form className="service-add-form" onSubmit={addService}><input required value={serviceTitle} onChange={e => setServiceTitle(e.target.value)} placeholder="Название услуги"/><div><input type="number" min="0" required value={servicePrice} onChange={e => setServicePrice(e.target.value)} placeholder="Цена от, ₽"/><input type="number" min="15" step="15" value={serviceDuration} onChange={e => setServiceDuration(e.target.value)} placeholder="Минут"/></div><button className="primary-button full-button">Добавить услугу</button></form><div className="workspace-service-list">{services.map(service => <div key={service.id}><span>{service.title}<small>{service.duration_minutes} мин.</small></span><b>{money(service.price_from)}</b></div>)}</div></section>
        <section className="workspace-section"><h3><CalendarClock size={17}/> Расписание</h3><form className="schedule-form" onSubmit={addSchedule}><select value={weekday} onChange={e => setWeekday(e.target.value)}>{days.map((day, index) => <option key={index} value={index}>{day}</option>)}</select><div><label>С <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}/></label><label>До <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}/></label></div><button className="primary-button full-button">Добавить рабочее время</button></form>{note && <p className="muted-note">{note}</p>}</section>
        <section className="workspace-section"><h3><CalendarDays size={17}/> Заявки на запись <span className="count-chip">{bookings.filter(booking => booking.status === 'pending').length}</span></h3>{bookings.length ? bookings.map(booking => <div className="workspace-booking" key={booking.id}><div><b>{new Date(booking.starts_at).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</b><small>{booking.client_note || 'Без комментария'} · {booking.status}</small></div>{booking.status === 'pending' && <div><button onClick={() => updateBooking(booking.id, 'confirmed')}><Check size={15}/></button><button onClick={() => updateBooking(booking.id, 'cancelled')}><X size={15}/></button></div>}</div>) : <p className="muted-note">Пока нет заявок на запись.</p>}</section>
      </>}
      {error && <p className="auth-error">{error}</p>}
    </main>
  </>
}
