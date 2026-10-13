"""Build static articles and responsive images. Requires Pillow; run from any directory.
Sources: post.html (shell), posts/ (article fragments), data/posts.json, index.html.
Generated writing/, assets/optimized/, and home post list must be committed together.
"""
from pathlib import Path
import base64, copy, hashlib, html, io, json, re
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/optimized'
OUT.mkdir(parents=True, exist_ok=True)
posts = sorted(json.loads((ROOT / 'data/posts.json').read_text(encoding='utf-8')), key=lambda p: p['date'], reverse=True)
media = {}

def image_info(src):
    if src in media:
        return media[src]
    path = ROOT / src
    if not path.is_file() or path.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.svg']:
        return None
    if path.suffix == '.svg':
        text = path.read_text(encoding='utf-8')
        # These SVGs are only a cropped embedded JPEG, without vector artwork.
        if path.name not in ['rental-logo.svg', 'ttomanito-logo.svg']:
            return None
        view = list(map(float, re.search(r'viewBox="([^"]+)"', text)[1].split()))
        data = re.search(r'data:image/jpeg;base64,([^"]+)', text)[1]
        im = Image.open(io.BytesIO(base64.b64decode(data)))
        x,y,w,h = map(round,view)
        im = im.crop((x,y,x+w,y+h))
        widths = [128,256]
    else:
        im = ImageOps.exif_transpose(Image.open(path))
        widths = [320,640,960,1280]
    if im.mode not in ['RGB','RGBA']:
        im = im.convert('RGBA' if 'transparency' in im.info else 'RGB')
    width,height = im.size
    widths = sorted(set(min(w,width) for w in widths))
    outputs=[]
    for size in widths:
        resized = im.resize((size,round(height*size/width)),Image.Resampling.LANCZOS)
        buffer=io.BytesIO()
        resized.save(buffer,format='WEBP',quality=88,method=6,lossless=path.suffix=='.svg')
        content=buffer.getvalue()
        digest=hashlib.sha256(content).hexdigest()[:10]
        filename=f'{path.stem}-{size}-{digest}.webp'
        (OUT/filename).write_bytes(content)
        outputs.append((size,'assets/optimized/'+filename))
    info={'src':outputs[-1][1], 'srcset':', '.join(f'{url} {w}w' for w,url in outputs),'width':width,'height':height}
    media[src]=info
    return info

def optimize_images(markup, thumbnail=False):
    def replace(match):
        tag=match[0]
        source=re.search(r'(?<![\w-])src="([^"]+)"',tag)
        if not source:
            return tag
        src=html.unescape(source[1])
        # Already generated assets carry dimensions and a complete srcset.
        original=re.search(r'data-original-src="([^"]+)"',tag)
        if original:
            src=html.unescape(original[1])
        elif src.startswith('assets/optimized/'):
            return tag
        info=image_info(src)
        if info:
            if not original:
                tag=tag[:-1]+f' data-original-src="{html.escape(src,quote=True)}">'
            tag=re.sub(r'(?<![\w-])src="[^"]+"',f'src="{info["src"]}"',tag)
            for attr in ['srcset','sizes']:
                tag=re.sub(r'\s'+attr+r'="[^"]*"','',tag)
            sizes='64px' if src.endswith(('rental-logo.svg', 'ttomanito-logo.svg')) else ('160px' if thumbnail else '(max-width: 800px) calc(100vw - 40px), 752px')
            tag=tag[:-1]+f' srcset="{info["srcset"]}" sizes="{sizes}">'
            for attr in ['width','height']:
                if not re.search(r'\b'+attr+r'=',tag):
                    tag=tag[:-1]+f' {attr}="{info[attr]}">'
        elif src.endswith('.svg'):
            # Icons are square in their fixed-size logo containers.
            if 'assets/portfolio/' in src:
                tag=tag[:-1]+' width="64" height="64">' if 'width=' not in tag else tag
        if 'loading=' not in tag:
            tag=tag[:-1]+' loading="lazy">'
        if 'decoding=' not in tag:
            tag=tag[:-1]+' decoding="async">'
        return tag
    return re.sub(r'<img\b[^>]*>',replace,markup)

# Store optimized fragments separately; preserve original authoring sources.
for post in posts:
    for lang,source in list(post['content'].items()):
        markup=(ROOT/source).read_text(encoding='utf-8')
        dest=f'writing/{post["id"]}/body.{lang}.html'
        target=ROOT/dest
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(optimize_images(markup),encoding='utf-8')
        post['content'][lang]=dest
    info=image_info(post['thumbnail'])
    if info:
        post['thumbnail']=info['src']
        post['thumbnailSrcset']=info['srcset']

shell=(ROOT/'post.html').read_text(encoding='utf-8')
# The legacy query URL remains valid and only redirects known article IDs.
redirect='''  <!-- legacy-routing:start -->
  <script>
    const legacyId = new URLSearchParams(location.search).get("id");
    if (IDS.includes(legacyId)) location.replace("writing/" + encodeURIComponent(legacyId) + "/" + location.hash);
  </script>
  <!-- legacy-routing:end -->
'''.replace('IDS',json.dumps([p['id'] for p in posts]))
shell=re.sub(r'  <!-- legacy-routing:start -->.*?  <!-- legacy-routing:end -->\n','',shell,flags=re.S)
shell=shell.replace('  <title>',redirect+'  <title>',1)
# No-JS visitors to the legacy query shell can choose a complete static article.
links=''.join(f'<li><a href="writing/{p["id"]}/">{html.escape(p["title"]["ko"])}</a></li>' for p in posts)
shell=re.sub(r'<div class="post-body" id="post-body">.*?</div>',f'<div class="post-body" id="post-body"><noscript><p>글을 선택해 주세요.</p><ul>{links}</ul></noscript></div>',shell,flags=re.S)
(ROOT/'post.html').write_text(shell,encoding='utf-8')
for post in posts:
    page=re.sub(r'  <!-- legacy-routing:start -->.*?  <!-- legacy-routing:end -->\n','',shell,flags=re.S)
    page=page.replace('<html lang="ko">',f'<html lang="ko" data-post-id="{post["id"]}">')
    page=page.replace('<head>','<head>\n  <base href="../../">')
    page=re.sub(r'<title>.*?</title>',f'<title>{html.escape(post["title"]["ko"])} — TaeeunKil</title>',page)
    page=re.sub(r'<meta name="description" content="[^"]*">',f'<meta name="description" content="{html.escape(post["summary"]["ko"],quote=True)}">',page)
    page=page.replace('</head>',f'  <link rel="canonical" href="https://taeeunkil.github.io/writing/{post["id"]}/">\n</head>')
    page=re.sub(r'(<h1 id="post-title">).*?(</h1>)',lambda m:m[1]+html.escape(post['title']['ko'])+m[2],page)
    page=re.sub(r'(<span id="post-number">).*?(</span>)',lambda m:m[1]+str(post['number']).zfill(3)+m[2],page)
    page=page.replace('<time id="post-date"></time>',f'<time id="post-date" datetime="{post["date"]}">{post["date"].replace("-",".")}</time>')
    page=page.replace('<span id="post-tags"></span>',f'<span id="post-tags">{html.escape(post.get("tagSeparator"," · ").join(post["tags"]))}</span>')
    page=page.replace('<p class="post-summary" id="post-summary"></p>',f'<p class="post-summary" id="post-summary">{html.escape(post["summary"]["ko"])}</p>')
    body=(ROOT/post['content']['ko']).read_text(encoding='utf-8')
    page=re.sub(r'<div class="post-body" id="post-body">.*?</div>',lambda m:'<div class="post-body" id="post-body">'+body+'</div>',page,flags=re.S)
    if 'language-' in body:
        page=page.replace('  <link rel="stylesheet" href="style.css', '  <link rel="stylesheet" href="assets/vendor/prism/prism.css">\n  <link rel="stylesheet" href="style.css')
    page=re.sub(r'href="#([^"]*)"', lambda m: f'href="writing/{post["id"]}/#{m[1]}"', page)
    page=page.replace('</body>',f'<script id="post-data" type="application/json">{json.dumps(post,ensure_ascii=False).replace("<","\\u003c")}</script>\n</body>')
    (ROOT/f'writing/{post["id"]}/index.html').write_text(page,encoding='utf-8')

index=(ROOT/'index.html').read_text(encoding='utf-8')
index=optimize_images(index)
rows=[]
for post in posts:
    srcset=f' srcset="{post["thumbnailSrcset"]}" sizes="160px"' if post.get('thumbnailSrcset') else ''
    rows.append(f'''<a class="post-row" href="writing/{post['id']}/"><span class="post-number">{post['number']:03}</span><time datetime="{post['date']}">{post['date'].replace('-','.')}</time><div><h3>{html.escape(post['title']['ko'])}</h3><p>{html.escape(post['summary']['ko'])}</p></div><img class="post-thumbnail" src="{post['thumbnail']}"{srcset} alt="" width="160" height="100" loading="lazy" decoding="async"></a>''')
start=index.index('          <div class="post-list')
end=index.index('\n        </section>',start)
index=index[:start]+'''          <div class="post-list is-loading" aria-live="polite" aria-busy="true" data-post-list>
            <p class="post-list-status" data-i18n="writing.loading">글을 불러오고 있습니다.</p>
            <noscript>'''+''.join(rows)+'''</noscript>
          </div>'''+index[end:]
index=re.sub(r'<script id="post-index" type="application/json">.*?</script>\n?','',index,flags=re.S)
index=index.replace('</body>',f'<script id="post-index" type="application/json">{json.dumps(posts,ensure_ascii=False).replace("<","\\u003c")}</script>\n</body>')
(ROOT/'index.html').write_text(index,encoding='utf-8')
print(f'Built {len(posts)} static articles and optimized {len(media)} images.')

# Remove stale generated variants only, within this build's output directory.
references = index + ''.join(path.read_text(encoding='utf-8') for path in (ROOT / 'writing').rglob('*.html'))
used_assets = set(re.findall(r'assets/optimized/[^\s\"<> ,]+\.webp', references))
for path in OUT.glob('*.webp'):
    if path.relative_to(ROOT).as_posix() not in used_assets:
        path.unlink()
