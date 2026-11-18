import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@white55/a2ui-ui/tokens.css'
import { App } from './app/App'

const container = document.getElementById('root')
if (!container) throw new Error('缺少 #root 挂载点')

// 应用部署在 /a2ui 子路径下（与 vite.config.ts 的 base 一致）。
// basename 不能带尾部斜杠，否则 react-router 拼出的路径会出现 //。
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
