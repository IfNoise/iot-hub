import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Organization } from './organization.entity.js';
import type { User } from './user.entity.js';
import type { Device } from '../../devices/entities/device.entity.js';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  parentGroupId?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(
    'Organization',
    (organization: Organization) => organization.groups,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization | null;

  @ManyToOne('Group', (group: Group) => group.childGroups, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentGroupId' })
  parentGroup?: Group | null;

  @OneToMany('Group', (group: Group) => group.parentGroup)
  childGroups?: Group[];

  @OneToMany('User', 'groups')
  users?: User[];

  @OneToMany('Device', (device: Device) => device.group)
  devices?: Device[];
}
