// src/modules/star/service/fixed_storage_table.ts
import { Provide, Inject } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { DataSource, Repository, Between, In } from 'typeorm';
import { as02payloadtableEntity } from '../entity/as02_payload_table/as02_payload_table';
import { as02platformtableEntity } from '../entity/as02_platform_table/as02_platform_table';
import { as03payloadtableEntity } from '../entity/as03_payload_table/as03_payload_table';
import { as03platformtableEntity } from '../entity/as03_platform_table/as03_platform_table';
import { ILogger } from '@midwayjs/logger';
import { InjectDataSource, InjectEntityModel } from '@midwayjs/typeorm'; // 添加 InjectEntityModel 导入

@Provide()
export class FixedStorageService extends BaseService {
  @Inject()
  logger: ILogger;

  @InjectDataSource()
  defaultDataSource: DataSource;

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
          entityData = params.data;
        } else {
          const { name: _, ...rest } = params;
          entityData = rest;
        }
      } else {
        entityData = params;
      }
  
      const repo = this.getCurrentRepo(name);
      this.logger.info('[新增] 表: %s | 数据: %j', repo.metadata.tableName, entityData);
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
      
      // 2. 执行删除
      await repo.delete({ id: In(idList) });
      this.logger.info('[删除] 成功 | 数量: %d', idList.length);
    } catch (err) {
      this.logger.error('[删除] 失败: %s | 参数: %j', err.message, param, { stack: err.stack });
      throw err;
    }
  }

  /** 详情 */
  async info(params: any) {
    try {
      const { name = 0, id } = params;
      const repo = this.getCurrentRepo(name);
      return await repo.findOne({ where: { id } });
    } catch (err) {
      this.logger.error('[详情] 失败: %s', err.message, { stack: err.stack });
      throw err;
    }
  }

  /** 分页（已兼容官方 page 调用格式） */
  async page(params: any) {
    try {
      const { name = 0, ...query } = params;
      const repo = this.getCurrentRepo(name);
      const qb = repo.createQueryBuilder('a');

      if (this.isValidField(repo, 'code')) {
        qb.orderBy('a.code', 'ASC');
      } else {
        qb.orderBy('a.createTime', 'DESC');
      }

      Object.keys(query).forEach(key => {
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

      const [list, total] = await qb
        .skip((query.page - 1) * query.size)
        .take(query.size)
        .getManyAndCount();

      return { list, pagination: { page: query.page, size: query.size, total } };
    } catch (err) {
      this.logger.error('[分页] 失败: %s', err.message, { stack: err.stack });
      throw err;
    }
  }
}