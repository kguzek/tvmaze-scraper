import { createReadStream } from "node:fs";
import { appendFile, writeFile, rm, mkdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

import { getAllShows, type Show } from "tvmaze-wrapper-ts";

import {
  KNOWN_PAGES_LENGTH_MINIMUM,
  MOST_POPULAR_SHOWS_PATH,
  SHOWS_FILE_PATH,
  SHOWS_PAGE_LENGTH,
} from "./constants";
import { loadProgramData, programData, saveProgramData } from "./data";
import { log } from "./logging";

export async function scrapeNextPage() {
  await loadProgramData();
  programData.lastScrapedPage++;
  log.info(`Scraping page ${programData.lastScrapedPage}`);
  const shows = await getAllShows(programData.lastScrapedPage);
  if (shows.length === 0) {
    if (programData.lastScrapedPage < KNOWN_PAGES_LENGTH_MINIMUM) {
      throw new Error(
        `Scraping stopped at page ${programData.lastScrapedPage}, but there are still known pages to scrape.`,
      );
    }
    await organiseAllShows();
    programData.lastScrapedPage = -1;
  } else {
    await saveScrapedShows(shows);
  }
  await saveProgramData();
}

/** Incrementally saves the currently scraped shows to the cumulative JSON-Lines store. */
async function saveScrapedShows(shows: Show[]) {
  const jsonl = shows.map((show) => JSON.stringify(show)).join("\n");
  await appendFile(SHOWS_FILE_PATH, jsonl + "\n", "utf-8");
}

function* paginateArray<T>(arr: T[], pageLength: number) {
  let page = 1;
  for (let i = 0; i < arr.length; i += pageLength) {
    const shows = arr.slice(i, i + pageLength);
    const start = i + 1;
    const end = i + shows.length;
    const meta = { page, start, end };
    yield [meta, shows] as const;
    page++;
  }
}

/**
 * Returns the show's average rating, or 5.0 if not available.
 * @since 1.1.0
 */
const getShowRating = (show: Show) => show.rating.average ?? 5.0;

/** Called when the scraper reaches the end of the TV show index.
 *  Sorts the TV shows by popularity and paginates them into even chunks.
 */
async function organiseAllShows() {
  log.info("Reached end of show index, organising data...");

  const fileStream = createReadStream(SHOWS_FILE_PATH);
  const readlineInterface = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const showsSet: Set<Show> = new Set();

  for await (const line of readlineInterface) {
    if (!line.trim()) continue;
    try {
      const show: Show = JSON.parse(line);
      showsSet.add(show);
    } catch (err) {
      log.error("Skipping invalid line:", line);
    }
  }

  programData.totalShows = showsSet.size;
  const allShows: Show[] = [...showsSet];
  programData.totalPages = Math.ceil(
    programData.totalShows / SHOWS_PAGE_LENGTH,
  );
  await saveProgramData();
  allShows.sort((a, b) => getShowRating(b) - getShowRating(a));
  await rm(MOST_POPULAR_SHOWS_PATH, { recursive: true, force: true });
  await mkdir(MOST_POPULAR_SHOWS_PATH, { recursive: true });

  const writePromises = [];
  for (const [meta, shows] of paginateArray(allShows, SHOWS_PAGE_LENGTH)) {
    writePromises.push(
      writeFile(
        `${MOST_POPULAR_SHOWS_PATH}/${meta.page}.json`,
        JSON.stringify({
          meta: {
            ...meta,
            totalShows: programData.totalShows,
            totalPages: programData.totalPages,
          },
          data: shows,
        }),
        "utf-8",
      ),
    );
  }
  await Promise.all(writePromises);
  await rm(SHOWS_FILE_PATH, { force: true });
  log.info("Finished organising show data");
}
