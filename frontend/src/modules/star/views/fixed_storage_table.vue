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
	name: "star-fixed_storage_table",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import { reactive } from "vue";

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	name: [
		{ label: t("AS02载荷固存表"), value: 0 },
		{ label: t("AS02平台固存表"), value: 1 },
		{ label: t("AS03载荷固存表"), value: 2 },
		{ label: t("AS03平台固存表"), value: 3 },
	],
	status: [
		{ label: t("禁用"), value: 0, type: "danger" },
		{ label: t("启用"), value: 1, type: "success" },
	],
});

// cl-upsert
const Upsert = useUpsert({
	items: [
		{
			label: t("名称"),
			prop: "name",
			component: { name: "el-radio-group", options: options.name },
			required: true,
		},
		{
			label: t("编号"),
			prop: "code",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("目标名称"),
			prop: "targetName",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: false,
		},
		{
			label: t("成像时间"),
			prop: "imagingTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
			required: false,
		},
		{
			label: t("起始文件号"),
			prop: "startFileNo",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("结束文件号"),
			prop: "endFileNo",
			hook: "number",
			component: { name: "el-input-number", props: { min: 0 } },
			span: 12,
			required: true,
		},
		{
			label: t("状态"),
			prop: "status",
			component: { name: "el-radio-group", options: options.status },
			value: 1,
			required: true,
		},
	],
});

// cl-table
const Table = useTable({
	columns: [
		{ type: "selection" },
		//{ label: t("名称"), prop: "name", minWidth: 120, dict: options.name },
		{ label: t("编号"), prop: "code", minWidth: 140 },
		{
			label: "目标名称",
			prop: "targetName",
			minWidth: 140,
			formatter: (row) => {
				// 空值显示为 "-"
				return row.targetName ? row.targetName : '-'; 
			}
		},
		{
			label: "成像时间",
			prop: "imagingTime",
			minWidth: 170,
			formatter: (row) => {
				return row.imagingTime || '-';
			}
		},
		{
			label: t("起始文件号"),
			prop: "startFileNo",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("结束文件号"),
			prop: "endFileNo",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("状态"),
			prop: "status",
			minWidth: 120,
			dict: options.status,
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

const Crud = useCrud(
	{
		service: service.star.fixed_storage_table,

		// 新增自定义删除行为
		onDelete(ids, done) {
			const currentName = Search.value?.form?.name ?? 0;
			const pureIds = ids.map((item) =>
				typeof item === 'object' ? item.id : item
			);

			// 用内置 delete，不要自己拼 url
			service.star.fixed_storage_table
				.delete({ ids: pureIds, name: currentName })
				.then(() => {
					done();
				});
		}
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
