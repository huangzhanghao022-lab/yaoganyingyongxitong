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
      const records = normalizeTransferRecords(item.transferRecords, entity.transferName, entity.transferTime, entity.transferUID);
      entity.transferRecords = records;
      entity.status = Number.isFinite(Number(item.status)) ? Number(item.status) : 0;
      entity.thumbnailUrl = item.thumbnailUrl ?? '';
      entity.orbitElements = serializeOrbitElements(item.orbitElements);
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
  transferRecords?: Array<{ name?: string; time?: string; uid?: string }>;
  thumbnailUrl?: string;
  status?: number;
  orbitElements?: Record<string, any> | string | null;
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

function serializeOrbitElements(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    return val.trim() ? val : null;
  }
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

function normalizeTransferRecords(
  records: unknown,
  transferName: string,
  transferTime: Date | null,
  transferUid: string
): Array<{ name?: string; time?: string; uid?: string }> {
  const arr: Array<{ name?: string; time?: string; uid?: string }> = Array.isArray(records) ? records as any[] : [];
  const result = arr
    .map((r) => ({
      name: r?.name ? String(r.name) : undefined,
      time: r?.time ? String(r.time) : undefined,
      uid: r?.uid ? String(r.uid) : undefined,
    }))
    .filter((r) => r.name || r.time || r.uid);

  if (transferName || transferTime || transferUid) {
    const hasSame =
      result.find(
        (r) =>
          (transferUid && r.uid === String(transferUid)) ||
          (transferTime && r.time === String(transferTime)) ||
          (transferName && r.name === String(transferName))
      ) != null;
    if (!hasSame) {
      result.push({
        name: transferName || undefined,
        time: transferTime ? transferTime.toISOString() : undefined,
        uid: transferUid || undefined,
      });
    }
  }
  return result;
}
