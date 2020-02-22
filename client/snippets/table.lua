local m = {__index = function() return 1; end};
local t = setmetatable({a = 42},m);
local sum = 0;
for i = 1,10000 do
  sum = sum + (t.x or 0);
  m[-i] = i
end
