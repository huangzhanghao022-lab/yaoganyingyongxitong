<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />
			<input 
				type="file"
				ref="fileInput"
				style="display: none"
				@change="handleFileChange"
				accept=".xlsx,.csv"
			>
			
			<el-button type="primary" @click="importExcel">Excel导入</el-button>
			<cl-flex1 />
			<!-- 条件搜索 -->
			<cl-search ref="Search">
				<template #default="{ params }">
					<el-select
					v-model="params.satellites"
					multiple
					placeholder="选择卫星代号"
					clearable
					style="width: 200px; margin-right: 10px"
					>
					<el-option
						v-for="item in options.type"
						:key="item.value"
						:label="item.label"
						:value="item.value"
					/>
					</el-select>
					<!-- 其他搜索项... -->
				</template>
				</cl-search>
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table
				ref="Table"
				:default-sort="{ prop: 'level', order: 'ascending' }"
				></cl-table>
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增、编辑 -->
		<cl-upsert ref="Upsert" />
	</cl-crud>
  <!-- 新增弹窗 -->
  <el-dialog v-model="dialogVisible" title="选择卫星代号" width="500px">
    <el-checkbox-group v-model="selectedSatellites">
      <el-checkbox 
        v-for="item in options.type" 
        :key="item.value" 
        :label="item.value"
        border
      >
        {{ item.label }}
      </el-checkbox>
    </el-checkbox-group>
    
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleImportConfirm">确认导入</el-button>
    </template>
  </el-dialog>	
</template>



<script lang="ts" setup>
defineOptions({
	name: "rs_poi-poi",
});

import { ref, reactive, nextTick } from "vue";
import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import * as XLSX from 'xlsx';
import { ElMessage } from "element-plus";
import { useDebounceFn } from '@vueuse/core';

const { service } = useCool();
const { t } = useI18n();
// 新增响应式变量
const dialogVisible = ref(false);
const selectedSatellites = ref<number[]>([]);
const upsertLoading = ref(false);

// 选项
const options = reactive({
	type: [
		{ label: t('AS02'), value: 0 },
		{ label: t('AS03'), value: 1 }
	],
	level: [
		{ label: t('高'), value: 1 },
		{ label: t('中'), value: 2 },
		{ label: t('低'), value: 3 }
	],
	phototype: [
		{ label: t('直通模式'), value: 0 },
		{ label: t('压缩模式'), value: 1 }
	]
});

// cl-upsert
const Upsert = useUpsert({
	async onOpen(isEdit, data) {
		if (isEdit && data?.satellites) {
		return {
			...data,
			type: data.satellites.split(',').map(Number)
		};
		}
		return data;
	},

	// 修改后的 onSubmit
	async onSubmit(params) {
	upsertLoading.value = true;
	const isEditing = !!params.id;
	
	try {
		const submitData = {
		...params,
		satellites: Array.isArray(params.type) ? params.type.join(',') : ''
		};
		delete submitData.type;

		const action = submitData.id ? 'update' : 'add';
		await service.rs_poi.poi[action](submitData);

		Upsert.value?.close();
		await Crud.value?.refresh({ reset: true });
		
		ElMessage.success(isEditing ? '更新成功' : '新增成功');
	} catch (err) {
		console.error('操作失败:', err);
		ElMessage.error(`操作失败: ${err.message || '未知错误'}`);
	} finally {
		upsertLoading.value = false;
	}
	},
	items: [
		{
			label: t('卫星代号'),
			prop: 'type',
			component: {
				name: 'el-checkbox-group',
				options: options.type,
				props: { 
				border: true,
				// 确保值比较正确
				valueKey: 'value' 
				}
			},
			value: [],
			required: true
		},
		{
			label: t('成像名称'),
			prop: 'name',
			component: { name: 'el-input', props: { clearable: true } },
			span: 24,
			required: true
		},
		{
			label: t('经度'),
			prop: 'area_lon',
			component: { name: 'el-input', props: { clearable: true } },
			span: 8,
			required: true
		},
		{
			label: t('纬度'),
			prop: 'area_lat',
			component: { name: 'el-input', props: { clearable: true } },
			span: 8,
			required: true
		},
		{
			label: t('优先级'),
			prop: 'level',
			component: { name: 'el-radio-group', options: options.level },
			value: 0,
			required: true
		}
	],
});

const handleSave = useDebounceFn(async () => {
  await Upsert.value?.submit();
}, 1000);

// 数字到文字的映射关系
const levelMap = {
  1: '高',
  2: '中',
  3: '低'
};

// cl-table
const Table = useTable({
  columns: [
    { type: 'selection' },
    { 
      label: t('卫星代号'), 
      prop: 'satellites',
      minWidth: 120,
      formatter(row) {
        return row.satellites
          ?.split(',')
          .map(v => options.type.find(t => t.value == v)?.label)
          .join(', ') || '-';
      }
    },
    { label: t('成像名称'), prop: 'name', minWidth: 140 },
    { label: t('经度'), prop: 'area_lon', minWidth: 120 },
    { label: t('纬度'), prop: 'area_lat', minWidth: 120 },
    {
      label: t('优先级'),
      prop: 'level',
      sortable: true,
      sortMethod(a, b) {
        const order = { 1: 1, 2: 2, 3: 3 };
        return order[a.level] - order[b.level];
      },
      // 关键修改：使用简单文字映射
      formatter(row) {
        return levelMap[row.level] || row.level;
      }
    },
    { type: 'op', buttons: ['edit', 'delete'] }
  ]
});

// cl-search
const Search = useSearch();

// 新增响应式变量
const fileInput = ref<HTMLInputElement>();
const loading = ref(false);

// 修改后的导入流程
const importExcel = async () => {
  dialogVisible.value = true;
};

// 修改后的文件处理函数
async function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || selectedSatellites.value.length === 0) {
    ElMessage.warning('请选择至少一个卫星代号');
    return;
  }

  try {
    const data = await readFile(file);
    const list = parseData(data, file.name.endsWith('.csv'));
    
    // 添加卫星代号到每条数据
    const payload = list.map(item => ({
      ...item,
      satellites: selectedSatellites.value // 新增字段
    }));

    await service.rs_poi.poi.importData(payload);
    ElMessage.success('导入成功');
    refresh();
  } catch (err) {
    ElMessage.error(`导入失败: ${err.message}`);
  } finally {
    (fileInput.value as any).value = '';
  }
}

async function handleImportConfirm() {
  if (selectedSatellites.value.length === 0) {
    ElMessage.warning('请选择至少一个卫星代号');
    return;
  }
  
  dialogVisible.value = false;
  
  // 等待弹窗关闭的 DOM 更新
  await nextTick();
  
  // 确保 fileInput 存在
  if (fileInput.value) {
    fileInput.value.click();
  } else {
    ElMessage.error('文件上传组件初始化失败');
  }
}

// 读取文件为 ArrayBuffer
function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function parseData(data: ArrayBuffer, isCSV: boolean): any[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // 转换为 JSON 格式
  const rows = isCSV 
    ? XLSX.utils.sheet_to_csv(sheet, { FS: ',' }) 
    : XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // 提取有效数据行（跳过表头）并过滤无效条目
  return rows.slice(1)
    .map((row: any) => ({
      name: row[1],       // 成像名称
      area_lon: row[3],   // 经度
      area_lat: row[4],   // 纬度
      level: row[2],      // 优先级
      satellites: row[5]  // 卫星信息（如果存在）
    }))
    // 关键过滤：删除不含name字段或name为空的对象
    .filter(item => item.name && item.name.trim() !== '');
}


// cl-crud
const Crud = useCrud(
	{
		service: service.rs_poi.poi,
	},
	(app) => {
		app.refresh();
	},
);

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}
</script>