import { getTrimmedFrames, TrimmedFrame, TrimmedPlayer } from "./parse";
import { animationNameByActionId } from "./viewer/src/animations/actions";
import { captainFalcon } from "./viewer/src/characters/captainFalcon";
import { fox } from "./viewer/src/characters/fox";
import path from 'path';
import AdmZip from "adm-zip";
import fs from 'fs';

const characterZipUrlByExternalId = [
"viewer/src/animations/zips/captainFalcon.zip",
"viewer/src/animations/zips/donkeyKong.zip",
"viewer/src/animations/zips/fox.zip",
"viewer/src/animations/zips/mrGameAndWatch.zip",
"viewer/src/animations/zips/kirby.zip",
"viewer/src/animations/zips/bowser.zip",
"viewer/src/animations/zips/link.zip",
"viewer/src/animations/zips/luigi.zip",
"viewer/src/animations/zips/mario.zip",
"viewer/src/animations/zips/marth.zip",
"viewer/src/animations/zips/mewtwo.zip",
"viewer/src/animations/zips/ness.zip",
"viewer/src/animations/zips/peach.zip",
"viewer/src/animations/zips/pikachu.zip",
"viewer/src/animations/zips/iceClimbers.zip",
"viewer/src/animations/zips/jigglypuff.zip",
"viewer/src/animations/zips/samus.zip",
"viewer/src/animations/zips/yoshi.zip",
"viewer/src/animations/zips/zelda.zip",
"viewer/src/animations/zips/sheik.zip",
"viewer/src/animations/zips/falco.zip",
"viewer/src/animations/zips/youngLink.zip",
"viewer/src/animations/zips/doctorMario.zip",
"viewer/src/animations/zips/roy.zip",
"viewer/src/animations/zips/pichu.zip",
"viewer/src/animations/zips/ganondorf.zip",
];

type ResolvedPlayer = {
  x: number;
  y: number;
  facingDirection: number;
  percent: number;
  stocksRemaining: number;
  pathString: string | null;
};

type ResolvedFrame = {
  frame: number;
  players: ResolvedPlayer[];
};

const loadAnimations = (zip: AdmZip): Record<string, string[]> => {
    const animations: Record<string, string[]> = {};
    for (const entry of zip.getEntries()) {
        if (!entry.entryName.endsWith('.json')) continue;
        const name = entry.entryName.replace('.json', '')
        animations[name] = JSON.parse(entry.getData().toString('utf8'))
    }

    return animations;
}

function resolveAnimationName(
  animationMap: Map<string, string>,
  specialsMap: Map<number, string>,
  actionStateId: number,
  genericName: string | undefined
): string | null {
  if (specialsMap.has(actionStateId)) {
    return specialsMap.get(actionStateId)!;
  }
  if (genericName === undefined) return null;

  const mapped = animationMap.get(genericName);
  if (mapped === undefined) return genericName;
  if (mapped === '') return null;
  return mapped;
}

function getPathString(
  animations: Record<string, string[]>,
  animationName: string | null,
  actionStateCounter: number
): string | null {
  if (!animationName) return null;

  const frames = animations[animationName];
  if (!frames || frames.length === 0) return null;

  let index = Math.floor(actionStateCounter);
  index = ((index % frames.length) + frames.length) % frames.length; // safe wrap

  return frames[index];
}

const fp = path.join(__dirname, 'test-replays', 'Game_20260719T030048.slp');

const trimmedFrames: TrimmedFrame[] = getTrimmedFrames(fp);

const p1: number = trimmedFrames[0].players[0]!.characterId;
const p2: number = trimmedFrames[0].players[1]!.characterId;

const zippedAnimationsP1 = new AdmZip(path.join(__dirname, characterZipUrlByExternalId[p1]));
const zippedAnimationsP2 = new AdmZip(path.join(__dirname, characterZipUrlByExternalId[p2]));

const animationsP1 = loadAnimations(zippedAnimationsP1);
const animationsP2 = loadAnimations(zippedAnimationsP2);

const resolvedFrames: ResolvedFrame[] = [];

for (const frame of trimmedFrames) {

    const player1 = frame.players[0];
    const player2 = frame.players[1];

    const player1GenericAnimation = animationNameByActionId[player1!.actionStateId];
    const player1AnimationName = resolveAnimationName(
    captainFalcon.animationMap,
    captainFalcon.specialsMap,
    player1!.actionStateId,
    player1GenericAnimation
    );

    const player2GenericAnimation = animationNameByActionId[player2!.actionStateId];
    const player2AnimationName = resolveAnimationName(
        fox.animationMap,
        fox.specialsMap,
        player2!.actionStateId,
        player2GenericAnimation
    )
    
    const player1PathString = getPathString(animationsP1, player1AnimationName, player1!.actionStateCounter);
    const player2PathString = getPathString(animationsP2, player2AnimationName, player2!.actionStateCounter);
    
    resolvedFrames.push({
    frame: frame.frame,
    players: [
      {
        x: player1!.x,
        y: player1!.y,
        facingDirection: player1!.facingDirection,
        percent: player1!.percent,
        stocksRemaining: player1!.stocksRemaining,
        pathString: player1PathString,
      },
      {
        x: player2!.x,
        y: player2!.y,
        facingDirection: player2!.facingDirection,
        percent: player2!.percent,
        stocksRemaining: player2!.stocksRemaining,
        pathString: player2PathString,
      },
    ],
  });
};

fs.writeFileSync(
  path.join(__dirname, 'resolved-output.json'),
  JSON.stringify(resolvedFrames)
);

