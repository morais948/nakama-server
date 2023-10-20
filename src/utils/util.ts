function extractState(state: ClassicMatchState) {
  return {
    playerCount: state.playerCount,
    gameState: state.gameState,
    players: state.players
  }
}

function extractPositionPlayers(playerState: { [userId: string]: PlayerState }) {
  const players_position: { [userId: string]: Position } = {}

  for (const id in playerState) {
    players_position[id] = playerState[id].position
  }

  return players_position
}