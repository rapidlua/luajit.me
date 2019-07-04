local function sumrec(limit, i, partial)
  if i >= limit then return partial; end
  return sumrec(limit, i+1, partial+i)
end
sumrec(10000, 1, 0)
