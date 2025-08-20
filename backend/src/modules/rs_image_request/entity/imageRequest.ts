import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 成像请求
 */
@Entity('rs_image_request')
export class RsImageRequestEntity extends BaseEntity {
  @Column({ comment: '卫星代号', length: 50 })
  satelliteCode: string;

  @Index({ unique: true })
  @Column({ comment: '需求编号', length: 50 })
  requestNo: string;
  

  @Column({
    comment: '成像模式',
    dict: ['光学', '雷达', '红外', '多光谱'],
    default: 0,
  })
  imagingMode: number;

  @Column({ comment: '成像时长(秒)', type: 'int' })
  imagingDuration: number;

  @Column({
    comment: '执行状态',
    dict: [
      '已创建',
      '已提交',
      '已接收',
      '执行中',
      '解析中',
      '已完成',
      '已取消',
      '已终止',
    ],
    default: 0,
  })
  executionStatus: number;

  @Column({ comment: '成像点id', nullable: true})
  poiId: number;

  @Column({ comment: '成像点名称', default: '未设置'})
  poiName: string;

  @Column({ comment: '经度', type: 'numeric', precision: 20, scale: 10 })
  longitude: number;

  @Column({ comment: '纬度', type: 'numeric', precision: 20, scale: 10 })
  latitude: number;

  @Column({
    comment: '任务优先级',
    dict: ['低', '中', '高', '热点'],
    default: 0,
  })
  taskPriority: number;

  @Column({ comment: '最小侧摆角', type: 'float', default: 0, nullable: true })
  minSidelobeAngle: number;

  @Column({ comment: '最大侧摆角', type: 'float', nullable: true })
  maxSidelobeAngle: number;

  @Column({ comment: '最小太阳高度角', type: 'float', nullable: true })
  minSunElevationAngle: number;

  @Column({ comment: '最大太阳高度角', type: 'float', nullable: true })
  maxSunElevationAngle: number;

  @Column({ comment: '最大云量', type: 'float', nullable: true })
  maxCloudCover: number;

  @Column({ comment: '任务截止时间', type: 'bigint', nullable: true })
  taskDeadlineTime: number;

  @Column({ comment: '计划成像时间', type: 'bigint', nullable: true })
  plannedImagingTime: number;

  @Column({ comment: '计划数传时间', type: 'bigint', nullable: true })
  plannedDataTransmissionTime: number;

  @Column({ comment: '预计完成时间', type: 'bigint',nullable: true })
  estimatedCompletionTime: number;

  @Column({ comment: '任务创建时间', type: 'bigint', default: new Date().getTime()})
  taskCreationTime: number;

  @Column({ comment: '备注', type: 'text', nullable: true })
  remark: string;

  @Column({ comment: '反馈', type: 'text', nullable: true })
  feedback: string;

  @Column({ comment: '快视图', type: 'text', nullable: true})
  quickView: string;

  @Column({ comment: '图像地址', type: 'text', nullable: true })
  imageAddress: string;

  @Column({ comment: '所属用户' })
  userId: number;
}
