local sum = 1
for i = 2,10000 do
  if i % 7 ~= 0 then
    sum = sum + i
  end
end
