'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Settings, LogOut, Home } from 'lucide-react'

interface CommonHeaderProps {
  title: string
  description: string
  showBackButton?: boolean
}

export default function CommonHeader({ title, description, showBackButton = true }: CommonHeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const handleDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <header className="relative z-10 backdrop-blur-sm bg-white/80 shadow-lg border-b border-gray-200/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-0 sm:h-20 gap-4 sm:gap-0">
          {/* Sol Taraf - Sayfa Bilgileri */}
          <div className="flex items-center w-full sm:w-auto">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDashboard}
                className="mr-2 sm:mr-4 hover:bg-gray-100 transition-all duration-200 flex-shrink-0 hidden sm:flex"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span>Dashboard</span>
              </Button>
            )}
            <div className="p-2 sm:p-3 bg-gradient-to-br from-gray-800 to-gray-600 rounded-xl mr-3 sm:mr-4 shadow-lg flex-shrink-0">
              <Settings className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{description}</p>
            </div>
          </div>

          {/* Sağ Taraf - Kullanıcı Bilgileri ve İşlemler */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            {/* Kullanıcı Bilgileri */}
            <div className="flex items-center space-x-3 min-w-0 flex-1 sm:flex-none">
              <div className="text-right min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Giriş Yapan Hesap</p>
                <p className="text-xs sm:text-sm text-gray-600 truncate font-mono">{user?.email}</p>
              </div>
            </div>

            {/* İşlem Butonları */}
            <div className="flex items-center gap-2">
              {/* Dashboard Butonu (mobilde ayrı) */}
              {showBackButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDashboard}
                  className="border-gray-300 hover:bg-gray-50 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3 sm:hidden"
                >
                  <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>Dashboard</span>
                </Button>
              )}
              
              {/* Çıkış Butonu */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-gray-300 hover:bg-gray-50 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span>Çıkış Yap</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
