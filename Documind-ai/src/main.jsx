import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Fonts ship with the app, so no request goes to a font service
import '@fontsource/anton'
import '@fontsource-variable/martian-mono/wdth.css'
import '@fontsource-variable/source-serif-4/opsz.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
)
