export interface PasswordRecord {
  salt: string;
  hash: string;
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (x) => x.toString(16).padStart(2, "0")).join("");
export async function hashPassword(password: string, salt?: string): Promise<PasswordRecord> {
  const actualSalt = salt ?? hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(actualSalt),
      iterations: 100000,
    },
    key,
    256,
  );
  return { salt: actualSalt, hash: hex(hash) };
}
export async function verifyPassword(password: string, record: PasswordRecord) {
  return (await hashPassword(password, record.salt)).hash === record.hash;
}
