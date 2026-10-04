import serverless from 'serverless-http';
import connectDB from '../../../server/src/config/db.js';
import { purgeExpiredDemoAccounts } from '../../../server/src/controllers/authController.js';
import { app } from '../../../server/src/server.js';

const invokeExpress = serverless(app);
const cleanupInterval = 60 * 1000;
let lastCleanupAt = 0;
let cleanupPromise;

const cleanExpiredDemoAccounts = async () => {
  if (Date.now() - lastCleanupAt < cleanupInterval) return;
  if (!cleanupPromise) {
    cleanupPromise = purgeExpiredDemoAccounts()
      .then(() => { lastCleanupAt = Date.now(); })
      .finally(() => { cleanupPromise = undefined; });
  }
  await cleanupPromise;
};

const handleRequest = async (request) => {
  try {
    const url = new URL(request.url);

    if (url.pathname !== '/api/health') {
      if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET must be set in production');
      }
      try {
        await connectDB();
        await cleanExpiredDemoAccounts();
      } catch (error) {
        console.error('Vercel MongoDB connection failed:', error.message);
        const message = error.message.includes('MONGO_URI')
          ? error.message
          : 'Database connection is temporarily unavailable. Please retry in a moment.';
        return Response.json({ message }, { status: 503 });
      }
    }

    const queryEntries = [...url.searchParams.entries()];
    const queryStringParameters = Object.fromEntries(queryEntries);
    const multiValueQueryStringParameters = queryEntries.reduce((params, [key, value]) => {
      params[key] = [...(params[key] || []), value];
      return params;
    }, {});
    const event = {
      httpMethod: request.method,
      path: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
      queryStringParameters,
      multiValueQueryStringParameters,
      body: request.body ? await request.text() : null,
      isBase64Encoded: false,
    };

    const result = await invokeExpress(event, {});
    const headers = new Headers(result.headers);
    headers.delete('connection');
    headers.delete('content-length');
    headers.delete('transfer-encoding');

    return new Response(
      request.method === 'HEAD' || result.statusCode === 204 ? null : result.body,
      { status: result.statusCode, headers },
    );
  } catch (error) {
    console.error('Vercel API request failed:', error.message);
    const message = error.message.includes('MONGO_URI') || error.message.includes('JWT_SECRET')
      ? error.message
      : 'The API could not complete this request. Please try again.';
    return Response.json({ message }, { status: 500 });
  }
};

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as PUT,
  handleRequest as PATCH,
  handleRequest as DELETE,
  handleRequest as OPTIONS,
  handleRequest as HEAD,
};
