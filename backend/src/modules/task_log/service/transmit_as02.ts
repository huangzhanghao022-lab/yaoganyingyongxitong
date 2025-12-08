import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogTransmitAs02Entity } from '../entity/transmit_as02';

/**
 * 数传任务记录表AS02
 */
@Provide()
export class TaskLogTransmitAs02Service extends BaseService {
  @InjectEntityModel(TaskLogTransmitAs02Entity)
  taskLogTransmitAs02Entity: Repository<TaskLogTransmitAs02Entity>;
}
