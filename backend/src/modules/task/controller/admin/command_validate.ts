import { Body, Controller, Inject, Post } from '@midwayjs/core';
import { CommandValidateService } from '../../service/commandValidate';
import { BaseController } from '@cool-midway/core';

@Controller('/admin/task/command')
export class CommandValidateController extends BaseController {
  @Inject()
  commandValidateService: CommandValidateService;

  @Post('/validate')
  async validate(@Body() body: any) {
    const result = await this.commandValidateService.validate(body);
    return this.ok(result);
  }
}
