import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogTransmitAs03Entity } from '../entity/transmit_as03';

/**
 * 数传任务记录表AS03
 */
@Provide()
export class TaskLogTransmitAs03Service extends BaseService {
  @InjectEntityModel(TaskLogTransmitAs03Entity)
  taskLogTransmitAs03Entity: Repository<TaskLogTransmitAs03Entity>;
}
