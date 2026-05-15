from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

def h(text, level):
    doc.add_heading(text, level=level)

def p(text, bold=False, size=11):
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.bold = bold
    run.font.size = Pt(size)
    return para

def tbl(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    hdr = t.rows[0].cells
    for i, h2 in enumerate(headers):
        hdr[i].text = h2
        hdr[i].paragraphs[0].runs[0].bold = True
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = str(v)
    doc.add_paragraph()

def bullet(items):
    for item in items:
        doc.add_paragraph(item, style='List Bullet')

# ── Cover Page ──────────────────────────────────────────────────────────────
doc.add_paragraph()
tp = doc.add_paragraph()
tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tp.add_run('Automotive Dealer Network AI Copilot')
r.bold = True; r.font.size = Pt(24)

sp = doc.add_paragraph()
sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
sp.add_run('Proof of Concept — Project Report').font.size = Pt(16)

doc.add_paragraph()
mp = doc.add_paragraph()
mp.alignment = WD_ALIGN_PARAGRAPH.CENTER
mp.add_run(
    'Domain: Automotive Supply Chain | OEM: Maruti Suzuki Dealer Network\n'
    'Stack: Python FastAPI + SQLite + React + XGBoost + Gemini 2.5 Flash\n'
    'Report Date: May 2026'
)
doc.add_page_break()

# ── 1. Introduction ─────────────────────────────────────────────────────────
h('1. Introduction', 1)
p('The Automotive Dealer Network AI Copilot is a Proof of Concept (POC) designed to '
  'simulate an intelligent command center for a multi-dealer automotive network. '
  'Built for the Maruti Suzuki dealer ecosystem, the system covers 30 dealers across '
  'India and addresses three high-impact operational challenges that cost OEM dealer '
  'networks crores of rupees annually.')
p('This project integrates a modern full-stack architecture — a Python FastAPI backend, '
  'a React frontend, a SQLite relational database, an XGBoost machine learning model, '
  'and Google Gemini 2.5 Flash for generative AI — into a unified, actionable platform.')
p('The POC was developed as a 3-week sprint to demonstrate AI-driven decision making '
  'in a realistic automotive supply chain scenario without exposing live enterprise data.')

# ── 2. Problem Statement ─────────────────────────────────────────────────────
h('2. Problem Statement', 1)
p('Automotive dealer networks face three recurring operational problems that cost the '
  'industry crores annually. Without an integrated AI platform, these problems are '
  'identified too late, quantified inaccurately, and resolved reactively.')

h('2.1 Aging Vehicle Stock', 2)
p('Vehicles that remain unsold on dealer lots accumulate floorplan financing interest '
  'at approximately 1% per month on invoice values of Rs. 8 lakh or more. A car sitting '
  'unsold for 90 days incurs Rs. 24,000 in accumulated interest. Without an intelligent '
  'system, dealer principals have no real-time visibility into which vehicles are aging, '
  'how much they are costing, or where they should be transferred.')

h('2.2 Spare Parts Stockouts', 2)
p('Spare parts falling below the Reorder Point (ROP) cause service delays and lost '
  'aftersales revenue. With 30 dealers and 500+ SKUs, manually tracking every '
  'dealer-part combination is impractical. Critical stockouts — especially zero-stock '
  'situations — can halt workshop operations entirely.')

h('2.3 Transit Logistics Delays', 2)
p('Shipments from warehouses to dealers that are overdue create downstream disruptions '
  'in service and sales. Some shipments are delayed by 300+ days with no escalation '
  'mechanism in place. There is no unified view of which shipments are critically '
  'delayed and what corrective action to take.')

# ── 3. Objectives ────────────────────────────────────────────────────────────
h('3. Project Objectives', 1)
bullet([
    'Identify aging vehicle stock across all 30 dealers and quantify floorplan interest burn.',
    'Recommend optimal vehicle transfers using ML-forecasted demand and real road distances.',
    'Flag spare parts at or below reorder point across the dealer network.',
    'Surface delayed shipments with real delay calculations and generate escalation messages.',
    'Generate AI-drafted B2B transfer proposals, B2C outreach messages, and operational alerts.',
    'Implement a human-in-the-loop approval workflow for AI recommendations.',
    'Quantify ROI of the AI Copilot vs. the baseline (pre-AI) state.',
    'Provide a 10-tab executive dashboard for dealer principals and OEM leadership.',
])

# ── 4. Architecture ──────────────────────────────────────────────────────────
h('4. System Architecture', 1)
p('The system follows a layered architecture with clear separation of concerns across '
  'data ingestion, business logic, AI/ML processing, and presentation layers.')

h('4.1 Architecture Layers', 2)
tbl(
    ['Layer', 'Technology', 'Purpose'],
    [
        ('Frontend', 'React + Vite + TailwindCSS + Recharts', '10-tab dashboard UI'),
        ('API Layer', 'Python FastAPI + Uvicorn', '25+ REST endpoints'),
        ('ORM / Database', 'SQLAlchemy 2.0 + SQLite (~90 MB)', 'Relational data store'),
        ('ML Engine', 'XGBoost Two-Stage Model', '30-day demand forecast (270 dealer-variants)'),
        ('GenAI Layer', 'Google Gemini 2.5 Flash via Vertex AI', 'Message generation on demand'),
        ('Distance Service', 'OpenRouteService API', 'Real road distances (870 city pairs)'),
        ('Auth Layer', 'PyJWT + Passlib/bcrypt', 'JWT-based role authentication'),
        ('Containerization', 'Docker + Docker Compose', 'Deployment and environment isolation'),
    ]
)

h('4.2 End-to-End Data Flow', 2)
tbl(
    ['Step', 'Component', 'Description'],
    [
        ('1', 'Source CSVs', 'Customer_Bookings, Inventory_Parts, SAP_Parts, Wipro_Inventory, Manesar_Transit'),
        ('2', 'generate_data.py', 'Ingests CSVs and seeds the SQLite database with all 14 tables'),
        ('3', 'load_distances.py', 'Populates 870 real road distances from OpenRouteService into routes table'),
        ('4', 'demand_forecast.py', 'Trains two-stage XGBoost model; outputs forecast_output.json'),
        ('5', 'main.py (FastAPI)', 'Serves 25+ REST API endpoints on port 8000'),
        ('6', 'React Frontend', 'Renders 10 dashboard tabs consuming live API data on port 5173'),
        ('7', 'gemini_service.py', 'Calls Vertex AI to generate professional messages on demand'),
    ]
)

h('4.3 Backend Module Reference', 2)
tbl(
    ['File', 'Size', 'Purpose'],
    [
        ('main.py', '102 KB', 'FastAPI application — all 25+ API endpoints and business logic'),
        ('models.py', '25 KB', 'SQLAlchemy ORM models and Pydantic response schemas'),
        ('generate_data.py', '28 KB', 'Data ingestion from CSV/XLSX into SQLite'),
        ('gemini_service.py', '17 KB', 'Vertex AI / Gemini 2.5 Flash integration'),
        ('email_service.py', '17 KB', 'Email notification service'),
        ('ml_retraining.py', '15 KB', 'XGBoost model retraining pipeline'),
        ('auth.py', '5.7 KB', 'JWT authentication and role-based access control'),
        ('retraining_scheduler.py', '5.6 KB', 'Scheduled ML model refresh'),
        ('distance_service.py', '1.6 KB', 'Road distance lookup from routes table'),
    ]
)

# ── 5. Database Design ───────────────────────────────────────────────────────
h('5. Database Design', 1)
p('The SQLite database (dealer_network.db, ~90 MB) contains 14 tables representing '
  'the complete dealer network data across inventory, sales, logistics, parts, '
  'customers, and ML training domains.')
tbl(
    ['Table', 'Rows', 'Description'],
    [
        ('dealers', '30', 'Dealer master — ID, name, city, state, zone, type (A/B/C)'),
        ('vehicles', '25,000', 'Vehicle stock — VIN, model, variant, fuel type, arrival date, dealer'),
        ('vehicle_sales', '15,078', 'Sales transactions — VIN sold, date, price, discount, channel'),
        ('customers', '25,000', 'Customer master — name, contact, city, ownership history'),
        ('job_cards', '45,000', 'Workshop service visits — type, odometer, reason'),
        ('job_card_line_items', '76,364', 'Parts consumed per service visit'),
        ('parts', '~500', 'Spare parts master — SKU, description, category, ROP, MOQ'),
        ('demand_records', '113,923', 'Daily parts demand per dealer — qty on hand, ROP, stockout flag'),
        ('daily_trends', '~5,000', 'Aggregated daily demand trends per dealer'),
        ('routes', '925', 'Road distances between 30 dealer cities'),
        ('shipments', '~7,000', 'Logistics shipments — origin, destination, carrier, status'),
        ('carriers', '~50', 'Carrier master — name, mode, coverage, on-time %'),
        ('warehouses', '~20', 'Warehouse master — type, zone, city'),
        ('soq_transactions', '~10,000', 'System Order Quantity transactions'),
    ]
)

# ── 6. Features ──────────────────────────────────────────────────────────────
h('6. Feature Description', 1)
tbl(
    ['Tab', 'Feature', 'Description'],
    [
        ('1', 'Overview Dashboard', 'Executive health check — KPI cards, AI alert banner, inventory vs demand trend chart'),
        ('2', 'Vehicle Inventory', 'Browse 9,922 unsold vehicles; sales analytics with monthly trends and model breakdown'),
        ('3', 'Aging Stock Intelligence', 'Identifies aging vehicles, calculates floorplan burn, recommends Transfer/Discount/Hold'),
        ('4', 'Spare Parts & ROP', 'SAP B1 parts view — flags stockouts across 30 dealers with AI reorder recommendations'),
        ('5', 'Transit Logistics', 'Manesar Rail shipment tracker with real delay calculation and severity badges'),
        ('6', 'Demand Forecast', 'XGBoost 30-day variant demand forecast per dealer with accuracy metrics table'),
        ('7', 'AI Copilot Prompts', 'Ready-to-use B2C WhatsApp messages and operational alert drafts (copy in 1 click)'),
        ('8', 'Guided Assistant', 'Human-in-the-loop: Gemini drafts message, human manager approves before any action'),
        ('9', 'ROI Impact Report', 'Quantifies AI value vs baseline — floorplan savings, stockout reduction, days saved'),
        ('10', 'Customer Registry', '25,000 customer records with ownership history for targeted outreach'),
    ]
)

# ── 7. Business Logic ────────────────────────────────────────────────────────
h('7. Core Business Logic', 1)

h('7.1 Floorplan Cost Calculation', 2)
p('Floorplan financing is the cost of holding unsold vehicles financed by the OEM or bank.')
doc.add_paragraph(
    '  Daily Burn Rate  = (1% / 30) x Rs. 8,00,000 = Rs. 266.67/day\n'
    '  Total Burn       = (days_in_stock / 30) x 1% x invoice_value\n'
    '  Example: 90 days on Rs. 8L invoice = Rs. 24,000 accumulated interest'
)

h('7.2 Transfer Utility Score', 2)
p('The Net Utility Score determines whether transferring an aging vehicle is financially worthwhile:')
doc.add_paragraph(
    '  Net Utility = Floorplan Saved + (ML Demand Score x Rs.500) - Transport Cost\n'
    '  Transport Cost  = road_distance_km x Rs.12/km (real OpenRouteService distances)\n\n'
    '  Decision Rules:\n'
    '    Net Utility > 0             -> Transfer (financially worth moving)\n'
    '    Net Utility < 0 + days > 90 -> Discount (too costly to transfer)\n'
    '    Otherwise                   -> Hold (not urgent yet)'
)

h('7.3 Reorder Point Logic', 2)
doc.add_paragraph(
    '  Stockout Alert  = on_hand_qty < reorder_point\n'
    '  EOQ (order qty) = max(reorder_point x 1.5, 10)\n'
    '  Severity: Critical if qty=0 | High if gap > ROP x 50% | else Medium'
)

h('7.4 Shipment Delay Calculation', 2)
doc.add_paragraph(
    '  Real delay = actual_arrival - expected_arrival (days)\n'
    '  If no actual arrival: delay = 2025-12-31 - expected_arrival\n'
    '  Severity: Critical >= 5 days | High >= 3 days | else Medium'
)

# ── 8. ML Model ──────────────────────────────────────────────────────────────
h('8. Machine Learning — XGBoost Demand Forecast', 1)

h('8.1 Objective', 2)
p('The XGBoost model answers: "How many units of variant X will dealer Y sell in the '
  'next 30 days?" This forecast powers the Transfer Utility Score, replacing gut feel '
  'with a data-driven demand signal for 270 dealer-variant combinations.')

h('8.2 Model Evolution (3 Iterations)', 2)
tbl(
    ['Iteration', 'Data Source', 'Approach', 'MAE', 'MAPE', 'Outcome'],
    [
        ('1', 'Parts demand (proxy)', 'Single XGBoost Regressor', '6.19', '161.1%', 'Wrong signal — parts demand != vehicle sales'),
        ('2', 'Vehicle sales (direct)', 'Single XGBoost Regressor', '1.28', '82.9%', 'Improved but high MAPE from zero-sale days'),
        ('3 (Final)', 'Vehicle sales (direct)', 'Two-Stage XGBoost', '1.21', '56.7%', 'Best — zero-inflation handled correctly'),
    ]
)

h('8.3 Two-Stage Architecture', 2)
p('Stage 1 — XGBClassifier: Predicts whether any sale will occur (binary 0/1). '
  'Handles class imbalance with scale_pos_weight. F1 score used as primary metric.')
p('Stage 2 — XGBRegressor: Trained only on days where units_sold > 0. '
  'Learns "when a sale happens, how many?" without zero-day bias.')
p('Final Prediction = P(sale) x predicted_quantity')

h('8.4 Feature Engineering (21 Features)', 2)
tbl(
    ['Feature Group', 'Features', 'Description'],
    [
        ('Dealer Identity', 'dealer_enc, zone_enc, type_enc', 'Encoded dealer ID, zone, and tier (A/B/C)'),
        ('Calendar', 'dow, dom, month, week, quarter', 'Day-of-week, day-of-month, month, ISO week, quarter'),
        ('Boundary Flags', 'is_weekend, is_mth_start, is_mth_end', 'Weekend and month boundary indicators'),
        ('Lag Features', 'lag_1, lag_7, lag_14, lag_30', 'Sales 1, 7, 14, and 30 days prior'),
        ('Rolling Stats', 'roll_7, roll_30, std_7', '7-day and 30-day rolling mean; 7-day std dev'),
        ('Promo Signals', 'promotion_flag, festive_flag, promo_last_7d', 'Active promotion, festive season, promo count last 7 days'),
    ]
)

h('8.5 Final Model Performance by Variant', 2)
tbl(
    ['Variant', 'MAE', 'RMSE', 'R2', 'MAPE*', 'SMAPE', 'F1 (Sale)'],
    [
        ('AGS',     '1.08', '1.36', '0.270', '56.4%', '96.3%', '0.799'),
        ('AT',      '1.10', '1.41', '0.383', '54.5%', '89.3%', '0.839'),
        ('Alpha',   '1.15', '1.47', '0.312', '52.4%', '84.1%', '0.859'),
        ('Delta',   '1.24', '1.59', '0.345', '56.6%', '79.7%', '0.864'),
        ('LXI',     '1.39', '1.74', '0.422', '57.5%', '61.6%', '0.926'),
        ('MT',      '1.23', '1.57', '0.446', '56.1%', '77.8%', '0.868'),
        ('Sigma',   '1.32', '1.62', '0.309', '64.2%', '76.6%', '0.885'),
        ('VXI',     '1.39', '1.75', '0.410', '62.3%', '66.6%', '0.919'),
        ('ZXI',     '1.02', '1.33', '0.298', '49.9%', '96.1%', '0.805'),
        ('AVERAGE', '1.21', '-',    '-',     '56.7%', '80.9%', '0.863'),
    ]
)
p('* MAPE calculated on non-zero actual days only (standard industry practice)')

# ── 9. Statistics ─────────────────────────────────────────────────────────────
h('9. Project Statistics', 1)

h('9.1 Dataset Statistics', 2)
tbl(
    ['Metric', 'Value'],
    [
        ('Total Vehicles in System', '25,000'),
        ('Total Vehicles Sold', '15,078'),
        ('Unsold Stock', '9,922'),
        ('Sell-Through Rate', '60.3%'),
        ('Average Days to Sell', '38.8 days'),
        ('Total Network Revenue', 'Rs. 1,336 Crore'),
        ('Finance Taken (% of sales)', '~65%'),
        ('Exchange Vehicle (% of sales)', '~25%'),
        ('Total Customers', '25,000'),
        ('Job Cards (service visits)', '45,000'),
        ('Job Card Line Items', '76,364'),
        ('Spare Parts SKUs', '~500'),
        ('Demand Records', '113,923'),
        ('Shipments', '~7,000'),
        ('Road Distance Pairs (real)', '870'),
        ('ML Training Rows', '98,550 (30 dealers x 9 variants x 365 days)'),
        ('ML Dealer-Variant Combinations', '270'),
        ('API Endpoints', '25+'),
        ('Frontend Tabs', '10'),
        ('Active Dealers', '30 (across India)'),
    ]
)

h('9.2 Aging Stock Breakdown (as of 2025-12-31)', 2)
tbl(
    ['Age Bucket', 'Days', 'Vehicle Count', 'Business Meaning'],
    [
        ('Fresh',    '< 30 days',  '4,025', 'Just arrived — no concern'),
        ('Watch',    '30-59 days', '2,488', 'Monitor — approaching aging threshold'),
        ('Aging',    '60-89 days', '1,918', 'Floorplan interest burning — action needed'),
        ('Critical', '90+ days',   '1,491', 'Urgent — transfer or discount immediately'),
    ]
)

h('9.3 API Endpoint Reference', 2)
tbl(
    ['Endpoint', 'Method', 'Description'],
    [
        ('/api/v1/wipro/inventory/summary', 'GET', 'Unsold vehicle counts by status'),
        ('/api/v1/wipro/inventory', 'GET', 'Paginated unsold vehicle list with filters'),
        ('/api/v1/sap/parts/summary', 'GET', 'Parts stockout summary'),
        ('/api/v1/sap/parts', 'GET', 'Paginated parts list with filters'),
        ('/api/v1/rail/transit/summary', 'GET', 'Shipment status counts'),
        ('/api/v1/rail/transit', 'GET', 'Paginated shipment list with real delay calc'),
        ('/api/v1/aging/summary', 'GET', 'Aging stock KPIs'),
        ('/api/v1/aging/vehicles', 'GET', 'All aging unsold vehicles'),
        ('/api/v1/aging/transfers', 'GET', 'Transfer recommendations with net utility score'),
        ('/api/v1/forecast/summary', 'GET', 'XGBoost model summary and top dealer-variant pairs'),
        ('/api/v1/forecast/variants', 'GET', 'Daily 30-day forecasts per dealer-variant'),
        ('/api/v1/genai/b2c-prompts', 'GET', 'B2C outreach prompts for aging vehicles'),
        ('/api/v1/genai/operational-alerts', 'GET', 'Stockout and transit delay alert prompts'),
        ('/api/v1/guided/recommendations', 'GET', 'Human-in-the-loop recommendation queue'),
        ('/api/v1/guided/approve/{id}', 'POST', 'Approve a recommendation'),
        ('/api/v1/guided/reject/{id}', 'POST', 'Reject a recommendation with reason'),
        ('/api/v1/ai/generate-b2b', 'POST', 'Generate B2B transfer proposal via Gemini'),
        ('/api/v1/ai/generate-b2c', 'POST', 'Generate B2C outreach message via Gemini'),
        ('/api/v1/ai/generate-alert', 'POST', 'Generate operational alert message via Gemini'),
        ('/api/v1/roi/report', 'GET', 'ROI impact report'),
        ('/api/v1/sales/summary', 'GET', 'Sales KPIs — sell-through, revenue, avg days'),
        ('/api/v1/sales/monthly-trend', 'GET', 'Monthly sales volume and avg days to sell'),
        ('/api/v1/sales/by-model', 'GET', 'Sales breakdown by vehicle model'),
        ('/api/v1/customers', 'GET', 'Customer list with search and ownership filters'),
        ('/api/v1/distance', 'GET', 'Real road distance between two cities'),
    ]
)

# ── 10. Technology Stack ──────────────────────────────────────────────────────
h('10. Technology Stack', 1)
tbl(
    ['Category', 'Technology', 'Version', 'Purpose'],
    [
        ('Backend Framework', 'Python FastAPI', '0.115', 'High-performance async REST API'),
        ('ASGI Server', 'Uvicorn', '0.30.6', 'Production ASGI server'),
        ('ORM', 'SQLAlchemy', '2.0.36', 'Database abstraction and query layer'),
        ('Data Validation', 'Pydantic', '2.9.2', 'Request/response schema validation'),
        ('Database', 'SQLite', '~90 MB', 'Relational data store'),
        ('ML Framework', 'XGBoost', '>= 2.0', 'Gradient boosting demand forecast'),
        ('Data Processing', 'Pandas', '2.2.3', 'Data manipulation and analysis'),
        ('Authentication', 'PyJWT + Passlib', '2.8.0', 'JWT tokens with bcrypt hashing'),
        ('Frontend Framework', 'React + Vite', 'Latest', 'Component-based SPA'),
        ('Styling', 'TailwindCSS', 'Latest', 'Utility-first CSS framework'),
        ('Charts', 'Recharts', 'Latest', 'Declarative React chart library'),
        ('Animation', 'Framer Motion', 'Latest', 'UI micro-animations and transitions'),
        ('Generative AI', 'Google Gemini 2.5 Flash', 'Latest', 'Message generation via Vertex AI'),
        ('Distance Data', 'OpenRouteService API', '-', 'Real road distances (870 city pairs)'),
        ('Containerization', 'Docker + Docker Compose', 'Latest', 'Deployment containerization'),
    ]
)

# ── 11. Limitations ───────────────────────────────────────────────────────────
h('11. Known Limitations (POC Context)', 1)
tbl(
    ['Limitation', 'Impact', 'Production Fix'],
    [
        ('Synthetic data', 'Numbers are directionally correct, not operationally precise', 'Connect to real Wipro DMS and SAP B1 APIs'),
        ('One year of ML training data', 'Cannot fully learn yearly seasonality; MAPE at 56.7%', '2-3 years of real history -> MAPE ~25-30%'),
        ('SQLite database', 'Not suitable for concurrent multi-user production access', 'Migrate to PostgreSQL'),
        ('Vertex AI credentials required', 'Requires Google Cloud project setup per machine', 'Use Gemini API key (free tier) for demo sharing'),
        ('Static reference date (2025-12-31)', 'Aging calculations use a fixed date', 'Replace with julianday(now) for live deployment'),
        ('High SMAPE for AGS and ZXI', '~96% SMAPE due to low-volume variants', 'Dealer-specific models for low-volume variants'),
    ]
)

# ── 12. Conclusion ────────────────────────────────────────────────────────────
h('12. Conclusion', 1)
p('The Automotive Dealer Network AI Copilot POC successfully demonstrates that an '
  'integrated AI platform can transform reactive dealer network management into a '
  'proactive, data-driven operation. Across three weeks of development, the system '
  'evolved from a data seeding exercise into a full-stack AI command center covering '
  'inventory intelligence, demand forecasting, parts management, logistics tracking, '
  'and generative AI communication.')

p('Key Achievements:', bold=True)
bullet([
    'Two-Stage XGBoost model achieving MAE of 1.21 units/day — an 80% improvement over the baseline — for 30-day demand forecasting across 270 dealer-variant combinations.',
    'Transfer Utility Score algorithm combining ML demand forecasts with real road distances and floorplan cost to recommend optimal vehicle transfers.',
    'Real-time identification of 3,409 aging and critical vehicles (60+ and 90+ days) representing significant floorplan interest burn across the 30-dealer network.',
    'Human-in-the-loop Guided Assistant: Gemini 2.5 Flash drafts professional B2B/B2C messages; human managers approve before any action is taken — the correct enterprise AI governance posture.',
    'ROI Impact Report quantifying floorplan savings, stockout reduction, and days-in-inventory reduction — directly answering C-suite questions about AI return on investment.',
    'Scalable architecture ready for production migration: PostgreSQL, real DMS/SAP API connectors, and cloud deployment via Docker and Docker Compose.',
])

doc.add_paragraph()
p('Production Roadmap:', bold=True)
bullet([
    'Connect to live Wipro DMS and SAP B1 data APIs to replace synthetic data.',
    'Migrate database from SQLite to PostgreSQL for concurrent multi-user access.',
    'Expand ML training dataset to 2-3 years of actual sales history (expected MAPE: 25-30%).',
    'Implement scheduled monthly model retraining via retraining_scheduler.py.',
    'Add dealer-specific XGBoost models for the top 10 high-volume dealers.',
    'Deploy on Google Cloud Run or GKE with Vertex AI integration for Gemini.',
])

doc.add_paragraph()
p('This system is ready to be demonstrated to OEM supply chain leadership as a '
  'blueprint for the next generation of automotive dealer operations management. '
  'The POC validates that AI-driven dealer network management is technically feasible, '
  'financially quantifiable, and operationally valuable.', bold=True)

# ── Save ─────────────────────────────────────────────────────────────────────
out = r'c:\Users\RamanachandranRS\Professional\New folder\poc\Project_Report_Final.docx'
doc.save(out)
print(f'Report saved: {out}')
