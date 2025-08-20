import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 图像产品
 */
@Entity('rs_image_products')
export class RsImageProductsEntity extends BaseEntity {
  @Column({ comment: '需求编号' })
  requestNo: string;

  @Column({ comment: '成像点名称', default: '未设置'})
  poiName: string;

  @Column({ comment: '经度', type: 'numeric', precision: 20, scale: 10 })
  longitude: number;

  @Column({ comment: '纬度', type: 'numeric', precision: 20, scale: 10 })
  latitude: number;

  @Column({ comment: '快视图', type: 'text', nullable: true})
  quickView: string;

  @Column({ comment: '图像地址', type: 'text', nullable: true })
  imageAddress: string;

  @Column({ comment: '卫星代号', length: 50, nullable: true })
  satelliteCode: string;

  @Column({ comment: '成像模式', length: 50, nullable: true })
  imagingMode: string;

}
