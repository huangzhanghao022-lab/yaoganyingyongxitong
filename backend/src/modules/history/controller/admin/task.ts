import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TransferTaskEntity } from '../../entity/task';
import { TransferTaskService } from '../../service/task';

/**
 * 转存任务管理
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: TransferTaskEntity,
  service: TransferTaskService,
  pageQueryOp: {
    fieldEq: ['a.satelliteCode'],
    fieldLike: ['a.splitCount', 'a.startCommandNo'],
    select: ['a.*'],
    where: async ctx => {
      const { startTime, endTime } = ctx.request.body;
      const condition = [];
      if (startTime && endTime) {
        condition.push([
          'a.taskStartTime BETWEEN :startTime AND :endTime',
          { startTime, endTime },
        ]);
      }
      return condition;
    },
    addOrderBy: {
      createTime: 'desc',
    },
  },
})
export class AdminTransferTaskController extends BaseController {
  @Inject()
  transferTaskService: TransferTaskService;
}
