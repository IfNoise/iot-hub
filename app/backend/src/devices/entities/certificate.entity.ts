import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

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

  @OneToOne(
    () => require('./device.entity').Device,
    (device: any) => device.certificate
  )
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'id' })
  device!: any;

  @CreateDateColumn()
  createdAt!: Date;
}
