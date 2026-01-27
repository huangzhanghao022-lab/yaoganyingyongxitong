import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * Fixed storage update audit log.
 */
@Entity('fixed_storage_update_log')
export class FixedStorageUpdateLogEntity extends BaseEntity {
  @Index()
  @Column({ comment: 'Table code', nullable: true })
  tableCode: number;

  @Index()
  @Column({ comment: 'Table name', length: 64, nullable: true })
  tableName: string;

  @Index()
  @Column({ comment: 'Action', length: 64 })
  action: string;

  @Index()
  @Column({ comment: 'Source type', length: 32, nullable: true })
  sourceType: string;

  @Column({ comment: 'Source api/service', length: 128, nullable: true })
  sourceApi: string;

  @Column({ comment: 'Request id', length: 64, nullable: true })
  requestId: string;

  @Column({ comment: 'Operator', length: 64, nullable: true })
  operator: string;

  @Column({ comment: 'IP', length: 64, nullable: true })
  ip: string;

  @Column({ comment: 'Target payload', type: 'json', nullable: true })
  target: any;

  @Column({ comment: 'Change payload', type: 'json', nullable: true })
  change: any;

  @Column({ comment: 'Data source payload', type: 'json', nullable: true })
  dataSource: any;

  @Column({ comment: 'Remark', nullable: true })
  remark: string;
}
