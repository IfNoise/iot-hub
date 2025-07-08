import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { User } from './user.entity.js';
import type { Group } from './group.entity.js';
import type { Device } from '../../devices/entities/device.entity.js';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  domain?: string;

  @Column({
    type: 'enum',
    enum: ['business', 'enterprise'],
    default: 'business',
  })
  plan!: 'business' | 'enterprise';

  @Column({ type: 'int', default: 100 })
  maxUsers!: number;

  @Column({ type: 'int', default: 1000 })
  maxDevices!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany('User', (user: User) => user.organization)
  users?: User[];

  @OneToMany('Group', (group: Group) => group.organization)
  groups?: Group[];

  @OneToMany('Device', (device: Device) => device.organization)
  devices?: Device[];
}
