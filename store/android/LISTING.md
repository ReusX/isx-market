# IQWealth — Google Play, step by step

Do the steps in order. Everything to paste is here.
Files in this folder: `icon-512.png`, `feature-1024x500.png`, `phone-1…5.png`.
The release bundle: `android/app/build/outputs/bundle/release/app-release.aab`
(package `com.iraqsm.app`, version `1.0 (1)`, signed with the upload key).

- [x] 0. Create app (done 2026-09-28)

---

## 1. Internal testing: get it on your own phone

Test and release → Testing → **Internal testing** → Create new release.

1. Play App Signing prompt → keep the default (Google manages the app signing key).
2. Upload `app-release.aab`.
3. Release name `1.0 (1)`. Release notes (ar):
   ```
   الإصدار الأول: سعر الدولار في بورصة الكفاح، الذهب، البورصة العراقية، وتنبيهات الأسعار.
   ```
4. Save → Review release → **Start rollout to Internal testing**.
5. **Testers** tab → Create email list `me` → add your Gmail → Save → tick the list.
6. Copy the **Join on the web** link → open it on your phone → Accept → install from Play.
7. In the app: Tools → الإشعارات → turn notifications on. Tell Claude, who checks the device registered.

## 2. App content (policy forms)

Dashboard → "Finish setting up your app", or left menu → Policy and programs → **App content**.

| Form | Answer |
|---|---|
| Privacy policy | `https://iraqsm.com/privacy` |
| App access | **All functionality in my app is available without any access restrictions** |
| Ads | **No, my app does not contain ads** |
| Content rating | see 2a |
| Target audience and content | see 2b |
| News apps | **No** |
| Data safety | see 2c |
| Advertising ID | **No** (the app doesn't use it; checked in the merged manifest) |
| Government apps | **No** |
| Financial features | **My app doesn't provide any financial features** |
| Health apps | **No** / none of the health features |

### 2a. Content rating (IARC questionnaire)

- Email: your email. Category: **All Other App Types** (or "Reference, News, or Educational" if offered).
- Violence, fear, sexuality, language, controlled substances, crude humour: **No** to all.
- Gambling or simulated gambling: **No**.
- Users can interact or exchange content with each other: **No**.
- Shares the user's current location with other users: **No**.
- Lets users buy digital goods: **No**.
- Web browser or search engine: **No**.
- Save → Calculate → expected **Everyone / PEGI 3** → Submit.

### 2b. Target audience

- Age groups: **18 and over** only.
- Could the app unintentionally appeal to children: **No**.

### 2c. Data safety

1. Collects or shares required user data types: **Yes**.
2. All collected data is encrypted in transit: **Yes**.
3. Account creation: **My app allows users to create an account** → methods: **Username and password** (users sign in with an email or phone number plus a password; no Google sign-in).
4. Delete account URL: `https://iraqsm.com/privacy#deletion`
5. Can users request some data deleted without deleting the account: **Yes**.
6. Data types. Tick only these. For each one: **Collected**, **not shared**, **processed ephemerally: No**.

| Data type | Required or optional | Purpose |
|---|---|---|
| Personal info → Email address | Optional | Account management |
| Personal info → Name | Optional | Account management |
| Personal info → Phone number | Optional | Account management |
| App activity → Other user-generated content (watchlist, portfolio, alerts) | Optional | App functionality |
| App info and performance → Diagnostics | Required | Analytics |
| Device or other IDs (the push notification token) | Optional | App functionality |

## 3. Main store listing

Grow users → Store presence → **Main store listing** (Arabic is the default language).

**App name.** Fix the spelling to «بورصة» with ة:
```
IQWealth - بورصة العراق
```
(or `IQWealth - سعر الدولار والذهب`)

**Short description (80 max):**
```
سعر الدولار والذهب والبورصة العراقية، مع تنبيهات الأسعار على هاتفك
```

**Full description:**
```
IQWealth دليلك اليومي للأسعار والأسواق في العراق، بالعربية وبأرقام من مصادرها.

سعر الدولار
• سعر الدولار في بورصة الكفاح ببغداد، سعرا الشراء والبيع، ويتحدّث خلال يوم التداول مع وقت آخر تحديث.
• سعر 100 دولار (الورق) بالدينار العراقي، والسعر الرسمي للبنك المركزي والفارق بينهما.
• محوّل فوري بين الدينار والدولار، وأسعار العملات الأخرى: اليورو، التومان الإيراني، الريال السعودي، الليرة التركية، الدرهم الإماراتي وغيرها.

الذهب والنفط
• سعر مثقال الذهب وغرامه لعيار 24 و22 و21 و18 بالدينار العراقي، وسعر الأونصة.
• أسعار النفط وخام البصرة بالدولار والدينار.

سوق العراق للأوراق المالية
• أسعار أسهم الشركات المدرجة، والمؤشرات، وحركة السوق بعد كل جلسة.
• القوائم المالية للشركات من تقاريرها الرسمية المنشورة لدى هيئة الأوراق المالية.
• قائمة متابعة ومحفظة لمتابعة أسهمك.

الإشعارات
• سعر الدولار اليوم في إشعار واحد مع التغيّر عن أمس.
• سعر الذهب اليومي، وملخص إغلاق البورصة بعد كل جلسة.
• تنبيهات تضعها بنفسك: أخبرني عندما يتجاوز الدولار أو الذهب أو سهم معيّن سعراً تحدده.
• لا حاجة لإنشاء حساب، ولا نرسل إشعارات بين 11 مساءً و7 صباحاً.

المصارف والأدلة
• دليل المصارف العراقية وأسعار الفوائد على الودائع والقروض.
• أدلة عملية مثل تحديث بيانات المتقاعدين.

تنبيه: الأسعار المعروضة مرجعية وليست عروض تنفيذ، ولا يقدّم التطبيق نصيحة استثمارية. IQWealth لا يبيع العملات ولا ينفّذ صفقات.
```

**Graphics:**

| Field | File |
|---|---|
| App icon (512×512) | `icon-512.png` |
| Feature graphic (1024×500) | `feature-1024x500.png` |
| Phone screenshots (2–8) | `phone-1-fx.png`, `phone-2-100-dollar.png`, `phone-3-gold.png`, `phone-4-market.png`, `phone-5-company.png` |

Tablet screenshots: skip them (optional).

## 4. Store settings

Grow users → Store presence → **Store settings**.

| Field | Value |
|---|---|
| App or game / Category | App / **Finance** |
| Tags | Finance (add News & magazines if offered) |
| Email address | your public support email (shown on the store page) |
| Website | `https://iraqsm.com` |
| Phone | leave empty |

## 5. Closed testing: required before production (personal account)

1. Test and release → Testing → **Closed testing** → Create track `beta` (or use the default "Closed testing – Alpha").
2. Countries/regions: **Iraq** (add others if testers live abroad).
3. Testers → email list with at least **12 Gmail addresses**.
4. Create release → **Add from library** → pick `1.0 (1)` (already uploaded in step 1) → same release notes → Review → **Send for review**. Google reviews the first closed release (hours to a few days).
5. Once it's approved, send the testers the opt-in link. Each must **opt in, install, and keep it for 14 days**.
6. After 14 days: Dashboard → **Apply for production**. Google asks about the test (how testers used it, what changed). Claude drafts the answers.

## Server side (once, before real notifications)

cron-job.org → new job:
- URL `https://iraqsm.com/api/cron/push`
- every 15 minutes
- Header `Authorization: Bearer <CRON_SECRET>` (value from `.env.local`)
