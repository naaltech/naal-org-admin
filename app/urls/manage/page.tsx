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
import { Edit, Trash2, Plus, Copy, ArrowLeft, Settings, LogOut } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CommonHeader from '@/components/common-header'

interface UrlRow {
  id: number
  created_at: string
  club_code: string
  path: string
  redirect: string
}

type MessageType = {
  type: 'success' | 'error'
  text: string
}

type EditType = {
  type: 'add' | 'edit'
  data: Partial<UrlRow>
}

export default function ManageUrls() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [urls, setUrls] = useState<UrlRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<MessageType | null>(null)
  const [modal, setModal] = useState<{ open: boolean, edit: EditType | null }>({ open: false, edit: null })
  const [form, setForm] = useState<Partial<UrlRow>>({})
  const [saving, setSaving] = useState(false)
  const [clubCodes, setClubCodes] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const fetchData = async () => {
      let filter = {}
      if (user.email !== 'admin@naal.org.tr') {
        // Kullanıcı kendi club_code'suna göre filtreler
        const clubCode = user.email?.split('@')[0]
        filter = { club_code: clubCode }
      }
      const { data } = await supabase
        .from('url')
        .select('*')
        .order('created_at', { ascending: false })
        .match(filter)
      setUrls(data || [])
      setLoading(false)
    }
    // clubs tablosundan code'ları çek
    const fetchClubCodes = async () => {
      const { data } = await supabase
        .from('clubs')
        .select('code')
        .order('code', { ascending: true })
      setClubCodes(data ? data.map((c: any) => c.code) : [])
    }
    fetchData()
    fetchClubCodes()
  }, [user])

  // Modal açıldığında formu doldur
  const openModal = (type: 'add' | 'edit', data: Partial<UrlRow> = {}) => {
    let club_code = data.club_code
    if (type === 'add' && user && user.email !== 'admin@naal.org.tr') {
      club_code = user.email?.split('@')[0]
    }
    setForm({ ...data, club_code })
    setModal({ open: true, edit: { type, data } })
  }

  // Kaydet (ekle/güncelle)
  const handleSave = async () => {
    setSaving(true)
    try {
      let error
      // URL validasyonu
      const isValidUrl = (url: string) => {
        try {
          const u = new URL(url)
          return u.protocol === 'http:' || u.protocol === 'https:'
        } catch {
          return false
        }
      }
      if (!form.redirect || !isValidUrl(form.redirect)) {
        setMessage({ type: 'error', text: 'Yönlendirme alanına geçerli bir link girin (http:// veya https:// ile başlamalı)' })
        setSaving(false)
        return
      }
      if (modal.edit?.type === 'add') {
        const { club_code, path, redirect } = form
        if (!club_code || !path || !redirect) {
          setMessage({ type: 'error', text: 'Tüm alanlar zorunlu!' })
          setSaving(false)
          return
        }
        const { error: insertError } = await supabase
          .from('url')
          .insert({ club_code, path, redirect })
        error = insertError
      } else if (modal.edit?.type === 'edit') {
        const { id, club_code, path, redirect } = form
        if (!id || !club_code || !path || !redirect) {
          setMessage({ type: 'error', text: 'Tüm alanlar zorunlu!' })
          setSaving(false)
          return
        }
        const { error: updateError } = await supabase
          .from('url')
          .update({ club_code, path, redirect })
          .eq('id', id)
        error = updateError
      }
      if (error) {
        setMessage({ type: 'error', text: 'Kayıt sırasında hata oluştu' })
      } else {
        setMessage({ type: 'success', text: 'Başarıyla kaydedildi!' })
        setModal({ open: false, edit: null })
        // Listeyi güncelle
        setLoading(true)
        let filter = {}
        if (user && user.email !== 'admin@naal.org.tr') {
          const clubCode = user.email?.split('@')[0]
          filter = { club_code: clubCode }
        }
        const { data } = await supabase
          .from('url')
          .select('*')
          .order('created_at', { ascending: false })
          .match(filter)
        setUrls(data || [])
        setLoading(false)
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  // Sil
  const handleDelete = async (id: number) => {
    if (!window.confirm('Silmek istediğinize emin misiniz?')) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('url')
        .delete()
        .eq('id', id)
      if (error) {
        setMessage({ type: 'error', text: 'Silme sırasında hata oluştu' })
      } else {
        setMessage({ type: 'success', text: 'Başarıyla silindi!' })
        setUrls(urls.filter(u => u.id !== id))
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  // Kopyala
  const handleCopy = (club_code: string, path: string) => {
    const shortUrl = `${club_code}.naal.org.tr/${path}`
    navigator.clipboard.writeText(shortUrl)
    setMessage({ type: 'success', text: 'Kısa URL kopyalandı!' })
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
        title="URL Kısaltıcı"
        description="Kısa URL'lerinizi oluşturun ve yönetin"
        showBackButton={true}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto py-8 px-4">
      <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-xl">
        <CardHeader>
          <CardTitle>URL Kısaltıcı</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModal('add')} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Yeni Kısa URL
            </Button>
          </div>
          {loading ? (
            <div>Yükleniyor...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Kulüp</th>
                  <th className="text-left py-1">Kısa URL</th>
                  <th className="text-left py-1">Yönlendirme</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {urls.map(url => (
                  <tr key={url.id} className="border-b">
                    <td>{url.club_code}</td>
                    <td>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {url.club_code}.naal.org.tr/{url.path}
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => handleCopy(url.club_code, url.path)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </td>
                    <td>
                      <a href={url.redirect} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {url.redirect}
                      </a>
                    </td>
                    <td className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => openModal('edit', url)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(url.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Ekle/Düzenle Modalı */}
      <Dialog open={modal.open} onOpenChange={open => !open && setModal({ open: false, edit: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal.edit?.type === 'add' ? 'Yeni Kısa URL' : 'Kısa URL Düzenle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleSave() }} className="space-y-4">
            <div>
              <Label>Kulüp Kodu</Label>
              {user.email === 'admin@naal.org.tr' ? (
                <Select value={form.club_code || ''} onValueChange={val => setForm(f => ({ ...f, club_code: val }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kulüp kodu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubCodes.map(code => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.club_code || ''} disabled />
              )}
            </div>
            <div>
              <Label>Kısa Path</Label>
              <Input value={form.path || ''} onChange={e => setForm(f => ({ ...f, path: e.target.value }))} />
            </div>
            <div>
              <Label>Yönlendirme (Uzun URL)</Label>
              <Input value={form.redirect || ''} onChange={e => setForm(f => ({ ...f, redirect: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  )
} 