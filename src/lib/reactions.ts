export const REACTIONS = {
  love: "😍",
  like: "🙂",
  meh: "😐",
} as const;

export type Reaction = keyof typeof REACTIONS;

export function isReaction(value: string): value is Reaction {
  return value in REACTIONS;
}
