import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 固存删除任务记录表 AS03
 */
@Entity('task_log_delete_as03')
export class TaskLogDeleteAs03Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '任务执行时间' })
  taskExecutionTime: Date;

  @Column({ comment: '删除文件号范围/列表', type: 'text' })
  deleteFileNumber: string;

  @Index()
  @Column({ comment: '固存删除任务指令链id', length: 100, nullable: true })
  deleteCommandChainId?: string;

  @Column({ comment: '状态', type: 'int', default: 0 })
  status: number;
}
