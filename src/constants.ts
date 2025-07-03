import path from "path";

export const APP_PORT = process.env.NODE_PORT || 3000;
export const DATA_FILE_PATH = "./data/state.json";
export const SHOWS_FILE_PATH = "./data/shows.jsonl";

/** The CRON expression which dictates how often to run the scraper. */
export const CRON_SCHEDULE = "*/10 * * * *";

/** The number of pages of shows that exist in the TVmaze API at the time of writing */
export const KNOWN_PAGES_LENGTH_MINIMUM = 342;
/** The number of shows per page to pre-paginate TV shows into for easy rendering on the frontend */
export const SHOWS_PAGE_LENGTH = 25;

export const SCRAPED_FILES_PATH = "./scraped";
export const MOST_POPULAR_SHOWS_PATH = path.join(
  SCRAPED_FILES_PATH,
  "most-popular",
);
