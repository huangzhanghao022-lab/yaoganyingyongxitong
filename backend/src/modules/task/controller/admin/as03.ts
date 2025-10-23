import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
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
    keyWordLikeFields: ['a.satelliteCode', 'a.imagingTarget', 'a.transferName'],
    fieldLike: ['a.imagingTarget', 'a.transferUID'],
    fieldEq: [
      'a.longitude',
      'a.latitude',
      'a.cloudCoverage',
      'a.sunElevation',
      'a.ephemerisTime',
      'a.imagingTime',
      'a.transferTime',
      'a.transferName',
      'a.imagingUID',
      'a.status',
    ],
  },
})
export class AdminTaskAs03Controller extends BaseController {
  @Inject()
  taskAs03Service: TaskAs03Service;

  @Post('/createFromForecast')
  async createFromForecast(@Body() payload: any) {
    const tasks = Array.isArray(payload) ? payload : payload?.tasks;
    const result = await this.taskAs03Service.createFromForecast(tasks || []);
    return this.ok({ count: result.length });
  }

  @Get('/nextUid')
  async nextUid(@Query('count') count: number) {
    const total = Math.max(1, Math.min(100, Number(count) || 1));
    const list = Array.from({ length: total }, () => this.taskAs03Service.nextUid());
    return this.ok({ list });
  }
}
