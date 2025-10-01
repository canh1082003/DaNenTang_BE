import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(scrypt);

export class Hashing {
  static async toHash(toHash: string) {
    const salt = randomBytes(8).toString('hex');
    const buf = (await scryptAsync(toHash, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }
  static async compare(storedHash: string, suppliedHash: string) {
    const [hashed, salt] = storedHash.split('.');
    const buf = (await scryptAsync(suppliedHash, salt, 64)) as Buffer;
    return buf.toString('hex') === hashed;
  }
}
