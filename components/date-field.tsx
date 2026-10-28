'use client'

import { DatePicker, DatePickerInput } from '@carbon/react'

interface DateFieldProps {
  id: string
  labelText: string
  /** YYYY-MM-DD; boş string tarih seçilmemiş demektir. */
  value: string
  onChange: (value: string) => void
  helperText?: string
  invalid?: boolean
  invalidText?: string
}

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Veritabanının `date` sütunlarıyla ISO string üzerinden konuşan Carbon tarih seçici. */
export default function DateField({ id, labelText, value, onChange, helperText, invalid, invalidText }: DateFieldProps) {
  return (
    <DatePicker
      datePickerType="single"
      dateFormat="d.m.Y"
      locale="tr"
      value={value ? new Date(`${value}T00:00:00`) : ''}
      onChange={([date]) => onChange(date ? toISODate(date) : '')}
    >
      <DatePickerInput
        id={id}
        labelText={labelText}
        placeholder="gg.aa.yyyy"
        helperText={helperText}
        invalid={invalid}
        invalidText={invalidText}
        size="md"
      />
    </DatePicker>
  )
}
