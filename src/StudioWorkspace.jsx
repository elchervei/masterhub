
import { useEffect, useState } from 'react'
import {
  Building2, Users, Plus, Copy, LogOut, MapPin, Check, RefreshCw,
  BarChart3, CalendarCheck2, CalendarDays, UserRound, Settings,
  Crown, ArrowUpRight, Sparkles, X, ChevronLeft, ChevronRight, Clock3
} from 'lucide-react'

const categories = [
  {id:'tattoo',label:'Тату'},
  {id:'piercing',label:'Пирсинг'},
  {id:'nails',label:'Маникюр и ногти'},
  {id:'brows',label:'Брови и ресницы'},
  {id:'makeup',label:'Макияж'}
]
const categoryLabel = id => categories.find(item=>item.id===id)?.label || id || 'Мастер'
const plural = (n,one,few,many) => n%10===1&&n%100!==11?one:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?few:many
const count = n => new Intl.NumberFormat('ru-RU').format(Number(n)||0)
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const timeLabel = value => new Date(value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})

export default function StudioWorkspace({supabase,user,master,compact=false,onNavigate,onOpenMasterProfile}) {
  const [studio,setStudio]=useState(null)
  const [membershipRole,setMembershipRole]=useState('member')
  const [members,setMembers]=useState([])
  const [stats,setStats]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [joinCode,setJoinCode]=useState('')
  const [section,setSection]=useState('overview')
  const [draft,setDraft]=useState({name:'',categories:[master?.category||'tattoo'],description:'',city:master?.city||'Калининград',address:''})
  const [editing,setEditing]=useState(false)
  const [mediaUploading,setMediaUploading]=useState(false)
  const [calendarEntries,setCalendarEntries]=useState([])
  const [calendarLoading,setCalendarLoading]=useState(false)
  const [calendarError,setCalendarError]=useState('')
  const [calendarDate,setCalendarDate]=useState(dateKey(new Date()))
  const [calendarOffset,setCalendarOffset]=useState(0)
  const [calendarCategory,setCalendarCategory]=useState('all')
  const isOwner=studio?.owner_user_id===user?.id
  const isModerator=membershipRole==='moderator'
  const canInvite=isOwner||isModerator

  const load=async()=>{
    if(!supabase||!user||!master){setLoading(false);return}
    setLoading(true);setError('')
    try{
      const {data:membership,error:memberError}=await supabase.from('studio_members').select('studio_id,role').eq('master_id',master.id).maybeSingle()
      if(memberError)throw memberError
      if(!membership){setStudio(null);setMembers([]);setStats(null);setMembershipRole('member');setLoading(false);return}
      setMembershipRole(membership.role||'member')
      const {data:studioData,error:studioError}=await supabase.from('studios').select('*').eq('id',membership.studio_id).single()
      if(studioError)throw studioError
      setStudio(studioData)
      setDraft({
        name:studioData.name||'',
        categories:Array.isArray(studioData.categories)&&studioData.categories.length?studioData.categories:[studioData.category||master.category||'tattoo'],
        description:studioData.description||'',
        city:studioData.city||'Калининград',
        address:studioData.address||''
      })
      const [memberResult,statsResult]=await Promise.all([
        supabase.from('studio_members').select('master_id,role,created_at').eq('studio_id',studioData.id).order('created_at'),
        supabase.rpc('get_studio_dashboard_stats',{p_studio_id:studioData.id})
      ])
      if(memberResult.error)throw memberResult.error
      const ids=(memberResult.data||[]).map(row=>row.master_id)
      const {data:profiles,error:profilesError}=ids.length
        ?await supabase.from('masters').select('id,public_name,category,status,cover_image_url').in('id',ids)
        :{data:[],error:null}
      if(profilesError)throw profilesError
      setMembers((memberResult.data||[]).map(row=>({...row,master:(profiles||[]).find(item=>item.id===row.master_id)})))
      if(statsResult.error){setStats(null);setError('Команда загружена, но статистика пока недоступна: '+statsResult.error.message)}
      else setStats(statsResult.data||null)
    }catch(e){setError(e.message||'Не удалось загрузить студию.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[user?.id,master?.id])

  useEffect(()=>{
    if(!studio?.id||!user?.id)return
    let live=true
    let firstFetch=true
    const from=new Date();from.setHours(0,0,0,0)
    const to=new Date(from);to.setDate(to.getDate()+89)
    const fetchCalendar=async()=>{
      if(firstFetch)setCalendarLoading(true)
      const {data,error:calendarLoadError}=await supabase.rpc('get_studio_calendar',{
        p_studio_id:studio.id,p_from:dateKey(from),p_to:dateKey(to)
      })
      if(!live)return
      if(calendarLoadError){setCalendarError(calendarLoadError.message||'Не удалось загрузить календарь.');setCalendarEntries([])}
      else{setCalendarError('');setCalendarEntries(data||[])}
      setCalendarLoading(false)
      firstFetch=false
    }
    fetchCalendar()
    const channel=supabase.channel('studio-calendar-'+studio.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings'},fetchCalendar)
      .on('postgres_changes',{event:'*',schema:'public',table:'master_time_slots'},fetchCalendar)
      .subscribe()
    const poll=window.setInterval(fetchCalendar,15000)
    const onVisible=()=>{if(document.visibilityState==='visible')fetchCalendar()}
    document.addEventListener('visibilitychange',onVisible)
    return()=>{live=false;window.clearInterval(poll);document.removeEventListener('visibilitychange',onVisible);supabase.removeChannel(channel)}
  },[studio?.id,user?.id])

  const toggleCategory=(id)=>{
    setDraft(current=>{
      const selected=current.categories.includes(id)
      if(selected&&current.categories.length===1)return current
      return {...current,categories:selected?current.categories.filter(item=>item!==id):[...current.categories,id]}
    })
  }

  const createStudio=async e=>{
    e.preventDefault()
    if(!draft.name.trim()||saving||!draft.categories.length)return
    setSaving(true);setError('');setNotice('')
    try{
      const inviteCode=crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase()
      const {data:created,error:createError}=await supabase.from('studios').insert({
        owner_user_id:user.id,
        name:draft.name.trim().slice(0,80),
        category:draft.categories[0],
        categories:draft.categories,
        description:draft.description.trim().slice(0,500),
        city:draft.city.trim().slice(0,60)||'Калининград',
        address:draft.address.trim().slice(0,160)||null,
        invite_code:inviteCode
      }).select('*').single()
      if(createError)throw createError
      const {error:membershipError}=await supabase.from('studio_members').insert({studio_id:created.id,master_id:master.id,role:'owner'})
      if(membershipError)throw membershipError
      setSection('overview')
      window.dispatchEvent(new Event('masterhub:studio-membership-changed'))
      setNotice('Кабинет студии создан. Теперь можно управлять командой и смотреть статистику.')
      await load()
    }catch(e){setError(e.message||'Не удалось создать студию.')}
    finally{setSaving(false)}
  }

  const uploadStudioImage=async(file,kind)=>{
    if(!file||!studio||!isOwner)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Поддерживаются JPG, PNG и WebP.');return}
    if(file.size>5*1024*1024){setError('Максимальный размер фото — 5 МБ.');return}
    setMediaUploading(true);setError('');setNotice('')
    try{
      const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
      const path=`${user.id}/studios/${studio.id}/${kind}-${Date.now()}.${ext}`
      const {error:uploadError}=await supabase.storage.from('masterhub-media').upload(path,file,{contentType:file.type,upsert:true})
      if(uploadError)throw uploadError
      const {data}=supabase.storage.from('masterhub-media').getPublicUrl(path)
      const field=kind==='logo'?'logo_image_url':'cover_image_url'
      const {data:updated,error:updateError}=await supabase.from('studios').update({[field]:data.publicUrl}).eq('id',studio.id).select('*').single()
      if(updateError)throw updateError
      setStudio(updated);setNotice(kind==='logo'?'Логотип студии обновлён.':'Обложка студии обновлена.')
    }catch(e){setError(e.message||'Не удалось загрузить изображение.')}
    finally{setMediaUploading(false)}
  }

  const saveStudio=async e=>{
    e.preventDefault()
    if(!studio||!isOwner||saving||!draft.categories.length)return
    setSaving(true);setError('');setNotice('')
    const {data,error:updateError}=await supabase.from('studios').update({
      name:draft.name.trim().slice(0,80),
      category:draft.categories[0],
      categories:draft.categories,
      description:draft.description.trim().slice(0,500),
      city:draft.city.trim().slice(0,60)||'Калининград',
      address:draft.address.trim().slice(0,160)||null
    }).eq('id',studio.id).select('*').single()
    setSaving(false)
    if(updateError){setError(updateError.message);return}
    setStudio(data);setEditing(false);setNotice('Настройки студии сохранены.')
  }

  const join=async e=>{
    e.preventDefault()
    if(!joinCode.trim()||saving)return
    setSaving(true);setError('');setNotice('')
    const {error:joinError}=await supabase.rpc('join_studio_by_code',{p_code:joinCode.trim().toUpperCase()})
    setSaving(false)
    if(joinError){setError(joinError.message);return}
    setJoinCode('');window.dispatchEvent(new Event('masterhub:studio-membership-changed'));setNotice('Ты присоединился к студии.');await load()
  }

  const leave=async()=>{
    if(!studio||!master||isOwner)return
    if(!window.confirm('Выйти из команды этой студии?'))return
    const {error:leaveError}=await supabase.rpc('studio_remove_member',{p_studio_id:studio.id,p_master_id:master.id})
    if(leaveError)setError(leaveError.message)
    else{setStudio(null);setMembers([]);setStats(null);window.dispatchEvent(new Event('masterhub:studio-membership-changed'));setNotice('Ты вышел из команды.')}
  }

  const copyInvite=async()=>{
    try{await navigator.clipboard.writeText(studio.invite_code);setNotice('Код приглашения скопирован.')}
    catch{setNotice('Код приглашения: '+studio.invite_code)}
  }

  const refresh=async()=>{await load();setNotice('Данные студии обновлены.')}
  const changeMemberRole=async(member,nextRole)=>{if(!isOwner||member.role==='owner')return;const {error:roleError}=await supabase.rpc('studio_set_member_role',{p_studio_id:studio.id,p_master_id:member.master_id,p_role:nextRole});if(roleError){setError(roleError.message);return}setNotice(nextRole==='moderator'?'Мастеру выданы права модератора.':'Права модератора сняты.');await load()}
  const removeMember=async(member)=>{if(!canInvite||member.role==='owner')return;if(!window.confirm('Удалить '+(member.master?.public_name||'мастера')+' из студии?'))return;const {error:removeError}=await supabase.rpc('studio_remove_member',{p_studio_id:studio.id,p_master_id:member.master_id});if(removeError){setError(removeError.message);return}setNotice('Мастер удалён из команды.');await load()}
  const selectedCategories=Array.isArray(studio?.categories)&&studio.categories.length?studio.categories:[studio?.category||'tattoo']
  const statMembers=Array.isArray(stats?.members)?stats.members:[]
  const maxSessions=Math.max(1,...statMembers.map(item=>Number(item.sessions)||0))
  const calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth()+calendarOffset,1)
  const monthStart=new Date(calendarMonth);monthStart.setDate(1-((monthStart.getDay()+6)%7))
  const calendarDays=Array.from({length:42},(_,i)=>{const d=new Date(monthStart);d.setDate(d.getDate()+i);return d})
  const calendarCategories=[...new Set(members.map(item=>item.master?.category).filter(Boolean))]
  const categoryLabelForMaster=masterId=>categoryLabel(members.find(item=>item.master_id===masterId)?.master?.category)
  const filteredCalendarEntries=calendarCategory==='all'?calendarEntries:calendarEntries.filter(item=>members.find(member=>member.master_id===item.master_id)?.master?.category===calendarCategory)
  const dayEntries=filteredCalendarEntries.filter(item=>dateKey(new Date(item.starts_at))===calendarDate).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))
  const busyCount=dayEntries.filter(item=>item.entry_type==='busy').length
  const getDayState=day=>filteredCalendarEntries.some(item=>dateKey(new Date(item.starts_at))===dateKey(day))?'full':'empty'

  if(loading)return <section className="studio-workspace-card studio-loading"><RefreshCw size={17}/><p>Загружаем кабинет студии…</p></section>
  if(!master)return null

  if(compact&&studio)return <section className="studio-workspace-card studio-compact-card"><div className="studio-dashboard-head"><div className="studio-card-heading"><span className="studio-icon"><Building2 size={20}/></span><div><span className="eyebrow">ТВОЯ КОМАНДА</span><h3>{studio.name}</h3><p>{members.length} участников</p></div></div><button type="button" className="studio-open-link" onClick={()=>onNavigate?.('studio')}>Открыть <ArrowUpRight size={15}/></button></div></section>
  if(!studio)return <section className="studio-workspace-card studio-create-card">
    <div className="studio-card-heading">
      <span className="studio-icon"><Building2 size={20}/></span>
      <div><span className="eyebrow">MASTER HUB · STUDIO</span><h3>Создать кабинет студии</h3><p>Собери разные направления и мастеров в одном пространстве.</p></div>
    </div>
    <form className="studio-form" onSubmit={createStudio}>
      <label>Название студии<input required maxLength={80} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} placeholder="Например, Black Ritual"/></label>
      <div className="studio-category-picker">
        <div className="studio-field-heading"><b>Направления студии</b><small>Можно выбрать несколько</small></div>
        <div className="studio-category-grid">{categories.map(c=><button type="button" key={c.id} className={'studio-category-chip '+(draft.categories.includes(c.id)?'selected':'')} onClick={()=>toggleCategory(c.id)}><span>{draft.categories.includes(c.id)?<Check size={13}/>:<Plus size={13}/>}</span>{c.label}</button>)}</div>
      </div>
      <div className="studio-form-row"><label>Город<input value={draft.city} maxLength={60} onChange={e=>setDraft(v=>({...v,city:e.target.value}))}/></label><label>Адрес <span className="studio-optional">необязательно</span><input maxLength={160} value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))} placeholder="Улица и дом"/></label></div>
      <label>О студии<textarea rows="3" maxLength={500} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))} placeholder="Расскажи о студии, атмосфере и команде…"/></label>
      <button className="primary-button full-button" disabled={saving||!draft.categories.length}><Plus size={16}/>{saving?'Создаём…':'Создать кабинет студии'}</button>
    </form>
    <div className="studio-join-divider"><span>ИЛИ</span></div>
    <form className="studio-join-form" onSubmit={join}><label>Есть код приглашения от студии?<input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Например, A7K9Q2M4"/></label><button type="submit" className="secondary-button" disabled={saving}>Вступить</button></form>
    <p className="studio-footnote">Личный профиль мастера и портфолио останутся отдельными.</p>
    {error&&<p className="auth-error">{error}</p>}{notice&&<p className="studio-notice">{notice}</p>}
  </section>

  return <section className="studio-workspace-card studio-dashboard">
    <div className="studio-dashboard-head">
      <div className="studio-card-heading">
        <span className="studio-icon"><Building2 size={20}/></span>
        <div><span className="eyebrow">{isOwner?'STUDIO CONTROL · ВЛАДЕЛЕЦ':'STUDIO TEAM · УЧАСТНИК'}</span><h3>{studio.name}</h3><p><MapPin size={12}/> {studio.city}{studio.address?' · '+studio.address:''}</p></div>
      </div>
      <button type="button" className="studio-refresh" onClick={refresh} aria-label="Обновить данные"><RefreshCw size={15}/></button>
    </div>

    <div className="studio-category-tags">{selectedCategories.map(id=><span key={id}>{categoryLabel(id)}</span>)}</div>

    <nav className={`studio-section-nav ${isOwner?'has-settings':''}`}>
      <button type="button" className={section==='overview'?'selected':''} onClick={()=>setSection('overview')}><BarChart3 size={15}/>Обзор</button>
      <button type="button" className={section==='calendar'?'selected':''} onClick={()=>setSection('calendar')}><CalendarDays size={15}/>Календарь</button>
      <button type="button" className={section==='team'?'selected':''} onClick={()=>setSection('team')}><Users size={15}/>Команда <i>{members.length}</i></button>
      {isOwner&&<button type="button" className={section==='settings'?'selected':''} onClick={()=>setSection('settings')}><Settings size={15}/>Настройки</button>}
    </nav>

    {section==='overview'&&<div className="studio-overview">
      <div className="studio-section-intro"><div><span className="eyebrow">STUDIO ANALYTICS</span><h4>Показатели студии</h4></div><span>За всё время</span></div>
      <div className="studio-metrics-grid">
        <div className="studio-metric-card"><span><CalendarCheck2 size={15}/>Сеансы</span><b>{count(stats?.completed_sessions)}</b><small>Завершено</small></div>
        <div className="studio-metric-card"><span><UserRound size={15}/>Клиенты</span><b>{count(stats?.clients_served)}</b><small>Обслужено</small></div>
        <div className="studio-metric-card"><span><CalendarDays size={15}/>В этом месяце</span><b>{count(stats?.month_sessions)}</b><small>Завершённых сеансов</small></div>
        <div className="studio-metric-card"><span><ArrowUpRight size={15}/>Записи</span><b>{count(stats?.active_bookings)}</b><small>Ожидают или подтверждены</small></div>
      </div>

      <div className="studio-performance">
        <div className="studio-section-intro"><div><span className="eyebrow">TEAM PERFORMANCE</span><h4>Результаты мастеров</h4></div><span>{members.length} {plural(members.length,'участник','участника','участников')}</span></div>
        {statMembers.length?statMembers.map((item,index)=>{
          const member=members.find(row=>row.master_id===item.master_id)
          const ratio=Math.round((Number(item.sessions)||0)/maxSessions*100)
          return <div className="studio-performance-row" key={item.master_id}>
            <span className="studio-performance-rank">{index+1}</span>
            <span className="studio-performance-avatar">{member?.master?.cover_image_url?<img src={member.master.cover_image_url} alt=""/>:(item.name||'М').slice(0,1).toUpperCase()}</span>
            <div className="studio-performance-main"><div className="studio-performance-name"><b>{item.name||member?.master?.public_name||'Мастер'}</b><span>{count(item.sessions)} сеансов</span></div><div className="studio-performance-track"><i style={{width:ratio+'%'}}/></div><small>{count(item.clients)} {plural(Number(item.clients)||0,'клиент','клиента','клиентов')} · {count(item.month_sessions)} в этом месяце</small></div>
          </div>
        }):<div className="studio-empty-state"><BarChart3 size={22}/><b>Статистика появится здесь</b><span>Когда мастера начнут закрывать записи как завершённые, здесь появятся реальные показатели команды.</span></div>}
      </div>
      <div className="studio-insight-note"><Sparkles size={15}/><span>Сеанс попадает в статистику после того, как запись получает статус «Завершена». Клиенты считаются без повторов.</span></div>
    </div>}

    {section==='calendar'&&<div className="studio-calendar-section">
      <div className="studio-section-intro"><div><span className="eyebrow">SHARED SCHEDULE</span><h4>Общий график студии</h4></div><span>Все мастера</span></div>
      <div className="studio-calendar-category-filter"><label htmlFor="studio-calendar-category">Направление</label><select id="studio-calendar-category" value={calendarCategory} onChange={e=>setCalendarCategory(e.target.value)}><option value="all">Все направления</option>{calendarCategories.map(id=><option key={id} value={id}>{categoryLabel(id)}</option>)}</select></div>
      <div className="studio-calendar-month-head">
        <button type="button" aria-label="Предыдущий месяц" disabled={calendarOffset===0} onClick={()=>{setCalendarOffset(v=>Math.max(0,v-1));setCalendarDate(dateKey(new Date(new Date().getFullYear(),new Date().getMonth()+calendarOffset-1,1)))}}><ChevronLeft size={17}/></button>
        <b>{calendarMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</b>
        <button type="button" aria-label="Следующий месяц" disabled={calendarOffset>=1} onClick={()=>{setCalendarOffset(v=>Math.min(1,v+1));setCalendarDate(dateKey(new Date(new Date().getFullYear(),new Date().getMonth()+calendarOffset+1,1)))}}><ChevronRight size={17}/></button>
      </div>
      <div className="studio-calendar-grid">
        {['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(day=><span className="studio-calendar-weekday" key={day}>{day}</span>)}
        {calendarDays.map(day=>{const key=dateKey(day);const state=getDayState(day);const outside=day.getMonth()!==calendarMonth.getMonth();return <button type="button" key={key} disabled={outside} className={['studio-calendar-day',state,calendarDate===key?'selected':'',outside?'outside':''].filter(Boolean).join(' ')} onClick={()=>setCalendarDate(key)}><b>{day.getDate()}</b>{state!=='empty'&&<i/>}</button>})}
      </div>
      <div className="studio-calendar-legend"><span><i className="legend-full"/>Время зарезервировано за мастером</span></div>
      <div className="studio-calendar-summary"><b>{new Date(calendarDate+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</b><span><i className="busy-dot"/> {busyCount} интервалов зарезервировано</span></div>
      {calendarLoading?<div className="studio-calendar-empty">Обновляем расписание…</div>
      :calendarError?<div className="studio-calendar-empty studio-calendar-error">{calendarError}</div>
      :dayEntries.length?<div className="studio-calendar-agenda">{dayEntries.map(item=><article className={'studio-calendar-entry '+(item.entry_type==='busy'?'is-busy':'is-free')} key={item.entry_type+'-'+item.entry_id}>
        <div className="studio-calendar-time"><b>{timeLabel(item.starts_at)}</b><small>{timeLabel(item.ends_at)}</small></div>
        <span className="studio-calendar-entry-mark">{item.entry_type==='busy'?<Clock3 size={15}/>:<Check size={15}/>}</span>
        <div className="studio-calendar-entry-copy"><b>{item.entry_type==='busy'?'Занято мастером':'Свободное окно'}</b><small>{item.entry_type==='busy'?(item.master_name||'Мастер')+' · '+categoryLabelForMaster(item.master_id):'Окно доступно для записи'}</small></div>
        {item.entry_type==='busy'&&<span className="studio-calendar-status">ЗАНЯТО</span>}
      </article>)}</div>
      :<div className="studio-calendar-empty"><CalendarDays size={22}/><b>Пока свободно</b><span>На эту дату никто из мастеров пока не зарезервировал время в студии.</span></div>}
      <p className="studio-calendar-note">Календарь показывает интервалы всех мастеров студии. Расписания независимы: мастера могут работать одновременно, даже если время пересекается. Клиентские данные здесь не показываются.</p>
    </div>}

    {section==='team'&&<div className="studio-team-section">
      <div className="studio-section-intro"><div><span className="eyebrow">YOUR PEOPLE</span><h4>Команда студии</h4></div><span>{members.length} {plural(members.length,'мастер','мастера','мастеров')}</span></div>
      <div className="studio-team-list">{members.map(item=><div className="studio-team-member" key={item.master_id}>
        <span className="studio-member-avatar">{item.master?.cover_image_url?<img src={item.master.cover_image_url} alt=""/>:(item.master?.public_name||'M').slice(0,1).toUpperCase()}</span>
        <button type="button" className="studio-member-profile" onClick={()=>onOpenMasterProfile?.(item.master_id)} disabled={!item.master||item.master.status!=='approved'} aria-label={'Открыть профиль мастера '+(item.master?.public_name||'')}><span className="studio-member-copy"><b>{item.master?.public_name||'Мастер'}</b><small>{categoryLabel(item.master?.category)} · {item.role==='owner'?'Владелец':item.role==='moderator'?'Модератор':'Участник'}</small></span><span className="studio-profile-open">Профиль <ArrowUpRight size={13}/></span></button>
        <span className={'studio-role-tag '+(item.role==='owner'?'owner':item.role==='moderator'?'moderator':'')}>{item.role==='owner'?<><Crown size={12}/> ВЛАДЕЛЕЦ</>:item.role==='moderator'?'МОДЕРАТОР':'МАСТЕР'}</span>
        {(isOwner&&item.role!=='owner'||isModerator&&item.role==='member')&&<div className="studio-member-actions">{isOwner&&<button type="button" onClick={()=>changeMemberRole(item,item.role==='moderator'?'member':'moderator')}>{item.role==='moderator'?'Снять права':'Модератор'}</button>}<button type="button" className="studio-remove-member" onClick={()=>removeMember(item)}>Удалить</button></div>}
      </div>)}</div>
      {canInvite&&<div className="studio-invite-panel"><div><span className="eyebrow">INVITE TO STUDIO</span><b>Пригласить мастера</b><small>Отправь код — мастер введёт его в своём кабинете и появится в команде.</small></div><button type="button" className="studio-invite-code" onClick={copyInvite}>{studio.invite_code}<Copy size={14}/></button></div>}
      {!isOwner&&<button type="button" className="secondary-button studio-leave-button" onClick={leave}><LogOut size={15}/> Выйти из студии</button>}
    </div>}

    {section==='settings'&&isOwner&&<form className="studio-edit-form" onSubmit={saveStudio}>
      <div className="studio-section-intro"><div><span className="eyebrow">STUDIO PROFILE</span><h4>Настройки студии</h4></div></div>
      <div className="studio-media-editor">
        <div className="studio-media-cover">{studio.cover_image_url?<img src={studio.cover_image_url} alt="Обложка студии"/>:<span>ОБЛОЖКА СТУДИИ</span>}</div>
        <label className="upload-control"><Building2 size={15}/>{mediaUploading?'Загружаем…':'Загрузить обложку'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={mediaUploading} onChange={e=>uploadStudioImage(e.target.files?.[0],'cover')}/></label>
        <div className="studio-logo-editor">{studio.logo_image_url?<img src={studio.logo_image_url} alt="Логотип студии"/>:<span><Building2 size={22}/></span>}<label className="upload-control">{mediaUploading?'Загружаем…':'Логотип / аватар'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={mediaUploading} onChange={e=>uploadStudioImage(e.target.files?.[0],'logo')}/></label></div>
        <small>JPG, PNG или WebP · до 5 МБ. Эти изображения увидят клиенты на странице студии.</small>
      </div>
      <label>Название<input required maxLength={80} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label>
      <div className="studio-category-picker"><div className="studio-field-heading"><b>Направления</b><small>Можно выбрать несколько</small></div><div className="studio-category-grid">{categories.map(c=><button type="button" key={c.id} className={'studio-category-chip '+(draft.categories.includes(c.id)?'selected':'')} onClick={()=>toggleCategory(c.id)}><span>{draft.categories.includes(c.id)?<Check size={13}/>:<Plus size={13}/>}</span>{c.label}</button>)}</div></div>
      <div className="studio-form-row"><label>Город<input maxLength={60} value={draft.city} onChange={e=>setDraft(v=>({...v,city:e.target.value}))}/></label><label>Адрес<input maxLength={160} value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))}/></label></div>
      <label>Описание<textarea rows="4" maxLength={500} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))}/></label>
      <button className="primary-button full-button" disabled={saving||!draft.categories.length}>{saving?'Сохраняем…':'Сохранить настройки'}</button>
    </form>}

    {error&&<p className="auth-error">{error}</p>}{notice&&<p className="studio-notice">{notice}</p>}
  </section>
}
