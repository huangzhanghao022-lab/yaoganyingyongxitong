import { FixedStorageService } from '../src/modules/star/service/FixedStorageService';

describe('FixedStorageService delete', () => {
  let service: FixedStorageService;
  let repo: any;
  let logger: any;

  beforeEach(() => {
    service = new FixedStorageService();
    repo = {
      delete: jest.fn().mockResolvedValue({}),
      metadata: { tableName: 'test_table' },
    };
    (service as any).repoMap = new Map([[0, repo]]);
    logger = { info: jest.fn(), error: jest.fn() } as any;
    (service as any).logger = logger;
  });

  it('should delete existing ids and log success', async () => {
    await service.delete({ ids: [1, 2], name: 0 });
    expect(repo.delete).toHaveBeenCalledTimes(1);
    const arg = repo.delete.mock.calls[0][0];
    expect(arg).toHaveProperty('id');
    expect(arg.id._value).toEqual([1, 2]);
    expect(logger.info).toHaveBeenNthCalledWith(1, '[删除] 接收参数: %j', { ids: [1, 2], name: 0 });
    expect(logger.info).toHaveBeenNthCalledWith(2, '[删除] 操作表: %s | IDs: %j', 'test_table', [1, 2]);
    expect(logger.info).toHaveBeenNthCalledWith(3, '[删除] 成功 | 数量: %d', 2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should handle nonexistent ids without throwing', async () => {
    repo.delete.mockResolvedValue({ affected: 0 });
    await expect(service.delete({ ids: [999], name: 0 })).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenNthCalledWith(1, '[删除] 接收参数: %j', { ids: [999], name: 0 });
    expect(logger.info).toHaveBeenNthCalledWith(2, '[删除] 操作表: %s | IDs: %j', 'test_table', [999]);
    expect(logger.info).toHaveBeenNthCalledWith(3, '[删除] 成功 | 数量: %d', 1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log error when repository throws', async () => {
    const err = new Error('db fail');
    repo.delete.mockRejectedValue(err);
    await expect(service.delete({ ids: [1], name: 0 })).rejects.toThrow('db fail');
    expect(logger.error).toHaveBeenCalledWith(
      '[删除] 失败: %s | 参数: %j',
      'db fail',
      { ids: [1], name: 0 },
      { stack: err.stack }
    );
  });
});

