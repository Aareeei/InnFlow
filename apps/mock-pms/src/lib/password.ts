export async function verifyPmsPassword(password: string, hash: string): Promise<boolean> {
  const argon2 = await import('argon2');
  try {
    return await argon2.default.verify(hash, password);
  } catch {
    return false;
  }
}
