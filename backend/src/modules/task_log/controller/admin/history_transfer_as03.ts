import { Inject } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { TaskLogHistoryTransferAs03Entity } from '../../entity/history_transfer_as03';
import { TaskLogHistoryTransferAs03Service } from '../../service/history_transfer_as03';

@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogHistoryTransferAs03Entity,
  service: TaskLogHistoryTransferAs03Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.commandChainId', 'a.taskName', 'a.targetName'],
    fieldEq: ['a.status', 'a.platform'],
    where: async ctx => {
      const { startTime, endTime } = ctx.request.body;
      const where = [];
      if (startTime && endTime) {
        where.push([
          'a.taskExecutionTime >= :startTime and a.taskExecutionTime <= :endTime',
          { startTime, endTime },
        ]);
      }
      return where;
    },
  },
})
export class AdminTaskLogHistoryTransferAs03Controller extends BaseController {
  @Inject()
  taskLogHistoryTransferAs03Service: TaskLogHistoryTransferAs03Service;
}

