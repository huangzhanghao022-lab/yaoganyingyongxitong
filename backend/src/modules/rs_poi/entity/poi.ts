import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 目标库信息
 */
@Entity('rs_poi')
export class RsPoiEntity extends BaseEntity {
  @Index()
  @Column({ comment: '成像名称', length: 255 })
  name: string;

  @Column({ 
    comment: '卫星代号',
    type: 'text',
    default: ''
  })
  satellites: string; // 原 type 字段重命名

  @Column({ comment: '优先级', dict: ['高', '中', '低'], default: 0 })
  level: number;

  @Column({ comment: '经度', type: 'text', nullable: true })
  area_lon: string;

  @Column({ comment: '纬度', type: 'text', nullable: true })
  area_lat: string;

  @Column({ comment: '负责人ID', default: 0 })
  principalId: number;
}
