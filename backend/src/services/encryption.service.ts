import crypto from 'crypto';

/**
 * Encryption service using AES-256-GCM (authenticated encryption)
 *
 * Features:
 * - Encryption: AES-256-GCM provides strong encryption
 * - Authentication: GCM mode provides tamper detection
 * - Unique IV: Each encryption uses a random IV (initialization vector)
 * - Base64 encoding: Encrypted data is base64-encoded for easy storage
 *
 * Security notes:
 * - The encryption key MUST be exactly 32 bytes (256 bits)
 * - The key MUST be kept secret and stored in environment variables
 * - Never commit the encryption key to version control
 * - If the key is lost, encrypted data cannot be recovered
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

class EncryptionService {
  private encryptionKey: Buffer;

  constructor() {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    try {
      this.encryptionKey = Buffer.from(ENCRYPTION_KEY, 'base64');

      if (this.encryptionKey.length !== 32) {
        throw new Error(`Encryption key must be exactly 32 bytes, got ${this.encryptionKey.length} bytes`);
      }
    } catch (error) {
      throw new Error(`Failed to initialize encryption service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt a string value
   * @param plaintext - The plain text string to encrypt
   * @returns Base64-encoded encrypted data with format: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    try {
      // Generate a random IV for this encryption
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

      // Encrypt the data
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + ciphertext and encode as base64
      // Format: iv:authTag:ciphertext (all base64-encoded)
      const encrypted = `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;

      return encrypted;
    } catch (error) {
      console.error('[Encryption Service] Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string
   * @param encrypted - Base64-encoded encrypted data with format: iv:authTag:ciphertext
   * @returns The decrypted plaintext string
   */
  decrypt(encrypted: string): string {
    try {
      // Split the encrypted data into components
      const parts = encrypted.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const ciphertext = parts[2];

      // Validate sizes
      if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid IV length');
      }

      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      console.error('[Encryption Service] Decryption error:', error);
      throw new Error('Failed to decrypt data - data may be corrupted or tampered with');
    }
  }

  /**
   * Encrypt a JSON object
   * @param data - The object to encrypt
   * @returns Base64-encoded encrypted data
   */
  encryptJSON(data: any): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt to a JSON object
   * @param encrypted - Base64-encoded encrypted data
   * @returns The decrypted object
   */
  decryptJSON<T = any>(encrypted: string): T {
    const jsonString = this.decrypt(encrypted);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Hash a value (one-way, for verification only)
   * Useful for storing hashed values that don't need to be decrypted
   * @param value - The value to hash
   * @returns Hex-encoded hash
   */
  hash(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex');
  }

  /**
   * Verify a value against a hash
   * @param value - The value to verify
   * @param hash - The hash to compare against
   * @returns True if the value matches the hash
   */
  verifyHash(value: string, hash: string): boolean {
    const valueHash = this.hash(value);
    return crypto.timingSafeEqual(
      Buffer.from(valueHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export class for testing
export { EncryptionService };
