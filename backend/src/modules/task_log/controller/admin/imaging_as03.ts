import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogImagingAs03Entity } from '../../entity/imaging_as03';
import { TaskLogImagingAs03Service } from '../../service/imaging_as03';

/**
 * 成像任务记录表AS03
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogImagingAs03Entity,
  service: TaskLogImagingAs03Service,
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
export class AdminTaskLogImagingAs03Controller extends BaseController {
  @Inject()
  taskLogImagingAs03Service: TaskLogImagingAs03Service;
}
