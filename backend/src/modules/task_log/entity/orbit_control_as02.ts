import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

@Entity('task_log_orbit_control_as02')
export class TaskLogOrbitControlAs02Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '任务执行时间' })
  taskExecutionTime: Date;

  @Column({ comment: '轨控开始时间' })
  orbitStartTime: Date;

  @Column({ comment: '轨控结束时间' })
  orbitEndTime: Date;

  @Column({ comment: '持续时间(s)', type: 'int', nullable: true })
  durationSeconds?: number;

  @Column({ comment: '模板Id', length: 100, nullable: true })
  templateId?: string;

  @Column({ comment: '目录Id', length: 100, nullable: true })
  folderId?: string;

  @Column({ comment: '任务名称', length: 200, nullable: true })
  taskName?: string;

  @Column({ comment: '来源文件名', length: 255, nullable: true })
  sourceFileName?: string;

  @Column({ comment: '批次ID', length: 100, nullable: true })
  batchId?: string;

  @Index()
  @Column({ comment: '指令链id', length: 200, nullable: true })
  commandChainId?: string;

  @Column({ comment: '状态', type: 'int', default: 0 })
  status: number;

  @Column({ comment: '执行回填时间', nullable: true })
  storageAppliedAt?: Date;
}

