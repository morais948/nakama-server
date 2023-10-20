function rpcGetStateMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string | void {
  const { matchId } = JSON.parse(payload)

  const match = nk.matchGet(matchId)
  return JSON.stringify(match)
}
