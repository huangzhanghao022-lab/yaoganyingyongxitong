import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { RsImageRequestEntity } from '../entity/imageRequest';

/**
 * 成像请求
 */
@Provide()
export class RsImageRequestService extends BaseService {
  @InjectEntityModel(RsImageRequestEntity)
  rsImageRequestEntity: Repository<RsImageRequestEntity>;
}
