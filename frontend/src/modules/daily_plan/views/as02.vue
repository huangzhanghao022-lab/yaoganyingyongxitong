<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<el-button type="primary" plain @click="openPlanDialog">{{ t("生成计划") }}</el-button>
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
			<el-table-column type="index" width="40" :label="t('#')" />
			<el-table-column :label="t('卫星代号')" min-width="90">
				<template #default="{ row }">
					{{ resolveSatelliteCode(row) }}
				</template>
			</el-table-column>
			<el-table-column :label="t('测控站')" min-width="160">
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

		<el-empty v-else :description="planDialog.loading ? t('查询中...') : t('暂无测控数据')" :image-size="120" />

		<template #footer>
			<el-space>
				<el-button @click="onQueryPlan">{{ t("查询测控计划") }}</el-button>
				<el-button type="primary" :loading="planDialog.submitting" @click="onSubmitPlan">{{ t("录入计划") }}</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="telemetryDetail.open" :title="t('任务详情')" width="1000px" class="dp-detail-dialog">
		<el-scrollbar max-height="520px" v-loading="telemetryDetail.loading">
			<pre class="dp-telemetry-detail">{{ telemetryDetail.content || t("暂无测控信息") }}</pre>
		</el-scrollbar>
		<template #footer>
			<el-button @click="telemetryDetail.open = false">{{ t("关闭") }}</el-button>
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

const telemetryDetail = reactive({
	open: false,
	title: "",
	content: "",
	loading: false,
});

type TelecontrolRecord = {
	id?: string | number;
	date?: string;
	missionName?: string;
	taskName?: string;
	targetName?: string;
	planBeginTime?: number | string;
	planEndTime?: number | string;
	beginTime?: number | string;
	endTime?: number | string;
	transitTime?: string;
	spacecraftId?: string | number;
	satelliteCode?: string;
	telemetryInfo?: string;
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
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
];
const DUTY_ROSTER_URLS = [
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search",
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search",
];
const TELECONTROL_CREDENTIALS = {
	username: "02ptemplate@yinhe.ht",
	password: "123456",
	loginType: 2,
};
const TELECONTROL_STATES = ["1", "2", "6"];
const AS02_SPACECRAFT_ID = "12";
const BEIJING_OFFSET = 8 * 60 * 60 * 1000;
const DATE_COLOR_CLASSES = ["dp-row-color-0", "dp-row-color-1", "dp-row-color-2", "dp-row-color-3", "dp-row-color-4", "dp-row-color-5"];

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
				props: { type: "textarea", rows: 8, autosize: { minRows: 8, maxRows: 12 } },
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
		// 避免弹窗默认聚焦日期组件
		setTimeout(() => {
			try {
				(document.activeElement as any)?.blur?.();
			} catch {}
		}, 0);
		const [start, end] = splitTransit(data?.transitTime);
		data.transitTime = start && end ? [start, end] : [];
	},
});

const Table = useTable({
	defaultSort: { prop: "date", order: "descending" },
	columns: [
		{ type: "selection" },
		{
			label: t("日期"),
			prop: "date",
			minWidth: 90,
			sortable: "custom",
			sortMethod: ((a: TelecontrolRecord, b: TelecontrolRecord) => compareDailyPlanOrder(a, b)) as unknown as fn,
			component: {
				name: "cl-date-text",
				props: { format: "YYYY-MM-DD" },
			},
		},
		{ label: t("值班人"), prop: "dutyOfficer", minWidth: 70 },
		{ label: t("测控站"), prop: "telemetryStation", minWidth: 110 },
		{
			label: t("过境时间"),
			prop: "transitTime",
			minWidth: 160,
			sortable: "custom",
			sortMethod: ((a: TelecontrolRecord, b: TelecontrolRecord) => compareTransitStart(a, b)) as unknown as fn,
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
			minWidth: 70,
			sortable: "custom",
		},
		{
			label: t("测控信息"),
			prop: "telemetryInfo",
			minWidth: 320,
			className: "dp-telemetry-column",
			align: "left",
			formatter(row) {
				return extractTelemetrySummary(row);
			},
		},
		{
			type: "op",
			buttons: [
				"edit",
				"delete",
				{
					text: t("详情") || "详情",
					label: "详情",
					type: "primary",
					onClick({ scope }: { scope: { row: TelecontrolRecord } }) {
						openTelemetryDetail(scope.row);
					},
				},
				{
					text: t("自动补齐数传信息") || "自动补齐数传信息",
					label: t("自动补齐数传信息") || "自动补齐数传信息",
					type: "success",
					onClick({ scope }: { scope: { row: TelecontrolRecord } }) {
						autoFillTransferInfo(scope.row);
					},
				},
			],
		},
	],
	props: {
		border: true,
		rowClassName: ({ row }: { row: TelecontrolRecord }) => resolveDateColorClass(row?.date),
	},
});

const Search = useSearch();

const Crud = useCrud(
	{
		service: service.daily_plan.as02,
		onRefresh(params, { render, done }) {
			service.daily_plan.as02
				.page(params)
				.then((res) => {
					const normalized = Array.isArray(res)
						? { list: res, pagination: { total: res.length } }
						: res ?? { list: [] };
					const sortedList = Array.isArray(normalized.list)
						? sortTelecontrolList(normalized.list)
						: normalized.list;
					render({
						...normalized,
						list: sortedList,
					});
				})
				.catch((err) => {
					ElMessage.error(err?.message || t("查询失败"));
					done();
				});
		},
	},
	(app) => {
		app.refresh();
	},
);

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
	if (!ensureDateSelected()) return;
	requestTelecontrolPlan().catch((err) => {
		console.error("[daily-plan] telecontrol fetch failed", err);
		ElMessage.error(t("查询测控计划失败"));
	});
}

async function onSubmitPlan() {
	if (!ensureDateSelected()) return;
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
		await Promise.all(payload.map((item) => service.daily_plan.as02.add(item)));
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
		telemetryInfo: "1.卫星状态监视\n2.下传GNSS和延遥",
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

async function openTelemetryDetail(row: TelecontrolRecord) {
	telemetryDetail.title = `${row.date ?? planDialog.date ?? ""} ${resolveAntennaName(row)}`;
	telemetryDetail.open = true;
	telemetryDetail.loading = true;
	telemetryDetail.content = "";
	const finalize = (text: string) => {
		telemetryDetail.content = text || t("暂无测控信息");
		telemetryDetail.loading = false;
	};
	const inline = resolveTelemetryContent(row);
	if (inline && inline !== "-") {
		finalize(inline);
		return;
	}
	if (!row.id) {
		finalize("");
		return;
	}
	try {
		const detail = await service.daily_plan.as02.info({ id: row.id });
		const record = (detail as any)?.data?.info ?? (detail as any)?.data ?? detail;
		finalize(resolveTelemetryContent(record as TelecontrolRecord));
	} catch (err) {
		console.error("[daily-plan] telemetry detail load failed", err);
		finalize(t("测控信息加载失败"));
	}
}

async function requestTelecontrolPlan() {
	if (planDialog.loading) return;
	planDialog.loading = true;
	try {
		const token = await fetchTelecontrolToken();
		const [records, dutyOfficers] = await Promise.all([
			fetchTelecontrolRecords(token, planDialog.date, AS02_SPACECRAFT_ID),
			fetchDutyRoster(token, planDialog.date, AS02_SPACECRAFT_ID).catch(() => []),
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

async function fetchTelecontrolToken(): Promise<string> {
	const resp = await fetch(TELECONTROL_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(TELECONTROL_CREDENTIALS),
	});
	const result = await resp.json();
	const token = result?.data?.token ?? result?.token ?? result?.data;
	if (!token) throw new Error("token missing");
	return token;
}

async function fetchTelecontrolRecords(token: string, date: string, spacecraftId: string): Promise<TelecontrolRecord[]> {
	const { begin, end } = buildUtcRange(date);
	const payload = {
		keyword: "",
		page: 1,
		pageSize: 200,
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
			if (!resp.ok) throw new Error(String(resp.status));
			const result = await resp.json();
			const list = result?.data?.list ?? result?.data ?? result?.records ?? [];
			return Array.isArray(list) ? list : [];
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError || new Error("telecontrol fetch failed");
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
			if (!resp.ok) throw new Error(String(resp.status));
			const result = await resp.json();
			const list = result?.data?.list ?? result?.data ?? result?.records ?? [];
			if (!Array.isArray(list)) return [];
			return list
				.map((item) => {
					const name = (item?.name ?? item?.dutyName ?? item?.dutyOfficer) as string | undefined;
					return name ? String(name).trim() : "";
				})
				.filter(Boolean);
		} catch (err) {
			lastError = err;
		}
	}
	throw lastError || new Error("duty roster failed");
}

function buildUtcRange(date: string) {
	const begin = Date.parse(`${date}T00:00:00Z`);
	if (Number.isNaN(begin)) throw new Error("invalid date");
	return {
		begin: begin - BEIJING_OFFSET,
		end: begin - BEIJING_OFFSET + 24 * 60 * 60 * 1000,
	};
}

function buildBeijingRange(date: string) {
	const begin = Date.parse(`${date}T00:00:00+08:00`);
	if (Number.isNaN(begin)) throw new Error("invalid date");
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

function resolveTelemetryContent(row: TelecontrolRecord | null | undefined): string {
	if (!row) return "";
	if (row.telemetryInfo && String(row.telemetryInfo).trim()) {
		return String(row.telemetryInfo);
	}
	const start = formatPlanTimeValue(row.beginTime) ?? "-";
	const end = formatPlanTimeValue(row.endTime) ?? "-";
	return [`卫星: ${resolveSatelliteCode(row)}`, `测控站: ${resolveAntennaName(row)}`, `时间: ${start} ~ ${end}`, `状态: ${row.stateName || row.state || "-"}`].join("\n");
}

function extractTelemetrySummary(row: TelecontrolRecord): string {
	const content = resolveTelemetryContent(row);
	if (!content) return "-";

	const lines = content.split(/\r?\n/);
	const summaries: string[] = [];
	const headingPattern = /^\d+[.:：]/;

	for (let i = 0; i < lines.length; i++) {
		const current = lines[i]?.trim();
		if (!current || !headingPattern.test(current)) {
			continue;
		}

		let segment = current;

		if (current.includes("上注") && current.includes("目标点任务")) {
			let imagingTime = "";
			let fileNo = "";

			for (let j = i + 1; j < lines.length; j++) {
				const candidate = lines[j]?.trim();
				if (!candidate) continue;
				if (headingPattern.test(candidate)) break;

				if (!imagingTime) {
					const timeMatch = candidate.match(/成像时间[:：]?\s*([\d]{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
					if (timeMatch) {
						imagingTime = timeMatch[1];
					}
				}

				if (!fileNo) {
					const recordMatch = candidate.match(/记录文件号[:：]?\s*([^，。]+)/);
					if (recordMatch) {
						fileNo = recordMatch[1].trim();
					}
				}
			}

			if (imagingTime || fileNo) {
				const parts = [segment];
				if (imagingTime) parts.push(`成像时间: ${imagingTime}`);
				if (fileNo) parts.push(`记录文件号: ${fileNo}`);
				segment = parts.join(" | ");
			}
		}

		summaries.push(segment);
	}

	return summaries.join("\n") || "-";
}

function compareDailyPlanOrder(a: TelecontrolRecord | Record<string, any>, b: TelecontrolRecord | Record<string, any>): number {
	const left = normalizeTelecontrolRecord(a);
	const right = normalizeTelecontrolRecord(b);
	const dateDiff = resolveDateBaseTimestamp(right) - resolveDateBaseTimestamp(left);
	if (dateDiff !== 0) {
		return dateDiff;
	}
	return resolveTransitStartTimestamp(left) - resolveTransitStartTimestamp(right);
}

function compareTransitStart(a: TelecontrolRecord | Record<string, any>, b: TelecontrolRecord | Record<string, any>): number {
	const left = normalizeTelecontrolRecord(a);
	const right = normalizeTelecontrolRecord(b);
	return resolveTransitStartTimestamp(left) - resolveTransitStartTimestamp(right);
}

function sortTelecontrolList<T = TelecontrolRecord>(list: T[]): T[] {
	return [...list].sort((a, b) => compareDailyPlanOrder(a as any, b as any));
}

function normalizeTelecontrolRecord(input: TelecontrolRecord | Record<string, any>): TelecontrolRecord {
	if (!input) return {};
	const record: TelecontrolRecord = { ...(input as any) };
	const rawDate = (input as any)?.date;
	if (rawDate instanceof Date) {
		record.date = formatDateOnly(rawDate);
	} else if (rawDate != null && typeof rawDate !== "string") {
		record.date = String(rawDate);
	}
	if (!record.transitTime) {
		const transitRaw =
			(input as any)?.transitTime ??
			(input as any)?.transit_time ??
			(input as any)?.transit_time_text ??
			(input as any)?.transit_time_texts;
		if (transitRaw != null) {
			record.transitTime = String(transitRaw);
		}
	}
	return record;
}

function formatDateOnly(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function resolveDateBaseTimestamp(row: TelecontrolRecord): number {
	const explicit = parseTimestamp(row.date);
	if (explicit != null) {
		const date = new Date(explicit);
		date.setHours(0, 0, 0, 0);
		return date.getTime();
	}
	const fallback = parseTimestamp(row.beginTime ?? row.planBeginTime);
	if (fallback != null) {
		const date = new Date(fallback);
		date.setHours(0, 0, 0, 0);
		return date.getTime();
	}
	return 0;
}

function resolveTransitStartTimestamp(row: TelecontrolRecord): number {
	const [start] = splitTransit(row.transitTime);
	const parsed = parseTimestamp(start);
	if (parsed != null) {
		return parsed;
	}
	const fallback = parseTimestamp(row.beginTime ?? row.planBeginTime);
	return fallback ?? 0;
}

function parseTimestamp(value: unknown): number | null {
	if (value == null) {
		return null;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (value instanceof Date) {
		return value.getTime();
	}
	if (typeof value === "string") {
		const str = value.trim();
		if (!str) {
			return null;
		}
		let normalized = str;
		if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
			normalized = `${str}T00:00:00`;
		} else if (!str.includes("T")) {
			normalized = str.replace(" ", "T");
		}
		const ts = Date.parse(normalized);
		return Number.isNaN(ts) ? null : ts;
	}
	return null;
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

function resolveDateColorClass(date: unknown): string {
	const str = normalizeDateString(date);
	if (!str) return "";
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash + str.charCodeAt(i)) % DATE_COLOR_CLASSES.length;
	}
	return DATE_COLOR_CLASSES[hash];
}

function normalizeDateString(value: unknown): string | null {
	if (!value) return null;
	if (typeof value === "string") return value.trim() || null;
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value);
}

type FileRange = { start: number; end: number };
type ImagingBlock = { start: number; end: number; time: number; text: string };

const TRANSFER_TASK_KEYWORDS = ["监视数传任务", "上注数传任务", "数传任务"];
const AS02_FILE_GROUP_SIZE = 8;

async function autoFillTransferInfo(row: TelecontrolRecord) {
	if (!row?.id) {
		ElMessage.warning(t("请选择有效的记录"));
		return;
	}
	let telemetryText = "";
	let detailRecord: TelecontrolRecord | null = null;
	try {
		const detail = await service.daily_plan.as02.info({ id: row.id });
		const record = (detail as any)?.data?.info ?? (detail as any)?.data ?? detail;
		detailRecord = record as TelecontrolRecord;
		telemetryText = typeof record?.telemetryInfo === "string" ? record.telemetryInfo : "";
	} catch (err) {
		console.error("[daily-plan] telemetry info load failed", err);
		ElMessage.error(t("测控信息加载失败"));
		return;
	}
	if (!telemetryText.trim()) {
		ElMessage.warning(t("暂无测控信息"));
		return;
	}
	let records: TelecontrolRecord[] = [];
	try {
		records = await fetchDailyPlanRecords();
	} catch (err) {
		console.error("[daily-plan] daily plan records fetch failed", err);
		ElMessage.error(t("查询失败"));
		return;
	}
	const imagingBlocks = collectImagingBlocks([detailRecord ?? row, ...records]);
	if (!imagingBlocks.length) {
		ElMessage.warning(t("未找到匹配的成像信息"));
		return;
	}
	const result = applyTransferAutoFill(telemetryText, imagingBlocks, AS02_FILE_GROUP_SIZE);
	if (result.updated === telemetryText) {
		ElMessage.info(t("无需补齐"));
		return;
	}
	try {
		await service.daily_plan.as02.update({ id: row.id, telemetryInfo: result.updated });
		row.telemetryInfo = result.updated;
		ElMessage.success(t("补齐成功"));
	} catch (err) {
		console.error("[daily-plan] telemetry update failed", err);
		ElMessage.error(t("信息更新失败"));
	}
}

async function fetchDailyPlanRecords(): Promise<TelecontrolRecord[]> {
	const pageSize = 400;
	let page = 1;
	const all: TelecontrolRecord[] = [];
	for (;;) {
	const res = await service.daily_plan.as02.page({ page, size: pageSize });
		const list = Array.isArray(res) ? res : (res as any)?.list ?? (res as any)?.data?.list ?? (res as any)?.data ?? [];
		if (Array.isArray(list) && list.length) {
			all.push(...list);
		}
		const total = (res as any)?.pagination?.total ?? (res as any)?.total ?? all.length;
		if (!Array.isArray(list) || list.length < pageSize || all.length >= total) {
			break;
		}
		page += 1;
		if (page > 10) break;
	}
	return sortTelecontrolList(all as TelecontrolRecord[]);
}

function collectImagingBlocks(records: TelecontrolRecord[]): ImagingBlock[] {
	const blocks: ImagingBlock[] = [];
	for (const record of records) {
		const text = typeof record?.telemetryInfo === "string" ? record.telemetryInfo : "";
		if (!text.trim()) continue;
		blocks.push(...extractImagingBlocks(text));
	}
	return blocks;
}

function extractImagingBlocks(text: string): ImagingBlock[] {
	const blocks: ImagingBlock[] = [];
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		const current = lines[i]?.trim();
		if (!current) continue;
		if (!/经度/.test(current) || !/纬度/.test(current)) continue;
		const detailLine = current;
		let timeLine = "";
		if (/记录文件号/.test(current)) {
			timeLine = current;
		} else {
			for (let j = i + 1; j < lines.length; j += 1) {
				const next = lines[j]?.trim();
				if (!next) continue;
				if (/^\d+[.:：]/.test(next) && /任务/.test(next)) break;
				if (/记录文件号/.test(next)) {
					timeLine = next;
					break;
				}
			}
		}
		if (!timeLine) continue;
		const range = parseRecordRange(timeLine);
		if (!range) continue;
		const imagingTime = parseImagingTime(timeLine);
		const parts = [detailLine];
		if (timeLine !== detailLine) {
			parts.push(timeLine);
		}
		blocks.push({
			start: range.start,
			end: range.end,
			time: imagingTime ?? 0,
			text: parts.join("\n"),
		});
	}
	return blocks;
}

function parseImagingTime(text: string): number | null {
	const match = text.match(/成像时间[:：]?\s*([\d]{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
	if (!match) return null;
	return parseTimestamp(match[1]);
}

function parseRecordRange(text: string): FileRange | null {
	const match = text.match(/记录文件号[:：]?\s*(\d+)(?:\s*[~\-—～]\s*(\d+))?/);
	if (!match) return null;
	const start = Number(match[1]);
	const end = match[2] ? Number(match[2]) : start;
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
	return { start, end };
}

function applyTransferAutoFill(text: string, imagingBlocks: ImagingBlock[], groupSize: number) {
	const lines = text.split(/\r?\n/);
	const output: string[] = [];
	let appended = 0;
	let missing = 0;
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		output.push(line);
		if (!isTransferLine(line)) continue;
		if (hasAutoFillFollowing(lines, i + 1)) {
			continue;
		}
		const ranges = parseTransferRanges(line);
		if (!ranges.length) continue;
		const segments = expandRanges(ranges, groupSize);
		const matched: ImagingBlock[] = [];
		for (const seg of segments) {
			const block = imagingBlocks.find((item) => seg.start >= item.start && seg.end <= item.end);
			if (block) {
				matched.push(block);
			} else {
				missing += 1;
			}
		}
		const unique = dedupeBlocks(matched);
		if (!unique.length) continue;
		const appendix = formatImagingAppendix(unique);
		appended += unique.length;
		output.push(...appendix);
	}
	return { updated: output.join("\n"), appended, missing };
}

function isTransferLine(line: string): boolean {
	const trimmed = (line || "").replace(/\s/g, "");
	if (!trimmed.includes("数传文件号")) return false;
	return TRANSFER_TASK_KEYWORDS.some((keyword) => trimmed.includes(keyword));
}

function hasAutoFillFollowing(lines: string[], startIndex: number): boolean {
	for (let i = startIndex; i < lines.length; i += 1) {
		const current = lines[i]?.trim();
		if (!current) continue;
		if (/^[A-Z]\./.test(current)) return true;
		if (isTaskHeader(current)) return false;
	}
	return false;
}

function isTaskHeader(line: string): boolean {
	if (/^\d+[.:：]/.test(line)) return true;
	if (line.includes("上注") && line.includes("任务")) return true;
	if (line.includes("数传任务")) return true;
	if (line.includes("固存删除任务")) return true;
	return false;
}

function parseTransferRanges(line: string): FileRange[] {
	const normalized = String(line)
		.replace(/\s/g, "")
		.replace(/[，、；;]/g, ",");
	let payloadPart = normalized;
	const payloadIndex = normalized.indexOf("载荷");
	if (payloadIndex >= 0) {
		payloadPart = normalized.slice(payloadIndex + 2);
	}
	const platformIndex = payloadPart.indexOf("平台");
	if (platformIndex >= 0) {
		payloadPart = payloadPart.slice(0, platformIndex);
	}
	const after = payloadPart.replace(/^[^0-9]*/, "");
	if (!after) return [];
	const tokens = after.split(",").map((item) => item.trim()).filter(Boolean);
	const ranges: FileRange[] = [];
	for (const token of tokens) {
		const rangeMatch = token.match(/(\d+)\s*[~\-—～]\s*(\d+)/);
		if (rangeMatch) {
			ranges.push({ start: Number(rangeMatch[1]), end: Number(rangeMatch[2]) });
			continue;
		}
		const singleMatch = token.match(/(\d+)/);
		if (singleMatch) {
			const val = Number(singleMatch[1]);
			ranges.push({ start: val, end: val });
		}
	}
	return ranges.filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end));
}

function expandRanges(ranges: FileRange[], groupSize: number): FileRange[] {
	const expanded: FileRange[] = [];
	const size = Math.max(1, groupSize);
	for (const range of ranges) {
		let cursor = range.start;
		while (cursor <= range.end) {
			const end = Math.min(range.end, cursor + size - 1);
			expanded.push({ start: cursor, end });
			cursor += size;
		}
	}
	return expanded;
}

function dedupeBlocks(blocks: ImagingBlock[]): ImagingBlock[] {
	const seen = new Set<string>();
	const result: ImagingBlock[] = [];
	for (const block of blocks) {
		const key = `${block.start}-${block.end}-${block.time}`;
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(block);
	}
	return result;
}

function formatImagingAppendix(blocks: ImagingBlock[]): string[] {
	const output: string[] = [];
	for (let i = 0; i < blocks.length; i += 1) {
		const label = String.fromCharCode(65 + (i % 26));
		const lines = blocks[i].text.split(/\r?\n/);
		if (!lines.length) continue;
		const first = `${label}.${lines[0].trim()}`;
		output.push(first);
		for (let j = 1; j < lines.length; j += 1) {
			if (lines[j]?.trim()) output.push(lines[j]);
		}
	}
	return output;
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

.dp-telemetry-detail {
	margin: 0;
	padding: 12px;
	background: var(--el-fill-color-lighter);
	border-radius: 6px;
	white-space: pre-wrap;
	word-break: break-word;
	font-size: 13px;
	line-height: 1.6;
	color: var(--el-text-color-primary);
}

:deep(.dp-row-color-0 > td) {
	background-color: #ffe0d4;
}

:deep(.dp-row-color-1 > td) {
	background-color: #dff5d6;
}

:deep(.dp-row-color-2 > td) {
	background-color: #dbe6ff;
}

:deep(.dp-row-color-3 > td) {
	background-color: #f1ddff;
}

:deep(.dp-row-color-4 > td) {
	background-color: #e0f8f0;
}

:deep(.dp-row-color-5 > td) {
	background-color: #fff1d9;
}

:deep(.el-table--border .el-table__cell) {
	border-color: #000 !important;
}

:deep(.el-table--border .el-table__inner-wrapper::after),
:deep(.el-table--border::before),
:deep(.el-table--border::after) {
	border-color: #000 !important;
}
</style>
