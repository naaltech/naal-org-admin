import { supabase } from '@/lib/supabase'

// Sınırlar supabase/magazines.sql'deki bucket ayarlarıyla aynı olmalı.
const BUCKET = 'magazines'
export const MAX_MAGAZINE_BYTES = 50 * 1024 * 1024
export const MAX_MAGAZINE_LABEL = '50 MB'

/** Dergi yayımlayan kulüpler; sayfaları bu kulüplerin sitelerinde gösterilir. */
export const MAGAZINE_CLUBS = ['bilim'] as const

export function hasMagazine(clubCode: string): boolean {
  return (MAGAZINE_CLUBS as readonly string[]).includes(clubCode)
}

const COVER_WIDTH = 900

export function toRoman(value: number): string {
  const numerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let rest = value
  let result = ''
  for (const [amount, numeral] of numerals) {
    while (rest >= amount) {
      result += numeral
      rest -= amount
    }
  }
  return result
}

/** PDF'in ilk sayfasını kapak görseline çevirir (tarayıcı WebP üretemezse PNG). */
export async function renderPdfCover(file: File): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const doc = await task.promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: COVER_WIDTH / page.getViewport({ scale: 1 }).width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
    if (!blob) throw new Error('Kapak görseli oluşturulamadı.')
    return blob
  } finally {
    await task.destroy()
  }
}

/** Dosyayı `magazines/<kulüp kodu>/` altına yükler ve herkese açık URL'ini döndürür. */
export async function uploadMagazineFile(clubCode: string, name: string, file: Blob): Promise<string> {
  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'webp'
  // Her yüklemede yeni ad: CDN önbelleği eski dosyayı göstermesin.
  const path = `${clubCode}/${name}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** URL bu bucket'taki bir dosyaya aitse depolama yolunu döndürür (ör. sitenin kendi dosyaları için null). */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

/** Artık kullanılmayan dosyaları siler; başarısızlık yalnızca loglanır. */
export async function removeMagazineFiles(urls: (string | null | undefined)[]): Promise<void> {
  const paths = urls.map((url) => (url ? pathFromPublicUrl(url) : null)).filter((p): p is string => Boolean(p))
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) console.warn('Eski dergi dosyaları silinemedi:', error.message)
}
