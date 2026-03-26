function makeDay(day, title, scripture, reflection, prayer) {
  return { day, title, scripture, reading: scripture, reflection, prayer }
}

const faithDays = [
  makeDay(1, 'What Is Faith?', 'Hebrews 11:1-6', 'Faith trusts God even when outcomes are unseen.', 'Lord, teach me to trust what You have promised.'),
  makeDay(2, 'Faith to Follow', 'Matthew 4:18-22', 'The disciples left comfort to follow Christ.', 'Jesus, give me courage to follow Your voice today.'),
  makeDay(3, 'Faith in Trials', 'James 1:2-6', 'Testing forms endurance and maturity in Christ.', 'Father, grow my endurance through every challenge.'),
  makeDay(4, 'Faith Speaks', 'Mark 5:25-34', 'The woman touched Jesus in bold belief.', 'Lord, let my faith move me toward You.'),
  makeDay(5, 'Faith and Obedience', 'Genesis 12:1-4', 'Abraham obeyed before seeing the full picture.', 'God, help me obey before I understand everything.'),
  makeDay(6, 'Faith Over Fear', 'Psalm 56:3-4', 'Fear loses power when we place trust in God.', 'When I am afraid, remind me to trust in You.'),
  makeDay(7, 'Faith That Endures', '2 Timothy 4:7-8', 'A faithful finish is built one day at a time.', 'Strengthen me to run this race with perseverance.'),
]

const peaceDays = [
  makeDay(1, 'Peace from Christ', 'John 14:27', 'Jesus gives peace deeper than circumstances.', 'Prince of Peace, settle my heart in You.'),
  makeDay(2, 'Peace in Prayer', 'Philippians 4:6-7', 'Prayer exchanges anxiety for God’s peace.', 'I surrender my worries and receive Your peace.'),
  makeDay(3, 'Stillness Before God', 'Psalm 46:10', 'Quietness helps us remember who God is.', 'Help me be still and know You today.'),
  makeDay(4, 'Peace in the Storm', 'Mark 4:35-41', 'Jesus is Lord over every storm.', 'Speak peace over the chaos in my life.'),
  makeDay(5, 'Guarded Mind', 'Isaiah 26:3', 'Steady trust produces steady peace.', 'Keep my mind fixed on You, Lord.'),
  makeDay(6, 'Peace with Others', 'Romans 12:18', 'God calls us to pursue peace with people.', 'Give me humility and wisdom in relationships.'),
  makeDay(7, 'Rest for the Soul', 'Matthew 11:28-30', 'Christ invites the weary into rest.', 'Jesus, I come to You for true rest.'),
]

const purposeDays = Array.from({ length: 14 }).map((_, i) =>
  makeDay(
    i + 1,
    `Purpose Step ${i + 1}`,
    ['Jeremiah 29:11', 'Ephesians 2:10', 'Proverbs 3:5-6', 'Colossians 3:23', 'Micah 6:8'][i % 5],
    'God shapes purpose through daily obedience, not instant clarity.',
    'Lord, guide my steps and align my plans with Your will.',
  ),
)

const healingDays = [
  makeDay(1, 'He Sees Your Wounds', 'Psalm 34:18', 'God draws near to the brokenhearted.', 'Lord, meet me in my pain with Your presence.'),
  makeDay(2, 'He Restores', 'Psalm 23:1-3', 'The Shepherd restores weary souls.', 'Restore my soul and renew my strength.'),
  makeDay(3, 'Healing in Community', 'James 5:13-16', 'Prayer with others brings strength and healing.', 'Teach me to seek prayer and walk in humility.'),
  makeDay(4, 'Hope While Waiting', 'Romans 8:24-28', 'God works even while healing is unfinished.', 'Help me trust You while I wait.'),
  makeDay(5, 'Peace for the Mind', '2 Corinthians 10:4-5', 'God helps us take thoughts captive.', 'Guard my mind with truth and hope.'),
  makeDay(6, 'Grace for Today', 'Lamentations 3:22-23', 'Mercy is renewed every morning.', 'Thank You for fresh mercy today.'),
  makeDay(7, 'Wholeness in Christ', 'John 10:10', 'Jesus leads us into abundant life.', 'Lead me into deeper wholeness in You.'),
]

const armorDays = [
  makeDay(1, 'Stand Firm', 'Ephesians 6:10-13', 'Spiritual strength begins in the Lord.', 'Lord, make me strong in Your mighty power.'),
  makeDay(2, 'Belt of Truth', 'Ephesians 6:14a', 'Truth keeps us grounded and free.', 'Help me live anchored in truth.'),
  makeDay(3, 'Breastplate of Righteousness', 'Ephesians 6:14b', 'Christ’s righteousness protects our hearts.', 'Cover my heart with Your righteousness.'),
  makeDay(4, 'Shoes of Peace', 'Ephesians 6:15', 'The gospel prepares us to walk in peace.', 'Make me ready to carry Your peace.'),
  makeDay(5, 'Shield of Faith', 'Ephesians 6:16', 'Faith extinguishes enemy attacks.', 'Strengthen my faith against every lie.'),
  makeDay(6, 'Helmet and Sword', 'Ephesians 6:17', 'Salvation and Scripture guard mind and spirit.', 'Teach me to wield Your Word with wisdom.'),
  makeDay(7, 'Pray in the Spirit', 'Ephesians 6:18', 'Prayer keeps us alert and dependent on God.', 'Keep me watchful and prayerful each day.'),
]

const psalmRefs = [
  'Psalm 1', 'Psalm 3', 'Psalm 5', 'Psalm 8', 'Psalm 16', 'Psalm 19', 'Psalm 23', 'Psalm 27', 'Psalm 30', 'Psalm 32',
  'Psalm 34', 'Psalm 37', 'Psalm 40', 'Psalm 42', 'Psalm 46', 'Psalm 51', 'Psalm 55', 'Psalm 56', 'Psalm 61', 'Psalm 63',
  'Psalm 71', 'Psalm 73', 'Psalm 84', 'Psalm 91', 'Psalm 103', 'Psalm 107', 'Psalm 118', 'Psalm 121', 'Psalm 130', 'Psalm 139',
]

const psalmDays = psalmRefs.map((ref, i) =>
  makeDay(
    i + 1,
    `Hope from ${ref}`,
    ref,
    'The Psalms teach us to bring every emotion honestly before God and find hope in His character.',
    'God of hope, turn my heart toward You in every season.',
  ),
)

export const readingPlans = [
  {
    id: 1,
    title: 'Foundation of Faith',
    duration: 7,
    topic: 'Faith',
    description: "A 7-day journey through Scripture's greatest passages on faith.",
    color: '#D4A843',
    icon: '✝️',
    days: faithDays,
  },
  {
    id: 2,
    title: 'Peace in the Storm',
    duration: 7,
    topic: 'Peace',
    description: 'Find calm and confidence in God during uncertain days.',
    color: '#D4A843',
    icon: '🕊️',
    days: peaceDays,
  },
  {
    id: 3,
    title: 'Walking in Purpose',
    duration: 14,
    topic: 'Purpose',
    description: 'A 14-day plan for clarity, calling, and faithful daily steps.',
    color: '#D4A843',
    icon: '🧭',
    days: purposeDays,
  },
  {
    id: 4,
    title: 'Healing & Restoration',
    duration: 7,
    topic: 'Healing',
    description: 'Scripture and prayer for renewal of heart, mind, and spirit.',
    color: '#D4A843',
    icon: '💛',
    days: healingDays,
  },
  {
    id: 5,
    title: 'Armor of God',
    duration: 7,
    topic: 'Strength',
    description: 'Put on the full armor of God and stand firm in Christ.',
    color: '#D4A843',
    icon: '🛡️',
    days: armorDays,
  },
  {
    id: 6,
    title: 'Psalms of Hope',
    duration: 30,
    topic: 'Hope',
    description: 'Thirty days in Psalms to build resilient hope in God.',
    color: '#D4A843',
    icon: '📜',
    days: psalmDays,
  },
]
