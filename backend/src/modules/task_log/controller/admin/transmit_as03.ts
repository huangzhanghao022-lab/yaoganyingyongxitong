import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogTransmitAs03Entity } from '../../entity/transmit_as03';
import { TaskLogTransmitAs03Service } from '../../service/transmit_as03';

/**
 * 数传任务记录表AS03
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogTransmitAs03Entity,
  service: TaskLogTransmitAs03Service,
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
export class AdminTaskLogTransmitAs03Controller extends BaseController {
  @Inject()
  taskLogTransmitAs03Service: TaskLogTransmitAs03Service;
}
