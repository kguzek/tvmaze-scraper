import express from "express";
import cron from "node-cron";
import path from "path";

import { APP_PORT, CRON_SCHEDULE, SCRAPED_FILES_PATH } from "./constants";
import { loadProgramData, programData } from "./data";
import { scrapeNextPage } from "./scraper";
import { log } from "./logging";

const app = express();

async function init() {
  await loadProgramData();

  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await scrapeNextPage();
    } catch (err) {
      log.error("Scrape failed:", err);
    }
  });

  await scrapeNextPage();

  app.use("/shows", express.static(path.resolve(SCRAPED_FILES_PATH)));

  if (process.env.NODE_ENV === "development") {
    app.get("/scrape", async (_, res) => {
      try {
        await scrapeNextPage();
      } catch (error) {
        res.status(500).json({ message: "Scrape failed", status: 500, error });
        return;
      }
      res.status(200).json({
        message: "Scrape successful",
        status: 200,
        lastScrapedPage: programData.lastScrapedPage,
      });
    });
  }

  app.all(/(.*)/, (req, res) => {
    res.status(404).json({
      message: `Cannot ${req.method.toUpperCase()} ${req.path}`,
      status: 404,
    });
  });

  app.listen(APP_PORT, () => {
    log.info(`Server is running on http://localhost:${APP_PORT}`);
  });
}

init();
