import { Provide, Inject } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { TaskAs02Entity } from '../../task/entity/as02';
import { TaskAs03Entity } from '../../task/entity/as03';
import { TaskLogImagingAs02Entity } from '../entity/imaging_as02';
import { TaskLogImagingAs03Entity } from '../entity/imaging_as03';
import { TaskLogTransmitAs02Entity } from '../entity/transmit_as02';
import { TaskLogTransmitAs03Entity } from '../entity/transmit_as03';
import { as02payloadtableEntity } from '../../star/entity/as02_payload_table/as02_payload_table';
import { as02platformtableEntity } from '../../star/entity/as02_platform_table/as02_platform_table';
import { as03payloadtableEntity } from '../../star/entity/as03_payload_table/as03_payload_table';
import { as03platformtableEntity } from '../../star/entity/as03_platform_table/as03_platform_table';
import { FixedStorageUpdateLogService } from '../../fixed_storage_log/service/fixed_storage_update_log';

type FileRange = { start: number; end: number };
type TransferFileRanges = { payload: FileRange[]; platform: FileRange[] };
const DELETABLE_LOG_STATUSES = new Set([0, 1, 2]);

@Provide()
export class TaskLogTaskManageService extends BaseService {
  @InjectEntityModel(TaskAs02Entity)
  taskAs02Entity: Repository<TaskAs02Entity>;

  @InjectEntityModel(TaskAs03Entity)
  taskAs03Entity: Repository<TaskAs03Entity>;

  @InjectEntityModel(TaskLogImagingAs02Entity)
  taskLogImagingAs02Entity: Repository<TaskLogImagingAs02Entity>;

  @InjectEntityModel(TaskLogImagingAs03Entity)
  taskLogImagingAs03Entity: Repository<TaskLogImagingAs03Entity>;

  @InjectEntityModel(TaskLogTransmitAs02Entity)
  taskLogTransmitAs02Entity: Repository<TaskLogTransmitAs02Entity>;

  @InjectEntityModel(TaskLogTransmitAs03Entity)
  taskLogTransmitAs03Entity: Repository<TaskLogTransmitAs03Entity>;

  @InjectEntityModel(as02payloadtableEntity)
  as02PayloadEntity: Repository<as02payloadtableEntity>;

  @InjectEntityModel(as02platformtableEntity)
  as02PlatformEntity: Repository<as02platformtableEntity>;

  @InjectEntityModel(as03payloadtableEntity)
  as03PayloadEntity: Repository<as03payloadtableEntity>;

  @InjectEntityModel(as03platformtableEntity)
  as03PlatformEntity: Repository<as03platformtableEntity>;

  @Inject()
  fixedStorageUpdateLogService: FixedStorageUpdateLogService;

  async deleteByTaskIds(param: {
    satellite?: string;
    ids?: number[] | number;
    type?: string;
    time?: string | number | Date;
    times?: Array<string | number | Date>;
  }): Promise<{ count: number }> {
    const ids = Array.isArray(param?.ids)
      ? param.ids
      : param?.ids != null
      ? [param.ids]
      : [];

    const satellite = String(param?.satellite || '').toUpperCase();
    if (!ids.length) {
      const timeList = Array.isArray(param?.times) ? param.times : param?.time != null ? [param.time] : [];
      const parsedTimes = timeList
        .map((t) => (t instanceof Date ? t : new Date(t as any)))
        .filter((d) => Number.isFinite(d.getTime()));
      const type = String(param?.type || '').toLowerCase();
      if (parsedTimes.length && (type === 'imaging' || type === 'transfer')) {
        return this.deleteByTimes(satellite, type as 'imaging' | 'transfer', parsedTimes);
      }
      return { count: 0 };
    }

    if (satellite === 'AS03') {
      return this.deleteAs03(ids);
    }
    return this.deleteAs02(ids);
  }

  private buildTimeRange(time: Date, toleranceMs = 1000): { start: Date; end: Date } {
    const base = new Date(time);
    return {
      start: new Date(base.getTime() - toleranceMs),
      end: new Date(base.getTime() + toleranceMs),
    };
  }

  private async deleteByTimes(
    satellite: string,
    type: 'imaging' | 'transfer',
    times: Date[]
  ): Promise<{ count: number }> {
    const repo = satellite === 'AS03' ? this.taskAs03Entity : this.taskAs02Entity;
    let deleted = 0;
    for (const time of times) {
      const { start, end } = this.buildTimeRange(time);
      if (type === 'imaging') {
        if (satellite === 'AS03') {
          const logCount = await this.deleteImagingLogsAs03(time);
          if (!logCount) continue;
          await this.rollbackFixedStorageAs03(time);
        } else {
          const logCount = await this.deleteImagingLogsAs02(time);
          if (!logCount) continue;
          await this.rollbackFixedStorageAs02(time);
        }
        const res = await repo.delete({ imagingTime: Between(start, end) } as any);
        deleted += res?.affected || 0;
      } else {
        if (satellite === 'AS03') {
          const { count: logCount, ranges } = await this.deleteTransferLogsAs03(time);
          if (!logCount) continue;
          await this.rollbackTransferFilesAs03(ranges);
        } else {
          const { count: logCount, ranges } = await this.deleteTransferLogsAs02(time);
          if (!logCount) continue;
          await this.rollbackTransferFilesAs02(ranges);
        }
        const res = await repo.update(
          { transferTime: Between(start, end) } as any,
          {
            transferName: null,
            transferTime: null,
            transferUID: null,
            transferRecords: null,
          }
        );
        deleted += res?.affected || 0;
      }
    }
    return { count: deleted };
  }

  private async deleteAs02(ids: number[]): Promise<{ count: number }> {
    const tasks = await this.taskAs02Entity.find({ where: { id: In(ids) } });
    if (!tasks.length) return { count: 0 };

    for (const task of tasks) {
      if (task.imagingTime) {
        const logCount = await this.deleteImagingLogsAs02(task.imagingTime);
        if (logCount) {
          await this.rollbackFixedStorageAs02(task.imagingTime, task.imagingUID || undefined);
        }
      }
      if (task.transferTime) {
        const { count: logCount, ranges } = await this.deleteTransferLogsAs02(task.transferTime);
        if (logCount) {
          await this.rollbackTransferFilesAs02(ranges);
        }
      }
    }

    await this.taskAs02Entity.delete({ id: In(ids) });
    return { count: tasks.length };
  }

  private async deleteAs03(ids: number[]): Promise<{ count: number }> {
    const tasks = await this.taskAs03Entity.find({ where: { id: In(ids) } });
    if (!tasks.length) return { count: 0 };

    for (const task of tasks) {
      if (task.imagingTime) {
        const logCount = await this.deleteImagingLogsAs03(task.imagingTime);
        if (logCount) {
          await this.rollbackFixedStorageAs03(task.imagingTime, task.imagingUID || undefined);
        }
      }
      if (task.transferTime) {
        const { count: logCount, ranges } = await this.deleteTransferLogsAs03(task.transferTime);
        if (logCount) {
          await this.rollbackTransferFilesAs03(ranges);
        }
      }
    }

    await this.taskAs03Entity.delete({ id: In(ids) });
    return { count: tasks.length };
  }

  private async deleteImagingLogsAs02(imagingTime: Date): Promise<number> {
    const { start, end } = this.buildTimeRange(imagingTime);
    const rows = await this.taskLogImagingAs02Entity.find({ where: { imagingTime: Between(start, end) } });
    if (!rows.length) return 0;
    this.assertDeletableLogStatus(rows, 'imaging');
    await this.taskLogImagingAs02Entity.delete({ imagingTime: Between(start, end) });
    return rows.length;
  }

  private async deleteImagingLogsAs03(imagingTime: Date): Promise<number> {
    const { start, end } = this.buildTimeRange(imagingTime);
    const rows = await this.taskLogImagingAs03Entity.find({ where: { imagingTime: Between(start, end) } });
    if (!rows.length) return 0;
    this.assertDeletableLogStatus(rows, 'imaging');
    await this.taskLogImagingAs03Entity.delete({ imagingTime: Between(start, end) });
    return rows.length;
  }

  private async deleteTransferLogsAs02(
    transferTime: Date
  ): Promise<{ count: number; ranges: TransferFileRanges }> {
    const { start, end } = this.buildTimeRange(transferTime);
    const rows = await this.taskLogTransmitAs02Entity.find({ where: { transmitTime: Between(start, end) } });
    if (!rows.length) {
      return { count: 0, ranges: { payload: [], platform: [] } };
    }
    this.assertDeletableLogStatus(rows, 'transfer');
    await this.taskLogTransmitAs02Entity.delete({ transmitTime: Between(start, end) });
    return { count: rows.length, ranges: this.collectTransferRanges(rows.map((row) => row?.transmitFileNumber)) };
  }

  private async deleteTransferLogsAs03(
    transferTime: Date
  ): Promise<{ count: number; ranges: TransferFileRanges }> {
    const { start, end } = this.buildTimeRange(transferTime);
    const rows = await this.taskLogTransmitAs03Entity.find({ where: { transmitTime: Between(start, end) } });
    if (!rows.length) {
      return { count: 0, ranges: { payload: [], platform: [] } };
    }
    this.assertDeletableLogStatus(rows, 'transfer');
    await this.taskLogTransmitAs03Entity.delete({ transmitTime: Between(start, end) });
    return { count: rows.length, ranges: this.collectTransferRanges(rows.map((row) => row?.transmitFileNumber)) };
  }

  private async rollbackFixedStorageAs02(imagingTime: Date, imagingUid?: string) {
    const range = this.buildTimeRange(imagingTime);
    const payloadRows = imagingUid
      ? await this.as02PayloadEntity.find({ where: { imagingUid } })
      : await this.as02PayloadEntity.find({ where: { imagingTime: Between(range.start, range.end) } });
    const platformRows = imagingUid
      ? await this.as02PlatformEntity.find({ where: { imagingUid } })
      : await this.as02PlatformEntity.find({ where: { executingTime: Between(range.start, range.end) } });

    const payloadIds = payloadRows.map((row: any) => Number(row?.id)).filter((id) => Number.isFinite(id));
    if (payloadIds.length) {
      await this.as02PayloadEntity.update(
        { id: In(payloadIds) },
        {
          status: 0,
          targetName: null,
          imagingTime: null,
          imagingUid: null,
          updateTime: new Date(),
        }
      );
      await this.logStorageUpdate({
        tableName: this.as02PayloadEntity.metadata.tableName,
        action: 'task_manage.rollback.imaging',
        target: { ids: payloadIds },
        change: { status: 0, cleared: true },
        dataSource: { imagingTime, imagingUid },
      });
    }

    const platformIds = platformRows.map((row: any) => Number(row?.id)).filter((id) => Number.isFinite(id));
    if (platformIds.length) {
      await this.as02PlatformEntity.update(
        { id: In(platformIds) },
        {
          status: 0,
          fileName: null,
          executingTime: null,
          imagingUid: null,
          updateTime: new Date(),
        }
      );
      await this.logStorageUpdate({
        tableName: this.as02PlatformEntity.metadata.tableName,
        action: 'task_manage.rollback.imaging',
        target: { ids: platformIds },
        change: { status: 0, cleared: true },
        dataSource: { imagingTime, imagingUid },
      });
    }
  }

  private async rollbackFixedStorageAs03(imagingTime: Date, imagingUid?: string) {
    const range = this.buildTimeRange(imagingTime);
    const payloadRows = imagingUid
      ? await this.as03PayloadEntity.find({ where: { imagingUid } })
      : await this.as03PayloadEntity.find({ where: { imagingTime: Between(range.start, range.end) } });
    const platformRows = imagingUid
      ? await this.as03PlatformEntity.find({ where: { imagingUid } })
      : await this.as03PlatformEntity.find({ where: { executingTime: Between(range.start, range.end) } });

    const payloadIds = payloadRows.map((row: any) => Number(row?.id)).filter((id) => Number.isFinite(id));
    if (payloadIds.length) {
      await this.as03PayloadEntity.update(
        { id: In(payloadIds) },
        {
          status: 0,
          targetName: null,
          imagingTime: null,
          imagingUid: null,
          updateTime: new Date(),
        }
      );
      await this.logStorageUpdate({
        tableName: this.as03PayloadEntity.metadata.tableName,
        action: 'task_manage.rollback.imaging',
        target: { ids: payloadIds },
        change: { status: 0, cleared: true },
        dataSource: { imagingTime, imagingUid },
      });
    }

    const platformIds = platformRows.map((row: any) => Number(row?.id)).filter((id) => Number.isFinite(id));
    if (platformIds.length) {
      await this.as03PlatformEntity.update(
        { id: In(platformIds) },
        {
          status: 0,
          fileName: null,
          executingTime: null,
          imagingUid: null,
          updateTime: new Date(),
        }
      );
      await this.logStorageUpdate({
        tableName: this.as03PlatformEntity.metadata.tableName,
        action: 'task_manage.rollback.imaging',
        target: { ids: platformIds },
        change: { status: 0, cleared: true },
        dataSource: { imagingTime, imagingUid },
      });
    }
  }

  private assertDeletableLogStatus(rows: Array<{ status?: number }>, type: 'imaging' | 'transfer') {
    const blocked = rows.filter((row) => !DELETABLE_LOG_STATUSES.has(Number(row?.status)));
    if (blocked.length) {
      const label = type === 'transfer' ? '数传' : '成像';
      throw new Error(`仅允许删除指令已生成/已挂载/已上注的${label}任务`);
    }
  }

  private collectTransferRanges(values: Array<string | null | undefined>): TransferFileRanges {
    const ranges: TransferFileRanges = { payload: [], platform: [] };
    for (const value of values) {
      if (!value) continue;
      const parsed = this.parseTransferFileRanges(String(value));
      ranges.payload.push(...parsed.payload);
      ranges.platform.push(...parsed.platform);
    }
    return {
      payload: this.mergeRanges(ranges.payload),
      platform: this.mergeRanges(ranges.platform),
    };
  }

  private parseTransferFileRanges(value: string): TransferFileRanges {
    const result: TransferFileRanges = { payload: [], platform: [] };
    if (!value) return result;
    const normalized = value
      .replace(/[，；;]/g, ',')
      .replace(/\s+/g, '')
      .replace(/：/g, ':');
    const tokens = normalized.split(',').map((t) => t.trim()).filter(Boolean);
    let current: 'payload' | 'platform' | null = null;
    for (const token of tokens) {
      let part = token;
      const match = part.match(/^(载荷|平台):(.*)$/);
      if (match) {
        current = match[1] === '载荷' ? 'payload' : 'platform';
        part = match[2] || '';
      }
      const target = current || 'payload';
      const cleaned = part.replace(/\(.*?\)/g, '');
      const range = this.parseRange(cleaned);
      if (range) {
        result[target].push(range);
      }
    }
    return result;
  }

  private parseRange(value: string): FileRange | null {
    if (!value) return null;
    const cleaned = value.replace(/[^\d-]/g, '');
    if (!cleaned) return null;
    const parts = cleaned.split('-').filter((p) => p !== '');
    if (!parts.length) return null;
    const start = Number(parts[0]);
    const end = parts.length > 1 ? Number(parts[1]) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (end < start) return { start: end, end: start };
    return { start, end };
  }

  private mergeRanges(ranges: FileRange[]): FileRange[] {
    if (!ranges.length) return [];
    const sorted = ranges
      .map((r) => ({ start: r.start, end: r.end }))
      .sort((a, b) => (a.start === b.start ? a.end - b.end : a.start - b.start));
    const merged: FileRange[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const curr = sorted[i];
      if (curr.start <= last.end + 1) {
        last.end = Math.max(last.end, curr.end);
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  private async rollbackTransferFilesAs02(ranges: TransferFileRanges) {
    await this.updateFixedStorageByRangesWithTime(this.as02PayloadEntity, ranges.payload, 'imagingTime');
    await this.updateFixedStorageByRangesWithTime(this.as02PlatformEntity, ranges.platform, 'executingTime');
  }

  private async rollbackTransferFilesAs03(ranges: TransferFileRanges) {
    await this.updateFixedStorageByRangesWithTime(this.as03PayloadEntity, ranges.payload, 'imagingTime');
    await this.updateFixedStorageByRangesWithTime(this.as03PlatformEntity, ranges.platform, 'executingTime');
  }

  private async updateFixedStorageByRanges(
    repo: Repository<any>,
    ranges: FileRange[],
    status: number
  ) {
    if (!ranges.length) return;
    const ids = new Set<number>();
    for (const range of ranges) {
      const rows = await repo
        .createQueryBuilder('t')
        .where('t.startFileNo <= :end', { end: range.end })
        .andWhere('(t.endFileNo IS NULL OR t.endFileNo >= :start)', { start: range.start })
        .getMany();
      for (const row of rows) {
        const startNo = Number(row?.startFileNo);
        const endNo = row?.endFileNo != null ? Number(row.endFileNo) : startNo;
        if (!Number.isFinite(startNo) || !Number.isFinite(endNo)) continue;
        if (startNo <= range.end && endNo >= range.start) {
          const id = Number(row?.id);
          if (Number.isFinite(id)) ids.add(id);
        }
      }
    }
    if (!ids.size) return;
    await repo.update(
      { id: In(Array.from(ids)) },
      {
        status,
        updateTime: new Date(),
      }
    );
  }

  private async updateFixedStorageByRangesWithTime(
    repo: Repository<any>,
    ranges: FileRange[],
    timeField: 'imagingTime' | 'executingTime'
  ) {
    if (!ranges.length) return;
    const rows: any[] = [];
    for (const range of ranges) {
      const matched = await repo
        .createQueryBuilder('t')
        .where('t.startFileNo <= :end', { end: range.end })
        .andWhere('(t.endFileNo IS NULL OR t.endFileNo >= :start)', { start: range.start })
        .getMany();
      rows.push(...matched);
    }
    if (!rows.length) return;

    const now = Date.now();
    const pendingIds = new Set<number>();
    const writtenIds = new Set<number>();
    for (const row of rows) {
      const id = Number(row?.id);
      if (!Number.isFinite(id)) continue;
      const timeValue = row?.[timeField];
      const time = timeValue ? new Date(timeValue as any).getTime() : NaN;
      if (Number.isFinite(time) && time <= now) {
        writtenIds.add(id);
      } else {
        pendingIds.add(id);
      }
    }

    if (pendingIds.size) {
      await repo.update(
        { id: In(Array.from(pendingIds)) },
        {
          status: 1,
          updateTime: new Date(),
        }
      );
      await this.logStorageUpdate({
        tableName: repo.metadata.tableName,
        action: 'task_manage.rollback.transfer',
        target: { ids: Array.from(pendingIds) },
        change: { status: 1 },
      });
    }
    if (writtenIds.size) {
      await repo.update(
        { id: In(Array.from(writtenIds)) },
        {
          status: 2,
          updateTime: new Date(),
        }
      );
      await this.logStorageUpdate({
        tableName: repo.metadata.tableName,
        action: 'task_manage.rollback.transfer',
        target: { ids: Array.from(writtenIds) },
        change: { status: 2 },
      });
    }
  }

  private async logStorageUpdate(input: {
    tableName: string;
    action: string;
    target?: any;
    change?: any;
    dataSource?: any;
    remark?: string;
  }) {
    if (!this.fixedStorageUpdateLogService) return;
    await this.fixedStorageUpdateLogService.writeLog({
      tableName: input.tableName,
      action: input.action,
      sourceType: 'task_manage',
      sourceApi: '/admin/task_log/task_manage/delete',
      target: input.target,
      change: input.change,
      dataSource: input.dataSource,
      remark: input.remark,
    });
  }
}
