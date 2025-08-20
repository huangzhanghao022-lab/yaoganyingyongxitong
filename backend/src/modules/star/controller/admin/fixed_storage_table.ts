import { Body, Inject,Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { as02payloadtableEntity } from '../../entity/as02_payload_table/as02_payload_table';
import { FixedStorageService } from '../../service/FixedStorageService';

/**
 * 固存表信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: as02payloadtableEntity,
  service: FixedStorageService,
  pageQueryOp: {
    keyWordLikeFields: ['a.targetName'],
    fieldEq: ['a.name', 'a.code', 'a.status'],
  },
})
export class AdminStarFixedStorageTableController extends BaseController {
  @Inject()
  starFixedStorageTableService: FixedStorageService;
  @Post('/delete')
  async delete(@Body() param: any) {
    // 关键：传递完整参数对象
    await this.starFixedStorageTableService.delete(param);
    return this.ok();
  }
}
