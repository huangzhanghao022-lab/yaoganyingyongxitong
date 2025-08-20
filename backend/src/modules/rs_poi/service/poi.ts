import { Inject, Post, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Like, Repository } from 'typeorm';
import { RsPoiEntity } from '../entity/poi';
import { Logger } from '@nestjs/common';

/**
 * 目标库信息
 */
@Provide()
export class RsPoiPoiService extends BaseService {
  @InjectEntityModel(RsPoiEntity)
  rsPoiEntity: Repository<RsPoiEntity>;
  private logger = new Logger('RsPoiService'); // 使用 Midway 的 Logger

  /**
   * 批量导入数据（兼容Excel字段映射）
   */

  // 添加导入方法
  async importData(data: any[]) {

    // 记录客户端原始数据
    this.logger.debug(`客户端原始数据`, data);
    return this.batchImport(data); // 调用已有的批量导入逻辑
  }

  async batchImport(data: any[]) {
    // 严格过滤逻辑 - 只保留存在且有效的name字段
    const validatedData = data
      .filter(item => {
        // 检查item是否为空对象
        if (!item) return false;
        
        // 关键过滤：确保name存在且有效
        const hasValidName = 
          // 检查name属性是否存在
          item.hasOwnProperty('name') && 
          // 确保name不是null
          item.name !== null && 
          // 确保name不是空字符串
          item.name !== '' && 
          // 排除占位符文本（如图片中的"[名称]"）
          !item.name.startsWith('[');
        
        return hasValidName;
      })
      .map(item => ({
        ...item,
        // 转换satellites字段为逗号分隔的字符串
        satellites: Array.isArray(item.satellites) 
          ? item.satellites.join(',') 
          : '' // 处理其他情况
      }));

    // 去重处理：基于name去重
    const uniqueData = Array.from(
      new Map(validatedData.map(item => [item.name, item])).values());

    try {
      // 冲突更新逻辑改为基于unique key (name)
      return await this.rsPoiEntity
        .createQueryBuilder()
        .insert()
        .into(RsPoiEntity)
        .values(uniqueData)
        .orUpdate(
          ['area_lon', 'area_lat', 'satellites', 'level'], // 更新字段
          ['name'] // 冲突依据字段
        )
        .execute();
    } catch (error) {
      // 捕获并记录详细错误信息
      console.error('批量导入失败:', {
        error: error.message,
        failedRecords: uniqueData.filter(i =>
          !i.name || i.area_lon === undefined || i.area_lat === undefined
        )
      });
      throw new Error(`导入失败: ${error.message}`);
    }
  }

  async listByName(name: string) {
    const res = await this.rsPoiEntity.findBy({
      name: Like(`%${name}%`)
    });
    return res;
  }
  async info(id: number) {
    const info = await this.rsPoiEntity.findOne({ where: { id } });
    if (info) {
      // 将字符串转换为数组
      return {
        ...info,
        type: info.satellites.split(',').map(Number) // 关键转换
      };
    }
    return null;
  }
  // 新增自定义更新方法
  async customUpdate(data: any) {
    const entity = await this.rsPoiEntity.findOne({ where: { id: data.id } });
    if (!entity) throw new Error('目标点不存在');
    
    // 数据转换（多选值处理）
    const validatedData = {
      ...data,
      satellites: Array.isArray(data.satellites) 
        ? data.satellites.join(',') 
        : ''
    };
    
    Object.assign(entity, validatedData);
    return this.rsPoiEntity.save(entity);
  }
}
