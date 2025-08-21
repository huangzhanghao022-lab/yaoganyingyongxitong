// controller/admin
import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { as02payloadtableEntity } from '../../entity/as02_payload_table/as02_payload_table';
import { FixedStorageService } from '../../service/FixedStorageService';
import { Get, Query } from '@midwayjs/core';

@CoolController({
  api: ['add', 'update', 'list', 'page'], // 已移除 delete
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

  // 与父类方法名错开，避免签名冲突
  @Post('/delete')
  async customDelete(@Body() param: any) {
    await this.starFixedStorageTableService.delete(param); // 包含 name + ids
    return this.ok();
  }

  @Get('/info')
  async getInfo(@Query('id') id: number, @Query('name') name: number) {
    const data = await this.starFixedStorageTableService.info({ id, name });
    return this.ok(data);
  }
  
}
