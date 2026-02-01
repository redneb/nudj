# nudj Interface Specification

This document defines the interface for both the CLI and the web application.

---

## CLI Interface

### Installation

```bash
# Single-file download (preferred)
curl -L https://github.com/redneb/nudj/releases/latest/download/nudj.js -o ~/.local/bin/nudj
chmod +x ~/.local/bin/nudj

# Or via npm
npm install -g nudj
```

The CLI is a single JavaScript file with a Node.js shebang. Requires Node.js 22+.

---

### Command Overview

```
nudj <command> [options]

Commands:
  push <message>       Send a notification to receivers
  pair                 Add a new receiver
  receivers            List paired receivers
  receivers rename     Rename a receiver
  receivers remove     Remove a receiver
  config               Show configuration file path
  help                 Show help
  version              Show version

Run 'nudj <command> --help' for details on a specific command.
```

---

### `nudj push`

Send a push notification to one or more receivers.

```
nudj push [options] <message>

Arguments:
  message              The notification body text (required)

Options:
  -t, --title <text>   Notification title (default: "nudj")
  --to <name>          Send only to this receiver (can be repeated)
  -q, --quiet          Suppress output on success
  -h, --help           Show help
```

**Examples:**

```bash
# Send to all receivers with default title
nudj push "Build completed"

# Send with custom title
nudj push --title "CI" "Build #1234 passed"

# Send to specific receiver
nudj push --to iPhone "Your coffee is ready"

# Send to multiple specific receivers
nudj push --to iPhone --to iPad "Meeting starting"

# Quiet mode (for scripts)
nudj push -q "Background task done"
```

**Output (success):**

```
✓ iPhone: delivered
✓ iPad: delivered
```

**Output (partial failure):**

```
✓ iPhone: delivered
✗ Old Phone: subscription expired (removed)
```

**Output (no receivers):**

```
No receivers configured. Run 'nudj pair' to add one.
```

**Exit codes:**

| Code | Meaning |
|------|---------|
| 0 | All messages delivered successfully |
| 1 | Some or all messages failed to deliver |
| 2 | Configuration error (no receivers, invalid config) |

---

### `nudj pair`

Add a new receiver by entering a pairing code.

```
nudj pair [options]

Options:
  -h, --help           Show help
```

**Interactive flow:**

```
$ nudj pair
Paste pairing code: eyJlbmRwb2ludCI6Imh0dHBz...
Name for this receiver: iPhone

✓ Receiver 'iPhone' added successfully

You now have 2 receiver(s) configured.
```

**Validation errors:**

```
$ nudj pair
Paste pairing code: invalid-data

✗ Invalid pairing code. Make sure you copied the entire code from the nudj app.
```

```
$ nudj pair
Paste pairing code: eyJlbmRwb2ludCI6Imh0dHBz...
Name for this receiver: iPhone

✗ A receiver named 'iPhone' already exists. Choose a different name.
Name for this receiver: iPhone 2

✓ Receiver 'iPhone 2' added successfully
```

---

### `nudj receivers`

List all paired receivers.

```
nudj receivers [options]

Options:
  --json               Output as JSON
  -h, --help           Show help
```

**Output (table, default):**

```
$ nudj receivers
NAME          ADDED                 LAST USED
iPhone        2025-01-15 10:30      2025-01-31 09:15
Work Tablet   2025-01-20 14:00      2025-01-28 18:30
Old Phone     2025-01-01 08:00      (never)
```

**Output (JSON):**

```json
$ nudj receivers --json
[
  {
    "name": "iPhone",
    "addedAt": "2025-01-15T10:30:00Z",
    "lastUsedAt": "2025-01-31T09:15:00Z"
  },
  {
    "name": "Work Tablet",
    "addedAt": "2025-01-20T14:00:00Z",
    "lastUsedAt": "2025-01-28T18:30:00Z"
  }
]
```

**Output (no receivers):**

```
$ nudj receivers
No receivers configured. Run 'nudj pair' to add one.
```

---

### `nudj receivers rename`

Rename an existing receiver.

```
nudj receivers rename <old-name> <new-name>

Arguments:
  old-name             Current name of the receiver
  new-name             New name for the receiver

Options:
  -h, --help           Show help
```

**Example:**

```
$ nudj receivers rename "Old Phone" "Backup Phone"
✓ Renamed 'Old Phone' → 'Backup Phone'
```

**Errors:**

```
$ nudj receivers rename "Nonexistent" "New Name"
✗ No receiver named 'Nonexistent' found.
```

---

### `nudj receivers remove`

Remove a paired receiver.

```
nudj receivers remove <name>

Arguments:
  name                 Name of the receiver to remove

Options:
  -f, --force          Skip confirmation prompt
  -h, --help           Show help
```

**Example:**

```
$ nudj receivers remove "Backup Phone"
Remove receiver 'Backup Phone'? [y/N] y
✓ Removed 'Backup Phone'
```

**With --force:**

```
$ nudj receivers remove --force "Backup Phone"
✓ Removed 'Backup Phone'
```

---

### `nudj config`

Show the configuration file location.

```
nudj config [options]

Options:
  --path               Print only the path (for scripting)
  -h, --help           Show help
```

**Example:**

```
$ nudj config
Configuration file: /home/user/.config/nudj/config.json
Receivers configured: 2
```

```
$ nudj config --path
/home/user/.config/nudj/config.json
```

---

### `nudj help`

Show general help or help for a specific command.

```
nudj help [command]
```

---

### `nudj version`

Show version information.

```
$ nudj version
nudj 1.0.0
```

Or using the standard flag:

```
$ nudj --version
1.0.0
```

---

### Configuration File

Location follows XDG Base Directory Specification:

| OS | Path |
|----|------|
| Linux | `$XDG_CONFIG_HOME/nudj/config.json` or `~/.config/nudj/config.json` |
| macOS | `~/.config/nudj/config.json` |
| Windows | `%APPDATA%\nudj\config.json` |

**Schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "receivers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "endpoint": { "type": "string", "format": "uri" },
          "keys": {
            "type": "object",
            "properties": {
              "p256dh": { "type": "string" },
              "auth": { "type": "string" }
            },
            "required": ["p256dh", "auth"]
          },
          "vapid": {
            "type": "object",
            "properties": {
              "privateKey": { "type": "string" }
            },
            "required": ["privateKey"]
          },
          "addedAt": { "type": "string", "format": "date-time" },
          "lastUsedAt": { "type": ["string", "null"], "format": "date-time" }
        },
        "required": ["name", "endpoint", "keys", "vapid", "addedAt"]
      }
    }
  }
}
```

**Example:**

```json
{
  "receivers": [
    {
      "name": "iPhone",
      "endpoint": "https://fcm.googleapis.com/fcm/send/abc123...",
      "keys": {
        "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA...",
        "auth": "tBHItJI5svbpez7KI4CCXg"
      },
      "vapid": {
        "privateKey": "dGhpcyBpcyBhIHRlc3Qga2V5Li4u"
      },
      "addedAt": "2025-01-15T10:30:00Z",
      "lastUsedAt": "2025-01-31T09:15:00Z"
    }
  ]
}
```

---

### Standard Input Support

The push command can read the message from stdin:

```bash
# Pipe message
echo "Build done" | nudj push -

# Here-doc
nudj push - <<EOF
Multi-line
message here
EOF

# From file
nudj push - < message.txt
```

When `-` is used as the message argument, the CLI reads from stdin until EOF.

---

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NUDJ_CONFIG` | Override config file path |
| `NO_COLOR` | Disable colored output (standard) |
| `FORCE_COLOR` | Force colored output even when not a TTY |

---

## Web Application Interface

The PWA has a minimal, single-screen interface focused on two tasks:
1. Enabling notifications and displaying the pairing code
2. Resetting the subscription if compromised

### Screen States

The app has three possible states based on push subscription status:

#### State 1: Notifications Not Enabled

Shown when:
- First visit (no subscription exists)
- User denied notification permission previously
- Subscription was reset

```
┌─────────────────────────────────────────┐
│                                         │
│              nudj                       │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │      [  Enable Notifications  ] │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ▸ How to install this app             │
│                                         │
│   ▸ What is nudj?                       │
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

- **Enable Notifications button**: Primary action. Triggers permission request and subscription creation.
- **How to install this app** (collapsed): Instructions for adding to home screen on iOS/Android.
- **What is nudj?** (collapsed): Brief explanation of what the app does.

---

#### State 2: Notifications Enabled (Ready to Pair)

Shown when subscription is active.

```
┌─────────────────────────────────────────┐
│                                         │
│              nudj                       │
│                                         │
│   Notifications enabled ✓               │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │  eyJlbmRwb2ludCI...d3RhejVSeTR  │   │
│   │                                 │   │
│   │                       [ Copy ]  │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   Paste this code into the nudj CLI     │
│   on your computer to pair.             │
│                                         │
│   ─────────────────────────────────     │
│                                         │
│   ▸ How to use                          │
│                                         │
│   ▸ Security                            │
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

- **Status indicator**: "Notifications enabled ✓"
- **Pairing code display**: Monospace, truncated with ellipsis (shows first ~20 and last ~10 characters). The full code is copied when user taps Copy.
- **Copy button**: Inline with the code box. Copies full pairing code to clipboard. Shows brief "Copied!" feedback (button text changes momentarily).
- **How to use** (collapsed): Step-by-step pairing instructions.
- **Security** (collapsed): Explains what the pairing code contains and why to keep it private. Contains "Reset Subscription" action.

---

#### State 3: Permission Denied

Shown when user has denied notification permission.

```
┌─────────────────────────────────────────┐
│                                         │
│              nudj                       │
│                                         │
│   ⚠ Notifications blocked              │
│                                         │
│   You've blocked notifications for      │
│   this site. To use nudj, you need      │
│   to allow notifications.               │
│                                         │
│   ▸ How to enable notifications         │
│                                         │
└─────────────────────────────────────────┘
```

**Components:**

- **Warning indicator**: Explains the problem.
- **How to enable notifications** (collapsed): Platform-specific instructions for re-enabling in browser/OS settings.

---

### Collapsible Sections Content

#### "How to install this app"

```
iOS (Safari):
1. Tap the Share button (□↑)
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add"

Android (Chrome):
1. Tap the menu (⋮)
2. Tap "Add to Home Screen" or "Install app"
3. Tap "Install"

Desktop:
This app works in the browser, but you can also install it
from the browser's address bar (look for an install icon).
```

#### "What is nudj?"

```
nudj lets you send push notifications from your computer 
to your phone using a simple command-line tool.

No account required. No cloud service. Your notifications 
are encrypted end-to-end.
```

#### "How to use"

```
1. Copy the pairing code above
2. On your computer, install the nudj CLI
3. Run: nudj pair
4. Paste the pairing code when prompted
5. Send notifications with: nudj push "Hello!"
```

#### "Security"

```
The pairing code contains encryption keys that allow 
someone to send you notifications. Treat it like a 
password—only share it with your own devices.

If you believe the pairing code was compromised:

        [  Reset Subscription  ]

This will invalidate the current pairing code and 
generate a new one. You'll need to re-pair all your 
devices.
```

---

### Visual Design Principles

Per the requirements, the UI should be:
- Simple, clean, modern
- Stunningly beautiful
- Avoiding common LLM design clichés (no purple gradients on white)

**Proposed aesthetic:**

- **Color palette**: Uses established brand colors from `logos/README.md`. Supports light and dark mode via `prefers-color-scheme` media query (system preference).
  - **Dark mode**:
    - Background: `#1a1a1a` (Deep Charcoal)
    - Text/foreground: `#e8e8e8` (Warm Off-White)
    - Accent: `#f5a623` (Amber)
  - **Light mode**:
    - Background: `#fafafa` (Off-White)
    - Text/foreground: `#1a1a1a` (Deep Charcoal)
    - Accent: `#f5a623` (Amber)

- **Logo**: Use `logo-adaptive.svg` which automatically adapts to light/dark mode via `currentColor`. The amber "nudger" circle remains fixed.
  
- **Typography**: 
  - System font stack for body (fast, native feel)
  - Monospace for pairing code (clearly technical)
  - Generous line height, comfortable reading

- **Layout**:
  - Centered, narrow content column (max ~400px)
  - Generous whitespace
  - No unnecessary borders or dividers
  - Cards/sections have subtle depth (shadow or slight background shift)

- **Interactions**:
  - Subtle transitions (opacity, transform)
  - Clear focus states for accessibility
  - Buttons have hover/active states

---

### Responsive Behavior

The app is designed mobile-first but should work on any screen:

| Viewport | Behavior |
|----------|----------|
| Mobile (<480px) | Full-width content with padding |
| Tablet/Desktop | Centered column, max-width 400px |

---

### Accessibility

- All interactive elements are keyboard accessible
- Focus indicators are visible
- Color is not the only indicator of state
- Text has sufficient contrast (WCAG AA minimum)
- Collapsible sections use proper ARIA attributes

---

### PWA Manifest

```json
{
  "name": "nudj",
  "short_name": "nudj",
  "description": "Receive push notifications from your CLI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a",
  "icons": [
    { "src": "/logos/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logos/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/logos/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Note: Icon paths reference the existing assets in `logos/`.

---

### Service Worker Responsibilities

The service worker handles:

1. **Push event handling**: Receive and display notifications
2. **Notification click handling**: Dismiss notification (no action in v1)
3. **Offline fallback**: Show a friendly "you're offline" page if user opens app without network

**Note**: We intentionally do not cache assets for offline use. Users rarely open the app (only for pairing), and caching adds complexity without significant benefit. The PWA installability requirements are satisfied by having a `fetch` handler that shows the offline fallback page.

---

### LocalStorage Schema

```typescript
interface NudjStorage {
  // VAPID key pair (base64url encoded)
  "nudj:vapid:publicKey": string;
  "nudj:vapid:privateKey": string;
}
```

Keys are prefixed with `nudj:` to avoid collisions.

---

## Pairing Code Format

The pairing code is a base64url-encoded JSON object:

```typescript
interface PairingData {
  /** Push service endpoint URL */
  endpoint: string;
  
  /** Encryption keys from PushSubscription */
  keys: {
    /** ECDH public key (base64url) */
    p256dh: string;
    /** Auth secret (base64url) */
    auth: string;
  };
  
  /** VAPID credentials */
  vapid: {
    /** VAPID private key (base64url) */
    privateKey: string;
  };
}
```

**Example decoded:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc123...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA...",
    "auth": "tBHItJI5svbpez7KI4CCXg"
  },
  "vapid": {
    "privateKey": "dGhpcyBpcyBhIHRlc3Qga2V5Li4u"
  }
}
```

**Encoded (what user sees/copies):**

```
eyJlbmRwb2ludCI6Imh0dHBzOi8vZmNtLmdvb2dsZWFwaXMuY29tL2ZjbS9zZW5kL2FiYzEyMy4uLiIsImtleXMiOnsicDI1NmRoIjoiQk5jUmRyZWFMUkZYVGtPT1VISzFFdEsyd3RhejVSeTRZZllDQS4uLiIsImF1dGgiOiJ0QkhJdEpJNXN2YnBlejdLSTRDQ1hnIn0sInZhcGlkIjp7InByaXZhdGVLZXkiOiJkR2hwY3lCcGN5QmhJSFJsYzNRZ2EyVjVMaTR1In19
```

The code is a single line with no whitespace, suitable for copy-paste.
