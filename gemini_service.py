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


# ── NLQ — Classify intent ─────────────────────────────────────────────────────

def classify_nlq_intent(question: str) -> dict:
    """Use Groq LLaMA to classify NLQ intent and extract filters."""
    system = (
        "You are a query router for an automotive dealer network database. "
        "Given a user question, identify:\n"
        "1. intent: one of [aging_stock, parts_stockout, transit_delay, sales_performance, "
        "demand_forecast, dealer_comparison, customer_lookup, roi_summary, general]\n"
        "2. filters: extract any dealer name, city, model name, variant, days threshold, zone mentioned\n"
        "3. aggregation: one of [list, count, sum, average, top_n, trend]\n"
        "4. chart_type: one of [bar, line, table, number, none]\n"
        "Return ONLY a JSON object. No explanation. No markdown.\n"
        'Example: {"intent":"aging_stock","filters":{"dealer":null,"min_days":90,"model":"Brezza","zone":null},"aggregation":"list","chart_type":"table"}'
    )
    try:
        result = _generate_groq(system, question)
        import json as _json
        # Strip markdown fences if present
        clean = result.strip().strip("```json").strip("```").strip()
        return _json.loads(clean)
    except Exception:
        return {"intent": "general", "filters": {}, "aggregation": "list", "chart_type": "none"}


def generate_nlq_answer(question: str, data: object, chart_type: str, context: list) -> dict:
    """Generate a natural language answer for an NLQ result using Groq."""
    import json as _json
    system = (
        "You are an automotive supply chain AI assistant for a Maruti Suzuki dealer network. "
        "Answer in 2-3 sentences maximum. Be specific — use exact numbers from the data. "
        "Always mention rupee amounts when relevant. Use Indian number format (lakhs, crores). "
        "If recommending action, be direct: say exactly what to do. "
        "End every answer with exactly 3 follow-up questions the user might want to ask next, "
        'as a JSON array on the last line in this format: ["question1","question2","question3"]'
    )
    data_str = _json.dumps(data, default=str)[:3000]
    ctx_str = ""
    if context:
        ctx_str = "\nConversation history:\n" + "\n".join(
            f"{'User' if m['role']=='user' else 'AI'}: {m['content']}" for m in context[-6:]
        )
    user = f"Question: {question}{ctx_str}\n\nData: {data_str}\n\nAnswer:"
    try:
        raw = _generate_groq(system, user)
        # Split answer from follow-ups
        lines = raw.strip().split("\n")
        follow_ups = []
        answer_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                try:
                    parsed = _json.loads(stripped)
                    if isinstance(parsed, list):
                        follow_ups = parsed
                        continue
                except Exception:
                    pass
            answer_lines.append(line)
        answer = "\n".join(answer_lines).strip()
        if not follow_ups:
            follow_ups = [
                "Which dealer has the highest floorplan burn today?",
                "Show all parts with zero stock",
                "What is the total revenue this month?",
            ]
        return {"answer": answer, "follow_ups": follow_ups, "groq_used": True}
    except Exception as e:
        return {
            "answer": f"I couldn't process that query. Please try rephrasing. (Error: {str(e)[:100]})",
            "follow_ups": [
                "Which dealers have critical aging stock?",
                "Show all delayed shipments",
                "What is the ROI summary?",
            ],
            "groq_used": False,
        }


def generate_alert_message(alert_type: str, alert_data: dict) -> str:
    """Generate a Gemini/Groq message for a specific alert."""
    if alert_type == "aging_vehicle":
        system = "You are a Maruti Suzuki OEM supply chain manager. Write professional B2B WhatsApp messages."
        user = (
            f"Write a professional B2B WhatsApp message to the dealer manager at "
            f"{alert_data.get('dealer_name','the dealer')} in {alert_data.get('city','the city')}.\n"
            f"Context: {alert_data.get('count',1)} vehicles have been unsold for up to "
            f"{alert_data.get('max_days',90)} days, burning ₹{alert_data.get('daily_burn',267)}/day "
            f"in floorplan interest.\n"
            f"Best action: Transfer {alert_data.get('top_model','vehicle')} to best target dealer.\n"
            f"Requirements: Max 4 sentences. Start with financial urgency. State recommended action. "
            f"End with clear ask (confirm by EOD / reply YES). Professional but direct. No fluff.\n"
            f"Output ONLY the message text."
        )
    elif alert_type == "parts_stockout":
        system = "You are a parts operations manager. Write internal alert memos."
        user = (
            f"Write an internal alert memo to the parts incharge at {alert_data.get('dealer_name','the dealer')}.\n"
            f"Context: {alert_data.get('zero_stock_count',0)} SKUs at zero stock, "
            f"{alert_data.get('below_rop_count',0)} SKUs below ROP. "
            f"Estimated service impact: ₹{alert_data.get('impact',5000)}/day.\n"
            f"Top critical SKU: {alert_data.get('part_name','Unknown')} — "
            f"{alert_data.get('qty_on_hand',0)} units on hand, ROP is {alert_data.get('rop',10)}.\n"
            f"Requirements: Max 3 sentences. State exact SKUs at zero stock. "
            f"Recommended EOQ order quantity for top SKU. Severity: CRITICAL/HIGH.\n"
            f"Output ONLY the message text."
        )
    else:  # transit_delay
        system = "You are a logistics coordinator. Write escalation messages to carriers."
        user = (
            f"Write an escalation message to carrier {alert_data.get('carrier','the carrier')} "
            f"for shipment {alert_data.get('shipment_id','N/A')}.\n"
            f"Context: Shipment from {alert_data.get('origin','origin')} to "
            f"{alert_data.get('destination','destination')} is "
            f"{alert_data.get('delay_days',0):.0f} days overdue. "
            f"Expected {alert_data.get('expected_date','N/A')}.\n"
            f"Requirements: Max 3 sentences. State delay in days clearly. "
            f"Ask for immediate status update and revised ETA. "
            f"Mention alternative action if no response in 24 hours.\n"
            f"Output ONLY the message text."
        )
    try:
        return _generate_groq(system, user)
    except Exception as e:
        return f"[Message generation failed: {str(e)[:100]}]"


# ── Groq LLaMA backend ────────────────────────────────────────────────────────

def _generate_groq(system_prompt: str, user_prompt: str) -> str:
    """Call Groq LLaMA and return the text response."""
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage
        import os

        api_key = os.getenv("GROQ_API_KEY", "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")
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=api_key,
            temperature=0.7,
            max_tokens=2048,
        )
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        response = llm.invoke(messages)
        return response.content.strip()
    except Exception as e:
        # Fallback to Vertex AI Gemini if Groq fails
        try:
            return _generate(system_prompt, user_prompt)
        except Exception:
            return f"[LLM error: {str(e)[:200]}]"
