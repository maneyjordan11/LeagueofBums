// ============================================================
// LEAGUE OF BUMS — EDITABLE LEAGUE DATA
// ============================================================
// This is the main file to edit when you want to update the site.
// After changing it: commit/push to GitHub and GitHub Pages will
// publish the update automatically — no build step required.
//
// Keep IDs unique. Team slugs should be lowercase and URL-friendly.
// ============================================================

const league = {
  season: 2026,

  // ----------------------------------------------------------
  // TEAMS
  // Replace these demo teams with your actual League of Bums teams.
  // ----------------------------------------------------------
  teams: [
    { id: 1, slug: 'the-placeholder-bums', teamName: 'The Placeholder Bums', managerName: 'Replace Me', motto: 'Demo data lives here.', founded: 2018 },
    { id: 2, slug: 'gridiron-goblins', teamName: 'Gridiron Goblins', managerName: 'Replace Me', motto: 'Probably starting the wrong guy.' },
    { id: 3, slug: 'sunday-scaries', teamName: 'Sunday Scaries', managerName: 'Replace Me', motto: 'Check the injury report. Again.' },
    { id: 4, slug: 'waiver-wire-warriors', teamName: 'Waiver Wire Warriors', managerName: 'Replace Me', motto: 'First on waivers. Last in the standings.' },
    { id: 5, slug: 'fourth-and-long', teamName: 'Fourth & Long', managerName: 'Replace Me', motto: 'Cowardice is a strategy.' },
  ],

  rankings: [
    { id: 1, season: 2026, week: 1, teamId: 1, rank: 1, blurb: 'Demo ranking — replace with your real team.', trend: 'same' },
    { id: 2, season: 2026, week: 1, teamId: 2, rank: 2, blurb: 'Demo ranking — replace with your real team.', trend: 'up' },
    { id: 3, season: 2026, week: 1, teamId: 3, rank: 3, blurb: 'Demo ranking — replace with your real team.', trend: 'down' },
    { id: 4, season: 2026, week: 1, teamId: 4, rank: 4, blurb: 'Demo ranking — replace with your real team.', trend: 'same' },
    { id: 5, season: 2026, week: 1, teamId: 5, rank: 5, blurb: 'Demo ranking — replace with your real team.', trend: 'up' },
  ],

  matchups: [
    { id: 1, season: 2026, week: 1, teamAId: 1, teamBId: 2, teamAScore: null, teamBScore: null, isComplete: false },
    { id: 2, season: 2026, week: 1, teamAId: 3, teamBId: 4, teamAScore: null, teamBScore: null, isComplete: false },
    { id: 3, season: 2026, week: 1, teamAId: 5, teamBId: 1, teamAScore: null, teamBScore: null, isComplete: false },
  ],

  previews: [
    { id: 1, season: 2026, week: 1, title: 'Week 1 Preview', content: 'Replace this with your weekly preview. Write your trash talk, predictions, injuries, and matchup notes here.' },
  ],

  podcastEpisodes: [
    // Example:
    // { id: 1, episodeNumber: 1, title: 'Episode 1', description: '...', driveUrl: 'https://drive.google.com/file/d/YOUR_ID/view' },
  ],

  champions: [
    // { id: 1, season: 2025, teamId: 1, record: '11-3', note: 'Your championship note.' },
  ],

  trades: [
    // { id: 1, tradeDate: '2026-08-20', season: 2026, summary: 'Team A traded Player X for Player Y.', details: 'Optional details.', teamIds: [1,2] },
  ],

  awards: [
    // { id: 1, season: 2025, title: 'Sharpest GM', teamId: 1, description: 'Why they won.' },
  ],

  teamHistory: [
    // { id: 1, teamId: 1, season: 2025, wins: 10, losses: 4, ties: 0, finish: '1st', note: 'Champion.' },
  ],
}
