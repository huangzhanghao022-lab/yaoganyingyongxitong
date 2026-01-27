import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 固存删除任务记录表 AS02
 */
@Entity('task_log_delete_as02')
export class TaskLogDeleteAs02Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '任务执行时间' })
  taskExecutionTime: Date;

  // 允许范围或多段
  @Column({ comment: '删除文件号范围/列表', type: 'text' })
  deleteFileNumber: string;

  @Index()
  @Column({ comment: '固存删除任务指令链id', length: 100, nullable: true })
  deleteCommandChainId?: string;

  @Column({ comment: '状态', type: 'int', default: 0 })
  status: number;

  @Column({ comment: '固存回填时间', nullable: true })
  storageAppliedAt?: Date;
}
