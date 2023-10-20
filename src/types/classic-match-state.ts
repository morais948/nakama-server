interface ClassicMatchState extends nkruntime.MatchState {
  players: { [userId: string]: PlayerState }
  emptyTicks: number
  minPlayers: number
  maxPlayers: number
  requiredPlayers: number
  playerCount: number
  gameState: GameState
}
