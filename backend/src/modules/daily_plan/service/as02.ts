import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { DailyPlanAs02Entity } from '../entity/as02';

/**
 * AS02信息
 */
@Provide()
export class DailyPlanAs02Service extends BaseService {
  @InjectEntityModel(DailyPlanAs02Entity)
  dailyPlanAs02Entity: Repository<DailyPlanAs02Entity>;
}
