import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSale, planSettle, planPayment, planCancel, LedgerError } from './ledger.js'
import { toQepik, fromQepik } from './money.js'

const item = (qty, price = 1000) => ({ productId: 'a', name: 'Çay', qty, price })

test('100 ₼ mal verilib, 50 ₼ ödənilib: borc 50 ₼', () => {
  const plan = planSale({ type: 'sale', items: [item(10)], paid: 5000, stockOf: { a: 40 } })
  assert.equal(plan.total, 10000)
  assert.equal(plan.fx.balance, 5000)
  assert.deepEqual(plan.fx.stock, { a: -10 })
  assert.deepEqual(plan.fx.holdings, {})
})

test('tam ödənilən satışda borc yaranmır', () => {
  const plan = planSale({ type: 'sale', items: [item(2)], paid: 2000, stockOf: { a: 5 } })
  assert.equal(plan.fx.balance, 0)
})

test('eyni mal iki sətirdə olanda anbar birlikdə yoxlanılır', () => {
  assert.throws(
    () => planSale({ type: 'sale', items: [item(3), item(3)], paid: 0, stockOf: { a: 5 } }),
    LedgerError,
  )
})

test('anbarda çatmayan mal satıla bilmir', () => {
  assert.throws(
    () => planSale({ type: 'sale', items: [item(6)], paid: 0, stockOf: { a: 5 } }),
    /kifayət qədər yoxdur/,
  )
})

test('ödənilən məbləğ cəmdən çox ola bilməz', () => {
  assert.throws(
    () => planSale({ type: 'sale', items: [item(1)], paid: 1001, stockOf: { a: 5 } }),
    LedgerError,
  )
})

test('satışa verilən malda borc yazılmır, mal müştəridə qalır', () => {
  const plan = planSale({ type: 'consign', items: [item(10)], stockOf: { a: 10 } })
  assert.equal(plan.fx.balance, 0)
  assert.equal(plan.paid, 0)
  assert.deepEqual(plan.fx.stock, { a: -10 })
  assert.deepEqual(plan.fx.holdings, { a: 10 })
})

test('satışa verilən malın hesablaşması: satılan borca, qaytarılan anbara yazılır', () => {
  const plan = planSettle({
    holdings: { a: 10 },
    sold: [item(6)],
    returned: [{ productId: 'a', name: 'Çay', qty: 3 }],
    paid: 2000,
  })
  assert.equal(plan.total, 6000)
  assert.equal(plan.fx.balance, 4000)
  assert.deepEqual(plan.fx.stock, { a: 3 })
  assert.deepEqual(plan.fx.holdings, { a: -9 })
})

test('müştəridə olandan çox mal həll edilə bilmir', () => {
  assert.throws(
    () => planSettle({ holdings: { a: 5 }, sold: [item(4)], returned: [{ productId: 'a', name: 'Çay', qty: 2 }] }),
    LedgerError,
  )
})

test('ödəniş borcu azaldır, sıfır və ya kəsr məbləğ qəbul edilmir', () => {
  assert.equal(planPayment({ amount: 3000 }).fx.balance, -3000)
  assert.throws(() => planPayment({ amount: 0 }), LedgerError)
  assert.throws(() => planPayment({ amount: 10.5 }), LedgerError)
})

test('satışın ləğvi anbarı və borcu geri qaytarır', () => {
  const plan = planSale({ type: 'sale', items: [item(10)], paid: 5000, stockOf: { a: 40 } })
  const undo = planCancel({ fx: plan.fx, stockOf: { a: 30 }, holdingsOf: {} })
  assert.deepEqual(undo.stock, { a: 10 })
  assert.equal(undo.balance, -5000)
})

test('satışa verilən mal müştəridə azalıbsa ləğv edilmir', () => {
  const plan = planSale({ type: 'consign', items: [item(10)], stockOf: { a: 10 } })
  assert.throws(
    () => planCancel({ fx: plan.fx, stockOf: { a: 0 }, holdingsOf: { a: 4 } }),
    /Ləğv etmək olmur/,
  )
  const undo = planCancel({ fx: plan.fx, stockOf: { a: 0 }, holdingsOf: { a: 10 } })
  assert.deepEqual(undo.holdings, { a: -10 })
  assert.deepEqual(undo.stock, { a: 10 })
})

test('həllin ləğvi qaytarılan mal artıq satılıbsa bloklanır', () => {
  const plan = planSettle({
    holdings: { a: 10 },
    sold: [item(6)],
    returned: [{ productId: 'a', name: 'Çay', qty: 3 }],
    paid: 6000,
  })
  assert.throws(() => planCancel({ fx: plan.fx, stockOf: { a: 1 }, holdingsOf: {} }), /Ləğv etmək olmur/)
  const undo = planCancel({ fx: plan.fx, stockOf: { a: 3 }, holdingsOf: {} })
  assert.deepEqual(undo.stock, { a: -3 })
  assert.deepEqual(undo.holdings, { a: 9 })
})

test('ödənişin ləğvi borcu geri artırır', () => {
  const undo = planCancel({ fx: planPayment({ amount: 2500 }).fx, stockOf: {}, holdingsOf: {} })
  assert.equal(undo.balance, 2500)
})

test('pul qəpiyə düzgün çevrilir', () => {
  assert.equal(toQepik('19,99'), 1999)
  assert.equal(toQepik('0.1') + toQepik('0.2'), 30)
  assert.equal(toQepik(''), 0)
  assert.equal(toQepik('1 250'), 125000)
  assert.equal(fromQepik(1999), '19.99')
})

test('alış: təchizatçıya borc ödənilməyən hissədir', async () => {
  const { planPurchase } = await import('./ledger.js')
  const plan = planPurchase({ items: [{ productId: 'a', name: 'Çay', qty: 10, cost: 500 }], paid: 2000 })
  assert.equal(plan.total, 5000)
  assert.equal(plan.fx.balance, 3000)
  assert.deepEqual(plan.fx.stock, { a: 10 })
})

test('alış: qiymət olmadan qəbul olunmur', async () => {
  const { planPurchase } = await import('./ledger.js')
  assert.throws(() => planPurchase({ items: [{ productId: 'a', name: 'Çay', qty: 1, cost: 0 }] }), LedgerError)
})

test('alış ləğv: mal artıq satılıbsa, ləğv olunmur', () => {
  assert.throws(
    () => planCancel({ fx: { stock: { a: 10 }, holdings: {}, balance: 5000 }, stockOf: { a: 4 }, holdingsOf: {} }),
    LedgerError,
  )
})
