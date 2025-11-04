import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { DailyPlanAs02Entity } from '../../entity/as02';
import { DailyPlanAs02Service } from '../../service/as02';

/**
 * AS02信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: DailyPlanAs02Entity,
  service: DailyPlanAs02Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.dutyOfficer'],
    fieldEq: ['a.telemetryStation'],
    fieldLike: ['a.date'],
  },
})
export class AdminDailyPlanAs02Controller extends BaseController {
  @Inject()
  dailyPlanAs02Service: DailyPlanAs02Service;
}
