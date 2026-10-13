import { collection, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const OPERATIONS = ['sales', 'payments', 'stockMoves', 'purchases', 'supplierPayments']
const ALL = ['products', 'customers', 'suppliers', ...OPERATIONS]
const CHUNK = 300
const READ_TIMEOUT = 25000
const WRITE_TIMEOUT = 60000

function withTimeout(promise, ms, tag) {
  let timer
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(tag)), ms)
  })
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer))
}

export async function resetData(scope, onStep = () => {}) {
  if (!navigator.onLine) throw new Error('offline')
  const writes = []

  const reads = scope === 'all' ? ALL : OPERATIONS
  for (const [i, name] of reads.entries()) {
    onStep(`Oxunur: ${name} (${i + 1}/${reads.length})`)
    const snap = await withTimeout(getDocs(collection(db, name)), READ_TIMEOUT, `read:${name}`)
    for (const d of snap.docs) writes.push((batch) => batch.delete(d.ref))
  }

  if (scope !== 'all') {
    const resets = {
      customers: { balance: 0, holdings: {}, holdCost: {}, holdValue: {} },
      suppliers: { balance: 0, goods: {} },
      products: { stock: 0, lots: [] },
    }
    for (const [name, fields] of Object.entries(resets)) {
      onStep(`Oxunur: ${name}`)
      const snap = await withTimeout(getDocs(collection(db, name)), READ_TIMEOUT, `read:${name}`)
      for (const d of snap.docs) writes.push((batch) => batch.update(d.ref, fields))
    }
  }

  const chunks = Math.ceil(writes.length / CHUNK)
  for (let i = 0; i < chunks; i += 1) {
    onStep(`Silinir: ${i + 1}/${chunks}`)
    const batch = writeBatch(db)
    for (const write of writes.slice(i * CHUNK, (i + 1) * CHUNK)) write(batch)
    await withTimeout(batch.commit(), WRITE_TIMEOUT, 'write')
  }
  return writes.length
}
