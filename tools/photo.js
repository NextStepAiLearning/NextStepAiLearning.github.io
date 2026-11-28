/* NextStep photo tools: shared engine. Everything runs in the browser; files are never uploaded. */
(function(){
var P=window.NSPhoto={};
P.MAXPX=64e6;
P.fmt=function(b){if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(b<10240?2:1)+' KB';return (b/1048576).toFixed(2)+' MB'};
var ENC={};
P.canEncode=function(type){if(type in ENC)return ENC[type];var c=document.createElement('canvas');c.width=c.height=1;var ok=false;try{ok=c.toDataURL(type).indexOf('data:'+type)===0}catch(e){}return ENC[type]=ok};
P.ext=function(type){return type==='image/jpeg'?'jpg':type==='image/png'?'png':type==='image/webp'?'webp':'img'};
P.baseName=function(n){return n.replace(/\.[^.]+$/,'')||'image'};
P.isImage=function(f){return /^image\//.test(f.type)||/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name)};
/* Load a File as a drawable. createImageBitmap applies EXIF orientation, so phone photos are never sideways. */
P.load=function(file){return new Promise(function(res,rej){
 if(!P.isImage(file))return rej(new Error('"'+file.name+'" is not an image file.'));
 function viaImg(){var u=URL.createObjectURL(file),i=new Image();i.onload=function(){var o={src:i,w:i.naturalWidth,h:i.naturalHeight,name:file.name,type:file.type,size:file.size};if(o.w*o.h>P.MAXPX){URL.revokeObjectURL(u);return rej(new Error('"'+file.name+'" is too large for a browser ('+Math.round(o.w*o.h/1e6)+' megapixels).'))}res(o)};
  i.onerror=function(){URL.revokeObjectURL(u);rej(new Error('"'+file.name+'" could not be opened. HEIC/HEIF photos are not supported by every browser: save or export it as JPG first.'))};i.src=u}
 if(window.createImageBitmap){createImageBitmap(file).then(function(b){if(b.width*b.height>P.MAXPX){return rej(new Error('"'+file.name+'" is too large for a browser ('+Math.round(b.width*b.height/1e6)+' megapixels).'))}res({src:b,w:b.width,h:b.height,name:file.name,type:file.type,size:file.size})},viaImg)}else viaImg()})};
/* Draw (optionally a crop of) src into a new w x h canvas with high-quality, step-down resampling. */
P.draw=function(src,sw,sh,w,h,bg,sx,sy,cw,ch){
 w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));sx=sx||0;sy=sy||0;cw=cw||sw;ch=ch||sh;
 var cur=src,cx=sx,cy=sy,aw=cw,ah=ch;
 while(aw/2>=w&&ah/2>=h){var nw=Math.max(w,Math.floor(aw/2)),nh=Math.max(h,Math.floor(ah/2));var t=document.createElement('canvas');t.width=nw;t.height=nh;var tc=t.getContext('2d');tc.imageSmoothingEnabled=true;tc.imageSmoothingQuality='high';tc.drawImage(cur,cx,cy,aw,ah,0,0,nw,nh);cur=t;cx=0;cy=0;aw=nw;ah=nh}
 var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');
 if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h)}
 x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,cx,cy,aw,ah,0,0,w,h);return c};
P.enc=function(c,type,q){return new Promise(function(r){c.toBlob(function(b){r(b)},type,q)})};
P.hasAlpha=function(c){try{var x=c.getContext('2d'),w=c.width,h=c.height,st=Math.max(1,Math.floor(Math.sqrt(w*h/40000)));var d=x.getImageData(0,0,w,h).data;for(var i=3;i<d.length;i+=4*st){if(d[i]<250)return true}}catch(e){}return false};
/* Fit an image under maxBytes. make(scale) returns a canvas at that scale. JPEG/WebP: binary search on quality, then (if allowed) shrink. PNG: shrink only. */
P.fit=async function(make,type,maxBytes,o){
 o=o||{};var minQ=o.minQ||.3,maxQ=o.maxQ||.95,scale=o.scale||1,minScale=o.minScale||.1,c,b;
 for(var it=0;it<40;it++){
  c=make(scale);
  if(type==='image/png'){b=await P.enc(c,type);if(b.size<=maxBytes||!o.allowScale||scale<=minScale)return {blob:b,q:1,scale:scale,w:c.width,h:c.height,over:b.size>maxBytes};scale=Math.max(minScale,scale*Math.min(.92,Math.sqrt(maxBytes/b.size)*1.02));continue}
  var hi=await P.enc(c,type,maxQ);if(hi.size<=maxBytes)return {blob:hi,q:maxQ,scale:scale,w:c.width,h:c.height};
  var lo=await P.enc(c,type,minQ);
  if(lo.size>maxBytes){if(!o.allowScale||scale<=minScale)return {blob:lo,q:minQ,scale:scale,w:c.width,h:c.height,over:true};scale=Math.max(minScale,scale*Math.min(.92,Math.sqrt(maxBytes/lo.size)*1.02));continue}
  var best=lo,l=minQ,h=maxQ;for(var k=0;k<8;k++){var m=(l+h)/2,t=await P.enc(c,type,m);if(t.size<=maxBytes){best=t;l=m}else h=m}
  return {blob:best,q:l,scale:scale,w:c.width,h:c.height}}
 return {blob:b,q:1,scale:scale,w:c.width,h:c.height,over:true}};
P.download=function(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(u)},4000)};
P.unique=function(name,used){var n=name,i=1,b=name.replace(/(\.[^.]+)$/,''),e=(name.match(/(\.[^.]+)$/)||[''])[0];while(used[n]){n=b+'-'+(++i)+e}used[n]=1;return n};
/* Minimal ZIP writer (store, UTF-8 names) so several results can be downloaded at once. */
var CT=null;function crc(u){if(!CT){CT=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CT[n]=c>>>0}}var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function rd(b){return new Promise(function(r,j){var f=new FileReader();f.onload=function(){r(new Uint8Array(f.result))};f.onerror=j;f.readAsArrayBuffer(b)})}
P.zip=async function(files){var enc=new TextEncoder(),parts=[],cd=[],off=0,now=new Date(),dt=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),tm=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
 function u16(a,v){a.push(v&255,(v>>8)&255)}function u32(a,v){a.push(v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255)}
 for(var i=0;i<files.length;i++){var d=await rd(files[i].blob),nm=enc.encode(files[i].name),cr=crc(d),h=[];
  u32(h,0x04034b50);u16(h,20);u16(h,0x0800);u16(h,0);u16(h,tm);u16(h,dt);u32(h,cr);u32(h,d.length);u32(h,d.length);u16(h,nm.length);u16(h,0);
  parts.push(new Uint8Array(h),nm,d);
  var c=[];u32(c,0x02014b50);u16(c,20);u16(c,20);u16(c,0x0800);u16(c,0);u16(c,tm);u16(c,dt);u32(c,cr);u32(c,d.length);u32(c,d.length);u16(c,nm.length);u16(c,0);u16(c,0);u16(c,0);u16(c,0);u32(c,0);u32(c,off);cd.push(new Uint8Array(c),nm);
  off+=h.length+nm.length+d.length}
 var cds=0;cd.forEach(function(x){cds+=x.length});var e=[];u32(e,0x06054b50);u16(e,0);u16(e,0);u16(e,files.length);u16(e,files.length);u32(e,cds);u32(e,off);u16(e,0);
 return new Blob(parts.concat(cd,[new Uint8Array(e)]),{type:'application/zip'})};
/* Drop zone helper: click, keyboard, drag and drop. */
P.dropzone=function(zone,input,cb){
 function take(list){var a=[].slice.call(list||[]);if(a.length)cb(a)}
 zone.addEventListener('click',function(e){if(e.target!==input)input.click()});
 zone.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
 input.addEventListener('change',function(){take(input.files);input.value=''});
 ['dragenter','dragover'].forEach(function(n){zone.addEventListener(n,function(e){e.preventDefault();zone.classList.add('drag')})});
 ['dragleave','drop'].forEach(function(n){zone.addEventListener(n,function(e){e.preventDefault();zone.classList.remove('drag')})});
 zone.addEventListener('drop',function(e){take(e.dataTransfer&&e.dataTransfer.files)});
 document.addEventListener('paste',function(e){var f=[].slice.call((e.clipboardData&&e.clipboardData.files)||[]).filter(P.isImage);if(f.length)cb(f)})};
})();
