import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // dados ficam "frescos" por 5 minutos
      gcTime:    10 * 60 * 1000,   // cache é mantido por 10 minutos após o componente desmontar
      retry: 1,
      refetchOnWindowFocus: false,  // não rebusca ao volcar o foco na janela
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

