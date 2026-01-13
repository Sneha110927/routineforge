export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function minLen(v: string, n: number) {
  return (v ?? '').trim().length >= n;
}
