import { setup } from './setup.mjs';

await setup();

const { apiHandlers, scriptHandlers } = await import('@project/backend');

export const handler = async (event, context) => {
  try {
    // Script invocation (fire-and-forget)
    if (event.script) {
      const scriptHandler = scriptHandlers[event.script];
      if (!scriptHandler) {
        return { statusCode: 404, body: JSON.stringify({ error: `Script not found: ${event.script}` }) };
      }
      await scriptHandler.handler(event.payload || {});
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // API invocation
    const { action, params, sessionToken } = typeof event.body === 'string'
      ? JSON.parse(event.body)
      : event.body || event;

    const apiHandler = apiHandlers[action];
    if (!apiHandler) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Unknown action: ${action}` }),
      };
    }

    const result = await apiHandler.handler({ params, sessionToken });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('Lambda handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
