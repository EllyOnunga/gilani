export interface BlockMetadata {
    language?: string;
    fileName?: string;
    displayMode?: boolean;

    numbered?: boolean;
    subject?: string;
    difficulty?: "easy" | "medium" | "hard";

    collapsible?: boolean;
    defaultOpen?: boolean;

    icon?: string;

    tags?: string[];

    source?: string;

    streamed?: boolean;

    createdAt?: number;

    level?: number;

    href?: string;

    ordered?: boolean;
}