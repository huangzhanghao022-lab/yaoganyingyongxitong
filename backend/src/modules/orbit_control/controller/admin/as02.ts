import { BaseController, CoolController } from '@cool-midway/core';
import { Fields, Files, Inject, Post, Provide } from '@midwayjs/core';
import { OrbitControlAs02Service } from '../../service/as02';

@Provide()
@CoolController()
export class AdminOrbitControlAs02Controller extends BaseController {
  @Inject()
  orbitControlAs02Service: OrbitControlAs02Service;

  @Post('/preview_excel')
  async previewExcel(@Files() files, @Fields() fields) {
    const file = files?.[0];
    if (!file?.data) return this.fail('请上传Excel文件');
    const result = await this.orbitControlAs02Service.previewExcel(file.data);
    return this.ok({
      ...result,
      sourceFileName: fields?.sourceFileName || file?.filename || file?.fieldname || '',
    });
  }

  @Post('/submit_excel')
  async submitExcel(@Files() files, @Fields() fields) {
    const file = files?.[0];
    if (!file?.data) return this.fail('请上传Excel文件');
    const result = await this.orbitControlAs02Service.submitExcel(file.data, {
      name: fields?.name,
      sourceFileName: fields?.sourceFileName || file?.filename || '',
    });
    return this.ok(result);
  }
}
