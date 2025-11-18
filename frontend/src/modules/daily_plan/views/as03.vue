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

	<el-dialog v-model="planDialog.open" :title="t('生成计划')" width="640px">
		<el-form label-width="90px">
			<el-form-item :label="t('日期')">
				<el-date-picker v-model="planDialog.date" type="date" value-format="YYYY-MM-DD" :placeholder="t('请选择日期')" style="width: 100%" />
			</el-form-item>
		</el-form>
	<div class="dp-duty-info">
		<span class="dp-duty-label">{{ t("值班人") }} :</span>
		<template v-if="planDialog.dutyOfficers.length">
			<el-tag v-for="name in planDialog.dutyOfficers" :key="name" size="small" effect="plain">
				{{ name }}
			</el-tag>
		</template>
		<span v-else class="dp-duty-empty">{{ t("暂无值班信息") }}</span>
	</div>
		<el-table
			v-if="planDialog.records.length || planDialog.loading"
			:data="planDialog.records"
			v-loading="planDialog.loading"
			size="small"
			border
			height="300px"
		>
			<el-table-column type="index" width="60" :label="t('#')" />
			<el-table-column :label="t('卫星代号')" min-width="70">
				<template #default="{ row }">
					{{ resolveSatelliteCode(row) }}
				</template>
			</el-table-column>
			<el-table-column :label="t('测控站')" min-width="180">
				<template #default="{ row }">
					{{ resolveAntennaName(row) }}
				</template>
			</el-table-column>
			<el-table-column :label="t('轨次开始')" min-width="160">
				<template #default="{ row }">
					{{ formatPlanTime(row.beginTime) }}
				</template>
			</el-table-column>
			<el-table-column :label="t('轨次结束')" min-width="160">
				<template #default="{ row }">
					{{ formatPlanTime(row.endTime) }}
				</template>
			</el-table-column>
			<el-table-column :label="t('最大仰角')" min-width="90">
				<template #default="{ row }">
					{{ formatAngle(resolveAngleMax(row)) }}
				</template>
			</el-table-column>
			<el-table-column :label="t('状态')" min-width="90">
				<template #default="{ row }">
					{{ row.stateName || row.state || '-' }}
				</template>
			</el-table-column>
		</el-table>
		<el-empty
			v-else
			:description="planDialog.loading ? t('查询中...') : t('暂无测控数据')"
			image-size="120"
		/>
		<template #footer>
			<el-space>
				<el-button @click="onQueryPlan">{{ t('查询测控计划') }}</el-button>
				<el-button type="primary" @click="onSubmitPlan" :loading="planDialog.submitting">{{ t('录入计划') }}</el-button>
			</el-space>
		</template>
	</el-dialog>
</template>

<script lang="ts" setup>
defineOptions({
	name: "daily-plan-as03",
});

import { useCrud, useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useCool } from "/@/cool";
import { useI18n } from "vue-i18n";
import { reactive } from "vue";
import { ElMessage } from "element-plus";
import { TELECONTROL_ANTENNA_MAP } from "./telecontrolAntennas";

const { service } = useCool();
const { t } = useI18n();

const planDialog = reactive({
	open: false,
	date: "",
	loading: false,
	records: [] as TelecontrolRecord[],
	dutyOfficers: [] as string[],
	submitting: false,
});

type TelecontrolRecord = {
	id?: string | number;
	missionName?: string;
	taskName?: string;
	targetName?: string;
	planBeginTime?: number | string;
	planEndTime?: number | string;
	beginTime?: number | string;
	endTime?: number | string;
	spacecraftId?: string | number;
	satelliteCode?: string;
	antennaName?: string;
	stationName?: string;
	antennaId?: string | number;
	state?: string | number;
	stateName?: string;
};

type DailyPlanPayload = {
	date: string;
	dutyOfficer: string;
	telemetryStation: string;
	transitTime: string;
	elevationAngle: number | null;
	telemetryInfo: string;
};

const TELECONTROL_TOKEN_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token";
const TELECONTROL_SEARCH_URLS = [
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
];
const DUTY_ROSTER_URLS = [
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search",
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search",
];
const TELECONTROL_CREDENTIALS = {
	username: "02ptemplate@yinhe.ht",
	password: "123456",
	loginType: 2,
};
const TELECONTROL_STATES = ["1", "2", "6"];
const AS03_SPACECRAFT_ID = "13";
const BEIJING_OFFSET = 8 * 60 * 60 * 1000;

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

function openPlanDialog() {
	if (!planDialog.date) {
		planDialog.date = new Date().toISOString().slice(0, 10);
	}
	planDialog.records = [];
	planDialog.dutyOfficers = [];
	planDialog.submitting = false;
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
	requestTelecontrolPlan()
		.catch((err) => {
			console.error("[daily-plan] telecontrol fetch failed", err);
			ElMessage.error(t("查询测控计划失败"));
		});
}

async function onSubmitPlan() {
	if (!ensureDateSelected()) {
		return;
	}
	if (!planDialog.records.length) {
		ElMessage.warning(t("暂无测控数据"));
		return;
	}
	const payload = buildPlanEntries();
	if (!payload.length) {
		ElMessage.warning(t("没有可录入的计划数据"));
		return;
	}
	if (planDialog.submitting) return;
	planDialog.submitting = true;
	try {
		await Promise.all(payload.map((item) => service.daily_plan.as03.add(item)));
		ElMessage.success(t("录入计划成功"));
		planDialog.open = false;
		refresh();
	} catch (err) {
		console.error("[daily-plan] submit failed", err);
		ElMessage.error(t("录入计划失败"));
	} finally {
		planDialog.submitting = false;
	}
}

function buildPlanEntries(): DailyPlanPayload[] {
	const date = planDialog.date;
	if (!date) return [];
	return planDialog.records
		.map((row) => buildPlanPayload(row, date))
		.filter((item): item is DailyPlanPayload => Boolean(item));
}

function buildPlanPayload(row: TelecontrolRecord, date: string): DailyPlanPayload | null {
	const station = resolveAntennaName(row);
	const transitTime = buildTransitRange(row);
	if (!transitTime) {
		return null;
	}
	return {
		date,
		dutyOfficer: planDialog.dutyOfficers.join("、") || "-",
		telemetryStation: station === "-" ? "" : station,
		transitTime,
		elevationAngle: resolveElevation(row),
		telemetryInfo: "",
	};
}

function buildTransitRange(row: TelecontrolRecord): string {
	const start = formatPlanTimeValue(row.beginTime);
	const end = formatPlanTimeValue(row.endTime);
	if (start && end) {
		return `${start}-${end}`;
	}
	return start || end || "";
}

async function requestTelecontrolPlan() {
	if (planDialog.loading) return;
	planDialog.loading = true;
	try {
		const token = await fetchTelecontrolToken();
		const [records, dutyOfficers] = await Promise.all([
			fetchTelecontrolRecords(token, planDialog.date, AS03_SPACECRAFT_ID),
			fetchDutyRoster(token, planDialog.date, AS03_SPACECRAFT_ID).catch((err) => {
				console.warn("[daily-plan] duty roster fetch failed", err);
				return [] as string[];
			}),
		]);
		planDialog.records = records;
		planDialog.dutyOfficers = dutyOfficers;
		if (!records.length) {
			ElMessage.info(t("所选日期暂无测控数据"));
		}
	} finally {
		planDialog.loading = false;
	}
}

async function fetchTelecontrolToken(): Promise<string> {
	const resp = await fetch(TELECONTROL_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(TELECONTROL_CREDENTIALS),
	});
	if (!resp.ok) {
		throw new Error(`token request failed: ${resp.status}`);
	}
	const result = await resp.json().catch(() => ({}));
	const token = result?.data?.token ?? result?.token ?? result?.data;
	if (!token) {
		throw new Error("token unavailable");
	}
	return token;
}

async function fetchTelecontrolRecords(token: string, date: string, spacecraftId: string): Promise<TelecontrolRecord[]> {
	const { begin, end } = buildUtcRange(date);
	const payload = {
		keyword: "",
		page: 1,
		pageSize: 20,
		states: TELECONTROL_STATES,
		beginTime: begin,
		endTime: end,
		antennaIds: [],
		spacecraftIds: [spacecraftId],
		order: 3,
	};

	let lastError: any = null;
	for (const url of TELECONTROL_SEARCH_URLS) {
		try {
			const resp = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-web-token": token,
				},
				body: JSON.stringify(payload),
			});
			if (!resp.ok) {
				throw new Error(`telecontrol search failed: ${resp.status}`);
			}
			const result = await resp.json().catch(() => ({}));
			const list = result?.data?.list ?? result?.data ?? result?.records ?? [];
			return Array.isArray(list) ? list : [];
		} catch (err) {
			lastError = err;
			console.warn("[daily-plan] telecontrol request failed via", url, err);
		}
	}
	throw lastError || new Error("telecontrol search failed");
}

async function fetchDutyRoster(token: string, date: string, spacecraftId: string): Promise<string[]> {
	const { begin, end } = buildBeijingRange(date);
	let lastError: any = null;
	for (const url of DUTY_ROSTER_URLS) {
		try {
			const resp = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-web-token": token,
				},
				body: JSON.stringify({
					keyword: "",
					spacecraftIds: [spacecraftId],
					page: 1,
					pageSize: 20,
					beginTime: begin,
					endTime: end,
				}),
			});
			if (!resp.ok) {
				throw new Error(`duty roster failed: ${resp.status}`);
			}
			const result = await resp.json().catch(() => ({}));
			const list = result?.data?.list ?? result?.data ?? result?.records ?? [];
			if (!Array.isArray(list)) return [];
			return list
				.map((item) => {
					const name = (item?.name ?? item?.dutyName ?? item?.dutyOfficer) as string | undefined;
					return name ? String(name).trim() : "";
				})
				.filter((name) => !!name);
		} catch (err) {
			lastError = err;
			console.warn("[daily-plan] duty roster request failed via", url, err);
		}
	}
	throw lastError || new Error("duty roster failed");
}

function buildUtcRange(date: string) {
	const begin = Date.parse(`${date}T00:00:00Z`);
	if (Number.isNaN(begin)) {
		throw new Error("invalid date");
	}
	return {
		begin: begin - BEIJING_OFFSET,
		end: begin - BEIJING_OFFSET + 24 * 60 * 60 * 1000,
	};
}

function buildBeijingRange(date: string) {
	const begin = Date.parse(`${date}T00:00:00+08:00`);
	if (Number.isNaN(begin)) {
		throw new Error("invalid date");
	}
	return {
		begin,
		end: begin + 24 * 60 * 60 * 1000,
	};
}

function formatPlanTime(value: unknown): string {
	return formatPlanTimeValue(value) ?? "-";
}

function resolveAntennaName(row: TelecontrolRecord): string {
	const id = getAntennaId(row);
	if (id) {
		const mapped = TELECONTROL_ANTENNA_MAP.get(id);
		if (mapped) {
			return mapped;
		}
	}
	return row.antennaName || row.stationName || "-";
}

function getAntennaId(row: TelecontrolRecord): string | undefined {
	const id = (row as any)?.antennaId ?? (row as any)?.antennaID ?? (row as any)?.antenna_id;
	if (id == null) return undefined;
	const str = String(id);
	return str ? str : undefined;
}

function resolveSatelliteCode(row: TelecontrolRecord): string {
	const raw = (row as any)?.spacecraftId ?? (row as any)?.spacecraftIDs ?? (row as any)?.spacecraftCode;
	const code = Number(raw);
	if (code === 12) return "AS02";
	if (code === 13) return "AS03";
	return row.missionName || row.taskName || row.targetName || "-";
}

function resolveStateLabel(row: TelecontrolRecord): string {
	return (row.stateName as string) || (row.state != null ? String(row.state) : "-");
}

function formatAngle(value: number | null | undefined): string {
	if (value == null) {
		return "-";
	}
	const num = Number(value);
	return Number.isFinite(num) ? `${num.toFixed(2)}°` : "-";
}

function formatPlanTimeValue(value: unknown): string | null {
	if (value == null) {
		return null;
	}
	const num = typeof value === "number" ? value : Number(value);
	const date = Number.isFinite(num) ? new Date(num) : new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
		date.getMinutes(),
	)}:${pad(date.getSeconds())}`;
}

function resolveAngleMax(row: TelecontrolRecord): number | null {
	const raw =
		(row as any)?.tracking?.angleMax?.el ??
		(row as any)?.angleMax ??
		(row as any)?.angle_max ??
		(row as any)?.maxAngle;
	const num = Number(raw);
	return Number.isFinite(num) ? num : null;
}

function resolveElevation(row: TelecontrolRecord): number | null {
	const angle = resolveAngleMax(row);
	return angle == null ? null : Math.round(angle);
}
</script>

<style scoped>
:deep(.dp-telemetry-column .cell) {
	white-space: pre-wrap;
	word-break: break-word;
}

.dp-duty-info {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin-bottom: 12px;
}

.dp-duty-label {
	font-weight: 600;
	color: var(--el-text-color-primary);
}

.dp-duty-empty {
	color: var(--el-text-color-placeholder);
}
</style>
