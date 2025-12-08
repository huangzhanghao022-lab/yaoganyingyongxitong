import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogDeleteAs02Entity } from '../../entity/delete_as02';
import { TaskLogDeleteAs02Service } from '../../service/delete_as02';

/**
 * 固存删除任务记录表AS02
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogDeleteAs02Entity,
  service: TaskLogDeleteAs02Service,
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
export class AdminTaskLogDeleteAs02Controller extends BaseController {
  @Inject()
  taskLogDeleteAs02Service: TaskLogDeleteAs02Service;
}
