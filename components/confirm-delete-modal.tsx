'use client'

import { Modal } from '@carbon/react'

interface ConfirmDeleteModalProps {
  open: boolean
  heading: string
  /** Silinecek kaydı kullanıcıya tanıtan kısa metin. */
  children: React.ReactNode
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Tarayıcının `confirm()` penceresinin yerine kullanılan Carbon tehlike modalı. */
export default function ConfirmDeleteModal({ open, heading, children, busy, onClose, onConfirm }: ConfirmDeleteModalProps) {
  return (
    <Modal
      open={open}
      danger
      size="xs"
      modalHeading={heading}
      primaryButtonText={busy ? 'Siliniyor…' : 'Sil'}
      secondaryButtonText="Vazgeç"
      primaryButtonDisabled={busy}
      onRequestClose={onClose}
      onRequestSubmit={onConfirm}
    >
      <p>{children}</p>
      <p className="helper" style={{ marginTop: '1rem' }}>
        Bu işlem geri alınamaz.
      </p>
    </Modal>
  )
}
