import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';
import { Environment } from '../../environments/entities/environment.entity';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  environmentId: string;

  @ManyToOne(() => Environment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environmentId' })
  environment: Environment;

  @Column()
  secret: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
