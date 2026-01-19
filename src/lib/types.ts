export type User = {
  id: string;
  email: string;
  passwordHash: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export type Mailbox = {
  id: string;
  projectId: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  tls: boolean;
  pollingIntervalMinutes: number;
  createdAt: string;
};

export type EmailRecord = {
  id: string;
  mailboxId: string;
  subject: string;
  sender: string;
  body: string;
  receivedAt: string;
};

export type ParseResult = {
  id: string;
  emailId: string;
  lead: boolean;
  confidence: number;
  fields: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type Database = {
  users: User[];
  projects: Project[];
  mailboxes: Mailbox[];
  emails: EmailRecord[];
  parseResults: ParseResult[];
};
