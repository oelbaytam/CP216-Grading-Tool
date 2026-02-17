export interface StudentSubmission {
  studentId: string;
  studentName: string;
  studentCode: string;
  zipFilename: string;
  rawZipBlob: Blob;
  files: Record<string, string>;
}
