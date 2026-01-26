import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { CryptoService } from './crypto.service';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('CryptoService', () => {
  let service: CryptoService;
  let testDataPath: string;

  beforeAll(() => {
    testDataPath = join(process.cwd(), 'test-data-crypto');
    process.env.DATA_PATH = testDataPath;
  });

  afterAll(() => {
    delete process.env.DATA_PATH;
    if (existsSync(testDataPath)) {
      rmSync(testDataPath, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    if (existsSync(testDataPath)) {
      rmSync(testDataPath, { recursive: true, force: true });
    }
    mkdirSync(testDataPath, { recursive: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    service.onModuleInit();
  });

  afterEach(() => {
    if (existsSync(testDataPath)) {
      rmSync(testDataPath, { recursive: true, force: true });
    }
  });

  describe('key generation', () => {
    it('should generate keys on module init', () => {
      const keysPath = join(testDataPath, 'keys');
      expect(existsSync(join(keysPath, 'public.pem'))).toBe(true);
      expect(existsSync(join(keysPath, 'private.pem'))).toBe(true);
    });

    it('should have a valid public key', () => {
      const publicKey = service.getPublicKey();
      expect(publicKey).toBeDefined();
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });

    it('should load existing keys on subsequent init', async () => {
      const firstPublicKey = service.getPublicKey();

      // Create a new service instance that should load the existing keys
      const module: TestingModule = await Test.createTestingModule({
        providers: [CryptoService],
      }).compile();

      const newService = module.get<CryptoService>(CryptoService);
      newService.onModuleInit();
      expect(newService.getPublicKey()).toBe(firstPublicKey);
    });
  });

  describe('encrypt', () => {
    it('should encrypt plaintext and return JSON string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(() => JSON.parse(encrypted)).not.toThrow();

      const parsed = JSON.parse(encrypted);
      expect(parsed.encryptedKey).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.authTag).toBeDefined();
      expect(parsed.data).toBeDefined();
    });

    it('should return empty string as-is', () => {
      expect(service.encrypt('')).toBe('');
    });

    it('should return empty object string as-is', () => {
      expect(service.encrypt('{}')).toBe('{}');
    });

    it('should encrypt JSON data', () => {
      const data = JSON.stringify({ API_KEY: 'secret123', DB_URL: 'postgres://localhost' });
      const encrypted = service.encrypt(data);

      expect(encrypted).not.toBe(data);
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data back to original', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return empty string as-is', () => {
      expect(service.decrypt('')).toBe('');
    });

    it('should return empty object string as-is', () => {
      expect(service.decrypt('{}')).toBe('{}');
    });

    it('should handle backwards compatibility with plain JSON', () => {
      const plainJson = JSON.stringify({ key: 'value' });
      const result = service.decrypt(plainJson);

      expect(result).toBe(plainJson);
    });

    it('should handle backwards compatibility with plain text', () => {
      const plainText = 'not json at all';
      const result = service.decrypt(plainText);

      expect(result).toBe(plainText);
    });

    it('should handle JSON without encryption fields', () => {
      const json = JSON.stringify({ foo: 'bar', baz: 123 });
      const result = service.decrypt(json);

      expect(result).toBe(json);
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should handle simple strings', () => {
      const original = 'simple string';
      expect(service.decrypt(service.encrypt(original))).toBe(original);
    });

    it('should handle JSON objects', () => {
      const original = JSON.stringify({
        API_KEY: 'sk-1234567890',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
        SECRET: 'my-secret-value',
      });
      expect(service.decrypt(service.encrypt(original))).toBe(original);
    });

    it('should handle special characters', () => {
      const original = 'Special chars: éàü 中文 🎉 \n\t"quotes"';
      expect(service.decrypt(service.encrypt(original))).toBe(original);
    });

    it('should handle large data', () => {
      const original = 'x'.repeat(10000);
      expect(service.decrypt(service.encrypt(original))).toBe(original);
    });

    it('should handle nested JSON', () => {
      const original = JSON.stringify({
        level1: {
          level2: {
            level3: {
              value: 'deep nested value',
            },
          },
        },
        array: [1, 2, 3, { nested: true }],
      });
      expect(service.decrypt(service.encrypt(original))).toBe(original);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const encrypted = service.encrypt('test data');
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for plain JSON', () => {
      expect(service.isEncrypted(JSON.stringify({ key: 'value' }))).toBe(false);
    });

    it('should return false for plain text', () => {
      expect(service.isEncrypted('plain text')).toBe(false);
    });

    it('should return false for partial encryption fields', () => {
      const partial = JSON.stringify({ encryptedKey: 'test', iv: 'test' });
      expect(service.isEncrypted(partial)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.isEncrypted(null as unknown as string)).toBe(false);
      expect(service.isEncrypted(undefined as unknown as string)).toBe(false);
    });
  });

  describe('getPublicKey', () => {
    it('should return the public key in PEM format', () => {
      const publicKey = service.getPublicKey();
      expect(publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
      expect(publicKey).toMatch(/-----END PUBLIC KEY-----\n?$/);
    });
  });

  describe('security', () => {
    it('should use AES-256-GCM which provides authenticated encryption', () => {
      const encrypted = service.encrypt('test');
      const parsed = JSON.parse(encrypted);

      // Auth tag should be present for GCM mode
      expect(parsed.authTag).toBeDefined();
      // Auth tag for GCM is 16 bytes = 24 base64 chars (with padding)
      expect(Buffer.from(parsed.authTag, 'base64').length).toBe(16);
    });

    it('should use 256-bit AES key (encrypted key size indicates RSA-4096)', () => {
      const encrypted = service.encrypt('test');
      const parsed = JSON.parse(encrypted);

      // RSA-4096 produces 512 byte output = 684 base64 chars
      const keyBuffer = Buffer.from(parsed.encryptedKey, 'base64');
      expect(keyBuffer.length).toBe(512);
    });

    it('should fail decryption if auth tag is tampered', () => {
      const encrypted = service.encrypt('test');
      const parsed = JSON.parse(encrypted);

      // Tamper with auth tag
      const tamperedTag = Buffer.from(parsed.authTag, 'base64');
      tamperedTag[0] = tamperedTag[0] ^ 0xff;
      parsed.authTag = tamperedTag.toString('base64');

      expect(() => service.decrypt(JSON.stringify(parsed))).toThrow();
    });

    it('should fail decryption if data is tampered', () => {
      const encrypted = service.encrypt('test');
      const parsed = JSON.parse(encrypted);

      // Tamper with encrypted data
      const tamperedData = Buffer.from(parsed.data, 'base64');
      if (tamperedData.length > 0) {
        tamperedData[0] = tamperedData[0] ^ 0xff;
        parsed.data = tamperedData.toString('base64');
      }

      expect(() => service.decrypt(JSON.stringify(parsed))).toThrow();
    });
  });
});
