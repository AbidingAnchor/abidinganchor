const baseVerses = [
  { reference: 'John 3:16', text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.', topic: 'love' },
  { reference: '1 Corinthians 13:4', text: 'Love is patient and is kind. Love does not envy. Love does not brag, is not proud.', topic: 'love' },
  { reference: 'Romans 5:8', text: 'But God commends his own love toward us, in that while we were yet sinners, Christ died for us.', topic: 'love' },
  { reference: 'Hebrews 11:1', text: 'Now faith is assurance of things hoped for, proof of things not seen.', topic: 'faith' },
  { reference: '2 Corinthians 5:7', text: 'For we walk by faith, not by sight.', topic: 'faith' },
  { reference: 'Mark 11:24', text: 'Whatever things you ask in prayer, believe that you receive them, and you shall have them.', topic: 'faith' },
  { reference: 'Romans 15:13', text: 'Now may the God of hope fill you with all joy and peace in believing.', topic: 'hope' },
  { reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, says the Lord, to give you hope and a future.', topic: 'hope' },
  { reference: 'Psalm 39:7', text: 'Now, Lord, what do I wait for? My hope is in you.', topic: 'hope' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ, who strengthens me.', topic: 'strength' },
  { reference: 'Isaiah 41:10', text: 'Do not be afraid, for I am with you. I will strengthen you. I will help you.', topic: 'strength' },
  { reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.', topic: 'strength' },
  { reference: 'John 14:27', text: 'Peace I leave with you. My peace I give to you.', topic: 'peace' },
  { reference: 'Philippians 4:7', text: 'The peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.', topic: 'peace' },
  { reference: 'Romans 12:18', text: 'As much as it is up to you, be at peace with all men.', topic: 'peace' },
  { reference: 'Ephesians 2:8', text: 'For by grace you have been saved through faith, and that not of yourselves; it is the gift of God.', topic: 'grace' },
  { reference: '2 Corinthians 12:9', text: 'My grace is sufficient for you, for my power is made perfect in weakness.', topic: 'grace' },
  { reference: 'Hebrews 4:16', text: 'Let us therefore draw near with boldness to the throne of grace.', topic: 'grace' },
  { reference: 'Philippians 4:6', text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.', topic: 'prayer' },
  { reference: '1 Thessalonians 5:17', text: 'Pray without ceasing.', topic: 'prayer' },
  { reference: 'Jeremiah 33:3', text: 'Call to me, and I will answer you, and will show you great and difficult things, which you do not know.', topic: 'prayer' },
  { reference: '1 John 1:9', text: 'If we confess our sins, he is faithful and righteous to forgive us our sins.', topic: 'forgiveness' },
  { reference: 'Ephesians 4:32', text: 'Be kind to one another, tenderhearted, forgiving each other, just as God also in Christ forgave you.', topic: 'forgiveness' },
  { reference: 'Colossians 3:13', text: 'Forgiving each other, if any man has a complaint against any; even as Christ forgave you, so also do you.', topic: 'forgiveness' },
  { reference: 'Proverbs 3:5', text: 'Trust in the Lord with all your heart, and do not lean on your own understanding.', topic: 'trust' },
  { reference: 'Psalm 56:3', text: 'When I am afraid, I will put my trust in you.', topic: 'trust' },
  { reference: 'Isaiah 26:4', text: 'Trust in the Lord forever; for in Yah, the Lord, is an everlasting Rock.', topic: 'trust' },
  { reference: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid. Do not be dismayed, for the Lord your God is with you wherever you go.', topic: 'courage' },
  { reference: '2 Timothy 1:7', text: 'For God did not give us a spirit of fear, but of power, love, and self-control.', topic: 'courage' },
  { reference: 'Psalm 27:1', text: 'The Lord is my light and my salvation. Whom shall I fear?', topic: 'courage' },
]

export const dailyVerses = Array.from({ length: 365 }, (_, index) => {
  const verse = baseVerses[index % baseVerses.length]
  return { ...verse }
})

export function getDailyVerse() {
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyVerses.length
  return dailyVerses[dayIndex]
}
