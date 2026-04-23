"""
generate_report.py — Creates a professional Word document evaluation report.
"""
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "Project_Evaluation_Report.docx")

doc = Document()

# ── Styles ────────────────────────────────────────────────────────────────────
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)
style.paragraph_format.space_after = Pt(4)

for level in range(1, 4):
    hs = doc.styles[f"Heading {level}"]
    hs.font.color.rgb = RGBColor(0, 48, 135)
    hs.font.name = "Calibri"


def add_table(doc, headers, rows, col_widths=None):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = "Light Grid Accent 1"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = t.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(10)
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = t.rows[ri + 1].cells[ci]
            cell.text = str(val)
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in t.rows:
                row.cells[i].width = Cm(w)
    return t


# ── Title Page ────────────────────────────────────────────────────────────────
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run("\n\n\n\n").font.size = Pt(24)
r = p.add_run("Automotive Dealer Network\nAI Copilot")
r.bold = True
r.font.size = Pt(28)
r.font.color.rgb = RGBColor(0, 48, 135)
p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = p2.add_run("Project Evaluation Report")
r2.font.size = Pt(20)
r2.font.color.rgb = RGBColor(80, 80, 80)
p3 = doc.add_paragraph()
p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
p3.add_run("\n\n").font.size = Pt(12)
meta = [
    "Project Type: Proof of Concept (POC)",
    "Domain: Automotive Supply Chain — Maruti Suzuki Dealer Network",
    "Stack: Python FastAPI + SQLite + React/Vite + XGBoost + Gemini 2.5 Flash",
    "Report Date: April 2026",
]
for line in meta:
    pm = doc.add_paragraph()
    pm.alignment = WD_ALIGN_PARAGRAPH.CENTER
    pm.add_run(line).font.size = Pt(12)

doc.add_page_break()

# ── 1. Executive Summary ─────────────────────────────────────────────────────
doc.add_heading("1. Executive Summary", level=1)
doc.add_paragraph(
    "This POC simulates an AI-powered command center for a 30-dealer automotive network. "
    "It tackles three expensive operational problems — aging vehicle stock, spare parts stockouts, "
    "and transit logistics delays — by combining a synthetic but hyper-realistic dataset, an XGBoost "
    "ML forecasting model, and GenAI message generation (Gemini + Groq) into a unified React dashboard "
    "with 12+ pages."
)
doc.add_paragraph(
    "The system features 2,000+ lines of backend API code, 14 frontend pages, 25+ REST endpoints, "
    "an 81 MB SQLite database with 14 tables, and a two-stage ML model. It demonstrates a compelling "
    "human-in-the-loop AI workflow suitable for enterprise deployment pitches."
)

# ── 2. Architecture ──────────────────────────────────────────────────────────
doc.add_heading("2. Architecture Overview", level=1)
doc.add_paragraph(
    "The project follows a three-tier architecture:"
)
add_table(doc,
    ["Layer", "Technology", "Key Components"],
    [
        ["Frontend", "React + Vite + TailwindCSS", "14 pages, Recharts, Framer Motion, NLQ Chat"],
        ["Backend", "Python FastAPI + SQLAlchemy 2.0", "main.py (2019 lines), gemini_service.py, email_service.py"],
        ["Database", "SQLite (81 MB)", "14 tables, 350K+ rows, 870 real road distances"],
        ["ML Model", "XGBoost (Two-Stage)", "Classifier + Regressor, 21 features, 98K training rows"],
        ["GenAI", "Gemini 2.5 Flash + Groq LLaMA 3.3", "B2B/B2C messages, NLQ, operational alerts"],
    ],
)

# ── 3. Project Workflow ──────────────────────────────────────────────────────
doc.add_heading("3. Complete Project Workflow", level=1)

doc.add_heading("Phase 1: Data Generation & Ingestion", level=2)
doc.add_paragraph(
    "generate_data.py reads CSV source files (Dealers, Inventory, Bookings, Parts, Transit), "
    "generates 14 database tables with intentionally engineered edge cases:"
)
bullets = [
    "Critical spare parts forced to 0 quantity at random dealers",
    "15% of vehicles artificially aged to 60+ days on lot",
    "Customer bookings at wrong dealers to create demand mismatches",
    "10% of shipments flagged as past-due",
]
for b in bullets:
    doc.add_paragraph(b, style="List Bullet")

doc.add_heading("Phase 2: ML Model Training", level=2)
doc.add_paragraph(
    "demand_forecast.py trains one XGBoost model per variant using vehicle_sales_transactions.csv "
    "(98,550 rows). The two-stage approach handles zero-inflated sales data:"
)
doc.add_paragraph("Stage 1: XGBClassifier — 'Will there be a sale today?' (binary)", style="List Bullet")
doc.add_paragraph("Stage 2: XGBRegressor — 'How many units?' (trained on sale-days only)", style="List Bullet")
doc.add_paragraph("Combined prediction: P(sale) × qty_predicted", style="List Bullet")
doc.add_paragraph(
    "21 features including lag (1/7/14/30 day), rolling means, festive flags, dealer tier, and zone. "
    "Output: 270 dealer-variant combos saved to forecast_output.json. "
    "Final metrics: MAE = 1.21, MAPE = 56.7%."
)

doc.add_heading("Phase 3: Backend API Server", level=2)
doc.add_paragraph(
    "main.py (2,019 lines) exposes 25+ REST endpoints organized by domain:"
)
add_table(doc,
    ["Domain", "Key Endpoints", "Purpose"],
    [
        ["Wipro DMS", "/wipro/inventory/*", "Unsold vehicle inventory & summary"],
        ["SAP B1", "/sap/parts/*", "Spare parts & ROP monitoring"],
        ["Manesar Transit", "/rail/transit/*", "Shipment tracking & delay calculation"],
        ["Aging Intelligence", "/aging/*", "Transfer recommendations with net utility"],
        ["Sales Analytics", "/sales/*", "Revenue, sell-through, model performance"],
        ["GenAI Prompts", "/genai/*", "B2C outreach + operational alert templates"],
        ["Guided Assistant", "/guided/*", "Human-in-the-loop approve/reject + email"],
        ["AI Generation", "/ai/generate-*", "Gemini/Groq message generation"],
        ["NLQ Engine", "/nlq/query", "Natural language question answering"],
        ["Alert Feed", "/alerts/daily-feed", "Role-based prioritized alert stream"],
        ["ROI Report", "/roi/report", "Baseline vs AI comparison metrics"],
        ["Distance", "/distance/*", "Real road distance lookups"],
    ],
)

doc.add_heading("Phase 4: Frontend Dashboard", level=2)
doc.add_paragraph("14 React pages built with Vite + TailwindCSS + Recharts + Framer Motion:")
add_table(doc,
    ["Page", "Route", "Key Feature"],
    [
        ["Today's Actions", "/", "Daily prioritized alerts with Gemini message generation"],
        ["Network Overview", "/overview", "KPI cards + inventory vs demand trend chart"],
        ["Vehicle Inventory", "/inventory", "Unsold stock browser + Sales Analytics sub-tab"],
        ["Aging Stock", "/aging", "Transfer recommendations with net utility formula"],
        ["Spare Parts & ROP", "/parts", "Stockout detection with AI recommendations"],
        ["Transit Logistics", "/transit", "Shipment tracking with real delay calculations"],
        ["Demand Forecast", "/forecast", "XGBoost 30-day forecasts per dealer-variant"],
        ["AI Copilot Prompts", "/genai", "B2C outreach + operational alert templates"],
        ["Guided Assistant", "/guided", "Human-in-the-loop workflow with Gemini"],
        ["ROI Impact Report", "/roi", "Baseline vs AI comparison with animated metrics"],
        ["Customers", "/customers", "25,000 customer registry"],
        ["NLQ Chat", "Global widget", "Conversational Q&A via Groq LLaMA"],
    ],
)

doc.add_heading("Phase 5: AI Message Generation & Email", level=2)
doc.add_paragraph(
    "When a manager approves a recommendation in the Guided Assistant: "
    "(1) Gemini 2.5 Flash generates a professional message, "
    "(2) email_service.py sends branded HTML emails via SMTP, "
    "(3) Transfer approvals trigger TWO emails (source + target dealer), "
    "(4) Stockout approvals trigger a parts reorder alert email."
)

# ── 4. Key Business Logic ────────────────────────────────────────────────────
doc.add_heading("4. Key Business Logic", level=1)

doc.add_heading("Transfer Utility Scoring", level=2)
doc.add_paragraph("Net Utility = Floorplan Saved + (ML Demand Score × ₹500) − Transport Cost")
add_table(doc,
    ["Component", "Formula"],
    [
        ["Floorplan Saved", "(days / 30) × 1% × ₹8,00,000"],
        ["ML Demand Score", "XGBoost 30-day forecast for (variant, target_dealer)"],
        ["Transport Cost", "real_road_distance_km × ₹12/km"],
        ["Decision: Transfer", "Net Utility > 0"],
        ["Decision: Discount", "Net Utility < 0 AND days > 90"],
        ["Decision: Hold", "Otherwise"],
    ],
)

doc.add_heading("Reorder Point Logic", level=2)
add_table(doc,
    ["Condition", "Action"],
    [
        ["on_hand_qty < reorder_point", "Stockout Alert triggered"],
        ["qty == 0", "Severity: CRITICAL"],
        ["gap > ROP × 50%", "Severity: HIGH"],
        ["Otherwise", "Severity: MEDIUM"],
        ["EOQ Order", "max(ROP × 1.5, 10) units"],
    ],
)

doc.add_heading("Discount Scaling (B2C)", level=2)
add_table(doc,
    ["Vehicle Age", "Discount Offered"],
    [
        ["60 days", "₹15,000"],
        ["90 days", "₹25,000"],
        ["120+ days", "₹40,000"],
    ],
)

# ── 5. Database Schema ───────────────────────────────────────────────────────
doc.add_heading("5. Database Schema Summary", level=1)
add_table(doc,
    ["Table", "Rows", "Purpose"],
    [
        ["dealers", "30", "Dealer master (ID, name, city, state, zone, type)"],
        ["vehicles", "25,000", "Vehicle master (VIN, model, variant, arrival date)"],
        ["vehicle_sales", "15,078", "Completed sales (price, discount, days-to-sell)"],
        ["customers", "25,000", "Customer registry (name, contact, ownership)"],
        ["job_cards", "45,000", "Workshop service visits"],
        ["job_card_line_items", "76,364", "Parts consumed per service"],
        ["parts", "~500", "Spare parts master (SKU, ROP, MOQ)"],
        ["demand_records", "113,923", "Daily parts demand per dealer"],
        ["daily_trends", "~5,000", "Aggregated demand trends"],
        ["routes", "925", "Road distances (870 real from OpenRouteService)"],
        ["shipments", "~7,000", "Logistics shipments with delay tracking"],
        ["carriers", "~50", "Carrier master (on-time %)"],
        ["warehouses", "~20", "Warehouse master"],
        ["soq_transactions", "~10,000", "System order quantity records"],
    ],
)
doc.add_paragraph("Total database size: 81–90 MB (SQLite)")

# ── 6. Strengths ─────────────────────────────────────────────────────────────
doc.add_heading("6. Strengths (Pros)", level=1)

doc.add_heading("Architecture & Engineering", level=2)
add_table(doc,
    ["Strength", "Detail"],
    [
        ["Comprehensive domain simulation", "14 tables, 350K+ rows simulating Wipro DMS, SAP B1, and Manesar Transit"],
        ["Modern tech stack", "FastAPI + SQLAlchemy 2.0 + Pydantic v2 + Vite + React + TailwindCSS"],
        ["Clean API design", "RESTful, versioned (/api/v1/), paginated, filtered, auto-generated OpenAPI docs"],
        ["Real geographic data", "870 actual road distances from OpenRouteService API"],
        ["Two-stage ML model", "XGBClassifier + XGBRegressor handles zero-inflated sales data correctly"],
        ["Dual LLM strategy", "Groq LLaMA for fast NLQ + Gemini 2.5 Flash for premium messages, with fallback"],
        ["Intentional edge cases", "Stockouts, aging stock, demand mismatches mathematically engineered"],
    ],
)

doc.add_heading("Business Value & UX", level=2)
add_table(doc,
    ["Strength", "Detail"],
    [
        ["Human-in-the-loop workflow", "AI recommends → Manager reviews → Approves/Rejects → Email sent"],
        ["Financial quantification", "Every recommendation has a rupee value (floorplan burn, net utility)"],
        ["Professional email automation", "Branded HTML emails with tables and action items"],
        ["Role-based alert filtering", "Filters by parts_manager / logistics_coordinator / dealer_principal"],
        ["NLQ conversational interface", "Natural language queries with session memory and follow-ups"],
        ["ROI reporting", "Baseline-vs-AI comparison ready for CEO presentations"],
        ["Excellent documentation", "616-line functional document + ML model docs + README"],
    ],
)

# ── 7. Weaknesses ────────────────────────────────────────────────────────────
doc.add_heading("7. Weaknesses (Cons)", level=1)

doc.add_heading("Critical & High Issues", level=2)
add_table(doc,
    ["Issue", "Severity", "Detail", "Fix"],
    [
        ["Hardcoded API keys", "CRITICAL", "Groq API key hardcoded in gemini_service.py line 375", "Move to .env"],
        ["Hardcoded absolute paths", "CRITICAL", "demand_forecast.py has C:\\Users\\BalajiY\\... path", "Use relative paths"],
        ["No authentication", "CRITICAL", "All endpoints publicly accessible", "Add JWT auth"],
        ["CORS wildcard", "HIGH", 'allow_origins=["*"] is a security risk', "Restrict to frontend origin"],
        ["SQL string building", "HIGH", "f-string SQL WHERE clause construction in main.py", "Use SQLAlchemy ORM queries"],
    ],
)

doc.add_heading("Architectural Limitations", level=2)
add_table(doc,
    ["Issue", "Severity", "Detail", "Fix"],
    [
        ["SQLite database", "HIGH", "No concurrent write support, single-file", "Migrate to PostgreSQL"],
        ["In-memory approval store", "HIGH", "Dict resets on server restart", "Persist to DB table"],
        ["In-memory NLQ sessions", "MEDIUM", "Max 100 sessions, no persistence", "Use Redis or DB"],
        ["Static reference date", "MEDIUM", "julianday('2025-12-31') hardcoded throughout", "Use julianday('now')"],
        ["Monolithic main.py", "MEDIUM", "2,019 lines in single file", "Split into FastAPI routers"],
        ["No database migrations", "MEDIUM", "Schema changes require re-running generate_data.py", "Add Alembic"],
        ["No caching layer", "MEDIUM", "Expensive queries hit DB on every request", "Add Redis caching"],
    ],
)

doc.add_heading("ML Model Issues", level=2)
add_table(doc,
    ["Issue", "Severity", "Detail", "Fix"],
    [
        ["56.7% MAPE", "MEDIUM", "Acceptable for POC, not production-grade", "More data, external features"],
        ["One year training data", "MEDIUM", "Cannot learn yearly seasonality shifts", "Collect 2-3 years"],
        ["No retraining pipeline", "MEDIUM", "Model trained once offline", "Add MLflow + scheduling"],
        ["Static forecast", "MEDIUM", "forecast_output.json pre-computed at startup", "On-demand forecasting"],
    ],
)

doc.add_heading("Frontend & Data Issues", level=2)
add_table(doc,
    ["Issue", "Severity", "Detail"],
    [
        ["Hardcoded API URL", "MEDIUM", "http://127.0.0.1:8000 in useApiData.ts"],
        ["Mixed JSX/TSX", "LOW", "Some files are .jsx while rest is .tsx"],
        ["No test coverage", "MEDIUM", "Test infra exists but no tests written"],
        ["Synthetic data only", "MEDIUM", "Numbers directionally correct, not operationally precise"],
        ["Guided Assistant data inconsistency", "MEDIUM", "Uses job_cards instead of stock_arrival_date for aging"],
    ],
)

# ── 8. Production Readiness ──────────────────────────────────────────────────
doc.add_heading("8. Production Readiness Scorecard", level=1)
add_table(doc,
    ["Category", "Score (out of 5)", "Notes"],
    [
        ["Functionality", "★★★★★", "12+ pages, 25+ endpoints, ML + GenAI"],
        ["Data Realism", "★★★★", "Real distances, engineered edge cases"],
        ["UI/UX", "★★★★", "Modern dashboard with animations and charts"],
        ["Code Quality", "★★★", "Good separation but monolithic main.py"],
        ["Security", "★★", "No auth, hardcoded keys, CORS wildcard"],
        ["Scalability", "★★", "SQLite, in-memory stores, no caching"],
        ["Testing", "★", "Infrastructure exists, no tests written"],
        ["ML Maturity", "★★★", "Smart two-stage model, MAPE needs improvement"],
        ["DevOps", "★★", "No Docker, no CI/CD"],
        ["Documentation", "★★★★★", "616-line functional doc, excellent"],
    ],
)
p = doc.add_paragraph()
r = p.add_run("Overall POC Grade: B+ (Strong POC, needs hardening for production)")
r.bold = True
r.font.size = Pt(13)
r.font.color.rgb = RGBColor(0, 48, 135)

# ── 9. Recommendations ──────────────────────────────────────────────────────
doc.add_heading("9. Recommendations for Production", level=1)

doc.add_heading("Immediate (Week 1)", level=2)
doc.add_paragraph("Remove hardcoded API keys from source code", style="List Number")
doc.add_paragraph("Add JWT authentication to all endpoints", style="List Number")
doc.add_paragraph("Restrict CORS to specific frontend origin", style="List Number")
doc.add_paragraph("Replace hardcoded file paths with relative/env-based paths", style="List Number")

doc.add_heading("Short-Term (Weeks 2–4)", level=2)
doc.add_paragraph("Split main.py into FastAPI routers (inventory, aging, sales, genai)", style="List Number")
doc.add_paragraph("Migrate SQLite to PostgreSQL", style="List Number")
doc.add_paragraph("Persist approval store and NLQ sessions to database", style="List Number")
doc.add_paragraph("Replace static 2025-12-31 date with datetime.now()", style="List Number")
doc.add_paragraph("Add Docker + docker-compose for deployment", style="List Number")

doc.add_heading("Medium-Term (Months 2–3)", level=2)
doc.add_paragraph("Add Alembic for database migrations", style="List Number")
doc.add_paragraph("Set up MLflow for model versioning and scheduled retraining", style="List Number")
doc.add_paragraph("Add Redis for caching expensive queries", style="List Number")
doc.add_paragraph("Write unit tests for all backend endpoints", style="List Number")
doc.add_paragraph("Migrate remaining JSX files to TypeScript", style="List Number")

# ── 10. File Reference ───────────────────────────────────────────────────────
doc.add_heading("10. Key Files Reference", level=1)
add_table(doc,
    ["File", "Lines", "Purpose"],
    [
        ["main.py", "2,019", "FastAPI app — all 25+ API endpoints"],
        ["models.py", "508", "SQLAlchemy ORM + Pydantic response schemas"],
        ["gemini_service.py", "391", "Gemini 2.5 Flash + Groq LLaMA integration"],
        ["email_service.py", "261", "SMTP email sender with branded HTML templates"],
        ["distance_service.py", "49", "Road distance lookups from routes table"],
        ["demand_forecast.py", "264", "XGBoost two-stage model training + forecasting"],
        ["generate_data.py", "~600", "Data ingestion + edge case engineering"],
        ["useApiData.ts", "628", "All React data-fetching hooks (28 exports)"],
        ["App.tsx", "63", "Frontend routing + context providers"],
    ],
)

# ── Footer ───────────────────────────────────────────────────────────────────
doc.add_page_break()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("\n\nEnd of Report")
r.font.size = Pt(14)
r.font.color.rgb = RGBColor(128, 128, 128)
p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
p2.add_run(
    "This is a strong POC that convincingly demonstrates the business value of AI "
    "in automotive dealer network management. The main gaps are security and scalability — "
    "both expected for a POC but must be addressed before production deployment."
).font.size = Pt(11)

doc.save(OUTPUT)
print(f"Report saved to: {OUTPUT}")
