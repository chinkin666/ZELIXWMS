import math
import pandas as pd
from pathlib import Path

EXCEL_FILE = "0420配送業者別_出荷指示仕様書一覧.xlsx"
OUTPUT_MD = "nexand_出荷管理仕様書.md"

def clean_cell(val):
    """把单元格内容转成适合 Markdown 的字符串"""
    if pd.isna(val):
        return ""
    # 数字直接转字符串
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val))
        return str(val)
    s = str(val)
    # Excel 里的换行用 <br> 表示
    s = s.replace("\n", "<br>")
    # 避免表格的 | 把列搞乱
    s = s.replace("|", "\\|")
    return s

def sheet_to_markdown(sheet_name: str, df_raw: pd.DataFrame) -> str:
    # 空表直接跳过
    if df_raw.empty:
        return ""

    # 找到标题行（通常第一行第一个单元格是“佐川急便e飛伝3 出荷指示エクスポート（取込）”之类）
    title = ""
    if not pd.isna(df_raw.iloc[0, 0]):
        title = str(df_raw.iloc[0, 0])

    # 找表头行（第一列是 "NO" 的那一行）
    header_row_idx = None
    for idx, val in df_raw.iloc[:, 0].items():
        if str(val).strip().upper() == "NO":
            header_row_idx = idx
            break
    if header_row_idx is None:
        # 找不到就保守一点，假设第 1 行是表头
        header_row_idx = 1

    header_row = df_raw.iloc[header_row_idx]
    headers = [clean_cell(v) for v in header_row.tolist()]

    # 表数据从 header_row_idx+1 开始
    body = df_raw.iloc[header_row_idx + 1 :].reset_index(drop=True)
    body = body.where(pd.notnull(body), "")

    lines = []

    # section 标题：用 Excel 里的标题 + sheet 名
    if title and title != "nan":
        lines.append(f"## {title} ({sheet_name})")
    else:
        lines.append(f"## {sheet_name}")

    lines.append("")  # 空行

    # 表头
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")

    # 每一行数据
    for _, row in body.iterrows():
        vals = [clean_cell(v) for v in row.tolist()]
        # 如果整行都是空，就不输出
        if all(v == "" for v in vals):
            continue
        lines.append("| " + " | ".join(vals) + " |")

    return "\n".join(lines)


def main():
    xls = pd.ExcelFile(EXCEL_FILE)
    md_sections = []

    for sheet in xls.sheet_names:
        # 跳过空白 sheet（比如 Sheet2）
        df_raw = pd.read_excel(EXCEL_FILE, sheet_name=sheet, header=None)
        if df_raw.empty:
            continue

        md = sheet_to_markdown(sheet, df_raw)
        if md.strip():
            md_sections.append(md)

    full_md = "\n\n\n".join(md_sections)

    Path(OUTPUT_MD).write_text(full_md, encoding="utf-8")
    print(f"✅ 生成完成: {OUTPUT_MD}")


if __name__ == "__main__":
    main()
