import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogImagingAs03Entity } from '../entity/imaging_as03';

/**
 * 成像任务记录表AS03
 */
@Provide()
export class TaskLogImagingAs03Service extends BaseService {
  @InjectEntityModel(TaskLogImagingAs03Entity)
  taskLogImagingAs03Entity: Repository<TaskLogImagingAs03Entity>;
}
