/**
 * Centralized Logging Utility
 * Provides structured logging with environment-aware configuration
 * Auto-redacts sensitive data and supports Sales DNA context
 */

import winston, { format, transports } from 'winston';

// Sensitive data patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /password/gi,
  /api[_-]?key/gi,
  /secret/gi,
  /token/gi,
  /auth[_-]?token/gi,
  /access[_-]?token/gi,
  /refresh[_-]?token/gi,
  /PORTAL_PASSWORD/gi,
  /OPENAI_API_KEY/gi,
  /VAPI_SECRET_KEY/gi,
  /ELEVEN_LABS_API_KEY/gi,
  /DEEPGRAM_API_KEY/gi,
  /TWILIO_AUTH_TOKEN/gi,
  /SUPABASE_SERVICE_ROLE_KEY/gi,
  /CRON_SECRET/gi,
  /SLACK_WEBHOOK_URL/gi,
  /RESEND_API_KEY/gi,
];

/**
 * Redact sensitive data from log messages
 */
function redactSensitiveData(obj: any): any {
  if (typeof obj === 'string') {
    let redacted = obj;
    SENSITIVE_PATTERNS.forEach((pattern) => {
      redacted = redacted.replace(pattern, (match) => {
        // Redact the value after the key
        return match.replace(/([=:]\s*)([^\s,}]+)/gi, '$1[REDACTED]');
      });
    });
    // Redact API keys and tokens in various formats
    redacted = redacted.replace(
      /(?:api[_-]?key|token|secret|password)[=:]\s*([^\s,}]+)/gi,
      '[REDACTED]'
    );
    return redacted;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  if (obj && typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      // Check if key itself is sensitive
      if (
        SENSITIVE_PATTERNS.some((pattern) => pattern.test(key)) ||
        lowerKey.includes('password') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token')
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return obj;
}

/**
 * Custom format for development (colored, readable)
 */
const devFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      const redacted = redactSensitiveData(metadata);
      msg += ` ${JSON.stringify(redacted, null, 2)}`;
    }
    return msg;
  })
);

/**
 * Custom format for production (JSON, structured)
 */
const prodFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
  format((info) => {
    // Redact sensitive data before JSON serialization
    return redactSensitiveData(info);
  })()
);

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Configure log levels based on environment
const logLevel = isDevelopment ? 'debug' : 'info';

// Create Winston logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: isDevelopment ? devFormat : prodFormat,
  transports: [
    // Console transport (always enabled)
    new transports.Console({
      format: isDevelopment ? devFormat : prodFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Sales DNA Context
 * Stores callId and assistantId for automatic attachment to logs
 */
class SalesDNAContext {
  private callId: string | null = null;
  private assistantId: string | null = null;
  private userId: string | null = null;

  setCallId(callId: string | null) {
    this.callId = callId;
  }

  setAssistantId(assistantId: string | null) {
    this.assistantId = assistantId;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  getContext() {
    return {
      ...(this.callId && { callId: this.callId }),
      ...(this.assistantId && { assistantId: this.assistantId }),
      ...(this.userId && { userId: this.userId }),
    };
  }

  clear() {
    this.callId = null;
    this.assistantId = null;
    this.userId = null;
  }
}

const salesDNAContext = new SalesDNAContext();

/**
 * Enhanced logger with Sales DNA context
 */
const enhancedLogger = {
  /**
   * Log error level (system crashes, API failures)
   */
  error: (message: string, ...meta: any[]) => {
    logger.error(message, {
      ...salesDNAContext.getContext(),
      ...meta,
    });
  },

  /**
   * Log warn level (unexpected behavior, exceeded limits)
   */
  warn: (message: string, ...meta: any[]) => {
    logger.warn(message, {
      ...salesDNAContext.getContext(),
      ...meta,
    });
  },

  /**
   * Log info level (standard operations)
   */
  info: (message: string, ...meta: any[]) => {
    logger.info(message, {
      ...salesDNAContext.getContext(),
      ...meta,
    });
  },

  /**
   * Log debug level (raw DNA data, prompt diffs)
   */
  debug: (message: string, ...meta: any[]) => {
    logger.debug(message, {
      ...salesDNAContext.getContext(),
      ...meta,
    });
  },

  /**
   * Log call-specific data with automatic context
   */
  logCall: (callId: string, data: any) => {
    const previousCallId = salesDNAContext.getContext().callId;
    salesDNAContext.setCallId(callId);
    logger.info('Call event', {
      ...salesDNAContext.getContext(),
      callData: redactSensitiveData(data),
    });
    if (previousCallId) {
      salesDNAContext.setCallId(previousCallId);
    }
  },

  /**
   * Set Sales DNA context for subsequent logs
   */
  setContext: (context: {
    callId?: string | null;
    assistantId?: string | null;
    userId?: string | null;
  }) => {
    if (context.callId !== undefined) {
      salesDNAContext.setCallId(context.callId);
    }
    if (context.assistantId !== undefined) {
      salesDNAContext.setAssistantId(context.assistantId);
    }
    if (context.userId !== undefined) {
      salesDNAContext.setUserId(context.userId);
    }
  },

  /**
   * Clear Sales DNA context
   */
  clearContext: () => {
    salesDNAContext.clear();
  },

  /**
   * Get current context (for debugging)
   */
  getContext: () => salesDNAContext.getContext(),
};

export default enhancedLogger;
