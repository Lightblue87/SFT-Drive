import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { Footer } from '@/components/Footer'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PullToRefresh } from '@/components/PullToRefresh'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-sft-black font-sans text-sft-white">
      <PullToRefresh />
      <OfflineBanner />
      <Header />
      <main className="flex-1" style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
        <Outlet />
        <Footer />
      </main>
      <BottomNav />
    </div>
  )
}
