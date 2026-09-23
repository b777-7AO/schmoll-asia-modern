(function(){"use strict";
var root=document.getElementById("sap-media");if(!root)return;
var lang=root.getAttribute("data-lang")||"en";
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
var M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmt(iso){var y=iso.slice(0,4),m=iso.slice(5,7),d=iso.slice(8,10);return(["zh","zh-hk","ko","th"].indexOf(lang)>-1)?y+"."+m+"."+d:d+" "+M[+m-1]+" "+y}
var LI_ICON='<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.16h4.52V23H.24V8.16zM8.34 8.16h4.33v2.03h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.93V23h-4.51v-7.29c0-1.74-.03-3.98-2.42-3.98-2.43 0-2.8 1.9-2.8 3.86V23H8.34V8.16z"/></svg>';
/* rows: arrows */
function bindRow(wrap){var slider=wrap.querySelector(".sm-row__slider"),next=wrap.querySelector(".sm-row__next"),prev=wrap.querySelector(".sm-row__prev");if(!slider||!next)return;
 function update(){var atEnd=slider.scrollLeft+slider.clientWidth>=slider.scrollWidth-8,can=slider.scrollWidth>slider.clientWidth+8;next.classList.toggle("is-hidden",atEnd||!can);if(prev)prev.classList.toggle("is-hidden",slider.scrollLeft<=8)}
 if(!wrap._bound){wrap._bound=true;next.addEventListener("click",function(){slider.scrollBy({left:Math.round(slider.clientWidth*.8),behavior:"smooth"})});if(prev)prev.addEventListener("click",function(){slider.scrollBy({left:-Math.round(slider.clientWidth*.8),behavior:"smooth"})});slider.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update)}
 wrap._update=update;update()}
root.querySelectorAll(".sm-row__wrap").forEach(bindRow);
/* videos: poster-first */
var active=null;
root.querySelectorAll(".sm-vtile").forEach(function(tile){var btn=tile.querySelector(".sm-vtile__img");if(!btn)return;btn.addEventListener("click",function(){
 if(active){active.pause();if(active._tile&&active._tile._btn)active.replaceWith(active._tile._btn);active=null}
 var v=document.createElement("video");v.controls=true;v.playsInline=true;v.src=tile.getAttribute("data-video-src");v.setAttribute("aria-label",tile.getAttribute("data-video-title")||"Video");v._tile=tile;
 v.addEventListener("error",function(){v.replaceWith(btn)});btn.replaceWith(v);tile._btn=btn;active=v;v.play().catch(function(){})})});
/* linkedin: live refresh from the synced feed */
var slider=root.querySelector("[data-li-slider]");if(!slider)return;
var bases=[root.getAttribute("data-li-base"),root.getAttribute("data-li-alt")].filter(Boolean);
function render(base,data){var posts=(data.posts||[]).filter(function(p){return!p.hidden&&p.approved!==false}).slice(0,6);if(!posts.length)return;
 var h=posts.map(function(p){var img=p.images&&p.images[0]?(/^https?:/.test(p.images[0])?p.images[0]:base+"/"+p.images[0]):"";
  return'<a class="sm-panel sm-panel--img" href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" width="640" height="360" onerror="this.style.display=\'none\'">':"")+
  '<span class="sm-panel__inner"><span class="sm-panel__head"><time datetime="'+esc(p.date)+'">'+fmt(p.date)+'</time><span>'+LI_ICON+' LinkedIn ↗</span></span><span class="sm-panel__title">'+esc((p.customTitle||p.text.split("\n")[0]).slice(0,90))+'</span><span class="sm-panel__more">'+esc(root.getAttribute("data-li-view"))+' <span aria-hidden="true">↗</span></span></span></a>'}).join("");
 h+='<a class="sm-panel sm-panel--follow" href="'+esc(root.getAttribute("data-li-source"))+'" target="_blank" rel="noopener noreferrer"><span class="sm-panel__title">'+LI_ICON+'&nbsp; '+esc(root.getAttribute("data-li-follow"))+'</span><span class="sm-panel__more">↗</span></a>';
 slider.innerHTML=h;var wrap=slider.closest(".sm-row__wrap");if(wrap&&wrap._update)wrap._update()}
(function tryNext(i){if(i>=bases.length||!window.fetch)return;var base=bases[i];
 fetch(base+"/assets/data/linkedin.json?t="+Math.floor(Date.now()/36e5),{mode:"cors"}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){render(base,d)}).catch(function(){tryNext(i+1)})})(0);
})();
