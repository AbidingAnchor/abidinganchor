const topics = [
  'Peace',
  'Faith',
  'Hope',
  'Strength',
  'Love',
  'Purpose',
  'Healing',
  'Gratitude',
  'Forgiveness',
  'Courage',
  'Wisdom',
  'Patience',
]

const verses = [
  {
    scripture: 'John 14:27',
    verse:
      'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.',
  },
  { scripture: 'Hebrews 11:1', verse: 'Now faith is confidence in what we hope for and assurance about what we do not see.' },
  { scripture: 'Romans 15:13', verse: 'May the God of hope fill you with all joy and peace as you trust in him.' },
  { scripture: 'Isaiah 40:31', verse: 'But those who hope in the LORD will renew their strength.' },
  { scripture: '1 Corinthians 13:13', verse: 'And now these three remain: faith, hope and love. But the greatest of these is love.' },
  { scripture: 'Jeremiah 29:11', verse: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you.' },
  { scripture: 'Psalm 147:3', verse: 'He heals the brokenhearted and binds up their wounds.' },
  { scripture: '1 Thessalonians 5:18', verse: 'Give thanks in all circumstances; for this is God’s will for you in Christ Jesus.' },
  { scripture: 'Ephesians 4:32', verse: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.' },
  { scripture: 'Joshua 1:9', verse: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you.' },
  { scripture: 'James 1:5', verse: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault.' },
  { scripture: 'Galatians 6:9', verse: 'Let us not become weary in doing good, for at the proper time we will reap a harvest.' },
]

const titles = [
  'Anchored in Peace',
  'Trust Beyond Sight',
  'Hope That Holds',
  'Strength for Today',
  'Love Without Measure',
  'Purpose in Every Step',
  'Healing in His Hands',
  'A Heart of Gratitude',
  'Freed by Forgiveness',
  'Courage to Continue',
  'Wisdom for the Road',
  'Patience in Process',
]

export const devotionals = Array.from({ length: 36 }).map((_, index) => {
  const day = index + 1
  const topic = topics[index % topics.length]
  const verseSet = verses[index % verses.length]
  const title = `${titles[index % titles.length]} ${Math.floor(index / titles.length) + 1}`
  return {
    id: day,
    day,
    title,
    topic,
    scripture: verseSet.scripture,
    verse: verseSet.verse,
    reflection: `God meets you in ordinary moments, and today is no exception. Your quiet time with Scripture is not a task to finish, but a place to be formed by grace.\n\nWhen your mind is crowded with noise, slow down and listen again for the steady voice of Christ. He speaks with truth, comfort, and direction that lasts beyond feelings.\n\nLet this Word settle deeply in your heart. Carry it with you as a living reminder that God is present, faithful, and near.`,
    prayer: `Lord Jesus, thank You for meeting me here. Shape my thoughts and desires around Your truth today. Help me walk with a soft heart, attentive ears, and steady trust in You. Amen.`,
    application:
      `Practice one pause of surrender today: stop for one minute, breathe slowly, and repeat this Scripture aloud. Write one step of obedience you will take before the day ends.`,
  }
})

export const devotionalTopics = ['All', ...topics]
