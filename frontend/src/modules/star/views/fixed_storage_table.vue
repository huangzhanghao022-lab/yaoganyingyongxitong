<template>
	<cl-crud ref="Crud">
	  <cl-row>
		<!-- 表切换 -->
		<el-radio-group
		  v-model="currentName"
		  size="small"
		  @change="refresh"
		  style="margin-left: 10px"
		>
		  <el-radio-button
			v-for="item in options.name"
			:key="item.value"
			:label="item.value"
		  >
			{{ item.label }}
		  </el-radio-button>
		</el-radio-group>
  
		<cl-flex1 />
  
		<!-- 工具 -->
		<cl-refresh-btn />
		<!--cl-add-btn /-->
  
		<!-- 批量编辑按钮 -->
		<el-button
		  type="success"
		  size="default"
		  :disabled="!selection.length"
		  @click="openBatchEdit"
		  style="margin-left: 2px"
		>
		  批量编辑
		</el-button>

		<el-button type="primary" plain size="default" @click="openHistory" style="margin-left: 6px">
			<el-icon style="margin-right: 4px"><document /></el-icon>
			查看历史记录
		</el-button>
		<history-dialog ref="historyDialogRef" />

	  </cl-row>
  
	  <cl-row>
		<cl-table ref="Table" @selection-change="onSelectionChange" />
	  </cl-row>
  
	  <cl-row>
		<cl-flex1 />
		<cl-pagination />
	  </cl-row>
  
	  <cl-upsert ref="Upsert" />
  
	  <!-- 批量编辑对话框 -->
	  <el-dialog
		v-model="batchVisible"
		title="批量编辑"
		width="420px"
		:close-on-click-modal="false"
	  >
		<el-form label-width="96px">
		  <el-form-item label="选中行数">
			<el-tag>{{ selection.length }}</el-tag>
		  </el-form-item>
  
		  <!-- 提示：当状态为“空”时会自动清空目标名称与成像时间 -->
		  <el-alert
			show-icon
			type="info"
			style="margin-bottom: 8px"
			:closable="false"
			description="当状态选择为【空】时，将同时清空所选数据的【目标名称】与【成像时间】。"
		  />
  
		  <el-form-item label="状态">
			<el-radio-group v-model="batchForm.status">
			  <el-radio
				v-for="opt in options.status"
				:key="opt.value"
				:label="opt.value"
			  >
				{{ opt.label }}
			  </el-radio>
			</el-radio-group>
		  </el-form-item>
		</el-form>
  
		<template #footer>
		  <el-button @click="batchVisible = false">取消</el-button>
		  <el-button type="primary" :loading="batchLoading" @click="submitBatch">
			提交
		  </el-button>
		</template>
	  </el-dialog>
	</cl-crud>
  </template>
  
  <script lang="ts" setup>
  defineOptions({
	name: "star-fixed-storage-table",
  });
  
  import { ElMessage } from 'element-plus'
  import { useCrud, useTable, useUpsert } from "@cool-vue/crud";
  import { useCool } from "/@/cool";
  import { useI18n } from "vue-i18n";
  import { reactive, ref, computed } from "vue";
  import { Document } from '@element-plus/icons-vue';
  import HistoryDialog from './historyDialog.vue';
  import dayjs from "dayjs";
  import customParseFormat from "dayjs/plugin/customParseFormat";
  dayjs.extend(customParseFormat);
  
  const { service } = useCool();
  const { t } = useI18n();
  const lastRawInput = ref("");
  const historyDialogRef = ref<{ open: (params?: Record<string, any>) => void } | null>(null);
  
  /** 当前选中的表（0~3） */
  const currentName = ref(0);
  
  /** 根据 currentName 动态控制显示/标题 */
  const startFileNoLabel = computed(() =>
	currentName.value === 0 ? t("起始文件号") : t("文件号")
  );
  const endFileNoHidden = computed(() => currentName.value !== 0);
  
  /** 字典 */
  const options = reactive({
	name: [
	  { label: t("AS02载荷固存表"), value: 0 },
	  { label: t("AS02平台固存表"), value: 1 },
	  { label: t("AS03载荷固存表"), value: 2 },
	  { label: t("AS03平台固存表"), value: 3 },
	],
	status: [
	  { label: t("空"), value: 0, type: "info" },
	  { label: t("待写入"), value: 1, type: "primary" },
	  { label: t("已写入待数传"), value: 2, type: "warning" },
	  { label: t("已数传待反馈"), value: 3, color: "#f78fb3" },
	  { label: t("解析有问题"), value: 4, type: "danger" },
	  { label: t("已重传待反馈"), value: 5, type: "danger" },
	  { label: t("已数传待删除"), value: 6, type: "success" },
	],
  });
  
  /** Upsert（新增/编辑） */
  const Upsert = useUpsert({
	items: [
	  {
		label: t("名称"),
		prop: "name",
		component: { name: "el-radio-group", options: options.name },
		required: true,
		onLoad({ type, item }) {
		  if (type === "update") {
			item.component.props = { ...(item.component.props || {}), disabled: true };
		  }
		},
	  },
	  {
		label: t("编号"),
		prop: "code",
		component: { name: "el-input", props: { clearable: true } },
		span: 12,
		required: true,
	  },
	  {
		label: t("目标名称"),
		prop: "targetName",
		component: { name: "el-input", props: { clearable: true } },
		span: 12,
	  },
	  {
		label: t("成像时间"),
		prop: "imagingTime",
		component: {
			name: "el-input",
			props: {
			placeholder: "请输入时间，如 2025/8/25 22:03:17",
			clearable: true
			},
			on: {
			blur: (e: FocusEvent) => {
				const input = (e.target as HTMLInputElement)?.value?.trim();
				if (!input) return;

				const parsed = dayjs(input, [
				"YYYY-MM-DD HH:mm:ss",
				"YYYY/M/D H:mm:ss",
				"YYYY/M/D HH:mm:ss",
				"YYYY-MM-DDTHH:mm:ss",
				]);

				if (parsed.isValid()) {
				const result = parsed.format("YYYY-MM-DD HH:mm:ss");
				Upsert.value!.form.imagingTime = result;
				} else {
				Upsert.value!.form.imagingTime = null;
				Crud.value?.app?.message?.warning?.("时间格式不合法，请使用 YYYY-MM-DD HH:mm:ss");
				}
			}
			}
		},
		span: 12
		},
	  {
		label: t("起始文件号"),
		prop: "startFileNo",
		hook: "number",
		component: { name: "el-input-number", props: { min: 0 } },
		span: 12,
		required: true,
	  },
	  {
		label: t("结束文件号"),
		prop: "endFileNo",
		hook: "number",
		component: { name: "el-input-number", props: { min: 0 } },
		span: 12,
		required: true,
	  },
	  {
		label: t("状态"),
		prop: "status",
		component: { name: "el-radio-group", options: options.status },
		value: 1,
		required: true,
	  },
	],
  
	onOpen: ((...args: any[]) => {
		const ctx = (args[0] || {}) as any;
		const { type, form, scope } = ctx;
		if (type === "add") {
			form.name ??= currentName.value;
		} else if (type === "update") {
			form.name = scope?.row?.name ?? form.name ?? currentName.value;
		}
	}) as any,
  
	onSubmit(form, { next }) {
	  const name = form?.name ?? currentName.value ?? 0;
	  return next({ ...form, name });
	},
  });
  
  /** —— 关键补丁：让 info 总携带 name —— */
  {
	const api: any = service.star.fixed_storage_table;
	const rawInfo = api?.info?.bind(api);
	if (typeof rawInfo === "function") {
	  api.info = (params: any = {}) => {
		const name =
		  (Upsert.value?.scope?.row?.name ??
			params?.name ??
			currentName.value ??
			0) as number;
		return rawInfo({ ...params, name });
	  };
	}
  }
  
  /** 批量编辑状态 */
  const batchVisible = ref(false);
  const batchLoading = ref(false);
  /** 注意不要用 null，Element Plus RadioGroup 不接受 null */
  const batchForm = reactive<{ status: number | undefined }>({
	status: undefined,
  });
  
  /** 选中行收集 */
  const selection = ref<any[]>([]);
  
  /** 表格 */
  const Table = useTable({
	columns: [
	  { type: "selection" },
	  { label: t("编号"), prop: "code", minWidth: 140 },
	  {
		label: t("目标名称"),
		prop: "targetName",
		minWidth: 140,
		formatter: (row: any) => row?.targetName || "-",
	  },
	  {
		label: t("成像时间"),
		prop: "imagingTime",
		minWidth: 170,
		formatter: (row: any) => row?.imagingTime || "-",
	  },
	  {
		label: startFileNoLabel,
		prop: "startFileNo",
		minWidth: 140,
		sortable: "custom",
	  },
	  {
		label: t("结束文件号"),
		prop: "endFileNo",
		minWidth: 140,
		sortable: "custom",
		hidden: endFileNoHidden,
	  },
	  {
		label: t("状态"),
		prop: "status",
		minWidth: 120,
		dict: options.status,
	  },
	  {
		label: t("更新时间"),
		prop: "updateTime",
		minWidth: 170,
		sortable: "custom",
		component: { name: "cl-date-text" },
	  },
	  {
		type: "op",
		buttons: [
		  "edit",
		  /*{
			label: t("删除"),
			prop: "delete",
			type: "danger",
			props: { disabled: true }, // 仍然禁用删除
		  },*/
		],
	  },
	],
  });
  
  /** CRUD */
  const Crud = useCrud(
	{
	  service: service.star.fixed_storage_table,
  
	  onRefresh(params, { next }) {
		return next({ ...params, name: currentName.value });
	  },
  
	  onDelete(selectionRows, { next }) {
		const ids = selectionRows.map((r: any) => r.id);
		const uniq = Array.from(new Set(selectionRows.map((r: any) => r.name)));
		if (uniq.length > 1) {
		  // @ts-ignore
		  Crud.value?.app?.message?.error?.(t("不支持跨表删除，请先按名称筛选后再删除"));
		  return;
		}
		return next({ ids, name: currentName.value });
	  },
	},
	(app) => {
	  app.refresh();
	}
  );
  
  /** 手动刷新 */
  function refresh(params?: any) {
	Crud.value?.refresh(params);
  }
  
  /** 收集多选 */
  function onSelectionChange(rows: any[]) {
	selection.value = rows || [];
  }
  
  /** 打开批量编辑 */
  function openBatchEdit() {
	if (!selection.value.length) {
	  // @ts-ignore
	  Crud.value?.app?.message?.warning?.("请先选择要编辑的行");
	  return;
	}
	batchForm.status = selection.value[0]?.status ?? 1; // 安全默认值
	batchVisible.value = true;
  }
  
  /** 提交批量编辑 */
  async function submitBatch() {
	if (batchForm.status === undefined) {
	  // @ts-ignore
	  Crud.value?.app?.message?.warning?.("请选择要设置的状态");
	  return;
	}
  
	batchLoading.value = true;
	const name = currentName.value;
  
	try {
	  // 当状态被设置为“空”(0) 时，自动清空目标名称和成像时间
	  const clearFields = batchForm.status === 0;
  
	  await Promise.all(
		selection.value.map((row) =>
		  service.star.fixed_storage_table.update({
			id: row.id,
			status: batchForm.status!,
			name,
			...(clearFields
			  ? {
				  targetName: null,
				  imagingTime: null,
				}
			  : {}),
		  })
		)
	  );
  
	  batchVisible.value = false;
	  // @ts-ignore
	  Crud.value?.app?.message?.success?.("批量编辑成功");
	  refresh();
	} catch (e) {
	  // @ts-ignore
	  Crud.value?.app?.message?.error?.("批量编辑失败");
	} finally {
	  batchLoading.value = false;
	}
  }

  function openHistory() {
    const inst = historyDialogRef.value;
    if (!inst || typeof inst.open !== "function") {
      console.warn("[fixed_storage_table] historyDialogRef not ready", inst);
      return;
    }

    // 传入当前表筛选参数，便于后端按表过滤
    const cur = currentName.value;
    const tbl = options.name.find((n: any) => n.value === cur)?.label;
    inst.open({ name: cur, table_name: tbl });
  }



  </script>
  
