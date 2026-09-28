# IQWealth — Google Play listing

Everything to paste into Play Console. Default language: **Arabic (ar)**.
Files in this folder: `icon-512.png`, `feature-1024x500.png`, `phone-1…5.png`.
The release bundle is `android/app/build/outputs/bundle/release/app-release.aab`.

## Create app

| Field | Value |
|---|---|
| App name | `IQWealth - سعر الدولار والذهب` (29/30) |
| Default language | Arabic – ar |
| App or game | App |
| Free or paid | Free |

## Main store listing

**App name:** `IQWealth - سعر الدولار والذهب`

**Short description (66/80):**

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

**Graphics:** app icon `icon-512.png` · feature graphic `feature-1024x500.png` · phone screenshots `phone-1-fx.png` … `phone-5-company.png`

## Store settings

| Field | Value |
|---|---|
| App category | Finance |
| Tags | Finance, News & magazines (optional) |
| Contact email | *your support email* |
| Website | https://iraqsm.com |

## App content (policy forms)

| Form | Answer |
|---|---|
| Privacy policy | `https://iraqsm.com/privacy` |
| App access | All functionality available without special access (no login required) |
| Ads | No, the app does not contain ads |
| Content rating | Questionnaire → category "Reference, News, or Educational"; answer No to violence, sexual content, gambling, etc. Expect "Everyone / 3+" |
| Target audience | 18 and over |
| News app | No (it is a financial data app; news is a secondary section) |
| Financial features | "My app doesn't provide any financial features" (information only: no loans, trading, payments, crypto) |
| Government app | No |
| Health | No |
| Data safety | see below |
| Account deletion URL | `https://iraqsm.com/privacy#deletion` |

### Data safety

- **Does the app collect or share user data?** Yes (collects; does not share).
- **Is data encrypted in transit?** Yes (HTTPS only).
- **Can users request deletion?** Yes.

| Data type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| Personal info → Email address | Yes | No | Optional (only if the user creates an account) | Account management |
| Personal info → Name (username) | Yes | No | Optional (account) | Account management |
| Device or other IDs (push notification token) | Yes | No | Optional (only if notifications are turned on) | App functionality |
| App activity → Other user-generated content (watchlist, portfolio, price alerts) | Yes | No | Optional | App functionality |
| App info and performance → Diagnostics | Yes | No | Required | Analytics |

## Release: closed testing (required for personal accounts)

1. Testing → Closed testing → Create track (name: `beta`).
2. Testers: add a list of at least **12** Gmail addresses (or a Google Group).
3. Create release → upload `app-release.aab` → release name `1.0 (1)` → release notes:
   `الإصدار الأول: سعر الدولار في بورصة الكفاح، الذهب، البورصة العراقية، وتنبيهات الأسعار.`
4. Send testers the opt-in link from the track page. They must **opt in and keep the app installed for 14 days**.
5. After 14 days with ≥12 opted-in testers: Dashboard → Apply for production access.
