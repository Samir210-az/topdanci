const bus = new EventTarget()

export function notify(message, kind = 'info') {
  bus.dispatchEvent(new CustomEvent('toast', { detail: { message, kind } }))
}

export function onToast(handler) {
  const listener = (event) => handler(event.detail)
  bus.addEventListener('toast', listener)
  return () => bus.removeEventListener('toast', listener)
}

export function reportError(error) {
  if (error?.name === 'LedgerError') {
    notify(error.message, 'error')
  } else if (error?.code === 'permission-denied') {
    notify('Məlumat yazılmadı: icazə yoxdur. Yenidən daxil ol və ya təhlükəsizlik qaydalarını yoxla.', 'error')
  } else {
    console.error(error)
    notify('Əməliyyat alınmadı. Bir az sonra yenidən yoxla.', 'error')
  }
}
