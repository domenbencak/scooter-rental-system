module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: [
    "application/**/*.js",
    "domain/**/*.js",
    "infrastructure/**/*.js",
    "interfaces/**/*.js"
  ]
};
