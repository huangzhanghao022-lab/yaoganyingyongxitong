<template>
	<div class="one-click-page">
		<el-card shadow="never" class="mb16">
			<template #header>
				<div class="card-header">
					<span>一键规划模块</span>
					<el-space>
						<el-date-picker
							v-model="form.date"
							type="date"
							:clearable="false"
							placeholder="选择日期"
							format="YYYY-MM-DD"
							value-format="x"
							style="width: 160px"
						/>
						<el-select v-model="form.satellite" style="width: 140px">
							<el-option label="AS02" value="AS02" />
							<el-option label="AS03" value="AS03" />
						</el-select>
						<el-button type="primary" :loading="loading" @click="runOneClickPlan">一键规划</el-button>
						<el-button
							type="success"
							:loading="submitting"
							:disabled="!timeline.length"
							@click="openSubmitSummaryDialog"
						>
							提交规划
						</el-button>
					</el-space>
				</div>
			</template>

			<el-space :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-checkbox v-model="taskSwitches.imaging">规划成像</el-checkbox>
				<el-checkbox v-if="form.satellite === 'AS02'" v-model="taskSwitches.transfer">规划数传</el-checkbox>
				<el-checkbox v-if="form.satellite === 'AS02'" v-model="taskSwitches.delete">规划固存删除</el-checkbox>
			</el-space>
			<el-space v-if="planningProgress.visible" :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-progress :percentage="planningProgress.percent" :status="planningProgress.status" style="min-width: 260px" />
				<span style="color: var(--el-text-color-regular);">{{ planningProgress.text }}</span>
			</el-space>
			<el-space
				v-if="planningProgress.visible && planningSelection.length"
				direction="vertical"
				style="margin-top: 4px; padding: 6px 10px; background: #f5f7fa; border-radius: 6px; width: 100%;"
				:size="4"
			>
				<div v-for="(msg, idx) in planningSelection" :key="idx" style="font-size: 13px; color: #606266;">
					{{ msg }}
				</div>
			</el-space>
			<br />
			<el-space :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-space align="center">
					<span class="field-label">成像开始时间：</span>
					<el-date-picker
						v-model="form.rangeStart"
						type="datetime"
						placeholder="选择开始时间"
						value-format="x"
						style="width: 200px"
					/>
				</el-space>
				<el-space align="center">
					<span class="field-label">成像结束时间：</span>
					<el-date-picker
						v-model="form.rangeEnd"
						type="datetime"
						placeholder="选择结束时间"
						value-format="x"
						style="width: 200px"
					/>
				</el-space>
			</el-space>
			

			<br />
			<el-space :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-space align="center">
					<span class="field-label">是否重新加载表：</span>
					<el-checkbox v-model="reloadTableFlag">重新加载表</el-checkbox>
				</el-space>
				
				<el-space align="center">
					<span class="field-label">绝对延时起始号：</span>
					<el-input-number
						v-model="absStartSeq"
						:min="1"
						:max="400"
						:step="1"
						controls-position="right"
						style="width: 100px"
					/>
				</el-space>

				<el-space align="center">
					<span class="field-label">成像任务数量：</span>
					<el-input-number
						v-model="imagingTaskCount"
						:min="1"
						:max="8"
						:step="1"
						controls-position="right"
						style="width: 100px"
					/>
				</el-space>

				<el-space v-if="form.satellite === 'AS02'" align="center">
					<span class="field-label">数传任务数量：</span>
					<el-input-number
						v-model="transferTaskCount"
						:min="1"
						:max="9"
						:step="1"
						controls-position="right"
						style="width: 100px"
					/>
				</el-space>

				<el-space align="center">
					<span class="field-label">云量上限(%)：</span>
					<el-input-number
						v-model="cloudLimit"
						:min="0"
						:max="100"
						:step="1"
						controls-position="right"
						style="width: 100px"
					/>
				</el-space>

				<el-space align="center">
					<span class="field-label">侧摆角上限(°)：</span>
					<el-input-number
						v-model="rollLimitAbs"
						:min="0"
						:max="60"
						:step="1"
						controls-position="right"
						style="width: 100px"
					/>
				</el-space>
			</el-space>



		</el-card>

	<el-card shadow="never">
		<template #header>
			<div class="card-header">
				<span>任务执行时间轴</span>
				<span class="card-actions" v-if="timeline.length">
					<el-tag type="success" effect="plain">共 {{ timeline.length }} 个</el-tag>
					<el-space>
						<el-button size="small" type="primary" plain @click="openEditDialog">调整任务</el-button>
					</el-space>
				</span>
				</div>
			</template>

		<div v-if="timeline.length" class="timeline-chart" ref="chartRef"></div>
		<el-empty v-else description="暂无任务" :image-size="120" />
	</el-card>
	<el-button v-if="submissionSummary" type="primary" plain @click="openSubmitSummaryDialog">查看任务摘要</el-button>
	<el-button v-if="timeline.length" type="info" plain @click="sequenceDialogVisible = true">查看时序图</el-button>

	<el-dialog v-model="submissionDialogVisible" title="任务摘要" width="720px" :append-to-body="true">
		<div class="summary-text">{{ submissionSummary }}</div>
		<template #footer>
			<el-space>
				<el-button @click="submissionDialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="submitting" @click="submitPlannedTasks">确认提交</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="sequenceDialogVisible" title="任务时序" width="760px" :append-to-body="true">
		<el-timeline style="max-height: 480px; overflow: auto;">
			<el-timeline-item
				v-for="item in sequenceItems"
				:key="item.id"
				:timestamp="item.time"
				:type="item.type"
			>
				<div class="seq-title">{{ item.name || "任务" }}</div>
				<div class="seq-meta">{{ item.meta || "-" }}</div>
			</el-timeline-item>
		</el-timeline>
		<template #footer>
			<el-button type="primary" @click="sequenceDialogVisible = false">关闭</el-button>
		</template>
	</el-dialog>

	<el-dialog v-model="editDialogVisible" title="调整任务" width="820px" :append-to-body="true">
		<el-space style="margin-bottom: 8px;">
			<el-button size="small" type="primary" plain @click="openTransferPickDialog">
				新增数传任务
			</el-button>
		</el-space>
		<el-table :data="editableTasks" border height="520px" style="width: 100%;">
			<el-table-column prop="name" label="名称" min-width="120">
				<template #default="{ row }">
					<el-input v-model="row.name" />
				</template>
			</el-table-column>
			<el-table-column prop="startTsValue" label="开始时间" min-width="180">
				<template #default="{ row }">
					<el-date-picker
						v-model="row.startTsValue"
						type="datetime"
						value-format="x"
						style="width: 180px"
					/>
				</template>
			</el-table-column>
			<el-table-column prop="metaFields" label="描述" min-width="260">
				<template #default="{ row }">
					<div class="meta-fields">
						<div v-if="row.type === 'data'" class="meta-item file-inline">
							<span class="meta-sep" style="white-space: nowrap;">文件号：</span>
							<el-input v-model="row.fileInput" placeholder="例如 65,73,81,89" />
						</div>
						<div v-else-if="row.type === 'info'" class="meta-item">
							<span class="meta-sep" style="white-space: nowrap;">记录文件号：</span>
							<el-input v-model="row.storageSlot" placeholder="如 225" />
						</div>
						<div v-else-if="row.type === 'delete'" class="meta-item file-inline">
							<span class="meta-sep" style="white-space: nowrap;">删除文件：</span>
							<el-input v-model="row.deleteRange" placeholder="如 41-72" />
						</div>
					</div>
				</template>
			</el-table-column>
			<el-table-column prop="type" label="类型" width="90">
				<template #default="{ row }">
					<el-tag size="small">{{ row.type }}</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="_deleted" label="操作" width="140">
				<template #default="{ row }">
					<div class="action-buttons">
						<el-button
							v-if="row.type === 'data'"
							size="small"
							type="primary"
							text
							@click="openTransferFilePickDialog(row)"
						>
							选择固存文件
						</el-button>
						<el-button
							size="small"
							:type="row._deleted ? 'info' : 'danger'"
							text
							@click="toggleDelete(row)"
						>
							{{ row._deleted ? "撤销" : "删除" }}
						</el-button>
					</div>
				</template>
			</el-table-column>
		</el-table>
		<template #footer>
			<el-space>
				<el-button @click="editDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="applyTaskEdits">保存</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="transferPickDialog.visible" title="新增数传任务" width="720px" :append-to-body="true">
		<el-table :data="transferPickDialog.list" height="360px" style="width: 100%;" v-loading="transferPickDialog.loading">
			<el-table-column label="选择" width="70">
				<template #default="{ row }">
					<el-radio v-model="transferPickDialog.selectedKey" :label="transferPickKey(row)">
						<span></span>
					</el-radio>
				</template>
			</el-table-column>
			<el-table-column label="轨次开始" min-width="160">
				<template #default="{ row }">
					{{ formatDisplay(new Date(row.beginTime)) }}
				</template>
			</el-table-column>
			<el-table-column label="轨次结束" min-width="160">
				<template #default="{ row }">
					{{ row.endTime ? formatDisplay(new Date(row.endTime)) : "-" }}
				</template>
			</el-table-column>
			<el-table-column label="天线" min-width="120">
				<template #default="{ row }">
					{{ TELECONTROL_ANTENNA_MAP.get(String(row.antennaId ?? "")) || row.antennaId || "-" }}
				</template>
			</el-table-column>
		</el-table>
		<template #footer>
			<el-space>
				<el-button @click="transferPickDialog.visible = false">取消</el-button>
				<el-button type="primary" :disabled="!transferPickDialog.selectedKey" @click="confirmAddTransferTask">
					添加
				</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="transferFilePickDialog.visible" title="选择固存文件" width="860px" :append-to-body="true">
		<el-alert
			type="info"
			show-icon
			:closable="false"
			style="margin-bottom: 12px"
			description="自动按当前卫星拉取载荷与平台固存表状态，支持多选"
		/>
		<el-tabs v-model="transferFilePickDialog.activeTab">
			<el-tab-pane label="载荷固存表" name="payload">
				<el-table
					:data="transferFilePickDialog.payload"
					:border="true"
					:height="360"
					style="width: 100%"
					v-loading="transferFilePickDialog.loading"
					@selection-change="rows => (transferFilePickDialog.selectedPayload = rows)"
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
								:type="getStorageTagProps(row.status).type"
								:color="getStorageTagProps(row.status).color"
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
					:data="transferFilePickDialog.platform"
					:border="true"
					:height="360"
					style="width: 100%"
					v-loading="transferFilePickDialog.loading"
					@selection-change="rows => (transferFilePickDialog.selectedPlatform = rows)"
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
								:type="getStorageTagProps(row.status).type"
								:color="getStorageTagProps(row.status).color"
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
				<el-tag type="info">载荷已选 {{ transferFilePickDialog.selectedPayload.length }} 条</el-tag>
				<el-tag type="info">平台已选 {{ transferFilePickDialog.selectedPlatform.length }} 条</el-tag>
				<el-button
					type="primary"
					:disabled="!transferFilePickDialog.selectedPayload.length && !transferFilePickDialog.selectedPlatform.length"
					@click="confirmTransferFilePick"
				>
					确认
				</el-button>
				<el-button @click="transferFilePickDialog.visible = false">关闭</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="highSelectDialog.visible" title="高优先级目标选择" width="880px" :append-to-body="true">
		<el-table :data="highSelectDialog.list" height="420px" style="width: 100%;">
			<el-table-column label="选择" width="80">
				<template #default="{ row }">
					<el-checkbox :model-value="highSelectDialog.selected.has(highSelectKey(row))" @change="(val: any) => toggleHighSelectRow(row, Boolean(val))" />
				</template>
			</el-table-column>
			<el-table-column prop="name" label="名称" min-width="160" />
			<el-table-column label="开始时间" min-width="180">
				<template #default="{ row }">
					{{ formatDisplay(new Date(row.startTs)) }}
				</template>
			</el-table-column>
			<el-table-column prop="cloud" label="云量(%)" width="90" />
			<el-table-column label="侧摆角" width="120">
				<template #default="{ row }">
					{{ pickRollAngle(row) }}
				</template>
			</el-table-column>
			<el-table-column prop="priority" label="优先级" width="90" />
		</el-table>
		<div style="margin-top:8px; color: var(--el-text-color-regular); font-size: 13px;">
			已选目标：{{ highSelectDialog.list.filter((row) => highSelectDialog.selected.has(highSelectKey(row))).map((row) => row.name || row.targetName || 'Task').join('，') || '暂无' }}
		</div>
		<template #footer>
			<div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
				<span style="color: var(--el-text-color-regular);">已选 {{ highSelectedCount }} 个 / 可选 {{ highSelectDialog.list.length }}</span>
				<el-space>
					<el-button @click="cancelHighPrioritySelect">取消</el-button>
					<el-button type="primary" @click="confirmHighPrioritySelect">确认</el-button>
				</el-space>
			</div>
		</template>
	</el-dialog>
</div>
</template>

<script lang="ts" setup>
defineOptions({ name: "one-click-plan" });

import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, reactive } from "vue";
import { ElMessage } from "element-plus";
import { useCool } from "/@/cool";
import { config as appConfig } from "/@/config";
import { request } from "/@/cool/service/request";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { TooltipComponent, GridComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { TELECONTROL_ANTENNA_MAP } from "../../daily_plan/views/telecontrolAntennas";

echarts.use([ScatterChart, TooltipComponent, GridComponent, DataZoomComponent, CanvasRenderer]);

const ONE_CLICK_PLAN_URL = "http://172.16.10.86:9030/image-forecast";
const TELECONTROL_SEARCH_URLS = [
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/tasks/telecontrol/search",
];
const TELECONTROL_STATES = [1, 2, 6];
const TRANSFER_API_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/chains/create-with-template";
const TOKEN_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token";
const ANTENNA_URL = "http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi-transform/get-all-antenna";

const AS02_IMAGING_TEMPLATE = "689d78a65526542523548b0f";
const AS02_IMAGING_FOLDER = "6731752608e123893cf92873";
const AS03_IMAGING_FOLDER = "6731755b08e123893cf92878";
const AS03_IMAGING_TEMPLATES = [
	"673c2d9049b1f446adc4623c",
	"673c2d8f49b1f446adc46230",
	"673c2d9049b1f446adc4623f",
];
const AS03_IMAGING_SEQ_CONSUME = 56;
const TRANSFER_TEMPLATE_ID = "673c2d9049b1f446adc4623e";
const TRANSFER_FOLDER_ID = "6731752608e123893cf92873";
const AS03_TRANSFER_TEMPLATE_ID = "673c2d9049b1f446adc4623b";
const AS03_TRANSFER_FOLDER_ID = "6731755b08e123893cf92878";

const DELETE_TEMPLATE_AS02 = "673c2d9049b1f446adc4623a";
const COMMAND_API_URL = TRANSFER_API_URL;

type TimelineItem = {
	id: string;
	name: string;
	type: "" | "success" | "warning" | "info" | "danger" | "data" | "delete";
	time: string;
	meta: string;
	startTs: number;
	endTs?: number;
	raw?: any;
	rollAng?: number | string | null;
	rollText?: string;
	solarText?: string;
	storageSlot?: string;
	antennaId?: string | null;
	teleBegin?: number | null;
	teleEnd?: number | null;
	files?: string[];
	deleteFiles?: string[];
	cloud?: number | null;
	priority?: number | null;
	gapMinutes?: number | null;
};

type TargetPayload = {
	name: string;
	long: number;
	lat: number;
	alt: number;
	imageTime: number;
	priority: number;
};

// 默认日期：北京时间次日 00:00
const tomorrow = (() => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 1);
	return d.getTime();
})();
const defaultStart = (() => {
	const d = new Date();
	d.setHours(13, 0, 0, 0); // 当日 13:00
	d.setDate(d.getDate() + 1); // 次日 13:00
	return d.getTime();
})();
const defaultEnd = (() => {
	const d = new Date(defaultStart);
	d.setDate(d.getDate() + 1); // 次次日 00:00
	d.setHours(13, 0, 0, 0); // 次次日 13:00
	return d.getTime();
})();
const form = ref({ satellite: "AS02", date: tomorrow, rangeStart: defaultStart, rangeEnd: defaultEnd });
const { service } = useCool();
const loading = ref(false);
const submitting = ref(false);
const timeline = ref<TimelineItem[]>([]);
// 时间轴/数传/删除使用顶部日期的固定窗口（当日 00:00 ~ 次日 13:00）
const planRange = computed(() => buildDefaultRange(form.value.date));
// 成像预报可使用自定义开始/结束时间
const imagingRange = computed(() => buildRange(form.value.date));
const rangeText = computed(() => `${formatDisplay(planRange.value.start)} ~ ${formatDisplay(planRange.value.end)}`);
const submissionSummary = ref("");
const submissionDialogVisible = ref(false);
const orbitElements = ref<any | null>(null);
const taskSwitches = reactive({
	imaging: true,
	transfer: true,
	delete: true,
});
const absStartSeq = ref(3);
const reloadTableFlag = ref(true);
const transferTaskCount = ref(1);
const imagingTaskCount = ref(4);
const cloudLimit = ref(10);
const rollLimitAbs = ref(30);
const planningProgress = reactive<{ visible: boolean; percent: number; text: string; status?: 'success' | 'exception' | 'warning' }>(
	{
		visible: false,
		percent: 0,
		text: '',
		status: undefined,
	}
);
const planningSelection = ref<string[]>([]);
const planPreviewVisible = ref(false);
const planPreviewText = ref("");
const planningNotes = ref<string[]>([]);
const sequenceDialogVisible = ref(false);
const sequenceItems = computed(() => {
	const mapType = (t: string | undefined): "success" | "warning" | "info" | "danger" | "primary" => {
		if (t === "data") return "primary";
		if (t === "delete") return "danger";
		if (t === "warning") return "warning";
		if (t === "info") return "info";
		return "success";
	};
	return timeline.value
		.slice()
		.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0))
		.map((it) => ({
			id: it.id,
			name: it.name,
			time: formatDisplay(new Date(it.startTs)),
			meta: buildMeta(it),
			type: mapType(it.type as any),
		}));
});
const editDialogVisible = ref(false);
const editableTasks = ref<any[]>([]);
const transferPickDialog = reactive<{
	visible: boolean;
	loading: boolean;
	list: Array<{ key: string; beginTime: number; endTime: number | null; antennaId?: string | null; raw: any }>;
	selectedKey: string;
}>({
	visible: false,
	loading: false,
	list: [],
	selectedKey: "",
});
const transferFilePickDialog = reactive<{
	visible: boolean;
	loading: boolean;
	activeTab: "payload" | "platform";
	payload: any[];
	platform: any[];
	selectedPayload: any[];
	selectedPlatform: any[];
	targetId: string;
}>({
	visible: false,
	loading: false,
	activeTab: "payload",
	payload: [],
	platform: [],
	selectedPayload: [],
	selectedPlatform: [],
	targetId: "",
});
const ONE_CLICK_PLAN_CACHE_KEY = "one_click_plan_cache_v1";
const ONE_CLICK_PLAN_RELOAD_FLAG = "__one_click_plan_reload_handled";
const UID_EPOCH = new Date("2025-01-01T00:00:00Z").getTime();
// 高优先级人工挑选弹窗状态
const highSelectDialog = reactive<{
	visible: boolean;
	list: any[];
	selected: Set<string>;
	resolve: ((items: any[]) => void) | null;
}>({
	visible: false,
	list: [],
	selected: new Set(),
	resolve: null,
});
const highSelectedCount = computed(() => highSelectDialog.selected.size);

// 根据卫星切换设置成像任务数量默认值
watch(
	() => form.value.satellite,
	(sat) => {
		const def = sat === "AS03" ? 2 : 4;
		imagingTaskCount.value = def;
	},
	{ immediate: true }
);
const UID_TIMESTAMP_BITS = 41;
const UID_MACHINE_BITS = 10;
const UID_PID_BITS = 6;
const UID_SEQUENCE_BITS = 7;
const UID_TIMESTAMP_MOD = Math.pow(2, UID_TIMESTAMP_BITS);
const UID_MACHINE_ID = Math.floor(Math.random() * Math.pow(2, UID_MACHINE_BITS));
const UID_PID = Math.floor(Math.random() * Math.pow(2, UID_PID_BITS));
let uidSequence = 0;
let uidLastTimestamp = -1;

function ensureImagingUid(item: TimelineItem): string {
	item.raw = item.raw || {};
	const existing =
		item.raw.imagingUid ||
		item.raw.imagingUID ||
		item.raw.imaging_uid ||
		item.raw.__imagingUid;
	if (existing) {
		const uidText = String(existing);
		if (uidText && uidText.length > 4) {
			item.raw.imagingUid = uidText;
			return uidText;
		}
	}
	const uid = generateImagingUid();
	item.raw.imagingUid = uid;
	return uid;
}

function estimatePickedCount(pool: any[], sat: string) {
	const cloudLimitVal = Number(cloudLimit.value) || 10;
	const rollLimitVal = Number(rollLimitAbs.value) || 10;
	const cloudFiltered = pool.filter((r) => r.cloud == null || r.cloud <= cloudLimitVal);
	const rollFiltered = cloudFiltered.filter((r) => {
		const rollNum = Number(pickRollAngle(r));
		if (!Number.isFinite(rollNum)) return true;
		return Math.abs(rollNum) <= rollLimitVal;
	});
	const gapMs = sat === "AS03" ? 3 * 60 * 60 * 1000 : 95 * 60 * 1000;
	const defaultLimit = sat === "AS03" ? 2 : 4;
	const imagingExpect = Math.max(1, Number(imagingTaskCount.value) || defaultLimit);
	const picked =
		sat === "AS03"
			? pickWithPreference(rollFiltered, imagingExpect, gapMs, [], 0)
			: pickTopTasks(rollFiltered, imagingExpect, gapMs, []);
	return picked.length;
}

function summarizePicked(list: any[], extraFilter: (t: any) => boolean, poolForGap?: any[]): string {
	const cloudLimitVal = Number(cloudLimit.value) || 10;
	const rollLimitVal = Number(rollLimitAbs.value) || 10;
	const filtered = list.filter((r) => {
		const okPriority = extraFilter(r);
		const okCloud = r.cloud == null || r.cloud <= cloudLimitVal;
		const rollNum = Number(pickRollAngle(r));
		const okRoll = !Number.isFinite(rollNum) || Math.abs(rollNum) <= rollLimitVal;
		return okPriority && okCloud && okRoll;
	});
	if (!filtered.length) return "";
	const names = filtered.map((r) => r.name || r.targetName || "Task");
	const unique = Array.from(new Set(names));
	const shown = unique.slice(0, 10).join("，");
	const more = unique.length > 10 ? ` 等 ${unique.length} 个` : "";
	return shown + more;
}

function updateSelectionPreview(source: any[], isFinal = false) {
	if (!source || !source.length || !taskSwitches.imaging) {
		planningSelection.value = [];
		return;
	}
	const sat = form.value.satellite;
	const gapMs = sat === "AS03" ? 3 * 60 * 60 * 1000 : 95 * 60 * 1000;
	const defaultLimit = sat === "AS03" ? 2 : 4;
	const imagingExpect = Math.max(1, Number(imagingTaskCount.value) || defaultLimit);
	const cloudLimitVal = Number(cloudLimit.value) || 10;
	const rollLimitVal = Number(rollLimitAbs.value) || 10;

	const cloudFiltered = source.filter((r) => {
		if (r?.__manualHigh) return true;
		return r.cloud == null || r.cloud <= cloudLimitVal;
	});
	const rollFiltered = cloudFiltered.filter((r) => {
		const rollNum = Number(pickRollAngle(r));
		if (!Number.isFinite(rollNum) || r?.__manualHigh) return true;
		return Math.abs(rollNum) <= rollLimitVal;
	});
	const manualHigh = rollFiltered.filter((r) => r?.__manualHigh);
	const previewBase =
		sat === "AS03"
			? pickWithPreference(rollFiltered, imagingExpect, gapMs, [], 0)
			: pickTopTasks(rollFiltered, imagingExpect, gapMs, []);
	const manualTs = new Set(manualHigh.map((p) => Number(p.startTs ?? parseStartTime(p))).filter((n) => Number.isFinite(n)));
	const preview =
		manualHigh.length > 0
			? [...manualHigh, ...previewBase.filter((p) => !manualTs.has(Number(p.startTs ?? parseStartTime(p))))].slice(0, imagingExpect)
			: previewBase;
	const names = Array.from(new Set(preview.map((p) => p.name || p.targetName || "Task")));
	const shown = names.slice(0, 10).join("，");
	const more = names.length > 10 ? ` 等 ${names.length} 个` : "";
	const label = isFinal ? "已规划目标" : "当前已选目标";
	planningSelection.value = names.length ? [`${label}：${shown}${more}`] : [];
}

function reorderStorageSlots(tasks: any[]) {
	if (!tasks?.length) return;
	const slots = tasks
		.map((t) => Number(t.storageSlot ?? t.raw?.storageSlot ?? t.raw?.startFileNo ?? t.raw?.start_file_no))
		.filter((n) => Number.isFinite(n))
		.sort((a, b) => a - b);
	if (!slots.length) return;
	const sortedTasks = [...tasks].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	const use = slots.slice(0, sortedTasks.length);
	sortedTasks.forEach((t, idx) => {
		const slot = use[idx];
		t.storageSlot = String(slot);
		if (t.raw) t.raw.storageSlot = String(slot);
	});
}
const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

function detectPageReload(): boolean {
	if (typeof window === "undefined" || typeof performance === "undefined") return false;
	const entries = performance.getEntriesByType?.("navigation") || [];
	const firstEntry = entries[0] as PerformanceNavigationTiming | undefined;
	if (firstEntry && typeof firstEntry.type === "string") return firstEntry.type === "reload";
	const nav = (performance as any).navigation;
	if (nav?.type != null && nav?.TYPE_RELOAD != null) return nav.type === nav.TYPE_RELOAD;
	return false;
}

const isOneClickReload = detectPageReload();
if (isOneClickReload && typeof window !== "undefined") {
	const win = window as any;
	if (!win[ONE_CLICK_PLAN_RELOAD_FLAG]) {
		try {
			window.localStorage.removeItem(ONE_CLICK_PLAN_CACHE_KEY);
		} catch (err) {
			console.warn("[one-click-plan] clear cache on reload failed", err);
		}
		win[ONE_CLICK_PLAN_RELOAD_FLAG] = true;
	}
}

function restoreOneClickCache() {
	if (typeof window === "undefined") return;
	const raw = window.localStorage.getItem(ONE_CLICK_PLAN_CACHE_KEY);
	if (!raw) return;
	try {
		const payload = JSON.parse(raw);
		if (payload?.form) {
			form.value = { ...form.value, ...payload.form };
		}
		if (payload?.taskSwitches) {
			Object.assign(taskSwitches, payload.taskSwitches);
		}
		if (Array.isArray(payload?.timeline)) {
			timeline.value = payload.timeline;
		}
		if (payload?.orbitElements !== undefined) {
			orbitElements.value = payload.orbitElements;
		}
		if (payload?.submissionSummary !== undefined) {
			submissionSummary.value = payload.submissionSummary;
		}
	if (payload?.absStartSeq !== undefined) {
		absStartSeq.value = payload.absStartSeq;
	}
	if (payload?.reloadTableFlag !== undefined) {
		reloadTableFlag.value = payload.reloadTableFlag;
	}
	if (payload?.transferTaskCount !== undefined) {
		transferTaskCount.value = payload.transferTaskCount;
	}
	if (payload?.imagingTaskCount !== undefined) {
		imagingTaskCount.value = payload.imagingTaskCount;
	}
	if (payload?.cloudLimit !== undefined) {
		cloudLimit.value = payload.cloudLimit;
	}
	if (payload?.rollLimitAbs !== undefined) {
		rollLimitAbs.value = payload.rollLimitAbs;
	}
	if (payload?.rangeStart) {
		form.value.rangeStart = payload.rangeStart;
	}
	if (payload?.rangeEnd) {
		form.value.rangeEnd = payload.rangeEnd;
	}
	if (Array.isArray(payload?.highSelectList)) {
		highSelectDialog.list = payload.highSelectList;
	}
	} catch (err) {
		console.warn("[one-click-plan] restore cache failed", err);
	}
}

function persistOneClickCache() {
	if (typeof window === "undefined") return;
const payload = {
	form: form.value,
	taskSwitches: { ...taskSwitches },
	timeline: timeline.value,
	orbitElements: orbitElements.value,
		submissionSummary: submissionSummary.value,
		absStartSeq: absStartSeq.value,
		reloadTableFlag: reloadTableFlag.value,
		transferTaskCount: transferTaskCount.value,
		imagingTaskCount: imagingTaskCount.value,
	cloudLimit: cloudLimit.value,
	rollLimitAbs: rollLimitAbs.value,
	rangeStart: form.value.rangeStart,
	rangeEnd: form.value.rangeEnd,
	planPreviewText: planPreviewText.value,
	highSelectList: highSelectDialog.list,
};
	try {
		window.localStorage.setItem(ONE_CLICK_PLAN_CACHE_KEY, JSON.stringify(payload));
	} catch (err) {
		console.warn("[one-click-plan] persist cache failed", err);
	}
}

restoreOneClickCache();

onMounted(() => {
	if (chartRef.value) {
		chart = echarts.init(chartRef.value);
	}
	updateChart();
});

watch(
	[
		form,
		taskSwitches,
		timeline,
		submissionSummary,
		absStartSeq,
		reloadTableFlag,
		transferTaskCount,
		imagingTaskCount,
		cloudLimit,
		rollLimitAbs,
	],
	() => {
		persistOneClickCache();
	},
	{ deep: true }
);

watch(
	() => form.value.date,
	(newDate) => {
		const range = buildDefaultRange(newDate);
		form.value.rangeStart = range.start.getTime();
		form.value.rangeEnd = range.end.getTime();
	}
);

onBeforeUnmount(() => {
	if (chart) {
		chart.dispose();
		chart = null;
	}
});

watch(timeline, async () => {
	await nextTick();
	if (!chart && chartRef.value) {
		chart = echarts.init(chartRef.value);
	}
	updateChart();
});

function buildRange(dateValue?: number | Date) {
	// 以 form 中的自定义时间为主，否则按默认规则
	if (form.value.rangeStart && form.value.rangeEnd) {
		const start = new Date(form.value.rangeStart);
		const end = new Date(form.value.rangeEnd);
		return { start, end };
	}
	return buildDefaultRange(dateValue);
}

function buildDefaultRange(dateValue?: number | Date) {
	const base = dateValue ? new Date(dateValue) : new Date();
	base.setHours(0, 0, 0, 0); // 当日 0 点
	const start = new Date(base);
	start.setHours(13, 0, 0, 0); // 选中日期 13:00
	const end = new Date(base);
	end.setDate(end.getDate() + 1); // 次日
	end.setHours(13, 0, 0, 0); // 次日 13:00
	return { start, end };
}

function buildChartRange(dateValue?: number | Date) {
	const base = dateValue ? new Date(dateValue) : new Date();
	base.setHours(0, 0, 0, 0); // ?? 00:00
	const start = new Date(base);
	const end = new Date(base);
	end.setDate(end.getDate() + 1);
	end.setHours(13, 0, 0, 0); // ?? 13:00
	return { start, end };
}


function formatDisplay(date: Date | string) {
	const d = typeof date === "string" ? new Date(date) : date;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
		d.getMinutes(),
	)}:${pad(d.getSeconds())}`;
}

function formatNumberText(value: number | string | null | undefined, digits = 4): string {
	if (value == null || value === "") return "--";
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return String(value);
	}
	return Number(num.toFixed(digits)).toString();
}

function formatPercentText(value: number | string | null | undefined): string {
	if (value == null || value === "") return "--";
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return String(value);
	}
	if (num >= 0 && num <= 1) {
		return `${(num * 100).toFixed(1)}%`;
	}
	return `${num}%`;
}

function normalizeDecimal(value: unknown, fallback: number): number {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function formatMonthDay(value: number | Date | string): string {
	const d = typeof value === "number" ? new Date(value) : typeof value === "string" ? new Date(value) : value;
	if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function openEditDialog() {
	editableTasks.value = timeline.value
		.slice()
		.sort((a, b) => (Number(a.startTs ?? 0) - Number(b.startTs ?? 0)))
		.map((t) => ({
			...t,
			startTsValue: t.startTs,
			metaText: t.meta,
			metaFields: parseMetaFields(t.meta),
			fileInput:
				t.type === "data"
					? String(t.raw?.fileText ?? t.raw?.filesText ?? (Array.isArray(t.files) ? t.files.join(",") : ""))
					: "",
			deleteRange:
				t.type === "delete"
					? `${t.raw?.startFile ?? t.raw?.start_file ?? ""}-${t.raw?.endFile ?? t.raw?.end_file ?? ""}`
					: "",
			_deleted: false,
		}));
	editDialogVisible.value = true;
}

function transferPickKey(item: { key: string }) {
	return item.key;
}

function normalizeTelecontrolPass(record: any) {
	const beginRaw = record?.beginTime ?? record?.dataTrans?.beginTime;
	const endRaw = record?.dataTrans?.endTime ?? record?.endTime;
	const beginTime = Number(beginRaw);
	if (!Number.isFinite(beginTime)) return null;
	const endTime = Number(endRaw);
	const antennaId = record?.antennaId ?? record?.antenna_id ?? null;
	const key = `${beginTime}-${antennaId ?? "na"}`;
	return {
		key,
		beginTime,
		endTime: Number.isFinite(endTime) ? endTime : null,
		antennaId: antennaId ? String(antennaId) : null,
		raw: record,
	};
}

async function openTransferPickDialog() {
	transferPickDialog.visible = true;
	transferPickDialog.loading = true;
	transferPickDialog.selectedKey = "";
	transferPickDialog.list = [];
	try {
		const token = await getToken();
		const spacecraftId = getSpacecraftIdBySatellite(form.value.satellite);
		if (!spacecraftId) throw new Error("spacecraft id missing");
		const dayMs = 24 * 60 * 60 * 1000;
		const dayStart = new Date(form.value.date);
		dayStart.setHours(0, 0, 0, 0);
		const dayStartMs = dayStart.getTime();
		const dayEndMs = dayStartMs + dayMs;
		const all: Array<{ key: string; beginTime: number; endTime: number | null; antennaId?: string | null; raw: any }> = [];
		const seen = new Set<string>();
		const dateStr = formatDateYMD(dayStart);
		const records = await fetchTelecontrolRecords(token, dateStr, spacecraftId);
		for (const rec of records || []) {
			const normalized = normalizeTelecontrolPass(rec);
			if (!normalized) continue;
			if (normalized.beginTime < dayStartMs || normalized.beginTime >= dayEndMs) continue;
			if (seen.has(normalized.key)) continue;
			seen.add(normalized.key);
			all.push(normalized);
		}
		all.sort((a, b) => a.beginTime - b.beginTime);
		transferPickDialog.list = all;
		if (!all.length) {
			ElMessage.warning("当前日期范围内未找到轨次");
		}
	} catch (err) {
		console.warn("[one-click-plan] fetch telecontrol passes failed", err);
		ElMessage.error("加载轨次失败");
	} finally {
		transferPickDialog.loading = false;
	}
}

function confirmAddTransferTask() {
	const chosen = transferPickDialog.list.find((item) => item.key === transferPickDialog.selectedKey);
	if (!chosen) {
		ElMessage.warning("请选择轨次");
		return;
	}
	const startTs = chosen.beginTime + 60 * 1000;
	const endTs = Number.isFinite(chosen.endTime ?? NaN) ? Number(chosen.endTime) : startTs;
	const antennaId = chosen.antennaId ? String(chosen.antennaId) : null;
	const task: TimelineItem = {
		id: `data-${startTs}-${Date.now()}`,
		name: "\u6570\u4f20\u4efb\u52a1",
		type: "data",
		time: formatDisplay(new Date(startTs)),
		meta: "",
		startTs,
		endTs,
		raw: { groups: [], resetSeq: false, files: [] },
		antennaId,
		teleBegin: chosen.beginTime,
		teleEnd: Number.isFinite(chosen.endTime ?? NaN) ? Number(chosen.endTime) : null,
		files: [],
	};
	task.meta = buildMeta(task);
	editableTasks.value.push({
		...task,
		startTsValue: task.startTs,
		metaText: task.meta,
		metaFields: parseMetaFields(task.meta),
		fileInput: "",
		deleteRange: "",
		_deleted: false,
	});
	transferPickDialog.visible = false;
}

const storageStatusDict: Record<number, string> = {
	0: "空",
	1: "已写入",
	2: "已写入待数传",
	3: "已数传待反馈",
	4: "解析有问题",
	5: "已重传待反馈",
	6: "已数传待删除",
	7: "已安排数传",
};

type StorageTagStyle = { type?: "info" | "warning" | "danger" | "success" | "primary"; color?: string };

const storageStatusTagMap: Record<number, StorageTagStyle> = {
	0: { type: "info" },
	1: { type: "primary" },
	2: { type: "warning" },
	3: { color: "#f78fb3" },
	4: { type: "danger" },
	5: { type: "danger" },
	6: { type: "success" },
	7: { type: "primary" },
};

function getStorageTagProps(status: number | null | undefined): StorageTagStyle {
	if (status == null) return {};
	return storageStatusTagMap[status] || {};
}

type StorageRow = {
	id: number | string;
	display: string;
	startFileNo: string;
	status: number | null;
	statusLabel: string;
	updateTime: string;
	raw: Record<string, any>;
};

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
		statusLabel: status != null ? (storageStatusDict[status] || `状态${status}`) : "-",
		updateTime,
		raw: item,
	};
}

async function fetchStorageByName(name: number): Promise<StorageRow[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
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

async function openTransferFilePickDialog(row: any) {
	if (row?.type !== "data") return;
	transferFilePickDialog.visible = true;
	transferFilePickDialog.loading = true;
	transferFilePickDialog.activeTab = "payload";
	transferFilePickDialog.payload = [];
	transferFilePickDialog.platform = [];
	transferFilePickDialog.selectedPayload = [];
	transferFilePickDialog.selectedPlatform = [];
	transferFilePickDialog.targetId = row.id;
	try {
		const satellite = form.value.satellite;
		if (!satellite) {
			ElMessage.warning("请先选择卫星");
			return;
		}
		const tablePair = satellite === "AS02" ? { payload: 0, platform: 1 } : { payload: 2, platform: 3 };
		const [payload, platform] = await Promise.all([
			fetchStorageByName(tablePair.payload),
			fetchStorageByName(tablePair.platform),
		]);
		transferFilePickDialog.payload = payload;
		transferFilePickDialog.platform = platform;
	if (row?.fileInput) {
		const parsed = parseTransferFileInput(String(row.fileInput));
		const payloadSet = new Set<number>(parsed.payload);
		const platformSet = new Set<number>(parsed.platform);
		transferFilePickDialog.selectedPayload = payload.filter((p) => payloadSet.has(Number(p.startFileNo)));
		transferFilePickDialog.selectedPlatform = platform.filter((p) => platformSet.has(Number(p.startFileNo)));
	}
	} catch (err) {
		console.warn("[one-click-plan] fetch transfer storage rows failed", err);
		ElMessage.error("加载固存文件失败");
	} finally {
		transferFilePickDialog.loading = false;
	}
}

function confirmTransferFilePick() {
	const target = editableTasks.value.find((t: any) => t.id === transferFilePickDialog.targetId);
	const payloadNums = transferFilePickDialog.selectedPayload
		.map((row: any) => Number(row.startFileNo))
		.filter((n) => Number.isFinite(n));
	const platformNums = transferFilePickDialog.selectedPlatform
		.map((row: any) => Number(row.startFileNo))
		.filter((n) => Number.isFinite(n));
	const selected = normalizeTransferNumbers([...payloadNums, ...platformNums]);
	if (!selected.length) {
		ElMessage.warning("请至少选择一个固存文件");
		return;
	}
	if (target) {
		const satellite = form.value.satellite as "AS02" | "AS03";
		const fileText = buildTransferFileText(payloadNums, platformNums, satellite);
		target.fileInput = fileText || selected.join(",");
	}
	transferFilePickDialog.visible = false;
}

function parseMetaFields(meta: string | undefined): Array<{ label: string; value: string }> {
	if (!meta) return [];
	return meta.split("|").map((part) => {
		const p = part.trim();
		const [label, ...rest] = p.split("：");
		if (rest.length === 0) {
			const [labelEn, ...restEn] = p.split(":");
			return { label: (labelEn || "").trim(), value: restEn.join(":").trim() };
		}
		return { label: label.trim(), value: rest.join("：").trim() };
	});
}

function metaFieldsToMap(fields: Array<{ label: string; value: string }>): Record<string, string> {
	const map: Record<string, string> = {};
	for (const f of fields) {
		if (f.label) map[f.label.trim()] = f.value || "";
	}
	return map;
}

function normalizeTransferNumbers(values: number[]): number[] {
	const uniq = new Set<number>();
	for (const v of values) {
		if (Number.isFinite(v)) uniq.add(v);
	}
	return Array.from(uniq).sort((a, b) => a - b);
}

function parseTransferFileInput(text: string): {
	payload: number[];
	platform: number[];
	hasTyped: boolean;
} {
	const payload: number[] = [];
	const platform: number[] = [];
	let current: TransferSelectionSource = "payload";
	let hasTyped = false;
	const tokens = String(text || "")
		.split(/[\uFF0C,]/)
		.map((s) => s.trim())
		.filter(Boolean);
	const pushNumbers = (type: TransferSelectionSource, token: string) => {
		const nums = token.match(/\d+/g);
		if (!nums) return;
		for (const n of nums.map(Number)) {
			if (!Number.isFinite(n)) continue;
			if (type === "payload") payload.push(n);
			else platform.push(n);
		}
	};
	for (const token of tokens) {
		if (token.startsWith("载荷:")) {
			current = "payload";
			hasTyped = true;
			pushNumbers("payload", token.slice(3));
			continue;
		}
		if (token.startsWith("平台:")) {
			current = "platform";
			hasTyped = true;
			pushNumbers("platform", token.slice(3));
			continue;
		}
		pushNumbers(current, token);
	}
	return {
		payload: normalizeTransferNumbers(payload),
		platform: normalizeTransferNumbers(platform),
		hasTyped,
	};
}

function buildTransferGroupsByType(
	numbers: number[],
	type: TransferSelectionSource,
	satellite: "AS02" | "AS03"
): TransferGroup[] {
	const sorted = normalizeTransferNumbers(numbers);
	if (!sorted.length) return [];
	const step = satellite === "AS03" || type === "platform" ? 1 : 8;
	const chunk = satellite === "AS03" || type === "platform" ? 1 : 8;
	const perFile =
		type === "platform" ? (satellite === "AS03" ? 2 : 30) : satellite === "AS02" ? 90 : 20;
	const segments: number[][] = [];
	let current: number[] = [];
	for (const num of sorted) {
		if (!current.length) {
			current = [num];
			continue;
		}
		const last = current[current.length - 1];
		if (num - last === step) {
			current.push(num);
		} else {
			segments.push(current);
			current = [num];
		}
	}
	if (current.length) segments.push(current);
	return segments.map((group) => {
		const start = group[0];
		const span = group.length * chunk;
		const end = start + span - 1;
		return {
			start,
			end,
			count: group.length,
			duration: perFile * group.length,
			type,
		};
	});
}

function buildTransferGroupsFromInput(
	fileInput: string,
	satellite: "AS02" | "AS03"
): { groups: TransferGroup[]; files: number[]; fileText: string } {
	const parsed = parseTransferFileInput(fileInput);
	const groups = [
		...buildTransferGroupsByType(parsed.payload, "payload", satellite),
		...buildTransferGroupsByType(parsed.platform, "platform", satellite),
	];
	const files = normalizeTransferNumbers([...parsed.payload, ...parsed.platform]);
	const fileText = parsed.hasTyped || parsed.platform.length ? String(fileInput || "") : "";
	return { groups, files, fileText };
}

function buildTransferFileText(
	payloadNums: number[],
	platformNums: number[],
	satellite: "AS02" | "AS03"
): string {
	const payload = normalizeTransferNumbers(payloadNums);
	const platform = normalizeTransferNumbers(platformNums);
	if (satellite === "AS02" && !platform.length) {
		return payload.join(",");
	}
	const parts: string[] = [];
	if (payload.length) {
		parts.push(`载荷:${payload[0]}`);
		for (let i = 1; i < payload.length; i++) {
			parts.push(String(payload[i]));
		}
	}
	if (platform.length) {
		parts.push(`平台:${platform[0]}`);
		for (let i = 1; i < platform.length; i++) {
			parts.push(String(platform[i]));
		}
	}
	return parts.join(",");
}

function applyTaskEdits() {
	const edits = editableTasks.value;
	const existingMap = new Map(timeline.value.map((t) => [t.id, t]));
	const updated = edits
		.filter((e: any) => !e._deleted)
		.map((e: any) => {
			const base: TimelineItem =
				existingMap.get(e.id) ||
				({
					id: e.id,
					name: e.name || "\u6570\u4f20\u4efb\u52a1",
					type: e.type || "data",
					time: e.time || formatDisplay(new Date(Number(e.startTsValue) || Date.now())),
					meta: e.metaText || "",
					startTs: Number(e.startTsValue) || Date.now(),
					endTs: e.endTs,
					raw: e.raw || {},
					antennaId: e.antennaId ?? null,
					teleBegin: e.teleBegin ?? null,
					teleEnd: e.teleEnd ?? null,
					files: Array.isArray(e.files) ? e.files : [],
				} as TimelineItem);
			const startTs = Number(e.startTsValue);
			const meta = e.metaText ?? base.meta;
			const metaFromFields = base.type === "data" ? meta : meta;
			const timeTs = Number.isFinite(startTs) ? startTs : base.startTs;
			const delta = Number.isFinite(timeTs) && Number.isFinite(base.startTs) ? timeTs - base.startTs : 0;
			const oldEnd = Number(base.endTs);
			const endTs = Number.isFinite(oldEnd) ? oldEnd + delta : base.endTs;
			const timeText = Number.isFinite(timeTs) ? formatDisplay(new Date(timeTs)) : base.time;
			const raw: any = {
				...base.raw,
				name: e.name || base.raw?.name,
				startTs: timeTs,
				startAt: timeTs,
				startAtBeijing: timeTs,
				endTs,
			};
			if (base.type === "data") {
				const satellite = (form.value.satellite as "AS02" | "AS03") || "AS02";
				const groupResult = e.fileInput
					? buildTransferGroupsFromInput(String(e.fileInput), satellite)
					: null;
				if (groupResult && (groupResult.groups.length || groupResult.files.length)) {
					raw.groups = groupResult.groups;
					raw.files = groupResult.files;
					if (groupResult.fileText) {
						raw.fileText = groupResult.fileText;
					}
				} else {
					raw.groups = (raw.groups as TransferGroup[]) || [];
					raw.files = raw.files || [];
					if (e.fileInput) {
						raw.fileText = String(e.fileInput);
					}
				}
				base.files = Array.isArray(raw.files) ? raw.files.map((f: any) => String(f)) : [];
				base.meta = metaFromFields;
				base.raw = raw;
			} else if (base.type === "info") {
				if (e.storageSlot) {
					raw.storageSlot = String(e.storageSlot);
					base.storageSlot = String(e.storageSlot);
				}
				base.meta = metaFromFields;
				base.raw = raw;
			} else if (base.type === "delete") {
				if (e.deleteRange) {
					const m = String(e.deleteRange).match(/(\d+)\s*[-~\uFF0C]\s*(\d+)/);
					if (m) {
						const s = Number(m[1]);
						const eEnd = Number(m[2]);
						if (Number.isFinite(s) && Number.isFinite(eEnd) && eEnd > s) {
							raw.startFile = s;
							raw.endFile = eEnd;
							base.meta = `\u5220\u9664\u6587\u4ef6: ${s}-${eEnd}`;
						}
					}
				}
				base.raw = raw;
			}
			return {
				...base,
				name: e.name || base.name,
				startTs: timeTs,
				endTs,
				time: timeText,
				raw,
			};
		});
	timeline.value = updated.map((it) => ({ ...it, meta: buildMeta(it) }));
	editDialogVisible.value = false;
	updateChart();
	submissionSummary.value = buildSubmissionSummaryText();
}

function toggleDelete(row: any) {
	row._deleted = !row._deleted;
}

function highSelectKey(item: any): string {
	const ts = item?.startTs ?? parseStartTime(item) ?? "";
	return `${item?.name || item?.targetName || "Task"}-${ts}`;
}

function toggleHighSelectRow(item: any, checked: boolean) {
	const key = highSelectKey(item);
	if (checked) highSelectDialog.selected.add(key);
	else highSelectDialog.selected.delete(key);
}

function openHighPrioritySelect(list: any[], expect: number): Promise<any[]> {
	if (!Array.isArray(list) || !list.length) return Promise.resolve([]);
	highSelectDialog.list = [...list].sort((a, b) => Number(a?.startTs ?? 0) - Number(b?.startTs ?? 0));
	highSelectDialog.selected = new Set();
	highSelectDialog.visible = true;
	return new Promise((resolve) => {
		highSelectDialog.resolve = resolve;
	});
}

function confirmHighPrioritySelect() {
	const resolver = highSelectDialog.resolve;
	const chosen = highSelectDialog.list.filter((item) =>
		highSelectDialog.selected.has(highSelectKey(item))
	);
	if (chosen.length > 1) {
		const gapMs = form.value.satellite === "AS03" ? 3 * 60 * 60 * 1000 : 95 * 60 * 1000;
		const normalized = chosen
			.map((item) => {
				const tsRaw = item?.startTs ?? parseStartTime(item);
				const ts = Number(tsRaw);
				return Number.isFinite(ts) ? { item, ts } : null;
			})
			.filter((x): x is { item: any; ts: number } => Boolean(x))
			.sort((a, b) => a.ts - b.ts);
		if (normalized.length !== chosen.length) {
			ElMessage.error("选中目标成像时间缺失，无法校验");
			return;
		}
		for (let i = 1; i < normalized.length; i += 1) {
			const prev = normalized[i - 1];
			const cur = normalized[i];
			if (cur.ts - prev.ts < gapMs) {
				const prevName = prev.item?.name || prev.item?.targetName || "Task";
				const curName = cur.item?.name || cur.item?.targetName || "Task";
				ElMessage.error(
					`成像时间冲突：${prevName} @${formatDisplay(new Date(prev.ts))} 与 ${curName} @${formatDisplay(
						new Date(cur.ts)
					)} 间隔不足`
				);
				return;
			}
		}
	}
	highSelectDialog.visible = false;
	highSelectDialog.resolve = null;
	highSelectDialog.selected = new Set();
	resolver?.(chosen);
}

function cancelHighPrioritySelect() {
	const resolver = highSelectDialog.resolve;
	highSelectDialog.visible = false;
	highSelectDialog.resolve = null;
	highSelectDialog.selected = new Set();
	resolver?.([]);
}

async function runOneClickPlan() {
	const { start: imagingStart, end: imagingEnd } = imagingRange.value;
	const { start: opsStart, end: opsEnd } = planRange.value;
	loading.value = true;
	planningProgress.visible = true;
	planningProgress.status = undefined;
	planningProgress.percent = 5;
	planningProgress.text = "准备资源";
	planningSelection.value = [];
	try {
		const token = await getToken();
		const forecastPool: any[] = [];
		let priorityMap = new Map<string, number>();
		const defaultLimit = form.value.satellite === "AS03" ? 2 : 4;
		const imagingExpect = Math.max(1, Number(imagingTaskCount.value) || defaultLimit);
		const gapMs = form.value.satellite === "AS03" ? 3 * 60 * 60 * 1000 : 95 * 60 * 1000;
		let lowTargets: any[] = [];
		let midTargets: any[] = [];
		const lowForecasted = { ran: false };
		const notes: string[] = [];
		const dataTasks: TimelineItem[] = [];
		let deleteTasks: TimelineItem[] = [];
		const reservedSlots: Array<{ ts: number; buffer: number }> = [];
		const cloudLimitVal = Number(cloudLimit.value) || 10;
		const rollLimitVal = Number(rollLimitAbs.value) || 10;
		const filterByCloudRoll = (arr: any[]) =>
			arr.filter((r) => {
				if (r?.__manualHigh) return true; // 人工挑选的高优先级放行
				const cloudOk = r.cloud == null || r.cloud <= cloudLimitVal;
				if (!cloudOk) return false;
				const rollNum = Number(pickRollAngle(r));
				if (!Number.isFinite(rollNum)) return true;
				return Math.abs(rollNum) <= rollLimitVal;
			});

		if (taskSwitches.imaging) {
			planningProgress.percent = 20;
			planningProgress.text = "加载目标与星历";

			const targetRes = await fetchAllTargets(form.value.satellite);
			if (!targetRes.targets.length) throw new Error("未获取到目标库数据");
			priorityMap = targetRes.priorityMap;
			const ephemeris = await fetchOrbitElementsForSatellite(form.value.satellite, token);
			orbitElements.value = ephemeris;

			// 预先计算数传/删除预留时间窗口，供低优先级筛选使用
			const excludeStarts = new Set<number>();
			if (taskSwitches.transfer && form.value.satellite === "AS02") {
				let need = Math.max(1, Number(transferTaskCount.value) || 1);
				console.log("[one-click-plan] transfer planning need", need);
				let dayOffset = 0;
				while (need > 0 && dayOffset < 3) {
					const dayMs = dayOffset * 24 * 60 * 60 * 1000;
					const dayStart = new Date(opsStart.getTime() + dayMs);
					const dayEnd = new Date(opsEnd.getTime() + dayMs);
					const tasks = await buildDataTransTasks(token, dayStart, dayEnd, need, excludeStarts, notes);
					if (tasks.length) {
						dataTasks.push(...tasks);
						need -= tasks.length;
					}
					console.log("[one-click-plan] transfer day", dayOffset, {
						got: tasks.map((t) => ({ start: t.startTs, files: t.raw?.groups?.map((g: any) => g.start) })),
						remain: need,
					});
					dayOffset += 1;
				}
			}
			if (taskSwitches.delete && form.value.satellite === "AS02") {
				deleteTasks = await buildDeleteTasks(opsStart, opsEnd);
			} else {
				deleteTasks = [];
			}
			const transferBuf = form.value.satellite === "AS02" ? 80 * 60 * 1000 : 180 * 60 * 1000;
			const deleteBuf = 30 * 60 * 1000;
			dataTasks.forEach((d) => {
				if (d.startTs) reservedSlots.push({ ts: d.startTs, buffer: transferBuf });
			});
			deleteTasks.forEach((d) => {
				if (d.startTs) reservedSlots.push({ ts: d.startTs, buffer: deleteBuf });
			});

			const countFeasible = () => {
				const cloudFiltered = forecastPool.filter((r) => {
					if (r?.__manualHigh) return true;
					return r.cloud == null || r.cloud <= cloudLimitVal;
				});
				const rollFiltered = cloudFiltered.filter((r) => {
					const rollNum = Number(pickRollAngle(r));
					if (!Number.isFinite(rollNum) || r?.__manualHigh) return true;
					return Math.abs(rollNum) <= rollLimitVal;
				});
				const highMidFiltered = rollFiltered.filter((r) => (r.priority ?? 99) <= 2);
				const lowFiltered = rollFiltered
					.filter((r) => (r.priority ?? 99) > 2)
					.filter((cand) => {
						const ts = Number(cand.startTs);
						if (!Number.isFinite(ts)) return false;
						for (const h of highMidFiltered) {
							const hv = Number(h?.startTs ?? h?.start_ts ?? h?.time);
							if (Number.isFinite(hv) && Math.abs(ts - hv) < gapMs) return false;
						}
						for (const r of reservedSlots) {
							const buf = Number.isFinite(r?.buffer) ? r.buffer : gapMs;
							if (Number.isFinite(r?.ts) && Math.abs(ts - Number(r.ts)) < buf) return false;
						}
						return true;
					});
				const manualHigh = highMidFiltered.filter((r) => r?.__manualHigh);
				const highFirst = selectWithGap(highMidFiltered, imagingExpect, gapMs, reservedSlots, manualHigh);
				const remain = Math.max(0, imagingExpect - highFirst.length);
				if (!remain) return highFirst.length;
				const highTsSet = new Set(highFirst.map((x) => x.startTs));
				const conflictBases = highFirst.length ? highFirst : highMidFiltered;
				const rawLowPool = lowFiltered
					.filter((x) => !highTsSet.has(x.startTs))
					.filter((cand) => {
						const ts = Number(cand.startTs);
						if (!Number.isFinite(ts)) return false;
						for (const h of conflictBases) {
							const hv = Number(h?.startTs ?? h?.start_ts ?? h?.time);
							if (Number.isFinite(hv) && Math.abs(ts - hv) < gapMs) return false;
						}
						for (const r of reservedSlots) {
							const buf = Number.isFinite(r?.buffer) ? r.buffer : gapMs;
							if (Number.isFinite(r?.ts) && Math.abs(ts - Number(r.ts)) < buf) return false;
						}
						return true;
					})
					.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
				const lowPool = rawLowPool.filter((cand) => {
					const ts = Number(cand.startTs);
					if (!Number.isFinite(ts)) return false;
					return okGap(ts, highFirst, reservedSlots, gapMs);
				});
				const pickedLow: any[] = [];
				for (const cand of lowPool) {
					if (pickedLow.length >= remain) break;
					const ts = Number(cand.startTs);
					if (!Number.isFinite(ts)) continue;
					if (!okGap(ts, pickedLow, reservedSlots, gapMs)) continue;
					pickedLow.push(cand);
				}
				return highFirst.length + pickedLow.length;
			};

			planningProgress.percent = 40;
			planningProgress.text = "预报高优先级";

			const high = targetRes.targets.filter((t) => (t.priority ?? 99) <= 1);
			const mid = targetRes.targets.filter((t) => (t.priority ?? 99) === 2);
			const low = targetRes.targets.filter((t) => (t.priority ?? 99) > 2);
			lowTargets = low;
			midTargets = mid;
			const forecast = async (targets: any[]) => {
				if (!targets.length) return [];
				const body: any = {
					satelliteCode: form.value.satellite,
					forecastStartAt: imagingStart.getTime(),
					forecastEndAt: imagingEnd.getTime(),
					targetList: targets,
				};
				if (ephemeris) body.ephemeris = ephemeris;
				const resp = await fetch(ONE_CLICK_PLAN_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
				const data = await resp.json();
				const rawList: any[] = data?.result || data?.tasks || data?.data || [];
				return rawList
					.map((r) => {
						const ts = parseStartTime(r);
						const cloud = parseCloudPercent(r?.cloud ?? r?.cloudCoverage ?? r?.cloud_percent ?? r?.cloudPercent);
						const priority =
							resolvePriorityFromCache(r?.name || r?.targetName, priorityMap) ||
							parsePriority(r?.priority ?? r?.priorityLevel ?? r?.level);
						return ts
							? {
									...r,
									startTs: ts,
									name: r?.name || r?.targetName || "Task",
									cloud,
									priority,
							  }
							: null;
					})
					.filter((x): x is any => Boolean(x));
			};
			// 预报高优先级，人工挑选
			const highRes = await forecast(high);
			const pickedHigh = await openHighPrioritySelect(highRes, imagingExpect);
			pickedHigh.forEach((r) => (r.__manualHigh = true));
			forecastPool.push(...pickedHigh);
			console.log("[one-click-plan] high priority selected", {
				totalForecasted: highRes.length,
				chosen: pickedHigh.map((p) => `${p.name || p.targetName || "Task"} @${formatDisplay(new Date(p.startTs))}`),
			});
			planningProgress.percent = 55;
			planningProgress.text = "高优先级挑选完成";
			updateSelectionPreview(forecastPool);
			let approxPicked = countFeasible();

			// 若未满足数量，预报中优先级自动选
			if (approxPicked < imagingExpect && mid.length) {
				planningProgress.text = "预报中优先级";
				const midRes = await forecast(mid);
				const highSeed = filterByCloudRoll(forecastPool).filter((r) => (r.priority ?? 99) <= 1);
				const midResFiltered = midRes.filter((cand) => {
					const ts = Number(cand.startTs);
					if (!Number.isFinite(ts)) return false;
					return okGap(ts, highSeed, reservedSlots, gapMs);
				});
				forecastPool.push(...midResFiltered);
				console.log("[one-click-plan] mid forecast done", {
					count: midResFiltered.length,
					examples: midResFiltered
						.slice(0, 5)
						.map((p: any) => `${p.name || p.targetName} @${formatDisplay(new Date(p.startTs))}`),
				});
				approxPicked = countFeasible();
				updateSelectionPreview(forecastPool);
			}

			// 若不足，则低优先级 10 条一批，逐批预报直到够或耗尽
			if (approxPicked < imagingExpect && low.length) {
				planningProgress.text = "低优先级预报进行中";
				for (let i = 0; i < low.length && approxPicked < imagingExpect; i += 10) {
					const batchNo = Math.floor(i / 10) + 1;
					const batch = low.slice(i, i + 10);
					const batchRes = await forecast(batch);
					const highMidSeed = filterByCloudRoll(forecastPool).filter((r) => (r.priority ?? 99) <= 2);
					const batchResFiltered = batchRes.filter((cand) => {
						const ts = Number(cand.startTs);
						if (!Number.isFinite(ts)) return false;
						return okGap(ts, highMidSeed, reservedSlots, gapMs);
					});
					forecastPool.push(...batchResFiltered);
					approxPicked = countFeasible();
					const batchNames = batch.map((b) => b.name).join(",");
					console.log(
						"[one-click-plan] low batch",
						batchNo,
						"picked ~",
						approxPicked,
						"pool:",
						forecastPool.length,
						"batch:",
						batchNames,
						"added:",
						batchResFiltered.length
					);
					const prog = 70 + Math.floor((i + batch.length) / Math.max(low.length, 1) * 20);
					planningProgress.percent = Math.min(90, prog);
					planningProgress.text = `预报低优先级批次 ${batchNo} 完成`;
					updateSelectionPreview(forecastPool);
				}
				lowForecasted.ran = true;
				console.log("[one-click-plan] low priority loop end", { totalForecasted: forecastPool.length, approxPicked });
				planningProgress.text = "低优先级预报完成";
			}
		} else {
			orbitElements.value = null;
		}

		let imagingLimit = imagingExpect;

		// 固存可用槽位限制成像数量
		if (taskSwitches.imaging) {
			const slotName = form.value.satellite === "AS02" ? 0 : 2;
			try {
				const slots = await fetchEmptySlots(slotName, imagingLimit);
				if (slots.length < imagingLimit) {
					notes.push(`固存可用槽位 ${slots.length} 个，少于期望成像 ${imagingLimit} 个，已自动缩减。`);
					imagingLimit = slots.length;
				}
			} catch (err) {
				console.warn("[one-click-plan] fetchEmptySlots for limit failed", err);
			}
		}
		if (imagingLimit <= 0) {
			notes.push("固存可用槽位为 0，未生成成像任务。");
		}
		const cloudFiltered = forecastPool.filter((r) => {
			if (r?.__manualHigh) return true;
			return r.cloud == null || r.cloud <= cloudLimitVal;
		});
		const rollFiltered = cloudFiltered.filter((r) => {
			const rollNum = Number(pickRollAngle(r));
			if (!Number.isFinite(rollNum) || r?.__manualHigh) return true;
			return Math.abs(rollNum) <= rollLimitVal;
		});
		const highMidFiltered = rollFiltered.filter((r) => (r.priority ?? 99) <= 2);
		const lowFiltered = rollFiltered
			.filter((r) => (r.priority ?? 99) > 2)
			.filter((cand) => {
				const ts = Number(cand.startTs);
				if (!Number.isFinite(ts)) return false;
				// 按间隔先行剔除与高/中及预留窗口冲突的低优先级
				for (const h of highMidFiltered) {
					const hv = Number(h?.startTs ?? h?.start_ts ?? h?.time);
					if (Number.isFinite(hv) && Math.abs(ts - hv) < gapMs) return false;
				}
				for (const r of reservedSlots) {
					const buf = Number.isFinite(r?.buffer) ? r.buffer : gapMs;
					if (Number.isFinite(r?.ts) && Math.abs(ts - Number(r.ts)) < buf) return false;
				}
				return true;
			});
		console.log("[one-click-plan] filtered pool", {
			total: rollFiltered.length,
			high: highMidFiltered.length,
			low: lowFiltered.length,
			gapMs,
		});
		// gapMs 已在前面定义
		const noonTs = new Date(planRange.value.start);
		noonTs.setHours(12, 0, 0, 0);

			let picked: any[] = [];

		if (taskSwitches.imaging) {
			// 统一使用 reserved/gap 规则选取，保证选中即满足全部条件
			const manualHigh = highMidFiltered.filter((r) => r?.__manualHigh);
			const highFirst = selectWithGap(highMidFiltered, imagingLimit, gapMs, reservedSlots, manualHigh);
			const remain = Math.max(0, imagingLimit - highFirst.length);
			const conflictBases = highFirst.length ? highFirst : highMidFiltered;
			// 低优先级只用于补齐，先剔除与高/中冲突的候选（按成像间隔），再逐个检查间隔
			const highTsSet = new Set(highFirst.map((x) => x.startTs));
			const rawLowPool = lowFiltered
				.filter((x) => !highTsSet.has(x.startTs))
				.filter((cand) => {
					const ts = Number(cand.startTs);
					if (!Number.isFinite(ts)) return false;
					// 与高/中和预留窗口做一次冲突校验（成像-成像/成像-数传间隔）
					for (const h of conflictBases) {
						const hv = Number(h?.startTs ?? h?.start_ts ?? h?.time);
						if (Number.isFinite(hv) && Math.abs(ts - hv) < gapMs) return false;
					}
					for (const r of reservedSlots) {
						const buf = Number.isFinite(r?.buffer) ? r.buffer : gapMs;
						if (Number.isFinite(r?.ts) && Math.abs(ts - Number(r.ts)) < buf) return false;
					}
					return true;
				})
				.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
			const lowPool = rawLowPool.filter((cand) => {
				const ts = Number(cand.startTs);
				if (!Number.isFinite(ts)) return false;
				return okGap(ts, highFirst, reservedSlots, gapMs); // 预先用高/中校验
			});
			const pickedLow: any[] = [];
			if (remain > 0) {
				console.log(
					"[one-click-plan] low candidates considered",
					lowPool.map((x) => `${x.name} @${formatDisplay(new Date(x.startTs))}`)
				);
				for (const cand of lowPool) {
					if (pickedLow.length >= remain) break;
					const ts = Number(cand.startTs);
					if (!Number.isFinite(ts)) continue;
					if (!okGap(ts, pickedLow, reservedSlots, gapMs)) continue; // 与已选低不冲突
					pickedLow.push(cand);
					console.log("[one-click-plan] low pick", `${cand.name} @${formatDisplay(new Date(ts))}`);
				}
				console.log(
					"[one-click-plan] low picked",
					pickedLow.map((x) => `${x.name} @${formatDisplay(new Date(x.startTs))}`)
				);
			}
			picked = [...highFirst, ...pickedLow].slice(0, imagingLimit);
			console.log(
				"[one-click-plan] high/mid selected",
				highFirst.map((p) => `${p.name} @${formatDisplay(new Date(p.startTs))}`)
			);
			console.log(
				"[one-click-plan] after low selected",
				picked.map((p) => `${p.name} @${formatDisplay(new Date(p.startTs))}`)
			);
			if (remain > 0 && pickedLow.length === 0) {
				console.log(
					"[one-click-plan] low selection empty",
					{
						lowFiltered: lowFiltered.length,
						lowTimes: lowFiltered.map((x) => formatDisplay(new Date(x.startTs))),
						reserved: reservedSlots.length,
						gapMs,
					}
				);
			}
			if (!picked.length) {
				console.log("[one-click-plan] no tasks selected after applying gap/cloud/roll filters; pool size", rollFiltered.length);
			}

			// 如果仍不足，输出低优先级候选的间隔详情，便于确认为何未补足
			if (picked.length < imagingLimit && lowFiltered.length) {
				const detail = lowFiltered.map((c) => {
					const ts = Number(c.startTs);
					const gaps = picked.map((p) => Math.abs(ts - Number(p.startTs)) / 60000);
					return `${c.name} @${formatDisplay(new Date(ts))} gapToPicked(min): ${
						gaps.length ? Math.min(...gaps).toFixed(1) : "-"
					} min`;
				});
				console.log("[one-click-plan] low candidates gap detail", detail);
			}
		}

		console.log(
			"[one-click-plan] picked total",
			picked.length,
			"items:",
			picked.map((p) => `${p.name || "Task"} @${formatDisplay(new Date(p.startTs))}`)
		);
		if (taskSwitches.imaging && picked.length < imagingLimit) {
			const feasible = selectWithGap(rollFiltered, imagingLimit, gapMs, reservedSlots).length;
			console.log(
				"[one-click-plan] feasible with gap",
				feasible,
				"candidate pool",
				rollFiltered.length,
				"gapMs",
				gapMs
			);
			notes.push(
				`满足间隔/预留时间的候选不足（可选 ${feasible} 个，期望 ${imagingLimit} 个），可能需放宽间隔或时间窗口。`
			);
		}

			// 按成像时间先后重新分配固存号（时间早的分配更小的固存号）
			reorderStorageSlots(picked);

		// 展示最终选中的目标点
		updateSelectionPreview(picked, true);
		if (taskSwitches.imaging && picked.length < imagingLimit) {
			notes.push(
				`成像任务期望 ${imagingExpect} 个（受固存限制后 ${imagingLimit} 个），实际生成 ${picked.length} 个，可能因云量/间隔/预留时间限制。`
			);
		}

		const imagingDuration = form.value.satellite === "AS03" ? 30 : 40; // seconds
		let items = picked.map((r, idx) => {
			const timeText = formatDisplay(new Date(r.startTs));
			const type = mapTaskType(r);
			const endTs = Number(r.startTs ?? 0) + imagingDuration * 1000;
			const metaParts: string[] = [];
			if (r.cloud != null) metaParts.push(`Cloud: ${r.cloud}%`);
	if (r.priority != null) metaParts.push(`Priority: ${r.priority}`);
	if (r.mode) metaParts.push(`Mode: ${r.mode}`);
	return {
		id: String(r.id ?? r.__uid ?? idx),
		name: r.name,
		type,
		time: timeText,
		meta: metaParts.join(" | ") || "Auto planned task",
		startTs: Number(r.startTs),
		endTs,
		raw: r,
		rollAng:
			r.rollAng ??
			r.roll_angle ??
			r.rollAngle ??
			r.roll_angle_value ??
			r.side_swipe_angle ??
			null,
		rollText: formatAngleText(pickRollAngle(r)),
		solarText: formatAngleText(pickSolarAngle(r)),
		cloud: r.cloud ?? null,
		priority: r.priority ?? null,
	} as TimelineItem;
	});
		if (dataTasks.length) {
			items = [...items, ...dataTasks];
		}
		if (deleteTasks.length) items = [...items, ...deleteTasks];

		// 预览固存槽并丰富展示信息
		const imagingItems = items.filter((it) => it.type !== "data" && it.type !== "delete").sort((a, b) => a.startTs - b.startTs);
		if (imagingItems.length) {
			try {
				if (form.value.satellite === "AS02") {
					// AS02 规划阶段仍可自动分配空闲固存号，方便排期，但不强制校验；提交时再按任务上的 storageSlot 写入
					const slots = await fetchEmptySlots(0, imagingItems.length);
					for (let i = 0; i < imagingItems.length; i++) {
						const raw = imagingItems[i].raw || {};
						const preset = raw.startFileNo ?? raw.start_file_no ?? raw.fileStart ?? raw.file_start ?? raw.storageSlot ?? imagingItems[i].storageSlot;
						const slot = Number.isFinite(Number(preset)) ? { startFileNo: Number(preset) } : slots[i];
						if (slot && slot.startFileNo != null) {
							imagingItems[i].storageSlot = String(slot.startFileNo);
							imagingItems[i].raw.storageSlot = String(slot.startFileNo);
						}
					}
				} else {
					// AS03 仍按空闲槽顺序预览
					const slots = await fetchEmptySlots(2, imagingItems.length);
					for (let i = 0; i < imagingItems.length; i++) {
						const slot = slots[i];
						if (slot && slot.startFileNo != null) {
							imagingItems[i].storageSlot = String(slot.startFileNo);
						}
					}
				}
			} catch (err) {
				console.warn("[one-click-plan] 预览固存槽失败", err);
				throw err;
			}
		}
		items = items.map((it) => ({ ...it, meta: buildMeta(it) }));
		timeline.value = items;
		// 规划提示
		if (taskSwitches.transfer && form.value.satellite === "AS02") {
			const expected = Math.max(1, Number(transferTaskCount.value) || 1);
			if (dataTasks.length < expected) {
				notes.push(`数传任务期望 ${expected} 次，实际生成 ${dataTasks.length} 次。`);
			}
		}
		planningNotes.value = notes;
		ElMessage.success("Plan finished");
		planPreviewText.value = buildSubmissionSummaryText();
		planningProgress.percent = 100;
		planningProgress.status = "success";
		planningProgress.text = "规划完成";
	} catch (err: any) {
		ElMessage.error(err?.message || "Plan failed");
		planningProgress.status = "exception";
		planningProgress.text = err?.message || "规划失败";
	} finally {
		loading.value = false;
		setTimeout(() => {
			planningProgress.visible = false;
			planningSelection.value = [];
		}, 800);
	}
}

function updateChart() {
	if (!chart || !timeline.value.length) return;
	const { start, end } = buildChartRange(form.value.date);
	const startMs = start.getTime();
	const endMs = end.getTime();

	// 排序并计算相邻间隔
	const sorted = [...timeline.value].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	const data: any[] = [];
	const gapLines: Array<{ coords: number[][]; gap: number }> = [];
	const gapLabels: any[] = [];
	for (let i = 0; i < sorted.length; i++) {
		const cur = sorted[i];
		const prev = sorted[i - 1];
		const gap = prev ? Math.round((cur.startTs - prev.startTs) / 60000) : null;
		data.push({
			value: [cur.startTs, 1],
			name: cur.name,
			meta: cur.meta,
			time: cur.time,
			type: cur.type,
			cloud: cur.cloud,
			priority: cur.priority,
			gapMinutes: gap,
		});
		if (prev && gap != null) {
			gapLines.push({
				coords: [
					[prev.startTs, 1],
					[cur.startTs, 1],
				],
				gap,
			});
			const mid = (prev.startTs + cur.startTs) / 2;
			gapLabels.push({
				value: [mid, 1.1],
				label: `${gap} min`,
			});
		}
	}

	chart.setOption({
		grid: { left: 40, right: 20, top: 26, bottom: 34 },
		xAxis: {
			type: "time",
			min: startMs,
			max: endMs,
			axisLabel: { formatter: "{HH}:{mm}" },
			axisLine: { lineStyle: { color: "#909399" } },
			axisTick: { alignWithLabel: true, lineStyle: { color: "#909399" } },
		},
		yAxis: { show: false, min: 0, max: 1.5 },
		tooltip: {
			trigger: "item",
			borderRadius: 8,
			backgroundColor: "#fff",
			textStyle: { color: "#303133" },
			formatter: (p: any) => {
				const d = p.data;
				if (!d || !d.name) return "";
				const gapText =
					d.gapMinutes != null ? `<div style="color:#606266;font-weight:600;">时间间隔: ${d.gapMinutes} min</div>` : "";
				return `
					<div style="min-width:180px;">
						<div style="font-weight:600;margin-bottom:4px;">${d.name}</div>
						<div>${d.time ?? ""}</div>
						<div style="color:#606266;">${d.meta ?? ""}</div>
						${gapText}
					</div>
				`;
			},
		},
		series: [
			{
				type: "scatter",
				symbolSize: 14,
				symbolOffset: [0, -3],
				itemStyle: {
					color: (p: any) => {
						const t = String(p.data?.type || "").toLowerCase();
						if (t.includes("data")) return "#f78fb3";
						if (t.includes("delete")) return "#ff6b6b";
						return "#409EFF";
					},
				},
				data,
				z: 3,
			},
			{
				type: "lines",
				coordinateSystem: "cartesian2d",
				polyline: false,
				symbol: ["none", "none"],
				lineStyle: { color: "#d3d7de", width: 1, type: "dashed" },
				data: gapLines,
				silent: true,
				z: 1,
			},
			{
				type: "scatter",
				symbolSize: 1,
				silent: true,
				itemStyle: { color: "transparent" },
				label: {
					show: true,
					formatter: (p: any) => (p.data?.label ? p.data.label : ""),
					position: "top",
					color: "#606266",
					fontSize: 12,
					fontWeight: "600",
					align: "center",
				},
				data: gapLabels,
				z: 2,
			},
		],
	});
}

async function fetchAllTargets(sat: string): Promise<{ targets: TargetPayload[]; priorityMap: Map<string, number> }> {
	const api: any = (service as any)?.rs_poi?.poi;
	if (!api?.page) return { targets: [], priorityMap: new Map() };
	const defaultImageTime = sat === "AS03" ? 30 : 10;
	const size = 200;
	let page = 1;
	let total = 0;
	const acc: any[] = [];
	while (true) {
		const res = await api.page({ page, size });
		const list = res?.list || res?.data?.list || [];
		const pg = res?.pagination || res?.data?.pagination || { total: list.length };
		acc.push(...list);
		total = pg.total ?? acc.length;
		if (acc.length >= total || list.length === 0) break;
		page += 1;
	}
	const code = /AS03/i.test(sat) ? "1" : "0";
	const filtered = acc.filter((p: any) => {
		const s = String(p?.satellites ?? "").trim();
		if (!s) return false;
		const tokens = s.split(/[\s,|;]+/).map((x: string) => x.trim());
		return tokens.includes(code);
	});
	const priorityMap = new Map<string, number>();
	const targets = filtered.reduce<TargetPayload[]>((arr, p: any) => {
		const lon = Number(p.area_lon ?? p.long ?? p.longitude);
		const lat = Number(p.area_lat ?? p.lat ?? p.latitude);
		if (!Number.isFinite(lon) || !Number.isFinite(lat)) return arr;
		const priorityNum = parsePriority(p.level ?? p.priority ?? p.priorityLevel);
		const name = String(p.name ?? "").trim();
		if (!name) return arr;
		priorityMap.set(name.toLowerCase(), priorityNum);
		arr.push({
			name,
			long: lon,
			lat: lat,
			alt: 0,
			imageTime: defaultImageTime,
			priority: priorityNum,
		});
		return arr;
	}, []);
	return { targets, priorityMap };
}

function parseStartTime(row: any): number | null {
	const value = row?.startAtBeijing;
	if (value) {
		const text = String(value).trim();
		if (text) {
			const normalized = text.includes("T") ? text : text.replace(" ", "T");
			const ts = new Date(normalized).getTime();
			if (!Number.isNaN(ts)) return ts;
		}
	}
	return null;
}

function mapTaskType(task: any): TimelineItem["type"] {
	const name = String(task?.name || "").toLowerCase();
	if (name.includes("数传")) return "data";
	return "info";
}

function parseCloudPercent(v: any): number | null {
	if (v == null || v === "") return null;
	const s = String(v).trim().replace("％", "%");
	if (s.endsWith("%")) {
		const n = Number(s.slice(0, -1));
		return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
	}
	const n = Number(s);
	if (!Number.isFinite(n)) return null;
	return n >= 0 && n <= 1 ? Math.round(n * 100) : Math.max(0, Math.min(100, n));
}

function parsePriority(v: any): number {
	const num = Number(v);
	if (Number.isFinite(num) && num > 0) return num;
	return 99;
}

function resolvePriorityFromCache(name: string | undefined, priorityMap: Map<string, number>) {
	if (!name) return null;
	const key = name.toLowerCase();
	const hit = priorityMap.get(key);
	return hit != null ? hit : null;
}

function pickTopTasks(list: any[], limit: number, gapMs: number, reserved: Array<{ ts: number; buffer: number }> = []) {
	const sorted = [...list].sort((a, b) => {
		const ta = a.startTs ?? 0;
		const tb = b.startTs ?? 0;
		if (ta !== tb) return ta - tb;
		const pa = a.priority ?? 99;
		const pb = b.priority ?? 99;
		return pa - pb;
	});
	const n = sorted.length;
	let best: any[] = [];
	const score = (arr: any[]) => arr.reduce((s, x) => s + (x.priority ?? 99), 0);

	function ok(ts: number, lastTs: number, chosen: any[]) {
		if (lastTs >= 0 && ts - lastTs < gapMs) return false;
		for (const t of chosen) {
			const v = Number(t.startTs ?? 0);
			if (Number.isFinite(v) && Math.abs(ts - v) < gapMs) return false;
		}
		for (const r of reserved) {
			const buf = Number.isFinite(r.buffer) ? r.buffer : gapMs;
			if (Math.abs(ts - r.ts) < buf) return false;
		}
		return true;
	}

	function dfs(idx: number, current: any[], lastTs: number) {
		if (current.length > best.length || (current.length === best.length && score(current) < score(best))) {
			best = [...current];
		}
		if (current.length === limit || idx >= n) return;
		if (current.length + (n - idx) < best.length) return;

		const cand = sorted[idx];
		const ts = Number(cand.startTs ?? 0);
		if (Number.isFinite(ts) && ok(ts, lastTs, current)) {
			current.push(cand);
			dfs(idx + 1, current, ts);
			current.pop();
		}
		dfs(idx + 1, current, lastTs);
	}

	dfs(0, [], -Infinity);
	return best.slice(0, limit);
}

function pickWithPreference(
	list: any[],
	limit: number,
	gapMs: number,
	reserved: Array<{ ts: number; buffer: number }>,
	preferAfter: number,
) {
	const after = list.filter((x) => Number(x.startTs ?? 0) >= preferAfter);
	const first = pickTopTasks(after, limit, gapMs, reserved);
	if (first.length >= limit) return first;
	const pickedTs = new Set(first.map((x) => x.startTs));
	const remain = list.filter((x) => !pickedTs.has(x.startTs));
	const reservedCombined = [
		...reserved,
		...first
			.map((x) => Number(x.startTs))
			.filter((n) => Number.isFinite(n))
			.map((n) => ({ ts: n, buffer: gapMs })),
	];
	const second = pickTopTasks(remain, limit - first.length, gapMs, reservedCombined);
	return [...first, ...second].slice(0, limit);
}

function okGap(ts: number, chosen: any[], reserved: number[] | Array<{ ts: number; buffer: number }>, gapMs: number): boolean {
	const toTs = (v: any): number => {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
		const t = new Date(String(v)).getTime();
		return Number.isNaN(t) ? NaN : t;
	};
	for (const c of chosen) {
		const v = toTs(c.startTs ?? c.start_ts ?? c.time);
		if (Number.isFinite(v) && Math.abs(ts - v) < gapMs) return false;
	}
	for (const r of reserved as any) {
		const buf = Number.isFinite(r?.buffer) ? r.buffer : gapMs;
		const ts2 = toTs(r?.ts ?? r);
		if (Number.isFinite(ts2) && Math.abs(ts - ts2) < buf) return false;
	}
	return true;
}

function enforceGap(
	list: any[],
	gapMs: number,
	reserved: Array<{ ts: number; buffer: number }> = [],
): { kept: any[]; dropped: any[] } {
	const sorted = [...list].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	const kept: any[] = [];
	const dropped: any[] = [];
	for (const item of sorted) {
		const ts = Number(item.startTs ?? 0);
		if (!Number.isFinite(ts)) {
			dropped.push(item);
			continue;
		}
		if (okGap(ts, kept, reserved, gapMs)) {
			kept.push(item);
		} else {
			dropped.push(item);
		}
	}
	return { kept, dropped };
}

function selectWithGap(
	list: any[],
	limit: number,
	gapMs: number,
	reserved: Array<{ ts: number; buffer: number }> = [],
	preChosen: any[] = [],
) {
	const normalizeTs = (item: any) => {
		const tsRaw = item?.startTs ?? item?.start_ts ?? item?.time;
		const n = Number(tsRaw);
		if (Number.isFinite(n)) return n;
		const t = Date.parse(String(tsRaw));
		return Number.isFinite(t) ? t : NaN;
	};

	const chosen: any[] = [];
	const seen = new Set<number>();

	for (const item of preChosen) {
		const ts = normalizeTs(item);
		if (!Number.isFinite(ts)) continue;
		chosen.push({ ...item, startTs: ts });
		seen.add(ts);
		if (chosen.length >= limit) break;
	}

	if (chosen.length >= limit) {
		return chosen.slice(0, limit);
	}

	const sorted = [...list].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	for (const item of sorted) {
		if (chosen.length >= limit) break;
		const ts = normalizeTs(item);
		if (!Number.isFinite(ts)) continue;
		if (seen.has(ts)) continue;
		if (!okGap(ts, chosen, reserved, gapMs)) continue;
		chosen.push({ ...item, startTs: ts });
		seen.add(ts);
	}
	return chosen;
}

async function getToken(): Promise<string> {
	const resp = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: "02ptemplate@yinhe.ht", password: "123456", loginType: 2 }),
	});
	const data = await resp.json();
	const token = data?.data?.token;
	if (!token) throw new Error("获取登录 token 失败");
	return token;
}

function getSpacecraftIdBySatellite(satellite: string | undefined): string | null {
	if (!satellite) return null;
	const map: Record<string, string> = {
		AS02: "12",
		AS03: "13",
	};
	return map[satellite] ?? null;
}

async function fetchOrbitElementsForSatellite(satellite: string | undefined, token?: string): Promise<any | null> {
	const spacecraftId = getSpacecraftIdBySatellite(satellite);
	if (!spacecraftId) return null;
	try {
		const tk = token || (await getToken());
		const now = Date.now();
		const dayMs = 24 * 60 * 60 * 1000;
		const body = {
			keyword: "",
			spacecraftIds: [spacecraftId],
			beginTime: now - 7 * dayMs,
			endTime: now + 1 * dayMs,
			page: 1,
			pageSize: 20,
			states: [1, 2],
			order: 6,
		};
		const resp = await fetch("http://ttnonc-webui.cyk3.yhroot.com/v2/api/orbit/keplers/search", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-web-token": tk,
			},
			body: JSON.stringify(body),
		});
		if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
		const result = await resp.json();
		const list = result?.data?.list;
		if (!Array.isArray(list) || !list.length) return null;
		return list[0]?.orbitElements ?? null;
	} catch (err) {
		console.warn("[one-click-plan] 获取星历失败", err);
		return null;
	}
}

function formatDateYMD(d: Date) {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type TelecontrolRecord = {
	beginTime?: number;
	endTime?: number;
	antennaId?: string;
	dataTrans?: { beginTime?: number; endTime?: number };
};

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

function buildUtcRange(date: string) {
	const base = new Date(`${date}T00:00:00`).getTime() + 8 * 60 * 60 * 1000;
	const day = 24 * 60 * 60 * 1000;
	return { begin: base, end: base + day };
}

type PendingFile = { start: number; end: number };
type TransferSelectionSource = "payload" | "platform";
type TransferGroup = {
	start: number;
	end: number;
	count: number;
	duration: number;
	type?: TransferSelectionSource;
};

async function fetchPendingFiles(satellite: "AS02" | "AS03", statuses: number[] = [2]): Promise<PendingFile[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = satellite === "AS02" ? 0 : 2;
	const seenStart = new Set<number>();
	const all: any[] = [];
	for (const status of statuses) {
		let page = 1;
		const size = 200;
		// 遍历分页，防止接口只返回部分
		while (true) {
			const res = await api.page({ page, size, name, status, sort: "startFileNo", order: "ASC" });
			const list = res?.list || res?.data?.list || [];
			console.log(
				"[one-click-plan] fetchPendingFiles page",
				{ page, status, got: list.length },
				list.map((x: any) => x?.startFileNo ?? x?.start_file_no)
			);
			for (const x of list || []) {
				const start = Number(x?.startFileNo ?? x?.start_file_no);
				if (seenStart.has(start)) continue;
				seenStart.add(start);
				all.push(x);
			}
			if (!Array.isArray(list) || list.length < size) break;
			page += 1;
		}
	}
	console.log("[one-click-plan] fetchPendingFiles total", { statuses, count: all.length });
	const list = all;
	const sorted = list
		.map((x: any) => {
			const start = Number(x?.startFileNo ?? x?.start_file_no);
			const endRaw = Number(x?.endFileNo ?? x?.end_file_no);
			const end = Number.isFinite(endRaw) ? endRaw : start + 7;
			return { start, end };
		})
		.filter((x: any) => Number.isFinite(x.start))
		.sort((a: any, b: any) => a.start - b.start);
	const unique: PendingFile[] = [];
	const seen = new Set<number>();
	for (const r of sorted) {
		if (seen.has(r.start)) continue;
		seen.add(r.start);
		unique.push({ start: r.start, end: Number.isFinite(r.end) ? r.end : r.start + 7 });
	}
	return unique;
}

async function fetchDeletableFiles(satellite: "AS02" | "AS03"): Promise<PendingFile[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const name = satellite === "AS02" ? 0 : 2;
	const res = await api.page({ page: 1, size: 200, name, status: 6 });
	const list = res?.list || res?.data?.list || [];
	const sorted = list
		.map((x: any) => {
			const start = Number(x?.startFileNo ?? x?.start_file_no);
			const endRaw = Number(x?.endFileNo ?? x?.end_file_no);
			const end = Number.isFinite(endRaw) ? endRaw : start + 7;
			return { start, end };
		})
		.filter((x: any) => Number.isFinite(x.start))
		.sort((a: any, b: any) => a.start - b.start);
	const unique: PendingFile[] = [];
	const seen = new Set<number>();
	for (const r of sorted) {
		if (seen.has(r.start)) continue;
		seen.add(r.start);
		unique.push({ start: r.start, end: Number.isFinite(r.end) ? r.end : r.start + 7 });
	}
	return unique;
}

async function buildDataTransTasks(
	token: string,
	start: Date,
	end: Date,
	limit: number,
	excludeStarts: Set<number> = new Set(),
	notes?: string[]
): Promise<TimelineItem[]> {
	try {
		const dateStr = formatDateYMD(start);
		const records = await fetchTelecontrolRecords(token, dateStr, "12");
		console.log(
			"[one-click-plan] telecontrol records",
			dateStr,
			(records || []).map((r: any) => ({
				begin: r.beginTime,
				end: r.endTime,
				antenna: r.antennaId ?? (r as any)?.antenna_id,
			}))
		);
		if (!records?.length || limit <= 0) return [];
		const thresholdEvening = new Date(`${dateStr}T17:00:00+08:00`).getTime(); // 北京 17:00
		const thresholdMorning = new Date(`${dateStr}T08:00:00+08:00`).getTime(); // 北京 08:00
		const sorted = [...records].sort((a, b) => (a.beginTime ?? 0) - (b.beginTime ?? 0));
		const eveningPass = sorted.find((r) => (r.beginTime ?? 0) >= thresholdEvening);
		const morningPass = sorted.find((r) => (r.beginTime ?? 0) >= thresholdMorning);
		let candidates: any[] = [];
		if (limit === 1) {
			candidates = eveningPass ? [eveningPass] : morningPass ? [morningPass] : [];
		} else {
			candidates = [eveningPass, morningPass]
				.filter((x): x is any => Boolean(x?.beginTime))
				.filter((x, idx, arr) => arr.findIndex((y) => y.beginTime === x.beginTime) === idx)
				.sort((a, b) => (a.beginTime ?? 0) - (b.beginTime ?? 0))
				.slice(0, limit);
		}
		console.log(
			"[one-click-plan] transfer candidates",
			candidates.map((c) => ({ begin: c?.beginTime, end: c?.endTime, antenna: c?.antennaId ?? (c as any)?.antenna_id }))
		);
		const tasks: TimelineItem[] = [];
		for (const pass of candidates) {
			if (tasks.length >= limit) break;
			if (!pass || !pass.beginTime) continue;
			const slotBegin = Number(pass.beginTime);
			const startTs = slotBegin + 60 * 1000; // +1min
			if (startTs < start.getTime() || startTs > end.getTime()) continue;

			// 仅取待写入/待数传状态 2
			const pendingRaw = await fetchPendingFiles("AS02", [2]);
			console.log("[one-click-plan] pending files raw", pendingRaw.map((p) => p.start));
			const pending = pendingRaw.filter((p) => !excludeStarts.has(p.start));
			console.log(
				"[one-click-plan] pending after exclude",
				{ exclude: Array.from(excludeStarts), kept: pending.map((p) => p.start) }
			);
			// 单次数传最多 4 个文件
			const pendingLimited = pending.slice(0, 4);
			if (pending.length < 3) {
				console.log("[one-click-plan] skip transfer, pending <3");
				notes?.push(
					`数传轨次 ${formatDisplay(new Date(startTs))} 跳过：可用文件数 ${pending.length} < 3（状态2且排除已用后）`
				);
				continue;
			}
			const groups = buildTransferGroups(pendingLimited);
			console.log("[one-click-plan] transfer groups", groups);
			const filesText = pendingLimited.length ? `Files: ${pendingLimited.map((p) => p.start).join(", ")}` : "Files: -";
			const antennaId = pass.antennaId ?? (pass as any)?.antenna_id ?? null;
			const resetSeq = tasks.length === 0 ? Boolean(reloadTableFlag.value) : false; // 首个按勾选，其余固定 false
			tasks.push({
				id: `data-${startTs}`,
				name: "数传任务",
				type: "data",
				time: formatDisplay(new Date(startTs)),
				meta: `Antenna: ${antennaId ?? "-"} | ${filesText}`,
				startTs,
				endTs: Number(pass.dataTrans?.endTime ?? pass.endTime ?? startTs),
				antennaId: antennaId ? String(antennaId) : null,
				teleBegin: slotBegin,
				teleEnd: Number(pass.dataTrans?.endTime ?? pass.endTime ?? null) || null,
				files: pendingLimited.map((p) => String(p.start)),
				raw: { groups, resetSeq },
				cloud: null,
				priority: null,
			});
			(groups || []).forEach((g: TransferGroup) => {
				for (let i = 0; i < (g.count || 1); i++) {
					excludeStarts.add(Number(g.start) + i * 8);
				}
			});
		}
		return tasks;
	} catch (e) {
		console.warn("[one-click-plan] buildDataTransTask failed", e);
		return [];
	}
}

async function buildDeleteTasks(start: Date, end: Date): Promise<TimelineItem[]> {
	try {
		const sat: "AS02" | "AS03" = "AS02";
		const files = await fetchDeletableFiles(sat);
		if (!files.length) return [];
		// 次日早晨窗口（默认 07:00 开始，6h 窗口）
		const base = new Date(start.getTime() + 24 * 60 * 60 * 1000);
		base.setHours(7, 0, 0, 0);
		const windowStart = base.getTime();
		const windowEnd = windowStart + 6 * 60 * 60 * 1000;
		let chosen = windowStart;
		const allReserved = [windowStart]; // include start to ensure gap calc init
		for (const r of timeline.value) {
			allReserved.push(r.startTs);
		}
		allReserved.sort((a, b) => a - b);
		const minGap = 30 * 60 * 1000;
		// find earliest slot in windowStart..windowEnd that is 30min away from existing
		for (let t = windowStart; t <= windowEnd; t += 5 * 60 * 1000) {
			const ok = allReserved.every((x) => Math.abs(t - x) >= minGap);
			if (ok) {
				chosen = t;
				break;
			}
		}
		if (chosen < windowStart || chosen > windowEnd) return [];

		// 按连续块分组（start + 8 视为连续）
		const sorted = [...files].sort((a, b) => a.start - b.start);
		const groups: PendingFile[][] = [];
		let current: PendingFile[] = [];
		for (const f of sorted) {
			if (!current.length) {
				current.push(f);
				continue;
			}
			const expected = current[0].start + current.length * 8;
			if (f.start === expected) {
				current.push(f);
			} else {
				groups.push(current);
				current = [f];
			}
		}
		if (current.length) groups.push(current);

		const tasks: TimelineItem[] = [];
		for (let i = 0; i < groups.length; i++) {
			const g = groups[i];
			if (g.length < 4) continue; // 仅规划连续 4 个及以上
			const deleteStart = g[0].start;
			const deleteEnd = g[g.length - 1].start + 7;
			const ts = chosen + i * 60 * 60 * 1000; // 间隔 1h
			if (ts > windowEnd) break;
			tasks.push({
				id: `delete-${ts}-${deleteStart}-${deleteEnd}`,
				name: "固存删除任务",
				type: "delete",
				time: formatDisplay(new Date(ts)),
				meta: `Delete: ${deleteStart}-${deleteEnd}`,
				startTs: ts,
				endTs: ts + 5 * 60 * 1000,
				deleteFiles: g.map((f) => String(f.start)),
				files: g.map((f) => String(f.start)),
				raw: { startFile: deleteStart, endFile: deleteEnd, count: g.length },
				cloud: null,
				priority: null,
			});
		}
		return tasks;
	} catch (e) {
		console.warn("[one-click-plan] buildDeleteTask failed", e);
		return [];
	}
}

const antennaGeoCache = new Map<string, { longitude: number; latitude: number; altitude: number; name: string }>();
let antennaListCache: any[] | null = null;

function toIsoString(val: any): string {
	if (val == null || val === "") return "";
	if (typeof val === "number") {
		return new Date(val).toISOString();
	}
	const raw = String(val);
	const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
	const date = new Date(normalized);
	return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function pickRollAngle(source: any): string {
	const cand =
		source?.rollAng ??
		source?.roll_angle ??
		source?.rollAngle ??
		source?.roll_angle_value ??
		source?.side_swipe_angle ??
		source?.roll_ang ??
		"";
	return cand == null ? "" : String(cand);
}

function pickSolarAngle(source: any): string {
	const cand =
		source?.solarAng ??
		source?.solar_angle ??
		source?.solarAngle ??
		source?.sunElevation ??
		source?.sunElevationDeg ??
		source?.sun_elevation ??
		source?.sun_angle ??
		"";
	return cand == null ? "" : String(cand);
}

function formatAngleText(value: any): string {
	const num = Number(value);
	if (!Number.isFinite(num)) return value == null ? "" : String(value);
	return num.toFixed(3);
}

function mapSolarAngleCode(value: any): string {
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return value == null ? "" : String(value);
	}
	if (num >= 20 && num < 30) return "0x1111";
	if (num >= 30 && num < 40) return "0x2222";
	if (num >= 40 && num < 50) return "0x3333";
	if (num >= 50 && num < 60) return "0x4444";
	if (num >= 60 && num < 70) return "0x5555";
	return String(num);
}

function formatBeijingTime(val: any): string {
	const ts = (() => {
		if (typeof val === "number") return val;
		const num = Number(val);
		if (Number.isFinite(num)) return num;
		const d = new Date(val);
		return d.getTime();
	})();
	if (!Number.isFinite(ts)) return "";
	const offset = 8 * 60 * 60 * 1000;
	const d = new Date(ts + offset);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}:${pad(
		d.getUTCMinutes()
	)}:${pad(d.getUTCSeconds())}`;
}

function buildMeta(item: TimelineItem): string {
	const parts: string[] = [];
	if (item.type === "data") {
		const groups = Array.isArray(item.raw?.groups) ? item.raw.groups : [];
		const hasType = groups.some((g: any) => g?.type);
		const fileText = String(item.raw?.fileText ?? "").trim();
		if (fileText) {
			parts.push(`数传文件: ${fileText}`);
		} else if (item.files?.length) {
			parts.push(`数传文件: ${item.files.join(",")}`);
		}
		const formatRange = (g: any) => `${g.start}-${g.end}(${g.duration || g.time || ""}s)`;
		const payloadRanges = groups.filter((g: any) => g?.type !== "platform").map(formatRange).join("，");
		const platformRanges = groups.filter((g: any) => g?.type === "platform").map(formatRange).join("，");
		if (hasType) {
			if (payloadRanges) parts.push(`载荷范围: ${payloadRanges}`);
			if (platformRanges) parts.push(`平台范围: ${platformRanges}`);
		} else if (payloadRanges) {
			parts.push(`范围: ${payloadRanges}`);
		}
		if (item.antennaId) {
			const antennaName = TELECONTROL_ANTENNA_MAP.get(String(item.antennaId)) || item.antennaId;
			parts.push(`数传站: ${antennaName}`);
		}
		return parts.join(" | ") || "数传任务";
	}
	if (item.type === "delete") {
		if (item.raw?.startFile != null && item.raw?.endFile != null) {
			parts.push(`删除文件: ${item.raw.startFile}-${item.raw.endFile}`);
		} else if (item.deleteFiles?.length) {
			parts.push(`删除文件: ${item.deleteFiles.join(",")}`);
		}
		return parts.join(" | ") || "固存删除任务";
	}
	if (item.cloud != null) parts.push(`云量: ${item.cloud}%`);
	if (item.priority != null) parts.push(`优先级: ${item.priority}`);
	if (item.rollText) parts.push(`侧摆角: ${item.rollText}`);
	if (item.solarText) parts.push(`太阳角: ${item.solarText}`);
	if (item.storageSlot) parts.push(`记录文件号: ${item.storageSlot}`);
	return parts.join(" | ") || "任务";
}

async function fetchEmptySlots(name: number, expect: number): Promise<any[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const size = Math.max(200, expect);
		let page = 1;
		const acc: any[] = [];
	while (acc.length < expect) {
		const res = await api.page({
			page,
			size,
			name,
			status: 0,
			sort: "startFileNo",
			order: "ASC",
		});
		const list = res?.list || res?.data?.list || [];
		if (!list.length) break;
		acc.push(...list);
		page += 1;
	}
	const seen = new Set<number>();
	return acc
		.map((r) => ({ ...r, startFileNo: Number(r?.startFileNo) }))
		.filter((r) => Number.isFinite(r.startFileNo))
		.filter((r) => {
			if (seen.has(r.startFileNo)) return false;
			seen.add(r.startFileNo);
			return true;
		})
		.sort((a, b) => Number(a.startFileNo) - Number(b.startFileNo))
		.slice(0, expect);
}

async function updateFixedStorageSlot(
	name: number,
	slot: any,
	item: TimelineItem,
	extra?: { fileName?: string; executingTime?: string; imagingTime?: string }
) {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.update || !slot?.id) return;
	const payload: Record<string, any> = {
		id: slot.id,
		status: 1,
	};
	if (item?.name) payload.targetName = String(item.name);
	if (extra?.fileName) payload.fileName = extra.fileName;
	const imagingTime = extra?.imagingTime ?? toIsoString(item?.startTs ?? item?.raw?.startAt ?? item?.raw?.startAtBeijing ?? "");
	if (extra?.executingTime) {
		payload.executingTime = extra.executingTime;
	} else if (imagingTime) {
		payload.executingTime = imagingTime;
	}
	if (imagingTime) payload.imagingTime = imagingTime;
	const imagingUid = ensureImagingUid(item);
	if (imagingUid) payload.imagingUid = imagingUid;
	await api.update({ name, data: payload });
}

async function postTemplate(body: Record<string, any>, token: string, type: "image" | "transfer" | "delete" = "image") {
	await validateCommandRequest(type, String(body.spacecraftCode || form.value.satellite || ""), body);
	const resp = await fetch(TRANSFER_API_URL, {
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
}

type Range = { start: number; end: number };

function parseTransferRangesFromText(text: string): { payload: Range[]; platform: Range[] } {
	const payload: Range[] = [];
	const platform: Range[] = [];
	let current: "payload" | "platform" = "payload";
	const tokens = String(text || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	const pushRange = (kind: "payload" | "platform", seg: string) => {
		const [s, e] = seg.split("-").map((n) => Number(n));
		if (Number.isFinite(s)) {
			const range: Range = { start: s, end: Number.isFinite(e) ? e : s };
			(kind === "payload" ? payload : platform).push(range);
		}
	};
	for (const token of tokens) {
		if (token.startsWith("载荷:")) {
			current = "payload";
			pushRange("payload", token.slice(3));
			continue;
		}
		if (token.startsWith("平台:")) {
			current = "platform";
			pushRange("platform", token.slice(3));
			continue;
		}
		pushRange(current, token);
	}
	return { payload, platform };
}

async function updateStorageStatusAfterTransfer(
	satellite: "AS02" | "AS03",
	groups: Array<TransferGroup>,
	fileText?: string
) {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page || !api?.batchUpdate) return;
	const tableMap = satellite === "AS02" ? { payload: 0, platform: 1 } : { payload: 2, platform: 3 };

	const ranges = groups.reduce(
		(acc, g) => {
			if (Number.isFinite(g.start) && Number.isFinite(g.end)) {
				const range = { start: Number(g.start), end: Number(g.end) };
				if (g.type === "platform") {
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
		const parsed = parseTransferRangesFromText(fileText);
		ranges.payload.push(...parsed.payload);
		ranges.platform.push(...parsed.platform);
	}

	const updateByTable = async (name: number, list: Range[]) => {
		if (!list.length) return;
		const res = await api.page({ page: 1, size: 500, name, sort: "startFileNo", order: "ASC" });
		const rows = res?.list || res?.data?.list || [];
		const ids: number[] = [];
		for (const row of rows) {
			const start = Number(row?.startFileNo ?? row?.start_file_no);
			if (!Number.isFinite(start)) continue;
			const hit = list.some((r) => start >= r.start && start <= r.end);
			if (hit && row?.status !== 7) {
				const id = Number(row?.id);
				if (Number.isFinite(id)) ids.push(id);
			}
		}
		if (ids.length) {
			await api.batchUpdate({ ids, name, data: { status: 7 } });
		}
	};

	await updateByTable(tableMap.payload, ranges.payload);
	await updateByTable(tableMap.platform, ranges.platform);
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

async function ensureAntennaList(token: string) {
	if (antennaListCache) return;
	const resp = await fetch(ANTENNA_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-web-token": token,
		},
		body: JSON.stringify({}),
	});
	if (!resp.ok) {
		const txt = await resp.text();
		throw new Error(txt || `HTTP ${resp.status}`);
	}
	const data = await resp.json();
	antennaListCache = data?.data?.getAllAntenna || data?.data || data?.list || [];
}

async function resolveAntennaGeoById(
	antennaId: string | null | undefined,
	token: string
): Promise<{ longitude: number; latitude: number; altitude: number; name: string }> {
	if (!antennaId) {
		throw new Error("数传天线缺少 antennaId");
	}
	const idStr = String(antennaId);
	const mappedName = TELECONTROL_ANTENNA_MAP.get(idStr);
	if (!mappedName) {
		throw new Error(`未找到天线 ${idStr} 的名称映射`);
	}
	if (antennaGeoCache.has(mappedName)) {
		return antennaGeoCache.get(mappedName)!;
	}
	await ensureAntennaList(token);
	const hit =
		antennaListCache?.find(
			(item: any) =>
				item?.name === mappedName ||
				item?.code === mappedName ||
				String(item?.id) === idStr ||
				String(item?.stationId) === idStr
		) ?? null;
	if (!hit) {
		throw new Error(`未在天线列表中找到 ${mappedName}`);
	}
	const geo = {
		longitude: Number(hit?.config?.geographicLocation?.longitude ?? hit?.longitude ?? hit?.long ?? 0) || 0,
		latitude: Number(hit?.config?.geographicLocation?.latitude ?? hit?.latitude ?? hit?.lat ?? 0) || 0,
		altitude: Number(hit?.config?.geographicLocation?.altitude ?? hit?.altitude ?? hit?.alt ?? 0) || 0,
		name: mappedName,
	};
	antennaGeoCache.set(mappedName, geo);
	return geo;
}

function buildTransferGroups(pending: PendingFile[]): TransferGroup[] {
	const sorted = [...pending].sort((a, b) => a.start - b.start);
	const groups: TransferGroup[] = [];
	let current: TransferGroup | null = null;
	for (const p of sorted) {
		if (!current) {
			current = { start: p.start, end: p.end, count: 1, duration: 90 };
			continue;
		}
		const expectedNextStart = current.start + current.count * 8;
		if (p.start === expectedNextStart) {
			current.count += 1;
			current.end = p.end;
			current.duration = current.count * 90;
		} else {
			groups.push({ ...current });
			current = { start: p.start, end: p.end, count: 1, duration: 90 };
		}
	}
	if (current) {
		groups.push({ ...current });
	}
	return groups;
}

function mapTransferType(type?: TransferSelectionSource): string {
	return type === "platform" ? "0" : "1";
}

function buildTransferBody(
	satellite: "AS02" | "AS03",
	groups: Array<TransferGroup>,
	geo: any,
	t0Iso: string,
	startSeq: number,
	resetSeqFlag?: boolean
) {
	if (satellite === "AS03") {
		if (groups.length > 6) {
			throw new Error("AS03 数传分组最多支持 6 组");
		}
		const base: Record<string, any> = {
			spacecraftCode: "AS03",
			templateId: AS03_TRANSFER_TEMPLATE_ID,
			folderId: AS03_TRANSFER_FOLDER_ID,
			name: `${geo?.name || "数传"}数传任务-${formatBeijingTime(t0Iso)}`,
			station: String(geo?.name ?? ""),
			stationName: String(geo?.name ?? ""),
			start_seq: String(startSeq),
			reset_seq: resetSeqFlag ?? Boolean(reloadTableFlag.value),
			t0: t0Iso,
			duration: "",
			trans_count: String(groups.length || 1),
			long: String(geo?.longitude ?? ""),
			lat: String(geo?.latitude ?? ""),
			alt: String(geo?.altitude ?? ""),
		};

		for (let i = 1; i <= 6; i++) {
			base[`start_file${i}`] = "";
			base[`end_file${i}`] = "";
			base[`module${i}`] = "";
			base[`trans_time${i}`] = "";
		}

		let totalDuration = 0;
		groups.forEach((g, idx) => {
			const slot = idx + 1;
			if (slot > 6) return;
			const duration = Number(g.duration) || 0;
			base[`start_file${slot}`] = String(g.start ?? "");
			base[`end_file${slot}`] = String(g.end ?? "");
			base[`module${slot}`] = mapTransferType(g.type);
			base[`trans_time${slot}`] = String(duration);
			if (duration > 0) totalDuration += duration;
		});
		if (totalDuration > 0) {
			base.duration = String(totalDuration);
		}
		return base;
	}

	const base: Record<string, any> = {
		spacecraftCode: "AS02",
		templateId: TRANSFER_TEMPLATE_ID,
		folderId: TRANSFER_FOLDER_ID,
		name: `${geo?.name || "数传"}数传任务-${formatBeijingTime(t0Iso)}`,
		station: String(geo?.name ?? ""),
		stationName: String(geo?.name ?? ""),
		start_seq: String(startSeq),
		reset_seq: resetSeqFlag ?? Boolean(reloadTableFlag.value),
		t0: t0Iso,
		duration: "",
		trans_count: String(groups.length || 1),
		long: String(geo?.longitude ?? ""),
		lat: String(geo?.latitude ?? ""),
		alt: String(geo?.altitude ?? ""),
		trans_type: "1",
	};

	let totalDuration = 0;
	groups.forEach((g, idx) => {
		const type = mapTransferType(g.type);
		const duration = Number(g.duration) || 0;
		totalDuration += duration;
		if (idx === 0) {
			base.start_file = String(g.start);
			base.end_file = String(g.end);
			base.trans_time1 = String(duration);
			base.trans_type = type;
		} else {
			base[`start_file${idx}`] = String(g.start);
			base[`end_file${idx}`] = String(g.end);
			base[`trans_type${idx}`] = type;
			base[`trans_time${idx + 1}`] = String(duration);
		}
	});
	base.duration = String(totalDuration || "");

	// 补齐空字段
	for (let i = 1; i <= 8; i++) {
		base[`start_file${i}`] = base[`start_file${i}`] || "";
		base[`end_file${i}`] = base[`end_file${i}`] || "";
		base[`trans_type${i}`] = base[`trans_type${i}`] || "";
	}
	for (let i = 1; i <= 9; i++) {
		base[`trans_time${i}`] = base[`trans_time${i}`] || "";
	}

	return base;
}

function buildDeleteBody(range: { start: number; end: number }, startTimeIso: string, startSeq: number) {
	return {
		spacecraftCode: "AS02",
		templateId: DELETE_TEMPLATE_AS02,
		folderId: AS02_IMAGING_FOLDER,
		name: `固存删除任务-${formatBeijingTime(startTimeIso)}`,
		start_file: String(range.start ?? ""),
		end_file: String(range.end ?? ""),
		start_seq: String(startSeq),
		start_time: startTimeIso,
	};
}

async function submitImagingTasks(token: string, satellite: "AS02" | "AS03") {
	const imaging = timeline.value
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	if (!imaging.length) return;

	// 先为本次成像任务生成并缓存 UID，供固存回填/任务落库/数传关联复用
	imaging.forEach((item) => ensureImagingUid(item));

	if (satellite === "AS02") {
		let slots = await fetchEmptySlots(0, imaging.length);
		if (slots.length < imaging.length) {
			throw new Error(`AS02 固存空槽不足，需 ${imaging.length} 个，现有 ${slots.length} 个`);
		}
		const usedSlot = new Set<number>();
		let success = 0;
		for (let i = 0; i < imaging.length; i++) {
			const item = imaging[i];
			const desired = Number(
				item.storageSlot ??
					item.raw?.storageSlot ??
					item.raw?.startFileNo ??
					item.raw?.start_file_no ??
					item.raw?.fileStart ??
					item.raw?.file_start
			);
			let slot = slots[i];
			if (Number.isFinite(desired)) {
				let hit = slots.find((s: any) => Number(s?.startFileNo ?? s?.start_file_no) === desired);
				// 若当前缓存列表未找到，实时再查一次
				if (!hit || usedSlot.has(desired)) {
					slots = await fetchEmptySlots(0, Math.max(imaging.length, 100));
					hit = slots.find((s: any) => Number(s?.startFileNo ?? s?.start_file_no) === desired);
				}
				if (!hit || usedSlot.has(desired)) {
					throw new Error(`记录文件号 ${desired} 未空闲或已被使用，无法提交`);
				}
				slot = hit;
			}
			const slotNo = Number(slot?.startFileNo ?? slot?.start_file_no);
			if (!Number.isFinite(slotNo)) {
				throw new Error(`未找到可用固存号供任务 ${item.name} 使用`);
			}
			usedSlot.add(slotNo);
			const startIso = toIsoString(item.startTs);
			const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 40 * 1000));
			const imagingUid = ensureImagingUid(item);
			const body = {
				spacecraftCode: "AS02",
				templateId: AS02_IMAGING_TEMPLATE,
				folderId: AS02_IMAGING_FOLDER,
				name: `${item.name || "成像任务"}-${formatBeijingTime(item.startTs)}`,
				scanMode: "0x02",
				rollAng: pickRollAngle(item.raw ?? item),
				solarAng: mapSolarAngleCode(pickSolarAngle(item.raw ?? item)),
				startAt: startIso,
				endAt: endIso,
				fileStart: String(slotNo),
				imagingUid,
			};
			await postTemplate(body, token);
			success += 1;
			try {
				await updateFixedStorageSlot(0, slot, item, { imagingTime: startIso, executingTime: startIso });
			} catch (err) {
				console.warn("[one-click-plan] 回填 AS02 固存失败", err);
			}
		}
		ElMessage.success(`AS02 成像任务提交成功 ${success}/${imaging.length}`);
		return;
	}

	// AS03
	const slots = await fetchEmptySlots(2, imaging.length);
	const platformSlots = await fetchEmptySlots(3, imaging.length);
	if (slots.length < imaging.length) {
		throw new Error(`AS03 载荷固存空槽不足，需 ${imaging.length} 个，现有 ${slots.length} 个`);
	}
	if (platformSlots.length < imaging.length) {
		throw new Error(`AS03 平台固存空槽不足，需 ${imaging.length} 个，现有 ${platformSlots.length} 个`);
	}
	let success = 0;
	for (let i = 0; i < imaging.length; i++) {
		const item = imaging[i];
		const slot = slots[i];
		const platformSlot = platformSlots[i];
		const startIso = toIsoString(item.startTs);
		const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 30 * 1000));
		const imagingUid = ensureImagingUid(item);
		// AS03 绝对延时指令号：首个任务从外部输入起算，每个任务占用 56 个序号
		const baseSeqStart = Number(absStartSeq.value) || 3;
		const baseSeq = baseSeqStart + i * 56;
		const resetSeq = i === 0 ? Boolean(reloadTableFlag.value) : false;
		const bodies = [
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[0],
				folderId: AS03_IMAGING_FOLDER,
				name: `1.${item.name || "成像任务"}-焦面断电-${formatBeijingTime(item.startTs)}`,
				reset_seq: resetSeq,
				start_seq: String(baseSeq),
				tf: endIso,
				fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
			},
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[1],
				folderId: AS03_IMAGING_FOLDER,
				name: `2.${item.name || "成像任务"}-制冷机启停-${formatBeijingTime(item.startTs)}`,
				t0: startIso,
				start_seq: String(baseSeq + 14),
				fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
			},
			{
				spacecraftCode: "AS03",
				templateId: AS03_IMAGING_TEMPLATES[2],
				folderId: AS03_IMAGING_FOLDER,
				name: `3.${item.name || "成像任务"}-成像序列+转姿态+GNSS转存-${formatBeijingTime(item.startTs)}`,
				start_seq: String(baseSeq + 47),
				t0: startIso,
				tf: endIso,
				side_swipe_angle: pickRollAngle(item.raw ?? item),
				fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
				imagingUid,
			},
		];
		for (const body of bodies) {
			await postTemplate(body, token);
		}
		success += 1;
		try {
			await updateFixedStorageSlot(2, slot, item, { imagingTime: startIso, executingTime: startIso });
			// 同步写入平台固存表，按平台槽顺序，名称/时间沿用载荷成像任务
			await updateFixedStorageSlot(3, platformSlot, item, {
				fileName: `${item.name || "成像任务"}`,
				executingTime: startIso,
				imagingTime: startIso,
			});
		} catch (err) {
			console.warn("[one-click-plan] 回填 AS03 固存失败", err);
		}
	}
	ElMessage.success(`AS03 成像任务提交成功 ${success}/${imaging.length}`);
}

async function submitDataTransferTask(
	token: string,
	task: TimelineItem,
	startSeqOverride?: number
): Promise<number | null> {
	const satellite = (task.raw?.satellite || task.raw?.spacecraftCode || form.value?.satellite || "AS02") as
		| "AS02"
		| "AS03";
	const pending = task.raw?.groups ? null : satellite === "AS02" ? await fetchPendingFiles("AS02") : null;
	let groups = (task.raw?.groups as TransferGroup[]) || [];
	if (!groups.length) {
		if (pending) {
			groups = buildTransferGroups(pending || []);
		}
	}
	if (!groups.length || (pending && pending.length < 3)) {
		throw new Error(satellite === "AS03" ? "AS03 数传任务缺少固存文件" : "待数传文件不足或分组失败");
	}
	const t0Iso = toIsoString(task.startTs || task.teleBegin || Date.now());
	const t0Beijing = formatBeijingTime(task.startTs || task.teleBegin || Date.now());
	if (!t0Iso) {
		throw new Error("数传开始时间无效");
	}
	const geo = await resolveAntennaGeoById(task.antennaId, token);
	const startSeq = startSeqOverride ?? (Number(absStartSeq.value) || 3);
	const resetSeq = task.raw?.resetSeq ?? Boolean(reloadTableFlag.value);
	const body = buildTransferBody(satellite, groups, geo, t0Iso, startSeq, resetSeq);
	await postTemplate(body, token, "transfer");
	const consumption = groups.length + 5;
	const lastSeq = startSeq + consumption - 1;

	// 数传回填：依据文件号 -> 固存 -> imagingUid -> 任务记录表
	try {
		const transferUid = generateImagingUid();
		const transferName = resolveTransferStation(task);
		const fileStarts: Array<string | number> = [
			...(Array.isArray(task.files) ? task.files : []),
			...(Array.isArray(task.raw?.files) ? task.raw.files : []),
			...parseStartNosFromMeta(task.meta),
			...parseStartNosFromMeta(task.raw?.meta),
		];
		await syncTransferToTasks(satellite, groups, transferName, t0Iso, transferUid, fileStarts);
	} catch (err) {
		console.warn("[one-click-plan] sync transfer info failed", err);
	}

	// 固存状态：提交成功即标记为“已安排数传”(7)
	try {
		const sat = (task.raw?.satellite || task.raw?.spacecraftCode || form.value?.satellite || "AS02") as
			| "AS02"
			| "AS03";
		const fileText = task.raw?.fileText || task.raw?.filesText || task.raw?.meta || "";
		await updateStorageStatusAfterTransfer(sat, groups, fileText);
	} catch (err) {
		console.warn("[one-click-plan] update storage status after transfer failed", err);
	}

	ElMessage.success("数传任务提交成功");
	return lastSeq;
}

function resolveTransferStation(task: TimelineItem): string {
	const name =
		task?.raw?.station ||
		task?.raw?.stationName ||
		(task?.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(task.antennaId)) : "") ||
		"";
	const trimmed = String(name || "").trim();
	// transferName 字段后端长度为 50，防止超长
	return trimmed ? trimmed.slice(0, 48) : "-";
}

function parseStartNosFromMeta(meta: string | undefined | null): number[] {
	if (!meta) return [];
	const matches = String(meta).match(/\d+/g);
	if (!matches) return [];
	return matches.map((n) => Number(n)).filter((n) => Number.isFinite(n));
}

async function submitDeleteTasks(token: string, baseSeq: number | null) {
	const tasks = timeline.value.filter((item) => item.type === "delete").sort((a, b) => a.startTs - b.startTs);
	if (!tasks.length) return;
	let currentSeq = baseSeq != null ? baseSeq + 1 : Number(absStartSeq.value) || 3; // if transfer existed, start after它; else默认
	for (const task of tasks) {
		const files = task.raw?.startFile ? null : await fetchDeletableFiles("AS02");
		const deleteStart = Number(task.raw?.startFile ?? (files?.[0]?.start));
		const deleteEnd = Number(
			task.raw?.endFile ??
				(files && files.length ? Math.max(...files.map((f) => Number(f.end ?? f.start + 7))) : NaN)
		);
		if (!Number.isFinite(deleteStart) || !Number.isFinite(deleteEnd)) {
			throw new Error("删除文件号异常");
		}
		const startIso = toIsoString(task.startTs ?? Date.now());
		if (!startIso) {
			throw new Error("删除任务开始时间无效");
		}
		const body = buildDeleteBody({ start: deleteStart, end: deleteEnd }, startIso, currentSeq);
		await postTemplate(body, token, "delete");
		const fileCount = Number(task.raw?.count ?? task.deleteFiles?.length ?? 1);
		const consumption = 3 + (Number.isFinite(fileCount) ? fileCount : 1);
		currentSeq += consumption;
	}
	ElMessage.success("固存删除任务提交成功");
}

async function fetchFixedStorageByStartList(starts: number[], names: number[]): Promise<any[]> {
	const api: any = (service as any)?.star?.fixed_storage_table;
	if (!api?.page) return [];
	const uniq = Array.from(new Set(starts.filter((n) => Number.isFinite(n))));
	if (!uniq.length || !names.length) return [];
	const records: any[] = [];
	for (const name of names) {
		for (const start of uniq) {
			try {
				const res = await api.page({ page: 1, size: 5, name, startFileNo: start });
				const list = res?.list || res?.data?.list || [];
				if (Array.isArray(list) && list.length) {
					records.push(...list);
				}
			} catch (err) {
				console.warn("[one-click-plan] fetchFixedStorageByStartList failed", err);
			}
		}
	}
	return records;
}

async function syncTransferToTasks(
	satellite: "AS02" | "AS03",
	groups: Array<TransferGroup>,
	transferName: string,
	transferTimeIso: string,
	transferUid: string,
	fileStarts: Array<string | number> = []
) {
	const svc = satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc?.page || !svc?.update) return;

	// 汇总候选起始号：显式文件列表 + 分组的 start/end + 连续块推导（步长 8，仅限有 count 的场景）
	const startSet = new Set<number>();
	const pushNum = (n: number) => {
		if (Number.isFinite(n)) startSet.add(Number(n));
	};

	fileStarts.forEach((v) => pushNum(Number(v)));
	groups.forEach((g) => {
		pushNum(Number(g.start));
		pushNum(Number(g.end));
		const count = Number((g as any)?.count);
		if (Number.isFinite(count) && count > 1) {
			const step = satellite === "AS03" ? 1 : 8;
			for (let i = 1; i < count; i++) {
				pushNum(Number(g.start) + i * step);
			}
		}
	});

	const names = satellite === "AS02" ? [0] : [2, 3];
	const storageRows = await fetchFixedStorageByStartList(Array.from(startSet), names);

	const uidSet = new Set<string>();
	for (const row of storageRows) {
		const uid =
			row?.imagingUid ||
			row?.imaging_uid ||
			row?.imagingUID ||
			row?.__imagingUid ||
			row?.__imagingUID;
		if (uid != null && uid !== "") {
			uidSet.add(String(uid));
		}
	}

	if (!uidSet.size) {
		console.warn("[one-click-plan] 未在固存记录中找到 imagingUid，跳过数传回填");
		return;
	}

	for (const uid of uidSet) {
		const res = await svc.page({ page: 1, size: 20, imagingUID: uid });
		const list = res?.list || res?.data?.list || [];
		if (!Array.isArray(list) || !list.length) continue;
		for (const item of list) {
			if (!item?.id) continue;
			const records = Array.isArray(item.transferRecords) ? [...item.transferRecords] : [];
			records.push({ name: transferName, time: transferTimeIso, uid: transferUid });
			await svc.update({
				id: item.id,
				transferName,
				transferTime: transferTimeIso,
				transferUID: transferUid,
				transferRecords: records,
			});
		}
	}
}

function openSubmitSummaryDialog() {
	if (!timeline.value.length) {
		ElMessage.warning("请先生成时间轴任务");
		return;
	}
	submissionSummary.value = buildSubmissionSummaryText();
	submissionDialogVisible.value = true;
}

async function submitPlannedTasks() {
	if (!submissionSummary.value) {
		submissionSummary.value = buildSubmissionSummaryText();
	}
	submissionDialogVisible.value = false;
	if (!timeline.value.length) {
		ElMessage.warning("请先生成时间轴任务");
		return;
	}
	const satellite = form.value.satellite as "AS02" | "AS03";
	submitting.value = true;
	try {
		const token = await getToken();
		if (taskSwitches.imaging) {
			await submitImagingTasks(token, satellite);
		}
		let lastSeq: number | null = null;
		if (taskSwitches.transfer) {
			const transfers = timeline.value
				.filter((item) => item.type === "data")
				.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
			for (let i = 0; i < transfers.length; i++) {
				const startSeq = i === 0 ? Number(absStartSeq.value) || 3 : (lastSeq ?? 3) + 1;
				lastSeq = await submitDataTransferTask(token, transfers[i], startSeq);
			}
		}
		if (taskSwitches.delete && satellite === "AS02") {
			await submitDeleteTasks(token, lastSeq);
		}
		await recordImagingUids();
		await recordImagingTasks();
		ElMessage.success("提交成功");
	} catch (err: any) {
		ElMessage.error(err?.message || String(err) || "提交失败");
	} finally {
		submitting.value = false;
	}
}

function buildSubmissionSummaryText(): string {
	const lines: string[] = [];
	const orbitText = orbitElements.value ? JSON.stringify(orbitElements.value) : "";
	const imaging = timeline.value
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => a.startTs - b.startTs);
	if (imaging.length) {
		imaging.forEach((it, idx) => {
			const monthDay = formatMonthDay(it.startTs);
			const priorityText = formatNumberText(it.raw?.priority ?? it.priority, 0);
			const priority = priorityText && priorityText !== "--" ? priorityText : "1";
			const scanMode = "直通"; // AS02 默认直通
			const cameraState = "双相机";
			const lonText = formatNumberText(
				it.raw?.long ?? it.raw?.longitude ?? it.raw?.lon ?? it.raw?.area_lon ?? it.raw?.areaLon,
				4
			);
			const lon = lonText && lonText !== "--" ? lonText : "-";
			const latText = formatNumberText(
				it.raw?.lat ?? it.raw?.latitude ?? it.raw?.area_lat ?? it.raw?.areaLat,
				4
			);
			const lat = latText && latText !== "--" ? latText : "-";
			const cloud = formatPercentText(it.raw?.cloud ?? it.cloud);
			const roll = it.rollText ?? "-";
			const sun = it.solarText ?? "-";
			const startTime = formatDisplay(new Date(it.startTs));
			const slot = it.storageSlot || "-";
			const satellite = String(it.raw?.satellite || form.value.satellite || "").toUpperCase();
			if (satellite === "AS03") {
				const altText = formatNumberText(
					it.raw?.alt ?? it.raw?.altitude ?? it.raw?.area_alt ?? it.raw?.areaAlt ?? 0,
					0
				);
				const alt = altText && altText !== "--" ? altText : "0";
				const tf = formatDisplay(new Date(it.endTs ?? it.startTs));
				const imageKind = "推扫成像";
				const fileRef = slot ? `记录文件号${slot}。` : "记录文件号未知。";
				lines.push(
					`${idx + 1}.上注${monthDay} ${it.name}目标点任务：\n` +
						`${priority}级目标，目标点为\n` +
						`${it.name}，经度${lon}，纬度${lat}，高度${alt}m，云量${cloud}，侧摆角${roll}，\n` +
						`太阳高度角${sun}，${imageKind}成像时间${startTime}~${tf}，${fileRef}\n` +
						`预报星历：${orbitText}\n` +
						`预报方法：姿轨控新方法`
				);
			} else {
				const startNum = Number(slot);
				const fileRange =
					Number.isFinite(startNum) && satellite === "AS02"
						? `${startNum}~${startNum + 7}(${scanMode})`
						: `${slot}`;
				lines.push(
					`${idx + 1}.上注${monthDay} ${it.name}目标点任务：\n` +
						`${priority}级目标 ${scanMode}推扫成像任务，${cameraState}成像，目标点为\n` +
						`${it.name}，经度${lon}，纬度${lat}，云量${cloud}，侧摆角${roll}，\n` +
						`太阳高度角${sun}，成像时间${startTime}，记录文件号${fileRange}。\n` +
						`预报星历：${orbitText}\n` +
						`预报方法：姿轨控新方法`
				);
			}
		});
	}

	const dataTasks = timeline.value.filter((item) => item.type === "data").sort((a, b) => a.startTs - b.startTs);
	if (dataTasks.length) {
		dataTasks.forEach((task) => {
			const time = formatDisplay(new Date(task.startTs));
			const ranges =
				task.raw?.groups?.length
					? task.raw.groups.map((g: any) => `${g.start}-${g.end}`).join("，")
					: task.files?.join(",") || "-";
			const station =
				task.raw?.stationName ||
				task.raw?.station ||
				(task.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(task.antennaId)) : "-") ||
				"-";
			lines.push(
				`${lines.length + 1}.上注数传任务，数传站：${station}，开始下数时间：${time}，数传文件号：载荷${ranges}`
			);
		});
	}

	const deletes = timeline.value.filter((item) => item.type === "delete").sort((a, b) => a.startTs - b.startTs);
	if (deletes.length) {
		deletes.forEach((it) => {
			const time = formatDisplay(new Date(it.startTs));
			const start = it.raw?.startFile ?? "-";
			const end = it.raw?.endFile ?? "-";
			lines.push(
				`${lines.length + 1}.上注载荷固存删除任务，删除文件号${start}~${end}，任务执行时间：${time}`
			);
		});
	}

	if (planningNotes.value.length) {
		lines.push(`提示：\n${planningNotes.value.map((n, idx) => `${idx + 1}) ${n}`).join("\n")}`);
	}

	return lines.join("\n\n");
}

// 生成 imaging UID 并推送
async function recordImagingUids() {
	const svc = form.value.satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc?.page || !svc?.update) return;
	const imaging = timeline.value.filter((it) => it.type !== "data" && it.type !== "delete");
	for (const it of imaging) {
		const uid = ensureImagingUid(it);
		it.raw = it.raw || {};
		it.raw.imagingUid = uid;
	}
	// 逐条更新 task 表
	for (const it of imaging) {
		const uid = it.raw?.imagingUid;
		if (!uid) continue;
		try {
			const res = await svc.page({ page: 1, size: 1, imagingTime: toIsoString(it.startTs) });
			const list = res?.list || res?.data?.list || [];
			const row = list[0];
			if (!row?.id) continue;
			await svc.update({
				id: row.id,
				imagingUID: uid,
			});
		} catch (err) {
			console.warn("[one-click-plan] recordImagingUids failed", err);
		}
	}
}

async function recordImagingTasks() {
	const imaging = timeline.value.filter((it) => it.type !== "data" && it.type !== "delete");
	if (!imaging.length) return;
	const satellite = String(form.value.satellite || "").toUpperCase();
	const svc = satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc) return;

	const tasks = imaging.map((it) => {
		const payload: Record<string, any> = {
			satelliteCode: satellite,
			imagingTarget: it.name || it.raw?.name || "",
			imagingUID:
				it.raw?.imagingUid ||
				it.raw?.imagingUID ||
				it.raw?.imaging_uid ||
				it.raw?.__imagingUid ||
				generateImagingUid(),
			longitude: normalizeDecimal(
				it.raw?.long ?? it.raw?.longitude ?? it.raw?.lon ?? it.raw?.area_lon ?? it.raw?.areaLon,
				0
			),
			latitude: normalizeDecimal(it.raw?.lat ?? it.raw?.latitude ?? it.raw?.area_lat ?? it.raw?.areaLat, 0),
			cloudCoverage: normalizeDecimal(it.raw?.cloud ?? it.cloud, 0),
			sunElevation: normalizeDecimal(it.solarText ?? it.raw?.solarAng ?? it.raw?.solar_angle ?? it.raw?.solarAngle, 0),
			status: 0,
		};
		const imagingSource =
			it.raw?.startAtBeijing ||
			it.raw?.start_at_beijing ||
			it.raw?.t0_beijing ||
			it.raw?.startAt ||
			it.raw?.start_at ||
			it.raw?.t0 ||
			it.startTs;
		if (imagingSource) payload.imagingTime = toIsoString(imagingSource);
		if (orbitElements.value) {
			try {
				payload.orbitElements = orbitElements.value;
			} catch {
				payload.orbitElements = null;
			}
		}
		return payload;
	});

	const normalizedTasks = tasks.map((task) => {
		const payload: Record<string, any> = {
			satelliteCode: task.satelliteCode ?? satellite,
			imagingTarget: task.imagingTarget ?? "",
			imagingUID: task.imagingUID ?? generateImagingUid(),
			longitude: normalizeDecimal(task.longitude, 0),
			latitude: normalizeDecimal(task.latitude, 0),
			cloudCoverage: normalizeDecimal(task.cloudCoverage, 0),
			sunElevation: normalizeDecimal(task.sunElevation, 0),
			status: Number.isFinite(Number(task.status)) ? Number(task.status) : 0,
		};
		if (task.imagingTime) payload.imagingTime = task.imagingTime;
		if (task.ephemerisTime) payload.ephemerisTime = task.ephemerisTime;
		if (task.transferName) payload.transferName = task.transferName;
		if (task.transferTime) payload.transferTime = task.transferTime;
		if (task.transferUID) payload.transferUID = task.transferUID;
		if (task.thumbnailUrl) payload.thumbnailUrl = task.thumbnailUrl;
		if (task.orbitElements) {
			try {
				payload.orbitElements = task.orbitElements;
			} catch {
				payload.orbitElements = null;
			}
		}
		return payload;
	});

	let lastError: any = null;
	const createFromForecast = (svc as any)?.createFromForecast;
	if (typeof createFromForecast === "function") {
		try {
			await createFromForecast({ tasks: normalizedTasks });
			return;
		} catch (err) {
			lastError = err;
			console.warn("[one-click-plan] createFromForecast failed, fallback request", err);
		}
	}
	if (typeof svc?.request === "function") {
		try {
			await svc.request({
				url: "/createFromForecast",
				method: "POST",
				data: { tasks: normalizedTasks },
			});
			return;
		} catch (err) {
			lastError = err;
			console.warn("[one-click-plan] /createFromForecast request failed, fallback add", err);
		}
	}
	if (typeof svc?.add === "function") {
		for (const payload of normalizedTasks) {
			try {
				await svc.add(payload);
			} catch (err) {
				lastError = err;
				console.warn("[one-click-plan] add task failed", err);
			}
		}
		return;
	}
	if (lastError) {
		throw lastError;
	}
}

function generateImagingUid(): string {
	let timestamp = Date.now() - UID_EPOCH;
	if (timestamp === uidLastTimestamp) {
		const maxSeq = Math.pow(2, UID_SEQUENCE_BITS) - 1;
		uidSequence = (uidSequence + 1) & maxSeq;
		if (uidSequence === 0) {
			timestamp = waitNextMillis(timestamp);
		}
	} else {
		uidSequence = 0;
	}
	uidLastTimestamp = timestamp;

	const timestampPart = padBase36(timestamp % UID_TIMESTAMP_MOD, Math.ceil(UID_TIMESTAMP_BITS / 5));
	const machinePart = padBase36(UID_MACHINE_ID, Math.ceil(UID_MACHINE_BITS / 5));
	const pidPart = padBase36(UID_PID, Math.ceil(UID_PID_BITS / 5));
	const seqPart = padBase36(uidSequence, Math.ceil(UID_SEQUENCE_BITS / 5));
	return `${timestampPart}${machinePart}${pidPart}${seqPart}`;
}

function waitNextMillis(current: number): number {
	let ts = Date.now() - UID_EPOCH;
	while (ts <= current) {
		ts = Date.now() - UID_EPOCH;
	}
	return ts;
}

function padBase36(value: number, length: number): string {
	const text = Math.max(0, value).toString(36);
	return text.padStart(length, "0").slice(-length);
}
</script>

<style scoped>
.field-label {
	color: #606266;
	font-size: 16px;
}
.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.card-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}
.meta-fields {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.meta-item {
	display: flex;
	align-items: center;
	gap: 4px;
}
.meta-sep {
	color: #606266;
}
.file-inline {
	flex-direction: row;
	align-items: center;
}
.action-buttons {
	display: flex;
	flex-direction: column;
	gap: 6px;
	align-items: flex-start;
	width: 100%;
}
.action-buttons :deep(.el-button) {
	margin-left: 0;
}
</style>

<style scoped>
.one-click-page {
	padding: 8px 8px 96px; /* 与其他页面一致，给底部留空间 */
	display: flex;
	flex-direction: column;
	gap: 12px;
	box-sizing: border-box;
	min-height: 100vh;      /* 由外层滚动 */
	height: auto;
	overflow: visible;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.plan-range {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.mb16 {
	margin-bottom: 16px;
}

.timeline-chart {
	width: 100%;
	height: 200px;
}

.summary-text {
	white-space: pre-line;
	line-height: 1.6;
}

.summary-card {
	position: relative;
}

:global(.app-main) {
	height: 100vh !important;
	overflow: auto !important;
}

</style>
