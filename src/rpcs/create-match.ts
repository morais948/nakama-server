function createMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: nkruntime.MatchmakerResult[]): string | void {
  try {
    const matchId = nk.matchCreate("ClassicMatchState")

    return matchId
  } catch (err: any) {
    logger.error(err)
    throw (err)
  }
}

function rpcCreateMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string | void {
  const matchId = nk.matchCreate('ClassicMatchState')

  return JSON.stringify({
    matchId
  })
}