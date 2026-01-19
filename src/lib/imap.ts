import dns from "dns/promises";

type ImapLookup = {
  host: string | null;
  port?: number;
  provider?: string;
  source: "domain" | "mx" | "unknown";
};

const domainMap: Record<string, { host: string; provider: string; port: number }> = {
  "gmail.com": { host: "imap.gmail.com", provider: "Google", port: 993 },
  "googlemail.com": { host: "imap.gmail.com", provider: "Google", port: 993 },
  "outlook.com": { host: "outlook.office365.com", provider: "Microsoft", port: 993 },
  "hotmail.com": { host: "outlook.office365.com", provider: "Microsoft", port: 993 },
  "live.com": { host: "outlook.office365.com", provider: "Microsoft", port: 993 },
  "office365.com": { host: "outlook.office365.com", provider: "Microsoft", port: 993 },
  "yahoo.com": { host: "imap.mail.yahoo.com", provider: "Yahoo", port: 993 },
  "icloud.com": { host: "imap.mail.me.com", provider: "Apple", port: 993 },
  "me.com": { host: "imap.mail.me.com", provider: "Apple", port: 993 },
  "proton.me": { host: "imap.protonmail.com", provider: "Proton", port: 993 },
  "protonmail.com": { host: "imap.protonmail.com", provider: "Proton", port: 993 },
  "zoho.com": { host: "imap.zoho.com", provider: "Zoho", port: 993 },
};

const mxMap: Array<{ match: RegExp; host: string; provider: string; port: number }> = [
  { match: /google\.com$/i, host: "imap.gmail.com", provider: "Google", port: 993 },
  { match: /googlemail\.com$/i, host: "imap.gmail.com", provider: "Google", port: 993 },
  { match: /outlook\.com$/i, host: "outlook.office365.com", provider: "Microsoft", port: 993 },
  { match: /office365\.com$/i, host: "outlook.office365.com", provider: "Microsoft", port: 993 },
  { match: /yahoodns\.net$/i, host: "imap.mail.yahoo.com", provider: "Yahoo", port: 993 },
  { match: /icloud\.com$/i, host: "imap.mail.me.com", provider: "Apple", port: 993 },
  { match: /zoho\.com$/i, host: "imap.zoho.com", provider: "Zoho", port: 993 },
  { match: /protonmail\.ch$/i, host: "imap.protonmail.com", provider: "Proton", port: 993 },
];

export async function lookupImapHost(email: string): Promise<ImapLookup> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) {
    return { host: null, source: "unknown" };
  }

  const direct = domainMap[domain];
  if (direct) {
    return {
      host: direct.host,
      port: direct.port,
      provider: direct.provider,
      source: "domain",
    };
  }

  try {
    const records = await dns.resolveMx(domain);
    const sorted = records.sort((a, b) => a.priority - b.priority);
    for (const record of sorted) {
      const exchange = record.exchange.toLowerCase();
      const match = mxMap.find((item) => item.match.test(exchange));
      if (match) {
        return {
          host: match.host,
          port: match.port,
          provider: match.provider,
          source: "mx",
        };
      }
    }
  } catch {
    return { host: null, source: "unknown" };
  }

  return { host: null, source: "unknown" };
}
