# Automotive Dealer Network AI Copilot (PoC)

Welcome to the Automotive Dealer Network AI Copilot Proof of Concept. This project serves as a comprehensive, simulated backbone designed specifically to train, test, and integrate AI Agents and LLM copilots. 

Instead of connecting an untested AI to live, sensitive enterprise data, this repository establishes a secure, hyper-realistic local environment mimicking real-world automotive supply chain systems.

## 🏗️ Architecture Matrix

Our architecture simulates three distinct legacy systems natively operating at the enterprise level, exposed entirely via modern REST APIs.

1. **Wipro DMS (Dealership Management System):** Tracks vehicle inventories, days sitting on the lot, and pending customer bookings across 10 distinct dealerships.
2. **SAP B1 (Enterprise Resource Planning):** Handles the localized supply chain. It tracks spare parts (SKUs), categorizations, inventory quantities on hand, and associated holding costs.
3. **Manesar Rail Transit (Logistics):** The logistics layer dictating real-time delivery timelines, transit statuses, and destination dealer hubs for heavily delayed stock.

### Technology Stack
- **Backend:** Python, FastAPI, SQLAlchemy 2.0, Pydantic (v2), Uvicorn.
- **Database:** SQLite (Local standard).
- **Data Engineering:** Faker, Pandas.
- **Frontend (auto-network-command-main):** React, Vite, TailwindCSS, Recharts, Framer Motion.

## 🎯 The "Edge Cases"
AI Copilots need actual problems to solve. During database initialization (`generate_data.py`), the following operational challenges are mathematically and intentionally engineered into the dataset:
- **Critical Stockouts:** Highly vital spare parts are mathematically forced to `0` quantity at random dealers.
- **Aging Stock:** 15% of `InventoryVehicles` are artificially aged to sit on dealer lots for `>60 days`.
- **Demand Mismatches:** Customers at unrelated dealers request the exact aging vehicle variants trapped across the state.
- **Logistics Delays:** 10% of shipments bound for dealers are flagged as past due delivery to simulate transit shocks.

---

## 🚀 Setup & Installation Guide

This project is separated into a Backend integration layer and a visually stunning Frontend dashboard.

### 1. Backend Setup
It is highly recommended you run the backend using a Python virtual environment to prevent dependency bloat.

```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate the environment (Windows)
.\.venv\Scripts\activate

# 3. Install backend dependencies
pip install -r requirements.txt
```

### 2. Generating the Synthetic Database
Execute the generative Python script. This will fire up SQLAlchemy, mint the `dealer_network.db` SQLite file, generate the fake network, and secretly plant the "Edge Cases".
```bash
python generate_data.py
```

### 3. Starting the AI API Endpoints (Backend Server)
Boot the mock legacy systems using FastAPI:
```bash
uvicorn main:app --port 8000 --reload
```
*Your APIs are now live at `http://localhost:8000/docs`. Leave this terminal running!*

### 4. Booting the Frontend Command Center
Open a **new terminal window**, navigate to the React frontend folder, install the isolated Node packages, and boot Vite.
```bash
cd auto-network-command-main
npm install
npm run dev
```
*The React UI is now actively querying your python APIs and will display locally at `http://localhost:5173`.*

---

## 📊 Analytics Script
We have included a bonus `analytics.py` script. This acts as a mock "Data Analyst" script. You can run it locally to see how standard Python scripts (or eventual AI scripts) can successfully pull from your FastAPI endpoints to calculate dynamic **Reorder Points (ROP)** and flag the aging Wipro inventory straight to the terminal!

```bash
python analytics.py
```

## 📁 Export to Excel (Optional)
If you wish to view the entire scope of the simulated network without coding, run the exporter script to construct a cleanly separated spreadsheet tracking all dealers.
```bash
python export_to_excel.py
```
