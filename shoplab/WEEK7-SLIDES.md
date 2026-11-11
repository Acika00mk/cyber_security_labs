# Week 7 – Logging, safe failure and releasing (slide content)

Use one `##` heading per slide. Speaker notes are in blockquotes (**Macedonian**). Slide bullets stay in **English**.

## How to use this deck (4 hours)

Suggested timetable (adjust to your cohort):

| When | Block | Slides (approx.) |
|---|---|---|
| 0:00–0:55 | Security logging fundamentals | Opening + Part 1 |
| 0:55–1:50 | Reading logs and failing securely | Part 2 |
| 1:50–2:00 | **Break** | — |
| 2:00–2:55 | Vulnerability reports and prioritisation | Part 3 |
| 2:55–4:00 | Secure releases and final exercise | Part 4 |

Have ShopLab running (`cd shoplab && npm start`) so you can show today’s access log vs a **real** security event.

---

## Week 7: Logging, safe failure and releasing

ShopLab course · Lecture (4 hours)

- Why security logging matters
- What to log — and what must never appear
- Structured logs and request IDs
- Fail closed, not fail open
- Reading reports, ranking risk, talking to non-technical people
- A short checklist before you ship

> Добредојдовте на Week 7. Оваа недела не е нов тип на напад — туку што правиме **по** нападот и **пред** release. Превенцијата не е доволна: треба да знаеме дека нешто се случило, да паднеме безбедно кога контролите откажуваат, и да одлучиме што да поправиме прво. Техничките термини (`log`, `CVSS`, `fail closed`) остануваат на англиски.

---

## Learning outcomes

By the end of this session you can:

- Explain why security logs support detection, investigation, and response
- Name events worth logging and fields that must never appear
- Describe structured logs and request IDs
- Judge whether earlier ShopLab attacks would be visible in today’s logs
- Apply fail-closed behaviour when a security check cannot complete
- Read a vulnerability report and separate technical severity from business risk
- Prioritise findings and explain remaining risk in plain language
- Run a short security checklist before a release

> Поврзете ги исходите со семестарот: Labs 2–6 ги учеа нападите и поправките. Денес прашаме: дали би ги виделе тие напади? Што ако permission check фрли exception? Што кажуваме на product owner пред launch?

---

## Ethics and scope

- ShopLab on **localhost** only
- Lab accounts: Alice, Bob, admin
- Logs may contain **sensitive** data — treat them as a target too
- Do not dump real passwords, tokens, or card numbers into shared notes

> Иста етика како претходните недели. Подвлечете: лог што го гледаат сите студенти на проекторот не смее да содржи лозинка. Ако некој случајно логира `req.body`, тоа е наоѓање, не демо за копирање во чат.

---

## Bridge from Weeks 1–6

| Earlier week | Today |
|---|---|
| Lab 2 – SQL injection | Would a failed query or odd payload show up? |
| Lab 4 – brute force / JWT | Failed logins, token misuse |
| Lab 5 – IDOR, roles | Access denied vs silent 200 |
| Lab 6 – verbose errors, config | Client must not see stack traces; logs may |

> Кратко: Labs 2–5 се „дали нападот работи“. Lab 6 е конфигурација. Week 7 е **видливост + одлука**. Ако IDOR враќа 200, логот изгледа како нормална продажба.

---

## Lab preview (this week’s practical)

When you reach the lab (after this lecture), follow [`LAB7.md`](LAB7.md):

1. Add **security logging** for login and access-control events
2. **Remove** one unsafe log entry (secret in the log)
3. Change one **fail-open** path so the request **stops**
4. Produce a **prioritised list** of every finding from the semester

> Лабораторијата е посебен водич; оваа датотека е лекцијата. Напоменете дека приоритетната листа е семестрален wrap-up, не само нов bug.

---

# Part 1 – Security logging fundamentals (~55 minutes)

---

## What happens after an attack?

An attacker reads another customer’s orders. The shop still returns HTTP 200. Three days later someone notices.

- How did they get in?
- Which records were touched?
- When did it start?
- How do we **prove** what happened?

**Key message:** Prevention is essential. Knowing when prevention failed is equally important.

> Започнете со дискусија. Прашајте: дали HTTP 200 значи легитимно барање? Успешен IDOR изгледа нормално ако не логирате authorization. Целта е студентите да почувствуваат празнина: без логови имате само гласини.

---

## What is security logging?

Security logging records events that matter for **application security**.

| Concept | Meaning |
|---|---|
| Logging | Record what happened |
| Monitoring | Look for patterns in those records |
| Alerting | Notify someone when action may be needed |

One failed login is an event. Fifteen failures in two minutes is a pattern. An alert asks a human (or a playbook) to look.

> Разделете audit логови, debug логови и инфраструктурни логови. Само `console.log` на секој request **не е** detection. ShopLab денес има access log во `requestLog.js` — метод, патека, статус — тоа е корисно, но не кажува *зошто* login падна.

---

## Why security logging matters

1. **Detection** of suspicious activity
2. **Investigation** and reconstruction of a timeline
3. **Incident response** and containment
4. **Accountability** for sensitive actions
5. **Feedback** to improve controls

Scenario: an admin account creates four users at 03:00. Legitimate night shift — or a stolen session?

> Еден настан ретко докажува злонамерност. Контекст: време, актер, извор, претходни настани, што е нормално за тој акаунт. Без логови не можете ни да ја поставите хипотезата.

---

## Events worth logging

| Event | ShopLab-shaped example |
|---|---|
| Authentication failure | `POST /api/auth/login` with wrong password |
| Sensitive success | Admin login |
| Authorization failure | Alice reads Bob’s order — refused |
| Password / secret change | Password updated |
| Permission change | Role set to `admin` |
| Administrative action | Account disabled, bulk export |
| Validation rejection | Unexpected field on a sensitive endpoint |
| Security config change | MFA / rate-limit policy disabled |

> Поврзете со Lab 5: одбиениот IDOR е **безбедносен настан**, не само 403. Успешни чувствителни операции исто така (export, role change). Не логирајте payload само затоа што операцијата е важна.

---

## What must never be written to a log

**Unsafe:**

```js
console.log({
  email: req.body.email,
  password: req.body.password,
  token: req.headers.authorization
});
```

**Safer:**

```js
logger.warn({
  event: 'auth.login_failed',
  requestId: req.id,
  reason: 'invalid_credentials'
});
```

Never log: passwords, API keys, tokens, session IDs, card numbers, extra personal data, full sensitive bodies, `Authorization` headers.

> Логовите се **втора мета**. Ако напаѓачот ги прочита, има credentials. Објаснете redaction, минимално собирање, retention, кој има пристап. Дури и `shoplab.sid=yes/no` во денешниот access log е компромис — не го пишувајте целиот cookie.

---

## Structured logs

**Unstructured:** `Something went wrong with login for user 104`

**Structured:**

```json
{
  "timestamp": "2026-11-08T10:30:00Z",
  "level": "warn",
  "event": "auth.login_failed",
  "actorId": "user-104",
  "requestId": "req-8f39",
  "reason": "invalid_credentials"
}
```

Same keys every time → search, filter, correlate, alert.

> Покажете зошто слободен текст се крши на повеќе сервиси. Договорете имиња: `event`, `actorId`, `outcome`. ShopLab може да започне со JSON на stdout; ELK/CloudWatch е подоцна.

---

## Request IDs and correlation

One ID follows the work of a single HTTP request:

```text
Browser  (req-8f39)
    → Express API  (req-8f39)
    → Authz check  (req-8f39)
    → Event: access.denied  (req-8f39)
```

- Return a safe `requestId` to the client on errors (Lab 6 idea)
- Keep the **detailed** story only on the server
- A request ID is **not** a session token

> Разлика: request ID vs distributed trace ID. Генерирајте ги сами или прифатете ги внимателно — не ги користете како автентикација. Ако корисникот пријави „грешка req-8f39“, поддршката наоѓа еден настан, не го бара целиот ден.

---

## Exercise: design a security log (10 min)

**Scenario:** A signed-in user tries to open another customer’s invoice. The server **correctly** refuses.

In pairs, design one event with:

- timestamp, event type, actor, resource, request ID, outcome, reason
- a list of fields you **exclude**

Example shape:

```json
{
  "event": "authorization.denied",
  "actorId": "user-104",
  "resourceType": "invoice",
  "resourceId": "inv-892",
  "reason": "not_owner",
  "outcome": "denied"
}
```

> Шест минути во парови, четири дебриф. Прашајте: дали вкупната сума, адресата или телото на фактурата припаѓаат овде? Обично не. Цел: студентите да напишат schema, не есеј.

---

# Part 2 – Reading logs and failing securely (~55 minutes)

---

## Would we even notice?

Fifty login attempts in 30 seconds could be:

- forgotten password
- a buggy client retrying
- brute force
- password spraying
- credential stuffing

**Suspicious pattern = investigate, not “guilty”.**

> Учете investigation: хипотеза, дополнителни докази, внимателен заклучок. Без rate-limit логови, Lab 4 brute force би бил невидлив освен побавен API.

---

## Suspicious authentication logs

| Time | Account | Event | Result |
|---|---|---|---|
| 10:01:03 | admin | Login | Failed |
| 10:01:05 | admin | Login | Failed |
| 10:01:07 | admin | Login | Failed |
| 10:01:09 | admin | Login | Failed |
| 10:01:11 | admin | Login | Success |
| 10:01:14 | admin | User export | Success |

Questions: What is concerning? What else do you need? Alert now?

> Дискусија: IP/уред, MFA, дали admin обично експортира во 10:01, колку редови. Успешен login по серија неуспеси е аларм — не доказ. Во ShopLab, `loginLimiter` ги сече обидите, но **не** пишува `auth.login_failed`.

---

## Would earlier-week attacks be visible?

| Attack | What logs *might* show | What they often miss |
|---|---|---|
| SQL injection | Validation reject, DB error | Successful UNION that looks like a search |
| XSS | Odd content; optional CSP reports | Stored payload served as a normal page |
| IDOR | `authorization.denied` | **Successful** IDOR as HTTP 200 |
| Brute force | Repeated `auth.login_failed` | Success on the last try, if you only log errors |
| Privilege escalation | Failed role change | Mass assignment that silently worked |
| CSRF | Origin / token failure | Forged request that passed |

Logs **complement** controls. They do not replace ownership checks.

> Клучна реченица: успешниот IDOR од Lab 5 е невидлив ако логирате само 403. Прашајте ја групата за еден напад од нивните белешки — „што би барале во логот?“

---

## ShopLab today: access log, not audit log

[`server/src/middleware/requestLog.js`](server/src/middleware/requestLog.js) prints:

```text
10:30:01 POST /api/auth/login 401 origin:- sid:no
```

Useful: method, path, status, origin, session present.

Missing for security review:

- **which** account failed
- **why** (bad password vs unknown user — do not leak that to the client, but you may log a *reason code* server-side)
- denied **resource id** on IDOR
- admin actions as first-class events

> Покажете една линија од терминалот додека некој греши лозинка. Потоа: дали би реконструирале brute force против `admin@shoplab.test`? Не без `actor`/`event`. Не логирајте дали имејлот постои ако тоа го враќате на клиентот — Lab 4 enumeration.

---

## Exercise: log investigation (7 min)

```text
09:20 auth.login_success user=104
09:21 invoice.read user=104 resource=inv-104
09:22 authorization.denied user=104 resource=inv-105
09:22 authorization.denied user=104 resource=inv-106
09:23 authorization.denied user=104 resource=inv-107
09:24 auth.login_success user=205
09:25 admin.role_change user=205 target=104
09:26 data.export user=104 count=800
```

Decide: what deserves attention? One incident or two? What context is missing? What do you check first?

> Actor ≠ target. Недостасуваат request IDs, IP, дали role_change беше дозволен, точни timestamps. Можна приказна: user-104 скенира фактури; потоа 205 промовира 104 и прави export — или тоа се неповрзани админ задачи. Не заклучувајте без докази.

---

## Fail open vs fail closed

- **Fail open:** permission service down → **allow** the request. Insecure.
- **Fail closed:** permission service down → **refuse** the protected operation. Secure default.

**Principle:** failure to **verify** authorization must not become **permission**.

Fail closed ≠ crash the whole shop. Return a controlled **403** or **503**; keep unrelated pages up.

> Банкарски пример: не можеме да провериме сопственост на сметка → не ја покажуваме салдото. ShopLab е помал, но истиот принцип важи за `catch { return true }`.

---

## Unsafe vs safer authorization code

**Insecure (fail open):**

```js
async function canAccess(user, resource) {
  try {
    return await checkPermission(user, resource);
  } catch (error) {
    return true;
  }
}
```

**Safer default (fail closed):**

```js
async function canAccess(user, resource) {
  try {
    return await checkPermission(user, resource);
  } catch (error) {
    logger.error({
      event: 'authorization.check_failed',
      actorId: user.id,
      resourceType: resource.type
    });
    return false;
  }
}
```

> Во продукција: експлицитна забрана често е 403; недостапна зависност често е 503. Грешка во logger-от не смее да додели пристап. Lab задача: најдете едно место каде барањето продолжува по неуспешна проверка и **заприте** го.

---

## Safe error handling (client vs log)

Detailed errors can leak SQL, paths, stack traces, versions.

**Unsafe response:**

```json
{
  "error": "Database query failed",
  "query": "SELECT * FROM users WHERE id=104",
  "file": "/app/src/services/users.js"
}
```

**Safer response:**

```json
{
  "error": "An unexpected error occurred",
  "requestId": "req-8f39"
}
```

Server log: enough to debug, still **no** passwords or tokens.

> Повторно Lab 6: `errorHandler` не смее да прати `stack` на прелистувачот. Денес додаваме: истиот инцидент е **поврзан** преку `requestId`. Fail closed и safe errors се браќа — и двете го намалуваат она што напаѓачот го учи од неуспех.

---

## Exercise: permission service outage (7 min)

A banking app checks account ownership before showing a balance. The authorization service is **down**.

- A. Allow access until it recovers
- B. Refuse the protected operation; controlled error
- C. Skip checks for users who already logged in

**Answer: B.** Authentication is not authorization.

> Прашајте како да кажете „привремено недостапно“ без да откриете внатрешна архитектура. Дискутирајте alerting: ако сите authz checks паѓаат, тоа е инцидент, не тивок fail-open.

---

# Part 3 – Vulnerability reports and risk (~55 minutes)

---

## What is a vulnerability report?

A useful finding includes:

- Title and affected component
- Description and **conditions**
- Expected vs actual behaviour
- Evidence (request/response, screenshot — **redacted**)
- Impact and severity **rationale**
- Suggested fix

Possible ≠ confirmed ≠ **incident** (someone already abused it).

> Студентите често пишуваат „broken auth“. Натерајте ги на endpoint, предуслови, и што треба да се случи. Репродукцијата е за развивачот, не за јавен gist со вистински токени.

---

## Example finding (fictional)

**SEC-2026-014** — Broken access control — **High**  
`GET /api/invoices/:id`

A signed-in user retrieves another customer’s invoice by changing the id.

- **Impact:** billing data exposure  
- **Repro:** log in as A, request B’s invoice  
- **Fix:** server-side ownership check + negative tests

This is Lab 5 IDOR language. Severity still depends on **what** the invoice contains and whether the API is reachable.

> Прашајте какви докази му требаат на развивачот. Ако фактурите се демо-цени, impact-от е помал отколку реални картички. Не ја мешајте наставната база со продукциски PII.

---

## CVSS severity (technical score)

| Rating | Typical CVSS |
|---|---|
| Low | 0.1–3.9 |
| Medium | 4.0–6.9 |
| High | 7.0–8.9 |
| Critical | 9.0–10.0 |

CVSS describes **technical** severity (and several dimensions in v4).

A CVSS number is **not** automatically the business fix-first order.

> Кратко: предуслови, привилегии, влијание, дали е мрежно достапно. Score 0 = None. Не бараме студентите да пресметуваат вектор на табла — да знаат што значи етикетата и што **не** значи.

---

## Severity vs business risk

Compare:

- **A:** Production API leaks customer records with **no** login; exploitation seen
- **B:** Marketing page missing one security header

Ask:

- Internet-facing?
- Credentials required?
- Already being exploited?
- How sensitive is the data?
- What business process depends on it?
- Any compensating control (VPN, WAF, feature flag)?

> Ризикот = веројатност × последица, во контекст. Medium CVSS на payment API може да биде поитна од High на внатрешен demo box. ShopLab на localhost не е ист ризик како истата грешка на јавен shop.

---

## Exercise: rank these findings (7 min)

Most urgent first — **defend** the order:

| ID | Finding |
|---|---|
| A | Unauthenticated production API leaks customers; exploitation observed |
| B | Known dependency issue; vulnerable function looks unreachable |
| C | Stored XSS in the administrator UI |
| D | Missing header on a low-risk info page |

A reasonable starting order: **A → C → B → D** — if new evidence appears, reorder.

> Не меморирајте го редоследот. Ако B е `debug` endpoint што сепак се повикува, скока нагоре. Ако C бара admin cookie што само внатрешната мрежа ја има, сепак е сериозно (admin XSS).

---

## What to fix first (workflow)

1. Confirm the finding (not a false positive)
2. Assess technical **and** business impact
3. Check exposure and active exploitation
4. Contain now vs fix properly
5. Owner + deadline
6. **Retest** and write down remaining risk

A git commit is not proof the hole is gone.

> Containment: исклучи ја рутата, feature flag, IP allowlist. Потоа правилен ownership check. За семестралната листа: студентите рангираат **нивни** наоѓања од Labs 2–6, не измислени CVE-и.

---

## Explain remaining risk to a non-technical person

**Technical:** “The invoice API has an IDOR from missing object-level authorization.”

**Business:** “A signed-in customer can open someone else’s invoice by changing a number. That can expose private billing details. We should block that before launch and retest.”

Answer five questions:

1. What could happen?
2. Who is hurt?
3. How likely is it?
4. What should we do?
5. What risk **still** remains after the fix?

> Вежбајте гласно една реченица без жаргон. Забрането: „тоа е само medium“. Задолжително: без претерување („сите картички се украдени“) ако немате доказ.

---

## Can we release with known vulnerabilities?

A risk-acceptance note needs:

- What the risk is, and how bad
- Which product / data is affected
- Exploitability and mitigations already in place
- **Who** accepts it
- Review date and monitoring

Launch tomorrow + serious authz bug still open → postpone, or ship **without** that feature.

> Acceptance ≠ ignore. Некој именуван човек потпишува. High authz fail-open ретко е прифатлив за e-commerce launch.

---

# Part 4 – Secure releases (~65 minutes)

---

## Security before you deploy

Typical production misses:

- Debug mode still on
- Dev credentials reused
- Missing authorization checks
- Unpatched dependencies
- Secrets in git
- Wide-open CORS
- Database reachable from the internet
- No useful security logs or alerts

Passing the happy-path tests ≠ ready to ship.

> Поврзете Lab 6: `NODE_ENV`, debug routes, `npm audit`, `.env`. Week 7 додава: логови + fail-closed + „дали знаеме што останува“.

---

## Configuration and secrets (recap)

**Risky:**

```dotenv
NODE_ENV=development
DEBUG=true
JWT_SECRET=example123
```

**Baseline:**

```dotenv
NODE_ENV=production
DEBUG=false
```

Production secrets stay out of git. Env vars help; they are not a full vault. `DATABASE_SSL=true` does not prove TLS is correctly verified.

> Не повторувајте ја целата Week 6. Еден слајд како checklist пред release. Ротација ако нешто било во репо.

---

## Tests that belong before release

| Test | Goal |
|---|---|
| Authentication | Unauthenticated actions blocked |
| Authorization | Cross-user access blocked |
| Validation | Junk input rejected safely |
| Dependency scan | Known bad components listed |
| Secret scan | No keys in the repo |
| Error handling | No stack traces to users |
| Logging | Security events without secrets |
| Config review | Production settings, least privilege |

SAST / DAST / `npm audit` help. They will **not** catch every IDOR.

> Негативни тестови од Lab 5 се дел од release gate. Ако тесот очекува 403 за Bob→Alice order и е зелен, тоа е доказ — додека некој не го избрише.

---

## A simple release pipeline

```text
Change + peer review
        ↓
Automated tests
        ↓
Security scans
        ↓
Review leftover findings
        ↓
Release approval
        ↓
Controlled deploy
        ↓
Watch logs and alerts
```

Know how to **roll back**. Reproducible builds beat “it works on my laptop”.

> За овој курс: не градиме CI од нула. Идејата е редоследот. „Leftover findings“ е Part 3 во пракса.

---

## Production security checklist

Print and actually verify:

- [ ] Authn and authz tested (including **denies**)
- [ ] Input validation and output encoding
- [ ] Security logging and a place someone will **look**
- [ ] Secrets not in git or in browser responses
- [ ] Errors are generic; authz **fails closed**
- [ ] Dependencies reviewed; serious issues assessed
- [ ] Production config and permissions
- [ ] HTTPS and cookie flags (when you are not on localhost)
- [ ] Backup / recovery known
- [ ] Rollback plan written down

A tick means you **checked**, not that you feel fine.

> Ова е наставна почетна листа, не сертификација. Lab: истата листа + рангирани наоѓања од семестарот.

---

## After you deploy

- Watch unusual login and access patterns
- Confirm alerts actually arrive
- Track dependency advisories
- Patch, investigate, test recovery
- Improve controls from incidents

Day-two scenario: 2,000 failed admin logins. First move: triage — any **successes**? Then rate limits, then escalate. Do not announce a breach without evidence.

> Мониторингот е Week 7 во продукција. Без alerting, structured logs се архива.

---

## Eight questions before you call it “done”

1. Which assets matter?
2. Who may access them?
3. Which attacks did we actually test?
4. Can we detect suspicious activity?
5. What happens when a control **fails**?
6. Which vulnerabilities remain?
7. Who owns that remaining risk?
8. What is the incident plan?

> Ова ја врзува целата година: injection, XSS, authn, authz, config, логови, release. Користете го како rubrik за семестралната листа.

---

## Final exercise: should we release? (15 min)

E-commerce launch is **tomorrow**. Review found:

| ID | Finding |
|---|---|
| A | Users view other customers’ orders by changing an order id |
| B | Failed logins are not in security logs |
| C | Medium-severity dependency; exploitability here unknown |
| D | Stack traces visible to users |
| E | Authorization **fails open** if the permission service is down |

Teams:

1. Release / postpone / release a **smaller** surface
2. Rank A–E and name **blockers**
3. Propose fail-closed for E
4. Present to a fictional non-technical product owner

Timing: 3 min read, 5 min rank, 3 min decide, 4 min present.

> Нормален исход: **не** full release додека A и E не се поправени и проверени. B и D бараат план; C бара дали функцијата воопшто се користи. Ограничен release само ако небезбедните патеки навистина не се вклучени.

---

## Knowledge check (optional, 5 min)

1. Logging vs monitoring?  
   **Record** events vs **analyse** them.
2. Never in raw logs?  
   Passwords, tokens, session secrets, card data, extra PII.
3. Authz service down?  
   Fail **closed**; controlled error.
4. Medium CVSS ⇒ medium fix order?  
   **No** — exposure and business impact matter.
5. When is a finding “fixed”?  
   After **retest**, with leftover risk written down.

> Може како exit ticket. Кратки одговори, без дебата ако сте при крај со време.

---

## Full topic map (Week 7 syllabus)

| Theme | Covered in |
|---|---|
| Why security logging | Part 1 |
| Events to log / never log | Part 1 |
| Structured logs, request IDs | Part 1 |
| Reading logs; prior-week attacks | Part 2 |
| Fail closed; safe errors | Part 2 |
| Reports, CVSS, business risk | Part 3 |
| Prioritise; explain risk | Part 3 |
| Release checklist; remaining risk | Part 4 |

> Брз tick за студенти што препишуваат syllabus.

---

## Recap – four sentences

1. **Log** security-relevant events without secrets, in a shape you can search.
2. **Detect** what you failed to prevent — including attacks from earlier labs.
3. **Fail closed** when you cannot complete a security check; keep client errors boring.
4. **Rank** remaining issues, say the risk in human language, then tick a real checklist before release.

> Q&A. Следно: лабораторија — логови за login/access, еден небезбеден log out, еден fail-open → stop, приоритетна листа од семестарот.

---

## Thank you / lab next

- Add security logs for login and access control
- Remove one unsafe log line
- Stop one request that currently continues after a failed check
- Prioritised list of **every** semester finding
- Questions: course forum / instructor

> Затворете со една лична акција: „Ќе престанам да логирам `req.body`“ или „Ќе напишам 403 тест за туѓ order“.
