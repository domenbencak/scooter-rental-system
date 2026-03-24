function createLogger(scope) {
  function write(level, message, details = {}) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      ...details,
    };

    if (level === "error") {
      console.error(JSON.stringify(payload));
      return;
    }

    console.log(JSON.stringify(payload));
  }

  return {
    info(message, details) {
      write("info", message, details);
    },
    warn(message, details) {
      write("warn", message, details);
    },
    error(message, details) {
      write("error", message, details);
    },
  };
}

module.exports = {
  createLogger,
};
