import { Controller, Post, Inject, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { DailyPlanAs02Entity } from '../../entity/as02';
import { DailyPlanAs03Entity } from '../../entity/as03';
import { CoolController, BaseController } from '@cool-midway/core';

/**
 * 对外开放的每日测控计划查询接口
 */
@CoolController({ api: [], prefix: '/open' })
@Controller('/open')
export class OpenDailyPlanController extends BaseController {
  @Inject()
  ctx: Context;

  @InjectEntityModel(DailyPlanAs02Entity)
  as02Repo: Repository<DailyPlanAs02Entity>;

  @InjectEntityModel(DailyPlanAs03Entity)
  as03Repo: Repository<DailyPlanAs03Entity>;

  /**
   * 按日期范围与卫星集合查询（POST，支持 body）
   * body: { sat: 'AS02' | 'AS03' | string[]; startDate?: 'YYYY-MM-DD'; endDate?: 'YYYY-MM-DD' }
   */
  @Post('/daily_plan')
  async getRange(@Body() payload: any) {
    const satRaw = payload?.sat ?? 'AS02';
    const sats = Array.isArray(satRaw)
      ? satRaw.map((s) => String(s || '').toUpperCase()).filter(Boolean)
      : [String(satRaw || '').toUpperCase()];

    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const start = parseDate(payload?.startDate);
    const end = parseDate(payload?.endDate);
    const dateWhere =
      start && end ? Between(start, end) : start ? start : end ? end : undefined;

    const collect = async (sat: string) => {
      const repo =
        sat === 'AS03'
          ? (this.as03Repo as Repository<DailyPlanAs03Entity>)
          : (this.as02Repo as Repository<DailyPlanAs02Entity>);
      const where: FindOptionsWhere<any> = {};
      if (dateWhere) {
        where.date = dateWhere;
      }
      const list = await repo.find({
        where,
        order: { date: 'DESC', id: 'DESC' },
      });
      return list.map((item) => ({ ...item, satellite: sat }));
    };

    const results: any[] = [];
    for (const s of sats) {
      results.push(...(await collect(s)));
    }

    return this.ok({
      ok: true,
      satellites: sats,
      startDate: start ? start.toISOString().slice(0, 10) : null,
      endDate: end ? end.toISOString().slice(0, 10) : null,
      list: results,
    });
  }
}
