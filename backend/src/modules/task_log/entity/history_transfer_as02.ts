import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('task_log_history_transfer_as02')
export class TaskLogHistoryTransferAs02Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '任务执行时间' })
  taskExecutionTime: Date;

  @Column({ comment: '开始指令号', type: 'int' })
  startCommandNo: number;

  @Column({ comment: '记录文件号', type: 'int' })
  recordFileNo: number;

  @Column({ comment: '开始日期', length: 50 })
  startDate: string;

  @Column({ comment: '结束日期', length: 50 })
  endDate: string;

  @Column({ comment: '模板Id', length: 100, nullable: true })
  templateId?: string;

  @Column({ comment: '目录Id', length: 100, nullable: true })
  folderId?: string;

  @Column({ comment: '任务名称', length: 200, nullable: true })
  taskName?: string;

  @Index()
  @Column({ comment: '指令链id', length: 200, nullable: true })
  commandChainId?: string;

  @Column({ comment: '状态', type: 'int', default: 0 })
  status: number;

  @Column({ comment: '执行回填时间', nullable: true })
  storageAppliedAt?: Date;
}
