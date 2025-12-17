/**
 * JWT utilities with Edge Runtime support
 * Uses Web Crypto API instead of Node.js crypto
 */

export interface AuthPayload {
  userId: string;
  exp?: number;
}

function base64urlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...Array.from(buffer)));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(base64url: string): Uint8Array {
  const base64 = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binaryString = atob(base64);
  return Uint8Array.from(binaryString, char => char.charCodeAt(0));
}

function textToUint8Array(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

function uint8ArrayToText(array: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(array);
}

async function hmacSha256(key: string, data: string): Promise<Uint8Array> {
  const keyData = textToUint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const dataArray = textToUint8Array(data);
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    dataArray as BufferSource
  );
  return new Uint8Array(signature);
}

/**
 * Sign JWT with HS256 using Web Crypto API
 * Compatible with Edge Runtime
 */
export async function signJwt(payload: AuthPayload, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64urlEncode(textToUint8Array(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(textToUint8Array(JSON.stringify(payload)));
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const signatureBytes = await hmacSha256(secret, data);
  const encodedSignature = base64urlEncode(signatureBytes);
  
  return `${data}.${encodedSignature}`;
}

/**
 * Verify and decode JWT using Web Crypto API
 * Compatible with Edge Runtime
 */
export async function verifyJwt(token: string, secret: string): Promise<AuthPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Verify signature
  const expectedSignatureBytes = await hmacSha256(secret, data);
  const expectedSignature = base64urlEncode(expectedSignatureBytes);
  
  if (expectedSignature !== encodedSignature) {
    return null;
  }
  
  // Decode payload
  let payload: AuthPayload;
  try {
    const payloadBytes = base64urlDecode(encodedPayload);
    const payloadStr = uint8ArrayToText(payloadBytes);
    payload = JSON.parse(payloadStr) as AuthPayload;
  } catch {
    return null;
  }
  
  // Validate payload
  if (!payload.userId) return null;
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  
  return payload;
}

/**
 * Decode JWT token (validates signature)
 * Compatible with Edge Runtime
 */
export async function decodeAuthToken(token: string): Promise<AuthPayload | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  return verifyJwt(token, secret);
}

/**
 * Create new JWT token
 * Compatible with Edge Runtime
 */
export async function createAuthToken(userId: string, ttlSeconds: number): Promise<string> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is not configured");
  
  const payload: AuthPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  
  return signJwt(payload, secret);
}
