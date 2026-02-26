import { Inject } from '@midwayjs/core';
import { BaseController, CoolController } from '@cool-midway/core';
import { TaskLogOrbitControlAs02Entity } from '../../entity/orbit_control_as02';
import { TaskLogOrbitControlAs02Service } from '../../service/orbit_control_as02';

@CoolController({
  api: ['page', 'list', 'info', 'update', 'delete', 'add'],
  entity: TaskLogOrbitControlAs02Entity,
  service: TaskLogOrbitControlAs02Service,
  pageQueryOp: {
    keyWordLikeFields: ['a.satelliteCode', 'a.commandChainId', 'a.taskName', 'a.sourceFileName'],
    fieldEq: ['a.status'],
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
export class AdminTaskLogOrbitControlAs02Controller extends BaseController {
  @Inject()
  taskLogOrbitControlAs02Service: TaskLogOrbitControlAs02Service;
}

