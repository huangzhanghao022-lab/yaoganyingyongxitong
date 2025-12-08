import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogImagingAs02Entity } from '../entity/imaging_as02';

/**
 * 成像任务记录表AS02
 */
@Provide()
export class TaskLogImagingAs02Service extends BaseService {
  @InjectEntityModel(TaskLogImagingAs02Entity)
  taskLogImagingAs02Entity: Repository<TaskLogImagingAs02Entity>;
}
