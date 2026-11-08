import { ChartNoAxesCombined, Component, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { Users, Building2, Home, Search, CalendarDays, Heart, UserRound, MapPin, Star, Clock3, ArrowLeft, SlidersHorizontal, ChevronRight, Bell, Plus, Check, X, Camera, LogOut, Menu, Sparkles, MessageCircle, BriefcaseBusiness, ClipboardList, Send, Upload, ContactRound, Inbox, CalendarCheck2, PenTool, Hand, Eye, CircleDot, Brush } from 'lucide-react'
import { masters, styleGroups, workImage } from './data'
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
const telegramProfileUrl = value => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const username = raw.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, '').replace(/^(t\.me|telegram\.me)\//i, '').replace(/^@/, '').split(/[/?#]/)[0]
  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) return ''
  return 'https://t.me/' + username
}
const telegramUsername = value => { const url = telegramProfileUrl(value); return url ? url.slice('https://t.me/'.length) : '' }
const openTelegramLink = event => {
  const telegram = window.Telegram?.WebApp
  if (telegram?.openTelegramLink) {
    event.preventDefault()
    telegram.openTelegramLink(event.currentTarget.href)
  }
}
const categories = [
  { id: 'tattoo', title: 'Тату', subtitle: 'Эскизы и татуировки' },
  { id: 'nails', title: 'Ногти', subtitle: 'Маникюр и педикюр' },
  { id: 'brows', title: 'Брови и ресницы', subtitle: 'Форма, окрашивание, ламинирование' },
  { id: 'piercing', title: 'Пирсинг', subtitle: 'Украшения и проколы' },
  { id: 'makeup', title: 'Макияж', subtitle: 'Образы на каждый день и события' }
]
const categoryLabels = Object.fromEntries(categories.map(item => [item.id, item.title]))
const russianCities = ['Калининград','Москва','Санкт-Петербург','Новосибирск','Екатеринбург','Казань','Нижний Новгород','Красноярск','Челябинск','Самара','Уфа','Ростов-на-Дону','Краснодар','Омск','Воронеж','Пермь','Волгоград','Саратов','Тюмень','Тольятти','Ижевск','Барнаул','Иркутск','Хабаровск','Владивосток','Ярославль','Махачкала','Томск','Оренбург','Кемерово','Новокузнецк','Рязань','Астрахань','Пенза','Липецк','Киров','Чебоксары','Калуга','Тула','Сочи','Ставрополь','Белгород','Курск','Сургут','Ульяновск','Брянск','Вологда','Череповец','Другой город']
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
      <div className="master-meta"><span className="rating">{master.reviews>0?<><Star size={14} fill="currentColor" /> {master.rating.toFixed(1)} <span>({master.reviews})</span></>:'Новый мастер'}</span>{master.studioName && <span className="studio-inline-label"><Building2 size={12}/>{master.studioName}</span>}</div>
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

function BottomNav({ active, setActive, isAdmin, isMaster, hasStudio }) {
  const masterTabs = [
    { id: 'profile', label: 'Кабинет', icon: ContactRound },
    { id: 'master-inbox', label: 'Заявки', icon: Inbox },
    { id: 'master-bookings', label: 'Записи', icon: CalendarCheck2 },
    { id: 'master-stats', label: 'Статистика', icon: ChartNoAxesCombined },
    ...(hasStudio ? [{ id: 'studio', label: 'Студия', icon: Building2 }] : []),
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
  return <Icon className="category-theme-icon" size={23} strokeWidth={1.65} aria-hidden="true" />
}

function HomePage({ introVisible, onSelectCategory, city, onCityChange }) {
  if (introVisible) return <main className="page-content home-page home-redesign">
    <section className="home-intro home-intro-only"><h1>Выбери своего мастера</h1></section>
  </main>
  return <main className="page-content home-page category-home">
    <div className="category-heading"><div className="category-heading-top"><span className="eyebrow">MASTER HUB · РОССИЯ</span><label className="city-picker"><MapPin size={14}/><select aria-label="Выбрать город" value={city} onChange={e=>onCityChange(e.target.value)}>{russianCities.map(name=><option key={name} value={name}>{name}</option>)}</select></label></div><h1>Выбери направление</h1><p>Сначала услуга — затем подходящий мастер.</p></div>
    <div className="category-list">{categories.map(item => <button className="category-choice" key={item.id} onClick={() => onSelectCategory(item.id)}>
      <span className="category-copy"><b>{item.title}</b><small>{item.subtitle}</small></span><span className="category-art"><CategoryIcon type={item.id}/></span><ChevronRight size={19}/>
    </button>)}</div>
  </main>
}

function CatalogPage({ openMaster, favorites, toggleFavorite, mastersList, category, city, onBack, loading }) {
  const [query, setQuery] = useState('')
  const [selectedStyles, setSelectedStyles] = useState([])
  const [styleSearch, setStyleSearch] = useState('')
  const [stylesOpen, setStylesOpen] = useState(false)
  const [sort, setSort] = useState('month')
  const filtered = useMemo(() => mastersList.filter(m => m.category === category && (m.city || 'Калининград') === city && (m.name + m.studio + (m.studioName||'') + m.styles.join(' ')).toLowerCase().includes(query.toLowerCase()) && (category !== 'tattoo' || selectedStyles.length === 0 || selectedStyles.some(style => m.styles.includes(style)))).sort((a,b)=>{
    if(sort==='price') return a.price-b.price
    if(sort==='rating') return b.rating-a.rating || b.reviews-a.reviews
    if(sort==='reviews') return b.reviews-a.reviews || b.rating-a.rating
    if(sort==='week') return b.sessionsWeek-a.sessionsWeek || b.rating-a.rating
    return b.sessionsMonth-a.sessionsMonth || b.rating-a.rating
  }), [mastersList, category, city, query, selectedStyles, sort])
  const categoryName = categoryLabels[category] || 'Услуги'
  return <><Header title={`Мастера · ${categoryName}`} subtitle={city.toUpperCase()} back={onBack}/>
    <main className="page-content"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Имя мастера или стиль..."/>{query && <button onClick={()=>setQuery('')}><X size={16}/></button>}</div>
      <div className="filter-head"><span>{filtered.length} мастера</span><label><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="month">Популярные · 30 дней</option><option value="week">Популярные · 7 дней</option><option value="rating">Выше средняя оценка</option><option value="reviews">Больше отзывов</option><option value="price">Сначала дешевле</option></select></label></div>
      {category === 'tattoo' && <section className="tattoo-style-filter">
        <button type="button" className="tattoo-style-filter-toggle" onClick={()=>setStylesOpen(v=>!v)}><span><b>Стиль татуировки</b><small>{selectedStyles.length?selectedStyles.length+' выбрано':'Все направления'}</small></span><span className="tattoo-style-filter-action">{stylesOpen?'Свернуть':'Выбрать'} <ChevronRight size={16}/></span></button>
        {stylesOpen&&<div className="tattoo-style-filter-body">
          <div className="tattoo-style-search"><Search size={15}/><input value={styleSearch} onChange={e=>setStyleSearch(e.target.value)} placeholder="Найти стиль…"/>{styleSearch&&<button type="button" onClick={()=>setStyleSearch('')}><X size={14}/></button>}</div>
          {selectedStyles.length>0&&<button type="button" className="tattoo-style-clear" onClick={()=>setSelectedStyles([])}>Сбросить выбранные</button>}
          {styleGroups.map(group=>{const visible=group.styles.filter(name=>name.toLowerCase().includes(styleSearch.toLowerCase()));return visible.length>0?<div className="tattoo-style-group" key={group.title}><b>{group.title}</b><div className="tattoo-style-chips">{visible.map(name=><button type="button" key={name} className={selectedStyles.includes(name)?'selected':''} onClick={()=>setSelectedStyles(old=>old.includes(name)?old.filter(item=>item!==name):[...old,name])}>{name}</button>)}</div></div>:null})}
          {!styleGroups.some(group=>group.styles.some(name=>name.toLowerCase().includes(styleSearch.toLowerCase())))&&<small className="tattoo-style-no-results">Ничего не найдено.</small>}
        </div>}
      </section>}
      <div className="master-list catalog-list">{loading ? <MasterCardSkeleton count={3}/> : <>{filtered.map(m=><MasterCard key={m.id} master={m} favorite={favorites.includes(m.id)} onFavorite={()=>toggleFavorite(m.id)} onOpen={()=>openMaster(m)}/>) }{!filtered.length&&<div className="empty-state"><Search size={30}/><b>Пока нет мастеров</b><span>В этой категории ещё нет опубликованных анкет. Загляни позже.</span></div>}</>}</div>
    </main></>
}

function getMasterAnalyticsVisitorId() {
  try {
    let id=window.localStorage.getItem('masterhub_analytics_visitor')
    if(!id){id=crypto.randomUUID();window.localStorage.setItem('masterhub_analytics_visitor',id)}
    return id
  } catch { return crypto.randomUUID() }
}

function MasterDetail({ master, supabase, onBack, favorite, toggleFavorite, onBook, onOpenStudio }) {
  const [tab, setTab] = useState('works')
  const categoryTitle = ({tattoo:'татуировок',nails:'ногтей и педикюра',brows:'бровей и ресниц',piercing:'пирсинга',makeup:'макияжа'})[master.category] || 'услуг'
  const [lightbox, setLightbox] = useState('')
  const [flashFilter, setFlashFilter] = useState('all')
  useEffect(()=>{
    if(!supabase||!master?.id)return
    supabase.rpc('track_master_profile_event',{p_master_id:master.id,p_event_type:'profile_view',p_visitor_id:getMasterAnalyticsVisitorId()})
      .then(({error})=>{if(error)console.warn('MASTER HUB profile analytics:',error.message)})
  },[supabase,master?.id])
  const trackBookingClick=()=>{
    if(!supabase||!master?.id)return
    supabase.rpc('track_master_profile_event',{p_master_id:master.id,p_event_type:'booking_click',p_visitor_id:getMasterAnalyticsVisitorId()})
      .then(({error})=>{if(error)console.warn('MASTER HUB booking analytics:',error.message)})
  }
  return <><Header title="Профиль мастера" back={onBack} action={<button className={favorite?'icon-button is-favorite':'icon-button'} onClick={toggleFavorite}><Heart size={20} fill={favorite?'currentColor':'none'}/></button>}/>
    <main className="page-content detail-page"><div className="detail-cover" style={{backgroundImage:`url(${master.image})`}}/><div className="detail-identity"><div><span className="eyebrow">{master.studioName || master.studio}</span><h1>{master.name}</h1><div className="master-meta"><span className="rating">{master.reviews>0?<><Star size={14} fill="currentColor"/> {master.rating.toFixed(1)} ({master.reviews} отзывов)</>:'Новый мастер · отзывов пока нет'}</span></div></div><div className="avatar-placeholder">{master.name.split(' ').map(x=>x[0]).join('')}</div></div>
      {master.studioId&&<button type="button" className="master-studio-link" onClick={()=>onOpenStudio?.(master)}><span className="master-studio-link-icon"><Building2 size={18}/></span><span><small>МАСТЕР В КОМАНДЕ</small><b>{master.studioName||master.studio}</b><em>Открыть страницу студии</em></span><ChevronRight size={18}/></button>}
      <div className="detail-facts"><div><small>ОПЫТ</small><b>{master.experience}</b></div><div><small>СТАРТ ОТ</small><b>{master.price>0?money(master.price):'По запросу'}</b></div><div><small>ГОРОД</small><b>{master.city||'Калининград'}</b></div></div>
      <p className="detail-about">{master.about}</p><div className="tag-row detail-tags">{master.styles.map(s=><span className="style-tag" key={s}>{s}</span>)}</div>
      <div className="detail-tabs"><button className={tab==='works'?'selected':''} onClick={()=>setTab('works')}>Портфолио</button><button className={tab==='services'?'selected':''} onClick={()=>setTab('services')}>Услуги и цены</button><button className={tab==='reviews'?'selected':''} onClick={()=>setTab('reviews')}>Отзывы · {master.reviews}</button><button className={tab==='info'?'selected':''} onClick={()=>setTab('info')}>О мастере</button></div>
      {tab==='works'&&<><section className="public-flash-section"><div className="portfolio-intro"><span>FLASH-КАТАЛОГ</span><b>{(master.workItems||[]).filter(w=>w.item_type==='flash').length} эскизов</b></div><div className="flash-filter-row"><button className={flashFilter==='all'?'selected':''} onClick={()=>setFlashFilter('all')}>Все</button><button className={flashFilter==='available'?'selected':''} onClick={()=>setFlashFilter('available')}>Свободные</button><button className={flashFilter==='claimed'?'selected':''} onClick={()=>setFlashFilter('claimed')}>Уже забрали</button></div><div className="work-grid">{(master.workItems||[]).filter(w=>w.item_type==='flash'&&(flashFilter==='all'||w.flash_status===flashFilter)).map(w=><button type="button" className="portfolio-work flash-work-card" key={w.id} onClick={()=>setLightbox(w.image_path)}><img src={w.image_path} alt={w.caption||'Flash-эскиз'} loading="lazy"/><span className={'flash-work-status '+(w.flash_status==='claimed'?'claimed':'')}>{w.flash_status==='claimed'?'Уже забрали':'Свободен'}</span>{w.caption&&<span>{w.caption}</span>}{w.price!==null&&w.price!==undefined&&<b>{Number(w.price)>0?money(w.price):'Цена по запросу'}</b>}</button>)}</div>{!(master.workItems||[]).some(w=>w.item_type==='flash')&&<p className="muted-note">Мастер пока не добавил эскизы во Flash-каталог.</p>}</section><section className="public-portfolio-section"><div className="portfolio-intro"><span>ПРИМЕРЫ РАБОТ · {categoryTitle.toUpperCase()}</span><b>{(master.workItems||[]).filter(w=>w.item_type!=='flash').length} фото</b></div>{(()=>{const items=(master.workItems||[]).filter(w=>w.item_type!=='flash');const groups=items.reduce((acc,w)=>{const key=w.pair_id||w.id;(acc[key] ||= []).push(w);return acc},{});return Object.entries(groups).map(([key,group])=><article className="portfolio-story" key={key}>{group.length>1&&<b className="portfolio-story-title">Одна работа · этапы</b>}<div className="work-grid">{group.map(w=><button type="button" className="portfolio-work" key={w.id} onClick={()=>setLightbox(w.image_path)}><img src={w.image_path} alt={w.caption||'Работа мастера'} loading="lazy"/><span className="portfolio-stage-label">{({sketch:'Эскиз',fresh:'Свежая татуировка',healed:'Зажившая татуировка'})[w.work_stage]||'Работа'}</span>{w.caption&&<span>{w.caption}</span>}</button>)}</div></article>)})()}{!(master.workItems||[]).some(w=>w.item_type!=='flash')&&<div className="empty-state">Мастер скоро добавит свои работы.</div>}</section></>}
      {tab==='services'&&<div className="service-list">{master.services?.length ? master.services.map(service=><div key={service.id}><span>{service.title}{service.description&&<small>{service.description}</small>}</span><b>{money(service.price_from)}</b></div>) : <><div><span>Стоимость услуг</span><b>{master.price>0?'от '+money(master.price):'Цена по запросу'}</b></div><small>Мастер ещё не добавил подробный прайс. Уточни стоимость при записи.</small></>}</div>}
      {tab==='reviews'&&<div className="master-reviews-list">{master.reviewItems?.length?master.reviewItems.map(review=><article className="master-review-card" key={review.id}><div><b>Клиент</b><span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div><small>{new Date(review.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</small>{review.body&&<p>{review.body}</p>}</article>):<div className="empty-state">Пока нет отзывов. После первого визита клиент сможет оставить оценку.</div>}</div>}
      {tab==='info'&&<div className="info-panel"><p>{master.about}</p><p><MapPin size={15}/> {master.city||'Калининград'} · адрес студии уточняется при записи</p><p><MessageCircle size={15}/> {master.handle?telegramProfileUrl(master.handle)?<a href={telegramProfileUrl(master.handle)} onClick={openTelegramLink} target="_blank" rel="noopener noreferrer">{master.handle}</a>:master.handle:'Telegram не указан'}</p></div>}
      <button className="primary-button booking-cta" onClick={()=>{trackBookingClick();onBook()}}>Записаться к мастеру <ChevronRight size={17}/></button>
      {lightbox&&<div className="modal-backdrop portfolio-lightbox" onClick={()=>setLightbox('')}><button type="button" className="modal-close" onClick={()=>setLightbox('')}><X size={22}/></button><img src={lightbox} alt="Работа мастера" onClick={e=>e.stopPropagation()}/></div>}
    </main>
  </>

}

function PublicStudioPage({ supabase, studioId, onBack, onOpenMaster }) {
  const [studio,setStudio]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    let live=true
    async function load(){
      if(!supabase||!studioId){setLoading(false);return}
      setLoading(true);setError('')
      const {data,error}=await supabase.rpc('get_public_studio_profile',{p_studio_id:studioId})
      if(!live)return
      if(error){setError(error.message||'Не удалось загрузить студию.');setStudio(null)}
      else setStudio(data||null)
      setLoading(false)
    }
    load()
    return()=>{live=false}
  },[supabase,studioId])
  const labels={tattoo:'Тату',piercing:'Пирсинг',nails:'Маникюр и ногти',brows:'Брови и ресницы',makeup:'Макияж'}
  return <><Header title="Студия" subtitle="ПРОСТРАНСТВО КОМАНДЫ" back={onBack}/>
    <main className="page-content public-studio-page">
      {loading?<div className="empty-state"><Building2 size={28}/><b>Загружаем студию…</b></div>
      :error?<div className="empty-state"><b>Не удалось открыть студию</b><span>{error}</span></div>
      :!studio?<div className="empty-state"><Building2 size={28}/><b>Студия не найдена</b><span>Возможно, она больше не опубликована.</span></div>
      :<>
        <section className="public-studio-hero" style={studio.cover_image_url?{backgroundImage:`linear-gradient(180deg,rgba(8,8,8,.42),rgba(8,8,8,.94)),url(${studio.cover_image_url})`}:undefined}>
          <div className="public-studio-brand-row"><div className="public-studio-emblem">{studio.logo_image_url?<img src={studio.logo_image_url} alt={`Логотип ${studio.name}`}/>:<Building2 size={27}/>}</div><span className="eyebrow">MASTER HUB · STUDIO</span></div>
          <h1>{studio.name}</h1>
          <p><MapPin size={14}/>{[studio.city,studio.address].filter(Boolean).join(' · ')}</p>
          <div className="public-studio-categories">{(studio.categories||[]).map(id=><span key={id}>{labels[id]||id}</span>)}</div>
          {studio.description&&<div className="public-studio-description">{studio.description}</div>}
          <div className="public-studio-count"><Users size={16}/><b>{(studio.members||[]).length}</b> {(studio.members||[]).length===1?'мастер в команде':'мастеров в команде'}</div>
        </section>
        <section className="public-studio-team">
          <div className="public-studio-section-head"><div><span className="eyebrow">THE PEOPLE</span><h2>Команда студии</h2></div><span>{(studio.members||[]).length} мастеров</span></div>
          {(studio.members||[]).length?<div className="public-studio-member-list">{studio.members.map(member=><button type="button" className="public-studio-member" key={member.id} onClick={()=>onOpenMaster(member.id)}>
            <span className="public-studio-member-avatar">{member.cover_image_url?<img src={member.cover_image_url} alt=""/>:<UserRound size={22}/>}</span>
            <span className="public-studio-member-copy"><b>{member.name}</b><small>{labels[member.category]||member.category} · {member.experience_years?member.experience_years+' лет опыта':'Опыт не указан'}</small><span className="public-studio-member-tags">{(member.styles||[]).slice(0,3).map(style=><i key={style}>{style}</i>)}</span></span>
            <span className="public-studio-member-rating">{Number(member.rating)>0?<><Star size={13} fill="currentColor"/>{Number(member.rating).toFixed(1)}<small>({member.reviews_count||0})</small></>:'Новый' }<ChevronRight size={16}/></span>
          </button>)}</div>:<div className="empty-state">В студии пока нет опубликованных мастеров.</div>}
        </section>
      </>}
    </main>
  </>
}

function BookingPage({ master, onBack, onConfirm, saving, supabase, user }) {
  const [slots,setSlots]=useState([])
  const [busy,setBusy]=useState([])
  const [selectedDate,setSelectedDate]=useState('')
  const [selectedSlot,setSelectedSlot]=useState(null)
  const [selectedService,setSelectedService]=useState(master.services?.[0]?.id||'')
  const chosenService=master.services?.find(service=>service.id===selectedService)||null
  const taskPlaceholder = ({tattoo:'Размер, место, идея, пожелания мастеру…',nails:'Процедура, форма, длина, дизайн…',brows:'Желаемая форма, эффект, пожелания…',piercing:'Место прокола, украшение, пожелания…',makeup:'Образ, повод, стиль и пожелания…'})[master.category] || 'Опиши, что хочешь сделать…'
  const [clientNote,setClientNote]=useState('')
  const [reference,setReference]=useState(null)
  const [clientTelegram,setClientTelegram]=useState(()=>window.Telegram?.WebApp?.initDataUnsafe?.user?.username||'')
  const [uploading,setUploading]=useState(false)
  const [error,setError]=useState('')
  const [contactNotice,setContactNotice]=useState('')
  const [month,setMonth]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const telegramContact=useMemo(()=>telegramProfileUrl(master.handle),[master.handle])
  const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const days=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1))},[month])
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;const today=dateKey(new Date());const limit=new Date();limit.setDate(limit.getDate()+60);const [slotResult,busyResult]=await Promise.all([supabase.from('master_time_slots').select('*').eq('master_id',master.id).gte('slot_date',today).lte('slot_date',dateKey(limit)).order('slot_date').order('starts_at'),supabase.rpc('get_master_studio_busy_times_public',{p_master_id:master.id,p_from:today,p_to:dateKey(limit)})]);if(live){setSlots(slotResult.data||[]);setBusy(busyResult.data||[]);if(slotResult.error)setError(slotResult.error.message);if(busyResult.error)console.warn('Studio busy-time lookup:',busyResult.error.message);if(!selectedDate){const firstFree=(slotResult.data||[]).find(slot=>slot.is_active&&new Date(slot.starts_at)>new Date()&&!(busyResult.data||[]).some(item=>new Date(item.starts_at)<new Date(slot.ends_at)&&new Date(item.ends_at)>new Date(slot.starts_at)));if(firstFree){setSelectedDate(firstFree.slot_date);setMonth(new Date(firstFree.slot_date+'T12:00:00'))}}}}load();return()=>{live=false}},[supabase,master.id])
  const slotsFor=key=>slots.filter(s=>s.slot_date===key)
  const busyFor=key=>busy.filter(item=>dateKey(new Date(item.starts_at))===key)
  const freeFor=key=>slotsFor(key).filter(s=>s.is_active&&new Date(s.starts_at)>new Date()&&!busy.some(item=>new Date(item.starts_at)<new Date(s.ends_at)&&new Date(item.ends_at)>new Date(s.starts_at)))
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
    const {data,error}=await supabase.storage.from('masterhub-references').upload(path,reference,{contentType:reference.type,upsert:false})
    if(error)throw error
    return data.path
  }
  const submit=async()=>{
    if(!selectedSlot){setError('Сначала выбери свободный интервал.');return}
    setError('')
    try{setUploading(true);const referenceImageUrl=await uploadReference();setUploading(false);await onConfirm({master,slotId:selectedSlot.id,startsAt:selectedSlot.starts_at,endsAt:selectedSlot.ends_at,serviceId:selectedService||null,clientNote:clientNote.trim(),referenceImageUrl,clientTelegram:telegramUsername(clientTelegram)||''})}catch(e){setUploading(false);setError(e.message||'Не удалось загрузить фотографию.')}
  }
  return <><Header title="Онлайн-запись" back={onBack}/><main className="page-content booking-page">
    <div className="booking-master">{master.image&&<img src={master.image} alt=""/>}<div><b>{master.name}</b><small>{master.studio}</small></div></div>
    <section className="booking-contact-card"><div><span className="eyebrow">ЕСТЬ ВОПРОСЫ?</span><b>Свяжись с мастером напрямую</b><small>Можно уточнить детали услуги до отправки заявки.</small></div>{telegramContact?<a href={telegramContact} onClick={openTelegramLink} target="_blank" rel="noopener noreferrer" className="telegram-contact-button"><Send size={16}/> Написать в Telegram</a>:<button type="button" className="telegram-contact-button" onClick={()=>setContactNotice('У мастера не указан Telegram username. Написать ему напрямую через Telegram пока нельзя.')}><Send size={16}/> Написать в Telegram</button>}{contactNotice&&<p className="contact-unavailable">{contactNotice}</p>}</section>
    <span className="eyebrow">ШАГ 1 · УСЛУГА И ДЕТАЛИ</span>
    {master.services?.length>0&&<label className="booking-service-field">ВЫБЕРИ УСЛУГУ<select value={selectedService} onChange={e=>setSelectedService(e.target.value)}>{master.services.map(service=><option key={service.id} value={service.id}>{service.title} · {Number(service.price_from)>0?money(service.price_from):'цена по запросу'}</option>)}</select></label>}
    <label className="booking-note-field">ЧТО ХОЧЕШЬ СДЕЛАТЬ?<textarea value={clientNote} onChange={e=>setClientNote(e.target.value.slice(0,300))} placeholder={taskPlaceholder} maxLength={300}/></label>
    <span className="eyebrow">ШАГ 2 · ФОТО / ПРИМЕР</span>
    <label className="upload-control booking-reference"><Upload size={16}/>{reference?reference.name:'Прикрепить фото или пример'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0]||null;if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){setError(file.size>5*1024*1024?'Максимальный размер референса — 5 МБ.':'Поддерживаются только JPG, PNG и WebP.');e.target.value='';setReference(null);return}setError('');setReference(file)}}/></label>
    {reference&&<p className="muted-note">Фото будет прикреплено к заявке мастеру.</p>}
    <label className="client-telegram-field">ТВОЙ TELEGRAM ДЛЯ СВЯЗИ<input value={clientTelegram} onChange={e=>setClientTelegram(e.target.value.slice(0,32))} placeholder="@username" maxLength={32} autoCapitalize="none" autoCorrect="off"/><small>Мастер сможет написать тебе, чтобы уточнить детали записи.</small></label>
    <span className="eyebrow">ШАГ 3 · ВЫБЕРИ ДЕНЬ</span>
    <div className="calendar-month-head"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><b>{month.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</b><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div>
    <div className="calendar-weekdays">{['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map((x,i)=><span key={i}>{x}</span>)}</div>
    <div className="client-calendar-grid">{days.map((d,i)=>{const key=dateKey(d),same=d.getMonth()===month.getMonth(),past=new Date(key+'T23:59:59')<new Date(new Date().toDateString()),status=statusFor(key);return <button key={i} disabled={!same||past||!slotsFor(key).length||!freeFor(key).length} className={`calendar-day ${same?'':'outside'} ${selectedDate===key?'chosen':''} ${status}`} onClick={()=>chooseDate(key)}><span>{d.getDate()}</span>{status&&<i/>}</button>})}</div>
    <div className="calendar-legend"><span><i className="free"/> Свободно</span><span><i className="partial"/> Частично занято</span><span><i className="full"/> Нет мест</span></div>
    <span className="eyebrow">ШАГ 4 · СВОБОДНОЕ ВРЕМЯ</span>
    <div className="available-slot-list">{selectedDate?freeFor(selectedDate).map(slot=><button key={slot.id} className={selectedSlot?.id===slot.id?'time-slot selected':'time-slot'} onClick={()=>setSelectedSlot(slot)}>{new Date(slot.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} — {new Date(slot.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</button>):<p className="muted-note">Выбери день, отмеченный зелёным или жёлтым.</p>}{selectedDate&&!freeFor(selectedDate).length&&<p className="muted-note">На эту дату свободного времени нет.</p>}{selectedDate&&busyFor(selectedDate).length>0&&<p className="muted-note">Часть времени уже занята в студии другими мастерами — эти интервалы скрыты.</p>}</div>
    <div className="booking-summary"><span>Услуга</span><b>{chosenService?.title||'Уточним с мастером'} · {chosenService?(Number(chosenService.price_from)>0?money(chosenService.price_from):'цена по запросу'):(master.price>0?money(master.price):'цена по запросу')}</b></div>
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
  const [contactNotice,setContactNotice]=useState('')
  useEffect(()=>{let live=true;const load=async()=>{if(!supabase||!user){setBookings([]);setLoading(false);return}const [bookingResult,reviewResult]=await Promise.all([supabase.from('bookings').select('*,masters(public_name,studio_name,contact_telegram)').eq('client_id',user.id).order('starts_at',{ascending:true}),supabase.from('reviews').select('booking_id').eq('client_id',user.id)]);const serviceIds=[...new Set((bookingResult.data||[]).map(booking=>booking.service_id).filter(Boolean))];const serviceResult=serviceIds.length?await supabase.from('services').select('id,title,price_from').in('id',serviceIds):{data:[]};const serviceById=new Map((serviceResult.data||[]).map(service=>[service.id,service]));if(live){const bookingRows=await Promise.all((bookingResult.data||[]).map(async booking=>{const service=serviceById.get(booking.service_id)||null;const raw=booking.reference_image_url;if(!raw)return {...booking,service};if(raw.startsWith('https://')||raw.startsWith('http://'))return {...booking,service,referenceImageSignedUrl:raw};const {data:signed}=await supabase.storage.from('masterhub-references').createSignedUrl(raw,3600);return {...booking,service,referenceImageSignedUrl:signed?.signedUrl||''}}));setBookings(bookingRows);setReviewed((reviewResult.data||[]).map(x=>x.booking_id));if(bookingResult.error)setError(bookingResult.error.message)}setLoading(false)};load();if(!supabase||!user)return()=>{live=false};const channel=supabase.channel('client-bookings-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings',filter:'client_id=eq.'+user.id},()=>load()).subscribe();return()=>{live=false;supabase.removeChannel(channel)}},[supabase,user])
  const respondToPrice=async(booking,accept)=>{
    setSavingId(booking.id);setError('')
    const {data,error}=await supabase.from('bookings').update({status:accept?'confirmed':'declined'}).eq('id',booking.id).eq('status','price_proposed').select('id,status').maybeSingle()
    setSavingId('')
    if(error){setError(error.message);return}
    if(!data){setError('Предложение уже изменилось. Обнови список записей.');return}
    setBookings(old=>old.map(x=>x.id===booking.id?{...x,status:data.status}:x))
  }
  const sendReview=async booking=>{if(savingId===booking.id)return;const body=(reviewText[booking.id]||'').trim();setSavingId(booking.id);setError('');const {error}=await supabase.from('reviews').insert({booking_id:booking.id,client_id:user.id,master_id:booking.master_id,rating:reviewStars[booking.id]||5,body});setSavingId('');if(error){setError(error.code==='23505'?'Отзыв для этой записи уже существует.':error.message);if(error.code==='23505')setReviewed(old=>[...old,booking.id]);return}setReviewed(old=>[...old,booking.id]);setReviewText(old=>({...old,[booking.id]:''}))}
  return <><Header title="Мои записи" subtitle="ВАШИ ВСТРЕЧИ"/><main className="page-content">{loading?<div className="empty-state">Загружаем записи…</div>:bookings.length?bookings.map(b=><article className={'booking-card booking-card-expanded client-booking-card client-booking-'+b.status} key={b.id}>
<div className="client-booking-top"><span className="client-booking-kicker">МОЯ ЗАПИСЬ</span><span className={'client-booking-status '+b.status}><i/>{b.status==='pending'?'Ожидает ответа':b.status==='price_proposed'?'Подтверди стоимость':b.status==='confirmed'?'Подтверждена':b.status==='cancelled'?'Отменена':b.status==='declined'?'Отклонена':b.status==='completed'?'Завершена':b.status}</span></div>
<h3>{b.masters?.public_name||'Мастер'}</h3>{b.service&&<div className="client-booking-service"><span>{b.service.title}</span><b>{Number(b.service.price_from)>0?money(b.service.price_from):'Цена по запросу'}</b></div>}<p className="client-booking-note">{b.client_note||'Индивидуальная услуга'}</p>
<div className="client-booking-datetime"><CalendarDays size={17}/><span><b>{new Date(b.starts_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</b><small>{new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small></span></div>{telegramProfileUrl(b.masters?.contact_telegram)?<a className="telegram-contact-button client-telegram-chat" href={telegramProfileUrl(b.masters?.contact_telegram)} onClick={openTelegramLink} target="_blank" rel="noopener noreferrer"><Send size={15}/> Обсудить услугу в Telegram</a>:<button type="button" className="telegram-contact-button client-telegram-chat" onClick={()=>setContactNotice('У мастера не указан Telegram username. Связаться с ним напрямую через Telegram пока нельзя.')}><Send size={15}/> Обсудить услугу в Telegram</button>}{contactNotice&&<p className="contact-unavailable">{contactNotice}</p>}{b.reference_image_url&&<a className="client-reference-link" href={b.referenceImageSignedUrl||b.reference_image_url} target="_blank" rel="noopener noreferrer">Открыть мой референс</a>}{b.status==='price_proposed'&&<div className="client-price-offer"><span>ПРЕДЛОЖЕНИЕ МАСТЕРА</span><strong>{new Intl.NumberFormat('ru-RU').format(Number(b.proposed_price||0))} ₽</strong>{b.master_message&&<p>{b.master_message}</p>}<div><button className="approve-button" disabled={savingId===b.id} onClick={()=>respondToPrice(b,true)}>{savingId===b.id?'Отправляем…':'Подтвердить стоимость'}</button><button className="reject-button" disabled={savingId===b.id} onClick={()=>respondToPrice(b,false)}>Отказаться</button></div></div>}{b.status==='confirmed'&&b.proposed_price&&<p className="muted-note">Подтверждённая стоимость: <b>{new Intl.NumberFormat('ru-RU').format(Number(b.proposed_price))} ₽</b></p>}{b.status==='completed'&&!reviewed.includes(b.id)&&<div className="review-editor"><b>Оценить услугу</b><div className="review-star-picker">{[1,2,3,4,5].map(n=><button type="button" key={n} className={(reviewStars[b.id]||5)>=n?'active':''} onClick={()=>setReviewStars(old=>({...old,[b.id]:n}))} aria-label={n+' из 5'}>★</button>)}</div><textarea maxLength={1000} value={reviewText[b.id]||''} onChange={e=>setReviewText(old=>({...old,[b.id]:e.target.value}))} placeholder="Расскажи, как всё прошло (необязательно)"/><button className="primary-button" disabled={savingId===b.id} onClick={()=>sendReview(b)}>{savingId===b.id?'Отправляем…':'Отправить отзыв'}</button></div>}{reviewed.includes(b.id)&&<p className="muted-note">Отзыв отправлен. Спасибо!</p>}</article>):<div className="empty-state tall"><CalendarDays size={34}/><b>Пока нет записей</b><span>Выбери мастера и забронируй удобное время</span></div>}{error&&<p className="auth-error">{error}</p>}</main></>
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
  return <><Header title="Профиль" subtitle="ТВОЙ MASTER HUB"/><main className="page-content profile-page">{isAdmin && <section className="role-preview-switch"><span className="eyebrow">РЕЖИМ ПРОСМОТРА · ТОЛЬКО ВЛАДЕЛЕЦ</span><div><button className={viewMode==='client'?'selected':''} onClick={()=>setViewMode('client')}><UserRound size={16}/> Я клиент</button><button className={viewMode==='master'?'selected':''} onClick={()=>setViewMode('master')}><BriefcaseBusiness size={16}/> Я мастер</button></div><small>Реальные права администратора сохраняются.</small></section>}<div className="profile-card"><div className="profile-avatar">{profileAvatar && !avatarFailed ? <img src={profileAvatar} alt="Аватар Telegram" referrerPolicy="no-referrer" onError={()=>setAvatarFailed(true)}/> : profileInitial}</div><div><h2>{user ? (user.user_metadata?.first_name || user.user_metadata?.full_name || 'Пользователь Telegram') : 'Гость MASTER HUB'}</h2><span>{user ? (isAdmin ? 'Владелец приложения' : isMaster ? 'Кабинет мастера' : 'Клиентский аккаунт') : 'Подключение Telegram'}</span></div></div>
    {!isMaster && !isAdmin && <button className="profile-register-master" onClick={onStartRegistration}><BriefcaseBusiness size={19}/><span><b>Стать мастером</b><small>Создать профиль, добавить работы и принимать записи</small></span><ChevronRight size={18}/></button>}
    {isMaster && <div className="profile-register-master master-active"><BriefcaseBusiness size={19}/><span><b>Профиль мастера</b><small>Твоя анкета отправлена или уже опубликована</small></span><ChevronRight size={18}/></div>}
    {isAdmin && <button className="profile-register-master master-active" onClick={()=>setViewMode('master')}><BriefcaseBusiness size={19}/><span><b>Открыть кабинет мастера</b><small>Портфолио, услуги, расписание и записи</small></span><ChevronRight size={18}/></button>}{registrationStatus && <p className="muted-note">{registrationStatus}</p>}
    <div className="profile-menu profile-info-menu">
      <div><span className="menu-icon"><UserRound size={17}/></span><span><b>Данные Telegram</b><small>Имя и аватар привязаны к твоему аккаунту</small></span></div>
      <div><span className="menu-icon"><CalendarDays size={17}/></span><span><b>Записи и отзывы</b><small>История записей и отзывы доступны во вкладке «Записи»</small></span></div>
      <div><span className="menu-icon"><Bell size={17}/></span><span><b>Уведомления</b><small>Ответы мастеров и напоминания приходят в Telegram</small></span></div>
    </div>
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
  const [form, setForm] = useState({ category: 'tattoo', public_name: '', bio: '', studio_name: '', city: 'Калининград', contact_telegram: '', experience_years: '0' })
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
    <label>Город<select required value={form.city} onChange={e=>update('city',e.target.value)}>{russianCities.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
    <label>Telegram для связи<input value={form.contact_telegram} onChange={e=>update('contact_telegram',e.target.value)} placeholder="@username" maxLength={32}/></label>
    <label>Опыт, лет<input type="number" min="0" value={form.experience_years} onChange={e=>update('experience_years',e.target.value)}/></label>
    <button className="primary-button full-button" disabled={saving}>{saving ? 'Отправляем…' : 'Отправить на проверку'} <ChevronRight size={17}/></button>
  </form></div>
}

export default function App() {
  const [active,setActive]=useState('home')
  const [introVisible,setIntroVisible]=useState(true)
  const [selectedCategory,setSelectedCategory]=useState('tattoo')
  const [selectedCity,setSelectedCity]=useState('Калининград')
  const [selected,setSelected]=useState(null)
  const [bookingMaster,setBookingMaster]=useState(null)
  const [publicStudioId,setPublicStudioId]=useState(null)
  const [studioOriginMaster,setStudioOriginMaster]=useState(null)
  const [returnToStudio,setReturnToStudio]=useState(false)
  const [favorites,setFavorites]=useState([])
  const [bookings,setBookings]=useState([])
  const [user,setUser]=useState(null)
  const [authLoading,setAuthLoading]=useState(false)
  const [authError,setAuthError]=useState('')
  const [userRole,setUserRole]=useState('client')
  const [hasStudio,setHasStudio]=useState(false)
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
      if (!supabase || !user) { setUserRole('client'); setHasStudio(false); return }
      const [{ data: profile }, { data: ownMaster, error: masterError }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('masters').select('id').eq('user_id', user.id).limit(1).maybeSingle()
      ])
      if (!active) return
      if (profile?.role === 'admin') setUserRole('admin')
      else if (ownMaster && !masterError) setUserRole('master')
      else setUserRole('client')
      if (ownMaster && !masterError) {
        const { data: membership } = await supabase.from('studio_members').select('studio_id').eq('master_id', ownMaster.id).maybeSingle()
        if (active) setHasStudio(!!membership)
      } else setHasStudio(false)
    }
    loadRole()
    return () => { active = false }
  }, [user])
  useEffect(() => {
    if (!supabase || !user) return
    const refreshStudioMembership = async () => {
      const { data: ownMaster } = await supabase.from('masters').select('id').eq('user_id', user.id).limit(1).maybeSingle()
      if (!ownMaster) { setHasStudio(false); return }
      const { data: membership } = await supabase.from('studio_members').select('studio_id').eq('master_id', ownMaster.id).maybeSingle()
      setHasStudio(!!membership)
    }
    window.addEventListener('masterhub:studio-membership-changed', refreshStudioMembership)
    return () => window.removeEventListener('masterhub:studio-membership-changed', refreshStudioMembership)
  }, [supabase, user])
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
      city: form.city || 'Калининград',
      contact_telegram: telegramUsername(form.contact_telegram) || null,
      experience_years: Math.max(0, Number(form.experience_years || 0)),
      starting_price: 0,
      status: 'pending'
    }
    const { data: existing, error: lookupError } = await supabase.from('masters').select('id').eq('user_id', user.id).limit(1).maybeSingle()
    if (lookupError) { setRegistrationStatus(lookupError.message); return }
    const result = existing
      ? await supabase.from('masters').update(payload).eq('id', existing.id).select('id').single()
      : await supabase.from('masters').insert(payload).select('id').single()
    if (result.error) { setRegistrationStatus(result.error.message || 'Не удалось отправить анкету.'); return }
    if (!existing && result.data?.id) {
      const { error: notificationError } = await supabase.functions.invoke('notify-new-master', { body: { master_id: result.data.id } })
      if (notificationError) console.error('Admin notification delivery failed:', notificationError)
    }
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
          .select('id, slug, category, public_name, bio, studio_name, city, contact_telegram, experience_years, starting_price, rating, reviews_count, cover_image_url, master_styles(styles(name)), portfolio_items(id,image_path,caption,sort_order,item_type,work_stage,pair_id,flash_status,price), services(id,title,description,price_from,duration_minutes,is_active), reviews(id,rating,body,created_at), master_time_slots(slot_date,starts_at,is_active)')
          .eq('status', 'approved')
          .order('rating', { ascending: false })
        if (!live) return
        if (error) {
          setConnectionStatus('ошибка чтения базы')
          console.error('MASTER HUB Supabase:', error.message)
          return
        }
        const { data: catalogMeta, error: catalogMetaError } = await supabase.rpc('get_public_master_catalog_meta')
        if (catalogMetaError) console.warn('MASTER HUB catalog meta:', catalogMetaError.message)
        const catalogMetaByMasterId = new Map((catalogMeta || []).map(item => [item.master_id, item]))
        const liveMasters = (data || []).map(m => ({
          id: m.id,
          category: m.category || 'tattoo',
          name: m.public_name,
          handle: m.contact_telegram || '',
          studio: m.studio_name || 'Частный мастер',
          studioId: catalogMetaByMasterId.get(m.id)?.studio_id || null,
          studioName: catalogMetaByMasterId.get(m.id)?.studio_name || '',
          sessionsWeek: Number(catalogMetaByMasterId.get(m.id)?.sessions_week || 0),
          sessionsMonth: Number(catalogMetaByMasterId.get(m.id)?.sessions_month || 0),
          rating: (m.reviews||[]).length ? Number(((m.reviews||[]).reduce((sum,item)=>sum+Number(item.rating||0),0)/(m.reviews||[]).length).toFixed(1)) : Number(m.rating || 0),
          reviews: (m.reviews||[]).length || Number(m.reviews_count || 0),
          reviewItems: (m.reviews||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
          workCaptions: (m.portfolio_items||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(w=>w.caption||''),
          workItems: (m.portfolio_items||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)),
          slug: m.slug,
          price: (m.services || []).filter(service=>service.is_active).length ? Math.min(...(m.services || []).filter(service=>service.is_active).map(service=>Number(service.price_from)||0)) : Number(m.starting_price || 0),
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
  const openStudioFromMaster=master=>{setStudioOriginMaster(master);setPublicStudioId(master.studioId);setSelected(null);setReturnToStudio(false);setActive('public-studio')}
  const openStudioMember=masterId=>{const member=mastersList.find(item=>item.id===masterId);if(member){setReturnToStudio(true);setSelected(member)}}
  const openTeamMasterProfile=masterId=>{const member=mastersList.find(item=>item.id===masterId);if(!member){setAuthError('Публичный профиль этого мастера пока недоступен.');return}setReturnToStudio(false);setSelected(member)}
  const backFromStudio=()=>{if(studioOriginMaster){setSelected(studioOriginMaster);setStudioOriginMaster(null)}else setActive('catalog')}
  const confirmBooking=async data=>{if(!user||!supabase)throw new Error('Подключи Telegram, чтобы отправить заявку на запись.');setBookingSaving(true);try{const {error}=await supabase.from('bookings').insert({client_id:user.id,master_id:data.master.id,slot_id:data.slotId,service_id:data.serviceId||null,starts_at:data.startsAt,ends_at:data.endsAt,client_note:(data.clientNote||'Запись').slice(0,300),reference_image_url:data.referenceImageUrl||null,client_telegram:data.clientTelegram||null});if(error)throw error;setBookingMaster(null);setSelected(null);setActive('bookings')}finally{setBookingSaving(false)}}
  let content
  if(bookingMaster) content=<BookingPage master={bookingMaster} onBack={()=>setBookingMaster(null)} onConfirm={confirmBooking} saving={bookingSaving} supabase={supabase} user={user}/>
  else if(selected) content=<MasterDetail master={selected} supabase={supabase} onBack={()=>{setSelected(null);if(returnToStudio){setReturnToStudio(false);setActive('public-studio')}}} favorite={favorites.includes(selected.id)} toggleFavorite={()=>toggleFavorite(selected.id)} onBook={()=>setBookingMaster(selected)} onOpenStudio={openStudioFromMaster}/>
  else if(active==='public-studio') content=<PublicStudioPage supabase={supabase} studioId={publicStudioId} onBack={backFromStudio} onOpenMaster={openStudioMember}/>
  else if(active==='home') content=<HomePage introVisible={introVisible} city={selectedCity} onCityChange={setSelectedCity} onSelectCategory={id=>{setSelectedCategory(id);setActive('catalog')}}/>
  else if(active==='catalog') content=<CatalogPage city={selectedCity} category={selectedCategory} onBack={()=>setActive('home')} openMaster={setSelected} favorites={favorites} toggleFavorite={toggleFavorite} mastersList={mastersList} loading={mastersLoading}/>
  else if(active==='bookings') content=<BookingsPage supabase={supabase} user={user}/>
  else if(active==='favorites') content=<><Header title="Избранное" subtitle="ТВОИ МАСТЕРА"/><main className="page-content"><div className="master-list">{mastersLoading?<MasterCardSkeleton count={2}/>:mastersList.filter(m=>favorites.includes(m.id)).map(m=><MasterCard key={m.id} master={m} favorite onFavorite={()=>toggleFavorite(m.id)} onOpen={()=>setSelected(m)}/>)}</div>{!mastersLoading&&!favorites.length&&<div className="empty-state tall"><Heart size={34}/><b>Здесь пока пусто</b><span>Сохраняй мастеров, которые понравились</span><button className="primary-button" onClick={()=>setActive('catalog')}>Открыть каталог</button></div>}</main></>
  else if(active==='admin' && userRole==='admin') content=<AdminPanel supabase={supabase} currentUserId={user?.id}/>
  else if(['profile','master-inbox','master-bookings','master-stats','studio'].includes(active) && (userRole==='master' || (userRole==='admin' && viewMode==='master'))) content=<MasterWorkspace supabase={supabase} user={user} isAdmin={userRole==='admin'} viewMode={viewMode} setViewMode={setViewMode} activeTab={active} onOpenRegistration={()=>setRegistrationOpen(true)} onBackToMenu={()=>setActive('home')} onNavigate={setActive} onOpenMasterProfile={openTeamMasterProfile}/>
  else content=<ProfilePage supabase={supabase} isMaster={userRole==='master'} isAdmin={userRole==='admin'} viewMode={viewMode} setViewMode={setViewMode} connectionStatus={connectionStatus} user={user} authLoading={authLoading} onLogin={loginWithTelegram} onSignOut={signOut} authError={authError} onStartRegistration={startMasterRegistration} registrationStatus={registrationStatus}/>
  return <div className="app-shell"><div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="app-inner"><RenderErrorBoundary key={active}>{content}</RenderErrorBoundary>{!selected&&!bookingMaster&&!(active==='home'&&introVisible)&&<BottomNav active={active} setActive={setActive} isAdmin={userRole==='admin'} isMaster={userRole==='master' || (userRole==='admin' && viewMode==='master')} hasStudio={hasStudio}/>}</div>{registrationOpen && <MasterRegistration onClose={()=>setRegistrationOpen(false)} onSubmit={submitMasterRegistration}/>}</div>
}