import { google } from "googleapis";
body: JSON.stringify({ chat_id: chatId, text: markdown, parse_mode: "Markdown" })
});
if (!res.ok) {
const err = await res.text();
console.error("Telegram error:", err);
}
}


function appendToJobSummary(markdown) {
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (!summaryPath) return;
const fs = require("fs");
fs.appendFileSync(summaryPath, markdown + "\n");
}


// --- Main ---
(async () => {
const { year, month, day } = todayInTZ(TZ);


// OAuth2 client
const oauth2 = new google.auth.OAuth2(
process.env.GOOGLE_CLIENT_ID,
process.env.GOOGLE_CLIENT_SECRET
);
oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });


const people = google.people({ version: "v1", auth: oauth2 });


// Haal connections op (vergroot pageSize indien nodig)
const resp = await people.people.connections.list({
resourceName: "people/me",
personFields: "names,birthdays,phoneNumbers",
pageSize: 2000
});


const conns = resp.data.connections || [];
const jarigen = [];


for (const p of conns) {
const name = p.names?.[0]?.givenName || p.names?.[0]?.displayName || "daar";
const rawPhones = (p.phoneNumbers || []).map(ph => ph.value).filter(Boolean);
const phone = normalizeMsisdn(rawPhones[0]);
if (!phone) continue; // overslaan als geen nummer


const bdays = p.birthdays || [];
const match = bdays.some(b => b.date && b.date.month === month && b.date.day === day);
if (match) jarigen.push({ name, phone });
}


// Bericht opbouwen
let md = `**Jarigen vandaag (${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}, ${TZ})**\n\n`;
if (jarigen.length === 0) {
md += "Geen jarigen gevonden in Google Contacts.";
} else {
for (const { name, phone } of jarigen) {
const text = `🎉 Gefeliciteerd, ${name}! Fijne dag vandaag!`;
const link = buildWaMeLink(phone, text);
md += `- ${name} — [Stuur WhatsApp](${link})\\n`;
}
}


console.log(md);
appendToJobSummary(md);


if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
await telegramSendMarkdown(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, md);
}
})();
