import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';

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

  @OneToOne(
    () => require('./certificate.entity').Certificate,
    (cert: any) => cert.device,
    { cascade: true }
  )
  certificate?: any;

  @CreateDateColumn()
  createdAt!: Date;
}
