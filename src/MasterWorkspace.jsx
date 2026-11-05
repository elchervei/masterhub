import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, ImagePlus, Plus, Trash2, CalendarClock, CalendarDays, Check, X, Upload, Clock3, Send, House, Eye } from 'lucide-react'

const money = n => new Intl.NumberFormat('ru-RU').format(n || 0) + ' ₽'
const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
const localDate = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}` }
const monthLabel = d => d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})

export default function MasterWorkspace({ supabase, user, isAdmin, viewMode, setViewMode, onOpenRegistration, onBackToMenu }) {
  const [master,setMaster]=useState(null),[services,setServices]=useState([]),[works,setWorks]=useState([]),[bookings,setBookings]=useState([]),[slots,setSlots]=useState([]),[selectedBooking,setSelectedBooking]=useState(null),[referenceOpen,setReferenceOpen]=useState(false),[quotePrice,setQuotePrice]=useState(''),[quoteMessage,setQuoteMessage]=useState(''),[quoteSaving,setQuoteSaving]=useState(false)
  const [serviceTitle,setServiceTitle]=useState('Татуировка'),[servicePrice,setServicePrice]=useState(''),[serviceDuration,setServiceDuration]=useState('120')
  const [selectedDate,setSelectedDate]=useState(localDate(new Date())),[startTime,setStartTime]=useState('11:00'),[endTime,setEndTime]=useState('13:00')
  const [note,setNote]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false)
  const load=async()=>{
    if(!supabase||!user)return
    setLoading(true)
    const {data:current}=await supabase.from('masters').select('id,public_name,status,category,cover_image_url').eq('user_id',user.id).maybeSingle()
    setMaster(current||null)
    if(current){
      const [sv,pf,bk,sl]=await Promise.all([
        supabase.from('services').select('*').eq('master_id',current.id).order('created_at',{ascending:false}),
        supabase.from('portfolio_items').select('*').eq('master_id',current.id).order('sort_order'),
        supabase.from('bookings').select('id,slot_id,starts_at,ends_at,status,client_note,reference_image_url,client_telegram,proposed_price,master_message').eq('master_id',current.id).order('starts_at'),
        supabase.from('master_time_slots').select('*').eq('master_id',current.id) .gte('slot_date',localDate(new Date())).order('slot_date').order('starts_at')
      ])
      setServices(sv.data||[]);setWorks(pf.data||[]);setBookings(bk.data||[]);setSlots(sl.data||[])
      setError(sv.error?.message||pf.error?.message||bk.error?.message||sl.error?.message||'')
    }
    setLoading(false)
  }
  useEffect(()=>{let live=true;let channel=null;const start=async()=>{await load();if(!supabase||!user)return;const {data:current}=await supabase.from('masters').select('id').eq('user_id',user.id).maybeSingle();if(live&&current)channel=supabase.channel('master-bookings-'+current.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings',filter:'master_id=eq.'+current.id},()=>load()).subscribe()};start();const handler=()=>load();window.addEventListener('masterhub:master-created',handler);return()=>{live=false;window.removeEventListener('masterhub:master-created',handler);if(channel)supabase.removeChannel(channel)}},[user?.id])
  const uploadImage=async(file,kind)=>{
    if(!file||!master)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Поддерживаются только JPG, PNG и WebP.');return}
    if(file.size>5*1024*1024){setError('Максимальный размер фото — 5 МБ.');return}
    setUploading(true);setError('')
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
    const path=`${user.id}/${kind}-${crypto.randomUUID() }.${ext}`
    const {data,error:uploadError}=await supabase.storage.from('masterhub-media').upload(path,file,{contentType:file.type,upsert:false})
    if(uploadError){setError(uploadError.message);setUploading(false);return}
    const {data:publicData}=supabase.storage.from('masterhub-media').getPublicUrl(data.path)
    if(kind==='cover'){
      const {error:updateError}=await supabase.from('masters').update({cover_image_url:publicData.publicUrl}).eq('id',master.id)
      if(updateError)setError(updateError.message);else setMaster(old=>({...old,cover_image_url:publicData.publicUrl}))
    }else{
      const {error:insertError}=await supabase.from('portfolio_items').insert({master_id:master.id,image_path:publicData.publicUrl,caption:'',sort_order:works.length})
      if(insertError)setError(insertError.message);else await load()
    }
    setUploading(false)
  }
  const addService=async e=>{
    e.preventDefault();if(!master||!serviceTitle.trim())return
    const {error}=await supabase.from('services').insert({master_id:master.id,title:'Татуировка',price_from:Number(servicePrice||0),duration_minutes:Number(serviceDuration||120),is_active:true})
    if(error)setError(error.message);else{setServicePrice('');await load()}
  }
  const deleteService=async id=>{const {error}=await supabase.from('services').delete().eq('id',id);if(error)setError(error.message);else load()}
  const removeWork=async id=>{const {error}=await supabase.from('portfolio_items').delete().eq('id',id);if(error)setError(error.message);else load()}
  const addSlot=async e=>{
    e.preventDefault();if(!master)return
    if(endTime<=startTime){setError('Время окончания должно быть позже начала.');return}
    const start=new Date(`${selectedDate}T${startTime}:00`),end=new Date(`${selectedDate}T${endTime}:00`)
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
  const updateBooking=async(id,status)=>{const {error}=await supabase.from('bookings').update({status}).eq('id',id);if(error)setError(error.message);else load()}
  const sendPriceQuote=async()=>{if(!selectedBooking)return;const amount=Number(quotePrice);if(!Number.isFinite(amount)||amount<=0){setError('Укажи стоимость больше нуля.');return}setQuoteSaving(true);setError('');const {error}=await supabase.from('bookings').update({status:'price_proposed',proposed_price:amount,master_message:quoteMessage.trim().slice(0,300)}).eq('id',selectedBooking.id).eq('status','pending');setQuoteSaving(false);if(error){setError(error.message);return}setSelectedBooking(null);setQuotePrice('');setQuoteMessage('');await load()}
  const selectedSlots=slots.filter(s=>s.slot_date===selectedDate)
  const monthDays=useMemo(()=>{const d=new Date(selectedDate+'T12:00:00'),first=new Date(d.getFullYear(),d.getMonth(),1),offset=first.getDay();return Array.from({length:42},(_,i)=>new Date(first.getFullYear(),first.getMonth(),i-offset+1))},[selectedDate])
  const dayStatus=date=>{
    const key=localDate(date),daySlots=slots.filter(s=>s.slot_date===key)
    if(!daySlots.length)return ''
    const free=daySlots.filter(s=>s.is_active).length
    return free===0?'full':free===daySlots.length?'free':'partial'
  }
  return <>
    <header className="topbar"><div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div><div className="topbar-title"><strong>Кабинет мастера</strong><small>УПРАВЛЕНИЕ ПРОФИЛЕМ</small></div><button type="button" className="workspace-home-button" onClick={onBackToMenu}><House size={15}/> Меню</button></header>
    <main className="page-content master-workspace">
      {isAdmin&&<section className="role-preview-switch"><span className="eyebrow">РЕЖИМ ПРОСМОТРА · ТОЛЬКО ВЛАДЕЛЕЦ</span><div><button className={viewMode==="client"?"selected":""} onClick={()=>setViewMode("client")}>Я клиент</button><button className={viewMode==="master"?"selected":""} onClick={()=>setViewMode("master")}>Я мастер</button></div><small>Реальная роль администратора не меняется.</small></section>}
      {loading?<div className="empty-state">Загружаем кабинет…</div>:!master?<div className="workspace-empty"><BriefcaseBusiness size={30}/><h2>Профиль мастера ещё не создан</h2><p>Создай анкету, чтобы управлять фотографиями, свободными интервалами и записями.</p><button className="primary-button" onClick={onOpenRegistration}>Создать анкету мастера</button></div>:<>
        <div className="workspace-master-card"><div><span className="eyebrow">ТВОЯ АНКЕТА</span><h2>{master.public_name}</h2></div><span className={'status-pill '+master.status}>{master.status==='approved'?'Опубликована':master.status==='pending'?'На модерации':'Отклонена'}</span></div>
        <section className="workspace-section"><h3><ImagePlus size={17}/> Обложка профиля</h3>{master.cover_image_url&&<img className="master-cover-preview" src={master.cover_image_url} alt="Обложка профиля"/>}<label className="upload-control"><Upload size={16}/>{uploading?'Загружаем…':master.cover_image_url?'Заменить фотографию':'Загрузить фотографию'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>uploadImage(e.target.files?.[0],'cover')}/></label><p className="muted-note">Эта фотография будет показываться в карточке и в профиле мастера.</p></section>
        <section className="workspace-section"><h3><ImagePlus size={17}/> Работы / татуировки</h3><label className="upload-control"><Plus size={16}/> Добавить фото работы<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>uploadImage(e.target.files?.[0],'work')}/></label><div className="workspace-works">{works.map(w=><div key={w.id}><img src={w.image_path} alt={w.caption||'Работа мастера'}/><button onClick={()=>removeWork(w.id)}><Trash2 size={14}/></button></div>)}</div>{!works.length&&<p className="muted-note">Портфолио пока пустое.</p>}</section>
        <section className="workspace-section"><h3><BriefcaseBusiness size={17}/> Цена за татуировку</h3><form className="service-add-form" onSubmit={addService}><div className="fixed-service-label">Татуировка</div><div><input type="number" min="0" required value={servicePrice} onChange={e=>setServicePrice(e.target.value)} placeholder="Цена от, ₽"/><input type="number" min="15" step="15" value={serviceDuration} onChange={e=>setServiceDuration(e.target.value)} placeholder="Минут"/></div><button className="primary-button full-button">Добавить стоимость</button></form><div className="workspace-service-list">{services.map(s=><div key={s.id}><span>{s.title}<small>{s.duration_minutes} мин.</small></span><b>{money(s.price_from)}</b><button className="mini-delete" onClick={()=>deleteService(s.id)} aria-label="Удалить стоимость"><Trash2 size={14}/></button></div>)}</div></section>
        {master.status==='approved'&&(
        <section className="workspace-section"><h3><CalendarClock size={17}/> Календарь свободного времени</h3><div className="calendar-legend"><span><i className="free"/> Свободно</span><span><i className="partial"/> Частично</span><span><i className="full"/> Занято</span></div><div className="master-calendar-grid">{monthDays.map((d,i)=>{const key=localDate(d),sameMonth=d.getMonth()===new Date(selectedDate+'T12:00:00').getMonth();return <button key={i} className={`calendar-day ${sameMonth?'':'outside'} ${selectedDate===key?'chosen':''} ${dayStatus(d)}`} onClick={()=>setSelectedDate(key)}><span>{d.getDate()}</span>{dayStatus(d)&&<i/>}</button>})}</div><label className="date-input-label">Выбранная дата<input type="date" min={localDate(new Date())} value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label><form className="schedule-form" onSubmit={addSlot}><div><label>С <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label><label>До <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></label></div><button className="primary-button full-button"><Plus size={16}/> Добавить интервал</button></form><div className="slot-list">{selectedSlots.map(s=>{const booking=bookings.find(b=>b.slot_id===s.id&&['pending','price_proposed','confirmed'].includes(b.status));return <div key={s.id} className={!s.is_active?'slot-booked':''}><button type="button" className="slot-open-booking" disabled={!booking} onClick={()=>setSelectedBooking(booking)}><Clock3 size={14}/>{new Date(s.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} — {new Date(s.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} {!s.is_active?'· занято':'· свободно'}{booking&&<small> · открыть запись</small>}</button>{s.is_active&&<button onClick={()=>removeSlot(s)}><Trash2 size={14}/></button>}</div>})}</div>{!selectedSlots.length&&<p className="muted-note">На эту дату интервалы ещё не добавлены.</p>}<p className="muted-note">Добавляй отдельные окна: например, 11:00–13:00 и 15:00–18:00. Клиенты смогут записаться только на свободные окна.</p></section>
        )}
        <section className="workspace-section booking-inbox-section"><h3><CalendarDays size={17}/> Новые заявки <span className="count-chip">{bookings.filter(b=>b.status==='pending').length}</span></h3>{bookings.filter(b=>b.status==='pending').length?bookings.filter(b=>b.status==='pending').map(b=><button type="button" className="booking-inbox-card" key={b.id} onClick={()=>{setSelectedBooking(b);setQuotePrice('');setQuoteMessage('')}}><span className="booking-inbox-date">{new Date(b.starts_at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})} · {new Date(b.starts_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><b>{b.client_telegram||'Клиент Telegram не указан'}</b><span>{b.reference_image_url?'Есть референс':'Без референса'} · Открыть заявку</span></button>):<p className="muted-note">Новых заявок пока нет.</p>}{bookings.filter(b=>b.status==='price_proposed').length>0&&<div className="quote-waiting-list"><b>Ждём ответа клиента</b>{bookings.filter(b=>b.status==='price_proposed').map(b=><div key={b.id}><span>{new Date(b.starts_at).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}</span><strong>{new Intl.NumberFormat('ru-RU').format(Number(b.proposed_price||0))} ₽</strong></div>)}</div>}</section>
      </>}
      {selectedBooking&&<div className="modal-backdrop" onClick={()=>setSelectedBooking(null)}><section className="booking-detail-modal booking-negotiation-modal" onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setSelectedBooking(null)}><X size={20}/></button><span className="eyebrow">НОВАЯ ЗАЯВКА</span><h2>{new Date(selectedBooking.starts_at).toLocaleString('ru-RU',{dateStyle:'full',timeStyle:'short'})}</h2><p>{selectedBooking.client_note||'Татуировка'}</p>{selectedBooking.reference_image_url?<button type="button" className="open-reference-button" onClick={()=>setReferenceOpen(true)}><Eye size={17}/> Открыть референс</button>:<p className="muted-note">Клиент не прикрепил референс.</p>}{selectedBooking.client_telegram?<a className="telegram-contact-button" href={'https://t.me/'+encodeURIComponent(selectedBooking.client_telegram.trim().replace('@',''))} target="_blank" rel="noopener noreferrer"><Send size={16}/> Написать клиенту в Telegram</a>:<p className="contact-unavailable">Клиент не указал Telegram для связи.</p>}{selectedBooking.status==='pending'&&<div className="quote-editor"><label>ТВОЯ ЦЕНА, ₽<input type="number" min="1" step="1" value={quotePrice} onChange={e=>setQuotePrice(e.target.value)} placeholder="Например, 8 000"/></label><label>КОММЕНТАРИЙ К ЦЕНЕ<textarea value={quoteMessage} maxLength={300} onChange={e=>setQuoteMessage(e.target.value.slice(0,300))} placeholder="Что входит в стоимость, детали и условия…"/></label><button className="primary-button" disabled={quoteSaving} onClick={sendPriceQuote}>{quoteSaving?'Отправляем…':'Отправить цену клиенту'}</button><button className="reject-button quote-decline-button" onClick={()=>{updateBooking(selectedBooking.id,'declined');setSelectedBooking(null)}}>Отклонить заявку</button></div>}{selectedBooking.status==='price_proposed'&&<div className="quote-waiting-note"><b>Цена отправлена клиенту</b><strong>{new Intl.NumberFormat('ru-RU').format(Number(selectedBooking.proposed_price||0))} ₽</strong><p>{selectedBooking.master_message||'Ждём ответа клиента.'}</p></div>}{selectedBooking.status==='confirmed'&&<div className="quote-waiting-note"><b>Клиент согласился</b><strong>{new Intl.NumberFormat('ru-RU').format(Number(selectedBooking.proposed_price||0))} ₽</strong><button className="complete-booking" onClick={()=>{updateBooking(selectedBooking.id,'completed');setSelectedBooking(null)}}>Завершить запись</button></div>}</section></div>}{referenceOpen&&selectedBooking?.reference_image_url&&<div className="modal-backdrop reference-lightbox" onClick={()=>setReferenceOpen(false)}><button className="modal-close" onClick={()=>setReferenceOpen(false)}><X size={22}/></button><img src={selectedBooking.reference_image_url} alt="Референс клиента" onClick={e=>e.stopPropagation()}/></div>}{note&&<p className="muted-note">{note}</p>}{error&&<p className="auth-error">{error}</p>}
    </main>
  </>
}
