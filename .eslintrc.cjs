module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  parserOptions: { ecmaVersion: 2022 },
  rules: {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
};
