import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 数传任务记录表 AS02
 */
@Entity('task_log_transmit_as02')
export class TaskLogTransmitAs02Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '数传站名称', length: 100 })
  transmitStationName: string;

  @Column({ comment: '数传时间' })
  transmitTime: Date;

  @Column({ comment: '数传站经度', type: 'decimal', precision: 12, scale: 6, nullable: true })
  transmitStationLongitude?: number;

  @Column({ comment: '数传站纬度', type: 'decimal', precision: 12, scale: 6, nullable: true })
  transmitStationLatitude?: number;

  @Column({ comment: '数传站高度', type: 'decimal', precision: 10, scale: 2, nullable: true })
  transmitStationHeight?: number;

  // 范围或逗号分隔文件号列表
  @Column({ comment: '数传文件号范围/列表', type: 'text' })
  transmitFileNumber: string;

  @Column({ comment: '数传执行时间', nullable: true })
  transmitExecutionTime?: Date;

  @Index()
  @Column({ comment: '指令链id', length: 100, nullable: true })
  commandChainId?: string;

  @Column({ comment: '状态', type: 'int', default: 0 })
  status: number;

  @Column({ comment: '固存回填时间', nullable: true })
  storageAppliedAt?: Date;
}
