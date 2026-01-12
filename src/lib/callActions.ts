/**
 * Call Actions Service
 * Handles post-call actions like contract generation and lead escalation
 */

import logger from './logger';

export interface CommitmentSignal {
  detected: boolean;
  confidence: number; // 0-1
  phrases: string[]; // Phrases that triggered detection
  timestamp: string;
}

/**
 * Detect commitment to sign in transcript
 * Looks for verbal agreements and commitment phrases
 */
export function detectCommitmentToSign(transcript: string): CommitmentSignal {
  const commitmentPhrases = [
    // Direct agreements
    'i accept',
    'i agree',
    'let\'s do it',
    'deal',
    'we have a deal',
    'i\'ll sign',
    'send me the contract',
    'send me the paperwork',
    'i\'m ready to sign',
    'let\'s move forward',
    'yes, let\'s do it',
    'i\'m in',
    'count me in',
    'i want to proceed',
    'let\'s proceed',
    'i\'m ready',
    'let\'s get started',
    // Conditional agreements
    'as long as',
    'if you can',
    'provided that',
    'on the condition',
    // Verbal commitments
    'i commit',
    'i\'m committed',
    'you have my word',
    'i promise',
    'i guarantee',
  ];

  const lowerTranscript = transcript.toLowerCase();
  const detectedPhrases: string[] = [];

  // Check for commitment phrases
  commitmentPhrases.forEach((phrase) => {
    if (lowerTranscript.includes(phrase)) {
      detectedPhrases.push(phrase);
    }
  });

  // Calculate confidence based on number and type of phrases
  let confidence = 0;
  if (detectedPhrases.length > 0) {
    // Direct agreements are higher confidence
    const directPhrases = detectedPhrases.filter((p) =>
      ['i accept', 'i agree', 'let\'s do it', 'deal', 'i\'ll sign', 'send me the contract'].includes(p)
    );
    confidence = Math.min(0.5 + detectedPhrases.length * 0.1 + directPhrases.length * 0.2, 1.0);
  }

  const detected = confidence >= 0.5;

  logger.info('Commitment detection', {
    detected,
    confidence,
    phrasesFound: detectedPhrases.length,
  });

  return {
    detected,
    confidence,
    phrases: detectedPhrases,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Trigger contract generation via external webhook (Zapier/Make.com)
 */
export async function triggerContract(
  callId: string,
  propertyAddress: string,
  sellerName: string,
  sellerEmail: string,
  offerPrice: number,
  exitStrategy: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; contractUrl?: string; error?: string }> {
  const webhookUrl = process.env.CONTRACT_WEBHOOK_URL; // Zapier/Make.com webhook

  if (!webhookUrl) {
    logger.warn('Contract webhook URL not configured');
    return {
      success: false,
      error: 'Contract webhook URL not configured',
    };
  }

  logger.info('Triggering contract generation', {
    callId,
    propertyAddress,
    sellerEmail,
    offerPrice,
  });

  try {
    const payload = {
      callId,
      propertyAddress,
      sellerName,
      sellerEmail,
      offerPrice,
      exitStrategy,
      contractType: 'Purchase and Sale Agreement',
      metadata: {
        ...metadata,
        triggeredAt: new Date().toISOString(),
        source: 'apex-closer-ai',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Contract webhook error', {
        status: response.status,
        error: errorText,
      });
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    logger.info('Contract triggered successfully', {
      callId,
      contractUrl: result.contractUrl,
    });

    return {
      success: true,
      contractUrl: result.contractUrl || result.docusignUrl,
    };
  } catch (error: any) {
    logger.error('Error triggering contract', { error, callId });
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Process call completion and trigger actions if needed
 */
export async function processCallCompletion(
  callId: string,
  transcript: string,
  propertyAddress: string,
  sellerName?: string,
  sellerEmail?: string,
  offerPrice?: number,
  exitStrategy?: string,
  metadata?: Record<string, any>
): Promise<{
  commitmentDetected: boolean;
  contractTriggered: boolean;
  contractUrl?: string;
}> {
  // Detect commitment
  const commitment = detectCommitmentToSign(transcript);

  let contractTriggered = false;
  let contractUrl: string | undefined;

  // If commitment detected and we have required info, trigger contract
  if (commitment.detected && sellerEmail && offerPrice) {
    const result = await triggerContract(
      callId,
      propertyAddress,
      sellerName || 'Seller',
      sellerEmail,
      offerPrice,
      exitStrategy || 'cash',
      metadata
    );

    contractTriggered = result.success;
    contractUrl = result.contractUrl;

    if (result.success) {
      logger.info('Contract generated and sent', {
        callId,
        sellerEmail,
        contractUrl,
      });
    } else {
      logger.error('Failed to trigger contract', {
        callId,
        error: result.error,
      });
    }
  } else if (commitment.detected) {
    logger.warn('Commitment detected but missing required info for contract', {
      callId,
      hasEmail: !!sellerEmail,
      hasPrice: !!offerPrice,
    });
  }

  return {
    commitmentDetected: commitment.detected,
    contractTriggered,
    contractUrl,
  };
}
