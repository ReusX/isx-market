import type { LegalSection } from '@/lib/legalContent'

/**
 * The English Privacy Policy and Terms of Use.
 *
 * ═══ THIS IS A TRANSLATION, NOT A SECOND DRAFT ════════════════════════════
 * Every section id, every section, every block and every list item matches
 * `lib/legalContent.ts` one for one, in the same order. Nothing is added,
 * nothing is dropped, and no qualifier is softened or strengthened.
 *
 * The Arabic was written against the audited product — see the long inventory
 * at the top of that file — and its factual claims are the ones translated
 * here. Where the Arabic declines to promise something, this does too:
 *
 *   · No general indemnity, and the sentence saying so is kept verbatim.
 *   · Liability is limited only «to the maximum extent permitted by
 *     applicable Iraqi law», and the sentence preserving non-excludable
 *     liability is kept.
 *   · Iraqi governing law and the competent Iraqi courts, with NO named court
 *     and no venue.
 *   · 18+.
 *   · Hosting location is explicitly uncertain — inside or outside Iraq
 *     depending on the provider — and no country or data centre is promised.
 *   · Retention is by CRITERIA, never a fixed number of days.
 *   · Account deletion is MANUAL, by email, with no promised turnaround, and
 *     the absence of an in-product delete button is stated.
 *   · IQWealth is a financial information and data platform, not a broker,
 *     exchange, adviser, custodian or bank; no legal entity and no registered
 *     address is asserted.
 *
 * ⚠ If a substantive legal question arises, it is reported rather than
 * resolved here. Translating is not drafting.
 */

/* ═══ Privacy Policy ══════════════════════════════════════════════════════ */

export const PRIVACY_DOC_EN: LegalSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    blocks: [
      { kind: 'p', text: 'This policy explains what IQWealth collects about you, why it collects it, where it is stored, and what you can ask for regarding it. It covers the website and all of its pages and services.' },
      { kind: 'p', text: 'The platform is free and charges nothing. It does not ask for card or bank-account details, and it executes no purchase or sale. You can browse most pages without creating an account at all; nothing is collected about you beyond the limited technical data described below.' },
      { kind: 'note', text: 'As at the date of this version, Iraq has no comprehensive personal-data protection law in force, and a draft law is being prepared. We comply with what is in force, and we write this policy conservatively so that it does not promise what we cannot deliver.' },
    ],
  },
  {
    id: 'operator',
    title: 'Who operates the platform',
    blocks: [
      { kind: 'p', text: 'The IQWealth platform is operated through the domain iraqsm.com, referred to in this policy as “the platform” or “we”. IQWealth is a financial information and data platform. It is not a financial broker, an exchange, or an investment adviser.' },
      { kind: 'p', text: 'For any enquiry about privacy or personal data, use the contact method published on the Contact page. The email address published there is the official channel for requests to access, correct or delete account data.' },
    ],
  },
  {
    id: 'collect',
    title: 'The information we collect',
    blocks: [
      { kind: 'p', text: 'We collect four categories only, and nothing else:' },
      {
        kind: 'ul',
        items: [
          'Account data: your email address and the username you choose. Your password is handled entirely by the authentication provider (Supabase Auth); it never reaches us and we do not store it in any form.',
          'Your data inside the platform: your watchlist, the portfolio contents you enter yourself (ticker, quantity, purchase price, and an optional date or note), and the price alerts you create.',
          'Your preferences: language, light or dark appearance, and the sidebar state.',
          'Technical data: our infrastructure processes your IP address, browser and device data, request logs and performance measurements, as described in the service-providers section.',
        ],
      },
      { kind: 'p', text: 'If you email us, your message and its sender address remain in our mailbox. There is no contact form on the site, and we do not store messages in our database.' },
      { kind: 'note', text: 'We do not ask for an ID number, an address, banking details or any financial document, and we provide no file upload.' },
    ],
  },
  {
    id: 'use',
    title: 'How we use the information',
    blocks: [
      {
        kind: 'ul',
        items: [
          'To run your account: signing in, confirming your email address, and resetting your password.',
          'To save what you create and sync it between your devices: watchlist, portfolio, alerts and preferences.',
          'To run the features you ask for, and to show the prices and indicators related to what you follow.',
          'For service security, and to deal with faults and misuse.',
          'To reply to you if you write to us.',
          'To measure general performance and usage in order to improve the platform, through the two services named in the service-providers section.',
        ],
      },
      { kind: 'p', text: 'We do not use your data for advertising. We do not sell it, rent it or trade it, we build no advertising profiles from it, and we share it with no data brokers.' },
    ],
  },
  {
    id: 'basis',
    title: 'Basis for processing, and your choices',
    blocks: [
      { kind: 'p', text: 'We process account data and what you create inside the platform because you asked for the service: without them an account cannot run and a portfolio cannot be saved. We process technical data to the extent needed to operate and protect the site.' },
      { kind: 'p', text: 'Your choice is practical and direct: you can use the platform with no account at all, you can enter no data into the portfolio, you can delete anything you added at any time, and you can sign out and clear your browser storage to remove the locally saved copy.' },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    blocks: [
      { kind: 'p', text: 'We use exactly one cookie: the session cookie that keeps you signed in, managed by the authentication provider. We use no advertising cookies, no tracking pixels and no cross-site tracking tools.' },
      { kind: 'p', text: 'We use your browser’s local storage — not our servers — to keep six keys: language, appearance, watchlist, portfolio, alerts and the sidebar state. That is what lets the portfolio and watchlist work without an account. Clearing the site’s data from your browser erases this copy.' },
    ],
  },
  {
    id: 'processors',
    title: 'Service providers',
    blocks: [
      { kind: 'p', text: 'We rely on external providers to run the platform, each with a defined role:' },
      {
        kind: 'ul',
        items: [
          'Supabase — authentication and the database. Account data, watchlists, portfolios and alerts are stored there, and passwords, confirmation emails and password resets are handled there.',
          'Vercel — hosting and running the site. Browsing requests and the technical data that accompanies them pass through it.',
          'Vercel Analytics and Vercel Speed Insights — measurement of general usage and page performance. Both run on every page.',
        ],
      },
      { kind: 'p', text: 'We publish editorial material from a content management system of our own. That system is a SOURCE of content and receives no data about you.' },
      { kind: 'note', text: 'The market-data sources — the Iraq Securities Commission, the Iraq Stock Exchange, brokerages, media sources and the gold and oil price sites — are publicly published information that we read. We send them nothing about you, and they have no connection to your personal data.' },
      { kind: 'p', text: 'The platform relies on third-party technical providers for hosting, databases, authentication, analytics and supporting services. Data may be processed or stored on infrastructure located inside or outside Iraq, depending on the provider and where its systems are at the time of processing.' },
      { kind: 'p', text: 'We do not promise that all data stays inside any particular country or data centre. When an external provider is used, we limit ourselves as far as possible to the data needed to run the service, and we apply the protections available in the product and in the provider’s settings.' },
    ],
  },
  {
    id: 'financial',
    title: 'Portfolio and watchlist data',
    blocks: [
      { kind: 'p', text: 'The portfolio, the watchlist and the alerts are personal tracking tools: you enter the figures, and we save them, display them, and compute value and profit and loss from them.' },
      { kind: 'note', text: 'IQWealth is not a financial broker and not a custodian. We hold no securities and no money, we execute no buy or sell orders, we do not connect to your account at any broker, and we do not verify your actual balances. What you enter here is a record you keep, not an investment account.' },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep data',
    blocks: [
      { kind: 'p', text: 'We keep personal data only for as long as is necessary for the purpose it was collected for, or to run the account and the service, or to protect the platform from misuse, or to meet applicable legal obligations.' },
      { kind: 'p', text: 'When an account is closed, or a deletion request is accepted, we delete or anonymise the data associated with the account once there is no longer a legitimate need to keep it. Limited copies may remain for a further period inside backups or security logs until those systems’ own retention cycles end, or where retention is required to evidence a transaction, deal with a dispute, or meet a legal requirement.' },
      { kind: 'p', text: 'We do not apply a single retention period to every kind of data; the period differs by record type and purpose. You can ask about a specific category of data through the privacy channel published on the Contact page.' },
      { kind: 'note', text: 'In practice: your account data and what you created inside the platform remain for as long as the account exists, because that data IS the service. Technical data and logs are kept by the service providers according to their own retention cycles.' },
    ],
  },
  {
    id: 'deletion',
    title: 'Deleting your account and data',
    blocks: [
      { kind: 'p', text: 'You can delete anything you added at any time: a portfolio row, a ticker from your watchlist, or an alert. It is removed immediately from the browser and from your account.' },
      { kind: 'p', text: 'To delete the account in full, together with the data attached to it, write to us from the email address registered on the account. We process the request manually and confirm to you when it is done.' },
      { kind: 'note', text: 'There is currently no in-product button to delete an account, and for that reason we do not promise a specific turnaround time. This will be stated here explicitly when the feature exists.' },
    ],
  },
  {
    id: 'security',
    title: 'Information security',
    blocks: [
      { kind: 'p', text: 'The site is served over HTTPS; authentication and passwords are handled by a specialist provider that gives us no sight of your password; and access to account data is restricted at the database level so that a user reaches only their own rows.' },
      { kind: 'note', text: 'No internet service is absolutely secure, and we do not claim otherwise. We hold no compliance certification and no security accreditation, and we claim none. You are responsible for keeping your password confidential.' },
    ],
  },
  {
    id: 'external',
    title: 'External links and sources',
    blocks: [
      { kind: 'p', text: 'The platform contains links to sites we do not operate: official bodies, data sources, media outlets, and our own social media accounts. Each has its own policies, and this policy does not apply to them. The presence of a link does not mean we share any data about you with that site.' },
    ],
  },
  {
    id: 'children',
    title: 'Minimum age',
    blocks: [
      { kind: 'p', text: 'The service is intended for people aged 18 or over. The platform does not target children and does not knowingly invite anyone below that age to create an account.' },
      { kind: 'p', text: 'If it becomes apparent to us that an account was created for someone below the permitted age, we may restrict or delete the account and take reasonable steps to remove the data associated with it, subject to any legal obligation requiring a particular record to be kept.' },
      { kind: 'p', text: 'If you are a parent or guardian and believe a child has created an account, write to us and we will deal with it.' },
    ],
  },
  {
    id: 'rights',
    title: 'Your rights and requests',
    blocks: [
      { kind: 'p', text: 'You can write to us from your registered email address to request:' },
      {
        kind: 'ul',
        items: [
          'A copy of the account data we hold about you.',
          'Correction of inaccurate data, such as your username.',
          'Deletion of the account and what is attached to it.',
          'Any enquiry relating to this policy.',
        ],
      },
      { kind: 'p', text: 'We commit to what we can actually carry out, and we usually reply within one to two working days. We do not promise steps the platform has no ability to perform.' },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    blocks: [
      { kind: 'p', text: 'We may update this policy whenever the platform or its service providers change. We publish the updated version on this page and change the last-updated date at the top of it. It is worth reviewing from time to time.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    blocks: [
      { kind: 'p', text: 'For any question or request relating to privacy, write to us at boatlef@gmail.com — the same address published on the Contact page. This is the designated channel for privacy requests; social media accounts are not an official channel for them.' },
      { kind: 'p', text: 'Who operates the platform is set out in the “Who operates the platform” section above.' },
    ],
  },
]

/* ═══ Terms of Use and disclaimer ═════════════════════════════════════════ */

export const TERMS_DOC_EN: LegalSection[] = [
  {
    id: 'accept',
    title: 'Acceptance of these terms',
    blocks: [
      { kind: 'p', text: 'By using the IQWealth platform you confirm that you have read these terms and agree to them. If you do not agree with any of them, please do not use the platform.' },
      { kind: 'p', text: 'These terms apply to all visitors, whether or not they have created an account.' },
    ],
  },
  {
    id: 'what',
    title: 'What IQWealth is',
    blocks: [
      { kind: 'p', text: 'IQWealth is an information and tools platform for the Iraq Stock Exchange. It provides prices, indices and data on listed companies, market and foreign-flow statistics, educational and news content, personal tools for tracking a portfolio and a watchlist, and pages for exchange rates, gold and oil.' },
      { kind: 'note', text: 'IQWealth is not a brokerage, not a financial market, not an investment adviser, not a custodian, not a bank, and not a licensed financial intermediary. It executes no trades, receives no money and holds no securities.' },
    ],
  },
  {
    id: 'noadvice',
    title: 'No investment advice',
    blocks: [
      { kind: 'p', text: 'Everything presented on the platform — prices, analysis, statistics, articles and tools — is for information and education only. It does not constitute a recommendation to buy or sell any security, nor financial, legal or tax advice, nor an offer or invitation to invest.' },
      { kind: 'p', text: 'We do not know your financial circumstances, your objectives or your risk tolerance, and no material on the platform is built around your personal situation. Your investment decision is yours alone and your responsibility alone, and it is better taken after consulting a qualified professional.' },
    ],
  },
  {
    id: 'risk',
    title: 'Investment risk',
    blocks: [
      { kind: 'p', text: 'Securities prices rise and fall, and you may lose part or all of your capital. Past performance, however consistent it appears, guarantees no future performance. Some thinly traded shares may not be sellable at the price shown, or at the time you want.' },
    ],
  },
  {
    id: 'data',
    title: 'Market data and its accuracy',
    blocks: [
      { kind: 'p', text: 'We draw data from published sources: the Iraq Securities Commission and the Iraq Stock Exchange, the disclosures and official bulletins of listed companies, brokerages, media sources, and sites specialising in exchange, gold and oil prices. We take care in transferring and processing it.' },
      { kind: 'p', text: 'Even so, we do not guarantee the accuracy, completeness or timeliness of the data. It may be:' },
      {
        kind: 'ul',
        items: [
          'Behind the market — what is shown is not necessarily an instantaneous price.',
          'Incomplete or unavailable if the source cannot be reached.',
          'Revised later by the source itself, as happens with financial statements and monthly statistics.',
          'Affected by an error at the source or in our own processing.',
        ],
      },
      { kind: 'note', text: 'Before taking any decision that rests on a particular figure, check the update date and the source shown beside it, and verify it with the official source. Where they differ, the official source is the reference, not this platform.' },
    ],
  },
  {
    id: 'derived',
    title: 'Derived data and calculations',
    blocks: [
      { kind: 'p', text: 'The platform computes values derived from the underlying data, including market capitalisation, multiples, financial ratios, sector aggregates, foreign-flow summaries, rankings and statistical measures.' },
      { kind: 'p', text: 'These values are the product of a methodology we follow. They change as the underlying data or the methodology changes, and they may differ from figures published by others using a different definition. They are presented for information, not as an official figure.' },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    blocks: [
      { kind: 'p', text: 'Creating an account is optional, and requires a valid email address and a password. You are responsible for the accuracy of the data you enter, for keeping your password confidential, and for all activity that takes place through your account.' },
      { kind: 'p', text: 'Tell us immediately if you suspect unauthorised access to your account. Accounts may not be shared, and you may not use someone else’s account.' },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio and watchlist',
    blocks: [
      { kind: 'p', text: 'The portfolio, the watchlist and the alerts are organisation and tracking tools whose data you enter yourself. The value, profit and loss they display are computed from your own figures and from the latest price available to us.' },
      { kind: 'note', text: 'These tools hold no securities, execute no orders, transfer no money, and do not verify your balances with your broker. Where the platform and your broker’s statement differ, the statement is the reference.' },
    ],
  },
  {
    id: 'use',
    title: 'Acceptable use',
    blocks: [
      { kind: 'p', text: 'Use the platform reasonably and lawfully. Specifically, you may not:' },
      {
        kind: 'ul',
        items: [
          'Attempt unauthorised access to systems, accounts or data.',
          'Disrupt the service, overload it, or interfere with its operation.',
          'Scrape content at scale in a way that harms the service or the infrastructure, or that exceeds the means of access we expressly provide, or that breaches published rules.',
          'Republish or sell the platform’s content in breach of the intellectual property section.',
          'Use the platform for any unlawful purpose.',
        ],
      },
      { kind: 'note', text: 'These terms include no general obligation on the user to indemnify IQWealth against third-party claims.' },
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    blocks: [
      { kind: 'p', text: 'The platform’s design and interface, its logo and mark, the editorial and educational material we write, and the organisation and compilation of our databases to the extent the law covers it — all of these are owned by us, and may not be copied or republished commercially without prior permission.' },
      { kind: 'p', text: 'Equally, we claim no ownership of what is not ours: data published by official bodies and listed companies, company names and logos, original documents and disclosures, and content belonging to external sources — each belongs to its owner. Market facts themselves belong to no one.' },
      { kind: 'p', text: 'Limited quotation is permitted with attribution to the source and a link to the page.' },
    ],
  },
  {
    id: 'links',
    title: 'External links and sources',
    blocks: [
      { kind: 'p', text: 'The platform links to sites and documents we do not operate. We are not responsible for their content, accuracy, policies or continued availability, and the presence of a link does not imply endorsement of what it contains.' },
    ],
  },
  {
    id: 'availability',
    title: 'Service availability',
    blocks: [
      { kind: 'p', text: 'The platform is under continuous development. We may carry out maintenance, add features or change or withdraw them, change data sources, or the service may be interrupted in whole or in part for technical reasons or reasons affecting our sources.' },
      { kind: 'p', text: 'We do not promise uninterrupted service, and we do not promise that any particular feature will remain available forever. We aim to keep interruption to a minimum.' },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    blocks: [
      { kind: 'p', text: 'The platform, its content, its data and its tools are provided on an informational basis. We make reasonable efforts to present data accurately and current, but we do not guarantee that all data will be complete or free of delay, error or interruption, and we do not guarantee the continued availability of any external source.' },
      { kind: 'p', text: 'You are responsible for verifying information before taking any financial or investment decision. The prices, indices, statistics, news and tools presented do not constitute a recommendation to buy or sell any security, and do not constitute investment, legal or tax advice.' },
      { kind: 'p', text: 'To the maximum extent permitted by applicable Iraqi law, we are not liable for indirect or consequential losses, or for loss of opportunity or profit, arising from reliance on the platform’s information or from being unable to reach it. Nothing in this section limits any liability that may not lawfully be excluded or restricted.' },
      { kind: 'note', text: 'The platform is free and is provided as-is. The foregoing includes service interruption, an error, delay or gap in an external source’s data, and loss of data saved in your browser.' },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    blocks: [
      { kind: 'p', text: 'We may amend these terms as the platform develops. The amended version is published on this page with its date updated, and your continued use after publication is taken as acceptance of it. Where an amendment is material, we aim to note it inside the platform.' },
    ],
  },
  {
    id: 'termination',
    title: 'Terminating or restricting an account',
    blocks: [
      { kind: 'p', text: 'You may stop using the platform at any time, and request deletion of your account as set out in the Privacy Policy.' },
      { kind: 'p', text: 'We may restrict access or suspend an account where there is reasonable ground to believe there has been misuse, a security risk, or a material breach of these terms, including a breach of the acceptable-use section, subject to applicable law. We aim to notify you at your registered email address unless a security reason prevents it.' },
    ],
  },
  {
    id: 'law',
    title: 'Governing law and dispute resolution',
    blocks: [
      { kind: 'p', text: 'These terms are governed by and construed in accordance with the laws in force in the Republic of Iraq.' },
      { kind: 'p', text: 'If a dispute arises relating to the platform or to these terms, we first seek to resolve it directly and reasonably through the contact channels published on the platform. If an amicable resolution is not possible, jurisdiction lies with the competent Iraqi judicial authorities, in accordance with the rules of subject-matter and territorial jurisdiction laid down in the law in force.' },
      { kind: 'p', text: 'These terms are concluded between the user and the operator of the IQWealth platform at the domain iraqsm.com. The use of the name IQWealth in these terms identifies the platform and the service; it is not intended to claim any regulatory status or financial licence that does not exist.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    blocks: [
      { kind: 'p', text: 'For any legal enquiry relating to these terms, write to us at boatlef@gmail.com.' },
    ],
  },
]

/** The same date as the Arabic draft — this is a translation of that draft. */
export const DOC_UPDATED_EN = '25 August 2026'
