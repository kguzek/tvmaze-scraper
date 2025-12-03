import path from "node:path";

import express from "express";
import cron from "node-cron";

import { APP_PORT, CRON_SCHEDULE, SCRAPED_FILES_PATH } from "./constants";
import { loadProgramData, programData } from "./data";
import { scrapeNextPage } from "./scraper";
import { log } from "./logging";

const app = express();

async function retryPromise<T>(
  promise: () => Promise<T>,
  delayMs = 10_000,
  maxRetries = 10,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await promise();
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      log.error(`Attempt ${attempt} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`Failed to execute promise after ${maxRetries} attempts`);
}

async function tryScrapeNextPage() {
  try {
    await retryPromise(scrapeNextPage);
  } catch (error) {
    log.error("Scrape failed:", error);
  }
}

async function init() {
  await loadProgramData();

  cron.schedule(CRON_SCHEDULE, tryScrapeNextPage);

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

  await tryScrapeNextPage();

  app.listen(APP_PORT, () => {
    log.info(`Server is running on http://localhost:${APP_PORT}`);
  });
}

init();
