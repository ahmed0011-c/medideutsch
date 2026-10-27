export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleNotIdentity<T>(arr: T[], seed: number): T[] {
  let a = seededShuffle(arr, seed);
  let k = 1;
  while (a.every((v, i) => v === arr[i]) && k < 20) a = seededShuffle(arr, seed + k++);
  return a;
}
