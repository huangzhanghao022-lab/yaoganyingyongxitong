<template>
	<cl-crud ref="Crud">
		<cl-row>
			<el-card shadow="never" class="plan-form-card">
				<template #header>
					<div class="plan-form-header">数传规划参数</div>
				</template>
				<el-form :model="form" :inline="true" label-width="110px" class="plan-form">
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
					<el-form-item label="开始绝对延时指令号" label-width="150px">
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
						<el-input v-model="form.duration" placeholder="请输入持续时间（秒）" clearable style="width: 180px;" />
					</el-form-item>
					<el-row :gutter="16" class="station-row">
						<!-- 数传站：占 8 格 -->
						<el-col :span="8">
							<el-form-item label="数传站" class="fi-station">
							<el-select
								v-model="form.station"
								placeholder="请选择数传站"
								clearable
								filterable
								:loading="stationLoading"
								@change="handleStationChange"
								style="width: 100%;"
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

						<!-- 经度：占 5 格 -->
						<el-col :span="5">
							<el-form-item label="经度" class="fi-lon" label-width="50px">
							<el-input v-model="form.longitude" placeholder="--" readonly />
							</el-form-item>
						</el-col>

						<!-- 纬度：占 5 格 -->
						<el-col :span="5">
							<el-form-item label="纬度" class="fi-lat" label-width="50px">
							<el-input v-model="form.latitude" placeholder="--" readonly />
							</el-form-item>
						</el-col>

						<!-- 海拔：占 6 格 -->
						<el-col :span="6">
							<el-form-item label="海拔" class="fi-alt" label-width="50px">
							<el-input v-model="form.altitude" placeholder="--" readonly />
							</el-form-item>
						</el-col>
						</el-row>
				</el-form>
			</el-card>
		</cl-row>
		<cl-row>
			<cl-refresh-btn />
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
</template>

<script lang="ts" setup>
defineOptions({
	name: "transfer-plan-plan",
});

import { useTable, useUpsert, useSearch } from "@cool-vue/crud";
import { useI18n } from "vue-i18n";
import { reactive, computed, ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import axios from "axios";

const { t } = useI18n();

const TOKEN_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token";
const ANTENNA_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi-transform/get-all-antenna";

const form = reactive({
	satellite: "AS02",
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

const stationOptions = ref<StationOption[]>([]);
const stationLoading = ref(false);

const isAS03 = computed(() => form.satellite === "AS03");

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
	align-items: center;
}

.plan-form-header {
	font-weight: 600;
}


</style>