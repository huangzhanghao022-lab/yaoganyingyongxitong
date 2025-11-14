<template>
	<cl-crud ref="Crud">
		<cl-row>
			<!-- 刷新按钮 -->
			<cl-refresh-btn />
			<!-- 新增按钮 -->
			<cl-add-btn />
			<!-- 删除按钮 -->
			<cl-multi-delete-btn />
			<el-button type="primary" plain @click="openPlanDialog">{{ t("生成计划") }}</el-button>
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
	<el-dialog v-model="planDialog.open" :title="t('生成计划')" width="420px">
		<el-form label-width="90px">
			<el-form-item :label="t('日期')">
				<el-date-picker v-model="planDialog.date" type="date" value-format="YYYY-MM-DD" :placeholder="t('请选择日期')" style="width: 100%" />
			</el-form-item>
		</el-form>
		<template #footer>
			<el-space>
				<el-button @click="onQueryPlan">{{ t('查询测控计划') }}</el-button>
				<el-button type="primary" @click="onSubmitPlan">{{ t('录入计划') }}</el-button>
			</el-space>
		</template>
	</el-dialog>

</template>

<script lang="ts" setup>
defineOptions({
	name: "daily-plan-as02",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import { reactive } from "vue";
import { ElMessage } from "element-plus";

const { service } = useCool();
const { t } = useI18n();

const planDialog = reactive({
	open: false,
	date: "",
});

function splitTransit(value: unknown): [string, string] {
	if (typeof value !== "string") {
		return ["", ""];
	}
	// 插入的分隔符位于首个时间段长度（19）之后的第一个连字符
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
			minWidth: 90,
			sortable: "custom",
			component: {
				name: "cl-date-text",
				props: { format: "YYYY-MM-DD" },
			},
		},
		{ label: t("值班人"), prop: "dutyOfficer", minWidth: 60 },
		{ label: t("测控站"), prop: "telemetryStation", minWidth: 60 },
		{
			label: t("过境时间"),
			prop: "transitTime",
			minWidth: 110,
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
			minWidth: 60,
			sortable: "custom",
		},
		{
			label: t("测控信息"),
			prop: "telemetryInfo",
			minWidth: 450,
			className: "dp-telemetry-column",
			align: "left",
		},
		{ type: "op", buttons: ["edit", "delete"] },
	],
});

// cl-search
const Search = useSearch();

// cl-crud
const Crud = useCrud(
	{
		service: service.daily_plan.as02,
	},
	(app) => {
		app.refresh();
	},
);

// 刷新
function refresh(params?: any) {
	Crud.value?.refresh(params);
}

function openPlanDialog() {
	if (!planDialog.date) {
		planDialog.date = new Date().toISOString().slice(0, 10);
	}
	planDialog.open = true;
}

function ensureDateSelected() {
	if (!planDialog.date) {
		ElMessage.warning(t("请选择日期"));
		return false;
	}
	return true;
}

function onQueryPlan() {
	if (!ensureDateSelected()) {
		return;
	}
	ElMessage.info(t("查询测控计划功能开发中"));
}

function onSubmitPlan() {
	if (!ensureDateSelected()) {
		return;
	}
	ElMessage.success(t("录入计划功能开发中"));
	planDialog.open = false;
}
</script>

<style scoped>
:deep(.dp-telemetry-column .cell) {
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
