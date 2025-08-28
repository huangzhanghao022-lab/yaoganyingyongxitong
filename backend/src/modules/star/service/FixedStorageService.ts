// src/modules/star/service/FixedStorageService.ts
import { Provide, Inject } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { DataSource, Repository, Between, In } from 'typeorm';
import { as02payloadtableEntity } from '../entity/as02_payload_table/as02_payload_table';
import { as02platformtableEntity } from '../entity/as02_platform_table/as02_platform_table';
import { as03payloadtableEntity } from '../entity/as03_payload_table/as03_payload_table';
import { as03platformtableEntity } from '../entity/as03_platform_table/as03_platform_table';
import { ILogger } from '@midwayjs/logger';
import { InjectDataSource, InjectEntityModel } from '@midwayjs/typeorm'; // 添加 InjectEntityModel 导入
import { IMidwayContext } from '@midwayjs/core';
import * as xlsx from "node-xlsx";

@Provide()
export class FixedStorageService extends BaseService {
  @Inject()
  logger: ILogger;

  @InjectDataSource()
  defaultDataSource: DataSource;

  @Inject()
  ctx: IMidwayContext;

  private repoMap: Map<number, Repository<any>> = new Map();

  // 定义表策略映射
  private tableStrategy = {
    0: as02payloadtableEntity,
    1: as02platformtableEntity,
    2: as03payloadtableEntity,
    3: as03platformtableEntity
  };

  // 注入所有表的Repository
  @InjectEntityModel(as02payloadtableEntity)
  repo0: Repository<as02payloadtableEntity>;

  @InjectEntityModel(as02platformtableEntity)
  repo1: Repository<as02platformtableEntity>;

  @InjectEntityModel(as03payloadtableEntity)
  repo2: Repository<as03payloadtableEntity>;

  @InjectEntityModel(as03platformtableEntity)
  repo3: Repository<as03platformtableEntity>;

  async init() {
    await super.init();
    this.logger.info('[固存服务] 开始初始化数据源');
    
    try {
      // 初始化四张表的Repository
      this.repoMap.set(0, this.defaultDataSource.getRepository(as02payloadtableEntity));
      this.repoMap.set(1, this.defaultDataSource.getRepository(as02platformtableEntity));
      this.repoMap.set(2, this.defaultDataSource.getRepository(as03payloadtableEntity));
      this.repoMap.set(3, this.defaultDataSource.getRepository(as03platformtableEntity));
      
      this.logger.info('[固存服务] 实体映射初始化完成 | 表数量: %d', this.repoMap.size);
    } catch (err) {
      this.logger.error('[固存服务] 初始化失败: %s', err.message, { stack: err.stack });
      throw err;
    }
  }

  private getCurrentRepo(name: number): Repository<any> {
    const parsedName = Number(name);
    if (isNaN(parsedName) || parsedName < 0 || parsedName > 3) {
      throw new Error(`name 参数必须为 0-3 的数字`);
    }
    const repo = this.repoMap.get(parsedName);
    if (!repo) throw new Error(`表标识 ${parsedName} 无对应仓库`);
    return repo;
  }

  private isValidField(repo: Repository<any>, fieldName: string): boolean {
    return repo.metadata.columns.map(col => col.propertyName).includes(fieldName);
  }

  async add(params: any) {
    try {
      let name = 0;
      let entityData: any = {};
  
      if ('name' in params) {
        name = params.name;
        if (params.data) {
          entityData = { ...params.data, name };  // 保留 name 字段
        } else {
          const { name: _, ...rest } = params;
          entityData = { ...rest, name };         // 保留 name 字段
        }
      } else {
        entityData = params;
      }
  
      const repo = this.getCurrentRepo(name);
      return await repo.save(entityData);
      

    } catch (err) {
      this.logger.error('[新增] 失败: %s', err.message, { stack: err.stack });
      throw err;
    }
  }
  
  
  /** 更新 */
  async update(params: any) {
    try {
      let name = 0;
      let entityData: any = {};
  
      if ('name' in params) {
        name = params.name;
        if (params.data) {
          entityData = params.data;
        } else {
          const { name: _, ...rest } = params;
          entityData = rest;
        }
      } else {
        entityData = params;
      }
  
      const repo = this.getCurrentRepo(name);
      const entity = await repo.findOne({ where: { id: entityData.id } });
      if (!entity) throw new Error(`ID ${entityData.id} 不存在`);
      Object.assign(entity, entityData);

      const operator = (this.ctx as any).user?.username || 'unknown';
      await this.exportSnapshotExcel(name,  operator);
      
  
      return await repo.save(entity);
      

    } catch (err) {
      this.logger.error('[更新] 失败: %s', err.message, { stack: err.stack });
      throw err;
    }
  }
  

  /**
   * 重写delete方法（支持多表路由）
   * @param param 参数对象 { ids: number[], name: number }
   */
  async delete(param: any): Promise<void> {

    // 打印输入参数
    this.logger.info('[删除] 接收参数: %j', param);
    // 参数解构（兼容框架默认传参和扩展传参）
    const { ids, name = 0 } = param;
    const idList = Array.isArray(ids) ? ids : [ids];

    try {
      // 1. 获取目标表
      const repo = this.getCurrentRepo(name);
      this.logger.info('[删除] 操作表: %s | IDs: %j', repo.metadata.tableName, idList);
      await repo.delete({ id: In(idList) });
      

    } catch (err) {
      this.logger.error('[删除] 失败: %s | 参数: %j', err.message, param, { stack: err.stack });
      throw err;
    }
  }

  /** 详情 */
  /** 获取详情（支持多表） */
  async info(param: { id: number; name: number }) {
    try {
      const { id, name } = param;
      const repo = this.getCurrentRepo(name);
      const data = await repo.findOneBy({ id });
      if (!data) throw new Error(`ID ${id} 不存在于表 ${repo.metadata.tableName}`);
      return data;
    } catch (err) {
      this.logger.error('[详情] 获取失败: %s | 参数: %j', err.message, param, { stack: err.stack });
      throw err;
    }
  }


  async page(params: any) {
    try {
      const { name = 0, ...query } = params;
      const repo = this.getCurrentRepo(name);
      const qb = repo.createQueryBuilder('a');
  
      // ====== 条件（保持你原来的逻辑）======
      Object.keys(query).forEach((key) => {
        if (!['page', 'size', 'sort', 'order'].includes(key)) {
          const value = query[key];
          if (key === 'imagingTimeRange' && Array.isArray(value)) {
            qb.andWhere({ imagingTime: Between(value[0], value[1]) });
          } else if (value === null) {
            qb.andWhere(`a.${key} IS NULL`);
          } else if (value !== undefined) {
            qb.andWhere(`a.${key} = :${key}`, { [key]: value });
          }
        }
      });
  
      // ====== 排序（关键修复）======
      const sortField = query.sort as string | undefined;
      const sortOrder: 'ASC' | 'DESC' =
        String(query.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  
      if (sortField === 'code') {
        // 前端点了“编号”排序 -> 按数值排
        qb.orderBy('a.code::int', sortOrder).addOrderBy('a.createTime', 'DESC');
      } else if (!sortField && this.isValidField(repo, 'code')) {
        // 默认排序：库有 code 字段就按数值升序
        qb.orderBy('a.code::int', 'ASC').addOrderBy('a.createTime', 'DESC');
      } else if (sortField && this.isValidField(repo, sortField)) {
        qb.orderBy(`a.${sortField}`, sortOrder);
      } else {
        qb.orderBy('a.createTime', 'DESC');
      }
  
      // ====== 分页 ======
      const pageNo = Number(query.page) || 1;
      const pageSize = Number(query.size) || 20;
  
      const [list, total] = await qb
        .skip((pageNo - 1) * pageSize)
        .take(pageSize)
        .getManyAndCount();
  
      return { list, pagination: { page: pageNo, size: pageSize, total } };
    } catch (err) {
      this.logger.error('[分页] 失败: %s', err.message, { stack: err.stack });
      throw err;
    }
  }

  /* 快照功能函数，用于将增删改信息录入进各自固存表的历史固存表中*/
  async exportSnapshotExcel(name: number, operator: string) {
    const tableMap = {
      0: 'as02_payload_table',
      1: 'as02_platform_table',
      2: 'as03_payload_table',
      3: 'as03_platform_table'
    };
  
    const tableName = tableMap[name];
    if (!tableName) {
      this.logger.warn('[快照导出] 无效的表名编号: %d', name);
      return;
    }
  
    const rows = await this.defaultDataSource.query(`SELECT * FROM ${tableName}`);
    if (!rows.length) return;
  
    const header = Object.keys(rows[0]);
    const data = [
      [`固存表名: ${tableName}`],
      header,
      ...rows.map((row) => header.map((key) => row[key])),
      []
    ];
  
    const buffer = xlsx.build([
      {
        name: tableName,
        data,
        options: {} // ✅ 必填项
      }
    ]);
    
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const filename = `${operator}-${timestamp}.xlsx`;
  
    // 插入到 PostgreSQL
    await this.defaultDataSource.query(`
      INSERT INTO history_excel (name, table_code, table_name, operator, snapshot_time, file_data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      filename,
      name,
      tableName,
      operator,
      new Date(),
      buffer
    ]);
  
    this.logger.info('[快照导出] 已保存快照文件至 PostgreSQL: %s', filename);
  }
  

  
}