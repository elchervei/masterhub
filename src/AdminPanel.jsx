import { useEffect, useState } from 'react'
import { Check, X, ClipboardList, Clock3, Trash2, CalendarDays } from 'lucide-react'

const labels={tattoo:'Тату',nails:'Ногти',brows:'Брови и ресницы',piercing:'Пирсинг',makeup:'Макияж'}
const money=n=>new Intl.NumberFormat('ru-RU').format(n||0)+' ₽'

export default function AdminPanel({supabase,currentUserId}){
  const [realRows,setRealRows]=useState([]),[testRows,setTestRows]=useState([]),[bookings,setBookings]=useState([])
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState('pending')
  const [section,setSection]=useState('applications')
  const load=async()=>{
    setLoading(true);setError('')
    const [real,demo,bk]=await Promise.all([
      supabase.from('masters').select('id,user_id,public_name,category,bio,city,studio_name,experience_years,starting_price,contact_telegram,status,created_at').order('created_at',{ascending:false}),
      supabase.from('master_test_applications').select('*').order('created_at',{ascending:false}),
      supabase.from('bookings').select('id,starts_at,ends_at,status,client_note,reference_image_url,masters(public_name)').order('starts_at',{ascending:false})
    ])
    if(real.error||demo.error||bk.error)setError(real.error?.message||demo.error?.message||bk.error?.message||'Не удалось загрузить данные')
    setRealRows(real.data||[]);setTestRows(demo.data||[]);setBookings(bk.data||[]);setLoading(false)
  }
  useEffect(()=>{load()},[])
  const moderate=async(row,status)=>{const {error}=await supabase.from('masters').update({status}).eq('id',row.id);if(error)setError(error.message);else load()}
  const moderateTest=async(row,status)=>{const {error}=await supabase.from('master_test_applications').update({status}).eq('id',row.id);if(error)setError(error.message);else load()}
  const deleteApplication=async row=>{
    if(!row.isTest&&row.user_id===currentUserId){setError('Защита: собственный аккаунт администратора удалить отсюда нельзя.');return}
    if(row.isTest){if(!window.confirm(`Удалить тестовую анкету «${row.public_name}»?`))return;const {error}=await supabase.from('master_test_applications').delete().eq('id',row.id);if(error)setError(error.message);else load();return}
    const {count,error:countError}=await supabase.from('bookings').select('id',{count:'exact',head:true}).eq('master_id',row.id)
    if(countError){setError(countError.message);return}
    const warning=count?` Вместе с анкетой будут удалены связанные записи: ${count}.`:''
    if(!window.confirm(`Удалить реальную анкету мастера «${row.public_name}»?${warning} Сам Telegram-аккаунт останется, админский аккаунт защищён. Это действие нельзя отменить.`))return
    if(count){const {error:bookingError}=await supabase.from('bookings').delete().eq('master_id',row.id);if(bookingError){setError(bookingError.message);return}}
    const {error}=await supabase.from('masters').delete().eq('id',row.id).neq('user_id',currentUserId)
    if(error)setError(error.message);else load()
  }
  const deleteBooking=async row=>{
    if(!window.confirm('Удалить эту запись без возможности восстановления?'))return
    const {error}=await supabase.from('bookings').delete().eq('id',row.id)
    if(error)setError(error.message);else load()
  }
  const rows=[...realRows.map(row=>({...row,isTest:false})),...testRows.map(row=>({...row,isTest:true}))].filter(row=>filter==='all'||row.status===filter)
  const statusLabel=s=>s==='pending'?'На проверке':s==='approved'?'Одобрено':'Отклонено'
  return <>
    <header className="topbar"><div className="brand-mark"><span className="brand-symbol">M</span><span>MASTER <i>HUB</i></span></div><div className="topbar-title"><strong>Админ-панель</strong><small>УПРАВЛЕНИЕ ПЛОЩАДКОЙ</small></div><button className="icon-button" onClick={load}><Clock3 size={18}/></button></header>
    <main className="page-content admin-page">
      <div className="admin-stats"><div><b>{realRows.filter(r=>r.status==='pending').length}</b><small>Заявки на проверке</small></div><div><b>{realRows.filter(r=>r.status==='approved').length}</b><small>Опубликовано</small></div><div><b>{bookings.length}</b><small>Записей</small></div></div>
      <div className="admin-section-tabs"><button className={section==='applications'?'selected':''} onClick={()=>setSection('applications')}><ClipboardList size={15}/> Заявки ({realRows.length+testRows.length})</button><button className={section==='bookings'?'selected':''} onClick={()=>setSection('bookings')}><CalendarDays size={15}/> Записи ({bookings.length})</button></div>
      {error&&<p className="auth-error">{error}</p>}
      {loading?<div className="empty-state">Загружаем…</div>:section==='applications'?<>
        <div className="admin-toolbar"><div className="admin-filters">{[['pending','Новые'],['approved','Одобрены'],['rejected','Отклонены'],['all','Все']].map(([v,l])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{l}</button>)}</div></div>
        {!rows.length?<div className="empty-state"><ClipboardList size={30}/><b>Заявок нет</b><span>Здесь будут новые анкеты мастеров.</span></div>:<div className="admin-application-list">{rows.map(row=><article className="admin-application" key={(row.isTest?'demo-':'real-')+row.id}>
          <div className="admin-app-top"><div><span className="eyebrow">{row.isTest?'ТЕСТОВАЯ АНКЕТА':'ЗАЯВКА МАСТЕРА'}</span><h3>{row.public_name}</h3></div><span className={'status-pill '+row.status}>{statusLabel(row.status)}</span></div>
          <div className="admin-app-meta"><span>{labels[row.category]||row.category}</span><span>{row.city}</span><span>{row.experience_years||0} лет опыта</span><b>от {money(row.starting_price)}</b></div>
          {row.studio_name&&<p className="admin-app-studio">{row.studio_name}</p>}<p className="admin-app-bio">{row.bio}</p>{row.contact_telegram&&<p className="admin-app-contact">{row.contact_telegram}</p>}
          <div className="admin-app-actions">{row.status!=='approved'&&<button className="approve-button" onClick={()=>row.isTest?moderateTest(row,'approved'):moderate(row,'approved')}><Check size={15}/> Одобрить</button>}{row.status!=='rejected'&&<button className="reject-button" onClick={()=>row.isTest?moderateTest(row,'rejected'):moderate(row,'rejected')}><X size={15}/> Отклонить</button>}{(row.isTest||row.user_id!==currentUserId)&&<button className="admin-delete-button" onClick={()=>deleteApplication(row)}><Trash2 size={15}/> Удалить</button>}</div>
        </article>)}</div>}
      </>:!bookings.length?<div className="empty-state"><CalendarDays size={30}/><b>Записей пока нет</b><span>Все клиентские записи будут отображаться здесь.</span></div>:<div className="admin-application-list">{bookings.map(b=><article className="admin-application" key={b.id}><div className="admin-app-top"><div><span className="eyebrow">ЗАПИСЬ К МАСТЕРУ</span><h3>{b.masters?.public_name||'Мастер'}</h3></div><span className="status-pill">{b.status}</span></div><p className="admin-app-bio">{new Date(b.starts_at).toLocaleString('ru-RU',{dateStyle:'full',timeStyle:'short'})} — {new Date(b.ends_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</p><p className="admin-app-contact">{b.client_note||'Татуировка'}</p>{b.reference_image_url&&<div className="admin-booking-reference"><img src={b.reference_image_url} alt="Референс клиента" loading="lazy"/><span>Референс клиента</span></div>}<div className="admin-app-actions"><button className="admin-delete-button" onClick={()=>deleteBooking(b)}><Trash2 size={15}/> Удалить запись</button></div></article>)}</div>}
    </main>
  </>
}