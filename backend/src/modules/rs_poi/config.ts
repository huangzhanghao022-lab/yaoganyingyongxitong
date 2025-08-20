import { ModuleConfig } from '@cool-midway/core';

/**
 * 模块配置
 */
export default () => {
  return {
    // 必须，模块名称
    name: 'rs-poi',
    // 必须，模块描述
    description: '目标库管理',
  } as ModuleConfig;
};
