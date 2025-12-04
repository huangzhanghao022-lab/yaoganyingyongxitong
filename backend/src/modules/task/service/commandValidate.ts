import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { as02payloadtableEntity } from '../../star/entity/as02_payload_table/as02_payload_table';

type ValidationResult = { ok: true } | { ok: false; errors: Array<{ field: string; message: string }> };

type CommandType = 'image' | 'transfer' | 'delete';
type Sat = 'AS02' | 'AS03';

@Provide()
export class CommandValidateService {
  @InjectEntityModel(as02payloadtableEntity)
  as02PayloadRepo: Repository<as02payloadtableEntity>;

  async validate(body: any): Promise<ValidationResult> {
    const errors: Array<{ field: string; message: string }> = [];
    const type: CommandType = body?.type;
    const satellite: Sat = body?.satellite;
    const params = body?.params || {};

    if (!type || !['image', 'transfer', 'delete'].includes(type)) {
      errors.push({ field: 'type', message: 'type 必须为 image/transfer/delete' });
    }
    if (!satellite || !['AS02', 'AS03'].includes(satellite)) {
      errors.push({ field: 'satellite', message: 'satellite 必须为 AS02 或 AS03' });
    }
    if (errors.length) return { ok: false, errors };

    switch (type) {
      case 'image':
        await this.validateImage(satellite, params, errors);
        break;
      case 'transfer':
        this.validateTransfer(satellite, params, errors);
        break;
      case 'delete':
        this.validateDelete(satellite, params, errors);
        break;
    }

    return errors.length ? { ok: false, errors } : { ok: true };
  }

  private async validateImage(sat: Sat, p: any, errors: Array<{ field: string; message: string }>) {
    const now = Date.now();
    const start = this.parseDate(p.startAt || p.t0);
    const end = this.parseDate(p.endAt || p.tf);

    if (sat === 'AS02') {
      this.ensureEnum(p.scanMode, ['0x02', '0x01'], 'scanMode', errors);
      this.ensureAngle(p.rollAng, 'rollAng', errors);
      this.ensureEnum(p.solarAng, ['0x1111', '0x2222', '0x3333', '0x4444', '0x5555'], 'solarAng', errors);
      this.ensureFuture(start, now, 'startAt', errors);
      if (start && end) {
        if (end <= start) errors.push({ field: 'endAt', message: 'endAt 必须晚于 startAt' });
        const isDirect = String(p.scanMode) === '0x02'; // 直通
        const expectedDuration = isDirect ? 40000 : 30000;
        if (Math.abs(end - start - expectedDuration) > 1500) {
          errors.push({ field: 'endAt', message: `endAt 必须等于 startAt + ${expectedDuration / 1000} 秒` });
        }
      } else if (!end) {
        errors.push({ field: 'endAt', message: 'endAt 不能为空' });
      }
      this.ensureFileStart(p.fileStart, 'fileStart', errors);
      await this.ensureAs02SlotEmpty(p.fileStart, errors);
    } else {
      // AS03 三条模板拆开发送：第一条需 reset_seq，其他可不传；共通 start_seq 必填
      const tplId = String(p.templateId || p.template_id || '');
      const isFirst = tplId.includes('673c2d9049b1f446adc4623c');
      const isSecond = tplId.includes('673c2d8f49b1f446adc46230');
      const isThird = tplId.includes('673c2d9049b1f446adc4623f');

      if (isFirst) {
        this.ensureBoolean(p.reset_seq, 'reset_seq', errors);
      }
      this.ensureIntRange(p.start_seq, 3, Infinity, 'start_seq', errors);

      // t0/tf 仅在提供时校验未来时间，且若同时存在要求 tf>t0
      if (start !== null) {
        this.ensureFuture(start, now, 't0', errors);
      }
      if (end !== null) {
        this.ensureFuture(end, now, 'tf', errors);
      }
      if (start && end && end <= start) errors.push({ field: 'tf', message: 'tf 必须晚于 t0' });

      if (isThird) {
        // 第三条模板必须提供侧摆角
        this.ensureAngle(p.side_swipe_angle, 'side_swipe_angle', errors);
      } else if (p.side_swipe_angle != null && p.side_swipe_angle !== '') {
        this.ensureAngle(p.side_swipe_angle, 'side_swipe_angle', errors);
      }
    }
  }

  private validateTransfer(sat: Sat, p: any, errors: Array<{ field: string; message: string }>) {
    const now = Date.now();
    const t0 = this.parseDate(p.t0);
    const durationLimit = 400;

    this.ensureIntRange(p.start_seq, 3, Infinity, 'start_seq', errors);
    this.ensureBoolean(p.reset_seq, 'reset_seq', errors);
    this.ensureFuture(t0, now, 't0', errors);
    this.ensureIntRange(p.duration, 0, durationLimit, 'duration', errors, true);
    this.ensureNumber(p.long, 'long', errors);
    this.ensureNumber(p.lat, 'lat', errors);
    this.ensureNumber(p.alt, 'alt', errors);

    if (sat === 'AS02') {
      // trans_type0-8, trans_time1-9
      for (let i = 0; i <= 8; i++) {
        const key = i === 0 ? 'trans_type' : `trans_type${i}`;
        if (p[key] !== undefined && !['0', '1', 0, 1, ''].includes(p[key])) {
          errors.push({ field: key, message: `${key} 仅可为 0 或 1` });
        }
      }
      for (let i = 1; i <= 9; i++) {
        const key = `trans_time${i}`;
        if (p[key] !== undefined && p[key] !== '') this.ensureInt(p[key], key, errors);
      }
    } else {
      this.ensureIntRange(p.trans_count, 0, 6, 'trans_count', errors, true);
      for (let i = 1; i <= 6; i++) {
        const sk = `start_file${i}`;
        const ek = `end_file${i}`;
        const mk = `module${i}`;
        const tk = `trans_time${i}`;
        const sVal = p[sk];
        const eVal = p[ek];
        const mVal = p[mk];
        const tVal = p[tk];
        const filled = sVal !== undefined && sVal !== '' && eVal !== undefined && eVal !== '';
        if (sVal !== undefined && sVal !== '') this.ensureIntRange(sVal, 0, 127, sk, errors, true);
        if (eVal !== undefined && eVal !== '') {
          this.ensureIntRange(eVal, 0, 127, ek, errors, true);
          if (this.isInt(sVal) && this.isInt(eVal) && Number(eVal) <= Number(sVal)) {
            errors.push({ field: ek, message: `${ek} 必须大于 ${sk}` });
          }
        }
        if (filled && mVal === undefined) {
          errors.push({ field: mk, message: `${mk} 不能为空` });
        } else if (mVal !== undefined && mVal !== '') {
          this.ensureIntEnum(mVal, [0, 1], mk, errors);
        }
        if (filled && tVal === undefined) {
          errors.push({ field: tk, message: `${tk} 不能为空` });
        } else if (tVal !== undefined && tVal !== '') {
          this.ensureInt(tVal, tk, errors);
        }
      }
    }
  }

  private validateDelete(sat: Sat, p: any, errors: Array<{ field: string; message: string }>) {
    const now = Date.now();
    const startTime = this.parseDate(p.start_time || p.t0);
    this.ensureFuture(startTime, now, 'start_time', errors);
    this.ensureIntRange(p.start_seq, 3, sat === 'AS02' ? 400 : Infinity, 'start_seq', errors);

    if (sat === 'AS02') {
      this.ensureFileStart(p.start_file, 'start_file', errors);
      this.ensureEndFileAS02(p.end_file, p.start_file, 'end_file', errors);
    } else {
      this.ensureIntRange(p.start_file, 0, 127, 'start_file', errors, true);
      this.ensureIntRange(p.end_file, 0, 127, 'end_file', errors, true);
      if (this.isInt(p.start_file) && this.isInt(p.end_file) && Number(p.end_file) <= Number(p.start_file)) {
        errors.push({ field: 'end_file', message: 'end_file 必须大于 start_file' });
      }
      this.ensureIntEnum(p.module, [0, 1], 'module', errors);
    }
  }

  // Helpers
  private parseDate(val: any): number | null {
    if (val == null || val === '') return null;
    const d = new Date(val);
    const ts = d.getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  private ensureFuture(ts: number | null, now: number, field: string, errors: Array<{ field: string; message: string }>) {
    if (ts == null) {
      errors.push({ field, message: `${field} 不能为空或非法时间` });
      return;
    }
    if (ts < now) {
      errors.push({ field, message: `${field} 不能早于当前时间` });
    }
  }

  private ensureEnum(val: any, list: Array<string>, field: string, errors: Array<{ field: string; message: string }>) {
    if (val == null || val === '') {
      errors.push({ field, message: `${field} 不能为空` });
      return;
    }
    if (!list.includes(String(val))) {
      errors.push({ field, message: `${field} 仅可为 ${list.join('/')}` });
    }
  }

  private ensureAngle(val: any, field: string, errors: Array<{ field: string; message: string }>) {
    if (val == null || val === '') {
      errors.push({ field, message: `${field} 不能为空` });
      return;
    }
    const num = Number(val);
    if (!Number.isFinite(num)) {
      errors.push({ field, message: `${field} 必须为数值` });
      return;
    }
    if (Math.abs(num) > 40) {
      errors.push({ field, message: `${field} 绝对值不能超过 40` });
    }
  }

  private ensureFileStart(val: any, field: string, errors: Array<{ field: string; message: string }>) {
    const num = Number(val);
    if (!Number.isInteger(num)) {
      errors.push({ field, message: `${field} 必须为整数` });
      return;
    }
    if (num < 1) {
      errors.push({ field, message: `${field} 必须大于 0` });
      return;
    }
    if ((num - 1) % 8 !== 0) {
      errors.push({ field, message: `${field} 必须满足 8*n+1` });
      return;
    }
    const n = (num - 1) / 8;
    if (n < 0 || n > 30) {
      errors.push({ field, message: `${field} 需要 0≤n≤30` });
    }
  }

  private ensureEndFileAS02(val: any, start: any, field: string, errors: Array<{ field: string; message: string }>) {
    const end = Number(val);
    const startNum = Number(start);
    if (!Number.isInteger(end)) {
      errors.push({ field, message: `${field} 必须为整数` });
      return;
    }
    if (!Number.isInteger(startNum)) {
      errors.push({ field: 'start_file', message: 'start_file 必须为整数' });
      return;
    }
    if (end <= startNum) {
      errors.push({ field, message: `${field} 必须大于 start_file` });
      return;
    }
    if (end % 8 !== 0) {
      errors.push({ field, message: `${field} 必须满足 8*n` });
      return;
    }
    const n = end / 8;
    if (n < 1 || n > 31) {
      errors.push({ field, message: `${field} 需要 1≤n≤31` });
    }
  }

  private ensureInt(val: any, field: string, errors: Array<{ field: string; message: string }>) {
    if (this.containsAlpha(val)) {
      errors.push({ field, message: `${field} 不可包含字母` });
      return;
    }
    const num = Number(val);
    if (!Number.isInteger(num)) {
      errors.push({ field, message: `${field} 必须为整数` });
    }
  }

  private ensureIntRange(val: any, min: number, max: number, field: string, errors: Array<{ field: string; message: string }>, allowEmpty = false) {
    if ((val === undefined || val === '' || val === null) && allowEmpty) return;
    if (this.containsAlpha(val)) {
      errors.push({ field, message: `${field} 不可包含字母` });
      return;
    }
    const num = Number(val);
    if (!Number.isInteger(num)) {
      errors.push({ field, message: `${field} 必须为整数` });
      return;
    }
    if (num < min || num > max) {
      errors.push({ field, message: `${field} 必须在 ${min}~${max} 之间` });
    }
  }

  private ensureIntEnum(val: any, enums: Array<number>, field: string, errors: Array<{ field: string; message: string }>) {
    const num = Number(val);
    if (!Number.isInteger(num) || !enums.includes(num)) {
      errors.push({ field, message: `${field} 必须为 ${enums.join('/')} 的整数` });
    }
  }

  private ensureBoolean(val: any, field: string, errors: Array<{ field: string; message: string }>) {
    if (val === true || val === false) return;
    if (String(val) === 'true' || String(val) === 'false') return;
    errors.push({ field, message: `${field} 必须为布尔值` });
  }

  private async ensureAs02SlotEmpty(val: any, errors: Array<{ field: string; message: string }>) {
    const num = Number(val);
    if (!Number.isInteger(num)) return; // 已由 ensureFileStart 处理类型
    if (!this.as02PayloadRepo) return;
    try {
      const exist = await this.as02PayloadRepo.findOne({
        where: { name: 0 as any, startFileNo: num },
      });
      if (exist && typeof exist.status === 'number' && exist.status !== 0) {
        errors.push({ field: 'fileStart', message: `起始文件号 ${num} 已被占用，状态：${exist.status}` });
      }
    } catch (err) {
      // 避免校验因数据库异常阻塞，记录一个通用错误
      errors.push({ field: 'fileStart', message: '固存占用校验失败' });
    }
  }

  private isInt(val: any): boolean {
    return Number.isInteger(Number(val));
  }

  private containsAlpha(val: any): boolean {
    return typeof val === 'string' && /[A-Za-z]/.test(val);
  }

  private ensureNumber(val: any, field: string, errors: Array<{ field: string; message: string }>) {
    if (this.containsAlpha(val)) {
      errors.push({ field, message: `${field} 不可包含字母` });
      return;
    }
    const num = Number(val);
    if (!Number.isFinite(num)) {
      errors.push({ field, message: `${field} 必须为数值` });
    }
  }
}
