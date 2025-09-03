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

        <el-divider content-position="left">目标点选取</el-divider>

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
          <el-form-item label="目标名称">
            <el-input v-model="draftTarget.name" placeholder="例如：唐山港陆钢铁厂" clearable />
          </el-form-item>
          <el-form-item label="经度 long">
            <el-input-number v-model="draftTarget.long" :step="0.000001" :precision="6" :min="-180" :max="180" />
          </el-form-item>
          <el-form-item label="纬度 lat">
            <el-input-number v-model="draftTarget.lat" :step="0.000001" :precision="6" :min="-90" :max="90" />
          </el-form-item>
          <el-form-item label="海拔 alt">
            <el-input-number v-model="draftTarget.alt" :step="1" :precision="0" :min="0" />
          </el-form-item>
          <el-form-item label="成像模式">
            <el-select v-model="draftTarget.push_kind" placeholder="选择模式" style="width: 180px">
              <el-option label="直通(0)" value="0" />
              <el-option label="压缩(1)" value="1" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="draftTarget.priority" placeholder="选择优先级" style="width: 180px">
              <el-option label="1" value="1" />
              <el-option label="2" value="2" />
              <el-option label="3" value="3" />
            </el-select>
            <el-button type="primary" class="ml8" @click="addTarget">添加目标</el-button>
          </el-form-item>
        </template>

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

function normalizePayload() {
  return {
    satellite: form.satellite,
    startAt: form.startAt || "",
    endAt: form.endAt || "",
    imageTime: String(form.imageTime ?? ""),
    targetList: form.targetList.map((t) => ({
      name: t.name,
      long: Number(t.long),
      lat: Number(t.lat),
      alt: Number(t.alt ?? 0),
      push_kind: String(t.push_kind),
      priority: String(t.priority),
    })),
  };
}

function generateJson() {
  const payload = normalizePayload();
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
  // 预留：如后端提供“全库目标点”接口，可在此处调用
  // 例如：const list = await service.rs_image_forecast?.target?.all?.();
  // 这里先给出提示，并不阻塞使用者通过“特定目标点”添加
  ElMessage.info("暂未接入后端全库接口，请先使用特定目标点添加");
}

// 自动刷新预览
watch(
  () => ({ ...form, targetLen: form.targetList.length }),
  () => generateJson(),
  { deep: true }
);

// 初始化一次预览
generateJson();
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
