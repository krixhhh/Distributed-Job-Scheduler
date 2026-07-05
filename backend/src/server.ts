import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { logger } from "./config/logger.js";

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`Backend REST API server listening on port ${PORT}`);
  logger.info(`Swagger Documentation is active at http://localhost:${PORT}/docs`);
});

export default server;
export { server };
