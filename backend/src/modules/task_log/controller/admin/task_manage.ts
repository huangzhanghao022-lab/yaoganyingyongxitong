import { Body, Controller, Inject, Post } from '@midwayjs/core';
import { BaseController } from '@cool-midway/core';
import { TaskLogTaskManageService } from '../../service/task_manage';

/**
 * 任务管理级联删除入口（task_log 模块）
 */
@Controller('/admin/task_log/task_manage')
export class AdminTaskLogTaskManageController extends BaseController {
  @Inject()
  taskLogTaskManageService: TaskLogTaskManageService;

  @Post('/delete')
  async deleteTasks(@Body() param: any) {
    const result = await this.taskLogTaskManageService.deleteByTaskIds(param);
    return this.ok(result);
  }

  @Post('/command_chain')
  async updateCommandChain(@Body() param: any) {
    const result = await this.taskLogTaskManageService.updateCommandChainId(param);
    return this.ok(result);
  }
}
