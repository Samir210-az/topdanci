import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyLots, lotsOf, takeOldest, unitCost } from './lots.js'

const stocked = { stock: 20, lots: [{ qty: 10, cost: 500, at: 1 }, { qty: 10, cost: 600, at: 2 }] }

test('satış əvvəlcə köhnə partiyadan çıxır', () => {
  const { taken, rest } = takeOldest(lotsOf(stocked), 12)
  assert.deepEqual(taken, [{ qty: 10, cost: 500, at: 1 }, { qty: 2, cost: 600, at: 2 }])
  assert.deepEqual(rest, [{ qty: 8, cost: 600, at: 2 }])
})

test('iki partiyadan çıxan malın vahid maya dəyəri orta çəkilidir', () => {
  const { taken } = takeOldest(lotsOf(stocked), 12)
  assert.equal(unitCost(taken), 517)
})

test('tək partiyadan çıxan malın maya dəyəri qarışmır', () => {
  const { taken } = takeOldest(lotsOf(stocked), 5)
  assert.equal(unitCost(taken), 500)
})

test('ləğv edəndə mal öz partiyasına qayıdır', () => {
  const { taken, rest } = takeOldest(lotsOf(stocked), 12)
  const restored = applyLots(rest, { inn: taken })
  assert.deepEqual(restored, [{ qty: 10, cost: 500, at: 1 }, { qty: 10, cost: 600, at: 2 }])
})

test('partiyası olmayan köhnə qalıq malın cari alış qiyməti ilə sayılır', () => {
  const lots = lotsOf({ stock: 7, cost: 400 })
  assert.deepEqual(lots, [{ qty: 7, cost: 400, at: 0 }])
})

test('qalıq partiyalardan azdırsa, ən yeni partiyadan kəsilir', () => {
  const lots = lotsOf({ stock: 15, lots: stocked.lots })
  assert.deepEqual(lots, [{ qty: 10, cost: 500, at: 1 }, { qty: 5, cost: 600, at: 2 }])
})

test('alış ləğv edəndə həmin partiya çıxarılır', () => {
  const after = applyLots(lotsOf(stocked), { out: [{ qty: 10, cost: 600, at: 2 }] })
  assert.deepEqual(after, [{ qty: 10, cost: 500, at: 1 }])
})
