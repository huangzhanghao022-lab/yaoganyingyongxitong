// src/modules/star/service/history_excel_service.ts

import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';

@Provide()
export class HistoryExcelService extends BaseService {
  async customPage(query) {
    console.log('🔍 [Service] customPage called with query:', query);

    const page = Number(query.page) || 1;
    const size = Number(query.size) || 10;
    const offset = (page - 1) * size;

    const sql = `
      SELECT id, name, operator, snapshot_time, table_name
      FROM history_excel
      ORDER BY snapshot_time DESC
      LIMIT $1 OFFSET $2
    `;
    const totalSql = `SELECT COUNT(*) as count FROM history_excel`;

    const list = await this.nativeQuery(sql, [size, offset]);
    const totalRes = await this.nativeQuery(totalSql);
    const total = Number(totalRes?.[0]?.count || 0);

    const result = {
      list,
      pagination: { page, size, total },
    };

    console.log('📦 [Service] customPage result:', result);
    return result;
  }

  async info(query) {
    console.log('🔍 [Service] info called with query:', query);

    let data: any = null;
    if (query?.id != null) {
      const sql = `SELECT * FROM history_excel WHERE id = $1`;
      const result = await this.nativeQuery(sql, [query.id]);
      data = result?.[0] ?? null;
    } else if (query?.name) {
      const sql = `SELECT * FROM history_excel WHERE name = $1 ORDER BY snapshot_time DESC LIMIT 1`;
      const result = await this.nativeQuery(sql, [query.name]);
      data = result?.[0] ?? null;
    }

    if (data) {
      console.log('📦 [Service] info result found:', { id: data.id, name: data.name, size: data.file_data?.length });
    } else {
      console.warn('⚠️ [Service] info not found');
    }

    return data;
  }
}
