import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogImagingAs02Entity } from '../../task_log/entity/imaging_as02';
import { TaskLogImagingAs03Entity } from '../../task_log/entity/imaging_as03';
import { TaskLogTransmitAs02Entity } from '../../task_log/entity/transmit_as02';
import { TaskLogTransmitAs03Entity } from '../../task_log/entity/transmit_as03';
import { TaskLogDeleteAs02Entity } from '../../task_log/entity/delete_as02';
import { TaskLogDeleteAs03Entity } from '../../task_log/entity/delete_as03';

type TaskType = 'image' | 'transfer' | 'delete';
type Sat = 'AS02' | 'AS03';

type CheckInput = {
  satellite: Sat;
  type: TaskType;
  time: Date;
};

type ConflictResult = {
  message: string;
  withType: TaskType;
  withTime: Date;
};

@Provide()
@Scope(ScopeEnum.Singleton)
export class TaskConflictService {
  @InjectEntityModel(TaskLogImagingAs02Entity)
  imagingAs02Repo: Repository<TaskLogImagingAs02Entity>;

  @InjectEntityModel(TaskLogImagingAs03Entity)
  imagingAs03Repo: Repository<TaskLogImagingAs03Entity>;

  @InjectEntityModel(TaskLogTransmitAs02Entity)
  transferAs02Repo: Repository<TaskLogTransmitAs02Entity>;

  @InjectEntityModel(TaskLogTransmitAs03Entity)
  transferAs03Repo: Repository<TaskLogTransmitAs03Entity>;

  @InjectEntityModel(TaskLogDeleteAs02Entity)
  deleteAs02Repo: Repository<TaskLogDeleteAs02Entity>;

  @InjectEntityModel(TaskLogDeleteAs03Entity)
  deleteAs03Repo: Repository<TaskLogDeleteAs03Entity>;

  private readonly intervalMatrix: Record<Sat, Record<TaskType, Record<TaskType, number>>> = {
    AS02: {
      image: { image: 95, transfer: 80, delete: 30 },
      transfer: { image: 80, transfer: 15, delete: 30 },
      delete: { image: 30, transfer: 30, delete: 30 },
    },
    AS03: {
      image: { image: 180, transfer: 180, delete: 30 },
      transfer: { image: 180, transfer: 180, delete: 30 },
      delete: { image: 30, transfer: 30, delete: 30 },
    },
  };

  private readonly typeLabel: Record<TaskType, string> = {
    image: '成像任务',
    transfer: '数传任务',
    delete: '固存删除任务',
  };

  async check(input: CheckInput): Promise<ConflictResult | null> {
    const { satellite, type, time } = input;
    if (!satellite || !type || !time) return null;
    const interval = this.intervalMatrix[satellite]?.[type];
    if (!interval) return null;

    const candidates = await this.fetchTasks(satellite);
    const tMs = time.getTime();

    for (const c of candidates) {
      const gapMin = interval[c.type];
      if (!gapMin) continue;
      const diff = Math.abs(tMs - c.time.getTime());
      // 同时刻（<1s）视为同一批次（如 AS03 成像多指令），不算冲突
      if (diff < 1000) continue;
      if (diff < gapMin * 60 * 1000) {
        const withLabel = this.typeLabel[c.type] || c.type;
        return {
          message: `${withLabel}(${c.time.toISOString()}) 冲突，需间隔 ≥ ${gapMin} 分钟`,
          withType: c.type,
          withTime: c.time,
        };
      }
    }
    return null;
  }

  private async fetchTasks(sat: Sat): Promise<Array<{ type: TaskType; time: Date }>> {
    const list: Array<{ type: TaskType; time: Date }> = [];
    const notCancelled = (status?: number) => status === undefined || status === null || status !== 4;

    if (sat === 'AS02') {
      const imgs = await this.imagingAs02Repo.find({ where: { satelliteCode: sat } });
      imgs.forEach((r) => {
        if (r?.imagingTime && notCancelled(r.status)) list.push({ type: 'image', time: new Date(r.imagingTime) });
      });
      const trs = await this.transferAs02Repo.find({ where: { satelliteCode: sat } });
      trs.forEach((r) => {
        if (r?.transmitTime && notCancelled(r.status)) list.push({ type: 'transfer', time: new Date(r.transmitTime) });
      });
      const dels = await this.deleteAs02Repo.find({ where: { satelliteCode: sat } });
      dels.forEach((r) => {
        if (r?.taskExecutionTime && notCancelled(r.status)) list.push({ type: 'delete', time: new Date(r.taskExecutionTime) });
      });
    } else {
      const imgs = await this.imagingAs03Repo.find({ where: { satelliteCode: sat } });
      imgs.forEach((r) => {
        if (r?.imagingTime && notCancelled(r.status)) list.push({ type: 'image', time: new Date(r.imagingTime) });
      });
      const trs = await this.transferAs03Repo.find({ where: { satelliteCode: sat } });
      trs.forEach((r) => {
        if (r?.transmitTime && notCancelled(r.status)) list.push({ type: 'transfer', time: new Date(r.transmitTime) });
      });
      const dels = await this.deleteAs03Repo.find({ where: { satelliteCode: sat } });
      dels.forEach((r) => {
        if (r?.taskExecutionTime && notCancelled(r.status)) list.push({ type: 'delete', time: new Date(r.taskExecutionTime) });
      });
    }
    return list;
  }
}
