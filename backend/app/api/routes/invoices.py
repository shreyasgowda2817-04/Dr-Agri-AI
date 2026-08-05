from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter()

@router.get("/{order_ref}/pdf")
async def download_invoice_pdf(
    order_ref: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Generates a PDF invoice for a given order."""
    order = await db["orders"].find_one({"order_ref": order_ref, "user_id": str(current_user.id)})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#16a34a'))
    normal_style = styles['Normal']

    # Header
    elements.append(Paragraph("<b>Dr Agri AI</b>", title_style))
    elements.append(Paragraph("Dr Agri Manufacturing & Marketplace<br/>123 Innovation Drive, Tech Park<br/>Bangalore, India", normal_style))
    elements.append(Spacer(1, 20))

    # Invoice Details
    elements.append(Paragraph(f"<b>INVOICE</b>", styles['Heading2']))
    elements.append(Paragraph(f"<b>Order Reference:</b> {order.get('order_ref')}", normal_style))
    
    created_at_str = order.get("created_at").strftime('%Y-%m-%d %H:%M') if order.get("created_at") else "N/A"
    elements.append(Paragraph(f"<b>Date:</b> {created_at_str}", normal_style))
    elements.append(Paragraph(f"<b>Billed To:</b> {current_user.name} ({current_user.email})", normal_style))
    elements.append(Paragraph(f"<b>Shipping Address:</b> {order.get('shipping_address') or 'N/A'}", normal_style))
    elements.append(Paragraph(f"<b>Payment Method:</b> {str(order.get('payment_method')).upper()}", normal_style))
    elements.append(Spacer(1, 20))

    # Items Table
    data = [["Item Description", "Qty", "Unit Price", "Total"]]
    for item in order.get("items", []):
        qty = item.get('quantity', 1)
        price = item.get('price', 0)
        data.append([item.get('name', 'Product'), str(qty), f"INR {price:.2f}", f"INR {(qty * price):.2f}"])

    # Table styling
    table = Table(data, colWidths=[250, 50, 100, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#16a34a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'), # Left align product names
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))

    # Totals Table
    totals_data = [
        ["Subtotal:", f"INR {order.get('subtotal', 0):.2f}"],
        ["Discount:", f"- INR {order.get('discount_applied', 0):.2f}"],
        ["Total Amount:", f"INR {order.get('total_amount', 0):.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[350, 150])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('FONTNAME', (0, 2), (1, 2), 'Helvetica-Bold'), # Bold total
        ('TEXTCOLOR', (1, 1), (1, 1), colors.red), # Red discount
    ]))
    elements.append(totals_table)

    # Footer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph("<i>Thank you for shopping with Dr Agri! For support, contact help@dragri.ai.</i>", styles['Italic']))

    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=invoice_{order.get('order_ref')}.pdf"
    })
