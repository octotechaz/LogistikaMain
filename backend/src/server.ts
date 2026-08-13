import "dotenv/config";
import { config } from "./config";
import { BackendApp } from "./app";

const backend = new BackendApp();

backend.app.listen(config.port, config.host, () => {
  console.log(`Express backend ready on http://${config.host}:${config.port}`);
});