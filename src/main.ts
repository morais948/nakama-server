const tickRate = 15
const maxEmptyTicks = 1000

let InitModule: nkruntime.InitModule = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    registerClassicMatch(initializer)
    initializer.registerRpc('create-match', rpcCreateMatch)
    initializer.registerRpc('get-state-match', rpcGetStateMatch)
    initializer.registerMatchmakerMatched(createMatch)
}
