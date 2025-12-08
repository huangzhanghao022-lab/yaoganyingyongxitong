import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogDeleteAs02Entity } from '../entity/delete_as02';

/**
 * 固存删除任务记录表AS02
 */
@Provide()
export class TaskLogDeleteAs02Service extends BaseService {
  @InjectEntityModel(TaskLogDeleteAs02Entity)
  taskLogDeleteAs02Entity: Repository<TaskLogDeleteAs02Entity>;
}
