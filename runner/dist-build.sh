#! /bin/sh
set -euxo pipefail
LUAJIT=luajit-$(echo -n $REV | sed -e s/^v//)

cd /root/luajit
git checkout --detach $REV

# patch luajit Makefile: install to /usr
sed -i Makefile -e '/ PREFIX=/cexport PREFIX= /usr' \

# patch luajit Makefile: no static library; conditionally enable GC64 mode 
sed -i src/Makefile \
    -e "/^\s*BUILDMODE/c\BUILDMODE= dynamic" \
    -e "/-DLUAJIT_ENABLE_GC64/c\\$(test -n "${GC64:-}" && echo -n "XCFLAGS+= -DLUAJIT_ENABLE_GC64")" \

# luajit 
make
make install
DESTDIR=/root/dist make install
if [ "$REV" = "v2.0.4" ]; then
    ln -s libluajit-5.1.so.2.0.4 /usr/lib/libluajit-5.1.so.2
fi
if [ "$REV" = "v2.1.0-beta2" ]; then
    ln -s libluajit-5.1.so.2.1.0 /usr/lib/libluajit-5.1.so.2
fi

# luarocks
cd /root/luarocks
./configure --with-lua-interpreter=$LUAJIT --prefix=/usr
make && make install

# certain lua rocks use git:// URLs which are often blocked
git config --global url."https://".insteadOf git://

cd /
luarocks install lua-cjson
luarocks install luasocket
luarocks install luafilesystem
luarocks install lpeg
luarocks install fun
luarocks install argparse

(find /usr/share/lua /usr/lib/lua | cpio -p /root/dist)
rm -R /root/dist/usr/share/lua/*/luarocks

(echo "#!/usr/bin/${LUAJIT}" ; cat /root/instrument.lua) > /root/dist/usr/bin/instrument.lua

chmod +x /root/dist/usr/bin/instrument.lua
