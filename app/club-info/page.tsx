'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, LogOut, Save, Settings } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CommonHeader from '@/components/common-header'

interface Club {
  id: number
  code: string
  title: string
  description: string
  instagram: string
  owners: string
  logo: string
  urls: string
}

export default function ClubInfoPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [allClubs, setAllClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instagram: [] as string[],
    owners: [] as string[],
    logo: '',
    urls: [] as string[]
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      if (user.email === 'admin@naal.org.tr') {
        // Admin: tüm kulüpleri çek
        fetchAllClubs()
      } else {
        fetchClubData()
      }
    }
  }, [user, authLoading, router])

  const fetchAllClubs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('title', { ascending: true })
      if (error) {
        setMessage({ type: 'error', text: 'Kulüpler yüklenirken hata oluştu' })
      } else if (data && data.length > 0) {
        setAllClubs(data)
        setSelectedClubId(data[0].id)
        // İlk kulübü seçili yap ve formu doldur
        fillFormWithClub(data[0])
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  const fillFormWithClub = (clubData: Club) => {
    setClub(clubData)
    const owners = clubData.owners ? clubData.owners.split(',').map((s: string) => s.trim()).filter((s: string) => s) : ['']
    const urls = clubData.urls ? clubData.urls.split(',').map((s: string) => s.trim()).filter((s: string) => s) : ['']
    const instagram = clubData.instagram ? clubData.instagram.split(',').map((s: string) => s.trim()).filter((s: string) => s) : ['']
    setFormData({
      title: clubData.title || '',
      description: clubData.description || '',
      instagram: instagram.length > 0 ? instagram : [''],
      owners: owners.length > 0 ? owners : [''],
      logo: clubData.logo || '',
      urls: urls.length > 0 ? urls : ['']
    })
  }

  // Admin kulüp seçince formu güncelle
  useEffect(() => {
    if (user?.email === 'admin@naal.org.tr' && allClubs.length > 0 && selectedClubId) {
      const found = allClubs.find(c => c.id === selectedClubId)
      if (found) fillFormWithClub(found)
    }
  }, [selectedClubId])

  const fetchClubData = async () => {
    try {
      // Kullanıcı email'ine göre club code'u belirle
      const userEmail = user?.email
      let clubCode = ''
      
      if (userEmail === 'tech@naal.org.tr') {
        clubCode = 'tech'
      } else {
        // Diğer kullanıcılar için email'den club code çıkar (@ öncesi)
        clubCode = userEmail?.split('@')[0] || ''
      }

      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('code', clubCode)
        .single()

      if (error) {
        console.error('Error fetching club:', error)
        setMessage({ type: 'error', text: 'Kulüp bilgileri yüklenirken hata oluştu' })
      } else if (data) {
        setClub(data)
        const owners = data.owners ? data.owners.split(',').map((s: string) => s.trim()).filter((s: string) => s) : ['']
        const urls = data.urls ? data.urls.split(',').map((s: string) => s.trim()).filter((s: string) => s) : ['']
        const instagram = data.instagram ? data.instagram.split(',').map((s: string) => s.trim()).filter((s: string) => s) : ['']
        
        setFormData({
          title: data.title || '',
          description: data.description || '',
          instagram: instagram.length > 0 ? instagram : [''],
          owners: owners.length > 0 ? owners : [''],
          logo: data.logo || '',
          urls: urls.length > 0 ? urls : ['']
        })
      } else {
        setMessage({ type: 'error', text: 'Kulüp bulunamadı' })
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  const uploadToIBB = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    
    if (data.success) {
      return data.url
    } else {
      throw new Error(data.error || 'IBB upload failed')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Dosya boyutu kontrolü (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Dosya boyutu 10MB\'dan küçük olmalıdır' })
      return
    }

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Sadece resim dosyaları yüklenebilir' })
      return
    }

    setUploadingLogo(true)
    try {
      const logoUrl = await uploadToIBB(file)
      setFormData(prev => ({ ...prev, logo: logoUrl }))
      setMessage({ type: 'success', text: 'Logo başarıyla yüklendi' })
    } catch (error) {
      console.error('Logo upload error:', error)
      setMessage({ type: 'error', text: 'Logo yüklenirken hata oluştu' })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!club) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          title: formData.title,
          description: formData.description,
          instagram: formData.instagram.filter(account => account.trim()).join(', '),
          owners: formData.owners.filter(owner => owner.trim()).join(', '),
          logo: formData.logo,
          urls: formData.urls.filter(url => url.trim()).join(', ')
        })
        .eq('id', club.id)

      if (error) {
        console.error('Error updating club:', error)
        setMessage({ type: 'error', text: 'Kaydetme sırasında hata oluştu' })
      } else {
        setMessage({ type: 'success', text: 'Kulüp bilgileri başarıyla güncellendi' })
        // Club state'ini de güncelle
        setClub({ 
          ...club, 
          ...formData,
          instagram: formData.instagram.filter(account => account.trim()).join(', '),
          owners: formData.owners.filter(owner => owner.trim()).join(', '),
          urls: formData.urls.filter(url => url.trim()).join(', ')
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

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
        title="Kulüp Bilgileri"
        description="Kulüp bilgilerinizi, logonuzu ve sosyal medya hesaplarınızı güncelleyin"
        showBackButton={true}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Admin için kulüp seçimi */}
        {user.email === 'admin@naal.org.tr' && allClubs.length > 0 && (
          <div className="mb-6">
            <Label>Kulüp Seç</Label>
            <Select value={selectedClubId?.toString()} onValueChange={val => setSelectedClubId(Number(val))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kulüp seçin" />
              </SelectTrigger>
              <SelectContent>
                {allClubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>{club.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {club && (
          <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Kulüp Bilgilerini Düzenle</h2>
              <p className="text-gray-600">
                {club.code.toUpperCase()} kulübünün bilgilerini buradan güncelleyebilirsiniz
              </p>
            </div>
            <div className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center space-x-4">
                  {formData.logo && (
                    <img 
                      src={formData.logo} 
                      alt="Club Logo" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={uploadingLogo}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo ? 'Yükleniyor...' : 'Logo Yükle'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Kulüp Adı</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Kulüp adını girin"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Kulüp hakkında açıklama yazın"
                  rows={4}
                />
              </div>

              {/* Owners */}
              <div className="space-y-2">
                <Label>Yöneticiler</Label>
                {formData.owners.map((owner, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={owner}
                      onChange={(e) => {
                        const newOwners = [...formData.owners]
                        newOwners[index] = e.target.value
                        setFormData(prev => ({ ...prev, owners: newOwners }))
                      }}
                      placeholder="Yönetici adını girin"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOwners = formData.owners.filter((_, i) => i !== index)
                        setFormData(prev => ({ ...prev, owners: newOwners }))
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, owners: [...prev.owners, ''] }))
                  }}
                >
                  + Yönetici Ekle
                </Button>
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label>Instagram Hesapları</Label>
                {formData.instagram.map((account, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={account}
                      onChange={(e) => {
                        const newInstagram = [...formData.instagram]
                        newInstagram[index] = e.target.value
                        setFormData(prev => ({ ...prev, instagram: newInstagram }))
                      }}
                      placeholder="Instagram kullanıcı adı"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newInstagram = formData.instagram.filter((_, i) => i !== index)
                        setFormData(prev => ({ ...prev, instagram: newInstagram.length > 0 ? newInstagram : [''] }))
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, instagram: [...prev.instagram, ''] }))}
                >
                  Instagram Hesabı Ekle
                </Button>
                <p className="text-sm text-gray-500">Örnek: tech_club, naal_tech</p>
              </div>

              {/* URLs */}
              <div className="space-y-2">
                <Label>Linkler</Label>
                {formData.urls.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...formData.urls]
                        newUrls[index] = e.target.value
                        setFormData(prev => ({ ...prev, urls: newUrls }))
                      }}
                      placeholder="Link girin"
                      type="url"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newUrls = formData.urls.filter((_, i) => i !== index)
                        setFormData(prev => ({ ...prev, urls: newUrls }))
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, urls: [...prev.urls, ''] }))
                  }}
                >
                  + Link Ekle
                </Button>
              </div>

              {/* Save Button */}
              <Button 
                onClick={handleSave} 
                disabled={saving} 
                className="w-full bg-gray-800 hover:bg-gray-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
