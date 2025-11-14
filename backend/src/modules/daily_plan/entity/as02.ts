import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * AS02信息
 */
@Entity('daily_plan_as02')
export class DailyPlanAs02Entity extends BaseEntity {
  @Index()
  @Column({ comment: '日期', type: 'date' })
  date: Date;

  @Column({ comment: '值班人', length: 50 })
  dutyOfficer: string;

  @Column({ comment: '测控站', length: 50 })
  telemetryStation: string;

  @Column({ comment: '过境时间', length: 100 })
  transitTime: string;

  @Column({ comment: '仰角' })
  elevationAngle: number;

  @Column({ comment: '测控信息', type: 'text', nullable: true })
  telemetryInfo: string;
}
