
import { useEffect, useState } from 'react'
import {
  Building2, Users, Plus, Copy, LogOut, MapPin, Check, RefreshCw,
  BarChart3, CalendarCheck2, CalendarDays, UserRound, Settings,
  Crown, ArrowUpRight, Sparkles, X
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

export default function StudioWorkspace({supabase,user,master}) {
  const [studio,setStudio]=useState(null)
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
  const isOwner=studio?.owner_user_id===user?.id

  const load=async()=>{
    if(!supabase||!user||!master){setLoading(false);return}
    setLoading(true);setError('')
    try{
      const {data:membership,error:memberError}=await supabase.from('studio_members').select('studio_id,role').eq('master_id',master.id).maybeSingle()
      if(memberError)throw memberError
      if(!membership){setStudio(null);setMembers([]);setStats(null);setLoading(false);return}
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
      setNotice('Кабинет студии создан. Теперь можно управлять командой и смотреть статистику.')
      await load()
    }catch(e){setError(e.message||'Не удалось создать студию.')}
    finally{setSaving(false)}
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
    setJoinCode('');setNotice('Ты присоединился к студии.');await load()
  }

  const leave=async()=>{
    if(!studio||!master||isOwner)return
    if(!window.confirm('Выйти из команды этой студии?'))return
    const {error:leaveError}=await supabase.from('studio_members').delete().eq('studio_id',studio.id).eq('master_id',master.id)
    if(leaveError)setError(leaveError.message)
    else{setStudio(null);setMembers([]);setStats(null);setNotice('Ты вышел из команды.')}
  }

  const copyInvite=async()=>{
    try{await navigator.clipboard.writeText(studio.invite_code);setNotice('Код приглашения скопирован.')}
    catch{setNotice('Код приглашения: '+studio.invite_code)}
  }

  const refresh=async()=>{await load();setNotice('Данные студии обновлены.')}
  const selectedCategories=Array.isArray(studio?.categories)&&studio.categories.length?studio.categories:[studio?.category||'tattoo']
  const statMembers=Array.isArray(stats?.members)?stats.members:[]
  const maxSessions=Math.max(1,...statMembers.map(item=>Number(item.sessions)||0))

  if(loading)return <section className="studio-workspace-card studio-loading"><RefreshCw size={17}/><p>Загружаем кабинет студии…</p></section>
  if(!master)return null

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

    <nav className="studio-section-nav">
      <button type="button" className={section==='overview'?'selected':''} onClick={()=>setSection('overview')}><BarChart3 size={15}/>Обзор</button>
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

    {section==='team'&&<div className="studio-team-section">
      <div className="studio-section-intro"><div><span className="eyebrow">YOUR PEOPLE</span><h4>Команда студии</h4></div><span>{members.length} {plural(members.length,'мастер','мастера','мастеров')}</span></div>
      <div className="studio-team-list">{members.map(item=><div className="studio-team-member" key={item.master_id}>
        <span className="studio-member-avatar">{item.master?.cover_image_url?<img src={item.master.cover_image_url} alt=""/>:(item.master?.public_name||'M').slice(0,1).toUpperCase()}</span>
        <span className="studio-member-copy"><b>{item.master?.public_name||'Мастер'}</b><small>{categoryLabel(item.master?.category)} · {item.role==='owner'?'Владелец':'Участник'}</small></span>
        {item.role==='owner'&&<span className="studio-owner-tag"><Crown size={12}/> ВЛАДЕЛЕЦ</span>}
      </div>)}</div>
      {isOwner&&<div className="studio-invite-panel"><div><span className="eyebrow">INVITE TO STUDIO</span><b>Пригласить мастера</b><small>Отправь код — мастер введёт его в своём кабинете и появится в команде.</small></div><button type="button" className="studio-invite-code" onClick={copyInvite}>{studio.invite_code}<Copy size={14}/></button></div>}
      {!isOwner&&<button type="button" className="secondary-button studio-leave-button" onClick={leave}><LogOut size={15}/> Выйти из студии</button>}
    </div>}

    {section==='settings'&&isOwner&&<form className="studio-edit-form" onSubmit={saveStudio}>
      <div className="studio-section-intro"><div><span className="eyebrow">STUDIO PROFILE</span><h4>Настройки студии</h4></div></div>
      <label>Название<input required maxLength={80} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label>
      <div className="studio-category-picker"><div className="studio-field-heading"><b>Направления</b><small>Можно выбрать несколько</small></div><div className="studio-category-grid">{categories.map(c=><button type="button" key={c.id} className={'studio-category-chip '+(draft.categories.includes(c.id)?'selected':'')} onClick={()=>toggleCategory(c.id)}><span>{draft.categories.includes(c.id)?<Check size={13}/>:<Plus size={13}/>}</span>{c.label}</button>)}</div></div>
      <div className="studio-form-row"><label>Город<input maxLength={60} value={draft.city} onChange={e=>setDraft(v=>({...v,city:e.target.value}))}/></label><label>Адрес<input maxLength={160} value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))}/></label></div>
      <label>Описание<textarea rows="4" maxLength={500} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))}/></label>
      <button className="primary-button full-button" disabled={saving||!draft.categories.length}>{saving?'Сохраняем…':'Сохранить настройки'}</button>
    </form>}

    {error&&<p className="auth-error">{error}</p>}{notice&&<p className="studio-notice">{notice}</p>}
  </section>
}
