import { Inject } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { RsImageProductsEntity } from '../../entity/product';
import { RsImageProductsService } from '../../service/product';
import { RsImageRequestEntity } from '../../../rs_image_request/entity/imageRequest';

/**
 * 图像产品
 */
@CoolController({
  api: ['page', 'info'],
  entity: RsImageProductsEntity,
  service: RsImageProductsService,
  pageQueryOp: {
    keyWordLikeFields: ['b.poiName'],
    fieldEq: ['a.satelliteCode', 'a.imagingMode'],
    where: async ctx => {
      const { createTimeStart, createTimeEnd } = ctx.request.body;
      const where = [];
      if (createTimeStart && createTimeEnd) {
        where.push([
          'b.createTime BETWEEN :start AND :end',
          { start: createTimeStart, end: createTimeEnd },
        ]);
      }
      return where;
    },
    // addOrderBy: {
    //   uploadTime: 'DESC',
    // },
    select: [
      'a.*',
      'b.poiName AS requestName',
      'b.taskCreationTime AS requestCreateTime',
    ],
    join: [
      {
        entity: RsImageRequestEntity,
        alias: 'b',
        condition: 'a.requestNo = b.requestNo',
        type: 'leftJoin',
      },
    ],
  },
})
export class AdminRsImageProductsProductController extends BaseController {
  @Inject()
  rsImageProductsService: RsImageProductsService;
}
