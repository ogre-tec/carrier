import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

export type EnvironmentStatus = 'running' | 'stopped' | 'error' | 'building';

@Entity('environments')
export class Environment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ type: 'text', default: '{}' })
  variables: string;

  @Column({ type: 'text', default: 'stopped' })
  status: EnvironmentStatus;

  @Column({ nullable: true, type: 'integer' })
  port: number | null;

  @Column({ nullable: true, type: 'integer' })
  pid: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  getVariables(): Record<string, string> {
    try {
      return JSON.parse(this.variables);
    } catch {
      return {};
    }
  }

  getDecryptedVariables(decryptFn: (data: string) => Record<string, string>): Record<string, string> {
    try {
      return decryptFn(this.variables);
    } catch {
      return {};
    }
  }

  setVariables(vars: Record<string, string>): void {
    this.variables = JSON.stringify(vars);
  }

  setEncryptedVariables(vars: Record<string, string>, encryptFn: (data: Record<string, string>) => string): void {
    this.variables = encryptFn(vars);
  }
}
