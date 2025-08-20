import { Inject } from '@midwayjs/core';
import { Context } from 'vm';
import { CoolController, BaseController } from '@cool-midway/core';
import { RsImageRequestEntity } from '../../entity/imageRequest';
import { RsImageRequestService } from '../../service/imageRequest';
import { BaseSysUserEntity } from '../../../base/entity/sys/user';

/**
 * 成像请求
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: RsImageRequestEntity,
  service: RsImageRequestService,
    // 新增的时候插入当前用户ID
    insertParam: async (ctx: Context) => {
      return {
        userId: ctx.admin.userId,
      };
    },
  pageQueryOp: {
    keyWordLikeFields: [],
    fieldLike: [],
    fieldEq: ['a.satelliteCode',{ column: 'a.taskPriority', requestParam: 'taskPriority' },{ column: 'a.userId', requestParam: 'userId' }],
    where: async ctx => {
      const {
        taskCreationTimeStart,
        taskCreationTimeEnd,
        plannedImagingTimeStart,
        plannedImagingTimeEnd,
        executionStatus,
      } = ctx.request.body;
      const where = [];
      if (taskCreationTimeStart) {
        where.push([
          'a.taskCreationTime >= :taskCreationTimeStart',
          { taskCreationTimeStart },
        ]);
      }
      if (taskCreationTimeEnd) {
        where.push([
          'a.taskCreationTime <= :taskCreationTimeEnd',
          { taskCreationTimeEnd },
        ]);
      }
      if (plannedImagingTimeStart) {
        where.push([
          'a.plannedImagingTime >= :plannedImagingTimeStart',
          { plannedImagingTimeStart },
        ]);
      }
      if (plannedImagingTimeEnd) {
        where.push([
          'a.plannedImagingTime <= :plannedImagingTimeEnd',
          { plannedImagingTimeEnd },
        ]);
      }
      console.log(executionStatus,executionStatus == -1)
      if (executionStatus == -1) {
        where.push([
          'a.executionStatus > :executionStatus',
          { executionStatus: 0 }
        ]);
      }
      return where;
    },
    join: [
      {
        entity: BaseSysUserEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
      },
    ],
    select: ['a.*, b.nickName'],
  },
})
export class AdminRsImageRequestImageRequestController extends BaseController {
  @Inject()
  rsImageRequestService: RsImageRequestService;
}
