import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogDeleteAs03Entity } from '../entity/delete_as03';

/**
 * 固存删除任务记录表AS03
 */
@Provide()
export class TaskLogDeleteAs03Service extends BaseService {
  @InjectEntityModel(TaskLogDeleteAs03Entity)
  taskLogDeleteAs03Entity: Repository<TaskLogDeleteAs03Entity>;
}
