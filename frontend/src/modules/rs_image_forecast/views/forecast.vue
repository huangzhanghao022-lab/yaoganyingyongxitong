<template>
  <div class="forecast-page">
    <el-card shadow="never" class="mb16">
      <template #header>
        <div class="card-header">
          <span>成像预报参数</span>
          <el-space>
            <el-button type="primary" @click="generateJson">生成 JSON</el-button>
            <el-button @click="copyJson">复制 JSON</el-button>
          </el-space>
        </div>
      </template>

      <el-form :model="form" label-width="120px" class="forecast-form">
        <el-form-item label="卫星">
          <el-radio-group v-model="form.satellite">
            <el-radio-button label="AS02">AS02</el-radio-button>
            <el-radio-button label="AS03">AS03</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="成像开始时间">
          <el-date-picker
            v-model="form.startAt"
            type="datetime"
            :clearable="true"
            value-format="YYYY-MM-DDTHH:mm"
            placeholder="选择开始时间"
          />
        </el-form-item>

        <el-form-item label="成像结束时间">
          <el-date-picker
            v-model="form.endAt"
            type="datetime"
            :clearable="true"
            value-format="YYYY-MM-DDTHH:mm"
            placeholder="选择结束时间"
          />
        </el-form-item>

        <el-form-item label="成像时长(秒)">
          <el-input-number v-model="form.imageTime" :min="1" :step="1" />
        </el-form-item>
		
		<el-form-item label="成像模式">
            <el-select v-model="draftTarget.push_kind" placeholder="选择模式" style="width: 180px">
              <el-option label="直通(0)" value="0" />
              <el-option label="压缩(1)" value="1" />
            </el-select>
        </el-form-item>


        <el-form-item label="选取方式">
          <el-radio-group v-model="targetPickMode">
            <el-radio label="manual">特定目标点</el-radio>
            <el-radio label="all">全数据库</el-radio>
          </el-radio-group>
          <el-button
            v-if="targetPickMode === 'all'"
            class="ml8"
            plain
            @click="loadAllTargets"
          >加载全库目标</el-button>
        </el-form-item>

        <template v-if="targetPickMode === 'manual'">

            <el-button class="ml8" @click="openDbDialog">从数据库选取</el-button>
        
			<el-form-item label="已选目标">
			<el-table :data="form.targetList" size="small" style="width: 100%" empty-text="暂无目标">
				<el-table-column type="index" label="#" width="60" />
				<el-table-column prop="name" label="名称" min-width="160" />
				<el-table-column prop="long" label="经度" width="120" />
				<el-table-column prop="lat" label="纬度" width="120" />
				<el-table-column prop="alt" label="海拔" width="100" />
				<el-table-column prop="push_kind" label="模式" width="100" />
				<el-table-column prop="priority" label="优先级" width="100" />
				<el-table-column label="操作" width="100">
				<template #default="{ $index }">
					<el-button type="danger" text size="small" @click="removeTarget($index)">移除</el-button>
				</template>
				</el-table-column>
			</el-table>
			</el-form-item>
	    </template>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>JSON 预览</span>
          <el-tag type="info">只读</el-tag>
        </div>
      </template>
      <el-input v-model="jsonPreview" type="textarea" :autosize="{ minRows: 10 }" readonly />
    </el-card>

    <!-- 数据库目标选择对话框 -->
    <el-dialog v-model="dbDialog.visible" title="选择数据库目标点" width="800px">
      <div class="mb16">
        <el-input
          v-model="dbDialog.keyword"
          placeholder="按名称搜索"
          clearable
          style="width: 240px"
          @keyup.enter="fetchDb(1)"
        />
        <el-button class="ml8" type="primary" @click="fetchDb(1)">搜索</el-button>
      </div>
      <el-table
        :data="dbDialog.list"
        v-loading="dbDialog.loading"
        @selection-change="onDbSelectionChange"
        height="400px"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="名称" min-width="220" />
        <el-table-column prop="area_lon" label="经度" width="120" />
        <el-table-column prop="area_lat" label="纬度" width="120" />
        <el-table-column prop="level" label="优先级" width="100" />
      </el-table>
      <div class="mt8" style="display:flex;justify-content:flex-end;">
        <el-pagination
          background
          layout="prev, pager, next, jumper, ->, total"
          :current-page="dbDialog.page"
          :page-size="dbDialog.size"
          :total="dbDialog.total"
          @current-change="(p:number)=>fetchDb(p)"
        />
      </div>
      <template #footer>
        <el-button @click="dbDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmDbSelection">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: "rs-image-forecast-forecast" });

import { reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useCool } from "/@/cool";

const { service } = useCool();

type TargetItem = {
  name: string;
  long: number | undefined;
  lat: number | undefined;
  alt: number | undefined;
  push_kind: "0" | "1" | string;
  priority: "1" | "2" | "3" | string;
};

const form = reactive({
  satellite: "AS02" as "AS02" | "AS03",
  startAt: "" as string | "",
  endAt: "" as string | "",
  imageTime: 10 as number,
  targetList: [] as TargetItem[],
});

const targetPickMode = ref<"manual" | "all">("manual");

const draftTarget = reactive<TargetItem>({
  name: "",
  long: undefined,
  lat: undefined,
  alt: 0,
  push_kind: "0",
  priority: "1",
});

const jsonPreview = ref("");

function mapTargetList(list: TargetItem[]) {
  return list
    .filter((t) =>
      t && t.name && Number.isFinite(Number(t.long)) && Number.isFinite(Number(t.lat))
    )
    .map((t) => ({
      name: t.name,
      long: Number(t.long),
      lat: Number(t.lat),
      alt: Number(t.alt ?? 0),
      push_kind: String(t.push_kind ?? "0"),
      priority: String(t.priority ?? "1"),
    }));
}

async function normalizePayload() {
  let targetList: TargetItem[] = [];
  if (targetPickMode.value === "all") {
    if (!dbAllLoaded.value) {
      await loadAllTargets();
    }
    targetList = dbAllTargets.value.map(poiToTarget);
  } else {
    targetList = form.targetList.slice();
  }
  return {
    satellite: form.satellite,
    startAt: form.startAt || "",
    endAt: form.endAt || "",
    imageTime: String(form.imageTime ?? ""),
    targetList: mapTargetList(targetList),
  };
}

async function generateJson() {
  const payload = await normalizePayload();
  jsonPreview.value = JSON.stringify(payload, null, 2);
}

async function copyJson() {
  if (!jsonPreview.value) generateJson();
  try {
    await navigator.clipboard.writeText(jsonPreview.value);
    ElMessage.success("已复制到剪贴板");
  } catch (e) {
    ElMessage.error("复制失败，请手动选择文本复制");
  }
}

function addTarget() {
  if (!draftTarget.name || draftTarget.long === undefined || draftTarget.lat === undefined) {
    ElMessage.warning("请完善目标的名称、经度与纬度");
    return;
  }
  form.targetList.push({
    name: draftTarget.name.trim(),
    long: Number(draftTarget.long),
    lat: Number(draftTarget.lat),
    alt: Number(draftTarget.alt ?? 0),
    push_kind: String(draftTarget.push_kind),
    priority: String(draftTarget.priority),
  });
  // reset minimal fields
  draftTarget.name = "";
  draftTarget.long = undefined;
  draftTarget.lat = undefined;
  // keep alt/push_kind/priority as defaults for next add
  generateJson();
}

function removeTarget(index: number) {
  form.targetList.splice(index, 1);
  generateJson();
}

async function loadAllTargets() {
  try {
    dbAllTargets.value = await fetchAllPois();
    dbAllLoaded.value = true;
    ElMessage.success(`已加载全库目标 ${dbAllTargets.value.length} 条`);
  } catch (e) {
    ElMessage.error("加载全库目标失败");
  }
}

// 自动刷新预览
watch(
  () => ({ ...form, targetLen: form.targetList.length }),
  () => generateJson(),
  { deep: true }
);

// 初始化一次预览
generateJson();

// ====== 数据库选择逻辑 ======
type Poi = {
  id: number;
  name: string;
  area_lon?: string;
  area_lat?: string;
  level?: number;
};

const dbDialog = reactive({
  visible: false,
  loading: false,
  keyword: "",
  list: [] as Poi[],
  page: 1,
  size: 10,
  total: 0,
  selection: [] as Poi[],
});

const dbAllTargets = ref<Poi[]>([]);
const dbAllLoaded = ref(false);

function openDbDialog() {
  dbDialog.visible = true;
  if (!dbDialog.list.length) fetchDb(1);
}

async function fetchDb(page = 1) {
  dbDialog.loading = true;
  try {
    const api: any = (service as any).rs_poi?.poi;
    const res = await api?.page?.({ page, size: dbDialog.size, keyWord: dbDialog.keyword });
    // cool-admin page 一般返回 { list, pagination: { page, size, total } }
    const list = res?.list || res?.data?.list || [];
    const pg = res?.pagination || res?.data?.pagination || { page, size: dbDialog.size, total: list.length };
    dbDialog.list = list;
    dbDialog.page = pg.page ?? page;
    dbDialog.size = pg.size ?? dbDialog.size;
    dbDialog.total = pg.total ?? list.length;
  } catch (e) {
    ElMessage.error("查询数据库目标失败");
  } finally {
    dbDialog.loading = false;
  }
}

function onDbSelectionChange(rows: Poi[]) {
  dbDialog.selection = rows || [];
}

function poiToTarget(p: Poi): TargetItem {
  const lon = Number(p.area_lon);
  const lat = Number(p.area_lat);
  return {
    name: p.name,
    long: Number.isFinite(lon) ? lon : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    alt: 0,
    push_kind: "0",
    priority: String(p.level ?? 1),
  };
}

function confirmDbSelection() {
  if (!dbDialog.selection.length) {
    ElMessage.warning("请先选择目标点");
    return;
  }
  const targets = dbDialog.selection.map(poiToTarget);
  targets.forEach((t) => form.targetList.push(t));
  dbDialog.visible = false;
  generateJson();
}

async function fetchAllPois(): Promise<Poi[]> {
  const api: any = (service as any).rs_poi?.poi;
  const size = 200;
  let page = 1;
  let total = 0;
  const acc: Poi[] = [];
  while (true) {
    const res = await api?.page?.({ page, size });
    const list = res?.list || res?.data?.list || [];
    const pg = res?.pagination || res?.data?.pagination || { total: list.length };
    acc.push(...list);
    total = pg.total ?? acc.length;
    if (acc.length >= total || list.length === 0) break;
    page += 1;
  }
  return acc;
}
</script>

<style scoped>
.forecast-page {
  padding: 8px;
}
.mb16 {
  margin-bottom: 16px;
}
.ml8 {
  margin-left: 8px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
