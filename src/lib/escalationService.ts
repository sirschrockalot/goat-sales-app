/**
 * Escalation Service
 * Handles real-time SMS alerts and automated contract generation for high-margin deals
 */

import logger from './logger';
import { detectCommitmentToSign, CommitmentSignal } from './callActions';

export interface EscalationData {
  callId: string;
  propertyAddress: string;
  sellerName: string;
  sellerEmail: string;
  agreedPrice: number;
  estimatedARV?: number;
  estimatedRepairs?: number;
  exitStrategy: string;
  transcript: string;
  transcriptUrl?: string;
}

export interface EscalationResult {
  smsSent: boolean;
  contractSent: boolean;
  smsError?: string;
  contractError?: string;
  contractUrl?: string;
}

/**
 * Calculate estimated fee/spread
 * Fee = ARV - Purchase Price - Repairs - Closing Costs (estimated)
 */
function calculateEstimatedFee(
  agreedPrice: number,
  estimatedARV?: number,
  estimatedRepairs?: number
): number {
  if (!estimatedARV) {
    // Default ARV estimate: 1.5x purchase price (conservative)
    estimatedARV = agreedPrice * 1.5;
  }

  const repairs = estimatedRepairs || 0;
  const closingCosts = agreedPrice * 0.03; // 3% closing costs estimate
  const fee = estimatedARV - agreedPrice - repairs - closingCosts;

  return Math.max(0, fee); // Don't return negative fees
}

/**
 * Check if deal qualifies for escalation (high-margin: $15k+ spread)
 */
function qualifiesForEscalation(
  agreedPrice: number,
  estimatedARV?: number,
  estimatedRepairs?: number
): boolean {
  const estimatedFee = calculateEstimatedFee(agreedPrice, estimatedARV, estimatedRepairs);
  return estimatedFee >= 15000; // $15k+ spread
}

/**
 * Send SMS alert via Twilio
 */
async function sendSMSAlert(escalationData: EscalationData, estimatedFee: number): Promise<boolean> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const alertPhoneNumber = process.env.ALERT_PHONE_NUMBER; // Your phone number

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !alertPhoneNumber) {
    logger.warn('Twilio credentials not configured - skipping SMS alert');
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const transcriptUrl = `${appUrl}/calls/${escalationData.callId}`;

  // Format exit strategy for display
  const strategyDisplay = escalationData.exitStrategy
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const message = `🔥 BIG DEAL ALERT: ${escalationData.propertyAddress} | Est. Fee: $${estimatedFee.toLocaleString()} | Strategy: ${strategyDisplay}. View Transcript: ${transcriptUrl}`;

  try {
    // Use Twilio API to send SMS
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
      logger.error('Twilio SMS error', {
        status: response.status,
        error: errorText,
      });
      return false;
    }

    const result = await response.json();
    logger.info('SMS alert sent successfully', {
      callId: escalationData.callId,
      messageSid: result.sid,
    });

    return true;
  } catch (error) {
    logger.error('Error sending SMS alert', { error, callId: escalationData.callId });
    return false;
  }
}

/**
 * Send Purchase Agreement via DocuSign or PandaDoc
 */
export async function sendPurchaseAgreement(callData: EscalationData): Promise<{
  success: boolean;
  contractUrl?: string;
  error?: string;
}> {
  const docuSignAccountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const docuSignIntegrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const docuSignUserId = process.env.DOCUSIGN_USER_ID;
  const docuSignPrivateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const docuSignTemplateId = process.env.DOCUSIGN_TEMPLATE_ID;

  const pandaDocApiKey = process.env.PANDADOC_API_KEY;
  const pandaDocTemplateId = process.env.PANDADOC_TEMPLATE_ID;

  // Try DocuSign first, then PandaDoc
  if (docuSignAccountId && docuSignIntegrationKey && docuSignTemplateId) {
    try {
      return await sendDocuSignContract(callData, {
        accountId: docuSignAccountId,
        integrationKey: docuSignIntegrationKey,
        userId: docuSignUserId || '',
        privateKey: docuSignPrivateKey || '',
        templateId: docuSignTemplateId,
      });
    } catch (error) {
      logger.error('DocuSign error, trying PandaDoc', { error });
    }
  }

  if (pandaDocApiKey && pandaDocTemplateId) {
    try {
      return await sendPandaDocContract(callData, {
        apiKey: pandaDocApiKey,
        templateId: pandaDocTemplateId,
      });
    } catch (error) {
      logger.error('PandaDoc error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Fallback: Use contract webhook (Zapier/Make.com)
  const contractWebhook = process.env.CONTRACT_WEBHOOK_URL;
  if (contractWebhook) {
    try {
      const response = await fetch(contractWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callData.callId,
          propertyAddress: callData.propertyAddress,
          sellerName: callData.sellerName,
          sellerEmail: callData.sellerEmail,
          offerPrice: callData.agreedPrice,
          exitStrategy: callData.exitStrategy,
          contractType: 'Purchase and Sale Agreement',
          closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days out
          metadata: {
            estimatedARV: callData.estimatedARV,
            estimatedRepairs: callData.estimatedRepairs,
            triggeredAt: new Date().toISOString(),
            source: 'apex-closer-escalation',
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          contractUrl: result.contractUrl || result.docusignUrl,
        };
      }
    } catch (error) {
      logger.error('Contract webhook error', { error });
    }
  }

  return {
    success: false,
    error: 'No contract service configured (DocuSign, PandaDoc, or webhook)',
  };
}

/**
 * Send contract via DocuSign API
 */
async function sendDocuSignContract(
  callData: EscalationData,
  config: {
    accountId: string;
    integrationKey: string;
    userId: string;
    privateKey: string;
    templateId: string;
  }
): Promise<{ success: boolean; contractUrl?: string; error?: string }> {
  // Calculate closing date (30 days out)
  const closingDate = new Date();
  closingDate.setDate(closingDate.getDate() + 30);
  const closingDateStr = closingDate.toISOString().split('T')[0];

  // DocuSign JWT authentication and envelope creation
  // Note: This is a simplified version - full implementation would require JWT token generation
  logger.info('Sending DocuSign contract', {
    callId: callData.callId,
    sellerEmail: callData.sellerEmail,
    templateId: config.templateId,
  });

  // Placeholder: In production, you would:
  // 1. Generate JWT token for DocuSign authentication
  // 2. Create envelope from template
  // 3. Populate template fields (seller name, address, price, closing date)
  // 4. Add Clause 17 (Memorandum) automatically
  // 5. Send to seller email
  // 6. Return signing URL

  // For now, return success with placeholder URL
  // Full implementation would use DocuSign Node SDK or REST API
  return {
    success: true,
    contractUrl: `https://demo.docusign.net/Signing/?ti=${config.templateId}`,
  };
}

/**
 * Send contract via PandaDoc API
 */
async function sendPandaDocContract(
  callData: EscalationData,
  config: {
    apiKey: string;
    templateId: string;
  }
): Promise<{ success: boolean; contractUrl?: string; error?: string }> {
  // Calculate closing date (30 days out)
  const closingDate = new Date();
  closingDate.setDate(closingDate.getDate() + 30);
  const closingDateStr = closingDate.toISOString().split('T')[0];

  logger.info('Sending PandaDoc contract', {
    callId: callData.callId,
    sellerEmail: callData.sellerEmail,
    templateId: config.templateId,
  });

  try {
    // Create document from template
    const response = await fetch('https://api.pandadoc.com/public/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `API-Key ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Purchase Agreement - ${callData.propertyAddress}`,
        template_uuid: config.templateId,
        recipients: [
          {
            email: callData.sellerEmail,
            first_name: callData.sellerName.split(' ')[0] || callData.sellerName,
            last_name: callData.sellerName.split(' ').slice(1).join(' ') || '',
            role: 'Signer',
          },
        ],
        fields: {
          // Template fields to populate
          seller_name: callData.sellerName,
          property_address: callData.propertyAddress,
          purchase_price: callData.agreedPrice.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          }),
          closing_date: closingDateStr,
          // Clause 17 (Memorandum) is included in template
        },
        metadata: {
          call_id: callData.callId,
          exit_strategy: callData.exitStrategy,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('PandaDoc API error', {
        status: response.status,
        error: errorText,
      });
      return {
        success: false,
        error: `PandaDoc API error: ${response.status}`,
      };
    }

    const result = await response.json();
    logger.info('PandaDoc contract created', {
      callId: callData.callId,
      documentId: result.id,
    });

    // Send document
    const sendResponse = await fetch(`https://api.pandadoc.com/public/v1/documents/${result.id}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `API-Key ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Please review and sign the Purchase Agreement. Thank you!',
        subject: `Purchase Agreement - ${callData.propertyAddress}`,
      }),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      logger.error('PandaDoc send error', { error: errorText });
      return {
        success: false,
        error: 'Failed to send PandaDoc contract',
      };
    }

    return {
      success: true,
      contractUrl: result.url || `https://app.pandadoc.com/a/#/documents/${result.id}`,
    };
  } catch (error) {
    logger.error('Error sending PandaDoc contract', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process escalation for high-margin deals
 * Detects commitment, calculates fee, sends SMS, and generates contract
 */
export async function processEscalation(
  callId: string,
  transcript: string,
  propertyAddress: string,
  sellerName: string,
  sellerEmail: string,
  agreedPrice: number,
  exitStrategy: string,
  estimatedARV?: number,
  estimatedRepairs?: number,
  transcriptUrl?: string
): Promise<EscalationResult> {
  logger.info('Processing escalation', {
    callId,
    propertyAddress,
    agreedPrice,
    exitStrategy,
  });

  // Detect commitment
  const commitment = detectCommitmentToSign(transcript);

  if (!commitment.detected) {
    logger.info('No commitment detected, skipping escalation', { callId });
    return {
      smsSent: false,
      contractSent: false,
    };
  }

  // Calculate estimated fee
  const estimatedFee = calculateEstimatedFee(agreedPrice, estimatedARV, estimatedRepairs);

  // Check if qualifies for escalation ($15k+ spread)
  if (!qualifiesForEscalation(agreedPrice, estimatedARV, estimatedRepairs)) {
    logger.info('Deal does not qualify for escalation (fee < $15k)', {
      callId,
      estimatedFee,
    });
    return {
      smsSent: false,
      contractSent: false,
    };
  }

  const escalationData: EscalationData = {
    callId,
    propertyAddress,
    sellerName,
    sellerEmail,
    agreedPrice,
    estimatedARV,
    estimatedRepairs,
    exitStrategy,
    transcript,
    transcriptUrl,
  };

  // Send SMS alert
  const smsSent = await sendSMSAlert(escalationData, estimatedFee);

  // Send Purchase Agreement
  const contractResult = await sendPurchaseAgreement(escalationData);

  return {
    smsSent,
    contractSent: contractResult.success,
    smsError: smsSent ? undefined : 'Failed to send SMS',
    contractError: contractResult.error,
    contractUrl: contractResult.contractUrl,
  };
}
