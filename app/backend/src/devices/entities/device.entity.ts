import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { Certificate } from './certificate.entity';

@Entity()
export class Device {
  @PrimaryColumn()
  id!: string; // Используем deviceId как первичный ключ

  @Column({ default: '' })
  model!: string;

  @Column()
  publicKey!: string;

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ default: 'unbound' })
  status!: 'unbound' | 'bound' | 'revoked';

  @Column()
  lastSeenAt!: Date;

  @Column({ nullable: true })
  firmwareVersion?: string;

  @OneToOne(() => Certificate, (cert) => cert.device, { cascade: true })
  certificate!: Certificate;

  @CreateDateColumn()
  createdAt!: Date;
}
