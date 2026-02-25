<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />
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
	name: "task_log-history_transfer_as03",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";

const { service } = useCool();
const { t } = useI18n();

// cl-upsert
const Upsert = useUpsert({
	items: [
		{
			label: t("卫星代号"),
			prop: "satelliteCode",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("任务执行时间"),
			prop: "taskExecutionTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
			required: true,
		},
		{
			label: t("开始指令号"),
			prop: "startCommandNo",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("日期范围"),
			prop: "date",
			component: {
				name: "el-date-picker",
				props: {
					type: "daterange",
					valueFormat: "YYYY-MM-DD 00:00:00",
					defaultTime: [
						"2000-01-31T16:00:00.000Z",
						"2000-02-01T15:59:59.000Z",
					],
				},
			},
			span: 12,
			required: true,
			hook: "datetimeRange",
		},
		{
			label: t("页数"),
			prop: "page",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("间隔(s)"),
			prop: "interval",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("平台选择(0:A,1:B)"),
			prop: "platform",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("目标名称"),
			prop: "targetName",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("选择模板"),
			prop: "templateId",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("选择目录"),
			prop: "folderId",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("任务名称"),
			prop: "taskName",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("选择指令链"),
			prop: "commandChainId",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("状态"),
			prop: "status",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("执行回填时间"),
			prop: "storageAppliedAt",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
	],
});

// cl-table
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: t("卫星代号"), prop: "satelliteCode", minWidth: 120 },
		{
			label: t("任务执行时间"),
			prop: "taskExecutionTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{ label: t("开始指令号"), prop: "startCommandNo", minWidth: 120 },
		{
			label: t("开始日期"),
			prop: "startDate",
			minWidth: 140,
			sortable: "custom",
			component: {
				name: "cl-date-text",
				props: { format: "YYYY-MM-DD" },
			},
		},
		{
			label: t("结束日期"),
			prop: "endDate",
			minWidth: 140,
			sortable: "custom",
			component: {
				name: "cl-date-text",
				props: { format: "YYYY-MM-DD" },
			},
		},
		{ label: t("页数"), prop: "page", minWidth: 120 },
		{ label: t("间隔(s)"), prop: "interval", minWidth: 120 },
		{ label: t("平台选择(0:A,1:B)"), prop: "platform", minWidth: 120 },
		{ label: t("目标名称"), prop: "targetName", minWidth: 120 },
		{ label: t("模板Id"), prop: "templateId", minWidth: 120 },
		{ label: t("目录Id"), prop: "folderId", minWidth: 120 },
		{ label: t("任务名称"), prop: "taskName", minWidth: 120 },
		{ label: t("指令链id"), prop: "commandChainId", minWidth: 120 },
		{ label: t("状态"), prop: "status", minWidth: 120 },
		{ label: t("执行回填时间"), prop: "storageAppliedAt", minWidth: 120 },
		{
			label: t("创建时间"),
			prop: "createTime",
			minWidth: 170,
			sortable: "desc",
			component: { name: "cl-date-text" },
		},
		{
			label: t("更新时间"),
			prop: "updateTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{ type: "op", buttons: ["edit", "delete"] },
	],
});

// cl-search
const Search = useSearch();

// cl-crud
const Crud = useCrud(
	{
		service: service.task_log.history_transfer_as03,
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
					data: { satellite: "AS03", type: "history_transfer", times },
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
	},
);

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}
</script>
