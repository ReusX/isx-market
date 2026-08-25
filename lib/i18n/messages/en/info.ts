import type { info as ar } from '../ar/info'

export const info: typeof ar = {
  about: {
    eyebrow:    'About',
    title:      'Welcome',
    standfirst: 'A free platform that helps Iraqi investors decide with daily data.',

    letter1: 'A special welcome to you. This site was built by',
    letterAuthor: 'Ahmed Balha',
    letter1b: ', a finance writer and an investor in US and Iraqi equities.',
    letter2: 'The site is completely free, and it was made to help Iraqi investors make their own decisions. It is still being built and a great deal more is coming, but you can rely on it for your daily information.',
    signOff: 'With thanks,',
    signName: 'Ahmed.',

    claimsHeading: 'What this platform is',
    claimFreeTerm: 'Free',
    claimFreeDesc: 'Every page, with no subscription.',
    claimDailyTerm: 'Daily',
    claimDailyDesc: 'Session and company data update after each trading session.',
    claimBuildingTerm: 'Still being built',
    claimBuildingDesc: 'Features are added as they are ready, and the person behind it is named.',

    sourcesHeading: 'Where the data comes from',
    sourcesNote: 'This section is for data sources and the update methodology. The final text is still to be written.',

    reachHeading: 'Get in touch',
    reachGo: 'All the ways to reach us',
  },

  contact: {
    eyebrow:    'Contact',
    title:      'We’d like to hear from you',
    standfirst: 'A question, a suggestion, or a problem to report — one step to reach us.',

    emailHeading: 'Email',
    replyTime:    'We usually reply within 1–2 working days',
    copy:         'Copy address',
    copied:       'Copied',
    copiedAnnounce: 'Email address copied',

    channelsHeading: 'Other channels',
    phone:           'Phone',
    newWindow:       'Opens in a new window',

    topicsHeading: 'Choose a topic',
    topicsNote:    'Pick a topic and an email opens, already addressed and titled.',
    topics: {
      data:    { label: 'Data issue',    subject: 'Data issue' },
      account: { label: 'Account issue', subject: 'Account issue' },
      fix:     { label: 'Correction',    subject: 'Correction' },
      idea:    { label: 'Suggestion',    subject: 'Suggestion' },
      partner: { label: 'Partnership',   subject: 'Partnership enquiry' },
      other:   { label: 'Other',         subject: 'General enquiry' },
    },
  },

  familyLabel: 'Site pages',
}
