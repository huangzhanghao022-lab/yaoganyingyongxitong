<template>
	<div class="orbit-control-page">
		<el-card shadow="never" class="orbit-control-card">
			<template #header>
				<div class="card-title">AS02轨控任务</div>
			</template>

			<el-scrollbar class="card-scroll">
				<div class="content-wrap">
					<div class="section-block">
						<div class="section-title">参数设置</div>
						<el-form label-width="120px" class="task-form">
							<el-form-item label="Excel文件" required>
								<el-upload
									:auto-upload="false"
									:limit="1"
									:on-change="handleFileChange"
									:on-remove="handleFileRemove"
									accept=".xlsx,.xls"
								>
									<el-button type="primary" plain>选择Excel</el-button>
								</el-upload>
							</el-form-item>
						</el-form>
					</div>

					<div class="actions-bar">
						<el-button :loading="state.previewing" @click="handlePreview">解析预览</el-button>
						<el-button type="primary" :loading="state.submitting" @click="handleSubmit">校验并提交</el-button>
						<el-button @click="resetAll">清空结果</el-button>
					</div>

					<el-alert
						v-if="state.message"
						:title="state.message"
						:type="state.messageType"
						:closable="false"
						show-icon
						class="state-alert"
					/>

					<div class="section-block preview-block">
						<div class="section-head">
							<div class="section-title">解析结果</div>
							<div v-if="state.previewRows.length" class="section-meta">共 {{ state.previewRows.length }} 条</div>
						</div>

						<div v-if="!state.previewRows.length" class="empty-hint">
							请先选择 Excel 文件并点击“解析预览”
						</div>

						<el-table
							v-else
							:data="state.previewRows"
							border
							size="small"
							:max-height="360"
							class="preview-table"
						>
							<el-table-column prop="rowNo" label="行号" width="80" />
							<el-table-column prop="start" label="轨控起始时间戳" min-width="180" />
							<el-table-column prop="end" label="轨控结束时间戳" min-width="180" />
							<el-table-column prop="duration" label="持续时间(s)" width="120" />
						</el-table>
					</div>

					<div class="section-block result-block">
						<div class="section-title">提交结果</div>
						<el-input
							v-model="state.submitResult"
							type="textarea"
							:autosize="{ minRows: 5, maxRows: 10 }"
							readonly
							placeholder="提交后显示结果"
						/>
					</div>
				</div>
			</el-scrollbar>
		</el-card>
	</div>
</template>

<script lang="ts" setup>
import { reactive } from "vue";
import { ElMessage } from "element-plus";
import type { UploadFile } from "element-plus";
import { request } from "/@/cool/service/request";
import { config as appConfig } from "/@/config";

defineOptions({ name: "orbit-control-as02" });

const form = reactive({
	name: "",
});

const state = reactive({
	file: null as File | null,
	previewing: false,
	submitting: false,
	message: "",
	messageType: "info" as "success" | "warning" | "error" | "info",
	previewRows: [] as any[],
	submitResult: "",
});

function buildFormData() {
	if (!state.file) throw new Error("请先选择Excel文件");
	const data = new FormData();
	data.append("files", state.file);
	data.append("sourceFileName", state.file.name);
	data.append("name", form.name || "");
	return data;
}

function handleFileChange(file: UploadFile) {
	state.file = (file.raw as File) || null;
}

function handleFileRemove() {
	state.file = null;
}

function resetAll() {
	state.message = "";
	state.submitResult = "";
	state.previewRows = [];
	state.messageType = "info";
}

async function handlePreview() {
	if (!state.file) {
		ElMessage.warning("请先选择Excel文件");
		return;
	}
	state.previewing = true;
	try {
		const res = await request({
			url: `${appConfig.baseUrl}/admin/orbit_control/as02/preview_excel`,
			method: "POST",
			data: buildFormData(),
			headers: { "Content-Type": "multipart/form-data" },
			NProgress: false,
		} as any);
		const result = (res as any)?.data ?? res;
		state.previewRows = result?.rows || [];
		state.messageType = "success";
		state.message = `解析成功：共 ${result?.count ?? state.previewRows.length} 条`;
	} catch (err: any) {
		state.messageType = "error";
		state.message = err?.message || "解析失败";
		ElMessage.error(state.message);
	} finally {
		state.previewing = false;
	}
}

async function handleSubmit() {
	if (!state.file) {
		ElMessage.warning("请先选择Excel文件");
		return;
	}
	state.submitting = true;
	try {
		const res = await request({
			url: `${appConfig.baseUrl}/admin/orbit_control/as02/submit_excel`,
			method: "POST",
			data: buildFormData(),
			headers: { "Content-Type": "multipart/form-data" },
			NProgress: false,
		} as any);
		const result = (res as any)?.data ?? res;
		if (!result?.ok) {
			throw new Error(result?.error || "提交失败");
		}
		state.messageType = "success";
		state.message = `提交成功：共 ${result?.successCount ?? 0} 条`;
		state.submitResult = `上注轨控任务批次提交完成，共 ${result?.successCount ?? 0} 条`;
		ElMessage.success("轨控任务提交成功");
	} catch (err: any) {
		const msg = err?.message || "提交失败";
		state.messageType = "error";
		state.message = msg;
		state.submitResult = msg;
		ElMessage.error(msg);
	} finally {
		state.submitting = false;
	}
}
</script>

<style scoped>
.orbit-control-page {
	height: calc(100vh - 86px);
	min-height: 620px;
	padding: 12px;
	box-sizing: border-box;
}

.orbit-control-card {
	height: 100%;
}

:deep(.orbit-control-card .el-card__body) {
	height: calc(100% - 56px);
	padding: 0;
}

.card-title {
	font-weight: 600;
	font-size: 16px;
}

.card-scroll {
	height: 100%;
}

.content-wrap {
	padding: 16px 18px 18px;
}

.section-block {
	background: #fafbfd;
	border: 1px solid #ebeef5;
	border-radius: 10px;
	padding: 14px 16px;
	margin-bottom: 14px;
}

.section-title {
	font-weight: 600;
	font-size: 14px;
	color: #303133;
	margin-bottom: 12px;
}

.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.section-head .section-title {
	margin-bottom: 0;
}

.section-meta {
	font-size: 12px;
	color: #909399;
}

.task-form {
	max-width: 860px;
}

.actions-bar {
	display: flex;
	gap: 8px;
	margin: 2px 0 14px;
	padding-left: 120px;
}

.state-alert {
	margin-bottom: 14px;
}

.empty-hint {
	padding: 20px 16px;
	border: 1px dashed #dcdfe6;
	border-radius: 8px;
	background: #fff;
	color: #909399;
	font-size: 13px;
}

.preview-table {
	background: #fff;
}

.result-block {
	margin-bottom: 0;
}

.w-lg {
	width: 420px;
}
</style>
