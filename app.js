// ============================================================
// LEAGUE OF BUMS — APP LOGIC (plain JS, no build step)
// ============================================================

const root = document.getElementById('root')

function pageFromHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (!h) return { page: 'home' }
  const parts = h.split('/').filter(Boolean)
  if (parts[0] === 'teams' && parts[1]) return { page: 'team', slug: decodeURIComponent(parts[1]) }
  if (['season', 'schedule', 'headtohead', 'podcast', 'history', 'awards', 'teams'].includes(parts[0])) return { page: parts[0] }
  return { page: 'home' }
}

function go(path) {
  window.location.hash = path ? `/${path}` : '/'
}

function team(id) {
  return league.teams.find(t => t.id === id)
}

function driveEmbed(url) {
  const m = url.match(/\/d\/([^/]+)/)
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v
    else if (k === 'html') node.innerHTML = v
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v)
    else node.setAttribute(k, v)
  }
  ;(Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined || c === false) return
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)))
  })
  return node
}

// ---------------- Layout ----------------

function Nav(current) {
  const links = [
    ['season', '2026 Season', 'season'],
    ['schedule', 'Schedule', 'schedule'],
    ['headtohead', 'Head-to-Head', 'headtohead'],
    ['podcast', 'ManeyCast', 'podcast'],
    ['history', 'History', 'history'],
    ['awards', 'Awards', 'awards'],
    ['teams', 'Teams', 'teams'],
  ]
  const linksNav = el('nav', { class: 'links' },
    links.map(([path, label, p]) =>
      el('button', { class: current === p ? 'active' : '', onclick: () => go(path) }, label)
    )
  )
  const menuBtn = el('button', { class: 'mobile-menu', onclick: () => linksNav.classList.toggle('open') }, '☰')
  return el('header', { class: 'topbar' }, el('div', { class: 'wrap nav' }, [
    el('button', { class: 'brand', onclick: () => go('') }, [el('span', {}, 'LEAGUE'), el('span', { class: 'brand-rest' }, 'OF BUMS')]),
    linksNav,
    menuBtn,
  ]))
}

function Footer() {
  return el('footer', { class: 'footer' }, el('div', { class: 'wrap' }, [
    el('strong', {}, 'LEAGUE OF BUMS'),
    el('span', {}, 'EST. 2018 · FANTASY FOOTBALL, BARELY MANAGED'),
  ]))
}

function Hero(eyebrow, title, description, small = false) {
  return el('section', { class: small ? 'hero small' : 'hero' }, el('div', { class: 'wrap' }, [
    el('div', { class: 'eyebrow' }, eyebrow),
    el('h1', {}, title),
    el('p', { class: 'lead' }, description),
  ]))
}

function Empty(label) {
  return el('div', { class: 'empty' }, label)
}

// ---------------- Pages ----------------

function Home() {
  const cardsData = [
    ['01', '2026 Season', 'Power rankings, head-to-head matchups, and weekly previews.', 'season'],
    ['02', 'ManeyCast', 'The official league podcast. New episodes, straight from the Drive.', 'podcast'],
    ['03', 'League History', 'Past champions, every trade ever recorded, and full team histories.', 'history'],
    ['04', 'Awards', 'Glory and infamy. Sharpest GM to the Wooden Spoon.', 'awards'],
    ['05', 'Teams', 'Every roster, every manager, every bad decision, catalogued.', 'teams'],
  ]
  return el('div', {}, [
    el('section', { class: 'hero' }, el('div', { class: 'wrap' }, [
      el('div', { class: 'eyebrow' }, 'EST. 2018 · TEN MANAGERS · ZERO SELF-AWARENESS'),
      el('h1', {}, [el('span', {}, 'LEAGUE'), el('br'), 'OF ', el('span', {}, 'BUMS')]),
      el('p', { class: 'lead' }, "The official home of a fantasy football league that takes waiver claims far more seriously than it takes itself. Rankings, matchups, trades, and a podcast nobody asked for but everybody listens to."),
      el('div', { class: 'buttons' }, [
        el('button', { class: 'btn', onclick: () => go('season') }, 'VIEW 2026 SEASON'),
        el('button', { class: 'btn alt', onclick: () => go('podcast') }, 'VISIT MANEYCAST'),
      ]),
    ])),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, el('div', { class: 'cards five' },
      cardsData.map(([tag, title, desc, path]) =>
        el('button', { class: 'card', onclick: () => go(path) }, [
          el('span', { class: 'tag' }, tag),
          el('h2', {}, title),
          el('p', {}, desc),
        ])
      )
    ))),
  ])
}

async function Season() {
  const latestWeek = Math.max(...league.rankings.filter(r => r.season === league.season).map(r => r.week), 0)
  const ranks = league.rankings.filter(r => r.season === league.season && r.week === latestWeek).sort((a, b) => a.rank - b.rank)

  const rankRows = ranks.length
    ? ranks.map(r => {
        const t = team(r.teamId)
        return el('div', { class: 'rank' }, [
          el('div', { class: 'ranknum' }, String(r.rank).padStart(2, '0')),
          el('div', {}, [
            el('button', { class: 'team-link', onclick: () => go(`teams/${t?.slug}`) }, t?.teamName ?? 'Unknown Team'),
            el('div', { class: 'sub' }, r.blurb || `Managed by ${t?.managerName ?? 'Unknown'}`),
          ]),
          el('div', { class: `trend ${r.trend}` }, r.trend === 'up' ? '▲' : r.trend === 'down' ? '▼' : '—'),
        ])
      })
    : [Empty('No power rankings posted yet.')]

  // Pull this week's live matchups straight from Sleeper.
  let matchupSection
  let headingLabel = ''
  try {
    const base = await getSleeperBase()
    const currentWeek = base.state?.week || 1
    const wk = await getSleeperWeek(currentWeek)
    headingLabel = `WEEK ${wk.week}${wk.isCurrent ? ' · IN PROGRESS' : wk.isComplete ? ' · FINAL' : ''}`
    matchupSection = wk.games.length
      ? el('div', { class: 'cards two' }, wk.games.map(g => MatchupCard(g, wk.teamsById)))
      : Empty('No games scheduled for this week.')
  } catch (err) {
    matchupSection = SleeperError(err)
  }

  const previewsForSeason = league.previews.filter(p => p.season === league.season).sort((a, b) => b.week - a.week)
  const previewArticles = previewsForSeason.length
    ? el('div', { class: 'articles' }, previewsForSeason.map(p =>
        el('article', { class: 'article' }, [
          el('div', { class: 'label' }, `WEEK ${p.week}`),
          el('h3', {}, p.title),
          el('p', {}, p.content),
        ])
      ))
    : Empty('No previews written yet.')

  return el('div', {}, [
    Hero(`${league.season} SEASON`, "RANKINGS, RIVALRIES & RECKONINGS", "Everything happening in League of Bums right now: who's actually good, who's playing who, and what to expect before kickoff.", true),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, [
      el('div', { class: 'sectionhead' }, [el('h2', {}, 'POWER RANKINGS'), el('span', { class: 'label' }, latestWeek ? `WEEK ${latestWeek}` : 'NO WEEK POSTED')]),
      ...rankRows,
    ])),
    el('section', { class: 'section band' }, el('div', { class: 'wrap' }, [
      el('div', { class: 'sectionhead' }, [el('h2', {}, 'HEAD-TO-HEAD MATCHUPS'), el('span', { class: 'label' }, headingLabel)]),
      matchupSection,
      el('div', { class: 'buttons topgap' }, [
        el('button', { class: 'btn alt', onclick: () => go('schedule') }, 'VIEW FULL SCHEDULE'),
        el('button', { class: 'btn alt', onclick: () => go('headtohead') }, 'COMPARE TWO TEAMS'),
      ]),
    ])),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, [
      el('div', { class: 'sectionhead' }, el('h2', {}, 'WEEKLY PREVIEWS')),
      previewArticles,
    ])),
  ])
}

function Podcast() {
  const eps = league.podcastEpisodes
  const content = eps.length
    ? el('div', { class: 'articles' }, eps.map(ep => {
        const embed = driveEmbed(ep.driveUrl)
        return el('article', { class: 'podcast' }, [
          embed
            ? el('iframe', { src: embed, title: ep.title, allow: 'autoplay' })
            : el('a', { class: 'podcast-placeholder', href: ep.driveUrl, target: '_blank' }, 'OPEN ON GOOGLE DRIVE →'),
          el('div', { class: 'pod-info' }, [
            el('div', { class: 'label' }, ep.episodeNumber ? `EPISODE ${ep.episodeNumber}` : 'EPISODE'),
            el('h2', {}, ep.title),
            el('p', {}, ep.description),
            el('a', { href: ep.driveUrl, target: '_blank', class: 'text-link' }, 'VIEW ON GOOGLE DRIVE →'),
          ]),
        ])
      }))
    : Empty('No episodes uploaded yet. Add your Google Drive episodes in data.js.')

  return el('div', {}, [
    Hero('THE OFFICIAL PODCAST', 'MANEYCAST', 'Weekly reactions, trade breakdowns, and league gossip — recorded, uploaded, and occasionally coherent.', true),
    el('section', { class: 'section' }, el('div', { class: 'wrap narrow' }, content)),
  ])
}

function History() {
  const seasons = [...new Set(league.teamHistory.map(h => h.season))].sort((a, b) => b - a)

  const championsSection = league.champions.length
    ? el('div', { class: 'cards three topgap' }, league.champions.sort((a, b) => b.season - a.season).map(c => {
        const t = team(c.teamId)
        return el('div', { class: 'card champion' }, [
          el('div', { class: 'label' }, `${c.season} CHAMPION`),
          el('button', { class: 'team-link big', onclick: () => t && go(`teams/${t.slug}`) }, t?.teamName ?? 'Unknown'),
          c.record ? el('div', { class: 'mono' }, c.record) : null,
          el('p', {}, c.note),
        ])
      }))
    : Empty('No champions crowned yet. Add them in data.js.')

  const tradesSection = league.trades.length
    ? el('div', { class: 'articles topgap' }, league.trades.map(t =>
        el('article', { class: 'article' }, [
          el('div', { class: 'label' }, t.tradeDate + (t.season ? ` · ${t.season} SEASON` : '')),
          el('h3', {}, t.summary),
          el('p', {}, t.details),
          el('div', { class: 'tags' }, t.teamIds.map(id => {
            const tm = team(id)
            return tm ? el('button', { onclick: () => go(`teams/${tm.slug}`) }, tm.teamName) : null
          })),
        ])
      ))
    : Empty('No trades recorded yet.')

  const historyTables = seasons.length
    ? seasons.map(s =>
        el('div', { class: 'history-table' }, [
          el('div', { class: 'label' }, String(s)),
          el('table', {}, [
            el('thead', {}, el('tr', {}, [el('th', {}, 'TEAM'), el('th', {}, 'RECORD'), el('th', {}, 'FINISH'), el('th', {}, 'NOTE')])),
            el('tbody', {}, league.teamHistory.filter(h => h.season === s).map(h => {
              const t = team(h.teamId)
              return el('tr', {}, [
                el('td', {}, el('button', { class: 'text-link', onclick: () => t && go(`teams/${t.slug}`) }, t?.teamName ?? 'Unknown')),
                el('td', {}, `${h.wins}-${h.losses}${h.ties ? `-${h.ties}` : ''}`),
                el('td', {}, h.finish ?? '—'),
                el('td', {}, h.note),
              ])
            })),
          ]),
        ])
      )
    : [Empty('No team histories logged yet.')]

  return el('div', {}, [
    Hero('THE ARCHIVES', 'LEAGUE HISTORY', "Every champion, every trade, and every team's rise or fall — the full paper trail nobody can dispute.", true),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, [el('h2', {}, 'PAST WINNERS'), championsSection])),
    el('section', { class: 'section band' }, el('div', { class: 'wrap' }, [el('h2', {}, 'EVERY TRADE EVER RECORDED'), tradesSection])),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, [el('h2', {}, 'TEAM HISTORIES'), ...historyTables])),
  ])
}

function Awards() {
  const seasons = [...new Set(league.awards.map(a => a.season))].sort((a, b) => b - a)
  const content = seasons.length
    ? seasons.map(s =>
        el('div', { class: 'season-awards' }, [
          el('div', { class: 'label' }, `${s} SEASON`),
          el('div', { class: 'cards three topgap' }, league.awards.filter(a => a.season === s).map(a => {
            const t = a.teamId ? team(a.teamId) : undefined
            return el('div', { class: 'card' }, [
              el('h3', {}, a.title),
              t ? el('button', { class: 'team-link', onclick: () => go(`teams/${t.slug}`) }, t.teamName) : null,
              el('p', {}, a.description),
            ])
          })),
        ])
      )
    : [Empty('No awards handed out yet. Add them in data.js.')]

  return el('div', {}, [
    Hero('GLORY & INFAMY', 'AWARDS', 'From Sharpest GM to the Wooden Spoon — every honor and every humiliation, on the record.', true),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, content)),
  ])
}

// Merges live Sleeper team data with any manual flavor text (motto/bio) kept
// in data.js, matched by slug (the team's Sleeper name, lowercased/dashed).
function mergeTeamWithLocalData(sleeperTeam) {
  const local = league.teams.find(t => t.slug === sleeperTeam.slug)
  return { ...sleeperTeam, motto: local?.motto, teamBio: local?.teamBio, managerBio: local?.managerBio, founded: local?.founded }
}

function SleeperError(err) {
  return el('div', { class: 'empty' }, [
    el('div', {}, "Couldn't reach Sleeper's API right now."),
    el('div', { class: 'sub' }, String(err?.message || err)),
  ])
}

function MatchupCard(game, teamsById) {
  if (game.bye) {
    return el('div', { class: 'match' }, [
      el('div', { class: 'matchrow' }, [
        el('button', { class: 'team-link', onclick: () => go(`teams/${teamsById.get(game.teamAId)?.slug}`) }, game.teamAName ?? 'TBD'),
        el('span', { class: 'score' }, game.teamAScore ?? '—'),
      ]),
      el('div', { class: 'upcoming' }, 'BYE WEEK'),
    ])
  }
  const tA = teamsById.get(game.teamAId), tB = teamsById.get(game.teamBId)
  const hasScores = game.teamAScore !== null && game.teamBScore !== null
  const aWin = hasScores && game.teamAScore > game.teamBScore
  const bWin = hasScores && game.teamBScore > game.teamAScore
  return el('div', { class: 'match' }, [
    el('div', { class: 'matchrow' }, [
      el('button', { class: aWin ? 'winner team-link' : 'team-link', onclick: () => tA && go(`teams/${tA.slug}`) }, tA?.teamName ?? 'TBD'),
      el('span', { class: 'score' }, hasScores ? game.teamAScore : '—'),
    ]),
    el('div', { class: 'dash' }),
    el('div', { class: 'matchrow' }, [
      el('button', { class: bWin ? 'winner team-link' : 'team-link', onclick: () => tB && go(`teams/${tB.slug}`) }, tB?.teamName ?? 'TBD'),
      el('span', { class: 'score' }, hasScores ? game.teamBScore : '—'),
    ]),
  ])
}

async function SchedulePage() {
  let base, weeks
  try {
    base = await getSleeperBase()
    weeks = await getAllSleeperWeeks(fullSeasonWeeks(base.league))
  } catch (err) {
    return el('div', {}, [
      Hero('LIVE FROM SLEEPER', 'SCHEDULE', 'The full season, week by week.', true),
      el('section', { class: 'section' }, el('div', { class: 'wrap' }, SleeperError(err))),
    ])
  }

  const defaultWeek = base.state?.week && weeks.some(w => w.week === base.state.week) ? base.state.week : weeks[0]?.week
  const playoffStart = base.league?.settings?.playoff_week_start || 15

  let activeWeek = defaultWeek
  const weekBody = el('div', { class: 'topgap' })
  const tabsWrap = el('div', { class: 'week-tabs' })

  function renderWeek(weekNum) {
    activeWeek = weekNum
    const wk = weeks.find(w => w.week === weekNum)
    weekBody.innerHTML = ''
    if (!wk || !wk.games.length) {
      weekBody.appendChild(Empty('No games scheduled for this week yet.'))
      return
    }
    weekBody.appendChild(el('div', { class: 'cards two' }, wk.games.map(g => MatchupCard(g, wk.teamsById))))
    ;[...tabsWrap.children].forEach(btn => btn.classList.toggle('active', Number(btn.dataset.week) === weekNum))
  }

  weeks.forEach(wk => {
    const label = wk.week >= playoffStart ? `PO ${wk.week - playoffStart + 1}` : `WK ${wk.week}`
    const btn = el('button', { 'data-week': String(wk.week), onclick: () => renderWeek(wk.week) }, label)
    if (wk.isCurrent) btn.classList.add('current')
    tabsWrap.appendChild(btn)
  })

  renderWeek(defaultWeek)

  return el('div', {}, [
    Hero('LIVE FROM SLEEPER', 'SCHEDULE', "Every week's matchups for the season, pulled straight from Sleeper.", true),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, [
      el('div', { class: 'sectionhead' }, [el('h2', {}, 'FULL SEASON')]),
      tabsWrap,
      weekBody,
    ])),
  ])
}

async function HeadToHeadPage() {
  let teams, weeks, league_
  try {
    teams = await getSleeperTeams()
    const base = await getSleeperBase()
    league_ = base.league
    weeks = await getAllSleeperWeeks(regularSeasonWeeks(league_))
  } catch (err) {
    return el('div', {}, [
      Hero('LIVE FROM SLEEPER', 'HEAD-TO-HEAD', 'Pick two teams, see their series record.', true),
      el('section', { class: 'section' }, el('div', { class: 'wrap' }, SleeperError(err))),
    ])
  }

  const resultBox = el('div', { class: 'topgap' })

  function computeAndRender(idA, idB) {
    resultBox.innerHTML = ''
    if (!idA || !idB || idA === idB) {
      resultBox.appendChild(Empty('Pick two different teams to compare.'))
      return
    }
    const tA = teams.find(t => String(t.id) === String(idA))
    const tB = teams.find(t => String(t.id) === String(idB))
    const games = []
    for (const wk of weeks) {
      for (const g of wk.games) {
        if (g.bye) continue
        const match = (g.teamAId === tA.id && g.teamBId === tB.id) || (g.teamAId === tB.id && g.teamBId === tA.id)
        if (!match) continue
        const aScore = g.teamAId === tA.id ? g.teamAScore : g.teamBScore
        const bScore = g.teamAId === tA.id ? g.teamBScore : g.teamAScore
        games.push({ week: wk.week, aScore, bScore, played: aScore !== null && bScore !== null })
      }
    }
    const played = games.filter(g => g.played)
    const aWins = played.filter(g => g.aScore > g.bScore).length
    const bWins = played.filter(g => g.bScore > g.aScore).length
    const ties = played.filter(g => g.aScore === g.bScore).length

    resultBox.appendChild(el('div', { class: 'match' }, [
      el('div', { class: 'matchrow' }, [
        el('button', { class: 'team-link', onclick: () => go(`teams/${tA.slug}`) }, tA.teamName),
        el('span', { class: 'score' }, aWins),
      ]),
      el('div', { class: 'dash' }),
      el('div', { class: 'matchrow' }, [
        el('button', { class: 'team-link', onclick: () => go(`teams/${tB.slug}`) }, tB.teamName),
        el('span', { class: 'score' }, bWins),
      ]),
      ties ? el('div', { class: 'upcoming' }, `${ties} TIE${ties > 1 ? 'S' : ''} THIS SEASON`) : null,
    ]))

    resultBox.appendChild(played.length
      ? el('div', { class: 'articles topgap' }, played.map(g =>
          el('article', { class: 'article' }, [
            el('div', { class: 'label' }, `WEEK ${g.week}`),
            el('p', {}, `${tA.teamName} ${g.aScore} — ${g.bScore} ${tB.teamName}`),
          ])
        ))
      : Empty(`${tA.teamName} and ${tB.teamName} haven't played this season yet.`))
  }

  const options = (excludeId) => [
    el('option', { value: '' }, 'Select a team…'),
    ...teams.filter(t => String(t.id) !== String(excludeId)).map(t => el('option', { value: String(t.id) }, t.teamName)),
  ]

  const selectA = el('select', { class: 'h2h-select' }, options())
  const selectB = el('select', { class: 'h2h-select' }, options())
  selectA.addEventListener('change', () => computeAndRender(selectA.value, selectB.value))
  selectB.addEventListener('change', () => computeAndRender(selectA.value, selectB.value))

  return el('div', {}, [
    Hero('LIVE FROM SLEEPER', 'HEAD-TO-HEAD', 'Pick two teams and see how their season series stacks up.', true),
    el('section', { class: 'section' }, el('div', { class: 'wrap narrow' }, [
      el('div', { class: 'h2h-picker' }, [selectA, el('span', { class: 'h2h-vs' }, 'VS'), selectB]),
      resultBox,
    ])),
  ])
}

async function Teams() {
  let teams
  try {
    teams = (await getSleeperTeams()).map(mergeTeamWithLocalData)
  } catch (err) {
    return el('div', {}, [
      Hero('THE ROSTERS', 'TEAMS & MANAGERS', 'Ten teams. Ten managers. Wildly varying levels of preparation.', true),
      el('section', { class: 'section' }, el('div', { class: 'wrap' }, SleeperError(err))),
    ])
  }

  return el('div', {}, [
    Hero('THE ROSTERS', 'TEAMS & MANAGERS', 'Live from Sleeper: every roster, every manager, every record, updated automatically.', true),
    el('section', { class: 'section' }, el('div', { class: 'wrap' }, el('div', { class: 'cards three' },
      teams.map(t =>
        el('button', { class: 'card team-card', onclick: () => go(`teams/${t.slug}`) }, [
          t.avatarUrl ? el('img', { src: t.avatarUrl, alt: '', class: 'team-logo' }) : el('span', { class: 'initials' }, t.teamName.split(' ').map(w => w[0]).slice(0, 2).join('')),
          el('h2', {}, t.teamName),
          el('div', { class: 'mono' }, t.managerName),
          el('div', { class: 'mono' }, `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''} · ${t.pointsFor} PF`),
          t.motto ? el('p', {}, `“${t.motto}”`) : null,
        ])
      )
    ))),
  ])
}

async function TeamPage(slug) {
  let t
  try {
    const teams = (await getSleeperTeams()).map(mergeTeamWithLocalData)
    t = teams.find(x => x.slug === slug)
  } catch (err) {
    return el('div', {}, [
      Hero('LIVE DATA', 'TEAM', '', true),
      el('section', { class: 'section' }, el('div', { class: 'wrap' }, SleeperError(err))),
    ])
  }

  if (!t) {
    return el('div', {}, [
      Hero('404', 'TEAM NOT FOUND', "That team isn't in the league right now.", true),
      el('section', { class: 'section' }, el('div', { class: 'wrap' }, el('button', { class: 'btn', onclick: () => go('teams') }, '← BACK TO TEAMS'))),
    ])
  }

  // Manual season-by-season archive (past seasons/leagues) still lives in data.js.
  const localTeam = league.teams.find(x => x.slug === slug)
  const history = localTeam ? league.teamHistory.filter(h => h.teamId === localTeam.id).sort((a, b) => b.season - a.season) : []
  const historyTable = history.length
    ? el('div', { class: 'history-table topgap' }, el('table', {}, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'SEASON'), el('th', {}, 'RECORD'), el('th', {}, 'FINISH'), el('th', {}, 'NOTE')])),
        el('tbody', {}, history.map(h =>
          el('tr', {}, [
            el('td', {}, String(h.season)),
            el('td', {}, `${h.wins}-${h.losses}${h.ties ? `-${h.ties}` : ''}`),
            el('td', {}, h.finish ?? '—'),
            el('td', {}, h.note),
          ])
        )),
      ]))
    : Empty('No past-season records logged yet. Add them in data.js under teamHistory.')

  return el('div', {}, [
    el('section', { class: 'team-hero' }, el('div', { class: 'wrap' }, [
      el('button', { class: 'text-link', onclick: () => go('teams') }, '← ALL TEAMS'),
      el('div', { class: 'team-title' }, [
        el('div', { class: 'team-badge' }, t.avatarUrl ? el('img', { src: t.avatarUrl, alt: '' }) : t.teamName.split(' ').map(w => w[0]).slice(0, 2).join('')),
        el('div', {}, [el('h1', {}, t.teamName), el('div', { class: 'label' }, `MANAGED BY ${t.managerName}`)]),
      ]),
      el('div', { class: 'mono topgap' }, `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''} · ${t.pointsFor} PF · ${t.pointsAgainst} PA (LIVE)`),
      t.motto ? el('p', { class: 'lead' }, `“${t.motto}”`) : null,
    ])),
    el('section', { class: 'section' }, el('div', { class: 'wrap narrow' }, el('div', { class: 'cards two' }, [
      el('div', {}, [
        el('h2', {}, 'TEAM BIO'),
        el('p', { class: 'copy' }, t.teamBio || 'No team bio written yet.'),
        t.founded ? el('div', { class: 'mono' }, `FOUNDED ${t.founded}`) : null,
      ]),
      el('div', {}, [
        el('h2', {}, 'MANAGER BIO'),
        el('p', { class: 'copy' }, t.managerBio || 'No manager bio written yet.'),
      ]),
    ]))),
    el('section', { class: 'section band' }, el('div', { class: 'wrap narrow' }, [
      el('h2', {}, 'SEASON-BY-SEASON'),
      historyTable,
    ])),
  ])
}

// ---------------- App shell / router ----------------

let renderToken = 0

async function render() {
  const token = ++renderToken
  const route = pageFromHash()

  root.innerHTML = ''
  root.appendChild(Nav(route.page))
  let main = el('main', {}, Empty('Loading…'))
  root.appendChild(main)
  root.appendChild(Footer())
  window.scrollTo(0, 0)

  let page
  try {
    page =
      route.page === 'home' ? Home() :
      route.page === 'season' ? await Season() :
      route.page === 'schedule' ? await SchedulePage() :
      route.page === 'headtohead' ? await HeadToHeadPage() :
      route.page === 'podcast' ? Podcast() :
      route.page === 'history' ? History() :
      route.page === 'awards' ? Awards() :
      route.page === 'teams' ? await Teams() :
      await TeamPage(route.slug)
  } catch (err) {
    page = el('div', {}, [
      Hero('SOMETHING WENT WRONG', 'ERROR LOADING PAGE', String(err?.message || err), true),
    ])
  }

  if (token !== renderToken) return // a newer navigation started; drop this stale render

  const newMain = el('main', {}, page)
  main.replaceWith(newMain)
}

window.addEventListener('hashchange', render)
render()
