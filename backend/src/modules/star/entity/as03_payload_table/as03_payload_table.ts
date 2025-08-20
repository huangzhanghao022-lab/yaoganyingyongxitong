//src/modules/star/entity/as03_payload_table/as03_payload_table.ts
import { Entity } from 'typeorm';
import { BaseFixedStorageEntity } from '../base/BaseFixedStorageEntity';

@Entity('as03_payload_table')  // 对应您图片中的表名格式
export class as03payloadtableEntity extends BaseFixedStorageEntity {}