<template>
	<div class="history-transfer-page">
		<el-card shadow="never" class="history-transfer-card">
			<template #header>
				<div style="font-weight: 600">平台历史文件转存任务</div>
			</template>

			<el-form label-width="120px" :model="form">
				<el-form-item label="卫星">
					<el-select v-model="form.satellite" class="w-md">
						<el-option label="AS02" value="AS02" />
						<el-option label="AS03" value="AS03" />
					</el-select>
				</el-form-item>

				<el-form-item label="开始指令号" required>
					<el-input-number
						v-model="form.startSeq"
						:min="3"
						:step="1"
						controls-position="right"
						class="w-md"
					/>
				</el-form-item>

				<el-form-item v-if="form.satellite === 'AS02'" label="记录文件号" required>
					<el-input-number
						v-model="form.recordFile"
						:min="1"
						:step="1"
						controls-position="right"
						class="w-md"
					/>
				</el-form-item>

				<el-form-item v-if="form.satellite === 'AS03'" label="页数" required>
					<el-input-number
						v-model="form.pageCount"
						:min="1"
						:step="1"
						controls-position="right"
						class="w-md"
					/>
				</el-form-item>

				<el-form-item v-if="form.satellite === 'AS03'" label="间隔(s)" required>
					<el-input-number
						v-model="form.interval"
						:min="1"
						:step="1"
						controls-position="right"
						class="w-md"
					/>
				</el-form-item>

				<el-form-item v-if="form.satellite === 'AS03'" label="平台选择" required>
					<el-select v-model="form.platform" class="w-md">
						<el-option label="A" value="0" />
						<el-option label="B" value="1" />
					</el-select>
				</el-form-item>

				<el-form-item label="开始时间" required>
					<el-date-picker
						v-model="form.startTime"
						type="datetime"
						value-format="YYYY-MM-DD HH:mm:ss"
						placeholder="请选择开始时间"
						class="w-md"
					/>
				</el-form-item>

				<el-form-item label="开始日期" required>
					<el-date-picker
						v-model="form.startDate"
						type="date"
						value-format="YYYY-MM-DD"
						placeholder="请选择开始日期"
						class="w-md"
					/>
				</el-form-item>

				<el-form-item label="结束日期" required>
					<el-date-picker
						v-model="form.endDate"
						type="date"
						value-format="YYYY-MM-DD"
						placeholder="请选择结束日期"
						class="w-md"
					/>
				</el-form-item>
			</el-form>

			<div style="display: flex; gap: 8px; margin-top: 8px; margin-left: 120px">
				<el-button type="primary" :loading="state.submitting" @click="handleSubmit">校验并提交</el-button>
				<el-button @click="resetResult">清空结果</el-button>
			</div>

			<el-alert
				v-if="state.validateMsg"
				:title="state.validateMsg"
				:type="state.validateType"
				:closable="false"
				show-icon
				style="margin-top: 16px"
			/>

			<el-divider />

			<el-form label-width="120px">
				<el-form-item label="提交结果">
					<el-input
						v-model="state.submitResult"
						type="textarea"
						:autosize="{ minRows: 4, maxRows: 10 }"
						readonly
						placeholder="提交后显示返回信息"
					/>
				</el-form-item>
			</el-form>
		</el-card>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: "history-task",
});

import { reactive, watch } from "vue";
import { ElMessage } from "element-plus";
import { config as appConfig } from "/@/config";
import { request } from "/@/cool/service/request";

const HISTORY_TRANSFER_TEMPLATE_MAP: Record<string, string> = {
	AS02: "673c2d9049b1f446adc46238",
	AS03: "673c2d8f49b1f446adc46235", // AS03 模板ID
};

const HISTORY_TRANSFER_FOLDER_MAP: Record<string, string> = {
	AS02: "6731752608e123893cf92873",
	AS03: "6731755b08e123893cf92878",
};

const form = reactive({
	satellite: "AS02",
	name: "",
	startSeq: 3,
	recordFile: undefined as number | undefined,
	startTime: "",
	startDate: "",
	endDate: "",
	pageCount: 40,
	interval: 2,
	platform: "0",
	targetName: "历史文件转存",
});

const state = reactive({
	submitting: false,
	validateMsg: "",
	validateType: "info" as "success" | "warning" | "error" | "info",
	submitResult: "",
});

watch(
	() => form.satellite,
	(sat) => {
		if (sat === "AS03") {
			form.recordFile = undefined;
			if (!form.pageCount) form.pageCount = 40;
			if (!form.interval) form.interval = 2;
			if (form.platform !== "0" && form.platform !== "1") form.platform = "0";
			if (!form.targetName) form.targetName = "历史文件转存";
		} else {
			form.pageCount = 40;
			form.interval = 2;
			form.platform = "0";
			form.targetName = "历史文件转存";
		}
	},
	{ immediate: true }
);

function toIsoString(val: string) {
	if (!val) return "";
	const normalized = val.includes("T") ? val : val.replace(" ", "T");
	const date = new Date(normalized);
	return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getTemplateIdBySatellite(satellite: string) {
	return HISTORY_TRANSFER_TEMPLATE_MAP[satellite] || "";
}

function getFolderIdBySatellite(satellite: string) {
	return HISTORY_TRANSFER_FOLDER_MAP[satellite] || "";
}

function buildCommandBody() {
	const startTimeIso = toIsoString(form.startTime || "");
	const templateId = getTemplateIdBySatellite(form.satellite);
	const folderId = getFolderIdBySatellite(form.satellite);
	const baseParams: any = {
		spacecraftCode: form.satellite,
		templateId,
		folderId,
		name: form.name || "",
		start_seq: String(form.startSeq ?? ""),
		start_time: startTimeIso,
		start_date: form.startDate || "",
		end_date: form.endDate || "",
	};

	if (form.satellite === "AS02") {
		baseParams.record_file = String(form.recordFile ?? "");
		baseParams.taskLogMeta = {
			historyTransfer: {
				startSeq: form.startSeq,
				recordFileNo: form.recordFile,
				startDate: form.startDate,
				endDate: form.endDate,
			},
		};
	} else {
		baseParams.page = String(form.pageCount ?? "");
		baseParams.interval = String(form.interval ?? "");
		baseParams.platform = String(form.platform ?? "0");
		baseParams.target_name = form.targetName || "历史文件转存";
		baseParams.taskLogMeta = {
			historyTransfer: {
				startSeq: form.startSeq,
				startDate: form.startDate,
				endDate: form.endDate,
				page: form.pageCount,
				interval: form.interval,
				platform: form.platform,
				targetName: form.targetName || "历史文件转存",
			},
		};
	}

	return {
		type: "history_transfer",
		satellite: form.satellite,
		taskTime: startTimeIso,
		params: baseParams,
	};
}

function formatValidateErrors(errors: any[]) {
	return (errors || []).map((e: any) => `${e.field}: ${e.message}`).join("；");
}

function buildSubmitSummary() {
	const range = `${form.startDate || "-"}~${form.endDate || "-"}`;
	const execTime = form.startTime || "-";
	if (form.satellite === "AS02") {
		return `上注平台历史文件转存任务，转存时间区间${range}，任务执行时间：${execTime}，写入文件号：${form.recordFile ?? "-"}`;
	}
	return `上注平台历史文件转存任务，转存时间区间${range}，任务执行时间：${execTime}`;
}

function resetResult() {
	state.validateMsg = "";
	state.submitResult = "";
	state.validateType = "info";
}

async function handleSubmit() {
	state.submitting = true;
	if (!getTemplateIdBySatellite(form.satellite)) {
		const msg = `${form.satellite} 未配置模板ID`;
		state.validateType = "error";
		state.validateMsg = msg;
		state.submitting = false;
		ElMessage.error(msg);
		return;
	}
	if (!getFolderIdBySatellite(form.satellite)) {
		const msg = `${form.satellite} 未配置folderId`;
		state.validateType = "error";
		state.validateMsg = msg;
		state.submitting = false;
		ElMessage.error(msg);
		return;
	}

	try {
		const payload = buildCommandBody();
		const res = await request({
			url: `${appConfig.baseUrl}/admin/task/command/submit`,
			method: "POST",
			data: payload,
			NProgress: false,
		} as any);
		const result = (res as any)?.data ?? res;
		if (result?.ok === false) {
			const msg = formatValidateErrors(result?.errors || []) || "任务提交失败";
			state.validateType = "error";
			state.validateMsg = msg;
			throw new Error(msg);
		}

		state.validateType = "success";
		state.validateMsg = "任务提交成功";
		const summary = buildSubmitSummary();
		state.submitResult = summary;
		ElMessage.success("平台转存任务提交成功");
	} catch (err: any) {
		const msg = err?.message || "任务提交失败";
		state.submitResult = msg;
		ElMessage.error(msg);
	} finally {
		state.submitting = false;
	}
}
</script>

<style scoped>
.history-transfer-page {
	padding: 12px;
}

.w-md {
	width: 220px;
}

.w-lg {
	width: 420px;
}
</style>



