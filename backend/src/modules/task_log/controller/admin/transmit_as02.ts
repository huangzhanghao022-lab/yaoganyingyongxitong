import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogTransmitAs02Entity } from '../../entity/transmit_as02';
import { TaskLogTransmitAs02Service } from '../../service/transmit_as02';

/**
 * 数传任务记录表AS02
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogTransmitAs02Entity,
  service: TaskLogTransmitAs02Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.commandChainId'],
    fieldEq: ['a.status'],
    fieldLike: [],
    where: async ctx => {
      const { startTime, endTime } = ctx.request.body;
      const where = [];
      if (startTime && endTime) {
        where.push([
          'a.transmitTime >= :startTime and a.transmitTime <= :endTime',
          { startTime, endTime },
        ]);
      }
      return where;
    },
  },
})
export class AdminTaskLogTransmitAs02Controller extends BaseController {
  @Inject()
  taskLogTransmitAs02Service: TaskLogTransmitAs02Service;
}
