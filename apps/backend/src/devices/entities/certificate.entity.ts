import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { Device } from './device.entity.js';

@Entity()
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  clientCert!: string;

  @Column('text')
  caCert!: string;

  @Column({ unique: true })
  fingerprint!: string;

  @Column()
  deviceId!: string;

  @Column({ default: 'active' })
  status!: 'active' | 'revoked' | 'expired';

  @Column({ type: 'timestamp' })
  validFrom!: Date;

  @Column({ type: 'timestamp' })
  validTo!: Date;

  @Column({ nullable: true })
  serialNumber?: string;

  @OneToOne('Device', (device: Device) => device.certificate)
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'id' })
  device!: Device;

  @CreateDateColumn()
  createdAt!: Date;
}
