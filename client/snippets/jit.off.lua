local jit = require('jit')
local function foo() return 42 end
jit.off(foo)

local sum = 0
for i = 1,1000 do
  sum = sum + i
  foo()
end
