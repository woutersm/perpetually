const LICENSE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SECRET_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Uniformly pick `length` characters using a CSPRNG (rejection sampling avoids modulo bias)
function randomString(alphabet: string, length: number): string {
  const limit = 256 - (256 % alphabet.length);
  let result = "";
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit) result += alphabet[byte % alphabet.length];
      if (result.length === length) break;
    }
  }
  return result;
}

/** License key, e.g. 7X1S-TT0F-3QAX-Z4F0 */
export function generateLicenseKey(): string {
  return Array.from({ length: 4 }, () => randomString(LICENSE_ALPHABET, 4)).join("-");
}

/** Secret API key used by the /api/v1 endpoints */
export function generateSecretKey(): string {
  return `sk_live_${randomString(SECRET_ALPHABET, 32)}`;
}

/** Publishable organization key */
export function generatePublishableKey(): string {
  return `pk_${crypto.randomUUID().replace(/-/g, "")}`;
}
