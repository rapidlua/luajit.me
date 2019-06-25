# luajit-web-inspector
A power tool to peek into LuaJIT internals, primarily for educational purposes and for talks on stage

### Features
 1. execute arbitrary Lua code and see what happens
 1. several snippets showcasing interesting quirks of LuaJIT are readily available
 1. upload and study `jit.dump` output **[TBD]**
 1. explore bytecode behind the source code in several modes
    * *Lua* — bytecodes are hidden, revealed on click on a source line
    * *Bytecode* — only bytecode is displayed
    * *Mixed* — bytecodes interleaved with Lua source code
 1. browse generated JIT-compiled traces
    * visually examine trace graph
    * highligh source code lines and/or bytecodes participating in a trace
 1. examine trace properties, including general info, IR and the assembly
 1. *Presentation Mode* — hit **P** to reduce visual clutter; suitable for presenting after a moderate zoom

### Install

Install `luajit` first.

In the root of the source tree, invoke `npm install` to install JavaScript dependencies and prepare code for running.

To start the server, do `npm start`.

### Gallery

![alt tag](https://raw.githubusercontent.com/mejedi/luajit-web-inspector/master/ljwebi1.png)

![alt tag](https://raw.githubusercontent.com/mejedi/luajit-web-inspector/master/ljwebi2.png)
