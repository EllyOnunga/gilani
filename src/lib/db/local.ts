import Dexie, { type Table } from "dexie";
import type { Thread } from "@/lib/hooks/useThreadsQuery";

export interface LocalMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  parts: any[];
  created_at: Date;
  sync_status: "synced" | "pending" | "failed";
}

export class GilaniLocalDB extends Dexie {
  threads!: Table<Thread, string>;
  messages!: Table<LocalMessage, string>;

  constructor() {
    super("GilaniLocalDB");

    this.version(1).stores({
      threads: "id, updated_at",
      messages: "id, conversation_id, created_at, sync_status",
    });
  }
}

export const localDb = new GilaniLocalDB();
