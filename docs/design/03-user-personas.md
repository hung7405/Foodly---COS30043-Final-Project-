# Foodly - User Personas

## Primary Personas

### 1. Sarah Chen - "The Savvy Saver"
**Demographics**: 28, Marketing Coordinator, Melbourne CBD, $65k/year
**Tech Comfort**: High (daily mobile/web apps, comfortable with maps)
**Motivation**: Reduce grocery spend by 40%+; enjoys "hunting" deals

**Goals**:
- Find quality discounted meals near office for lunch
- Reserve deals before they sell out
- Track savings over time

**Pain Points**:
- Deals expired by arrival
- No trust signal on community posts
- Clunky mobile map experience

**User Journey**:
```
Open app → Map centers on GPS → Filter "Ready-to-eat" + "< $10" → 
See 3 deals within 500m → Tap deal → See trust score 92% → 
Reserve 1 portion → Countdown timer starts → Walk to store → Collect
```

**Feature Priorities**: Real-time map, reservation countdown, trust scores, savings tracker

---

### 2. Marcus Thompson - "The Community Contributor"
**Demographics**: 35, Sustainability Officer, Local Council, $85k/year
**Tech Comfort**: High (admin dashboards, GIS tools, data viz)
**Motivation**: Reduce local food waste; build community resilience

**Goals**:
- Post verified deals from partner retailers
- Moderate community submissions
- Generate waste diversion reports

**Pain Points**:
- Manual verification via phone/email
- No analytics on community impact
- Spam/fake posts waste moderation time

**User Journey**:
```
Login → Moderator dashboard → See 12 pending verifications → 
Filter "High confidence" (AI image match > 90%) → 
Bulk verify 8 → Flag 2 for review → Reject 2 (spam) → 
Export monthly report → Share with council
```

**Feature Priorities**: Moderation queue, AI image verification, analytics export, bulk actions

---

### 3. Priya Sharma - "The Budget Family Manager"
**Demographics**: 42, Part-time Nurse, Mother of 3, Western Suburbs, $55k household
**Tech Comfort**: Medium (WhatsApp, Facebook, banking apps, cautious with new apps)
**Motivation**: Feed family nutritious meals under tight budget

**Goals**:
- Find family-sized discounted meals near home
- Plan weekly shops around deals
- Avoid wasted trips

**Pain Points**:
- Small portions not worth travel
- Unclear expiry times
- App too complex/overwhelming

**User Journey**:
```
Open app → "Family meals" preset filter → See 2 deals at local IGA → 
Tap deal → Large photo + clear expiry "Expires 6:30 PM" → 
Reserve 2 portions → Add to "My Deals" → Get push notification at 5:45 PM
```

**Feature Priorities**: Simple filters, clear expiry display, push notifications, family portions

---

### 4. David Park - "The Store Manager"
**Demographics**: 48, Woolworths Store Manager, 15 years retail
**Tech Comfort**: Medium (POS systems, rostering apps, email)
**Motivation**: Reduce write-offs; clear shelf space; community goodwill

**Goals**:
- Post daily near-expiry markdowns in < 2 minutes
- See real-time reservation uptake
- Minimize staff effort

**Pain Points**:
- Current process: print stickers → walk aisles → manual
- No feedback on what sells vs. wastes
- Competitor apps require separate logins

**User Journey**:
```
Login (SSO) → "Quick Post" → Scan barcode → Auto-fill: product, price, expiry → 
Set quantity 20 → Post → See 15 reserved in 3 minutes → 
Print pickup labels for reserved items only
```

**Feature Priorities**: Barcode scanning, auto-fill, real-time uptake, pickup labels

---

## Secondary Personas

### 5. Alex Rivera - "The Data Analyst" (Admin)
**Role**: Platform Admin | **Focus**: System health, user growth, fraud detection
**Key Needs**: Real-time metrics, anomaly alerts, user management, audit logs

### 6. Jordan Kim - "The First-Time User" (Guest)
**Role**: Unregistered visitor | **Focus**: Browse deals, understand value, low-friction signup
**Key Needs**: No-login browse, clear value prop, guided onboarding, trust signals

---

## Persona Matrix: Feature Coverage

| Feature | Sarah | Marcus | Priya | David | Alex | Jordan |
|---------|-------|--------|-------|-------|------|--------|
| Real-time Map | ★★★ | ★★☆ | ★★★ | ★☆☆ | ★★☆ | ★★★ |
| Reservation Engine | ★★★ | ★☆☆ | ★★★ | ★★★ | ★☆☆ | ★☆☆ |
| Trust Scoring | ★★★ | ★★★ | ★★★ | ★★☆ | ★★★ | ★★★ |
| AI Image Search | ★★☆ | ★★★ | ★☆☆ | ★★★ | ★★☆ | ★★☆ |
| Analytics Dashboard | ★☆☆ | ★★★ | ★☆☆ | ★★☆ | ★★★ | ☆☆☆ |
| Moderation Tools | ☆☆☆ | ★★★ | ☆☆☆ | ☆☆☆ | ★★★ | ☆☆☆ |
| Dark/Light Mode | ★★★ | ★★☆ | ★★★ | ★★☆ | ★★★ | ★★★ |
| Accessibility | ★★☆ | ★★☆ | ★★★ | ★★★ | ★★☆ | ★★★ |
| Offline Read | ★★☆ | ★☆☆ | ★★★ | ★★☆ | ☆☆☆ | ★★☆ |
| Push Notifications | ★★★ | ★★☆ | ★★★ | ★★★ | ★☆☆ | ★☆☆ |

★★★ = Critical | ★★☆ = Important | ★☆☆ = Nice-to-have | ☆☆☆ = Not needed