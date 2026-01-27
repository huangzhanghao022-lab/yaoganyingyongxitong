import { Provide, Inject } from '@midwayjs/core';
import { IMidwayContext } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { FixedStorageUpdateLogEntity } from '../entity/fixed_storage_update_log';

export type FixedStorageLogInput = {
  tableCode?: number;
  tableName?: string;
  action: string;
  sourceType?: string;
  sourceApi?: string;
  requestId?: string;
  operator?: string;
  ip?: string;
  target?: any;
  change?: any;
  dataSource?: any;
  remark?: string;
};

@Provide()
export class FixedStorageUpdateLogService {
  @Inject()
  ctx: IMidwayContext;

  @InjectEntityModel(FixedStorageUpdateLogEntity)
  repo: Repository<FixedStorageUpdateLogEntity>;

  async writeLog(input: FixedStorageLogInput, ctx?: IMidwayContext) {
    const c = ctx || this.ctx;
    const requestId = input.requestId ?? (c as any)?.requestId ?? (c as any)?.req?.id;
    const operator =
      input.operator ?? (c as any)?.user?.username ?? (c as any)?.user?.name ?? 'unknown';
    const ip = input.ip ?? (c as any)?.ip ?? (c as any)?.request?.ip;
    const sourceApi = input.sourceApi ?? (c as any)?.path ?? (c as any)?.request?.path;
    const headers = (c as any)?.headers ?? (c as any)?.request?.headers ?? {};
    const method = (c as any)?.method ?? (c as any)?.request?.method;
    const referer = headers?.referer || headers?.referrer;
    const userAgent = headers?.['user-agent'];
    const requestMeta = {
      method,
      referer,
      userAgent,
    };

    const payload: Partial<FixedStorageUpdateLogEntity> = {
      tableCode: input.tableCode,
      tableName: input.tableName,
      action: input.action,
      sourceType: input.sourceType,
      sourceApi,
      requestId,
      operator,
      ip,
      target: input.target as any,
      change: input.change as any,
      dataSource: {
        ...(input.dataSource || {}),
        _request: requestMeta,
      } as any,
      remark: input.remark,
    };

    try {
      await this.repo.save(payload as any);
    } catch (err) {
      // Avoid blocking core flow on audit write failures.
      // eslint-disable-next-line no-console
      console.warn('[fixed-storage-log] write failed:', err?.message || err);
    }
  }
}
