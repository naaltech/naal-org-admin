import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Catbox.moe'a yükleme için yeni FormData oluştur
    const catboxFormData = new FormData()
    catboxFormData.append('reqtype', 'fileupload')
    catboxFormData.append('fileToUpload', file)
    
    // Environment'tan userhash al
    const userHash = process.env.NEXT_PUBLIC_CATBOX_USERHASH
    if (userHash) {
      catboxFormData.append('userhash', userHash)
    }

    console.log('Uploading to Catbox:', { fileName: file.name, fileSize: file.size, hasUserHash: !!userHash })

    // Catbox.moe'a yükle
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: catboxFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Catbox error:', errorText)
      return NextResponse.json({ error: `Catbox upload failed: ${response.status}` }, { status: 500 })
    }

    const url = await response.text()
    const trimmedUrl = url.trim()

    console.log('Catbox response:', trimmedUrl)

    // URL doğrulama
    if (trimmedUrl && (trimmedUrl.startsWith('https://files.catbox.moe/') || trimmedUrl.startsWith('https://catbox.moe/') || trimmedUrl.includes('catbox'))) {
      return NextResponse.json({ url: trimmedUrl })
    } else {
      console.error('Invalid URL format:', trimmedUrl)
      return NextResponse.json({ error: `Invalid response from Catbox: ${trimmedUrl}` }, { status: 500 })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
