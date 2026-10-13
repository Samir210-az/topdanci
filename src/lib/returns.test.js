import test from 'node:test'
import assert from 'node:assert/strict'
import { returnableQty } from './returns.js'

const line = (productId, qty) => ({ productId, qty })
const sales = [
  { id: 'a', customerId: 'c', type: 'sale', items: [line('p', 10)] },
  { id: 'b', customerId: 'c', type: 'consign', items: [line('p', 5)] },
  { id: 'c', customerId: 'c', type: 'settle', items: [line('p', 2)] },
  { id: 'd', customerId: 'c', type: 'return', items: [line('p', 4)] },
  { id: 'e', customerId: 'c', type: 'sale', canceled: true, items: [line('p', 99)] },
  { id: 'f', customerId: 'x', type: 'sale', items: [line('p', 7)] },
]

test('consign and canceled sales are not returnable, returns are subtracted', () => {
  assert.equal(returnableQty(sales, 'c', 'p'), 8)
  assert.equal(returnableQty(sales, 'c', 'q'), 0)
})

test('excluding a sale shows what is left if it were canceled', () => {
  assert.equal(returnableQty(sales, 'c', 'p', 'a'), -2)
})
