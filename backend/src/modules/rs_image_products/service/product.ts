import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { RsImageProductsEntity } from '../entity/product';

/**
 * 图像产品
 */
@Provide()
export class RsImageProductsService extends BaseService {
  @InjectEntityModel(RsImageProductsEntity)
  rsImageProductsEntity: Repository<RsImageProductsEntity>;
}
