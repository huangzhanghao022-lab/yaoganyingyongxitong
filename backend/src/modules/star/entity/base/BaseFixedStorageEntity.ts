import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@cool-midway/core';

@Entity('BaseFixedStoragetable')  // 对应您图片中的表名格式
export class BaseFixedStorageEntity extends BaseEntity {
    @Column({
        comment: '名称',
        dict: [
        'AS02载荷固存表',
        'AS02平台固存表',
        'AS03载荷固存表',
        'AS03平台固存表',
        ],
    })
    name: number;

    @Column({ comment: '编号', length: 50 })
    code: string;

    @Column({ comment: '目标名称', length: 100, nullable: true })
    targetName: string;

    @Column({ comment: '成像时间', nullable: true })
    imagingTime: Date;

    @Column({ comment: '起始文件号', length: 50, nullable: true })
    startFileNo: string;

    @Column({ comment: '结束文件号', length: 50, nullable: true })
    endFileNo: string;

    @Column({ comment: '状态', dict: ['禁用', '启用'], default: 1 })
    status: number;
}