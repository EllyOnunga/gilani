export interface BlockMeta {

    icon?: string;

    subject?: string;

    difficulty?: "easy" | "medium" | "hard";

    collapsible?: boolean;

    defaultOpen?: boolean;

    language?: string;

    tags?: string[];

    source?: string;

}