import crypto from 'crypto';
export function generateEmail(id: string, name: string): string {
  const base = id + name;
  const hash = crypto
    .createHash('sha256')
    .update(base)
    .digest('hex')
    .slice(0, 8);
  return `${name.toLowerCase().replace(/\s+/g, '')}.${hash}@messenger.local`;
}
