import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { DailyPlanAs03Entity } from '../../entity/as03';
import { DailyPlanAs03Service } from '../../service/as03';

/**
 * AS03信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: DailyPlanAs03Entity,
  service: DailyPlanAs03Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.dutyOfficer'],
    fieldEq: ['a.telemetryStation'],
    fieldLike: ['a.date'],
  },
})
export class AdminDailyPlanAs03Controller extends BaseController {
  @Inject()
  dailyPlanAs03Service: DailyPlanAs03Service;
}
