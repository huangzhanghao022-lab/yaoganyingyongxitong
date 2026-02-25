import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TransferTaskEntity } from '../entity/task';

/**
 * 转存任务服务
 */
@Provide()
export class TransferTaskService extends BaseService {
  @InjectEntityModel(TransferTaskEntity)
  transferTaskEntity: Repository<TransferTaskEntity>;
}
