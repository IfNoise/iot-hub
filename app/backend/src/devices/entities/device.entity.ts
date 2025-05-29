import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Certificate } from './certificate.entity';

@Entity()
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ nullable: true })
  model?: string;

  @Column({ unique: true })
  deviceId!: string;

  @Column({ unique: true })
  fingerprint?: string;

  @Column()
  publicKey?: string;

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ default: 'unbound' })
  status?: 'unbound' | 'bound' | 'revoked';

  @Column()
  lastSeenAt!: Date;

  @Column({ nullable: true })
  firmwareVersion?: string;

  @OneToOne(() => Certificate, (cert) => cert.device, { cascade: true })
  @JoinColumn()
  certificate!: Certificate;

  @CreateDateColumn()
  createdAt!: Date;
}
