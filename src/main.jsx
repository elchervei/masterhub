import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const tg = window.Telegram?.WebApp
if (tg) {
  tg.ready()
  tg.expand()
  tg.setHeaderColor?.('#100d18')
  tg.setBackgroundColor?.('#100d18')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)