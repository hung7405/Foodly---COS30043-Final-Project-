/**
 * Concurrency + realtime test for the Foodly reservation/payment/rewards engine.
 *
 * Proves the atomicity fixes for:
 *   1. reserve        — N concurrent reserves on stock Q  => exactly Q wins, stock never negative
 *   2. confirmPayment — N concurrent confirms            => payment confirmed once, loyalty points awarded once
 *   3. dailySpin      — N concurrent spins (same user)   => exactly ONE winner (no double-claim)
 *   4. redeem         — N concurrent redeems, limited balance => never overspend (balance >= 0)
 *   5. like           — N distinct users like concurrently => counter increments exactly N (no lost update)
 *   6. realtime       — socket.io client receives deal:quantity + reservation:created on a live reserve
 *
 * Usage:
 *   npx ts-node scripts/test-concurrency.ts
 *
 * Env:
 *   API_BASE  (default http://localhost:3000/api)
 *   SOCKET_URL (default derived from API_BASE host + port)
 *   STOCK     (default 5)  — deal stock for reserve oversell test
 *   PARALLEL  (default 10) — concurrent request fan-out
 *   RUN       (default all) — comma list: reserve,payment,spin,redeem,like,realtime
 *   CLEANUP   (default 1)  — delete demo deals created by the run
 *
 * NOTE: the server applies a global throttler of 100 req/min per IP. Keep
 * PARALLEL modest and/or run against a local server to avoid 429s.
 */
import * as dotenv from 'dotenv'
import { io, Socket } from 'socket.io-client'
import { createClient } from '@supabase/supabase-js'
dotenv.config()

const API_BASE = (process.env.API_BASE || 'http://localhost:3000/api').replace(/\/+$/, '')
const API_HOST = new URL(API_BASE)
const SOCKET_URL = process.env.SOCKET_URL || `${API_HOST.protocol}//${API_HOST.host}`
const STOCK = Number(process.env.STOCK || 5)
const PARALLEL = Number(process.env.PARALLEL || 10)
const RUN = (process.env.RUN || 'all').toLowerCase().split(',').map((s) => s.trim())
const CLEANUP = process.env.CLEANUP !== '0'

const PASSWORD = 'Password123!'

let supabase: any = null
function db() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY required for DB verification')
    supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return supabase
}

let passCount = 0
let failCount = 0
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passCount++
    console.log(`  \x1b[32mPASS\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    failCount++
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

async function api(path: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  return { status: res.status, json }
}

function emailFor(tag: string, i: number) {
  return `concur.${tag}.${Date.now()}.${i}@foodly.test`
}

async function registerUser(tag: string, i: number) {
  const email = emailFor(tag, i)
  const username = `concur_${tag}_${Date.now().toString(36)}_${i}`
  const r = await api('/auth/register', {
    body: { email, username, password: PASSWORD, firstName: `Con`, lastName: `Test ${i}` },
  })
  if (r.status >= 400) throw new Error(`register failed (${r.status}): ${JSON.stringify(r.json)}`)
  const login = await api('/auth/login', { body: { email, password: PASSWORD } })
  return { email, token: login.json.token as string, userId: login.json.user?.id as string }
}

async function loginAs(email: string) {
  const r = await api('/auth/login', { body: { email, password: PASSWORD } })
  if (r.status >= 400) throw new Error(`login failed for ${email}: ${r.status}`)
  return r.json.token as string
}

async function createDeal(token: string, stock: number, tag: string) {
  const r = await api('/deals', {
    token,
    body: {
      title: `Concurrency ${tag} ${Date.now()}`,
      description: 'Concurrency/realtime test deal',
      originalPrice: 100000,
      discountPrice: 40000,
      remainingQuantity: stock,
      latitude: 10.8231,
      longitude: 106.6297,
      tags: ['concurrency', 'test'],
    },
  })
  if (r.status >= 400) throw new Error(`deal create failed (${r.status}): ${JSON.stringify(r.json)}`)
  return r.json.id as string
}

async function deleteDeal(token: string, dealId: string) {
  await api(`/deals/${dealId}`, { method: 'DELETE', token })
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------- 1. reserve
async function testReserve() {
  console.log('\n=== 1. RESERVE — oversell protection (CAS on version) ===')
  const merchant = await loginAs('merchant@foodly.app')
  const dealId = await createDeal(merchant, STOCK, 'reserve')
  console.log(`  Deal ${dealId} stock=${STOCK}, firing ${PARALLEL} concurrent reserves...`)

  const users = await Promise.all(Array.from({ length: PARALLEL }, (_, i) => registerUser('reserve', i)))

  const results = await Promise.all(
    users.map(async (u, i) => {
      await delay(i * 3)
      const r = await api(`/deals/${dealId}/reserve`, { method: 'POST', token: u.token })
      return { status: r.status, userId: u.userId }
    }),
  )

  const succeeded = results.filter((r) => r.status < 300).length
  const rejected = results.filter((r) => r.status >= 400).length

  const { data: deal } = await db().from('deals').select('remaining_quantity').eq('id', dealId).single()
  const remaining = Number(deal?.remaining_quantity ?? -1)

  check(`exactly ${STOCK} succeeded`, succeeded === STOCK, `got ${succeeded}`)
  check(`rest rejected (no oversell)`, rejected === PARALLEL - STOCK, `got ${rejected}`)
  check('stock never negative', remaining >= 0, `remaining=${remaining}`)

  if (CLEANUP) await deleteDeal(merchant, dealId)
}

// ---------------------------------------------------------------- 2. confirmPayment
async function testConfirmPayment() {
  console.log('\n=== 2. CONFIRM PAYMENT — idempotency + single loyalty award ===')
  const merchant = await loginAs('merchant@foodly.app')
  const dealId = await createDeal(merchant, 1, 'payment')
  const buyer = await registerUser('payment', 0)
  await api(`/deals/${dealId}/reserve`, { method: 'POST', token: buyer.token })

  const reservations = await api('/reservations', { token: buyer.token })
  const reservation = (reservations.json || []).find((r: any) => r.deal_id === dealId)
  if (!reservation) throw new Error('no reservation created')

  const pay = await api(`/payments/reservations/${reservation.id}/pay`, { method: 'POST', token: buyer.token })
  if (pay.status >= 400) throw new Error(`pay failed (${pay.status}): ${JSON.stringify(pay.json)}`)
  const paymentId = pay.json.id as string
  console.log(`  Payment ${paymentId} (status=${pay.json.status})`)

  const { data: before } = await db().from('users').select('reputation_points').eq('id', buyer.userId).single()
  const pointsBefore = Number(before?.reputation_points ?? 0)

  const confirms = await Promise.all(
    Array.from({ length: PARALLEL }, (_, i) =>
      api(`/payments/${paymentId}/confirm`, {
        method: 'PUT',
        token: buyer.token,
        body: { providerResponse: { mock: true, concurrent: true } },
      }).then((r) => ({ status: r.status, body: r.json })),
    ),
  )

  const ok = confirms.filter((c) => c.status < 300).length
  const allSuccessStatus = confirms.every((c) => c.status === 200 || c.status === 400)

  const { data: payment } = await db().from('payments').select('status, amount').eq('id', paymentId).single()
  const { data: reservationDb } = await db().from('reservations').select('status').eq('id', reservation.id).single()
  const { data: after } = await db().from('users').select('reputation_points').eq('id', buyer.userId).single()
  const pointsAfter = Number(after?.reputation_points ?? 0)
  const expectedPoints = Math.max(1, Math.round(Number(payment?.amount ?? 0) / 1000))
  const award = pointsAfter - pointsBefore

  check('all concurrent confirms idempotent (200)', ok === PARALLEL, `got ${ok}/${PARALLEL}`)
  check('payment ended SUCCESS', payment?.status === 'completed', `status=${payment?.status}`)
  check('reservation confirmed', reservationDb?.status === 'confirmed', `status=${reservationDb?.status}`)
  check('loyalty points awarded exactly once', award === expectedPoints, `awarded ${award}, expected ${expectedPoints}`)

  if (CLEANUP) await deleteDeal(merchant, dealId)
}

// ---------------------------------------------------------------- 3. dailySpin
async function testDailySpin() {
  console.log('\n=== 3. DAILY SPIN — single claim per user per day ===')
  const user = await registerUser('spin', 0)
  console.log(`  Firing ${PARALLEL} concurrent daily-spin for ${user.email}...`)

  const spins = await Promise.all(
    Array.from({ length: PARALLEL }, () => api('/rewards/daily-spin', { method: 'POST', token: user.token })),
  )

  const winners = spins.filter((s) => s.status < 300 && s.json?.alreadyUsed === false).length
  const alreadyUsed = spins.filter((s) => s.status < 300 && s.json?.alreadyUsed === true).length

  const { count } = await db()
    .from('activity_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.userId)
    .eq('event_type', 'daily_spin')

  check('exactly 1 winner', winners === 1, `winners=${winners}`)
  check(`rest read alreadyUsed`, alreadyUsed === PARALLEL - 1, `alreadyUsed=${alreadyUsed}`)
  check('only 1 daily_spin row persisted', Number(count) === 1, `rows=${count}`)
}

// ---------------------------------------------------------------- 4. redeem
async function testRedeem() {
  console.log('\n=== 4. REDEEM — CAS prevents overspend ===')
  const user = await registerUser('redeem', 0)
  // Seed a known balance directly in the DB for a deterministic test.
  await db().from('users').update({ reputation_points: 1000 }).eq('id', user.userId)

  const attempts = Math.floor(1000 / 400) + 1 // 3 redeems of 400 against 1000 -> only 2 fit
  console.log(`  Balance 1000, firing ${attempts} concurrent redeems of 400...`)

  const redeems = await Promise.all(
    Array.from({ length: attempts }, () =>
      api('/rewards/redeem', { method: 'POST', token: user.token, body: { points: 400 } }),
    ),
  )

  const succeeded = redeems.filter((r) => r.status < 300).length
  const { data: after } = await db().from('users').select('reputation_points').eq('id', user.userId).single()
  const balance = Number(after?.reputation_points ?? -1)

  check(`no overspend: successes <= floor(1000/400)`, succeeded <= 2, `successes=${succeeded}`)
  check('balance >= 0 and consistent', balance === 1000 - succeeded * 400, `balance=${balance}`)
}

// ---------------------------------------------------------------- 5. like
async function testLike() {
  console.log('\n=== 5. LIKE — atomic counter (no lost increment) ===')
  const merchant = await loginAs('merchant@foodly.app')
  const dealId = await createDeal(merchant, 1, 'like')
  const { data: before } = await db().from('deals').select('like_count').eq('id', dealId).single()
  const likeBefore = Number(before?.like_count ?? 0)

  const users = await Promise.all(Array.from({ length: PARALLEL }, (_, i) => registerUser('like', i)))
  console.log(`  Firing ${PARALLEL} concurrent likes from distinct users...`)

  const likes = await Promise.all(
    users.map((u, i) => {
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await api(`/deals/${dealId}/like`, { method: 'POST', token: u.token })
          resolve()
        }, i * 2)
      })
    }),
  )
  await new Promise((r) => setTimeout(r, 500)) // let increments settle

  const { data: after } = await db().from('deals').select('like_count').eq('id', dealId).single()
  const likeAfter = Number(after?.like_count ?? 0)

  check(`like_count incremented exactly ${PARALLEL}`, likeAfter === likeBefore + PARALLEL, `from ${likeBefore} to ${likeAfter}`)

  if (CLEANUP) await deleteDeal(merchant, dealId)
}

// ---------------------------------------------------------------- 6. realtime
async function testRealtime() {
  console.log('\n=== 6. REALTIME — socket.io deal events ===')
  const merchant = await loginAs('merchant@foodly.app')
  const dealId = await createDeal(merchant, STOCK, 'realtime')

  const listenerUser = await registerUser('realtime', 1)
  const reserverUser = await registerUser('realtime', 2)

  const socket: Socket = io(SOCKET_URL, {
    auth: { token: listenerUser.token },
    transports: ['websocket', 'polling'],
    reconnection: false,
  })

  const gotQuantity = new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 8000)
    socket.on('deal:quantity', (evt: any) => {
      if (evt?.id === dealId) { clearTimeout(t); resolve(true) }
    })
  })
  const gotReservation = new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 8000)
    socket.on('reservation:created', (evt: any) => {
      if (evt?.deal_id === dealId || evt?.dealId === dealId) { clearTimeout(t); resolve(true) }
    })
  })

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve())
    socket.on('connect_error', (err: Error) => reject(new Error(`socket connect_error: ${err.message}`)))
    setTimeout(() => reject(new Error('socket connect timeout')), 8000)
  })
  socket.emit('deal:join', dealId)
  await delay(200)

  const res = await api(`/deals/${dealId}/reserve`, { method: 'POST', token: reserverUser.token })
  check('reserve for realtime worked', res.status < 300, `status=${res.status}`)

  const [q, rsv] = await Promise.all([gotQuantity, gotReservation])
  check('received deal:quantity', q)
  check('received reservation:created', rsv)

  socket.disconnect()
  if (CLEANUP) await deleteDeal(merchant, dealId)
}

async function main() {
  console.log('=== Foodly Concurrency + Realtime Test Suite ===')
  console.log(`API: ${API_BASE} | Socket: ${SOCKET_URL} | PARALLEL=${PARALLEL} | STOCK=${STOCK} | RUN=${RUN.join(',')}`)

  const tests: Record<string, () => Promise<void>> = {
    reserve: testReserve,
    payment: testConfirmPayment,
    spin: testDailySpin,
    redeem: testRedeem,
    like: testLike,
    realtime: testRealtime,
  }

  const runAll = RUN.includes('all')
  for (const [name, fn] of Object.entries(tests)) {
    if (runAll || RUN.includes(name)) {
      try {
        await fn()
      } catch (err: any) {
        failCount++
        console.log(`  \x1b[31mFAIL\x1b[0m ${name} threw — ${err?.message || err}`)
      }
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(`  Passed: ${passCount}`)
  console.log(`  Failed: ${failCount}`)
  process.exit(failCount > 0 ? 1 : 0)
}

main()
