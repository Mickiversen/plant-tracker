import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlantList } from './pages/PlantList'
import { PlantDetail } from './pages/PlantDetail'
import { AddPlant } from './pages/AddPlant'
import { subaseMisconfigured } from './lib/supabase'

const queryClient = new QueryClient()

export default function App() {
  if (subaseMisconfigured) {
    return (
      <div style={{ padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '20px', color: '#ef4444', marginBottom: '12px' }}>
          ⚠️ Missing Supabase environment variables
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your
          Vercel project settings, then redeploy.
        </p>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PlantList />} />
          <Route path="/plants/new" element={<AddPlant />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/plants/:id/edit" element={<AddPlant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
