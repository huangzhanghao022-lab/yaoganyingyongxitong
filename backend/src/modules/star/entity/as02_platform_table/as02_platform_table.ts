//src/modules/star/entity/as02_platform_table/as02_platform_table.ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@cool-midway/core';

@Entity('as02_platform_table')  // 对应您图片中的表名格式
export class as02platformtableEntity extends BaseEntity {
    
    @Column({ comment: '名称' })
    name: number;
  
    @Column({ comment: '编号' })
    code: number;
  
    @Column({ comment: '写入时间', type: 'timestamp', nullable: true })
    executingTime: Date;
  
    @Column({ comment: '状态', default: 1 })
    status: number;
  
    @Column({ comment: '创建时间', type: 'timestamp', default: () => 'now()' })
    createTime: Date;
  
    @Column({ comment: '更新时间', type: 'timestamp', default: () => 'now()' })
    updateTime: Date;
  
    @Column({ comment: '平台文件名称', length: 100, nullable: true })
    fileName: string;
  
    @Column({ comment: '起始文件号', nullable: true })
    startFileNo: number;
  
    @Column({ comment: '结束文件号', nullable: true })
    endFileNo: number;
}