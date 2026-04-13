"""
gemini_service.py
-----------------
Vertex AI Gemini 2.5 Flash integration for the Dealer AI Copilot.
Generates professional messages for three use cases:
  1. B2B  — Dealer-to-dealer vehicle transfer negotiation
  2. B2C  — Customer outreach for aging inventory
  3. Alert — Operational escalation (stockout / transit delay)
"""

import os
from functools import lru_cache
from typing import Optional

# ── Vertex AI client ──────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_client():
    from google import genai
    from google.genai import types

    project  = os.getenv("GOOGLE_CLOUD_PROJECT",  "project-70591921-7d7a-4043-ba8")
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    model    = os.getenv("GEMINI_MODEL",           "gemini-2.5-flash")

    client = genai.Client(
        vertexai=True,
        project=project,
        location=location,
    )
    return client, model, types


def _generate(system_prompt: str, user_prompt: str) -> str:
    """Call Gemini and return the text response."""
    try:
        client, model, types = _get_client()
        response = client.models.generate_content(
            model=model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=2048,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        # Handle both direct text and candidates
        if hasattr(response, "text") and response.text:
            return response.text.strip()
        if hasattr(response, "candidates") and response.candidates:
            parts = response.candidates[0].content.parts
            return "".join(p.text for p in parts if hasattr(p, "text")).strip()
        return "[No response generated]"
    except Exception as e:
        return f"[Gemini error: {str(e)[:200]}]"


# ── B2B — Dealer-to-Dealer Transfer ──────────────────────────────────────────

def generate_b2b_message(
    vin: str,
    model: str,
    variant: str,
    fuel_type: str,
    source_dealer: str,
    source_city: str,
    target_dealer: str,
    target_city: str,
    days_in_inventory: int,
    floorplan_cost: float,
    transport_cost: float,
    demand_score: float,
    net_utility: float,
) -> str:
    system = (
        "You are a professional B2B automotive inventory negotiation specialist "
        "working for a multi-dealer Maruti Suzuki network in India. "
        "Your messages are concise, data-driven, and commercially persuasive. "
        "Always write in a professional yet collaborative tone. "
        "Use Indian Rupee (₹) for all monetary values."
    )
    user = f"""
Draft a professional dealer-to-dealer vehicle transfer proposal.

VEHICLE DETAILS:
  Model     : {model} {variant} ({fuel_type})
  VIN       : {vin}

FINANCIAL ANALYSIS:
  Source Dealer     : {source_dealer}, {source_city}
  Days in inventory : {days_in_inventory} days
  Floorplan cost    : ₹{floorplan_cost:,.0f} (accumulated interest)
  Transport cost    : ₹{transport_cost:,.0f}
  Target Dealer     : {target_dealer}, {target_city}
  30-day demand at target: {demand_score:.0f} units (ML forecast)
  Net utility score : ₹{net_utility:,.0f} (positive = financially beneficial)

REQUIREMENTS:
- Address the target dealer's procurement manager directly
- Highlight the mutual financial benefit clearly
- Mention the ML-forecasted demand at the target location
- Propose a fair transfer price (invoice value minus floorplan savings)
- Keep it under 150 words
- Professional email format with Subject line
"""
    return _generate(system, user)


# ── B2C — Customer Outreach ───────────────────────────────────────────────────

def generate_b2c_message(
    model: str,
    variant: str,
    fuel_type: str,
    dealer_name: str,
    dealer_city: str,
    days_in_inventory: int,
    discount_amount: float,
    customer_name: Optional[str] = None,
) -> str:
    system = (
        "You are a friendly, persuasive automotive sales assistant for a Maruti Suzuki "
        "dealership in India. You write warm, personalised WhatsApp messages that feel "
        "human — not like a bulk SMS. You create gentle urgency without being pushy. "
        "Always write in English. Keep messages conversational and under 100 words."
    )
    greeting = f"Hi {customer_name}" if customer_name else "Hi"
    user = f"""
Write a personalised WhatsApp message to a customer who previously enquired about this vehicle.

VEHICLE:
  {model} {variant} ({fuel_type})
  Available at: {dealer_name}, {dealer_city}
  Days in showroom: {days_in_inventory} days

OFFER:
  Special discount: ₹{discount_amount:,.0f} off (limited time)

CONTEXT:
  The vehicle has been in the showroom for {days_in_inventory} days.
  The dealer wants to move it quickly.

Start with: "{greeting},"
- Mention the specific vehicle model and variant
- Highlight the ₹{discount_amount:,.0f} discount as a time-sensitive offer
- Add a soft call-to-action (visit / call / reply)
- Do NOT use generic phrases like "Dear Customer" or "Greetings"
- Under 100 words
"""
    return _generate(system, user)


# ── Operational Alert — Stockout ──────────────────────────────────────────────

def generate_stockout_alert(
    part_name: str,
    sku: str,
    dealer_id: str,
    qty_on_hand: int,
    reorder_point: int,
    quantity_gap: int,
    recommended_order_qty: int,
) -> str:
    system = (
        "You are an operational intelligence assistant for an automotive dealer network. "
        "You write precise, actionable escalation alerts for parts managers. "
        "Your alerts are structured, urgent where needed, and always include a clear recommended action."
    )
    severity = "CRITICAL" if qty_on_hand == 0 else ("HIGH" if quantity_gap > reorder_point * 0.5 else "MEDIUM")
    user = f"""
Generate a professional operational stockout alert.

ALERT DETAILS:
  Severity  : {severity}
  Part      : {part_name} (SKU: {sku})
  Dealer    : {dealer_id}
  On Hand   : {qty_on_hand} units
  Reorder Point: {reorder_point} units
  Shortfall : {quantity_gap} units below ROP
  Recommended Order: {recommended_order_qty} units (EOQ)

REQUIREMENTS:
- Start with the severity level and part name
- State the current stock vs reorder point clearly
- Quantify the business risk (service delays, customer impact)
- Give a single clear recommended action with order quantity
- Professional operations memo format
- Under 100 words
"""
    return _generate(system, user)


# ── Operational Alert — Transit Delay ────────────────────────────────────────

def generate_transit_alert(
    shipment_id: str,
    part_name: str,
    origin: str,
    destination: str,
    carrier: str,
    delay_days: float,
    dealer_id: Optional[str] = None,
) -> str:
    system = (
        "You are an operational intelligence assistant for an automotive dealer network. "
        "You write precise, actionable escalation alerts for logistics coordinators. "
        "Your alerts are structured, urgent where needed, and always include a clear recommended action."
    )
    severity = "CRITICAL" if delay_days >= 5 else ("HIGH" if delay_days >= 3 else "MEDIUM")
    user = f"""
Generate a professional transit delay escalation alert.

ALERT DETAILS:
  Severity    : {severity}
  Shipment ID : {shipment_id}
  Part        : {part_name}
  Route       : {origin} → {destination}
  Carrier     : {carrier}
  Delay       : {delay_days:.0f} days past expected arrival
  Dealer      : {dealer_id or "Network"}

REQUIREMENTS:
- Start with severity and shipment ID
- State the delay duration and route clearly
- Assess the downstream impact on dealer operations
- Recommend one of: expedite with carrier / arrange alternative carrier / emergency stock transfer
- Professional logistics memo format
- Under 100 words
"""
    return _generate(system, user)
