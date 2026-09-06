import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

type MediaType = 'book' | 'tv' | 'movie'

interface MediaVersion {
  type: MediaType
  year: number
  creator: string
  country?: string
  seasons?: number
  runtime?: number
}

interface SearchResult {
  id: string
  title: string
  versions: MediaVersion[]
  description: string
  coverHue?: number
}

const MOCK_DATA: SearchResult[] = [
  {
    id: 'dune',
    title: 'Dune',
    description: 'An epic saga of desert politics, mysticism, and power set on the planet Arrakis.',
    coverHue: 40,
    versions: [
      { type: 'book', year: 1965, creator: 'Frank Herbert', country: 'US' },
      { type: 'movie', year: 1984, creator: 'David Lynch', country: 'US', runtime: 137 },
      { type: 'movie', year: 2021, creator: 'Denis Villeneuve', country: 'US', runtime: 155 },
      { type: 'movie', year: 2024, creator: 'Denis Villeneuve', country: 'US', runtime: 166 },
    ],
  },
  {
    id: 'shogun',
    title: 'Shōgun',
    description: 'A feudal Japan epic of ambition, loyalty, and cultural collision.',
    coverHue: 200,
    versions: [
      { type: 'book', year: 1975, creator: 'James Clavell', country: 'US' },
      { type: 'tv', year: 1980, creator: 'NBC', country: 'US', seasons: 1 },
      { type: 'tv', year: 2024, creator: 'FX / Hulu', country: 'US', seasons: 1 },
    ],
  },
  {
    id: 'three-body',
    title: 'The Three-Body Problem',
    description: "China's Cultural Revolution intersects with first contact in this landmark sci-fi trilogy.",
    coverHue: 160,
    versions: [
      { type: 'book', year: 2006, creator: 'Liu Cixin', country: 'China' },
      { type: 'tv', year: 2023, creator: 'Tencent Video', country: 'China', seasons: 1 },
      { type: 'tv', year: 2024, creator: 'Netflix', country: 'US', seasons: 1 },
    ],
  },
  {
    id: 'normal-people',
    title: 'Normal People',
    description: 'A tender, bruising portrait of two Irish students over several years.',
    coverHue: 280,
    versions: [
      { type: 'book', year: 2018, creator: 'Sally Rooney', country: 'Ireland' },
      { type: 'tv', year: 2020, creator: 'BBC Three / Hulu', country: 'Ireland / UK', seasons: 1 },
    ],
  },
  {
    id: 'pachinko',
    title: 'Pachinko',
    description: 'Four generations of a Korean family navigate discrimination and identity in Japan.',
    coverHue: 15,
    versions: [
      { type: 'book', year: 2017, creator: 'Min Jin Lee', country: 'US' },
      { type: 'tv', year: 2022, creator: 'Apple TV+', country: 'US', seasons: 2 },
    ],
  },
  {
    id: 'succession',
    title: 'Succession',
    description: 'A dysfunctional media dynasty tears itself apart fighting over the crown.',
    coverHue: 60,
    versions: [{ type: 'tv', year: 2018, creator: 'Jesse Armstrong / HBO', country: 'US', seasons: 4 }],
  },
  {
    id: 'parasite',
    title: 'Parasite',
    description: 'Class warfare escalates between two Seoul families with darkly comic precision.',
    coverHue: 120,
    versions: [{ type: 'movie', year: 2019, creator: 'Bong Joon-ho', country: 'South Korea', runtime: 132 }],
  },
  {
    id: 'squid-game',
    title: 'Squid Game',
    description: "Desperate contestants compete in deadly children's games for life-changing money.",
    coverHue: 330,
    versions: [{ type: 'tv', year: 2021, creator: 'Hwang Dong-hyuk / Netflix', country: 'South Korea', seasons: 2 }],
  },
  {
    id: 'my-brilliant-friend',
    title: 'My Brilliant Friend',
    description: 'A lifelong friendship between two women unfolds across the Neapolitan novels.',
    coverHue: 320,
    versions: [
      { type: 'book', year: 2011, creator: 'Elena Ferrante', country: 'Italy' },
      { type: 'tv', year: 2018, creator: 'HBO / RAI', country: 'Italy', seasons: 4 },
    ],
  },
  {
    id: 'the-americans',
    title: 'The Americans',
    description: 'Soviet agents embedded in 1980s Washington DC navigate espionage and identity.',
    coverHue: 240,
    versions: [{ type: 'tv', year: 2013, creator: 'Joe Weisberg / FX', country: 'US', seasons: 6 }],
  },
  {
    id: 'station-eleven',
    title: 'Station Eleven',
    description: 'A flu pandemic reshapes civilization; survivors cling to art and memory.',
    coverHue: 190,
    versions: [
      { type: 'book', year: 2014, creator: 'Emily St. John Mandel', country: 'Canada' },
      { type: 'tv', year: 2021, creator: 'HBO Max', country: 'US', seasons: 1 },
    ],
  },
  {
    id: 'beloved',
    title: 'Beloved',
    description: 'A freed enslaved woman is haunted by the ghost of her daughter in post-Civil War Ohio.',
    coverHue: 350,
    versions: [
      { type: 'book', year: 1987, creator: 'Toni Morrison', country: 'US' },
      { type: 'movie', year: 1998, creator: 'Jonathan Demme', country: 'US', runtime: 172 },
    ],
  },
]

const TYPE_CONFIG: Record<MediaType, { label: string; short: string; color: string; bg: string; border: string }> = {
  book: {
    label: 'Book',
    short: 'B',
    color: '#472d30',
    bg: '#f5ecd4',
    border: '#ffe1a8',
  },
  tv: {
    label: 'TV',
    short: 'TV',
    color: '#e26d5c',
    bg: '#faeae8',
    border: '#e26d5c',
  },
  movie: {
    label: 'Film',
    short: 'F',
    color: '#723d46',
    bg: '#e8e6d4',
    border: '#c9cba3',
  },
}

function MediaBadge({ type, compact = false }: { type: MediaType; compact?: boolean }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        fontFamily: "'JetBrains Mono', monospace",
      }}
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded-sm tracking-wider uppercase select-none"
    >
      {compact ? cfg.short : cfg.label}
    </span>
  )
}

function CoverSwatch({ hue, title }: { hue: number; title: string }) {
  return (
    <div
      className="w-10 h-14 rounded-sm flex-shrink-0 flex items-end justify-center overflow-hidden"
      style={{
        background: `linear-gradient(160deg, hsl(${hue},42%,62%) 0%, hsl(${hue},38%,42%) 100%)`,
      }}
      aria-hidden="true"
    >
      <span
        className="text-[6px] font-medium text-white/70 text-center px-0.5 pb-1 leading-tight"
        style={{ fontFamily: "'Fraunces', serif", wordBreak: 'break-all' }}
      >
        {title.slice(0, 12)}
      </span>
    </div>
  )
}

function VersionRow({ v }: { v: MediaVersion }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-sm hover:bg-[#ede8d8] transition-colors cursor-pointer group">
      <MediaBadge type={v.type} />
      <span className="text-sm text-[#472d30] font-medium">{v.year}</span>
      <span className="text-sm text-[#723d46]">{v.creator}</span>
      {v.country && <span className="text-xs text-[#c9cba3] ml-auto">{v.country}</span>}
      {v.type === 'tv' && v.seasons && (
        <span className="text-xs text-[#c9cba3]">
          {v.seasons} {v.seasons === 1 ? 'season' : 'seasons'}
        </span>
      )}
      {v.type === 'movie' && v.runtime && <span className="text-xs text-[#c9cba3]">{v.runtime} min</span>}
      <svg
        className="w-3.5 h-3.5 text-[#ddd4b8] group-hover:text-[#e26d5c] transition-colors ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </div>
  )
}

function ResultCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false)
  const isGrouped = result.versions.length > 1
  const primaryTypes = [...new Set(result.versions.map((v) => v.type))]

  return (
    <div
      className="rounded-md border border-[#ddd4b8] bg-[#fffaf4] overflow-hidden transition-shadow hover:shadow-[0_2px_16px_rgba(28,25,23,0.07)]"
      style={{ fontFamily: "'Instrument Sans', sans-serif" }}
    >
      <div
        className={`flex gap-4 p-4 ${isGrouped ? 'cursor-pointer select-none' : ''}`}
        onClick={() => isGrouped && setExpanded((x) => !x)}
      >
        <CoverSwatch hue={result.coverHue ?? 30} title={result.title} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3
              className="text-base font-medium text-[#472d30] leading-snug"
              style={{ fontFamily: "'Fraunces', serif", fontOpticalSizing: 'auto' } as CSSProperties}
            >
              {result.title}
            </h3>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {primaryTypes.map((t) => (
                <MediaBadge key={t} type={t} />
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-[#723d46] leading-relaxed line-clamp-2">{result.description}</p>
          {isGrouped && (
            <button
              className="mt-2 text-xs text-[#e26d5c] hover:text-[#723d46] font-medium transition-colors flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((x) => !x)
              }}
            >
              <span>{result.versions.length} versions</span>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        {!isGrouped && (
          <button className="flex-shrink-0 self-center ml-2 px-3 py-1.5 rounded-sm bg-[#472d30] text-[#fdf6ee] text-xs font-medium hover:bg-[#e26d5c] transition-colors">
            + Rank
          </button>
        )}
      </div>

      {isGrouped && expanded && (
        <div className="border-t border-[#c8e4ea] bg-[#fdf6ee] px-3 pb-2 pt-1">
          <div className="mb-1 px-1 pt-1">
            <span
              className="text-[10px] text-[#c9cba3] uppercase tracking-widest font-medium"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              All versions
            </span>
          </div>
          {result.versions.map((v, i) => (
            <VersionRow key={i} v={v} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return MOCK_DATA.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.versions.some((v) => v.creator.toLowerCase().includes(q) || (v.country?.toLowerCase().includes(q) ?? false)),
    )
  }, [query])

  const showEmpty = query.trim().length > 1 && results.length === 0
  const showResults = results.length > 0
  const showSuggestions = !query && focused

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="min-h-full"
      style={{
        background: 'linear-gradient(170deg, #fdf6ee 0%, #ede8d8 100%)',
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      {/* Header */}
      <header className="border-b border-[#ddd4b8]/60 bg-[#fffaf4]/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-8 h-14 flex items-center">
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm text-[#723d46] hover:text-[#472d30] transition-colors">
              My Rankings
            </a>
            <a href="#" className="text-sm text-[#723d46] hover:text-[#472d30] transition-colors">
              Discover
            </a>
          </nav>
          <div className="flex items-center gap-3 ml-auto">
            <span
              className="text-lg text-[#472d30] tracking-tight"
              style={{ fontFamily: "'Akaya Telivigala', cursive", fontWeight: 500 }}
            >
              Curio
            </span>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'linear-gradient(135deg, #e26d5c, #723d46)', color: '#fffaf4' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero + Search */}
      <main className="max-w-5xl mx-auto px-8">
        <div className="pt-20 pb-10 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#ddd4b8] bg-[#fffaf4]/80 text-xs text-[#723d46] mb-8"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Books <span className="w-1.5 h-1.5 rounded-full bg-[#e26d5c] inline-block" /> TV{' '}
            <span className="w-1.5 h-1.5 rounded-full bg-[#e26d5c] inline-block" /> Film
          </div>

          <h1
            className="text-5xl text-[#472d30] mb-4 leading-tight"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            What did your <em style={{ fontStyle: 'italic', color: '#e26d5c' }}>curiosity</em> collect?
          </h1>
          <p className="text-[#723d46] text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Search any book, series, or film and rank them head-to-head. No stars — just your honest opinion.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <div
              className={`flex items-center gap-3 px-5 py-4 rounded-md border bg-[#fffaf4] transition-all duration-200 ${
                focused
                  ? 'border-[#e26d5c] shadow-[0_0_0_3px_rgba(181,69,27,0.12)]'
                  : 'border-[#ddd4b8] shadow-[0_2px_12px_rgba(28,25,23,0.06)]'
              }`}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 transition-colors ${focused ? 'text-[#e26d5c]' : 'text-[#c9cba3]'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7 7 0 1110 3a7 7 0 016.65 13.65z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search any title, author, director…"
                className="flex-1 bg-transparent text-[#472d30] placeholder:text-[#c9cba3] text-base outline-none"
                style={{ fontFamily: "'Instrument Sans', sans-serif" }}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setQuery('')}
                  className="flex-shrink-0 text-[#c9cba3] hover:text-[#472d30] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {!query && (
                <kbd
                  className="flex-shrink-0 text-[10px] text-[#c9cba3] border border-[#ddd4b8] rounded px-1.5 py-0.5 hidden sm:flex items-center"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ⌘K
                </kbd>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-2xl mx-auto pb-24">
          {showSuggestions && (
            <div className="mt-2">
              <div className="mb-3">
                <span className="text-xs text-[#c9cba3] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Try searching
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Dune', 'Shōgun', 'The Three-Body Problem', 'Pachinko', 'Normal People'].map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 rounded-sm border border-[#ddd4b8] bg-[#fffaf4] text-sm text-[#723d46] hover:border-[#e26d5c] hover:text-[#e26d5c] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResults && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-[#c9cba3] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#c9cba3]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: TYPE_CONFIG.book.color }} />
                    Book
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: TYPE_CONFIG.tv.color }} />
                    TV
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: TYPE_CONFIG.movie.color }} />
                    Film
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {results.map((r) => (
                  <ResultCard key={r.id} result={r} />
                ))}
              </div>
            </div>
          )}

          {showEmpty && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4 text-[#ddd4b8]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}>
                Nothing found
              </div>
              <p className="text-sm text-[#c9cba3]">Try a different title, author, or director.</p>
            </div>
          )}

          {!query && !focused && (
            <div className="mt-4">
              <div className="mb-4">
                <span className="text-xs text-[#c9cba3] uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Recently ranked by the community
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {MOCK_DATA.slice(0, 4).map((r) => (
                  <ResultCard key={r.id} result={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
