import { Controller, Get, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController } from '@cool-midway/core';
import { AntennaShuchuanService } from '../../service/antenna_shuchuan';

@Provide()
@Controller('/admin/antenna_shuchuan')
export class AdminAntennaShuchuanController extends BaseController {
  @Inject()
  antennaShuchuanService: AntennaShuchuanService;

  @Get('/antenna')
  @Post('/antenna')
  async antenna() {
    const list = await this.antennaShuchuanService.fetchStations();
    return this.ok({ list });
  }
}
