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
_dissect = function(func, res, M)
    local bc, bc_map = {}, {}
    local k_number, k_gc = {}, {}
    local proto_id = #res
    local info = funcinfo(func)
    M[info.proto or info.linedefined] = proto_id
    res[proto_id + 1] = {
        bc        = bc,
        bcmap     = bc_map,
        consts    = k_number,
        gcconsts  = k_gc,
        info      = info
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
        k_number[i+1] = k
    end
    for i = -1,-HUGE_VAL,-1 do
        local k = funck(func, i)
        if not k then break end
        local t = type(k)
        if t == 'proto' then
            k_gc[bnot(i)+1] = _dissect(k, res, M)
        elseif t == 'table' then
            local items = {}
            for k, v in pairs(k) do
                if type(k) == 'string' then k = escapeluastr(k) end
                if type(v) == 'string' then v = escapeluastr(v) end
                insert(items, fmt('[%s] = %s', k, v))
            end
            k_gc[bnot(i)+1] = '{'..concat(items, ', ')..'}'
        elseif t == 'string' then
            k_gc[bnot(i)+1] = escapeluastr(k)
        else
            k_gc[bnot(i)+1] = tostring(k)
        end
    end
    info.proto = nil
    return 'P'..proto_id
end
local function dissect(root)
    local res, M = {}, {}
    _dissect(root, res, M)
    return res, M
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

local function moveparent(trace, info)
  info.parent = trace.parent
  trace.parent = nil
  info.parentexit = trace.parentexit
  trace.parentexit = nil
end

local function run_code(source, ...)
    local traces = {}
    local sourceid = '@<source>'
    local result, M = {sourcefiles = {[sourceid]=source}, traces = traces}
    local code, err = loadstring(source, sourceid)
    if not code then
        result.error = err; return cjson.encode(result)
    end
    result.prototypes, M = dissect(code)
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
    local t_by_tr = {}
    local cur_trace, cur_trace_trace
    local function my_dump_trace(what, tr, func, pc, otr, oex)
        if     what == 'start' then
            local id = #traces
            cur_trace_trace = {}
            cur_trace = {
                trace = cur_trace_trace,
                parent = t_by_tr[otr],
                parentexit = oex
            }
            traces[id+1] = cur_trace 
            t_by_tr[tr] = id
            dump_trace(what, tr, func, pc, otr, oex)
        elseif what == 'stop' then
            local info = traceinfo(tr)
            info.link = t_by_tr[info.link]
            moveparent(cur_trace, info)
            cur_trace.info = info
            local chunks = {}; out.chunks = chunks
            dump_trace(what, tr, func, pc, otr, oex)
            out.chunks = nil
            local ir_and_asm = split(concat(chunks, ''), '---- TRACE %d[^\n]*\n')
            cur_trace.ir, cur_trace.asm = ir_and_asm[2], (gsub(ir_and_asm[3], "\t", "        "))
        elseif what == 'abort' then
            local info = traceinfo(tr)
            info.link = nil
            info.error = fmterr(otr, oex)
            moveparent(cur_trace, info)
            cur_trace.info = info
            dump_trace(what, tr, func, pc, otr, oex)
        elseif what == 'flush' then
            t_by_tr = {}
            dump_trace(what, tr, func, pc, otr, oex)
        else
            dump_trace(what, tr, func, pc, otr, oex)
        end
    end
    local function my_dump_record(tr, func, pc, depth, callee)
        local nexti = #cur_trace_trace + 1
        local info = funcinfo(func)
        local proto = M[info.proto or info.linedefined]
        if proto then
            cur_trace_trace[nexti] = fmt('BC%s:%d', proto, pc) -- proto:bc (Bytecode Ref)
            if band(funcbc(func, pc), 0xff) < 16 then -- ORDER BC
                cur_trace_trace[nexti+1] = fmt('BC%d:%d', proto, pc+1, depth)
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
