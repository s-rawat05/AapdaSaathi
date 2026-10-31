import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { APP_NAME } from '../utils/constants'

const CURRENT_YEAR = new Date().getFullYear()

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          © {CURRENT_YEAR} {APP_NAME} · Built for SAARTHI&apos;26 Hackathon
        </div>
      </footer>
    </div>
  )
}
