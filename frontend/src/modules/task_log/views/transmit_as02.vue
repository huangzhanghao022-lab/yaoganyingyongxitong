<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<cl-search ref="Search" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'task_log-transmit_as02',
});

import { useCrud, useTable, useUpsert, useSearch } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { reactive } from 'vue';

const { service } = useCool();
const { t } = useI18n();

const options = reactive({
	status: [
		{ label: t('指令已生成'), value: 0 },
		{ label: t('指令已挂载'), value: 1 },
		{ label: t('指令已上注'), value: 2 },
		{ label: t('数传执行完成'), value: 3 },
		{ label: t('任务取消'), value: 4 },
	],
});

const Upsert = useUpsert({
	items: [
		{
			label: t('卫星代号'),
			prop: 'satelliteCode',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t('数传站名称'),
			prop: 'transmitStationName',
			component: { name: 'el-input', props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t('数传时间'),
			prop: 'transmitTime',
			component: { name: 'el-date-picker', props: { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' } },
			span: 12,
			required: true,
		},
		{
			label: t('数传站经度'),
			prop: 'transmitStationLongitude',
			hook: 'number',
			component: {
				name: 'el-input-number',
				props: { min: -180, max: 180, step: 0.000001, precision: 6 },
			},
			span: 12,
			required: false,
		},
		{
			label: t('数传站纬度'),
			prop: 'transmitStationLatitude',
			hook: 'number',
			component: {
				name: 'el-input-number',
				props: { min: -90, max: 90, step: 0.000001, precision: 6 },
			},
			span: 12,
			required: false,
		},
		{
			label: t('数传站高度'),
			prop: 'transmitStationHeight',
			hook: 'number',
			component: { name: 'el-input-number', props: { step: 0.01, precision: 2 } },
			span: 12,
			required: false,
		},
		{
			label: t('数传文件号'),
			prop: 'transmitFileNumber',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: t('支持范围或逗号分隔列表，如 65-96 或 65,73,81') },
			},
			span: 12,
			required: true,
		},
		{
			label: t('数传执行时间'),
			prop: 'transmitExecutionTime',
			component: { name: 'el-date-picker', props: { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss' } },
			span: 12,
			required: false,
		},
		{
			label: t('指令链id'),
			prop: 'commandChainId',
			component: {
				name: 'el-input',
				props: { clearable: true, placeholder: t('可为空，后端自动关联或补充') },
			},
			span: 12,
			required: false,
		},
		{
			label: t('状态'),
			prop: 'status',
			component: { name: 'cl-select', props: { options: options.status } },
			value: 0,
			span: 12,
			required: true,
		},
	],
});

const Table = useTable({
	columns: [
		{ type: 'selection' },
		{ label: t('卫星代号'), prop: 'satelliteCode', minWidth: 140 },
		{ label: t('数传站名称'), prop: 'transmitStationName', minWidth: 140 },
		{ label: t('数传时间'), prop: 'transmitTime', minWidth: 170, sortable: 'custom', component: { name: 'cl-date-text' } },
		{ label: t('数传站经度'), prop: 'transmitStationLongitude', minWidth: 140, sortable: 'custom' },
		{ label: t('数传站纬度'), prop: 'transmitStationLatitude', minWidth: 140, sortable: 'custom' },
		{ label: t('数传站高度'), prop: 'transmitStationHeight', minWidth: 140, sortable: 'custom' },
		{ label: t('数传文件号'), prop: 'transmitFileNumber', minWidth: 160 },
		{
			label: t('数传执行时间'),
			prop: 'transmitExecutionTime',
			minWidth: 170,
			sortable: 'custom',
			component: { name: 'cl-date-text' },
		},
		{ label: t('指令链id'), prop: 'commandChainId', minWidth: 160 },
		{ label: t('状态'), prop: 'status', minWidth: 120, dict: options.status },
		{ label: t('创建时间'), prop: 'createTime', minWidth: 170, sortable: 'desc', component: { name: 'cl-date-text' } },
		{ label: t('更新时间'), prop: 'updateTime', minWidth: 170, sortable: 'custom', component: { name: 'cl-date-text' } },
		{ type: 'op', buttons: ['edit', 'delete'] },
	],
});

const Search = useSearch();

const Crud = useCrud(
	{
		service: service.task_log.transmit_as02,
		onDelete(selectionRows) {
			const rows = Array.isArray(selectionRows) ? selectionRows : selectionRows ? [selectionRows] : [];
			const times = rows.map((row: any) => row?.transmitTime).filter((time: any) => !!time);
			if (!times.length) {
				// @ts-ignore
				Crud.value?.app?.message?.warning?.(t('请选择要删除的任务'));
				return;
			}
			return service
				.request({
					url: '/admin/task_log/task_manage/delete',
					method: 'POST',
					data: { satellite: 'AS02', type: 'transfer', times },
				})
				.then(() => {
					// @ts-ignore
					Crud.value?.app?.message?.success?.(t('删除成功'));
					Crud.value?.refresh();
				});
		},
	},
	app => {
		app.refresh();
	},
);
</script>
