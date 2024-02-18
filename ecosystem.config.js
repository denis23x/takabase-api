module.exports = [
  {
    script: "dist/main.js",
    name: "app-takabase-api",
    exec_mode: "cluster",
    instances: 4,
    max_memory_restart: "256M",
  },
]
