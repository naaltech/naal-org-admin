'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import CommonHeader from '@/components/common-header'
import { 
  ArrowLeft, 
  Award, 
  LogOut, 
  FileText, 
  Upload, 
  Trash2, 
  ExternalLink,
  Calendar,
  User,
  Search,
  Copy,
  Link
} from 'lucide-react'

interface DigitalCertificate {
  id: number
  created_at: string
  creator: string
  head: string
  given: string
  date: string
  file_id: string
  uploader_mail: string
}

interface PDFCertificate {
  id: number
  created_at: string
  pdf_link: string
  given: string
  from: string
  date: string
  uid: string
  cert_name: string
  uploader_mail: string
}

export default function CertificatesPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [digitalCerts, setDigitalCerts] = useState<DigitalCertificate[]>([])
  const [pdfCerts, setPdfCerts] = useState<PDFCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchCertificates()
    }
  }, [user, authLoading, router])

  const fetchCertificates = async () => {
    if (!user?.email) return

    try {
      let digitalData, pdfData, digitalError, pdfError
      if (user.email === 'admin@naal.org.tr') {
        // Admin: tüm sertifikaları getir
        const { data: digitalDataRaw, error: digitalErrorRaw } = await supabase
          .from('cert')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000)
        digitalData = digitalDataRaw
        digitalError = digitalErrorRaw
        const { data: pdfDataRaw, error: pdfErrorRaw } = await supabase
          .from('cert_pdf')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000)
        pdfData = pdfDataRaw
        pdfError = pdfErrorRaw
      } else {
        // Normal kullanıcı: sadece kendi yüklediklerini görür
        const { data: digitalDataRaw, error: digitalErrorRaw } = await supabase
          .from('cert')
          .select('*')
          .ilike('uploader_mail', `%${user.email.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(1000)
        digitalData = digitalDataRaw
        digitalError = digitalErrorRaw
        const { data: pdfDataRaw, error: pdfErrorRaw } = await supabase
          .from('cert_pdf')
          .select('*')
          .ilike('uploader_mail', `%${user.email.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(1000)
        pdfData = pdfDataRaw
        pdfError = pdfErrorRaw
      }

      if (digitalError) {
        console.error('Error fetching digital certificates:', digitalError)
        setMessage({ type: 'error', text: 'Dijital sertifikalar yüklenirken hata oluştu' })
      } else {
        setDigitalCerts(digitalData || [])
      }

      if (pdfError) {
        console.error('Error fetching PDF certificates:', pdfError)
        setMessage({ type: 'error', text: 'PDF sertifikalar yüklenirken hata oluştu' })
      } else {
        setPdfCerts(pdfData || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Sertifikalar yüklenirken hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  // Arama filtreleme işlevleri
  const filterDigitalCerts = (certs: DigitalCertificate[]) => {
    if (!searchTerm.trim()) return certs
    
    const term = searchTerm.toLowerCase()
    return certs.filter(cert => 
      cert.given.toLowerCase().includes(term) ||
      cert.creator.toLowerCase().includes(term) ||
      cert.head.toLowerCase().includes(term) ||
      cert.file_id.toLowerCase().includes(term)
    )
  }

  const filterPdfCerts = (certs: PDFCertificate[]) => {
    if (!searchTerm.trim()) return certs
    
    const term = searchTerm.toLowerCase()
    return certs.filter(cert => 
      cert.given.toLowerCase().includes(term) ||
      cert.from.toLowerCase().includes(term) ||
      cert.cert_name.toLowerCase().includes(term) ||
      cert.uid.toLowerCase().includes(term)
    )
  }

  const handleDeleteDigital = async (id: number) => {
    if (!confirm('Bu dijital sertifikayı silmek istediğinizden emin misiniz?')) return

    setDeleting(`digital-${id}`)
    try {
      let query = supabase
        .from('cert')
        .delete()
        .eq('id', id)

      // Admin değilse sadece kendi yüklediği sertifikaları silebilir
      if (user?.email !== 'admin@naal.org.tr') {
        query = query.ilike('uploader_mail', `%${user?.email?.trim()}%`)
      }

      const { error } = await query

      if (error) {
        console.error('Error deleting certificate:', error)
        setMessage({ type: 'error', text: 'Sertifika silinirken hata oluştu' })
      } else {
        setMessage({ type: 'success', text: 'Dijital sertifika başarıyla silindi' })
        setDigitalCerts(prev => prev.filter(cert => cert.id !== id))
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setDeleting(null)
    }
  }

  const handleDeletePDF = async (id: number) => {
    if (!confirm('Bu PDF sertifikayı silmek istediğinizden emin misiniz?')) return

    setDeleting(`pdf-${id}`)
    try {
      let query = supabase
        .from('cert_pdf')
        .delete()
        .eq('id', id)

      // Admin değilse sadece kendi yüklediği sertifikaları silebilir
      if (user?.email !== 'admin@naal.org.tr') {
        query = query.ilike('uploader_mail', `%${user?.email?.trim()}%`)
      }

      const { error } = await query

      if (error) {
        console.error('Error deleting certificate:', error)
        setMessage({ type: 'error', text: 'Sertifika silinirken hata oluştu' })
      } else {
        setMessage({ type: 'success', text: 'PDF sertifika başarıyla silindi' })
        setPdfCerts(prev => prev.filter(cert => cert.id !== id))
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setDeleting(null)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: 'success', text: `${type} linki panoya kopyalandı!` })
    } catch (error) {
      console.error('Clipboard error:', error)
      setMessage({ type: 'error', text: 'Link kopyalanırken hata oluştu' })
    }
  }

  // Sertifika linki oluşturucu
  const generateCertificateLink = (cert: DigitalCertificate | PDFCertificate, type: 'digital' | 'pdf') => {
    if (type === 'digital') {
      // file_id varsa onu kullan
      const fileId = (cert as DigitalCertificate).file_id
      return `https://naal.org.tr/certificates/${fileId}`
    } else {
      // uid varsa onu kullan
      const uid = (cert as PDFCertificate).uid
      return `https://naal.org.tr/certificates/${uid}`
    }
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-40"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
      </div>

      {/* Header */}
      <CommonHeader 
        title="Sertifikalarım"
        description="Dijital ve PDF sertifikalarınızı görüntüleyin ve yönetin"
        showBackButton={true}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6 backdrop-blur-sm bg-white/80 border border-gray-200/50">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <div className="mb-6 backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Sertifika ara... (isim, kulüp, UID)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
            />
          </div>
        </div>

        <Tabs defaultValue="digital" className="w-full">
          <TabsList className="grid w-full grid-cols-2 backdrop-blur-sm bg-white/80 border border-gray-200/50">
            <TabsTrigger value="digital" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Dijital Sertifikalar ({filterDigitalCerts(digitalCerts).length})
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              PDF Sertifikalar ({filterPdfCerts(pdfCerts).length})
            </TabsTrigger>
          </TabsList>

          {/* Digital Certificates Tab */}
          <TabsContent value="digital" className="space-y-4 mt-6">
            {filterDigitalCerts(digitalCerts).length === 0 ? (
              <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz dijital sertifika yok'}
                  </h3>
                  <p className="text-gray-600 text-center mb-4">
                    {searchTerm 
                      ? 'Arama kriterlerinizi değiştirip tekrar deneyin.'
                      : 'Dijital sertifika oluşturmak için sertifika oluşturma sayfasını ziyaret edin.'
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => router.push('/certificates/create')}
                      className="bg-gray-800 hover:bg-gray-900 text-white"
                    >
                      Sertifika Oluştur
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterDigitalCerts(digitalCerts).map((cert) => (
                  <div key={cert.id} className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-200">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{cert.head}</h3>
                      <p className="text-gray-600">{cert.creator}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>{cert.given}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(cert.date)}</span>
                      </div>
                      <div className="text-sm">
                        <Badge variant="outline">ID: {cert.file_id}</Badge>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateCertificateLink(cert, 'digital'), 'Sertifika')}
                          className="flex-1 bg-white/50 hover:bg-white/80"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Link Kopyala
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateCertificateLink(cert, 'digital'), '_blank')}
                          className="flex-1 bg-white/50 hover:bg-white/80"
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Aç
                        </Button>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDigital(cert.id)}
                          disabled={deleting === `digital-${cert.id}`}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deleting === `digital-${cert.id}` ? 'Siliniyor...' : 'Sil'}
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Oluşturuldu: {formatDate(cert.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PDF Certificates Tab */}
          <TabsContent value="pdf" className="space-y-4 mt-6">
            {filterPdfCerts(pdfCerts).length === 0 ? (
              <div className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz PDF sertifika yok'}
                  </h3>
                  <p className="text-gray-600 text-center mb-4">
                    {searchTerm 
                      ? 'Arama kriterlerinizi değiştirip tekrar deneyin.'
                      : 'PDF sertifika yüklemek için sertifika oluşturma sayfasını ziyaret edin.'
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => router.push('/certificates/create')}
                      className="bg-gray-800 hover:bg-gray-900 text-white"
                    >
                      Sertifika Oluştur
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterPdfCerts(pdfCerts).map((cert) => (
                  <div key={cert.id} className="backdrop-blur-sm bg-white/80 rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-200">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{cert.cert_name}</h3>
                      <p className="text-gray-600">{cert.from}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        <span>{cert.given}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(cert.date)}</span>
                      </div>
                      {cert.uid && (
                        <div className="text-sm">
                          <Badge variant="outline">UID: {cert.uid}</Badge>
                        </div>
                      )}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generateCertificateLink(cert, 'pdf'), 'Sertifika')}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Link Kopyala
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(generateCertificateLink(cert, 'pdf'), '_blank')}
                          className="flex-1 bg-white/50 hover:bg-white/80"
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Aç
                        </Button>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(cert.pdf_link, '_blank')}
                          className="flex-1 bg-white/50 hover:bg-white/80"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          PDF Görüntüle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePDF(cert.id)}
                          disabled={deleting === `pdf-${cert.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Yüklendi: {formatDate(cert.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
