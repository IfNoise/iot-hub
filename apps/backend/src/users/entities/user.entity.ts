import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRoleEnum, PlanTypeEnum, UserTypeEnum } from '@iot-hub/users';
import type { Organization } from './organization.entity.js';
import type { Group } from './group.entity.js';

/**
 * User entity based on user.schemas.ts from iot-core package
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ unique: true, type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRoleEnum.options,
    default: 'user',
  })
  role!: 'admin' | 'user' | 'org_admin' | 'group_admin';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({
    type: 'enum',
    enum: PlanTypeEnum.options,
    default: 'free',
  })
  plan!: 'free' | 'pro' | 'enterprise';

  @Column({ type: 'timestamp', nullable: true })
  planExpiresAt?: Date;

  // Enterprise поля
  @Column({
    type: 'enum',
    enum: UserTypeEnum.options,
    default: 'individual',
  })
  userType!: 'individual' | 'organization';

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  groupId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(
    'Organization',
    (organization: Organization) => organization.users,
    {
      onDelete: 'SET NULL',
    }
  )
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization | null;

  @ManyToOne('Group', (group: Group) => group.users, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'groupId' })
  group?: Group | null;
}
