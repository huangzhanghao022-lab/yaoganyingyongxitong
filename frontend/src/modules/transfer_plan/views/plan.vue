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
							<el-radio-button label="1">是</el-radio-button>
							<el-radio-button label="0">否</el-radio-button>
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
						border
						height="280"
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
						border
						height="280"
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

import { useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useI18n } from "vue-i18n";
import { reactive, computed, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { View } from "@element-plus/icons-vue";
import axios from "axios";
import { useCool } from "/@/cool";

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
};

type TagStyle = { type?: 'info' | 'warning' | 'danger' | 'success' | 'primary'; color?: string };

const statusTagMap: Record<number, TagStyle> = {
	0: { type: "info" },
	1: { type: "primary" },
	2: { type: "warning" },
	3: { color: "#f78fb3" },
	4: { type: "danger" },
	5: { type: "danger" },
	6: { type: "success" },
};

const form = reactive({
	satellite: "AS02" as "AS02" | "AS03",
	reloadTable: "0",
	startCommand: "",
	station: "",
	stationName: "",
	longitude: "",
	latitude: "",
	altitude: "",
	transferT0: "",
	duration: "",
});

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

const confirmedStorage = reactive({
	payload: [] as StorageRow[],
	platform: [] as StorageRow[],
});

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

function mapStorageRow(item: Record<string, any>): StorageRow {
	const display = item.targetName || item.fileName || item.platformFileName || item.code || "-";
	const startFileNo = item.startFileNo ?? item.beginFileNo ?? item.fileNo ?? "-";
	const status = typeof item.status === "number" ? item.status : null;
	const updateTime = item.updateTime || item.writeTime || "-";
	return {
		id: item.id ?? `${display}-${startFileNo}`,
		display,
		startFileNo: String(startFileNo ?? "-") || "-",
		status,
		statusLabel: status != null ? (statusDict[status] || `状态${status}`) : "-",
		updateTime,
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
	return list
		.map((item: any) => mapStorageRow(item))
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
	storageDialog.visible = false;
}

onMounted(() => {
	fetchStationOptions();
});

const Upsert = useUpsert({ items: [] });
const Table = useTable({ columns: [{ label: t("#"), type: "index" }] });
const Search = useSearch();
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
</style>
