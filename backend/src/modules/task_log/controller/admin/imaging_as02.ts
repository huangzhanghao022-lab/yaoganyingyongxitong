import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogImagingAs02Entity } from '../../entity/imaging_as02';
import { TaskLogImagingAs02Service } from '../../service/imaging_as02';

/**
 * 成像任务记录表AS02
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogImagingAs02Entity,
  service: TaskLogImagingAs02Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.commandChainId'],
    fieldEq: ['a.status'],
    fieldLike: [],
    where: async ctx => {
      const { startTime, endTime } = ctx.request.body;
      const where = [];
      if (startTime && endTime) {
        where.push([
          'a.imagingTime >= :startTime and a.imagingTime <= :endTime',
          { startTime, endTime },
        ]);
      }
      return where;
    },
  },
})
export class AdminTaskLogImagingAs02Controller extends BaseController {
  @Inject()
  taskLogImagingAs02Service: TaskLogImagingAs02Service;
}
