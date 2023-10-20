const classicMatchInit = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: { [key: string]: string }): { state: ClassicMatchState, tickRate: number, label: string } {

  const state: ClassicMatchState = {
    players: {},
    emptyTicks: 0,
    minPlayers: 2,
    maxPlayers: 5,
    requiredPlayers: 2,
    playerCount: 0,
    gameState: GameState.WaitingForPlayers
  }

  return {
    state,
    tickRate,
    label: JSON.stringify(extractState(state))
  }
}

const classicMatchJoinAttempt = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: ClassicMatchState, presence: nkruntime.Presence, metadata: { [key: string]: any }): { state: ClassicMatchState, accept: boolean, rejectMessage?: string | undefined } | null {

  let isAccept = true
  const response = {
    state,
    accept: true,
    rejectMessage: ''
  }

  if (state.gameState === GameState.InProgress) {
    isAccept = false
    response.rejectMessage = 'match in progress'
  }

  if (Object.keys(state.players).length >= state.maxPlayers) {
    isAccept = false
    response.rejectMessage = 'full match'
  }

  response.accept = isAccept
  return response
}

const classicMatchJoin = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: ClassicMatchState, presences: nkruntime.Presence[]): { state: ClassicMatchState } | null {
  presences.forEach(function (presence) {
    let new_player: PlayerState = {
      presence,
      isReady: false,
      position: {
        x: Math.floor(Math.random() * 500),
        y: Math.floor(Math.random() * 500)
      }
    }
    state.players[presence.userId] = new_player
    state.playerCount++
  })

  if (state.playerCount === state.requiredPlayers) {
    state.gameState = GameState.WaitingForPlayersReady
  }

  // aviasr para player recem chegados se algum player já deu pronto
  Object.keys(state.players).forEach(function (key) {
    const player = state.players[key]

    if (player.isReady) {
      dispatcher.broadcastMessage(READY, JSON.stringify({ userId: player.presence.userId }), presences)
    }
  })

  const label = JSON.stringify(extractState(state))
  dispatcher.matchLabelUpdate(label)

  return {
    state
  }
}

const classicMatchLeave = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: ClassicMatchState, presences: nkruntime.Presence[]): { state: ClassicMatchState } | null {
  presences.forEach(function (presence) {
    delete (state.players[presence.userId])
    logger.debug('%q left Lobby match', presence.userId)
    state.playerCount--
    const label = JSON.stringify(extractState(state))
    dispatcher.matchLabelUpdate(label)
  })

  return {
    state
  }
}

const classicMatchLoop = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: ClassicMatchState, messages: nkruntime.MatchMessage[]): { state: ClassicMatchState } | null {

  if (state.playerCount === 0) {
    state.emptyTicks++
  } else {
    state.emptyTicks = 0
  }

  if (state.emptyTicks >= maxEmptyTicks) {
    return null
  }

  messages.forEach(function (message) {
    if (message.opCode === SEND_READY) {
      state.players[message.sender.userId].isReady = true
      dispatcher.broadcastMessage(READY, JSON.stringify({ userId: message.sender.userId }))
      const label = JSON.stringify(extractState(state))
      dispatcher.matchLabelUpdate(label)
    }

    if (message.opCode === SEND_POSITION_PLAYER) {
      dispatcher.broadcastMessage(POSITION_PLAYER, message.data)
    }
  })

  let allReady = true
  Object.keys(state.players).forEach(function (userId) {
    if (!state.players[userId].isReady) {
      allReady = false
    }
  })


  if (allReady && Object.keys(state.players).length >= state.requiredPlayers) {
    state.gameState = GameState.InProgress
    dispatcher.broadcastMessage(LETS_GO, JSON.stringify(extractPositionPlayers(state.players)))
  }

  return {
    state
  }
}

const classicMatchTerminate = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: ClassicMatchState, graceSeconds: number): { state: ClassicMatchState } | null {
  return {
    state
  }
}

const classicMatchSignal = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: ClassicMatchState, data: string): { state: ClassicMatchState, data?: string } | null {
  return {
    state
  }
}

const registerClassicMatch = function (initializer: nkruntime.Initializer) {
  initializer.registerMatch<ClassicMatchState>('ClassicMatchState', {
    matchInit: classicMatchInit,
    matchJoinAttempt: classicMatchJoinAttempt,
    matchJoin: classicMatchJoin,
    matchLeave: classicMatchLeave,
    matchLoop: classicMatchLoop,
    matchSignal: classicMatchSignal,
    matchTerminate: classicMatchTerminate
  })
}
