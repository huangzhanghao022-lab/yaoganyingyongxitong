import { Provide } from '@midwayjs/core';
import axios from 'axios';

const TELECONTROL_TOKEN_URL =
  'http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token';
const ANTENNA_URL =
  'http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi-transform/get-all-antenna';
const TELECONTROL_CREDENTIALS = {
  username: '02ptemplate@yinhe.ht',
  password: '123456',
  loginType: 2,
};

@Provide()
export class AntennaShuchuanService {
  private async fetchToken(): Promise<string> {
    const resp = await axios.post(TELECONTROL_TOKEN_URL, TELECONTROL_CREDENTIALS, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = resp.data;
    const token = data?.data?.token ?? data?.token ?? data?.data;
    if (!token) {
      throw new Error('fetch telecontrol token failed');
    }
    return token;
  }

  private hasFeature3(features: any): boolean {
    if (features == null) return false;
    if (Array.isArray(features)) {
      return features.some((v) => Number(v) === 3 || String(v) === '3');
    }
    if (typeof features === 'number') {
      return features === 3;
    }
    if (typeof features === 'string') {
      const trimmed = features.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.some((v) => Number(v) === 3 || String(v) === '3');
          }
        } catch (err) {
          // fallthrough to split
        }
      }
      return trimmed
        .split(/[,\s]+/)
        .map((v) => v.trim())
        .some((v) => v === '3' || Number(v) === 3);
    }
    return false;
  }

  async fetchStations(): Promise<any[]> {
    const token = await this.fetchToken();
    const resp = await axios.post(
      ANTENNA_URL,
      {},
      {
        headers: {
          'x-web-token': token,
        },
      }
    );
    const list = resp?.data?.data?.getAllAntenna ?? [];
    if (!Array.isArray(list)) return [];
    return list.filter((item) => this.hasFeature3(item?.features));
  }
}
