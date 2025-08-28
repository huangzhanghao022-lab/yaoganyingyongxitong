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
	name: "task-as02",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import { reactive } from "vue";

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	status: [
		{ label: t("需求待响应"), value: 0 },
		{ label: t("需求已接收"), value: 1 },
		{ label: t("需求已完成"), value: 2 },
	],
});

// cl-upsert
const Upsert = useUpsert({
	items: [
		{
			label: t("卫星代号"),
			prop: "satelliteCode",
			component: { name: "el-input", props: { clearable: true,disabled: true  } },
			value: "AS02", // 默认值
			span: 12,
			required: true,
		},
		{
			label: t("成像目标点"),
			prop: "imagingTarget",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("经度"),
			prop: "longitude",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("纬度"),
			prop: "latitude",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("云量"),
			prop: "cloudCoverage",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("太阳高度角"),
			prop: "sunElevation",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("星历时间"),
			prop: "ephemerisTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
			required: true,
		},
		{
			label: t("成像时间"),
			prop: "imagingTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
			required: true,
		},
		{
			label: t("状态"),
			prop: "status",
			component: { name: "el-radio-group", options: options.status },
			value: 0,
			required: true,
		},
		{
			label: t("成像缩略图地址链接"),
			prop: "thumbnailUrl",
			component: { name: "cl-upload" },
		},
	],
});

// cl-table
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: t("卫星代号"), prop: "satelliteCode", minWidth: 140 },
		{ label: t("成像目标点"), prop: "imagingTarget", minWidth: 140 },
		{
			label: t("经度"),
			prop: "longitude",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("纬度"),
			prop: "latitude",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("云量"),
			prop: "cloudCoverage",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("太阳高度角"),
			prop: "sunElevation",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("星历时间"),
			prop: "ephemerisTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{
			label: t("成像时间"),
			prop: "imagingTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{
			label: t("状态"),
			prop: "status",
			minWidth: 120,
			dict: options.status,
		},
		{
			label: t("成像缩略图地址链接"),
			prop: "thumbnailUrl",
			minWidth: 100,
			component: { name: "cl-image", props: { size: 60 } },
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
		service: service.task.as02,
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
