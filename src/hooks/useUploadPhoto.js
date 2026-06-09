import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useUploadPhoto() {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function upload(file) {
    setUploadError(null)
    setUploading(true)
    try {
      const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('plant-photos').upload(path, file)
      if (error) throw error
      const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
      return data.publicUrl
    } catch (err) {
      setUploadError(err.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, uploadError }
}
