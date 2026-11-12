// type_777.jsx - STYLE 777 type family (needs lib_777.jsx). Frames are comp frames. No easing on type (house 777 rule)
// except the 3 f smear-in. Never show a word before it is said.
// ty_777_01 decode, _02 decode-to-font lock, _03 font-cycle slam, _04 scramble wordmark, _05 static word in CRT, _06 echo/glow dup,
// _07 doubled slice hit, _08 smear-in, _09 caption stack, _10 micro, _11 credits, _12 syllables, _13 letter-per-hit,
// _14 defocus flicker, _15 terminal, _16 Difference roto word, _17 giant + micro, _18 ghost signature, _19 found-letter spell. t420 lock cut.
var TY7_GLYPHS = "0123456789ABCDEFHKLMNRSTVXZ#&%?";
var TY7_FONTS = [["Impact", 1.0], ["SixCaps", 2.2], ["Anton-Regular", 1.0], ["DINCondensed-Bold", 1.25], ["Arial-Black", 0.8], ["BebasNeue-Bold", 1.25], ["BodoniSvtyTwoITCTT-Bold", 1.05], ["Helvetica-Bold", 0.95]];
// tick schedule for a decode: every 2-3 f, then 1-2-3-4 decelerating gaps, last tick ON the lock frame
function ty777Ticks(f0, lock) {
    var t = [], f = f0, alt = 0, tail = [4, 3, 2, 1], tl = 10; // last 10 f = 1+2+3+4
    while (f < lock - tl) { t.push(f); f += (alt++ % 2) ? 3 : 2; }
    f = lock - tl; t.push(f); for (var i = tail.length - 1; i >= 0; i--) { f += tail[i]; t.push(f); }
    return t;
}
// ty_777_01: decode from zeros: Source Text expression; locks = per-char lock frame offsets (relative to in point); refresh 2 f
function ty777Decode(L, word, locks, o) {
    o = o || {}; var ls = "[" + locks.join(",") + "]";
    L.property("ADBE Text Properties").property("ADBE Text Document").expression =
        'var T=' + JSON_str7(word) + ', L=' + ls + ', G="' + TY7_GLYPHS + '", f=timeToFrames(time-inPoint), s="";' +
        'for(var i=0;i<T.length;i++){ var ch=T.charAt(i); if(ch==" "||f>=L[Math.min(i,L.length-1)]){s+=ch;continue;} ' +
        'seedRandom(i*97+Math.floor(f/' + (o.refresh || 2) + '),true); s+=(f<' + (o.zeros != null ? o.zeros : 6) + ')?"0":G.charAt(Math.floor(random(G.length))); } s;';
    return L;
}
function JSON_str7(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
// even lock order left > right over n frames (or a custom order array of char indices)
function ty777Locks(word, start, n, order) {
    var k = word.length, out = [], i; for (i = 0; i < k; i++) out.push(0);
    var ord = order || []; if (!order) for (i = 0; i < k; i++) ord.push(i);
    for (i = 0; i < ord.length; i++) out[ord[i]] = start + Math.round(n * (i + 1) / ord.length);
    return out;
}
// ty_777_02: decode-to-font lock: one layer per char, Source Text hold keys every frame (random glyph + font) until its lock
function ty777DecodeFont(c, word, f0, locks, o) {
    o = o || {}; var size = o.size || c.width * 0.42, gap = o.gap || size * 0.62, y = o.y || c.height / 2, out = [], seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var ci = 0; ci < word.length; ci++) {
        var x = c.width / 2 + (ci - (word.length - 1) / 2) * gap;
        var T = txt7(c, word.charAt(ci), { font: TY7_FONTS[0][0], size: size, x: x, y: y }); io7(T, c, f0, o.end || null); T.name = "TXT_DECODEFONT_" + ci;
        for (var f = f0; f <= locks[ci]; f++) {
            if (f < locks[ci]) { var fi = Math.floor(rnd() * TY7_FONTS.length); tkey7(T, c, f, TY7_GLYPHS.charAt(Math.floor(rnd() * TY7_GLYPHS.length)), TY7_FONTS[fi][0], size * TY7_FONTS[fi][1], [1, 1, 1]); }
            else tkey7(T, c, f, word.charAt(ci), o.final || "Didot-Bold", size * 1.05, o.accent || hx7("#E0202A"));
        }
        out.push(T);
    }
    return out;
}
// ty_777_03: font-cycle slam (43600 schedule) from f0; exit slice at f0+12
function ty777FontCycle(c, word, f0, o) {
    o = o || {}; var W = c.width, H = c.height, y = o.y || H / 2;
    var T = txt7(c, word, { font: "CutiveMono-Regular", size: W * 0.11, col: [0, 0, 0], x: W / 2, y: y }); T.name = "TXT_FONTCYCLE"; io7(T, c, f0, f0 + 12);
    var plate = sol7(c, hx7("#8C8C8E"), "FX_CYCLE_GREY", f0, f0 + 2, Math.round(W * 0.7), Math.round(W * 0.16)); tr7(plate, "p").setValue([W / 2, y]); plate.moveAfter(T);
    var sc = tr7(T, "s"), sch = [
        [0, "CutiveMono-Regular", 0.11, 100, 100, [0, 0, 0]], [2, " ", 0.11, 100, 100, [1, 1, 1]], [3, "Anton-Regular", 0.36, 100, 100, [1, 1, 1]],
        [4, "SixCaps", 0.9, 45, 140, [1, 1, 1]], [5, " ", 0.9, 45, 140, [1, 1, 1]], [6, "SixCaps", 0.9, 45, 140, [1, 1, 1]], [9, "SixCaps", 0.9, 45, 140, hx7("#8C8C8C")]];
    var sp = [];
    for (var i = 0; i < sch.length; i++) { var s = sch[i]; tkey7(T, c, f0 + s[0], s[1] == " " ? " " : word, s[1] == " " ? null : s[1], W * s[2], s[5]); sp.push([f0 + s[0], [s[3], s[4]]]); }
    hold7(sc, c, sp);
    // keep the anchor centred on every swap
    T.property("ADBE Transform Group").property("ADBE Anchor Point").expression = "var r=sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2]";
    // noise texture on the last swap
    var nz = sol7(c, [0.5, 0.5, 0.5], "FX_CYCLE_NOISE", f0 + 9, f0 + 12); fx7(nz, "ADBE Fractal Noise", { 4: 220 }); nz.moveAfter(T); matte7(nz, T.duplicate(), TrackMatteType.ALPHA);
    // exit slice on the hit (3 bands offset 1 f)
    var sl = ty777Slice(c, T, f0 + 12, 2, [-W * 0.08, W * 0.06, -W * 0.03]);
    return T;
}
// slice: n bands of a text layer offset sideways for `len` frames at f
function ty777Slice(c, T, f, len, offs) {
    var out = [], r = T.sourceRectAtTime(f7(c, f - 1), false), bh = r.height / offs.length;
    for (var i = 0; i < offs.length; i++) {
        var D = T.duplicate(); D.name = "TXT_SLICE" + i; io7(D, c, f, f + len);
        rmask7(D, r.left - 2000, r.top + i * bh, r.width + 4000, bh); var p = tr7(D, "p").value; tr7(D, "p").setValue([p[0] + offs[i], p[1]]); out.push(D);
    }
    return out;
}
// ty_777_04: glyph-scramble wordmark at 9 fps, settles left > right; settle = per-char frames relative to in point
function ty777Scramble(L, word, settle) {
    L.property("ADBE Text Properties").property("ADBE Text Document").expression =
        'var T=' + JSON_str7(word) + ', S=[' + settle.join(",") + '], G="abcdefghijklmnopqrstuvwxyz0123456789", f=timeToFrames(time-inPoint), q=Math.floor((time-inPoint)*9), s="";' +
        'for(var i=0;i<T.length;i++){ var ch=T.charAt(i); if(ch==" "||f>=S[i]){s+=ch;continue;} seedRandom(i*31+q,true); s+=G.charAt(Math.floor(random(G.length))); } s;';
    return L;
}
// ty_777_05: static-filled words inside a CRT precomp: words [[f0, f1, text]], interrupts = frames of 1 f blown screen. o.fillLayer = time-offset copy of B (idea 8)
function ty777StaticWord(c, words, interrupts, o) {
    o = o || {}; var W = c.width, H = c.height;
    var L = pc7(c, "CRT_WORDS", W, H, function (cc) {
        var N = sol7(cc, [0.5, 0.5, 0.5], "FX_STATIC", 0, null); var nz = fx7(N, "ADBE Fractal Noise", { 1: 1, 2: 1, 4: 300, 10: 6 }); try { nz.property(24).expression = "time*2000"; } catch (e) {}
        fx7(N, "ADBE Venetian Blinds", { 1: 30, 2: 0, 3: 4 });
        if (o.fill) { var F = o.fill(cc); F.moveToBeginning(); }
        var base = o.fill ? cc.layer(1) : N;
        for (var i = 0; i < words.length; i++) {
            var w = words[i], T = txt7(cc, w[2], { font: o.font || "Impact", size: Math.min(H * 0.32, W * 2.2 / Math.max(1, w[2].length)), x: W / 2, y: H / 2 }); tr7(T, "s").setValue([o.sx || 70, 160]); io7(T, cc, w[0], w[1]);
            var Nd = base.duplicate(); io7(Nd, cc, w[0], w[1]); Nd.moveAfter(T); matte7(Nd, T, TrackMatteType.ALPHA);
        }
        N.enabled = false; if (o.fill) base.enabled = false;
        for (var j = 0; j < interrupts.length; j++) { var X = sol7(cc, hx7("#DCE6F0"), "FX_BLOWN", interrupts[j], interrupts[j] + 1); }
    });
    fx7(L, "CC Lens", { 2: 140, 3: 92 }); fx7(L, "PC_ChromaticAberration", { 14: 150 });
    return L;
}
// ty_777_06: font echo: the same word 1 f in a second face at 45 % beside it (o.hold = frames, o.glow = glowing duplicate)
function ty777Echo(c, T, f, o) {
    o = o || {}; var D = T.duplicate(); D.name = "TXT_ECHO_f" + f; io7(D, c, f, f + (o.hold || 1));
    var td = D.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value; try { d.font = o.font || "EBGaramond-Regular"; } catch (e) {} td.setValue(d);
    var s = tr7(T, "s").value; tr7(D, "s").setValue([s[0] * 0.45, s[1] * 0.45]); var p = tr7(T, "p").value; tr7(D, "p").setValue([p[0] + (o.dx || c.width * 0.24), p[1] + (o.dy || c.width * 0.055)]);
    if (o.glow) { fx7(D, "ADBE Box Blur2", { 1: 2 }); safeGlow(D, { thr: 60, rad: 20, inten: 0.8 }); tr7(D, "o").setValue(70); }
    return D;
}
// ty_777_07: doubled Difference hit + slice hits on frames
function ty777DoubleHit(c, T, frames, sliceFrames) {
    var out = [];
    for (var i = 0; i < frames.length; i++) { var D = T.duplicate(); D.name = "TXT_DOUBLE_f" + frames[i]; io7(D, c, frames[i], frames[i] + 1); var p = tr7(T, "p").value; tr7(D, "p").setValue([p[0] + 12 * c.width / 1080, p[1] - 6 * c.width / 1080]); D.blendingMode = BlendingMode.DIFFERENCE; out.push(D); }
    for (i = 0; i < (sliceFrames || []).length; i++) ty777Slice(c, T, sliceFrames[i], 1, [-c.width * 0.05, c.width * 0.04, -c.width * 0.02]);
    return out;
}
// ty_777_08: smear-in title: Transform Scale W 300 > 100 + Directional Blur 120 > 0 over 3 f, red glow on landing
function ty777SmearIn(c, T, f) {
    var g = fx7(T, "ADBE Geometry2", { 3: 0 }); keys7(g.property(5), c, [[f, 300], [f + 3, 100]], [10, 90]);
    var d = fx7(T, "ADBE Motion Blur", { 1: 90 }); keys7(d.property(2), c, [[f, 120 * c.width / 1080], [f + 3, 0]], [10, 90]);
    io7(T, c, f, null); return T;
}
// ty_777_09: naive caption stack: words [[frame, text, isKey]], x = left edge, y0 top, clear at endF
function ty777CaptionStack(c, words, endF, o) {
    o = o || {}; var size = o.size || c.height * 0.03, x = o.x || c.width * 0.08, y = o.y || c.height * 0.3, out = [];
    for (var i = 0; i < words.length; i++) {
        var k = words[i][2], T = txt7(c, words[i][1], { font: "Helvetica-Bold", size: k ? size * 2 : size, col: k ? hx7("#E0202A") : [1, 1, 1], x: x, y: y, just: 1 });
        io7(T, c, words[i][0], endF); y += (k ? size * 2 : size) * 1.08; out.push(T);
    }
    return out;
}
// ty_777_10: micro caption (1-3 f)
function ty777Micro(c, s, f, n, o) { o = o || {}; var T = txt7(c, s, { font: "Helvetica-Bold", size: o.size || c.height * 0.014, col: [1, 1, 1], track: 300, x: o.x || c.width / 2, y: o.y || c.height / 2 }); io7(T, c, f, f + (n || 2)); tr7(T, "o").setValue(85); return T; }
// ty_777_11: tiny credits (2 lines white + 1 line Arial Italic royal blue)
function ty777Credits(c, lines, f, n, o) {
    o = o || {}; var y = o.y || c.height / 2 - c.height * 0.012, out = [];
    for (var i = 0; i < lines.length; i++) { var blue = i == lines.length - 1 && o.blue !== false, sz = o.size || c.height * 0.011; var T = txt7(c, lines[i], { font: blue ? "Arial-ItalicMT" : "ArialMT", size: sz, col: blue ? hx7("#3A3ACF") : [1, 1, 1], y: y + i * sz * 1.5 }); io7(T, c, f, f + n); out.push(T); }
    return out;
}
// ty_777_12: stacked syllables on grid paper (sylls array) appear one per `step` frames; serif = 1 letter per frame red w/ shadow
function ty777Syllables(c, sylls, f0, step, o) {
    o = o || {}; var W = c.width, H = c.height, out = [];
    if (o.grid) { var G = sol7(c, hx7("#E9E7E1"), "IMG_GRIDPAPER", f0, o.end, Math.round(W * 0.46), Math.round(H * 0.5)); tr7(G, "p").setValue([W * 0.7, H / 2]); fx7(G, "ADBE Grid", { 2: 2, 4: 24 * W / 1080, 6: 1.2, 12: hx7("#8FB4D9"), 13: 60, 14: 2 }); }
    if (o.serif) {
        var T = txt7(c, sylls[0].charAt(0), { font: "Didot-Bold", size: H * 0.12, col: hx7("#C0141C"), x: W / 2, y: H / 2, just: 1 }); tr7(T, "p").setValue([W * 0.12, H / 2]);
        fx7(T, "ADBE Drop Shadow", { 2: 180, 4: 8 * W / 1080, 5: 6 }); io7(T, c, f0, o.end);
        var word = sylls.join(""); for (var i = 1; i <= word.length; i++) tkey7(T, c, f0 + i - 1, word.substr(0, i));
        return [T];
    }
    var y = H / 2 - (sylls.length - 1) * H * 0.045;
    for (var j = 0; j < sylls.length; j++) { var S = txt7(c, sylls[j] + (j < sylls.length - 1 ? " ---" : ""), { font: "Helvetica-Bold", size: H * 0.05, col: [0.05, 0.05, 0.07], x: W * 0.5, y: y + j * H * 0.09, just: 1 }); io7(S, c, f0 + j * step, o.end); out.push(S); }
    return out;
}
// ty_777_13: letter-per-hit chrome title over skewed B&W panels: hits = frames; panels = footage layers (one per hit)
function ty777LetterHits(c, word, hits, panels, o) {
    o = o || {}; var W = c.width, H = c.height, size = o.size || W * 0.24, gap = size * 0.68, out = [];
    for (var i = 0; i < word.length; i++) {
        if (panels && panels[i]) { var P = panels[i]; io7(P, c, hits[i], o.end); var sk = fx7(P, "ADBE Geometry2", { 6: (i % 2 ? -12 : 10), 7: 90 }); }
        var x = W / 2 + (i - (word.length - 1) / 2) * gap, T = txt7(c, word.charAt(i), { font: "Didot-Bold", size: size, x: x, y: o.y || H * 0.5 });
        fx7(T, "ADBE Ramp", { 1: [0, H * 0.45], 2: hx7("#F4F4F6"), 3: [0, H * 0.55], 4: hx7("#5A5A62") }); fx7(T, "ADBE Bevel Alpha", { 1: 3, 4: 0.7 });
        io7(T, c, hits[i] + (i % 2), o.end); out.push(T);
    }
    return out;
}
// ty_777_14: defocus flicker line: blur 0/12 alternating every `step` frames
function ty777DefocusFlicker(c, s, f0, n, o) {
    o = o || {}; var T = txt7(c, s, { font: "Helvetica-Bold", size: c.height * 0.022, col: hx7("#E0202A"), y: o.y || c.height * 0.62 }); io7(T, c, f0, f0 + n);
    var e = fx7(T, "ADBE Camera Lens Blur", {}), pairs = [], st = o.step || [1, 2, 1, 1, 2]; var f = f0, k = 0;
    while (f < f0 + n) { pairs.push([f, (k % 2) ? 0 : 12 * c.width / 1080]); f += st[k % st.length]; k++; }
    hold7(e.property(1), c, pairs); return T;
}
// ty_777_15: CRT terminal typing with cursor; footage ghost in the screen (o.ghost layer)
function ty777Terminal(c, s, f0, n, o) {
    o = o || {}; var W = c.width, H = c.height;
    var L = pc7(c, "TERMINAL", W, H, function (cc) {
        sol7(cc, hx7("#04070A"), "IMG_SCREEN", 0, null);
        if (o.ghost) { var G = o.ghost(cc); G.blendingMode = BlendingMode.SCREEN; tr7(G, "o").setValue(14); }
        var T = txt7(cc, s, { font: "IBMPlexMono-Bold", size: H * (o.size || 0.04), col: hx7("#D8F5E0"), x: W * 0.1, y: H * 0.42, just: 1, lead: H * 0.04 });
        var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        an.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        sel.property("ADBE Text Percent Start").expression = "var n=text.sourceText.length; Math.min(100, Math.floor(timeToFrames(time)-" + f0 + ")/" + (o.per || 2) + "/n*100)";
        var cur = txt7(cc, "_", { font: "IBMPlexMono-Bold", size: H * (o.size || 0.04), col: hx7("#D8F5E0"), x: W * 0.1, y: H * 0.47, just: 1 });
        tr7(cur, "o").expression = "Math.floor(time*4)%2*100";
    });
    fx7(L, "CC Lens", { 2: 135, 3: 92 }); fx7(L, "S_ScanLines", { 22: 160 }); io7(L, c, f0, f0 + n);
    return L;
}
// ty_777_16: Difference roto word behind the subject: cut = subject cut-out layer above; toggles = frames where the cut-out is OFF (1 f)
function ty777DiffRoto(c, s, cut, toggles, o) {
    o = o || {}; var T = txt7(c, s, { font: o.font || "Anton-Regular", size: c.height * (o.k || 0.22), col: hx7("#E0202A"), y: o.y || c.height * 0.4 });
    T.blendingMode = BlendingMode.DIFFERENCE; if (cut) { T.moveAfter(cut); var pairs = [[0, 100]]; for (var i = 0; i < toggles.length; i++) { pairs.push([toggles[i], 0], [toggles[i] + 1, 100]); } hold7(tr7(cut, "o"), c, pairs); }
    return T;
}
// ty_777_17: giant title in the top 40 % + micro paragraph
function ty777GiantMicro(c, title, para, f, o) {
    o = o || {}; var W = c.width, H = c.height;
    var T = txt7(c, title, { font: o.font || "Anton-Regular", size: H * 0.17, y: H * 0.22, lead: H * 0.16 }); io7(T, c, f, o.end);
    var P = txt7(c, para, { font: "ArialMT", size: H * 0.012, y: H * 0.42, lead: H * 0.016 }); io7(P, c, f, o.end);
    return [T, P];
}
// ty_777_18: ghost signature: image or text layer, burn on 2 f to 70 %, 6 % hold, cut at end
function ty777GhostSig(c, L, f, n) { io7(L, c, f, f + n); keys7(tr7(L, "o"), c, [[f, 0], [f + 2, 70], [f + 6, 6]]); return L; }
// t420: scramble-to-lock cut: B in-point = lock frame (call after ty777Decode); returns tick list
function t777ScrambleLockCut(c, B, f0, lock) { io7(B, c, lock, null); return ty777Ticks(f0, lock); }
