// ============================================================
// LEAGUE OF BUMS — SLEEPER API INTEGRATION
// ============================================================
// Pulls live league data (teams, records, schedule, matchups)
// straight from Sleeper's public read-only API. No API key needed.
//
// To point this at a different league (e.g. a new season's league_id
// once Sleeper rolls the league over), just change SLEEPER_LEAGUE_ID
// below and push.
// ============================================================

const SLEEPER_LEAGUE_ID = '1312192910556405760'
const SLEEPER_API = 'https://api.sleeper.app/v1'

const sleeperCache = {
  base: null, // { league, users, rosters, state }
  matchupsByWeek: {}, // week -> raw matchups array
  players: null, // full NFL player dictionary, fetched lazily/once
  trades: null, // normalized trade list, fetched lazily/once
}

async function sleeperFetch(path) {
  const res = await fetch(`${SLEEPER_API}${path}`)
  if (!res.ok) throw new Error(`Sleeper API error ${res.status} on ${path}`)
  return res.json()
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'team'
}

// Fetch + cache league/users/rosters/state. Safe to call many times.
async function getSleeperBase() {
  if (sleeperCache.base) return sleeperCache.base
  const [league, users, rosters, state] = await Promise.all([
    sleeperFetch(`/league/${SLEEPER_LEAGUE_ID}`),
    sleeperFetch(`/league/${SLEEPER_LEAGUE_ID}/users`),
    sleeperFetch(`/league/${SLEEPER_LEAGUE_ID}/rosters`),
    sleeperFetch(`/state/nfl`),
  ])
  sleeperCache.base = { league, users, rosters, state }
  return sleeperCache.base
}

async function getSleeperMatchups(week) {
  if (sleeperCache.matchupsByWeek[week]) return sleeperCache.matchupsByWeek[week]
  const data = await sleeperFetch(`/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`)
  sleeperCache.matchupsByWeek[week] = data
  return data
}

function userForRoster(base, rosterId) {
  const roster = base.rosters.find(r => r.roster_id === rosterId)
  const user = base.users.find(u => u.user_id === roster?.owner_id)
  return { roster, user }
}

function sleeperAvatarUrl(user, roster) {
  const customTeamAvatar = user?.metadata?.avatar || roster?.metadata?.avatar
  if (customTeamAvatar && /^https?:\/\//.test(customTeamAvatar)) return customTeamAvatar
  if (user?.avatar) return `https://sleepercdn.com/avatars/${user.avatar}`
  return null
}

function sleeperTeamName(user, roster, rosterId) {
  return (
    user?.metadata?.team_name ||
    roster?.metadata?.team_name ||
    user?.display_name ||
    `Team ${rosterId}`
  )
}

// Regular-season week range, e.g. [1,2,...,13] if playoffs start week 14.
function regularSeasonWeeks(league) {
  const playoffStart = league?.settings?.playoff_week_start || 15
  const last = Math.max(playoffStart - 1, 1)
  return Array.from({ length: last }, (_, i) => i + 1)
}

// Full schedule range including playoff weeks, capped at 18.
function fullSeasonWeeks(league) {
  const playoffStart = league?.settings?.playoff_week_start || 15
  const numRounds = 3 // Sleeper default bracket depth; harmless if league is smaller
  const last = Math.min(playoffStart + numRounds - 1, 18)
  return Array.from({ length: last }, (_, i) => i + 1)
}

// Builds the normalized team list (real teams, real managers, real records).
async function getSleeperTeams() {
  const base = await getSleeperBase()
  const teams = base.rosters.map(roster => {
    const user = base.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperTeamName(user, roster, roster.roster_id)
    const s = roster.settings || {}
    const pointsFor = (s.fpts || 0) + (s.fpts_decimal || 0) / 100
    const pointsAgainst = (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100
    return {
      id: roster.roster_id,
      rosterId: roster.roster_id,
      ownerId: roster.owner_id,
      slug: slugify(teamName),
      teamName,
      managerName: user?.display_name || 'Unknown Manager',
      avatarUrl: sleeperAvatarUrl(user, roster),
      wins: s.wins || 0,
      losses: s.losses || 0,
      ties: s.ties || 0,
      pointsFor: Math.round(pointsFor * 100) / 100,
      pointsAgainst: Math.round(pointsAgainst * 100) / 100,
    }
  })
  teams.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
  return teams
}

// Groups one week's raw matchup rows into paired games.
function groupMatchupRows(rows, teamsById) {
  const byMatchupId = new Map()
  for (const row of rows || []) {
    if (row.matchup_id === null || row.matchup_id === undefined) continue
    if (!byMatchupId.has(row.matchup_id)) byMatchupId.set(row.matchup_id, [])
    byMatchupId.get(row.matchup_id).push(row)
  }
  const games = []
  for (const [matchupId, group] of byMatchupId) {
    if (group.length < 2) {
      // Bye week / unpaired roster
      const t = teamsById.get(group[0]?.roster_id)
      games.push({ matchupId, bye: true, teamAId: group[0]?.roster_id, teamAScore: group[0]?.points ?? null, teamAName: t?.teamName })
      continue
    }
    const [a, b] = group
    games.push({
      matchupId,
      bye: false,
      teamAId: a.roster_id,
      teamBId: b.roster_id,
      teamAScore: typeof a.points === 'number' ? a.points : null,
      teamBScore: typeof b.points === 'number' ? b.points : null,
    })
  }
  return games
}

// Returns { week, isComplete, isCurrent, games: [...] } for one week.
async function getSleeperWeek(week) {
  const base = await getSleeperBase()
  const teams = await getSleeperTeams()
  const teamsById = new Map(teams.map(t => [t.id, t]))
  const rows = await getSleeperMatchups(week)
  const games = groupMatchupRows(rows, teamsById)
  const currentWeek = base.state?.week || 1
  const sameSeason = String(base.state?.league_season || base.state?.season) === String(base.league?.season)
  const isComplete = sameSeason ? week < currentWeek : games.some(g => (g.teamAScore ?? 0) > 0 || (g.teamBScore ?? 0) > 0)
  const isCurrent = sameSeason && week === currentWeek
  return { week, isComplete, isCurrent, games, teamsById }
}

// Fetches every regular-season week's games (used by Head-to-Head + full schedule).
async function getAllSleeperWeeks(weeks) {
  const results = await Promise.all(weeks.map(w => getSleeperWeek(w)))
  return results
}

// The full NFL player dictionary is a large (~5MB) one-time download. Sleeper
// asks that it not be fetched more than once a day; we fetch it once per page
// load and cache it in memory for the rest of the session.
async function getSleeperPlayers() {
  if (sleeperCache.players) return sleeperCache.players
  sleeperCache.players = await sleeperFetch('/players/nfl')
  return sleeperCache.players
}

function sleeperPlayerName(playersById, playerId) {
  const p = playersById?.[playerId]
  if (!p) return `Player #${playerId}`
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || `Player #${playerId}`
}

// Fetches raw transactions for one round (week). Some rounds may 404/error
// (e.g. round 0 on leagues that don't use it) — callers should tolerate that.
async function getSleeperTransactions(round) {
  return sleeperFetch(`/league/${SLEEPER_LEAGUE_ID}/transactions/${round}`)
}

// Builds a normalized, de-duplicated, chronological list of every completed
// trade in the league: [{ id, timestamp, sides: [{ rosterId, players: [...], picks: [...] }] }]
async function getSleeperTrades() {
  if (sleeperCache.trades) return sleeperCache.trades

  const base = await getSleeperBase()
  const rounds = [0, ...fullSeasonWeeks(base.league)]
  const playersById = await getSleeperPlayers().catch(() => null)

  const byTxId = new Map()
  await Promise.all(rounds.map(async round => {
    let rows
    try {
      rows = await getSleeperTransactions(round)
    } catch {
      return // this round has no transactions endpoint data; skip it
    }
    for (const tx of rows || []) {
      if (tx.type !== 'trade' || tx.status !== 'complete') continue
      if (!byTxId.has(tx.transaction_id)) byTxId.set(tx.transaction_id, tx)
    }
  }))

  const trades = [...byTxId.values()].map(tx => {
    const sideMap = new Map((tx.roster_ids || []).map(id => [id, { rosterId: id, players: [], picks: [] }]))
    for (const [playerId, rosterId] of Object.entries(tx.adds || {})) {
      if (!sideMap.has(rosterId)) sideMap.set(rosterId, { rosterId, players: [], picks: [] })
      sideMap.get(rosterId).players.push(sleeperPlayerName(playersById, playerId))
    }
    for (const pick of tx.draft_picks || []) {
      const rosterId = pick.owner_id
      if (!sideMap.has(rosterId)) sideMap.set(rosterId, { rosterId, players: [], picks: [] })
      sideMap.get(rosterId).picks.push(`${pick.season} Round ${pick.round} Pick`)
    }
    return {
      id: tx.transaction_id,
      timestamp: tx.status_updated || 0,
      week: tx.leg,
      sides: [...sideMap.values()],
    }
  })

  trades.sort((a, b) => b.timestamp - a.timestamp)
  sleeperCache.trades = trades
  return trades
}
