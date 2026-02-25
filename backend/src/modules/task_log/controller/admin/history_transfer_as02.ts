import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogHistoryTransferAs02Entity } from '../../entity/history_transfer_as02';
import { TaskLogHistoryTransferAs02Service } from '../../service/history_transfer_as02';

/**
 * 平台历史文件转存任务记录表 AS02
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogHistoryTransferAs02Entity,
  service: TaskLogHistoryTransferAs02Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.commandChainId', 'a.taskName'],
    fieldEq: ['a.status'],
    fieldLike: [],
    where: async ctx => {
      const { startTime, endTime, recordFileNo } = ctx.request.body;
      const where = [];
      if (startTime && endTime) {
        where.push([
          'a.taskExecutionTime >= :startTime and a.taskExecutionTime <= :endTime',
          { startTime, endTime },
        ]);
      }
      if (recordFileNo !== undefined && recordFileNo !== null && recordFileNo !== '') {
        where.push(['a.recordFileNo = :recordFileNo', { recordFileNo: Number(recordFileNo) }]);
      }
      return where;
    },
  },
})
export class AdminTaskLogHistoryTransferAs02Controller extends BaseController {
  @Inject()
  taskLogHistoryTransferAs02Service: TaskLogHistoryTransferAs02Service;
}

