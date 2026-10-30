set -e
S=${S:-/workspace/fantasy-bball}; B=${B:-/workspace/fantasy-bball-upload}
rm -rf "$B"; mkdir -p "$B/tools"
cd $S
for f in index.html setup.html join.html room.html recap.html league.html redraft.html time.html help.html mock.html manifest.webmanifest sw.js README.md LICENSE-third-party.txt; do cp "$f" "$B/"; done
for d in css js assets data icons; do cp -r "$d" "$B/"; done
cp tools/refresh_data.py tools/make_cheer.js "$B/tools/"
cd "$B"; find . -type f ! -name MD5SUMS.txt | sort | sed 's#^\./##' | xargs md5sum > MD5SUMS.txt
echo "files: $(wc -l < MD5SUMS.txt)"; du -sh .
