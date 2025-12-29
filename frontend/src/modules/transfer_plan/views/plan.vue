<template>
	<cl-crud ref="Crud">
		<cl-row>
			<el-card shadow="never" class="plan-form-card">
				<template #header>
					<div class="plan-form-header">数传规划参数</div>
				</template>
				<el-form :model="form" :inline="true" label-width="120px" class="plan-form">
					<el-form-item label="卫星">
						<el-radio-group v-model="form.satellite">
							<el-radio-button label="AS02">AS02</el-radio-button>
							<el-radio-button label="AS03">AS03</el-radio-button>
						</el-radio-group>
					</el-form-item>
					<el-form-item label="是否重新加载表" >
						<el-radio-group v-model="form.reloadTable">
							<el-radio-button label=true>是</el-radio-button>
							<el-radio-button label=false>否</el-radio-button>
						</el-radio-group>
					</el-form-item>
					<el-form-item label="开始绝对延时指令号" label-width="160px">
						<el-input v-model="form.startCommand" placeholder="请输入指令号" clearable />
					</el-form-item>
					<el-form-item label="数传T0时间">
						<el-date-picker
							v-model="form.transferT0"
							type="datetime"
							value-format="YYYY-MM-DD HH:mm:ss"
							placeholder="选择T0时间"
							clearable
						/>
					</el-form-item>
					<el-form-item label="数传持续时间">
						<el-input v-model="form.duration" placeholder="请输入持续时间（秒）" clearable style="width: 200px;" />
					</el-form-item>

					<el-row :gutter="16" class="station-row">
						<el-col :span="8">
							<el-form-item label="数传站" class="fi-station">
								<el-select
									v-model="form.station"
									placeholder="请选择数传站"
									clearable
									filterable
									:loading="stationLoading"
									@change="handleStationChange"
								>
									<el-option
										v-for="item in stationOptions"
										:key="item.value"
										:label="item.label"
										:value="item.value"
									/>
								</el-select>
							</el-form-item>
						</el-col>
						<el-col :span="5">
							<el-form-item label="经度" label-width="60px">
								<el-input v-model="form.longitude" placeholder="--" readonly />
							</el-form-item>
						</el-col>
						<el-col :span="5">
							<el-form-item label="纬度" label-width="60px">
								<el-input v-model="form.latitude" placeholder="--" readonly />
							</el-form-item>
						</el-col>
						<el-col :span="6">
							<el-form-item label="海拔" label-width="60px">
								<el-input v-model="form.altitude" placeholder="--" readonly />
							</el-form-item>
						</el-col>
					</el-row>

					<el-form-item class="form-actions">
						<el-button type="primary" plain @click="openStorageStatus" :loading="storageDialog.loading">
							<el-icon style="margin-right: 4px">
								<component :is="icons.view" />
							</el-icon>
							查看固存表
						</el-button>
					</el-form-item>
				</el-form>
			</el-card>
		</cl-row>

		<el-card v-if="confirmedStorage.payload.length || confirmedStorage.platform.length" shadow="never" class="selection-card">
			<template #header>
				<div class="selection-header">已选择数传文件</div>
			</template>
			<el-space style="margin-bottom: 12px" align="center">
				<el-button
					type="success"
					@click="integrateStorage"
					:disabled="!confirmedStorage.payload.length && !confirmedStorage.platform.length"
				>
					整合数传信息
				</el-button>
				<el-button type="primary" @click="addIntegratedGroup">新增整合组</el-button>
				<el-button type="danger" @click="submitTransferTask" :disabled="!integratedGroups.length" :loading="transferSubmitting">
					提交数传任务
				</el-button>
				<el-tag v-if="integratedGroups.length" type="info">当前共 {{ integratedGroups.length }} 组</el-tag>
			</el-space>
			<el-row :gutter="16">
				<el-col :span="12">
					<h4 class="selection-title">载荷固存表</h4>
					<el-table :data="confirmedStorage.payload" size="small" border empty-text="未选择" height="200">
						<el-table-column type="index" width="50" label="#" />
						<el-table-column prop="display" label="目标/文件" min-width="140" show-overflow-tooltip />
						<el-table-column prop="startFileNo" label="开始文件号" width="120" />
						<el-table-column prop="statusLabel" label="状态" width="100" />
					</el-table>
				</el-col>
				<el-col :span="12">
					<h4 class="selection-title">平台固存表</h4>
					<el-table :data="confirmedStorage.platform" size="small" border empty-text="未选择" height="200">
						<el-table-column type="index" width="50" label="#" />
						<el-table-column prop="display" label="目标/文件" min-width="140" show-overflow-tooltip />
						<el-table-column prop="startFileNo" label="开始文件号" width="120" />
						<el-table-column prop="statusLabel" label="状态" width="100" />
					</el-table>
				</el-col>
			</el-row>
			<div v-if="integratedGroups.length" class="integrated-groups">
				<h4 class="selection-title">整合数传信息</h4>
				<div
					v-for="(group, index) in integratedGroups"
					:key="group.id"
					class="integrated-group"
				>
					<h5 class="group-title">整合组 {{ index + 1 }}（包含 {{ group.count }} 个文件）</h5>
					<el-form :model="group" inline class="integrated-form">
						<el-form-item label="固存号范围">
							<el-input v-model="group.startNo" class="range-input" />
							<span class="range-sep">~</span>
							<el-input v-model="group.endNo" class="range-input" />
						</el-form-item>
						<el-form-item label="传输时长(s)">
							<el-input-number v-model="group.duration" :min="0" :step="10" />
						</el-form-item>
						<el-form-item label="文件数">
							<el-tag type="info">{{ group.count }}</el-tag>
						</el-form-item>
						<el-form-item label="类型">
							<el-radio-group v-model="group.type">
								<el-radio-button label="payload">载荷</el-radio-button>
								<el-radio-button label="platform">平台</el-radio-button>
							</el-radio-group>
						</el-form-item>
						<el-form-item>
							<el-button type="danger" link @click="removeIntegratedGroup(index)">删除整合组</el-button>
						</el-form-item>
					</el-form>
				</div>
			</div>
		</el-card>

		<el-card v-if="transferNotice.visible" shadow="never" class="selection-card mb16">
			<template #header>
				<div class="selection-header">数传任务反馈</div>
			</template>
			<div class="submission-feedback">
				<p class="submission-message">{{ transferNotice.message }}</p>
				<p v-if="transferNotice.detail" class="submission-detail">{{ transferNotice.detail }}</p>
			</div>
		</el-card>

		<el-dialog
			v-model="storageDialog.visible"
			title="固存表状态"
			width="720px"
			:close-on-click-modal="false"
		>
			<el-alert
				type="info"
				show-icon
				:closable="false"
				style="margin-bottom: 12px"
				description="自动按当前卫星拉取载荷与平台固存表状态，支持多选"
			/>

			<el-tabs v-model="storageDialog.activeTab">
				<el-tab-pane label="载荷固存表" name="payload">
					<el-table
						:data="storageDialog.payload"
						:border="true"
						:height="280"
						style="width: 100%"
						@selection-change="rows => (storageDialog.selectedPayload = rows)"
					>
						<el-table-column type="selection" width="48" />
						<el-table-column prop="display" label="目标/文件" min-width="180" show-overflow-tooltip />
						<el-table-column prop="startFileNo" label="开始文件号" width="120" />
						<el-table-column label="状态" width="120">
							<template #default="{ row }">
								<el-tag
									v-if="row.status != null"
									:disable-transitions="true"
									size="small"
									:type="getStatusTagProps(row.status).type"
									:color="getStatusTagProps(row.status).color"
								>
									{{ row.statusLabel }}
								</el-tag>
								<span v-else>-</span>
							</template>
						</el-table-column>
						<el-table-column prop="updateTime" label="更新时间" min-width="150" />
					</el-table>
				</el-tab-pane>
				<el-tab-pane label="平台固存表" name="platform">
					<el-table
						:data="storageDialog.platform"
						:border="true"
						:height="280"
						style="width: 100%"
						@selection-change="rows => (storageDialog.selectedPlatform = rows)"
					>
						<el-table-column type="selection" width="48" />
						<el-table-column prop="display" label="目标/文件" min-width="180" show-overflow-tooltip />
						<el-table-column prop="startFileNo" label="开始文件号" width="120" />
						<el-table-column label="状态" width="120">
							<template #default="{ row }">
								<el-tag
									v-if="row.status != null"
									:disable-transitions="true"
									size="small"
									:type="getStatusTagProps(row.status).type"
									:color="getStatusTagProps(row.status).color"
								>
									{{ row.statusLabel }}
								</el-tag>
								<span v-else>-</span>
							</template>
						</el-table-column>
						<el-table-column prop="updateTime" label="更新时间" min-width="150" />
					</el-table>
				</el-tab-pane>
			</el-tabs>

			<template #footer>
				<el-space>
					<el-tag type="info">载荷已选 {{ storageDialog.selectedPayload.length }} 条</el-tag>
					<el-tag type="info">平台已选 {{ storageDialog.selectedPlatform.length }} 条</el-tag>
					<el-button type="primary" :disabled="!storageDialog.selectedPayload.length && !storageDialog.selectedPlatform.length" @click="confirmStorageSelection">确认</el-button>
					<el-button @click="storageDialog.visible = false">关闭</el-button>
				</el-space>
			</template>
		</el-dialog>


	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: "transfer-plan-plan",
});


import { useI18n } from "vue-i18n";
import { reactive, computed, ref, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { View } from "@element-plus/icons-vue";
import axios from "axios";
import { useCool } from "/@/cool";
import { config as appConfig } from "/@/config";
import { request } from "/@/cool/service/request";

const { service } = useCool();
const { t } = useI18n();

const icons = {
	view: View,
};

const TOKEN_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token";
const ANTENNA_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi-transform/get-all-antenna";

const statusDict: Record<number, string> = {
	0: "空",
	1: "已写入",
	2: "已写入待数传",
	3: "已数传待反馈",
	4: "解析有问题",
	5: "已重传待反馈",
	6: "已数传待删除",
	7: "已安排数传",
};

const STORAGE_STATUS_TRANSFER_SCHEDULED = 7;

type TagStyle = { type?: 'info' | 'warning' | 'danger' | 'success' | 'primary'; color?: string };

const statusTagMap: Record<number, TagStyle> = {
	0: { type: "info" },
	1: { type: "primary" },
	2: { type: "warning" },
	3: { color: "#f78fb3" },
	4: { type: "danger" },
	5: { type: "danger" },
	6: { type: "success" },
	7: { type: "primary" },
};

const TRANSFER_PLAN_CACHE_KEY = "transfer_plan_cache_v1";
const TRANSFER_RELOAD_FLAG = "__transfer_plan_reload_handled";

type TransferPlanFormState = {
	satellite: "AS02" | "AS03";
	reloadTable: boolean;
	startCommand: string;
	station: string;
	stationName: string;
	longitude: string;
	latitude: string;
	altitude: string;
	transferT0: string;
	duration: string;
};

const defaultTransferPlanForm: TransferPlanFormState = {
	satellite: "AS02",
	reloadTable: false,
	startCommand: "",
	station: "",
	stationName: "",
	longitude: "",
	latitude: "",
	altitude: "",
	transferT0: "",
	duration: "",
};

const form = reactive<TransferPlanFormState>({ ...defaultTransferPlanForm });

type StationOption = {
	label: string;
	value: string;
	longitude: number | null;
	latitude: number | null;
	altitude: number | null;
};

type StorageRow = {
	id: number | string;
	display: string;
	startFileNo: string;
	status: number | null;
	statusLabel: string;
	updateTime: string;
	tableName?: number | null;
	source?: SelectionSource;
	raw: Record<string, any>;
};

const stationOptions = ref<StationOption[]>([]);
const stationLoading = ref(false);

const isAS03 = computed(() => form.satellite === "AS03");

const storageDialog = reactive({
	visible: false,
	loading: false,
	activeTab: "payload",
	payload: [] as StorageRow[],
	platform: [] as StorageRow[],
	selectedPayload: [] as StorageRow[],
	selectedPlatform: [] as StorageRow[],
});

type ConfirmedStorageState = {
	payload: StorageRow[];
	platform: StorageRow[];
};

const confirmedStorage = reactive<ConfirmedStorageState>({
	payload: [],
	platform: [],
});

type SelectionSource = 'payload' | 'platform';

type IntegratedGroup = {
	id: string;
	startNo: string;
	endNo: string;
	count: number;
	duration: number;
	type: SelectionSource;
};

type TransferNotice = {
	visible: boolean;
	type: 'success' | 'info' | 'warning' | 'danger';
	message: string;
	detail?: string;
};

const TRANSFER_TEMPLATE_ID = '673c2d9049b1f446adc4623e';
const TRANSFER_FOLDER_ID = '6731752608e123893cf92873';
const TRANSFER_API_URL = 'http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/chains/create-with-template';
const TRANSFER_TYPE_MAP: Record<SelectionSource, string> = { payload: '1', platform: '0' };
const START_END_TYPE_SUFFIXES = ['', '1', '2', '3', '4', '5', '6', '7', '8'];
const TRANS_TIME_SUFFIXES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const integratedGroups = ref<IntegratedGroup[]>([]);
const transferSubmitting = ref(false);
const transferNotice = reactive<TransferNotice>({
	visible: false,
	type: 'info',
	message: '',
	detail: '',
});

type TransferPlanCachePayload = {
	form: TransferPlanFormState;
	confirmedStorage: ConfirmedStorageState;
	integratedGroups: IntegratedGroup[];
};

function detectPageReload(): boolean {
	if (typeof window === "undefined" || typeof performance === "undefined") {
		return false;
	}

	const entries = performance.getEntriesByType?.("navigation") || [];
	const firstEntry = entries[0] as PerformanceNavigationTiming | undefined;
	if (firstEntry && typeof firstEntry.type === "string") {
		return firstEntry.type === "reload";
	}

	const nav = (performance as any).navigation;
	if (nav?.type != null && nav?.TYPE_RELOAD != null) {
		return nav.type === nav.TYPE_RELOAD;
	}

	return false;
}

const isPageReload = detectPageReload();

if (isPageReload && typeof window !== "undefined") {
	const win = window as any;
	if (!win[TRANSFER_RELOAD_FLAG]) {
		try {
			window.localStorage.removeItem(TRANSFER_PLAN_CACHE_KEY);
		} catch (err) {
			console.warn("[transfer-plan] 清理缓存失败", err);
		}
		win[TRANSFER_RELOAD_FLAG] = true;
	}
}

function restoreTransferPlanCache() {
	if (typeof window === "undefined") {
		return;
	}

	const raw = window.localStorage.getItem(TRANSFER_PLAN_CACHE_KEY);
	if (!raw) {
		return;
	}

	try {
		const payload = JSON.parse(raw) as Partial<TransferPlanCachePayload>;

		if (payload?.form) {
			Object.assign(form, { ...defaultTransferPlanForm, ...payload.form });
		}

		if (payload?.confirmedStorage) {
			confirmedStorage.payload = Array.isArray(payload.confirmedStorage.payload) ? payload.confirmedStorage.payload : [];
			confirmedStorage.platform = Array.isArray(payload.confirmedStorage.platform) ? payload.confirmedStorage.platform : [];
		}

		if (Array.isArray(payload?.integratedGroups)) {
			integratedGroups.value = payload.integratedGroups;
		}
	} catch (err) {
		console.warn("[transfer-plan] 恢复缓存失败", err);
	}
}

function persistTransferPlanCache() {
	if (typeof window === "undefined") {
		return;
	}

	const snapshot: TransferPlanCachePayload = {
		form: { ...form },
		confirmedStorage: {
			payload: confirmedStorage.payload.map(item => ({ ...item })),
			platform: confirmedStorage.platform.map(item => ({ ...item })),
		},
		integratedGroups: integratedGroups.value.map(item => ({ ...item })),
	};

	try {
		window.localStorage.setItem(TRANSFER_PLAN_CACHE_KEY, JSON.stringify(snapshot));
	} catch (err) {
		console.warn("[transfer-plan] 缓存状态失败", err);
	}
}

restoreTransferPlanCache();

watch(
	[form, confirmedStorage, integratedGroups],
	() => {
		persistTransferPlanCache();
	},
	{ deep: true }
);

function resetStationDetail() {
	form.stationName = "";
	form.longitude = "";
	form.latitude = "";
	form.altitude = "";
}

function handleStationChange(value: string) {
	if (!value) {
		resetStationDetail();
		return;
	}

	const found = stationOptions.value.find(item => item.value === value);
	if (!found) {
		resetStationDetail();
		return;
	}

	form.stationName = found.label;
	form.longitude = found.longitude != null ? String(found.longitude) : "";
	form.latitude = found.latitude != null ? String(found.latitude) : "";
	form.altitude = found.altitude != null ? String(found.altitude) : "";
}

async function fetchStationOptions() {
	stationLoading.value = true;
	try {
		const tokenRes = await axios.post(TOKEN_URL, {
			username: "02ptemplate@yinhe.ht",
			password: "123456",
			loginType: 2,
		});
		const token = tokenRes?.data?.data?.token;
		if (!token) {
			throw new Error("获取数传站 token 失败");
		}

		const antennaRes = await axios.post(
			ANTENNA_URL,
			{},
			{
				headers: {
					"x-web-token": token,
				},
			}
		);
		const list = antennaRes?.data?.data?.getAllAntenna ?? [];

		stationOptions.value = list.map((item: any) => ({
			label: item.name || item.code || "",
			value: String(item.id ?? item.code ?? item.stationId ?? ""),
			longitude: item.config?.geographicLocation?.longitude ?? null,
			latitude: item.config?.geographicLocation?.latitude ?? null,
			altitude: item.config?.geographicLocation?.altitude ?? null,
		}));

		if (form.station) {
			handleStationChange(form.station);
		}
	} catch (err: any) {
		ElMessage.error(err?.message || "数传站信息获取失败");
	} finally {
		stationLoading.value = false;
	}
}

function mapStorageRow(item: Record<string, any>, tableName?: number | null, source?: SelectionSource): StorageRow {
	const display = item.targetName || item.fileName || item.platformFileName || item.code || "-";
	const startFileNo = item.startFileNo ?? item.beginFileNo ?? item.fileNo ?? "-";
	const status = typeof item.status === "number" ? item.status : null;
	const updateTime = item.updateTime || item.writeTime || "-";
	const resolvedTableName = typeof tableName === "number" ? tableName : (typeof item.name === "number" ? item.name : null);
	const resolvedSource = source ?? inferSourceFromTableName(resolvedTableName);
	return {
		id: item.id ?? `${display}-${startFileNo}`,
		display,
		startFileNo: String(startFileNo ?? "-") || "-",
		status,
		statusLabel: status != null ? (statusDict[status] || `状态${status}`) : "-",
		updateTime,
		tableName: resolvedTableName,
		source: resolvedSource,
		raw: item,
	};
}

function getStatusTagProps(status: number | null | undefined): TagStyle {
	if (status == null) return {};
	const style = statusTagMap[status];
	return style ? { ...style } : {};
}

async function fetchStorageByName(name: number) {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) {
		return [] as StorageRow[];
	}
	const res = await api.page({ page: 1, size: 200, name, sort: "startFileNo", order: "ASC" });
	const list = res?.list || res?.data?.list || [];
	const source: SelectionSource = name === 0 || name === 2 ? "payload" : "platform";
	return list
		.map((item: any) => mapStorageRow(item, name, source))
		.sort((a, b) => {
			const toNum = (val: string) => {
				const num = Number(val);
				return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
			};
			const av = toNum(a.startFileNo);
			const bv = toNum(b.startFileNo);
			if (av !== Number.MAX_SAFE_INTEGER || bv !== Number.MAX_SAFE_INTEGER) {
				return av - bv;
			}
			return String(a.startFileNo).localeCompare(String(b.startFileNo));
		});
}

async function openStorageStatus() {
	const satellite = form.satellite;
	if (!satellite) {
		ElMessage.warning("请先选择卫星");
		return;
	}

	const tablePair = satellite === "AS02"
		? { payload: 0, platform: 1 }
		: { payload: 2, platform: 3 };

	storageDialog.visible = true;
	storageDialog.activeTab = "payload";
	storageDialog.loading = true;
	storageDialog.payload = [];
	storageDialog.platform = [];
	storageDialog.selectedPayload = [];
	storageDialog.selectedPlatform = [];

	try {
		const [payload, platform] = await Promise.all([
			fetchStorageByName(tablePair.payload),
			fetchStorageByName(tablePair.platform),
		]);
		storageDialog.payload = payload;
		storageDialog.platform = platform;
	} catch (err: any) {
		ElMessage.error(err?.message || "固存表状态获取失败");
	} finally {
		storageDialog.loading = false;
	}
}

function confirmStorageSelection() {
	confirmedStorage.payload = storageDialog.selectedPayload.map(item => ({ ...item }));
	confirmedStorage.platform = storageDialog.selectedPlatform.map(item => ({ ...item }));
	integratedGroups.value = [];
	storageDialog.visible = false;
}

function integrateStorage() {
	if (!confirmedStorage.payload.length && !confirmedStorage.platform.length) {
		ElMessage.warning("请先在固存表内选择需要整合的数传文件");
		return;
	}

	const satellite = form.satellite;
	const payloadPerFile = satellite === "AS02" ? 90 : 30;
	const platformPerFile = 30;

	const buildGroups = (source: StorageRow[], type: SelectionSource): IntegratedGroup[] => {
		if (!source.length) return [];
		const numbers = Array.from(
			new Set(
				source
					.map(item => Number(item.startFileNo))
					.filter(num => Number.isFinite(num))
			)
		).sort((a, b) => a - b);

		if (!numbers.length) {
			return [];
		}

		const stepForType = satellite === "AS03" || type === "platform" ? 1 : 8;
		const chunkSizeForType = satellite === "AS03" || type === "platform" ? 1 : 8;
		const perFileForType = type === "platform" ? platformPerFile : payloadPerFile;

		const segments: number[][] = [];
		let current: number[] = [];

		numbers.forEach(num => {
			if (!current.length) {
				current.push(num);
				return;
			}

			const last = current[current.length - 1];
			if (num - last === stepForType) {
				current.push(num);
			} else {
				segments.push(current);
				current = [num];
			}
		});

		if (current.length) {
			segments.push(current);
		}

		return segments.map(group => {
			const start = group[0];
			const span = group.length * chunkSizeForType;
			const end = start + span - 1;
			return {
				id: `${type}-${start}-${end}-${group.length}`,
				startNo: String(start),
				endNo: String(end),
				count: group.length,
				duration: perFileForType * group.length,
				type,
			};
		});
	};

	const merged: IntegratedGroup[] = [
		...buildGroups(confirmedStorage.payload, "payload"),
		...buildGroups(confirmedStorage.platform, "platform"),
	];

	if (!merged.length) {
		ElMessage.warning("选中的数传文件缺少有效的固存号");
		return;
	}

	integratedGroups.value = merged;
}

function toIsoString(input: any): string {
	if (!input) return '';
	try {
		const normalized = String(input).replace(' ', 'T');
		return new Date(normalized).toISOString();
	} catch {
		return '';
	}
}

function formatTransferTimeDisplay(value: unknown): string {
	if (!value) return '--';
	const raw = String(value).trim();
	if (!raw) return '--';
	const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) {
		return raw;
	}
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	const hh = String(date.getHours()).padStart(2, '0');
	const mi = String(date.getMinutes()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatBeijingTimeString(value: unknown): string {
	if (!value) return '';
	const normalized = String(value).replace('T', ' ');
	const date = new Date(normalized);
	if (Number.isNaN(date.getTime())) return '';
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	const hh = String(date.getHours()).padStart(2, '0');
	const mi = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function resetTransferNotice() {
	transferNotice.visible = false;
	transferNotice.type = 'info';
	transferNotice.message = '';
	transferNotice.detail = '';
}

function showTransferNotice(type: TransferNotice['type'], message: string, detail?: string) {
	transferNotice.visible = true;
	transferNotice.type = type;
	transferNotice.message = message;
	transferNotice.detail = detail ?? '';
}

function buildTransferFileSegment(group: IntegratedGroup): string {
	const prefix = group.type === 'platform' ? '\u5e73\u53f0' : '\u8f7d\u8377';
	const start = (group.startNo || '').trim();
	const end = (group.endNo || '').trim();
	if (start && end && end !== start) {
		return `${prefix}${start}~${end}`;
	}
	const label = start || end || '-';
	return `${prefix}${label}`;
}

function buildTransferSummary(groups: IntegratedGroup[], satellite: string | undefined): string {
	if (!groups.length) {
		return `\u6570\u4f20\u4efb\u52a1\u63d0\u4ea4\u6210\u529f(${satellite || '-'})`;
	}
	const station = form.stationName || form.station || '-';
	const transferTime = formatTransferTimeDisplay(form.transferT0 || new Date().toISOString());
	const segments = groups.map((group) => buildTransferFileSegment(group)).join('；');
	return `\u4e0a\u6ce8\u6570\u4f20\u4efb\u52a1\uff0c\u6570\u4f20\u7ad9\uff1a${station}\uff0c\u5f00\u59cb\u4e0b\u6570\u65f6\u95f4\uff1a${transferTime}\uff0c\u6570\u4f20\u6587\u4ef6\u53f7\uff1a${segments}`;
}
async function acquireToken(): Promise<string> {
	const res = await axios.post(TOKEN_URL, {
		username: '02ptemplate@yinhe.ht',
		password: '123456',
		loginType: 2,
	});
	const token = res?.data?.data?.token;
	if (!token) {
		throw new Error('获取登录 token 失败');
	}
	return token;
}

function mapTransferType(type: SelectionSource): string {
	return TRANSFER_TYPE_MAP[type] ?? '0';
}

function normalizeDuration(value: number | string | undefined, fallback: number): string {
	const num = Number(value);
	if (Number.isFinite(num) && num >= 0) {
		return String(num);
	}
	return String(fallback);
}

function parseDateTime(value: string): number | null {
	if (!value) return null;
	const normalized = String(value).replace(' ', 'T');
	const time = new Date(normalized).getTime();
	return Number.isNaN(time) ? null : time;
}

function computeGroupFallbackDuration(group: IntegratedGroup, satellite: string | undefined): number {
	const raw = Number(group.duration);
	if (Number.isFinite(raw) && raw >= 0) {
		return raw;
	}
	const perFile =
		group.type === 'platform'
			? 30
			: satellite === 'AS02'
			? 90
			: 30;
	const count = Number(group.count);
	const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
	return perFile * safeCount;
}

function validateTransferParams(): boolean {
	const satellite = form.satellite;
	const groups = integratedGroups.value;

	const formDurationNum = Number(form.duration);
	if (Number.isFinite(formDurationNum) && formDurationNum > 400) {
		ElMessage.error('数传时间过长');
		return false;
	}

	const totalDuration = groups.reduce((sum, group) => sum + computeGroupFallbackDuration(group, satellite), 0);
	if (totalDuration > 400) {
		ElMessage.error('数传时间过长');
		return false;
	}

	const t0Time = parseDateTime(form.transferT0);
	if (t0Time != null && t0Time < Date.now()) {
		ElMessage.error('不可执行历史时间的数传任务');
		return false;
	}

	for (const group of groups) {
		const start = Number(group.startNo);
		const end = Number(group.endNo);
		console.log({satellite, type: group.type, start, end})
		if (!Number.isFinite(start) || !Number.isFinite(end)) {
			ElMessage.error('数传文件号异常');
			return false;
		}
		if (!Number.isInteger(start) || !Number.isInteger(end)) {
			ElMessage.error('数传文件号异常');
			return false;
		}
		if (end <= start) {
			ElMessage.error('数传文件号异常');
			return false;
		}

		if (satellite === 'AS02') {
			if (group.type === 'payload') {
				const startOffset = start - 1;
				if (startOffset < 0 || startOffset % 8 !== 0) {
					ElMessage.error('数传文件号异常');
					return false;
				}
				const n = startOffset / 8;
				if (n < 0 || n > 30) {
					ElMessage.error('数传文件号异常');
					return false;
				}
				if (end % 8 !== 0) {
					ElMessage.error('数传文件号异常');
					return false;
				}
				const span = end - start + 1;
				if (span <= 0 || span % 8 !== 0) {
					ElMessage.error('数传文件号异常');
					return false;
				}
				const blockCount = span / 8;
				const lastBlock = n + blockCount - 1;
				if (lastBlock > 30) {
					ElMessage.error('数传文件号异常');
					return false;
				}
			} else {
				if (start < 1 || end < 1 || start > 16 || end > 16) {
					ElMessage.error('数传文件号异常');
					return false;
				}
			}
		} else if (satellite === 'AS03') {
			if (start < 0 || end < 0 || start > 127 || end > 127) {
				ElMessage.error('数传文件号异常');
				return false;
			}
		}
	}

	return true;
}

function collectSelectedStorageRows(): StorageRow[] {
	const groups = integratedGroups.value;
	const filterByGroups = Array.isArray(groups) && groups.length > 0;
	const combined: StorageRow[] = [
		...confirmedStorage.payload,
		...confirmedStorage.platform,
	];
	const map = new Map<string, StorageRow>();
	combined.forEach(row => {
		if (!row) return;
		if (filterByGroups && !isRowWithinGroups(row, groups)) {
			return;
		}
		const rawId = row.raw?.id ?? row.id;
		const tableName = typeof row.tableName === "number"
			? row.tableName
			: (typeof row.raw?.name === "number" ? row.raw.name : null);
		const key = `${tableName ?? "t"}-${rawId ?? ""}`;
		if (!map.has(key)) {
			map.set(key, row);
		}
	});
	return Array.from(map.values());
}

function inferSourceFromTableName(tableName: number | null | undefined): SelectionSource | undefined {
	if (tableName === 0 || tableName === 2) return "payload";
	if (tableName === 1 || tableName === 3) return "platform";
	return undefined;
}

function isRowWithinGroups(row: StorageRow, groups: IntegratedGroup[]): boolean {
	const tableName = typeof row.tableName === "number"
		? row.tableName
		: (typeof row.raw?.name === "number" ? row.raw.name : null);
	const rowType = row.source || inferSourceFromTableName(tableName);
	const startNo = Number(row.startFileNo);
	if (!Number.isFinite(startNo)) {
		return false;
	}
	return groups.some(group => {
		if (rowType && group.type !== rowType) return false;
		const groupStart = Number(group.startNo);
		const groupEnd = Number(group.endNo);
		if (!Number.isFinite(groupStart) || !Number.isFinite(groupEnd)) {
			return false;
		}
		const min = Math.min(groupStart, groupEnd);
		const max = Math.max(groupStart, groupEnd);
		return startNo >= min && startNo <= max;
	});
}


function resolveTableName(row: StorageRow, satellite: string): number | null {
	if (typeof row.tableName === "number") return row.tableName;
	if (typeof row.raw?.name === "number") return row.raw.name;
	if (row.source) {
		if (satellite === "AS02") {
			return row.source === "payload" ? 0 : 1;
		}
		if (satellite === "AS03") {
			return row.source === "payload" ? 2 : 3;
		}
	}
	return null;
}

function applyLocalStorageStatus(rows: StorageRow[], status: number) {
	const label = statusDict[status] || `状态${status}`;
	const applyStatus = (row: StorageRow) => {
		row.status = status;
		row.statusLabel = label;
		if (row.raw) {
			row.raw.status = status;
		}
	};
	rows.forEach(applyStatus);

	const collections = [
		storageDialog.payload,
		storageDialog.platform,
		storageDialog.selectedPayload,
		storageDialog.selectedPlatform,
	];
	rows.forEach(row => {
		const rawId = row.raw?.id ?? row.id;
		const tableName = typeof row.tableName === "number"
			? row.tableName
			: (typeof row.raw?.name === "number" ? row.raw.name : null);
		const keyId = String(rawId ?? "");
		collections.forEach(list => {
			if (!Array.isArray(list)) return;
			const target = list.find(item => {
				const itemId = String(item.raw?.id ?? item.id ?? "");
				const itemTable = typeof item.tableName === "number"
					? item.tableName
					: (typeof item.raw?.name === "number" ? item.raw.name : null);
				return itemId === keyId && itemTable === tableName;
			});
			if (target) {
				applyStatus(target);
			}
		});
	});
}

async function generateTransferUid(satellite: string): Promise<string> {
	const svc = satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	try {
		const res = await svc?.nextUid?.({ count: 1 });
		const list =
			(Array.isArray(res?.list) && res?.list) ||
			(Array.isArray(res?.data?.list) && res?.data?.list) ||
			(Array.isArray(res?.data) && res?.data) ||
			[];
		if (Array.isArray(list) && list.length) {
			return String(list[0]);
		}
	} catch (err) {
		console.warn("[transfer-plan] 获取数传UID失败", err);
	}
	return `T${Date.now()}`;
}

async function updateFixedStorageStatus(rows: StorageRow[], satellite: string, status: number) {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.update) {
		throw new Error("固存表更新接口不可用");
	}
	for (const row of rows) {
		const tableName = resolveTableName(row, satellite);
		const rawId = row.raw?.id ?? row.id;
		if (tableName == null || rawId == null) continue;
		const idNumber = Number(rawId);
		const id = Number.isFinite(idNumber) ? idNumber : rawId;
		if (tableName != null && typeof row.tableName !== "number") {
			row.tableName = tableName;
		}
		await api.update({
			name: tableName,
			data: { id, status },
		});
	}
}

async function updateTaskTransferRecords(
	satellite: string,
	rows: StorageRow[],
	transferName: string,
	transferTime: string,
	transferUid: string
) {
	const svc = satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc?.page || !svc?.update) {
		throw new Error("任务记录接口不可用");
	}
	const imagingUids = Array.from(
		new Set(
			rows
				.map(row => row.raw?.imagingUid || row.raw?.imaging_uid || row.raw?.imagingUID)
				.filter(uid => uid != null && uid !== "")
				.map(uid => String(uid))
		)
	);
	if (!imagingUids.length) {
		return;
	}
	for (const uid of imagingUids) {
		const res = await svc.page({ page: 1, size: 20, imagingUID: uid });
		const list = res?.list || res?.data?.list || [];
		if (!Array.isArray(list) || !list.length) continue;
		for (const item of list) {
			if (!item?.id) continue;
			const records = Array.isArray(item.transferRecords) ? [...item.transferRecords] : [];
			records.push({ name: transferName, time: transferTime, uid: transferUid });
			await svc.update({
				id: item.id,
				transferName,
				transferTime,
				transferUID: transferUid,
				transferRecords: records,
			});
		}
	}
}

async function syncTransferAfterSubmit(satellite: string): Promise<string | null> {
	const rows = collectSelectedStorageRows();
	if (!rows.length) {
		return null;
	}
	const transferUid = await generateTransferUid(satellite);
	const transferName = form.stationName || form.station || "";
	const transferTimeLocal = formatBeijingTimeString(form.transferT0) || formatBeijingTimeString(new Date());
	await updateTaskTransferRecords(satellite, rows, transferName, transferTimeLocal, transferUid);
	await updateFixedStorageStatus(rows, satellite, STORAGE_STATUS_TRANSFER_SCHEDULED);
	applyLocalStorageStatus(rows, STORAGE_STATUS_TRANSFER_SCHEDULED);
	return transferUid;
}


function buildTransferBody(groups: IntegratedGroup[]): Record<string, string> {
	const stationLabel = form.stationName || form.station || '';
	const transferLabel = form.transferT0 ? String(form.transferT0) : new Date().toISOString();
	const composedName = `${stationLabel}数传任务-${transferLabel}`;
	const satellite = form.satellite;

	if (satellite === 'AS03') {
		const body: Record<string, string> = {
			spacecraftCode: String(satellite ?? ''),
			templateId: '673c2d9049b1f446adc4623b',
			folderId: '6731755b08e123893cf92878',
			name: composedName,
			start_seq: String(form.startCommand ?? ''),
			reset_seq: String(form.reloadTable ?? ''),
			duration: String(form.duration ?? ''),
			t0: toIsoString(form.transferT0),
			trans_count: String(groups.length),
			long: String(form.longitude ?? ''),
			lat: String(form.latitude ?? ''),
			alt: String(form.altitude ?? ''),
		};

		const indexRange = [1, 2, 3, 4, 5, 6];
		indexRange.forEach(idx => {
			body[`start_file${idx}`] = '';
			body[`end_file${idx}`] = '';
			body[`module${idx}`] = '';
			if (idx <= 5) {
				body[`trans_time${idx}`] = '';
			}
		});

		const payloadPerFile = 30;
		const platformPerFile = 30;
		let accumulatedDuration = 0;

		groups.forEach((group, groupIndex) => {
			const slot = groupIndex + 1;
			if (slot > indexRange.length) return;
			const startKey = `start_file${slot}`;
			const endKey = `end_file${slot}`;
			const moduleKey = `module${slot}`;
			const timeKey = slot <= 5 ? `trans_time${slot}` : null;
			const perFileForType = group.type === 'platform' ? platformPerFile : payloadPerFile;
			const fallbackDuration = perFileForType * Math.max(1, Number(group.count) || 0);
			const normalizedDuration = normalizeDuration(group.duration, fallbackDuration);

			body[startKey] = String(group.startNo ?? '');
			body[endKey] = String(group.endNo ?? '');
			body[moduleKey] = mapTransferType(group.type);
			if (timeKey) {
				body[timeKey] = normalizedDuration;
			}

			const parsedDuration = Number(normalizedDuration);
			if (Number.isFinite(parsedDuration)) {
				accumulatedDuration += parsedDuration;
			}
		});

		if (accumulatedDuration > 0) {
			body.duration = String(accumulatedDuration);
		}

		return body;
	}

	const body: Record<string, string> = {
		spacecraftCode: String(satellite ?? ''),
		templateId: TRANSFER_TEMPLATE_ID,
		folderId: TRANSFER_FOLDER_ID,
		name: composedName,
		start_seq: String(form.startCommand ?? ''),
		reset_seq: String(form.reloadTable ?? ''),
		t0: toIsoString(form.transferT0),
		duration: String(form.duration ?? ''),
		trans_count: String(groups.length),
		long: String(form.longitude ?? ''),
		lat: String(form.latitude ?? ''),
		alt: String(form.altitude ?? ''),
	};

	START_END_TYPE_SUFFIXES.forEach((suffix) => {
		const startKey = `start_file${suffix}`;
		const endKey = `end_file${suffix}`;
		const typeKey = `trans_type${suffix}`;
		body[startKey] = '';
		body[endKey] = '';
		body[typeKey] = '';
	});

	TRANS_TIME_SUFFIXES.forEach((suffix) => {
		body[`trans_time${suffix}`] = '';
	});

	const payloadPerFile = satellite === 'AS02' ? 90 : 30;
	const platformPerFile = 30;
	let accumulatedDuration = 0;

	groups.forEach((group, index) => {
		if (index >= START_END_TYPE_SUFFIXES.length) return;
		const startSuffix = START_END_TYPE_SUFFIXES[index];
		const timeSuffix = TRANS_TIME_SUFFIXES[index];
		const startKey = `start_file${startSuffix}`;
		const endKey = `end_file${startSuffix}`;
		const typeKey = `trans_type${startSuffix}`;
		const timeKey = `trans_time${timeSuffix}`;
		const perFileForType = group.type === 'platform' ? platformPerFile : payloadPerFile;
		const fallbackDuration = perFileForType * Math.max(1, Number(group.count) || 0);
		const normalizedDuration = normalizeDuration(group.duration, fallbackDuration);
		body[startKey] = String(group.startNo ?? '');
		body[endKey] = String(group.endNo ?? '');
		body[timeKey] = normalizedDuration;
		body[typeKey] = mapTransferType(group.type);
		const parsedDuration = Number(normalizedDuration);
		if (Number.isFinite(parsedDuration)) {
			accumulatedDuration += parsedDuration;
		}
	});

	if (accumulatedDuration > 0) {
		body.duration = String(accumulatedDuration);
	}

	return body;
}

async function validateCommandRequest(
	type: 'image' | 'transfer' | 'delete',
	satellite: string,
	params: any
): Promise<void> {
	const payload = { type, satellite, params };
	const url = `${appConfig.baseUrl}/admin/task/command/validate`;
	try {
		const res = await request({
			url,
			method: 'POST',
			data: payload,
			NProgress: false,
		} as any);
		const result = (res as any)?.data ?? res;
		if (result?.ok === false && Array.isArray(result?.errors)) {
			const msg = result.errors.map((e: any) => `${e.field}: ${e.message}`).join('；');
			throw new Error(msg || '指令参数校验未通过');
		}
	} catch (err: any) {
		throw new Error(err?.message || '指令参数校验失败');
	}
}

async function submitTransferTask() {
	const satellite = form.satellite;
	resetTransferNotice();
	if (!satellite) {
		ElMessage.warning('请先选择卫星');
		return;
	}
	if (!integratedGroups.value.length) {
		ElMessage.warning('请先生成数传信息');
		return;
	}
	if (!form.transferT0) {
		ElMessage.warning('请填写数传T0时间');
		return;
	}

	if (!validateTransferParams()) {
		return;
	}

	const incomplete = integratedGroups.value.some((group) => !group.startNo || !group.endNo);
	if (incomplete) {
		ElMessage.warning('请补全数传文件范围');
		return;
	}

	transferSubmitting.value = true;
	try {
		const token = await acquireToken();
		const body = buildTransferBody(integratedGroups.value);
		console.log('[transfer-plan] submit payload:', body);
		await validateCommandRequest('transfer', satellite, body);
		const resp = await fetch(TRANSFER_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-web-token': token,
			},
			body: JSON.stringify(body),
		});
		if (!resp.ok) {
			const errText = await resp.text();
			throw new Error(errText || `HTTP ${resp.status}`);
		}
		await updateStorageStatusAfterTransfer(satellite as 'AS02' | 'AS03', integratedGroups.value);
		const transferUid = await syncTransferAfterSubmit(satellite);
		const summary = buildTransferSummary([...integratedGroups.value], satellite);
		if (transferUid) {
			ElMessage.success(`数传任务提交成功，流程UID：${transferUid}`);
			showTransferNotice('success', summary, `流程UID：${transferUid}`);
		} else {
			ElMessage.success('数传任务提交成功');
			showTransferNotice('success', summary);
		}
	} catch (err: any) {
		const message = err?.message || err || 'unknown error';
		ElMessage.error(`数传任务提交失败: ${message}`);
		showTransferNotice('danger', '数传任务提交失败', String(message));
	} finally {
		transferSubmitting.value = false;
	}
}

function addIntegratedGroup() {
	const defaultType: SelectionSource = confirmedStorage.payload.length
		? "payload"
		: confirmedStorage.platform.length
		? "platform"
		: "payload";
	integratedGroups.value.push({
		id: `custom-${Date.now()}-${integratedGroups.value.length}`,
		startNo: "",
		endNo: "",
		count: 0,
		duration: 0,
		type: defaultType,
	});
}

function removeIntegratedGroup(index: number) {
	integratedGroups.value.splice(index, 1);
}

type Range = { start: number; end: number };

function parseFileTextRanges(text: string): { payload: Range[]; platform: Range[] } {
	const payload: Range[] = [];
	const platform: Range[] = [];
	let current: 'payload' | 'platform' = 'payload';
	const parts = String(text || '')
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean);
	const push = (type: 'payload' | 'platform', seg: string) => {
		const [s, e] = seg.split('-').map((n) => Number(n));
		if (Number.isFinite(s)) {
			const range: Range = { start: s, end: Number.isFinite(e) ? e : s };
			(type === 'payload' ? payload : platform).push(range);
		}
	};
	for (const part of parts) {
		if (part.startsWith('载荷:')) {
			current = 'payload';
			push('payload', part.slice(3));
			continue;
		}
		if (part.startsWith('平台:')) {
			current = 'platform';
			push('platform', part.slice(3));
			continue;
		}
		push(current, part);
	}
	return { payload, platform };
}

async function updateStorageStatusAfterTransfer(
	satellite: string,
	groups: IntegratedGroup[],
	fileText?: string
) {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page || !api?.batchUpdate) return;
	const tableMap =
		satellite === 'AS02'
			? { payload: 0, platform: 1 }
			: { payload: 2, platform: 3 };
	const fromGroups = groups.reduce(
		(acc, g) => {
			const start = Number(g.startNo);
			const end = Number(g.endNo ?? g.startNo);
			if (Number.isFinite(start)) {
				const range: Range = {
					start,
					end: Number.isFinite(end) ? end : start,
				};
				if ((g as any).type === 'platform') {
					acc.platform.push(range);
				} else {
					acc.payload.push(range);
				}
			}
			return acc;
		},
		{ payload: [] as Range[], platform: [] as Range[] }
	);
	if (fileText) {
		const parsed = parseFileTextRanges(fileText);
		fromGroups.payload.push(...parsed.payload);
		fromGroups.platform.push(...parsed.platform);
	}

	const updateByTable = async (name: number, ranges: Range[]) => {
		if (!ranges.length) return;
		const res = await api.page({ page: 1, size: 500, name });
		const list = res?.list || res?.data?.list || [];
		const ids: number[] = [];
		for (const row of list) {
			const start = Number(row?.startFileNo ?? row?.start_file_no);
			if (!Number.isFinite(start)) continue;
			if (
				ranges.some((r) => start >= r.start && start <= r.end) &&
				row?.status !== 7
			) {
				const id = Number(row.id);
				if (Number.isFinite(id)) ids.push(id);
			}
		}
		if (ids.length) {
			await api.batchUpdate({ ids, name, data: { status: 7 } });
		}
	};

	await updateByTable(tableMap.payload, fromGroups.payload);
	await updateByTable(tableMap.platform, fromGroups.platform);
}
onMounted(() => {
	fetchStationOptions();
});

</script>

<style scoped>
.plan-form-card {
	margin-bottom: 16px;
}

.plan-form {
	align-items: flex-start;
	flex-wrap: wrap;
}

.plan-form-header {
	font-weight: 600;
}

.station-row {
	width: 100%;
	margin: 4px 0;
}

.form-actions {
	margin-top: 8px;
}

.selection-card {
	margin-top: 16px;
}

.selection-header {
	font-weight: 600;
}

.selection-title {
	margin: 0 0 8px 0;
	font-size: 14px;
}

.integrated-groups {
	margin-top: 16px;
}

.integrated-group {
	padding: 12px;
	border: 1px dashed var(--el-border-color-base, #dcdfe6);
	border-radius: 6px;
	margin-bottom: 12px;
}

.group-title {
	margin: 0 0 8px 0;
	font-size: 13px;
	color: #606266;
}

.integrated-form .range-input {
	width: 120px;
}

.range-sep {
	margin: 0 8px;
	color: #909399;
}
</style>
