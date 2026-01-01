# License Key Architecture: Random vs Cryptographically Signed

**Status:** Draft / Discussion
**Author:** [Your name]
**Date:** 2025-01-01

---

## Executive Summary

This document explores transitioning from random alphanumeric license keys to cryptographically signed keys. We analyze trade-offs across security, operational complexity, code complexity, and user experience.

**Key constraints identified:**
- Short, memorable keys preferred (`XXXX-XXXX-XXXX-XXXX`)
- Offline validation is desirable but not critical
- Revocation within hours is acceptable
- Primary threat: casual key sharing (not sophisticated attacks)
- Security hardening is a goal, but we're exploring options

---

## Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [The Short Key vs Signing Tension](#2-the-short-key-vs-signing-tension)
3. [Architecture Options](#3-architecture-options)
4. [License Data: What to Embed](#4-license-data-what-to-embed)
5. [Cryptographic Algorithm Choices](#5-cryptographic-algorithm-choices)
6. [Revocation Strategies](#6-revocation-strategies)
7. [Operational Complexity Comparison](#7-operational-complexity-comparison)
8. [Code Complexity Comparison](#8-code-complexity-comparison)
9. [Recommendations](#9-recommendations)
10. [Migration Path](#10-migration-path)
11. [Open Questions](#11-open-questions)

---

## 1. Current System Analysis

### How It Works Today

```
┌──────────┐     key: XXXX-XXXX-XXXX-XXXX      ┌──────────┐
│  Client  │ ─────────────────────────────────▶│  Server  │
└──────────┘                                   └────┬─────┘
                                                    │
                                                    ▼
                                              ┌──────────┐
                                              │ Database │
                                              │  lookup  │
                                              └──────────┘
```

**Key Generation:**
```typescript
// Current: Random 16-character alphanumeric
const key = generateRandomKey(); // "XXXX-XXXX-XXXX-XXXX"
await db.insert(license).values({ key, productId, customerId, ... });
```

**Validation:**
```typescript
const license = await db.query.license.findFirst({
  where: { key: providedKey }
});
return license?.status === 'active' && license.expiresAt > new Date();
```

### Pros of Current System

| Aspect | Benefit |
|--------|---------|
| **Simplicity** | ~10 lines of code for complete validation |
| **Flexibility** | Can change any license property instantly |
| **Instant revocation** | Update DB, immediately effective |
| **Short keys** | Easy to type, share, display |
| **Activation tracking** | Natural fit with DB model |
| **No key management** | No private keys to secure |

### Cons of Current System

| Aspect | Drawback |
|--------|----------|
| **Network dependency** | Every validation requires API call |
| **Database load** | Every validation = 1 query |
| **Single point of failure** | DB down = all validations fail |
| **Latency** | Network round-trip for each check |
| **Guessability** | 16-char alphanumeric = ~95 bits entropy (actually decent) |

### Security Analysis of Random Keys

With format `XXXX-XXXX-XXXX-XXXX` using alphanumeric (36 chars: a-z, 0-9):

```
Keyspace = 36^16 = 7.96 × 10^24 possibilities
Bits of entropy = log2(36^16) ≈ 82 bits
```

**Brute force resistance:**
- At 1M guesses/second: 252 billion years
- At 1B guesses/second: 252 million years

**Verdict:** Random keys are NOT guessable. If you're rate-limiting API calls (you should be), brute force is not a realistic threat.

> **Key insight:** For casual sharing threats, the weakness isn't key guessability—it's that valid keys can be freely shared. Signing doesn't solve this either.

---

## 2. The Short Key vs Signing Tension

### The Problem

Cryptographic signatures are inherently large:

| Algorithm | Signature Size | Encoded Size |
|-----------|---------------|--------------|
| RSA-2048 | 256 bytes | ~344 chars (base64) |
| RSA-4096 | 512 bytes | ~684 chars |
| ECDSA P-256 | 64 bytes | ~86 chars |
| Ed25519 | 64 bytes | ~86 chars |

Even the smallest signature (Ed25519) produces keys like:
```
eyJsaWQiOiIxMjM0IiwiZXhwIjoxNzM1Njg5NjAwfQ.MEUCIQDKZv8...
```

This is **fundamentally incompatible** with `XXXX-XXXX-XXXX-XXXX` format.

### Resolution Strategies

**Option A: Accept longer keys**
- Use JWT-style tokens
- Customers copy/paste, never type
- Common in enterprise software

**Option B: Short key + signed blob**
- Keep `XXXX-XXXX-XXXX-XXXX` for purchase/display
- On activation, return signed license blob
- Client caches signed blob for offline use

**Option C: Short key + signed API responses**
- Keep short keys
- Server signs validation responses
- Client can trust cached responses

**Option D: Hybrid display**
- Show short key to customers: `XXXX-XXXX-XXXX`
- Actual validation uses longer signed key
- Short key is lookup/reference only

---

## 3. Architecture Options

### Option 1: Status Quo (Enhanced)

Keep random keys, add security layers.

```
┌──────────┐        XXXX-XXXX         ┌──────────┐
│  Client  │ ────────────────────────▶│  Server  │
└──────────┘                          └────┬─────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
              ┌──────────┐          ┌──────────┐          ┌──────────┐
              │   Rate   │          │  Redis   │          │ Database │
              │ Limiting │          │  Cache   │          │          │
              └──────────┘          └──────────┘          └──────────┘
```

**Enhancements:**
- Rate limiting per IP/key
- Redis cache for hot keys
- Anomaly detection (same key, many IPs)

**Complexity:** Low
**Offline support:** No
**Revocation speed:** Instant

---

### Option 2: Signed License Blobs

Short key for purchase, signed blob for validation.

```
┌──────────────────────────────────────────────────────────────────┐
│                         ACTIVATION FLOW                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────┐   1. XXXX-XXXX-XXXX    ┌──────────┐
│  Client  │ ──────────────────────▶│  Server  │
└──────────┘                        └────┬─────┘
     ▲                                   │
     │    2. Signed License Blob         │
     │    {                              │
     │      "lid": "uuid",               │
     │      "pid": "product-uuid",       │
     │      "exp": 1735689600,           │
     │      "features": ["pro"],         │
     │      "sig": "base64..."           │
     │    }                              │
     └───────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        VALIDATION FLOW                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────┐                        ┌──────────────────┐
│  Client  │ ──────────────────────▶│ Local Validation │
└──────────┘    Cached signed blob  │ (public key)     │
                                    └──────────────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                         Valid signature?          Check expiration
                              │                         │
                              ▼                         ▼
                           [Allow]                 [Allow/Deny]
```

**How it works:**
1. Customer purchases, receives short key `XXXX-XXXX-XXXX-XXXX`
2. On first activation, client sends key to server
3. Server returns signed license blob (JSON + signature)
4. Client stores blob locally
5. Future validations check signature + expiration locally
6. Optional: periodic online refresh

**Complexity:** Medium
**Offline support:** Yes (after initial activation)
**Revocation speed:** Next refresh cycle (configurable)

---

### Option 3: JWT-Style License Tokens

Replace short keys entirely with signed tokens.

```
License Key (displayed to customer):
eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0.eyJsaWQiOiIxMjM0NTY3
OC1hYmNkLWVmZ2giLCJwaWQiOiJwcm9kXzEyMyIsImV4cCI6MTczNTY4OTYw
MCwiZmVhdHVyZXMiOlsicHJvIiwiYXBpIl19.signature_here
```

**Validation:**
```typescript
function validateLicense(token: string): LicenseData | null {
  const [header, payload, signature] = token.split('.');

  if (!verifySignature(header + '.' + payload, signature, PUBLIC_KEY)) {
    return null;
  }

  const data = JSON.parse(base64Decode(payload));
  if (data.exp < Date.now() / 1000) {
    return null;
  }

  return data;
}
```

**Complexity:** Medium
**Offline support:** Yes (fully)
**Revocation speed:** Cannot revoke (until expiration) without revocation list

---

### Option 4: Hybrid with Periodic Refresh

Best of both worlds approach.

```
┌─────────────────────────────────────────────────────────────────┐
│                      LICENSE LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

  Purchase          Activation         Daily Use          Refresh
     │                  │                  │                 │
     ▼                  ▼                  ▼                 ▼
┌─────────┐      ┌─────────────┐    ┌───────────┐    ┌─────────────┐
│  Short  │      │   Server    │    │  Offline  │    │   Server    │
│   Key   │─────▶│  Activation │───▶│ Validation│───▶│   Refresh   │
│  Given  │      │  + Signed   │    │  (local)  │    │  (periodic) │
└─────────┘      │   Blob      │    └───────────┘    └─────────────┘
                 └─────────────┘
                       │
                       ▼
              Short-lived signed blob
              (e.g., 7-day validity)
              Forces periodic check-in
```

**Key properties:**
- Short key for customer-facing use
- Signed blob with SHORT expiration (7 days)
- Must refresh online periodically
- Revocation effective within refresh window
- Graceful offline: works for expiration period

**Complexity:** Medium-High
**Offline support:** Yes (time-limited)
**Revocation speed:** Within refresh window (e.g., 7 days max)

---

## 4. License Data: What to Embed

### Minimal (Recommended Starting Point)

```typescript
interface MinimalLicense {
  lid: string;      // License ID (for revocation checks)
  exp: number;      // Expiration timestamp
  sig: string;      // Signature
}
```

**Pros:**
- Smallest payload
- Flexibility: all other data fetched online
- Changes don't require new license

**Cons:**
- Can't enforce features offline
- Can't do offline activation limits

---

### Moderate (Good Balance)

```typescript
interface ModerateLicense {
  lid: string;      // License ID
  pid: string;      // Product ID
  exp: number;      // Expiration timestamp
  tier: string;     // "starter" | "pro" | "enterprise"
  maxAct: number;   // Max activations
  sig: string;      // Signature
}
```

**Pros:**
- Offline feature gating
- Offline activation limit display
- Self-contained for most use cases

**Cons:**
- Tier changes require new license
- Larger payload

---

### Rich (Complex Cases)

```typescript
interface RichLicense {
  lid: string;
  pid: string;
  cid: string;           // Customer ID
  exp: number;
  iat: number;           // Issued at
  tier: string;
  features: string[];    // Granular feature flags
  maxAct: number;
  meta: Record<string, unknown>;  // Custom fields
  sig: string;
}
```

**Pros:**
- Complete offline capability
- Custom metadata per customer

**Cons:**
- Large payload
- Inflexible: any change = new license
- More surface area for bugs

---

### Recommendation

**Start minimal, expand if needed.**

For your use case (casual sharing threat, hours-acceptable revocation):

```typescript
interface RecommendedLicense {
  lid: string;      // For revocation lookups
  pid: string;      // Which product
  exp: number;      // When it expires (short: 7-30 days)
  v: number;        // Schema version (for future changes)
}
```

Keep tier, features, activation limits in the database. The signed blob just proves "this license was valid when issued" and provides a refresh deadline.

---

## 5. Cryptographic Algorithm Choices

### Comparison

| Algorithm | Key Size | Sig Size | Speed | Notes |
|-----------|----------|----------|-------|-------|
| RSA-2048 | 256 B | 256 B | Slow | Legacy, well-understood |
| RSA-4096 | 512 B | 512 B | Very slow | Overkill |
| ECDSA P-256 | 32 B | 64 B | Fast | NIST standard, some complexity |
| **Ed25519** | 32 B | 64 B | **Very fast** | **Recommended**: modern, simple, no pitfalls |

### Why Ed25519?

1. **Small signatures**: 64 bytes vs 256+ for RSA
2. **Fast**: Verification is ~10x faster than RSA
3. **Deterministic**: Same input = same signature (easier testing)
4. **No footguns**: Unlike ECDSA, no random nonce issues
5. **Widely supported**: Node.js, Go, Rust, Python all have native support

### Implementation

```typescript
// Node.js (built-in crypto)
import { generateKeyPairSync, sign, verify } from 'crypto';

// Generate keypair (do once, store securely)
const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Sign
function signLicense(data: object): string {
  const payload = JSON.stringify(data);
  const signature = sign(null, Buffer.from(payload), privateKey);
  return `${base64url(payload)}.${base64url(signature)}`;
}

// Verify
function verifyLicense(token: string): object | null {
  const [payloadB64, sigB64] = token.split('.');
  const payload = Buffer.from(payloadB64, 'base64url');
  const signature = Buffer.from(sigB64, 'base64url');

  if (!verify(null, payload, publicKey, signature)) {
    return null;
  }
  return JSON.parse(payload.toString());
}
```

---

## 6. Revocation Strategies

Since you indicated "hours acceptable" for revocation, here are the options:

### Strategy A: Short-Lived Tokens (Recommended)

Issue signed blobs with 7-30 day expiration. Client must refresh periodically.

```
Revocation time = max(time until next refresh, token expiration)
```

**Pros:**
- Simple
- No revocation infrastructure
- Natural expiration handles everything

**Cons:**
- Max revocation delay = token lifetime
- Offline use limited to token lifetime

---

### Strategy B: Revocation List (CRL-style)

Maintain list of revoked license IDs. Client downloads periodically.

```typescript
// Server provides revocation list
GET /api/licenses/revoked
Response: {
  revoked: ["lid-123", "lid-456"],
  updatedAt: "2025-01-01T00:00:00Z",
  nextUpdate: "2025-01-01T01:00:00Z"
}

// Client checks
function isRevoked(lid: string, revocationList: string[]): boolean {
  return revocationList.includes(lid);
}
```

**Pros:**
- Can revoke any license immediately (on next list fetch)
- Long-lived tokens possible

**Cons:**
- More infrastructure
- List grows over time (bloom filter can help)
- Client must fetch list periodically

---

### Strategy C: Online Check + Offline Grace

Always try online check. Fall back to cached signed blob if offline.

```typescript
async function validateLicense(token: string): Promise<boolean> {
  // Try online first
  try {
    const response = await fetch('/api/licenses/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000)
    });
    const { valid, updatedToken } = await response.json();
    if (updatedToken) cacheToken(updatedToken);
    return valid;
  } catch {
    // Offline fallback
    return validateOffline(token);
  }
}
```

**Pros:**
- Revocation instant when online
- Graceful offline degradation

**Cons:**
- Two code paths
- Network latency when online

---

### Recommendation

**Strategy A (Short-Lived Tokens)** for your use case:

- 7-day token lifetime
- Revocation within 7 days maximum
- Simple implementation
- No revocation list infrastructure
- Natural offline support (7 days)

---

## 7. Operational Complexity Comparison

| Aspect | Random Keys | Signed Keys |
|--------|-------------|-------------|
| **Key generation** | `crypto.randomUUID()` | Keypair management required |
| **Secret storage** | None | Private key in vault/HSM |
| **Key rotation** | N/A | Need rotation strategy |
| **Backup/recovery** | Database backup | Database + private key backup |
| **Multi-region** | Database replication | Key distribution + DB replication |
| **Debugging** | Query database | Decode token + query database |
| **Monitoring** | Standard API metrics | + signature verification metrics |

### Key Management Considerations

**Where to store private signing key:**

1. **Environment variable** (Simplest)
   - Pros: Easy, works everywhere
   - Cons: Visible in process dumps, logs, config

2. **AWS KMS / GCP Cloud KMS / Azure Key Vault**
   - Pros: Hardware-backed, audit log, never exposed
   - Cons: Added latency (~50-100ms per sign), vendor lock-in

3. **HashiCorp Vault**
   - Pros: Self-hosted, flexible, transit secrets engine
   - Cons: Operational overhead, another service to maintain

4. **Hardware Security Module (HSM)**
   - Pros: Highest security, tamper-resistant
   - Cons: Expensive, complex, usually overkill

**Recommendation for your scale:** Start with environment variable (encrypted at rest in your deployment platform). Graduate to KMS if you hit compliance requirements or scale.

---

## 8. Code Complexity Comparison

### Current System: ~50 lines

```typescript
// Generation
const key = Array.from({ length: 4 }, () =>
  Array.from({ length: 4 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
  ).join('')
).join('-');

// Validation
const license = await db.query.license.findFirst({
  where: { key },
  with: { product: true, activations: true }
});

if (!license) return { valid: false, error: 'Invalid key' };
if (license.status !== 'active') return { valid: false, error: 'License inactive' };
if (license.expiresAt && license.expiresAt < new Date()) {
  return { valid: false, error: 'License expired' };
}

return { valid: true, license };
```

### Signed System: ~150-200 lines

```typescript
// === Key Management (20 lines) ===
import { createPrivateKey, createPublicKey, sign, verify } from 'crypto';

const privateKey = createPrivateKey(process.env.LICENSE_PRIVATE_KEY!);
const publicKey = createPublicKey(process.env.LICENSE_PUBLIC_KEY!);

// === Token Generation (30 lines) ===
interface LicensePayload {
  lid: string;
  pid: string;
  exp: number;
  v: number;
}

function createSignedToken(payload: LicensePayload): string {
  const data = JSON.stringify(payload);
  const signature = sign(null, Buffer.from(data), privateKey);
  return `${Buffer.from(data).toString('base64url')}.${signature.toString('base64url')}`;
}

// === Token Verification (40 lines) ===
function verifyToken(token: string): LicensePayload | null {
  try {
    const [dataB64, sigB64] = token.split('.');
    if (!dataB64 || !sigB64) return null;

    const data = Buffer.from(dataB64, 'base64url');
    const signature = Buffer.from(sigB64, 'base64url');

    if (!verify(null, data, publicKey, signature)) {
      return null;
    }

    const payload: LicensePayload = JSON.parse(data.toString());

    if (payload.exp < Date.now() / 1000) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

// === Activation Flow (50 lines) ===
async function activateLicense(shortKey: string, machineId: string) {
  // 1. Look up license by short key
  const license = await db.query.license.findFirst({
    where: { key: shortKey },
    with: { activations: true }
  });

  if (!license) return { error: 'Invalid key' };
  if (license.status !== 'active') return { error: 'License inactive' };
  if (license.activations.length >= license.maxActivations) {
    return { error: 'Activation limit reached' };
  }

  // 2. Record activation
  await db.insert(activation).values({
    licenseId: license.id,
    machineId,
    activatedAt: new Date()
  });

  // 3. Generate signed token
  const token = createSignedToken({
    lid: license.id,
    pid: license.productId,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    v: 1
  });

  return { token };
}

// === Validation (online + offline) (40 lines) ===
async function validateLicense(token: string) {
  // 1. Verify signature and expiration (offline capable)
  const payload = verifyToken(token);
  if (!payload) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  // 2. Optional: online revocation check
  try {
    const license = await db.query.license.findFirst({
      where: { id: payload.lid }
    });
    if (license?.status === 'revoked') {
      return { valid: false, error: 'License revoked' };
    }
  } catch {
    // Offline: trust the token
  }

  return { valid: true, licenseId: payload.lid };
}
```

### Complexity Summary

| Metric | Random Keys | Signed Keys | Delta |
|--------|-------------|-------------|-------|
| Lines of code | ~50 | ~150-200 | +3-4x |
| New dependencies | 0 | 0 (crypto is built-in) | 0 |
| New concepts | 0 | Ed25519, base64url, token parsing | 3 |
| Error cases | 3-4 | 6-8 | +2x |
| Test scenarios | ~10 | ~20 | +2x |

---

## 9. Recommendations

### For Your Specific Situation

Given:
- Casual sharing is the threat (not sophisticated attacks)
- Hours-acceptable revocation
- Short keys preferred
- Offline is "nice to have"
- Security hardening goal

**Recommended: Option 2 with Strategy A**

```
┌────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED ARCHITECTURE                     │
└────────────────────────────────────────────────────────────────┘

                    Customer-Facing                Internal
                    ──────────────                ────────

                    ABCD-EFGH-IJKL    ───────▶    Signed Token
                    (short, memorable)            (7-day validity)

                    Used for:                     Used for:
                    • Purchase emails             • API validation
                    • Support tickets             • Offline caching
                    • Dashboard display           • Audit trail
```

**Why this works for you:**

1. **Short keys preserved** - Customers see `XXXX-XXXX-XXXX-XXXX`
2. **Security improved** - Tokens are tamper-proof, verifiable offline
3. **Revocation in hours** - 7-day token lifetime means max 7 days to revoke
4. **Offline capable** - Signed tokens validate without network
5. **Moderate complexity** - ~150 lines vs ~50, but manageable
6. **Casual sharing addressed** - Not really (sharing still works), but tokens can track abuse patterns

### Honest Assessment: Does Signing Help Your Threat Model?

**For casual sharing: Not much.**

A user who shares `XXXX-XXXX-XXXX-XXXX` can just as easily share the signed token. Signing prevents:
- Key guessing (already not viable with random keys)
- Response tampering (mitigation, not prevention)
- Server impersonation (if client validates signatures)

**What actually helps with casual sharing:**
- Activation limits (already have this)
- Machine fingerprinting
- Concurrent use detection
- Usage analytics to detect abuse patterns

**Signing does help with:**
- Offline validation
- Reducing database load at scale
- Defense in depth

### Alternative: Enhanced Random Keys

If offline isn't critical and you want minimal change:

```typescript
// Keep everything the same, add:
// 1. Rate limiting per key
// 2. Redis cache for hot keys
// 3. Anomaly detection (same key, many IPs/machines)
// 4. Short key rotation on suspicious activity
```

**Complexity:** Very low
**Effectiveness against casual sharing:** Similar to signing
**Effort:** Days vs weeks

---

## 10. Migration Path

If proceeding with signed keys:

### Phase 1: Infrastructure (Week 1)
- [ ] Generate Ed25519 keypair
- [ ] Store private key securely
- [ ] Add public key to client configuration
- [ ] Implement token generation

### Phase 2: New Licenses (Week 2)
- [ ] New licenses get signed tokens at activation
- [ ] Existing licenses continue with database validation
- [ ] Add token validation endpoint

### Phase 3: Migration (Week 3-4)
- [ ] Prompt existing users to "refresh" license on next launch
- [ ] Issue signed tokens for existing valid licenses
- [ ] Monitor adoption rate

### Phase 4: Deprecation (Month 2+)
- [ ] Warn users still on old system
- [ ] Set deadline for short-key-only validation
- [ ] Eventually require signed tokens

---

## 11. Open Questions

1. **Token refresh UX**: How should the client handle expired tokens? Silent refresh? User prompt?

2. **Grace period**: If token expires and user is offline, deny immediately or allow grace period?

3. **Token storage**: Where should clients store signed tokens? File? Registry? Keychain?

4. **Multi-device**: Same license on multiple devices—each gets own token? Shared token?

5. **Upgrade path**: If we add features to the token payload later, how do we handle old tokens?

6. **Audit**: Do we need to log every token issuance/validation? How long to retain?

---

## Decision Checklist

Before finalizing, we should align on:

- [ ] **Primary goal**: Offline support vs security hardening vs scalability?
- [ ] **Token lifetime**: 7 days? 30 days? Customer expectation?
- [ ] **Offline grace**: Strict expiration or 24-48h grace?
- [ ] **Key storage**: Env var for now, KMS later?
- [ ] **Migration timeline**: Aggressive or gradual?
- [ ] **Client impact**: SDK changes required? Breaking change?

---

## Appendix A: Quick Reference

### Token Format

```
{base64url(JSON payload)}.{base64url(Ed25519 signature)}

Example:
eyJsaWQiOiJhYmMxMjMiLCJwaWQiOiJwcm9kXzEiLCJleHAiOjE3MzU2ODk2MDAsInYiOjF9.MEUCIQDKZv8F...
```

### Payload Schema (v1)

```typescript
{
  "lid": "abc123",           // License ID (UUID)
  "pid": "prod_1",           // Product ID
  "exp": 1735689600,         // Expiration (Unix timestamp)
  "v": 1                     // Schema version
}
```

### Key Size Estimates

| Payload fields | JSON size | + Signature | Total (base64) |
|----------------|-----------|-------------|----------------|
| Minimal (4 fields) | ~60 bytes | +64 bytes | ~166 chars |
| Moderate (8 fields) | ~120 bytes | +64 bytes | ~246 chars |
| Rich (15 fields) | ~250 bytes | +64 bytes | ~420 chars |

---

*Last updated: 2025-01-01*
