<template>
	<div class="one-click-page">
		<el-card shadow="never" class="mb16">
			<template #header>
				<div class="card-header">
					<span>涓€閿鍒掓ā鍧?/span>
					<el-space>
						<el-date-picker
							v-model="form.date"
							type="date"
							:clearable="false"
							placeholder="閫夋嫨鏃ユ湡"
							format="YYYY-MM-DD"
							value-format="x"
							style="width: 160px"
						/>
						<el-select v-model="form.satellite" style="width: 140px">
							<el-option label="AS02" value="AS02" />
							<el-option label="AS03" value="AS03" />
						</el-select>
						<el-button type="primary" :loading="loading" @click="runOneClickPlan">涓€閿鍒?/el-button>
						<el-button
							type="success"
							:loading="submitting"
							:disabled="!timeline.length"
							@click="openSubmitSummaryDialog"
						>
							鎻愪氦瑙勫垝
						</el-button>
					</el-space>
				</div>
			</template>

			<el-space :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-checkbox v-model="taskSwitches.imaging">瑙勫垝鎴愬儚</el-checkbox>
				<el-checkbox v-if="form.satellite === 'AS02'" v-model="taskSwitches.transfer">瑙勫垝鏁颁紶</el-checkbox>
				<el-checkbox v-if="form.satellite === 'AS02'" v-model="taskSwitches.delete">瑙勫垝鍥哄瓨鍒犻櫎</el-checkbox>
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
					<span class="field-label">鎴愬儚寮€濮嬫椂闂达細</span>
					<el-date-picker
						v-model="form.rangeStart"
						type="datetime"
						placeholder="閫夋嫨寮€濮嬫椂闂?
						value-format="x"
						style="width: 200px"
					/>
				</el-space>
				<el-space align="center">
					<span class="field-label">鎴愬儚缁撴潫鏃堕棿锛?/span>
					<el-date-picker
						v-model="form.rangeEnd"
						type="datetime"
						placeholder="閫夋嫨缁撴潫鏃堕棿"
						value-format="x"
						style="width: 200px"
					/>
				</el-space>
			</el-space>
			

			<br />
			<el-space :size="12" style="margin-top: 8px; flex-wrap: wrap;">
				<el-space align="center">
					<span class="field-label">鏄惁閲嶆柊鍔犺浇琛細</span>
					<el-checkbox v-model="reloadTableFlag">閲嶆柊鍔犺浇琛?/el-checkbox>
				</el-space>
				
				<el-space align="center">
					<span class="field-label">缁濆寤舵椂璧峰鍙凤細</span>
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
					<span class="field-label">鎴愬儚浠诲姟鏁伴噺锛?/span>
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
					<span class="field-label">鏁颁紶浠诲姟鏁伴噺锛?/span>
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
					<span class="field-label">浜戦噺涓婇檺(%)锛?/span>
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
					<span class="field-label">渚ф憜瑙掍笂闄?掳)锛?/span>
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
				<span>浠诲姟鎵ц鏃堕棿杞?/span>
				<span class="card-actions" v-if="timeline.length">
					<el-tag type="success" effect="plain">鍏?{{ timeline.length }} 涓?/el-tag>
					<el-space>
						<el-button size="small" type="primary" plain @click="openEditDialog">璋冩暣浠诲姟</el-button>
					</el-space>
				</span>
				</div>
			</template>

		<div v-if="timeline.length" class="timeline-chart" ref="chartRef"></div>
		<el-empty v-else description="鏆傛棤浠诲姟" :image-size="120" />
	</el-card>
	<el-button v-if="submissionSummary" type="primary" plain @click="openSubmitSummaryDialog">鏌ョ湅浠诲姟鎽樿</el-button>
	<el-button v-if="timeline.length" type="info" plain @click="sequenceDialogVisible = true">鏌ョ湅鏃跺簭鍥?/el-button>

	<el-dialog v-model="submissionDialogVisible" title="浠诲姟鎽樿" width="720px" :append-to-body="true">
		<div class="summary-text">{{ submissionSummary }}</div>
		<template #footer>
			<el-space>
				<el-button @click="submissionDialogVisible = false">鍙栨秷</el-button>
				<el-button type="primary" :loading="submitting" @click="submitPlannedTasks">纭鎻愪氦</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="sequenceDialogVisible" title="浠诲姟鏃跺簭" width="760px" :append-to-body="true">
		<el-timeline style="max-height: 480px; overflow: auto;">
			<el-timeline-item
				v-for="item in sequenceItems"
				:key="item.id"
				:timestamp="item.time"
				:type="item.type"
			>
				<div class="seq-title">{{ item.name || "浠诲姟" }}</div>
				<div class="seq-meta">{{ item.meta || "-" }}</div>
			</el-timeline-item>
		</el-timeline>
		<template #footer>
			<el-button type="primary" @click="sequenceDialogVisible = false">鍏抽棴</el-button>
		</template>
	</el-dialog>

	<el-dialog v-model="editDialogVisible" title="璋冩暣浠诲姟" width="820px" :append-to-body="true">
		<el-space style="margin-bottom: 8px;">
			<el-button size="small" type="primary" plain @click="openTransferPickDialog">
				鏂板鏁颁紶浠诲姟
			</el-button>
		</el-space>
		<el-table :data="editableTasks" border height="520px" style="width: 100%;">
			<el-table-column prop="name" label="鍚嶇О" min-width="120">
				<template #default="{ row }">
					<el-input v-model="row.name" />
				</template>
			</el-table-column>
			<el-table-column prop="startTsValue" label="寮€濮嬫椂闂? min-width="180">
				<template #default="{ row }">
					<el-date-picker
						v-model="row.startTsValue"
						type="datetime"
						value-format="x"
						style="width: 180px"
					/>
				</template>
			</el-table-column>
			<el-table-column prop="metaFields" label="鎻忚堪" min-width="260">
				<template #default="{ row }">
					<div class="meta-fields">
						<div v-if="row.type === 'data'" class="meta-item file-inline">
							<span class="meta-sep" style="white-space: nowrap;">鏂囦欢鍙凤細</span>
							<el-input v-model="row.fileInput" placeholder="渚嬪 65,73,81,89" />
						</div>
						<div v-else-if="row.type === 'info'" class="meta-item">
							<span class="meta-sep" style="white-space: nowrap;">璁板綍鏂囦欢鍙凤細</span>
							<el-input v-model="row.storageSlot" placeholder="濡?225" />
						</div>
						<div v-else-if="row.type === 'delete'" class="meta-item file-inline">
							<span class="meta-sep" style="white-space: nowrap;">鍒犻櫎鏂囦欢锛?/span>
							<el-input v-model="row.deleteRange" placeholder="濡?41-72" />
						</div>
					</div>
				</template>
			</el-table-column>
			<el-table-column prop="type" label="绫诲瀷" width="90">
				<template #default="{ row }">
					<el-tag size="small">{{ row.type }}</el-tag>
				</template>
			</el-table-column>
			<el-table-column prop="_deleted" label="鎿嶄綔" width="140">
				<template #default="{ row }">
					<div class="action-buttons">
						<el-button
							v-if="row.type === 'data'"
							size="small"
							type="primary"
							text
							@click="openTransferFilePickDialog(row)"
						>
							閫夋嫨鍥哄瓨鏂囦欢
						</el-button>
						<el-button
							size="small"
							:type="row._deleted ? 'info' : 'danger'"
							text
							@click="toggleDelete(row)"
						>
							{{ row._deleted ? "鎾ら攢" : "鍒犻櫎" }}
						</el-button>
					</div>
				</template>
			</el-table-column>
		</el-table>
		<template #footer>
			<el-space>
				<el-button @click="editDialogVisible = false">鍙栨秷</el-button>
				<el-button type="primary" @click="applyTaskEdits">淇濆瓨</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="transferPickDialog.visible" title="鏂板鏁颁紶浠诲姟" width="720px" :append-to-body="true">
		<el-table :data="transferPickDialog.list" height="360px" style="width: 100%;" v-loading="transferPickDialog.loading">
			<el-table-column label="閫夋嫨" width="70">
				<template #default="{ row }">
					<el-radio v-model="transferPickDialog.selectedKey" :label="transferPickKey(row)">
						<span></span>
					</el-radio>
				</template>
			</el-table-column>
			<el-table-column label="杞ㄦ寮€濮? min-width="160">
				<template #default="{ row }">
					{{ formatDisplay(new Date(row.beginTime)) }}
				</template>
			</el-table-column>
			<el-table-column label="杞ㄦ缁撴潫" min-width="160">
				<template #default="{ row }">
					{{ row.endTime ? formatDisplay(new Date(row.endTime)) : "-" }}
				</template>
			</el-table-column>
			<el-table-column label="澶╃嚎" min-width="120">
				<template #default="{ row }">
					{{ TELECONTROL_ANTENNA_MAP.get(String(row.antennaId ?? "")) || row.antennaId || "-" }}
				</template>
			</el-table-column>
		</el-table>
		<template #footer>
			<el-space>
				<el-button @click="transferPickDialog.visible = false">鍙栨秷</el-button>
				<el-button type="primary" :disabled="!transferPickDialog.selectedKey" @click="confirmAddTransferTask">
					娣诲姞
				</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="transferFilePickDialog.visible" title="閫夋嫨鍥哄瓨鏂囦欢" width="860px" :append-to-body="true">
		<el-alert
			type="info"
			show-icon
			:closable="false"
			style="margin-bottom: 12px"
			description="鑷姩鎸夊綋鍓嶅崼鏄熸媺鍙栬浇鑽蜂笌骞冲彴鍥哄瓨琛ㄧ姸鎬侊紝鏀寔澶氶€?
		/>
		<el-tabs v-model="transferFilePickDialog.activeTab">
			<el-tab-pane label="杞借嵎鍥哄瓨琛? name="payload">
				<el-table
					:data="transferFilePickDialog.payload"
					:border="true"
					:height="360"
					style="width: 100%"
					v-loading="transferFilePickDialog.loading"
					@selection-change="rows => (transferFilePickDialog.selectedPayload = rows)"
				>
					<el-table-column type="selection" width="48" />
					<el-table-column prop="display" label="鐩爣/鏂囦欢" min-width="180" show-overflow-tooltip />
					<el-table-column prop="startFileNo" label="寮€濮嬫枃浠跺彿" width="120" />
					<el-table-column label="鐘舵€? width="120">
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
					<el-table-column label="浠诲姟鎵ц鏃堕棿" min-width="150">
						<template #default="{ row }">
							{{ row.executionTime ? formatDisplay(new Date(row.executionTime)) : "-" }}
						</template>
					</el-table-column>
				</el-table>
			</el-tab-pane>
			<el-tab-pane label="骞冲彴鍥哄瓨琛? name="platform">
				<el-table
					:data="transferFilePickDialog.platform"
					:border="true"
					:height="360"
					style="width: 100%"
					v-loading="transferFilePickDialog.loading"
					@selection-change="rows => (transferFilePickDialog.selectedPlatform = rows)"
				>
					<el-table-column type="selection" width="48" />
					<el-table-column prop="display" label="鐩爣/鏂囦欢" min-width="180" show-overflow-tooltip />
					<el-table-column prop="startFileNo" label="寮€濮嬫枃浠跺彿" width="120" />
					<el-table-column label="鐘舵€? width="120">
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
					<el-table-column label="浠诲姟鎵ц鏃堕棿" min-width="150">
						<template #default="{ row }">
							{{ row.executionTime ? formatDisplay(new Date(row.executionTime)) : "-" }}
						</template>
					</el-table-column>
				</el-table>
			</el-tab-pane>
		</el-tabs>
		<template #footer>
			<el-space>
				<el-tag type="info">杞借嵎宸查€?{{ transferFilePickDialog.selectedPayload.length }} 鏉?/el-tag>
				<el-tag type="info">骞冲彴宸查€?{{ transferFilePickDialog.selectedPlatform.length }} 鏉?/el-tag>
				<el-button
					type="primary"
					:disabled="!transferFilePickDialog.selectedPayload.length && !transferFilePickDialog.selectedPlatform.length"
					@click="confirmTransferFilePick"
				>
					纭
				</el-button>
				<el-button @click="transferFilePickDialog.visible = false">鍏抽棴</el-button>
			</el-space>
		</template>
	</el-dialog>

	<el-dialog v-model="highSelectDialog.visible" title="楂樹紭鍏堢骇鐩爣閫夋嫨" width="880px" :append-to-body="true">
		<el-table :data="highSelectDialog.list" height="420px" style="width: 100%;">
			<el-table-column label="閫夋嫨" width="80">
				<template #default="{ row }">
					<el-checkbox :model-value="highSelectDialog.selected.has(highSelectKey(row))" @change="(val: any) => toggleHighSelectRow(row, Boolean(val))" />
				</template>
			</el-table-column>
			<el-table-column prop="name" label="鍚嶇О" min-width="160" />
			<el-table-column label="寮€濮嬫椂闂? min-width="180">
				<template #default="{ row }">
					{{ formatDisplay(new Date(row.startTs)) }}
				</template>
			</el-table-column>
			<el-table-column prop="cloud" label="浜戦噺(%)" width="90" />
			<el-table-column label="渚ф憜瑙? width="120">
				<template #default="{ row }">
					{{ pickRollAngle(row) }}
				</template>
			</el-table-column>
			<el-table-column prop="priority" label="浼樺厛绾? width="90" />
		</el-table>
		<div style="margin-top:8px; color: var(--el-text-color-regular); font-size: 13px;">
			宸查€夌洰鏍囷細{{ highSelectDialog.list.filter((row) => highSelectDialog.selected.has(highSelectKey(row))).map((row) => row.name || row.targetName || 'Task').join('锛?) || '鏆傛棤' }}
		</div>
		<template #footer>
			<div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
				<span style="color: var(--el-text-color-regular);">宸查€?{{ highSelectedCount }} 涓?/ 鍙€?{{ highSelectDialog.list.length }}</span>
				<el-space>
					<el-button @click="cancelHighPrioritySelect">鍙栨秷</el-button>
					<el-button type="primary" @click="confirmHighPrioritySelect">纭</el-button>
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
const DUTY_ROSTER_URLS = [
	"http://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search",
	"https://ttnonc-webui.cyk3.yhroot.com/v2/api/duty-rotas/search",
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

// 榛樿鏃ユ湡锛氬寳浜椂闂存鏃?00:00
const tomorrow = (() => {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 1);
	return d.getTime();
})();
const defaultStart = (() => {
	const d = new Date();
	d.setHours(13, 0, 0, 0); // 褰撴棩 13:00
	d.setDate(d.getDate() + 1); // 娆℃棩 13:00
	return d.getTime();
})();
const defaultEnd = (() => {
	const d = new Date(defaultStart);
	d.setDate(d.getDate() + 1); // 娆℃鏃?00:00
	d.setHours(13, 0, 0, 0); // 娆℃鏃?13:00
	return d.getTime();
})();
const form = ref({ satellite: "AS02", date: tomorrow, rangeStart: defaultStart, rangeEnd: defaultEnd });
const { service } = useCool();
const loading = ref(false);
const submitting = ref(false);
const timeline = ref<TimelineItem[]>([]);
// 鏃堕棿杞?鏁颁紶/鍒犻櫎浣跨敤椤堕儴鏃ユ湡鐨勫浐瀹氱獥鍙ｏ紙褰撴棩 00:00 ~ 娆℃棩 13:00锛?
const planRange = computed(() => buildDefaultRange(form.value.date));
// 鎴愬儚棰勬姤鍙娇鐢ㄨ嚜瀹氫箟寮€濮?缁撴潫鏃堕棿
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
// 楂樹紭鍏堢骇浜哄伐鎸戦€夊脊绐楃姸鎬?
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

// 鏍规嵁鍗槦鍒囨崲璁剧疆鎴愬儚浠诲姟鏁伴噺榛樿鍊?
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
	const shown = unique.slice(0, 10).join("锛?);
	const more = unique.length > 10 ? ` 绛?${unique.length} 涓猔 : "";
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
	const shown = names.slice(0, 10).join("锛?);
	const more = names.length > 10 ? ` 绛?${names.length} 涓猔 : "";
	const label = isFinal ? "宸茶鍒掔洰鏍? : "褰撳墠宸查€夌洰鏍?;
	planningSelection.value = names.length ? [`${label}锛?{shown}${more}`] : [];
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
	// 浠?form 涓殑鑷畾涔夋椂闂翠负涓伙紝鍚﹀垯鎸夐粯璁よ鍒?
	if (form.value.rangeStart && form.value.rangeEnd) {
		const start = new Date(form.value.rangeStart);
		const end = new Date(form.value.rangeEnd);
		return { start, end };
	}
	return buildDefaultRange(dateValue);
}

function buildDefaultRange(dateValue?: number | Date) {
	const base = dateValue ? new Date(dateValue) : new Date();
	base.setHours(0, 0, 0, 0); // 褰撴棩 0 鐐?
	const start = new Date(base);
	start.setHours(13, 0, 0, 0); // 閫変腑鏃ユ湡 13:00
	const end = new Date(base);
	end.setDate(end.getDate() + 1); // 娆℃棩
	end.setHours(13, 0, 0, 0); // 娆℃棩 13:00
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
			ElMessage.warning("褰撳墠鏃ユ湡鑼冨洿鍐呮湭鎵惧埌杞ㄦ");
		}
	} catch (err) {
		console.warn("[one-click-plan] fetch telecontrol passes failed", err);
		ElMessage.error("鍔犺浇杞ㄦ澶辫触");
	} finally {
		transferPickDialog.loading = false;
	}
}

function confirmAddTransferTask() {
	const chosen = transferPickDialog.list.find((item) => item.key === transferPickDialog.selectedKey);
	if (!chosen) {
		ElMessage.warning("璇烽€夋嫨杞ㄦ");
		return;
	}
	const startTs = chosen.beginTime + 60 * 1000;
	const endTs = Number.isFinite(chosen.endTime ?? NaN) ? Number(chosen.endTime) : startTs;
	const antennaId = chosen.antennaId ? String(chosen.antennaId) : null;
	const hasTransferTask = editableTasks.value.some((t: any) => t.type === "data" && !t._deleted);
	const resetSeq = Boolean(reloadTableFlag.value) && !hasTransferTask;
	const task: TimelineItem = {
		id: `data-${startTs}-${Date.now()}`,
		name: "\u6570\u4f20\u4efb\u52a1",
		type: "data",
		time: formatDisplay(new Date(startTs)),
		meta: "",
		startTs,
		endTs,
		raw: { groups: [], resetSeq, files: [] },
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
	0: "绌?,
	1: "寰呭啓鍏?,
	2: "宸插啓鍏ュ緟鏁颁紶",
	3: "宸叉暟浼犲緟鍙嶆紨",
	4: "瑙ｆ瀽鏈夐棶棰?,
	5: "宸查噸浼犲緟鍙嶆紨",
	6: "宸叉暟浼犲緟鍒犻櫎",
	7: "宸插畨鎺掓暟浼?,
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
	executionTime: string;
	raw: Record<string, any>;
};

function mapStorageRow(item: Record<string, any>): StorageRow {
	const display = item.targetName || item.fileName || item.platformFileName || "-";
	const startFileNo = item.startFileNo ?? item.beginFileNo ?? item.fileNo ?? "-";
	const status = typeof item.status === "number" ? item.status : null;
	const executionTimeRaw =
		item.imagingTime ||
		item.executingTime ||
		item.executeTime ||
		item.taskExecutionTime ||
		item.startTime ||
		"";
	const executionTimeStr = executionTimeRaw ? String(executionTimeRaw) : "";
	const executionTime =
		executionTimeStr && !Number.isNaN(new Date(executionTimeStr).getTime()) ? executionTimeStr : "";
	return {
		id: item.id ?? `${display}-${startFileNo}`,
		display,
		startFileNo: String(startFileNo ?? "-") || "-",
		status,
		statusLabel: status != null ? (storageStatusDict[status] || `鐘舵€?{status}`) : "-",
		executionTime,
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
			ElMessage.warning("璇峰厛閫夋嫨鍗槦");
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
		ElMessage.error("鍔犺浇鍥哄瓨鏂囦欢澶辫触");
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
		ElMessage.warning("璇疯嚦灏戦€夋嫨涓€涓浐瀛樻枃浠?);
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
		const [label, ...rest] = p.split("锛?);
		if (rest.length === 0) {
			const [labelEn, ...restEn] = p.split(":");
			return { label: (labelEn || "").trim(), value: restEn.join(":").trim() };
		}
		return { label: label.trim(), value: rest.join("锛?).trim() };
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
		if (token.startsWith("杞借嵎:")) {
			current = "payload";
			hasTyped = true;
			pushNumbers("payload", token.slice(3));
			continue;
		}
		if (token.startsWith("骞冲彴:")) {
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
		parts.push(`杞借嵎:${payload[0]}`);
		for (let i = 1; i < payload.length; i++) {
			parts.push(String(payload[i]));
		}
	}
	if (platform.length) {
		parts.push(`骞冲彴:${platform[0]}`);
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
			ElMessage.error("閫変腑鐩爣鎴愬儚鏃堕棿缂哄け锛屾棤娉曟牎楠?);
			return;
		}
		for (let i = 1; i < normalized.length; i += 1) {
			const prev = normalized[i - 1];
			const cur = normalized[i];
			if (cur.ts - prev.ts < gapMs) {
				const prevName = prev.item?.name || prev.item?.targetName || "Task";
				const curName = cur.item?.name || cur.item?.targetName || "Task";
				ElMessage.error(
					`鎴愬儚鏃堕棿鍐茬獊锛?{prevName} @${formatDisplay(new Date(prev.ts))} 涓?${curName} @${formatDisplay(
						new Date(cur.ts)
					)} 闂撮殧涓嶈冻`
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
	planningProgress.text = "鍑嗗璧勬簮";
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
				if (r?.__manualHigh) return true; // 浜哄伐鎸戦€夌殑楂樹紭鍏堢骇鏀捐
				const cloudOk = r.cloud == null || r.cloud <= cloudLimitVal;
				if (!cloudOk) return false;
				const rollNum = Number(pickRollAngle(r));
				if (!Number.isFinite(rollNum)) return true;
				return Math.abs(rollNum) <= rollLimitVal;
			});

		
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

		if (!taskSwitches.imaging) {
			let items: TimelineItem[] = [];
			if (dataTasks.length) items = items.concat(dataTasks);
			if (deleteTasks.length) items = items.concat(deleteTasks);
			if (!items.length) {
				throw new Error("鏈敓鎴愬彲鐢ㄤ换鍔?);
			}
			items = items
				.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0))
				.map((it) => ({ ...it, meta: buildMeta(it) }));
			timeline.value = items;
			if (taskSwitches.transfer && form.value.satellite === "AS02") {
				const expected = Math.max(1, Number(transferTaskCount.value) || 1);
				if (dataTasks.length < expected) {
					notes.push(`鏁颁紶浠诲姟鏈熸湜 ${expected} 娆★紝瀹為檯鐢熸垚 ${dataTasks.length} 娆°€俙);
				}
			}
			planningNotes.value = notes;
			ElMessage.success("Plan finished");
			planPreviewText.value = buildSubmissionSummaryText();
			planningProgress.percent = 100;
			planningProgress.status = "success";
			planningProgress.text = "瑙勫垝瀹屾垚";
			return;
		}

		if (taskSwitches.imaging) {
			planningProgress.percent = 20;
			planningProgress.text = "鍔犺浇鐩爣涓庢槦鍘?;

			const targetRes = await fetchAllTargets(form.value.satellite);
			if (!targetRes.targets.length) throw new Error("鏈幏鍙栧埌鐩爣搴撴暟鎹?);
			priorityMap = targetRes.priorityMap;
			const ephemeris = await fetchOrbitElementsForSatellite(form.value.satellite, token);
			orbitElements.value = ephemeris;

			// 棰勫厛璁＄畻鏁颁紶/鍒犻櫎棰勭暀鏃堕棿绐楀彛锛屼緵浣庝紭鍏堢骇绛涢€変娇鐢?
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
			planningProgress.text = "棰勬姤楂樹紭鍏堢骇";

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
			// 棰勬姤楂樹紭鍏堢骇锛屼汉宸ユ寫閫?
			const highRes = await forecast(high);
			const pickedHigh = await openHighPrioritySelect(highRes, imagingExpect);
			pickedHigh.forEach((r) => (r.__manualHigh = true));
			forecastPool.push(...pickedHigh);
			console.log("[one-click-plan] high priority selected", {
				totalForecasted: highRes.length,
				chosen: pickedHigh.map((p) => `${p.name || p.targetName || "Task"} @${formatDisplay(new Date(p.startTs))}`),
			});
			planningProgress.percent = 55;
			planningProgress.text = "楂樹紭鍏堢骇鎸戦€夊畬鎴?;
			updateSelectionPreview(forecastPool);
			let approxPicked = countFeasible();

			// 鑻ユ湭婊¤冻鏁伴噺锛岄鎶ヤ腑浼樺厛绾ц嚜鍔ㄩ€?
			if (approxPicked < imagingExpect && mid.length) {
				planningProgress.text = "棰勬姤涓紭鍏堢骇";
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

			// 鑻ヤ笉瓒筹紝鍒欎綆浼樺厛绾?10 鏉′竴鎵癸紝閫愭壒棰勬姤鐩村埌澶熸垨鑰楀敖
			if (approxPicked < imagingExpect && low.length) {
				planningProgress.text = "浣庝紭鍏堢骇棰勬姤杩涜涓?;
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
					planningProgress.text = `棰勬姤浣庝紭鍏堢骇鎵规 ${batchNo} 瀹屾垚`;
					updateSelectionPreview(forecastPool);
				}
				lowForecasted.ran = true;
				console.log("[one-click-plan] low priority loop end", { totalForecasted: forecastPool.length, approxPicked });
				planningProgress.text = "浣庝紭鍏堢骇棰勬姤瀹屾垚";
			}
		} else {
			orbitElements.value = null;
		}

		let imagingLimit = imagingExpect;

		// 鍥哄瓨鍙敤妲戒綅闄愬埗鎴愬儚鏁伴噺
		if (taskSwitches.imaging) {
			const slotName = form.value.satellite === "AS02" ? 0 : 2;
			try {
				const slots = await fetchEmptySlots(slotName, imagingLimit);
				if (slots.length < imagingLimit) {
					notes.push(`鍥哄瓨鍙敤妲戒綅 ${slots.length} 涓紝灏戜簬鏈熸湜鎴愬儚 ${imagingLimit} 涓紝宸茶嚜鍔ㄧ缉鍑忋€俙);
					imagingLimit = slots.length;
				}
			} catch (err) {
				console.warn("[one-click-plan] fetchEmptySlots for limit failed", err);
			}
		}
		if (imagingLimit <= 0) {
			notes.push("鍥哄瓨鍙敤妲戒綅涓?0锛屾湭鐢熸垚鎴愬儚浠诲姟銆?);
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
				// 鎸夐棿闅斿厛琛屽墧闄や笌楂?涓強棰勭暀绐楀彛鍐茬獊鐨勪綆浼樺厛绾?
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
		// gapMs 宸插湪鍓嶉潰瀹氫箟
		const noonTs = new Date(planRange.value.start);
		noonTs.setHours(12, 0, 0, 0);

			let picked: any[] = [];

		if (taskSwitches.imaging) {
			// 缁熶竴浣跨敤 reserved/gap 瑙勫垯閫夊彇锛屼繚璇侀€変腑鍗虫弧瓒冲叏閮ㄦ潯浠?
			const manualHigh = highMidFiltered.filter((r) => r?.__manualHigh);
			const highFirst = selectWithGap(highMidFiltered, imagingLimit, gapMs, reservedSlots, manualHigh);
			const remain = Math.max(0, imagingLimit - highFirst.length);
			const conflictBases = highFirst.length ? highFirst : highMidFiltered;
			// 浣庝紭鍏堢骇鍙敤浜庤ˉ榻愶紝鍏堝墧闄や笌楂?涓啿绐佺殑鍊欓€夛紙鎸夋垚鍍忛棿闅旓級锛屽啀閫愪釜妫€鏌ラ棿闅?
			const highTsSet = new Set(highFirst.map((x) => x.startTs));
			const rawLowPool = lowFiltered
				.filter((x) => !highTsSet.has(x.startTs))
				.filter((cand) => {
					const ts = Number(cand.startTs);
					if (!Number.isFinite(ts)) return false;
					// 涓庨珮/涓拰棰勭暀绐楀彛鍋氫竴娆″啿绐佹牎楠岋紙鎴愬儚-鎴愬儚/鎴愬儚-鏁颁紶闂撮殧锛?
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
				return okGap(ts, highFirst, reservedSlots, gapMs); // 棰勫厛鐢ㄩ珮/涓牎楠?
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
					if (!okGap(ts, pickedLow, reservedSlots, gapMs)) continue; // 涓庡凡閫変綆涓嶅啿绐?
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

			// 濡傛灉浠嶄笉瓒筹紝杈撳嚭浣庝紭鍏堢骇鍊欓€夌殑闂撮殧璇︽儏锛屼究浜庣‘璁や负浣曟湭琛ヨ冻
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
				`婊¤冻闂撮殧/棰勭暀鏃堕棿鐨勫€欓€変笉瓒筹紙鍙€?${feasible} 涓紝鏈熸湜 ${imagingLimit} 涓級锛屽彲鑳介渶鏀惧闂撮殧鎴栨椂闂寸獥鍙ｃ€俙
			);
		}

			// 鎸夋垚鍍忔椂闂村厛鍚庨噸鏂板垎閰嶅浐瀛樺彿锛堟椂闂存棭鐨勫垎閰嶆洿灏忕殑鍥哄瓨鍙凤級
			reorderStorageSlots(picked);

		// 灞曠ず鏈€缁堥€変腑鐨勭洰鏍囩偣
		updateSelectionPreview(picked, true);
		if (taskSwitches.imaging && picked.length < imagingLimit) {
			notes.push(
				`鎴愬儚浠诲姟鏈熸湜 ${imagingExpect} 涓紙鍙楀浐瀛橀檺鍒跺悗 ${imagingLimit} 涓級锛屽疄闄呯敓鎴?${picked.length} 涓紝鍙兘鍥犱簯閲?闂撮殧/棰勭暀鏃堕棿闄愬埗銆俙
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

		// 棰勮鍥哄瓨妲藉苟涓板瘜灞曠ず淇℃伅
		const imagingItems = items.filter((it) => it.type !== "data" && it.type !== "delete").sort((a, b) => a.startTs - b.startTs);
		if (imagingItems.length) {
			try {
				if (form.value.satellite === "AS02") {
					// AS02 瑙勫垝闃舵浠嶅彲鑷姩鍒嗛厤绌洪棽鍥哄瓨鍙凤紝鏂逛究鎺掓湡锛屼絾涓嶅己鍒舵牎楠岋紱鎻愪氦鏃跺啀鎸変换鍔′笂鐨?storageSlot 鍐欏叆
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
					// AS03 浠嶆寜绌洪棽妲介『搴忛瑙?
					const slots = await fetchEmptySlots(2, imagingItems.length);
					for (let i = 0; i < imagingItems.length; i++) {
						const slot = slots[i];
						if (slot && slot.startFileNo != null) {
							imagingItems[i].storageSlot = String(slot.startFileNo);
						}
					}
				}
			} catch (err) {
				console.warn("[one-click-plan] 棰勮鍥哄瓨妲藉け璐?, err);
				throw err;
			}
		}
		items = items.map((it) => ({ ...it, meta: buildMeta(it) }));
		timeline.value = items;
		// 瑙勫垝鎻愮ず
		if (taskSwitches.transfer && form.value.satellite === "AS02") {
			const expected = Math.max(1, Number(transferTaskCount.value) || 1);
			if (dataTasks.length < expected) {
				notes.push(`鏁颁紶浠诲姟鏈熸湜 ${expected} 娆★紝瀹為檯鐢熸垚 ${dataTasks.length} 娆°€俙);
			}
		}
		planningNotes.value = notes;
		ElMessage.success("Plan finished");
		planPreviewText.value = buildSubmissionSummaryText();
		planningProgress.percent = 100;
		planningProgress.status = "success";
		planningProgress.text = "瑙勫垝瀹屾垚";
	} catch (err: any) {
		ElMessage.error(err?.message || "Plan failed");
		planningProgress.status = "exception";
		planningProgress.text = err?.message || "瑙勫垝澶辫触";
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

	// 鎺掑簭骞惰绠楃浉閭婚棿闅?
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
					d.gapMinutes != null ? `<div style="color:#606266;font-weight:600;">鏃堕棿闂撮殧: ${d.gapMinutes} min</div>` : "";
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
	if (name.includes("鏁颁紶")) return "data";
	return "info";
}

function parseCloudPercent(v: any): number | null {
	if (v == null || v === "") return null;
	const s = String(v).trim().replace("锛?, "%");
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
	if (!token) throw new Error("鑾峰彇鐧诲綍 token 澶辫触");
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
		console.warn("[one-click-plan] 鑾峰彇鏄熷巻澶辫触", err);
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

function buildBeijingRange(date: string) {
	const base = new Date(`${date}T00:00:00+08:00`).getTime();
	const day = 24 * 60 * 60 * 1000;
	return { begin: base, end: base + day };
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
		// 閬嶅巻鍒嗛〉锛岄槻姝㈡帴鍙ｅ彧杩斿洖閮ㄥ垎
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
		const thresholdEvening = new Date(`${dateStr}T17:00:00+08:00`).getTime(); // 鍖椾含 17:00
		const thresholdMorning = new Date(`${dateStr}T08:00:00+08:00`).getTime(); // 鍖椾含 08:00
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

			// 浠呭彇寰呭啓鍏?寰呮暟浼犵姸鎬?2
			const pendingRaw = await fetchPendingFiles("AS02", [2]);
			console.log("[one-click-plan] pending files raw", pendingRaw.map((p) => p.start));
			const pending = pendingRaw.filter((p) => !excludeStarts.has(p.start));
			console.log(
				"[one-click-plan] pending after exclude",
				{ exclude: Array.from(excludeStarts), kept: pending.map((p) => p.start) }
			);
			// 鍗曟鏁颁紶鏈€澶?4 涓枃浠?
			const pendingLimited = pending.slice(0, 4);
			if (pending.length < 3) {
				console.log("[one-click-plan] skip transfer, pending <3");
				notes?.push(
					`鏁颁紶杞ㄦ ${formatDisplay(new Date(startTs))} 璺宠繃锛氬彲鐢ㄦ枃浠舵暟 ${pending.length} < 3锛堢姸鎬?涓旀帓闄ゅ凡鐢ㄥ悗锛塦
				);
				continue;
			}
			const groups = buildTransferGroups(pendingLimited);
			console.log("[one-click-plan] transfer groups", groups);
			const filesText = pendingLimited.length ? `Files: ${pendingLimited.map((p) => p.start).join(", ")}` : "Files: -";
			const antennaId = pass.antennaId ?? (pass as any)?.antenna_id ?? null;
			const resetSeq = tasks.length === 0 ? Boolean(reloadTableFlag.value) : false; // 棣栦釜鎸夊嬀閫夛紝鍏朵綑鍥哄畾 false
			tasks.push({
				id: `data-${startTs}`,
				name: "鏁颁紶浠诲姟",
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
		// 娆℃棩鏃╂櫒绐楀彛锛堥粯璁?07:00 寮€濮嬶紝6h 绐楀彛锛?
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

		// 鎸夎繛缁潡鍒嗙粍锛坰tart + 8 瑙嗕负杩炵画锛?
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
			if (g.length < 4) continue; // 浠呰鍒掕繛缁?4 涓強浠ヤ笂
			const deleteStart = g[0].start;
			const deleteEnd = g[g.length - 1].start + 7;
			const ts = chosen + i * 60 * 60 * 1000; // 闂撮殧 1h
			if (ts > windowEnd) break;
			tasks.push({
				id: `delete-${ts}-${deleteStart}-${deleteEnd}`,
				name: "鍥哄瓨鍒犻櫎浠诲姟",
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
			parts.push(`鏁颁紶鏂囦欢: ${fileText}`);
		} else if (item.files?.length) {
			parts.push(`鏁颁紶鏂囦欢: ${item.files.join(",")}`);
		}
		const formatRange = (g: any) => `${g.start}-${g.end}(${g.duration || g.time || ""}s)`;
		const payloadRanges = groups.filter((g: any) => g?.type !== "platform").map(formatRange).join("锛?);
		const platformRanges = groups.filter((g: any) => g?.type === "platform").map(formatRange).join("锛?);
		if (hasType) {
			if (payloadRanges) parts.push(`杞借嵎鑼冨洿: ${payloadRanges}`);
			if (platformRanges) parts.push(`骞冲彴鑼冨洿: ${platformRanges}`);
		} else if (payloadRanges) {
			parts.push(`鑼冨洿: ${payloadRanges}`);
		}
		if (item.antennaId) {
			const antennaName = TELECONTROL_ANTENNA_MAP.get(String(item.antennaId)) || item.antennaId;
			parts.push(`鏁颁紶绔? ${antennaName}`);
		}
		return parts.join(" | ") || "鏁颁紶浠诲姟";
	}
	if (item.type === "delete") {
		if (item.raw?.startFile != null && item.raw?.endFile != null) {
			parts.push(`鍒犻櫎鏂囦欢: ${item.raw.startFile}-${item.raw.endFile}`);
		} else if (item.deleteFiles?.length) {
			parts.push(`鍒犻櫎鏂囦欢: ${item.deleteFiles.join(",")}`);
		}
		return parts.join(" | ") || "鍥哄瓨鍒犻櫎浠诲姟";
	}
	if (item.cloud != null) parts.push(`浜戦噺: ${item.cloud}%`);
	if (item.priority != null) parts.push(`浼樺厛绾? ${item.priority}`);
	if (item.rollText) parts.push(`渚ф憜瑙? ${item.rollText}`);
	if (item.solarText) parts.push(`澶槼瑙? ${item.solarText}`);
	if (item.storageSlot) parts.push(`璁板綍鏂囦欢鍙? ${item.storageSlot}`);
	return parts.join(" | ") || "浠诲姟";
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

async function recordCommandChainId(
	type: "image" | "transfer" | "delete",
	satellite: string,
	timeValue: string | undefined,
	respData: any
) {
	const ids = respData?.data?.ids || respData?.ids || [];
	const commandChainId = Array.isArray(ids) ? ids[0] : ids;
	if (!commandChainId || !timeValue) return;
	try {
		await request({
			url: `${appConfig.baseUrl}/admin/task_log/task_manage/command_chain`,
			method: "POST",
			data: {
				satellite,
				type,
				time: timeValue,
				commandChainId: String(commandChainId),
			},
			NProgress: false,
		} as any);
	} catch (err) {
		console.warn("[one-click-plan] record commandChainId failed", err);
	}
}

async function postTemplate(
	body: Record<string, any>,
	token: string,
	type: "image" | "transfer" | "delete" = "image",
	timeForLog?: string
) {
	const payload = {
		type,
		satellite: String(body.spacecraftCode || form.value.satellite || ""),
		params: body,
		taskTime:
			timeForLog ||
			body.startAt ||
			body.t0 ||
			body.start_time ||
			body.startTime ||
			body.transmitTime ||
			body.taskExecutionTime ||
			body.imagingTime ||
			body.tf,
	};
	const res = await request({
		url: `${appConfig.baseUrl}/admin/task/command/submit`,
		method: "POST",
		data: payload,
		NProgress: false,
	} as any);
	const result = (res as any)?.data ?? res;
	if (result?.ok === false && Array.isArray(result?.errors)) {
		const msg = result.errors.map((e: any) => `${e.field}: ${e.message}`).join("閿?");
		throw new Error(msg || "閹稿洣鎶ら崣鍌涙殶閺嶏繝鐛?閹绘劒姘︽径杈Е");
	}
	return result?.data ?? result;
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
		if (token.startsWith("杞借嵎:")) {
			current = "payload";
			pushRange("payload", token.slice(3));
			continue;
		}
		if (token.startsWith("骞冲彴:")) {
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
			const msg = result.errors.map((e: any) => `${e.field}: ${e.message}`).join("锛?);
			throw new Error(msg || "鎸囦护鍙傛暟鏍￠獙鏈€氳繃");
		}
	} catch (err: any) {
		throw new Error(err?.message || "鎸囦护鍙傛暟鏍￠獙澶辫触");
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
		throw new Error("鏁颁紶澶╃嚎缂哄皯 antennaId");
	}
	const idStr = String(antennaId);
	const mappedName = TELECONTROL_ANTENNA_MAP.get(idStr);
	if (!mappedName) {
		throw new Error(`鏈壘鍒板ぉ绾?${idStr} 鐨勫悕绉版槧灏刞);
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
		throw new Error(`鏈湪澶╃嚎鍒楄〃涓壘鍒?${mappedName}`);
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
			throw new Error("AS03 鏁颁紶鍒嗙粍鏈€澶氭敮鎸?6 缁?);
		}
		const base: Record<string, any> = {
			spacecraftCode: "AS03",
			templateId: AS03_TRANSFER_TEMPLATE_ID,
			folderId: AS03_TRANSFER_FOLDER_ID,
			name: `${geo?.name || "鏁颁紶"}鏁颁紶浠诲姟-${formatBeijingTime(t0Iso)}`,
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
			base.duration = String(totalDuration + 5);
		}
		return base;
	}

	const base: Record<string, any> = {
		spacecraftCode: "AS02",
		templateId: TRANSFER_TEMPLATE_ID,
		folderId: TRANSFER_FOLDER_ID,
		name: `${geo?.name || "鏁颁紶"}鏁颁紶浠诲姟-${formatBeijingTime(t0Iso)}`,
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

	// 琛ラ綈绌哄瓧娈?
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
		name: `鍥哄瓨鍒犻櫎浠诲姟-${formatBeijingTime(startTimeIso)}`,
		start_file: String(range.start ?? ""),
		end_file: String(range.end ?? ""),
		start_seq: String(startSeq),
		start_time: startTimeIso,
	};
}

async function submitAs03ImagingTask(
	token: string,
	item: TimelineItem,
	slot: any,
	platformSlot: any,
	startSeq: number,
	resetSeq: boolean
): Promise<number> {
	const startIso = toIsoString(item.startTs);
	const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 30 * 1000));
	const imagingUid = ensureImagingUid(item);
	const baseSeq = Number(startSeq) || 3;
	const bodies = [
		{
			spacecraftCode: "AS03",
			templateId: AS03_IMAGING_TEMPLATES[0],
			folderId: AS03_IMAGING_FOLDER,
			name: `1.${item.name || "鎴愬儚浠诲姟"}-鐒﹂潰鏂數-${formatBeijingTime(item.startTs)}`,
			reset_seq: resetSeq,
			start_seq: String(baseSeq),
			tf: endIso,
			fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
		},
		{
			spacecraftCode: "AS03",
			templateId: AS03_IMAGING_TEMPLATES[1],
			folderId: AS03_IMAGING_FOLDER,
			name: `2.${item.name || "鎴愬儚浠诲姟"}-鍒跺喎鏈哄惎鍔?{formatBeijingTime(item.startTs)}`,
			t0: startIso,
			start_seq: String(baseSeq + 14),
			fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
		},
		{
			spacecraftCode: "AS03",
			templateId: AS03_IMAGING_TEMPLATES[2],
			folderId: AS03_IMAGING_FOLDER,
			name: `3.${item.name || "鎴愬儚浠诲姟"}-鎴愬儚搴忓垪+杞Э鎬丟NSS杞瓨-${formatBeijingTime(item.startTs)}`,
			start_seq: String(baseSeq + 47),
			t0: startIso,
			tf: endIso,
			side_swipe_angle: pickRollAngle(item.raw ?? item),
			fileStart: String(slot?.startFileNo ?? slot?.start_file_no ?? ""),
			imagingUid,
		},
	];
	for (const body of bodies) {
		const timeForLog = startIso;
		await postTemplate(body, token, "image", timeForLog);
	}
	try {
		await updateFixedStorageSlot(2, slot, item, { imagingTime: startIso, executingTime: startIso });
		await updateFixedStorageSlot(3, platformSlot, item, {
			fileName: `${item.name || "鎴愬儚浠诲姟"}`,
			executingTime: startIso,
			imagingTime: startIso,
		});
	} catch (err) {
		console.warn("[one-click-plan] 鍥炲～ AS03 鍥哄瓨澶辫触", err);
	}
	return baseSeq + AS03_IMAGING_SEQ_CONSUME - 1;
}

async function submitImagingTasks(token: string, satellite: "AS02" | "AS03") {
	const imaging = timeline.value
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));
	if (!imaging.length) return;

	// 鍏堜负鏈鎴愬儚浠诲姟鐢熸垚骞剁紦瀛?UID锛屼緵鍥哄瓨鍥炲～/浠诲姟钀藉簱/鏁颁紶鍏宠仈澶嶇敤
	imaging.forEach((item) => ensureImagingUid(item));

	if (satellite === "AS02") {
		let slots = await fetchEmptySlots(0, imaging.length);
		if (slots.length < imaging.length) {
			throw new Error(`AS02 鍥哄瓨绌烘Ы涓嶈冻锛岄渶 ${imaging.length} 涓紝鐜版湁 ${slots.length} 涓猔);
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
				// 鑻ュ綋鍓嶇紦瀛樺垪琛ㄦ湭鎵惧埌锛屽疄鏃跺啀鏌ヤ竴娆?
				if (!hit || usedSlot.has(desired)) {
					slots = await fetchEmptySlots(0, Math.max(imaging.length, 100));
					hit = slots.find((s: any) => Number(s?.startFileNo ?? s?.start_file_no) === desired);
				}
				if (!hit || usedSlot.has(desired)) {
					throw new Error(`璁板綍鏂囦欢鍙?${desired} 鏈┖闂叉垨宸茶浣跨敤锛屾棤娉曟彁浜);
				}
				slot = hit;
			}
			const slotNo = Number(slot?.startFileNo ?? slot?.start_file_no);
			if (!Number.isFinite(slotNo)) {
				throw new Error(`鏈壘鍒板彲鐢ㄥ浐瀛樺彿渚涗换鍔?${item.name} 浣跨敤`);
			}
			usedSlot.add(slotNo);
			const startIso = toIsoString(item.startTs);
			const endIso = toIsoString(item.endTs ?? (Number(item.startTs) + 40 * 1000));
			const imagingUid = ensureImagingUid(item);
			const body = {
				spacecraftCode: "AS02",
				templateId: AS02_IMAGING_TEMPLATE,
				folderId: AS02_IMAGING_FOLDER,
				name: `${item.name || "鎴愬儚浠诲姟"}-${formatBeijingTime(item.startTs)}`,
				scanMode: "0x02",
				rollAng: pickRollAngle(item.raw ?? item),
				solarAng: mapSolarAngleCode(pickSolarAngle(item.raw ?? item)),
				startAt: startIso,
				endAt: endIso,
				fileStart: String(slotNo),
				imagingUid,
			};
			await postTemplate(body, token, "image", body.startAt);
			success += 1;
			try {
				await updateFixedStorageSlot(0, slot, item, { imagingTime: startIso, executingTime: startIso });
			} catch (err) {
				console.warn("[one-click-plan] 鍥炲～ AS02 鍥哄瓨澶辫触", err);
			}
		}
		ElMessage.success(`AS02 鎴愬儚浠诲姟鎻愪氦鎴愬姛 ${success}/${imaging.length}`);
		return;
	}

	// AS03
	const slots = await fetchEmptySlots(2, imaging.length);
	const platformSlots = await fetchEmptySlots(3, imaging.length);
	if (slots.length < imaging.length) {
		throw new Error(`AS03 杞借嵎鍥哄瓨绌烘Ы涓嶈冻锛岄渶 ${imaging.length} 涓紝鐜版湁 ${slots.length} 涓猔);
	}
	if (platformSlots.length < imaging.length) {
		throw new Error(`AS03 骞冲彴鍥哄瓨绌烘Ы涓嶈冻锛岄渶 ${imaging.length} 涓紝鐜版湁 ${platformSlots.length} 涓猔);
	}
	let success = 0;
	let currentSeq = Number(absStartSeq.value) || 3;
	let resetSeq = Boolean(reloadTableFlag.value);
	for (let i = 0; i < imaging.length; i++) {
		const item = imaging[i];
		const slot = slots[i];
		const platformSlot = platformSlots[i];
		const lastSeq = await submitAs03ImagingTask(token, item, slot, platformSlot, currentSeq, resetSeq);
		currentSeq = lastSeq + 1;
		resetSeq = false;
		success += 1;
	}
	ElMessage.success(`AS03 鎴愬儚浠诲姟鎻愪氦鎴愬姛 ${success}/${imaging.length}`);
}

async function submitDataTransferTask(
	token: string,
	task: TimelineItem,
	startSeqOverride?: number,
	resetSeqOverride?: boolean
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
		throw new Error(satellite === "AS03" ? "AS03 鏁颁紶浠诲姟缂哄皯鍥哄瓨鏂囦欢" : "寰呮暟浼犳枃浠朵笉瓒虫垨鍒嗙粍澶辫触");
	}
	const t0Iso = toIsoString(task.startTs || task.teleBegin || Date.now());
	const t0Beijing = formatBeijingTime(task.startTs || task.teleBegin || Date.now());
	if (!t0Iso) {
		throw new Error("鏁颁紶寮€濮嬫椂闂存棤鏁?);
	}
	const geo = await resolveAntennaGeoById(task.antennaId, token);
	const startSeqRaw = task.raw?.startSeq ?? task.raw?.start_seq ?? startSeqOverride;
	const startSeq = Number.isFinite(Number(startSeqRaw)) ? Number(startSeqRaw) : Number(absStartSeq.value) || 3;
	const resetSeq =
		resetSeqOverride ?? task.raw?.resetSeq ?? Boolean(reloadTableFlag.value);
	const body = buildTransferBody(satellite, groups, geo, t0Iso, startSeq, resetSeq);
	await postTemplate(body, token, "transfer", t0Iso);
	const consumption = satellite === "AS03" ? groups.length + 5 : groups.length + 2;
	const lastSeq = startSeq + consumption - 1;

	// 鏁颁紶鍥炲～锛氫緷鎹枃浠跺彿 -> 鍥哄瓨 -> imagingUid -> 浠诲姟璁板綍琛?
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

	// 鍥哄瓨鐘舵€侊細鎻愪氦鎴愬姛鍗虫爣璁颁负鈥滃凡瀹夋帓鏁颁紶鈥?7)
	try {
		const sat = (task.raw?.satellite || task.raw?.spacecraftCode || form.value?.satellite || "AS02") as
			| "AS02"
			| "AS03";
		const fileText = task.raw?.fileText || task.raw?.filesText || task.raw?.meta || "";
		await updateStorageStatusAfterTransfer(sat, groups, fileText);
	} catch (err) {
		console.warn("[one-click-plan] update storage status after transfer failed", err);
	}

	ElMessage.success("鏁颁紶浠诲姟鎻愪氦鎴愬姛");
	return lastSeq;
}

function resolveTransferStation(task: TimelineItem): string {
	const name =
		task?.raw?.station ||
		task?.raw?.stationName ||
		(task?.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(task.antennaId)) : "") ||
		"";
	const trimmed = String(name || "").trim();
	// transferName 瀛楁鍚庣闀垮害涓?50锛岄槻姝㈣秴闀?
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
	let currentSeq = baseSeq != null ? baseSeq + 1 : Number(absStartSeq.value) || 3; // if transfer existed, start after瀹? else榛樿
	for (const task of tasks) {
		const files = task.raw?.startFile ? null : await fetchDeletableFiles("AS02");
		const deleteStart = Number(task.raw?.startFile ?? (files?.[0]?.start));
		const deleteEnd = Number(
			task.raw?.endFile ??
				(files && files.length ? Math.max(...files.map((f) => Number(f.end ?? f.start + 7))) : NaN)
		);
		if (!Number.isFinite(deleteStart) || !Number.isFinite(deleteEnd)) {
			throw new Error("鍒犻櫎鏂囦欢鍙峰紓甯?);
		}
		const startIso = toIsoString(task.startTs ?? Date.now());
		if (!startIso) {
			throw new Error("鍒犻櫎浠诲姟寮€濮嬫椂闂存棤鏁?);
		}
		const body = buildDeleteBody({ start: deleteStart, end: deleteEnd }, startIso, currentSeq);
		await postTemplate(body, token, "delete", startIso);
		const fileCount = Number(task.raw?.count ?? task.deleteFiles?.length ?? 1);
		const consumption = 3 + (Number.isFinite(fileCount) ? fileCount : 1);
		currentSeq += consumption;
	}
	ElMessage.success("鍥哄瓨鍒犻櫎浠诲姟鎻愪氦鎴愬姛");
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

	// 姹囨€诲€欓€夎捣濮嬪彿锛氭樉寮忔枃浠跺垪琛?+ 鍒嗙粍鐨?start/end + 杩炵画鍧楁帹瀵硷紙姝ラ暱 8锛屼粎闄愭湁 count 鐨勫満鏅級
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
		console.warn("[one-click-plan] 鏈湪鍥哄瓨璁板綍涓壘鍒?imagingUid锛岃烦杩囨暟浼犲洖濉?);
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
		ElMessage.warning("璇峰厛鐢熸垚鏃堕棿杞翠换鍔?);
		return;
	}
	submissionSummary.value = buildSubmissionSummaryText();
	submissionDialogVisible.value = true;
}

function resolveTaskStartTs(task: TimelineItem): number {
	const applyTs = (ts: number) => {
		if (!Number.isFinite(ts)) return NaN;
		task.startTs = ts;
		return ts;
	};
	const directNum = Number(task.startTs);
	if (Number.isFinite(directNum)) return applyTs(directNum);
	const rawTs = task.raw?.startTs ?? task.raw?.start_ts;
	if (typeof rawTs === "number" && Number.isFinite(rawTs)) return applyTs(rawTs);
	if (typeof rawTs === "string" && rawTs.trim()) {
		const parsed = Date.parse(rawTs.replace(" ", "T"));
		if (Number.isFinite(parsed)) return applyTs(parsed);
	}
	const tele = task.teleBegin ?? task.raw?.teleBegin ?? task.raw?.tele_begin;
	const teleNum = Number(tele);
	if (Number.isFinite(teleNum)) {
		return applyTs(task.type === "data" ? teleNum + 60 * 1000 : teleNum);
	}
	const timeText = task.time ?? task.raw?.time;
	if (timeText) {
		const parsed = Date.parse(String(timeText).replace(" ", "T"));
		if (Number.isFinite(parsed)) return applyTs(parsed);
	}
	return NaN;
}

async function submitPlannedTasks() {
	if (!submissionSummary.value) {
		submissionSummary.value = buildSubmissionSummaryText();
	}
	submissionDialogVisible.value = false;
	if (!timeline.value.length) {
		ElMessage.warning("璇峰厛鐢熸垚鏃堕棿杞翠换鍔?);
		return;
	}
	const satellite = form.value.satellite as "AS02" | "AS03";
	submitting.value = true;
	try {
		const token = await getToken();
		if (satellite === "AS03") {
			const ordered = timeline.value
				.filter((item) => {
					if (item.type === "data") return taskSwitches.transfer;
					if (item.type === "delete") return false;
					return taskSwitches.imaging;
				})
				.slice()
				.sort((a, b) => {
					const aTs = resolveTaskStartTs(a);
					const bTs = resolveTaskStartTs(b);
					return (Number.isFinite(aTs) ? aTs : 0) - (Number.isFinite(bTs) ? bTs : 0);
				});
			const imagingTasks = ordered.filter((item) => item.type !== "data" && item.type !== "delete");
			let slots: any[] = [];
			let platformSlots: any[] = [];
			if (taskSwitches.imaging && imagingTasks.length) {
				slots = await fetchEmptySlots(2, imagingTasks.length);
				platformSlots = await fetchEmptySlots(3, imagingTasks.length);
				if (slots.length < imagingTasks.length) {
					throw new Error(`AS03 杞借嵎鍥哄瓨绌烘Ы涓嶈冻锛岄渶 ${imagingTasks.length} 涓紝鐜版湁 ${slots.length} 涓猔);
				}
				if (platformSlots.length < imagingTasks.length) {
					throw new Error(`AS03 骞冲彴鍥哄瓨绌烘Ы涓嶈冻锛岄渶 ${imagingTasks.length} 涓紝鐜版湁 ${platformSlots.length} 涓猔);
				}
			}
			let imagingIndex = 0;
			let currentSeq = Number(absStartSeq.value) || 3;
			let resetSeq = Boolean(reloadTableFlag.value);
			for (const task of ordered) {
				if (task.type === "data") {
					const startTs = resolveTaskStartTs(task);
					if (!Number.isFinite(startTs)) {
						throw new Error("鏁颁紶浠诲姟寮€濮嬫椂闂存棤鏁?);
					}
					task.raw = { ...(task.raw || {}), resetSeq, startSeq: currentSeq };
					const lastSeq = await submitDataTransferTask(token, task, currentSeq, resetSeq);
					if (lastSeq != null) {
						currentSeq = lastSeq;
					}
					resetSeq = false;
					continue;
				}
				resolveTaskStartTs(task);
				const slot = slots[imagingIndex];
				const platformSlot = platformSlots[imagingIndex];
				imagingIndex += 1;
				const lastSeq = await submitAs03ImagingTask(token, task, slot, platformSlot, currentSeq, resetSeq);
				currentSeq = lastSeq + 1;
				resetSeq = false;
			}
		} else {
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
					const resetSeq = i === 0 ? Boolean(reloadTableFlag.value) : false;
					lastSeq = await submitDataTransferTask(token, transfers[i], startSeq, resetSeq);
				}
			}
			if (taskSwitches.delete && satellite === "AS02") {
				await submitDeleteTasks(token, lastSeq);
			}
		}
		await recordImagingUids();
		await recordImagingTasks();
		try {
			await appendSummaryToDailyPlan(token);
		} catch (err) {
			console.warn("[one-click-plan] append daily plan summary failed", err);
		}
		ElMessage.success("鎻愪氦鎴愬姛");
	} catch (err: any) {
		ElMessage.error(err?.message || String(err) || "鎻愪氦澶辫触");
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
			const scanMode = "鐩撮€?; // AS02 榛樿鐩撮€?
			const cameraState = "鍙岀浉鏈?;
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
				const imageKind = "鎺ㄦ壂鎴愬儚";
				const fileRef = slot ? `璁板綍鏂囦欢鍙?{slot}銆俙 : "璁板綍鏂囦欢鍙锋湭鐭ャ€?;
				lines.push(
					`${idx + 1}.涓婃敞${monthDay} ${it.name}鐩爣鐐逛换鍔★細\n` +
						`${priority}绾х洰鏍囷紝鐩爣鐐逛负\n` +
						`${it.name}锛岀粡搴?{lon}锛岀含搴?{lat}锛岄珮搴?{alt}m锛屼簯閲?{cloud}锛屼晶鎽嗚${roll}锛孿n` +
						`澶槼楂樺害瑙?{sun}锛?{imageKind}鎴愬儚鏃堕棿${startTime}~${tf}锛?{fileRef}\n` +
						`棰勬姤鏄熷巻锛?{orbitText}\n` +
						`棰勬姤鏂规硶锛氬Э杞ㄦ帶鏂版柟娉昤
				);
			} else {
				const startNum = Number(slot);
				const fileRange =
					Number.isFinite(startNum) && satellite === "AS02"
						? `${startNum}~${startNum + 7}(${scanMode})`
						: `${slot}`;
				lines.push(
					`${idx + 1}.涓婃敞${monthDay} ${it.name}鐩爣鐐逛换鍔★細\n` +
						`${priority}绾х洰鏍?${scanMode}鎺ㄦ壂鎴愬儚浠诲姟锛?{cameraState}鎴愬儚锛岀洰鏍囩偣涓篭n` +
						`${it.name}锛岀粡搴?{lon}锛岀含搴?{lat}锛屼簯閲?{cloud}锛屼晶鎽嗚${roll}锛孿n` +
						`澶槼楂樺害瑙?{sun}锛屾垚鍍忔椂闂?{startTime}锛岃褰曟枃浠跺彿${fileRange}銆俓n` +
						`棰勬姤鏄熷巻锛?{orbitText}\n` +
						`棰勬姤鏂规硶锛氬Э杞ㄦ帶鏂版柟娉昤
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
					? task.raw.groups.map((g: any) => `${g.start}-${g.end}`).join("锛?)
					: task.files?.join(",") || "-";
			const station =
				task.raw?.stationName ||
				task.raw?.station ||
				(task.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(task.antennaId)) : "-") ||
				"-";
			lines.push(
				`${lines.length + 1}.涓婃敞鏁颁紶浠诲姟锛屾暟浼犵珯锛?{station}锛屽紑濮嬩笅鏁版椂闂达細${time}锛屾暟浼犳枃浠跺彿锛氳浇鑽?{ranges}`
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
				`${lines.length + 1}.涓婃敞杞借嵎鍥哄瓨鍒犻櫎浠诲姟锛屽垹闄ゆ枃浠跺彿${start}~${end}锛屼换鍔℃墽琛屾椂闂达細${time}`
			);
		});
	}

	if (planningNotes.value.length) {
		lines.push(`鎻愮ず锛歕n${planningNotes.value.map((n, idx) => `${idx + 1}) ${n}`).join("\n")}`);
	}

	return lines.join("\n\n");
}

function buildSubmissionSummaryForTasks(tasks: TimelineItem[], orbitText: string): string {
	const lines: string[] = [];
	const imaging = tasks
		.filter((item) => item.type !== "data" && item.type !== "delete")
		.sort((a, b) => a.startTs - b.startTs);
	if (imaging.length) {
		imaging.forEach((it, idx) => {
			const monthDay = formatMonthDay(it.startTs);
			const priorityText = formatNumberText(it.raw?.priority ?? it.priority, 0);
			const priority = priorityText && priorityText !== "--" ? priorityText : "1";
			const scanMode = "鐩撮€?;
			const cameraState = "鍙岀浉鏈?;
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
				const imageKind = "鎺ㄦ壂鎴愬儚";
				const fileRef = slot ? `璁板綍鏂囦欢鍙?{slot}銆俙 : "璁板綍鏂囦欢鍙锋湭鐭ャ€?;
				lines.push(
					`${idx + 1}.涓婃敞${monthDay} ${it.name}鐩爣鐐逛换鍔★細\n` +
						`${priority}绾х洰鏍囷紝鐩爣鐐逛负\n` +
						`${it.name}锛岀粡搴?{lon}锛岀含搴?{lat}锛岄珮搴?{alt}m锛屼簯閲?{cloud}锛屼晶鎽嗚${roll}锛孿n` +
						`澶槼楂樺害瑙?{sun}锛?{imageKind}鎴愬儚鏃堕棿${startTime}~${tf}锛?{fileRef}\n` +
						`棰勬姤鏄熷巻锛?{orbitText}\n` +
						`棰勬姤鏂规硶锛氬Э杞ㄦ帶鏂版柟娉昤
				);
			} else {
				const startNum = Number(slot);
				const fileRange =
					Number.isFinite(startNum) && satellite === "AS02"
						? `${startNum}~${startNum + 7}(${scanMode})`
						: `${slot}`;
				lines.push(
					`${idx + 1}.涓婃敞${monthDay} ${it.name}鐩爣鐐逛换鍔★細\n` +
						`${priority}绾х洰鏍?${scanMode}鎺ㄦ壂鎴愬儚浠诲姟锛?{cameraState}鎴愬儚锛岀洰鏍囩偣涓篭n` +
						`${it.name}锛岀粡搴?{lon}锛岀含搴?{lat}锛屼簯閲?{cloud}锛屼晶鎽嗚${roll}锛孿n` +
						`澶槼楂樺害瑙?{sun}锛屾垚鍍忔椂闂?{startTime}锛岃褰曟枃浠跺彿${fileRange}銆俓n` +
						`棰勬姤鏄熷巻锛?{orbitText}\n` +
						`棰勬姤鏂规硶锛氬Э杞ㄦ帶鏂版柟娉昤
				);
			}
		});
	}

	const dataTasks = tasks.filter((item) => item.type === "data").sort((a, b) => a.startTs - b.startTs);
	if (dataTasks.length) {
		dataTasks.forEach((task) => {
			const time = formatDisplay(new Date(task.startTs));
			const ranges =
				task.raw?.groups?.length
					? task.raw.groups.map((g: any) => `${g.start}-${g.end}`).join("锛?)
					: task.files?.join(",") || "-";
			const station =
				task.raw?.stationName ||
				task.raw?.station ||
				(task.antennaId ? TELECONTROL_ANTENNA_MAP.get(String(task.antennaId)) : "-") ||
				"-";
			lines.push(
				`${lines.length + 1}.涓婃敞鏁颁紶浠诲姟锛屾暟浼犵珯锛?{station}锛屽紑濮嬩笅鏁版椂闂达細${time}锛屾暟浼犳枃浠跺彿锛氳浇鑽?{ranges}`
			);
		});
	}

	const deletes = tasks.filter((item) => item.type === "delete").sort((a, b) => a.startTs - b.startTs);
	if (deletes.length) {
		deletes.forEach((it) => {
			const time = formatDisplay(new Date(it.startTs));
			const start = it.raw?.startFile ?? "-";
			const end = it.raw?.endFile ?? "-";
			lines.push(
				`${lines.length + 1}.涓婃敞杞借嵎鍥哄瓨鍒犻櫎浠诲姟锛屽垹闄ゆ枃浠跺彿${start}~${end}锛屼换鍔℃墽琛屾椂闂达細${time}`
			);
		});
	}

	return lines.join("\n\n");
}

function taskDateKey(ts: number): string {
	if (!Number.isFinite(ts)) return "";
	return formatDateYMD(new Date(ts));
}

function resolveTransitStart(row: any): number {
	const raw = row?.transitTime ?? row?.transit_time ?? row?.transit_time_text ?? row?.transit_time_texts;
	if (typeof raw === "string") {
		const idx = raw.indexOf("-", 19);
		const startText = idx === -1 ? raw.trim() : raw.slice(0, idx).trim();
		const parsed = Date.parse(startText.replace(" ", "T"));
		if (Number.isFinite(parsed)) return parsed;
	}
	const beginTime = Number(row?.beginTime ?? row?.planBeginTime ?? row?.begin_time);
	return Number.isFinite(beginTime) ? beginTime : 0;
}

function resolveAngleMax(record: any): number | null {
	const raw = record?.tracking?.angleMax?.el ?? record?.angleMax ?? record?.angle_max ?? record?.maxAngle;
	const num = Number(raw);
	return Number.isFinite(num) ? num : null;
}

function buildTransitText(begin: number, end: number | null | undefined): string {
	if (!Number.isFinite(begin)) return "";
	const startText = formatDisplay(new Date(begin));
	if (Number.isFinite(Number(end))) {
		return `${startText}-${formatDisplay(new Date(Number(end)))}`;
	}
	return `${startText}-`;
}

async function ensureDailyPlanByDate(token: string, satellite: "AS02" | "AS03", dateStr: string) {
	const svc = satellite === "AS03" ? (service as any)?.daily_plan?.as03 : (service as any)?.daily_plan?.as02;
	if (!svc?.page) return [];
	const res = await svc.page({ page: 1, size: 200, date: dateStr });
	const list = res?.list || res?.data?.list || [];
	const normalized = Array.isArray(list) ? list : [];
	const dateMatches = normalized.filter((row: any) => normalizeDateOnly(row?.date) === dateStr);
	if (dateMatches.length) {
		return dateMatches;
	}
	const spacecraftId = getSpacecraftIdBySatellite(satellite);
	if (!spacecraftId) return [];
	let records: any[] = [];
	let dutyOfficers: string[] = [];
	try {
		[records, dutyOfficers] = await Promise.all([
			fetchTelecontrolRecords(token, dateStr, spacecraftId),
			fetchDutyRoster(token, dateStr, spacecraftId).catch(() => []),
		]);
	} catch (err) {
		console.warn("[one-click-plan] telecontrol fetch for daily plan failed", err);
		return [];
	}
	if (!records.length) return [];
	const defaultInfo = "1.鍗槦鐘舵€佺洃瑙哱n2.涓嬩紶GNSS鍜屽欢閬?;
	const dutyOfficerRaw = dutyOfficers.length ? dutyOfficers.join("銆?) : "-";
	const dutyOfficer = dutyOfficerRaw.length > 50 ? dutyOfficerRaw.slice(0, 50) : dutyOfficerRaw;
	const payloads = records
		.map((r: any) => {
			const begin = Number(r.beginTime ?? r.planBeginTime ?? r.begin_time ?? r.dataTrans?.beginTime);
			const end = Number(r.endTime ?? r.planEndTime ?? r.end_time ?? r.dataTrans?.endTime);
			const transitTime = buildTransitText(begin, Number.isFinite(end) ? end : null);
			if (!transitTime) return null;
			const antennaId = r.antennaId ?? r.antenna_id;
			const stationRaw =
				(antennaId ? TELECONTROL_ANTENNA_MAP.get(String(antennaId)) : "") ||
				r.stationName ||
				r.antennaName ||
				r.station ||
				"-";
			const station = stationRaw.length > 50 ? stationRaw.slice(0, 50) : stationRaw;
			const elevationAngle = resolveAngleMax(r);
			return {
				date: dateStr,
				dutyOfficer,
				telemetryStation: station === "-" ? "" : station,
				transitTime,
				elevationAngle: elevationAngle == null ? 0 : elevationAngle,
				telemetryInfo: defaultInfo,
			};
		})
		.filter(Boolean);
	if (!payloads.length) return [];
	const results = await Promise.allSettled(payloads.map((item: any) => svc.add(item)));
	const failed = results.filter((r) => r.status === "rejected");
	if (failed.length) {
		console.warn("[one-click-plan] daily plan add failed", failed);
	}
	const refresh = await svc.page({ page: 1, size: 200, date: dateStr });
	const refreshed = refresh?.list || refresh?.data?.list || [];
	const refreshedList = Array.isArray(refreshed) ? refreshed : [];
	const refreshedMatches = refreshedList.filter((row: any) => normalizeDateOnly(row?.date) === dateStr);
	return refreshedMatches;
}

function normalizeDateOnly(value: any): string {
	if (!value) return "";
	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
		const parsed = Date.parse(value.replace(" ", "T"));
		if (Number.isFinite(parsed)) return formatDateYMD(new Date(parsed));
		return value.slice(0, 10);
	}
	if (value instanceof Date) return formatDateYMD(value);
	if (typeof value === "number" && Number.isFinite(value)) return formatDateYMD(new Date(value));
	return "";
}

async function appendSummaryToDailyPlan(token: string) {
	const satellite = form.value.satellite as "AS02" | "AS03";
	const orbitText = orbitElements.value ? JSON.stringify(orbitElements.value) : "";
	const submitted = timeline.value.filter((item) => {
		if (item.type === "data") return taskSwitches.transfer;
		if (item.type === "delete") return taskSwitches.delete;
		return taskSwitches.imaging;
	});
	const tasksByDate = new Map<string, TimelineItem[]>();
	for (const item of submitted) {
		const ts = resolveTaskStartTs(item);
		if (!Number.isFinite(ts)) continue;
		const key = taskDateKey(ts);
		if (!key) continue;
		if (!tasksByDate.has(key)) tasksByDate.set(key, []);
		tasksByDate.get(key)!.push({ ...item, startTs: ts });
	}
	if (!tasksByDate.size) return;
	for (const [dateStr, items] of tasksByDate.entries()) {
		const summary = buildSubmissionSummaryForTasks(items, orbitText);
		if (!summary.trim()) continue;
		let list: any[] = [];
		try {
			list = await ensureDailyPlanByDate(token, satellite, dateStr);
		} catch (err) {
			console.warn("[one-click-plan] ensure daily plan failed", err);
			continue;
		}
		if (!Array.isArray(list) || !list.length) continue;
		const first = list
			.slice()
			.sort((a, b) => resolveTransitStart(a) - resolveTransitStart(b))[0];
		if (!first?.id) continue;
		const exist = typeof first.telemetryInfo === "string" ? first.telemetryInfo.trim() : "";
		if (exist && exist.includes(summary)) {
			continue;
		}
		const updated = exist ? `${exist}\n${summary}` : summary;
		const svc = satellite === "AS03" ? (service as any)?.daily_plan?.as03 : (service as any)?.daily_plan?.as02;
		if (!svc?.update) continue;
		try {
			await svc.update({ id: first.id, telemetryInfo: updated });
		} catch (err) {
			console.warn("[one-click-plan] daily plan update failed", err);
		}
	}
}

// 鐢熸垚 imaging UID 骞舵帹閫?
async function recordImagingUids() {
	const svc = form.value.satellite === "AS03" ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
	if (!svc?.page || !svc?.update) return;
	const imaging = timeline.value.filter((it) => it.type !== "data" && it.type !== "delete");
	for (const it of imaging) {
		const uid = ensureImagingUid(it);
		it.raw = it.raw || {};
		it.raw.imagingUid = uid;
	}
	// 閫愭潯鏇存柊 task 琛?
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
	padding: 8px 8px 96px; /* 涓庡叾浠栭〉闈竴鑷达紝缁欏簳閮ㄧ暀绌洪棿 */
	display: flex;
	flex-direction: column;
	gap: 12px;
	box-sizing: border-box;
	min-height: 100vh;      /* 鐢卞灞傛粴鍔?*/
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

