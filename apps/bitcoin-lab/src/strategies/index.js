import { donchian } from "./donchian.js";
import { pullbackBreakout } from "./pullback-breakout.js";

export const strategies = [pullbackBreakout, donchian];
export const strategyMap = Object.fromEntries(strategies.map((strategy) => [strategy.id, strategy]));
