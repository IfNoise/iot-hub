import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { PlanTypeEnum, UserTypeEnum, UserRoleEnum } from '@iot-hub/users';
import { Organization } from './organization.entity.js';

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
    array: true,
    default: '{personal-user}',
  })
  roles!: (typeof UserRoleEnum.options)[number][];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({
    type: 'enum',
    enum: PlanTypeEnum.options,
    default: 'free',
  })
  plan!: (typeof PlanTypeEnum.options)[number];

  @Column({ type: 'timestamp', nullable: true })
  planExpiresAt?: Date;

  // Enterprise поля
  @Column({
    type: 'enum',
    enum: UserTypeEnum.options,
    default: 'individual',
  })
  accountType!: 'individual' | 'organization';
  @Column({ type: 'uuid', nullable: true })
  keycloakOrganizationId?: string;
  @Column({ type: 'text', array: true, nullable: true })
  groups?: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;
}
