import { Provide, Inject } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { DailyPlanAs02Entity } from '../entity/as02';
import { DailyPlanAs03Entity } from '../entity/as03';

const TELECONTROL_TOKEN_URL = 'http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token';
const TELECONTROL_SEARCH_URLS = [
  'http://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search',
  'https://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search',
];
const DUTY_ROSTER_URLS = [
  'http://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search',
  'https://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search',
];
const TELECONTROL_CREDENTIALS = { username: '02ptemplate@yinhe.ht', password: '123456', loginType: 2 };
const TELECONTROL_STATES = ['1', '2', '6'];
const AS02_SPACECRAFT_ID = '12';
const AS03_SPACECRAFT_ID = '13';
const BEIJING_OFFSET = 8 * 60 * 60 * 1000;

@Provide()
export class DailyPlanGenerateService {
  @InjectEntityModel(DailyPlanAs02Entity) as02Repo: Repository<DailyPlanAs02Entity>;
  @InjectEntityModel(DailyPlanAs03Entity) as03Repo: Repository<DailyPlanAs03Entity>;

  async generateFor(sat: 'AS02' | 'AS03', dateStr?: string) {
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const spacecraftId = sat === 'AS02' ? AS02_SPACECRAFT_ID : AS03_SPACECRAFT_ID;
    const token = await this.fetchToken();
    const [records, duty] = await Promise.all([
      this.fetchTelecontrolRecords(token, date, spacecraftId),
      this.fetchDutyRoster(token, date, spacecraftId).catch(() => []),
    ]);
    if (!records.length) return;

    const payloads = records
      .map((r: any) => this.buildPlanPayload(r, date, duty.join('、') || '-'))
      .filter(Boolean) as DailyPlanAs02Entity[];

    if (!payloads.length) return;

    if (sat === 'AS02') await this.as02Repo.save(payloads);
    else await this.as03Repo.save(payloads);
  }

  private async fetchToken(): Promise<string> {
    const resp = await axios.post(TELECONTROL_TOKEN_URL, TELECONTROL_CREDENTIALS, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = resp.data;
    return data?.data?.token ?? data?.token ?? data?.data;
  }

  private async fetchTelecontrolRecords(token: string, date: string, spacecraftId: string) {
    const { begin, end } = this.buildUtcRange(date);
    const payload = {
      keyword: '',
      page: 1,
      pageSize: 200,
      states: TELECONTROL_STATES,
      beginTime: begin,
      endTime: end,
      antennaIds: [],
      spacecraftIds: [spacecraftId],
      order: 3,
    };
    let lastErr: any;
    for (const url of TELECONTROL_SEARCH_URLS) {
      try {
        const resp = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json', 'x-web-token': token },
        });
        const result = resp.data;
        return result?.data?.list ?? result?.data ?? result?.records ?? [];
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('telecontrol fetch failed');
  }

  private async fetchDutyRoster(token: string, date: string, spacecraftId: string): Promise<string[]> {
    const { begin, end } = this.buildBeijingRange(date);
    let lastErr: any;
    for (const url of DUTY_ROSTER_URLS) {
      try {
        const resp = await axios.post(
          url,
          {
            keyword: '',
            spacecraftIds: [spacecraftId],
            page: 1,
            pageSize: 20,
            beginTime: begin,
            endTime: end,
          },
          {
            headers: { 'Content-Type': 'application/json', 'x-web-token': token },
          }
        );
        const result = resp.data;
        const list = result?.data?.list ?? result?.data ?? result?.records ?? [];
        return Array.isArray(list)
          ? list
              .map((x) => String(x?.name ?? x?.dutyName ?? x?.dutyOfficer ?? '').trim())
              .filter(Boolean)
          : [];
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('duty roster failed');
  }

  private buildPlanPayload(row: any, date: string, dutyOfficer: string) {
    const [start, end] = this.splitTransit(
      row?.transitTime ?? row?.transit_time ?? row?.transit_time_text ?? row?.transit_time_texts
    );
    if (!start && !end) return null;
    return {
      date,
      dutyOfficer,
      telemetryStation: this.resolveAntennaName(row) || '',
      transitTime: start && end ? `${start}-${end}` : start || end || '',
      elevationAngle: this.resolveElevation(row),
      telemetryInfo: '',
    };
  }

  private splitTransit(val: any): [string, string] {
    const str = typeof val === 'string' ? val : '';
    const idx = str.indexOf('-', 19);
    if (idx === -1) return [str.trim(), ''];
    return [str.slice(0, idx).trim(), str.slice(idx + 1).trim()];
  }

  private resolveAntennaName(row: any): string {
    return row?.antennaName || row?.stationName || '';
  }

  private resolveElevation(row: any): number | null {
    const raw = row?.tracking?.angleMax?.el ?? row?.angleMax ?? row?.angle_max ?? row?.maxAngle;
    const num = Number(raw);
    return Number.isFinite(num) ? Math.round(num) : null;
  }

  private buildUtcRange(date: string) {
    const begin = Date.parse(`${date}T00:00:00Z`);
    return { begin: begin - BEIJING_OFFSET, end: begin - BEIJING_OFFSET + 24 * 3600 * 1000 };
  }

  private buildBeijingRange(date: string) {
    const begin = Date.parse(`${date}T00:00:00+08:00`);
    return { begin, end: begin + 24 * 3600 * 1000 };
  }
}
