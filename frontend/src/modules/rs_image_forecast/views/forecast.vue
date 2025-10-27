<template>
  <div class="forecast-page">
    <el-card 
         shadow="never"
         style="min-height: 100px;">
      <template #header>
        <div class="card-header">
          <span>成像预报</span>
          <el-space>
            <el-button type="success" :loading="posting" @click="callForecastApi">进行预报</el-button>
          </el-space>
        </div>
      </template>

      <el-form :model="form" :inline="true" label-width="90px" class="forecast-form">
        <el-form-item label="卫星">
          <el-radio-group v-model="form.satellite">
            <el-radio-button label="AS02">AS02</el-radio-button>
            <el-radio-button label="AS03">AS03</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="开始时间">
          <el-date-picker v-model="form.startAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" :clearable="true" placeholder="选择开始时间" />
        </el-form-item>

        <el-form-item label="结束时间">
          <el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" :clearable="true" placeholder="选择结束时间" />
        </el-form-item>

        <el-form-item label="时长(秒)">
          <el-input-number v-model="form.imageTime" :min="1" :step="1" />
        </el-form-item>

        <el-form-item label="成像模式">
          <el-select v-model="form.pushKind" placeholder="选择模式" style="width: 130px">
            <el-option label="直通" value="0" />
            <el-option label="压缩" value="1" />
            <el-option label="推扫" value="2" />
            <el-option label="凝视" value="3" />
          </el-select>
        </el-form-item>

        <el-form-item label="选取方式" class="pick-item">
            <div class="btn-group-wrap">
              <el-button-group class="pick-group">
                <el-button
                  :type="targetPickMode === 'manual' ? 'primary' : 'default'"
                  @click="setPickMode('manual')"
                >特定目标点</el-button>
                <el-button
                  :type="targetPickMode === 'all' ? 'primary' : 'default'"
                  @click="setPickMode('all')"
                >全数据库</el-button>
              </el-button-group>
            </div>
          </el-form-item>


        <template v-if="targetPickMode === 'manual'">

          <el-form-item label="已选目标点" class="full-row">
            <el-table :data="form.targetList" size="small" style="width: 100%" empty-text="暂无目标">
              <el-table-column type="index" label="#" width="60" />
              <el-table-column prop="name" label="名称" min-width="160" />
              <el-table-column prop="long" label="经度" width="120" />
              <el-table-column prop="lat" label="纬度" width="120" />
              <el-table-column prop="alt" label="海拔" width="100" />
              <el-table-column label="模式" width="100">
                <template #default>
                  {{ form.pushKind === '0' ? '直通' : '压缩' }}
                </template>
              </el-table-column>
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



    <el-card v-if="orbitElements" shadow="never" class="mb16">
      <template #header>
        <div class="card-header">
          <span>星历信息</span>
        </div>
      </template>
      <el-descriptions v-if="orbitElementsRows.length" :column="2" border size="small">
        <el-descriptions-item
          v-for="item in orbitElementsRows"
          :key="item.label"
          :label="item.label"
        >
          {{ item.value }}
        </el-descriptions-item>
      </el-descriptions>
      <div v-else>暂无星历数据</div>
    </el-card>

        <!-- AS02 载荷固存表空文件号提示 -->
        <el-card v-if="form.satellite === 'AS02' && as02EmptyFileNos.length" shadow="never" class="mb16">
      <template #header>
        <div class="card-header">
          <span>AS02 载荷固存表空文件号</span>
          <el-space>
            <el-tag type="info">共 {{ as02EmptyFileNos.length }} 个</el-tag>
            <el-button size="small" @click="copyAs02EmptyFileNos">复制</el-button>
          </el-space>
        </div>
      </template>
      <div style="line-height: 1.8; word-break: break-all;">{{ as02EmptyFileNos.join(', ') }}</div>
    </el-card>


    <el-card v-if="apiResponse" shadow="never" class="mb16">
      <template #header>
        <div class="card-header">
          <span>成像预报结果</span>
          <el-tag type="success">{{ apiResponse?.message || '成功' }}</el-tag>
        </div>
      </template>
      <el-table
        :data="apiResponse?.result || []"
        size="small"
        style="width: 100%"
        :fit="true"     
        class="results-table"
      >
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="satellite" label="卫星" width="60" />
        <el-table-column prop="name" label="目标点名称" min-width="120" show-overflow-tooltip /> <!-- 弹性列之一 -->
        <el-table-column prop="long" label="经度" width="110" />
        <el-table-column prop="lat"  label="纬度" width="110" />
        <el-table-column prop="priority" label="优先级" width="70" />
        <el-table-column prop="cloud" label="云量" width="90" />
        <el-table-column prop="roll_angle" label="侧摆角" width="90" />
        <el-table-column prop="solar_angle" label="太阳高度角" width="110" />
        <el-table-column prop="push_kind" label="模式" width="70" />
        <el-table-column prop="t0_beijing" label="开始时间" min-width="160" show-overflow-tooltip /> <!-- 弹性列之二 -->
        <el-table-column prop="end_beijing" label="结束时间" min-width="160" show-overflow-tooltip />
        <el-table-column label="选择" width="50">
          <template #default="{ $index }">
            <el-checkbox v-model="selectedMap[$index]" />
          </template>
        </el-table-column>

        <!-- AS02 -->
        <el-table-column
          v-if="!isAS03"
          label="起始文件号"
          width="120">
          <template #default="{ $index }">
            <el-input v-model="startFileNoMap[$index]" size="small" placeholder="请输入" />
          </template>
        </el-table-column>

        <!-- AS03：两列，用 v-if 切换，别用 CSS 隐藏 -->
        <el-table-column
          v-if="isAS03"
          :label="startLabel"
          width="120">
          <template #default="{ $index }">
            <el-input v-model="startFileNoMap[$index]" size="small" placeholder="请输入" />
          </template>
        </el-table-column>
        <el-table-column
          v-if="isAS03"
          label="是否重新加载表"
          width="120">
          <template #default="{ $index }">
            <el-select v-model="reloadMap[$index]" size="small" style="width: 100%">
              <el-option label="是" value=true />
              <el-option label="否" value=false />
            </el-select>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt8" style="text-align:right;">
        <el-button type="success" @click="submitSelectedUnified" :loading="creating">生成提交成像信息</el-button>
      </div>
    </el-card>

    <!-- 防止底部内容被裁切的占位 -->
    <!-- 合并按钮：改为统一按钮，按卫星分支提交，单独 AS03 按钮移除 -->
    <div class="bottom-spacer"></div>

    <el-dialog v-model="dbDialog.visible" title="选择数据库目标点" width="820px">
      <div >
        <el-input v-model="dbDialog.keyword" placeholder="按名称搜索" clearable style="width: 240px" @keyup.enter="fetchDb(1)" />
        <el-button class="ml8" type="primary" @click="fetchDb(1)">搜索</el-button>
      </div>
      <el-table :data="dbDialog.list" v-loading="dbDialog.loading" @selection-change="onDbSelectionChange" height="420px">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="名称" min-width="220" />
        <el-table-column prop="area_lon" label="经度" width="120" />
        <el-table-column prop="area_lat" label="纬度" width="120" />
        <el-table-column prop="level" label="优先级" width="100" />
      </el-table>
      <div class="mt8" style="display:flex;justify-content:flex-end;">
        <el-pagination background layout="prev, pager, next, jumper, ->, total" :current-page="dbDialog.page" :page-size="dbDialog.size" :total="dbDialog.total" @current-change="(p:number)=>fetchDb(p)" />
      </div>
      <template #footer>
        <el-button @click="dbDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmDbSelection">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'rs-image-forecast-forecast' });

import { reactive, ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useCool } from '/@/cool';

const { service } = useCool();

type TargetItem = {
  name: string;
  long: number | undefined;
  lat: number | undefined;
  alt: number | undefined;
  push_kind?: '0' | '1' | '2' | '3';
  priority?: '1' | '2' | '3' | string;
};

type OrbitElements = {
  epochTimeUTC?: string;
  a?: number;
  e?: number;
  i?: number;
  dw?: number;
  xw?: number;
  M?: number;
  CD?: number;
};

type OrbitElementsRow = {
  label: string;
  value: string;
};

const form = reactive({
  satellite: '' as '' | 'AS02' | 'AS03',
  startAt: '' as string | '',
  endAt: '' as string | '',
  imageTime: 10 as number,
  pushKind: '0' as '0' | '1' | '2' | '3',
  targetList: [] as TargetItem[],
});

const targetPickMode = ref<'' | 'manual' | 'all'>('');

const jsonPreview = ref('');
const posting = ref(false);
const apiResponse = ref<any | null>(null);
const orbitElements = ref<OrbitElements | null>(null);
// AS02 载荷固存表空文件号
const as02EmptyFileNos = ref<number[]>([]);
const creating = ref(false);

const isAS03 = computed(() => form.satellite === 'AS03');
const startLabel = computed(() => (isAS03.value ? '起始绝对延时指令号' : '起始文件号'));

// 多选与起始号映射
const selectedMap = reactive<Record<number, boolean>>({});
const startFileNoMap = reactive<Record<number, string>>({});
const reloadMap = reactive<Record<number, string>>({}); // 0=是, 1=否，仅 AS03 使用

// 结果变动时清空已选与起始号
watch(
  () => apiResponse.value?.result,
  () => {
    Object.keys(selectedMap).forEach((k) => delete (selectedMap as any)[k]);
    Object.keys(startFileNoMap).forEach((k) => delete (startFileNoMap as any)[k]);
    Object.keys(reloadMap).forEach((k) => delete (reloadMap as any)[k]);
  }
);

const UID_EPOCH = new Date('2025-01-01T00:00:00Z').getTime();
const UID_TIMESTAMP_BITS = 41;
const UID_MACHINE_BITS = 10;
const UID_PID_BITS = 6;
const UID_SEQUENCE_BITS = 7;
const UID_TIMESTAMP_MOD = Math.pow(2, UID_TIMESTAMP_BITS);
const UID_MACHINE_ID = Math.floor(Math.random() * Math.pow(2, UID_MACHINE_BITS));
const UID_PID = Math.floor(Math.random() * Math.pow(2, UID_PID_BITS));
let uidSequence = 0;
let uidLastTimestamp = -1;

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
  return text.padStart(length, '0').slice(-length);
}

const pushKindLabel = computed(() => {
  const m: Record<string, string> = { '0': '直通', '1': '压缩', '2': '推扫', '3': '凝视' };
  return m[form.pushKind] ?? String(form.pushKind ?? '');
});

const orbitElementsRows = computed<OrbitElementsRow[]>(() => {
  if (!orbitElements.value) return [];
  const mapping: Array<{ key: keyof OrbitElements; label: string; type?: 'time' }> = [
    { key: 'epochTimeUTC', label: 'Epoch Time (UTC)', type: 'time' },
    { key: 'a', label: 'Semi-major Axis a (m)' },
    { key: 'e', label: 'Eccentricity e' },
    { key: 'i', label: 'Inclination i (deg)' },
    { key: 'dw', label: 'RAAN (deg)' },
    { key: 'xw', label: 'Argument of Perigee (deg)' },
    { key: 'M', label: 'Mean Anomaly M (deg)' },
    { key: 'CD', label: 'Drag Coefficient CD' },
  ];
  return mapping.map(({ key, label, type }) => {
    const raw = orbitElements.value?.[key];
    const value = type === 'time' ? (raw ? formatDisplayTime(raw) : '-') : formatOrbitNumber(raw);
    return { label, value };
  });
});
function mapTargetList(list: TargetItem[]) {
  return list
    .filter((t) => t && t.name && Number.isFinite(Number(t.long)) && Number.isFinite(Number(t.lat)))
    .map((t) => ({
      name: t.name,
      long: Number(t.long),
      lat: Number(t.lat),
      alt: Number(t.alt ?? 0),
      push_kind: String(form.pushKind ?? '0'),
      priority: String(t.priority ?? '1'),
    }));
}

async function normalizePayload() {
  let targetList: TargetItem[] = [];
  if (targetPickMode.value === 'all') {
    if (!dbAllLoaded.value) await loadAllTargets();
    targetList = dbAllTargets.value.map(poiToTarget);
  } else {
    targetList = form.targetList.slice();
  }
  return {
    satellite: form.satellite,
    startAt: form.startAt || '',
    endAt: form.endAt || '',
    imageTime: String(form.imageTime ?? ''),
    targetList: mapTargetList(targetList),
  };
}

async function generateJson() {
  const payload = await normalizePayload();
  jsonPreview.value = JSON.stringify(payload, null, 2);
}

async function copyJson() {
  if (!jsonPreview.value) await generateJson();
  try {
    await navigator.clipboard.writeText(jsonPreview.value);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败，请手动选择文本复制');
  }
}

function removeTarget(index: number) {
  form.targetList.splice(index, 1);
  generateJson();
}

async function setPickMode(mode: 'manual' | 'all') {
  if (!form.satellite) {
    ElMessage.warning('请先选择卫星');
    targetPickMode.value = '' as any;
    return;
  }
  targetPickMode.value = mode;
  if (mode === 'manual') {
    openDbDialog();
  } else if (mode === 'all') {
    if (!dbAllLoaded.value) {
      await loadAllTargets();
    }
  }
  generateJson();
}

// 数据库选择逻辑
type Poi = { id: number; name: string; area_lon?: string; area_lat?: string; level?: number };

const dbDialog = reactive({
  visible: false,
  loading: false,
  keyword: '',
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
    const sat = (form.satellite || '').toString();
    if (!sat) {
      ElMessage.warning('请先选择卫星');
      dbDialog.list = [];
      dbDialog.total = 0;
      dbDialog.page = 1;
      return;
    }
    // 全量拉取，按卫星过滤，统一排序后再做本地分页
    const all = await fetchAllPois(dbDialog.keyword || '', sat);
    const total = all.length;
    const size = dbDialog.size;
    const start = (page - 1) * size;
    dbDialog.list = all.slice(start, start + size);
    dbDialog.page = page;
    dbDialog.total = total;
  } catch {
    ElMessage.error('查询数据库目标失败');
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
    priority: String(p.level ?? 1),
  };
}

function confirmDbSelection() {
  if (!dbDialog.selection.length) {
    ElMessage.warning('请先选择目标点');
    return;
  }
  const targets = dbDialog.selection.map(poiToTarget);
  // 清空已选，再重新填充
  form.targetList.length = 0;
  targets.forEach((t) => form.targetList.push(t));
  dbDialog.visible = false;
  generateJson();
}

async function fetchAllPois(keyword = '', satFilter = ''): Promise<Poi[]> {
  const api: any = (service as any).rs_poi?.poi;
  const size = 200;
  let page = 1;
  let total = 0;
  const acc: Poi[] = [];
  while (true) {
    const res = await api?.page?.({ page, size, keyWord: keyword });
    const list = res?.list || res?.data?.list || [];
    const pg = res?.pagination || res?.data?.pagination || { total: list.length };
    acc.push(...list);
    total = pg.total ?? acc.length;
    if (acc.length >= total || list.length === 0) break;
    page += 1;
  }
  // 按卫星过滤（后端存 0:AS02, 1:AS03，亦兼容逗号分隔）
  const filtered = satFilter
    ? acc.filter((p: any) => {
        const s = String(p?.satellites ?? '').trim();
        if (!s) return false;
        const tokens = s.split(/[\s,|;]+/).map((x: string) => x.trim());
        const code = /AS03/i.test(satFilter) ? '1' : /AS02/i.test(satFilter) ? '0' : satFilter.replace(/[^01]/g, '');
        return tokens.includes(code);
      })
    : acc;
  // 统一按照优先级升序返回
  return filtered.sort((a: any, b: any) => {
    const la = Number(a?.level);
    const lb = Number(b?.level);
    const va = Number.isFinite(la) ? la : Infinity;
    const vb = Number.isFinite(lb) ? lb : Infinity;
    if (va !== vb) return va - vb;
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
}

async function loadAllTargets() {
  try {
    dbAllTargets.value = await fetchAllPois();
    dbAllLoaded.value = true;
    ElMessage.success(`已加载全库目标 ${dbAllTargets.value.length} 条`);
  } catch {
    ElMessage.error('加载全库目标失败');
  }
}

watch(
  () => ({ ...form, targetLen: form.targetList.length, mode: targetPickMode.value }),
  () => generateJson(),
  { deep: true }
);

generateJson();

// 根据卫星选择设置默认成像时长与成像模式
watch(
  () => form.satellite,
  (sat) => {
    if (sat === 'AS02') {
      form.imageTime = 10;
      form.pushKind = '0'; // 直通
    } else if (sat === 'AS03') {
      form.imageTime = 30;
      form.pushKind = '2'; // 推扫
    }
    generateJson();
  },
  { immediate: true }
);

// 卫星切换后，重置缓存并刷新当前选取方式的数据
watch(
  () => form.satellite,
  async () => {
    orbitElements.value = null;
    dbAllLoaded.value = false;
    dbAllTargets.value = [];
    dbDialog.page = 1;
    dbDialog.total = 0;
    dbDialog.list = [] as any;
    dbDialog.selection = [] as any;
    if (targetPickMode.value === 'all') {
      await loadAllTargets();
    } else if (dbDialog.visible) {
      await fetchDb(1);
    }
  },
  { immediate: false }
);

async function callForecastApi() {
  try {
    posting.value = true;
    orbitElements.value = null;
    const payload = await normalizePayload();
    const res = await fetch('http://172.16.10.86:9025/as_image_forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    apiResponse.value = data;
    orbitElements.value = (await fetchOrbitElementsForSatellite(form.satellite)) || null;
    // 若当前为 AS02，则在获取结果后，额外获取载荷固存表的空文件号
    if (form.satellite === 'AS02') {
      try {
        as02EmptyFileNos.value = await fetchAs02EmptyFileNos();
      } catch (e) {
        console.warn('[forecast] 获取AS02空文件号失败', e);
      }
    } else {
      as02EmptyFileNos.value = [];
    }
    ElMessage.success('接口调用成功');
  } catch (e: any) {
    apiResponse.value = null;
    orbitElements.value = null;
    ElMessage.error(`接口调用失败: ${e?.message || e}`);
  } finally {
    posting.value = false;
  }
}

// 获取 AS02 载荷固存表的空数据文件号（status=0, name=0）
async function fetchAs02EmptyFileNos(): Promise<number[]> {
  const api: any = (service as any)?.star?.fixed_storage_table;
  if (!api?.page) return [];
  const name = 0; // 0: AS02 payload
  const status = 0; // 0: 空
  const size = 200;
  let page = 1;
  let total = 0;
  const acc: number[] = [];
  while (true) {
    const res = await api.page({ page, size, name, status, sort: 'startFileNo', order: 'ASC' });
    const list = res?.list || res?.data?.list || [];
    const pg = res?.pagination || res?.data?.pagination || { total: list.length };
    acc.push(...(list.map((r: any) => Number(r?.startFileNo)).filter((n: any) => Number.isFinite(n))));
    total = pg.total ?? acc.length;
    if (acc.length >= total || list.length === 0) break;
    page += 1;
  }
  return Array.from(new Set(acc)).sort((a, b) => a - b);
}

// ======== 生成提交成像信息（按模板创建）========
function toIsoString(input: any): string {
  if (!input) return '';
  try {
    const s = String(input).replace(' ', 'T');
    return new Date(s).toISOString();
  } catch {
    return '';
  }
}

function formatDisplayTime(value: any): string {
  if (!value) return '-';
  const iso = toIsoString(value);
  if (!iso) {
    return String(value ?? '-');
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return String(value ?? '-');
  }
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const mi = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function formatOrbitNumber(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  const rounded = num.toFixed(6);
  return rounded.replace(/\.?0+$/, '');
}

function toScanModeValue(v: any): string {
  const s = String(v ?? '');
  if (/^[0-3]$/.test(s)) return s;
  const map: Record<string, string> = { '直通': '0', '压缩': '1', '条扫': '2', '汇聚': '3' };
  return map[s] ?? '0';
}

async function getToken(): Promise<string> {
  const res = await fetch('http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/get-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '02ptemplate@yinhe.ht', password: '123456', loginType: 2 }),
  });
  const data = await res.json();
  const token = data?.data?.token;
  if (!token) throw new Error('获取登录 token 失败');
  return token;
}

function getSpacecraftIdBySatellite(satellite: string | undefined): string | null {
  if (!satellite) return null;
  const map: Record<string, string> = {
    AS02: '12',
    AS03: '13',
  };
  return map[satellite] ?? null;
}

async function fetchOrbitElementsForSatellite(satellite: string | undefined): Promise<OrbitElements | null> {
  const spacecraftId = getSpacecraftIdBySatellite(satellite);
  if (!spacecraftId) return null;
  try {
    const token = await getToken();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const body = {
      keyword: '',
      spacecraftIds: [spacecraftId],
      beginTime: now - 7 * dayMs,
      endTime: now + 1 * dayMs,
      page: 1,
      pageSize: 20,
      states: [1, 2],
      order: 6,
    };
    const resp = await fetch('http://ttnonc-webui.cyk3.yhroot.com/v2/api/orbit/keplers/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-web-token': token,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    const result = await resp.json();
    if (result?.code !== 0) {
      console.warn('[forecast] 星历接口返回异常', result);
      return null;
    }
    const list = result?.data?.list;
    if (!Array.isArray(list) || !list.length) return null;
    const elements = list[0]?.orbitElements;
    if (!elements) return null;
    return elements as OrbitElements;
  } catch (err) {
    console.warn('[forecast] 获取星历信息失败', err);
    return null;
  }
}

function getSelectedIdxs(): number[] {
  return Object.keys(selectedMap)
    .filter((k) => (selectedMap as any)[k])
    .map((k) => Number(k))
    .sort((a, b) => a - b);
}

async function createWithTemplate() {
  try {
    const list: any[] = apiResponse.value?.result || [];
    const idxs = getSelectedIdxs();
    if (!idxs.length) {
      ElMessage.warning('请先勾选需要提交的记录');
      return;
    }
    // 校验起始号
  const missing = idxs.filter((i) => !startFileNoMap[i]);
  if (missing.length) {
    ElMessage.warning('请填写选中项的起始文件号');
    return;
  }

  creating.value = true;
  const token = await getToken();

  let ok = 0;
  const tasksToRecord: ForecastTaskPayload[] = [];
  for (const i of idxs) {
    const row: any = list[i] || {};
    const generatedUid = generateImagingUid();
    (row as any).__imagingUid = generatedUid;
    // AS02 提交前将太阳高度角映射为十六进制码
      const sun = Number(row.solar_angle ?? row.solarAng ?? NaN);
      let solarMapped = '';
      if (!Number.isNaN(sun)) {
        if (sun >= 20 && sun < 30) solarMapped = '0x1111';
        else if (sun >= 30 && sun < 40) solarMapped = '0x2222';
        else if (sun >= 40 && sun < 50) solarMapped = '0x3333';
        else if (sun >= 50 && sun < 60) solarMapped = '0x4444';
        else if (sun >= 60 && sun < 70) solarMapped = '0x5555';
      }
      // 扫描模式映射：直通->0x02，压缩->0x01，其它保持原码
      const smNorm = toScanModeValue(row.push_kind ?? form.pushKind);
      const scanModeMapped = smNorm === '0' ? '0x02' : smNorm === '1' ? '0x01' : smNorm;

      const body = {
        spacecraftCode: String(row.satellite || form.satellite || ''),
        templateId: '689d78a65526542523548b0f',
        folderId: '6731752608e123893cf92873',
        name: String(row.name || ''),
        scanMode: scanModeMapped,
        rollAng: String(row.roll_angle ?? ''),
        startAt: toIsoString(row.t0_beijing || row.t0),
        endAt: toIsoString(row.end_beijing || row.tf),
        solarAng: solarMapped || String(row.solar_angle ?? ''),
        fileStart: String(startFileNoMap[i] ?? ''),
      } as any;

      const resp = await fetch('http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/chains/create-with-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-web-token': token,
        },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        ok += 1;
        try {
          await updateAs02FixedStorage(String(body.fileStart || ''), row);
        } catch (e) {
          console.warn('[AS02] 固存表回填失败: ', e);
        }
        tasksToRecord.push(buildTaskRecord(row, 'AS02', generatedUid));
      } else {
        console.warn('[AS02] 模板提交失败', await safeReadText(resp));
      }
    }

    if (tasksToRecord.length) {
      await recordImagingTasks('AS02', tasksToRecord);
    }

    ElMessage.success(`已提交 ${ok}/${idxs.length} 条成像信息`);
  } catch (e: any) {
    ElMessage.error(`提交失败: ${e?.message || e}`);
  } finally {
    creating.value = false;
  }
}

// 复制 AS02 空文件号到剪贴板
async function copyAs02EmptyFileNos() {
  const text = as02EmptyFileNos.value.join(',');
  if (!text) {
    ElMessage.warning('无可复制的文件号');
    return;
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    ElMessage.success('已复制');
  } catch (e) {
    ElMessage.error('复制失败');
  }
}

// 根据起始文件号更新 AS02 载荷固存表（name=0）：回填目标名、成像时间，状态置为待写入(1)
async function updateAs02FixedStorage(fileStart: string, srcRow: any) {
  if (!fileStart) return;
  const api: any = (service as any)?.star?.fixed_storage_table;
  if (!api?.page || !api?.update) return;
  const name = 0; // AS02 payload
  // 先查出对应记录的 id
  const res = await api.page({ page: 1, size: 1, name, startFileNo: Number(fileStart) });
  const row = (res?.list || res?.data?.list || [])[0];
  if (!row?.id) return;
  const id = row.id;
  const targetName = String(srcRow?.name || row?.targetName || '');
  const imagingTime = String(srcRow?.t0_beijing || row?.imagingTime || '');
  const status = 1; // 待写入
  const imagingUid = String(srcRow?.__imagingUid || row?.imagingUid || row?.imaging_uid || '');
  const payload: Record<string, any> = { id, targetName, imagingTime, status };
  if (imagingUid) payload.imagingUid = imagingUid;
  await api.update({ name, data: payload });
}

// AS03 专用：一次性提交三条模板请求
async function createWithTemplateAS03() {
  try {
    const list: any[] = apiResponse.value?.result || [];
    const idxs = getSelectedIdxs();
    if (!idxs.length) {
      ElMessage.warning('请先勾选需要提交的记录');
      return;
    }
    const missing = idxs.filter((i) => !startFileNoMap[i]);
  if (missing.length) {
    ElMessage.warning('请填写选中项的起始绝对延时指令号');
    return;
  }

    creating.value = true;
    const token = await getToken();

    let ok = 0;
    let total = 0;
    const tasksToRecord: ForecastTaskPayload[] = [];

    // 为固存同步准备足量的空槽（AS03 载荷 name=2，status=0），按 startFileNo 升序
    const emptySlots = await fetchAs03EmptySlots(idxs.length);
    let slotPtr = 0;
    for (const i of idxs) {
      const row: any = list[i] || {};
      const sat = String(row.satellite || form.satellite || '');
      if (sat !== 'AS03') continue;
      const generatedUid = generateImagingUid();
      (row as any).__imagingUid = generatedUid;

      const name = String(row.name || '');
      const t0 = toIsoString(row.t0_beijing || row.t0);
      const tf = toIsoString(row.end_beijing || row.tf);
      const baseSeq = Number(startFileNoMap[i] ?? '') || 0;
      const resetSeq = String((reloadMap as any)?.[i] ?? '1');

      const bodies = [
        {
          spacecraftCode: sat,
          templateId: '673c2d9049b1f446adc4623c',
          folderId: '6731755b08e123893cf92878',
          name,
          reset_seq: resetSeq,
          start_seq: String(baseSeq),
          tf,
        },
        {
          spacecraftCode: sat,
          templateId: '673c2d8f49b1f446adc46230',
          folderId: '6731755b08e123893cf92878',
          name,
          t0,
          start_seq: String(baseSeq + 14),
        },
        {
          spacecraftCode: sat,
          templateId: '673c2d9049b1f446adc4623f',
          folderId: '6731755b08e123893cf92878',
          name,
          start_seq: String(baseSeq + 47),
          t0,
          side_swipe_angle: String(row.roll_angle ?? ''),
          tf,
        },
      ];

      let rowSuccess = true;
      for (const body of bodies) {
        total += 1;
        const resp = await fetch('http://ttnonc-webui.cyk3.yhroot.com/v2/api/openapi/chains/create-with-template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-web-token': token,
          },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          ok += 1;
        } else {
          rowSuccess = false;
          console.warn('[AS03] 模板提交失败', await safeReadText(resp));
        }
      }

      if (rowSuccess) {
        const slot = emptySlots[slotPtr++];
        if (slot && slot.id) {
          try {
            await updateAs03FixedStorage(slot.id, row);
          } catch (e) {
            console.warn('[AS03] 固存表回填失败: ', e);
          }
        } else {
          console.warn('[AS03] 固存槽不足，无法回填固存记录');
        }
        tasksToRecord.push(buildTaskRecord(row, 'AS03', generatedUid));
      }
    }

    if (tasksToRecord.length) {
      await recordImagingTasks('AS03', tasksToRecord);
    }

    ElMessage.success(`AS03 已提交 ${ok}/${total} 条请求`);
  } catch (e: any) {
    ElMessage.error(`提交失败: ${e?.message || e}`);
  } finally {
    creating.value = false;
  }
}

// 拉取 AS03 载荷固存表的若干空槽（返回按 startFileNo 升序的记录，包含 id/startFileNo）
async function fetchAs03EmptySlots(expect = 1): Promise<any[]> {
  const api: any = (service as any)?.star?.fixed_storage_table;
  if (!api?.page) return [];
  const name = 2; // AS03 payload
  const status = 0; // 空
  const size = 200;
  let page = 1;
  let acc: any[] = [];
  while (acc.length < expect) {
    const res = await api.page({ page, size, name, status, sort: 'startFileNo', order: 'ASC' });
    const list = res?.list || res?.data?.list || [];
    if (!list.length) break;
    acc.push(...list);
    page += 1;
  }
  // 去重并按 startFileNo 升序
  const seen = new Set<number>();
  acc = acc.filter((r) => {
    const n = Number(r?.startFileNo);
    if (!Number.isFinite(n) || seen.has(n)) return false;
    seen.add(n);
    return true;
  }).sort((a, b) => Number(a.startFileNo) - Number(b.startFileNo));
  return acc.slice(0, expect);
}

// 根据 id 更新 AS03 载荷固存表：回填目标名、成像时间，状态置为待写入(1)
async function updateAs03FixedStorage(id: number, srcRow: any) {
  if (!id) return;
  const api: any = (service as any)?.star?.fixed_storage_table;
  if (!api?.update) return;
  const name = 2;
  const targetName = String(srcRow?.name || '');
  const imagingTime = String(srcRow?.t0_beijing || '');
  const status = 1; // 待写入
  const imagingUid = String(srcRow?.__imagingUid || '');
  const payload: Record<string, any> = { id, targetName, imagingTime, status };
  if (imagingUid) payload.imagingUid = imagingUid;
  await api.update({ name, data: payload });
}

// 统一入口：根据卫星选择 AS02 或 AS03 提交逻辑
async function submitSelectedUnified() {
  const sat = form.satellite || apiResponse.value?.result?.[0]?.satellite || '';
  if (sat === 'AS03') {
    await createWithTemplateAS03();
  } else {
    await createWithTemplate();
  }
}

async function safeReadText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return resp.statusText || 'unknown error';
  }
}

type ForecastTaskPayload = {
  satelliteCode?: string;
  imagingTarget?: string;
  longitude?: number;
  latitude?: number;
  cloudCoverage?: number;
  sunElevation?: number;
  ephemerisTime?: string;
  imagingTime?: string;
  imagingUID?: string;
  transferName?: string;
  transferTime?: string;
  status?: number;
};

function buildTaskRecord(row: any, satellite: string, imagingUid?: string): ForecastTaskPayload {
  const payload: ForecastTaskPayload = {
    satelliteCode: satellite,
  };

  if (row?.name) payload.imagingTarget = String(row.name);

  const lon = Number(row?.long);
  if (Number.isFinite(lon)) payload.longitude = lon;
  const lat = Number(row?.lat);
  if (Number.isFinite(lat)) payload.latitude = lat;
    const cloud = parseCloud(
    row?.cloud ??
    row?.cloud_cover ??
    row?.cloudCover ??
    row?.cloud_pct ??
    row?.cloudPercent ??
    row?.cloud_rate ??
    row?.cloudiness ??
    row?.clouds ??
    row?.cloudCoverage
  );
  if (cloud !== undefined) payload.cloudCoverage = cloud;
  const sun = Number(row?.solar_angle ?? row?.solarAng);
  if (Number.isFinite(sun)) payload.sunElevation = sun;

  const ephemerisSource = row?.ephemeris_time || row?.ephemerisTime || row?.t0;
  if (ephemerisSource) payload.ephemerisTime = toIsoString(ephemerisSource);

  const imagingSource = row?.t0_beijing || row?.t0 || row?.start_at;
  if (imagingSource) payload.imagingTime = toIsoString(imagingSource);

  if (imagingUid) payload.imagingUID = imagingUid;

  const transferName = row?.transfer_name || row?.ground_station || row?.station || row?.transferName;
  if (transferName) payload.transferName = String(transferName);
  const transferTimeSource = row?.transfer_time || row?.transferTime;
  if (transferTimeSource) payload.transferTime = toIsoString(transferTimeSource);


  return payload;
}

async function recordImagingTasks(satellite: string, tasks: ForecastTaskPayload[]) {
  if (!Array.isArray(tasks) || !tasks.length) return;
  try {
    const svc = satellite === 'AS03' ? (service as any)?.task?.as03 : (service as any)?.task?.as02;
    if (!svc?.add) return;
    for (const task of tasks) {
      const payload: Record<string, any> = {
        satelliteCode: task.satelliteCode ?? satellite,
        imagingTarget: task.imagingTarget ?? '',
        imagingUID: task.imagingUID ?? generateImagingUid(),
        longitude: normalizeDecimal(task.longitude, 0),
        latitude: normalizeDecimal(task.latitude, 0),
        cloudCoverage: normalizeDecimal(task.cloudCoverage, 0),
        sunElevation: normalizeDecimal(task.sunElevation, 0),
        status: 0,
      };
      if (task.ephemerisTime) payload.ephemerisTime = task.ephemerisTime;
      if (task.imagingTime) payload.imagingTime = task.imagingTime;
      if (task.transferName) payload.transferName = task.transferName;
      if (task.transferTime) payload.transferTime = task.transferTime;
      await svc.add(payload);
    }
  } catch (err) {
    console.warn('[forecast] 任务记录失败', err);
  }
}

function parseCloud(v: any): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().replace('％', '%'); // 兼容全角％
  if (s.endsWith('%')) {
    const n = Number(s.slice(0, -1));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : undefined;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  // 0~1 视为比例
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  // 其他按 0~100 处理
  return Math.max(0, Math.min(100, Math.round(n)));
}


function normalizeDecimal(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
</script>

<style scoped>
.forecast-page{
  --cmp-h: 32px;          /* 控件目标高度（常用：32/36/40） */
  --cmp-radius: 8px;      /* 统一圆角 */
  --label-w: 90px;        /* el-form 的 label 宽度（和模板一致） */
  --font-size: 15px;      /* 基础字号 */
}
.forecast-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;   /* 同行组件的间距（左右） */
  row-gap: 14px;      /* 上一行到下一行的间距（上下） */
}
.forecast-form :deep(.el-form-item) {
  margin-right: 8px;
  margin-bottom: 8px;
}
.forecast-form :deep(.el-date-editor) {
  width: 200px;
}
.mb16 { margin-bottom: 16px; }
.ml8 { margin-left: 8px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.full-row {
  /* 在 flex 容器中独占一整行 */
  flex: 0 0 100%;
  width: 50%;
}

/* 给内容区一个可控的宽度 */
.pick-item :deep(.btn-group-wrap){
  width: 200px;        /* 想多宽改这里 */
  max-width: 100%;
}

/* 让 group 横向撑满，两个按钮等分 */
.pick-item :deep(.pick-group){
  display: flex;
  width: 100%;
}
.pick-item :deep(.pick-group .el-button){
  flex: 1;
}



/* Ensure page can scroll naturally */
.forecast-page {
  padding: 8px 8px 96px; /* extra bottom space to reveal last row */
  height: 100vh;         /* occupy viewport height */
  overflow-y: auto;      /* enable vertical scrolling */
  box-sizing: border-box;
}

.bottom-spacer {
  height: 120px; /* ensure wheel can reach the very bottom */
}

/* 压缩结果表格的左右间距，减少横向占用 */
.results-table { font-size: 12px; }
.results-table :deep(.el-table__cell),
.results-table :deep(.cell) {
  padding-left: 2px !important;
  padding-right: 2px !important;
  white-space: nowrap;
}



</style>
