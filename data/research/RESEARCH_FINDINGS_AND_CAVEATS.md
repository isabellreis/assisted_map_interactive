# Assisted Dying Dataset — Research Findings & Caveats

This document summarizes the research added to `assisted_laws_long` across all rounds so far (Europe, the Americas, Asia, and US states). It is meant as a companion to the data files in `data/` — read this before citing or publishing any of the added rows.

**Convention used throughout:** status `0` = illegal, `1` = legal, `2` = unclear / in transition / actively contested. Every cell I added or changed is highlighted light pink in the workbook. No pre-existing, non-blank cell was overwritten — where new information conflicted with an existing value, I left the value untouched and added a note instead (flagged below).

---

## 1. Scope and file versions

| File (in `data/`) | Round | What it added |
|---|---|---|
| `assisted_laws_long_updated.xlsx` | v1 | Central/Eastern Europe (11 countries) |
| `assisted_laws_long_updated_v2.xlsx` | v2 | Rest of Europe (20 more countries) |
| `assisted_laws_long_updated_v3.xlsx` | v3 | Americas (South America + a new "North America" region, 22 countries) |
| `assisted_laws_long_updated_v4.xlsx` | v4 | Asia (18 countries) + review notes on Japan/Taiwan/India |
| `assisted_laws_long_updated_v5.xlsx` | v5 (current) | All 47 previously-blank US states/DC |

Still to come per the agreed roadmap: Africa, and the Canada/Australia state-level sheets.

---

## 2. Sourcing approach

Official government legislation portals were used wherever they exist (e.g. e-sbirka.gov.cz, slov-lex.sk, isap.sejm.gov.pl, legislatie.just.ro, riigiteataja.ee, finlex.fi, lovdata.no, law.justia.com / state legislature sites for the US, oregon.gov, nysenate.gov, etc.). Where no official portal was findable in the time available, I used reputable secondary/academic sources (Compassion & Choices, Death with Dignity National Center, law reviews, national bar association materials) and **said so explicitly in the note field** — these rows are lower-confidence than ones with a direct government URL.

Where I could not find a source at all, I left the cell blank rather than guess, or wrote a note explaining what's missing.

---

## 3. Regional highlights

### Europe (v1–v2)
- **Estonia**: Riigikohus (Supreme Court) ruled 7 May 2025 that a constitutional right to end one's life exists — Estonia has no statute criminalizing assisted suicide, so this ruling is the operative law.
- **Slovenia correction**: an older reference some of your material cites described Slovenia's euthanasia law as "pending/WIP." It was actually **rejected in a 23 Nov 2025 referendum** and never took effect — status stays illegal (0), but the note now reflects the correct outcome and timeline.
- **Uruguay is technically Americas but researched alongside Europe's late additions** — see below, it's the single biggest finding of the whole project.

### Americas (v3)
- **Uruguay**: became the first Latin American country to legalize euthanasia in 2025 (Chamber of Deputies 13 Aug, Senate 15 Oct, promulgated as Ley Nº 20.431 shortly after). This is the flagship finding of the Americas round.
- A new **"North America"** region grouping was added (15 countries: Bahamas, Barbados, Belize, Costa Rica, Cuba, Dominican Republic, El Salvador, Guatemala, Haiti, Honduras, Jamaica, Mexico, Nicaragua, Panama, Trinidad and Tobago) since the original sheet only had a "South Amercia" (sic — preserved as-is) region and didn't cover Central America/Caribbean at all.
- Most Central American/Caribbean countries have no privileged mercy-killing offense — euthanasia/assisted suicide are prosecuted as ordinary homicide, which is different from having a law that specifically legalizes or specifically bans it. This distinction is called out in the notes rather than collapsed into a single status code.

### Asia (v4)
- **South Korea**, **Thailand**, and **Israel** all have functioning end-of-life statutes (life-sustaining-treatment withdrawal, living wills, Dying Patient Law respectively) but none permit euthanasia or assisted dying.
- **Indonesia**: flagged as genuinely ambiguous (status 2) — its Criminal Code doesn't criminalize suicide itself, and the "failure to prevent/assisted suicide" provision (Pasal 345) may not map cleanly onto how "Assisted Dying" is defined elsewhere in this sheet. Worth a second look before treating as settled.
- **Afghanistan**: flagged as low-confidence — the post-2021 legal system is in flux and I could not independently verify current codified criminal provisions; treat this row with extra caution.
- **Countries not researched this round** (deferred, not in the sheet): Vietnam, Myanmar, Cambodia, Laos, Brunei, Timor-Leste; most Gulf/Levant states beyond Israel, Saudi Arabia, UAE, Iran (so Iraq, Jordan, Lebanon, Syria, Yemen, Oman, Qatar, Kuwait, Bahrain are still blank); most Central Asian republics beyond Kazakhstan (already in the sheet from an earlier round).

**Existing-row review notes added (status unchanged, note only):**
- **Taiwan — Assisted Dying**: currently coded `1` (legal) in the sheet, but Criminal Code Art. 275 appears to criminalize both killing-at-request and assisting/instigating suicide. This looks like a possible discrepancy — **recommend checking the original reasoning for this cell** before treating the `1` as confirmed.
- **Japan — Refusal of Treatment**: no dedicated statute exists; withdrawal of life support rests only on a non-binding 2007 Ministry guideline and case law. Status kept at `2` as originally coded, note added for context.
- **India — Euthanasia / Refusal of Treatment**: added context on Common Cause v. Union of India (2018) and the January 2023 Supreme Court order simplifying advance directives — active euthanasia remains illegal, passive euthanasia/refusal of treatment is legal via this case law.

### US states (v5)
- **14 jurisdictions now have medical aid in dying**: Oregon (1997, first in the US), Washington (2009), Montana (2009, via *Baxter v. Montana* — a court ruling, not a statute), Vermont (2013), California (2016), Colorado (2016), Hawaii (2019), New Jersey (2019), Maine (2019), New Mexico (2021), DC (2017), Delaware (2025/26), Illinois (2025/26), and New York (2026).
- **Illinois and New York are enacted but not yet in force.** Illinois's "Deb's Law" (SB 1950) was signed Dec 12, 2025 but doesn't take effect until Sept 12, 2026. New York's Medical Aid in Dying Act was signed Feb 6, 2026 but doesn't take effect until Aug 5, 2026. **I coded both as status `2` (transitional) rather than `1`**, since as of this update (late July 2026) they are not yet operative — worth revisiting once those effective dates pass.
- The other 37 researched states criminalize euthanasia and assisted dying under general homicide/assisted-suicide statutes but all recognize a right to refuse treatment via their own advance-directive/living-will act, all ultimately resting on the US Supreme Court's *Cruzan v. Director, Missouri Dept. of Health* (497 U.S. 261, 1990), which established the constitutional baseline nationwide.
- **South Carolina's "Death With Dignity Act"** is a naming false-friend — despite the name, it's SC's ordinary living-will/advance-directive statute, not a medical-aid-in-dying law. Flagged in the note so it isn't misread.
- **Lower-confidence citations** (statute name/number given from well-established secondary sources but not freshly re-verified against the primary code text this round): Vermont, California, Maine, DC, Delaware, and Illinois's refusal-of-treatment statutes.
- Alabama, Alaska, Arizona, and Arkansas already had data before this round and were left untouched.

---

## 4. Known duplicate rows (pre-existing, not something I introduced)

The original sheet already contained duplicate `(region, country, category)` rows for: Austria (Refusal of Treatment), Belgium (Euthanasia, Assisted Dying, Refusal of Treatment), Bulgaria (all three), France (all three), Peru (Euthanasia), Taiwan (Refusal of Treatment), and New Zealand (Refusal of Treatment). I verified these predate all my edits — I did not create or touch them, but flagging here in case you want to clean them up.

---

## 5. How to read the caveats going forward

Anywhere a row's note starts with **"REVIEW NOTE:"** or explicitly says a citation wasn't independently re-verified, treat that as lower confidence than a row with a direct government URL. When in doubt, the note field always says why.
