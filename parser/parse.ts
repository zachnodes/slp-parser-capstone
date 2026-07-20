import path from 'path';
import fs from 'fs';
import { SlippiGame } from '@slippi/slippi-js/node';

const filePath = path.join(__dirname, 'test-replays', 'Game_20260701T025227.slp');
const gamer = new SlippiGame(filePath)
const settings = gamer.getSettings()

console.log(gamer.getFrames()[0].players)
export type TrimmedPlayer = {
  x: number;
  y: number;
  characterId: number;
  displayName: string;
  facingDirection: number;
  actionStateId: number;
  actionStateCounter: number;
  percent: number;
  stocksRemaining: number;
} | null;

export type TrimmedFrame = {
  frame: number;
  players: TrimmedPlayer[];
};

export const getTrimmedFrames = (filePath: string ): TrimmedFrame[] => {
  
  const game = new SlippiGame(filePath);
  const frames = game.getFrames();
  const settings = game.getSettings();
  if (!settings) {
    throw new Error('Couldnt read settings')
  }

  return Object.keys(frames)
  .map(Number) // Turn each key into num e.g '1' -> 1
  .sort((a, b) => a - b) // Sort in ascending order
  .map((frameNum) => {
    // Extract data from each frame
    const frame = frames[frameNum];
    return {
      frame: frameNum,
      players: Object.values(frame.players).map((p): TrimmedPlayer => {
        if (!p || !p.post) return null;
        return {
          x: p.post.positionX ?? 0,
          y: p.post.positionY ?? 0,
          characterId:
            p.post.playerIndex === 0
              ? settings.players[0].characterId ?? -1
              : settings.players[1].characterId ?? -1, 
          displayName:
            p.post.playerIndex === 0
              ? settings.players[0].displayName
              : settings.players[1].displayName,
          facingDirection: p.post.facingDirection ?? 1,
          actionStateId: p.post.actionStateId ?? 0,
          actionStateCounter: p.post.actionStateCounter ?? 0,
          percent: p.post.percent ?? 0,
          stocksRemaining: p.post.stocksRemaining ?? 0,
        };
      }),
    };
  });
}