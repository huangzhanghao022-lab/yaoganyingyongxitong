import { Provide, Inject, Controller, Get, Post, Query, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { HistoryExcelService } from '../../service/history_excel_service';

@Provide()
@Controller('/admin/star/history_excel')
export class HistoryExcelController {
  @Inject()
  service: HistoryExcelService;

  @Inject()
  ctx: Context;

  constructor() {
    console.log('✅ HistoryExcelController instantiated');
  }

  // GET 分页
  @Get('/page')
  async pageByGet(@Query() query) {
    return this.pageCore(query);
  }

  // POST 分页（兼容 cl-crud 默认 POST 行为）
  @Post('/page')
  async pageByPost(@Body() body) {
    return this.pageCore(body);
  }

  private async pageCore(params: any) {
    console.log('📥 [Controller] /page called with params:', params);
    const data = await this.service.customPage(params || {});
    console.log('📤 [Controller] /page result:', {
      list: data?.list?.length ?? 0,
      pagination: data?.pagination,
    });
    return {
      code: 1000,
      message: 'ok',
      data,
    };
  }

  @Get('/info')
  async info(@Query() query) {
    console.log('📥 [Controller] /info called with query:', query);
    const data = await this.service.info(query);
    console.log('📤 [Controller] /info result:', !!data, data ? { id: data.id, name: data.name } : null);
    return {
      code: 1000,
      message: 'ok',
      data,
    };
  }

  // 直接下载接口，流式返回二进制 Excel
  @Get('/download')
  async download(@Query() query) {
    console.log('📥 [Controller] /download called with query:', query);
    const data: any = await this.service.info(query);

    if (!data || !data.file_data) {
      console.warn('⚠️ [Controller] /download no data or file_data, data:', data);
      this.ctx.status = 404;
      this.ctx.body = 'Not Found';
      return;
    }

    const filename = (data.name || `history_${query.id || ''}.xlsx`).toString();
    const raw = data.file_data as any;

    let buf: Buffer;
    if (Buffer.isBuffer(raw)) {
      buf = raw;
    } else if (raw?.data) {
      buf = Buffer.from(raw.data);
    } else if (typeof raw === 'string') {
      try {
        buf = Buffer.from(raw, 'base64');
      } catch (e) {
        console.warn('⚠️ [Controller] /download base64 decode failed');
        buf = Buffer.from([]);
      }
    } else {
      buf = Buffer.from([]);
    }

    console.log('📦 [Controller] /download ready to send file', {
      filename,
      size: buf?.length,
      type: typeof raw,
    });

    this.ctx.set(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    this.ctx.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    this.ctx.set('Content-Length', String(buf?.length || 0));
    this.ctx.body = buf;
  }
}
