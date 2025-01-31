// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file received' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${uuidv4()}-${file.name}`
  const uploadDir = join(process.cwd(), 'public/uploads')
  
  // Ensure the upload directory exists
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = join(uploadDir, filename)

  try {
    const writeStream = createWriteStream(filePath)
    writeStream.write(buffer)
    writeStream.end()

    return NextResponse.json({ 
      success: true,
      filePath: `/uploads/${filename}`
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error saving file' }, { status: 500 })
  }
}