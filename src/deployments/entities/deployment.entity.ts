import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Environment } from '../../environments/entities/environment.entity';

export type DeploymentStatus = 'pending' | 'building' | 'running' | 'stopped' | 'failed';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  environmentId: string;

  @ManyToOne(() => Environment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environmentId' })
  environment: Environment;

  @Column({ type: 'text', default: 'pending' })
  status: DeploymentStatus;

  @Column({ type: 'text', nullable: true })
  logs: string | null;

  @CreateDateColumn({ nullable: true })
  startedAt: Date | null;

  @CreateDateColumn({ nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  appendLog(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    this.logs = (this.logs || '') + logLine;
  }
}
