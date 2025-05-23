import { SectionSeparator } from "formatter";

import { FormatOptions } from "formatter";

export const DEFAULT_CHARACTER_ENCODING = "utf8";
export const LIBRARY_NAME = "minorprompt";

export const DEFAULT_PERSONA_ROLE = "developer";

export const DEFAULT_INSTRUCTIONS_AREA_TITLE = "Instructions";
export const DEFAULT_CONTENTS_AREA_TITLE = "Contents";
export const DEFAULT_CONTEXT_AREA_TITLE = "Context";

export const DEFAULT_IGNORE_PATTERNS: string[] = [
    "^\\..*", // Hidden files (e.g., .git, .DS_Store)
    "\\.(jpg|jpeg|png|gif|bmp|svg|webp|ico)$", // Image files
    "\\.(mp3|wav|ogg|aac|flac)$", // Audio files
    "\\.(mp4|mov|avi|mkv|webm)$", // Video files
    "\\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$", // Document files
    "\\.(zip|tar|gz|rar|7z)$" // Compressed files
];

export const DEFAULT_SECTION_SEPARATOR: SectionSeparator = "tag";
export const DEFAULT_SECTION_INDENTATION = true;
export const DEFAULT_SECTION_TAG = "section";
export const DEFAULT_SECTION_TITLE_PROPERTY = "title";

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
    sectionSeparator: DEFAULT_SECTION_SEPARATOR,
    sectionIndentation: DEFAULT_SECTION_INDENTATION,
    sectionTitleProperty: DEFAULT_SECTION_TITLE_PROPERTY,
    sectionDepth: 0,
}
