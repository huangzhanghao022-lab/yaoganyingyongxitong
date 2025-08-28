import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskAs03Entity } from '../../entity/as03';
import { TaskAs03Service } from '../../service/as03';

/**
 * AS03信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: TaskAs03Entity,
  service: TaskAs03Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.imagingTarget'],
    fieldEq: [
      'a.longitude',
      'a.latitude',
      'a.cloudCoverage',
      'a.sunElevation',
      'a.ephemerisTime',
      'a.imagingTime',
      'a.status',
    ],
  },
})
export class AdminTaskAs03Controller extends BaseController {
  @Inject()
  taskAs03Service: TaskAs03Service;
}
