import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * AS03信息
 */
@Entity('task_as03')
export class TaskAs03Entity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Column({ comment: '成像目标点', length: 50 })
  imagingTarget: string;

  @Column({ comment: '经度', type: 'decimal', precision: 10, scale: 2 })
  longitude: number;

  @Column({ comment: '纬度', type: 'decimal', precision: 10, scale: 2 })
  latitude: number;

  @Column({ comment: '云量', type: 'decimal', precision: 5, scale: 2 })
  cloudCoverage: number;

  @Column({ comment: '太阳高度角', type: 'decimal', precision: 5, scale: 2 })
  sunElevation: number;

  @Column({ comment: '星历时间' })
  ephemerisTime: Date;

  @Column({ comment: '成像时间' })
  imagingTime: Date;

  @Column({ comment: '数传站', length: 50, nullable: true })
  transferName: string;

  @Column({ comment: '数传时间', nullable: true })
  transferTime: Date;

  @Column({ comment: '成像UID', length: 50, nullable: true })
  imagingUID: string;

  @Column({ comment: '数传UID', type: 'text', nullable: true })
  transferUID: string;

  @Column({
    comment: '状态',
    dict: ['待处理', '处理中', '已完成', '失败'],
    default: 0,
  })
  status: number;

  @Column({ comment: '成像缩略图地址链接', nullable: true })
  thumbnailUrl: string;
}
