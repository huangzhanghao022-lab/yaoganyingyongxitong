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
import { TaskLogDeleteAs02Entity } from '../entity/delete_as02';
import { TaskLogDeleteAs03Entity } from '../entity/delete_as03';
import { TaskLogHistoryTransferAs02Entity } from '../entity/history_transfer_as02';
import { TaskLogHistoryTransferAs03Entity } from '../entity/history_transfer_as03';
import { TaskLogOrbitControlAs02Entity } from '../entity/orbit_control_as02';
import { as02payloadtableEntity } from '../../star/entity/as02_payload_table/as02_payload_table';
import { as02platformtableEntity } from '../../star/entity/as02_platform_table/as02_platform_table';
import { as03payloadtableEntity } from '../../star/entity/as03_payload_table/as03_payload_table';
import { as03platformtableEntity } from '../../star/entity/as03_platform_table/as03_platform_table';
import { FixedStorageUpdateLogService } from '../../fixed_storage_log/service/fixed_storage_update_log';
import axios from 'axios';
import { ILogger } from '@midwayjs/logger';

type FileRange = { start: number; end: number };
type TransferFileRanges = { payload: FileRange[]; platform: FileRange[] };
type TelecontrolDeleteResult = {
  id: string;
  ok: boolean;
  status?: number;
  data?: any;
  error?: string;
  url?: string;
  payload?: { id: string; fromState: number; toState: number };
};
const DELETABLE_LOG_STATUSES = new Set([0, 1, 2]);
const CHAIN_DELETE_SKIP_STATUSES = new Set([3, 4]); // 已执行完成 / 任务取消
const TELECONTROL_CHAIN_DELETE_URL = 'http://ttnonc-webui.cyk3.yhroot.com/v2/api/telecontrol/chain/delete';
const TELECONTROL_TOKEN_URL = 'http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token';
const TELECONTROL_CREDENTIALS = {
  username: '02ptemplate@yinhe.ht',
  password: '123456',
  loginType: 2,
};

@Provide()
export class TaskLogTaskManageService extends BaseService {
  @Inject()
  logger: ILogger;
  private tokenCache: { ts: number; token: string } | null = null;
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

  @InjectEntityModel(TaskLogDeleteAs02Entity)
  taskLogDeleteAs02Entity: Repository<TaskLogDeleteAs02Entity>;

  @InjectEntityModel(TaskLogDeleteAs03Entity)
  taskLogDeleteAs03Entity: Repository<TaskLogDeleteAs03Entity>;

  @InjectEntityModel(TaskLogHistoryTransferAs02Entity)
  taskLogHistoryTransferAs02Entity: Repository<TaskLogHistoryTransferAs02Entity>;

  @InjectEntityModel(TaskLogHistoryTransferAs03Entity)
  taskLogHistoryTransferAs03Entity: Repository<TaskLogHistoryTransferAs03Entity>;

  @InjectEntityModel(TaskLogOrbitControlAs02Entity)
  taskLogOrbitControlAs02Entity: Repository<TaskLogOrbitControlAs02Entity>;

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
  }): Promise<{ count: number; warnings?: string[]; telecontrolDeletes?: TelecontrolDeleteResult[] }> {
    this.logger?.info?.('[task-manage] delete request: %s', JSON.stringify(param || {}));
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
      if (
        parsedTimes.length &&
        (type === 'imaging' ||
          type === 'transfer' ||
          type === 'delete' ||
          type === 'history_transfer' ||
          type === 'orbit_control')
      ) {
        return this.deleteByTimes(
          satellite,
          type as 'imaging' | 'transfer' | 'delete' | 'history_transfer' | 'orbit_control',
          parsedTimes
        );
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
    type: 'imaging' | 'transfer' | 'delete' | 'history_transfer' | 'orbit_control',
    times: Date[]
  ): Promise<{ count: number; warnings?: string[]; telecontrolDeletes?: TelecontrolDeleteResult[] }> {
    const repo = satellite === 'AS03' ? this.taskAs03Entity : this.taskAs02Entity;
    let deleted = 0;
    const warnings: string[] = [];
    const telecontrolDeletes: TelecontrolDeleteResult[] = [];
    for (const time of times) {
      const { start, end } = this.buildTimeRange(time);
      if (type === 'imaging') {
        if (satellite === 'AS03') {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogImagingAs03Entity,
                'imagingTime',
                time,
                'commandChainId',
                5 * 60 * 1000
              ))
            );
          } catch (err: any) {
            warnings.push(`AS03 成像链删除异常（已忽略）：${err?.message || err}`);
          }
          const logCount = await this.deleteImagingLogsAs03(time);
          if (!logCount) {
            warnings.push(`AS03 成像日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          } else {
            try {
              await this.rollbackFixedStorageAs03(time);
            } catch (err: any) {
              warnings.push(`AS03 成像固存回退失败，已继续删除任务记录：${err?.message || err}`);
            }
          }
        } else {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogImagingAs02Entity,
                'imagingTime',
                time,
                'commandChainId'
              ))
            );
          } catch (err: any) {
            warnings.push(`AS02 成像链删除异常（已忽略）：${err?.message || err}`);
          }
          const logCount = await this.deleteImagingLogsAs02(time);
          if (!logCount) {
            warnings.push(`AS02 成像日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          } else {
            try {
              await this.rollbackFixedStorageAs02(time);
            } catch (err: any) {
              warnings.push(`AS02 成像固存回退失败，已继续删除任务记录：${err?.message || err}`);
            }
          }
        }
        const res = await repo.delete({ imagingTime: Between(start, end) } as any);
        deleted += res?.affected || 0;
      } else if (type === 'transfer') {
        if (satellite === 'AS03') {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogTransmitAs03Entity,
                'transmitTime',
                time,
                'commandChainId',
                5 * 60 * 1000
              ))
            );
          } catch (err: any) {
            warnings.push(`AS03 数传链删除异常（已忽略）：${err?.message || err}`);
          }
          const { count: logCount, ranges } = await this.deleteTransferLogsAs03(time);
          if (!logCount) {
            warnings.push(`AS03 数传日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          } else {
            try {
              await this.rollbackTransferFilesAs03(ranges);
            } catch (err: any) {
              warnings.push(`AS03 数传固存回退失败，已继续删除任务记录：${err?.message || err}`);
            }
          }
        } else {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogTransmitAs02Entity,
                'transmitTime',
                time,
                'commandChainId'
              ))
            );
          } catch (err: any) {
            warnings.push(`AS02 数传链删除异常（已忽略）：${err?.message || err}`);
          }
          const { count: logCount, ranges } = await this.deleteTransferLogsAs02(time);
          if (!logCount) {
            warnings.push(`AS02 数传日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          } else {
            try {
              await this.rollbackTransferFilesAs02(ranges);
            } catch (err: any) {
              warnings.push(`AS02 数传固存回退失败，已继续删除任务记录：${err?.message || err}`);
            }
          }
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
      } else if (type === 'delete') {
        if (satellite === 'AS03') {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogDeleteAs03Entity,
                'taskExecutionTime',
                time,
                'deleteCommandChainId',
                5 * 60 * 1000
              ))
            );
          } catch (err: any) {
            warnings.push(`AS03 删除链删除异常（已忽略）：${err?.message || err}`);
          }
          const logCount = await this.deleteDeleteLogsAs03(time);
          if (!logCount) {
            warnings.push(`AS03 删除日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          }
          deleted += logCount;
        } else {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogDeleteAs02Entity,
                'taskExecutionTime',
                time,
                'deleteCommandChainId'
              ))
            );
          } catch (err: any) {
            warnings.push(`AS02 删除链删除异常（已忽略）：${err?.message || err}`);
          }
          const logCount = await this.deleteDeleteLogsAs02(time);
          if (!logCount) {
            warnings.push(`AS02 删除日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          }
          deleted += logCount;
        }
      } else if (type === 'history_transfer') {
        if (satellite === 'AS03') {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogHistoryTransferAs03Entity,
                'taskExecutionTime',
                time,
                'commandChainId'
              ))
            );
          } catch (err: any) {
            warnings.push(`AS03 平台转存链删除异常（已忽略）：${err?.message || err}`);
          }
          const rows = await this.deleteHistoryTransferLogsAs03(time);
          if (!rows.length) {
            warnings.push(`AS03 平台转存日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          } else {
            try {
              await this.rollbackHistoryTransferStorageAs03(rows, time);
            } catch (err: any) {
              warnings.push(`AS03 平台转存固存回退失败，已继续删除任务记录：${err?.message || err}`);
            }
          }
          deleted += rows.length;
        } else {
          try {
            telecontrolDeletes.push(
              ...(await this.deleteTelecontrolChainsByTime(
                this.taskLogHistoryTransferAs02Entity,
                'taskExecutionTime',
                time,
                'commandChainId'
              ))
            );
          } catch (err: any) {
            warnings.push(`AS02 平台转存链删除异常（已忽略）：${err?.message || err}`);
          }
          const rows = await this.deleteHistoryTransferLogsAs02(time);
          if (!rows.length) {
            warnings.push(`AS02 平台转存日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
          } else {
            try {
              await this.rollbackHistoryTransferStorageAs02(rows, time);
            } catch (err: any) {
              warnings.push(`AS02 平台转存固存回退失败，已继续删除任务记录：${err?.message || err}`);
            }
          }
          deleted += rows.length;
        }
      } else {
        try {
          telecontrolDeletes.push(
            ...(await this.deleteTelecontrolChainsByTime(
              this.taskLogOrbitControlAs02Entity,
              'taskExecutionTime',
              time,
              'commandChainId',
              1000,
              { ignoreStatusSkip: true }
            ))
          );
        } catch (err: any) {
          warnings.push(`AS02 轨控链删除异常（已忽略）：${err?.message || err}`);
        }
        const count = await this.deleteOrbitControlLogsAs02(time);
        if (!count) {
          warnings.push(`AS02 轨控日志未找到，仍继续删除任务记录：${time.toISOString?.() ?? String(time)}`);
        }
        deleted += count;
      }
    }
    const base = { count: deleted };
    const withWarnings = warnings.length ? { ...base, warnings } : base;
    return telecontrolDeletes.length ? { ...withWarnings, telecontrolDeletes } : withWarnings;
  }

  private async deleteAs02(ids: number[]): Promise<{ count: number; telecontrolDeletes?: TelecontrolDeleteResult[] }> {
    const tasks = await this.taskAs02Entity.find({ where: { id: In(ids) } });
    if (!tasks.length) return { count: 0 };
    const telecontrolDeletes: TelecontrolDeleteResult[] = [];

    for (const task of tasks) {
      if (task.imagingTime) {
        telecontrolDeletes.push(...(await this.deleteTelecontrolChainsByTime(this.taskLogImagingAs02Entity, 'imagingTime', task.imagingTime, 'commandChainId')));
        const logCount = await this.deleteImagingLogsAs02(task.imagingTime);
        if (logCount) {
          await this.rollbackFixedStorageAs02(task.imagingTime, task.imagingUID || undefined);
        }
      }
      if (task.transferTime) {
        telecontrolDeletes.push(...(await this.deleteTelecontrolChainsByTime(this.taskLogTransmitAs02Entity, 'transmitTime', task.transferTime, 'commandChainId')));
        const { count: logCount, ranges } = await this.deleteTransferLogsAs02(task.transferTime);
        if (logCount) {
          await this.rollbackTransferFilesAs02(ranges);
        }
      }
    }

    await this.taskAs02Entity.delete({ id: In(ids) });
    return telecontrolDeletes.length ? { count: tasks.length, telecontrolDeletes } : { count: tasks.length };
  }

  async updateCommandChainId(param: {
    satellite?: string;
    type?: 'image' | 'transfer' | 'delete';
    time?: string | number | Date;
    commandChainId?: string;
    toleranceMs?: number;
    force?: boolean;
  }): Promise<{ updated: number }> {
    const satellite = String(param?.satellite || '').toUpperCase();
    const type = String(param?.type || '').toLowerCase() as 'image' | 'transfer' | 'delete';
    const rawTime = param?.time;
    const commandChainId = param?.commandChainId ? String(param.commandChainId) : '';
    if (!satellite || !['AS02', 'AS03'].includes(satellite)) {
      return { updated: 0 };
    }
    if (!type || !['image', 'transfer', 'delete'].includes(type)) {
      return { updated: 0 };
    }
    if (!rawTime || !commandChainId) {
      return { updated: 0 };
    }
    const time = rawTime instanceof Date ? rawTime : new Date(rawTime as any);
    if (!Number.isFinite(time.getTime())) {
      return { updated: 0 };
    }
    const toleranceMs = Number.isFinite(param?.toleranceMs) ? Number(param?.toleranceMs) : 1000;
    const { start, end } = this.buildTimeRange(time, toleranceMs);

    if (type === 'image') {
      const repo = satellite === 'AS03' ? this.taskLogImagingAs03Entity : this.taskLogImagingAs02Entity;
      const row: any = await repo.findOne({ where: { satelliteCode: satellite, imagingTime: Between(start, end) } as any });
      if (!row) return { updated: 0 };
      const merged = param?.force
        ? JSON.stringify([commandChainId])
        : this.mergeCommandChainIds(row.commandChainId, commandChainId);
      if (row.commandChainId === merged) return { updated: 0 };
      await repo.update({ id: row.id } as any, { commandChainId: merged } as any);
      return { updated: 1 };
    }

    if (type === 'transfer') {
      const repo = satellite === 'AS03' ? this.taskLogTransmitAs03Entity : this.taskLogTransmitAs02Entity;
      const row: any = await repo.findOne({ where: { satelliteCode: satellite, transmitTime: Between(start, end) } as any });
      if (!row) return { updated: 0 };
      const merged = param?.force
        ? JSON.stringify([commandChainId])
        : this.mergeCommandChainIds(row.commandChainId, commandChainId);
      if (row.commandChainId === merged) return { updated: 0 };
      await repo.update({ id: row.id } as any, { commandChainId: merged } as any);
      return { updated: 1 };
    }

    const repo = satellite === 'AS03' ? this.taskLogDeleteAs03Entity : this.taskLogDeleteAs02Entity;
    const row: any = await repo.findOne({ where: { satelliteCode: satellite, taskExecutionTime: Between(start, end) } as any });
    if (!row) return { updated: 0 };
    const merged = param?.force
      ? JSON.stringify([commandChainId])
      : this.mergeCommandChainIds(row.deleteCommandChainId, commandChainId);
    if (row.deleteCommandChainId === merged) return { updated: 0 };
    await repo.update({ id: row.id } as any, { deleteCommandChainId: merged } as any);
    return { updated: 1 };
  }

  private mergeCommandChainIds(current: string | undefined | null, incoming: string): string {
    const ids = this.parseCommandChainIds(current);
    const next = String(incoming || '').trim();
    if (next && !ids.includes(next)) {
      ids.push(next);
    }
    return JSON.stringify(ids);
  }

  private parseCommandChainIds(value: string | undefined | null): string[] {
    if (!value) return [];
    const raw = String(value).trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v)).filter(Boolean);
      }
    } catch {
      // fall through to split
    }
    return raw
      .split(/[,\s;]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private async deleteTelecontrolChainsFromRows<T extends { status?: number }>(
    rows: T[],
    field: keyof T & string,
    options?: { ignoreStatusSkip?: boolean }
  ): Promise<TelecontrolDeleteResult[]> {
    const ids = new Set<string>();
    let skippedByStatus = 0;
    let emptyIdRows = 0;
    const ignoreStatusSkip = !!options?.ignoreStatusSkip;
    for (const row of rows) {
      const status = Number((row as any)?.status);
      if (!ignoreStatusSkip && CHAIN_DELETE_SKIP_STATUSES.has(status)) {
        skippedByStatus += 1;
        continue;
      }
      const raw = (row as any)?.[field];
      const list = this.parseCommandChainIds(raw);
      if (!list.length) {
        emptyIdRows += 1;
      }
      for (const id of list) {
        if (id) ids.add(id);
      }
    }
    this.logger?.info?.(
      '[task-manage] telecontrol delete candidates: %s',
      JSON.stringify({
        rows: rows.length,
        skippedByStatus,
        ignoreStatusSkip,
        emptyIdRows,
        totalIds: ids.size,
        ids: Array.from(ids),
      })
    );
    if (!ids.size) return [];
    let token = '';
    try {
      token = await this.fetchTelecontrolToken();
    } catch (err) {
      const message = (err as any)?.message || String(err);
      this.logger?.warn?.('[task-manage] telecontrol token fetch failed: %s', message);
      return Array.from(ids).map((id) => ({
        id,
        ok: false,
        error: message,
        url: TELECONTROL_CHAIN_DELETE_URL,
        payload: { id, fromState: 1, toState: 2 },
      }));
    }
    const results: TelecontrolDeleteResult[] = [];
    for (const id of ids) {
      try {
        this.logger?.info?.(
          '[task-manage] telecontrol delete request: %s',
          JSON.stringify({ id, fromState: 1, toState: 2 })
        );
        this.logger?.info?.(
          '[task-manage] telecontrol delete url: %s',
          TELECONTROL_CHAIN_DELETE_URL
        );
        const resp = await axios.post(
          TELECONTROL_CHAIN_DELETE_URL,
          { id, fromState: 1, toState: 2 },
          { headers: { 'Content-Type': 'application/json', 'x-web-token': token } }
        );
        this.logger?.info?.(
          '[task-manage] telecontrol delete ok: %s',
          JSON.stringify({ id, status: resp?.status, data: resp?.data })
        );
        results.push({
          id,
          ok: true,
          status: resp?.status,
          data: resp?.data,
          url: TELECONTROL_CHAIN_DELETE_URL,
          payload: { id, fromState: 1, toState: 2 },
        });
      } catch (err) {
        // 删除测运控链失败不阻断本地删除
        // 仅记录在日志系统中，便于后续排查
        const message = (err as any)?.message || String(err);
        await this.logStorageUpdate({
          tableName: 'telecontrol_chain',
          action: 'task_manage.delete_chain',
          target: { id },
          change: { fromState: 1, toState: 2 },
          dataSource: { error: message },
          remark: 'delete telecontrol chain failed',
        });
        this.logger?.warn?.('[task-manage] telecontrol delete failed: %s', id, err as any);
        results.push({
          id,
          ok: false,
          error: message,
          url: TELECONTROL_CHAIN_DELETE_URL,
          payload: { id, fromState: 1, toState: 2 },
        });
      }
    }
    return results;
  }

  private async deleteTelecontrolChainsByTime<T extends { status?: number }>(
    repo: Repository<T>,
    timeField: keyof T & string,
    time: Date,
    idField: keyof T & string,
    toleranceMs = 1000,
    options?: { ignoreStatusSkip?: boolean }
  ): Promise<TelecontrolDeleteResult[]> {
    const { start, end } = this.buildTimeRange(time, toleranceMs);
    this.logger?.info?.(
      '[task-manage] telecontrol delete scan: %s',
      JSON.stringify({
        timeField,
        from: start?.toISOString?.() ?? String(start),
        to: end?.toISOString?.() ?? String(end),
      })
    );
    const rows = await repo.find({ where: { [timeField]: Between(start, end) } as any });
    if (!rows.length) {
      this.logger?.warn?.('[task-manage] telecontrol delete scan empty: %s', String(time));
      return [];
    }
    return this.deleteTelecontrolChainsFromRows(rows, idField, options);
  }

  private async fetchTelecontrolToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && now - this.tokenCache.ts < 5 * 60 * 1000) {
      return this.tokenCache.token;
    }
    const resp = await axios.post(TELECONTROL_TOKEN_URL, TELECONTROL_CREDENTIALS, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = resp?.data;
    const token = data?.data?.token ?? data?.token ?? data?.data;
    if (!token) {
      this.logger?.warn?.(
        '[task-manage] telecontrol token missing: %s',
        JSON.stringify({ status: resp?.status, data })
      );
      throw new Error('telecontrol token missing');
    }
    this.tokenCache = { ts: now, token };
    return token;
  }

  private async deleteAs03(ids: number[]): Promise<{ count: number; telecontrolDeletes?: TelecontrolDeleteResult[] }> {
    const tasks = await this.taskAs03Entity.find({ where: { id: In(ids) } });
    if (!tasks.length) return { count: 0 };
    const telecontrolDeletes: TelecontrolDeleteResult[] = [];

    for (const task of tasks) {
      if (task.imagingTime) {
        telecontrolDeletes.push(...(await this.deleteTelecontrolChainsByTime(
          this.taskLogImagingAs03Entity,
          'imagingTime',
          task.imagingTime,
          'commandChainId',
          5 * 60 * 1000
        )));
        const logCount = await this.deleteImagingLogsAs03(task.imagingTime);
        if (logCount) {
          await this.rollbackFixedStorageAs03(task.imagingTime, task.imagingUID || undefined);
        }
      }
      if (task.transferTime) {
        telecontrolDeletes.push(...(await this.deleteTelecontrolChainsByTime(
          this.taskLogTransmitAs03Entity,
          'transmitTime',
          task.transferTime,
          'commandChainId',
          5 * 60 * 1000
        )));
        const { count: logCount, ranges } = await this.deleteTransferLogsAs03(task.transferTime);
        if (logCount) {
          await this.rollbackTransferFilesAs03(ranges);
        }
      }
    }

    await this.taskAs03Entity.delete({ id: In(ids) });
    return telecontrolDeletes.length ? { count: tasks.length, telecontrolDeletes } : { count: tasks.length };
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

  private async deleteDeleteLogsAs02(taskTime: Date): Promise<number> {
    const { start, end } = this.buildTimeRange(taskTime);
    const rows = await this.taskLogDeleteAs02Entity.find({ where: { taskExecutionTime: Between(start, end) } });
    if (!rows.length) return 0;
    this.assertDeletableLogStatus(rows, 'delete');
    await this.taskLogDeleteAs02Entity.delete({ taskExecutionTime: Between(start, end) });
    return rows.length;
  }

  private async deleteDeleteLogsAs03(taskTime: Date): Promise<number> {
    const { start, end } = this.buildTimeRange(taskTime);
    const rows = await this.taskLogDeleteAs03Entity.find({ where: { taskExecutionTime: Between(start, end) } });
    if (!rows.length) return 0;
    this.assertDeletableLogStatus(rows, 'delete');
    await this.taskLogDeleteAs03Entity.delete({ taskExecutionTime: Between(start, end) });
    return rows.length;
  }

  private async deleteHistoryTransferLogsAs02(taskTime: Date): Promise<TaskLogHistoryTransferAs02Entity[]> {
    const { start, end } = this.buildTimeRange(taskTime);
    const rows = await this.taskLogHistoryTransferAs02Entity.find({
      where: { taskExecutionTime: Between(start, end) } as any,
    });
    if (!rows.length) return [];
    this.assertDeletableLogStatus(rows as any, 'delete');
    await this.taskLogHistoryTransferAs02Entity.delete({ taskExecutionTime: Between(start, end) } as any);
    return rows;
  }

  private async deleteHistoryTransferLogsAs03(taskTime: Date): Promise<TaskLogHistoryTransferAs03Entity[]> {
    const { start, end } = this.buildTimeRange(taskTime);
    const rows = await this.taskLogHistoryTransferAs03Entity.find({
      where: { taskExecutionTime: Between(start, end) } as any,
    });
    if (!rows.length) return [];
    this.assertDeletableLogStatus(rows as any, 'delete');
    await this.taskLogHistoryTransferAs03Entity.delete({ taskExecutionTime: Between(start, end) } as any);
    return rows;
  }

  private async deleteOrbitControlLogsAs02(taskTime: Date): Promise<number> {
    const { start, end } = this.buildTimeRange(taskTime);
    const rows = await this.taskLogOrbitControlAs02Entity.find({
      where: { taskExecutionTime: Between(start, end) } as any,
    });
    if (!rows.length) return 0;
    this.assertDeletableLogStatus(rows as any, 'delete');
    await this.taskLogOrbitControlAs02Entity.delete({ taskExecutionTime: Between(start, end) } as any);
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

  private async rollbackHistoryTransferStorageAs02(rows: TaskLogHistoryTransferAs02Entity[], taskTime: Date) {
    const fileNos = rows
      .map((row: any) => Number(row?.recordFileNo))
      .filter((n) => Number.isFinite(n));
    let matched: any[] = [];
    if (fileNos.length) {
      matched = await this.as02PlatformEntity.find({ where: { startFileNo: In(fileNos) } as any });
    }
    if (!matched.length) {
      const { start, end } = this.buildTimeRange(taskTime);
      matched = await this.as02PlatformEntity.find({ where: { executingTime: Between(start, end) } as any });
    }
    if (!matched.length) return;
    const ids = matched.map((r: any) => Number(r?.id)).filter((id) => Number.isFinite(id));
    if (!ids.length) return;
    await this.as02PlatformEntity.update(
      { id: In(ids) } as any,
      {
        status: 0,
        fileName: null,
        executingTime: null,
        imagingUid: null,
        updateTime: new Date(),
      } as any
    );
    await this.logStorageUpdate({
      tableName: this.as02PlatformEntity.metadata.tableName,
      action: 'task_manage.rollback.history_transfer',
      target: { ids },
      change: { status: 0, cleared: true },
      dataSource: {
        taskExecutionTime: taskTime,
        recordFileNos: fileNos,
      },
    });
  }

  private async rollbackHistoryTransferStorageAs03(rows: TaskLogHistoryTransferAs03Entity[], taskTime: Date) {
    const { start, end } = this.buildTimeRange(taskTime);
    let matched = await this.as03PlatformEntity.find({ where: { executingTime: Between(start, end) } as any });
    if (!matched.length) {
      const names = rows.map((r: any) => String(r?.targetName || '').trim()).filter(Boolean);
      if (names.length) {
        matched = await this.as03PlatformEntity.find({ where: { fileName: In(names) } as any });
      }
    }
    if (!matched.length) return;
    const ids = matched.map((r: any) => Number(r?.id)).filter((id) => Number.isFinite(id));
    if (!ids.length) return;
    await this.as03PlatformEntity.update(
      { id: In(ids) } as any,
      {
        status: 0,
        fileName: null,
        executingTime: null,
        imagingUid: null,
        updateTime: new Date(),
      } as any
    );
    await this.logStorageUpdate({
      tableName: this.as03PlatformEntity.metadata.tableName,
      action: 'task_manage.rollback.history_transfer',
      target: { ids },
      change: { status: 0, cleared: true },
      dataSource: {
        taskExecutionTime: taskTime,
        targetNames: rows.map((r: any) => r?.targetName).filter(Boolean),
      },
    });
  }

  private assertDeletableLogStatus(rows: Array<{ status?: number }>, type: 'imaging' | 'transfer' | 'delete') {
    const blocked = rows.filter((row) => !DELETABLE_LOG_STATUSES.has(Number(row?.status)));
    if (blocked.length) {
      const label = type === 'transfer' ? 'transfer' : type === 'delete' ? 'delete' : 'imaging';
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
