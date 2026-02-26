import { ModuleConfig } from '@cool-midway/core';

export default () => {
  return {
    name: '轨控任务模块',
    description: 'AS02轨控计划Excel解析与提交',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};

