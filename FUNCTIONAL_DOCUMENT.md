# Automotive Dealer Network AI Copilot — Functional Document

**Project Type:** Proof of Concept (POC)  
**Domain:** Automotive Supply Chain — Multi-Dealer Network  
**OEM Context:** Maruti Suzuki dealer network (30 dealers across India)  
**Stack:** Python FastAPI + SQLite + React + XGBoost + Gemini 2.5 Flash  
**Document Version:** April 2026

---

## 1. What This Project Does

This POC simulates an AI-powered command center for a multi-dealer automotive network. It solves three real operational problems that cost OEM dealer networks crores every year:

1. **Aging Stock** — vehicles sitting unsold on dealer lots accumulate floorplan interest at ~1% per month on ₹8L+ invoice value. The system identifies these vehicles, calculates the financial burn, and recommends whether to transfer them to a higher-demand dealer or offer a discount.

2. **Parts Stockouts** — spare parts falling below reorder point (ROP) cause service delays and lost revenue. The system flags every dealer-part combination that is at or below ROP and generates operational alerts.

3. **Transit Delays** — shipments from warehouses to dealers that are overdue. The system surfaces these with real delay calculations and generates escalation messages.

The AI layer (Gemini 2.5 Flash + XGBoost) transforms raw data into actionable recommendations with professional messages ready to send — B2B transfer proposals, B2C customer outreach, and operational alerts.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│         (Vite + TailwindCSS + Recharts + Framer)        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP REST API
┌────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend                         │
│              main.py + distance_service.py              │
│              gemini_service.py + models.py              │
└────────────────────┬────────────────────────────────────┘
                     │ SQLAlchemy ORM
┌────────────────────▼────────────────────────────────────┐
│              SQLite Database                             │
│           dealer_network.db (81 MB)                     │
└─────────────────────────────────────────────────────────┘
                     +
┌─────────────────────────────────────────────────────────┐
│              ML Model (XGBoost)                         │
│     demand_forecast.py → data/forecast_output.json      │
└─────────────────────────────────────────────────────────┘
                     +
┌─────────────────────────────────────────────────────────┐
│           Google Vertex AI / Gemini 2.5 Flash           │
│                  gemini_service.py                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Data — What We Have and Where It Comes From

### 3.1 Database Tables

| Table | Rows | What It Represents |
|---|---|---|
| `dealers` | 30 | Dealer master — ID, name, city, state, zone, type (A/B/C) |
| `vehicles` | 25,000 | Vehicle master — every VIN with model, variant, fuel type, stock arrival date, dealer |
| `vehicle_sales` | 15,078 | Actual sales transactions — VIN sold, sale date, price, discount, channel, finance |
| `customers` | 25,000 | Customer master — name, contact, city, state, ownership history |
| `job_cards` | 45,000 | Workshop service visits — service type, odometer, visit reason |
| `job_card_line_items` | 76,364 | Parts consumed per service visit |
| `parts` | ~500 | Spare parts master — SKU, description, category, ROP, MOQ |
| `demand_records` | 113,923 | Daily parts demand per dealer — qty on hand, ROP, stockout flag |
| `daily_trends` | ~5,000 | Aggregated daily demand trends per dealer |
| `routes` | 925 | Road distances between cities (870 real city-pair distances from OpenRouteService API) |
| `shipments` | ~7,000 | Logistics shipments — origin, destination, carrier, status, delay |
| `carriers` | ~50 | Carrier master — name, mode, coverage, on-time % |
| `warehouses` | ~20 | Warehouse master — type, zone, city |
| `soq_transactions` | ~10,000 | System Order Quantity transactions |

### 3.2 Key Data Distinction — Inventory vs Sales

**vehicles table** = Stock master register. Every VIN that arrived at a dealer showroom. Has `stock_arrival_date` = the day the car arrived unsold.

**vehicle_sales table** = Sales transactions. Every VIN that was actually sold to a customer. Has `sale_date`, `days_to_sell`, `invoice_value_inr`, `discount_given_inr`.

**True unsold showroom stock** = vehicles NOT present in vehicle_sales. This is 9,922 vehicles.

**job_cards table** = Workshop service visits for cars already owned by customers. These are NOT new car sales. A car in job_cards is a customer's existing vehicle coming in for Periodic Service, General Repair, Accident Repair, or Inspection.

### 3.3 Unsold Stock Breakdown (as of 2025-12-31)

| Age Bucket | Days | Count | Meaning |
|---|---|---|---|
| Fresh | < 30 days | 4,025 | Just arrived, no concern |
| Watch | 30–59 days | 2,488 | Monitor — approaching aging threshold |
| Aging | 60–89 days | 1,918 | Floorplan interest burning — action needed |
| Critical | 90+ days | 1,491 | Urgent — transfer or discount immediately |

### 3.4 Sales Data Summary

| Metric | Value |
|---|---|
| Total vehicles sold | 15,078 |
| Total unsold stock | 9,922 |
| Sell-through rate | ~60.3% |
| Average days to sell | 38.8 days |
| Total network revenue | ₹1,336 Crore |
| Finance taken | ~65% of sales |
| Exchange vehicle | ~25% of sales |

### 3.5 ML Training Data

**File:** `data/vehicle_sales_transactions.csv`  
**Rows:** 98,550  
**Structure:** 30 dealers × 9 variants × 365 days (full year 2025)  
**Purpose:** Training the XGBoost demand forecast model. This is separate from the `vehicle_sales` DB table — it is a purpose-built synthetic dataset with realistic seasonality, festive patterns, and dealer-tier volume differences.

### 3.6 Road Distance Data

**Source:** OpenRouteService API (real driving distances)  
**Coverage:** 30 dealer cities × 30 cities = 870 city pairs  
**Stored in:** `routes` table with `route_type = 'city_pair'`  
**Used for:** Calculating transport cost in transfer recommendations  
**Rate:** ₹12/km

---

## 4. Tab-by-Tab Functional Description

---

### Tab 1 — Overview

**Purpose:** Executive dashboard. Single-screen health check of the entire dealer network.

**What it shows:**
- AI Insights alert banner — fires automatically when aging stock > 0, parts stockouts > 0, or delayed shipments > 0. Shows exact counts with color-coded badges.
- 4 KPI stat cards:
  - Total Vehicles (unsold showroom stock)
  - Aging Stock (vehicles > 60 days unsold)
  - Parts Alerts (dealer-part combos below ROP)
  - Active Shipments (in-transit count)
- Area chart: Inventory vs Projected Demand — 7-month trend showing network-wide parts demand quantity vs inventory levels by month.

**Data sources:**
- `/api/v1/wipro/inventory/summary` — unsold vehicle counts
- `/api/v1/sap/parts/summary` — parts stockout counts
- `/api/v1/rail/transit/summary` — shipment status counts
- `/api/v1/overview/trends` — monthly demand vs inventory trend

**Business value:** A dealer principal or OEM supply chain head can see the entire network health in 10 seconds without drilling into any sub-page.

---

### Tab 2 — Vehicle Inventory (Stock Inventory sub-tab)

**Purpose:** Browse all unsold vehicles currently sitting in dealer showrooms.

**What it shows:**
- 4 stat cards: Total Stock (9,922), Available (≤60 days), Aging (>60 days), Critical (>90 days)
- Filter bar: search by VIN/model/dealer/variant, filter by status (Available/Aging), model, fuel type, dealer
- Paginated grid of vehicle cards (50 per page) showing:
  - Model name and variant
  - Status badge (Available = green, Aging = amber)
  - VIN (chassis number)
  - Dealer name
  - Fuel type
  - Days in stock (color-coded — amber if aging, green if available)

**Data source:** `/api/v1/wipro/inventory` — queries only vehicles NOT in vehicle_sales table

**Important:** Only shows unsold stock. Vehicles that have been sold are excluded. This is the correct showroom inventory view.

---

### Tab 2 — Vehicle Inventory (Sales Analytics sub-tab)

**Purpose:** Sales performance analysis — how fast are vehicles selling, which models move best, monthly revenue trends.

**What it shows:**
- 4 KPI cards: Total Sold (15,078), Unsold Stock (9,922), Sell-Through % (60.3%), Avg Days to Sell (38.8)
- Revenue / Finance / Avg Discount row
- Line chart: Monthly units sold + average days to sell (dual axis, Jan–Dec 2025)
- Bar chart: Units sold by model (top 10) with avg days to sell
- Full model breakdown table: model, units sold, total revenue, avg days to sell, avg discount

**Data sources:**
- `/api/v1/sales/summary`
- `/api/v1/sales/monthly-trend`
- `/api/v1/sales/by-model`

**Business value:** Shows which models are fast movers vs slow movers. Brezza and Swift typically sell fastest; aging models need discount or transfer action.

---

### Tab 3 — Aging Stock Intelligence

**Purpose:** The core AI intelligence page. Identifies aging vehicles, calculates financial burn, and recommends the optimal action for each vehicle.

**Sub-tabs:**

#### Transfer Recommendations sub-tab

Shows AI-generated transfer recommendations for every aging vehicle. For each vehicle:
- Source dealer → Target dealer (with city names)
- Age bucket badge (Critical/Aging/Watch)
- Recommendation badge (Transfer/Discount/Hold)
- Days in inventory
- Floorplan cost accumulated (₹)
- Transport cost (real road distance × ₹12/km)
- Net Utility Score (₹)

**Net Utility Formula:**
```
Net Utility = Floorplan Saved + (ML Demand Score × ₹500) - Transport Cost

Where:
  Floorplan Saved = (days / 30) × 1% × ₹8,00,000
  ML Demand Score = XGBoost 30-day forecast for (variant, target_dealer)
  Transport Cost  = real_road_distance_km × ₹12/km
```

**Decision logic:**
- Net Utility > 0 → **Transfer** (financially worth moving)
- Net Utility < 0 AND days > 90 → **Discount** (too expensive to move, cut price locally)
- Otherwise → **Hold** (not urgent yet)

Each card has an expandable formula breakdown showing exactly how the score was calculated, and an "AI Prompt" button that opens a modal with a ready-to-use B2B negotiation prompt for the dealer manager.

#### All Aging Vehicles sub-tab

Grid view of all aging vehicles with:
- Model, variant, age bucket
- VIN, dealer name, days in stock
- Total floorplan cost and daily burn rate (₹/day)

**Filters:** Min days (30/60/90), dealer, model, age bucket, search

**Data sources:**
- `/api/v1/aging/summary`
- `/api/v1/aging/vehicles`
- `/api/v1/aging/transfers`

**Business value:** Directly quantifies the financial cost of inaction. A vehicle sitting 120 days at ₹8L invoice = ₹32,000 in floorplan interest already burned. The transfer recommendation tells the manager exactly where to send it and why.

---

### Tab 4 — Spare Parts & ROP

**Purpose:** SAP B1 spare parts inventory view. Identifies which parts are at or below reorder point at which dealers.

**What it shows:**
- 4 stat cards: Unique SKUs, Dealer-Part Combos, Adequate, Stockout Alert (clickable to filter)
- Filter bar: search by SKU/part name, status (Adequate/Stockout Alert), category, dealer
- Paginated table (50 per page) with columns:
  - SKU (part number)
  - Part name / description
  - Category (High-Velocity Workshop Consumables, Periodic Maintenance Kits, etc.)
  - Quantity on hand
  - Reorder Point (ROP)
  - Status badge (Stockout Alert = red pulsing, Adequate = green)
  - AI Recommendation column:
    - Zero stock → "🚨 Order X units NOW — Zero stock — critical"
    - Below ROP → "⚠ Order X units — Y below ROP"
    - Low buffer → "Monitor — low buffer"
    - Healthy → "No action needed"

**Data sources:**
- `/api/v1/sap/parts/summary`
- `/api/v1/sap/parts`

**Business value:** A parts manager can instantly see which SKUs need emergency orders across all 30 dealers without manually checking SAP.

---

### Tab 5 — Transit Logistics

**Purpose:** Manesar Rail / logistics tracking. Shows all shipments with real delay calculations.

**What it shows:**
- 4 stat cards: Total Shipments, In Transit, Delivered, Delayed/Past Due (clickable to filter)
- Filter bar: search by shipment ID/carrier/city, status filter pills, transport mode, zone, dealer
- Paginated list of shipment cards showing:
  - Shipment ID + status badge (color-coded)
  - Carrier name, units, delay days
  - Origin → Destination with arrow (red arrow for delayed, blue for normal)
  - ETA date (red for delayed)

**Delay calculation:** Real delay = `actual_arrival - expected_arrival` in days. For shipments marked Delayed with no actual arrival yet, delay = `2025-12-31 - expected_arrival` (days overdue). This replaces the stored `delay_days` column which had data quality issues (many stored as 0).

**Data sources:**
- `/api/v1/rail/transit/summary`
- `/api/v1/rail/transit`

**Business value:** Logistics coordinator can see which shipments are critically overdue (some 300+ days) and take action — expedite, switch carrier, or arrange emergency stock transfer.

---

### Tab 6 — Demand Forecast

**Purpose:** XGBoost ML model output. Shows 30-day vehicle variant demand forecasts per dealer.

**What it shows:**
- 4 summary cards: Network Demand (30d total units), Top Variant, Top Dealer, Models Trained
- Model accuracy table — per variant metrics:
  - MAE (Mean Absolute Error) — avg units off per day
  - RMSE
  - R² (how much variance the model explains)
  - MAPE on non-zero days
  - SMAPE
  - F1 score (how well classifier detects sale vs no-sale days)
- Filters: dealer selector, variant selector
- Daily area chart (when filter active): 30-day daily forecast per variant
- Horizontal bar chart: Total 30-day demand by variant (network-wide)
- Top dealer × variant table: ranked by forecasted demand with MAPE chip

**ML Model Details:**
- Algorithm: Two-stage XGBoost (Classifier + Regressor)
- Stage 1: XGBClassifier — "Will there be a sale today?" (handles zero-inflation)
- Stage 2: XGBRegressor — "How many units?" (trained only on sale days)
- Features: 21 features including lag_1, lag_7, lag_30, rolling means, festive flags, dealer tier, zone
- Training data: `vehicle_sales_transactions.csv` (98,550 rows, full year 2025)
- Final MAPE: 56.7% (improved from 161% in iteration 1)
- Final MAE: 1.21 units/day

**Data source:** `data/forecast_output.json` (pre-computed, loaded at startup)

**Business value:** Instead of guessing which dealer to transfer an aging vehicle to, the system uses ML-forecasted demand to send it to the dealer most likely to sell it in the next 30 days.

---

### Tab 7 — AI Copilot Prompts

**Purpose:** Ready-to-use GenAI prompt templates for three business scenarios.

**Sub-tabs:**

#### B2C Outreach tab

Shows one card per aging unsold vehicle (threshold: 30/60/90 days, selectable). Each card:
- Vehicle model, variant, fuel type, age bucket
- Dealer name
- Days in showroom
- Discount estimate (scales with age: ₹15k at 60d, ₹25k at 90d, ₹40k at 120d+)
- "Copy Prompt" button — copies a WhatsApp/SMS message template
- "Preview" toggle — shows the full prompt text

**Prompt style:** Warm, personalised WhatsApp message to a customer who previously enquired about this variant. Mentions specific vehicle, time-sensitive discount, soft call-to-action.

#### Operational Alerts tab

Shows two types of alerts:

**Stockout alerts** — for every dealer-part combo below ROP:
- Part name, SKU, dealer ID
- Quantity gap (units below ROP)
- Severity badge (Critical/High/Medium)
- Prompt: Professional operations memo to parts manager with urgency level, recommended EOQ order quantity, business impact

**Transit delay alerts** — for delayed/past-due shipments:
- Shipment ID, part name, route (origin → destination)
- Carrier, delay days
- Severity badge
- Prompt: Escalation message to logistics coordinator with recommended action (expedite / alternative carrier / emergency stock transfer)

**Filters:** Severity (Critical/High/Medium), alert type (Stockout/Transit Delay)

**Data sources:**
- `/api/v1/genai/b2c-prompts`
- `/api/v1/genai/operational-alerts`

**Business value:** A dealer manager can copy a professionally written message in one click instead of drafting it manually. The AI knows the vehicle details, the financial context, and the urgency level.

---

### Tab 8 — Guided Assistant

**Purpose:** Human-in-the-loop AI workflow. The AI surfaces recommendations, generates messages with Gemini 2.5 Flash, and a human approves or rejects before anything is sent.

**What it shows:**
- 4 summary cards: Pending Review, Transfer Recs, Reorder Recs, Approved Today
- "How it works" explainer (4-step workflow)
- Tabs: Pending Review / Actioned

**Each recommendation card shows:**
- Type icon (transfer = blue arrows, stockout = amber package)
- Title and summary
- Priority badge (Critical/High/Medium) with left border color
- Status badge (Pending/Approved/Rejected)
- Key metrics (days in stock, floorplan cost, net utility for transfers; qty on hand, ROP, order qty for stockouts)
- "Generate Message with Gemini" button — calls Gemini 2.5 Flash to write the professional message
- Generated message display (after generation)
- "Approve & Send" button (enabled only after message is generated)
- "Reject" button with optional reason input
- "Raw Data" toggle — shows the full JSON payload

**Workflow:**
1. XGBoost + Heuristic Score identifies best action
2. Manager clicks "Generate Message with Gemini 2.5 Flash"
3. Gemini writes a professional B2B transfer proposal or stockout alert
4. Manager reads it, approves or rejects
5. Approved recommendations are logged

**Data source:** `/api/v1/guided/recommendations`

**Business value:** Prevents autonomous AI from making decisions without human oversight. The AI does the analysis and drafts the message; the human makes the final call. This is the correct enterprise deployment posture for 2025-26.

---

### Tab 9 — ROI Impact Report

**Purpose:** Quantifies the business value of the AI Copilot vs the Week 1 baseline (before AI).

**What it shows:**
- Hero card: Total projected floorplan interest saved (₹)
- AI summary paragraph (generated by Gemini)
- 4 metric comparison cards, each showing:
  - Metric name
  - Week 1 Baseline value
  - With AI Copilot value
  - Improvement % with animated progress bar
- Bar chart: Baseline vs AI side-by-side for top 3 metrics
- 4 bottom stat cards: Vehicles for Transfer, Avg Days Reduction, Stockout Alerts Raised, Floorplan Saved

**Metrics tracked:**
1. Average Days in Inventory (baseline vs AI-optimised)
2. Total Floorplan Interest Cost (₹ saved)
3. Parts Stockout Incidents (reduction)
4. Vehicles Recommended for Transfer (count)

**Data source:** `/api/v1/roi/report`

**Business value:** This is the slide that goes to the CEO or OEM head of supply chain. It answers "what did the AI actually save us?" with specific rupee figures.

---

### Tab 10 — Customers

**Purpose:** Customer registry from Wipro DMS. Browse and filter all 25,000 customers.

**What it shows:**
- 4 stat cards: Total Customers, 1st Owners, 2nd Owners, With Contact
- Filter bar: search by name/customer ID, state filter, ownership filter (1st/2nd/3rd owner)
- Table with columns: Customer ID, Name, Contact, Location (city + state), Ownership badge

**Ownership color coding:**
- 1st owner = green (primary new car buyers)
- 2nd owner = blue (pre-owned segment)
- 3rd owner = amber

**Data source:** `/api/v1/customers`

**Business value:** Enables targeted outreach. When a B2C prompt is generated for an aging vehicle, the sales team can look up customers in the same city who previously bought the same variant and reach out directly.

---

## 5. Backend API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/wipro/inventory/summary` | GET | Unsold vehicle counts by status |
| `/api/v1/wipro/inventory` | GET | Paginated unsold vehicle list with filters |
| `/api/v1/sap/parts/summary` | GET | Parts stockout summary |
| `/api/v1/sap/parts` | GET | Paginated parts list with filters |
| `/api/v1/rail/transit/summary` | GET | Shipment status counts |
| `/api/v1/rail/transit` | GET | Paginated shipment list with real delay calc |
| `/api/v1/overview/trends` | GET | Monthly demand vs inventory trend |
| `/api/v1/aging/summary` | GET | Aging stock KPIs (unsold only) |
| `/api/v1/aging/vehicles` | GET | All aging unsold vehicles |
| `/api/v1/aging/transfers` | GET | Transfer recommendations with net utility |
| `/api/v1/forecast/summary` | GET | XGBoost model summary + top pairs |
| `/api/v1/forecast/variants` | GET | Daily 30-day forecasts per dealer-variant |
| `/api/v1/genai/b2c-prompts` | GET | B2C outreach prompts for aging vehicles |
| `/api/v1/genai/operational-alerts` | GET | Stockout + transit delay alert prompts |
| `/api/v1/guided/recommendations` | GET | Human-in-the-loop recommendation queue |
| `/api/v1/guided/approve/{id}` | POST | Approve a recommendation |
| `/api/v1/guided/reject/{id}` | POST | Reject a recommendation |
| `/api/v1/ai/generate-b2b` | POST | Generate B2B message via Gemini |
| `/api/v1/ai/generate-b2c` | POST | Generate B2C message via Gemini |
| `/api/v1/ai/generate-alert` | POST | Generate alert message via Gemini |
| `/api/v1/roi/report` | GET | ROI impact report |
| `/api/v1/sales/summary` | GET | Sales KPIs (sell-through, revenue, etc.) |
| `/api/v1/sales/monthly-trend` | GET | Monthly sales volume + avg days |
| `/api/v1/sales/by-model` | GET | Sales breakdown by model |
| `/api/v1/sales` | GET | Paginated sales list with filters |
| `/api/v1/customers` | GET | Customer list with filters |
| `/api/v1/distance` | GET | Real road distance between two cities |
| `/api/v1/distance/all-cities` | GET | List of all cities with distance data |

---

## 6. Key Business Logic

### Floorplan Cost Calculation
```
Daily burn    = (1% / 30) × ₹8,00,000 = ₹266.67/day
Total burn    = (days / 30) × 1% × invoice_value
Example:      90 days × ₹8L = ₹24,000 accumulated interest
```

### Transfer Utility Score
```
Net Utility = Floorplan Saved + (Demand Score × ₹500) - Transport Cost
Transport   = road_distance_km × ₹12/km (real distances from OpenRouteService)
Decision    = Transfer if > 0, Discount if < 0 and days > 90, else Hold
```

### Reorder Point Logic
```
Stockout Alert = on_hand_qty < reorder_point
EOQ (recommended order) = max(reorder_point × 1.5, 10)
Severity = Critical if qty = 0, High if gap > ROP × 50%, else Medium
```

### Delay Calculation
```
Real delay = actual_arrival - expected_arrival (days)
If no actual arrival: delay = 2025-12-31 - expected_arrival
Severity = Critical if delay ≥ 5 days, High if ≥ 3 days, else Medium
```

---

## 7. Data Flow — End to End

```
CSV/XLSX source files
        ↓
generate_data.py (ingestion + quality checks)
        ↓
dealer_network.db (SQLite — all tables)
        ↓
load_distances.py (870 real road distances → routes table)
        ↓
demand_forecast.py (XGBoost training → forecast_output.json)
        ↓
main.py (FastAPI — 25+ endpoints)
        ↓
React Frontend (10 tabs — real-time data)
        ↓
gemini_service.py (Vertex AI — message generation on demand)
```

---

## 8. How to Run

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Load data (first time only)
python generate_data.py
python load_distances.py

# Run ML forecast (first time only)
python demand_forecast.py

# Start API server
uvicorn main:app --port 8000 --reload
```

### Frontend
```bash
cd auto-network-command-main
npm install
npm run dev
```

API docs available at: `http://localhost:8000/docs`  
Frontend at: `http://localhost:5173`

### Environment Variables (.env)
```
USE_VERTEX_AI=true
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
```

---

## 9. Known Limitations (POC Context)

| Limitation | Impact | Production Fix |
|---|---|---|
| Synthetic data | Numbers are directionally correct, not operationally precise | Connect to real Wipro DMS + SAP B1 APIs |
| One year of ML training data | XGBoost cannot fully learn yearly seasonality | 2–3 years of history → MAPE drops to ~25–30% |
| SQLite database | Not suitable for concurrent multi-user access | Migrate to PostgreSQL (Supabase connection already configured) |
| Vertex AI credentials | Requires Google Cloud setup on each machine | Use Gemini API key (free tier) for sharing |
| Static reference date (2025-12-31) | Aging calculations use fixed date | Replace with `julianday('now')` for live deployment |
| No authentication | Any user can access all data | Add JWT auth layer before production |

---

## 10. Files Reference

| File | Purpose |
|---|---|
| `main.py` | FastAPI application — all 25+ API endpoints |
| `models.py` | SQLAlchemy ORM models + Pydantic response schemas |
| `generate_data.py` | Data ingestion from CSV/XLSX into SQLite |
| `demand_forecast.py` | XGBoost two-stage model training + forecast generation |
| `gemini_service.py` | Vertex AI / Gemini 2.5 Flash integration |
| `distance_service.py` | Road distance lookup from routes table |
| `load_distances.py` | Loads 870 real road distances into DB |
| `fetch_distances.py` | Fetches distances from OpenRouteService API |
| `analytics.py` | Standalone analytics script (ROP calculation) |
| `dealer_network.db` | SQLite database (81 MB — all data) |
| `data/forecast_output.json` | Pre-computed XGBoost forecasts (270 dealer-variant combos) |
| `data/vehicle_sales.csv` | Vehicle sales transactions (15,078 rows) |
| `data/city_distances.json` | 870 real road distances (JSON reference) |
| `requirements.txt` | Python dependencies |
| `xgboost_model_documentation.txt` | Full ML model documentation (3 iterations) |
| `plan poc.txt` | 3-week POC plan and progress |
| `auto-network-command-main/` | React frontend (Vite + TailwindCSS) |
