/* NextStep PDF compressor engine (window.NSPdf). No external library.
   Rebuilds the PDF (new cross-reference table) and re-encodes the embedded JPEG (DCTDecode) pictures, which is where scanned and photo PDFs hold their size.
   Everything runs in the browser; the file is never uploaded. Encrypted and damaged PDFs are refused with a clear message. */
(function(root){
'use strict';
var MAX_FILE=150*1048576;
function toStr(u8){var p=[],i=0,C=0x8000;while(i<u8.length){p.push(String.fromCharCode.apply(null,u8.subarray(i,i+C)));i+=C}return p.join('')}
function fromStr(s){var u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u}
function isWs(c){return c===32||c===10||c===13||c===9||c===12||c===0}
function isDelim(c){return c===40||c===41||c===60||c===62||c===91||c===93||c===123||c===125||c===47||c===37}
function skipWs(s,i){while(i<s.length){var c=s.charCodeAt(i);if(isWs(c))i++;else if(c===37){while(i<s.length&&s.charCodeAt(i)!==10&&s.charCodeAt(i)!==13)i++}else break}return i}
function bad(m){var e=new Error(m);e.pdf=true;return e}
/* end index of the PDF value that starts at i */
function readValue(s,i){
 i=skipWs(s,i);if(i>=s.length)throw bad('Unexpected end of file.');
 var c=s.charCodeAt(i),st=i;
 if(c===60){
  if(s.charCodeAt(i+1)===60){i+=2;for(;;){i=skipWs(s,i);if(i>=s.length)throw bad('Damaged PDF structure.');if(s.charCodeAt(i)===62&&s.charCodeAt(i+1)===62)return i+2;var a=i;i=readValue(s,i);i=readValue(s,i);if(i<=a)throw bad('Damaged PDF structure.')}}
  var e=s.indexOf('>',i);if(e<0)throw bad('Damaged PDF structure.');return e+1}
 if(c===91){i++;for(;;){i=skipWs(s,i);if(i>=s.length)throw bad('Damaged PDF structure.');if(s.charCodeAt(i)===93)return i+1;var b=i;i=readValue(s,i);if(i<=b)throw bad('Damaged PDF structure.')}}
 if(c===40){var d=1;i++;while(i<s.length&&d>0){var ch=s.charCodeAt(i);if(ch===92)i+=2;else{if(ch===40)d++;else if(ch===41)d--;i++}}return i}
 if(c===47){i++;while(i<s.length&&!isWs(s.charCodeAt(i))&&!isDelim(s.charCodeAt(i)))i++;return i}
 while(i<s.length&&!isWs(s.charCodeAt(i))&&!isDelim(s.charCodeAt(i)))i++;
 if(i===st)throw bad('Damaged PDF structure.');
 if(/^\d+$/.test(s.slice(st,i))){var j=skipWs(s,i),m=/^\d+\s+R(?![A-Za-z0-9])/.exec(s.slice(j,j+24));if(m)return j+m[0].length}
 return i}
function parseDict(s,start){
 var i=start+2,pairs=[];
 for(;;){i=skipWs(s,i);if(i>=s.length)throw bad('Damaged PDF structure.');
  if(s.charCodeAt(i)===62&&s.charCodeAt(i+1)===62)return{pairs:pairs,end:i+2};
  if(s.charCodeAt(i)!==47)throw bad('Damaged PDF structure.');
  var ke=readValue(s,i),key=s.slice(i,ke);i=skipWs(s,ke);var ve=readValue(s,i);pairs.push([key,s.slice(i,ve)]);i=ve}}
function get(pairs,k){for(var i=0;i<pairs.length;i++)if(pairs[i][0]===k)return pairs[i][1];return null}
function setKey(pairs,k,v){for(var i=0;i<pairs.length;i++)if(pairs[i][0]===k){pairs[i][1]=v;return}pairs.push([k,v])}
function delKey(pairs,k){for(var i=pairs.length-1;i>=0;i--)if(pairs[i][0]===k)pairs.splice(i,1)}
function dictText(pairs){return'<<'+pairs.map(function(p){return p[0]+' '+p[1]}).join('\n')+'>>'}
function hasName(raw,name){return raw!==null&&new RegExp('/'+name+'(?![A-Za-z0-9])').test(raw)}

/* ---- scan: find every top-level object, trailers, xref streams ---- */
function scan(s){
 var re=/(^|[^0-9A-Za-z])(\d{1,10})\s+(\d{1,5})\s+obj(?![A-Za-z])/g,pos=0,objs=[],gaps=[],last=0;
 for(;;){
  re.lastIndex=pos;var m=re.exec(s);if(!m)break;
  var hs=m.index+m[1].length,p=skipWs(s,m.index+m[0].length),o={num:+m[2],gen:+m[3],start:hs,pairs:null,ss:-1,se:-1,end:0};
  try{
   if(s.charCodeAt(p)===60&&s.charCodeAt(p+1)===60){
    var d=parseDict(s,p);o.pairs=d.pairs;var q=skipWs(s,d.end),end;
    if(s.startsWith('stream',q)){
     var ss=q+6;if(s.charCodeAt(ss)===13&&s.charCodeAt(ss+1)===10)ss+=2;else if(s.charCodeAt(ss)===10||s.charCodeAt(ss)===13)ss++;
     var lenRaw=get(o.pairs,'/Length'),len=lenRaw&&/^\d+$/.test(lenRaw)?+lenRaw:-1,se=-1;
     if(len>=0&&ss+len<=s.length&&s.startsWith('endstream',skipWs(s,ss+len)))se=ss+len;
     if(se<0){var es=s.indexOf('endstream',ss);if(es<0)throw bad('Damaged PDF structure.');se=es;if(s.charCodeAt(se-1)===10){se--;if(s.charCodeAt(se-1)===13)se--}else if(s.charCodeAt(se-1)===13)se--}
     o.ss=ss;o.se=se;var eo=s.indexOf('endobj',se);end=eo<0?s.length:eo+6}
    else{var eo2=s.indexOf('endobj',d.end);end=eo2<0?s.length:eo2+6}
   }else{var eo3=s.indexOf('endobj',p);end=eo3<0?s.length:eo3+6}
   o.end=end;if(hs>last)gaps.push([last,hs]);objs.push(o);pos=end;last=end;
  }catch(e){if(e.pdf&&/Damaged/.test(e.message)){pos=hs+1;continue}throw e}
 }
 if(s.length>last)gaps.push([last,s.length]);
 return{objs:objs,gaps:gaps}}
function rawFilters(pairs){var f=get(pairs,'/Filter');if(!f)return[];var r=[],re=/\/([A-Za-z0-9]+)/g,m;while((m=re.exec(f)))r.push(m[1]);return r}
async function inflate(u8){var ds=new DecompressionStream('deflate'),w=ds.writable.getWriter();w.write(u8);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer())}
async function deflate(u8){var cs=new CompressionStream('deflate'),w=cs.writable.getWriter();w.write(u8);w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer())}


function a85(u){var out=[],g=[],i,c;for(i=0;i<u.length;i++){c=u[i];if(c===126)break;if(c===32||c===10||c===13||c===9||c===12||c===0)continue;
 if(c===122&&!g.length){out.push(0,0,0,0);continue}if(c<33||c>117)throw new Error('a85');g.push(c-33);
 if(g.length===5){var v=((((g[0]*85+g[1])*85+g[2])*85+g[3])*85+g[4])>>>0;out.push(v>>>24&255,v>>>16&255,v>>>8&255,v&255);g=[]}}
 if(g.length>1){var n=g.length;while(g.length<5)g.push(84);var w=((((g[0]*85+g[1])*85+g[2])*85+g[3])*85+g[4])>>>0,b=[w>>>24&255,w>>>16&255,w>>>8&255,w&255];for(var k=0;k<n-1;k++)out.push(b[k])}
 return new Uint8Array(out)}
function ahx(u){var out=[],h=-1,i,c,v;for(i=0;i<u.length;i++){c=u[i];if(c===62)break;if(c===32||c===10||c===13||c===9||c===12||c===0)continue;
 v=c>=48&&c<=57?c-48:c>=65&&c<=70?c-55:c>=97&&c<=102?c-87:-1;if(v<0)throw new Error('ahx');if(h<0)h=v;else{out.push(h*16+v);h=-1}}if(h>=0)out.push(h*16);return new Uint8Array(out)}
async function decodeChain(raw,chain){var d=raw;for(var i=0;i<chain.length-1;i++){var f=chain[i];
 if(f==='ASCII85Decode'||f==='A85')d=a85(d);else if(f==='ASCIIHexDecode'||f==='AHx')d=ahx(d);else if(f==='FlateDecode'||f==='Fl'){if(typeof DecompressionStream==='undefined')throw new Error('nodecomp');d=await inflate(d)}else throw new Error('filter')}return d}
var PRE={ASCII85Decode:1,A85:1,ASCIIHexDecode:1,AHx:1,FlateDecode:1,Fl:1};
/* ---- JPEG header facts ---- */
function jpegInfo(u){
 if(u.length<4||u[0]!==255||u[1]!==216)return null;
 var i=2,r={w:0,h:0,c:0,bits:0,ori:1};
 while(i+4<u.length){
  if(u[i]!==255){i++;continue}var mk=u[i+1];if(mk===255){i++;continue}
  if(mk===216||mk===1||(mk>=208&&mk<=215)){i+=2;continue}
  var L=(u[i+2]<<8)|u[i+3];
  if(mk>=192&&mk<=207&&mk!==196&&mk!==200&&mk!==204){r.bits=u[i+4];r.h=(u[i+5]<<8)|u[i+6];r.w=(u[i+7]<<8)|u[i+8];r.c=u[i+9];return r}
  if(mk===225&&u[i+4]===69&&u[i+5]===120&&u[i+6]===105&&u[i+7]===102){
   var t=i+10,le=u[t]===73,r16=function(o){return le?u[o]|(u[o+1]<<8):(u[o]<<8)|u[o+1]},r32=function(o){return le?(u[o]|(u[o+1]<<8)|(u[o+2]<<16)|(u[o+3]<<24))>>>0:((u[o]<<24)|(u[o+1]<<16)|(u[o+2]<<8)|u[o+3])>>>0};
   try{var ifd=t+r32(t+4),n=r16(ifd);for(var k=0;k<n&&k<64;k++){var e=ifd+2+12*k;if(r16(e)===274){r.ori=r16(e+8);break}}}catch(x){}
  }
  i+=2+L}
 return null}

/* ---- prepare: parse once, reuse for every pass ---- */
async function prepare(buf){
 if(buf.length>MAX_FILE)throw bad('This PDF is larger than 150 MB. Please split it first.');
 var head=toStr(buf.subarray(0,1024));if(head.indexOf('%PDF-')<0)throw bad('This file does not look like a PDF.');
 var s=toStr(buf),sc=scan(s),objs=sc.objs;
 if(!objs.length)throw bad('No readable objects were found. The PDF may be damaged.');
 var trailer={},tkeys=['/Root','/Info','/ID','/Encrypt'];
 function takeKeys(pairs){tkeys.forEach(function(k){var v=get(pairs,k);if(v!==null)trailer[k]=v})}
 sc.gaps.forEach(function(g){var seg=s.slice(g[0],g[1]),re=/trailer\s*<</g,m;while((m=re.exec(seg))){try{takeKeys(parseDict(seg,m.index+m[0].length-2).pairs)}catch(e){}}});
 var table={},maxNum=0,hasStm=false,stms=[];
 for(var i=0;i<objs.length;i++){var o=objs[i];if(o.num>maxNum)maxNum=o.num;var ty=o.pairs&&get(o.pairs,'/Type');
  if(ty&&hasName(ty,'XRef')){takeKeys(o.pairs);o.skip=true;continue}
  if(o.pairs&&get(o.pairs,'/Linearized')!==null&&o.ss<0){o.skip=true;continue}
  if(ty&&hasName(ty,'ObjStm')&&o.ss>=0){
   hasStm=true;var f=rawFilters(o.pairs);
   if(f.length>1||(f.length===1&&f[0]!=='FlateDecode'&&f[0]!=='Fl'))throw bad('This PDF uses a compression type that this tool does not support.');
   if(typeof DecompressionStream==='undefined')throw bad('This browser is too old to read this PDF. Please update your browser.');
   var raw=buf.subarray(o.ss,o.se),dec=f.length?await inflate(raw):raw,n=+get(o.pairs,'/N'),first=+get(o.pairs,'/First'),hd=toStr(dec.subarray(0,first)).trim().split(/\s+/);
   for(var k=0;k<n;k++){var cn=+hd[2*k];if(cn>maxNum)maxNum=cn;table[cn]={t:2,stm:o.num,idx:k}}
   o.keepStm=true}
  table[o.num]={t:1,o:o}}
 if(trailer['/Encrypt'])throw bad('This PDF is password-protected (encrypted). Remove the password first, then compress it.');
 if(!trailer['/Root'])throw bad('The PDF has no document root. It may be damaged.');
 var rn=+/^(\d+)/.exec(trailer['/Root'])[1];if(!table[rn])throw bad('The PDF structure is damaged (missing document root).');
 var ver=/%PDF-(\d)\.(\d)/.exec(head);
 return{buf:buf,s:s,objs:objs,table:table,maxNum:maxNum,hasStm:hasStm,trailer:trailer,ver:ver?[+ver[1],+ver[2]]:[1,4]}}

/* ---- picture re-encoding ---- */
async function bitmapOf(blob){try{return await createImageBitmap(blob,{imageOrientation:'none'})}catch(e){return await createImageBitmap(blob)}}
function canvasOf(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
async function reencode(bytes,info,maxSide,quality){
 var bmp=await bitmapOf(new Blob([bytes],{type:'image/jpeg'})),sc=Math.min(1,maxSide/Math.max(info.w,info.h)),w=Math.max(1,Math.round(info.w*sc)),h=Math.max(1,Math.round(info.h*sc));
 var cw=bmp.width,ch=bmp.height,src=bmp;
 if(cw!==info.w||ch!==info.h){w=Math.max(1,Math.round(cw*sc));h=Math.max(1,Math.round(ch*sc))}
 while(cw/2>=w&&ch/2>=h){var nw=Math.max(w,Math.round(cw/2)),nh=Math.max(h,Math.round(ch/2)),c=canvasOf(nw,nh),x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,nw,nh);if(src.close)try{src.close()}catch(e){}src=c;cw=nw;ch=nh}
 var cv=canvasOf(w,h),g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.imageSmoothingQuality='high';g.drawImage(src,0,0,w,h);if(src.close)try{src.close()}catch(e){}
 var blob=await new Promise(function(r){cv.toBlob(r,'image/jpeg',quality)});if(!blob)throw new Error('encode');
 return{bytes:new Uint8Array(await blob.arrayBuffer()),w:w,h:h}}

function eligible(o,buf,minBytes){
 if(!o.pairs||o.ss<0)return null;
 var st=get(o.pairs,'/Subtype');if(!st||!hasName(st,'Image'))return null;
 var f=rawFilters(o.pairs);if(!f.length)return null;var last=f[f.length-1];if(last!=='DCTDecode'&&last!=='DCT')return null;
 for(var i=0;i<f.length-1;i++)if(!PRE[f[i]])return null;
 if(get(o.pairs,'/ImageMask')&&/true/.test(get(o.pairs,'/ImageMask')))return{skip:'mask'};
 if(get(o.pairs,'/Decode')!==null)return{skip:'special colours'};
 var mk=get(o.pairs,'/Mask');if(mk&&mk.charAt(0)==='[')return{skip:'special colours'};
 if(o.se-o.ss<minBytes)return{skip:'small'};
 return{chain:f}}
function checkJpeg(info){if(!info)return'unreadable';if(info.bits!==8||(info.c!==1&&info.c!==3))return'special colours';if(info.ori!==1)return'rotated photo';return''}

var LEVELS={light:{q:.85,max:3200},rec:{q:.72,max:2200},strong:{q:.55,max:1500},extreme:{q:.4,max:1000}};
var LADDER=[{q:.85,max:3200},{q:.72,max:2200},{q:.6,max:1700},{q:.5,max:1400},{q:.4,max:1100},{q:.3,max:850},{q:.25,max:650}];

/* ---- write the new file ---- */
async function assemble(ctx,repl,onProgress){
 var buf=ctx.buf,chunks=[],pos=0,off={},enc=new TextEncoder();
 function put(u){chunks.push(u);pos+=u.length}
 function putS(t){put(fromStr(t))}
 var useStm=ctx.hasStm,ver=ctx.ver.slice();if(useStm&&(ver[0]<1||(ver[0]===1&&ver[1]<5)))ver=[1,5];
 putS('%PDF-'+ver[0]+'.'+ver[1]+'\n%\xE2\xE3\xCF\xD3\n');
 var order=ctx.objs;
 for(var i=0;i<order.length;i++){var o=order[i];if(o.skip)continue;var te=ctx.table[o.num];if(!te||te.t!==1||te.o!==o)continue;
  off[o.num]=pos;
  if(repl[i]){putS(repl[i].head);put(repl[i].data);putS('\nendstream\nendobj\n')}
  else{put(buf.subarray(o.start,o.end));putS('\n')}}
 var size=ctx.maxNum+1,tr=ctx.trailer,common='/Root '+tr['/Root']+(tr['/Info']?' /Info '+tr['/Info']:'')+(tr['/ID']?' /ID '+tr['/ID']:'');
 var xpos=pos;
 if(!useStm){
  var free=[];for(var n=1;n<size;n++)if(!ctx.table[n]||ctx.table[n].t!==1||off[n]===undefined)free.push(n);
  var nextFree={};for(var f=0;f<free.length;f++)nextFree[free[f]]=free[f+1]||0;
  var lines=['xref\n0 '+size+'\n'];
  lines.push(String(free[0]||0).padStart(10,'0')+' 65535 f \n');
  for(var k=1;k<size;k++){if(off[k]!==undefined)lines.push(String(off[k]).padStart(10,'0')+' '+String(ctx.table[k].o.gen).padStart(5,'0')+' n \n');else lines.push(String(nextFree[k]).padStart(10,'0')+' 00000 f \n')}
  putS(lines.join(''));putS('trailer\n<</Size '+size+' '+common+'>>\nstartxref\n'+xpos+'\n%%EOF\n')}
 else{
  var xn=size,total=xn+1,W=7,data=new Uint8Array(total*W);
  function ent(n,t,a,b){var p=n*W;data[p]=t;data[p+1]=(a>>>24)&255;data[p+2]=(a>>>16)&255;data[p+3]=(a>>>8)&255;data[p+4]=a&255;data[p+5]=(b>>>8)&255;data[p+6]=b&255}
  ent(0,0,0,65535);
  for(var q=1;q<size;q++){var te2=ctx.table[q];if(te2&&te2.t===1&&off[q]!==undefined)ent(q,1,off[q],te2.o.gen);else if(te2&&te2.t===2)ent(q,2,te2.stm,te2.idx);else ent(q,0,0,0)}
  ent(xn,1,xpos,0);
  var body=data,flt='';if(typeof CompressionStream!=='undefined'){try{body=await deflate(data);flt='/Filter /FlateDecode '}catch(e){body=data}}
  putS(xn+' 0 obj\n<</Type /XRef /Size '+total+' /W [1 4 2] /Index [0 '+total+'] '+flt+common+' /Length '+body.length+'>>\nstream\n');put(body);putS('\nendstream\nendobj\n');
  putS('startxref\n'+xpos+'\n%%EOF\n')}
 var out=new Uint8Array(pos),p2=0;for(var c=0;c<chunks.length;c++){out.set(chunks[c],p2);p2+=chunks[c].length}
 return out}

/* ---- one pass at given settings ---- */
async function pass(ctx,cfg,onProgress){
 var buf=ctx.buf,repl={},st={images:0,done:0,skipped:{},saved:0},minBytes=cfg.minBytes||12000,list=[];
 ctx.objs.forEach(function(o,i){if(o.skip)return;var te=ctx.table[o.num];if(!te||te.t!==1||te.o!==o)return;var e=eligible(o,buf,minBytes);if(e)list.push({i:i,o:o,e:e})});
 st.images=list.length;
 for(var k=0;k<list.length;k++){
  var it=list[k];if(onProgress)onProgress(k/Math.max(1,list.length),k,list.length);
  if(it.e.skip){st.skipped[it.e.skip]=(st.skipped[it.e.skip]||0)+1;continue}
  try{
   var stored=buf.subarray(it.o.ss,it.o.se),orig=it.e.chain.length>1?await decodeChain(stored,it.e.chain):stored,info=jpegInfo(orig.subarray(0,Math.min(orig.length,262144))),bad2=checkJpeg(info);
   if(bad2){st.skipped[bad2]=(st.skipped[bad2]||0)+1;continue}
   var r=await reencode(orig,info,cfg.max,cfg.q);
   if(r.bytes.length>stored.length*0.95){st.skipped['already small']=(st.skipped['already small']||0)+1;continue}
   var pairs=it.o.pairs.map(function(p){return[p[0],p[1]]});
   setKey(pairs,'/Width',String(r.w));setKey(pairs,'/Height',String(r.h));setKey(pairs,'/Filter','/DCTDecode');setKey(pairs,'/ColorSpace','/DeviceRGB');setKey(pairs,'/BitsPerComponent','8');setKey(pairs,'/Length',String(r.bytes.length));delKey(pairs,'/DecodeParms');delKey(pairs,'/Decode');
   repl[it.i]={head:it.o.num+' '+it.o.gen+' obj\n'+dictText(pairs)+'\nstream\n',data:r.bytes};st.done++;st.saved+=stored.length-r.bytes.length;
  }catch(e){st.skipped['could not decode']=(st.skipped['could not decode']||0)+1}
  await new Promise(function(r){setTimeout(r,0)})}
 var out=st.done?await assemble(ctx,repl):null;
 return{out:out,stats:st}}

/* ---- public API ---- */
async function compress(file,opt,onProgress){
 var buf=new Uint8Array(await file.arrayBuffer()),ctx=await prepare(buf),before=buf.length,best=null,tried=0,reached=false,stats=null;
 var mode=opt.mode;
 if(mode==='target'){
  for(var i=0;i<LADDER.length;i++){tried=i+1;var r=await pass(ctx,{q:LADDER[i].q,max:LADDER[i].max,minBytes:opt.minBytes},function(f,k,n){if(onProgress)onProgress((i+f)/LADDER.length,'Pass '+(i+1)+' of '+LADDER.length+' · picture '+Math.min(k+1,n)+' of '+n)});
   stats=r.stats;if(r.out&&(!best||r.out.length<best.length))best=r.out;if(best&&best.length<=opt.targetBytes){reached=true;break}if(!r.stats.done)break}}
 else{var L=LEVELS[mode]||LEVELS.rec,cfg={q:opt.quality?opt.quality:L.q,max:opt.maxSide?opt.maxSide:L.max,minBytes:opt.minBytes};
  var r2=await pass(ctx,cfg,function(f,k,n){if(onProgress)onProgress(f,'Picture '+Math.min(k+1,n)+' of '+n)});stats=r2.stats;best=r2.out}
 var kept=!best||best.length>=before;
 return{bytes:kept?buf:best,kept:kept,before:before,after:kept?before:best.length,stats:stats,reached:reached,tried:tried}}
root.NSPdf={compress:compress,prepare:prepare,jpegInfo:jpegInfo,_scan:scan,_toStr:toStr,LEVELS:LEVELS};
})(window);
