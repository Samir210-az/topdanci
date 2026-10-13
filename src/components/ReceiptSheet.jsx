import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import SignaturePad from './SignaturePad'
import { Field } from './ui'
import { markReceiptSent, saveReceipt } from '../lib/actions'
import { fmtStamp, renderReceipt, shareReceipt } from '../lib/receiptPdf'
import { notify, reportError } from '../lib/events'
import { toDate } from '../lib/dates'

export default function ReceiptSheet({ open, sale, customer, onClose }) {
  const [signature, setSignature] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview])

  if (!sale) return null
  const saved = sale.receipt
  const sentTimes = (sale.receiptSent || []).map(toDate).sort((a, b) => a - b)

  function close() {
    setSignature(null)
    setName('')
    setPreview(null)
    onClose()
  }

  async function build(receipt, sentAt) {
    return renderReceipt(sale, {
      debt: receipt.debt,
      signature: receipt.signature,
      signedBy: receipt.signedBy,
      signedAt: receipt.signedAt,
      sentAt,
    })
  }

  async function show() {
    setBusy(true)
    try {
      const { jpeg } = await build(saved, sentTimes[sentTimes.length - 1])
      setPreview({ url: URL.createObjectURL(jpeg) })
    } catch (error) {
      reportError(error)
    } finally {
      setBusy(false)
    }
  }

  async function send(withSignature) {
    setBusy(true)
    try {
      let receipt = saved
      let sentAt
      if (saved) {
        sentAt = markReceiptSent({ sale })
      } else {
        const created = saveReceipt({
          sale,
          signature: withSignature ? signature : null,
          signedBy: name.trim(),
          debt: Math.max(customer.balance || 0, 0),
        })
        receipt = { ...created.receipt }
        sentAt = created.at
      }
      const { pdf } = await build(receipt, sentAt)
      const result = await shareReceipt(pdf, `qaime-${customer.name}`.replace(/\s+/g, '-'))
      if (result === 'downloaded') notify('PDF yükləndi', 'success')
    } catch (error) {
      reportError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title="Qaimə (PDF)" onClose={close}>
      {saved ? (
        <div className="stack">
          <p>
            Qaimə sistemdə saxlanılıb. {saved.signature ? 'Müştəri imza edib.' : 'İmza yoxdur, PDF-də qol çəkmə yeri var.'}
          </p>
          <p className="muted small">Göndərilib: {sentTimes.map(fmtStamp).join(', ')}</p>
          {preview && <img className="receipt-preview" src={preview.url} alt="Qaimənin görünüşü" />}
          <div className="form-grid">
            <button type="button" className="btn" disabled={busy} onClick={show}>
              Göstər
            </button>
            <button type="button" className="btn primary" disabled={busy} onClick={() => send(false)}>
              Yenidən göndər
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <p className="muted small">
            Müştəri imzasını barmaqla çəkə bilər. İmza çəkilməsə, PDF-də qələmlə imza üçün boş yer qalır. Qaimə və göndərilmə vaxtı sistemdə saxlanılır.
          </p>
          <Field label="Qəbul edənin adı (istəyə görə)">
            <input className="input" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
          </Field>
          <SignaturePad onChange={setSignature} />
          <button type="button" className="btn primary block" disabled={busy || !signature} onClick={() => send(true)}>
            İmzalı göndər
          </button>
          <button type="button" className="btn block" disabled={busy} onClick={() => send(false)}>
            İmzasız göndər
          </button>
        </div>
      )}
    </Sheet>
  )
}
