import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAs02Entity } from '../entity/as02';

/**
 * AS02信息
 */
@Provide()
export class TaskAs02Service extends BaseService {
  @InjectEntityModel(TaskAs02Entity)
  taskAs02Entity: Repository<TaskAs02Entity>;
}
