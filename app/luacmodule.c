#include <lua.h>

static int luacfunc(lua_State *L)
{
    lua_pushinteger(L, 42);
    return 1;
}

int luaopen_luacmodule(lua_State *L)
{
    lua_newtable(L);
    lua_pushstring(L, "luacfunc");
    lua_pushcfunction(L, luacfunc);
    lua_settable(L, -3);
    return 1;
}
