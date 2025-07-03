import express from "express";
import { APP_PORT, CRON_SCHEDULE, SCRAPED_FILES_PATH } from "./constants";
import { loadProgramData, programData } from "./data";
import cron from "node-cron";
import { scrapeNextPage } from "./scraper";
import { log } from "./logging";
import path from "path";

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
    app.get("/scrape", async (req, res) => {
      try {
        await scrapeNextPage();
      } catch (error) {
        res.status(500).json({ message: "Scrape failed", error });
        return;
      }
      res
        .status(200)
        .json({
          message: "Scrape successful",
          lastScrapedPage: programData.lastScrapedPage,
        });
    });
  }

  app.listen(APP_PORT, () => {
    log.info(`Server is running on http://localhost:${APP_PORT}`);
  });
}

init();
