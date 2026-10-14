// Vercel detects this root-level Express entry point and runs it as a Function.
// The same Express app is also used by `npm start` for local production testing.
import app from './server/index.js';

export default app;
