<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<cl-flex1 />
			<!-- 条件搜索 -->
			<cl-search ref="Search" />
		</cl-row>

		<cl-row>
			<!-- 数据表格 -->
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<!-- 分页控件 -->
			<cl-pagination />
		</cl-row>

		<!-- 新增、编辑 -->
		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'rs-image-products'
});

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

// cl-upsert
const Upsert = useUpsert({
	items: [
		{
			label: t('需求编号'),
			prop: 'requestNo',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: true
		},
		{
			label: t('快视图'),
			prop: 'quickView',
			component: { name: 'el-input' }
		},
		{
			label: t('图像地址'),
			prop: 'imageAddress',
			component: { name: 'el-input' },
			required: true
		},
		{
			label: t('卫星代号'),
			prop: 'satelliteCode',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: true
		},
		{
			label: t('成像模式'),
			prop: 'imagingMode',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: true
		}
	]
});

// cl-table
const Table = useTable({
	columns: [
		{ label: t('#'), type: 'index' },
		{ label: t('需求ID'), prop: 'requestNo', minWidth: 140 },
		{
			label: t('快视图'),
			prop: 'quickView',
			minWidth: 100
		},
		{
			label: t('图像地址'),
			prop: 'imageAddress',
			minWidth: 100,
			component: { name: 'cl-image', props: { size: 60 } }
		},
		{ label: t('卫星代号'), prop: 'satelliteCode', minWidth: 120 },
		{ label: t('成像模式'), prop: 'imagingMode', minWidth: 120 },
		{
			label: t('创建时间'),
			prop: 'createTime',
			minWidth: 170,
			sortable: 'desc',
			component: { name: 'cl-date-text' }
		}
	]
});

// cl-search
const Search = useSearch();

// cl-crud
const Crud = useCrud(
	{
		service: service.rs_image_products.product
	},
	app => {
		app.refresh();
	}
);

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}
</script>
