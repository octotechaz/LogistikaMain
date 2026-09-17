import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { apiRoutes } from "./routes";
import { ErrorMiddleware } from "./middleware/ErrorMiddleware";

export class BackendApp {
  readonly app = express();

  constructor() {
    this.configure();
    this.routes();
    this.errors();
  }

  private configure() {
    this.app.disable("x-powered-by");
    this.app.use(
      cors({
        // Use an origin callback so each request's Origin header is checked
        // against the parsed allowlist — never a raw comma string or wildcard.
        origin: (requestOrigin, callback) => {
          if (requestOrigin === undefined) {
            // No Origin header: server-to-server or same-origin browser request.
            // Allow but do not echo an Access-Control-Allow-Origin header.
            callback(null, false);
            return;
          }
          if (config.corsOrigins.has(requestOrigin)) {
            callback(null, true);
          } else {
            callback(new Error(`Origin not allowed by CORS policy`));
          }
        },
        credentials: true,
      })
    );
    this.app.use(express.json({ limit: "2mb" }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private routes() {
    this.app.use("/api", apiRoutes);
  }

  private errors() {
    this.app.use(ErrorMiddleware.notFound);
    this.app.use(ErrorMiddleware.handle);
  }
}