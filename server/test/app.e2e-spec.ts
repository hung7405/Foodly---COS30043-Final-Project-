import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { SocketGateway } from '../src/socket/socket.gateway'
import { AnalyticsService } from '../src/analytics/analytics.service'
import { AnalyticsGateway } from '../src/analytics/analytics.gateway'

const mockSocket = {
  emitDealCreated: jest.fn(),
  emitDealUpdated: jest.fn(),
  emitDealQuantity: jest.fn(),
  emitDealVerified: jest.fn(),
  emitReservationCreated: jest.fn(),
  emitReservationExpired: jest.fn(),
  emitCommentAdded: jest.fn(),
  emitFeedActivity: jest.fn(),
}

const mockAnalytics = {
  recordEvent: jest.fn(async () => {}),
  computeLiveMetrics: jest.fn(),
  getHistory: jest.fn(),
}

describe('Foodly (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SocketGateway)
      .useValue(mockSocket)
      .overrideProvider(AnalyticsService)
      .useValue(mockAnalytics)
      .overrideProvider(AnalyticsGateway)
      .useValue({})
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    app.setGlobalPrefix('api')
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const suffix = Date.now()
  const testUser = { email: `test${suffix}@foodly.app`, username: `testuser${suffix}`, password: 'TestPass123!' }
  const secondUser = { email: `test2${suffix}@foodly.app`, username: `testuser2${suffix}`, password: 'TestPass123!' }
  let userToken: string
  let secondUserToken: string
  let dealId: string

  it('1) POST /api/auth/register — registers a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201)
    expect(res.body).toHaveProperty('token')
    userToken = res.body.token
  })

  it('2) POST /api/auth/login — logs in with registered credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201)
    expect(res.body).toHaveProperty('token')
    userToken = res.body.token
  })

  it('3) POST /api/deals — creates a new deal (authenticated)', async () => {
    const dealPayload = {
      title: 'Bánh mì giảm 50%',
      description: 'Bánh mì tươi ngon',
      originalPrice: 30000,
      discountPrice: 15000,
      latitude: 10.775,
      longitude: 106.701,
      tags: ['food', 'banhmi'],
      remainingQuantity: 10,
    }
    const res = await request(app.getHttpServer())
      .post('/api/deals')
      .set('Authorization', `Bearer ${userToken}`)
      .send(dealPayload)
      .expect(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.title).toBe(dealPayload.title)
    dealId = res.body.id
  })

  it('3b) POST /api/auth/register — registers second user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(secondUser)
      .expect(201)
    expect(res.body).toHaveProperty('token')
    secondUserToken = res.body.token
  })

  it('4) POST /api/deals/:id/reserve — reserves a deal (concurrent-safe)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/deals/${dealId}/reserve`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(201)
    expect(res.body).toHaveProperty('reservationCode')
    expect(res.body.status).toBe('active')
  })

  it('5) GET /api/deals — lists deals with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/deals')
      .expect(200)
    expect(res.body).toHaveProperty('deals')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
    expect(res.body).toHaveProperty('totalPages')
  })
})
