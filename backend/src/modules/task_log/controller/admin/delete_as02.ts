import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { TaskLogDeleteAs02Entity } from '../../entity/delete_as02';
import { TaskLogDeleteAs02Service } from '../../service/delete_as02';
import { TaskLogTaskManageService } from '../../service/task_manage';
import { In } from 'typeorm';

/**
 * 固存删除任务记录表AS02
 */
@CoolController({
  api: ['page', 'list', 'info', 'update', 'add'],
  entity: TaskLogDeleteAs02Entity,
  service: TaskLogDeleteAs02Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.deleteCommandChainId'],
    fieldEq: ['a.status'],
    fieldLike: [],
    where: async ctx => {
      const { startTime, endTime } = ctx.request.body;
      const where = [];
      if (startTime && endTime) {
        where.push([
          'a.taskExecutionTime >= :startTime and a.taskExecutionTime <= :endTime',
          { startTime, endTime },
        ]);
      }
      return where;
    },
  },
})
export class AdminTaskLogDeleteAs02Controller extends BaseController {
  @Inject()
  taskLogDeleteAs02Service: TaskLogDeleteAs02Service;

  @Inject()
  taskLogTaskManageService: TaskLogTaskManageService;

  @Post('/delete')
  async customDelete(@Body() param: any) {
    const ids = Array.isArray(param?.ids)
      ? param.ids
      : param?.ids != null
      ? [param.ids]
      : param?.id != null
      ? [param.id]
      : [];
    let times: Array<string | number | Date> = Array.isArray(param?.times) ? param.times : [];
    if (!times.length && ids.length) {
      const rows = await this.taskLogDeleteAs02Service.taskLogDeleteAs02Entity.find({
        where: { id: In(ids) },
        select: ['taskExecutionTime'],
      });
      times = rows.map((row: any) => row?.taskExecutionTime).filter(Boolean);
    }
    return this.ok(
      await this.taskLogTaskManageService.deleteByTaskIds({
        satellite: 'AS02',
        type: 'delete',
        times,
      })
    );
  }
}
