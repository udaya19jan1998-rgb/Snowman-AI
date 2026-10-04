function dimension(value, fallback) {
  const number = value == null ? fallback : Number(value);
  if (!Number.isInteger(number) || number < 64 || number > 2048 || number % 16 !== 0) {
    throw new Error('Image dimensions must be multiples of 16 between 64 and 2048.');
  }
  return number;
}
export function imageArgs({
  model,
  prompt,
  size,
  width = 448,
  height = 448,
  steps = 3,
  negative = ''
}) {
  const count = Number(steps);
  if (!Number.isInteger(count) || count < 0 || count > 100) throw new Error('Image steps must be between 0 and 100.');
  const args = ['run', model, '--width', String(dimension(size?.width, width)), '--height', String(dimension(size?.height, height)), '--steps', String(count)];
  if (negative) args.push('--negative', negative);
  args.push('--', String(prompt).trim());
  return args;
}
