import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAs03Entity } from '../entity/as03';
import { defaultSnowflake } from '../utils/snowflake';

/**
 * AS03信息
 */
@Provide()
export class TaskAs03Service extends BaseService {
  @InjectEntityModel(TaskAs03Entity)
  taskAs03Entity: Repository<TaskAs03Entity>;

  nextUid(): string {
    return defaultSnowflake.nextId();
  }

  async createFromForecast(tasks: ForecastTaskPayload[]): Promise<TaskAs03Entity[]> {
    const list = Array.isArray(tasks) ? tasks : [];
    if (!list.length) return [];

    const entities = list.map((item) => {
      const entity = new TaskAs03Entity();
      entity.satelliteCode = String(item.satelliteCode ?? 'AS03');
      entity.imagingTarget = String(item.imagingTarget ?? '');
      entity.longitude = parseDecimal(item.longitude);
      entity.latitude = parseDecimal(item.latitude);
      entity.cloudCoverage = parseDecimal(item.cloudCoverage);
      entity.sunElevation = parseDecimal(item.sunElevation);
      entity.ephemerisTime = parseRequiredDate(item.ephemerisTime);
      entity.imagingTime = parseRequiredDate(item.imagingTime);
      entity.transferName = String(item.transferName ?? '');
      entity.transferTime = parseOptionalDate(item.transferTime);
      entity.imagingUID = String(item.imagingUID ?? defaultSnowflake.nextId());
      entity.transferUID = String(item.transferUID ?? '');
      entity.status = Number.isFinite(Number(item.status)) ? Number(item.status) : 0;
      entity.thumbnailUrl = item.thumbnailUrl ?? '';
      return entity;
    });

    return this.taskAs03Entity.save(entities);
  }
}

type ForecastTaskPayload = {
  satelliteCode?: string;
  imagingTarget?: string;
  longitude?: number | string;
  latitude?: number | string;
  cloudCoverage?: number | string;
  sunElevation?: number | string;
  ephemerisTime?: string;
  imagingTime?: string;
  transferName?: string;
  transferTime?: string;
  imagingUID?: string;
  transferUID?: string;
  thumbnailUrl?: string;
  status?: number;
};

function parseDecimal(val: unknown): number {
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function parseRequiredDate(val: unknown): Date {
  if (!val) return new Date();
  const date = new Date(val as any);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parseOptionalDate(val: unknown): Date | null {
  if (!val) return null;
  const date = new Date(val as any);
  return Number.isNaN(date.getTime()) ? null : date;
}
