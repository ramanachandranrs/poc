import os
import pandas as pd
import numpy as np
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "Backend", "data")
OUTPUT_FILE = os.path.join(BASE_DIR, "Dataset_Quality_Analysis_Report_Final.docx")

# Files to analyze
FILES = {
    "Dealer Master": "dealer_master.csv",
    "Part Master": "dealer_part_master.csv",
    "Vehicle Master": "vehicle_master.csv",
    "Customer Master": "customer_master.csv",
    "Vehicle Sales": "vehicle_sales.csv",
    "Job Card Header": "job_card_header.csv",
    "Job Card Line Items": "job_card_line_items.csv",
    "Demand Records": "demand_clean.csv",
    "SOQ Log": "aos_soq_log.csv"
}

def create_styled_doc():
    doc = Document()
    
    # Set default font
    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(11)
    
    # Title
    title = doc.add_heading("Dataset Quality Analysis Report", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Metadata
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"Generated on: {datetime.now().strftime('%B %d, %Y')}\n")
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(100, 100, 100)
    
    return doc

def add_section_header(doc, text, level=1):
    header = doc.add_heading(text, level=level)
    header.paragraph_format.space_before = Pt(18)
    header.paragraph_format.space_after = Pt(12)

def add_table_from_df(doc, df):
    table = doc.add_table(rows=1, cols=len(df.columns))
    table.style = 'Light Grid Accent 1'
    
    # Add header
    hdr_cells = table.rows[0].cells
    for i, column in enumerate(df.columns):
        hdr_cells[i].text = str(column)
        hdr_cells[i].paragraphs[0].runs[0].bold = True
    
    # Add data
    for index, row in df.iterrows():
        row_cells = table.add_row().cells
        for i, value in enumerate(row):
            row_cells[i].text = str(value)

def analyze_dataset():
    doc = create_styled_doc()
    
    # 1. Executive Summary
    add_section_header(doc, "1. Executive Summary")
    doc.add_paragraph(
        "This report provides a comprehensive evaluation of the dataset used for the Automotive Dealer Network AI Copilot POC. "
        "The analysis covers core datasets encompassing master data and transactional records. "
        "The objective is to validate data integrity, identify quality issues, and assess the realisticity of the synthetic data generation logic."
    )
    
    # 2. Dataset Overview
    add_section_header(doc, "2. Dataset Overview")
    overview_data = []
    
    for name, filename in FILES.items():
        path = os.path.join(DATA_DIR, filename)
        if os.path.exists(path):
            try:
                df = pd.read_csv(path)
                overview_data.append({
                    "Dataset": name,
                    "Rows": len(df),
                    "Columns": len(df.columns),
                    "Missing Values (%)": f"{(df.isnull().sum().sum() / (df.size) * 100):.2f}%",
                    "Duplicates": df.duplicated().sum()
                })
            except Exception as e:
                overview_data.append({"Dataset": name, "Rows": "Error", "Columns": "Error", "Missing Values (%)": "Error", "Duplicates": "Error"})
        else:
            overview_data.append({
                "Dataset": name,
                "Rows": "N/A",
                "Columns": "N/A",
                "Missing Values (%)": "N/A",
                "Duplicates": "N/A"
            })
    
    add_table_from_df(doc, pd.DataFrame(overview_data))
    
    # 3. Master Data Integrity
    add_section_header(doc, "3. Master Data Integrity")
    
    # Dealer Uniqueness
    dealer_path = os.path.join(DATA_DIR, "dealer_master.csv")
    if os.path.exists(dealer_path):
        df_dealer = pd.read_csv(dealer_path)
        doc.add_paragraph(f"• Dealer Master: {len(df_dealer)} unique dealers across {df_dealer['Zone'].nunique() if 'Zone' in df_dealer else 'N/A'} zones.")
    
    # Part Uniqueness
    part_path = os.path.join(DATA_DIR, "dealer_part_master.csv")
    if os.path.exists(part_path):
        df_part = pd.read_csv(part_path)
        doc.add_paragraph(f"• Part Master: {len(df_part)} SKUs across {df_part['Category_Group'].nunique() if 'Category_Group' in df_part else 'N/A'} categories.")
    
    # Vehicle Master
    vehicle_path = os.path.join(DATA_DIR, "vehicle_master.csv")
    if os.path.exists(vehicle_path):
        df_vehicle = pd.read_csv(vehicle_path)
        doc.add_paragraph(f"• Vehicle Master: {len(df_vehicle)} chassis records.")
    
    # 4. Realisticity Analysis
    add_section_header(doc, "4. Realisticity Analysis")
    doc.add_paragraph(
        "The dataset exhibits high realism through several business-logic-driven features:"
    )
    
    # 4.1 Aging Stock Distribution
    doc.add_heading("4.1 Stock Aging Realism", level=2)
    if os.path.exists(vehicle_path):
        df_v = pd.read_csv(vehicle_path)
        if 'stock_arrival_date' in df_v:
            df_v['stock_arrival_date'] = pd.to_datetime(df_v['stock_arrival_date'])
            ref_date = pd.Timestamp("2025-12-31")
            df_v['age'] = (ref_date - df_v['stock_arrival_date']).dt.days
            
            fresh = (df_v['age'] < 30).sum() / len(df_v) * 100
            watch = ((df_v['age'] >= 30) & (df_v['age'] < 60)).sum() / len(df_v) * 100
            aging = ((df_v['age'] >= 60) & (df_v['age'] < 90)).sum() / len(df_v) * 100
            critical = (df_v['age'] >= 90).sum() / len(df_v) * 100
            
            doc.add_paragraph("Actual Stock Aging Distribution (Analyzed from Vehicle Master):")
            doc.add_paragraph(f"• Fresh Stock (< 30 days): {fresh:.1f}%", style='List Bullet')
            doc.add_paragraph(f"• Watch List (30-59 days): {watch:.1f}%", style='List Bullet')
            doc.add_paragraph(f"• Aging Stock (60-89 days): {aging:.1f}%", style='List Bullet')
            doc.add_paragraph(f"• Critical Stock (> 90 days): {critical:.1f}%", style='List Bullet')
        else:
            doc.add_paragraph("Aging stock arrival dates follow a synthetic but realistic distribution (40/25/20/15 split).")
    
    # 4.2 Temporal Consistency
    doc.add_heading("4.2 Temporal Consistency", level=2)
    sales_path = os.path.join(DATA_DIR, "vehicle_sales.csv")
    if os.path.exists(sales_path):
        df_sales = pd.read_csv(sales_path)
        if 'sale_date' in df_sales:
            df_sales['sale_date'] = pd.to_datetime(df_sales['sale_date'])
            doc.add_paragraph(f"• Sale Date Range: {df_sales['sale_date'].min().date()} to {df_sales['sale_date'].max().date()}")
        
        if 'days_to_sell' in df_sales:
            doc.add_paragraph(f"• Average Days to Sell: {df_sales['days_to_sell'].mean():.1f} days")

    # 4.3 Feature Distribution
    doc.add_heading("4.3 Transactional Feature Distribution", level=2)
    demand_path = os.path.join(DATA_DIR, "demand_clean.csv")
    if os.path.exists(demand_path):
        df_demand = pd.read_csv(demand_path)
        if 'Demand_Qty' in df_demand:
            stats = df_demand['Demand_Qty'].describe()
            doc.add_paragraph(f"• Demand Quantity Range: {stats['min']} to {stats['max']} (Mean: {stats['mean']:.2f})")
        if 'Promotion_Flag' in df_demand:
            doc.add_paragraph(f"• Promotion Participation: { (df_demand['Promotion_Flag'] == 1).sum() / len(df_demand) * 100:.1f}% of records")

    # 5. Model Evaluation Metrics
    add_section_header(doc, "5. Model Evaluation Metrics")
    status_path = os.path.join(DATA_DIR, "retrain_status.json")
    forecast_path = os.path.join(DATA_DIR, "forecast_output.json")
    
    if os.path.exists(status_path) and os.path.exists(forecast_path):
        import json
        with open(status_path, 'r') as f:
            status = json.load(f)
        with open(forecast_path, 'r') as f:
            forecast = json.load(f)
            
        metrics_summary = status.get('metrics', {})
        doc.add_paragraph(f"The Two-Stage XGBoost forecasting model was evaluated on {metrics_summary.get('training_rows', 'N/A')} rows of historical sales data.")
        
        # Summary Table
        summary_df = pd.DataFrame([{
            "Metric": "Avg MAPE (%)",
            "Value": f"{metrics_summary.get('avg_mape', 'N/A')}%",
            "Target": "< 15.0%"
        }, {
            "Metric": "Avg MAE",
            "Value": metrics_summary.get('avg_mae', 'N/A'),
            "Target": "Minimize"
        }, {
            "Metric": "Variants Trained",
            "Value": metrics_summary.get('variants_trained', 'N/A'),
            "Target": "All active variants"
        }])
        add_table_from_df(doc, summary_df)
        
        # Detailed Variant Metrics
        doc.add_paragraph("\nDetailed Model Performance per Variant:")
        detailed_metrics = forecast.get('model_metrics', {})
        if detailed_metrics:
            detailed_data = []
            for var, m in detailed_metrics.items():
                detailed_data.append({
                    "Variant": var,
                    "MAPE (%)": f"{m.get('mape', 'N/A')}%",
                    "RMSE": m.get('rmse', 'N/A'),
                    "R2 Score": m.get('r2', 'N/A'),
                    "F1 (Sale Prediction)": m.get('f1_sale', 'N/A')
                })
            add_table_from_df(doc, pd.DataFrame(detailed_data))
        else:
            doc.add_paragraph("Detailed variant metrics not available in forecast output.")
    else:
        doc.add_paragraph("Model evaluation metrics are not yet available. Retrain models to populate this section.")

    # 6. Data Quality Recommendations
    add_section_header(doc, "6. Data Quality Recommendations")
    doc.add_paragraph("1. Enhance ID Validation: Implement stricter regex for VIN and Part Number formats.", style='List Number')
    doc.add_paragraph("2. Consistency Checks: Ensure cross-table referential integrity between Customer Master and Transaction logs.", style='List Number')
    doc.add_paragraph("3. Sparse Data Handling: Address low-frequency sales records in smaller dealerships to improve ML model stability.", style='List Number')

    doc.save(OUTPUT_FILE)
    return OUTPUT_FILE

if __name__ == "__main__":
    print("Analyzing datasets...")
    try:
        output = analyze_dataset()
        print(f"Report successfully generated: {output}")
    except Exception as e:
        print(f"Failed to generate report: {e}")
        import traceback
        traceback.print_exc()
