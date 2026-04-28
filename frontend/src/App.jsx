import { useEffect, useMemo, useState } from 'react'
import './App.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

function App() {
  const [health, setHealth] = useState({ status: 'loading', detail: 'Consultando API...' })
  const healthUrl = useMemo(() => `${apiBaseUrl}/health`, [])

  useEffect(() => {
    const controller = new AbortController()

    async function checkApi() {
      try {
        const response = await fetch(healthUrl, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        setHealth({
          status: data.status === 'ok' ? 'online' : 'warning',
          detail: `API responde (${data.status ?? 'sin estado'})`,
        })
      } catch (error) {
        setHealth({
          status: 'offline',
          detail: `No se pudo conectar: ${error.message}`,
        })
      }
    }

    checkApi()
    return () => controller.abort()
  }, [healthUrl])

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 680, margin: '3rem auto', padding: '0 1rem' }}>
      <h1>Gestion Uno - Base Integrada</h1>
      <p>Verificacion de integracion Frontend + Laravel API.</p>
      <p><strong>Endpoint:</strong> {healthUrl}</p>
      <p>
        <strong>Estado API:</strong>{' '}
        {health.status === 'online' ? 'Online' : health.status === 'loading' ? 'Verificando...' : 'Offline'}
      </p>
      <p>{health.detail}</p>
    </main>
  )
}

export default App
