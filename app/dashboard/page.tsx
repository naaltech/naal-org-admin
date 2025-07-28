"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Award, Settings, LogOut, Edit, Plus, Shield } from "lucide-react"
import CommonHeader from "@/components/common-header"

export default function Dashboard() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const isAdmin = user?.email === 'admin@naal.org.tr'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-200 rounded-full mix-blend-multiply filter blur-xl opacity-40"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-slate-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-zinc-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
      </div>

      {/* Header */}
      <CommonHeader 
        title={isAdmin ? 'Süper Yönetici Arayüzü' : 'Kulüp Yönetici Arayüzü'}
        description={isAdmin ? 'Nevzat Ayaz Etkileşim Ağı Sistem Yöneticisi' : 'Nevzat Ayaz Etkileşim Ağı Kulüp Yönetim Sistemi'}
        showBackButton={false}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Hoş Geldiniz</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Kulüp bilgilerinizi güncelleyin, sertifikalarınızı oluşturun ve URL'lerinizi yönetin.
          </p>
          <div className="mt-6 w-24 h-1 bg-gradient-to-r from-gray-400 to-gray-600 mx-auto rounded-full"></div>
        </div>

        {/* Admin Info Box */}
        {isAdmin && (
          <div className="mb-8 sm:mb-16">
            <Alert className="backdrop-blur-sm bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/60 shadow-xl max-w-5xl mx-auto rounded-2xl p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex-shrink-0 self-center sm:self-start">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center mb-4 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-blue-900">Süper Yönetici Yetkileriniz</h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Kısa Link Yönetimi</p>
                          <p className="text-xs text-blue-700">Tüm kulüplerin kısa linklerini yönetebilirsiniz</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Kulüp Bilgileri</p>
                          <p className="text-xs text-blue-700">Tüm kulüp bilgilerini düzenleyebilirsiniz</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Sertifika Yönetimi</p>
                          <p className="text-xs text-blue-700">Tüm sertifikaları görüntüleyebilir ve yönetebilirsiniz</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Sistem Yöneticisi</p>
                          <p className="text-xs text-blue-700">Sistem genelinde tam yönetici haklarına sahipsiniz</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {/* Stats Cards */}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Club Information */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl group-hover:text-blue-600 transition-colors">
                <div className="p-2 bg-blue-100 rounded-xl mr-4 group-hover:bg-blue-200 transition-colors">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                Kulüp Bilgileri
              </CardTitle>
              <CardDescription className="text-gray-600">
                Kulüp bilgilerinizi, logonuzu ve sosyal medya hesaplarınızı güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={() => router.push("/club-info")}
              >
                <Edit className="h-5 w-5 mr-2" />
                Bilgileri Güncelle
              </Button>
            </CardContent>
          </Card>

          {/* URL Shortener */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl group-hover:text-pink-600 transition-colors">
                <div className="p-2 bg-pink-100 rounded-xl mr-4 group-hover:bg-pink-200 transition-colors">
                  <Edit className="h-6 w-6 text-pink-600" />
                </div>
                URL Kısaltıcı
              </CardTitle>
              <CardDescription className="text-gray-600">
                Kulübünüz için özel kısa URL'ler oluşturun ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full h-12 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                variant="outline"
                onClick={() => router.push("/urls/manage")}
              >
                <Edit className="h-5 w-5 mr-2" />
                URL Yöneticisi
              </Button>
            </CardContent>
          </Card>

          {/* Certificate Management */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl group-hover:text-green-600 transition-colors">
                <div className="p-2 bg-green-100 rounded-xl mr-4 group-hover:bg-green-200 transition-colors">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                Sertifika Oluştur
              </CardTitle>
              <CardDescription className="text-gray-600">
                Kulüp üyeleriniz için sertifika oluşturun ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={() => router.push("/certificates/create")}
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Sertifika
              </Button>
            </CardContent>
          </Card>

          {/* My Certificates */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl group-hover:text-purple-600 transition-colors">
                <div className="p-2 bg-purple-100 rounded-xl mr-4 group-hover:bg-purple-200 transition-colors">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                Sertifikalarım
              </CardTitle>
              <CardDescription className="text-gray-600">
                Oluşturduğunuz sertifikaları görüntüleyin ve yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full h-12 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                variant="outline"
                onClick={() => router.push("/certificates")}
              >
                <Award className="h-5 w-5 mr-2" />
                Sertifikalarımı Gör
              </Button>
            </CardContent>
          </Card>

          {/* Manage Certificates (Edit) */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl group-hover:text-orange-600 transition-colors">
                <div className="p-2 bg-orange-100 rounded-xl mr-4 group-hover:bg-orange-200 transition-colors">
                  <Edit className="h-6 w-6 text-orange-600" />
                </div>
                Sertifika Düzenle
              </CardTitle>
              <CardDescription className="text-gray-600">
                Oluşturduğunuz veya yönettiğiniz sertifikaları düzenleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full h-12 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                variant="outline"
                onClick={() => router.push("/certificates/manage")}
              >
                <Edit className="h-5 w-5 mr-2" />
                Sertifikaları Düzenle
              </Button>
            </CardContent>
          </Card>

          {/* Email Merge Guide */}
          <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl group-hover:text-indigo-600 transition-colors">
                <div className="p-2 bg-indigo-100 rounded-xl mr-4 group-hover:bg-indigo-200 transition-colors">
                  <Award className="h-6 w-6 text-indigo-600" />
                </div>
                E-posta Birleştirme Rehberi
              </CardTitle>
              <CardDescription className="text-gray-600">
                E-posta hesaplarını birleştirme kılavuzu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={() => window.open("/email-merge-guide.pdf", "_blank")}
              >
                <Award className="h-5 w-5 mr-2" />
                Rehberi Görüntüle
              </Button>
            </CardContent>
          </Card>

          
        </div>

        {/* Quick Actions */}
      </main>
    </div>
  )
}
