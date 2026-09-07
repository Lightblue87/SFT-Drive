import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-sft-black text-sft-white">
      <Header />
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
