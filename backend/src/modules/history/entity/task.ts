import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 转存任务
 */
@Entity('transfer_task')
export class TransferTaskEntity extends BaseEntity {
  @Index()
  @Column({ comment: '卫星代号', dict: ['AS02', 'AS03'], default: 0 })
  satelliteCode: number;

  @Index()
  @Column({ comment: '指令链分割条数' })
  splitCount: number;

  @Column({ comment: '指令链间隔' })
  interval: number;

  @Index()
  @Column({ comment: '开始指令号' })
  startCommandNo: string;

  @Index()
  @Column({ comment: '任务开始时间', nullable: true })
  taskStartTime: Date;

  @Column({ comment: '转存开始时间', nullable: true })
  transferStartTime: Date;

  @Column({ comment: '转存结束时间', nullable: true })
  transferEndTime: Date;
}
