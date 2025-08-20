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
	name: "rs-image-request-list-accept",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import { reactive } from "vue";
import UserSelect from "/$/user/components/user-select.vue";

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	imagingMode: [
		{ label: t("光学"), value: 0 },
		{ label: t("雷达"), value: 1 },
		{ label: t("红外"), value: 2 },
		{ label: t("多光谱"), value: 3 },
	],
	executionStatus: [
		{ label: t("已创建"), value: 0 },
		{ label: t("已提交"), value: 1 },
		{ label: t("已接收"), value: 2 },
		{ label: t("执行中"), value: 3 },
		{ label: t("解析中"), value: 4 },
		{ label: t("已完成"), value: 5 },
		{ label: t("已取消"), value: 6 },
		{ label: t("已终止"), value: 7 },
	],
	taskPriority: [
		{ label: t("低"), value: 0 },
		{ label: t("中"), value: 1 },
		{ label: t("高"), value: 2 },
		{ label: t("热点"), value: 3 },
	],
});

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
			label: t("需求编号"),
			prop: "requestNo",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("成像模式"),
			prop: "imagingMode",
			component: { name: "el-radio-group", options: options.imagingMode },
			value: 0,
			required: true,
		},
		{
			label: t("成像时长(秒)"),
			prop: "imagingDuration",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("执行状态"),
			prop: "executionStatus",
			component: {
				name: "cl-select",
				props: { options: options.executionStatus },
			},
			value: 0,
			span: 12,
			required: true,
		},
		{
			label: t("选择成像点"),
			prop: "poiId",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("成像点名称"),
			prop: "poiName",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("经度"),
			prop: "longitude",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("纬度"),
			prop: "latitude",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
			required: true,
		},
		{
			label: t("任务优先级"),
			prop: "taskPriority",
			component: {
				name: "el-radio-group",
				options: options.taskPriority,
			},
			value: 0,
			required: true,
		},
		{
			label: t("最小侧摆角"),
			prop: "minSidelobeAngle",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("最大侧摆角"),
			prop: "maxSidelobeAngle",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("最小太阳高度角"),
			prop: "minSunElevationAngle",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("最大太阳高度角"),
			prop: "maxSunElevationAngle",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("最大云量"),
			prop: "maxCloudCover",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("任务截止时间"),
			prop: "taskDeadlineTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
		},
		{
			label: t("计划成像时间"),
			prop: "plannedImagingTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
		},
		{
			label: t("计划数传时间"),
			prop: "plannedDataTransmissionTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
		},
		{
			label: t("预计完成时间"),
			prop: "estimatedCompletionTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
		},
		{
			label: t("任务创建时间"),
			prop: "taskCreationTime",
			component: {
				name: "el-date-picker",
				props: { type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss" },
			},
			span: 12,
			required: true,
		},
		{
			label: t("备注"),
			prop: "remark",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("反馈"),
			prop: "feedback",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("快视图"),
			prop: "quickView",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("图像地址"),
			prop: "imageAddress",
			component: { name: "el-input", props: { clearable: true } },
			span: 12,
		},
		{
			label: t("选择所属用户"),
			prop: "userId",
			component: { vm: UserSelect },
			required: true,
		},
	],
});

// cl-table
const Table = useTable({
	columns: [
		{ type: "selection" },
		{ label: t("卫星代号"), prop: "satelliteCode", minWidth: 120 },
		{ label: t("需求编号"), prop: "requestNo", minWidth: 120 },
		{
			label: t("成像模式"),
			prop: "imagingMode",
			minWidth: 120,
			dict: options.imagingMode,
		},
		{ label: t("成像时长(秒)"), prop: "imagingDuration", minWidth: 120 },
		{
			label: t("执行状态"),
			prop: "executionStatus",
			minWidth: 120,
			dict: options.executionStatus,
		},
		{ label: t("成像点id"), prop: "poiId", minWidth: 120 },
		{ label: t("成像点名称"), prop: "poiName", minWidth: 120 },
		{ label: t("经度"), prop: "longitude", minWidth: 120 },
		{ label: t("纬度"), prop: "latitude", minWidth: 120 },
		{
			label: t("任务优先级"),
			prop: "taskPriority",
			minWidth: 120,
			dict: options.taskPriority,
		},
		{ label: t("最小侧摆角"), prop: "minSidelobeAngle", minWidth: 120 },
		{ label: t("最大侧摆角"), prop: "maxSidelobeAngle", minWidth: 120 },
		{
			label: t("最小太阳高度角"),
			prop: "minSunElevationAngle",
			minWidth: 120,
		},
		{
			label: t("最大太阳高度角"),
			prop: "maxSunElevationAngle",
			minWidth: 120,
		},
		{ label: t("最大云量"), prop: "maxCloudCover", minWidth: 120 },
		{
			label: t("任务截止时间"),
			prop: "taskDeadlineTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{
			label: t("计划成像时间"),
			prop: "plannedImagingTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{
			label: t("计划数传时间"),
			prop: "plannedDataTransmissionTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{
			label: t("预计完成时间"),
			prop: "estimatedCompletionTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{
			label: t("任务创建时间"),
			prop: "taskCreationTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
		{ label: t("备注"), prop: "remark", minWidth: 120 },
		{ label: t("反馈"), prop: "feedback", minWidth: 120 },
		{ label: t("快视图"), prop: "quickView", minWidth: 120 },
		{ label: t("图像地址"), prop: "imageAddress", minWidth: 120 },
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
		service: service.rs_image_request.imageRequest,
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
