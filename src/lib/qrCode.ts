import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL
 * @param data - The data to encode in the QR code
 * @param options - QR code options
 * @returns Data URL of the QR code image
 */
export async function generateQRCode(
  data: string,
  options?: {
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: options?.width || 300,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a QR code for a member
 * @param memberId - The member ID
 * @param gymId - The gym ID
 * @returns Data URL of the QR code image
 */
export async function generateMemberQRCode(
  memberId: string,
  gymId: string
): Promise<string> {
  const qrData = JSON.stringify({
    type: 'member_checkin',
    memberId,
    gymId,
    timestamp: new Date().toISOString(),
  });

  return generateQRCode(qrData, {
    width: 300,
    errorCorrectionLevel: 'H', // Higher error correction for better scanning
  });
}

/**
 * Parse member QR code data
 * @param qrData - The scanned QR code data
 * @returns Parsed member data
 */
export function parseMemberQRCode(qrData: string): {
  type: string;
  memberId: string;
  gymId: string;
  timestamp: string;
} | null {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.type === 'member_checkin' && parsed.memberId && parsed.gymId) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
}

/**
 * Download QR code as an image file
 * @param dataUrl - The QR code data URL
 * @param filename - The filename for the download
 */
export function downloadQRCode(dataUrl: string, filename: string = 'qr-code.png'): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a QR code as a canvas element
 * @param data - The data to encode
 * @param canvasElement - The canvas element to render to
 * @param options - QR code options
 */
export async function generateQRCodeToCanvas(
  data: string,
  canvasElement: HTMLCanvasElement,
  options?: {
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<void> {
  try {
    await QRCode.toCanvas(canvasElement, data, {
      width: options?.width || 300,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    });
  } catch (error) {
    console.error('Error generating QR code to canvas:', error);
    throw new Error('Failed to generate QR code');
  }
}
