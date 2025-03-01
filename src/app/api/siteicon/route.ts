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
  // Use the original file name directly.
  const filename = file.name
  const uploadDir = join(process.cwd(), 'public/siteicon')
  
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = join(uploadDir, filename)

  try {
    const writeStream = createWriteStream(filePath)
    writeStream.write(buffer)
    writeStream.end()

    // Return only the filename for storage in the database.
    return NextResponse.json({ 
      success: true,
      fileName: filename 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error saving siteicon' }, { status: 500 })
  }
}
