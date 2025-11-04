import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * AS03信息
 */
@Entity('daily_plan_as03')
export class DailyPlanAs03Entity extends BaseEntity {
  @Index()
  @Column({ comment: '日期', type: 'date' })
  date: Date;

  @Column({ comment: '值班人', length: 50 })
  dutyOfficer: string;

  @Column({ comment: '测控站', length: 50 })
  telemetryStation: string;

  @Column({ comment: '过境时间-开始', type: 'time' })
  transitTimeStart: Date;

  @Column({ comment: '过境时间-结束', type: 'time' })
  transitTimeEnd: Date;

  @Column({ comment: '仰角' })
  elevationAngle: number;

  @Column({ comment: '测控信息', type: 'text', nullable: true })
  telemetryInfo: string;
}
