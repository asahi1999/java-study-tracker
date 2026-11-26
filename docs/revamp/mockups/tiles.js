/* 文字 → タイル の描画（モック用）
   標準出力の1文字が、8×8 ドットの1タイルになる。
   対応表にない文字は、床の上にその文字をそのまま描く。 */
(function () {
  const C = {
    a: '#2e2a3f', // 目地
    b: '#4a4462', // 石
    c: '#655d84', // 石の明るい面
    d: '#24212f', // 床
    e: '#2f2b3d', // 床の粒
    k: '#121019', // 闇
    f: '#ffe2a0', // 炎の芯
    g: '#f4a83d', // 炎
    h: '#c8612a', // 炎の根元
    u: '#3b3550', // 消えた松明
    t: '#7a5634', // 木
    T: '#f4a83d', // 金具
    p: '#ece4d3', // 羊皮紙（自分）
    q: '#b9ae97', // 羊皮紙の影
    w: '#2c5f80', // 水
    W: '#6fb3d9', // 波
    m: '#86c79f', // 苔
    r: '#b8a2f2', // ルーン
  };

  const S = {
    '#': [
      'cbbbacbb',
      'bbbbabbb',
      'bbbbabbb',
      'aaaaaaaa',
      'bacbbbbb',
      'babbbbbb',
      'babbbbbb',
      'aaaaaaaa',
    ],
    '.': [
      'dddddddd',
      'dddddedd',
      'dddddddd',
      'dddeeddd',
      'dddeeddd',
      'dddddddd',
      'dedddddd',
      'dddddddd',
    ],
    '@': [
      'dddppddd',
      'ddppppdd',
      'ddpqqpdd',
      'dgggggdd',
      'gggggggd',
      'dggggdgd',
      'ddgddgdd',
      'ddkddkdd',
    ],
    G: [
      'cccccccc',
      'bbbbbbbb',
      'kkcccccc',
      'kkbbbbbb',
      'kkkkcccc',
      'kkkkbbbb',
      'kkkkkkcc',
      'kkkkkkbb',
    ],
    '*': [
      'bbbfbbbb',
      'bbgfgbbb',
      'bbggghbb',
      'aaahtaaa',
      'bactbbbb',
      'babtbbbb',
      'babbbbbb',
      'aaaaaaaa',
    ],
    $: [
      'dddddddd',
      'dttttttd',
      'tTttttTt',
      'TTTffTTT',
      'tttffttt',
      'tTttttTt',
      'tttttttt',
      'dddddddd',
    ],
    '~': [
      'wwwwwwww',
      'wWWwwwww',
      'wwwWWwww',
      'wwwwwwww',
      'wwwwwWWw',
      'wwwwwwwW',
      'wWwwwwww',
      'wwwwwwww',
    ],
    '+': [
      'aaaaaaaa',
      'atttttta',
      'atttttta',
      'atttttta',
      'attttTta',
      'atttttta',
      'atttttta',
      'aaaaaaaa',
    ],
    '%': [
      'dddddddd',
      'ddmddddd',
      'dmmmddmd',
      'ddmddmmm',
      'dddddmdd',
      'ddmddddd',
      'dmmmdddd',
      'dddddddd',
    ],
    ' ': [
      'kkkkkkkk',
      'kkkkkkkk',
      'kkkkkkkk',
      'kkkkkkkk',
      'kkkkkkkk',
      'kkkkkkkk',
      'kkkkkkkk',
      'kkkkkkkk',
    ],
    unlit: [
      'bbbbbbbb',
      'bbbubbbb',
      'bbuuubbb',
      'aaautaaa',
      'bactbbbb',
      'babtbbbb',
      'babbbbbb',
      'aaaaaaaa',
    ],
  };

  function spriteRects(sprite, ox, oy) {
    let out = '';
    for (let y = 0; y < 8; y++) {
      const row = sprite[y];
      let x = 0;
      while (x < 8) {
        const ch = row[x];
        let run = 1;
        while (x + run < 8 && row[x + run] === ch) run++;
        const col = C[ch] || C.d;
        out += `<rect x="${ox + x}" y="${oy + y}" width="${run}" height="1" fill="${col}"/>`;
        x += run;
      }
    }
    return out;
  }

  function svgFor(rows, opts) {
    const o = Object.assign({ size: 24, unlit: false }, opts || {});
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    let body = '';
    let glyphs = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x] ?? ' ';
        let key = ch;
        if (ch === '*' && o.unlit) key = 'unlit';
        const sprite = S[key];
        if (sprite) {
          body += spriteRects(sprite, x * 8, y * 8);
        } else {
          body += spriteRects(S['.'], x * 8, y * 8);
          glyphs += `<text x="${x * 8 + 4}" y="${y * 8 + 6.3}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="6.5" font-weight="600" fill="#ece4d3">${ch.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
        }
      }
    }
    // 松明の光（1マス分の淡い光）
    let glow = '';
    if (!o.unlit) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (rows[y][x] === '*') {
            glow += `<rect x="${x * 8 - 8}" y="${y * 8 - 4}" width="24" height="20" fill="url(#glow)"/>`;
          }
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 8} ${h * 8}" width="${w * o.size}" height="${h * o.size}" role="img" aria-label="${o.label || '出力のタイル表示'}">
      <defs><radialGradient id="glow"><stop offset="0" stop-color="#f4a83d" stop-opacity=".28"/><stop offset="1" stop-color="#f4a83d" stop-opacity="0"/></radialGradient></defs>
      ${body}${glow}${glyphs}</svg>`;
  }

  window.Tiles = {
    render(el, rows, opts) {
      el.innerHTML = svgFor(rows, opts);
    },
    sprite(ch, size, opts) {
      return svgFor([ch], Object.assign({ size }, opts));
    },
  };

  // data-tiles 属性を持つ要素を自動で描く（行は "|" 区切り）
  document.querySelectorAll('[data-tiles]').forEach((el) => {
    const rows = el.getAttribute('data-tiles').split('|');
    Tiles.render(el, rows, {
      size: Number(el.getAttribute('data-size') || 24),
      unlit: el.hasAttribute('data-unlit'),
      label: el.getAttribute('aria-label') || undefined,
    });
  });
})();
