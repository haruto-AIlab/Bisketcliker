import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const parts=[];
for(const [file,variable]of [['src/spec/core.js','spec'],['src/spec/progression.js','progression']]){
  const raw=await readFile(new URL('../'+file,import.meta.url),'utf8');parts.push(raw.replace('export default ',`const ${variable} = `));
}
for(const file of ['calculations.js','data.js','engine.js','app.js']){
  const raw=await readFile(new URL('../src/'+file,import.meta.url),'utf8');parts.push(raw.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(?:const|let|function|class)\b)/g,''));
}
const script='(()=>{\n'+parts.join('\n')+'\n})();';
await writeFile('/tmp/bisket-bundle-check.js',script);
const checked=spawnSync(process.execPath,['--check','/tmp/bisket-bundle-check.js'],{encoding:'utf8'});if(checked.status!==0)throw Error(checked.stderr);
let html=await readFile(new URL('../index.html',import.meta.url),'utf8');const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
html=html.replace(/<link rel="stylesheet" href="[^"]+">/,()=>'<style>'+css+'</style>').replace(/<script type="module" src="[^"]+"><\/script>/,()=>'<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>').replace('class="brand" href="./"','class="brand" href="#"');
if(/<script type="module"|^import /m.test(html))throw Error('Unbundled module');
await mkdir(new URL('../downloads/',import.meta.url),{recursive:true});await writeFile(new URL('../downloads/bisket.html',import.meta.url),html);
const zipped=spawnSync('python3',['-c',`
from pathlib import Path
import zipfile
root=Path('.')
files=[]
for name in ['README.md','.gitignore','index.html','package.json','package-lock.json','server.js','src','spec','docs','test','tools']:
    p=root/name
    files.extend([p] if p.is_file() else [f for f in p.rglob('*') if f.is_file() and 'node_modules' not in f.parts])
with zipfile.ZipFile('downloads/bisket-source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(files): z.write(p,Path('Bisket')/p)
    z.write('downloads/bisket.html','Bisket/bisket.html')
    z.writestr('Bisket/ダウンロード版の使い方.txt','bisket.html は単一HTML版です。Macのブラウザーで開けます。iPhone/iPadのファイルアプリではプレビューとなる場合があります。セーブはゲーム内の書き出しで保管してください。ソースの起動方法はREADME.mdを参照してください。\\n')
with zipfile.ZipFile('downloads/bisket-source.zip') as z:
    assert z.testzip() is None
    assert b'./src/style.css' in z.read('Bisket/index.html')
    print('Source ZIP verified:',len(z.namelist()),'files')
`],{cwd:root,encoding:'utf8'});if(zipped.status!==0)throw Error(zipped.stderr);console.log(zipped.stdout.trim());console.log('Standalone HTML generated:',Buffer.byteLength(html),'bytes');
