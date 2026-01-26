import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Deployment } from './deployment.entity';

describe('Deployment Entity', () => {
  let deployment: Deployment;

  beforeEach(() => {
    deployment = new Deployment();
    deployment.id = 'deployment-123';
    deployment.environmentId = 'env-123';
    deployment.status = 'pending';
    deployment.logs = null;
    deployment.createdAt = new Date();
  });

  describe('appendLog', () => {
    it('should append a log message with timestamp', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      deployment.appendLog('Test message');

      expect(deployment.logs).toBe('[2024-01-15T10:30:00.000Z] Test message\n');

      vi.useRealTimers();
    });

    it('should append to existing logs', () => {
      const mockDate = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      deployment.logs = '[2024-01-15T10:29:00.000Z] Previous message\n';
      deployment.appendLog('New message');

      expect(deployment.logs).toBe(
        '[2024-01-15T10:29:00.000Z] Previous message\n[2024-01-15T10:30:00.000Z] New message\n',
      );

      vi.useRealTimers();
    });

    it('should handle null logs by initializing to empty string', () => {
      deployment.logs = null;
      deployment.appendLog('First message');

      expect(deployment.logs).toContain('First message');
      expect(deployment.logs).not.toContain('null');
    });

    it('should handle empty string logs', () => {
      deployment.logs = '';
      deployment.appendLog('Message');

      expect(deployment.logs).toContain('Message');
    });

    it('should include ISO timestamp format', () => {
      deployment.appendLog('Test');

      // Check for ISO timestamp pattern
      const isoPattern = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
      expect(deployment.logs).toMatch(isoPattern);
    });

    it('should handle special characters in messages', () => {
      deployment.appendLog('Message with "quotes" and <tags>');

      expect(deployment.logs).toContain('Message with "quotes" and <tags>');
    });

    it('should handle multiline messages', () => {
      deployment.appendLog('Line 1\nLine 2\nLine 3');

      expect(deployment.logs).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should handle empty message', () => {
      deployment.appendLog('');

      expect(deployment.logs).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \n/);
    });
  });

  describe('status types', () => {
    it('should accept pending status', () => {
      deployment.status = 'pending';
      expect(deployment.status).toBe('pending');
    });

    it('should accept building status', () => {
      deployment.status = 'building';
      expect(deployment.status).toBe('building');
    });

    it('should accept running status', () => {
      deployment.status = 'running';
      expect(deployment.status).toBe('running');
    });

    it('should accept stopped status', () => {
      deployment.status = 'stopped';
      expect(deployment.status).toBe('stopped');
    });

    it('should accept failed status', () => {
      deployment.status = 'failed';
      expect(deployment.status).toBe('failed');
    });
  });

  describe('optional fields', () => {
    it('should allow null logs', () => {
      deployment.logs = null;
      expect(deployment.logs).toBeNull();
    });

    it('should allow null startedAt', () => {
      deployment.startedAt = null;
      expect(deployment.startedAt).toBeNull();
    });

    it('should allow null finishedAt', () => {
      deployment.finishedAt = null;
      expect(deployment.finishedAt).toBeNull();
    });

    it('should allow Date for startedAt', () => {
      const date = new Date();
      deployment.startedAt = date;
      expect(deployment.startedAt).toBe(date);
    });

    it('should allow Date for finishedAt', () => {
      const date = new Date();
      deployment.finishedAt = date;
      expect(deployment.finishedAt).toBe(date);
    });
  });
});
