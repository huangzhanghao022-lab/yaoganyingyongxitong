"""
Streamlit 前端：每日计划与星上固存表
  python -m streamlit run main.py --server.port 8502
"""

import datetime
import html
import re
from typing import Any, Dict, List, Tuple

import pandas as pd
import requests
import streamlit as st

API_BASE = "http://127.0.0.1:8001/open/daily_plan"
STORAGE_API_BASE = "http://127.0.0.1:8001/open/fixed_storage"
TRANSIT_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}")

STORAGE_TABLES = [
    (0, "AS02载荷固存表"),
    (1, "AS02平台固存表"),
    (2, "AS03载荷固存表"),
    (3, "AS03平台固存表"),
]

STATUS_LABELS = {
    0: "空",
    1: "待写入",
    2: "已写入待数传",
    3: "已数传待反馈",
    4: "解析有问题",
    5: "已重传待反馈",
    6: "已数传待删除",
    7: "已安排数传",
}

STATUS_COLORS = {
    "空": "#9CA3AF",
    "待写入": "#3B82F6",
    "已写入待数传": "#F59E0B",
    "已数传待反馈": "#EC4899",
    "解析有问题": "#EF4444",
    "已重传待反馈": "#EF4444",
    "已数传待删除": "#10B981",
    "已安排数传": "#6366F1",
}


def inject_css() -> None:
    st.markdown(
        """
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Noto+Sans+SC:wght@400;600&display=swap');

:root {
  --accent: #3b82f6;
  --accent-2: #22d3ee;
  --text-main: #0f172a;
  --text-muted: #64748b;
}

html, body, [class*="css"] {
  font-family: "Noto Sans SC", "HarmonyOS Sans SC", "Source Han Sans SC", sans-serif;
  color: var(--text-main);
}

.main .block-container {
  max-width: 1350px;
  padding: 2rem 2rem 3.5rem;
}

/* =================================================================
   1. 侧边栏样式 (已修改为你喜欢的导航菜单风格)
   ================================================================= */

section[data-testid="stSidebar"] {
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

section[data-testid="stSidebar"] .stMarkdown h2 {
  font-size: 18px;
  font-weight: 700;
  color: #334155;
  margin-top: 10px;
  margin-bottom: 10px;
  padding-left: 5px;
}

section[data-testid="stSidebar"] .stMarkdown h3 {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-left: 5px;
  margin-bottom: 8px;
}

/* 侧边栏按钮容器修正 */
section[data-testid="stSidebar"] .stButton {
  width: 100%;
  border: none;
  padding: 0;
  background: transparent;
  margin-bottom: 4px;
}

/* 侧边栏按钮 - 通用重置 */
section[data-testid="stSidebar"] .stButton button {
  width: 100%;
  display: flex !important;
  justify-content: flex-start !important; /* 强制左对齐 */
  align-items: center;
  text-align: left !important;
  padding: 0.75rem 1rem !important;
  border-radius: 8px !important;
  border: none !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  height: auto !important;
  transition: all 0.2s ease;
  box-shadow: none !important; /* 移除原来的阴影 */
  margin: 0 !important;
}

/* 未选中的按钮 (Secondary) - 透明背景，灰色字 */
section[data-testid="stSidebar"] .stButton button[data-testid="baseButton-secondary"] {
  background: transparent !important; /* 强制透明，覆盖全局渐变 */
  color: #64748b !important;
}

section[data-testid="stSidebar"] .stButton button[data-testid="baseButton-secondary"]:hover {
  background-color: #e2e8f0 !important; /* 悬停微灰 */
  color: #0f172a !important;
  transform: translateX(2px);
}

/* 选中的按钮 (Primary) - 蓝色背景，白字 */
section[data-testid="stSidebar"] .stButton button[data-testid="baseButton-primary"] {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: white !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
}

/* 隐藏侧边栏里的 Radio 样式影响，防止错乱 */
section[data-testid="stSidebar"] .stRadio div[role="radiogroup"] {
    background: transparent;
    box-shadow: none;
    padding: 0;
}


/* =================================================================
   2. 主内容区样式 (保留你原本的代码)
   ================================================================= */

.title-card {
  background: linear-gradient(92deg, #2f6bff, #20d1ff);
  color: #fff;
  padding: 22px 28px;
  border-radius: 18px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 12px 30px rgba(31, 95, 255, 0.28);
  margin-bottom: 20px;
  font-family: "Orbitron", "Noto Sans SC", sans-serif;
}

.query-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px 20px 20px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
  margin-bottom: 20px;
}

.query-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 10px;
  color: #0f172a;
}

.section-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin: 18px 0 12px;
}

/* 主界面的按钮样式 (保留渐变风格，但加上 .main 限定，避免影响侧边栏) */
.main .stButton button {
  background: linear-gradient(90deg, #36b5ff, #8b7bff);
  border: none;
  color: #fff;
  font-weight: 700;
  height: 44px;
  padding: 0 1.3rem;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.main .stButton button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.28);
}

div[data-testid="stDateInput"] input,
div[data-testid="stMultiSelect"] input,
div[data-testid="stTextInput"] input {
  color: #000 !important;
  -webkit-text-fill-color: #000 !important;
}

.plan-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  margin-bottom: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.plan-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
}

.kv-grid {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(220px, 1.3fr) minmax(220px, 1.2fr) minmax(110px, 0.6fr);
  column-gap: 16px;
  row-gap: 8px;
}

.kv-item.station {
  margin-left: 18px;
}

.kv-label {
  font-size: 16px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.kv-value {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.telemetry-title {
  font-size: 16px;
  font-weight: 700;
  color: #2563eb;
}

.telemetry-head {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.telemetry-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-muted);
}

.tele-toggle {
  display: none;
}

.tele-btn {
  background: #e0f2fe;
  color: #0f172a;
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 6px 14px rgba(59, 130, 246, 0.18);
}

.tele-btn .hide {
  display: none;
}

.tele-toggle:checked + .telemetry-head .tele-btn .show {
  display: none;
}

.tele-toggle:checked + .telemetry-head .tele-btn .hide {
  display: inline;
}

.telemetry-box {
  margin-top: 8px;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 14px;
  color: #111827;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.7;
  white-space: pre-wrap;
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: none;
}

.tele-toggle:checked ~ .telemetry-box {
  display: block;
}

.storage-action-row {
  margin: 6px 0 16px;
}

.storage-action-row div[role="radiogroup"] {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px;
  border-radius: 16px;
  background: linear-gradient(180deg, #eef5ff, #f8fbff);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.storage-action-row label {
  margin: 0;
}

.storage-action-row [data-baseweb="radio"] {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 14px;
  padding: 12px 28px;
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.18);
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: all 0.18s ease;
}

.storage-action-row [data-baseweb="radio"][aria-checked="true"] {
  background: linear-gradient(90deg, #2f6bff, #22d3ee);
  color: #fff;
  border-color: rgba(34, 211, 238, 0.6);
  box-shadow: 0 10px 24px rgba(34, 211, 238, 0.35);
}

.storage-action-row [data-baseweb="radio"] > div:first-child {
  display: none;
}

.storage-action-row [data-baseweb="radio"] div,
.storage-action-row [data-baseweb="radio"] span {
  color: inherit;
}

.query-button-spacer {
  height: 28px;
}

.storage-current {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0f172a;
  font-weight: 700;
  margin-bottom: 10px;
}

.storage-table-wrap {
  background: #fff;
  border-radius: 16px;
  padding: 6px 10px 14px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
  overflow-x: auto;
}

table.storage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

table.storage-table thead th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

table.storage-table tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid #edf2f7;
  color: #0f172a;
}

table.storage-table tbody tr:hover {
  background: #f8fafc;
}

.status-chip {
  font-weight: 700;
}
</style>
        """,
        unsafe_allow_html=True,
    )


def safe_text(value: Any, default: str = "-") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def parse_datetime(value: Any) -> datetime.datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, (int, float)):
        ts = float(value)
        if ts > 1e12:
            ts = ts / 1000.0
        try:
            return datetime.datetime.fromtimestamp(ts)
        except Exception:
            return None
    text = str(value).strip()
    if not text:
        return None
    if "T" in text:
        text = text.replace("T", " ")
    text = text[:19]
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(text, fmt)
        except Exception:
            continue
    try:
        return datetime.datetime.fromisoformat(text)
    except Exception:
        return None


def parse_date(value: Any) -> datetime.date | None:
    if value is None:
        return None
    if isinstance(value, datetime.date) and not isinstance(value, datetime.datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    text = text[:10]
    try:
        return datetime.date.fromisoformat(text)
    except Exception:
        return None


def format_datetime(value: Any) -> str:
    dt = parse_datetime(value)
    if not dt:
        return "-"
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def split_transit(value: Any) -> Tuple[str, str]:
    if not value:
        return "", ""
    text = str(value)
    idx = text.find("-", 19)
    if idx == -1:
        return text.strip(), ""
    return text[:idx].strip(), text[idx + 1 :].strip()


def format_transit(value: Any) -> str:
    start, end = split_transit(value)
    if start and end:
        return f"{start} ~ {end}"
    return start or end or "-"


def format_angle(value: Any) -> str:
    if value is None or value == "":
        return "-"
    try:
        num = float(value)
        if num.is_integer():
            return str(int(num))
        return f"{num:.2f}"
    except Exception:
        return safe_text(value)


def sort_plan_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def key(item: Dict[str, Any]) -> Tuple[datetime.date, datetime.datetime]:
        date = parse_date(item.get("date"))
        if not date:
            date = parse_date(item.get("beginTime")) or parse_date(item.get("planBeginTime"))
        start_dt = parse_datetime(split_transit(item.get("transitTime"))[0])
        if not start_dt:
            start_dt = parse_datetime(item.get("beginTime")) or parse_datetime(item.get("planBeginTime"))
        return (date or datetime.date.min, start_dt or datetime.datetime.min)

    return sorted(items, key=key)


def unwrap_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
        return payload["data"]
    return payload


def fetch_daily_plan(sats: List[str], start_date: datetime.date, end_date: datetime.date) -> List[Dict[str, Any]]:
    body = {
        "sat": sats,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
    }
    resp = requests.post(API_BASE, json=body, timeout=30)
    resp.raise_for_status()
    payload = unwrap_response(resp.json())
    data_list = payload.get("list") if isinstance(payload, dict) else []
    return data_list if isinstance(data_list, list) else []


def render_status_html(status_label: str) -> str:
    color = STATUS_COLORS.get(status_label, "#94a3b8")
    return f"<span class='status-chip' style='color:{color}'>{html.escape(status_label)}</span>"


def render_plan_cards(items: List[Dict[str, Any]]) -> None:
    if not items:
        st.info("暂无计划数据")
        return

    for index, item in enumerate(items, start=1):
        satellite = safe_text(item.get("satellite") or item.get("satelliteCode") or "-")
        date = safe_text(item.get("date") or item.get("planDate") or "-")
        station = safe_text(
            item.get("telemetryStation")
            or item.get("stationName")
            or item.get("antennaName")
            or "-"
        )
        duty = safe_text(item.get("dutyOfficer"), "-")
        transit = format_transit(item.get("transitTime"))
        angle = format_angle(item.get("elevationAngle"))
        telemetry = safe_text(item.get("telemetryInfo"), "暂无测控信息")
        telemetry_html = html.escape(telemetry).replace("\n", "<br>")

        toggle_id = f"telemetry-{index}"
        card_html = f"""
<div class="plan-card">
  <div class="plan-title">{index}. {html.escape(satellite)} | {html.escape(date)} | {html.escape(station)}</div>
  <div class="kv-grid">
    <div class="kv-item">
      <div class="kv-label">值班人</div>
      <div class="kv-value">{html.escape(duty)}</div>
    </div>
    <div class="kv-item">
      <div class="kv-label">过境时间</div>
      <div class="kv-value">{html.escape(transit)}</div>
    </div>
    <div class="kv-item station">
      <div class="kv-label">测控站</div>
      <div class="kv-value">{html.escape(station)}</div>
    </div>
    <div class="kv-item">
      <div class="kv-label">仰角</div>
      <div class="kv-value">{html.escape(angle)}</div>
    </div>
  </div>
  <input class="tele-toggle" type="checkbox" id="{toggle_id}">
  <div class="telemetry-head">
    <div class="telemetry-title">测控信息</div>
    <label class="tele-btn" for="{toggle_id}">
      <span class="show">查看</span>
      <span class="hide">隐藏</span>
    </label>
  </div>
  <div class="telemetry-box">{telemetry_html}</div>
</div>
"""
        st.markdown(card_html, unsafe_allow_html=True)


def fetch_storage(table_id: int) -> Dict[str, Any]:
    body = {
        "name": table_id,
        "page": 1,
        "size": 200,
        "sort": "startFileNo",
        "order": "ASC",
    }
    resp = requests.post(STORAGE_API_BASE, json=body, timeout=30)
    resp.raise_for_status()
    return unwrap_response(resp.json())


def resolve_status_label(value: Any) -> str:
    try:
        return STATUS_LABELS.get(int(value), str(value))
    except Exception:
        return str(value) if value is not None else "-"


def render_storage_table(table_id: int) -> None:
    payload = fetch_storage(table_id)
    items = payload.get("list") if isinstance(payload, dict) else []
    if not isinstance(items, list) or not items:
        st.info("暂无固存数据")
        return

    is_platform = table_id in (1, 3)
    is_as03_payload = table_id == 2
    rows: List[Dict[str, Any]] = []
    for row in items:
        code = row.get("code")
        if code is None:
            code = row.get("id")
        if code is None:
            code = "-"
        status_label = resolve_status_label(row.get("status"))
        if is_platform:
            file_no = row.get("startFileNo")
            if file_no is None:
                file_no = row.get("fileNo")
            rows.append(
                {
                    "编号": code,
                    "平台文件名称": safe_text(row.get("fileName")),
                    "写入时间": format_datetime(row.get("executingTime") or row.get("imagingTime")),
                    "文件号": safe_text(file_no),
                    "状态": render_status_html(status_label),
                    "更新时间": format_datetime(row.get("updateTime")),
                }
            )
        else:
            start_no = row.get("startFileNo")
            end_no = row.get("endFileNo")
            if end_no is None and start_no is not None:
                end_no = start_no
            if is_as03_payload:
                rows.append(
                    {
                        "编号": code,
                        "目标名称": safe_text(row.get("targetName")),
                        "成像时间": format_datetime(row.get("imagingTime") or row.get("executingTime")),
                        "文件号": safe_text(start_no),
                        "状态": render_status_html(status_label),
                        "更新时间": format_datetime(row.get("updateTime")),
                    }
                )
            else:
                rows.append(
                    {
                        "编号": code,
                        "目标名称": safe_text(row.get("targetName")),
                        "成像时间": format_datetime(row.get("imagingTime") or row.get("executingTime")),
                        "起始文件号": safe_text(start_no),
                        "结束文件号": safe_text(end_no),
                        "状态": render_status_html(status_label),
                        "更新时间": format_datetime(row.get("updateTime")),
                    }
                )

    df = pd.DataFrame(rows)
    for col in df.columns:
        if col == "状态":
            continue
        df[col] = df[col].astype(str).map(lambda x: html.escape(x))

    table_html = df.to_html(index=False, escape=False, classes="storage-table")
    st.markdown(f"<div class='storage-table-wrap'>{table_html}</div>", unsafe_allow_html=True)


def render_daily_plan_view() -> None:
    today = datetime.date.today()
    if "plan_results" not in st.session_state:
        st.session_state.plan_results = []
    if "plan_error" not in st.session_state:
        st.session_state.plan_error = ""

    st.markdown("<div class='query-title'>查询条件</div>", unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns([1.2, 1, 1, 0.6])
    with col1:
        sats = st.multiselect("卫星", ["AS02", "AS03"], default=["AS02"])
    with col2:
        start_date = st.date_input("开始日期", value=today)
    with col3:
        end_date = st.date_input("结束日期", value=today)
    with col4:
        st.markdown("<div class='query-button-spacer'></div>", unsafe_allow_html=True)
        if st.button("获取计划"):
            try:
                data = fetch_daily_plan(sats or ["AS02"], start_date, end_date)
                st.session_state.plan_results = sort_plan_items(data)
                st.session_state.plan_error = ""
            except Exception as exc:
                st.session_state.plan_results = []
                st.session_state.plan_error = str(exc)

    if st.session_state.plan_error:
        st.error(f"获取失败: {st.session_state.plan_error}")
        return

    render_plan_cards(st.session_state.plan_results)


def render_storage_view() -> None:
    if "storage_table" not in st.session_state:
        st.session_state.storage_table = 0

    st.markdown("<div class='storage-action-row'>", unsafe_allow_html=True)
    table_ids = [table_id for table_id, _ in STORAGE_TABLES]
    label_map = dict(STORAGE_TABLES)
    st.radio(
        "固存表",
        table_ids,
        format_func=lambda v: label_map.get(v, str(v)),
        horizontal=True,
        label_visibility="collapsed",
        key="storage_table",
    )
    st.markdown("</div>", unsafe_allow_html=True)

    render_storage_table(int(st.session_state.storage_table))


def main() -> None:
    st.set_page_config(page_title="每日计划 · 固存表", layout="wide")
    inject_css()

    st.sidebar.markdown("## 菜单")
    # 去掉了原有的 ### 功能
    
    if "active_page" not in st.session_state:
        st.session_state.active_page = "每日计划"
        
    if st.sidebar.button(
        "📅 每日计划",
        use_container_width=True,
        type="primary" if st.session_state.active_page == "每日计划" else "secondary",
    ):
        st.session_state.active_page = "每日计划"
        st.rerun()
        
    if st.sidebar.button(
        "🛰️ 星上固存表",
        use_container_width=True,
        type="primary" if st.session_state.active_page == "星上固存表" else "secondary",
    ):
        st.session_state.active_page = "星上固存表"
        st.rerun()

    if st.session_state.active_page == "每日计划":
        render_daily_plan_view()
    else:
        render_storage_view()


if __name__ == "__main__":
    main()
