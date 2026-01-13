import { Controller, Post, Body, Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { FixedStorageService } from '../../service/FixedStorageService';

/**
 * 对外开放的星上固存表查询接口
 */
@CoolController({ api: [], prefix: '/open' })
@Controller('/open')
export class OpenFixedStorageController extends BaseController {
  @Inject()
  fixedStorageService: FixedStorageService;

  /**
   * POST /open/fixed_storage
   * body: { name: 0-3, page?: number, size?: number, status?: number, sort?: string, order?: 'ASC'|'DESC', ... }
   */
  @Post('/fixed_storage')
  async fetch(@Body() payload: any) {
    const name = Number(payload?.name ?? 0);
    const page = Number(payload?.page ?? 1);
    const size = Number(payload?.size ?? 200);
    const params = { ...payload, name, page, size };
    const result = await this.fixedStorageService.page(params);
    const list = (result as any)?.list ?? (Array.isArray(result) ? result : []);
    const pagination =
      (result as any)?.pagination ?? { page, size, total: Array.isArray(list) ? list.length : 0 };
    return this.ok({ ok: true, name, list, pagination });
  }
}
