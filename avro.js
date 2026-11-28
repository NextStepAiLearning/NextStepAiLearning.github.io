/* NextStep Bangla phonetic engine (Avro-style). Type English letters, get Bangla. Runs in the browser; also loadable in Node for tests. */
(function(root){
var NUK='\u09BC',HAS='\u09CD';
var V={'rri':['ঋ','ৃ'],'oi':['ঐ','ৈ'],'ou':['ঔ','ৌ'],'ee':['ঈ','ী'],'oo':['ঊ','ূ'],'o':['অ',''],'a':['আ','া'],'i':['ই','ি'],'I':['ঈ','ী'],'u':['উ','ু'],'U':['ঊ','ূ'],'e':['এ','ে'],'O':['ও','ো']};
var C={'kkh':'ক্ষ','ksh':'ক্ষ','chh':'ছ','gg':'জ্ঞ','NG':'ঞ','Ng':'ঙ','kh':'খ','gh':'ঘ','ch':'চ','jh':'ঝ','Th':'ঠ','Dh':'ঢ','th':'থ','dh':'ধ','ph':'ফ','bh':'ভ','sh':'শ','Sh':'ষ','Rh':'ঢ'+NUK,
 'k':'ক','g':'গ','c':'চ','j':'জ','T':'ট','D':'ড','N':'ণ','t':'ত','d':'দ','n':'ন','p':'প','f':'ফ','b':'ব','v':'ভ','m':'ম','z':'য','r':'র','l':'ল','S':'শ','s':'স','h':'হ','R':'ড'+NUK,'q':'ক','x':'ক্স','y':'য'+NUK,'w':'ও'};
var SYM={'t`':'ৎ','ng':'ং',':':'ঃ','^':'ঁ','.':'।','$':'৳'};
var DIG='০১২৩৪৫৬৭৮৯';
var KEYS=[];Object.keys(V).forEach(function(k){KEYS.push([k,'V'])});Object.keys(C).forEach(function(k){KEYS.push([k,'C'])});Object.keys(SYM).forEach(function(k){KEYS.push([k,'S'])});
KEYS.sort(function(a,b){return b[0].length-a[0].length});
var BYLEN={};KEYS.forEach(function(p){(BYLEN[p[0].length]=BYLEN[p[0].length]||{})[p[0]]=p[1]});
function match(s,i){for(var L=3;L>=1;L--){var t=s.substr(i,L);if(t.length===L&&BYLEN[L]&&BYLEN[L][t])return [t,BYLEN[L][t]]}return null}
function convert(s,opt){opt=opt||{};var out='',i=0,prev=false; // prev = last output is a bare consonant (a conjunct or kar may follow)
 while(i<s.length){var ch=s[i],m=match(s,i);
  if(!m&&ch!==ch.toLowerCase()){var lc=ch.toLowerCase();m=(function(){var x=match(lc+s.substr(i+1),0);return x&&x[0].length===1?[ch,x[1]]:null})();if(m&&m[1]==='V')m=[ch,'V']}
  if(m&&m[1]!=='S'||(m&&m[1]==='S')){var key=m[0],t=m[1];
   if(t==='S'){out+=SYM[key];prev=false;i+=key.length;continue}
   if(t==='V'){var v=V[key]||V[key.toLowerCase()];if(prev){out+=v[1];}else out+=v[0];prev=false;i+=key.length;continue}
   var c=C[key]||C[key.toLowerCase()],lastIsC=prev;
   if(lastIsC&&(key==='y'||key==='z')){out+=HAS+'য';prev=true;i+=1;continue}
   if(lastIsC&&key==='w'){out+=HAS+'ব';prev=true;i+=1;continue}
   if(lastIsC&&c.indexOf(HAS)<0||lastIsC){out+=HAS+c}else out+=c;
   prev=(key==='w'&&!lastIsC)?false:true;i+=key.length;continue}
  if(ch==='`'){prev=false;i++;continue}
  if(/[0-9]/.test(ch)&&opt.digits!==false){out+=DIG[+ch];prev=false;i++;continue}
  out+=ch;prev=false;i++}
 return out}
var api={convert:convert,V:V,C:C,SYM:SYM};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NSAvro=api;
})(typeof window!=='undefined'?window:this);
