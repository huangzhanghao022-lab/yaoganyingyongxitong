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
	name: "daily_plan-as03",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";

const { service } = useCool();
const { t } = useI18n();

function splitTransit(value: unknown): [string, string] {
	if (typeof value !== "string") {
		return ["", ""];
	}
	const index = value.indexOf("-", 19);
	if (index === -1) {
		const trimmed = value.trim();
		return [trimmed, ""];
	}
	const start = value.slice(0, index).trim();
	const end = value.slice(index + 1).trim();
	return [start, end];
}

// cl-upsert
const Upsert = useUpsert({
	items: [
		{
			label: t("日期"),
			prop: "date",
			component: {
				name: "el-date-picker",
				props: { type: "date", valueFormat: "YYYY-MM-DD" },
			},
			span: 12,
			required: true,
		},
		{
			label: t("值班人"),
			prop: "dutyOfficer",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("测控站"),
			prop: "telemetryStation",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("过境时间"),
			prop: "transitTime",
			value: [],
			component: {
				name: "el-date-picker",
				props: {
					type: "datetimerange",
					valueFormat: "YYYY-MM-DD HH:mm:ss",
					unlinkPanels: true,
					startPlaceholder: t("开始时间"),
					endPlaceholder: t("结束时间"),
					rangeSeparator: t("至"),
				},
			},
			span: 24,
			required: true,
		},
		{
			label: t("仰角"),
			prop: "elevationAngle",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("测控信息"),
			prop: "telemetryInfo",
			component: {
				name: "el-input",
				props: { type: "textarea", rows: 4 },
			},
		},
	],
	onSubmit(form, { next }) {
		const { transitTime, ...rest } = form;
		const [start, end] = Array.isArray(transitTime) ? transitTime : [];
		const payload = {
			...rest,
			transitTime: start && end ? `${start}-${end}` : undefined,
		};
		next(payload);
	},
	onOpened(data) {
		const [start, end] = splitTransit(data?.transitTime);
		data.transitTime = start && end ? [start, end] : [];
	},
});

// cl-table
const Table = useTable({
	columns: [
		{ type: "selection" },
		{
			label: t("日期"),
			prop: "date",
			minWidth: 140,
			sortable: "custom",
			component: {
				name: "cl-date-text",
				props: { format: "YYYY-MM-DD" },
			},
		},
		{ label: t("值班人"), prop: "dutyOfficer", minWidth: 140 },
		{ label: t("测控站"), prop: "telemetryStation", minWidth: 120 },
		{
			label: t("过境时间"),
			prop: "transitTime",
			minWidth: 200,
			sortable: "custom",
			formatter(row) {
				const [start, end] = splitTransit(row.transitTime);
				if (start && end) {
					return `${start} ~ ${end}`;
				}
				return start || "-";
			},
		},
		{
			label: t("仰角"),
			prop: "elevationAngle",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("测控信息"),
			prop: "telemetryInfo",
			showOverflowTooltip: true,
			minWidth: 200,
		},
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
		service: service.daily_plan.as03,
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
