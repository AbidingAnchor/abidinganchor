function VerseCard({ reference, text }) {
  return (
    <article className="rounded-2xl border border-accent-gold/25 bg-parchment p-5 shadow-sm">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent-gold">
        {reference}
      </p>
      <p className="text-lg leading-relaxed text-primary-dark">{text}</p>
    </article>
  )
}

export default VerseCard
