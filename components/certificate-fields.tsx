'use client'

import { useState } from 'react'
import { Accordion, AccordionItem, FileUploaderDropContainer, FileUploaderItem, FormGroup, Link, Stack, TextInput } from '@carbon/react'
import DateField from '@/components/date-field'
import { useToast } from '@/contexts/toast-context'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, uploadPdf } from '@/lib/upload'

export interface DigitalCertForm {
  creator: string
  head: string
  given: string
  date: string
  file_id: string
}

export interface PdfCertForm {
  from: string
  cert_name: string
  given: string
  date: string
  uid: string
  pdf_link: string
}

interface FieldsProps<T> {
  idPrefix: string
  value: T
  onChange: (value: T) => void
  /** Veren kurum boş bırakıldığında kullanılacak kulüp adı (yalnızca yer tutucu olarak gösterilir). */
  defaultIssuer?: string
  /** Oluşturma formunda ID boş bırakılabilir; düzenlemede zorunludur. */
  idOptional?: boolean
}

/** Oluşturmada otomatik gelen ID alanı katlanır bölümde durur; düzenlemede doğrudan görünür. */
function CertIdField({ id, value, onChange, optional }: { id: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
  const input = (
    <TextInput
      id={id}
      labelText="Sertifika ID"
      helperText={optional ? 'Boş bırakılırsa otomatik oluşturulur. Sertifika linkinde kullanılır.' : 'Sertifika linkinde kullanılır; değiştirmek eski linki geçersiz kılar.'}
      className="mono-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={!optional}
    />
  )
  if (!optional) return input
  return (
    <Accordion isFlush size="md">
      <AccordionItem title="Gelişmiş ayarlar">{input}</AccordionItem>
    </Accordion>
  )
}

export function DigitalCertFields({ idPrefix, value, onChange, defaultIssuer, idOptional }: FieldsProps<DigitalCertForm>) {
  const set = <K extends keyof DigitalCertForm>(key: K, v: DigitalCertForm[K]) => onChange({ ...value, [key]: v })

  return (
    <Stack gap={6}>
      <TextInput
        id={`${idPrefix}-head`}
        labelText="Sertifika başlığı"
        placeholder="Ör. React Eğitimi Katılım Sertifikası"
        value={value.head}
        onChange={(e) => set('head', e.target.value)}
        required
      />
      <TextInput
        id={`${idPrefix}-given`}
        labelText="Sertifikayı alan kişi"
        placeholder="Ad Soyad"
        value={value.given}
        onChange={(e) => set('given', e.target.value)}
        required
      />
      <div className="field-row">
        <DateField
          id={`${idPrefix}-date`}
          labelText="Sertifika tarihi"
          value={value.date}
          onChange={(v) => set('date', v)}
        />
        <TextInput
          id={`${idPrefix}-creator`}
          labelText="Veren kurum veya kişi"
          placeholder={defaultIssuer}
          helperText={idOptional && defaultIssuer ? 'Boş bırakılırsa kulüp adı kullanılır.' : undefined}
          value={value.creator}
          onChange={(e) => set('creator', e.target.value)}
        />
      </div>
      <CertIdField id={`${idPrefix}-file-id`} value={value.file_id} onChange={(v) => set('file_id', v)} optional={idOptional} />
    </Stack>
  )
}

export function PdfCertFields({ idPrefix, value, onChange, defaultIssuer, idOptional }: FieldsProps<PdfCertForm>) {
  const set = <K extends keyof PdfCertForm>(key: K, v: PdfCertForm[K]) => onChange({ ...value, [key]: v })

  return (
    <Stack gap={6}>
      <PdfUploadField id={`${idPrefix}-pdf`} value={value.pdf_link} onChange={(v) => set('pdf_link', v)} />
      <TextInput
        id={`${idPrefix}-cert-name`}
        labelText="Sertifika adı"
        placeholder="Ör. Web Geliştirme Bootcamp Sertifikası"
        value={value.cert_name}
        onChange={(e) => set('cert_name', e.target.value)}
        required
      />
      <TextInput
        id={`${idPrefix}-given`}
        labelText="Sertifikayı alan kişi"
        placeholder="Ad Soyad"
        value={value.given}
        onChange={(e) => set('given', e.target.value)}
        required
      />
      <div className="field-row">
        <DateField id={`${idPrefix}-date`} labelText="Sertifika tarihi" value={value.date} onChange={(v) => set('date', v)} />
        <TextInput
          id={`${idPrefix}-from`}
          labelText="Veren kurum veya kişi"
          placeholder={defaultIssuer}
          helperText={idOptional && defaultIssuer ? 'Boş bırakılırsa kulüp adı kullanılır.' : undefined}
          value={value.from}
          onChange={(e) => set('from', e.target.value)}
        />
      </div>
      <CertIdField id={`${idPrefix}-uid`} value={value.uid} onChange={(v) => set('uid', v)} optional={idOptional} />
    </Stack>
  )
}

interface PdfUploadFieldProps {
  id: string
  value: string
  onChange: (url: string) => void
}

/** Seçilen PDF'i hemen yükler ve dönen kalıcı URL'i forma yazar. */
function PdfUploadField({ id, value, onChange }: PdfUploadFieldProps) {
  const notify = useToast()
  const [file, setFile] = useState<{ name: string; status: 'uploading' | 'complete' | 'error'; error?: string } | null>(null)

  const handleFiles = async (files: File[]) => {
    const picked = files[0]
    if (!picked) return
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setFile({ name: picked.name, status: 'error', error: 'Yalnızca PDF dosyası yüklenebilir.' })
      return
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setFile({ name: picked.name, status: 'error', error: `Dosya en fazla ${MAX_UPLOAD_LABEL} olabilir.` })
      return
    }

    setFile({ name: picked.name, status: 'uploading' })
    try {
      onChange(await uploadPdf(picked))
      setFile({ name: picked.name, status: 'complete' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setFile({ name: picked.name, status: 'error', error: message })
      notify('error', 'PDF yüklenemedi', message)
    }
  }

  const clear = () => {
    setFile(null)
    onChange('')
  }

  return (
    <FormGroup legendText="PDF dosyası">
      <p className="helper" style={{ marginBottom: '0.75rem' }}>
        Yalnızca .pdf · en fazla {MAX_UPLOAD_LABEL}. Dosya yüklenir ve herkese açık linki sertifikaya eklenir.
      </p>
      {!value && file?.status !== 'uploading' && (
        <FileUploaderDropContainer
          id={id}
          accept={['application/pdf', '.pdf']}
          labelText="PDF'i buraya sürükleyin ya da seçmek için tıklayın"
          onAddFiles={(_event, { addedFiles }) => void handleFiles(addedFiles)}
        />
      )}
      {file && (
        <FileUploaderItem
          name={file.name}
          status={file.status === 'uploading' ? 'uploading' : 'edit'}
          iconDescription={file.status === 'uploading' ? 'Yükleniyor' : 'Dosyayı kaldır'}
          invalid={file.status === 'error'}
          errorSubject={file.error}
          onDelete={clear}
          size="md"
        />
      )}
      {value && (
        <p className="helper" style={{ marginTop: '0.5rem' }}>
          <Link href={value} target="_blank" rel="noopener noreferrer" size="sm" inline>
            Yüklenen PDF&apos;i aç
          </Link>
          {!file && (
            <>
              {' · '}
              <Link href="#" size="sm" inline onClick={(e) => (e.preventDefault(), clear())}>
                Başka bir PDF yükle
              </Link>
            </>
          )}
        </p>
      )}
    </FormGroup>
  )
}
