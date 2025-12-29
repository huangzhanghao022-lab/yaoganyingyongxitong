import { Provide, Inject } from '@midwayjs/core';
import { Job, IJob } from '@midwayjs/cron';
import { InjectEntityModel, InjectDataSource } from '@midwayjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { TaskLogImagingAs02Entity } from '../entity/imaging_as02';
import { TaskLogImagingAs03Entity } from '../entity/imaging_as03';
import { TaskLogTransmitAs02Entity } from '../entity/transmit_as02';
import { TaskLogTransmitAs03Entity } from '../entity/transmit_as03';
import { TaskLogDeleteAs02Entity } from '../entity/delete_as02';
import { TaskLogDeleteAs03Entity } from '../entity/delete_as03';
import { as02payloadtableEntity } from '../../star/entity/as02_payload_table/as02_payload_table';
import { as03payloadtableEntity } from '../../star/entity/as03_payload_table/as03_payload_table';
import { as02platformtableEntity } from '../../star/entity/as02_platform_table/as02_platform_table';
import { as03platformtableEntity } from '../../star/entity/as03_platform_table/as03_platform_table';
import { ILogger } from '@midwayjs/logger';
import { DataSource } from 'typeorm';

// 状态枚举
const STATUS = {
  EMPTY: 0,
  PENDING_WRITE: 1,
  WRITTEN_WAIT_TX: 2,
  TX_WAIT_FEEDBACK: 3,
  TX_WAIT_DELETE: 6,
  TX_SCHEDULED: 7,
};

@Provide()
@Job({
  cronTime: '0 */1 * * * *', // 每分钟
  start: true,
})
export class TaskStorageUpdater implements IJob {
  @Inject() logger: ILogger;
  @InjectDataSource() dataSource: DataSource;

  @InjectEntityModel(TaskLogImagingAs02Entity) imagingAs02Repo: Repository<TaskLogImagingAs02Entity>;
  @InjectEntityModel(TaskLogImagingAs03Entity) imagingAs03Repo: Repository<TaskLogImagingAs03Entity>;
  @InjectEntityModel(TaskLogTransmitAs02Entity) transmitAs02Repo: Repository<TaskLogTransmitAs02Entity>;
  @InjectEntityModel(TaskLogTransmitAs03Entity) transmitAs03Repo: Repository<TaskLogTransmitAs03Entity>;
  @InjectEntityModel(TaskLogDeleteAs02Entity) deleteAs02Repo: Repository<TaskLogDeleteAs02Entity>;
  @InjectEntityModel(TaskLogDeleteAs03Entity) deleteAs03Repo: Repository<TaskLogDeleteAs03Entity>;

  async onTick() {
    this.logger.info('[task-storage-updater] tick at %s', new Date().toISOString());
    const now = new Date();
    try {
      await this.handleImaging(now);
      await this.handleTransmit(now);
      await this.handleDelete(now);
      await this.handlePlatform(now);
    } catch (err) {
      this.logger.error('[task-storage-updater] 定时执行失败: %s', err?.message, { stack: err?.stack });
    }
  }

  private async handleImaging(now: Date) {
    const tasks = await this.imagingAs02Repo.find({
      where: { status: In([0, 1, 2]), imagingTime: LessThanOrEqual(now) },
    });
    const tasks03 = await this.imagingAs03Repo.find({
      where: { status: In([0, 1, 2]), imagingTime: LessThanOrEqual(now) },
    });
    await Promise.all([
      ...tasks.map((t) => this.markImagingDone(t, 'AS02')),
      ...tasks03.map((t) => this.markImagingDone(t, 'AS03')),
    ]);
  }

  private async handlePlatform(now: Date) {
    const repos = [
      this.dataSource.getRepository(as02platformtableEntity),
      this.dataSource.getRepository(as03platformtableEntity),
    ];
    for (const repo of repos) {
      await repo
        .createQueryBuilder()
        .update()
        .set({ status: STATUS.WRITTEN_WAIT_TX, updateTime: now })
        .where('status = :st', { st: STATUS.PENDING_WRITE })
        .andWhere('executingTime IS NOT NULL')
        .andWhere('executingTime <= :now', { now })
        .execute();
    }
  }

  private async markImagingDone(task: TaskLogImagingAs02Entity | TaskLogImagingAs03Entity, sat: 'AS02' | 'AS03') {
    const startFileNo = (task as any).startFileNo as number | undefined;
    const endFileNoRaw = (task as any).endFileNo as number | undefined;
    const endFileNo = endFileNoRaw ?? startFileNo;
    if (startFileNo == null || endFileNo == null) {
      this.logger.warn(
        '[task-storage-updater] imaging task 无文件号，跳过 id=%s, 表=%s, 目标=%s',
        task.id,
        this.getStorageRepo(sat).metadata.tableName,
        (task as any).imagingTargetName ?? '-'
      );
      return;
    }
    const repo = this.getStorageRepo(sat);
    if (sat === 'AS03') {
      const ready = await repo.count({ where: { startFileNo, status: STATUS.PENDING_WRITE } });
      if (!ready) {
        this.logger.warn(
          '[task-storage-updater] imaging task 文件段状态未就绪(非待写入)，跳过 id=%s, start=%s',
          task.id,
          startFileNo
        );
        return;
      }
      await this.updateRangeStatus(
        repo,
        startFileNo,
        startFileNo,
        STATUS.WRITTEN_WAIT_TX,
        {
          targetName: (task as any).imagingTargetName,
          imagingUid: (task as any).imagingUid,
          imagingTime: task.imagingTime,
        },
        [STATUS.PENDING_WRITE]
      );
    } else {
      const ok = await this.checkRangeStatus(repo, startFileNo, endFileNo, [STATUS.PENDING_WRITE]);
      if (!ok) {
        this.logger.warn(
          '[task-storage-updater] imaging task 文件段状态未就绪(非待写入)，跳过 id=%s, start=%s end=%s',
          task.id,
          startFileNo,
          endFileNo
        );
        return;
      }
      await this.updateRangeStatus(
        repo,
        startFileNo,
        endFileNo,
        STATUS.WRITTEN_WAIT_TX,
        {
          targetName: (task as any).imagingTargetName,
          imagingUid: (task as any).imagingUid,
          imagingTime: task.imagingTime,
        },
        [STATUS.PENDING_WRITE]
      );
    }
    task.status = 3; // 成像执行完成
    await (sat === 'AS02' ? this.imagingAs02Repo : this.imagingAs03Repo).save(task);
  }

  private async handleTransmit(now: Date) {
    const tasks = await this.transmitAs02Repo.find({
      where: { status: In([0, 1, 2]), transmitTime: LessThanOrEqual(now) },
    });
    const tasks03 = await this.transmitAs03Repo.find({
      where: { status: In([0, 1, 2]), transmitTime: LessThanOrEqual(now) },
    });
    await Promise.all([
      ...tasks.map((t) => this.markTransmitDone(t, 'AS02')),
      ...tasks03.map((t) => this.markTransmitDone(t, 'AS03')),
    ]);
  }

  private async markTransmitDone(task: TaskLogTransmitAs02Entity | TaskLogTransmitAs03Entity, sat: 'AS02' | 'AS03') {
    const { payload, platform } = this.parseTransmitWithType(task.transmitFileNumber);
    if (!payload.length && !platform.length) {
      this.logger.warn('[task-storage-updater] transmit task 无文件号，跳过 id=%s', task.id);
      return;
    }
    const repo = this.getStorageRepo(sat);
    const platformRepo = this.getPlatformRepo(sat);
    const fromStatuses = [STATUS.WRITTEN_WAIT_TX, STATUS.TX_WAIT_DELETE, STATUS.TX_SCHEDULED, 4]; // 4 兼容可能存在的中间状态
    for (const r of payload) {
      await this.updateRangeStatus(repo, r.start, r.end, STATUS.TX_WAIT_FEEDBACK, {}, fromStatuses);
    }
    for (const r of platform) {
      await this.updateRangeStatus(platformRepo, r.start, r.end, STATUS.TX_WAIT_FEEDBACK, {}, fromStatuses);
    }
    task.status = 3; // 数传任务执行完成
    task.transmitExecutionTime = task.transmitTime;
    await (sat === 'AS02' ? this.transmitAs02Repo : this.transmitAs03Repo).save(task);
  }

  private async handleDelete(now: Date) {
    const tasks = await this.deleteAs02Repo.find({
      where: { status: In([0, 1, 2]), taskExecutionTime: LessThanOrEqual(now) },
    });
    const tasks03 = await this.deleteAs03Repo.find({
      where: { status: In([0, 1, 2]), taskExecutionTime: LessThanOrEqual(now) },
    });
    await Promise.all([
      ...tasks.map((t) => this.markDeleteDone(t, 'AS02')),
      ...tasks03.map((t) => this.markDeleteDone(t, 'AS03')),
    ]);
  }

  private async markDeleteDone(task: TaskLogDeleteAs02Entity | TaskLogDeleteAs03Entity, sat: 'AS02' | 'AS03') {
    const { payload, platform } = this.parseDeleteWithType(task.deleteFileNumber);
    if (!payload.length && !platform.length) {
      this.logger.warn('[task-storage-updater] delete task 无文件号，跳过 id=%s', task.id);
      return;
    }
    const repo = this.getStorageRepo(sat);
    const platformRepo = this.getPlatformRepo(sat);
    const clearPayloadPatch = { targetName: null, imagingUid: null, imagingTime: null, updateTime: new Date() };
    const clearPlatformPatch = { fileName: null, imagingUid: null, executingTime: null, updateTime: new Date() };
    for (const r of payload) {
      await this.updateRangeStatus(repo, r.start, r.end, STATUS.EMPTY, clearPayloadPatch, [STATUS.TX_WAIT_DELETE, STATUS.TX_WAIT_FEEDBACK, STATUS.WRITTEN_WAIT_TX, STATUS.PENDING_WRITE, STATUS.TX_SCHEDULED]);
    }
    for (const r of platform) {
      await this.updateRangeStatus(platformRepo, r.start, r.end, STATUS.EMPTY, clearPlatformPatch, [STATUS.TX_WAIT_DELETE, STATUS.TX_WAIT_FEEDBACK, STATUS.WRITTEN_WAIT_TX, STATUS.PENDING_WRITE, STATUS.TX_SCHEDULED]);
    }
    task.status = 3; // 删除执行完成
    await (sat === 'AS02' ? this.deleteAs02Repo : this.deleteAs03Repo).save(task);
  }

  private getStorageRepo(sat: 'AS02' | 'AS03') {
    const entity = sat === 'AS02' ? as02payloadtableEntity : as03payloadtableEntity;
    return this.dataSource.getRepository(entity);
  }

  private getPlatformRepo(sat: 'AS02' | 'AS03') {
    const entity = sat === 'AS02' ? as02platformtableEntity : as03platformtableEntity;
    return this.dataSource.getRepository(entity);
  }

  private async checkRangeStatus(repo: Repository<any>, start: number, end: number, allowed: number[]) {
    const exist = await repo.findOne({
      where: {
        startFileNo: LessThanOrEqual(start),
        endFileNo: MoreThanOrEqual(end),
        status: In(allowed),
      },
      select: ['id'],
    });
    return Boolean(exist);
  }

  private async updateRangeStatus(
    repo: Repository<any>,
    start: number,
    end: number,
    targetStatus: number,
    patch: Record<string, any>,
    fromStatuses?: number[]
  ) {
    const qb = repo.createQueryBuilder().update();
    qb.set({ ...patch, status: targetStatus, updateTime: new Date() });
    qb.where('startFileNo BETWEEN :s AND :e', { s: start, e: end });
    if (fromStatuses && fromStatuses.length) {
      qb.andWhere('status IN (:...st)', { st: fromStatuses });
    }
    await qb.execute();
  }

  private parseFileNumbers(text: string | null | undefined): Array<{ start: number; end: number }> {
    if (!text) return [];
    const segments = String(text)
      .split(/[,\s；;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const ranges: Array<{ start: number; end: number }> = [];
    for (const seg of segments) {
      if (seg.includes('-')) {
        const [s, e] = seg.split('-').map((n) => Number(n.trim()));
        if (Number.isFinite(s) && Number.isFinite(e) && e >= s) ranges.push({ start: s, end: e });
      } else {
        const n = Number(seg);
        if (Number.isFinite(n)) ranges.push({ start: n, end: n });
      }
    }
    return ranges;
  }

  private parseTransmitWithType(text: string | null | undefined): { payload: Array<{ start: number; end: number }>; platform: Array<{ start: number; end: number }> } {
    const payload: Array<{ start: number; end: number }> = [];
    const platform: Array<{ start: number; end: number }> = [];
    if (!text) return { payload, platform };

    // 规范格式：
    // 仅载荷：载荷:65-96
    // 仅平台：平台:1-8
    // 同时：载荷:65-96,平台:1-8
    // 若无前缀，默认按载荷处理（兼容旧数据）
    const segments = String(text)
      .split(/[，,；;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      let target = payload;
      let content = seg;
      if (seg.includes('平台')) {
        target = platform;
        content = seg.split(/[:：]/)[1] ?? '';
      } else if (seg.includes('载荷')) {
        target = payload;
        content = seg.split(/[:：]/)[1] ?? '';
      } else if (seg.includes(':') || seg.includes('：')) {
        // 其他前缀，跳过
        continue;
      }
      const ranges = this.parseFileNumbers(content || seg);
      target.push(...ranges);
    }

    return { payload, platform };
  }

  private parseDeleteWithType(text: string | null | undefined): { payload: Array<{ start: number; end: number }>; platform: Array<{ start: number; end: number }> } {
    const payload: Array<{ start: number; end: number }> = [];
    const platform: Array<{ start: number; end: number }> = [];
    if (!text) return { payload, platform };

    const segments = String(text)
      .split(/[，,；;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const seg of segments) {
      let target = payload;
      let content = seg;
      if (seg.includes('平台')) {
        target = platform;
        content = seg.split(/[:：]/)[1] ?? '';
      } else if (seg.includes('载荷')) {
        target = payload;
        content = seg.split(/[:：]/)[1] ?? '';
      } else if (seg.includes(':') || seg.includes('：')) {
        continue;
      }
      const ranges = this.parseFileNumbers(content || seg);
      target.push(...ranges);
    }

    return { payload, platform };
  }
}
