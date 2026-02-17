import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { auditLogger } from './auditLogger';

export interface MemberExportData {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  height?: string | null;
  weight?: string | null;
  joining_date: string;
  membership_plan: string;
  plan_amount: number;
  status: string;
  membership_end_date?: string;
  next_due_date?: string;
}

export interface ProgressExportData {
  record_date: string;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  body_fat_percentage?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  biceps?: number | null;
  thighs?: number | null;
  calves?: number | null;
  notes?: string | null;
}

export interface PaymentExportData {
  id: string;
  member_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  due_date: string;
  days_late: number;
  receipt_number: string;
  notes?: string | null;
}

class ExportService {
  private static instance: ExportService;

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export members data to Excel
   */
  exportMembersToExcel(members: MemberExportData[], gymName: string = 'Haefit Gym'): void {
    const data = members.map((member, index) => ({
      'S.No': index + 1,
      'Name': member.full_name,
      'Phone': member.phone,
      'Email': member.email || '-',
      'Gender': member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '-',
      'Height (cm)': member.height || '-',
      'Weight (kg)': member.weight || '-',
      'Joining Date': format(new Date(member.joining_date), 'dd/MM/yyyy'),
      'Plan': this.formatPlanName(member.membership_plan),
      'Plan Amount (₹)': member.plan_amount,
      'Status': member.status.charAt(0).toUpperCase() + member.status.slice(1),
      'Membership End': member.membership_end_date ? format(new Date(member.membership_end_date), 'dd/MM/yyyy') : '-',
      'Next Due Date': member.next_due_date ? format(new Date(member.next_due_date), 'dd/MM/yyyy') : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // S.No
      { wch: 25 },  // Name
      { wch: 15 },  // Phone
      { wch: 25 },  // Email
      { wch: 10 },  // Gender
      { wch: 12 },  // Height
      { wch: 12 },  // Weight
      { wch: 15 },  // Joining Date
      { wch: 15 },  // Plan
      { wch: 15 },  // Plan Amount
      { wch: 10 },  // Status
      { wch: 15 },  // Membership End
      { wch: 15 },  // Next Due Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');

    // Generate filename with date
    const fileName = `${gymName.replace(/[^a-zA-Z0-9]/g, '_')}_Members_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    auditLogger.logDataExported('members', 'excel', members.length);
  }

  /**
   * Export filtered members to Excel
   */
  exportFilteredMembersToExcel(
    members: MemberExportData[], 
    filterType: string,
    gymName: string = 'Haefit Gym'
  ): void {
    const data = members.map((member, index) => ({
      'S.No': index + 1,
      'Name': member.full_name,
      'Phone': member.phone,
      'Email': member.email || '-',
      'Gender': member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '-',
      'Height (cm)': member.height || '-',
      'Weight (kg)': member.weight || '-',
      'Joining Date': format(new Date(member.joining_date), 'dd/MM/yyyy'),
      'Plan': this.formatPlanName(member.membership_plan),
      'Plan Amount (₹)': member.plan_amount,
      'Status': member.status.charAt(0).toUpperCase() + member.status.slice(1),
      'Membership End': member.membership_end_date ? format(new Date(member.membership_end_date), 'dd/MM/yyyy') : '-',
      'Next Due Date': member.next_due_date ? format(new Date(member.next_due_date), 'dd/MM/yyyy') : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // S.No
      { wch: 25 },  // Name
      { wch: 15 },  // Phone
      { wch: 25 },  // Email
      { wch: 10 },  // Gender
      { wch: 12 },  // Height
      { wch: 12 },  // Weight
      { wch: 15 },  // Joining Date
      { wch: 15 },  // Plan
      { wch: 15 },  // Plan Amount
      { wch: 10 },  // Status
      { wch: 15 },  // Membership End
      { wch: 15 },  // Next Due Date
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = filterType === 'all' ? 'All Members' : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Members`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate filename with filter type and date
    const filterSuffix = filterType === 'all' ? '' : `_${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`;
    const fileName = `${gymName.replace(/[^a-zA-Z0-9]/g, '_')}_Members${filterSuffix}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    auditLogger.logDataExported(`members_${filterType}`, 'excel', members.length);
  }

  /**
   * Export filtered members to CSV
   */
  exportFilteredMembersToCSV(
    members: MemberExportData[], 
    filterType: string,
    gymName: string = 'Haefit Gym'
  ): void {
    const headers = ['S.No', 'Name', 'Phone', 'Email', 'Gender', 'Height (cm)', 'Weight (kg)', 'Joining Date', 'Plan', 'Plan Amount', 'Status', 'Membership End', 'Next Due Date'];
    
    const rows = members.map((member, index) => [
      index + 1,
      member.full_name,
      member.phone,
      member.email || '-',
      member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '-',
      member.height || '-',
      member.weight || '-',
      format(new Date(member.joining_date), 'dd/MM/yyyy'),
      this.formatPlanName(member.membership_plan),
      member.plan_amount,
      member.status.charAt(0).toUpperCase() + member.status.slice(1),
      member.membership_end_date ? format(new Date(member.membership_end_date), 'dd/MM/yyyy') : '-',
      member.next_due_date ? format(new Date(member.next_due_date), 'dd/MM/yyyy') : '-',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const filterSuffix = filterType === 'all' ? '' : `_${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`;
    const fileName = `${gymName.replace(/[^a-zA-Z0-9]/g, '_')}_Members${filterSuffix}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csvContent, fileName);
    auditLogger.logDataExported(`members_${filterType}`, 'csv', members.length);
  }

  /**
   * Export payments to CSV
   */
  exportPaymentsToCSV(
    payments: PaymentExportData[],
    gymName: string = 'Haefit Gym',
    filterInfo: string = ''
  ): void {
    const headers = ['S.No', 'Receipt No', 'Member Name', 'Amount', 'Payment Method', 'Payment Date', 'Due Date', 'Days Late', 'On Time', 'Notes'];
    
    const rows = payments.map((payment, index) => [
      index + 1,
      payment.receipt_number,
      payment.member_name,
      payment.amount,
      payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1),
      format(new Date(payment.payment_date), 'dd/MM/yyyy'),
      payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy') : '-',
      payment.days_late || 0,
      payment.days_late <= 0 ? 'Yes' : 'No',
      payment.notes || '-',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const filterSuffix = filterInfo ? `_${filterInfo.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const fileName = `${gymName.replace(/[^a-zA-Z0-9]/g, '_')}_Payments${filterSuffix}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csvContent, fileName);
    auditLogger.logDataExported('payments', 'csv', payments.length);
  }

  /**
   * Helper to download CSV content
   */
  private downloadCSV(content: string, fileName: string): void {
    // Add BOM for Excel compatibility with UTF-8
    const BOM = '\uFEFF';
    const csvContent = BOM + content;
    
    // Use data URI approach which works more reliably across browsers
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export member progress history to Excel
   */
  exportProgressToExcel(
    progress: ProgressExportData[], 
    memberName: string
  ): void {
    const data = progress.map((record, index) => ({
      'S.No': index + 1,
      'Date': format(new Date(record.record_date), 'dd/MM/yyyy'),
      'Weight (kg)': record.weight || '-',
      'Height (cm)': record.height || '-',
      'BMI': record.bmi || '-',
      'Body Fat (%)': record.body_fat_percentage || '-',
      'Chest (cm)': record.chest || '-',
      'Waist (cm)': record.waist || '-',
      'Hips (cm)': record.hips || '-',
      'Biceps (cm)': record.biceps || '-',
      'Thighs (cm)': record.thighs || '-',
      'Calves (cm)': record.calves || '-',
      'Notes': record.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // S.No
      { wch: 12 },  // Date
      { wch: 12 },  // Weight
      { wch: 12 },  // Height
      { wch: 8 },   // BMI
      { wch: 12 },  // Body Fat
      { wch: 10 },  // Chest
      { wch: 10 },  // Waist
      { wch: 10 },  // Hips
      { wch: 10 },  // Biceps
      { wch: 10 },  // Thighs
      { wch: 10 },  // Calves
      { wch: 30 },  // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Progress History');

    // Generate filename
    const safeName = memberName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeName}_Progress_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    auditLogger.logDataExported(`progress_${memberName}`, 'excel', progress.length);
  }

  /**
   * Generate comparison text for WhatsApp
   */
  generateComparisonText(
    memberName: string,
    beforeDate: string,
    afterDate: string,
    daysBetween: number,
    changes: Record<string, { before: number; after: number; diff: number } | undefined>,
    gymName: string = 'Haefit Gym'
  ): string {
    let message = `🏋️ *${gymName}*\n\n`;
    message += `📊 *Progress Report*\n`;
    message += `👤 *${memberName}*\n\n`;
    message += `📅 Period: ${format(new Date(beforeDate), 'dd MMM yyyy')} → ${format(new Date(afterDate), 'dd MMM yyyy')}\n`;
    message += `⏱️ Duration: *${daysBetween} days*\n\n`;
    message += `━━━━━━━━━━━━━━━━━\n`;
    message += `*📈 Progress Summary*\n`;
    message += `━━━━━━━━━━━━━━━━━\n\n`;

    const measurements = [
      { key: 'weight', label: 'Weight', unit: 'kg', invertGood: true },
      { key: 'bmi', label: 'BMI', unit: '', invertGood: true },
      { key: 'body_fat_percentage', label: 'Body Fat', unit: '%', invertGood: true },
      { key: 'chest', label: 'Chest', unit: 'cm', invertGood: false },
      { key: 'waist', label: 'Waist', unit: 'cm', invertGood: true },
      { key: 'hips', label: 'Hips', unit: 'cm', invertGood: true },
      { key: 'biceps', label: 'Biceps', unit: 'cm', invertGood: false },
      { key: 'thighs', label: 'Thighs', unit: 'cm', invertGood: false },
      { key: 'calves', label: 'Calves', unit: 'cm', invertGood: false },
    ];

    measurements.forEach(({ key, label, unit, invertGood }) => {
      const change = changes[key];
      if (change) {
        const isPositive = invertGood ? change.diff < 0 : change.diff > 0;
        const emoji = isPositive ? '✅' : (change.diff === 0 ? '➖' : '⚠️');
        const diffStr = change.diff > 0 ? `+${change.diff}` : `${change.diff}`;
        message += `${emoji} *${label}*: ${change.before}${unit} → ${change.after}${unit} (${diffStr}${unit})\n`;
      }
    });

    message += `\n━━━━━━━━━━━━━━━━━\n`;
    message += `\n💪 Keep up the great work!\n`;
    message += `\n_Powered by ${gymName}_`;

    return message;
  }

  /**
   * Share comparison to WhatsApp
   */
  shareToWhatsApp(phone: string, message: string): void {
    // Clean phone number - remove spaces, dashes, and parentheses for wa.me
    let cleanPhone = phone.replace(/[\s\-()]/g, '');
    
    // Handle Indian numbers
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(1); // Remove the +, keep 91
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      // Already has 91 prefix
    } else if (cleanPhone.length === 10) {
      // Add India country code
      cleanPhone = '91' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    auditLogger.logWhatsAppShared('', '', 'progress_comparison');
  }

  /**
   * Capture element as image and share to WhatsApp
   */
  async captureAndShareToWhatsApp(
    element: HTMLElement,
    phone: string,
    memberName: string,
    gymName: string = 'Haefit Gym'
  ): Promise<void> {
    try {
      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png', 0.95);
      });

      // Try to share using Web Share API if available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${memberName}_progress.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${memberName} - Progress Comparison`,
            text: `Progress comparison from ${gymName}`,
            files: [file],
          });
          return;
        }
      }

      // Fallback: Download the image and open WhatsApp
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${memberName.replace(/[^a-zA-Z0-9]/g, '_')}_progress_${format(new Date(), 'yyyy-MM-dd')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open WhatsApp with message
      const message = `🏋️ *${gymName}*\n\n📊 Progress comparison for ${memberName}\n\n_Please share the downloaded image along with this message_`;
      this.shareToWhatsApp(phone, message);
    } catch (error) {
      console.error('Error capturing comparison:', error);
      throw error;
    }
  }

  private formatPlanName(plan: string): string {
    const planNames: Record<string, string> = {
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'half_yearly': 'Half Yearly',
      'annual': 'Annual',
    };
    return planNames[plan] || plan;
  }
}

export const exportService = ExportService.getInstance();
