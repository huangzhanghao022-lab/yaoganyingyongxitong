import { Body, Get, Inject, Post, Query } from '@midwayjs/core';
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
export class AdminTaskAs02Controller extends BaseController {
  @Inject()
  taskAs02Service: TaskAs02Service;

  @Post('/createFromForecast')
  async createFromForecast(@Body() payload: any) {
    const tasks = Array.isArray(payload) ? payload : payload?.tasks;
    const result = await this.taskAs02Service.createFromForecast(tasks || []);
    return this.ok({ count: result.length });
  }

  @Get('/nextUid')
  async nextUid(@Query('count') count: number) {
    const total = Math.max(1, Math.min(100, Number(count) || 1));
    const list = Array.from({ length: total }, () => this.taskAs02Service.nextUid());
    return this.ok({ list });
  }
}
