// src/modules/star/entity/history_excel.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 历史快照 Excel 元数据表
 */
@Entity('history_excel') // ✅ 改为 Entity
export class HistoryExcelEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '文件名（操作人-时间）' })
  name: string;

  @Column({ comment: '表编号，例如0~3' })
  table_code: number;

  @Column({ comment: '表名，例如 as02_payload_table' })
  table_name: string;

  @Column({ comment: '操作人' })
  operator: string;

  @Column({ type: 'timestamp', comment: '快照时间' })
  snapshot_time: Date;

  @Column({ type: 'bytea', comment: 'Excel 文件二进制内容' })
  file_data: Buffer;
}
