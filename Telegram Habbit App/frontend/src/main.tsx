import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { mockTelegramEnv } from '@telegram-apps/sdk-react'

if (import.meta.env.DEV) {
  try {
    mockTelegramEnv({
      themeParams: {
        bg_color: '#0A0A0A',
        text_color: '#E0E2ED',
      },
      initData: {
        user: {
          id: 123456789,
          first_name: 'Dev',
          last_name: 'User',
          username: 'dev_user',
          language_code: 'en',
        },
        authDate: new Date(),
        hash: 'mock_hash_for_local_testing',
      },
      initDataRaw: new URLSearchParams({
        user: JSON.stringify({
          id: 123456789,
          first_name: 'Dev',
          last_name: 'User',
          username: 'dev_user',
          language_code: 'en',
        }),
        auth_date: Math.floor(Date.now() / 1000).toString(),
        hash: 'mock_hash_for_local_testing',
      }).toString()
    });
  } catch (e) {
    // Already mocked
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
