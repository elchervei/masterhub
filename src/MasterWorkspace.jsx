import { useEffect, useMemo, useState } from 'react'
import { UserRound, Images, Plus, Trash2, CalendarRange, CalendarCheck2, Inbox, Check, X, CloudUpload, Clock, Send, House, Eye, Copy, Share2, Archive, RotateCcw, Sparkles, Clock3, CalendarDays, CheckCircle2 } from 'lucide-react'

const money = n => new Intl.NumberFormat('ru-RU').format(n || 0) + ' ₽'
const telegramUsername = value => {
  const raw=String(value||'').trim(), lower=raw.toLowerCase()
  const prefixes=['https://t.me/','http://t.me/','https://www.t.me/','https://telegram.me/','http://telegram.me/','t.me/','telegram.me/']
  const prefix=prefixes.find(item=>lower.startsWith(item))
  const username=(prefix?raw.slice(prefix.length):raw).replace(/^@/,'').split(/[/?#]/)[0]
  return /^[a-zA-Z0-9_]{5,32}$/.test(username)?username:''
}
const categoryNames = { tattoo: 'татуировки', nails: 'ногти и педикюр', brows: 'брови и ресницы', piercing: 'пирсинг', makeup: 'макияж' }
const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
const localDate = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}` }
const monthLabel = d => d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})

export default function MasterWorkspace({ supabase, user, isAdmin, viewMode, setViewMode, activeTab='profile', onOpenRegistration, onBackToMenu, onNavigate }) {
  const [master,setMaster]=useState(null),[services,setServices]=useState([]),[works,setWorks]=useState([]),[bookings,setBookings]=useState([]),[slots,setSlots]=useState([]),[selectedBooking,setSelectedBooking]=useState(null),[referenceOpen,setReferenceOpen]=useState(false),[quotePrice,setQuotePrice]=useState(''),[quoteMessage,setQuoteMessage]=useState(''),[quoteSaving,setQuoteSaving]=useState(false),[appointmentView,setAppointmentView]=useState('active'),[archiveSaving,setArchiveSaving]=useState(false)
  const [inquiries,setInquiries]=useState([]),[selectedInquiry,setSelectedInquiry]=useState(null),[inquiryImage,setInquiryImage]=useState('')
  const [telegramNotice,setTelegramNotice]=useState('')
  const [serviceTitle,setServiceTitle]=useState(''),[servicePrice,setServicePrice]=useState(''),[serviceDuration,setServiceDuration]=useState('60')
  const [selectedDate,setSelectedDate]=useState(localDate(new Date())),[startTime,setStartTime]=useState('11:00'),[endTime,setEndTime]=useState('13:00')
  const [note,setNote]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[uploading,setCloudUploading]=useState(false),[masterToolsView,setMasterToolsView]=useState(null),[copiedLink,setCopiedLink]=useState(false),[profileDraft,setProfileDraft]=useState({_masterId:null,public_name:'',bio:'',studio_name:'',city:'Калининград',contact_telegram:'',experience_years:'0',starting_price:'0'}),[profileSaving,setProfileSaving]=useState(false)
  const [smartCalendar,setSmartCalendar]=useState(true),[calendarView,setCalendarView]=useState('week')
  const categoryName = categoryNames[master?.category] || 'услуги'
  const portfolioTitle = ({tattoo:'татуировки',nails:'ногти и педикюр',brows:'брови и ресницы',piercing:'пирсинг',makeup:'макияж'})[master?.category] || 'работы'
  const load=async()=>{
    if(!supabase||!user){setLoading(false);return}
    setLoading(true);setError('')
    try{
      const {data:current,error:masterError}=await supabase.from('masters')
        .select('id,slug,public_name,bio,studio_name,city,contact_telegram,experience_years,starting_price,status,category,cover_image_url,deposit_enabled,deposit_amount,rating,reviews_count')
        .eq('user_id',user.id).maybeSingle()
      if(masterError)throw masterError
      setMaster(current||null)
      if(!current){setServices([]);setWorks([]);setBookings([]);setSlots([]);setInquiries([]);return}
      setProfileDraft(old=>old._masterId===current.id?old:{
        _masterId:current.id,
        public_name:current.public_name||'',
        bio:current.bio||'',
        studio_name:current.studio_name||'',
        city:current.city||'Калининград',
        contact_telegram:current.contact_telegram||'',
        experience_years:String(current.experience_years??0),
        starting_price:String(current.starting_price??0)
      })
      const [sv,pf,bk,sl,iq]=await Promise.all([
        supabase.from('services').select('*').eq('master_id',current.id).order('created_at',{ascending:false}),
        supabase.from('portfolio_items').select('*').eq('master_id',current.id).order('sort_order'),
        supabase.from('bookings').select('*').eq('master_id',current.id).order('starts_at'),
        supabase.from('master_time_slots').select('*').eq('master_id',current.id).gte('slot_date',localDate(new Date())).order('slot_date').order('starts_at'),
        supabase.from('master_inquiries').select('*').eq('master_id',current.id).order('created_at',{ascending:false})
      ])
      const firstError=[sv,pf,bk,sl,iq].find(result=>result.error)?.error
      if(firstError)setError(firstError.message||'Не удалось загрузить часть данных кабинета.')
      const bookingRows=await Promise.all((bk.data||[]).map(async booking=>{const service=(sv.data||[]).find(item=>item.id===booking.service_id)||null;const raw=booking.reference_image_url;if(!raw)return {...booking,service};if(raw.startsWith('https://')||raw.startsWith('http://'))return {...booking,service,referenceImageSignedUrl:raw};const {data:signed}=await supabase.storage.from('masterhub-references').createSignedUrl(raw,3600);return {...booking,service,referenceImageSignedUrl:signed?.signedUrl||''}}));setServices(sv.data||[]);setWorks(pf.data||[]);setBookings(bookingRows);setSlots(sl.data||[]);setInquiries(iq.data||[])
    }catch(loadError){
      setError(loadError?.message||'Не удалось загрузить кабинет. Попробуй обновить экран.')
    }finally{setLoading(false)}
  }
  useEffect(()=>{let live=true;let channel=null;const start=async()=>{await load();if(!supabase||!user)return;const {data:current}=await supabase.from('masters').select('id').eq('user_id',user.id).maybeSingle();if(live&&current)channel=supabase.channel('master-bookings-'+current.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings',filter:'master_id=eq.'+current.id},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'master_inquiries',filter:'master_id=eq.'+current.id},()=>load()).subscribe()};start();const handler=()=>load();window.addEventListener('masterhub:master-created',handler);return()=>{live=false;window.removeEventListener('masterhub:master-created',handler);if(channel)supabase.removeChannel(channel)}},[user?.id])
  const saveMasterProfile=async e=>{
    e.preventDefault()
    if(!master||profileSaving)return
    const experience=Math.max(0,Number(profileDraft.experience_years||0))
    if(!profileDraft.public_name.trim()||!Number.isFinite(experience)){
      setError('Проверь имя и опыт.')
      return
    }
    setProfileSaving(true);setError('')
    const payload={
      public_name:profileDraft.public_name.trim().slice(0,50),
      bio:profileDraft.bio.trim().slice(0,500),
      studio_name:profileDraft.studio_name.trim().slice(0,80)||null,
      city:profileDraft.city.trim().slice(0,60)||'Калининград',
      contact_telegram:(()=>{const raw=profileDraft.contact_telegram.trim();const lower=raw.toLowerCase();const prefixes=['https://t.me/','http://t.me/','https://www.t.me/','https://telegram.me/','http://telegram.me/','t.me/','telegram.me/'];const prefix=prefixes.find(item=>lower.startsWith(item));const username=(prefix?raw.slice(prefix.length):raw).replace(/^@/,'').split(/[/?#]/)[0];return /^[a-zA-Z0-9_]{5,32}$/.test(username)?username:null})(),
      experience_years:Math.floor(experience)
    }
    const {data,error:updateError}=await supabase.from('masters').update(payload).eq('id',master.id)
      .select('id,public_name,bio,studio_name,city,contact_telegram,experience_years').maybeSingle()
    setProfileSaving(false)
    if(updateError){setError(updateError.message);return}
    if(!data){setError('Не удалось сохранить профиль. Проверь доступ к анкете и попробуй ещё раз.');return}
    setMaster(old=>({...old,...data}))
    setNote('Профиль мастера сохранён.')
  }
  const uploadImage=async(file,kind)=>{
    if(!file||!master)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Поддерживаются только JPG, PNG и WebP.');return}
    if(file.size>5*1024*1024){setError('Максимальный размер фото — 5 МБ.');return}
    setCloudUploading(true);setError('')
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path=`${user.id}/${kind}-${crypto.randomUUID() }.${ext}`
    const {data,error:uploadError}=await supabase.storage.from('masterhub-media').upload(path,file,{contentType:file.type,upsert:false})
    if(uploadError){setError(uploadError.message);setCloudUploading(false);return}
    const {data:publicData}=supabase.storage.from('masterhub-media').getPublicUrl(data.path)
    if(kind==='cover'){
      const {error:updateError}=await supabase.from('masters').update({cover_image_url:publicData.publicUrl}).eq('id',master.id)
      if(updateError)setError(updateError.message);else setMaster(old=>({...old,cover_image_url:publicData.publicUrl}))
    }else{
      const {error:insertError}=await supabase.from('portfolio_items').insert({master_id:master.id,image_path:publicData.publicUrl,caption:'',sort_order:works.length})
      if(insertError)setError(insertError.message);else await load()
    }
    setCloudUploading(false)
  }
  const copyPublicProfile=async()=>{
    if(!master?.slug)return
    const url='https://t.me/mastershubs_bot?startapp='+encodeURIComponent('master_'+master.slug)
    if(navigator.share){
      try{await navigator.share({title:'MASTER HUB · '+master.public_name,text:'Открой профиль мастера в Telegram',url});return}
      catch(error){if(error?.name==='AbortError')return}
    }
    try{await navigator.clipboard.writeText(url);setCopiedLink(true);window.setTimeout(()=>setCopiedLink(false),2200)}
    catch{setError('Скопируй ссылку на профиль в Telegram: '+url)}
  }
  const saveWorkCaption=async(work,caption)=>{
    const value=caption.trim().slice(0,120)
    if(value===(work.caption||''))return
    const {error}=await supabase.from('portfolio_items').update({caption:value}).eq('id',work.id)
    if(error)setError(error.message);else setWorks(old=>old.map(item=>item.id===work.id?{...item,caption:value}:item))
  }
  const addService=async e=>{
    e.preventDefault();if(!master||!serviceTitle.trim())return
    const price=Number(servicePrice),duration=Number(serviceDuration||120)
    if(!Number.isFinite(price)||price<0||!Number.isFinite(duration)||duration<15||duration>1440){setError('Проверь стоимость и длительность услуги.');return}
    const {error}=await supabase.from('services').insert({master_id:master.id,title:serviceTitle.trim().slice(0,80),price_from:price,duration_minutes:duration,is_active:true})
    if(error)setError(error.message);else{setServicePrice('');setServiceTitle('');setNote('Услуга добавлена в прайс.');await load()}
  }
  const deleteService=async id=>{const {error}=await supabase.from('services').delete().eq('id',id);if(error)setError(error.message);else load()}
  const removeWork=async id=>{const {error}=await supabase.from('portfolio_items').delete().eq('id',id);if(error)setError(error.message);else load()}
  const addSlot=async e=>{
    e.preventDefault();if(!master)return
    if(endTime<=startTime){setError('Время окончания должно быть позже начала.');return}
    const start=new Date(`${selectedDate}T${startTime}:00`),end=new Date(`${selectedDate}T${endTime}:00`)
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start<=new Date()){setError('Нельзя добавить интервал в прошлом.');return}
    const overlaps=slots.some(s=>s.slot_date===selectedDate&&new Date(s.starts_at)<end&&new Date(s.ends_at)>start)
    if(overlaps){setError('Этот интервал пересекается с уже добавленным.');return}
    const {error}=await supabase.from('master_time_slots').insert({master_id:master.id,slot_date:selectedDate,starts_at:start.toISOString(),ends_at:end.toISOString(),is_active:true})
    if(error)setError(error.message);else{setNote('Свободный интервал добавлен.');await load()}
  }
  const removeSlot=async slot=>{
    const used=!slot.is_active
    if(used){setError('Нельзя удалить интервал с активной записью. Сначала отмени или перенеси запись.');return}
    const {error}=await supabase.from('master_time_slots').delete().eq('id',slot.id)
    if(error)setError(error.message);else load()
  }
  const updateBooking=async(id,status)=>{const expectedStatus=selectedBooking?.status;if(!expectedStatus)return false;const {data,error}=await supabase.from('bookings').update({status}).eq('id',id).eq('status',expectedStatus).select('id').maybeSingle();if(error){setError(error.message);return false}if(!data){setError('Статус заявки уже изменился. Обнови список записей.');await load();return false}await load();return true}
  const archiveCompletedBooking=async()=>{
    if(!selectedBooking||selectedBooking.status!=='completed'||archiveSaving)return
    setArchiveSaving(true);setError('')
    const {data,error}=await supabase.from('bookings').update({master_archived_at:new Date().toISOString()})
      .eq('id',selectedBooking.id).eq('status','completed').is('master_archived_at',null).select('id').maybeSingle()
    setArchiveSaving(false)
    if(error){setError(error.message);return}
    if(!data){setError('Запись уже изменилась. Обнови список.');await load();return}
    setSelectedBooking(null);setAppointmentView('active');setNote('Запись убрана в архив. История клиента сохранена.');await load()
  }
  const restoreArchivedBooking=async()=>{
    if(!selectedBooking||selectedBooking.status!=='completed'||!selectedBooking.master_archived_at||archiveSaving)return
    setArchiveSaving(true);setError('')
    const {data,error}=await supabase.from('bookings').update({master_archived_at:null})
      .eq('id',selectedBooking.id).eq('status','completed').not('master_archived_at','is',null).select('id').maybeSingle()
    setArchiveSaving(false)
    if(error){setError(error.message);return}
    if(!data){setError('Не удалось вернуть запись. Обнови список.');await load();return}
    setSelectedBooking(null);setAppointmentView('active');setNote('Запись возвращена в список.');await load()
  }
  const sendPriceQuote=async()=>{if(!selectedBooking)return;const amount=Number(quotePrice);if(!Number.isFinite(amount)||amount<=0){setError('Укажи стоимость больше нуля.');return}setQuoteSaving(true);setError('');const {error}=await supabase.from('bookings').update({status:'price_proposed',proposed_price:amount,master_message:quoteMessage.trim().slice(0,300)}).eq('id',selectedBooking.id).eq('status','pending');setQuoteSaving(false);if(error){setError(error.message);return}setSelectedBooking(null);setQuotePrice('');setQuoteMessage('');await load()}
  const selectedSlots=slots.filter(s=>s.slot_date===selectedDate)
  const incomingBookings=bookings.filter(b=>b.status==='pending').sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))
  const appointmentBookings=bookings.filter(b=>!b.master_archived_at&&['price_proposed','confirmed','completed'].includes(b.status)).sort((a,b)=>{
    const ta=new Date(a.starts_at).getTime(),tb=new Date(b.starts_at).getTime(),now=Date.now()
    const af=ta>=now,bf=tb>=now
    if(af!==bf)return af?-1:1
    return af?ta-tb:tb-ta
  })
  const archivedBookings=bookings.filter(b=>!!b.master_archived_at&&b.status==='completed').sort((a,b)=>new Date(b.master_archived_at)-new Date(a.master_archived_at))
  const visibleAppointmentBookings=appointmentView==='archive'?archivedBookings:appointmentBookings
  const upcomingAppointment=appointmentBookings.find(b=>new Date(b.starts_at).getTime()>=Date.now()&&['confirmed','price_proposed'].includes(b.status))
  const freeSlots=slots.filter(s=>s.is_active).length
  const monthDays=useMemo(()=>{const d=new Date(selectedDate+'T12:00:00'),first=new Date(d.getFullYear(),d.getMonth(),1),offset=first.getDay();return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1))},[selectedDate])
  const dayStatus=date=>{
    const key=localDate(date),daySlots=slots.filter(s=>s.slot_date===key)
    if(!daySlots.length)return ''
    const free=daySlots.filter(s=>s.is_active).length
    return free===0?'full':free===daySlots.length?'free':'partial'
  }
  return <>
    <header className="topbar"><div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div><div className="topbar-title"><strong>Кабинет мастера</strong><small>УПРАВЛЕНИЕ ПРОФИЛЕМ</small></div><button type="button" className="workspace-home-button" onClick={onBackToMenu}><House size={14}/> В клиентский режим</button></header>
    <main className="page-content master-workspace">
      {isAdmin&&<section className="role-preview-switch"><span className="eyebrow">РЕЖИМ ПРОСМОТРА · ТОЛЬКО ВЛАДЕЛЕЦ</span><div><button className={viewMode==="client"?"selected":""} onClick={()=>setViewMode("client")}>Я клиент</button><button className={viewMode==="master"?"selected":""} onClick={()=>setViewMode("master")}>Я мастер</button></div><small>Реальная роль администратора не меняется.</small></section>}
      {loading?<div className="empty-state">Загружаем кабинет…</div>:!master?<div className="workspace-empty"><UserRound size={30}/><h2>Профиль мастера ещё не создан</h2><p>Создай анкету, чтобы управлять фотографиями, свободными интервалами и записями.</p><button className="primary-button" onClick={onOpenRegistration}>Создать анкету мастера</button></div>:<>

        {activeTab==='profile'&&<>
          <section className="master-dashboard">
            <div className="master-dashboard-heading">
              <div><span className="eyebrow">ТВОЯ СТУДИЯ · MASTER HUB</span><h2>Привет, {master.public_name}</h2><p>{master.status==='approved'?'Всё готово к новым записям.':master.status==='pending'?'Анкета ожидает проверки модератором.':'Анкета требует внимания.'}</p></div>
              {master.cover_image_url?<img src={master.cover_image_url} alt="" className="master-dashboard-avatar"/>:<div className="master-dashboard-avatar master-dashboard-placeholder"><UserRound size={22}/></div>}
            </div>
            <div className="master-dashboard-stats">
              <button type="button" onClick={()=>onNavigate?.('master-inbox')}><span>Новые заявки</span><b>{incomingBookings.length}</b><small>Открыть входящие <span>↗</span></small></button>
              <button type="button" onClick={()=>onNavigate?.('master-bookings')}><span>Ближайшие записи</span><b>{appointmentBookings.filter(b=>new Date(b.starts_at)>=new Date()&&b.status==='confirmed').length}</b><small>Смотреть расписание <span>↗</span></small></button>
              <div><span>Свободные окна</span><b>{freeSlots}</b><small>В календаре</small></div>
            </div>
            <div className="master-dashboard-next">
              <div className="master-dashboard-section-title"><span>СЛЕДУЮЩАЯ ЗАПИСЬ</span><button type="button" onClick={()=>onNavigate?.('master-bookings')}>Все записи <span>↗</span></button></div>
              {upcomingAppointment?<button type="button" className="master-next-booking" onClick={()=>setSelectedBooking(upcomingAppointment)}><span className="master-next-date"><b>{new Date(upcomingAppointment.starts_at).toLocaleDateString('ru-RU',{day:'2-digit'})}</b><small>{new Date(upcomingAppointment.starts_at).toLocaleDateString('ru-RU',{month:'short'})}</small></span><span><b>{new Date(upcomingAppointment.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} · {upcomingAppointment.client_telegram||'Клиент'}</b><small>{upcomingAppointment.status==='price_proposed'?'Ожидает подтверждения цены':'Запись подтверждена'}</small></span><span className="master-next-arrow">↗</span></button>:<div className="master-dashboard-empty"><CalendarCheck2 size={18}/><span>Пока нет предстоящих записей</span></div>}
            </div>
            <div className="master-dashboard-actions">
              {master.status==='approved'&&<button type="button" onClick={copyPublicProfile}><Share2 size={17}/><span><b>Публичная ссылка</b><small>{copiedLink?'Ссылка скопирована': 'Поделиться профилем мастера'}</small></span><span className="master-action-arrow"><Copy size={15}/></span></button>}
              <button type="button" onClick={()=>setMasterToolsView('profile')}><Images size={17}/><span><b>Профиль и портфолио</b><small>Обложка, работы и стоимость</small></span><span className="master-action-arrow">↗</span></button>
              {master.status==='approved'&&<button type="button" onClick={()=>setMasterToolsView('schedule')}><CalendarRange size={17}/><span><b>Управление расписанием</b><small>Добавить свободные интервалы</small></span><span className="master-action-arrow">↗</span></button>}
              <button type="button" onClick={()=>onNavigate?.('master-inbox')}><Inbox size={17}/><span><b>Центр заявок</b><small>{incomingBookings.length ? incomingBookings.length + ' новых обращения' : 'Новых обращений нет'}</small></span><span className="master-action-arrow">↗</span></button>
            </div>
          </section>
          {masterToolsView&&<div className="master-profile-tools">
            <div className="master-tools-heading"><div><span className="eyebrow">{masterToolsView==='profile'?'ПРОФИЛЬ МАСТЕРА':'РАСПИСАНИЕ'}</span><h3>{masterToolsView==='profile'?'Редактирование профиля':'Управление расписанием'}</h3></div><button type="button" onClick={()=>setMasterToolsView(null)}>Закрыть</button></div>
            {masterToolsView==='profile'&&<>
            <form className="workspace-section workspace-profile-form" onSubmit={saveMasterProfile}>
              <div className="workspace-form-heading"><span className="workspace-section-icon"><UserRound size={17}/></span><div><h3>Основная информация</h3><p>То, что увидят клиенты в твоей анкете</p></div></div>
              <label>Имя или псевдоним<input required maxLength={50} value={profileDraft.public_name} onChange={e=>setProfileDraft(old=>({...old,public_name:e.target.value}))}/></label>
              <label>О себе<textarea maxLength={500} rows={3} value={profileDraft.bio} onChange={e=>setProfileDraft(old=>({...old,bio:e.target.value}))} placeholder="Опыт и особенности твоих услуг"/></label>
              <div className="workspace-form-grid"><label>Студия<input maxLength={80} value={profileDraft.studio_name} onChange={e=>setProfileDraft(old=>({...old,studio_name:e.target.value}))} placeholder="Название студии"/></label><label>Город<input maxLength={60} value={profileDraft.city} onChange={e=>setProfileDraft(old=>({...old,city:e.target.value}))}/></label></div>
              <label>Telegram для связи<input maxLength={32} autoCapitalize="none" autoCorrect="off" value={profileDraft.contact_telegram} onChange={e=>setProfileDraft(old=>({...old,contact_telegram:e.target.value}))} placeholder="@username"/></label>
              <label>Опыт, лет<input type="number" min="0" max="80" step="1" value={profileDraft.experience_years} onChange={e=>setProfileDraft(old=>({...old,experience_years:e.target.value}))}/></label>
              <button className="primary-button full-button" disabled={profileSaving}>{profileSaving?'Сохраняем…':'Сохранить информацию'}</button>
            </form>
            <section className="workspace-section"><h3><Images size={17}/> Обложка профиля</h3>{master.cover_image_url&&<img className="master-cover-preview" src={master.cover_image_url} alt="Обложка профиля"/>}<label className="upload-control"><CloudUpload size={16}/>{uploading?'Загружаем…':master.cover_image_url?'Заменить фотографию':'Загрузить фотографию'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>uploadImage(e.target.files?.[0],'cover')}/></label><p className="muted-note">Эта фотография будет показываться в карточке и в профиле мастера.</p></section>
            <section className="workspace-section"><h3><Images size={17}/> Примеры работ · {portfolioTitle}</h3><label className="upload-control"><Plus size={16}/> Добавить фото работы<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>uploadImage(e.target.files?.[0],'work')}/></label><div className="workspace-works">{works.map(w=><div key={w.id}><img src={w.image_path} alt={w.caption||'Работа мастера'}/><button type="button" onClick={()=>removeWork(w.id)} aria-label="Удалить работу"><Trash2 size={14}/></button><input className="portfolio-caption-input" defaultValue={w.caption||''} maxLength={120} placeholder="Подпись к работе" onBlur={e=>saveWorkCaption(w,e.target.value)}/></div>)}</div>{!works.length&&<p className="muted-note">Пока нет примеров работ.</p>}</section>
            <section className="workspace-section service-pricing-section"><h3><UserRound size={17}/> Стоимость услуг</h3><p className="muted-note">Добавляй отдельные услуги и указывай цену каждой — этот список увидят клиенты в твоём профиле.</p><form className="service-add-form" onSubmit={addService}><input type="text" maxLength="80" required value={serviceTitle} onChange={e=>setServiceTitle(e.target.value)} placeholder={'Например: услуга для направления «' + categoryName + '»'}/><input type="number" min="0" required value={servicePrice} onChange={e=>setServicePrice(e.target.value)} placeholder="Стоимость, ₽"/><button className="primary-button service-add-button" aria-label="Добавить услугу"><Plus size={17}/> Добавить</button></form><div className="workspace-service-list">{services.map(s=><div key={s.id}><span>{s.title}</span><b>{money(s.price_from)}</b><button type="button" className="mini-delete" onClick={()=>deleteService(s.id)} aria-label={'Удалить услугу '+s.title}><Trash2 size={14}/></button></div>)}</div>{!services.length&&<p className="muted-note service-empty-note">Прайс пока пустой — добавь первую услугу выше.</p>}</section>
            </>}
            {masterToolsView==='schedule'&&master.status==='approved'&&<>
<section className="workspace-section master-calendar-section">
<div className="smart-calendar-heading"><div><h3><CalendarRange size={17}/> Календарь свободного времени</h3><p>Умный просмотр расписания. Старую версию можно вернуть в любой момент.</p></div><button type="button" className="calendar-mode-toggle" onClick={()=>setSmartCalendar(v=>!v)}>{smartCalendar?'Старая версия':'Умный режим'}</button></div>
{smartCalendar?<><div className="smart-calendar-toolbar"><div className="calendar-view-switch"><button type="button" className={calendarView==='day'?'active':''} onClick={()=>setCalendarView('day')}>День</button><button type="button" className={calendarView==='week'?'active':''} onClick={()=>setCalendarView('week')}>Неделя</button><button type="button" className={calendarView==='month'?'active':''} onClick={()=>setCalendarView('month')}>Месяц</button></div><div className="calendar-date-nav"><button type="button" onClick={()=>{const d=new Date(selectedDate+'T12:00:00');d.setDate(d.getDate()-(calendarView==='month'?30:calendarView==='week'?7:1));setSelectedDate(localDate(d))}}>‹</button><b>{calendarView==='month'?monthLabel(new Date(selectedDate+'T12:00:00')):new Date(selectedDate+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}</b><button type="button" onClick={()=>{const d=new Date(selectedDate+'T12:00:00');d.setDate(d.getDate()+(calendarView==='month'?30:calendarView==='week'?7:1));setSelectedDate(localDate(d))}}>›</button></div></div>
{calendarView==='month'?<><div className="calendar-legend"><span><i className="free"/> Свободно</span><span><i className="partial"/> Частично</span><span><i className="full"/> Занято</span></div><div className="master-calendar-grid">{monthDays.map((d,i)=>{const key=localDate(d),sameMonth=d.getMonth()===new Date(selectedDate+'T12:00:00').getMonth();return <button type="button" key={i} className={'calendar-day '+(sameMonth?'':'outside')+' '+(selectedDate===key?'chosen':'')+' '+dayStatus(d)} onClick={()=>{setSelectedDate(key);setCalendarView('day')}}><span>{d.getDate()}</span>{dayStatus(d)&&<i/>}</button>})}</div></>:<div className="smart-calendar-days">{(calendarView==='day'?[new Date(selectedDate+'T12:00:00')]:Array.from({length:7},(_,i)=>{const d=new Date(selectedDate+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7)+i);return d})).map(d=>{const key=localDate(d),daySlots=slots.filter(s=>s.slot_date===key),dayBookings=bookings.filter(b=>localDate(b.starts_at)===key&&['pending','price_proposed','confirmed','completed'].includes(b.status));return <div className={'smart-calendar-day '+(key===selectedDate?'selected':'')} key={key}><button type="button" className="smart-calendar-day-title" onClick={()=>setSelectedDate(key)}><b>{d.toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'})}</b><span>{daySlots.filter(s=>s.is_active).length} свободно · {dayBookings.length} записей</span></button>{daySlots.length?<div className="smart-calendar-events">{daySlots.map(s=>{const booking=bookings.find(b=>b.slot_id===s.id&&['pending','price_proposed','confirmed','completed'].includes(b.status));return <div className={'smart-calendar-event '+(s.is_active?'available':'busy')} key={s.id}><button type="button" onClick={()=>booking&&setSelectedBooking(booking)} disabled={!booking}><b>{new Date(s.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}–{new Date(s.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</b><span>{booking?(booking.client_telegram||'Запись'):(s.is_active?'Свободно':'Занято')}</span></button>{s.is_active&&<button type="button" className="smart-calendar-delete" onClick={()=>removeSlot(s)} aria-label="Удалить свободный интервал"><Trash2 size={13}/></button>}</div>})}</div>:<small className="smart-calendar-empty">Нет добавленных интервалов</small>}</div>})}</div>}
<div className="smart-calendar-summary"><span>Свободно <b>{slots.filter(s=>s.slot_date===selectedDate&&s.is_active).length}</b></span><span>Занято <b>{slots.filter(s=>s.slot_date===selectedDate&&!s.is_active).length}</b></span><span>Заявки и записи <b>{bookings.filter(b=>localDate(b.starts_at)===selectedDate&&['pending','price_proposed','confirmed','completed'].includes(b.status)).length}</b></span></div>
</>:<><div className="calendar-legend"><span><i className="free"/> Свободно</span><span><i className="partial"/> Частично</span><span><i className="full"/> Занято</span></div><div className="master-calendar-grid">{monthDays.map((d,i)=>{const key=localDate(d),sameMonth=d.getMonth()===new Date(selectedDate+'T12:00:00').getMonth();return <button type="button" key={i} className={'calendar-day '+(sameMonth?'':'outside')+' '+(selectedDate===key?'chosen':'')+' '+dayStatus(d)} onClick={()=>setSelectedDate(key)}><span>{d.getDate()}</span>{dayStatus(d)&&<i/>}</button>})}</div><label className="date-input-label">Выбранная дата<input type="date" min={localDate(new Date())} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><div className="slot-list">{selectedSlots.map(s=>{const booking=bookings.find(b=>b.slot_id===s.id&&['pending','price_proposed','confirmed'].includes(b.status));return <div key={s.id} className={!s.is_active?'slot-booked':''}><button type="button" className="slot-open-booking" disabled={!booking} onClick={()=>setSelectedBooking(booking)}><Clock size={14}/>{new Date(s.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} — {new Date(s.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} {!s.is_active?'· занято':'· свободно'}{booking&&<small> · открыть запись</small>}</button>{s.is_active&&<button type="button" onClick={()=>removeSlot(s)}><Trash2 size={14}/></button>}</div>})}</div>{!selectedSlots.length&&<p className="muted-note">На эту дату интервалы ещё не добавлены.</p>}</>}
<label className="date-input-label">Выбранная дата<input type="date" min={localDate(new Date())} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label>
<form className="schedule-form smart-calendar-add" onSubmit={addSlot}><div><label>С <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label><label>До <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></label></div><button className="primary-button full-button"><Plus size={16}/> Добавить интервал</button></form>
<p className="muted-note">Календарь использует те же интервалы и записи, что и старая версия. Переключатель меняет только отображение.</p>
</section></>}

          </div>}
        </>}
        {activeTab==='master-inbox'&&<>
        <section className="workspace-section booking-inbox-section master-tab-intro"><span className="eyebrow">ВХОДЯЩИЕ</span><h2>Заявки</h2><p>Новые обращения клиентов. После отправки цены заявка переместится в записи.</p><div className="master-summary-row"><span>Новые</span><b>{incomingBookings.length}</b></div>
          {incomingBookings.length?incomingBookings.map(b=><button type="button" className="booking-inbox-card" key={b.id} onClick={()=>{setSelectedBooking(b);setQuotePrice('');setQuoteMessage('')}}><span className="booking-inbox-date">{new Date(b.starts_at).toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'short'})} · {new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><b>{b.client_telegram||'Клиент Telegram не указан'}</b><span>{b.service?.title||b.client_note?.trim()||'Услуга не указана'} · {b.reference_image_url?'Есть фото':'Без фото'} · Открыть заявку</span></button>):<div className="master-empty-state"><Inbox size={25}/><b>Новых заявок пока нет</b><span>Когда клиент отправит запись, она появится здесь.</span></div>}
        </section>
        <section className="workspace-section inquiry-inbox-section"><h3><Images size={15}/> Заявки с фото и примерами <span className="count-chip">{inquiries.filter(x=>x.status==='pending').length}</span></h3>{inquiries.length?inquiries.map(item=><button type="button" className="booking-inbox-card inquiry-inbox-card" key={item.id} onClick={()=>setSelectedInquiry(item)}><span className="booking-inbox-date">{new Date(item.created_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}</span><b>{item.client_telegram?'@'+item.client_telegram+' · ':''}{item.reference_image_urls?.length||0} изображений</b><span>{item.status==='pending'?'Новая заявка · открыть материалы':item.status==='reviewed'?'Просмотрена':'Отклонена'}</span></button>):<p className="muted-note">Пока никто не отправил фото или примеры.</p>}</section>
        </>}
        {activeTab==='master-bookings'&&<>
        <section className="appointments-heading-simple">
          <h2>Записи</h2>
          <p>Все записи клиентов в одном месте.</p>
        </section>
        <section className="appointments-stats-grid">
          <div className="appointment-stat-card"><span>НОВЫЕ ЗАЯВКИ</span><b>{bookings.filter(b=>new Date(b.created_at)>=new Date(new Date().getFullYear(),new Date().getMonth(),1)).length}</b><small>за этот месяц</small></div>
          <div className="appointment-stat-card"><span>ПОДТВЕРЖДЕНО</span><b>{bookings.filter(b=>b.status==='confirmed'&&!b.master_archived_at).length}</b><small>всего записей</small></div>
          <div className="appointment-stat-card"><span>В АРХИВЕ</span><b>{archivedBookings.length}</b><small>можно вернуть</small></div>
        </section>
        <section className="appointments-list-section">
          <div className="appointments-list-heading"><div><span className="eyebrow">ТВОЙ КАЛЕНДАРЬ</span><h3>{appointmentView==='archive'?'Архив':'Записи'} <span>{visibleAppointmentBookings.length}</span></h3></div><span className="appointments-list-spark"><Sparkles size={17}/></span></div>
          <div className="appointments-filter">
            <button type="button" className={appointmentView==='active'?'selected':''} onClick={()=>setAppointmentView('active')}>Активные <b>{appointmentBookings.length}</b></button>
            <button type="button" className={appointmentView==='archive'?'selected':''} onClick={()=>setAppointmentView('archive')}>Архив <b>{archivedBookings.length}</b></button>
          </div>
          {visibleAppointmentBookings.length?visibleAppointmentBookings.map(b=>{
            const date=new Date(b.starts_at),statusLabel=b.status==='price_proposed'?'Ждём ответа':b.status==='confirmed'?'Подтверждён':'Завершён'
            const time=date.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})
            const duration=Math.max(0,Math.round((new Date(b.ends_at)-date)/60000))
            return <button type="button" className={'appointment-card-v2 '+b.status+(b.master_archived_at?' archived':'')} key={b.id} onClick={()=>setSelectedBooking(b)}>
              <span className="appointment-card-date"><b>{date.toLocaleDateString('ru-RU',{day:'2-digit'})}</b><small>{date.toLocaleDateString('ru-RU',{month:'short'}).replace('.','')}</small><i>{date.toLocaleDateString('ru-RU',{weekday:'short'})}</i></span>
              <span className="appointment-card-content">
                <span className="appointment-card-topline"><b>{b.client_telegram?'@'+b.client_telegram:'Клиент'}</b><span className={'appointment-status-v2 '+b.status}>{b.status==='price_proposed'?<Clock3 size={11}/>:b.status==='confirmed'?<CheckCircle2 size={11}/>:<Sparkles size={11}/>} {statusLabel}</span></span>
                <span className="appointment-card-service">{b.service?.title||b.client_note?.trim()||'Индивидуальная услуга'}</span>{b.service&&b.client_note?.trim()&&<small className="appointment-card-note">{b.client_note.trim()}</small>}
                <span className="appointment-card-meta"><span><Clock3 size={12}/>{time} · {duration?duration+' мин':'время уточняется'}</span>{b.proposed_price?<span className="appointment-card-price">{money(b.proposed_price)}</span>:null}</span>
              </span>
              <span className="appointment-card-arrow"><span>ОТКРЫТЬ</span><Plus size={15}/></span>
            </button>
          }):<div className="appointments-empty-v2"><span className="appointments-empty-icon">{appointmentView==='archive'?<Archive size={24}/>:<CalendarCheck2 size={24}/>}</span><b>{appointmentView==='archive'?'Архив пока пуст':'Пока тихо'}</b><p>{appointmentView==='archive'?'Завершённые записи, которые ты уберёшь из основного списка, появятся здесь.':'Новые подтверждённые записи появятся здесь. Можно пока выдохнуть ☕'}</p></div>}
        </section>
      </>}
      </>}
      {selectedInquiry&&<div className="modal-backdrop" onClick={()=>setSelectedInquiry(null)}><section className="booking-detail-modal inquiry-detail-modal" onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setSelectedInquiry(null)}><X size={20}/></button><span className="eyebrow">ЗАЯВКА С МАТЕРИАЛАМИ</span><h2>{new Date(selectedInquiry.created_at).toLocaleString('ru-RU',{dateStyle:'full',timeStyle:'short'})}</h2><p>Клиент прикрепил {selectedInquiry.reference_image_urls?.length||0} изображений. Открой любое, чтобы рассмотреть крупнее.</p>{telegramUsername(selectedInquiry.client_telegram)?<a className="telegram-contact-button" href={'https://t.me/'+encodeURIComponent(telegramUsername(selectedInquiry.client_telegram))} target="_blank" rel="noopener noreferrer"><Send size={15}/> Написать клиенту в Telegram</a>:<button type="button" className="telegram-contact-button" onClick={()=>setTelegramNotice('У пользователя не указан Telegram username. Написать ему напрямую через Telegram пока нельзя.')}><Send size={15}/> Написать клиенту в Telegram</button>}{telegramNotice&&<p className="contact-unavailable">{telegramNotice}</p>}<div className="inquiry-master-gallery">{(selectedInquiry.reference_image_urls||[]).map((url,i)=><button type="button" key={url+i} onClick={()=>setInquiryImage(url)}><img src={url} alt={'Референс '+(i+1)}/></button>)}</div><div className="booking-modal-actions"><button className="approve-button" onClick={async()=>{const {error}=await supabase.from('master_inquiries').update({status:'reviewed'}).eq('id',selectedInquiry.id);if(error)setError(error.message);else{setSelectedInquiry(null);await load()}}}>Отметить просмотренной</button><button className="reject-button" onClick={async()=>{const {error}=await supabase.from('master_inquiries').update({status:'declined'}).eq('id',selectedInquiry.id);if(error)setError(error.message);else{setSelectedInquiry(null);await load()}}}>Отклонить</button></div></section></div>}
      {inquiryImage&&<div className="modal-backdrop reference-lightbox" onClick={()=>setInquiryImage('')}><button className="modal-close" onClick={()=>setInquiryImage('')}><X size={22}/></button><img src={inquiryImage} alt="Референс клиента" onClick={e=>e.stopPropagation()}/></div>}
      {selectedBooking&&<div className="modal-backdrop" onClick={()=>setSelectedBooking(null)}><section className="booking-detail-modal booking-negotiation-modal" onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setSelectedBooking(null)}><X size={20}/></button><span className="eyebrow">{selectedBooking.status==='pending'?'НОВАЯ ЗАЯВКА':selectedBooking.status==='price_proposed'?'ЖДЁМ ПОДТВЕРЖДЕНИЯ СТОИМОСТИ':selectedBooking.status==='confirmed'?'ПОДТВЕРЖДЁННАЯ ЗАПИСЬ':'ЗАВЕРШЁННАЯ ЗАПИСЬ'}</span><h2>{new Date(selectedBooking.starts_at).toLocaleString('ru-RU',{dateStyle:'full',timeStyle:'short'})}</h2>{selectedBooking.service&&<div className="booking-service-summary"><b>{selectedBooking.service.title}</b><span>{Number(selectedBooking.service.price_from)>0?money(selectedBooking.service.price_from):'Цена по запросу'}</span></div>}<p>{selectedBooking.client_note||'Услуга не уточнена'}</p>{selectedBooking.reference_image_url?<button type="button" className="open-reference-button" onClick={()=>setReferenceOpen(true)}><Eye size={17}/> Открыть референс</button>:<p className="muted-note">Клиент не прикрепил референс.</p>}{telegramUsername(selectedBooking.client_telegram)?<a className="telegram-contact-button" href={(()=>{const username=telegramUsername(selectedBooking.client_telegram);const date=new Date(selectedBooking.starts_at);const when=date.toLocaleString('ru-RU',{weekday:'long',day:'numeric',month:'long'})+' в '+date.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});const message=`Привет! Это ${master.public_name} из MASTER HUB. Пишу по твоей заявке на услугу ${when}. Хотел(а) уточнить пару деталей: ${selectedBooking.client_note||'расскажи, пожалуйста, подробнее о своей идее.'}`;return 'https://t.me/'+encodeURIComponent(username)+'?text='+encodeURIComponent(message)})()} onClick={e=>{const telegram=window.Telegram?.WebApp;if(telegram?.openTelegramLink){e.preventDefault();telegram.openTelegramLink(e.currentTarget.href)}}} target="_blank" rel="noopener noreferrer"><Send size={16}/> Открыть чат и написать клиенту</a>:<button type="button" className="telegram-contact-button" onClick={()=>setTelegramNotice('У пользователя не указан Telegram username. Написать ему напрямую через Telegram пока нельзя. Попроси клиента добавить @username в профиль или заявку.')}><Send size={16}/> Открыть чат и написать клиенту</button>}{telegramNotice&&<p className="contact-unavailable">{telegramNotice}</p>}{selectedBooking.status==='pending'&&<div className="quote-editor"><div className="booking-action-heading"><b>Согласование стоимости</b><span>Обсуди детали с клиентом в Telegram, затем укажи итоговую цену. Клиент подтвердит её в приложении.</span></div><label>ИТОГОВАЯ СТОИМОСТЬ, ₽<input type="number" min="1" step="1" value={quotePrice} onChange={e=>setQuotePrice(e.target.value)} placeholder="Например, 8 000"/></label><label>КОММЕНТАРИЙ <span className="optional-label">необязательно</span><textarea value={quoteMessage} maxLength={300} onChange={e=>setQuoteMessage(e.target.value.slice(0,300))} placeholder="Что входит в стоимость…"/></label><button className="primary-button" disabled={quoteSaving||!quotePrice.trim()} onClick={sendPriceQuote}>{quoteSaving?'Отправляем…':'Отправить стоимость на подтверждение'}</button><button className="reject-button quote-decline-button" onClick={async()=>{const ok=await updateBooking(selectedBooking.id,'declined');if(ok)setSelectedBooking(null)}}><X size={15}/> Отклонить заявку</button></div>}{selectedBooking.status==='price_proposed'&&<div className="quote-waiting-note"><b>Цена отправлена клиенту</b><strong>{new Intl.NumberFormat('ru-RU').format(Number(selectedBooking.proposed_price||0))} ₽</strong><p>{selectedBooking.master_message||'Ждём ответа клиента.'}</p></div>}{selectedBooking.status==='confirmed'&&<div className="quote-waiting-note"><b>{selectedBooking.proposed_price?'Клиент согласился':'Заявка принята мастером'}</b>{selectedBooking.proposed_price?<strong>{new Intl.NumberFormat('ru-RU').format(Number(selectedBooking.proposed_price))} ₽</strong>:<p>Запись подтверждена без предварительного указания стоимости.</p>}<button className="complete-booking" onClick={async()=>{const ok=await updateBooking(selectedBooking.id,'completed');if(ok)setSelectedBooking(null)}}>Завершить запись</button></div>}{selectedBooking.status==='completed'&&!selectedBooking.master_archived_at&&<div className="archive-booking-panel"><div><Archive size={17}/><span><b>Запись завершена</b><small>Убери его из основного списка. История клиента останется.</small></span></div><button type="button" className="archive-booking-button" disabled={archiveSaving} onClick={archiveCompletedBooking}>{archiveSaving?'Убираем…':'В архив'}</button></div>}{selectedBooking.status==='completed'&&selectedBooking.master_archived_at&&<div className="archive-booking-panel archived"><div><Archive size={17}/><span><b>Запись в архиве</b><small>Его можно вернуть в основной список.</small></span></div><button type="button" className="restore-booking-button" disabled={archiveSaving} onClick={restoreArchivedBooking}><RotateCcw size={14}/>{archiveSaving?'Возвращаем…':'Вернуть'}</button></div>}</section></div>}{referenceOpen&&selectedBooking?.reference_image_url&&<div className="modal-backdrop reference-lightbox" onClick={()=>setReferenceOpen(false)}><button className="modal-close" onClick={()=>setReferenceOpen(false)}><X size={22}/></button><img src={selectedBooking.referenceImageSignedUrl||selectedBooking.reference_image_url} alt="Референс клиента" onClick={e=>e.stopPropagation()}/></div>}{note&&<p className="muted-note">{note}</p>}{error&&<p className="auth-error">{error}</p>}
    </main>
  </>
}
