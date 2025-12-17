import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 成像任务记录表 AS02
 */
@Entity('task_log_imaging_as02')
export class TaskLogImagingAs02Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '成像目标点名称', length: 100 })
  imagingTargetName: string;

  @Column({ comment: '成像时间' })
  imagingTime: Date;

  @Column({ comment: '起始文件号', type: 'int', nullable: true })
  startFileNo?: number;

  @Column({ comment: '结束文件号', type: 'int', nullable: true })
  endFileNo?: number;

  @Column({ comment: '云量', type: 'decimal', precision: 5, scale: 2, nullable: true })
  cloudCoverage?: number;

  @Column({ comment: '侧摆角', type: 'decimal', precision: 6, scale: 2, nullable: true })
  sideSwingAngle?: number;

  @Column({ comment: '目标点经度', type: 'decimal', precision: 10, scale: 6, nullable: true })
  targetLongitude?: number;

  @Column({ comment: '目标点纬度', type: 'decimal', precision: 10, scale: 6, nullable: true })
  targetLatitude?: number;

  @Index()
  @Column({ comment: '指令链id', length: 100, nullable: true })
  commandChainId?: string;

  @Column({ comment: '状态', type: 'int', default: 0 })
  status: number;
}
