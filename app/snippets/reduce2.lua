local ffi = require("ffi")
local N = 300;
local data = ffi.new("int[?]", N);

local function reduce(func, data, from, to, sum)
  sum = sum or 0
  for i = from,to do
    sum = func(data[i], sum)
  end
  return sum
end

local function add(a, b) return a + b end
local function mul(a, b) return a * b end
local function bor(a, b) return bit.bor(a, b) end

local function test()
  for _ = 1, 1000 do
    reduce(add, data, 0, N - 1)
    reduce(mul, data, 0, N - 1, 1)
    reduce(bor, data, 0, N - 1)
  end
end

test()
