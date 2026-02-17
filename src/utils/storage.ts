import { get, set, del } from 'idb-keyval';
import { StudentSubmission } from '../types';

const SUBMISSIONS_KEY = 'grading-submissions';
const REFERENCES_KEY = 'grading-references';
const VIEW_STATE_KEY = 'grading-view-state';

export interface ViewState {
  selectedId: string | null;
  selectedSubmissionFile: string | null;
  selectedReferenceFile: string | null;
}

// --- Submissions (Large Data) ---

export const saveSubmissionsToStorage = async (submissions: Record<string, StudentSubmission>) => {
  // Overwrite existing data
  await set(SUBMISSIONS_KEY, submissions);
};

export const loadSubmissionsFromStorage = async (): Promise<Record<string, StudentSubmission> | null> => {
  // If get() returns undefined, default to null to match return type
  return (await get(SUBMISSIONS_KEY)) || null;
};

// --- References (Medium Data) ---

export const saveReferencesToStorage = async (refs: Record<string, string>) => {
  await set(REFERENCES_KEY, refs);
};

export const loadReferencesFromStorage = async (): Promise<Record<string, string> | null> => {
  return (await get(REFERENCES_KEY)) || null;
};

// --- View State (Small Data) ---

export const saveViewState = async (state: ViewState) => {
  await set(VIEW_STATE_KEY, state);
};

export const loadViewState = async (): Promise<ViewState | null> => {
  return (await get(VIEW_STATE_KEY)) || null;
};

export const clearAllStorage = async () => {
  await del(SUBMISSIONS_KEY);
  await del(REFERENCES_KEY);
  await del(VIEW_STATE_KEY);
};
