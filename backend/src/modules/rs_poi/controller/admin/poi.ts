import { Body, Inject, Post } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { RsPoiEntity } from '../../entity/poi';
import { RsPoiPoiService } from '../../service/poi';
import { Context } from '@midwayjs/koa';
// src/modules/rs_poi/controller/admin/poi.ts
import { Like } from 'typeorm'; // 新增此行[1,3](@ref)

/**
 * 目标库
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'], // 标准CRUD接口[1,7](@ref)
  serviceApis: ['listByName', 'importData'], // // 扩展自定义接口
  entity: RsPoiEntity, // 关联数据库实体[4](@ref)
  service: RsPoiPoiService, // 绑定的服务层
  listQueryOp: { keyWordLikeFields: ['a.name'] }, // 列表查询配置
  pageQueryOp: { keyWordLikeFields: ['a.name'], fieldEq: ['a.status'] }, // 分页查询配置
})
export class AdminRsPoiPoiController extends BaseController {
  @Inject()
  rsPoiPoiService: RsPoiPoiService;

  @Inject()
  ctx: Context;

  @Post("/import")
  async importExcelData(@Body() data: any[]) {
    try {
      this.ctx.logger.info(`开始导入${data.length}条数据`);
      await this.rsPoiPoiService.importData(data);
      return this.ok();
    } catch (err) {
      this.ctx.logger.error('导入失败', err);
      return this.fail(err.message, 500);
    }
  }
  @Post("/list-by-name")
  async listByName(
    @Body('name') name: string,
    @Body('page') page = 1,
    @Body('size') size = 10
  ) {
    const [list, total] = await this.service.page({
      page,
      size,
      where: { name: Like(`%${name}%`) },
    });
    return this.ok({ list, total });
  }
  @Post('/custom-update')
  async customUpdate(@Body() data: any) {
    try {
      // 数据校验
      if (!data.id) throw new Error('ID不能为空');

      // 调用服务层方法
      const result = await this.rsPoiPoiService.customUpdate(data);
      return this.ok(result);
    } catch (err) {
      this.ctx.logger.error('更新失败', err);
      return this.fail(err.message);
    }
  }

  /**
   * 自定义分页：按 level 升序，名称升序，支持关键字
   * 覆盖默认 page。路径与入参保持兼容。
   */
  @Post('/page')
  async pageOrder(@Body() body?: any) {
    const page = Number(body?.page ?? 1) || 1;
    const size = Number(body?.size ?? 10) || 10;
    const keyWord = String(body?.keyWord ?? body?.keyword ?? '').trim();
    const satFilter = body?.satellites;

    const repo = this.rsPoiPoiService.rsPoiEntity;
    const qb = repo.createQueryBuilder('a');
    if (keyWord) {
      // Postgres ILIKE（不区分大小写）；若为其他库可替换为 LIKE
      qb.where('a.name ILIKE :kw', { kw: `%${keyWord}%` });
    }
    if (satFilter !== undefined && satFilter !== null && satFilter !== '') {
      const token = String(satFilter).trim();
      if (token) {
        if (qb.expressionMap.wheres.length) {
          qb.andWhere('a.satellites LIKE :sat', { sat: `%${token}%` });
        } else {
          qb.where('a.satellites LIKE :sat', { sat: `%${token}%` });
        }
      }
    }

    qb.orderBy('a.level', 'ASC').addOrderBy('a.name', 'ASC');

    const [list, total] = await qb
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return this.ok({ list, pagination: { page, size, total } });
  }
}
