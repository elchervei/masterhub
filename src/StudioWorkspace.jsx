import { useEffect, useState } from 'react'
import { Building2, Users, Plus, Copy, LogOut, MapPin, Check, RefreshCw } from 'lucide-react'

const categories = [{id:'tattoo',label:'Тату'},{id:'piercing',label:'Пирсинг'},{id:'nails',label:'Ногти'},{id:'brows',label:'Брови и ресницы'},{id:'makeup',label:'Макияж'}]

export default function StudioWorkspace({supabase,user,master}) {
  const [studio,setStudio]=useState(null)
  const [members,setMembers]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const [joinCode,setJoinCode]=useState('')
  const [draft,setDraft]=useState({name:'',category:master?.category||'tattoo',description:'',city:master?.city||'Калининград',address:''})
  const [editing,setEditing]=useState(false)
  const isOwner=studio?.owner_user_id===user?.id

  const load=async()=>{
    if(!supabase||!user||!master){setLoading(false);return}
    setLoading(true);setError('')
    try{
      const {data:membership,error:memberError}=await supabase.from('studio_members').select('studio_id,role').eq('master_id',master.id).maybeSingle()
      if(memberError)throw memberError
      if(!membership){setStudio(null);setMembers([]);setLoading(false);return}
      const {data:studioData,error:studioError}=await supabase.from('studios').select('*').eq('id',membership.studio_id).single()
      if(studioError)throw studioError
      setStudio(studioData)
      setDraft({name:studioData.name||'',category:studioData.category||master.category||'tattoo',description:studioData.description||'',city:studioData.city||'Калининград',address:studioData.address||''})
      const {data:rows,error:rowsError}=await supabase.from('studio_members').select('master_id,role,created_at').eq('studio_id',studioData.id).order('created_at')
      if(rowsError)throw rowsError
      const ids=(rows||[]).map(row=>row.master_id)
      const {data:profiles,error:profilesError}=ids.length?await supabase.from('masters').select('id,public_name,category,status,cover_image_url').in('id',ids):{data:[],error:null}
      if(profilesError)throw profilesError
      setMembers((rows||[]).map(row=>({...row,master:(profiles||[]).find(item=>item.id===row.master_id)})))
    }catch(e){setError(e.message||'Не удалось загрузить студию.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[user?.id,master?.id])
  const createStudio=async e=>{
    e.preventDefault();if(!draft.name.trim()||saving)return
    setSaving(true);setError('');setNotice('')
    try{
      const inviteCode=crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase()
      const {data:created,error:createError}=await supabase.from('studios').insert({owner_user_id:user.id,name:draft.name.trim().slice(0,80),category:draft.category,description:draft.description.trim().slice(0,500),city:draft.city.trim().slice(0,60)||'Калининград',address:draft.address.trim().slice(0,160)||null,invite_code:inviteCode}).select('*').single()
      if(createError)throw createError
      const {error:membershipError}=await supabase.from('studio_members').insert({studio_id:created.id,master_id:master.id,role:'owner'})
      if(membershipError)throw membershipError
      setStudio(created);setNotice('Кабинет студии создан. Теперь можно приглашать мастеров.');await load()
    }catch(e){setError(e.message||'Не удалось создать студию.')}
    finally{setSaving(false)}
  }
  const saveStudio=async e=>{
    e.preventDefault();if(!studio||!isOwner||saving)return
    setSaving(true);setError('');setNotice('')
    const {data,error:updateError}=await supabase.from('studios').update({name:draft.name.trim().slice(0,80),category:draft.category,description:draft.description.trim().slice(0,500),city:draft.city.trim().slice(0,60)||'Калининград',address:draft.address.trim().slice(0,160)||null}).eq('id',studio.id).select('*').single()
    setSaving(false)
    if(updateError){setError(updateError.message);return}
    setStudio(data);setEditing(false);setNotice('Информация о студии сохранена.')
  }
  const join=async e=>{
    e.preventDefault();if(!joinCode.trim()||saving)return
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
    if(leaveError)setError(leaveError.message);else{setStudio(null);setMembers([]);setNotice('Ты вышел из команды.')}
  }
  const copyInvite=async()=>{
    try{await navigator.clipboard.writeText(studio.invite_code);setNotice('Код приглашения скопирован.')}
    catch{setNotice('Код приглашения: '+studio.invite_code)}
  }

  if(loading)return <section className="studio-workspace-card"><p className="muted-note">Загружаем кабинет студии…</p></section>
  if(!master)return null
  if(!studio)return <section className="studio-workspace-card">
    <div className="studio-card-heading"><span className="studio-icon"><Building2 size={19}/></span><div><span className="eyebrow">MASTER HUB · КОМАНДА</span><h3>Кабинет студии</h3><p>Объедини мастеров под одним названием и управляй командой.</p></div></div>
    <form className="studio-form" onSubmit={createStudio}>
      <label>Название студии<input required maxLength={80} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} placeholder="Например, Black Ritual"/></label>
      <div className="studio-form-row"><label>Направление<select value={draft.category} onChange={e=>setDraft(v=>({...v,category:e.target.value}))}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Город<input value={draft.city} maxLength={60} onChange={e=>setDraft(v=>({...v,city:e.target.value}))}/></label></div>
      <label>Описание<textarea rows="3" maxLength={500} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))} placeholder="Расскажи о студии, атмосфере и команде…"/></label>
      <label>Адрес <span className="studio-optional">необязательно</span><input maxLength={160} value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))} placeholder="Улица и номер дома"/></label>
      <button className="primary-button full-button" disabled={saving}><Plus size={16}/>{saving?'Создаём…':'Создать кабинет студии'}</button>
    </form>
    <div className="studio-join-divider"><span>ИЛИ</span></div>
    <form className="studio-join-form" onSubmit={join}><label>Есть код приглашения от студии?<input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Например, A7K9Q2M4"/></label><button type="submit" className="secondary-button" disabled={saving}>Вступить</button></form>
    <p className="studio-footnote">Твой личный профиль мастера и портфолио останутся отдельными.</p>
    {error&&<p className="auth-error">{error}</p>}{notice&&<p className="muted-note">{notice}</p>}
  </section>

  return <section className="studio-workspace-card">
    <div className="studio-card-heading"><span className="studio-icon"><Building2 size={19}/></span><div><span className="eyebrow">{isOwner?'ВЛАДЕЛЕЦ СТУДИИ':'УЧАСТНИК КОМАНДЫ'}</span><h3>{studio.name}</h3><p><MapPin size={12}/> {studio.city}{studio.address?' · '+studio.address:''}</p></div></div>
    <div className="studio-stats-row"><div><b>{members.length}</b><span>В команде</span></div><div><b>{categories.find(c=>c.id===studio.category)?.label||'Услуги'}</b><span>Направление</span></div></div>
    <div className="studio-team-heading"><div><Users size={16}/><b>Команда</b></div><span>{members.length} {members.length===1?'мастер':members.length<5?'мастера':'мастеров'}</span></div>
    <div className="studio-team-list">{members.map(item=><div className="studio-team-member" key={item.master_id}><span className="studio-member-avatar">{item.master?.cover_image_url?<img src={item.master.cover_image_url} alt=""/>:(item.master?.public_name||'M').slice(0,1).toUpperCase()}</span><span><b>{item.master?.public_name||'Мастер'}</b><small>{item.role==='owner'?'Владелец студии':item.master?.category||'Участник'}</small></span>{item.role==='owner'&&<span className="studio-owner-tag">ВЛАДЕЛЕЦ</span>}</div>)}</div>
    {isOwner&&<div className="studio-invite-panel"><div><span className="eyebrow">ПРИГЛАШЕНИЕ В КОМАНДУ</span><b>Код для новых мастеров</b><small>Отправь его мастеру. Он введёт код в своём кабинете и появится в команде.</small></div><button type="button" className="studio-invite-code" onClick={copyInvite}>{studio.invite_code}<Copy size={14}/></button></div>}
    {(isOwner||editing)&&<form className="studio-edit-form" onSubmit={saveStudio}><div className="studio-team-heading"><b>Информация о студии</b>{!editing&&<button type="button" onClick={()=>setEditing(true)}>Изменить</button>}</div>{editing&&<><label>Название<input value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label><label>Описание<textarea rows="3" value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))}/></label><div className="studio-form-row"><label>Город<input value={draft.city} onChange={e=>setDraft(v=>({...v,city:e.target.value}))}/></label><label>Адрес<input value={draft.address} onChange={e=>setDraft(v=>({...v,address:e.target.value}))}/></label></div><button className="primary-button" disabled={saving}>{saving?'Сохраняем…':'Сохранить изменения'}</button><button type="button" className="secondary-button" onClick={()=>setEditing(false)}>Отмена</button></>}</form>}
    {!isOwner&&<button type="button" className="secondary-button studio-leave-button" onClick={leave}><LogOut size={15}/> Выйти из студии</button>}
    {studio.description&&<p className="studio-description">{studio.description}</p>}
    {error&&<p className="auth-error">{error}</p>}{notice&&<p className="muted-note">{notice}</p>}
  </section>
}
