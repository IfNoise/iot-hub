import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Device } from './device.entity';

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

  @OneToOne(() => Device, (device) => device.certificate)
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'id' })
  device!: Device;

  @CreateDateColumn()
  createdAt!: Date;
}
