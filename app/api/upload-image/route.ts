import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // IBB API'sine yükle
    const ibbFormData = new FormData()
    ibbFormData.append('image', image)

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IBB_API_KEY}`, {
      method: 'POST',
      body: ibbFormData
    })

    const data = await response.json()
    
    if (data.success) {
      return NextResponse.json({ success: true, url: data.data.url })
    } else {
      return NextResponse.json({ success: false, error: 'IBB upload failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}
