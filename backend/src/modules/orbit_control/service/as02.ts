import { Inject, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import * as xlsx from 'node-xlsx';
import { CommandValidateService } from '../../task/service/commandValidate';
import { v4 as uuidv4 } from 'uuid';

type OrbitRow = {
  rowNo: number;
  start: number;
  end: number;
  duration: number;
};

@Provide()
export class OrbitControlAs02Service extends BaseService {
  private readonly templateId = '673c2d9049b1f446adc4623d';
  private readonly folderId = '6731752608e123893cf92873';

  @Inject()
  commandValidateService: CommandValidateService;

  parseExcelBuffer(buffer: Buffer) {
    const sheets = xlsx.parse(buffer);
    if (!sheets?.length) {
      throw new Error('Excel为空或无法解析');
    }
    const data = Array.isArray(sheets[0]?.data) ? sheets[0].data : [];
    if (!data.length) {
      throw new Error('Excel首个sheet无数据');
    }

    const headerRow = (data[0] || []).map((v: any) => String(v ?? '').trim());
    const startIdx = headerRow.findIndex((h: string) => h === '轨控起始时间');
    const endIdx = headerRow.findIndex((h: string) => h === '轨控结束时间');
    const durationIdx = headerRow.findIndex((h: string) => h === '轨控持续时间');
    if (startIdx < 0 || endIdx < 0) {
      throw new Error('Excel缺少列：轨控起始时间/轨控结束时间');
    }

    const rows: OrbitRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = Array.isArray(data[i]) ? data[i] : [];
      const rawStart = row[startIdx];
      const rawEnd = row[endIdx];
      if ((rawStart == null || rawStart === '') && (rawEnd == null || rawEnd === '')) continue;

      const start = this.toInt(rawStart);
      const end = this.toInt(rawEnd);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error(`第${i + 1}行轨控开始/结束时间格式错误，需为秒级时间戳`);
      }
      if (end <= start) {
        throw new Error(`第${i + 1}行轨控结束时间必须大于开始时间`);
      }
      const duration = Number.isFinite(this.toInt(row[durationIdx]))
        ? Number(this.toInt(row[durationIdx]))
        : end - start;
      rows.push({ rowNo: i + 1, start, end, duration });
    }

    if (!rows.length) {
      throw new Error('未解析到有效轨控记录');
    }

    return {
      rows,
      summary: {
        count: rows.length,
        minStart: rows[0].start,
        maxEnd: rows[rows.length - 1].end,
      },
    };
  }

  async previewExcel(buffer: Buffer) {
    const parsed = this.parseExcelBuffer(buffer);
    return {
      ...parsed.summary,
      rows: parsed.rows.slice(0, 200),
    };
  }

  async submitExcel(buffer: Buffer, options?: { name?: string; sourceFileName?: string }) {
    const parsed = this.parseExcelBuffer(buffer);
    const batchId = uuidv4();
    const sourceFileName = options?.sourceFileName || '';
    const customTaskName = (options?.name || '').trim();
    const results: Array<{ rowNo: number; start: number; end: number; ok: boolean; commandChainId?: string }> = [];

    for (const row of parsed.rows) {
      const body: any = {
        type: 'orbit_control',
        satellite: 'AS02',
        taskTime: new Date(row.start * 1000).toISOString(),
        params: {
          spacecraftCode: 'AS02',
          templateId: this.templateId,
          folderId: this.folderId,
          name: customTaskName || this.buildDefaultTaskName(row.start),
          start: String(row.start),
          end: String(row.end),
          taskLogMeta: {
            orbitControl: {
              orbitStartTime: row.start,
              orbitEndTime: row.end,
              durationSeconds: row.duration,
              sourceFileName,
              batchId,
            },
          },
        },
      };
      const submitRes = await this.commandValidateService.submit(body);
      if (!submitRes?.ok) {
        const msg = (submitRes as any)?.errors?.[0]?.message || '轨控任务提交失败';
        return {
          ok: false,
          batchId,
          successCount: results.length,
          failedRowNo: row.rowNo,
          failedAt: { start: row.start, end: row.end },
          error: msg,
          results,
        };
      }
      results.push({
        rowNo: row.rowNo,
        start: row.start,
        end: row.end,
        ok: true,
        commandChainId: submitRes.commandChainId,
      });
    }

    return {
      ok: true,
      batchId,
      successCount: results.length,
      totalCount: parsed.rows.length,
      results,
    };
  }

  private toInt(v: any): number {
    if (v == null || v === '') return NaN;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }

  private buildDefaultTaskName(startSeconds: number): string {
    const d = new Date(Number(startSeconds) * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const text = [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate()),
    ].join('-') + `-${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `轨控序列${text}`;
  }
}
