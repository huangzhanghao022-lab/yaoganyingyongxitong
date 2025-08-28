import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskAs02Entity } from '../../entity/as02';
import { TaskAs02Service } from '../../service/as02';

/**
 * AS02信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: TaskAs02Entity,
  service: TaskAs02Service,
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
export class AdminTaskAs02Controller extends BaseController {
  @Inject()
  taskAs02Service: TaskAs02Service;
}
