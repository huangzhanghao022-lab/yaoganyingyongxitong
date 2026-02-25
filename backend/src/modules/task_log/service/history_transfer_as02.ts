import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogHistoryTransferAs02Entity } from '../entity/history_transfer_as02';

/**
 * 平台历史文件转存任务记录表 AS02
 */
@Provide()
export class TaskLogHistoryTransferAs02Service extends BaseService {
  @InjectEntityModel(TaskLogHistoryTransferAs02Entity)
  taskLogHistoryTransferAs02Entity: Repository<TaskLogHistoryTransferAs02Entity>;
}

