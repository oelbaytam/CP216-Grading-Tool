interface ParsedStudentInfo {
  id: string | null;
  name: string | null;
  code: string | null;
}

export const parseStudentInfo = (filename: string): ParsedStudentInfo => {
  const result: ParsedStudentInfo = {
    id: null,
    name: null,
    code: null,
  };

  const cleanFilename = filename.replace(/\.[^/.]+$/, "");
  const parts = cleanFilename.split("+");

  if (parts.length >= 4) {
    const rawId = parts[1]?.trim();
    if (rawId && /^\d+$/.test(rawId)) {
      result.id = rawId;
    }
    const rawName = parts[2]?.trim();
    if (rawName) {
      result.name = rawName;
    }
    const rawCodeSegment = parts[parts.length - 1]?.trim();
    if (rawCodeSegment) {
      result.code = rawCodeSegment.split("_")[0];
    }
  }

  if (!result.id || !result.name) {
    if (!result.id) {
      const idMatch = filename.match(/(\d{5,})/);
      if (idMatch) result.id = idMatch[1];
    }
    if (!result.name) {
      const parts = filename.split("_");
      if (parts.length >= 2) result.name = `${parts[1]} ${parts[0]}`;
    }
  }

  return result;
};
