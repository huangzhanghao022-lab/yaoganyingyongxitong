import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogHistoryTransferAs03Entity } from '../entity/history_transfer_as03';

@Provide()
export class TaskLogHistoryTransferAs03Service extends BaseService {
  @InjectEntityModel(TaskLogHistoryTransferAs03Entity)
  taskLogHistoryTransferAs03Entity: Repository<TaskLogHistoryTransferAs03Entity>;
}

