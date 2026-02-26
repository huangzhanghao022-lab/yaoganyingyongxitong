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
	name: "task_log-orbit_control_as02",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";

const { service } = useCool();
const { t } = useI18n();

const statusOptions = [
	{ label: t("指令已生成"), value: 0 },
	{ label: t("指令已挂载"), value: 1 },
	{ label: t("指令已上注"), value: 2 },
	{ label: t("任务执行完成"), value: 3 },
	{ label: t("任务取消"), value: 4 },
];

const Upsert = useUpsert({
	items: [
		{ label: t("卫星代号"), prop: "satelliteCode", component: { name: "el-input" }, span: 12, required: true },
		{
			label: t("任务执行时间"),
			prop: "taskExecutionTime",
			component: { name: "el-date-picker", props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" } },
			span: 12,
			required: true,
		},
		{
			label: t("轨控开始时间"),
			prop: "orbitStartTime",
			component: { name: "el-date-picker", props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" } },
			span: 12,
			required: true,
		},
		{
			label: t("轨控结束时间"),
			prop: "orbitEndTime",
			component: { name: "el-date-picker", props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" } },
			span: 12,
			required: true,
		},
		{ label: t("持续时间(s)"), prop: "durationSeconds", component: { name: "el-input" }, span: 12 },
		{ label: t("模板ID"), prop: "templateId", component: { name: "el-input" }, span: 12 },
		{ label: t("目录ID"), prop: "folderId", component: { name: "el-input" }, span: 12 },
		{ label: t("任务名称"), prop: "taskName", component: { name: "el-input" }, span: 12 },
		{ label: t("来源文件名"), prop: "sourceFileName", component: { name: "el-input" }, span: 12 },
		{ label: t("批次ID"), prop: "batchId", component: { name: "el-input" }, span: 12 },
		{ label: t("指令链ID"), prop: "commandChainId", component: { name: "el-input" }, span: 12 },
		{
			label: t("状态"),
			prop: "status",
			value: 0,
			component: { name: "el-select", options: statusOptions },
			span: 12,
			required: true,
		},
		{ label: t("执行回填时间"), prop: "storageAppliedAt", component: { name: "el-input" }, span: 12 },
	],
});

const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: t("卫星代号"), prop: "satelliteCode", minWidth: 100 },
		{ label: t("任务执行时间"), prop: "taskExecutionTime", minWidth: 170, sortable: "custom", component: { name: "cl-date-text" } },
		{ label: t("轨控开始时间"), prop: "orbitStartTime", minWidth: 170, sortable: "custom", component: { name: "cl-date-text" } },
		{ label: t("轨控结束时间"), prop: "orbitEndTime", minWidth: 170, sortable: "custom", component: { name: "cl-date-text" } },
		{ label: t("持续时间(s)"), prop: "durationSeconds", minWidth: 110 },
		{ label: t("模板ID"), prop: "templateId", minWidth: 160 },
		{ label: t("目录ID"), prop: "folderId", minWidth: 160 },
		{ label: t("任务名称"), prop: "taskName", minWidth: 140 },
		{ label: t("来源文件名"), prop: "sourceFileName", minWidth: 160 },
		{ label: t("批次ID"), prop: "batchId", minWidth: 180 },
		{ label: t("指令链ID"), prop: "commandChainId", minWidth: 180 },
		{ label: t("状态"), prop: "status", minWidth: 120, dict: statusOptions },
		{ label: t("执行回填时间"), prop: "storageAppliedAt", minWidth: 170, component: { name: "cl-date-text" } },
		{ label: t("创建时间"), prop: "createTime", minWidth: 170, sortable: "desc", component: { name: "cl-date-text" } },
		{ label: t("更新时间"), prop: "updateTime", minWidth: 170, sortable: "custom", component: { name: "cl-date-text" } },
		{ type: "op", buttons: ["edit", "delete"] },
	],
});

const Search = useSearch();

const Crud = useCrud(
	{
		service: service.task_log.orbit_control_as02,
		onDelete(selectionRows) {
			const rows = Array.isArray(selectionRows) ? selectionRows : selectionRows ? [selectionRows] : [];
			const times = rows.map((row: any) => row?.taskExecutionTime).filter((time: any) => !!time);
			if (!times.length) {
				// @ts-ignore
				Crud.value?.app?.message?.warning?.(t("请选择要删除的任务"));
				return;
			}
			return service
				.request({
					url: "/admin/task_log/task_manage/delete",
					method: "POST",
					data: { satellite: "AS02", type: "orbit_control", times },
				})
				.then(() => {
					// @ts-ignore
					Crud.value?.app?.message?.success?.(t("删除成功"));
					Crud.value?.refresh();
				});
		},
	},
	(app) => {
		app.refresh();
	}
);
</script>
