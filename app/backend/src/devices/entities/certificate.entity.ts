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

  @Column()
  clientCert!: string;

  @Column()
  caCert!: string;

  @OneToOne(() => Device, (device) => device.certificate)
  @JoinColumn()
  device!: Device;

  @CreateDateColumn()
  createdAt!: Date;
}
