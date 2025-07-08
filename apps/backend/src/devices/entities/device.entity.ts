import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Certificate } from './certificate.entity.js';
import type { Organization } from '../../users/entities/organization.entity.js';
import type { Group } from '../../users/entities/group.entity.js';

@Entity()
export class Device {
  @PrimaryColumn()
  id!: string; // Используем deviceId как первичный ключ

  @Column({ default: '' })
  model!: string;

  @Column()
  publicKey!: string;

  @Column({ nullable: true, type: 'uuid' })
  ownerId!: string | null;

  // Enterprise поля
  @Column({ nullable: true, type: 'uuid' })
  organizationId?: string | null;

  @Column({ nullable: true, type: 'uuid' })
  groupId?: string | null;

  @Column({ default: 'user' })
  ownerType!: 'user' | 'group';

  @Column({ default: 'unbound' })
  status!: 'unbound' | 'bound' | 'revoked';

  @Column()
  lastSeenAt!: Date;

  @Column({ nullable: true })
  firmwareVersion?: string;

  @Column({ nullable: true, type: 'timestamp' })
  boundAt!: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  bindingTokenExpiresAt!: Date | null;

  @OneToOne('Certificate', (cert: Certificate) => cert.device, {
    cascade: true,
  })
  certificate?: Certificate;

  // Relations
  @ManyToOne(
    'Organization',
    (organization: Organization) => organization.devices,
    {
      onDelete: 'SET NULL',
    }
  )
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization | null;

  @ManyToOne('Group', (group: Group) => group.devices, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'groupId' })
  group?: Group | null;

  @CreateDateColumn()
  createdAt!: Date;
}
