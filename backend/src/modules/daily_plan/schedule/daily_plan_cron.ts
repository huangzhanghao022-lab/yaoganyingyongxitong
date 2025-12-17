import { Provide, Inject } from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import { DailyPlanGenerateService } from '../service/generate';
import { Job, IJob } from '@midwayjs/cron';

@Provide()
@Job({
  cronTime: '0 0 12 * * *', // 每天中午12点
  start: true,
})
export class DailyPlanCron implements IJob {
  @Inject() logger: ILogger;
  @Inject() generateService: DailyPlanGenerateService;

  async onTick() {
    try {
      await this.generateService.generateFor('AS02');
      await this.generateService.generateFor('AS03');
      this.logger.info('[daily-plan-cron] 生成完成');
    } catch (err) {
      this.logger.error('[daily-plan-cron] 生成失败: %s', err?.message, { stack: err?.stack });
    }
  }
}
