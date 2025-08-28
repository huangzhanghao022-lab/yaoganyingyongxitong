import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAs03Entity } from '../entity/as03';

/**
 * AS03信息
 */
@Provide()
export class TaskAs03Service extends BaseService {
  @InjectEntityModel(TaskAs03Entity)
  taskAs03Entity: Repository<TaskAs03Entity>;
}
