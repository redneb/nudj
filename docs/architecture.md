# nudj Architecture

This document explains the key architectural decisions in nudj and why they were made.

## Overview

nudj sends push notifications from a CLI (sender) to phones/tablets (receivers) via a PWA. It uses the Web Push API with an unusual "receiver-owned keys" model that eliminates the need for a backend server.

## Terminology

These terms have specific meanings in nudj:

| Term | Meaning |
|------|---------|
| **Sender** | A computer running the nudj CLI (laptop, workstation, server). Sends notifications. |
| **Receiver** | A device running the nudj PWA (phone, tablet). Receives notifications. |
| **Subscription** | A Web Push subscription created on a receiver—contains the endpoint URL and encryption keys needed to send notifications to that device. |
| **Pairing** | The process of sharing a receiver's subscription credentials with a sender, enabling that sender to push notifications. |
| **Pairing code** | A base64url-encoded string containing all credentials a sender needs to push to a receiver. |

## Components

| Component | Technology | Description |
|-----------|------------|-------------|
| CLI | Node.js, TypeScript | Sends notifications from command line |
| PWA | Solid.js, TypeScript | Receives notifications on mobile devices |

The CLI and PWA share type definitions in `src/common/` but have no runtime dependencies on each other.

## The "No Backend" Design

Unlike typical push notification systems, nudj has no backend server. The only servers involved are the browser vendors' push services (Google FCM, Apple APNs, Mozilla), which are built into the Web Push standard.

### Why No Backend?

1. **Privacy** — The nudj creator has no server to log data on, therefore no access to user keys or notification content
2. **Cost** — No infrastructure to maintain or pay for
3. **Simplicity** — Fewer moving parts, fewer failure modes
4. **Auditability** — Users can verify there's no server-side code doing anything

### Trade-offs

- **No account system** — Users can't sync settings across devices
- **No usage analytics** — No way to know how many people use nudj
- **Reset is all-or-nothing** — Can't selectively revoke individual senders (see below)

## The "Receiver-Owned Keys" Model

The Web Push API normally works like this:

1. Application server generates VAPID key pair
2. Application server shares its public key with clients
3. Clients create push subscriptions using that public key
4. Application server sends notifications using its private key

nudj inverts this model:

1. **PWA (receiver) generates the VAPID key pair**
2. PWA creates a push subscription using its own public key as `applicationServerKey`
3. During pairing, receiver shares with the sender:
   - Push endpoint URL
   - Encryption keys (`p256dh`, `auth`)
   - **VAPID private key**
4. Sender uses these credentials to send notifications

### Why Receiver-Owned Keys?

This model enables:

- **Multiple independent senders** — Different CLI installations can push to the same receiver without coordination
- **No central authority** — Senders don't need to register with a server to get permission to push
- **True end-to-end privacy** — The receiver controls who can send to them

### The Pairing Code

The pairing code is a base64url-encoded JSON object containing everything a sender needs:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "<receiver's ECDH public key>",
    "auth": "<16-byte authentication secret>"
  },
  "vapid": {
    "privateKey": "<VAPID private key>"
  }
}
```

**Security note**: The pairing code is sensitive—treat it like a password. Anyone with the code can send notifications to that receiver.

## Security Model

### Encryption

Push payloads are encrypted per RFC 8291 (aes128gcm). The push services (FCM, APNs, Mozilla) transport only encrypted blobs and cannot read notification content.

### Trust Model

| Entity | Access |
|--------|--------|
| Sender (CLI) | Can send notifications to paired receivers |
| Receiver (PWA) | Receives and displays notifications |
| Push services | Transport encrypted blobs; cannot read content |
| nudj host (GitHub Pages) | Serves static files; has no keys or data |

### Revocation

Because there's no backend tracking sender-receiver relationships:

- **Reset revokes all senders** — The only way to revoke access is to regenerate the subscription, which invalidates all pairing codes
- **Selective revocation is not possible** in the current architecture

This is an intentional trade-off. The benefits:

- **Privacy** — No backend means the nudj host has no data to access or log
- **Simpler pairing model** — Each receiver has one fixed pairing code; users can share the same code with any number of senders without managing multiple codes or remembering which code goes with which sender

### Future: Per-Sender Revocation

A potential future architecture using multiple service workers could enable per-sender revocation. See `docs/future/multi-sw-architecture.md` for details.

## Data Flow

### Pairing

```
┌──────────┐                                    ┌──────────┐
│   PWA    │                                    │   CLI    │
│(receiver)│                                    │ (sender) │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ 1. Generate VAPID keys                        │
     │ 2. Create push subscription                   │
     │ 3. Display pairing code                       │
     │                                               │
     │ ─────── User copies pairing code ──────────▶  │
     │                                               │
     │                                 4. Store credentials
     │                                               │
```

### Sending Notifications

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│   CLI    │       │ Push Service │       │   PWA    │
│ (sender) │       │  (FCM/APNs)  │       │(receiver)│
└────┬─────┘       └──────┬───────┘       └────┬─────┘
     │                    │                    │
     │ 1. Encrypt payload │                    │
     │ 2. Sign with VAPID │                    │
     │ ─────────────────▶ │                    │
     │   POST to endpoint │                    │
     │                    │ 3. Deliver push    │
     │                    │ ─────────────────▶ │
     │                    │                    │
     │                    │    4. Decrypt and  │
     │                    │    display notification
```

## Technology Choices

### CLI

| Choice | Reason |
|--------|--------|
| citty | Minimal argument parsing library (~23KB), zero deps |
| @block65/webcrypto-web-push | Modern Web Crypto API, smaller than web-push package |

### PWA

| Choice | Reason |
|--------|--------|
| Solid.js | Small bundle (~12-18KB), fine-grained reactivity |
| Vite | Fast dev server, good PWA support |
| Hand-rolled service worker | Simple needs (push + offline fallback), full control |

### Why No Caching in Service Worker?

The service worker handles push events but does not cache assets for offline use. This is intentional:

1. **Users rarely open the app** — Only for initial setup and occasional re-pairing
2. **Caching adds complexity** — Version management, cache invalidation
3. **Push still works offline** — Notifications are received regardless of caching
4. **PWA requirements satisfied** — The fetch handler (showing offline page) is enough for installability

## Project Structure

```
src/
├── cli/           # CLI implementation (Node.js)
│   ├── commands/  # Command handlers (push, pair, receivers, config)
│   └── lib/       # Shared CLI utilities
├── web/           # PWA implementation (Solid.js)
│   ├── components/
│   └── lib/       # Push subscription, VAPID, storage
└── common/        # Shared type definitions (no DOM or Node types)
```

Each directory has its own `tsconfig.json` with appropriate type definitions:
- `cli/` — Node.js types only
- `web/` — DOM types only
- `common/` — Neither (environment-agnostic)

## Platform Notes

### iOS Limitations

Push notifications on iOS only work for PWAs installed to the home screen (iOS 16.4+). The PWA includes instructions for users on how to install it.

### Push Service Endpoints

Different browsers use different push services:
- Chrome/Android: Firebase Cloud Messaging (FCM)
- Firefox: Mozilla Push Service
- Safari/iOS: Apple Push Notification service (APNs)

The CLI sends to whatever endpoint the receiver's browser provides, so it works with all of them.
