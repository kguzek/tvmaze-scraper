import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProgramData } from "./types";
import { DATA_FILE_PATH } from "./constants";

function updateProgramData(newData?: ProgramData) {
  newData ??= programData;
  programData.lastScrapedPage = newData.lastScrapedPage ?? -1;
  programData.totalShows = newData.totalShows ?? 0;
  programData.totalPages = newData.totalPages ?? 0;
}

export async function loadProgramData() {
  try {
    const data = await readFile(DATA_FILE_PATH, "utf-8");
    const parsedData = JSON.parse(data) as ProgramData;
    updateProgramData(parsedData);
  } catch {
    // write initial data file if it doesn't exist
    await saveProgramData();
  }
}

export async function saveProgramData() {
  updateProgramData();
  const jsonData = JSON.stringify(programData, null, 2);
  await mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
  await writeFile(DATA_FILE_PATH, jsonData, "utf-8");
}

export const programData: ProgramData = {
  lastScrapedPage: -1,
  totalShows: 0,
  totalPages: 0,
};
