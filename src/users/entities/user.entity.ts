import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  DEPLOYER = 'deployer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, type: 'text' })
  password: string | null;

  @Column()
  name: string;

  @Column({ default: 'local' })
  provider: string;

  @Column({ type: 'varchar', nullable: true })
  providerId: string | null;

  @Column({ default: false })
  active: boolean;

  @Column({ type: 'varchar', default: UserRole.DEPLOYER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
