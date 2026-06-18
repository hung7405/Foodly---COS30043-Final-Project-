# Foodly - Problem Statement

## Primary Problem

**1.3 billion tonnes of food wasted globally each year** (UN FAO), while **828 million people face hunger**. In Australia alone, **7.6 million tonnes** of food waste costs the economy **$36.6 billion annually**. 

The disconnect: retailers discard perfectly edible near-expiry food daily, while price-sensitive consumers lack real-time visibility into these discounts.

## Market Gaps in Current Solutions

| Existing Solution | Critical Limitation |
|-------------------|---------------------|
| **Static deal sites** (OzBargain, catalogues) | Hours/days stale; no geospatial context |
| **Food rescue apps** (Too Good To Go, Olio) | Limited to partner stores; no community verification |
| **Map-based apps** (Google Maps, Yelp) | No deal-specific data; no real-time updates |
| **Community groups** (Facebook, Discord) | No structured data; no trust scoring; spam-heavy |

## Technical Problems to Solve

### 1. Real-Time Geospatial Synchronization
**Problem**: Thousands of deal markers updating simultaneously across hundreds of connected clients.
- **Challenge**: Naive rendering blocks main thread; WebSocket storms crash tabs
- **Requirement**: Sub-16ms frame budget with 10,000+ markers

### 2. Concurrency in Reservation Engine
**Problem**: Multiple users reserving the last 3 units of a deal simultaneously.
- **Challenge**: Race conditions cause overselling; database locks hurt throughput
- **Requirement**: Zero overselling with <100ms reservation latency

### 3. High-Volume Event Ingestion
**Problem**: Streaming 500+ events/second (reservations, verifications, comments, new deals) to dashboards.
- **Challenge**: Chart re-renders freeze UI; memory leaks from unbounded buffers
- **Requirement**: 60fps charts with 1-hour rolling windows

### 4. Progressive Enhancement for Varying Network Conditions
**Problem**: Users on 3G/4G/5G/WiFi with intermittent connectivity.
- **Challenge**: Offline-first with conflict resolution on reconnect
- **Requirement**: Functional read-only mode offline; seamless sync online

### 5. Accessibility in Data-Dense Interfaces
**Problem**: Maps, charts, and virtual lists are inherently inaccessible.
- **Challenge**: Screen readers cannot parse WebGL canvases; keyboard navigation breaks in virtual scroll
- **Requirement**: WCAG 2.1 AA with full keyboard + screen reader support

## User Pain Points (Validated)

| Persona | Pain Point | Current Workaround |
|---------|------------|-------------------|
| **Budget Shopper** | "I drive to a store only to find deals gone" | Calls store; checks multiple apps |
| **Food Rescue Volunteer** | "No way to verify if posted deals are real" | Trusts posters; wastes trips |
| **Store Manager** | "Throwing away $2000/week in near-expiry" | Manual discount stickers |
| **Sustainability Advocate** | "Can't measure community impact" | Anecdotal estimates |

## Opportunity Statement

> Build a **real-time, community-verified, geospatial platform** that makes discounted food discoverable at the moment it becomes available, with trust-scored contributions, conflict-free reservations, and measurable waste reduction — all through a **premium, accessible, performant interface** that demonstrates mastery of modern frontend architecture.

## Why This Project Deserves HD

1. **Technical Depth**: Solves hard frontend problems (WebGL rendering, virtual scrolling, WebSocket state sync, optimistic UI)
2. **Complete Stack**: PostgreSQL → NestJS → Socket.IO → Vue 3 + Mapbox GL → Chart.js
3. **Real-World Impact**: Addresses UN SDG 12.3 (halve food waste by 2030)
4. **Demonstrable Complexity**: Every advanced feature is visible, interactive, and explainable in live coding
5. **Academic Rigor**: Maps directly to all Stage 1/2/3 learning outcomes with measurable exceedance