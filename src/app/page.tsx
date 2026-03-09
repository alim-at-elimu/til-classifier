'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.from('batches').select('count')
      if (error) setStatus(`Error: ${error.message}`)
      else setStatus('Connected to Supabase. Tables ready.')
    }
    check()
  }, [])

  return (
    <main style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1>TIL RFP Classifier</h1>
      <p>Database: {status}</p>
    </main>
  )
}