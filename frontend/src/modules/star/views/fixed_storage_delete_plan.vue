<template>
	<cl-crud ref="Crud">
		<cl-row>
			<el-radio-group v-model="currentName" size="small" @change="refresh" style="margin-left: 10px">
				<el-radio-button v-for="item in options.name" :key="item.value" :label="item.value">
					{{ item.label }}
				</el-radio-button>
			</el-radio-group>

			<cl-flex1 />

			<cl-refresh-btn />
			<el-button type="primary" plain @click="openTaskDialog" style="margin-left: 8px">
				制作固存删除任务
			</el-button>
		</cl-row>

		<cl-row>
			<cl-table ref="Table" @selection-change="onSelectionChange" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>
	</cl-crud>

	<el-dialog v-model="taskDialog.open" title="制作固存删除任务" width="520px" :close-on-click-modal="false">
		<el-form label-width="120px" :model="taskDialog.form">
			<el-form-item label="选择卫星">
				<el-select v-model="taskDialog.form.satellite" style="width: 160px" disabled>
					<el-option label="AS02" value="AS02" />
					<el-option label="AS03" value="AS03" />
				</el-select>
			</el-form-item>
			<el-form-item label="起始指令号" required>
				<el-input v-model="taskDialog.form.commandId" placeholder="请输入起始指令号" />
			</el-form-item>
			<el-form-item label="开始时间" required>
				<el-date-picker
					v-model="taskDialog.form.startTime"
					type="datetime"
					value-format="YYYY-MM-DD HH:mm:ss"
					placeholder="请选择开始时间"
					style="width: 240px"
				/>
			</el-form-item>
			<el-form-item label="指令链分割条数">
				<el-input v-model="taskDialog.form.segmentCount" placeholder="30" />
			</el-form-item>
			<el-form-item label="指令链间隔(s)">
				<el-input v-model="taskDialog.form.interval" placeholder="2" />
			</el-form-item>
			<el-form-item v-if="taskDialog.form.satellite === 'AS03'" label="是否格式化固存">
				<el-radio-group v-model="taskDialog.form.formatStorage">
					<el-radio :label="true">是</el-radio>
					<el-radio :label="false">否</el-radio>
				</el-radio-group>
			</el-form-item>
			<el-form-item v-if="taskDialog.form.satellite === 'AS03'" label="删除数据选择">
				<el-select v-model="taskDialog.form.deleteScope" style="width: 160px" placeholder="请选择">
					<el-option label="平台" value="平台" />
					<el-option label="载荷" value="载荷" />
				</el-select>
			</el-form-item>
			<el-form-item label="开始文件号" required>
				<el-input v-model="taskDialog.form.startFileNo" placeholder="自动填充" />
			</el-form-item>
			<el-form-item label="结束文件号" required>
				<el-input v-model="taskDialog.form.endFileNo" placeholder="自动填充" />
			</el-form-item>
		</el-form>

		<el-divider />
		<el-form label-width="120px">
			<el-form-item label="任务摘要">
				<el-input
					type="textarea"
					:autosize="{ minRows: 2, maxRows: 4 }"
					v-model="taskDialog.form.summary"
					readonly
					placeholder="生成指令后自动填充摘要"
				/>
			</el-form-item>
		</el-form>

		<template #footer>
			<el-space>
				<el-button @click="taskDialog.open = false">取消</el-button>
				<el-button type="primary" @click="onGenerateTask">生成指令</el-button>
			</el-space>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
defineOptions({
	name: "star-fixed-storage-delete-plan",
});

import { useCrud, useTable } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { number } from "echarts";
import { config as appConfig } from "/@/config";
import { request } from "/@/cool/service/request";

const TOKEN_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token";
const COMMAND_API_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/chains/create-with-template";
const DELETE_TEMPLATE_AS02 = "673c2d9049b1f446adc4623a";
const DELETE_TEMPLATE_AS03 = "673c2d8f49b1f446adc46233";
const DELETE_COMMAND_NAME = "删除固存";
const TOKEN_CREDENTIALS = {
	username: "02ptemplate@yinhe.ht",
	password: "123456",
	loginType: 2,
};

const { service } = useCool();
const { t } = useI18n();

const currentName = ref(0);
const selection = ref<any[]>([]);
const DELETE_PLAN_CACHE_KEY = "fixed_storage_delete_plan_cache_v1";
const DELETE_PLAN_RELOAD_FLAG = "__fixed_storage_delete_plan_reload_handled";

const isPayload = computed(() => currentName.value === 0 || currentName.value === 2);
const isPlatform = computed(() => !isPayload.value);
const startFileNoLabel = computed(() => (currentName.value === 0 ? t("起始文件号") : t("文件号")));
const endFileNoHidden = computed(() => currentName.value !== 0);

const options = reactive({
	name: [
		{ label: t("AS02载荷固存表"), value: 0 },
		{ label: t("AS02平台固存表"), value: 1 },
		{ label: t("AS03载荷固存表"), value: 2 },
		{ label: t("AS03平台固存表"), value: 3 },
	],
	status: [
		{ label: t("空"), value: 0, type: "info" },
		{ label: t("待写入"), value: 1, type: "primary" },
		{ label: t("已写入待数传"), value: 2, type: "warning" },
		{ label: t("已数传待反馈"), value: 3, color: "#f78fb3" },
		{ label: t("解析有问题"), value: 4, type: "danger" },
		{ label: t("已重传待反馈"), value: 5, type: "danger" },
		{ label: t("已数传待删除"), value: 6, type: "success" },
		{ label: t("已安排数传"), value: 7, type: "primary" },
	],
});

const Table = useTable({
	columns: [
		{ type: "selection", width: 48 },
		{ label: t("编号"), prop: "code", minWidth: 140 },
		{
			label: t("目标名称"),
			prop: "targetName",
			minWidth: 140,
			formatter: (row: any) => row?.targetName || "-",
			hidden: isPlatform,
		},
		{
			label: t("平台文件名称"),
			prop: "fileName",
			minWidth: 140,
			formatter: (row: any) => row?.fileName || "-",
			hidden: isPayload,
		},
		{
			label: t("成像时间"),
			prop: "imagingTime",
			minWidth: 170,
			formatter: (row: any) => row?.imagingTime || "-",
			hidden: isPlatform,
		},
		{
			label: t("写入时间"),
			prop: "executingTime",
			minWidth: 170,
			formatter: (row: any) => row?.executingTime || "-",
			hidden: isPayload,
		},
		{
			label: startFileNoLabel,
			prop: "startFileNo",
			minWidth: 140,
			sortable: "custom",
		},
		{
			label: t("结束文件号"),
			prop: "endFileNo",
			minWidth: 140,
			sortable: "custom",
			hidden: endFileNoHidden,
		},
		{
			label: t("状态"),
			prop: "status",
			minWidth: 120,
			dict: options.status,
		},
		{
			label: t("更新时间"),
			prop: "updateTime",
			minWidth: 170,
			sortable: "custom",
			component: { name: "cl-date-text" },
		},
	],
	props: {
		border: true,
	},
});

const Crud = useCrud(
	{
		service: service.star.fixed_storage_table,
		onRefresh(params, { next }) {
			return next({ ...params, name: currentName.value });
		},
	},
	(app) => {
		app.refresh();
	},
);

function refresh(params?: any) {
	Crud.value?.refresh(params);
}

function onSelectionChange(rows: any[]) {
	selection.value = rows || [];
}

const taskDialog = reactive({
	open: false,
	form: {
		satellite: "AS02",
		commandId: "",
		startTime: "",
		segmentCount: "30",
		interval: "2",
		formatStorage: false,
		deleteScope: "平台",
		startFileNo: "",
		endFileNo: "",
		summary: "",
	},
});

function detectPageReload(): boolean {
	if (typeof window === "undefined" || typeof performance === "undefined") return false;
	const entries = performance.getEntriesByType?.("navigation") || [];
	const firstEntry = entries[0] as PerformanceNavigationTiming | undefined;
	if (firstEntry && typeof firstEntry.type === "string") return firstEntry.type === "reload";
	const nav = (performance as any).navigation;
	if (nav?.type != null && nav?.TYPE_RELOAD != null) return nav.type === nav.TYPE_RELOAD;
	return false;
}

const isDeletePlanReload = detectPageReload();
if (isDeletePlanReload && typeof window !== "undefined") {
	const win = window as any;
	if (!win[DELETE_PLAN_RELOAD_FLAG]) {
		try {
			window.localStorage.removeItem(DELETE_PLAN_CACHE_KEY);
		} catch (err) {
			console.warn("[delete-plan] clear cache on reload failed", err);
		}
		win[DELETE_PLAN_RELOAD_FLAG] = true;
	}
}

function restoreDeletePlanCache() {
	if (typeof window === "undefined") return;
	const raw = window.localStorage.getItem(DELETE_PLAN_CACHE_KEY);
	if (!raw) return;
	try {
		const payload = JSON.parse(raw);
		if (typeof payload?.currentName === "number") currentName.value = payload.currentName;
		if (payload?.form) {
			Object.assign(taskDialog.form, payload.form);
		}
	} catch (err) {
		console.warn("[delete-plan] restore cache failed", err);
	}
}

function persistDeletePlanCache() {
	if (typeof window === "undefined") return;
	const snapshot = {
		currentName: currentName.value,
		form: { ...taskDialog.form },
	};
	try {
		window.localStorage.setItem(DELETE_PLAN_CACHE_KEY, JSON.stringify(snapshot));
	} catch (err) {
		console.warn("[delete-plan] persist cache failed", err);
	}
}

restoreDeletePlanCache();

watch(
	[currentName, () => taskDialog.form],
	() => {
		persistDeletePlanCache();
	},
	{ deep: true }
);

function openTaskDialog() {
	const sat = currentName.value === 0 || currentName.value === 1 ? "AS02" : "AS03";
	taskDialog.form.satellite = sat;
	taskDialog.form.deleteScope = isPayload.value ? "载荷" : "平台";
	const { startFileNo, endFileNo } = computeSelectedRange();
	taskDialog.form.startFileNo = startFileNo;
	taskDialog.form.endFileNo = endFileNo;
	taskDialog.form.summary = "";
	taskDialog.open = true;
}

function computeSelectedRange() {
	if (!selection.value.length) {
		ElMessage.warning("请先选择至少一行固存记录");
		return { startFileNo: "", endFileNo: "" };
	}
	let minStart: number | null = null;
	let maxEnd: number | null = null;
	for (const row of selection.value) {
		const s = Number(row?.startFileNo ?? row?.start_file_no);
		const e = Number(row?.endFileNo ?? row?.end_file_no);
		if (Number.isFinite(s)) {
			minStart = minStart == null ? s : Math.min(minStart, s);
		}
		if (Number.isFinite(e)) {
			maxEnd = maxEnd == null ? e : Math.max(maxEnd, e);
		}
	}
	return {
		startFileNo: minStart == null ? "" : String(minStart),
		endFileNo: maxEnd == null ? "" : String(maxEnd),
	};
}

function onGenerateTask() {
	if (!taskDialog.form.commandId) {
		ElMessage.warning("请填写起始指令号");
		return;
	}
	if (!taskDialog.form.startTime) {
		ElMessage.warning("请选择开始时间");
		return;
	}
	if (!taskDialog.form.startFileNo || !taskDialog.form.endFileNo) {
		ElMessage.warning("请确认已选择固存行，自动填充开始/结束文件号");
		return;
	}
	if (!isFutureOrNow(taskDialog.form.startTime)) {
		ElMessage.warning("开始时间不能早于当前时间");
		return;
	}
	const startNo = Number(taskDialog.form.startFileNo);
	const endNo = Number(taskDialog.form.endFileNo);
	const jdyszl = Number(taskDialog.form.commandId);
	if (!Number.isFinite(startNo) || !Number.isFinite(endNo)) {
		ElMessage.warning("开始/结束文件号需为数字");
		return;
	}
	if (startNo >= endNo) {
		ElMessage.warning("开始文件号必须小于结束文件号");
		return;
	}
	const intervalVal = Number(taskDialog.form.interval);
	if (!Number.isFinite(intervalVal)) {
		ElMessage.warning("指令链间隔需为数字");
		return;
	}
	if (jdyszl < 3) {
		ElMessage.warning("绝对延时指令不能小于3");
		return;
	}

	createDeleteCommand().catch((err) => {
		console.error("[delete-plan] create command failed", err);
		ElMessage.error(err?.message || "生成指令失败");
	});
}

async function createDeleteCommand() {
	const satellite = taskDialog.form.satellite;
	const token = await acquireToken();
	const body = satellite === "AS03" ? buildDeleteBodyAs03(taskDialog.form) : buildDeleteBodyAs02(taskDialog.form);

	await validateCommandRequest("delete", satellite, body);
	const resp = await fetch(COMMAND_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-web-token": token,
		},
		body: JSON.stringify(body),
	});

	if (!resp.ok) {
		const txt = await resp.text();
		throw new Error(txt || `HTTP ${resp.status}`);
	}

	ElMessage.success("指令已生成并提交");
	taskDialog.form.summary = buildSummary(taskDialog.form);
}

async function acquireToken(): Promise<string> {
	const resp = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(TOKEN_CREDENTIALS),
	});
	const data = await resp.json();
	const token = data?.data?.token ?? data?.token ?? data?.data;
	if (!token) throw new Error("获取 token 失败");
	return token;
}

function buildDeleteBodyAs02(form: typeof taskDialog.form) {
	return {
		spacecraftCode: form.satellite || "",
		templateId: DELETE_TEMPLATE_AS02,
		folderId: "6731752608e123893cf92873",
		name: buildCommandName(form),
		start_file: String(form.startFileNo || ""),
		start_seq: String(form.commandId || ""),
		end_file: String(form.endFileNo || ""),
		start_time: toIsoString(form.startTime),
	};
}

function buildDeleteBodyAs03(form: typeof taskDialog.form) {
	return {
		spacecraftCode: form.satellite || "",
		templateId: DELETE_TEMPLATE_AS03,
		folderId: "6731755b08e123893cf92878",
		name: buildCommandName(form),
		end_file: String(form.endFileNo || ""),
		start_file: String(form.startFileNo || ""),
		module: mapModule(form.deleteScope),
		t0: toIsoString(form.startTime),
		start_seq: String(form.commandId || ""),
	};
}

function mapModule(scope: string) {
	if (scope === "载荷") return "01";
	return "00";
}

function buildCommandName(form: typeof taskDialog.form) {
	const time = form.startTime || "";
	return `${DELETE_COMMAND_NAME}-${time}`;
}

function toIsoString(val: string) {
	if (!val) return "";
	const normalized = val.includes("T") ? val : val.replace(" ", "T");
	const date = new Date(normalized);
	return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function buildSummary(form: typeof taskDialog.form) {
	const scope = form.deleteScope === "载荷" ? "载荷" : "平台";
	const start = form.startFileNo || "";
	const end = form.endFileNo || "";
	const time = form.startTime || "";
	const execTime = time ? time.replace("T", " ") : "";
	return `上注${scope}固存删除任务，删除文件号${start}~${end}，任务执行时间：${execTime}`;
}

function isFutureOrNow(time: string) {
	if (!time) return false;
	const normalized = time.includes("T") ? time : time.replace(" ", "T");
	const ts = new Date(normalized).getTime();
	if (Number.isNaN(ts)) return false;
	return ts >= Date.now() - 1000;
}

async function validateCommandRequest(type: "image" | "transfer" | "delete", satellite: string, params: any) {
	const payload = { type, satellite, params };
	const url = `${appConfig.baseUrl}/admin/task/command/validate`;
	try {
		const res = await request({
			url,
			method: "POST",
			data: payload,
			NProgress: false,
		} as any);
		const result = (res as any)?.data ?? res;
		if (result?.ok === false && Array.isArray(result?.errors)) {
			const msg = result.errors.map((e: any) => `${e.field}: ${e.message}`).join("；");
			throw new Error(msg || "指令参数校验未通过");
		}
	} catch (err: any) {
		throw new Error(err?.message || "指令参数校验失败");
	}
}
</script>
