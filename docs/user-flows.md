# nudj User Flows

This document describes the core user flows for nudj. The most critical flow is **Pairing** (how a sender gets connected to a receiver).

## Terminology Recap

- **Sender**: A computer running the nudj CLI (laptop, workstation, server)
- **Receiver**: A device running the nudj PWA (phone, tablet) that receives notifications
- **Pairing Data**: The cryptographic credentials that allow a sender to push notifications to a receiver

## Pairing Data Structure

When a receiver pairs with a sender, it shares a credential bundle containing:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc123...",
  "keys": {
    "p256dh": "<base64url: receiver's ECDH public key for payload encryption>",
    "auth": "<base64url: 16-byte authentication secret>"
  },
  "vapid": {
    "privateKey": "<base64url: VAPID private key for push service auth>"
  }
}
```

This bundle is serialized, compressed, and base64url-encoded into a single string that can be copied or embedded in a QR code.

---

## Flow 1: Receiver Initial Setup

**Goal**: Install the PWA and prepare to receive notifications.

**Actors**: User with a phone/tablet

**Preconditions**: None

### Steps

1. **User navigates to the nudj web app**
   - URL: `https://<github-pages-url>/` (or self-hosted)

2. **User installs the PWA**
   - On iOS: Safari → Share → "Add to Home Screen"
   - On Android: Chrome shows install prompt, or Menu → "Add to Home Screen"
   - The app provides collapsible help text explaining this process

3. **User opens the installed PWA**
   - First launch detects no subscription exists

4. **User taps "Enable Notifications"**
   - Browser prompts for notification permission
   - If denied, the app explains how to re-enable in settings

5. **PWA generates credentials**
   - Generates a new VAPID key pair (ECDSA P-256)
   - Calls `PushManager.subscribe()` with the VAPID public key as `applicationServerKey`
   - Stores the VAPID key pair in LocalStorage
   - Displays: "Ready to pair with senders"

6. **PWA shows pairing interface**
   - Shows the pairing code (base64url string) with a "Copy" button
   - Explains: "Copy this pairing code and paste it into your CLI to add this device"

### Outcome

Receiver is ready to be paired with one or more senders.

---

## Flow 2: Pairing (Sender ↔ Receiver)

**Goal**: Connect a CLI installation to a receiver so it can send notifications.

**Actors**: User with access to both the sender (CLI machine) and receiver (phone with PWA)

**Preconditions**: 
- Receiver has completed Flow 1 (PWA installed, notifications enabled)
- Sender has nudj CLI installed

### Steps

1. **On receiver**: Open PWA, tap "Show Pairing Code"
2. **On receiver**: Tap "Copy" to copy the pairing code to clipboard
3. **Transfer the code** to the sender machine:
   - If same machine: Already in clipboard
   - If different machine: Send via messaging app, email, or secure channel
4. **On sender**: Run the CLI pairing command:
   ```bash
   nudj pair
   ```
5. **CLI prompts**: "Paste pairing code:"
6. **User pastes** the code
7. **CLI prompts**: "Name for this receiver:" (e.g., "iPhone", "Work Phone")
8. **CLI confirms**: "✓ Receiver 'iPhone' added successfully"

### Where Pairing Data is Stored

**On Sender (CLI)**:
- Location: `~/.config/nudj/config.json` (XDG Base Directory compliant)
- Structure:
  ```json
  {
    "receivers": [
      {
        "name": "iPhone",
        "endpoint": "https://fcm.googleapis.com/...",
        "keys": { "p256dh": "...", "auth": "..." },
        "vapid": { "privateKey": "..." },
        "addedAt": "2025-01-31T12:00:00Z"
      }
    ]
  }
  ```

**On Receiver (PWA)**:
- VAPID keys stored in LocalStorage (simple key-value, service worker doesn't need them)
- Subscription persisted automatically by browser (retrieved via `PushManager.getSubscription()`)

### Security Considerations

- The pairing code contains the VAPID private key—treat it like a password
- Transfer via secure channel when possible
- Anyone with the pairing code can send notifications to that receiver
- To revoke access from all senders: regenerate subscription in PWA

---

## Flow 3: Sending a Notification

**Goal**: Send a push notification from CLI to one or more receivers.

**Actors**: User on sender machine

**Preconditions**: At least one receiver is paired

### Basic Usage

```bash
# Send to all paired receivers
nudj push "Build completed successfully"

# Send with a title
nudj push --title "CI Pipeline" "Build #1234 passed"

# Send to a specific receiver
nudj push --to "iPhone" "Your package has shipped"

# Send to multiple specific receivers
nudj push --to "iPhone" --to "iPad" "Meeting in 5 minutes"
```

### Steps (Internal)

1. **CLI parses arguments**
   - Extracts title, body, and target receivers
   
2. **CLI loads configuration**
   - Reads `~/.config/nudj/config.json`
   - Filters receivers based on `--to` flags (or uses all if not specified)

3. **For each target receiver**:
   
   a. **Generate ephemeral ECDH key pair** (for this message)
   
   b. **Derive encryption key** using:
      - Receiver's `p256dh` public key
      - Receiver's `auth` secret
      - Ephemeral private key
   
   c. **Encrypt payload** per RFC 8291 (aes128gcm)
      - Payload contains: `{ title, body, timestamp }`
   
   d. **Create VAPID JWT**
      - Sign with receiver's VAPID private key
      - Include `aud` (push service origin), `exp` (expiry), `sub` (contact)
   
   e. **POST to push service endpoint**
      - Headers: `Authorization: vapid ...`, `Content-Encoding: aes128gcm`, `TTL: 86400`
      - Body: Encrypted payload

4. **CLI reports results**
   ```
   ✓ iPhone: delivered
   ✓ iPad: delivered
   ✗ Old Phone: subscription expired (removed from config)
   ```

### Handling Long Messages

If the message exceeds ~3900 bytes after encryption:

```bash
$ nudj push "$(cat long-log.txt)"
Warning: Message truncated (3847/15234 bytes). Full message saved to ~/.config/nudj/last-message.txt
Send anyway? [Y/n]
```

---

## Flow 4: Receiving a Notification

**Goal**: Display a push notification on the receiver device.

**Actors**: Receiver device (automatic)

**Preconditions**: Paired with at least one sender

### Steps

1. **Push service delivers message**
   - Browser receives encrypted payload
   - Wakes up service worker (even if PWA is closed)

2. **Service worker handles `push` event**
   ```javascript
   self.addEventListener('push', async (event) => {
     const payload = await decryptPayload(event.data);
     // ...
   });
   ```

3. **Service worker decrypts payload**
   - Uses stored VAPID/subscription keys
   - Extracts: `{ title, body, timestamp }`

4. **Service worker displays notification**
   ```javascript
   self.registration.showNotification(title, {
     body: body,
     icon: '/icon-192.png',
     badge: '/badge-72.png',
     tag: `nudj-${timestamp}`
   });
   ```

5. **User sees notification**
   - Standard OS notification
   - Tapping dismisses the notification (no further action)

### Background Reception

- Works even when PWA is completely closed
- Works when phone is locked (notification appears on lock screen)
- Messages queued by push service if device is offline

---

## Flow 5: Managing Receivers (Sender Side)

**Goal**: View, rename, or remove paired receivers.

**Actors**: User on sender machine

### List Receivers

```bash
$ nudj receivers
NAME          ADDED                 LAST USED
iPhone        2025-01-15 10:30      2025-01-31 09:15
Work Tablet   2025-01-20 14:00      2025-01-28 18:30
Old Phone     2025-01-01 08:00      (never)
```

### Rename a Receiver

```bash
$ nudj receivers rename "Old Phone" "Backup Phone"
✓ Renamed 'Old Phone' → 'Backup Phone'
```

### Remove a Receiver

```bash
$ nudj receivers remove "Backup Phone"
Remove receiver 'Backup Phone'? This cannot be undone. [y/N] y
✓ Removed 'Backup Phone'
```

Note: Removing from CLI only removes the local record. The receiver's subscription remains valid—another sender with the pairing code could still push to it.

---

## Flow 6: Managing Subscription (Receiver Side)

**Goal**: Reset the subscription if the pairing code was compromised.

**Actors**: User on receiver device

### Reset Subscription

If the pairing code was compromised:

1. **Tap "Security" or gear icon**
2. **Tap "Reset Subscription"**
3. **Warning**: "This will invalidate ALL senders. You'll need to re-pair with each sender."
4. **Confirm**
5. **PWA**:
   - Calls `pushSubscription.unsubscribe()`
   - Generates new VAPID key pair
   - Creates new subscription
   - Clears known senders list
6. **New QR code / pairing code displayed**

---

## Flow 7: CLI First-Time Setup

**Goal**: Install and configure the nudj CLI for first use.

**Actors**: User on sender machine

### Installation

```bash
# Download single-file bundle
curl -L https://github.com/<user>/nudj/releases/latest/download/nudj.js -o nudj.js
chmod +x nudj.js

# Or via npm (if published)
npm install -g nudj
```

### First Run

```bash
$ nudj
nudj - Send push notifications to your devices

No receivers configured. Run 'nudj pair' to add a device.

Usage:
  nudj push [options] <message>    Send a notification
  nudj pair                        Add a new receiver
  nudj receivers                   List paired receivers
  nudj help                        Show detailed help
```

### Configuration Location

Following XDG Base Directory Specification:

| OS      | Config Path                          |
|---------|--------------------------------------|
| Linux   | `~/.config/nudj/config.json`         |
| macOS   | `~/.config/nudj/config.json`         |
| Windows | `%APPDATA%\nudj\config.json`         |

If `$XDG_CONFIG_HOME` is set, uses `$XDG_CONFIG_HOME/nudj/config.json`.

---

## Summary: Key User Journeys

| Journey | Steps | Complexity |
|---------|-------|------------|
| First-time receiver setup | Visit URL → Install PWA → Enable notifications | Simple |
| Pairing | Copy code from PWA → Paste into CLI → Name receiver | Simple |
| Send notification | `nudj push "message"` | Trivial |
| Receive notification | Automatic | Trivial |
| Reset subscription | Open PWA → Reset → Re-pair all senders | Simple |

---

## Design Decisions (v1)

The following decisions were made to keep v1 simple and focused:

| Topic | Decision | Rationale |
|-------|----------|-----------|
| **Pairing method** | Copy-paste only (no QR codes) | Simpler implementation; QR can be added in v2 |
| **Sender identification** | Not tracked | Receivers don't need to distinguish senders in v1 |
| **Notification tap action** | Dismiss only (no action) | Keeps PWA minimal; avoids unnecessary complexity |
| **Notification history** | Not stored | PWA's job is to relay notifications, not archive them |
| **Multiple subscriptions** | One subscription per PWA | No "channels" or separation; keeps model simple |
