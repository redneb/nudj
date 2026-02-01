# Alternative Architecture: Multiple Service Workers for Per-Sender Subscriptions

> **Status**: Proposed for future implementation  
> **Created**: 2025-01-31  
> **Context**: This architecture addresses the limitation that a single Push API subscription cannot support per-sender unsubscribe functionality.

## Problem Statement

The Web Push API has a fundamental constraint: **one `applicationServerKey` (VAPID public key) per subscription**. In the single-service-worker architecture, all senders share the same subscription and VAPID keys. This means:

- Users cannot unsubscribe from a specific sender
- The only option is "nuclear reset" (regenerate subscription, invalidate ALL senders)
- If one sender's credentials are compromised, all must be reset

## Proposed Solution: Multiple Service Workers

Use **multiple service worker registrations**, each with a unique scope, to create independent subscriptions per sender.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PWA (Receiver)                           │
├─────────────────────────────────────────────────────────────────┤
│  Service Worker: sw-offline.js                                  │
│  Scope: /                                                       │
│  Role: Caching, offline support only (no push)                  │
├─────────────────────────────────────────────────────────────────┤
│  Service Worker: sw-push.js                                     │
│  Scope: /push/sender-abc123/                                    │
│  Role: Handle push for Sender A                                 │
│  Push: Subscription A, VAPID keys A                             │
├─────────────────────────────────────────────────────────────────┤
│  Service Worker: sw-push.js (same file, different registration) │
│  Scope: /push/sender-def456/                                    │
│  Role: Handle push for Sender B                                 │
│  Push: Subscription B, VAPID keys B                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **Offline SW (`sw-offline.js`)**: Registered at scope `/`, handles caching and offline functionality. Does NOT handle push.

2. **Push SWs (`sw-push.js`)**: Same JavaScript file registered multiple times with different scopes. Each registration:
   - Has a unique scope: `/push/<sender-id>/`
   - Has its own `pushManager` and subscription
   - Has its own VAPID key pair
   - Handles push events independently

3. **Virtual Scopes**: The paths `/push/<sender-id>/` don't correspond to real pages. They're identifiers that:
   - Ensure each registration is unique
   - Allow extracting sender ID from the scope
   - Never conflict with actual navigation

### Core Operations

**Listing senders:**
```typescript
const registrations = await navigator.serviceWorker.getRegistrations();
const pushRegistrations = registrations.filter(reg => reg.scope.includes('/push/'));
// Extract sender ID from scope: "/push/abc123/" -> "abc123"
```

**Unsubscribing from a specific sender:**
```typescript
const subscription = await targetRegistration.pushManager.getSubscription();
await subscription?.unsubscribe();
await targetRegistration.unregister();
```

**Updating all push service workers:**
```typescript
const registrations = await navigator.serviceWorker.getRegistrations();
await Promise.allSettled(
  registrations.filter(r => r.scope.includes('/push/')).map(r => r.update())
);
```

---

## Comparison: Single SW vs Multiple SWs

| Aspect | Single SW | Multiple SWs |
|--------|-----------|--------------|
| **Per-sender unsubscribe** | ❌ No | ✅ Yes |
| **VAPID key isolation** | ❌ Shared | ✅ Isolated per sender |
| **Security (compromised sender)** | ⚠️ Reset all | ✅ Reset only affected |
| **Fault isolation** | ❌ One failure = all fail | ✅ Independent |
| **Implementation complexity** | ✅ Simple | ⚠️ More complex |
| **SW update management** | ✅ One SW | ⚠️ Must update all |
| **Version consistency** | ✅ Always consistent | ⚠️ Possible skew |

---

## Open Design Questions

### 1. VAPID Key Generation: Receiver vs Sender

Two possible approaches for who generates and owns the VAPID keys:

**Option A: Receiver generates keys (per pairing)**
- Receiver generates a new VAPID key pair for each sender
- Pairing is one-way: receiver → sender (subscription + VAPID private key)
- Simpler UX (single code to copy)
- Each sender-receiver pair has unique keys

**Option B: Sender has fixed keys**
- Sender generates VAPID key pair once (on first run)
- Pairing is two-way: sender shares public key → receiver creates subscription → receiver shares subscription back
- Sender has consistent identity across all receivers
- More complex UX (two data exchanges)

**Trade-offs:**
| Aspect | Receiver generates | Sender fixed keys |
|--------|-------------------|-------------------|
| Pairing UX | Simple (one-way) | Complex (two-way) |
| Sender identity | Different per receiver | Consistent |
| Keys to manage | Many | Fewer |

### 2. Service Worker Update Strategy

When `sw-push.js` changes, all registrations need updating. Options:
- Update all on app open
- Background sync for updates
- Accept temporary version skew

### 3. Browser Limits

Unknown: Are there practical limits on SW registrations per origin? Needs testing.

### 4. Migration Path

How to migrate existing single-SW users to multi-SW? Options:
- Fresh start (users re-pair all senders)
- Migration wizard in PWA

---

## References

- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [ServiceWorkerContainer.getRegistrations()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/getRegistrations)
- [PushManager.subscribe()](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)
