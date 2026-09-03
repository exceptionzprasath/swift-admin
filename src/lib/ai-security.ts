/**
 * SWIFT / SHIFT HRMS AI Security Guardrails & Data Protection Engine
 *
 * Implements multi-layered security:
 * 1. Input Inspection & Secret Extraction Detection
 * 2. Prompt Injection & Jailbreak Defense
 * 3. Output Sanitization & Secret Redaction
 * 4. Data Protection & Sensitive Field Filtering
 */

// Patterns indicating an attempt to extract secrets, keys, or internal prompts
const SECRET_EXTRACTION_PATTERNS = [
  /(?:api[_\s-]?key|api[_\s-]?token|secret[_\s-]?key|auth[_\s-]?token|jwt[_\s-]?token|session[_\s-]?token|oauth[_\s-]?token)/i,
  /(?:password|database[_\s-]?password|db[_\s-]?pass|connection[_\s-]?string|database_url|db_url)/i,
  /(?:\.env|env[_\s-]?file|environment[_\s-]?variable|process\.env)/i,
  /(?:private[_\s-]?key|encryption[_\s-]?key|webhook[_\s-]?secret)/i,
  /(?:aws[_\s-]?access|aws[_\s-]?secret|google[_\s-]?cloud|firebase[_\s-]?key|supabase[_\s-]?key|clerk[_\s-]?key)/i,
  /(?:openai[_\s-]?key|gemini[_\s-]?key|anthropic[_\s-]?key|third[_\s-]?party[_\s-]?credential|github[_\s-]?token|git[_\s-]?credential)/i,
  /(?:admin[_\s-]?credential|server[_\s-]?secret|deployment[_\s-]?secret|payment[_\s-]?secret)/i,
  /(?:source[_\s-]?code[_\s-]?secret|system[_\s-]prompt|developer[_\s-]?instruction|hidden[_\s-]?prompt|security[_\s-]?rule)/i,
];

// Patterns indicating prompt injection / jailbreak attempts
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
  /act\s+as\s+(?:the\s+)?(?:developer|system\s+admin|root|god\s+mode|dan)/i,
  /(?:reveal|show|print|output|display|echo|leak|dump)\s+(?:the\s+)?(?:system\s+prompt|developer\s+instructions|hidden\s+prompt|rules|credentials)/i,
  /(?:base64|hex|rot13|binary|encode|decode|hash)\s+(?:the\s+)?(?:api\s*key|secret|password|credential|prompt)/i,
  /(?:first|last|starting|ending)\s+\d+\s+(?:chars|characters|letters)\s+of\s+(?:the\s+)?(?:key|secret|password|token)/i,
  /(?:does|is)\s+(?:the\s+)?(?:api\s*key|secret|password)\s+(?:start|begin|end)\s+with/i,
  /(?:print|export|dump)\s+all\s+(?:env|environment|credentials|variables|secrets)/i,
];

// RegEx patterns to scrub/redact any accidental secrets from model output
const OUTPUT_SECRET_SCRUBBERS = [
  // OpenAI API Key pattern
  /sk-[a-zA-Z0-9_\-]{20,}/g,
  // AWS Access Key ID pattern
  /AKIA[0-9A-Z]{16}/g,
  // AWS Secret Access Key (heuristics)
  /(?:aws_secret_access_key|secret_key)\s*[:=]\s*['"]?[A-Za-z0-9/+=]{35,45}['"]?/gi,
  // Generic Bearer Tokens & JWTs
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g,
  // Database Connection Strings
  /(?:mongodb|mongodb\+srv|postgres|postgresql|mysql|redis):\/\/[^\s"'<>]+/gi,
  // GitHub Tokens
  /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/g,
  // Generic Private Keys
  /-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z\s]+PRIVATE\s+KEY-----/gi,
  // SMTP passwords in URI format
  /smtp:\/\/[^\s"'<>]+/gi,
];

const SECURITY_REFUSAL_MESSAGE = `🔒 **Security Notice**

I can't provide API keys, passwords, credentials, tokens, or other sensitive system information.

I can help you with HRMS data and application features instead.`;

const ENV_REFUSAL_MESSAGE = `🔒 **Security Notice**

I can't provide environment variables, credentials, or secret configuration.

I can help you troubleshoot the application without exposing secrets.`;

const PROMPT_REFUSAL_MESSAGE = `🔒 **Security Notice**

I can't provide internal system instructions or security configuration.

I can help you with HRMS-related questions instead.`;

export type SecurityInspectionResult = {
  isSafe: boolean;
  reason?: "secret_extraction" | "prompt_injection" | "system_prompt_leak";
  refusalMessage?: string;
};

/**
 * Inspects user input before forwarding to the LLM.
 * Returns an immediate polite refusal if a prohibited extraction attempt is detected.
 */
export function inspectUserInput(text: string): SecurityInspectionResult {
  if (!text || typeof text !== "string") {
    return { isSafe: true };
  }

  const clean = text.trim();

  // 1. Check for prompt injection / jailbreak
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      if (/system\s*prompt|developer\s*instruction|internal\s*instructions/i.test(clean)) {
        return {
          isSafe: false,
          reason: "system_prompt_leak",
          refusalMessage: PROMPT_REFUSAL_MESSAGE,
        };
      }
      return {
        isSafe: false,
        reason: "prompt_injection",
        refusalMessage: SECURITY_REFUSAL_MESSAGE,
      };
    }
  }

  // 2. Check for secret / credential extraction attempts
  const isAskingToReveal = /(?:show|give|tell|print|get|what\s+is|what's|find|export|dump|display|reveal|leak|share|provide|decode|encode|see)/i.test(clean);
  if (isAskingToReveal) {
    for (const pattern of SECRET_EXTRACTION_PATTERNS) {
      if (pattern.test(clean)) {
        if (/system[_\s-]prompt|developer[_\s-]?instruction/i.test(clean)) {
          return {
            isSafe: false,
            reason: "system_prompt_leak",
            refusalMessage: PROMPT_REFUSAL_MESSAGE,
          };
        }
        if (/\.env|environment[_\s-]?variable|process\.env/i.test(clean)) {
          return {
            isSafe: false,
            reason: "secret_extraction",
            refusalMessage: ENV_REFUSAL_MESSAGE,
          };
        }
        return {
          isSafe: false,
          reason: "secret_extraction",
          refusalMessage: SECURITY_REFUSAL_MESSAGE,
        };
      }
    }
  }

  return { isSafe: true };
}

/**
 * Sanitizes LLM output before it is returned to the user or UI.
 * Redacts any accidental keys, tokens, or credential strings,
 * and fixes table line breaks.
 */
export function sanitizeModelOutput(output: string): string {
  if (!output || typeof output !== "string") return output;

  let sanitized = output;

  for (const scrubber of OUTPUT_SECRET_SCRUBBERS) {
    sanitized = sanitized.replace(scrubber, "[REDACTED SENSITIVE CREDENTIAL]");
  }

  // Auto-correct concatenated table pipes into clean multiline table rows
  sanitized = sanitized.replace(/\|\s*\|\s*([-\w\u0900-\u0DFF])/g, "|\n| $1");
  sanitized = sanitized.replace(/\|\s*\|\s*---/g, "|\n|---");

  return sanitized;
}

/**
 * Deeply sanitizes any employee or tenant object before placing into AI snapshot.
 * Strips passwords, auth tokens, secret keys, or private hashes.
 */
export function sanitizeSnapshotData<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  try {
    const serialized = JSON.stringify(obj, (key, value) => {
      // Sensitive keys that must NEVER be passed to LLM
      const lowerKey = key.toLowerCase();
      if (
        lowerKey === "password" ||
        lowerKey === "pass" ||
        lowerKey === "pwd" ||
        lowerKey === "secret" ||
        lowerKey === "secretkey" ||
        lowerKey === "accesskey" ||
        lowerKey === "apikey" ||
        lowerKey === "token" ||
        lowerKey === "authtoken" ||
        lowerKey === "smtppass" ||
        lowerKey === "aws_secret_access_key" ||
        lowerKey === "aws_access_key_id"
      ) {
        return undefined; // Stripped completely
      }
      return value;
    });

    return JSON.parse(serialized);
  } catch {
    return obj;
  }
}
