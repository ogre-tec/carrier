import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  generateKeyPairSync,
  publicEncrypt,
  privateDecrypt,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  constants,
} from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

interface EncryptedData {
  encryptedKey: string;
  iv: string;
  authTag: string;
  data: string;
}

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private publicKey: string;
  private privateKey: string;
  private keysPath: string;

  constructor() {
    const dataPath = process.env.DATA_PATH || join(process.cwd(), 'data');
    this.keysPath = join(dataPath, 'keys');
  }

  onModuleInit() {
    this.loadOrGenerateKeys();
  }

  private loadOrGenerateKeys(): void {
    const publicKeyPath = join(this.keysPath, 'public.pem');
    const privateKeyPath = join(this.keysPath, 'private.pem');

    if (existsSync(publicKeyPath) && existsSync(privateKeyPath)) {
      this.logger.log('Loading existing encryption keys');
      this.publicKey = readFileSync(publicKeyPath, 'utf-8');
      this.privateKey = readFileSync(privateKeyPath, 'utf-8');
    } else {
      this.logger.log('Generating new RSA key pair');
      this.generateKeys(publicKeyPath, privateKeyPath);
    }
  }

  private generateKeys(publicKeyPath: string, privateKeyPath: string): void {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;

    // Ensure directory exists
    const dir = dirname(publicKeyPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Save keys to files with restrictive permissions
    writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });
    writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

    this.logger.log('RSA key pair generated and saved');
  }

  decryptData(encryptedString: string): Record<string, string> {
    const data = JSON.parse(encryptedString);
    const dec = Object.keys(data).reduce((acc, key) => {
      const value = data[key];
      // const decryptedKeyData = privateDecrypt(this.privateKey, Buffer.from(key, "base64"));
      // const decryptedKey = decryptedKeyData.toString("utf8")
      const decryptedValueData = privateDecrypt(this.privateKey, Buffer.from(value, "base64"));
      const decryptedValue = decryptedValueData.toString("utf8")
      return {
        // [decryptedKey]: decryptedValue,
        [key]: decryptedValue,
        ...acc,
      };
    }, {} as Record<string, string>);
    return dec;
  }

  encryptData(data: Record<string, string>): string {
    const enc = Object.keys(data).reduce((acc, key) => {
      // const encryptedKeyData = publicEncrypt(this.publicKey, Buffer.from(key));
      // const encryptedKey = encryptedKeyData.toString("base64");
      const encryptedValueData = publicEncrypt(this.publicKey, Buffer.from(data[key]));
      const encryptedValue = encryptedValueData.toString("base64");
      return {
        // [encryptedKey]: encryptedValue,
        [key]: encryptedValue,
        ...acc,
      };
    }, {} as Record<string, string>);
    return JSON.stringify(enc);
  }
  
  encrypt(plaintext: string): string {
    if (!plaintext || plaintext === '{}') {
      return plaintext;
    }

    // Generate a random AES-256 key
    const aesKey = randomBytes(32);
    const iv = randomBytes(16);

    // Encrypt the data with AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Encrypt the AES key with RSA
    const encryptedKey = publicEncrypt(
      {
        key: this.publicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey,
    );

    const result: EncryptedData = {
      encryptedKey: encryptedKey.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted,
    };

    return JSON.stringify(result);
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext || ciphertext === '{}') {
      return ciphertext;
    }

    // Check if data is encrypted (JSON with expected fields)
    let encryptedData: EncryptedData;
    try {
      encryptedData = JSON.parse(ciphertext);
      if (!encryptedData.encryptedKey || !encryptedData.iv || !encryptedData.authTag || !encryptedData.data) {
        // Not encrypted data, return as-is (backwards compatibility)
        return ciphertext;
      }
    } catch {
      // Not valid JSON, return as-is (backwards compatibility with plain text)
      return ciphertext;
    }

    // Decrypt the AES key with RSA
    const aesKey = privateDecrypt(
      {
        key: this.privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encryptedData.encryptedKey, 'base64'),
    );

    // Decrypt the data with AES-256-GCM
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  isEncrypted(data: string): boolean {
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return !!(parsed.encryptedKey && parsed.iv && parsed.authTag && parsed.data);
    } catch {
      return false;
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}
