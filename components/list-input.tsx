'use client'

import { Button, FormGroup, IconButton, TextInput } from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'

interface ListInputProps {
  id: string
  legendText: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  addLabel: string
  helperText?: string
  type?: 'text' | 'url'
  /** Satır bazında doğrulama; hata metni döndürürse alan geçersiz gösterilir. */
  validate?: (value: string) => string | null
}

/** Veritabanında virgülle ayrılmış tutulan alanlar (yöneticiler, Instagram, linkler) için satır satır düzenleyici. */
export default function ListInput({
  id,
  legendText,
  values,
  onChange,
  placeholder,
  addLabel,
  helperText,
  type = 'text',
  validate,
}: ListInputProps) {
  // Her zaman en az bir boş satır göster.
  const rows = values.length > 0 ? values : ['']

  const update = (index: number, value: string) => onChange(rows.map((v, i) => (i === index ? value : v)))
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index))

  return (
    <FormGroup legendText={legendText}>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {rows.map((value, index) => {
          const error = value.trim() && validate ? validate(value.trim()) : null
          return (
            <div key={index} className="list-input__row">
              <TextInput
                id={`${id}-${index}`}
                labelText={`${legendText} ${index + 1}`}
                hideLabel
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e) => update(index, e.target.value)}
                invalid={Boolean(error)}
                invalidText={error ?? undefined}
              />
              <IconButton
                kind="ghost"
                label="Satırı kaldır"
                align="left"
                onClick={() => remove(index)}
                disabled={rows.length === 1 && !value}
              >
                <TrashCan />
              </IconButton>
            </div>
          )
        })}
      </div>
      {helperText && (
        <p className="helper" style={{ marginTop: '0.5rem' }}>
          {helperText}
        </p>
      )}
      <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => onChange([...rows, ''])} style={{ marginTop: '0.5rem' }}>
        {addLabel}
      </Button>
    </FormGroup>
  )
}
