export default {
  '*.{ts,tsx}': [() => 'pnpm typecheck', 'eslint --fix', 'prettier --write'],
  '*.{js,mjs,cjs,json,css,html,md,yml,yaml}': ['prettier --write'],
};
