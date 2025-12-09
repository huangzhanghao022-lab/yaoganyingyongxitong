import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, Between } from 'typeorm';
import { as02payloadtableEntity } from '../../star/entity/as02_payload_table/as02_payload_table';
import { TaskLogImagingAs02Entity } from '../../task_log/entity/imaging_as02';
import { TaskLogImagingAs03Entity } from '../../task_log/entity/imaging_as03';
import { TaskLogTransmitAs02Entity } from '../../task_log/entity/transmit_as02';
import { TaskLogTransmitAs03Entity } from '../../task_log/entity/transmit_as03';
import { TaskLogDeleteAs02Entity } from '../../task_log/entity/delete_as02';
import { TaskLogDeleteAs03Entity } from '../../task_log/entity/delete_as03';
import { TaskConflictService } from './taskConflict';

type ValidationResult = { ok: true } | { ok: false; errors: Array<{ field: string; message: string }> };

type CommandType = 'image' | 'transfer' | 'delete';
type Sat = 'AS02' | 'AS03';

@Provide()
export class CommandValidateService {
  @InjectEntityModel(as02payloadtableEntity)
  as02PayloadRepo: Repository<as02payloadtableEntity>;

  @Inject()
  taskConflictService: TaskConflictService;

  @InjectEntityModel(TaskLogImagingAs02Entity)
  imagingLogAs02Repo: Repository<TaskLogImagingAs02Entity>;

  @InjectEntityModel(TaskLogImagingAs03Entity)
  imagingLogAs03Repo: Repository<TaskLogImagingAs03Entity>;

  @InjectEntityModel(TaskLogTransmitAs02Entity)
  transferLogAs02Repo: Repository<TaskLogTransmitAs02Entity>;

  @InjectEntityModel(TaskLogTransmitAs03Entity)
  transferLogAs03Repo: Repository<TaskLogTransmitAs03Entity>;

  @InjectEntityModel(TaskLogDeleteAs02Entity)
  deleteLogAs02Repo: Repository<TaskLogDeleteAs02Entity>;

  @InjectEntityModel(TaskLogDeleteAs03Entity)
  deleteLogAs03Repo: Repository<TaskLogDeleteAs03Entity>;

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

    if (errors.length) return { ok: false, errors };

    // 时间解析失败则认为参数缺失
    const taskTime = this.extractCommandTime(type, params);
    if (!taskTime) {
      errors.push({ field: 'time', message: '缺少任务时间，无法进行冲突校验' });
      return { ok: false, errors };
    }

    // AS03 成像多条指令：
    // - 首条（带 reset_seq）参与冲突校验+写库
    // - 后两条（无 reset_seq）：仅当首条已写入（同批次已有记录）才放行；否则视为首条未通过，直接阻断
    const hasResetFlag = params?.reset_seq !== undefined;
    if (type === 'image' && satellite === 'AS03' && !hasResetFlag) {
      // AS03 三条链存在 30s 左右的时间差，放宽首条判定窗口至 5 分钟
      const exist = await this.findExistingLog(this.imagingLogAs03Repo, 'imagingTime', satellite, taskTime, 5 * 60 * 1000);
      if (!exist) {
        return {
          ok: false,
          errors: [{ field: 'conflict', message: '首条成像指令未通过，后续链已取消' }],
        };
      }
      console.log('[command-validate] AS03 image non-reset, first exists, skip conflict/log', taskTime.toISOString());
      return { ok: true };
    }

    // 冲突校验
    const conflict = await this.taskConflictService.check({
      satellite,
      type,
      time: taskTime,
    });
    if (conflict) {
      if (process.env.NODE_ENV !== 'production' && satellite === 'AS03' && type === 'image' && hasResetFlag) {
        console.log('[command-validate] AS03 image first-chain conflict', {
          taskTime: taskTime.toISOString(),
          message: conflict.message,
        });
      }
      errors.push({
        field: 'conflict',
        message: conflict.message,
      });
      return { ok: false, errors };
    }

    // 通过后写入对应任务记录表（不阻断请求）
    try {
      await this.saveTaskLog(satellite, type, params, taskTime, body?.commandChainId);
    } catch (err) {
      // 写库失败不阻断指令校验，但记录提示
      errors.push({ field: 'log', message: '任务记录写入失败' });
      return { ok: false, errors };
    }

    return { ok: true };
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
  /** 提取命令的主要时间字段，用于冲突校验与记录 */
  private extractCommandTime(type: CommandType, params: any): Date | null {
    const keys = ['startAt', 't0', 'start_time', 'startTime', 'transmitTime', 'taskExecutionTime', 'imagingTime'];
    for (const k of keys) {
      if (params?.[k]) {
        const d = new Date(params[k]);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }
    if (type === 'image' && params?.tf) {
      const d = new Date(params.tf);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }

  /** 成功校验后写入任务记录表（不同类型/星分流） */
  private async saveTaskLog(sat: Sat, type: CommandType, params: any, time: Date, commandChainId?: any) {
    switch (type) {
      case 'image':
        if (sat === 'AS02') {
          const exist = await this.findExistingLog(this.imagingLogAs02Repo, 'imagingTime', sat, time);
          if (exist) return;
          const entity = new TaskLogImagingAs02Entity();
          entity.satelliteCode = sat;
          entity.imagingTargetName = this.stripTimeSuffix(
            this.pickString(params, ['imagingTargetName', 'targetName', 'name'], '') || ''
          );
          entity.imagingTime = time;
          entity.cloudCoverage = this.pickNumber(params, ['cloudCoverage', 'cloud']);
          entity.sideSwingAngle = this.pickNumber(params, ['rollAng', 'side_swipe_angle', 'sideSwipeAngle']);
          entity.targetLongitude = this.pickNumber(params, ['longitude', 'long', 'lng']);
          entity.targetLatitude = this.pickNumber(params, ['latitude', 'lat']);
          entity.commandChainId = commandChainId ? String(commandChainId) : this.pickString(params, ['commandChainId']);
          entity.status = 0;
          await this.imagingLogAs02Repo.save(entity);
        } else {
          const hasReset = params?.reset_seq !== undefined;
          if (!hasReset) return; // 非首链不写记录
          const exist = await this.findExistingLog(this.imagingLogAs03Repo, 'imagingTime', sat, time);
          if (exist) return; // 已写过首链
          const entity = new TaskLogImagingAs03Entity();
          entity.satelliteCode = sat;
          entity.imagingTargetName = this.stripTimeSuffix(
            this.pickString(params, ['imagingTargetName', 'targetName', 'name'], '') || ''
          );
          entity.imagingTime = time;
          entity.cloudCoverage = this.pickNumber(params, ['cloudCoverage', 'cloud']);
          entity.sideSwingAngle = this.pickNumber(params, ['side_swipe_angle', 'sideSwipeAngle', 'rollAng']);
          entity.targetLongitude = this.pickNumber(params, ['longitude', 'long', 'lng']);
          entity.targetLatitude = this.pickNumber(params, ['latitude', 'lat']);
          entity.commandChainId = commandChainId ? String(commandChainId) : this.pickString(params, ['commandChainId']);
          entity.status = 0;
          await this.imagingLogAs03Repo.save(entity);
        }
        break;
      case 'transfer':
        if (sat === 'AS02') {
          const exist = await this.findExistingLog(this.transferLogAs02Repo, 'transmitTime', sat, time);
          if (exist) return;
          const entity = new TaskLogTransmitAs02Entity();
          entity.satelliteCode = sat;
          entity.transmitStationName = this.stripTimeSuffix(
            this.pickString(params, ['station', 'stationName', 'transferName', 'name'], '') || ''
          );
          entity.transmitTime = time;
          entity.transmitStationLongitude = this.pickNumber(params, ['long', 'longitude', 'transmitStationLongitude']);
          entity.transmitStationLatitude = this.pickNumber(params, ['lat', 'latitude', 'transmitStationLatitude']);
          entity.transmitStationHeight = this.pickNumber(params, ['alt', 'height', 'transmitStationHeight']);
          entity.transmitFileNumber = this.buildFileNumber(params);
          entity.transmitExecutionTime = params?.duration ? new Date(time.getTime() + Number(params.duration) * 1000) : null;
          entity.commandChainId = commandChainId ? String(commandChainId) : this.pickString(params, ['commandChainId']);
          entity.status = 0;
          await this.transferLogAs02Repo.save(entity);
        } else {
          const exist = await this.findExistingLog(this.transferLogAs03Repo, 'transmitTime', sat, time);
          if (exist) return;
          const entity = new TaskLogTransmitAs03Entity();
          entity.satelliteCode = sat;
          entity.transmitStationName = this.stripTimeSuffix(
            this.pickString(params, ['station', 'stationName', 'transferName', 'name'], '') || ''
          );
          entity.transmitTime = time;
          entity.transmitStationLongitude = this.pickNumber(params, ['long', 'longitude', 'transmitStationLongitude']);
          entity.transmitStationLatitude = this.pickNumber(params, ['lat', 'latitude', 'transmitStationLatitude']);
          entity.transmitStationHeight = this.pickNumber(params, ['alt', 'height', 'transmitStationHeight']);
          entity.transmitFileNumber = this.buildFileNumber(params);
          entity.transmitExecutionTime = params?.duration ? new Date(time.getTime() + Number(params.duration) * 1000) : null;
          entity.commandChainId = commandChainId ? String(commandChainId) : this.pickString(params, ['commandChainId']);
          entity.status = 0;
          await this.transferLogAs03Repo.save(entity);
        }
        break;
      case 'delete':
        if (sat === 'AS02') {
          const exist = await this.findExistingLog(this.deleteLogAs02Repo, 'taskExecutionTime', sat, time);
          if (exist) return;
          const entity = new TaskLogDeleteAs02Entity();
          entity.satelliteCode = sat;
          entity.taskExecutionTime = time;
          entity.deleteFileNumber = this.buildDeleteRange(params);
          entity.deleteCommandChainId = commandChainId ? String(commandChainId) : this.pickString(params, ['commandChainId', 'deleteCommandChainId']);
          entity.status = 0;
          await this.deleteLogAs02Repo.save(entity);
        } else {
          const exist = await this.findExistingLog(this.deleteLogAs03Repo, 'taskExecutionTime', sat, time);
          if (exist) return;
          const entity = new TaskLogDeleteAs03Entity();
          entity.satelliteCode = sat;
          entity.taskExecutionTime = time;
          entity.deleteFileNumber = this.buildDeleteRange(params);
          entity.deleteCommandChainId = commandChainId ? String(commandChainId) : this.pickString(params, ['commandChainId', 'deleteCommandChainId']);
          entity.status = 0;
          await this.deleteLogAs03Repo.save(entity);
        }
        break;
    }
  }

  private pickString(obj: any, keys: string[], fallback?: string): string | undefined {
    for (const k of keys) {
      if (obj && obj[k] != null && obj[k] !== '') return String(obj[k]);
    }
    return fallback;
  }

  private pickNumber(obj: any, keys: string[]): number | undefined {
    for (const k of keys) {
      const v = obj?.[k];
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  }

  private buildFileNumber(p: any): string {
    const parts: string[] = [];
    if (p?.start_file != null && p?.end_file != null) {
      parts.push(`${p.start_file}-${p.end_file}`);
    }
    if (p?.startFileNo != null && p?.endFileNo != null) {
      parts.push(`${p.startFileNo}-${p.endFileNo}`);
    }
    if (Array.isArray(p?.files)) {
      parts.push(...p.files.map((x: any) => String(x)));
    }
    if (p?.fileStart != null) {
      parts.push(String(p.fileStart));
    }
    if (p?.transmitFileNumber) {
      parts.push(String(p.transmitFileNumber));
    }
    return parts.length ? Array.from(new Set(parts)).join(',') : '';
  }

  private buildDeleteRange(p: any): string {
    if (p?.start_file != null && p?.end_file != null) {
      return `${p.start_file}-${p.end_file}`;
    }
    if (p?.startFile != null && p?.endFile != null) {
      return `${p.startFile}-${p.endFile}`;
    }
    if (p?.deleteFileNumber) return String(p.deleteFileNumber);
    return '';
  }

  /** 去除名称中追加的时间后缀（如 “xxx-2025-12-01 …”） */
  private stripTimeSuffix(name: string): string {
    if (!name) return '';
    return name.replace(/\s*-?\s*\d{4}-\d{2}-\d{2}.*$/, '').trim();
  }

  /** 查找同一卫星+时间的已存在记录，允许 1s 容忍，避免同批次多链重复冲突/写入 */
  private async findExistingLog<T>(
    repo: Repository<T>,
    timeField: keyof T & string,
    sat: Sat,
    time: Date,
    toleranceMs = 1000,
  ): Promise<T | null> {
    const t = time.getTime();
    const from = new Date(t - toleranceMs);
    const to = new Date(t + toleranceMs);
    const where: any = {
      satelliteCode: sat,
      [timeField]: Between(from, to),
    };
    try {
      // @ts-ignore
      return await repo.findOne({ where });
    } catch {
      return null;
    }
  }
}
