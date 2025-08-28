<template>
  <cl-dialog v-model="visible" title="历史快照记录" width="960px">
    <cl-crud ref="Crud">
      <cl-row>
        <cl-refresh-btn />
      </cl-row>
      <cl-row>
        <!-- 在对话框中禁用自动高度，避免容器高度为 0 导致表格不显示 -->
        <cl-table ref="Table" :columns="columns" :auto-height="false" />
      </cl-row>
      <cl-row>
        <cl-flex1 />
        <cl-pagination />
      </cl-row>
    </cl-crud>
  </cl-dialog>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useCool, BaseService } from '/@/cool';
import { ElMessage } from 'element-plus';
import { useCrud, useTable } from '@cool-vue/crud';
import { config } from '/@/config';
import { request } from '/@/cool/service/request';

const { service } = useCool();
const visible = ref(false);

// 供父组件传参（例如按表筛选）
const queryParams = ref<Record<string, any>>({});

// 表格列定义
const columns = [
  { label: '文件名', prop: 'name', minWidth: 240 },
  { label: '表名', prop: 'table_name', minWidth: 160 },
  { label: '操作人', prop: 'operator', minWidth: 120 },
  { label: '快照时间', prop: 'snapshot_time', minWidth: 180 },
  {
    label: '操作',
    type: 'op',
    buttons: [
      {
        label: '下载',
        type: 'primary',
        onClick: ({ scope }: any) => download(scope?.row ?? {}),
      },
    ],
  },
];

// 绑定 cl-table，让 cl-crud 驱动数据渲染
const Table = useTable({ columns });

// 自定义历史快照服务（使用 GET 以适配后端）
const historyService = {
  page(data: any) {
    return request({
      url: `${config.baseUrl}/admin/star/history_excel/page`,
      method: 'post',
      data
    }) as unknown as Promise<{ list: any[]; pagination: any }>
  }
};

// useCrud 自动管理分页、数据加载
const Crud = useCrud(
  {
    service: historyService as unknown as BaseService,
    onRefresh(params, { next }) {
      return next({ ...params, ...queryParams.value });
    },
  },
  (app) => {
    app.refresh();
  }
);

async function download(row: any) {
  try {
    console.group('[HistoryDialog] download click');
    console.log('row:', row);
    const id = row?.id ?? row?.scope?.row?.id;
    const name = row?.name ?? row?.scope?.row?.name;
    const url = `${config.baseUrl}/admin/star/history_excel/download`;
    console.log('request url:', url, 'params:', { id, name });

    // 通过带鉴权的请求获取二进制，避免新窗口缺少 Authorization 头
    const blob = (await request({
      url,
      method: 'get',
      params: id ? { id } : { name },
      responseType: 'blob'
    })) as unknown as Blob;

    console.log('blob:', blob, 'type:', (blob as any)?.type, 'size:', (blob as any)?.size);

    if (!(blob instanceof Blob)) {
      console.warn('[HistoryDialog] unexpected response, not a Blob');
    }

    const objectUrl = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    const filename = String(name || 'history.xlsx');
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
    console.groupEnd();
  } catch (e: any) {
    console.error('[HistoryDialog] download error:', e);
    try {
      const reader = new FileReader();
      if (e?.response?.data && e.response.data instanceof Blob) {
        reader.onload = () => console.error('[HistoryDialog] error body:', reader.result);
        reader.readAsText(e.response.data);
      }
    } catch {}
    ElMessage.error('下载失败');
  }
}

function open(params?: Record<string, any>) {
  console.log('[HistoryDialog] open called', params);
  queryParams.value = params || {};
  visible.value = true;
  nextTick(() => {
    // 保证对话框可见后刷新列表
    (Crud as any)?.refresh?.();
  });
}

defineExpose({ open });
</script>
