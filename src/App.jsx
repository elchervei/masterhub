import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { Home, Search, CalendarDays, Heart, UserRound, MapPin, Star, Clock3, ArrowLeft, SlidersHorizontal, ChevronRight, Bell, Plus, Check, X, Camera, Settings, LogOut, Menu, Sparkles, MessageCircle, BriefcaseBusiness, ClipboardList, Send, Upload } from 'lucide-react'
import { masters, styles, workImage } from './data'
import AdminPanel from './AdminPanel'
import MasterWorkspace from './MasterWorkspace'

const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽'
const categories = [
  { id: 'tattoo', title: 'Тату', subtitle: 'Эскизы и татуировки', mark: 'T' },
  { id: 'nails', title: 'Ногти', subtitle: 'Маникюр и педикюр', mark: 'N' },
  { id: 'brows', title: 'Брови и ресницы', subtitle: 'Форма, окрашивание, ламинирование', mark: 'B' },
  { id: 'piercing', title: 'Пирсинг', subtitle: 'Украшения и проколы', mark: 'P' },
  { id: 'makeup', title: 'Макияж', subtitle: 'Образы на каждый день и события', mark: 'M' }
]
const categoryLabels = Object.fromEntries(categories.map(item => [item.id, item.title]))
const tabs = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'catalog', label: 'Каталог', icon: Search },
  { id: 'bookings', label: 'Записи', icon: CalendarDays },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'profile', label: 'Профиль', icon: UserRound }
]

function MasterCard({ master, favorite, onFavorite, onOpen }) {
  return <article className="master-card">
    <button className="master-photo" onClick={onOpen} style={{ backgroundImage: master.image ? `url(${master.image})` : undefined }} aria-label={`Открыть профиль ${master.name}`}>
      <span className="photo-tag"><span className="online-dot" /> Принимает записи</span>
    </button>
    <div className="master-card-body">
      <div className="card-heading">
        <button className="master-name" onClick={onOpen}>{master.name}</button>
        <button className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={onFavorite} aria-label="В избранное"><Heart size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="master-meta"><span className="rating"><Star size={14} fill="currentColor" /> {master.rating.toFixed(1)} <span>({master.reviews})</span></span><span className="meta-separator">·</span><span>{master.studio}</span></div>
      <div className="tag-row">{master.styles.slice(0, 3).map(s => <span className="style-tag" key={s}>{s}</span>)}</div>
      <div className="card-footer"><span className="price-caption">От <b>{money(master.price)}</b></span><button className="text-link" onClick={onOpen}>Профиль <ChevronRight size={15} /></button></div>
    </div>
  </article>
}

function BottomNav({ active, setActive, isAdmin }) {
  const visibleTabs = isAdmin ? [...tabs, { id: 'admin', label: 'Заявки', icon: ClipboardList }] : tabs
  return <nav className="bottom-nav">{visibleTabs.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => setActive(id)}><Icon size={20} strokeWidth={active === id ? 2.2 : 1.7} /><span>{label}</span></button>)}</nav>
}

function Header({ title, subtitle, back, action }) {
  return <header className="topbar">
    {back ? <button className="icon-button back-button" onClick={back}><ArrowLeft size={21}/></button> : <div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div>}
    <div className="topbar-title">{title && <strong>{title}</strong>}{subtitle && <small>{subtitle}</small>}</div>
    {action || <button className="icon-button" aria-label="Уведомления и обновления" onClick={()=>window.dispatchEvent(new CustomEvent("masterhub:open-notifications"))}><Bell size={19}/><i className="notification-dot"/></button>}
  </header>
}

function PixelArt({ type }) {
  const palettes = {
    tattoo: {base:'#aeb8b5',dark:'#414b4a',light:'#e1e4dc',accent:'#b98c79'},
    nails: {base:'#d0aaa6',dark:'#765b60',light:'#ead7cc',accent:'#a7b7aa'},
    brows: {base:'#b6b9b0',dark:'#505653',light:'#e0ddd2',accent:'#c59b83'},
    piercing: {base:'#c7c9c2',dark:'#59605e',light:'#ece9dc',accent:'#b99b70'},
    makeup: {base:'#c28e87',dark:'#684c50',light:'#e8c9b9',accent:'#b6a0a0'}
  }
  const p = palettes[type] || palettes.tattoo
  const shapes = {
    tattoo: <><rect x="19" y="11" width="18" height="5" fill={p.light}/><rect x="23" y="16" width="10" height="5" fill={p.base}/><rect x="16" y="21" width="24" height="6" fill={p.dark}/><rect x="21" y="27" width="14" height="8" fill={p.base}/><rect x="25" y="35" width="6" height="10" fill={p.dark}/><rect x="27" y="45" width="2" height="8" fill={p.light}/><rect x="10" y="18" width="7" height="4" fill={p.accent}/><rect x="40" y="18" width="7" height="4" fill={p.accent}/><rect x="22" y="7" width="12" height="4" fill={p.dark}/></>,
    nails: <><rect x="23" y="9" width="12" height="10" fill={p.light}/><rect x="20" y="19" width="18" height="15" fill={p.base}/><rect x="17" y="34" width="24" height="8" fill={p.dark}/><rect x="13" y="42" width="7" height="12" fill={p.base}/><rect x="22" y="42" width="7" height="12" fill={p.base}/><rect x="31" y="42" width="7" height="12" fill={p.base}/><rect x="40" y="42" width="7" height="12" fill={p.base}/><rect x="25" y="11" width="8" height="5" fill={p.accent}/></>,
    brows: <><rect x="8" y="25" width="12" height="5" fill={p.dark}/><rect x="15" y="20" width="15" height="5" fill={p.dark}/><rect x="30" y="25" width="15" height="5" fill={p.dark}/><rect x="17" y="30" width="25" height="12" fill={p.light}/><rect x="21" y="32" width="17" height="8" fill={p.base}/><rect x="27" y="32" width="6" height="8" fill={p.dark}/><rect x="28" y="34" width="3" height="3" fill={p.light}/></>,
    piercing: <><rect x="24" y="8" width="8" height="8" fill={p.accent}/><rect x="18" y="16" width="20" height="5" fill={p.dark}/><rect x="14" y="21" width="5" height="20" fill={p.dark}/><rect x="37" y="21" width="5" height="20" fill={p.dark}/><rect x="19" y="41" width="18" height="5" fill={p.dark}/><rect x="24" y="46" width="8" height="5" fill={p.dark}/><rect x="25" y="16" width="6" height="5" fill={p.light}/></>,
    makeup: <><rect x="22" y="8" width="14" height="7" fill={p.light}/><rect x="20" y="15" width="18" height="8" fill={p.accent}/><rect x="18" y="23" width="22" height="23" fill={p.base}/><rect x="16" y="46" width="26" height="7" fill={p.dark}/><rect x="24" y="4" width="10" height="4" fill={p.dark}/><rect x="25" y="26" width="8" height="13" fill={p.light}/></>
  }
  return <svg className="pixel-art" viewBox="0 0 56 60" role="img" aria-hidden="true" shapeRendering="crispEdges">{shapes[type] || shapes.tattoo}</svg>
}

function HomePage({ introVisible, onSelectCategory }) {
  if (introVisible) return <main className="page-content home-page home-redesign">
    <section className="home-intro home-intro-only"><h1>Выбери своего мастера</h1></section>
  </main>
  return <main className="page-content home-page category-home">
    <div className="category-heading"><span className="eyebrow">MASTER HUB · КАЛИНИНГРАД</span><h1>Выбери направление</h1><p>Сначала услуга — затем подходящий мастер.</p></div>
    <div className="category-list">{categories.map(item => <button className="category-choice" key={item.id} onClick={() => onSelectCategory(item.id)}>
      <span className="category-copy"><b>{item.title}</b><small>{item.subtitle}</small></span><span className="category-art"><PixelArt type={item.id}/></span><ChevronRight size={19}/>
    </button>)}</div>
  </main>
}

function CatalogPage({ openMaster, favorites, toggleFavorite, mastersList, category, onBack }) {
  const [query, setQuery] = useState('')
  const [style, setStyle] = useState('Все')
  const [sort, setSort] = useState('popular')
  const filtered = useMemo(() => mastersList.filter(m => m.category === category && (m.name + m.studio + m.styles.join(' ')).toLowerCase().includes(query.toLowerCase()) && (category !== 'tattoo' || style === 'Все' || m.styles.includes(style))).sort((a,b)=>sort==='price' ? a.price-b.price : b.rating-a.rating), [mastersList, category, query, style, sort])
  const categoryName = categoryLabels[category] || 'Услуги'
  return <><Header title={`Мастера · ${categoryName}`} subtitle="КАЛИНИНГРАД" back={onBack}/>
    <main className="page-content"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Имя мастера или стиль..."/>{query && <button onClick={()=>setQuery('')}><X size={16}/></button>}</div>
      <div className="filter-head"><span>{filtered.length} мастера</span><label><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="popular">По рейтингу</option><option value="price">Сначала дешевле</option></select></label></div>
      {category === 'tattoo' && <div className="tattoo-style-select"><label htmlFor="tattoo-style">Стиль татуировки</label><select id="tattoo-style" value={style} onChange={e=>setStyle(e.target.value)}>{styles.map(s=><option key={s} value={s}>{s === 'Все' ? 'Все стили' : s}</option>)}</select></div>}
      <div className="master-list catalog-list">{filtered.map(m=><MasterCard key={m.id} master={m} favorite={favorites.includes(m.id)} onFavorite={()=>toggleFavorite(m.id)} onOpen={()=>openMaster(m)}/>)}{!filtered.length&&<div className="empty-state"><Search size={30}/><b>Пока нет мастеров</b><span>В этой категории ещё нет опубликованных анкет. Загляни позже.</span></div>}</div>
    </main></>
}

function MasterDetail({ master, onBack, favorite, toggleFavorite, onBook }) {
  const [tab, setTab] = useState('works')
  return <><Header title="Профиль мастера" back={onBack} action={<button className={favorite?'icon-button is-favorite':'icon-button'} onClick={toggleFavorite}><Heart size={20} fill={favorite?'currentColor':'none'}/></button>}/>
    <main className="page-content detail-page"><div className="detail-cover" style={{backgroundImage:`url(${master.image})`}}/><div className="detail-identity"><div><span className="eyebrow">{master.studio}</span><h1>{master.name}</h1><div className="master-meta"><span className="rating"><Star size={14} fill="currentColor"/> {master.rating.toFixed(1)} ({master.reviews} отзывов)</span></div></div><div className="avatar-placeholder">{master.name.split(' ').map(x=>x[0]).join('')}</div></div>
      <div className="detail-facts"><div><small>ОПЫТ</small><b>{master.experience}</b></div><div><small>СТАРТ ОТ</small><b>{money(master.price)}</b></div><div><small>ГОРОД</small><b>Калининград</b></div></div>
      <p className="detail-about">{master.about}</p><div className="tag-row detail-tags">{master.styles.map(s=><span className="style-tag" key={s}>{s}</span>)}</div>
      <div className="detail-tabs"><button className={tab==='works'?'selected':''} onClick={()=>setTab('works')}>Портфолио</button><button className={tab==='services'?'selected':''} onClick={()=>setTab('services')}>Услуги и цены</button><button className={tab==='info'?'selected':''} onClick={()=>setTab('info')}>О мастере</button></div>
      {tab==='works'&&<div className="work-grid">{master.works.map((w,i)=><img key={w+i} src={String(w).startsWith('http') ? w : workImage(w)} alt="Работа мастера" loading="lazy"/>)}</div>}
      {tab==='services'&&<div className="service-list">{master.services?.length ? master.services.map(service=><div key={service.id}><span>{service.title}<small>{service.description||service.duration_minutes+' мин.'}</small></span><b>от {money(service.price_from)}</b></div>) : <><div><span>Стоимость услуг</span><b>от {money(master.price)}</b></div><small>Мастер ещё не добавил подробный прайс. Уточни стоимость при записи.</small></>}</div>}
      {tab==='info'&&<div className="info-panel"><p>{master.about}</p><p><MapPin size={15}/> Калининград · адрес студии уточняется при записи</p><p><MessageCircle size={15}/> {master.handle}</p></div>}
      <button className="primary-button booking-cta" onClick={onBook}>Записаться к мастеру <ChevronRight size={17}/></button>
    </main>
  </>
}

function BookingPage({ master, onBack, onConfirm, saving, supabase, user }) {
  const [slots,setSlots]=useState([])
  const [busy,setBusy]=useState([])
  const [selectedDate,setSelectedDate]=useState('')
  const [selectedSlot,setSelectedSlot]=useState(null)
  const [reference,setReference]=useState(null)
  const [uploading,setUploading]=useState(false)
  const [error,setError]=useState('')
  const [month,setMonth]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const telegramContact=useMemo(()=>{const raw=String(master.handle||'').trim();if(!raw)return '';if(raw.startsWith('https://')||raw.startsWith('http://'))return raw;if(raw.startsWith('t.me/'))return 'https://'+raw;const username=raw.startsWith('@')?raw.slice(1):raw;return 'https://t.me/'+username},[master.handle])
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const days=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1))},[month])
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;const today=dateKey(new Date());const limit=new Date();limit.setDate(limit.getDate()+60);const s=await supabase.from('master_time_slots').select('*').eq('master_id',master.id).gte('slot_date',today).lte('slot_date',dateKey(limit)).order('slot_date').order('starts_at');if(live){setSlots(s.data||[]);if(s.error)setError(s.error.message);if(!selectedDate){const firstFree=(s.data||[]).find(slot=>slot.is_active);if(firstFree){setSelectedDate(firstFree.slot_date);setMonth(new Date(firstFree.slot_date+'T12:00:00'))}}}}load();return()=>{live=false}},[supabase,master.id])
  const slotsFor=key=>slots.filter(s=>s.slot_date===key)
  const freeFor=key=>slotsFor(key).filter(s=>s.is_active)
  const statusFor=key=>{const all=slotsFor(key);if(!all.length)return '';const free=freeFor(key).length;return free===0?'full':free===all.length?'free':'partial'}
  const chooseDate=key=>{setSelectedDate(key);setSelectedSlot(null)}
  const uploadReference=async()=>{
    if(!reference)return null
    if(!user){throw new Error('Подключи Telegram, чтобы прикрепить референс.')}
    const ext=(reference.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
    const path=`${user.id}/reference-${crypto.randomUUID()}.${ext}`
    const {data,error}=await supabase.storage.from('masterhub-media').upload(path,reference,{contentType:reference.type,upsert:false})
    if(error)throw error
    return supabase.storage.from('masterhub-media').getPublicUrl(data.path).data.publicUrl
  }
  const submit=async()=>{
    if(!selectedSlot){setError('Сначала выбери свободный интервал.');return}
    setError('')
    try{setUploading(true);const referenceImageUrl=await uploadReference();setUploading(false);await onConfirm({master,slotId:selectedSlot.id,startsAt:selectedSlot.starts_at,endsAt:selectedSlot.ends_at,referenceImageUrl})}catch(e){setUploading(false);setError(e.message||'Не удалось загрузить фотографию.')}
  }
  return <><Header title="Онлайн-запись" back={onBack}/><main className="page-content booking-page">
    <div className="booking-master">{master.image&&<img src={master.image} alt=""/>}<div><b>{master.name}</b><small>{master.studio}</small></div></div>
    <section className="booking-contact-card"><div><span className="eyebrow">ЕСТЬ ВОПРОСЫ?</span><b>Свяжись с мастером напрямую</b><small>Можно уточнить детали татуировки до отправки заявки.</small></div>{telegramContact?<a href={telegramContact} target="_blank" rel="noopener noreferrer" className="telegram-contact-button"><Send size={16}/> Написать в Telegram</a>:<span className="contact-unavailable">Мастер пока не указал Telegram для связи</span>}</section>
    <span className="eyebrow">ШАГ 1 · РЕФЕРЕНС ТАТУИРОВКИ</span>
    <label className="upload-control booking-reference"><Upload size={16}/>{reference?reference.name:'Прикрепить фото или эскиз'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setReference(e.target.files?.[0]||null)}/></label>
    {reference&&<p className="muted-note">Фото будет прикреплено к заявке мастеру.</p>}
    <span className="eyebrow">ШАГ 2 · ВЫБЕРИ ДЕНЬ</span>
    <div className="calendar-month-head"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><b>{month.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</b><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div>
    <div className="calendar-weekdays">{['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map((x,i)=><span key={i}>{x}</span>)}</div>
    <div className="client-calendar-grid">{days.map((d,i)=>{const key=dateKey(d),same=d.getMonth()===month.getMonth(),past=new Date(key+'T23:59:59')<new Date(new Date().toDateString()),status=statusFor(key);return <button key={i} disabled={!same||past||!slotsFor(key).length||!freeFor(key).length} className={`calendar-day ${same?'':'outside'} ${selectedDate===key?'chosen':''} ${status}`} onClick={()=>chooseDate(key)}><span>{d.getDate()}</span>{status&&<i/>}</button>})}</div>
    <div className="calendar-legend"><span><i className="free"/> Свободно</span><span><i className="partial"/> Частично занято</span><span><i className="full"/> Нет мест</span></div>
    <span className="eyebrow">ШАГ 3 · СВОБОДНОЕ ВРЕМЯ</span>
    <div className="available-slot-list">{selectedDate?freeFor(selectedDate).map(slot=><button key={slot.id} className={selectedSlot?.id===slot.id?'time-slot selected':'time-slot'} onClick={()=>setSelectedSlot(slot)}>{new Date(slot.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} — {new Date(slot.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</button>):<p className="muted-note">Выбери день, отмеченный зелёным или жёлтым.</p>}{selectedDate&&!freeFor(selectedDate).length&&<p className="muted-note">На эту дату свободного времени нет.</p>}</div>
    <div className="booking-summary"><span>Услуга</span><b>Татуировка · от {money(master.price)}</b></div>
    <p className="muted-note">Мастер увидит выбранный интервал и прикреплённую фотографию.</p>
    {error&&<p className="auth-error">{error}</p>}
    <button className="primary-button full-button" disabled={saving||uploading||!selectedSlot} onClick={submit}>{uploading?'Загружаем фото…':saving?'Отправляем…':'Отправить заявку'} <ChevronRight size={17}/></button>
  </main></>
}
function BookingsPage({ supabase, user }) {
  const [bookings,setBookings]=useState([])
  const [loading,setLoading]=useState(true)
  const [reviewed,setReviewed]=useState([])
  const [reviewText,setReviewText]=useState({})
  const [reviewStars,setReviewStars]=useState({})
  useEffect(()=>{let live=true;async function load(){if(!supabase||!user){setBookings([]);setLoading(false);return}const [bookingResult,reviewResult]=await Promise.all([supabase.from('bookings').select('id,master_id,starts_at,status,client_note,masters(public_name,studio_name)').eq('client_id',user.id).order('starts_at',{ascending:true}),supabase.from('reviews').select('booking_id').eq('client_id',user.id)]);if(live){setBookings(bookingResult.data||[]);setReviewed((reviewResult.data||[]).map(x=>x.booking_id))}setLoading(false)}load();return()=>{live=false}},[supabase,user])
  const sendReview=async booking=>{const body=(reviewText[booking.id]||'').trim();if(!body)return;const {error}=await supabase.from('reviews').insert({booking_id:booking.id,client_id:user.id,master_id:booking.master_id,rating:reviewStars[booking.id]||5,body});if(error){setReviewText(old=>({...old,[booking.id]:'Ошибка: '+error.message}));return}setReviewed(old=>[...old,booking.id])}
  return <><Header title="Мои записи" subtitle="ВАШИ ВСТРЕЧИ"/><main className="page-content">{loading?<div className="empty-state">Загружаем записи…</div>:bookings.length ? bookings.map(b=><div className="booking-card" key={b.id}><div className="booking-status"><span className="status-dot"/> {b.status==='pending'?'Ожидает подтверждения':b.status==='confirmed'?'Подтверждена':b.status==='cancelled'?'Отменена':b.status==='completed'?'Завершена':b.status}</div><h3>{b.masters?.public_name||'Мастер'}</h3><p>{b.client_note||'Запись'}</p><div className="booking-date"><CalendarDays size={16}/> {new Date(b.starts_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}</div>{b.status==='completed'&&!reviewed.includes(b.id)&&<div className="review-editor"><b>Оставить отзыв</b><select value={reviewStars[b.id]||5} onChange={e=>setReviewStars(old=>({...old,[b.id]:Number(e.target.value)}))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} из 5</option>)}</select><textarea value={reviewText[b.id]||''} onChange={e=>setReviewText(old=>({...old,[b.id]:e.target.value}))} placeholder="Как всё прошло?"/><button className="primary-button" onClick={()=>sendReview(b)}>Отправить отзыв</button></div>}{reviewed.includes(b.id)&&<p className="muted-note">Отзыв отправлен. Спасибо!</p>}</div>) : <div className="empty-state tall"><CalendarDays size={34}/><b>Пока нет записей</b><span>Выбери мастера и забронируй удобное время</span></div>}</main></>
}

function ProfilePage({ isMaster, isAdmin, viewMode, setViewMode, connectionStatus, user, authLoading, onLogin, onSignOut, authError, onStartRegistration, registrationStatus }) {
  return <><Header title="Профиль" subtitle="ТВОЙ MASTER HUB"/><main className="page-content profile-page">{isAdmin && <section className="role-preview-switch"><span className="eyebrow">РЕЖИМ ПРОСМОТРА · ТОЛЬКО ВЛАДЕЛЕЦ</span><div><button className={viewMode==='client'?'selected':''} onClick={()=>setViewMode('client')}><UserRound size={16}/> Я клиент</button><button className={viewMode==='master'?'selected':''} onClick={()=>setViewMode('master')}><BriefcaseBusiness size={16}/> Я мастер</button></div><small>Реальные права администратора сохраняются.</small></section>}<div className="profile-card"><div className="profile-avatar">{user ? (user.user_metadata?.first_name?.[0] || user.user_metadata?.full_name?.[0] || 'M') : 'MH'}</div><div><h2>{user ? (user.user_metadata?.first_name || user.user_metadata?.full_name || 'Пользователь Telegram') : 'Гость MASTER HUB'}</h2><span>{user ? (isAdmin ? 'Владелец приложения' : isMaster ? 'Кабинет мастера' : 'Клиентский аккаунт') : 'Подключение Telegram'}</span></div><button className="icon-button"><Settings size={19}/></button></div>
    {!isMaster && !isAdmin && <button className="profile-register-master" onClick={onStartRegistration}><BriefcaseBusiness size={19}/><span><b>Стать мастером</b><small>Создать профиль, добавить работы и принимать записи</small></span><ChevronRight size={18}/></button>}
    {isMaster && <div className="profile-register-master master-active"><BriefcaseBusiness size={19}/><span><b>Профиль мастера</b><small>Твоя анкета отправлена или уже опубликована</small></span><ChevronRight size={18}/></div>}
    {isAdmin && <button className="profile-register-master master-active" onClick={()=>setViewMode('master')}><BriefcaseBusiness size={19}/><span><b>Открыть кабинет мастера</b><small>Портфолио, услуги, расписание и записи</small></span><ChevronRight size={18}/></button>}{registrationStatus && <p className="muted-note">{registrationStatus}</p>}
    <div className="profile-menu">{(isMaster?['Мой профиль мастера','Портфолио и услуги','Расписание и выходные','Заявки на запись','Статистика']:['Личные данные','Мои отзывы','Уведомления','Помощь и поддержка']).map((x,i)=><button key={x}><span className="menu-icon">{[<UserRound/>,<Camera/>,<CalendarDays/>,<BriefcaseBusiness/>,<Star/>][i]}</span>{x}<ChevronRight size={17}/></button>)}</div>
    {user
      ? <button className="primary-button full-button" onClick={onSignOut}><LogOut size={17}/> Выйти из аккаунта</button>
      : <button className="primary-button full-button" onClick={onLogin} disabled={authLoading}>
          {authLoading ? 'Подключаем Telegram…' : 'Подключить Telegram'}
        </button>}
    {authError && <p className="muted-note auth-error" role="alert">{authError}</p>}
    <p className="muted-note">Связь с сервером: <b>{connectionStatus}</b></p>
  </main></>
}


function MasterRegistration({ onClose, onSubmit }) {
  const [form, setForm] = useState({ category: 'tattoo', public_name: '', bio: '', studio_name: '', contact_telegram: '', experience_years: '0', starting_price: '' })
  const [saving, setSaving] = useState(false)
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }))
  const submit = async e => { e.preventDefault(); if (!form.public_name.trim()) return; setSaving(true); await onSubmit(form); setSaving(false) }
  return <div className="modal-backdrop"><form className="master-registration-modal" onSubmit={submit}>
    <button type="button" className="modal-close" onClick={onClose}><X size={20}/></button>
    <span className="eyebrow">MASTER HUB · АНКЕТА</span><h2>Регистрация мастера</h2><p>Заполни данные — анкета попадёт на модерацию и после одобрения появится в каталоге.</p>
    <label>Направление<select value={form.category} onChange={e=>update('category',e.target.value)}>{categories.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <label>Имя или псевдоним<input required value={form.public_name} onChange={e=>update('public_name',e.target.value)} placeholder="Как тебя показывать клиентам"/></label>
    <label>О себе<textarea required value={form.bio} onChange={e=>update('bio',e.target.value)} placeholder="Опыт, подход, особенности работ"/></label>
    <label>Студия (необязательно)<input value={form.studio_name} onChange={e=>update('studio_name',e.target.value)} placeholder="Название студии"/></label>
    <label>Telegram для связи<input value={form.contact_telegram} onChange={e=>update('contact_telegram',e.target.value)} placeholder="@username"/></label>
    <div className="registration-row"><label>Опыт, лет<input type="number" min="0" value={form.experience_years} onChange={e=>update('experience_years',e.target.value)}/></label><label>Цена от, ₽<input required type="number" min="0" value={form.starting_price} onChange={e=>update('starting_price',e.target.value)}/></label></div>
    <button className="primary-button full-button" disabled={saving}>{saving ? 'Отправляем…' : 'Отправить на проверку'} <ChevronRight size={17}/></button>
  </form></div>
}

export default function App() {
  const [active,setActive]=useState('home')
  const [introVisible,setIntroVisible]=useState(true)
  const [selectedCategory,setSelectedCategory]=useState('tattoo')
  const [selected,setSelected]=useState(null)
  const [bookingMaster,setBookingMaster]=useState(null)
  const [favorites,setFavorites]=useState([])
  const [bookings,setBookings]=useState([])
  const [user,setUser]=useState(null)
  const [authLoading,setAuthLoading]=useState(false)
  const [authError,setAuthError]=useState('')
  const [userRole,setUserRole]=useState('client')
  const [mastersList,setMastersList]=useState([])
  const [viewMode,setViewMode]=useState('client')
  const [bookingSaving,setBookingSaving]=useState(false)
  const [connectionStatus,setConnectionStatus]=useState(supabase ? 'подключаемся…' : 'не настроено')
  useEffect(() => { const timer = window.setTimeout(() => setIntroVisible(false), 1500); return () => window.clearTimeout(timer) }, [])
  useEffect(()=>{const handler=()=>setActive(userRole==='master'||(userRole==='admin'&&viewMode==='master')?'profile':'bookings');window.addEventListener('masterhub:open-notifications',handler);return()=>window.removeEventListener('masterhub:open-notifications',handler)},[userRole,viewMode])
  useEffect(() => {
    if (!supabase) return
    let active = true
    let attempted = false
    window.Telegram?.WebApp?.ready?.()
    window.Telegram?.WebApp?.expand?.()
    const connectTelegram = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const existingUser = data.session?.user || null
      setUser(existingUser)
      // Telegram WebView can be opened by a different Telegram account while
      // Supabase still has the previous account's persisted session. Always
      // exchange the current WebApp initData so the active Telegram ID wins.
      const tryTelegramAuth = () => {
        const initData = window.Telegram?.WebApp?.initData
        if (!active || attempted || !initData) return
        attempted = true
        loginWithTelegram()
      }
      tryTelegramAuth()
      const retryTimer = window.setInterval(tryTelegramAuth, 300)
      window.setTimeout(() => window.clearInterval(retryTimer), 20000)
    }
    connectTelegram()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    let active = true
    async function loadRole() {
      if (!supabase || !user) { setUserRole('client'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (active && data?.role) setUserRole(data.role)
    }
    loadRole()
    return () => { active = false }
  }, [user])
  const loginWithTelegram = async () => {
    setAuthError('')
    const initData = window.Telegram?.WebApp?.initData
    if (!initData) { setAuthError('Telegram не передал initData. Проверь, что приложение открыто кнопкой Web App внутри бота, а не обычной ссылкой.'); return null }
    if (!supabase) { setAuthError('Нет подключения к Supabase.'); return null }
    setAuthLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('telegram-auth', { body: { initData } })
      if (error) throw error
      if (!data?.session?.access_token || !data?.session?.refresh_token) throw new Error(data?.error || 'Не удалось получить сессию.')
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession(data.session)
      if (sessionError) throw sessionError
      const signedUser = sessionData?.user || data.session.user || null
      setUser(signedUser)
      return signedUser
    } catch (error) {
      console.error('MASTER HUB Telegram auth:', error)
      let message = error.message || 'Ошибка авторизации. Попробуй ещё раз.'
      if (error?.context && typeof error.context.json === 'function') {
        try { const payload = await error.context.json(); if (payload?.error) message = payload.error } catch {}
      }
      setAuthError(message)
      return null
    }
    finally { setAuthLoading(false) }
  }
  const startMasterRegistration = async () => {
    if (!user) {
      const signedUser = await loginWithTelegram()
      if (!signedUser) return
    }
    setRegistrationOpen(true)
  }
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const submitMasterRegistration = async form => {
    if (!supabase || !user) return
    setRegistrationStatus('Отправляем анкету…')
    const payload = { user_id: user.id, category: form.category, public_name: form.public_name, bio: form.bio, studio_name: form.studio_name || null, city: 'Калининград', contact_telegram: form.contact_telegram || null, experience_years: Number(form.experience_years || 0), starting_price: Number(form.starting_price || 0), status: 'pending' }
    const { error } = await supabase.from('masters').insert(payload)
    if (error) { setRegistrationStatus(error.message || 'Не удалось отправить анкету.'); return }
    if (userRole !== 'admin') { const { error: roleError } = await supabase.from('profiles').update({ role: 'master' }).eq('id', user.id); if (roleError) console.warn('Master role update:', roleError.message); setUserRole('master') }
    setRegistrationOpen(false)
    window.dispatchEvent(new Event('masterhub:master-created'))
    setRegistrationStatus('Анкета отправлена на проверку. После одобрения профиль появится в каталоге.')
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setUserRole('client') }
  useEffect(() => {
    let active = true
    async function loadMasters() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('masters')
        .select('id, category, public_name, bio, studio_name, city, contact_telegram, experience_years, starting_price, rating, reviews_count, cover_image_url, master_styles(styles(name)), portfolio_items(image_path), services(id,title,description,price_from,duration_minutes,is_active)')
        .eq('status', 'approved')
        .order('rating', { ascending: false })
      if (!active) return
      if (error) {
        setConnectionStatus('ошибка чтения базы')
        console.error('MASTER HUB Supabase:', error.message)
        return
      }
      const liveMasters = (data || []).map(m => ({
        id: m.id,
        category: m.category || 'tattoo',
        name: m.public_name,
        handle: m.contact_telegram || '',
        studio: m.studio_name || 'Частный мастер',
        rating: Number(m.rating || 0),
        reviews: Number(m.reviews_count || 0),
        price: Number(m.starting_price || 0),
        styles: (m.master_styles || []).map(item => item.styles?.name).filter(Boolean),
        city: m.city || 'Калининград',
        about: m.bio || '',
        experience: m.experience_years ? `${m.experience_years} лет` : 'Не указан',
        image: m.cover_image_url || m.portfolio_items?.[0]?.image_path || '',
        works: (m.portfolio_items || []).map(w=>w.image_path),
        services: (m.services || []).filter(service=>service.is_active && service.title?.trim().toLowerCase()==='татуировка')
      }))
      setMastersList(liveMasters)
      setConnectionStatus(`подключено · мастеров в каталоге: ${liveMasters.length}`)
    }
    loadMasters()
    const refreshMasters = () => {
      if (document.visibilityState === 'visible') loadMasters()
    }
    window.addEventListener('focus', refreshMasters)
    document.addEventListener('visibilitychange', refreshMasters)
    return () => {
      active = false
      window.removeEventListener('focus', refreshMasters)
      document.removeEventListener('visibilitychange', refreshMasters)
    }
  }, [active])
  useEffect(()=>{let live=true;async function loadFavorites(){if(!supabase||!user){setFavorites([]);return}const {data}=await supabase.from('favorites').select('master_id').eq('client_id',user.id);if(live)setFavorites((data||[]).map(x=>x.master_id))}loadFavorites();return()=>{live=false}},[user])
  const toggleFavorite=async id=>{if(!user||!supabase){setAuthError('Подключи Telegram, чтобы сохранять избранное.');return}const exists=favorites.includes(id);setFavorites(old=>exists?old.filter(x=>x!==id):[...old,id]);const result=exists?await supabase.from('favorites').delete().eq('client_id',user.id).eq('master_id',id):await supabase.from('favorites').insert({client_id:user.id,master_id:id});if(result.error){setAuthError(result.error.message);setFavorites(old=>exists?[...old,id]:old.filter(x=>x!==id))}}
  const goBack=()=>{setSelected(null);setBookingMaster(null)}
  const confirmBooking=async data=>{if(!user||!supabase){setAuthError('Подключи Telegram, чтобы отправить заявку на запись.');return}setBookingSaving(true);const {error}=await supabase.from('bookings').insert({client_id:user.id,master_id:data.master.id,slot_id:data.slotId,service_id:null,starts_at:data.startsAt,ends_at:data.endsAt,client_note:'Татуировка',reference_image_url:data.referenceImageUrl||null});setBookingSaving(false);if(error){setAuthError(error.message);return}setBookingMaster(null);setSelected(null);setActive('bookings')}
  let content
  if(bookingMaster) content=<BookingPage master={bookingMaster} onBack={()=>setBookingMaster(null)} onConfirm={confirmBooking} saving={bookingSaving} supabase={supabase} user={user}/>
  else if(selected) content=<MasterDetail master={selected} onBack={()=>setSelected(null)} favorite={favorites.includes(selected.id)} toggleFavorite={()=>toggleFavorite(selected.id)} onBook={()=>setBookingMaster(selected)}/>
  else if(active==='home') content=<HomePage introVisible={introVisible} onSelectCategory={id=>{setSelectedCategory(id);setActive('catalog')}}/>
  else if(active==='catalog') content=<CatalogPage category={selectedCategory} onBack={()=>setActive('home')} openMaster={setSelected} favorites={favorites} toggleFavorite={toggleFavorite} mastersList={mastersList}/>
  else if(active==='bookings') content=<BookingsPage supabase={supabase} user={user}/>
  else if(active==='favorites') content=<><Header title="Избранное" subtitle="ТВОИ МАСТЕРА"/><main className="page-content"><div className="master-list">{mastersList.filter(m=>favorites.includes(m.id)).map(m=><MasterCard key={m.id} master={m} favorite onFavorite={()=>toggleFavorite(m.id)} onOpen={()=>setSelected(m)}/>)}</div>{!favorites.length&&<div className="empty-state tall"><Heart size={34}/><b>Здесь пока пусто</b><span>Сохраняй мастеров, которые понравились</span><button className="primary-button" onClick={()=>setActive('catalog')}>Открыть каталог</button></div>}</main></>
  else if(active==='admin' && userRole==='admin') content=<AdminPanel supabase={supabase}/>
  else if(active==='profile' && (userRole==='master' || (userRole==='admin' && viewMode==='master'))) content=<MasterWorkspace supabase={supabase} user={user} isAdmin={userRole==='admin'} viewMode={viewMode} setViewMode={setViewMode} onOpenRegistration={()=>setRegistrationOpen(true)}/>
  else content=<ProfilePage isMaster={userRole==='master'} isAdmin={userRole==='admin'} viewMode={viewMode} setViewMode={setViewMode} connectionStatus={connectionStatus} user={user} authLoading={authLoading} onLogin={loginWithTelegram} onSignOut={signOut} authError={authError} onStartRegistration={startMasterRegistration} registrationStatus={registrationStatus}/>
  return <div className="app-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="app-inner">{content}{!selected&&!bookingMaster&&!(active==='home'&&introVisible)&&<BottomNav active={active} setActive={setActive} isAdmin={userRole==='admin'}/>}</div>{registrationOpen && <MasterRegistration onClose={()=>setRegistrationOpen(false)} onSubmit={submitMasterRegistration}/>}</div>
}