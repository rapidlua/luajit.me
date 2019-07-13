local function f()
  local sum = 1
  for i = 2,10000 do
    sum = sum + i
  end
end

local function f2()
  local sum = 1
  for i = 2,10000 do
    if i % 7 ~= 0 then
      sum = sum + i
    end
  end
end

local function w()
  local sum = 1
  local i = 2
  while i <= 10000 do
    sum = sum + i;
    i = i+1
  end
end

local function r()
  local sum = 1
  local i = 2
  repeat
    sum = sum + i;
    i = i+1
  until i > 10000
end

f(); f2(); w(); r()

