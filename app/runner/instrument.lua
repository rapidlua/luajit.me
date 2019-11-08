local HUGE_VAL = 1000000000

local bc  = require('jit.bc')
local jutil = require('jit.util')
local jdump = require('jit.dump')
local cjson = require('cjson')

cjson.encode_empty_table_as_object(false)

local bcline, bctargets = bc.line, bc.targets
local funcinfo, funck = jutil.funcinfo, jutil.funck
local traceinfo, funcbc = jutil.traceinfo, jutil.funcbc
local gsub, fmt, gmatch = string.gsub, string.format, string.gmatch
local find, sub = string.find, string.sub
local insert, concat = table.insert, table.concat
local band, bnot = bit.band, bit.bnot

local function escapeluastr(s)
    return gsub(fmt('%q', s), '\n', 'n')
end

-- FUNC dissector

local _dissect
_dissect = function(func, fileindex, objects, M)
    local bc, bc_map = {}, {}
    local ktable,  gcktable = {}, {}
    local proto_id = #objects
    local info = funcinfo(func)
    M[info.proto or info.linedefined] = proto_id
    info.proto = nil; info.loc = nil; info.source = nil; info.currentline = nil
    objects[proto_id + 1] = {
        type      = "proto",
        bc        = bc,
        bcmap     = bc_map,
        ktable    = ktable,
        gcktable  = gcktable,
        info      = info,
        file      = fileindex
    }
    for i = 0,HUGE_VAL do
        local code = bcline(func, i)
        if not code then break end
        bc[i+1] = gsub(code, '%d+%s*(.*)\n', '%1') -- strip
        bc_map[i+1] = funcinfo(func,i).currentline
    end
    for i = 0, HUGE_VAL do
        local k = funck(func, i)
        if not k then break end
        ktable[i+1] = { type = type(k), value = k }
    end
    for i = -1,-HUGE_VAL,-1 do
        local k = funck(func, i)
        if not k then break end
        local t = type(k)
        local e = { type = t }
        if t == 'proto' then
            e.value = _dissect(k, fileindex, objects, M)
        elseif t == 'table' then
            local items = {}
            for k, v in pairs(k) do
                insert(items, { { type = type(k), value = k }, { type = type(v), value = v } })
            end
            e.value = items
        elseif t == 'string' then
            e.value = k
        else
            e.value = tostring(k)
        end
        gcktable[-i] = e
    end
    return proto_id
end
local function dissect(root, fileindex, objects)
    local M = {}
    _dissect(root, fileindex, objects, M)
    return M
end

local function upmap(func)
    local map = {}
    for i = 1,HUGE_VAL do
        local k, v = debug.getupvalue(func, i)
        if not k then break end
        map[k] = i
        map[i] = v
    end
    return map
end

local function split(str, pattern)
    pattern = pattern or '\n'
    local res, n, p = {}, 0, 0
    while true do
        local a, b = find(str, pattern, p + 1)
        if not a then
            res[n+1] = sub(str, p+1); break
        end
        res[n+1] = sub(str, p+1, a-1)
        n = n + 1
        p = b
    end
    return res
end

local __out__ = { __index = { flush = function() end, close = function() end } }

local function run_code(source, ...)
    local traces = {}
    local sourceid = '@<main.lua>'
    local objects = {{ type = "file", name = "main.lua" }}
    local result = {type = "response", objects = objects}
    local code, err = loadstring(source, sourceid)
    if not code then
        result.type = "response.error"
        result.description = err
        result.error = err
        return cjson.encode(result)
    end
    local M = dissect(code, 0, objects)
    local dump_texit, dump_record, dump_trace, fmterr
    local out = setmetatable({
        write = function(self, ...)
            local chunks = self.chunks
            if chunks then
                local n = #chunks
                for i = 1,select('#',...) do
                    chunks[n+i] = select(i, ...)
                end
            end
        end
    }, __out__)
    local t_by_tr = {}, {}
    local cur_trace, cur_trace_trace
    local function my_dump_trace(what, tr, func, pc, otr, oex)
        if     what == 'start' then
            local id = #objects
            cur_trace_trace = {}
            cur_trace = {
                type  = "trace",
                trace = cur_trace_trace,
                parent = t_by_tr[otr],
                parentexit = oex
            }
            objects[id + 1] = cur_trace
            t_by_tr[tr] = id
            dump_trace(what, tr, func, pc, otr, oex)
        elseif what == 'stop' then
            local info = traceinfo(tr)
            cur_trace.link = t_by_tr[info.link]
            info.link = nil
            cur_trace.info = info
            local chunks = {}; out.chunks = chunks
            dump_trace(what, tr, func, pc, otr, oex)
            out.chunks = nil
            local ir_and_asm = split(concat(chunks, ''), '---- TRACE %d[^\n]*\n')
            cur_trace.ir, cur_trace.asm = ir_and_asm[2], (gsub(ir_and_asm[3], "\t", "        "))
        elseif what == 'abort' then
            local info = traceinfo(tr)
            cur_trace.link = t_by_tr[info.link]
            info.link = nil
            cur_trace.info = info
            cur_trace.type = "trace.abort"
            cur_trace.reason = fmterr(otr, oex)
            dump_trace(what, tr, func, pc, otr, oex)
        elseif what == 'flush' then
            t_by_tr = {}
            insert(objects, { type = "jit.flush" })
            dump_trace(what, tr, func, pc, otr, oex)
        else
            dump_trace(what, tr, func, pc, otr, oex)
        end
    end
    local function my_dump_record(tr, func, pc, depth, callee)
        local info = funcinfo(func)
        local proto = M[info.proto or info.linedefined]
        if proto then
            insert(cur_trace_trace, { proto, pc })
            if band(funcbc(func, pc), 0xff) < 16 then -- ORDER BC
                insert(cur_trace_trace, { proto, pc + 1 })
                -- Write JMP for cond.
            end
        end
    end
    -- hack
    local io_open = io.open
    io.open = function() return out end
    jdump.on('tbimT', '')
    io.open = io_open
    local um = upmap(jdump.start)
    dump_texit = assert(um[um.dump_texit])
    dump_record = assert(um[um.dump_record])
    dump_trace = assert(um[um.dump_trace])
    um = upmap(dump_trace)
    fmterr = assert(um[um.fmterr])
    jit.attach(my_dump_trace, 'trace')
    jit.attach(my_dump_record, 'record')
    local starttime, ok, err = os.clock(), pcall(code, ...)
    result.runtime = os.clock() - starttime
    jdump.off()
    jit.attach(my_dump_trace)
    jit.attach(my_dump_record)
    if not ok then result.error = tostring(err) end
    return cjson.encode(result)
end

local function open_checked(filename, mode)
    local file, errmsg = io.open(filename, mode)
    if not file then
        io.stderr:write(errmsg..'\n')
        os.exit(-1)
    end
    return file
end

local parser = require('argparse')()
parser:argument('input', 'Source file to run', '-')
parser:option('-o', 'Output file')
local args = parser:parse()
local input = args.input == '-' and io.stdin or open_checked(args.input, 'r')
local output = not args.o and io.stdout or open_checked(args.o, 'w')

output:write(run_code(input:read('*a')))
