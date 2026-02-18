import jsPDF from 'jspdf';
import { gymService } from './gymService';

export interface ReceiptData {
  receiptNumber: string;
  memberName: string;
  memberPhone: string;
  planName: string;
  planDuration: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  validFrom: string;
  validUntil: string;
  currency: string;
}

export interface GymInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
}

class ReceiptService {
  private static instance: ReceiptService;

  static getInstance(): ReceiptService {
    if (!ReceiptService.instance) {
      ReceiptService.instance = new ReceiptService();
    }
    return ReceiptService.instance;
  }

  generateReceiptPDF(receipt: ReceiptData, gym: GymInfo): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: [80, 180] }); // thermal receipt size
    const w = 80;
    let y = 10;

    // Gym name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(gym.name, w / 2, y, { align: 'center' });
    y += 5;

    if (gym.address || gym.city) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text([gym.address, gym.city].filter(Boolean).join(', '), w / 2, y, { align: 'center' });
      y += 4;
    }
    if (gym.phone) {
      doc.setFontSize(7);
      doc.text(`Ph: ${gym.phone}`, w / 2, y, { align: 'center' });
      y += 4;
    }

    // Divider
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(5, y, w - 5, y);
    y += 5;

    // Receipt number + date
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt: ${receipt.receiptNumber}`, 5, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${receipt.paymentDate}`, 5, y);
    y += 6;

    // Member info
    doc.setFont('helvetica', 'bold');
    doc.text('Member:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(receipt.memberName, 25, y);
    y += 4;
    doc.text(`Phone: ${receipt.memberPhone}`, 5, y);
    y += 6;

    // Divider
    doc.line(5, y, w - 5, y);
    y += 5;

    // Plan details
    doc.setFont('helvetica', 'bold');
    doc.text('Plan:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(receipt.planName, 25, y);
    y += 4;
    doc.text(`Duration: ${receipt.planDuration}`, 5, y);
    y += 4;
    doc.text(`Valid: ${receipt.validFrom} to ${receipt.validUntil}`, 5, y);
    y += 6;

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Amount: ${receipt.currency}${receipt.amount.toLocaleString('en-IN')}`, 5, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment: ${receipt.paymentMethod}`, 5, y);
    y += 6;

    // Divider
    doc.line(5, y, w - 5, y);
    y += 5;

    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you! 🙏', w / 2, y, { align: 'center' });

    return doc;
  }

  downloadReceipt(receipt: ReceiptData, gym: GymInfo) {
    const doc = this.generateReceiptPDF(receipt, gym);
    doc.save(`receipt-${receipt.receiptNumber}.pdf`);
  }

  async shareReceiptViaWhatsApp(receipt: ReceiptData, gym: GymInfo) {
    const text = this.generateReceiptText(receipt, gym);
    const cleanPhone = receipt.memberPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  generateReceiptText(receipt: ReceiptData, gym: GymInfo): string {
    return [
      `📄 *Payment Receipt*`,
      `━━━━━━━━━━━━━━━`,
      `🏋️ *${gym.name}*`,
      gym.phone ? `📞 ${gym.phone}` : '',
      ``,
      `👤 *${receipt.memberName}*`,
      `📱 ${receipt.memberPhone}`,
      ``,
      `📋 Plan: ${receipt.planName}`,
      `📅 ${receipt.validFrom} → ${receipt.validUntil}`,
      ``,
      `💰 *Amount: ${receipt.currency}${receipt.amount.toLocaleString('en-IN')}*`,
      `💳 Paid via: ${receipt.paymentMethod}`,
      `🗓 Date: ${receipt.paymentDate}`,
      `🔖 Receipt: ${receipt.receiptNumber}`,
      ``,
      `✅ Payment confirmed!`,
      `Thank you! 🙏`,
    ].filter(Boolean).join('\n');
  }

  async shareReceipt(receipt: ReceiptData, gym: GymInfo) {
    const text = this.generateReceiptText(receipt, gym);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Receipt - ${receipt.receiptNumber}`, text });
        return;
      } catch {
        // User cancelled or API unavailable, fall through
      }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(text);
  }
}

export const receiptService = ReceiptService.getInstance();
