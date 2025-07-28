"use client"

import { useEffect, useState } from "react"
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Settings, LogOut } from 'lucide-react'
import CommonHeader from '@/components/common-header'

interface Cert {
  id: number
  created_at: string
  creator: string
  head: string
  given: string
  date: string
  file_id: string
  uploader_mail: string
}

interface CertPdf {
  id: number
  created_at: string
  pdf_link: string
  given: string
  from: string
  date: string | null
  uid: string
  cert_name: string
  uploader_mail: string
}

type MessageType = {
  type: 'success' | 'error'
  text: string
}

type EditType = {
  type: 'cert' | 'cert_pdf'
  data: Cert | CertPdf
}

export default function ManageCertificates() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [certs, setCerts] = useState<Cert[]>([])
  const [certPdfs, setCertPdfs] = useState<CertPdf[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<MessageType | null>(null)
  const [editModal, setEditModal] = useState<{ open: boolean, edit: EditType | null }>({ open: false, edit: null })
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchData = async () => {
      if (!user) return;
      const mailFilter = user.email === 'admin@naal.org.tr' ? {} : { uploader_mail: user.email };
      const { data: certsData } = await supabase
        .from('cert')
        .select('*')
        .order('created_at', { ascending: false })
        .match(mailFilter);
      setCerts(certsData || []);
      const { data: certPdfsData } = await supabase
        .from('cert_pdf')
        .select('*')
        .order('created_at', { ascending: false })
        .match(mailFilter);
      setCertPdfs(certPdfsData || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Modal açıldığında formu doldur
  const openEditModal = (type: 'cert' | 'cert_pdf', data: Cert | CertPdf) => {
    setEditForm({ ...data })
    setEditModal({ open: true, edit: { type, data } })
  }

  // Kaydet (update)
  const handleSave = async () => {
    if (!editModal.edit) return
    setSaving(true)
    try {
      let error
      if (editModal.edit.type === 'cert') {
        const { id, creator, head, given, date, file_id } = editForm
        ;({ error } = await supabase
          .from('cert')
          .update({ creator, head, given, date, file_id })
          .eq('id', id)
        )
      } else {
        const { id, pdf_link, given, from, date, uid, cert_name } = editForm
        ;({ error } = await supabase
          .from('cert_pdf')
          .update({ pdf_link, given, from, date, uid, cert_name })
          .eq('id', id)
        )
      }
      if (error) {
        setMessage({ type: 'error', text: 'Güncelleme sırasında hata oluştu' })
      } else {
        setMessage({ type: 'success', text: 'Başarıyla güncellendi!' })
        setEditModal({ open: false, edit: null })
        // Listeyi güncelle
        setLoading(true)
        const mailFilter = user.email === 'admin@naal.org.tr' ? {} : { uploader_mail: user.email }
        const { data: certsData } = await supabase
          .from('cert')
          .select('*')
          .order('created_at', { ascending: false })
          .match(mailFilter)
        setCerts(certsData || [])
        const { data: certPdfsData } = await supabase
          .from('cert_pdf')
          .select('*')
          .order('created_at', { ascending: false })
          .match(mailFilter)
        setCertPdfs(certPdfsData || [])
        setLoading(false)
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  if (!user) return <div>Yükleniyor...</div>

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
        title="Sertifika Yönetimi"
        description="Sertifikalarınızı düzenleyin ve yönetin"
        showBackButton={true}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="backdrop-blur-sm bg-white/80 border border-gray-200/50 shadow-xl rounded-xl p-4 sm:p-5">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Sertifikalarım</h2>
            <p className="text-gray-600 text-sm">Tüm sertifikalarınızı buradan görüntüleyebilir ve düzenleyebilirsiniz</p>
          </div>
          
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4 sm:mb-5 backdrop-blur-sm bg-white/80 border border-gray-200/50">
              <AlertDescription className="text-sm">{message.text}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-600">Yükleniyor...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dijital Sertifikalar */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <div className="w-1.5 h-4 sm:h-5 bg-blue-500 rounded-full mr-2"></div>
                  Dijital Sertifikalar
                  <span className="ml-2 text-sm font-normal text-gray-500">({certs.length})</span>
                </h2>
                {certs.length === 0 ? (
                  <div className="backdrop-blur-sm bg-white/80 rounded-lg border border-gray-200/50 p-4 text-center">
                    <p className="text-gray-500 text-sm">Henüz dijital sertifika bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {certs.map(cert => (
                      <div 
                        key={cert.id} 
                        className="backdrop-blur-sm bg-white/80 rounded-lg border border-gray-200/50 p-3 sm:p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300/50"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 text-sm sm:text-base mb-2 line-clamp-2">{cert.head}</h3>
                              <div className="space-y-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs sm:text-sm text-gray-600">
                                  <span><strong>Alan:</strong> <span className="break-words">{cert.given}</span></span>
                                  <span><strong>Tarih:</strong> {cert.date}</span>
                                  <span className="sm:col-span-2"><strong>Veren:</strong> <span className="break-words">{cert.creator}</span></span>
                                </div>
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500"><strong>ID:</strong></span>
                                  <code className="block text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 mt-1 break-all font-mono">{cert.file_id}</code>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openEditModal('cert', cert)}
                              className="bg-white/70 hover:bg-white/90 border-gray-300 flex-shrink-0 text-xs px-2 py-1"
                            >
                              Düzenle
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PDF Sertifikalar */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <div className="w-1.5 h-4 sm:h-5 bg-red-500 rounded-full mr-2"></div>
                  PDF Sertifikalar
                  <span className="ml-2 text-sm font-normal text-gray-500">({certPdfs.length})</span>
                </h2>
                {certPdfs.length === 0 ? (
                  <div className="backdrop-blur-sm bg-white/80 rounded-lg border border-gray-200/50 p-4 text-center">
                    <p className="text-gray-500 text-sm">Henüz PDF sertifika bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {certPdfs.map(cert => (
                      <div 
                        key={cert.id} 
                        className="backdrop-blur-sm bg-white/80 rounded-lg border border-gray-200/50 p-3 sm:p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300/50"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 text-sm sm:text-base mb-2 line-clamp-2">{cert.cert_name || cert.given}</h3>
                              <div className="space-y-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs sm:text-sm text-gray-600">
                                  <span><strong>Alan:</strong> <span className="break-words">{cert.given}</span></span>
                                  <span><strong>Tarih:</strong> {cert.date || '-'}</span>
                                  <span className="sm:col-span-2"><strong>Veren:</strong> <span className="break-words">{cert.from}</span></span>
                                </div>
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500"><strong>UID:</strong></span>
                                  <code className="block text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 mt-1 break-all font-mono">{cert.uid}</code>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 justify-start">
                              {cert.pdf_link && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => window.open(cert.pdf_link, '_blank')}
                                  className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 text-xs px-2 py-1"
                                >
                                  PDF
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openEditModal('cert_pdf', cert)}
                                className="bg-white/70 hover:bg-white/90 border-gray-300 text-xs px-2 py-1"
                              >
                                Düzenle
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Düzenleme Modalı */}
      <Dialog open={editModal.open} onOpenChange={open => !open && setEditModal({ open: false, edit: null })}>
        <DialogContent className="backdrop-blur-sm bg-white/95 border border-gray-200/50 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sertifika Düzenle</DialogTitle>
          </DialogHeader>
          {editModal.edit && (
            <form onSubmit={e => { e.preventDefault(); handleSave() }} className="space-y-4">
              {editModal.edit.type === 'cert' ? (
                <>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Başlık</Label>
                    <Input 
                      value={editForm.head} 
                      onChange={e => setEditForm((f: any) => ({ ...f, head: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Alan Kişi</Label>
                    <Input 
                      value={editForm.given} 
                      onChange={e => setEditForm((f: any) => ({ ...f, given: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Tarih</Label>
                    <Input 
                      type="date" 
                      value={editForm.date} 
                      onChange={e => setEditForm((f: any) => ({ ...f, date: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Veren Kurum/Kişi</Label>
                    <Input 
                      value={editForm.creator} 
                      onChange={e => setEditForm((f: any) => ({ ...f, creator: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Sertifika ID</Label>
                    <Input 
                      value={editForm.file_id} 
                      onChange={e => setEditForm((f: any) => ({ ...f, file_id: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Ad</Label>
                    <Input 
                      value={editForm.given} 
                      onChange={e => setEditForm((f: any) => ({ ...f, given: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Sertifika Adı</Label>
                    <Input 
                      value={editForm.cert_name} 
                      onChange={e => setEditForm((f: any) => ({ ...f, cert_name: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">PDF Link</Label>
                    <Input 
                      value={editForm.pdf_link} 
                      onChange={e => setEditForm((f: any) => ({ ...f, pdf_link: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                      placeholder="https://example.com/certificate.pdf"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Veren Kurum/Kişi</Label>
                    <Input 
                      value={editForm.from} 
                      onChange={e => setEditForm((f: any) => ({ ...f, from: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Tarih</Label>
                    <Input 
                      type="date" 
                      value={editForm.date || ''} 
                      onChange={e => setEditForm((f: any) => ({ ...f, date: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium text-sm">Sertifika ID</Label>
                    <Input 
                      value={editForm.uid} 
                      onChange={e => setEditForm((f: any) => ({ ...f, uid: e.target.value }))} 
                      className="bg-white/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400 mt-1"
                    />
                  </div>
                </>
              )}
              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setEditModal({ open: false, edit: null })}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-gray-800 hover:bg-gray-900 text-white w-full sm:w-auto order-1 sm:order-2"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      </main>
    </div>
  )
} 