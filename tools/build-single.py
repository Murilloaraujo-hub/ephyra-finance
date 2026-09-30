"""Build one HTML file. Server functions remain deployed in Supabase."""
from pathlib import Path
import base64,hashlib,json,mimetypes,re
from html import escape
root=Path(__file__).resolve().parents[1]
out=root.parent/'Ephyra-Finance.html'
def data(path):
 mime=mimetypes.guess_type(path)[0] or 'application/octet-stream'
 return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
html=(root/'index.html').read_text()
def css(match):
 path=root/match[1].split('?')[0]
 content=path.read_text()
 def asset(m):
  ref=m[1].strip('"\'');p=(path.parent/ref).resolve()
  if ref.startswith('data:'):return m[0]
  if not p.exists():return 'url(data:font/ttf;base64,)'
  return 'url("'+data(p)+'")'
 content=re.sub(r'url\(([^)]+)\)',asset,content)
 return '<style>'+content+'</style>'
html=re.sub(r'<link rel="stylesheet" href="([^\"]+)"\s*>',css,html)
hashes=[]
def script(match):
 path=root/match[1].split('?')[0];content=path.read_text()
 if path.name=='onboarding.js':
  content=re.sub(r"image: '([^']+)'",lambda m:'image: '+json.dumps(data(root/'images/tutorial'/m[1])),content)
  content=content.replace('`./images/tutorial/${step.image}`','step.image')
 if path.name=='auth-config.js':content="window.EPHYRA_AUTH_CONFIG=Object.freeze({url:document.querySelector('meta[name=ephyra-auth-url]').content,publicKey:document.querySelector('meta[name=ephyra-auth-key]').content});"
 if path.name=='contact-config.js':content="window.EPHYRA_CONTACT=Object.freeze({recommendationsEmail:document.querySelector('meta[name=ephyra-contact]').content});"
 content=content.replace(chr(0), r'\x00')
 content=re.sub(r'</script',r'<\\/script',content,flags=re.I)
 hashes.append("'sha256-"+base64.b64encode(hashlib.sha256(content.encode()).digest()).decode()+"'")
 return '<script>'+content+'</script>'
html=re.sub(r'<script src="([^\"]+)"></script>',script,html)
html=html.replace("script-src 'self';", "script-src 'self' "+' '.join(hashes)+';').replace("font-src 'self';","font-src 'self' data:;")
config='''<!-- Configure somente a URL e a chave PUBLICA do Supabase nestas metas. Nunca use service_role. -->
<meta name="ephyra-auth-url" content="">
<meta name="ephyra-auth-key" content="">
<meta name="ephyra-contact" content="sillvamuriloarauja@gmail.com">
'''
auth=json.loads(re.search(r'Object.freeze\((\{[\s\S]*?\})\)',(root/'js/auth-config.js').read_text())[1])
config=config.replace('name="ephyra-auth-url" content=""','name="ephyra-auth-url" content="'+escape(auth['url'],quote=True)+'"').replace('name="ephyra-auth-key" content=""','name="ephyra-auth-key" content="'+escape(auth['publicKey'],quote=True)+'"')
html=html.replace('<title>Ephyra Finance</title>',config+'<title>Ephyra Finance</title>')
license=(root/'js/vendor/SUPABASE-LICENSE').read_text().replace('--','—')
html=html.replace('</head>','<!-- Supabase JS license\n'+license+'\n-->\n</head>',1)
out.write_text(html)
print(f'{out.name}: {out.stat().st_size/1024/1024:.1f} MB; {len(hashes)} scripts protegidos por hash CSP')
