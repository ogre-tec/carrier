import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type ApplicationType = 'repository' | 'binary' | 'docker';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ type: 'text' })
  type: ApplicationType;

  @Column({ nullable: true, type: 'text' })
  repositoryUrl: string | null;

  @Column({ nullable: true, type: 'text' })
  dockerImage: string | null;

  @Column({ nullable: true, type: 'text' })
  publicSSHKey: string | null;

  @Column({ nullable: true, type: 'text' })
  dependenciesInstall: string | null;

  @Column({ nullable: true, type: 'text' })
  buildCommand: string | null;

  @Column({ nullable: true, type: 'text' })
  startCommand: string | null;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
