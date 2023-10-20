enum GameState { WaitingForPlayers, WaitingForPlayersReady, InProgress }

interface LobbyMatchState extends nkruntime.MatchState {
    players: { [userId: string]: PlayerState }
    emptyTicks: number
    minPlayers: number
    maxPlayers: number
    requiredPlayers: number
    playerCount: number
    gameState: GameState
}

interface Position {
    x: number
    y: number
}
interface PlayerState {
    presence: nkruntime.Presence
    isReady: boolean
    position: Position
}

const tickRate = 15
const maxEmptyTicks = 1000

//codigos esperados do cliente
const SEND_POSITION_PLAYER = 1
const SEND_READY = 2

//codigos do servidor
const READY = 3
const LETS_GO = 4
const POSITION_PLAYER = 5

function extractState(state: LobbyMatchState){
    return {
        playerCount: state.playerCount,
        gameState: state.gameState,
        players: state.players
    }
}

function extractPositionPlayers(playerState: { [userId: string]: PlayerState }){
    const players_position: { [userId: string]: Position } = {} 
    
    for (const id in playerState) {
        players_position[id] = playerState[id].position
    }

    return players_position
}

const matchInit = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: { [key: string]: string }): { state: LobbyMatchState, tickRate: number, label: string } {
    
    const state: LobbyMatchState = {
        players: { }, 
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

const matchJoinAttempt = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: LobbyMatchState, presence: nkruntime.Presence, metadata: { [key: string]: any }): { state: LobbyMatchState, accept: boolean, rejectMessage?: string | undefined } | null {

    let isAccept = true

    if(Object.keys(state.players).length >= state.maxPlayers){
        isAccept = false
    }

    if(state.gameState === GameState.InProgress){
        isAccept = false
    }

    return {
        state,
        accept: isAccept //se o jogador vai poder ou não entrar na partida
    }
}

const matchJoin = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: LobbyMatchState, presences: nkruntime.Presence[]): { state: LobbyMatchState } | null {
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

const matchLeave = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: LobbyMatchState, presences: nkruntime.Presence[]): { state: LobbyMatchState } | null {
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

const matchLoop = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: LobbyMatchState, messages: nkruntime.MatchMessage[]): { state: LobbyMatchState } | null {

    //verificar se funciona
    if (state.playerCount === 0) {
        state.emptyTicks++
    } else {
        state.emptyTicks = 0
    }
    
    if (state.emptyTicks >= maxEmptyTicks) {
        return null
    }

    messages.forEach(function(message){
        if(message.opCode === SEND_READY){
            state.players[message.sender.userId].isReady = true
            dispatcher.broadcastMessage(READY, JSON.stringify({ userId: message.sender.userId }))
            const label = JSON.stringify(extractState(state))
            dispatcher.matchLabelUpdate(label)
        }

        if(message.opCode === SEND_POSITION_PLAYER){
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

const matchTerminate = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: LobbyMatchState, graceSeconds: number): { state: LobbyMatchState } | null {
    return {
        state
    }
}

const matchSignal = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: LobbyMatchState, data: string): { state: LobbyMatchState, data?: string } | null {
    return {
        state
    }
}


let InitModule: nkruntime.InitModule = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    initializer.registerMatch<LobbyMatchState>('LobbyMatchState', {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchSignal,
        matchTerminate
    })

    initializer.registerRpc('create-match', rpcCreateMatch)
    initializer.registerRpc('get-state-match', rpcGetStateMatch)
    initializer.registerMatchmakerMatched(createMatch)
}

function rpcCreateMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string | void {
    const matchId = nk.matchCreate('LobbyMatchState')

    return JSON.stringify({
        matchId
    })
}

function rpcGetStateMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string | void {
    const { matchId } = JSON.parse(payload)

    const match = nk.matchGet(matchId)
    return JSON.stringify(match)
}

function createMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: nkruntime.MatchmakerResult[]): string | void {
    try {
        const matchId = nk.matchCreate("LobbyMatchState")

        logger.debug('ID DA SALA', matchId)
     
        return matchId
      } catch (err: any) {
        logger.error(err)
        throw (err)
      }
}