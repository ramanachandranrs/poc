"""
email_service.py
----------------
SMTP email sender for the Dealer AI Copilot.
Sends professional emails to dealers on recommendation approval.

All dealer emails are overridden to DEALER_EMAIL_OVERRIDE (demo/POC mode).
"""

import os
import re
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)


def _cfg():
    """Read SMTP config lazily so load_dotenv() in main.py runs first."""
    return {
        "host":     os.getenv("SMTP_HOST",     "smtp.gmail.com"),
        "port":     int(os.getenv("SMTP_PORT", "587")),
        "tls":      os.getenv("SMTP_USE_TLS",  "true").lower() == "true",
        "user":     os.getenv("EMAIL_USER",    ""),
        "password": os.getenv("EMAIL_PASSWORD",""),
        "from":     os.getenv("EMAIL_FROM",    os.getenv("EMAIL_USER", "")),
        "override": os.getenv("DEALER_EMAIL_OVERRIDE", ""),
    }


def _resolve_email(dealer_email: Optional[str]) -> str:
    override = _cfg()["override"]
    return override if override else (dealer_email or _cfg()["user"])


def _clean_gemini(text: str) -> str:
    """Strip placeholder sign-offs Gemini sometimes generates."""
    return re.sub(
        r'\[Your Name[^\]]*\].*',
        'Regional Dealer Manager\nMaruti Suzuki Dealer Network',
        text,
        flags=re.IGNORECASE | re.DOTALL,
    ).strip()


def _send(to: str, subject: str, html_body: str) -> bool:
    cfg = _cfg()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Regional Dealer Manager <{cfg['from']}>"
    msg["To"]      = to
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            if cfg["tls"]:
                server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from"], [to], msg.as_string())
        logger.info("Email sent → %s | %s", to, subject)
        return True
    except Exception as e:
        logger.error("Email send failed: %s", e)
        return False


# ── Transfer emails ───────────────────────────────────────────────────────────

def send_transfer_emails(
    source_dealer: str, source_city: str,
    target_dealer: str, target_city: str,
    model: str, variant: str, fuel_type: str, vin: str,
    days_in_inventory: int, floorplan_cost: float,
    transport_cost: float, demand_score: float,
    net_utility: float, gemini_message: str,
) -> dict:
    """
    Email 1 → Source dealer: directive to dispatch, stop floorplan bleed.
    Email 2 → Target dealer: incoming vehicle notice + AI negotiation proposal.
    """
    fmt = lambda n: f"₹{n:,.0f}"
    savings          = floorplan_cost - transport_cost
    daily_fp         = round(floorplan_cost / max(days_in_inventory, 1), 0)
    price_discount   = floorplan_cost
    clean_msg        = _clean_gemini(gemini_message)

    # ── Email 1: Source Dealer — Dispatch Directive ───────────────────────────
    src_subject = (
        f"Action Required: Dispatch {model} {variant} (VIN: {vin}) "
        f"to {target_dealer}, {target_city} — Stop Floorplan Bleed"
    )
    src_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:680px;margin:auto;padding:24px">
<div style="background:#003087;padding:16px 24px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0;font-size:18px">Maruti Suzuki Dealer Network</h2>
  <p style="color:#cce0ff;margin:4px 0 0;font-size:13px">Regional Dealer Manager — Inventory Optimisation</p>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{source_dealer} Team</strong>,</p>
  <p>As your Regional Dealer Manager, I am directing an <strong>immediate vehicle transfer</strong> from your
  dealership. This action is necessary to stop ongoing floorplan interest losses and free up showroom capacity.</p>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px">Vehicle to be Dispatched</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="background:#f5f8ff"><td style="padding:8px;border:1px solid #ddd;width:45%"><strong>Model</strong></td><td style="padding:8px;border:1px solid #ddd">{model} {variant} ({fuel_type})</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>VIN</strong></td><td style="padding:8px;border:1px solid #ddd">{vin}</td></tr>
    <tr style="background:#fff3cd"><td style="padding:8px;border:1px solid #ddd"><strong>Days in Your Inventory</strong></td><td style="padding:8px;border:1px solid #ddd;color:#c0392b;font-weight:bold">{days_in_inventory} days — critically aged</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>Dispatch To</strong></td><td style="padding:8px;border:1px solid #ddd"><strong>{target_dealer}, {target_city}</strong></td></tr>
  </table>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px;margin-top:20px">Financial Impact</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="background:#f8d7da"><td style="padding:8px;border:1px solid #ddd"><strong>Total Floorplan Interest Accumulated</strong></td><td style="padding:8px;border:1px solid #ddd;color:#c0392b;font-weight:bold">{fmt(floorplan_cost)} (over {days_in_inventory} days)</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>Daily Floorplan Burn Rate</strong></td><td style="padding:8px;border:1px solid #ddd;color:#c0392b">{fmt(daily_fp)} / day — still accruing</td></tr>
    <tr style="background:#f5f8ff"><td style="padding:8px;border:1px solid #ddd"><strong>One-Time Logistics Cost</strong></td><td style="padding:8px;border:1px solid #ddd">{fmt(transport_cost)}</td></tr>
    <tr style="background:#d4edda"><td style="padding:8px;border:1px solid #ddd"><strong>Net Saving by Dispatching Now</strong></td><td style="padding:8px;border:1px solid #ddd;color:#155724;font-weight:bold">{fmt(savings)}</td></tr>
  </table>

  <div style="background:#fff3cd;border-left:4px solid #e67e22;padding:12px 16px;margin:20px 0;border-radius:4px">
    <p style="margin:0;font-size:14px"><strong>⚠ Why You Must Act Now:</strong> Every additional day this vehicle
    sits unsold costs your dealership <strong>{fmt(daily_fp)}/day</strong> in floorplan interest.
    The one-time logistics cost of <strong>{fmt(transport_cost)}</strong> is a fraction of what you are losing.
    Dispatching today stops the bleed and recovers <strong>{fmt(savings)}</strong> in net savings.</p>
  </div>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px">Your Required Actions</h3>
  <ol style="font-size:14px;line-height:1.8">
    <li>Confirm dispatch approval by replying to this email <strong>by end of business today</strong></li>
    <li>Prepare the vehicle (clean, full tank, all documents) for logistics pickup</li>
    <li>Our logistics team will contact you to schedule pickup within 24 hours of your confirmation</li>
    <li>Raise the inter-dealer transfer invoice to {target_dealer} upon dispatch</li>
  </ol>

  <p>Regards,<br><strong>Regional Dealer Manager</strong><br>Maruti Suzuki Dealer Network<br>
  <span style="color:#666;font-size:12px">This transfer was recommended by the AI Copilot and approved by the Regional Manager.</span></p>
</div></body></html>
"""

    # ── Email 2: Target Dealer — Incoming Vehicle + Negotiation Proposal ──────
    tgt_subject = (
        f"Incoming Vehicle Transfer: {model} {variant} (VIN: {vin}) "
        f"from {source_dealer}, {source_city} — High Demand Opportunity"
    )
    tgt_html = f"""
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:680px;margin:auto;padding:24px">
<div style="background:#003087;padding:16px 24px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0;font-size:18px">Maruti Suzuki Dealer Network</h2>
  <p style="color:#cce0ff;margin:4px 0 0;font-size:13px">Regional Dealer Manager — Inventory Optimisation</p>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
  <p>Dear <strong>{target_dealer} Team</strong>,</p>
  <p>An <strong>incoming vehicle transfer has been approved</strong> for your dealership. Our AI-powered
  demand forecasting system has identified your location as the optimal destination — your market shows
  the strongest demand for this variant in the network.</p>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px">Incoming Vehicle Details</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="background:#f5f8ff"><td style="padding:8px;border:1px solid #ddd;width:45%"><strong>Model</strong></td><td style="padding:8px;border:1px solid #ddd">{model} {variant} ({fuel_type})</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>VIN</strong></td><td style="padding:8px;border:1px solid #ddd">{vin}</td></tr>
    <tr style="background:#f5f8ff"><td style="padding:8px;border:1px solid #ddd"><strong>Transferring From</strong></td><td style="padding:8px;border:1px solid #ddd">{source_dealer}, {source_city}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>Your Dealership</strong></td><td style="padding:8px;border:1px solid #ddd"><strong>{target_dealer}, {target_city}</strong></td></tr>
  </table>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px;margin-top:20px">Why This Vehicle is Coming to You</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="background:#d4edda"><td style="padding:8px;border:1px solid #ddd"><strong>30-Day ML Demand Forecast</strong></td><td style="padding:8px;border:1px solid #ddd;color:#155724;font-weight:bold">{demand_score:.0f} units projected at your location</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>Vehicle Condition</strong></td><td style="padding:8px;border:1px solid #ddd">Showroom-ready — no additional prep required</td></tr>
    <tr style="background:#f5f8ff"><td style="padding:8px;border:1px solid #ddd"><strong>Transfer Price Discount</strong></td><td style="padding:8px;border:1px solid #ddd;color:#155724;font-weight:bold">{fmt(price_discount)} below standard invoice value</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>Your Logistics Cost</strong></td><td style="padding:8px;border:1px solid #ddd">Nil — covered by source dealership</td></tr>
    <tr style="background:#d4edda"><td style="padding:8px;border:1px solid #ddd"><strong>Network Net Utility</strong></td><td style="padding:8px;border:1px solid #ddd;color:#155724;font-weight:bold">{fmt(net_utility)}</td></tr>
  </table>

  <div style="background:#e8f4fd;border-left:4px solid #003087;padding:12px 16px;margin:20px 0;border-radius:4px">
    <p style="margin:0;font-size:14px"><strong>Why Your Location Was Selected:</strong> Our ML demand model
    forecasts <strong>{demand_score:.0f} units</strong> of demand for the {model} {variant} at {target_city}
    over the next 30 days — the highest in the network for this variant. You receive this vehicle at
    <strong>{fmt(price_discount)} below invoice</strong> with zero logistics cost.</p>
  </div>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px;margin-top:20px">Your Required Actions</h3>
  <ol style="font-size:14px;line-height:1.8">
    <li>Reply to this email to confirm you are ready to receive the vehicle</li>
    <li>Prepare showroom floor space for the incoming {model} {variant}</li>
    <li>Our logistics team will share the delivery timeline within 24 hours</li>
    <li>Process the inter-dealer transfer invoice upon receipt of the vehicle</li>
  </ol>

  <p>Regards,<br><strong>Regional Dealer Manager</strong><br>Maruti Suzuki Dealer Network<br>
  <span style="color:#666;font-size:12px">This transfer was recommended by the AI Copilot and approved by the Regional Manager.</span></p>
</div></body></html>
"""

    src_to = _resolve_email(None)
    tgt_to = _resolve_email(None)
    r1 = _send(src_to, src_subject, src_html)
    r2 = _send(tgt_to, tgt_subject, tgt_html)
    return {"source_email_sent": r1, "target_email_sent": r2, "source_to": src_to, "target_to": tgt_to}


# ── ROP / Stockout email ──────────────────────────────────────────────────────

def send_rop_email(
    dealer_id: str, part_name: str, sku: str,
    qty_on_hand: int, reorder_point: int,
    quantity_gap: int, recommended_order_qty: int,
    gemini_message: str,
) -> dict:
    severity  = "CRITICAL" if qty_on_hand == 0 else ("HIGH" if quantity_gap > reorder_point * 0.5 else "MEDIUM")
    sev_color = {"CRITICAL": "#c0392b", "HIGH": "#e67e22", "MEDIUM": "#f39c12"}[severity]
    subject   = f"[{severity}] Parts Reorder Required: {part_name} (SKU: {sku}) — {dealer_id}"

    html = f"""
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:680px;margin:auto;padding:24px">
<div style="background:#003087;padding:16px 24px;border-radius:8px 8px 0 0">
  <h2 style="color:#fff;margin:0;font-size:18px">Maruti Suzuki Dealer Network</h2>
  <p style="color:#cce0ff;margin:4px 0 0;font-size:13px">Regional Dealer Manager — Parts Operations</p>
</div>
<div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
  <div style="background:{sev_color};color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:20px;font-weight:bold;font-size:15px">
    ⚠ {severity} ALERT — Parts Stock Below Reorder Point
  </div>
  <p>Dear <strong>{dealer_id} Parts Team</strong>,</p>
  <p>Our AI inventory monitoring system has detected that a critical part at your dealership has fallen below
  the Reorder Point (ROP). <strong>Immediate action is required</strong> to prevent service disruption.</p>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px">Stock Alert Details</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="background:#f5f8ff"><td style="padding:8px;border:1px solid #ddd"><strong>Part Name</strong></td><td style="padding:8px;border:1px solid #ddd">{part_name}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>SKU / Part Number</strong></td><td style="padding:8px;border:1px solid #ddd">{sku}</td></tr>
    <tr style="background:#fff3cd"><td style="padding:8px;border:1px solid #ddd"><strong>Current Stock (On Hand)</strong></td><td style="padding:8px;border:1px solid #ddd;color:{sev_color};font-weight:bold">{qty_on_hand} units</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd"><strong>Reorder Point (ROP)</strong></td><td style="padding:8px;border:1px solid #ddd">{reorder_point} units</td></tr>
    <tr style="background:#f8d7da"><td style="padding:8px;border:1px solid #ddd"><strong>Shortfall</strong></td><td style="padding:8px;border:1px solid #ddd;color:#c0392b;font-weight:bold">{quantity_gap} units below ROP</td></tr>
    <tr style="background:#d4edda"><td style="padding:8px;border:1px solid #ddd"><strong>Recommended Order Qty (EOQ)</strong></td><td style="padding:8px;border:1px solid #ddd;color:#155724;font-weight:bold">{recommended_order_qty} units</td></tr>
  </table>

  <div style="background:#e8f4fd;border-left:4px solid #003087;padding:12px 16px;margin:20px 0;border-radius:4px">
    <p style="margin:0;font-size:14px"><strong>Business Impact:</strong> With only <strong>{qty_on_hand} units</strong>
    on hand against a reorder point of <strong>{reorder_point} units</strong>, your dealership risks service
    delays and customer dissatisfaction. Please raise a purchase order for <strong>{recommended_order_qty} units</strong> immediately.</p>
  </div>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px">AI-Generated Alert</h3>
  <div style="background:#f9f9f9;border:1px solid #ddd;padding:16px;border-radius:6px;font-size:13px;white-space:pre-wrap">{gemini_message}</div>

  <h3 style="color:#003087;border-bottom:2px solid #003087;padding-bottom:6px">Required Action</h3>
  <ol style="font-size:14px;line-height:1.8">
    <li>Raise a Purchase Order for <strong>{recommended_order_qty} units</strong> of {part_name} (SKU: {sku}) immediately</li>
    <li>Confirm PO number to this office by <strong>end of business today</strong></li>
    <li>Escalate to your parts supplier for expedited delivery if stock is at zero</li>
  </ol>

  <p>Regards,<br><strong>Regional Dealer Manager</strong><br>Maruti Suzuki Dealer Network<br>
  <span style="color:#666;font-size:12px">This alert was generated by the AI Copilot and approved by the Regional Manager.</span></p>
</div></body></html>
"""
    to = _resolve_email(None)
    success = _send(to, subject, html)
    return {"email_sent": success, "to": to, "severity": severity}
