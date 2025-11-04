import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { DailyPlanAs03Entity } from '../entity/as03';

/**
 * AS03信息
 */
@Provide()
export class DailyPlanAs03Service extends BaseService {
  @InjectEntityModel(DailyPlanAs03Entity)
  dailyPlanAs03Entity: Repository<DailyPlanAs03Entity>;
}
