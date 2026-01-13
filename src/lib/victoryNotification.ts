/**
 * Victory Notification Service
 * Sends high-priority SMS via Twilio when contract is signed
 */

import logger from './logger';

export interface VictoryNotificationData {
  callId: string;
  propertyAddress: string;
  dealProfit: number;
  envelopeId?: string;
  signedPdfUrl?: string;
}

/**
 * Send victory SMS notification when contract is signed
 */
export async function sendVictorySMS(data: VictoryNotificationData): Promise<boolean> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const alertPhoneNumber = process.env.ALERT_PHONE_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !alertPhoneNumber) {
    logger.warn('Twilio credentials not configured - skipping victory SMS');
    return false;
  }

  // Format profit for display
  const profitFormatted = `$${data.dealProfit.toLocaleString()}`;
  
  // Victory message format: "💰 CONTRACT SIGNED: [Address] | Profit: $[Amount]. Title search initiated."
  const message = `💰 CONTRACT SIGNED: ${data.propertyAddress} | Profit: ${profitFormatted}. Title search initiated.`;

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('From', twilioPhoneNumber);
    formData.append('To', alertPhoneNumber);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Twilio victory SMS error', {
        status: response.status,
        error: errorText,
        callId: data.callId,
      });
      return false;
    }

    const result = await response.json();
    logger.info('🎉 Victory SMS sent successfully', {
      callId: data.callId,
      propertyAddress: data.propertyAddress,
      profit: data.dealProfit,
      messageSid: result.sid,
    });

    return true;
  } catch (error) {
    logger.error('Error sending victory SMS', {
      error,
      callId: data.callId,
    });
    return false;
  }
}
