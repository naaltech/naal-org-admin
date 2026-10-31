'use client'

import { useState } from 'react'
import { Modal, Select, SelectItem, Stack, TextInput } from '@carbon/react'
import { useToast } from '@/contexts/toast-context'
import { useClubs } from '@/hooks/use-clubs'
import { formatDate, todayISO } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { ClubForm } from '@/lib/types'

const FORM_ID_PATTERN = /^[A-Za-z0-9]+$/

/** Tally formunu kulübe bağlar; yalnızca süper yönetici görür. */
export default function LinkFormModal({ open, onClose, onLinked }: { open: boolean; onClose: () => void; onLinked: (form: ClubForm) => void }) {
  const notify = useToast()
  const { clubs } = useClubs()
  const [formId, setFormId] = useState('')
  const [clubCode, setClubCode] = useState('')
  const [title, setTitle] = useState('')
  const [since, setSince] = useState(todayISO)
  const [busy, setBusy] = useState(false)

  const club = clubCode || (clubs[0]?.code ?? '')
  const id = formId.trim()
  const valid = FORM_ID_PATTERN.test(id) && Boolean(club) && Boolean(title.trim()) && Boolean(since)

  const handleSubmit = async () => {
    setBusy(true)
    const { data, error } = await supabase
      .from('club_forms')
      .insert({ form_id: id, club_code: club, title: title.trim(), since })
      .select('form_id, club_code, title, since')
      .single()
    setBusy(false)
    if (error || !data) {
      notify('error', 'Form bağlanamadı', error?.code === '23505' ? 'Bu form zaten bağlı.' : error?.message)
      return
    }
    notify('success', 'Form bağlandı', `${formatDate(since)} tarihinden sonraki başvurular görünecek.`)
    setFormId('')
    setTitle('')
    onLinked(data as ClubForm)
  }

  return (
    <Modal
      open={open}
      modalHeading="Tally formu bağla"
      primaryButtonText={busy ? 'Bağlanıyor…' : 'Bağla'}
      secondaryButtonText="Vazgeç"
      primaryButtonDisabled={busy || !valid}
      onRequestClose={() => !busy && onClose()}
      onRequestSubmit={() => void handleSubmit()}
      size="sm"
    >
      <Stack gap={6}>
        <TextInput
          id="form-id"
          labelText="Form kimliği"
          helperText="Tally adresinin sonundaki kod, ör. tally.so/r/meMMLk için meMMLk."
          value={formId}
          onChange={(e) => setFormId(e.target.value)}
        />
        <Select id="form-club" labelText="Kulüp" value={club} onChange={(e) => setClubCode(e.target.value)}>
          {clubs.map((c) => (
            <SelectItem key={c.id} value={c.code ?? ''} text={c.title || (c.code ?? '')} />
          ))}
        </Select>
        <TextInput id="form-title" labelText="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextInput
          id="form-since"
          type="date"
          labelText="Başlangıç tarihi"
          helperText="Bu tarihten önceki başvurular panelde gösterilmez."
          value={since}
          onChange={(e) => setSince(e.target.value)}
        />
      </Stack>
    </Modal>
  )
}
