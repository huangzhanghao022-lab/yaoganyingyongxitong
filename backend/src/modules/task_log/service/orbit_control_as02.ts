import { Provide } from '@midwayjs/core';
import { CoolCommException, BaseService } from '@cool-midway/core';

@Provide()
export class TaskLogOrbitControlAs02Service extends BaseService {
  /**
   * 轨控任务建议通过轨控页面提交，避免绕过统一校验与冲突判断
   */
  async add(_param: any): Promise<any> {
    throw new CoolCommException('请通过AS02轨控页面提交任务');
  }
}
