import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogDeleteAs03Entity } from '../../entity/delete_as03';
import { TaskLogDeleteAs03Service } from '../../service/delete_as03';

/**
 * 固存删除任务记录表AS03
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogDeleteAs03Entity,
  service: TaskLogDeleteAs03Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.deleteCommandChainId'],
    fieldEq: ['a.status'],
    fieldLike: [],
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
export class AdminTaskLogDeleteAs03Controller extends BaseController {
  @Inject()
  taskLogDeleteAs03Service: TaskLogDeleteAs03Service;
}
