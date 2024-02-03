module.exports = [
  {
    script: "dist/main.js",
    name: "app-fastify",
    exec_mode: "cluster",
    instances: 1,
    max_memory_restart: "256M",
  },
]
