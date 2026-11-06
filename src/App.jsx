import { Component, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { Home, Search, CalendarDays, Heart, UserRound, MapPin, Star, Clock3, ArrowLeft, SlidersHorizontal, ChevronRight, Bell, Plus, Check, X, Camera, Settings, LogOut, Menu, Sparkles, MessageCircle, BriefcaseBusiness, ClipboardList, Send, Upload, ContactRound, Inbox, CalendarCheck2, PenTool, Hand, Eye, CircleDot, Brush } from 'lucide-react'
import { masters, styles, workImage } from './data'
import AdminPanel from './AdminPanel'
import MasterWorkspace from './MasterWorkspace'

class RenderErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    console.error('Master Hub screen render error:', error, info)
  }
  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error)
      return <section className="render-error-panel">
        <div className="render-error-mark">!</div>
        <h2>Экран не загрузился</h2>
        <p>Поймал ошибку интерфейса. Остальная часть приложения должна оставаться доступной.</p>
        <pre>{message}</pre>
        <button type="button" className="primary-button" onClick={() => this.setState({ error: null })}>Попробовать снова</button>
      </section>
    }
    return this.props.children
  }
}

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
    <button className={`master-photo ${master.image ? 'has-image' : 'no-image'}`} onClick={onOpen} aria-label={`Открыть профиль ${master.name}`}>
      {master.image ? <img src={master.image} alt="" loading="lazy" decoding="async" /> : <span className="master-photo-placeholder">MASTER HUB</span>}
      <span className="photo-tag"><span className="online-dot" /> Принимает записи</span>
    </button>
    <div className="master-card-body">
      <div className="card-heading">
        <button className="master-name" onClick={onOpen}>{master.name}</button>
        <button className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={onFavorite} aria-label="В избранное"><Heart size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="master-meta"><span className="rating">{master.reviews>0?<><Star size={14} fill="currentColor" /> {master.rating.toFixed(1)} <span>({master.reviews})</span></>:'Новый мастер'}</span><span className="meta-separator">·</span><span>{master.studio}</span></div>
      <div className="tag-row">{master.styles.slice(0, 3).map(s => <span className="style-tag" key={s}>{s}</span>)}</div>
      <div className="smart-master-meta"><span>{master.experience || 'Опыт не указан'}</span>{master.nextAvailable && <span>Ближайшее окно · {new Date(master.nextAvailable).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</span>}</div>
      <div className="card-footer"><span className="price-caption">{master.price>0?<>От <b>{money(master.price)}</b></>:<b>Цена по запросу</b>}</span><button className="text-link" onClick={onOpen}>Профиль <ChevronRight size={15} /></button></div>
    </div>
  </article>
}

function MasterCardSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, index) => <article className="master-card master-card-skeleton" key={index} aria-hidden="true">
    <div className="skeleton-photo" />
    <div className="master-card-body"><div className="skeleton-line wide"/><div className="skeleton-line medium"/><div className="skeleton-tags"><i/><i/><i/></div><div className="skeleton-line short"/></div>
  </article>)
}

function BottomNav({ active, setActive, isAdmin, isMaster }) {
  const masterTabs = [
    { id: 'profile', label: 'Кабинет', icon: ContactRound },
    { id: 'master-inbox', label: 'Заявки', icon: Inbox },
    { id: 'master-bookings', label: 'Записи', icon: CalendarCheck2 },
    { id: 'home', label: 'Клиент', icon: Home }
  ]
  const visibleTabs = isMaster ? masterTabs : isAdmin ? [...tabs, { id: 'admin', label: 'Заявки', icon: ClipboardList }] : tabs
  return <nav className="bottom-nav" aria-label="Основная навигация" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>{visibleTabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={active === id ? 'page' : undefined} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => setActive(id)}><Icon size={18} strokeWidth={active === id ? 2.25 : 1.7} /><span>{label}</span></button>)}</nav>
}

function Header({ title, subtitle, back, action }) {
  return <header className="topbar">
    {back ? <button className="icon-button back-button" onClick={back}><ArrowLeft size={21}/></button> : <div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div>}
    <div className="topbar-title">{title && <strong>{title}</strong>}{subtitle && <small>{subtitle}</small>}</div>
    {action || <button className="icon-button" aria-label="Уведомления и обновления" onClick={()=>window.dispatchEvent(new CustomEvent("masterhub:open-notifications"))}><Bell size={19}/><i className="notification-dot"/></button>}
  </header>
}

const categoryIcons = { tattoo: PenTool, nails: Hand, brows: Eye, piercing: CircleDot, makeup: Brush }

function CategoryIcon({ type }) {
  const Icon = categoryIcons[type] || PenTool
  return <Icon className={`category-theme-icon category-theme-${type}`} size={35} strokeWidth={1.55} aria-hidden="true" />
}

function HomePage({ introVisible, onSelectCategory }) {
  if (introVisible) return <main className="page-content home-page home-redesign">
    <section className="home-intro home-intro-only"><h1>Выбери своего мастера</h1></section>
  </main>
  return <main className="page-content home-page category-home">
    <div className="category-heading"><span className="eyebrow">MASTER HUB · КАЛИНИНГРАД</span><h1>Выбери направление</h1><p>Сначала услуга — затем подходящий мастер.</p></div>
    <div className="category-list">{categories.map(item => <button className="category-choice" key={item.id} onClick={() => onSelectCategory(item.id)}>
      <span className="category-copy"><b>{item.title}</b><small>{item.subtitle}</small></span><span className="category-art"><CategoryIcon type={item.id}/></span><ChevronRight size={19}/>
    </button>)}</div>
  </main>
}

function CatalogPage({ openMaster, favorites, toggleFavorite, mastersList, category, onBack, loading }) {
  const [query, setQuery] = useState('')
  const [style, setStyle] = useState('Все')
  const [sort, setSort] = useState('popular')
  const filtered = useMemo(() => mastersList.filter(m => m.category === category && (m.name + m.studio + m.styles.join(' ')).toLowerCase().includes(query.toLowerCase()) && (category !== 'tattoo' || style === 'Все' || m.styles.includes(style))).sort((a,b)=>sort==='price' ? a.price-b.price : b.rating-a.rating), [mastersList, category, query, style, sort])
  const categoryName = categoryLabels[category] || 'Услуги'
  return <><Header title={`Мастера · ${categoryName}`} subtitle="КАЛИНИНГРАД" back={onBack}/>
    <main className="page-content"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Имя мастера или стиль..."/>{query && <button onClick={()=>setQuery('')}><X size={16}/></button>}</div>
      <div className="filter-head"><span>{filtered.length} мастера</span><label><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="popular">По рейтингу</option><option value="price">Сначала дешевле</option></select></label></div>
      {category === 'tattoo' && <div className="tattoo-style-select"><label htmlFor="tattoo-style">Стиль татуировки</label><select id="tattoo-style" value={style} onChange={e=>setStyle(e.target.value)}>{styles.map(s=><option key={s} value={s}>{s === 'Все' ? 'Все стили' : s}</option>)}</select></div>}
      <div className="master-list catalog-list">{loading ? <MasterCardSkeleton count={3}/> : <>{filtered.map(m=><MasterCard key={m.id} master={m} favorite={favorites.includes(m.id)} onFavorite={()=>toggleFavorite(m.id)} onOpen={()=>openMaster(m)}/>) }{!filtered.length&&<div className="empty-state"><Search size={30}/><b>Пока нет мастеров</b><span>В этой категории ещё нет опубликованных анкет. Загляни позже.</span></div>}</>}</div>
    </main></>
}

function MasterDetail({ master, onBack, favorite, toggleFavorite, onBook }) {
  const [tab, setTab] = useState('works')
  const [lightbox, setLightbox] = useState('')
  return <><Header title="Профиль мастера" back={onBack} action={<button className={favorite?'icon-button is-favorite':'icon-button'} onClick={toggleFavorite}><Heart size={20} fill={favorite?'currentColor':'none'}/></button>}/>
    <main className="page-content detail-page"><div className="detail-cover" style={{backgroundImage:`url(${master.image})`}}/><div className="detail-identity"><div><span className="eyebrow">{master.studio}</span><h1>{master.name}</h1><div className="master-meta"><span className="rating">{master.reviews>0?<><Star size={14} fill="currentColor"/> {master.rating.toFixed(1)} ({master.reviews} отзывов)</>:'Новый мастер · отзывов пока нет'}</span></div></div><div className="avatar-placeholder">{master.name.split(' ').map(x=>x[0]).join('')}</div></div>
      <div className="detail-facts"><div><small>ОПЫТ</small><b>{master.experience}</b></div><div><small>СТАРТ ОТ</small><b>{master.price>0?money(master.price):'По запросу'}</b></div><div><small>ГОРОД</small><b>{master.city||'Калининград'}</b></div></div>
      <p className="detail-about">{master.about}</p><div className="tag-row detail-tags">{master.styles.map(s=><span className="style-tag" key={s}>{s}</span>)}</div>
      <div className="detail-tabs"><button className={tab==='works'?'selected':''} onClick={()=>setTab('works')}>Портфолио</button><button className={tab==='services'?'selected':''} onClick={()=>setTab('services')}>Услуги и цены</button><button className={tab==='reviews'?'selected':''} onClick={()=>setTab('reviews')}>Отзывы · {master.reviews}</button><button className={tab==='info'?'selected':''} onClick={()=>setTab('info')}>О мастере</button></div>
      {tab==='works'&&<><div className="portfolio-intro"><span>РАБОТЫ МАСТЕРА</span><b>{master.works.length} фото</b></div><div className="work-grid">{master.works.map((w,i)=><button type="button" className="portfolio-work" key={w+i} onClick={()=>setLightbox(w)}><img src={String(w).startsWith('http') ? w : workImage(w)} alt={master.workCaptions?.[i]||'Работа мастера'} loading="lazy"/>{master.workCaptions?.[i]&&<span>{master.workCaptions[i]}</span>}</button>)}</div>{!master.works.length&&<div className="empty-state">Мастер скоро добавит свои работы.</div>}</>}
      {tab==='services'&&<div className="service-list">{master.services?.length ? master.services.map(service=><div key={service.id}><span>{service.title}<small>{service.description||service.duration_minutes+' мин.'}</small></span><b>от {money(service.price_from)}</b></div>) : <><div><span>Стоимость услуг</span><b>от {money(master.price)}</b></div><small>Мастер ещё не добавил подробный прайс. Уточни стоимость при записи.</small></>}</div>}
      {tab==='reviews'&&<div className="master-reviews-list">{master.reviewItems?.length?master.reviewItems.map(review=><article className="master-review-card" key={review.id}><div><b>Клиент</b><span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div><small>{new Date(review.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</small>{review.body&&<p>{review.body}</p>}</article>):<div className="empty-state">Пока нет отзывов. После первого сеанса клиент сможет оставить оценку.</div>}</div>}
      {tab==='info'&&<div className="info-panel"><p>{master.about}</p><p><MapPin size={15}/> {master.city||'Калининград'} · адрес студии уточняется при записи</p><p><MessageCircle size={15}/> {master.handle||'Telegram не указан'}</p></div>}
      <button className="primary-button booking-cta" onClick={onBook}>Записаться к мастеру <ChevronRight size={17}/></button>
      {lightbox&&<div className="modal-backdrop portfolio-lightbox" onClick={()=>setLightbox('')}><button type="button" className="modal-close" onClick={()=>setLightbox('')}><X size={22}/></button><img src={lightbox} alt="Работа мастера" onClick={e=>e.stopPropagation()}/></div>}
    </main>
  </>
}

function BookingPage({ master, onBack, onConfirm, saving, supabase, user }) {
  const [slots,setSlots]=useState([])
  const [busy,setBusy]=useState([])
  const [selectedDate,setSelectedDate]=useState('')
  const [selectedSlot,setSelectedSlot]=useState(null)
  const [selectedService,setSelectedService]=useState(master.services?.[0]?.id||'')
  const [clientNote,setClientNote]=useState('')
  const [reference,setReference]=useState(null)
  const [clientTelegram,setClientTelegram]=useState('')
  const [uploading,setUploading]=useState(false)
  const [error,setError]=useState('')
  const [month,setMonth]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const telegramContact=useMemo(()=>{const raw=String(master.handle||'').trim();if(!raw)return '';if(raw.startsWith('https://')||raw.startsWith('http://'))return raw;if(raw.startsWith('t.me/'))return 'https://'+raw;const username=raw.startsWith('@')?raw.slice(1):raw;return 'https://t.me/'+username},[master.handle])
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const days=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1))},[month])
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;const today=dateKey(new Date());const limit=new Date();limit.setDate(limit.getDate()+60);const s=await supabase.from('master_time_slots').select('*').eq('master_id',master.id).gte('slot_date',today).lte('slot_date',dateKey(limit)).order('slot_date').order('starts_at');if(live){setSlots(s.data||[]);if(s.error)setError(s.error.message);if(!selectedDate){const firstFree=(s.data||[]).find(slot=>slot.is_active&&new Date(slot.starts_at)>new Date());if(firstFree){setSelectedDate(firstFree.slot_date);setMonth(new Date(firstFree.slot_date+'T12:00:00'))}}}}load();return()=>{live=false}},[supabase,master.id])
  const slotsFor=key=>slots.filter(s=>s.slot_date===key)
  const freeFor=key=>slotsFor(key).filter(s=>s.is_active&&new Date(s.starts_at)>new Date())
  const statusFor=key=>{const all=slotsFor(key);if(!all.length)return '';const free=freeFor(key).length;return free===0?'full':free===all.length?'free':'partial'}
  const chooseDate=key=>{setSelectedDate(key);setSelectedSlot(null)}
  const uploadReference=async()=>{
    if(!reference)return null
    if(!user)throw new Error('Подключи Telegram, чтобы прикрепить референс.')
    const allowed=['image/jpeg','image/png','image/webp']
    if(!allowed.includes(reference.type))throw new Error('Поддерживаются только JPG, PNG и WebP.')
    if(reference.size>5*1024*1024)throw new Error('Референс слишком большой. Максимум — 5 МБ.')
    const ext=reference.type==='image/png'?'png':reference.type==='image/webp'?'webp':'jpg'
    const path=user.id+'/reference-'+crypto.randomUUID()+'.'+ext
    const {data,error}=await supabase.storage.from('masterhub-media').upload(path,reference,{contentType:reference.type,upsert:false})
    if(error)throw error
    return supabase.storage.from('masterhub-media').getPublicUrl(data.path).data.publicUrl
  }
  const submit=async()=>{
    if(!selectedSlot){setError('Сначала выбери свободный интервал.');return}
    setError('')
    try{setUploading(true);const referenceImageUrl=await uploadReference();setUploading(false);await onConfirm({master,slotId:selectedSlot.id,startsAt:selectedSlot.starts_at,endsAt:selectedSlot.ends_at,serviceId:selectedService||null,clientNote:clientNote.trim(),referenceImageUrl,clientTelegram:clientTelegram.trim()})}catch(e){setUploading(false);setError(e.message||'Не удалось загрузить фотографию.')}
  }
  return <><Header title="Онлайн-запись" back={onBack}/><main className="page-content booking-page">
    <div className="booking-master">{master.image&&<img src={master.image} alt=""/>}<div><b>{master.name}</b><small>{master.studio}</small></div></div>
    <section className="booking-contact-card"><div><span className="eyebrow">ЕСТЬ ВОПРОСЫ?</span><b>Свяжись с мастером напрямую</b><small>Можно уточнить детали татуировки до отправки заявки.</small></div>{telegramContact?<a href={telegramContact} target="_blank" rel="noopener noreferrer" className="telegram-contact-button"><Send size={16}/> Написать в Telegram</a>:<span className="contact-unavailable">Мастер пока не указал Telegram для связи</span>}</section>
    <span className="eyebrow">ШАГ 1 · УСЛУГА И ДЕТАЛИ</span>
    {master.services?.length>0&&<label className="booking-service-field">ВЫБЕРИ УСЛУГУ<select value={selectedService} onChange={e=>setSelectedService(e.target.value)}>{master.services.map(service=><option key={service.id} value={service.id}>{service.title} · {Number(service.price_from)>0?'от '+money(service.price_from):'цена по запросу'}</option>)}</select></label>}
    <label className="booking-note-field">ЧТО ХОЧЕШЬ СДЕЛАТЬ?<textarea value={clientNote} onChange={e=>setClientNote(e.target.value.slice(0,300))} placeholder="Размер, место, идея, пожелания мастеру…" maxLength={300}/></label>
    <span className="eyebrow">ШАГ 2 · РЕФЕРЕНС / ЭСКИЗ</span>
    <label className="upload-control booking-reference"><Upload size={16}/>{reference?reference.name:'Прикрепить фото или эскиз'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0]||null;if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){setError(file.size>5*1024*1024?'Максимальный размер референса — 5 МБ.':'Поддерживаются только JPG, PNG и WebP.');e.target.value='';setReference(null);return}setError('');setReference(file)}}/></label>
    {reference&&<p className="muted-note">Фото будет прикреплено к заявке мастеру.</p>}
    <label className="client-telegram-field">ТВОЙ TELEGRAM ДЛЯ СВЯЗИ<input value={clientTelegram} onChange={e=>setClientTelegram(e.target.value.slice(0,32))} placeholder="@username" maxLength={32} autoCapitalize="none" autoCorrect="off"/><small>Мастер сможет написать тебе, чтобы уточнить детали записи.</small></label>
    <span className="eyebrow">ШАГ 3 · ВЫБЕРИ ДЕНЬ</span>
    <div className="calendar-month-head"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><b>{month.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</b><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div>
    <div className="calendar-weekdays">{['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map((x,i)=><span key={i}>{x}</span>)}</div>
    <div className="client-calendar-grid">{days.map((d,i)=>{const key=dateKey(d),same=d.getMonth()===month.getMonth(),past=new Date(key+'T23:59:59')<new Date(new Date().toDateString()),status=statusFor(key);return <button key={i} disabled={!same||past||!slotsFor(key).length||!freeFor(key).length} className={`calendar-day ${same?'':'outside'} ${selectedDate===key?'chosen':''} ${status}`} onClick={()=>chooseDate(key)}><span>{d.getDate()}</span>{status&&<i/>}</button>})}</div>
    <div className="calendar-legend"><span><i className="free"/> Свободно</span><span><i className="partial"/> Частично занято</span><span><i className="full"/> Нет мест</span></div>
    <span className="eyebrow">ШАГ 4 · СВОБОДНОЕ ВРЕМЯ</span>
    <div className="available-slot-list">{selectedDate?freeFor(selectedDate).map(slot=><button key={slot.id} className={selectedSlot?.id===slot.id?'time-slot selected':'time-slot'} onClick={()=>setSelectedSlot(slot)}>{new Date(slot.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} — {new Date(slot.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</button>):<p className="muted-note">Выбери день, отмеченный зелёным или жёлтым.</p>}{selectedDate&&!freeFor(selectedDate).length&&<p className="muted-note">На эту дату свободного времени нет.</p>}</div>
    <div className="booking-summary"><span>Услуга</span><b>{master.services?.find(s=>s.id===selectedService)?.title||'Уточним с мастером'} · {master.services?.find(s=>s.id===selectedService)?.price_from>0?('от '+money(master.services.find(s=>s.id===selectedService).price_from)):(master.price>0?'от '+money(master.price):'цена по запросу')}</b></div>
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
  const [savingId,setSavingId]=useState('')
  const [error,setError]=useState('')
  useEffect(()=>{let live=true;const load=async()=>{if(!supabase||!user){setBookings([]);setLoading(false);return}const [bookingResult,reviewResult]=await Promise.all([supabase.from('bookings').select('*,masters(public_name,studio_name)').eq('client_id',user.id).order('starts_at',{ascending:true}),supabase.from('reviews').select('booking_id').eq('client_id',user.id)]);if(live){setBookings(bookingResult.data||[]);setReviewed((reviewResult.data||[]).map(x=>x.booking_id));if(bookingResult.error)setError(bookingResult.error.message)}setLoading(false)};load();if(!supabase||!user)return()=>{live=false};const channel=supabase.channel('client-bookings-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings',filter:'client_id=eq.'+user.id},()=>load()).subscribe();return()=>{live=false;supabase.removeChannel(channel)}},[supabase,user])
  const respondToPrice=async(booking,accept)=>{
    setSavingId(booking.id);setError('')
    const {data,error}=await supabase.from('bookings').update({status:accept?'confirmed':'declined'}).eq('id',booking.id).eq('status','price_proposed').select('id,status').maybeSingle()
    setSavingId('')
    if(error){setError(error.message);return}
    if(!data){setError('Предложение уже изменилось. Обнови список записей.');return}
    setBookings(old=>old.map(x=>x.id===booking.id?{...x,status:data.status}:x))
  }
  const sendReview=async booking=>{if(savingId===booking.id)return;const body=(reviewText[booking.id]||'').trim();setSavingId(booking.id);setError('');const {error}=await supabase.from('reviews').insert({booking_id:booking.id,client_id:user.id,master_id:booking.master_id,rating:reviewStars[booking.id]||5,body});setSavingId('');if(error){setError(error.code==='23505'?'Отзыв для этого сеанса уже существует.':error.message);if(error.code==='23505')setReviewed(old=>[...old,booking.id]);return}setReviewed(old=>[...old,booking.id]);setReviewText(old=>({...old,[booking.id]:''}))}
  return <><Header title="Мои записи" subtitle="ВАШИ ВСТРЕЧИ"/><main className="page-content">{loading?<div className="empty-state">Загружаем записи…</div>:bookings.length?bookings.map(b=><div className="booking-card booking-card-expanded" key={b.id}><div className="booking-status"><span className="status-dot"/> {b.status==='pending'?'Заявка отправлена · ждём расчёт':b.status==='price_proposed'?'Мастер предложил цену':b.status==='confirmed'?'Цена согласована · запись подтверждена':b.status==='cancelled'?'Отменена':b.status==='declined'?'Предложение отклонено':b.status==='completed'?'Завершена':b.status}</div><h3>{b.masters?.public_name||'Мастер'}</h3><p>{b.client_note||'Запись'}</p><div className="booking-date"><CalendarDays size={16}/> {new Date(b.starts_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}</div>{b.reference_image_url&&<a className="client-reference-link" href={b.reference_image_url} target="_blank" rel="noopener noreferrer">Открыть мой референс</a>}{b.status==='price_proposed'&&<div className="client-price-offer"><span>ПРЕДЛОЖЕНИЕ МАСТЕРА</span><strong>{new Intl.NumberFormat('ru-RU').format(Number(b.proposed_price||0))} ₽</strong>{b.master_message&&<p>{b.master_message}</p>}<div><button className="approve-button" disabled={savingId===b.id} onClick={()=>respondToPrice(b,true)}>{savingId===b.id?'Отправляем…':'Согласиться'}</button><button className="reject-button" disabled={savingId===b.id} onClick={()=>respondToPrice(b,false)}>Отказаться</button></div></div>}{b.status==='confirmed'&&b.proposed_price&&<p className="muted-note">Согласованная стоимость: <b>{new Intl.NumberFormat('ru-RU').format(Number(b.proposed_price))} ₽</b></p>}{b.status==='completed'&&!reviewed.includes(b.id)&&<div className="review-editor"><b>Оценить сеанс</b><div className="review-star-picker">{[1,2,3,4,5].map(n=><button type="button" key={n} className={(reviewStars[b.id]||5)>=n?'active':''} onClick={()=>setReviewStars(old=>({...old,[b.id]:n}))} aria-label={n+' из 5'}>★</button>)}</div><textarea maxLength={1000} value={reviewText[b.id]||''} onChange={e=>setReviewText(old=>({...old,[b.id]:e.target.value}))} placeholder="Расскажи, как всё прошло (необязательно)"/><button className="primary-button" disabled={savingId===b.id} onClick={()=>sendReview(b)}>{savingId===b.id?'Отправляем…':'Отправить отзыв'}</button></div>}{reviewed.includes(b.id)&&<p className="muted-note">Отзыв отправлен. Спасибо!</p>}</div>):<div className="empty-state tall"><CalendarDays size={34}/><b>Пока нет записей</b><span>Выбери мастера и забронируй удобное время</span></div>}{error&&<p className="auth-error">{error}</p>}</main></>
}

function ProfilePage({ supabase, isMaster, isAdmin, viewMode, setViewMode, connectionStatus, user, authLoading, onLogin, onSignOut, authError, onStartRegistration, registrationStatus }) {
  const [profileAvatar, setProfileAvatar] = useState('')
  const [avatarFailed, setAvatarFailed] = useState(false)
  useEffect(() => {
    let active = true
    setAvatarFailed(false)
    setProfileAvatar(user?.user_metadata?.avatar_url || '')
    if (supabase && user?.id) supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle().then(({data}) => {
      if (active && data?.avatar_url) setProfileAvatar(data.avatar_url)
    })
    return () => { active = false }
  }, [supabase, user?.id, user?.user_metadata?.avatar_url])
  const profileInitial = user ? (user.user_metadata?.first_name?.[0] || user.user_metadata?.full_name?.[0] || 'M') : 'MH'
  return <><Header title="Профиль" subtitle="ТВОЙ MASTER HUB"/><main className="page-content profile-page">{isAdmin && <section className="role-preview-switch"><span className="eyebrow">РЕЖИМ ПРОСМОТРА · ТОЛЬКО ВЛАДЕЛЕЦ</span><div><button className={viewMode==='client'?'selected':''} onClick={()=>setViewMode('client')}><UserRound size={16}/> Я клиент</button><button className={viewMode==='master'?'selected':''} onClick={()=>setViewMode('master')}><BriefcaseBusiness size={16}/> Я мастер</button></div><small>Реальные права администратора сохраняются.</small></section>}<div className="profile-card"><div className="profile-avatar">{profileAvatar && !avatarFailed ? <img src={profileAvatar} alt="Аватар Telegram" referrerPolicy="no-referrer" onError={()=>setAvatarFailed(true)}/> : profileInitial}</div><div><h2>{user ? (user.user_metadata?.first_name || user.user_metadata?.full_name || 'Пользователь Telegram') : 'Гость MASTER HUB'}</h2><span>{user ? (isAdmin ? 'Владелец приложения' : isMaster ? 'Кабинет мастера' : 'Клиентский аккаунт') : 'Подключение Telegram'}</span></div><button className="icon-button"><Settings size={19}/></button></div>
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
    <label>Имя или псевдоним<input required value={form.public_name} onChange={e=>update('public_name',e.target.value)} placeholder="Как тебя показывать клиентам" maxLength={50}/></label>
    <label>О себе<textarea required value={form.bio} onChange={e=>update('bio',e.target.value)} placeholder="Опыт, подход, особенности работ" maxLength={500}/></label>
    <label>Студия (необязательно)<input value={form.studio_name} onChange={e=>update('studio_name',e.target.value)} placeholder="Название студии" maxLength={80}/></label>
    <label>Telegram для связи<input value={form.contact_telegram} onChange={e=>update('contact_telegram',e.target.value)} placeholder="@username" maxLength={32}/></label>
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
  const [mastersLoading,setMastersLoading]=useState(true)
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
      const [{ data: profile }, { data: ownMaster, error: masterError }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('masters').select('id').eq('user_id', user.id).limit(1).maybeSingle()
      ])
      if (!active) return
      if (profile?.role === 'admin') setUserRole('admin')
      else if (ownMaster && !masterError) setUserRole('master')
      else setUserRole('client')
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
    const payload = {
      user_id: user.id,
      category: form.category,
      public_name: String(form.public_name || '').trim().slice(0, 50),
      bio: String(form.bio || '').trim().slice(0, 500),
      studio_name: String(form.studio_name || '').trim().slice(0, 80) || null,
      city: 'Калининград',
      contact_telegram: String(form.contact_telegram || '').trim().slice(0, 32) || null,
      experience_years: Math.max(0, Number(form.experience_years || 0)),
      starting_price: Math.max(0, Number(form.starting_price || 0)),
      status: 'pending'
    }
    const { data: existing, error: lookupError } = await supabase.from('masters').select('id').eq('user_id', user.id).limit(1).maybeSingle()
    if (lookupError) { setRegistrationStatus(lookupError.message); return }
    const result = existing
      ? await supabase.from('masters').update(payload).eq('id', existing.id)
      : await supabase.from('masters').insert(payload)
    if (result.error) { setRegistrationStatus(result.error.message || 'Не удалось отправить анкету.'); return }
    if (userRole !== 'admin') setUserRole('master')
    setRegistrationOpen(false)
    window.dispatchEvent(new Event('masterhub:master-created'))
    setRegistrationStatus('Анкета отправлена на проверку. После одобрения профиль появится в каталоге.')
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setUser(null); setUserRole('client') }
  useEffect(() => {
    let live = true
    let requestInFlight = false
    const loadMasters = async () => {
      if (!supabase || requestInFlight) {
        if (!supabase) setMastersLoading(false)
        return
      }
      requestInFlight = true
      setMastersLoading(true)
      try {
        const { data, error } = await supabase
          .from('masters')
          .select('id, slug, category, public_name, bio, studio_name, city, contact_telegram, experience_years, starting_price, rating, reviews_count, cover_image_url, master_styles(styles(name)), portfolio_items(image_path,caption,sort_order), services(id,title,description,price_from,duration_minutes,is_active), reviews(id,rating,body,created_at), master_time_slots(slot_date,starts_at,is_active)')
          .eq('status', 'approved')
          .order('rating', { ascending: false })
        if (!live) return
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
          rating: (m.reviews||[]).length ? Number(((m.reviews||[]).reduce((sum,item)=>sum+Number(item.rating||0),0)/(m.reviews||[]).length).toFixed(1)) : Number(m.rating || 0),
          reviews: (m.reviews||[]).length || Number(m.reviews_count || 0),
          reviewItems: (m.reviews||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
          workCaptions: (m.portfolio_items||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(w=>w.caption||''),
          slug: m.slug,
          price: Number(m.starting_price || 0),
          styles: (m.master_styles || []).map(item => item.styles?.name).filter(Boolean),
          city: m.city || 'Калининград',
          about: m.bio || '',
          experience: m.experience_years ? `${m.experience_years} лет` : 'Не указан',
          image: m.cover_image_url || m.portfolio_items?.[0]?.image_path || '',
          works: (m.portfolio_items || []).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(w=>w.image_path),
          nextAvailable: (m.master_time_slots||[]).filter(slot=>slot.is_active && new Date(slot.starts_at)>new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]?.starts_at || '',
          services: (m.services || []).filter(service=>service.is_active)
        }))
        setMastersList(liveMasters)
        const launchParams = new URLSearchParams(window.location.search)
        const telegramStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
          || launchParams.get('tgWebAppStartParam')
          || launchParams.get('startapp')
          || ''
        const requestedSlug = launchParams.get('master')
          || (telegramStartParam.startsWith('master_') ? telegramStartParam.slice('master_'.length) : '')
        if (requestedSlug) {
          const publicMaster = liveMasters.find(item=>item.slug===requestedSlug)
          if (publicMaster) setSelected(publicMaster)
        }
        setConnectionStatus(`подключено · мастеров в каталоге: ${liveMasters.length}`)
      } catch (error) {
        if (live) {
          setConnectionStatus('ошибка загрузки')
          console.error('MASTER HUB load masters:', error)
        }
      } finally {
        requestInFlight = false
        if (live) setMastersLoading(false)
      }
    }
    loadMasters()
    const refreshMasters = () => {
      if (document.visibilityState === 'visible') loadMasters()
    }
    window.addEventListener('focus', refreshMasters)
    document.addEventListener('visibilitychange', refreshMasters)
    return () => {
      live = false
      window.removeEventListener('focus', refreshMasters)
      document.removeEventListener('visibilitychange', refreshMasters)
    }
  }, [])
  useEffect(()=>{let live=true;async function loadFavorites(){if(!supabase||!user){setFavorites([]);return}const {data}=await supabase.from('favorites').select('master_id').eq('client_id',user.id);if(live)setFavorites((data||[]).map(x=>x.master_id))}loadFavorites();return()=>{live=false}},[user])
  const toggleFavorite=async id=>{if(!user||!supabase){setAuthError('Подключи Telegram, чтобы сохранять избранное.');return}const exists=favorites.includes(id);setFavorites(old=>exists?old.filter(x=>x!==id):[...old,id]);const result=exists?await supabase.from('favorites').delete().eq('client_id',user.id).eq('master_id',id):await supabase.from('favorites').insert({client_id:user.id,master_id:id});if(result.error){setAuthError(result.error.message);setFavorites(old=>exists?[...old,id]:old.filter(x=>x!==id))}}
  const goBack=()=>{setSelected(null);setBookingMaster(null)}
  const confirmBooking=async data=>{if(!user||!supabase)throw new Error('Подключи Telegram, чтобы отправить заявку на запись.');setBookingSaving(true);try{const {error}=await supabase.from('bookings').insert({client_id:user.id,master_id:data.master.id,slot_id:data.slotId,service_id:data.serviceId||null,starts_at:data.startsAt,ends_at:data.endsAt,client_note:(data.clientNote||'Запись').slice(0,300),reference_image_url:data.referenceImageUrl||null,client_telegram:data.clientTelegram||null});if(error)throw error;setBookingMaster(null);setSelected(null);setActive('bookings')}finally{setBookingSaving(false)}}
  let content
  if(bookingMaster) content=<BookingPage master={bookingMaster} onBack={()=>setBookingMaster(null)} onConfirm={confirmBooking} saving={bookingSaving} supabase={supabase} user={user}/>
  else if(selected) content=<MasterDetail master={selected} onBack={()=>setSelected(null)} favorite={favorites.includes(selected.id)} toggleFavorite={()=>toggleFavorite(selected.id)} onBook={()=>setBookingMaster(selected)}/>
  else if(active==='home') content=<HomePage introVisible={introVisible} onSelectCategory={id=>{setSelectedCategory(id);setActive('catalog')}}/>
  else if(active==='catalog') content=<CatalogPage category={selectedCategory} onBack={()=>setActive('home')} openMaster={setSelected} favorites={favorites} toggleFavorite={toggleFavorite} mastersList={mastersList} loading={mastersLoading}/>
  else if(active==='bookings') content=<BookingsPage supabase={supabase} user={user}/>
  else if(active==='favorites') content=<><Header title="Избранное" subtitle="ТВОИ МАСТЕРА"/><main className="page-content"><div className="master-list">{mastersLoading?<MasterCardSkeleton count={2}/>:mastersList.filter(m=>favorites.includes(m.id)).map(m=><MasterCard key={m.id} master={m} favorite onFavorite={()=>toggleFavorite(m.id)} onOpen={()=>setSelected(m)}/>)}</div>{!mastersLoading&&!favorites.length&&<div className="empty-state tall"><Heart size={34}/><b>Здесь пока пусто</b><span>Сохраняй мастеров, которые понравились</span><button className="primary-button" onClick={()=>setActive('catalog')}>Открыть каталог</button></div>}</main></>
  else if(active==='admin' && userRole==='admin') content=<AdminPanel supabase={supabase} currentUserId={user?.id}/>
  else if(['profile','master-inbox','master-bookings'].includes(active) && (userRole==='master' || (userRole==='admin' && viewMode==='master'))) content=<MasterWorkspace supabase={supabase} user={user} isAdmin={userRole==='admin'} viewMode={viewMode} setViewMode={setViewMode} activeTab={active} onOpenRegistration={()=>setRegistrationOpen(true)} onBackToMenu={()=>setActive('home')} onNavigate={setActive}/>
  else content=<ProfilePage supabase={supabase} isMaster={userRole==='master'} isAdmin={userRole==='admin'} viewMode={viewMode} setViewMode={setViewMode} connectionStatus={connectionStatus} user={user} authLoading={authLoading} onLogin={loginWithTelegram} onSignOut={signOut} authError={authError} onStartRegistration={startMasterRegistration} registrationStatus={registrationStatus}/>
  return <div className="app-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="app-inner"><RenderErrorBoundary key={active}>{content}</RenderErrorBoundary>{!selected&&!bookingMaster&&!(active==='home'&&introVisible)&&<BottomNav active={active} setActive={setActive} isAdmin={userRole==='admin'} isMaster={userRole==='master' || (userRole==='admin' && viewMode==='master')}/>}</div>{registrationOpen && <MasterRegistration onClose={()=>setRegistrationOpen(false)} onSubmit={submitMasterRegistration}/>}</div>
}