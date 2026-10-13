import { collection, getDocsFromServer, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const OPERATIONS = ['sales', 'payments', 'stockMoves', 'purchases', 'supplierPayments']
const ALL = ['products', 'customers', 'suppliers', ...OPERATIONS]
const CHUNK = 400

async function commitAll(writes) {
  for (let i = 0; i < writes.length; i += CHUNK) {
    const batch = writeBatch(db)
    for (const write of writes.slice(i, i + CHUNK)) write(batch)
    await batch.commit()
  }
}

async function snapshotOf(name) {
  return (await getDocsFromServer(collection(db, name))).docs
}

export async function resetData(scope) {
  if (!navigator.onLine) throw new Error('offline')
  const writes = []

  for (const name of scope === 'all' ? ALL : OPERATIONS) {
    for (const d of await snapshotOf(name)) writes.push((batch) => batch.delete(d.ref))
  }

  if (scope !== 'all') {
    const resets = {
      customers: { balance: 0, holdings: {}, holdCost: {}, holdValue: {} },
      suppliers: { balance: 0, goods: {} },
      products: { stock: 0, lots: [] },
    }
    for (const [name, fields] of Object.entries(resets)) {
      for (const d of await snapshotOf(name)) writes.push((batch) => batch.update(d.ref, fields))
    }
  }

  await commitAll(writes)
  return writes.length
}
