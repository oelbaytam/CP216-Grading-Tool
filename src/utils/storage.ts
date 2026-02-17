import { get, set, del } from "idb-keyval";
import { StudentSubmission } from "../types";

const SUBMISSIONS_KEY = "grading-submissions";
const REFERENCES_KEY = "grading-references";
const VIEW_STATE_KEY = "grading-view-state";

export interface ViewState {
  selectedId: string | null;
  selectedSubmissionFile: string | null;
  selectedReferenceFile: string | null;
}

// --- Submissions (Large Data) ---

export const saveSubmissionsToStorage = async (
  submissions: Record<string, StudentSubmission>,
) => {
  // Overwrite existing data
  await set(SUBMISSIONS_KEY, submissions);
};

export const loadSubmissionsFromStorage = async (): Promise<Record<
  string,
  StudentSubmission
> | null> => {
  return await get(SUBMISSIONS_KEY);
};

// --- References (Medium Data) ---

export const saveReferencesToStorage = async (refs: Record<string, string>) => {
  await set(REFERENCES_KEY, refs);
};

export const loadReferencesFromStorage = async (): Promise<Record<
  string,
  string
> | null> => {
  return await get(REFERENCES_KEY);
};

// --- View State (Small Data - LocalStorage is fine, but keeping unified in IDB) ---

export const saveViewState = async (state: ViewState) => {
  await set(VIEW_STATE_KEY, state);
};

export const loadViewState = async (): Promise<ViewState | null> => {
  return await get(VIEW_STATE_KEY);
};

export const clearAllStorage = async () => {
  await del(SUBMISSIONS_KEY);
  await del(REFERENCES_KEY);
  await del(VIEW_STATE_KEY);
};
