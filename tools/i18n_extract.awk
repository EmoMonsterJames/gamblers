# =====================================================================
# Extract every Korean string from the game's JS source for i18n/en.tsv.
#   LC_ALL=C gawk -f tools/i18n_extract.awk js/**/*.js
# Prints:  <file>\t<string>   (one line per string literal that has Hangul)
# Template literals: each ${…} becomes {0}, {1}, … — the game fills those in.
# A tiny JS lexer: skips comments and regex literals, and follows nested
# templates (`a ${b ? `c` : "d"} e`) so the inner strings come out too.
# =====================================================================
BEGIN { RS = "^$" }
function hangul(s) { return s ~ /\352[\260-\277]|[\353\354][\200-\277]|\355[\200-\236]/ }
function emit(s) { if (hangul(s)) { gsub(/\t/, "\\t", s); gsub(/\r?\n/, "\\n", s); print FILENAME "\t" s } }
{
    n = split($0, c, "")
    td = 0                     # template depth
    last = ""                  # last significant code char (regex vs divide)
    i = 1
    while (i <= n) {
        ch = c[i]
        if (td > 0 && !inExpr[td]) {               # ---- inside template text
            if (ch == "\\") { buf[td] = buf[td] ch c[i + 1]; i += 2; continue }
            if (ch == "`") { emit(buf[td]); td--; i++; last = "a"; continue }
            if (ch == "$" && c[i + 1] == "{") { inExpr[td] = 1; brace[td] = 0; i += 2; last = "("; continue }
            buf[td] = buf[td] ch; i++; continue
        }
        # ---- code
        if (ch == "/" && c[i + 1] == "/") { while (i <= n && c[i] != "\n") i++; continue }
        if (ch == "/" && c[i + 1] == "*") { i += 2; while (i < n && !(c[i] == "*" && c[i + 1] == "/")) i++; i += 2; continue }
        if (ch == "\"" || ch == "'") {
            q = ch; s = ""; i++
            while (i <= n && c[i] != q && c[i] != "\n") { if (c[i] == "\\") { s = s c[i] c[i + 1]; i += 2 } else { s = s c[i]; i++ } }
            i++; emit(s); last = "a"; continue
        }
        if (ch == "`") { td++; buf[td] = ""; ph[td] = 0; inExpr[td] = 0; i++; continue }
        if (ch == "/" && (last == "" || index("(,=:[!&|?{};+-*%<>~^", last) > 0)) {   # regex literal
            i++; cls = 0
            while (i <= n && c[i] != "\n") {
                if (c[i] == "\\") { i += 2; continue }
                if (c[i] == "[") cls = 1; else if (c[i] == "]") cls = 0; else if (c[i] == "/" && !cls) break
                i++
            }
            i++; last = "a"; continue
        }
        if (td > 0 && inExpr[td]) {
            if (ch == "{") brace[td]++
            else if (ch == "}") {
                if (brace[td] == 0) { inExpr[td] = 0; buf[td] = buf[td] "{" ph[td]++ "}"; i++; continue }
                brace[td]--
            }
        }
        if (ch !~ /[ \t\r\n]/) last = (ch ~ /[A-Za-z0-9_$)\]]/) ? "a" : ch
        i++
    }
}
