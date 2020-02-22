let engines = [
  {
    name: "LuaJIT",
    versions: [
      { id: "luajit-2.0.4",            name: "2.0.4" },
      { id: "luajit-2.1.0-beta2",      name: "2.1.0 β2" },
      { id: "luajit-2.1.0-beta3",      name: "2.1.0 β3" },
      { id: "luajit-2.1.0-beta3-gc64", name: "2.1.0 β3 gc64" },
    ]
  }
];

let targets = {};
engines.forEach(engine => engine.versions.forEach(ver => (
  targets[ver.id] = Object.assign({}, ver, {name: engine.name + ' ' + ver.name}))
));

module.exports = {
  engines: engines,
  targets: targets,
  defaultTargetID: "luajit-2.1.0-beta3-gc64"
};
