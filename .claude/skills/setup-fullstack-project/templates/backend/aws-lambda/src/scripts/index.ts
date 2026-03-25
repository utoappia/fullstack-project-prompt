// Script handler registry
// Scripts are invoked via Lambda self-invocation (fire-and-forget).
// Each script should export: { handler }
//
// Example:
// import * as sendWelcomeEmail from './sendWelcomeEmail.js';
// export const scriptHandlers: Record<string, { handler: Function }> = {
//   sendWelcomeEmail,
// };

export const scriptHandlers: Record<string, { handler: Function }> = {};
