# WhatsApp Daily Report Template

This template defines the format for the consolidated WhatsApp report sent in Step 5b.

WhatsApp formatting: *bold*, _italic_, ~strikethrough~, ```monospace```. No markdown headers or links — just paste URLs on their own line.

---

## Template

```
📋 *Daily Job Report — {DATE}*
Sources: {sources list}
⏱ Window: ~{hours}h

📊 *Summary*
🇮🇱 Israeli: {relevant} relevant, {discuss} discuss, {skipped} skipped (of {total})
🌍 Intl: {relevant} relevant, {discuss} discuss, {skipped} skipped (of {total})
{omit the 🌍 line if international is disabled}

---

✅ *Relevant*

{N}. *{Role}* @ {Company}
{country_flag} {Location} | 🏷 {Source}
{URL}

{repeat for each relevant job — Israeli first, then international}

---

🟡 *Discuss*

{N}. *{Role}* @ {Company}
{country_flag} {Location}
❓ {short question/reason from scan-jobs}
{URL}

{repeat for each discuss job — Israeli first, then international}

---

📝 *Quick-Apply*
{X} drafts created, {Y} skipped (existing)
{note any jobs that couldn't be drafted and why}

---

⚠️ *Issues*
{bullet list of errors, unfetchable jobs, login walls — keep brief}
{omit section if no issues}

🔍 *Manual Check*
AllJobs alerts · Drushim · Goozali
{add any other manual sources}
```

## Guidelines

- Use country flag emojis for every job (🇮🇱 for Israeli, 🇩🇪 🇪🇸 🇳🇱 🇬🇷 🇵🇱 🇮🇪 🇸🇪 🇧🇬 🇭🇷 🇵🇹 🇺🇸 🇨🇦 etc. for international) — flags replace separate Israeli/International section headers
- Keep the message scannable — the user reads this on their phone
- Each job entry should be 2-3 lines max
- Don't include skipped jobs in the WhatsApp report (they're in the full markdown report)
- Don't include "Best resume" or score — that info is in the per-job quick-apply messages
- The ❓ line for discuss jobs should be one short sentence, not a paragraph
- If a section has zero entries, omit it entirely (don't show empty headers)
- The "Issues" section should summarize, not list every individual failure (e.g., "16 LinkedIn intl jobs unfetchable (Chrome disconnected)" not 16 separate lines)
